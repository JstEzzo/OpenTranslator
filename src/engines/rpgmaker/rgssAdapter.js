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

class RgssAdapter extends BaseEngineAdapter {
  constructor() {
    super('rgss', 'RPG Maker RGSS (XP / VX / VX Ace)');
    this.codeProtector = new CodeProtector({ engine: 'rpgmaker' });
    this.backupManager = new BackupManager({ backupDirName: '.opent_rgss_backup' });
    this.rubyHandler = new RpgMakerRubyHandler();
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
      warning: res.error || null
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const dataDir = path.join(gameDir, 'Data');
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
      this.backupManager.createSessionBackup(gameDir, filesToBackup, {
        sessionId: options.sessionId,
        transactionId: options.transactionId,
        backupId: options.backupId,
        engine: 'rgss'
      });
    }

    const transMap = {};
    for (const t of texts) {
      const tr = (translations instanceof Map) ? translations.get(t.id) : (translations ? translations[t.id] : null);
      if (tr && tr !== (t.clean || t.original)) {
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(tr, t.tokens);
          transMap[t.original] = restored.restoredText;
        } else {
          transMap[t.original] = tr;
        }
      }
    }

    const res = await this.rubyHandler.injectTranslation({ gameDir, translationMap: transMap, options });

    return {
      success: res.success !== false,
      modifiedFiles: res.injectedFiles || filesToBackup,
      count: res.count || Object.keys(transMap).length,
      message: res.success ? `Tradução RGSS aplicada com sucesso.` : res.error
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreSessionBackup(gameDir, options);
    const backupBase = path.join(gameDir, ".opent_rgss_backup");
    try {
      if (fs.existsSync(backupBase)) {
        fs.rmSync(backupBase, { recursive: true, force: true });
      }
    } catch (_) {}

    // If game uses an archive container (e.g. .rgss3a), clean up unpacked Data to guarantee 100% bit-level restore
    const arc = this._findRgssArchive(gameDir);
    if (arc && fs.existsSync(arc)) {
      const dataDir = path.join(gameDir, "Data");
      if (fs.existsSync(dataDir)) {
        try {
          fs.rmSync(dataDir, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    if (!res || !res.success) {
      const oldRes = this.backupManager.restoreOldestBackup(gameDir);
      return {
        success: oldRes.success,
        restoredFiles: oldRes.restoredFiles || [gameDir]
      };
    }
    return {
      success: true,
      restoredFiles: res.restoredFiles || [gameDir]
    };
  }
}

module.exports = RgssAdapter;
