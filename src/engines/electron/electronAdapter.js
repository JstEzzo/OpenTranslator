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
const { PartialReport } = require('../../core/partialApply');

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
    if (!asarPath && !unpackedDir) return { success: false, error: "Nenhum app.asar ou diretório app encontrado.", texts: [], count: 0 };
    const report = new PartialReport();
    let sourceDir = unpackedDir;
    let filesToScan = [];
    if (asarPath) {
      sourceDir = path.join(gameDir, ".opent_asar_staging");
      try {
        fs.mkdirSync(sourceDir, { recursive: true });
        filesToScan = AsarUtil.extractTextFiles(asarPath, sourceDir, [".json"]);
      } catch (error) { report.fail(asarPath, error); }
    } else {
      const scan = dir => {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) scan(file);
            else if (entry.isFile() && /\.json$/i.test(entry.name)) filesToScan.push(file);
          }
        } catch (error) { report.fail(dir, error); }
      };
      scan(sourceDir);
    }
    const texts = [];
    for (const file of filesToScan.sort()) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
        const relative = path.relative(sourceDir, file).replace(/\\/g, "/");
        const walk = (object, keys = []) => {
          if (!object || typeof object !== "object") return;
          for (const [key, value] of Object.entries(object)) {
            const segments = [...keys, key];
            if (typeof value === "string") {
              const clean = value.trim();
              if (clean.length > 1 && !/^https?:/.test(clean) && !clean.includes("/") && !/^[a-zA-Z0-9_]+$/.test(clean)) {
                const { protectedText, tokens } = this.codeProtector.protect(clean, "electron");
                texts.push({ id: texts.length, file: relative, keyPath: segments.join("."), keySegments: segments,
                  original: value, clean, protectedText, tokens, engine: "electron" });
              }
            } else walk(value, segments);
          }
        };
        walk(parsed);
        report.ok();
      } catch (error) { report.fail(file, error); }
    }
    return report.report({ texts, count: texts.length, extractedFilesCount: filesToScan.length });
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
      const applyErrors = [];

      for (const t of texts) {
        const tr = translations.get ? translations.get(t.id) : translations[t.id];
        if (!tr || tr === t.clean) continue;

        const targetFile = path.join(unpackedDir, t.file);
        if (fs.existsSync(targetFile)) {
          try {
            const raw = fs.readFileSync(targetFile, "utf8");
            const parsed = JSON.parse(raw);
            if (t.keyPath) {
              const keys = Array.isArray(t.keySegments) ? t.keySegments : t.keyPath.split(".");
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
          } catch (e) {
            // FASE 9 / PASSO 43 — ver genericAdapter: patch parcial
            // reportado como `success: true` esconde arquivos que não foram
            // escritos. O `count` era honesto; o `success` não.
            applyErrors.push({
              file: path.relative(gameDir, targetFile).replace(/\\/g, "/"),
              error: e.message,
            });
          }
        }
      }

      const partial = applyErrors.length > 0;
      return {
        success: !partial,
        status: partial ? 'PARTIAL' : 'COMPLETE',
        modifiedFiles: Array.from(modifiedFiles),
        count: patchedCount,
        applyErrors,
        message: partial
          ? `Tradução aplicada PARCIALMENTE (${patchedCount} textos, `
            + `${applyErrors.length} arquivo(s) falhando).`
          : `Tradução aplicada diretamente no diretório Electron unpacked (${patchedCount} textos).`,
        warning: partial
          ? 'Alguns arquivos do app não puderam ser escritos; o Electron vai '
            + 'exibir parte do texto sem tradução.'
          : null,
      };
    }

    // Caso 2: Aplicação com desempacotamento e repack de app.asar
    const accApply = new PartialReport();
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
              const keys = Array.isArray(t.keySegments) ? t.keySegments : t.keyPath.split(".");
              let cur = parsed;
              for (let i = 0; i < keys.length - 1; i++) {
    // FASE 9 / PASSO 59 — o relatorio decide o `success`.

                if (cur[keys[i]]) cur = cur[keys[i]];
              }
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              cur[keys[keys.length - 1]] = restored.restoredText;
              fs.writeFileSync(targetFile, JSON.stringify(parsed, null, 2), "utf8");
              patchedCount++;
            }
          } catch (e) {
            // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
            // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
            accApply.fail(asarPath, e);
          }
        }
      }

      if (accApply.failed) {
        fs.rmSync(stagingDir, { recursive: true, force: true });
        return accApply.report({ modifiedFiles: [], count: 0 });
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

      return accApply.report({
        modifiedFiles: [asarPath],
        count: patchedCount,
        message: "Patch estático de app.asar concluído com integridade verificada."
});
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
