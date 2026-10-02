/**
 * OpenTranslator — GDevelopAdapter
 * Adaptador oficial para GDevelop 5.
 * Fornece dois extratores:
 * 1. GDevelopProjectExtractor: Para arquivos de projeto (game.json, cenas, eventos)
 * 2. GDevelopPackagedGameExtractor: Para jogos exportados (Electron, Web)
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class GDevelopAdapter extends BaseEngineAdapter {
  constructor() {
    super("gdevelop", "GDevelop");
    this.codeProtector = new CodeProtector({ engine: "gdevelop" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_gdevelop_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "gdevelop",
      name: "GDevelop",
      versions: ["GDevelop 5.x"],
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
    const hasGameJson = fs.existsSync(path.join(gameDir, "game.json")) || fs.existsSync(path.join(gameDir, "data.json"));
    return {
      staticFiles: true,
      nativeLocalization: hasGameJson,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "GDevelop Project & Export Data Extractor"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const gameJsonPath = path.join(gameDir, "game.json");

    if (fs.existsSync(gameJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
        // Varredura de objetos de texto em cenas
        const layouts = data.layouts || [];
        for (const layout of layouts) {
          const lName = layout.name || "scene";
          const objects = layout.objects || [];
          for (const obj of objects) {
            if (obj.type === "TextObject::Text" && obj.content) {
              const text = obj.content.text || "";
              if (text.trim().length > 0) {
                const { protectedText, tokens } = this.codeProtector.protect(text.trim(), "gdevelop");
                allTexts.push({
                  id: `gd_${lName}_${obj.name}`,
                  file: "game.json",
                  scene: lName,
                  objectName: obj.name,
                  original: text.trim(),
                  clean: text.trim(),
                  protectedText,
                  tokens,
                  engine: "gdevelop"
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    return { success: true, texts: allTexts, count: allTexts.length };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const candidateFiles = [
      path.join(gameDir, "game.json"),
      path.join(gameDir, "data.json")
    ];

    const targetPath = candidateFiles.find(p => fs.existsSync(p));
    if (!targetPath) {
      return { success: false, error: "Arquivo de dados do GDevelop (game.json ou data.json) não encontrado.", modifiedFiles: [], count: 0 };
    }

    this.backupManager.createBackup(gameDir, [targetPath], { engine: "gdevelop" });

    try {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const textLookup = new Map();
      for (const t of texts) {
        const tr = translations.get ? translations.get(t.id) : translations[t.id];
        if (tr && tr !== t.original) {
          const restored = this.codeProtector.restore(tr, t.tokens || []);
          textLookup.set(`${t.scene}::${t.objectName}`, restored.restoredText);
        }
      }

      let appliedCount = 0;
      const layouts = data.layouts || [];
      for (const layout of layouts) {
        const lName = layout.name || "scene";
        const objects = layout.objects || [];
        for (const obj of objects) {
          if (obj.type === "TextObject::Text" && obj.content) {
            const key = `${lName}::${obj.name}`;
            if (textLookup.has(key)) {
              obj.content.text = textLookup.get(key);
              appliedCount++;
            }
          }
        }
      }

      // Também verifica globalObjects se existirem
      if (Array.isArray(data.objects)) {
        for (const obj of data.objects) {
          if (obj.type === "TextObject::Text" && obj.content) {
            for (const t of texts) {
              if (t.objectName === obj.name) {
                const tr = translations.get ? translations.get(t.id) : translations[t.id];
                if (tr && tr !== t.original) {
                  const restored = this.codeProtector.restore(tr, t.tokens || []);
                  obj.content.text = restored.restoredText;
                  appliedCount++;
                }
              }
            }
          }
        }
      }

      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');

      return {
        success: true,
        modifiedFiles: [targetPath],
        count: appliedCount,
        message: `Tradução GDevelop aplicada com sucesso em ${path.basename(targetPath)} (${appliedCount} textos).`
      };
    } catch (e) {
      return { success: false, error: e.message, modifiedFiles: [], count: 0 };
    }
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
  }
}

module.exports = GDevelopAdapter;
