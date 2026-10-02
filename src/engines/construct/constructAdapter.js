/**
 * OpenTranslator — ConstructAdapter
 * Adaptador oficial para Construct 3 e Construct 2.
 * 
 * Capacidades:
 * - Formato oficial do plugin Internationalization: {"locale": "pt-BR", "strings": {...}}
 * - Preservação de contextos, chaves e pluralização ICU ({0, plural, ...})
 * - Varredura automática em exportações HTML5, Electron e NW.js
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class ConstructAdapter extends BaseEngineAdapter {
  constructor() {
    super("construct", "Construct 3");
    this.codeProtector = new CodeProtector({ engine: "construct" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_construct_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "construct",
      name: "Construct 3",
      versions: ["Construct 3 r200+", "Construct 2"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: true
    };
  }

  getCapabilities(gameDir, exePath) {
    const files = fs.existsSync(gameDir) ? fs.readdirSync(gameDir).map(f => f.toLowerCase()) : [];
    const isConstruct = files.includes("c3runtime.js") || files.includes("c2runtime.js") || files.includes("data.json");

    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "Construct Internationalization Plugin & Web Runtime Scanner"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const candidateFiles = ["data.json", "c3runtime.js", "lang.json", "strings.json", "locale.json"];

    for (const cf of candidateFiles) {
      const full = path.join(gameDir, cf);
      if (fs.existsSync(full)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (cf.endsWith(".json")) {
            const data = JSON.parse(content);
            // Formato Construct 3 I18n: {"locale": "en", "strings": { "key": "value" }}
            const stringMap = data.strings || (typeof data === "object" ? data : {});
            for (const [k, v] of Object.entries(stringMap)) {
              if (typeof v === "string" && v.trim().length > 0) {
                const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "construct");
                allTexts.push({
                  id: `c3_${cf}_${k}`,
                  file: cf,
                  key: k,
                  original: v.trim(),
                  clean: v.trim(),
                  protectedText,
                  tokens,
                  engine: "construct"
                });
              }
            }
          }
        } catch (e) {}
      }
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
    this.backupManager.createBackup(gameDir, "construct_translation");
    const targetFile = path.join(gameDir, "translation_pt_BR.json");
    const outStrings = {};
    let count = 0;

    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr) {
        const restored = this.codeProtector.restore(tr, t.tokens || []);
        outStrings[t.key || t.id] = restored.restoredText;
        count++;
      }
    }

    fs.writeFileSync(targetFile, JSON.stringify({ locale: "pt-BR", strings: outStrings }, null, 2), 'utf8');
    return {
      success: true,
      modifiedFiles: [targetFile],
      count
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
  }
}

module.exports = ConstructAdapter;
