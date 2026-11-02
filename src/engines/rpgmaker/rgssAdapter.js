/**
 * OpenTranslator — RgssAdapter
 * Adaptador oficial para jogos desenvolvidos em RPG Maker XP, VX e VX Ace (RGSS1, RGSS2 e RGSS3).
 * Segue estritamente o contrato universal BaseEngineAdapter:
 * detect, inspect, extractTexts, extractResources, prepareTranslation,
 * translate, restorePlaceholders, applyTranslations, validate, package, launch, rollback, diagnose.
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const RpgMakerRubyHandler = require('./rpgMakerRubyHandler');
const { rollbackResult } = require('../rollbackResult.js');
const os = require('os');
const PlaceholderValidator = require('../../core/placeholderIntegrityValidator');

class RgssAdapter extends BaseEngineAdapter {
  constructor() {
    super('rgss', 'RPG Maker RGSS (XP / VX / VX Ace)');
    this.codeProtector = new CodeProtector({ engine: 'rpgmaker' });
    this.backupManager = new BackupManager({ backupDirName: '.opent_rgss_backup' });
    this.rubyHandler = new RpgMakerRubyHandler();
    this.stagingByGame = new Map();
  }

  getDetailedDeclaration() {
    return {
      engine: 'rgss',
      name: 'RPG Maker RGSS (XP / VX / VX Ace)',
      versions: ['RGSS1 (XP)', 'RGSS2 (VX)', 'RGSS3 (VX Ace)'],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: true,
      placeholders: true,
      pluralization: false
    };
  }

  _findRgssArchive(gameDir) {
    try {
      const files = fs.readdirSync(gameDir);
      for (const f of files) {
        if (f.toLowerCase().endsWith('.rgss3a') || f.toLowerCase().endsWith('.rgss2a') || f.toLowerCase().endsWith('.rgssad')) {
          return path.join(gameDir, f);
        }
      }
    } catch (_) {}
    return null;
  }

  getCapabilities(gameDir, exePath) {
    const dataDir = path.join(gameDir, 'Data');
    let hasRubyData = false;
    if (fs.existsSync(dataDir)) {
      try {
        const dFiles = fs.readdirSync(dataDir).map(f => f.toLowerCase());
        hasRubyData = dFiles.some(f => f.endsWith('.rvdata2') || f.endsWith('.rvdata') || f.endsWith('.rxdata'));
      } catch (e) {}
    }
    const hasRgssArchive = Boolean(this._findRgssArchive(gameDir));

    return {
      staticFiles: hasRubyData || hasRgssArchive,
      nativeLocalization: false,
      archives: hasRgssArchive,
      runtimeHook: true,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: (hasRubyData || hasRgssArchive) ? 'Ruby Marshal / RGSS3A Container Bridge' : 'Generic Scanner / OCR Fallback'
    };
  }

  async extract(gameDir, options = {}) {
    const res = await this.rubyHandler.extract({ gameDir, options });
    if (res.success && res.stagingDir) {
      const archive = this._findRgssArchive(gameDir);
      this.stagingByGame.set(path.resolve(gameDir), { dir: res.stagingDir, archive, hash: this.backupManager.getFileHash(archive) });
    }
    const rawRubyTexts = res.texts || [];
    const allTexts = [];
    for (const t of rawRubyTexts) {
      const { protectedText, tokens } = this.codeProtector.protect(t.clean || t.original, 'rpgmaker');
      allTexts.push({
        ...t,
        protectedText,
        tokens,
        engine: 'rgss'
      });
    }

    return {
      success: res.success !== false,
      texts: allTexts,
      count: allTexts.length,
      error: res.error || res.bridgeResult?.error || null,
      warning: res.error || res.bridgeResult?.error || null,
      errors: res.bridgeResult?.failures || [],
      coverageScope: res.bridgeResult?.coverageScope,
      archiveStaged: Boolean(res.stagingDir)
    };
  }

  async validate(gameDir, texts, translations) {
    const errors = [];
    for (const text of texts) {
      const translated = translations instanceof Map ? translations.get(text.id) : translations?.[text.id];
      if (translated === undefined) continue;
      if (typeof translated !== 'string') { errors.push({ id: text.id, error: 'Translation must be a string' }); continue; }
      const restored = this.codeProtector.restore(translated, text.tokens || []).restoredText;
      const check = PlaceholderValidator.validate(text.original || text.clean, restored);
      if (!check.valid) errors.push({ id: text.id, error: 'Placeholder integrity mismatch', issues: check.issues });
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const validation = await this.validate(gameDir, texts, translations);
    if (!validation.valid) throw new Error('RGSS translation failed placeholder validation');
    const transMap = {};
    for (const t of texts) {
      const tr = (translations instanceof Map) ? translations.get(t.id) : (translations ? translations[t.id] : null);
      if (tr && tr !== (t.clean || t.original)) {
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(tr, t.tokens);
          transMap[t.id] = { original: t.original, translated: restored.restoredText };
        } else {
          transMap[t.id] = { original: t.original, translated: tr };
        }
      }
    }

    if (!Object.keys(transMap).length) return { success: true, status: 'NO_CHANGES', count: 0, modifiedFiles: [], reason: 'No changed translations supplied' };
    const dataDir = path.join(gameDir, 'Data');
    const staged = this.stagingByGame.get(path.resolve(gameDir));
    if (staged && this.backupManager.getFileHash(staged.archive) !== staged.hash) throw new Error('RGSS archive changed after extraction; extract again');
    const stagedFiles = staged ? fs.readdirSync(path.join(staged.dir, 'Data')).filter(f => /\.(?:rxdata|rvdata2?)$/i.test(f)) : [];
    const createdFiles = stagedFiles.map(f => path.join('Data', f)).filter(rel => !fs.existsSync(path.join(gameDir, rel)));
    if (staged && options.skipBackup === true) throw new Error('Staged archive application requires a verified backup');
    const filesToBackup = [];
    if (fs.existsSync(dataDir)) {
      try {
        const dFiles = fs.readdirSync(dataDir);
        for (const f of dFiles) {
          if (f.endsWith('.rvdata2') || f.endsWith('.rvdata') || f.endsWith('.rxdata')) {
            filesToBackup.push(path.join(dataDir, f));
          }
        }
      } catch (e) {}
    }

    const arc = this._findRgssArchive(gameDir);
    if (arc && fs.existsSync(arc)) {
      filesToBackup.push(arc);
    }

    if (options.skipBackup !== true && filesToBackup.length > 0) {
      const backup = this.backupManager.createSessionBackup(gameDir, filesToBackup, {
        sessionId: options.sessionId,
        transactionId: options.transactionId,
        backupId: options.backupId,
        engine: 'rgss',
        createdFiles
      });
      if (!backup.success) throw new Error(backup.error || 'Could not create RGSS backup');
    }
    for (const filename of stagedFiles) {
      const source = path.join(staged.dir, 'Data', filename), target = path.join(dataDir, filename);
      if (fs.existsSync(target)) throw new Error('Staged RGSS target already exists: ' + filename);
      fs.mkdirSync(dataDir, { recursive: true });
      fs.copyFileSync(source, target);
      if (this.backupManager.getFileHash(source) !== this.backupManager.getFileHash(target)) throw new Error('Staged RGSS copy hash mismatch');
    }

    const res = await this.rubyHandler.injectTranslation({ gameDir, translationMap: transMap, options });

    return {
      success: res.success !== false,
      modifiedFiles: res.injectedFiles || [],
      createdFiles,
      count: res.count || 0,
      message: res.success ? 'RGSS data translation applied.' : res.error,
      error: res.error || null
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreSessionBackup(gameDir, options);
    if (!res?.success) return rollbackResult(res, this.id, { backupRetained: true });
    const staged = this.stagingByGame.get(path.resolve(gameDir));
    if (staged) {
      const temporaryRoot = fs.realpathSync(os.tmpdir());
      const work = fs.realpathSync(staged.dir);
      const relative = path.relative(temporaryRoot, work);
      if (!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(work).startsWith('opent-rgss-')) {
        fs.rmSync(work, { recursive: true, force: true });
        this.stagingByGame.delete(path.resolve(gameDir));
      }
    }
    return rollbackResult(res, this.id || this.engineId || "unknown", {
      // FASE 7 — success:true era literal, mesmo sem saber se algum arquivo
      // foi restaurado. Um rollback que "deu certo" sem tocar em nada é pior
      // do que um que falhou: o usuário acredita que o jogo voltou ao original
      // quando talvez nem tenha sido tocado.
      source: "sessionBackup",
    });
  }
}

module.exports = RgssAdapter;
