/**
 * OpenTranslator — Cocos2dxAdapter
 * Adaptador oficial para Cocos2d-x (C++ e Lua).
 * Suporte a XML plist, JSON e strings tables.
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class Cocos2dxAdapter extends BaseEngineAdapter {
  constructor() {
    super("cocos2dx", "Cocos2d-x");
    this.codeProtector = new CodeProtector({ engine: "cocos" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_cocos2dx_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "cocos2dx",
      name: "Cocos2d-x",
      versions: ["Cocos2d-x 2.x", "3.x", "4.x"],
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
    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: false,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Cocos2d-x .plist & JSON Resource Tables"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const scanDirs = [
      path.join(gameDir, "Resources"),
      path.join(gameDir, "res"),
      gameDir
    ];

    const visitedFiles = new Set();

    for (const sDir of scanDirs) {
      if (!fs.existsSync(sDir)) continue;
      const walk = (dir, depth = 0) => {
        if (depth > 3) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const fullP = path.join(dir, ent.name);
            if (ent.isDirectory() && !ent.name.startsWith(".")) {
              walk(fullP, depth + 1);
            } else if (ent.isFile()) {
              if (visitedFiles.has(fullP)) continue;
              visitedFiles.add(fullP);
              const ext = path.extname(ent.name).toLowerCase();
              const relP = path.relative(gameDir, fullP).replace(/\\/g, "/");

              if (ext === ".plist" || ext === ".xml") {
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const regex = /<key>([^<]+)<\/key>\s*<string>([^<]+)<\/string>/g;
                  let match;
                  while ((match = regex.exec(content)) !== null) {
                    const key = match[1];
                    const val = match[2].trim();
                    if (val.length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(val, "cocos");
                      allTexts.push({
                        id: `c2dx_plist_${relP}_${key}`,
                        file: relP,
                        key,
                        original: val,
                        clean: val,
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "plist"
                      });
                    }
                  }
                } catch (e) {}
              } else if (ext === ".strings") {
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)";/g;
                  let match;
                  while ((match = regex.exec(content)) !== null) {
                    const key = match[1];
                    const val = match[2].trim();
                    if (val.length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(val, "cocos");
                      allTexts.push({
                        id: `c2dx_strings_${relP}_${key}`,
                        file: relP,
                        key,
                        original: val,
                        clean: val,
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "strings"
                      });
                    }
                  }
                } catch (e) {}
              } else if (ext === ".json" && (relP.toLowerCase().includes("lang") || relP.toLowerCase().includes("string") || relP.toLowerCase().includes("i18n"))) {
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const parsed = JSON.parse(content);
                  for (const [k, v] of Object.entries(parsed)) {
                    if (typeof v === "string" && v.trim().length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "cocos");
                      allTexts.push({
                        id: `c2dx_json_${relP}_${k}`,
                        file: relP,
                        key: k,
                        original: v.trim(),
                        clean: v.trim(),
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "json"
                      });
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      };
      walk(sDir);
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
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "cocos2dx" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const fmt = fileTexts[0].format;
      try {
        if (fmt === "json") {
          const content = fs.readFileSync(fullPath, "utf8");
          const parsed = JSON.parse(content);
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              parsed[t.key] = restored.restoredText;
              modified = true;
              appliedCount++;
            }
          }
          if (modified) {
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8");
            modifiedFiles.add(fullPath);
          }
        } else if (fmt === "plist") {
          let content = fs.readFileSync(fullPath, "utf8");
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              const escapedKey = t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp(`(<key>${escapedKey}<\\/key>\\s*<string>)[^<]*(<\\/string>)`, 'g');
              if (pattern.test(content)) {
                content = content.replace(pattern, `$1${restored.restoredText}$2`);
                modified = true;
                appliedCount++;
              }
            }
          }
          if (modified) {
            fs.writeFileSync(fullPath, content, "utf8");
            modifiedFiles.add(fullPath);
          }
        } else if (fmt === "strings") {
          let content = fs.readFileSync(fullPath, "utf8");
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              const escapedKey = t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp(`("${escapedKey}"\\s*=\\s*")[^"]*(";)` , 'g');
              if (pattern.test(content)) {
                content = content.replace(pattern, `$1${restored.restoredText}$2`);
                modified = true;
                appliedCount++;
              }
            }
          }
          if (modified) {
            fs.writeFileSync(fullPath, content, "utf8");
            modifiedFiles.add(fullPath);
          }
        }
      } catch (e) {}
    }

    return {
      success: true,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Cocos2d-x aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
  }
}

module.exports = Cocos2dxAdapter;
