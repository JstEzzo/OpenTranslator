/**
 * OpenTranslator — WolfAdapter 2.0
 * Adaptador oficial para jogos desenvolvidos em Wolf RPG Editor (v2.x e v3.x).
 * Suporte nativo e genérico a:
 * - Bancos de dados e eventos compilados (BasicData/*.dat: CommonEvent.dat, DataBase.dat, CDataBase.dat)
 * - Mapas de eventos (MapData/*.mps)
 * - Dicionários e scripts avulsos (.txt, .json, .csv)
 * - Proteção de códigos de controle e variáveis (\cself[x], \v[x], @x\n)
 * - Backup transacional e rollback SHA-256 via BackupManager
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class WolfAdapter extends BaseEngineAdapter {
  constructor() {
    super("wolf", "Wolf RPG Editor");
    this.codeProtector = new CodeProtector({ engine: "wolf" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_wolf_backup" });
    this.bridgeScript = path.resolve(__dirname, 'wolf_data_bridge.py');
    this.uberWolfExe = path.join(global.ROOT || path.resolve(__dirname, '../../../'), 'resources', 'UberWolfCli.exe');
  }

  getDetailedDeclaration() {
    return {
      engine: "wolf",
      name: "Wolf RPG Editor",
      versions: ["Wolf RPG Editor 2.x", "3.x"],
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

  getPythonBin() {
    const candidate = "C:\\Users\\Teste\\AppData\\Roaming\\uv\\python\\cpython-3.12.8-windows-x86_64-none\\python.exe";
    if (fs.existsSync(candidate)) return candidate;
    return "python";
  }

  getCapabilities(gameDir, exePath) {
    const hasDataWolf = fs.existsSync(path.join(gameDir, "data.wolf"));
    const hasBasicData = fs.existsSync(path.join(gameDir, "Data", "BasicData")) || fs.existsSync(path.join(gameDir, "data", "BasicData"));

    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: hasDataWolf,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: hasBasicData ? "Native Wolf Binary Data Bridge (BasicData/*.dat, MapData/*.mps)" : (hasDataWolf ? "Wolf RPG Data Unpack via UberWolfCli" : "Generic Static Scanner / OCR Fallback")
    };
  }

  async extract(gameDir, options = {}) {
    const pyBin = this.getPythonBin();
    try {
      const stdout = execFileSync(
        pyBin,
        [this.bridgeScript, "--game-dir", gameDir, "--mode", "extract"],
        { maxBuffer: 100 * 1024 * 1024, cwd: gameDir }
      ).toString("utf-8");

      const bridgeResult = JSON.parse(stdout);
      const rawTexts = bridgeResult.texts || [];

      const protectedTexts = [];
      for (const t of rawTexts) {
        const textToProtect = t.clean || t.original || "";
        const { protectedText, tokens } = this.codeProtector.protect(textToProtect, "wolf");
        protectedTexts.push({
          ...t,
          clean: protectedText,
          protectedText,
          tokens: tokens || [],
          engine: "wolf"
        });
      }

      return {
        success: true,
        texts: protectedTexts,
        count: protectedTexts.length
      };
    } catch (err) {
      return {
        success: false,
        texts: [],
        count: 0,
        error: err.message
      };
    }
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // 1. Identifica arquivos que serão modificados para backup prévio
    const filesToBackupSet = new Set();
    const itemsToInject = [];

    for (const t of texts) {
      const tr = (translations instanceof Map) ? translations.get(t.id) : (translations ? translations[t.id] : null);
      if (tr && tr !== (t.clean || t.original)) {
        let restored = tr;
        if (t.tokens && t.tokens.length > 0) {
          const res = this.codeProtector.restore(tr, t.tokens);
          restored = res.restoredText;
        }

        if (t.file) {
          const fullPath = path.join(gameDir, t.file);
          if (fs.existsSync(fullPath)) {
            filesToBackupSet.add(fullPath);
          }
        }

        itemsToInject.push({
          ...t,
          translation: restored
        });
      }
    }

    if (itemsToInject.length === 0) {
      return {
        success: true,
        modifiedFiles: [],
        count: 0,
        message: "Nenhuma tradução fornecida para aplicação."
      };
    }

    // 2. Cria backup seguro com manifesto SHA-256
    const filesToBackup = Array.from(filesToBackupSet);
    if (options.skipBackup !== true && filesToBackup.length > 0) {
      this.backupManager.createSessionBackup(gameDir, filesToBackup, {
        sessionId: options.sessionId,
        transactionId: options.transactionId,
        backupId: options.backupId,
        engine: "wolf"
      });
    }

    // 3. Executa injeção através da ponte Python
    const payloadFile = path.join(gameDir, "opentranslator_wolf_payload.json");
    try {
      fs.writeFileSync(payloadFile, JSON.stringify({ items: itemsToInject }, null, 2), "utf-8");

      const pyBin = this.getPythonBin();
      const stdout = execFileSync(
        pyBin,
        [this.bridgeScript, "--game-dir", gameDir, "--mode", "inject", "--payload", payloadFile],
        { maxBuffer: 100 * 1024 * 1024, cwd: gameDir }
      ).toString("utf-8");

      if (fs.existsSync(payloadFile)) {
        try { fs.unlinkSync(payloadFile); } catch (e) {}
      }

      const res = JSON.parse(stdout);
      return {
        success: res.success !== false,
        modifiedFiles: res.modifiedFiles || filesToBackup,
        count: res.count || itemsToInject.length,
        message: `Tradução Wolf RPG aplicada com sucesso (${res.count || itemsToInject.length} textos em ${(res.modifiedFiles || filesToBackup).length} arquivos).`
      };
    } catch (err) {
      if (fs.existsSync(payloadFile)) {
        try { fs.unlinkSync(payloadFile); } catch (e) {}
      }
      return {
        success: false,
        modifiedFiles: [],
        count: 0,
        error: err.message
      };
    }
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreSessionBackup(gameDir, options);
    const backupBase = path.join(gameDir, ".opent_wolf_backup");
    try {
      if (fs.existsSync(backupBase)) {
        fs.rmSync(backupBase, { recursive: true, force: true });
      }
    } catch (_) {}
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

module.exports = WolfAdapter;
