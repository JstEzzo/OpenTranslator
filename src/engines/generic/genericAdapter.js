/**
 * OpenTranslator — GenericAdapter
 * Adaptador para engines desconhecidas ou não catalogadas.
 * Realiza varredura universal de arquivos de texto/localização e fornece fallback completo para OCR.
 * Integrado estritamente com TextClassifier para nunca modificar código, identificadores ou binários.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const TextClassifier = require("../../core/textClassifier");

class GenericAdapter extends BaseEngineAdapter {
  constructor() {
    super("generic", "Engine Genérica / Scanner Universal");
    this.codeProtector = new CodeProtector({ engine: "generic" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_generic_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "generic",
      name: "Generic Engine / Scanner Universal",
      versions: ["Qualquer engine não catalogada"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: false,
      fonts: false,
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
      nativeLocalization: false,
      archives: false,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Universal Structured String Scanner & Classifier"
    };
  }

  async extract(gameDir, options = {}) {
    const textExts = new Set([".json", ".txt", ".csv", ".po", ".xml", ".ini", ".yaml", ".yml", ".ts", ".js", ".lua", ".gd"]);
    const rawExtracted = [];

    const scanDir = (dir, depth = 0) => {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== ".git") {
              scanDir(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (textExts.has(ext)) {
              try {
                const stat = fs.statSync(fullPath);
                if (stat.size < 5 * 1024 * 1024) {
                  const content = fs.readFileSync(fullPath, "utf8");
                  const relPath = path.relative(gameDir, fullPath).replace(/\\/g, "/");

                  if (ext === ".json") {
                    try {
                      const parsed = JSON.parse(content);
                      const parseJson = (obj, pathKey = "") => {
                        if (typeof obj === "string") {
                          rawExtracted.push({
                            id: `gen_json_${rawExtracted.length}`,
                            file: relPath,
                            key: pathKey,
                            original: obj.trim(),
                            clean: obj.trim(),
                            engine: "generic"
                          });
                        } else if (typeof obj === "object" && obj !== null) {
                          for (const [k, v] of Object.entries(obj)) parseJson(v, pathKey ? `${pathKey}.${k}` : k);
                        }
                      };
                      parseJson(parsed);
                    } catch (e) {}
                  } else {
                    const lines = content.split("\n");
                    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
                      const l = lines[lIdx].trim();
                      if (l.length > 2 && !l.startsWith("#") && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith(";")) {
                        rawExtracted.push({
                          id: `gen_txt_${relPath}_${lIdx}`,
                          file: relPath,
                          line: lIdx + 1,
                          original: l,
                          clean: l,
                          engine: "generic"
                        });
                      }
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    scanDir(gameDir);

    const { translatable, filteredOut } = TextClassifier.filterTranslatable(rawExtracted, 0.65);
    const finalTexts = [];

    for (const t of translatable) {
      const { protectedText, tokens } = this.codeProtector.protect(t.clean, "generic");
      finalTexts.push({
        ...t,
        protectedText,
        tokens
      });
    }

    return {
      success: true,
      texts: finalTexts,
      count: finalTexts.length,
      filteredOutCount: filteredOut.length
    };
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
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "generic" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    try {
      for (const [relPath, fileTexts] of byFile.entries()) {
        const fullPath = path.join(gameDir, relPath);
        if (!fs.existsSync(fullPath)) continue;

        const ext = path.extname(relPath).toLowerCase();
        if (ext === ".json") {
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            const parsed = JSON.parse(content);

            const setNestedKey = (obj, keyPath, val) => {
              if (!keyPath) return;
              const parts = keyPath.split(".");
              let cur = obj;
              for (let i = 0; i < parts.length - 1; i++) {
                if (cur[parts[i]] === undefined || cur[parts[i]] === null) return;
                cur = cur[parts[i]];
              }
              cur[parts[parts.length - 1]] = val;
            };

            let fileModified = false;
            for (const t of fileTexts) {
              const tr = translations.get ? translations.get(t.id) : translations[t.id];
              if (tr && tr !== t.original) {
                const restored = this.codeProtector.restore(tr, t.tokens || []);
                setNestedKey(parsed, t.key, restored.restoredText);
                fileModified = true;
                appliedCount++;
              }
            }

            if (fileModified) {
              fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8");
              modifiedFiles.add(fullPath);
            }
          } catch (e) {}
        } else {
          try {
            const rawContent = fs.readFileSync(fullPath, "utf8");
            const lines = rawContent.split("\n");
            let fileModified = false;

            for (const t of fileTexts) {
              const tr = translations.get ? translations.get(t.id) : translations[t.id];
              if (tr && tr !== t.original && t.line && t.line <= lines.length) {
                const restored = this.codeProtector.restore(tr, t.tokens || []);
                const lIdx = t.line - 1;
                if (lines[lIdx].includes(t.original)) {
                  lines[lIdx] = lines[lIdx].replace(t.original, restored.restoredText);
                } else {
                  lines[lIdx] = restored.restoredText;
                }
                fileModified = true;
                appliedCount++;
              }
            }

            if (fileModified) {
              fs.writeFileSync(fullPath, lines.join("\n"), "utf8");
              modifiedFiles.add(fullPath);
            }
          } catch (e) {}
        }
      }

      return {
        success: true,
        modifiedFiles: Array.from(modifiedFiles),
        count: appliedCount,
        message: `Traduções estáticas aplicadas com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
      };
    } catch (err) {
      await this.rollback(gameDir);
      return {
        success: false,
        error: `Falha ao aplicar traduções genéricas: ${err.message}`,
        modifiedFiles: []
      };
    }
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return {
      success: res.success,
      restoredFiles: res.restoredFiles || [gameDir]
    };
  }
}

module.exports = GenericAdapter;
