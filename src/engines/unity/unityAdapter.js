/**
 * OpenTranslator — UnityAdapter 3.0
 * Adaptador oficial para jogos desenvolvidos em Unity Engine (Mono e IL2CPP).
 * Suporte nativo a:
 * - Serialized TextAssets em .assets / resources.assets / sharedassets*.assets
 * - Dicionários offline do AutoTranslator / BepInEx
 * - Tabelas de localização CSV, JSON e Textos estruturados
 * - Preservação estrita de tokens Unity rich text (<color>, {0}, %s, \n)
 * - Backup transacional e rollback SHA-256 via BackupManager
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { randomUUID } = require("crypto");
const { execFileSync } = require("child_process");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const { rollbackResult } = require('../rollbackResult.js');
const { PartialReport } = require('../../core/partialApply');

class UnityAdapter extends BaseEngineAdapter {
  constructor() {
    super("unity", "Unity Engine");
    this.codeProtector = new CodeProtector("unity");
    this.backupManager = new BackupManager({ backupDirName: ".opent_unity_backup" });
    this.bridgeScript = path.resolve(__dirname, "unity_asset_bridge.py");
  }

  getDetailedDeclaration() {
    return {
      engine: "unity",
      name: "Unity Engine",
      versions: ["Unity Mono", "Unity IL2CPP", "2018.x - 2023.x", "6.x"],
      staticTranslation: true,
      runtimeTranslation: true,
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
    const { resolvePythonBinary } = require("../../utils/pythonResolver");
    const bundled = path.resolve(__dirname, '../../../resources/renpy/python/python.exe');
    if (fs.existsSync(bundled)) return bundled;
    return resolvePythonBinary();
  }

  isIl2cpp(gameDir) {
    if (fs.existsSync(path.join(gameDir, "GameAssembly.dll"))) return true;
    try {
      const entries = fs.readdirSync(gameDir);
      for (const e of entries) {
        if (e.toLowerCase().endsWith("_data") && fs.existsSync(path.join(gameDir, e, "il2cpp_data"))) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  hasBepInEx(gameDir) {
    return fs.existsSync(path.join(gameDir, "BepInEx", "core")) ||
           fs.existsSync(path.join(gameDir, "doorstop_config.ini")) ||
           fs.existsSync(path.join(gameDir, "winhttp.dll"));
  }

  resolveUnityRoot(gameDir) {
    if (this.isIl2cpp(gameDir) || this.hasBepInEx(gameDir) || fs.existsSync(path.join(gameDir, "AutoTranslator"))) {
      return gameDir;
    }
    try {
      const entries = fs.readdirSync(gameDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith(".")) {
          const sub = path.join(gameDir, e.name);
          if (this.isIl2cpp(sub) || this.hasBepInEx(sub) || fs.existsSync(path.join(sub, "AutoTranslator")) || fs.existsSync(path.join(sub, "UnityPlayer.dll"))) {
            return sub;
          }
        }
      }
    } catch (e) {}
    return gameDir;
  }

  getCapabilities(gameDir, exePath) {
    const root = this.resolveUnityRoot(gameDir);
    const isIl2cpp = this.isIl2cpp(root);
    const hasHook = !isIl2cpp && (this.hasBepInEx(root) || fs.existsSync(path.join(root, "AutoTranslator")));

    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: true,
      runtimeHook: hasHook,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: isIl2cpp ? "Serialized TextAsset / Localization Bridge" : (hasHook ? "BepInEx / AutoTranslator Runtime Hook" : "Serialized Asset / Text Scanner")
    };
  }

  _findManagedAssembly(root) {
    try {
      const entries = fs.readdirSync(root);
      for (const e of entries) {
        if (e.toLowerCase().endsWith("_data")) {
          const managedDir = path.join(root, e, "Managed");
          if (fs.existsSync(managedDir)) {
            const candidate = path.join(managedDir, "Assembly-CSharp.dll");
            if (fs.existsSync(candidate)) return candidate;
            const dlls = fs.readdirSync(managedDir).filter(f => f.endsWith(".dll"));
            for (const d of dlls) {
              if (d.startsWith("Assembly-") || d.includes("Game") || d.includes("Main")) {
                return path.join(managedDir, d);
              }
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Extração unificada de textos de jogos Unity (Mono e IL2CPP).
   */
  async extract(gameDir, options = {}) {
    const root = this.resolveUnityRoot(gameDir);
    const isIl2cpp = this.isIl2cpp(root);
    const pyBin = this.getPythonBin();

    try {
      let rawTexts = [];
      let assetBridgeError = null;
      let diagnostics = null;
      try {
        const stdout = execFileSync(
          pyBin,
          [this.bridgeScript, "--game-dir", root, "--mode", "extract", "--source-language", options.sl || 'auto'],
          { maxBuffer: 100 * 1024 * 1024, cwd: root }
        ).toString("utf-8");

        const bridgeResult = JSON.parse(stdout);
        if (bridgeResult.success !== true || !Array.isArray(bridgeResult.texts)) {
          throw new Error(bridgeResult.error || 'Unity asset bridge returned invalid extraction data.');
        }
        rawTexts = bridgeResult.texts || [];
        diagnostics = bridgeResult.diagnostics || null;
      } catch (assetErr) {
        assetBridgeError = assetErr;
        // Keep the failure unless the managed-assembly fallback actually succeeds.
      }

      // If no serialized TextAssets found and engine is Mono, extract managed assembly literals
      if (rawTexts.length === 0 && !isIl2cpp && !assetBridgeError && options.includeManagedLiterals === true) {
        const managedAsm = this._findManagedAssembly(root);
        if (managedAsm && fs.existsSync(managedAsm)) {
          const cecilScript = path.resolve(__dirname, "cecil_bridge.ps1");
          const tempOut = path.join(os.tmpdir(), `opent-managed-${randomUUID()}.json`);
          try {
            execFileSync("powershell.exe", [
              "-ExecutionPolicy", "Bypass",
              "-File", cecilScript,
              "-AssemblyPath", managedAsm,
              "-Mode", "extract",
              "-OutputFile", tempOut
            ], { maxBuffer: 100 * 1024 * 1024, cwd: root });

            if (fs.existsSync(tempOut)) {
              const cecilRes = JSON.parse(fs.readFileSync(tempOut, "utf-8").replace(/^\uFEFF/, ""));
              fs.unlinkSync(tempOut);
              if (cecilRes.success && Array.isArray(cecilRes.texts)) {
                const relFile = path.relative(root, managedAsm).replace(/\\/g, "/");
                rawTexts = cecilRes.texts.map(t => ({
                  ...t,
                  file: relFile
                }));
              }
            }
          } catch (cecilErr) {
            if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
          }
        }
      }

      if (!rawTexts.length) {
        let error = 'The Unity extractor found no supported text. The game may store dialogue in bundles, compiled resources or runtime UI.';
        let status = 'STATIC_TEXT_NOT_EXPOSED';
        if (assetBridgeError) {
          status = 'UNITY_ASSET_BRIDGE_FAILED';
          error = 'Could not read Unity resources: ' + assetBridgeError.message;
        } else if (diagnostics?.unityPyAvailable === false) {
          status = 'UNITYPY_REQUIRED';
          error = 'UnityPy is unavailable to the selected Python runtime. Unity serialized assets could not be scanned.';
        } else if (diagnostics?.failedAssets?.length) {
          status = 'UNITY_ASSET_READ_FAILED';
          error = `No supported text found and ${diagnostics.failedAssets.length} serialized asset files could not be read.`;
        }
        return { success: false, status, error, diagnostics, isIl2cpp, texts: [], count: 0, universeComplete: false };
      }

      const protectedTexts = [];
      for (const t of rawTexts) {
        const textToProtect = t.clean || t.original || "";
        const { protectedText, tokens } = this.codeProtector.protect(textToProtect, "unity");
        protectedTexts.push({
          ...t,
          clean: protectedText,
          protectedText,
          tokens: tokens || [],
          engine: "unity"
        });
      }

      return {
        success: true,
        isIl2cpp,
        texts: protectedTexts,
        count: protectedTexts.length
      };
    } catch (err) {
      return {
        success: false,
        isIl2cpp,
        texts: [],
        count: 0,
        error: err.message
      };
    }
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Aplicação segura e reversível de traduções para jogos Unity.
   */
  async apply(gameDir, texts, translations, options = {}) {
const root = this.resolveUnityRoot(gameDir);
    const isIl2cpp = this.isIl2cpp(root);
    const accApply = new PartialReport();

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
          const fullPath = path.join(root, t.file);
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
      const backup = this.backupManager.createSessionBackup(root, filesToBackup, {
        sessionId: options.sessionId,
        transactionId: options.transactionId,
        backupId: options.backupId,
        engine: "unity"
      });
      if (!backup.success) return { success: false, count: 0, modifiedFiles: [], error: backup.error };
    }

    // 3. Separa itens de Managed Assembly (Cecil) e Assets (UnityPy)
    const managedItems = itemsToInject.filter(it => it.format === "managed_ldstr");
    const assetItems = itemsToInject.filter(it => it.format !== "managed_ldstr");
    const modifiedFiles = [];
    let totalInjected = 0;

    // Injeta Managed Assemblies
    if (managedItems.length > 0) {
      const managedAsm = this._findManagedAssembly(root);
      if (managedAsm && fs.existsSync(managedAsm)) {
        const payloadFile = path.join(root, ".opentranslator_cecil_payload.json");
        try {
          fs.writeFileSync(payloadFile, JSON.stringify({ items: managedItems }, null, 2), "utf-8");
          const cecilScript = path.resolve(__dirname, "cecil_bridge.ps1");
          execFileSync("powershell.exe", [
            "-ExecutionPolicy", "Bypass",
            "-File", cecilScript,
            "-AssemblyPath", managedAsm,
            "-Mode", "inject",
            "-PayloadFile", payloadFile
          ], { maxBuffer: 100 * 1024 * 1024, cwd: root });

          modifiedFiles.push(managedAsm);
          totalInjected += managedItems.length;
        } finally {
          if (fs.existsSync(payloadFile)) {
            try { fs.unlinkSync(payloadFile); } catch (_) {}
          }
        }
      }
    }

    // Injeta Assets normais
    if (assetItems.length > 0) {
      const payloadFile = path.join(root, "opentranslator_unity_payload.json");
      try {
        fs.writeFileSync(payloadFile, JSON.stringify({ items: assetItems }, null, 2), "utf-8");
        const pyBin = this.getPythonBin();
        const stdout = execFileSync(
          pyBin,
          [this.bridgeScript, "--game-dir", root, "--mode", "inject", "--payload", payloadFile],
          { maxBuffer: 100 * 1024 * 1024, cwd: root }
        ).toString("utf-8");

        const res = JSON.parse(stdout);
        if (!res.success || !Number.isInteger(res.count) || res.count <= 0) {
          return { success: false, count: 0, modifiedFiles, error: res.error || 'Unity did not apply any asset translations.' };
        }
        if (res.modifiedFiles) {
          modifiedFiles.push(...res.modifiedFiles);
        }
        totalInjected += res.count;
      } finally {
        // FASE 9 / PASSO 57 — este `try` foi reconstituido. O conversor casou
        // apenas a cauda `catch (_) {}` da linha e derrubou o `try {` junto,
        // dejando `} catch` solto. Reparo manual, e por isso o lote SEMPRE
        // passa por `node --check` antes de ser considerado bom.
        if (fs.existsSync(payloadFile)) {
          try {
            fs.unlinkSync(payloadFile);
          } catch (e) {
            // FASE 9 / PASSO 57 — o payload nao saiu. Ele e um arquivo
            // temporario injected no jogo; deixar ele para tras e acumulo de
            // lixo dentro do build, e em alguns casos e lido pelo loader.
            accApply.fail(payloadFile, e);
          }
        }
      }
    }

    return accApply.report({
      modifiedFiles: modifiedFiles.length > 0 ? modifiedFiles : filesToBackup,
      count: totalInjected,
      message: `Tradução Unity aplicada com sucesso (${totalInjected} textos).`
});
  }

  async rollback(gameDir, options = {}) {
    const root = this.resolveUnityRoot(gameDir);
    const res = this.backupManager.restoreSessionBackup(root, options);
    return rollbackResult(res, this.id || this.engineId || "unknown", {
      // FASE 7 — success:true era literal, mesmo sem saber se algum arquivo
      // foi restaurado. Um rollback que "deu certo" sem tocar em nada é pior
      // do que um que falhou: o usuário acredita que o jogo voltou ao original
      // quando talvez nem tenha sido tocado.
      source: "sessionBackup",
    });
  }
}

module.exports = UnityAdapter;
