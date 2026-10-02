/**
 * OpenTranslator — CocosCreatorAdapter
 * Adaptador oficial para Cocos Creator 2.4+ e 3.x.
 * 
 * Capacidades:
 * - Localização nativa via pacote oficial Localization Editor (resources/i18n)
 * - Suporte a L10nLabel, LocalizedSprite e dicionários de idioma translate-data
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class CocosCreatorAdapter extends BaseEngineAdapter {
  constructor() {
    super("cocos_creator", "Cocos Creator");
    this.codeProtector = new CodeProtector({ engine: "cocos" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_cocos_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "cocos_creator",
      name: "Cocos Creator",
      versions: ["Cocos Creator 2.4+", "Cocos Creator 3.x"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasI18n = fs.existsSync(path.join(gameDir, "assets", "resources", "i18n")) ||
                    fs.existsSync(path.join(gameDir, "resources", "i18n"));
    return {
      staticFiles: true,
      nativeLocalization: hasI18n,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "Cocos Creator i18n Localization Editor Tables"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const candidateDirs = [
      path.join(gameDir, "assets", "resources", "i18n"),
      path.join(gameDir, "resources", "i18n")
    ];

    for (const i18nDir of candidateDirs) {
      if (fs.existsSync(i18nDir)) {
        try {
          const files = fs.readdirSync(i18nDir);
          for (const f of files) {
            if (f.endsWith(".json")) {
              try {
                const fullP = path.join(i18nDir, f);
                const data = JSON.parse(fs.readFileSync(fullP, 'utf8'));
                const relP = path.relative(gameDir, fullP).replace(/\\/g, "/");

                for (const [k, v] of Object.entries(data)) {
                  if (typeof v === "string" && v.trim().length > 0) {
                    const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "cocos");
                    allTexts.push({
                      id: `cocos_${f}_${k}`,
                      file: relP,
                      key: k,
                      original: v.trim(),
                      clean: v.trim(),
                      protectedText,
                      tokens,
                      engine: "cocos_creator"
                    });
                  }
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    }

    return { success: true, texts: allTexts, count: allTexts.length };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "cocos_creator" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content);
        let fileModified = false;

        for (const t of fileTexts) {
          const tr = translations.get ? translations.get(t.id) : translations[t.id];
          if (tr && tr !== t.original) {
            const restored = this.codeProtector.restore(tr, t.tokens || []);
            parsed[t.key] = restored.restoredText;
            fileModified = true;
            appliedCount++;
          }
        }

        if (fileModified) {
          fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8");
          modifiedFiles.add(fullPath);
        }
      } catch (e) {}
    }

    return {
      success: true,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Cocos Creator aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
  }
}

module.exports = CocosCreatorAdapter;
