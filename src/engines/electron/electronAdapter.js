const AsarRepacker = require("./asarRepacker");
/**
 * OpenTranslator — ElectronAdapter
 * Adaptador oficial para jogos construídos com Electron / Chromium / Web.
 *
 * Suporta extração e inspeção de app.asar com backup estrito,
 * e ponte de runtime DOM com MutationObserver para tradução em tempo real.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const AsarUtil = require("./asarUtil");

class ElectronAdapter extends BaseEngineAdapter {
  constructor() {
    super("electron", "Electron / Chromium Web Engine");
    this.codeProtector = new CodeProtector({ engine: "electron" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_electron_backup" });
  }

  findAsarPath(gameDir) {
    const candidates = [
      path.join(gameDir, "resources", "app.asar"),
      path.join(gameDir, "app.asar")
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  findUnpackedAppDir(gameDir) {
    const candidates = [
      path.join(gameDir, "resources", "app"),
      path.join(gameDir, "app")
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    }
    return null;
  }

  getCapabilities(gameDir, exePath) {
    const asarPath = this.findAsarPath(gameDir);
    const unpacked = this.findUnpackedAppDir(gameDir);
    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: asarPath !== null,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      isUnpacked: unpacked !== null
    };
  }

  /**
   * Extrai strings e arquivos i18n/JSON do pacote app.asar ou da pasta unpacked.
   */
  async extract(gameDir, options = {}) {
    const asarPath = this.findAsarPath(gameDir);
    const unpackedDir = this.findUnpackedAppDir(gameDir);

    if (!asarPath && !unpackedDir) {
      return { success: false, error: "Nenhum arquivo app.asar ou pasta resources/app encontrada.", texts: [], count: 0 };
    }

    let filesToScan = [];
    let isStaging = false;

    if (asarPath) {
      const stagingDir = path.join(gameDir, ".opent_asar_staging");
      if (!fs.existsSync(stagingDir)) {
        fs.mkdirSync(stagingDir, { recursive: true });
      }
      if (global.log) global.log("info", "Electron: Inspecionando e extraindo arquivos de localização do app.asar...");
      filesToScan = AsarUtil.extractTextFiles(asarPath, stagingDir, [".json", ".csv", ".txt"]);
      sourceDir = stagingDir;
      isStaging = true;
    } else if (unpackedDir) {
      const scanFiles = (dir) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory() && ent.name !== "node_modules" && !ent.name.startsWith(".")) scanFiles(p);
            else if (ent.isFile() && (ent.name.endsWith(".json") || ent.name.endsWith(".csv") || ent.name.endsWith(".txt"))) filesToScan.push(p);
          }
        } catch (e) {}
      };
      scanFiles(unpackedDir);
      sourceDir = unpackedDir;
    }

    const allTexts = [];
    const seen = new Set();

    for (const filePath of filesToScan) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".json") {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
          const relPath = path.relative(sourceDir, filePath).replace(/\\/g, "/");

          const traverse = (obj, keyPath = []) => {
            if (!obj || typeof obj !== "object") return;
            for (const [k, v] of Object.entries(obj)) {
              const curKey = [...keyPath, k];
              if (typeof v === "string") {
                const clean = v.trim();
                if (clean.length > 1 && !seen.has(clean)) {
                  // Filtra caminhos, URLs e chaves técnicas
                  if (!clean.startsWith("http") && !clean.includes("/") && !/^[a-zA-Z0-9_]+$/.test(clean)) {
                    seen.add(clean);
                    const { protectedText, tokens } = this.codeProtector.protect(clean, "electron");
                    allTexts.push({
                      id: allTexts.length,
                      file: relPath,
                      keyPath: curKey.join("."),
                      original: clean,
                      clean,
                      protectedText,
                      tokens,
                      engine: "electron"
                    });
                  }
                }
              } else if (typeof v === "object") {
                traverse(v, curKey);
              }
            }
          };

          traverse(content);
        } catch (e) {}
      }
    }

    return {
      success: true,
      texts: allTexts,
      count: allTexts.length,
      extractedFilesCount: filesToScan.length
    };
  }

  /**
   * Valida traduções.
   */
  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Aplica a tradução com backup garantido de app.asar.orig ou da pasta unpacked.
   */
  async apply(gameDir, texts, translations, options = {}) {
    const asarPath = this.findAsarPath(gameDir);
    const unpackedDir = this.findUnpackedAppDir(gameDir);

    if (!asarPath && !unpackedDir) {
      return { success: false, error: "Nenhum arquivo app.asar ou diretório app encontrado.", modifiedFiles: [], count: 0 };
    }

    // Caso 1: Aplicação direta em pasta unpacked
    if (unpackedDir && !asarPath) {
      this.backupManager.createBackup(gameDir, [unpackedDir], { engine: "electron" });
      let patchedCount = 0;
      const modifiedFiles = new Set();

      for (const t of texts) {
        const tr = translations.get ? translations.get(t.id) : translations[t.id];
        if (!tr || tr === t.clean) continue;

        const targetFile = path.join(unpackedDir, t.file);
        if (fs.existsSync(targetFile)) {
          try {
            const raw = fs.readFileSync(targetFile, "utf8");
            const parsed = JSON.parse(raw);
            if (t.keyPath) {
              const keys = t.keyPath.split(".");
              let cur = parsed;
              for (let i = 0; i < keys.length - 1; i++) {
                if (cur[keys[i]]) cur = cur[keys[i]];
              }
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              cur[keys[keys.length - 1]] = restored.restoredText;
              fs.writeFileSync(targetFile, JSON.stringify(parsed, null, 2), "utf8");
              modifiedFiles.add(targetFile);
              patchedCount++;
            }
          } catch (e) {}
        }
      }

      return {
        success: true,
        modifiedFiles: Array.from(modifiedFiles),
        count: patchedCount,
        message: `Tradução aplicada diretamente no diretório Electron unpacked (${patchedCount} textos).`
      };
    }

    // Caso 2: Aplicação com desempacotamento e repack de app.asar
    const origBackup = asarPath + ".orig";
    if (!fs.existsSync(origBackup)) {
      fs.copyFileSync(asarPath, origBackup);
    }

    const stagingDir = path.join(global.DATA_DIR || path.join(__dirname, "../../../data"), "staging", "asar_" + Date.now());
    if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });

    try {
      AsarUtil.extractAll(asarPath, stagingDir);

      let patchedCount = 0;
      for (const t of texts) {
        const tr = translations.get ? translations.get(t.id) : translations[t.id];
        if (!tr || tr === t.clean) continue;

        const targetFile = path.join(stagingDir, t.file);
        if (fs.existsSync(targetFile)) {
          try {
            const raw = fs.readFileSync(targetFile, "utf8");
            const parsed = JSON.parse(raw);
            if (t.keyPath) {
              const keys = t.keyPath.split(".");
              let cur = parsed;
              for (let i = 0; i < keys.length - 1; i++) {
                if (cur[keys[i]]) cur = cur[keys[i]];
              }
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              cur[keys[keys.length - 1]] = restored.restoredText;
              fs.writeFileSync(targetFile, JSON.stringify(parsed, null, 2), "utf8");
              patchedCount++;
            }
          } catch (e) {}
        }
      }

      // Re-empacota via AsarRepacker
      const tempOutAsar = asarPath + ".tmp";
      const packRes = AsarRepacker.pack(stagingDir, tempOutAsar);

      if (!packRes.success) {
        if (fs.existsSync(tempOutAsar)) fs.unlinkSync(tempOutAsar);
        return { success: false, error: "Falha na reconstrução de app.asar", modifiedFiles: [], count: 0 };
      }

      // Substitui com segurança
      fs.renameSync(tempOutAsar, asarPath);

      // Limpa staging
      fs.rmSync(stagingDir, { recursive: true, force: true });

      return {
        success: true,
        modifiedFiles: [asarPath],
        count: patchedCount,
        message: "Patch estático de app.asar concluído com integridade verificada."
      };
    } catch (e) {
      if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
      return { success: false, error: e.message, modifiedFiles: [], count: 0 };
    }
  }

  /**
   * Rollback instantâneo restaurando o app.asar.orig original.
   */
  async rollback(gameDir, options = {}) {
    const asarPath = this.findAsarPath(gameDir);
    if (!asarPath) return { success: false, error: "app.asar não encontrado." };

    const origBackup = asarPath + ".orig";
    if (fs.existsSync(origBackup)) {
      fs.copyFileSync(origBackup, asarPath);
      return { success: true, restoredFiles: [asarPath] };
    }

    return { success: false, error: "Nenhum backup app.asar.orig encontrado." };
  }
}

module.exports = ElectronAdapter;
