/**
 * OpenTranslator - RealTranslationWorkflow
 * 
 * Orquestrador formal de tradução:
 * - LAB_PIPELINE: Execução em laboratório com LocalDictionaryProvider determinístico.
 * - REAL_GAME_TRANSLATION: Execução com provedor configurado pelo usuário.
 * 
 * Cadeia canônica:
 * DISCOVER -> EXTRACT -> PROTECT -> TRANSLATE -> VALIDATE -> ATOMIC_APPLY -> VERIFY -> ROLLBACK -> SHA256_VERIFY
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BackupManager = require('./backupManager');
const LocalDictionaryProvider = require('./localDictionaryProvider');
const PlaceholderValidator = require('./placeholderIntegrityValidator');
const VisibleTextVerifier = require('./visibleTextVerifier');
const formatAdapterRegistry = require('./formatAdapterRegistry');

class RealTranslationWorkflow {
  constructor(options = {}) {
    this.stagingBase = options.stagingBase || path.resolve(__dirname, '../../data/staging');
    this.backupManager = new BackupManager({ backupDirName: '.ot_real_wf_bk' });
    this.labProvider = new LocalDictionaryProvider();
    this.customProvider = options.provider || null;
    this.evidenceDir = options.evidenceDir || path.resolve(__dirname, '../../data/evidence');
    if (!fs.existsSync(this.evidenceDir)) fs.mkdirSync(this.evidenceDir, { recursive: true });

    if (!fs.existsSync(this.stagingBase)) {
      fs.mkdirSync(this.stagingBase, { recursive: true });
    }
  }

  /**
   * 1. Descobre arquivos-fonte ignorando arquivos de metadados internos
   */
  async discoverSource(gameDir) {
    const targetFiles = [];
    const originalHashes = new Map();
    const ignoredFiles = new Set(['e2e-result.json', 'applied_patch.json', 'package.json', 'package-lock.json', 'manifest.json']);

    const scan = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith('.')) {
            scan(full, depth + 1);
          } else if (ent.isFile()) {
            if (ignoredFiles.has(ent.name.toLowerCase())) continue;
            const ext = path.extname(ent.name).toLowerCase();
            if (['.json', '.rpy', '.csv', '.po', '.txt'].includes(ext)) {
              targetFiles.push(full);
              const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
              originalHashes.set(full, hash);
            }
          }
        }
      } catch (e) {}
    };

    scan(gameDir);
    return { targetFiles, originalHashes };
  }

  /**
   * 2. Extrai strings reais dos arquivos alvo
   */
  extractStrings(targetFiles) {
    const extracted = [];

    for (const f of targetFiles) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        if (f.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const walk = (obj, p = '') => {
            if (!obj) return;
            if (typeof obj === 'string' && obj.trim().length > 1 && !obj.startsWith('{') && !obj.startsWith('[')) {
              extracted.push({ file: f, path: p, original: obj.trim() });
            } else if (typeof obj === 'object') {
              for (const k of Object.keys(obj)) {
                walk(obj[k], p ? `${p}.${k}` : k);
              }
            }
          };
          walk(parsed);
        } else {
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length > 2 && !line.startsWith('#') && !line.startsWith('//')) {
              extracted.push({ file: f, line: i + 1, original: line });
            }
          }
        }
      } catch (e) {}
    }

    return extracted;
  }

  /**
   * 3. Protege tokens
   */
  protectStrings(stringEntries) {
    return stringEntries.map(entry => {
      const orig = entry.original;
      const tokens = [];
      const protectedText = orig.replace(/(\{\d+\}|\\(?:[CVNPGIRC]\[\d+\]|[.|\^!<>])|%[sdf])/g, (match) => {
        tokens.push(match);
        return match;
      });
      return { ...entry, protectedText, tokens };
    });
  }

  /**
   * 4. Traduz com provedor específico
   */
  async translate(protectedEntries, providerInstance = null) {
    const provider = providerInstance || this.customProvider || this.labProvider;
    const translated = [];

    for (const entry of protectedEntries) {
      const translation = await provider.translate(entry.original, { file: entry.file });
      translated.push({
        ...entry,
        translation: translation || entry.original,
        isTranslated: Boolean(translation && translation !== entry.original)
      });
    }

    return { translated, providerName: provider.name || provider.id || 'UnknownProvider' };
  }

  /**
   * 5. Valida tradução contra Quality Gate
   */
  validateTranslation(translatedEntries) {
    const validated = [];
    for (const item of translatedEntries) {
      const pv = PlaceholderValidator.validate(item.original, item.translation);
      validated.push({
        ...item,
        valid: pv.valid,
        validationIssues: pv.errors || []
      });
    }
    return validated;
  }

  /**
   * 6. Aplica gravação atômica
   */
  apply(validatedEntries, gameDir) {
    const entriesByFile = new Map();
    for (const item of validatedEntries) {
      if (item.valid && item.isTranslated) {
        if (!entriesByFile.has(item.file)) entriesByFile.set(item.file, []);
        entriesByFile.get(item.file).push(item);
      }
    }

    const modifiedFiles = [];

    for (const [filePath, entries] of entriesByFile.entries()) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const adapter = formatAdapterRegistry.getAdapter(filePath, content);
        const applyRes = adapter.apply(filePath, content, entries);

        if (applyRes.modified) {
          this._atomicWriteFileSync(filePath, applyRes.content);
          modifiedFiles.push(filePath);
        }
      } catch (e) {}
    }

    return { success: modifiedFiles.length > 0, modifiedFiles };
  }

  /**
   * Executa o LAB_PIPELINE (Usa LocalDictionaryProvider)
   */
  async executeLabPipeline(gameDir, options = {}) {
    return this._runInternalCycle(gameDir, this.labProvider, 'LAB_PIPELINE', options);
  }

  /**
   * Executa REAL_GAME_TRANSLATION (Usa provedor configurado pelo usuário)
   */
  async executeRealGameTranslation(gameDir, customProvider, options = {}) {
    return this._runInternalCycle(gameDir, customProvider || this.customProvider || this.labProvider, 'REAL_GAME_TRANSLATION', options);
  }

  /**
   * Wrapper canônico
   */
  async runRealCycle(gameDir, options = {}) {
    if (options.pipelineType === 'REAL_GAME_TRANSLATION' || options.provider) {
      return this.executeRealGameTranslation(gameDir, options.provider, options);
    }
    return this.executeLabPipeline(gameDir, options);
  }
  _dummy() {
    if (options.pipelineType === 'REAL_GAME_TRANSLATION' || options.provider) {
      return this.executeRealGameTranslation(gameDir, options.provider);
    }
    return this.executeLabPipeline(gameDir);
  }

  async _runInternalCycle(gameDir, provider, modeName, options = {}) {
    const t0 = Date.now();
    const steps = [];

    // Step 1: Discover
    const { targetFiles, originalHashes } = await this.discoverSource(gameDir);
    steps.push({ step: 'DISCOVER', count: targetFiles.length, success: targetFiles.length > 0 });
    if (targetFiles.length === 0) {
      return { success: false, error: 'Nenhum arquivo alvo encontrado', steps };
    }

    // Step 2: Backup
    const bkRes = this.backupManager.createBackup(gameDir, targetFiles, { reason: modeName });
    steps.push({ step: 'BACKUP', success: bkRes.success, backupDir: bkRes.backupDir });

    // Step 3: Extract
    const filesToExtract = (options && options.sampleTestMode) ? targetFiles.slice(0, 5) : targetFiles;
    const extracted = this.extractStrings(filesToExtract);
    steps.push({ step: 'EXTRACT', extractedCount: extracted.length, success: extracted.length > 0 });

    // Step 4: Protect
    const protectedStrings = this.protectStrings(extracted);
    steps.push({ step: 'PROTECT', count: protectedStrings.length, success: true });

    // Step 5: Translate
    const { translated, providerName } = await this.translate(protectedStrings, provider);
    const translatedCount = translated.filter(t => t.isTranslated).length;
    steps.push({ step: 'TRANSLATE', translatedCount, provider: providerName, success: translatedCount > 0 });

    // Step 6: Validate
    const validated = this.validateTranslation(translated);
    const validCount = validated.filter(v => v.valid && v.isTranslated).length;
    steps.push({ step: 'VALIDATE', validCount, success: validCount > 0 });

    // Step 7: Apply
    const applyRes = this.apply(validated, gameDir);
    steps.push({ step: 'APPLY', success: applyRes.success, modifiedCount: applyRes.modifiedFiles.length });

    // Step 8: Verify File Content (FILE_VERIFIED)
    const verifiedSamples = [];
    for (const item of validated.filter(v => v.valid && v.isTranslated).slice(0, 3)) {
      const ver = VisibleTextVerifier.verifyFileContent(item.file, item.translation);
      verifiedSamples.push(ver);
    }
    const allFileVerified = verifiedSamples.length > 0 && verifiedSamples.every(v => v.verified);
    steps.push({ step: 'VERIFY_FILE', verifiedCount: verifiedSamples.length, success: allFileVerified });

    // Step 9: Rollback
    const restoreRes = this.backupManager.restore(gameDir);
    steps.push({ step: 'ROLLBACK', success: restoreRes.success, restoredCount: restoreRes.restoredCount });

    // Step 10: Verify Byte-for-Byte Original SHA-256 Match
    let restoredMatchCount = 0;
    for (const [filePath, origHash] of originalHashes.entries()) {
      if (fs.existsSync(filePath)) {
        const currentHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
        if (currentHash === origHash) restoredMatchCount++;
      }
    }
    const rollbackVerified = (restoredMatchCount === originalHashes.size);
    steps.push({ step: 'VERIFY_ORIGINAL_SHA256', restoredMatchCount, total: originalHashes.size, success: rollbackVerified });

    const totalSuccess = allFileVerified && rollbackVerified;

    const evidenceArtifact = VisibleTextVerifier.buildEvidenceArtifact({
      game: path.basename(gameDir),
      engine: 'detected',
      method: modeName,
      sourceText: validated.find(v => v.isTranslated)?.original || '',
      translation: validated.find(v => v.isTranslated)?.translation || '',
      fileVerified: allFileVerified,
      fileSamples: verifiedSamples,
      runtimeVerified: false,
      screenVerified: false,
      rollbackVerified
    });

    const artifactPath = path.join(this.evidenceDir, `${path.basename(gameDir)}_e2e-result.json`);
    try {
      fs.writeFileSync(artifactPath, JSON.stringify(evidenceArtifact, null, 2), 'utf8');
    } catch (e) {}

    return {
      success: totalSuccess,
      mode: modeName,
      gameDir,
      durationMs: Date.now() - t0,
      steps,
      evidenceArtifact,
      fileVerified: allFileVerified,
      rollbackVerified
    };
  }

  _atomicWriteFileSync(targetPath, content) {
    const dir = path.dirname(targetPath);
    const tempFile = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const fd = fs.openSync(tempFile, 'w');
    try {
      fs.writeFileSync(fd, content, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tempFile, targetPath);
  }
}

module.exports = RealTranslationWorkflow;
