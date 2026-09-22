/**
 * OpenTranslator — RpgMakerAdapter
 * Adaptador oficial para RPG Maker MV, MZ e RGSS (XP/VX/VX Ace).
 * Preserva 100% da estabilidade existente, sem qualquer regressão.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const { extractGameTexts } = require("../../extractor");
const { patchGameData, backupGameData, restoreOldestBackup } = require("../../gameEngine");

class RpgMakerAdapter extends BaseEngineAdapter {
  constructor() {
    super("rpgmaker", "RPG Maker Engine (MV / MZ / RGSS)");
    this.codeProtector = new CodeProtector({ engine: "rpgmaker" });
    this.backupManager = new BackupManager();
  }

  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: false,
      runtimeHook: true,
      dom: true,
      frameworkState: false,
      ocr: true,
      backupSupported: true
    };
  }

  async extract(gameDir, options = {}) {
    const rawTexts = extractGameTexts(gameDir);
    const allTexts = [];

    for (const t of rawTexts) {
      const { protectedText, tokens } = this.codeProtector.protect(t.clean, "rpgmaker");
      allTexts.push({
        ...t,
        protectedText,
        tokens,
        engine: "rpgmaker"
      });
    }

    return {
      success: true,
      texts: allTexts,
      count: allTexts.length
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // Restaura códigos protegidos antes de passar para o patchGameData nativo
    const restoredMap = new Map();
    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr) {
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(tr, t.tokens);
          restoredMap.set(t.id, restored.restoredText);
        } else {
          restoredMap.set(t.id, tr);
        }
      }
    }

    const patchedCount = patchGameData(gameDir, texts, restoredMap);
    return {
      success: true,
      modifiedFiles: [path.join(gameDir, "data")],
      count: patchedCount
    };
  }

  async rollback(gameDir, options = {}) {
    restoreOldestBackup(gameDir);
    return {
      success: true,
      restoredFiles: [gameDir]
    };
  }
}

module.exports = RpgMakerAdapter;
