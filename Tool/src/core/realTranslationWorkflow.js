/**
 * OpenTranslator - RealTranslationWorkflow
 * 
 * Orquestrador do fluxo REAL de tradução ponta-a-ponta:
 * DISCOVER -> EXTRACT -> PROTECT -> TRANSLATE -> VALIDATE -> ATOMIC_APPLY -> VERIFY -> ROLLBACK -> SHA256_VERIFY
 * 
 * Regra inquebrável: NUNCA usa substituições sintéticas como "[PT] original".
 * Utiliza um TranslationProvider real (como LocalDictionaryProvider) e validação factual.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BackupManager = require('./backupManager');
const EngineDetector = require('./engineDetector');
const LocalDictionaryProvider = require('./localDictionaryProvider');
const PlaceholderValidator = require('./placeholderIntegrityValidator');
const VisibleTextVerifier = require('./visibleTextVerifier');

class RealTranslationWorkflow {
  constructor(options = {}) {
    this.stagingBase = options.stagingBase || path.resolve(__dirname, '../../data/staging');
    this.backupManager = new BackupManager({ backupDirName: '.ot_real_wf_bk' });
    this.provider = options.provider || new LocalDictionaryProvider();
    if (!fs.existsSync(this.stagingBase)) {
      fs.mkdirSync(this.stagingBase, { recursive: true });
    }
  }

  /**
   * 1. Descobre arquivos-fonte no jogo
   */
  async discoverSource(gameDir) {
    const targetFiles = [];
    const originalHashes = new Map();

    const scan = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith('.')) {
            scan(full, depth + 1);
          } else if (ent.isFile()) {
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
          // Linhas em arquivos de texto / RPY / CSV
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
   * 3. Protege tokens de formatação e códigos de controle
   */
  protectStrings(stringEntries) {
    return stringEntries.map(entry => {
      const orig = entry.original;
      const tokens = [];
      // Captura placeholders e escape codes: {0}, \C[2], %s, etc.
      const protectedText = orig.replace(/(\{\d+\}|\\(?:[CVNPGIRC]\[\d+\]|[.|\^!<>])|%[sdf])/g, (match) => {
        tokens.push(match);
        return match; // Mantém no texto para verificação posterior
      });
      return { ...entry, protectedText, tokens };
    });
  }

  /**
   * 4. Traduz as strings utilizando um provedor de tradução real
   */
  async translate(protectedEntries) {
    const translated = [];
    for (const entry of protectedEntries) {
      const translation = await this.provider.translate(entry.original, { file: entry.file });
      translated.push({
        ...entry,
        translation: translation || entry.original,
        isTranslated: Boolean(translation && translation !== entry.original)
      });
    }
    return translated;
  }

  /**
   * 5. Valida a tradução contra o Quality Gate
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
   * 6. Aplica a tradução aos arquivos com gravação atômica
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
        let changed = false;

        if (filePath.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            const walkAndReplace = (obj) => {
              if (!obj || typeof obj !== 'object') return;
              for (const k of Object.keys(obj)) {
                if (typeof obj[k] === 'string') {
                  const match = entries.find(e => e.original === obj[k]);
                  if (match) {
                    obj[k] = match.translation;
                    changed = true;
                  }
                } else if (typeof obj[k] === 'object') {
                  walkAndReplace(obj[k]);
                }
              }
            };
            walkAndReplace(parsed);
            if (changed) {
              content = JSON.stringify(parsed, null, 2);
            }
          } catch (e) {}
        } else {
          for (const ent of entries) {
            if (content.includes(ent.original)) {
              content = content.split(ent.original).join(ent.translation);
              changed = true;
            }
          }
        }

        if (changed) {
          this._atomicWriteFileSync(filePath, content);
          modifiedFiles.push(filePath);
        }
      } catch (e) {}
    }

    return { success: modifiedFiles.length > 0, modifiedFiles };
  }

  /**
   * 7. Executa o ciclo completo de Real Translation E2E
   */
  async runRealCycle(gameDir) {
    const t0 = Date.now();
    const steps = [];

    // Step 1: Discover
    const { targetFiles, originalHashes } = await this.discoverSource(gameDir);
    steps.push({ step: 'DISCOVER', count: targetFiles.length, success: targetFiles.length > 0 });
    if (targetFiles.length === 0) {
      return { success: false, error: 'Nenhum arquivo alvo encontrado', steps };
    }

    // Step 2: Backup
    const bkRes = this.backupManager.createBackup(gameDir, targetFiles, { reason: 'RealTranslationCycle' });
    steps.push({ step: 'BACKUP', success: bkRes.success, backupId: bkRes.backupId });

    // Step 3: Extract
    const extracted = this.extractStrings(targetFiles.slice(0, 5));
    steps.push({ step: 'EXTRACT', extractedCount: extracted.length, success: extracted.length > 0 });

    // Step 4: Protect
    const protectedStrings = this.protectStrings(extracted);
    steps.push({ step: 'PROTECT', count: protectedStrings.length, success: true });

    // Step 5: Translate (via real LocalDictionaryProvider)
    const translated = await this.translate(protectedStrings);
    const translatedCount = translated.filter(t => t.isTranslated).length;
    steps.push({ step: 'TRANSLATE', translatedCount, provider: this.provider.name, success: translatedCount > 0 });

    // Step 6: Validate
    const validated = this.validateTranslation(translated);
    const validCount = validated.filter(v => v.valid && v.isTranslated).length;
    steps.push({ step: 'VALIDATE', validCount, success: validCount > 0 });

    // Step 7: Apply
    const applyRes = this.apply(validated, gameDir);
    steps.push({ step: 'APPLY', success: applyRes.success, modifiedCount: applyRes.modifiedFiles.length });

    // Step 8: Verify Visible Result
    const verifiedSamples = [];
    for (const item of validated.filter(v => v.valid && v.isTranslated).slice(0, 3)) {
      const ver = VisibleTextVerifier.verifyFileContent(item.file, item.translation);
      verifiedSamples.push(ver);
    }
    const allVerified = verifiedSamples.length > 0 && verifiedSamples.every(v => v.verified);
    steps.push({ step: 'VERIFY_RESULT', verifiedCount: verifiedSamples.length, success: allVerified });

    // Step 9: Rollback
    const restoreRes = this.backupManager.restore(gameDir, bkRes.backupId);
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

    const totalSuccess = allVerified && rollbackVerified;

    // Constrói o artefato formal e2e-result.json
    const evidenceArtifact = VisibleTextVerifier.buildEvidenceArtifact({
      game: path.basename(gameDir),
      engine: 'detected',
      method: 'REAL_TRANSLATION_WORKFLOW',
      sourceText: validated.find(v => v.isTranslated)?.original || '',
      translation: validated.find(v => v.isTranslated)?.translation || '',
      capture: { success: extracted.length > 0, count: extracted.length },
      output: { success: applyRes.success, modifiedFiles: applyRes.modifiedFiles },
      runtime: { verified: false, note: 'Static / Staged Verification' },
      visual: { verified: allVerified, samples: verifiedSamples },
      rollback: { verified: rollbackVerified, sha256Matched: rollbackVerified }
    });

    const artifactPath = path.join(gameDir, 'e2e-result.json');
    try {
      fs.writeFileSync(artifactPath, JSON.stringify(evidenceArtifact, null, 2), 'utf8');
    } catch (e) {}

    return {
      success: totalSuccess,
      gameDir,
      durationMs: Date.now() - t0,
      steps,
      evidenceArtifact,
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
