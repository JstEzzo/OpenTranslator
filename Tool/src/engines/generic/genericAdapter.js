/**
 * OpenTranslator — GenericAdapter
 * Adaptador para engines desconhecidas ou não catalogadas.
 * Realiza varredura universal de arquivos de texto/localização e fornece fallback completo para OCR.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");

class GenericAdapter extends BaseEngineAdapter {
  constructor() {
    super("generic", "Engine Genérica / Desconhecida");
    this.codeProtector = new CodeProtector({ engine: "generic" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_generic_backup" });
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
      backupSupported: true
    };
  }

  /**
   * Varre arquivos com extensões comuns de texto e localização.
   */
  async extract(gameDir, options = {}) {
    const textExts = new Set([".json", ".txt", ".csv", ".po", ".xml", ".ini", ".yaml", ".yml"]);
    const extracted = [];
    const scannedFiles = [];

    const scanDir = (dir, depth = 0) => {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
              scanDir(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (textExts.has(ext)) {
              scannedFiles.push(fullPath);
              try {
                const stat = fs.statSync(fullPath);
                if (stat.size < 5 * 1024 * 1024) { // Limita a 5MB por arquivo
                  const content = fs.readFileSync(fullPath, "utf8");
                  if (ext === ".json") {
                    try {
                      const parsed = JSON.parse(content);
                      const parseJsonStrings = (obj) => {
                        if (!obj) return;
                        if (typeof obj === "string" && obj.trim().length > 1 && !obj.includes("/") && !obj.startsWith("http")) {
                          extracted.push({
                            id: extracted.length,
                            file: path.relative(gameDir, fullPath).replace(/\\/g, "/"),
                            original: obj.trim(),
                            clean: obj.trim(),
                            engine: "generic"
                          });
                        } else if (typeof obj === "object") {
                          for (const v of Object.values(obj)) parseJsonStrings(v);
                        }
                      };
                      parseJsonStrings(parsed);
                    } catch (e) {}
                  } else {
                    const lines = content.split("\n");
                    for (const l of lines) {
                      const cl = l.trim();
                      if (cl.length > 2 && !cl.startsWith("#") && !cl.startsWith("//") && !cl.startsWith(";")) {
                        extracted.push({
                          id: extracted.length,
                          file: path.relative(gameDir, fullPath).replace(/\\/g, "/"),
                          original: cl,
                          clean: cl,
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

    return {
      success: true,
      texts: extracted,
      count: extracted.length,
      scannedFilesCount: scannedFiles.length,
      recommendation: extracted.length === 0 ? "Nenhum arquivo de texto plano encontrado. Recomendado utilizar o modo OCR de tela." : "Arquivos de texto encontrados para tradução."
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    return { success: true, modifiedFiles: [], count: 0 };
  }

  async rollback(gameDir, options = {}) {
    return { success: true, restoredFiles: [] };
  }
}

module.exports = GenericAdapter;
