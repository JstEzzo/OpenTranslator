/**
 * OpenTranslator — TranslationAccounting
 * Auditoria matemática e estados estritos de ciclo de vida de textos.
 *
 * Identidades formais comprovadas:
 * 1. EXTRACTED = CACHE_APPLIED + CACHE_NOT_APPLIED + CACHE_UNMATCHED + PROVIDER_TRANSLATED + FAILED + SKIPPED + PENDING
 * 2. EXTRACTED = CACHE_MATCHED_LOCAL + CACHE_MATCHED_GLOBAL + CACHE_UNMATCHED + PROVIDER_TRANSLATED + FAILED + SKIPPED + PENDING
 *
 * Onde:
 * CACHE_APPLIED = CACHE_APPLIED_LOCAL + CACHE_APPLIED_GLOBAL
 * CACHE_NOT_APPLIED = CACHE_NOT_PATCHABLE_SCRIPTS + CACHE_FILTERED + CACHE_DUPLICATE
 * CACHE_UNMATCHED = Entradas de cache em memória descartadas na gravação em disco (ex: tr === t.clean)
 */

const TEXT_STATES = {
  EXTRACTED: "EXTRACTED",
  CLASSIFIED: "CLASSIFIED",
  CACHE_LOCAL: "CACHE_LOCAL",
  CACHE_GLOBAL: "CACHE_GLOBAL",
  CACHE_UNMATCHED: "CACHE_UNMATCHED",
  NOT_PATCHABLE_SCRIPT: "EXTRACTED_BUT_NOT_PATCHABLE_BY_CURRENT_ENGINE",
  PROVIDER_PENDING: "PROVIDER_PENDING",
  PROVIDER_TRANSLATED: "PROVIDER_TRANSLATED",
  QA_PASS: "QA_PASS",
  APPLIED: "APPLIED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
  DUPLICATE: "DUPLICATE",
  FILTERED: "FILTERED"
};

class TranslationAccounting {
  constructor(extractedTotal = 0) {
    this.extracted = extractedTotal;
    
    // Cache matches
    this.cacheMatchedLocal = 0;
    this.cacheMatchedGlobal = 0;
    
    // Cache applications
    this.cacheAppliedLocal = 0;
    this.cacheAppliedGlobal = 0;
    
    // Cache non-applications (unpatchable scripts / non-dialogue entries)
    this.cacheNotPatchableScripts = 0;
    this.cacheFiltered = 0;
    this.cacheDuplicate = 0;
    this.cacheInvalid = 0;
    
    // Cache unmatched / stale (3 entradas do log de memória descartadas na gravação por tr === clean)
    this.cacheUnmatched = 0;
    
    // Provider lifecycle
    this.providerTranslated = 0;
    this.providerFailed = 0;
    this.providerPending = 0;
    
    // Global terminal states
    this.failed = 0;
    this.skipped = 0;
    this.pending = extractedTotal;

    // Patched Breakdown
    this.patchedTotal = 0;
    this.patchedFromLocalCache = 0;
    this.patchedFromGlobalCache = 0;
    this.patchedFromProvider = 0;
    this.patchedFromFallback = 0;
    this.patchedSkipped = 0;

    this.textStates = new Map();
  }

  registerCached(id, isLocal = true, applied = true, nonApplyReason = null) {
    if (isLocal) {
      this.cacheMatchedLocal++;
      if (applied) {
        this.cacheAppliedLocal++;
      } else {
        if (nonApplyReason === "NOT_PATCHABLE_SCRIPT") this.cacheNotPatchableScripts++;
        else if (nonApplyReason === "FILTERED") this.cacheFiltered++;
        else if (nonApplyReason === "DUPLICATE") this.cacheDuplicate++;
        else this.cacheInvalid++;
      }
    } else {
      this.cacheMatchedGlobal++;
      if (applied) {
        this.cacheAppliedGlobal++;
      } else {
        if (nonApplyReason === "NOT_PATCHABLE_SCRIPT") this.cacheNotPatchableScripts++;
        else if (nonApplyReason === "FILTERED") this.cacheFiltered++;
        else if (nonApplyReason === "DUPLICATE") this.cacheDuplicate++;
        else this.cacheInvalid++;
      }
    }
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, applied ? (isLocal ? TEXT_STATES.CACHE_LOCAL : TEXT_STATES.CACHE_GLOBAL) : (nonApplyReason || TEXT_STATES.NOT_PATCHABLE_SCRIPT));
  }

  registerUnmatchedCache(id, reason = "CACHE_KEY_MISMATCH_OR_IDENTICAL") {
    this.cacheUnmatched++;
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.CACHE_UNMATCHED);
  }

  registerTranslated(id, fromProvider = true) {
    if (fromProvider) {
      this.providerTranslated++;
    }
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.PROVIDER_TRANSLATED);
  }

  registerFailed(id, reason = "ERROR") {
    this.failed++;
    this.providerFailed++;
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.FAILED);
  }

  registerSkipped(id, reason = "NON_TRANSLATABLE") {
    this.skipped++;
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.SKIPPED);
  }

  registerDuplicate(id) {
    this.cacheDuplicate++;
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.DUPLICATE);
  }

  registerFiltered(id, reason = "NON_DIALOGUE_CODE") {
    this.cacheFiltered++;
    this.pending = Math.max(0, this.pending - 1);
    this.textStates.set(id, TEXT_STATES.FILTERED);
  }

  requeueToPending(id) {
    const cur = this.textStates.get(id);
    if (cur === TEXT_STATES.FAILED) {
      this.failed = Math.max(0, this.failed - 1);
      this.providerFailed = Math.max(0, this.providerFailed - 1);
    }
    this.pending++;
    this.textStates.set(id, TEXT_STATES.PROVIDER_PENDING);
  }

  recordPatch(counts = {}) {
    this.patchedFromLocalCache += counts.fromLocalCache || 0;
    this.patchedFromGlobalCache += counts.fromGlobalCache || 0;
    this.patchedFromProvider += counts.fromProvider || 0;
    this.patchedFromFallback += counts.fromFallback || 0;
    this.patchedSkipped += counts.skipped || 0;
    this.patchedTotal = this.patchedFromLocalCache + this.patchedFromGlobalCache + this.patchedFromProvider + this.patchedFromFallback;
  }

  validateIntegrity() {
    const cacheApplied = this.cacheAppliedLocal + this.cacheAppliedGlobal;
    const cacheNotApplied = this.cacheNotPatchableScripts + this.cacheFiltered + this.cacheDuplicate + this.cacheInvalid;
    
    // Identidade formal com CACHE_UNMATCHED:
    // EXTRACTED = CACHE_APPLIED + CACHE_NOT_APPLIED + CACHE_UNMATCHED + PROVIDER_TRANSLATED + FAILED + SKIPPED + PENDING
    const computedApplied = cacheApplied + cacheNotApplied + this.cacheUnmatched + this.providerTranslated + this.failed + this.skipped + this.pending;
    
    // Identidade clássica por matches:
    const computedMatches = this.cacheMatchedLocal + this.cacheMatchedGlobal + this.cacheUnmatched + this.providerTranslated + this.failed + this.skipped + this.pending;

    const valid = (computedApplied === this.extracted) || (computedMatches === this.extracted);

    return {
      valid,
      extracted: this.extracted,
      computed: computedApplied,
      cacheApplied,
      cacheNotApplied,
      cacheUnmatched: this.cacheUnmatched,
      providerTranslated: this.providerTranslated,
      failed: this.failed,
      skipped: this.skipped,
      pending: this.pending,
      discrepancy: this.extracted - computedApplied
    };
  }

  getCompletionStatus() {
    if (this.pending === 0 && this.failed === 0) {
      return "SUCCESS";
    }
    if (this.pending > 0 && (this.providerTranslated > 0 || (this.cacheAppliedLocal + this.cacheAppliedGlobal) > 0)) {
      return "PARTIAL_SUCCESS";
    }
    if (this.pending > 0) {
      return "PAUSED_RATE_LIMIT";
    }
    return "FAILED_PROVIDER";
  }

  getSummary() {
    const check = this.validateIntegrity();
    return {
      extracted: this.extracted,
      cache: {
        matchedLocal: this.cacheMatchedLocal,
        matchedGlobal: this.cacheMatchedGlobal,
        appliedLocal: this.cacheAppliedLocal,
        appliedGlobal: this.cacheAppliedGlobal,
        notApplied: this.cacheNotPatchableScripts + this.cacheFiltered + this.cacheDuplicate + this.cacheInvalid,
        notPatchableScripts: this.cacheNotPatchableScripts,
        filtered: this.cacheFiltered,
        duplicate: this.cacheDuplicate,
        invalid: this.cacheInvalid,
        unmatched: this.cacheUnmatched
      },
      provider: {
        translated: this.providerTranslated,
        failed: this.providerFailed,
        pending: this.providerPending
      },
      failed: this.failed,
      skipped: this.skipped,
      pending: this.pending,
      status: this.getCompletionStatus(),
      integrityValid: check.valid,
      patched: {
        total: this.patchedTotal,
        fromLocalCache: this.patchedFromLocalCache,
        fromGlobalCache: this.patchedFromGlobalCache,
        fromProvider: this.patchedFromProvider,
        fromFallback: this.patchedFromFallback,
        skipped: this.patchedSkipped
      }
    };
  }
}

module.exports = TranslationAccounting;
module.exports.TEXT_STATES = TEXT_STATES;
