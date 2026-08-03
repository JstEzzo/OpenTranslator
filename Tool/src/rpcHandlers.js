const fs = require("fs");
const path = require("path");
const { exec, spawn, spawnSync, execSync } = require("child_process");
const isLaunchingMap = new Set();
const renpyAppDataResolver = require("./renpyAppDataResolver");

const {
  ENGINES_DEF,
  detectEngine,
  detectRenpyVersion,
  resolveRouterEngineType,
  findDataDir,
  unpackNwExe,
  getExeArch,
  getHookDll,
  patchGameData,
  backupGameData,
  restoreGameData,
  restoreOldestBackup,
  checkProcessRunning,
  findGameOnDisk,
  runPythonScript,
  healGameData,
  executeTranslationPipeline
} = require("./gameEngine");

const { loadSyntaxRules } = require("./utils");

const { extractGameTexts } = require("./extractor");

// OpenTranslator Modular Engine Handlers & Protected Router
const BaseEngineHandler = require("./engines/baseEngineHandler");
const RenpyV7Handler = require("./engines/renpy/renpyV7Handler");
const RenpyV8Handler = require("./engines/renpy/renpyV8Handler");
const RpgMakerMvMzHandler = require("./engines/rpgmaker/rpgMakerMvMzHandler");
const RpgMakerRubyHandler = require("./engines/rpgmaker/rpgMakerRubyHandler");

const engineHandlers = {
  RENPY_7: new RenpyV7Handler(),
  RENPY_8: new RenpyV8Handler(),
  RPG_MAKER_MV: new RpgMakerMvMzHandler(),
  RPG_MAKER_MZ: new RpgMakerMvMzHandler(),
  RPG_MAKER_XP: new RpgMakerRubyHandler(),
  RPG_MAKER_VX: new RpgMakerRubyHandler(),
  RPG_MAKER_VX_ACE: new RpgMakerRubyHandler()
};

async function routeEngineAction(action, engineType, params = {}) {
  try {
    let targetEngine = engineType;
    if (!engineHandlers[targetEngine]) {
      targetEngine = resolveRouterEngineType(params.gameExe, params.gameDir);
    }
    const handler = engineHandlers[targetEngine];
    if (!handler) {
      throw new Error(`[OpenTranslator Router] Unsupported or unmapped engine type: ${targetEngine}`);
    }
    if (typeof handler[action] !== 'function') {
      throw new Error(`[OpenTranslator Router] Action '${action}' not supported by ${handler.engineName}`);
    }
    return await handler[action](params);
  } catch (error) {
    if (global.log) {
      global.log("error", `[Fatal Engine Route Error - ${engineType}:${action}]: ${error.message}`);
    }
    return { status: "FAILED", reason: error.message, engine: engineType };
  }
}

async function routeExtractionRequest(engineType, params) {
  return await routeEngineAction('extract', engineType, params);
}

const {
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg,
  getDb
} = require("./cache");

const { translateSingle, translateBatch } = require("./translator");

function extractKnsKeyFromExe(gameDir) {
  try {
    if (!gameDir || !fs.existsSync(gameDir)) return null;
    const files = fs.readdirSync(gameDir);
    const exeFile = files.find((f) => f.toLowerCase().endsWith(".exe"));
    if (!exeFile) return null;
    const exePath = path.join(gameDir, exeFile);
    const buf = fs.readFileSync(exePath);

    const magic = Buffer.from("KNSXCFG1", "ascii");
    const start = buf.lastIndexOf(magic);
    if (start < 0) return null;

    const headerOffset = start + magic.length;
    const maskLen = buf.readUInt16LE(headerOffset);
    const payloadLen = buf.readUInt32LE(headerOffset + 2);
    const maskOffset = headerOffset + 6;
    const payloadOffset = maskOffset + maskLen;
    const endOffset = payloadOffset + payloadLen;

    const mask = buf.subarray(maskOffset, payloadOffset);
    const encoded = buf.subarray(payloadOffset, endOffset);
    const decoded = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i++) {
      decoded[i] = encoded[i] ^ mask[i % mask.length];
    }

    const cfg = JSON.parse(decoded.toString("utf8"));
    if (!cfg.secretData || !cfg.secretMask) return null;

    const sd = Buffer.from(cfg.secretData, "base64");
    const sm = Buffer.from(cfg.secretMask, "base64");
    const secretKey = Buffer.alloc(sd.length);
    for (let i = 0; i < sd.length; i++) secretKey[i] = sd[i] ^ sm[i];

    const crypto = require("crypto");
    return crypto.createHash("sha256").update(secretKey).digest();
  } catch (e) {
    return null;
  }
}

function decryptKnsFile(fileBuf, aesKey) {
  if (
    !fileBuf ||
    fileBuf.length < 40 ||
    !fileBuf.subarray(0, 4).equals(Buffer.from("KNSA"))
  ) {
    return fileBuf;
  }
  try {
    const crypto = require("crypto");
    const iv = fileBuf.subarray(12, 24);
    const tag = fileBuf.subarray(fileBuf.length - 16);
    const ciphertext = fileBuf.subarray(24, fileBuf.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (e) {
    return fileBuf;
  }
}

function decryptMediaAssets(gameDir, destDir, targetType = "image") {
  let imgDir = path.join(gameDir, "img");
  let audioDir = path.join(gameDir, "audio");
  let dataDirParent = gameDir;

  if (!fs.existsSync(imgDir) && !fs.existsSync(audioDir)) {
    const wwwDir = path.join(gameDir, "www");
    imgDir = path.join(wwwDir, "img");
    audioDir = path.join(wwwDir, "audio");
    dataDirParent = wwwDir;
  }

  const targetDir = targetType === "audio" ? audioDir : imgDir;
  const targetName = targetType === "audio" ? "áudios" : "imagens";

  if (!fs.existsSync(targetDir)) {
    return {
      ok: false,
      error: `Pasta "${path.basename(targetDir)}" do jogo não encontrada`,
    };
  }

  let keyHex = "";
  const systemJsonPath = path.join(dataDirParent, "data", "System.json");
  if (fs.existsSync(systemJsonPath)) {
    try {
      const sysRaw = fs.readFileSync(systemJsonPath, "utf8").trim();
      if (sysRaw) {
        const sys = JSON.parse(sysRaw);
        if (
          (sys.hasEncryptedImages || sys.hasEncryptedAudio) &&
          sys.encryptionKey
        ) {
          keyHex = sys.encryptionKey;
        }
      }
    } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
  }

  let keyBytes = null;
  if (keyHex && keyHex.length === 32) {
    keyBytes = Buffer.from(keyHex, "hex");
  }

  const knsAesKey =
    extractKnsKeyFromExe(gameDir) ||
    extractKnsKeyFromExe(dataDirParent) ||
    extractKnsKeyFromExe(path.dirname(gameDir));

  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (e) {
    return {
      ok: false,
      error: "Falha ao criar pasta de destino: " + e.message,
    };
  }

  global.log(
    "info",
    `Iniciando exportação e descriptografia de ${targetName} de ${targetDir} para ${destDir}...`
  );

  let count = 0;
  function processDir(currentDir, currentDestDir) {
    if (!fs.existsSync(currentDir)) return;
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const nextDestDir = path.join(currentDestDir, file);
        fs.mkdirSync(nextDestDir, { recursive: true });
        processDir(fullPath, nextDestDir);
      } else {
        const lowerFile = file.toLowerCase();
        const ext = path.extname(file).toLowerCase();
        const isKnsenc = lowerFile.endsWith(".knsenc");
        const isEncryptedImage = ext === ".rpgmvp" || ext === ".png_";
        const isEncryptedAudioOgg = ext === ".rpgmvo" || ext === ".ogg_";
        const isEncryptedAudioM4a = ext === ".rpgmvm" || ext === ".m4a_";

        if (isEncryptedImage || isEncryptedAudioOgg || isEncryptedAudioM4a) {
          try {
            const encryptedData = fs.readFileSync(fullPath);
            if (encryptedData.length > 32 && keyBytes) {
              const decryptedData = Buffer.alloc(encryptedData.length - 16);
              for (let i = 0; i < 16; i++) {
                decryptedData[i] = encryptedData[16 + i] ^ keyBytes[i];
              }
              encryptedData.copy(decryptedData, 16, 32);

              let destName = path.basename(file, ext);
              if (isEncryptedImage) destName += ".png";
              else if (isEncryptedAudioOgg) destName += ".ogg";
              else if (isEncryptedAudioM4a) destName += ".m4a";

              const destFile = path.join(currentDestDir, destName);
              fs.writeFileSync(destFile, decryptedData);
              count++;
            }
          } catch (e) {
            global.log(
              "warn",
              `Falha ao descriptografar recurso ${file}: ${e.message}`
            );
          }
        } else {
          const isNormalAsset =
            targetType === "audio"
              ? [".ogg", ".m4a", ".mp3", ".wav"].includes(ext) || lowerFile.includes(".ogg") || lowerFile.includes(".m4a") || lowerFile.includes(".wav") || lowerFile.includes(".mp3")
              : [".png", ".jpg", ".jpeg", ".webp"].includes(ext) || lowerFile.includes(".png") || lowerFile.includes(".jpg") || lowerFile.includes(".jpeg") || lowerFile.includes(".webp");
          if (isNormalAsset) {
            try {
              let destName = file;
              let dataToSave = fs.readFileSync(fullPath);
              if (isKnsenc) {
                destName = file.replace(/\.knsenc$/i, "");
                if (knsAesKey) {
                  dataToSave = decryptKnsFile(dataToSave, knsAesKey);
                }
              }
              const destFile = path.join(currentDestDir, destName);
              fs.writeFileSync(destFile, dataToSave);
              count++;
            } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
          }
        }
      }
    }
  }

  try {
    processDir(targetDir, destDir);
    global.log(
      "success",
      `Exportação concluída. ${count} ${targetName} exportadas com sucesso.`
    );
    return { ok: true, count };
  } catch (e) {
    return {
      ok: false,
      error: "Falha durante o processamento das pastas: " + e.message,
    };
  }
}

const handlers = {
  async decryptImages({ gameKey, destDir, type }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);
    return decryptMediaAssets(gameDir, destDir, type || "image");
  },
  patchGameFont({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    let fontsDir = path.join(gameDir, "fonts");
    if (!fs.existsSync(fontsDir)) {
      const wwwDir = path.join(gameDir, "www");
      if (fs.existsSync(wwwDir)) {
        fontsDir = path.join(wwwDir, "fonts");
      }
    }

    try {
      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }

      const sourceFont = path.join(global.ROOT, "loaders", "opent_PGMMV_font.ttf");
      if (!fs.existsSync(sourceFont)) {
        return {
          ok: false,
          error:
            "Arquivo de fonte original não encontrado na pasta loaders do tradutor.",
        };
      }

      const destFont = path.join(fontsDir, "pt-br-font.ttf");
      fs.copyFileSync(sourceFont, destFont);

      const cssPath = path.join(fontsDir, "gamefont.css");
      if (fs.existsSync(cssPath)) {
        const bakCss = cssPath + "_bak";
        if (!fs.existsSync(bakCss)) {
          fs.copyFileSync(cssPath, bakCss);
        }
      }

      const customCss = `@font-face {
    font-family: GameFont;
    src: url("pt-br-font.ttf");
}
@font-face {
    font-family: rmmz-mainfont;
    src: url("pt-br-font.ttf");
}`;

      fs.writeFileSync(cssPath, customCss, "utf8");

      global.log(
        "success",
        "Font patch applied successfully! Installed pt-br-font.ttf."
      );
      return { ok: true };
    } catch (e) {
      global.log("error", "Failed to apply font patch: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  clearGlobalCache() {
    try {
      const jsonPath = path.join(global.ROOT, "global_trans_cache.json");
      const bakPath = jsonPath + ".bak";
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
      const commonPath = path.join(global.DATA_DIR, "common_translations.json");
      if (fs.existsSync(commonPath)) fs.unlinkSync(commonPath);
      try {
        const db = getDb();
        if (db) {
          db.prepare("DELETE FROM global_cache").run();
          db.pragma("vacuum");
        }
      } catch (e2) { global.log("warn", `RPC Handlers: Error clearing SQLite cache: ${e2.message}`); }
      global.log(
        "info",
        "Global translation history (JSON and SQLite) deleted successfully."
      );
      return true;
    } catch (e) {
      global.log("error", "Failed to clear translation history: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  loadCfg() {
    return loadCfg();
  },
  getLogs({ afterId }) {
    const id = afterId || 0;
    return global.serverLogs.filter((l) => l.id > id);
  },
  ping() {
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    return true;
  },
  heartbeat() {
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    return true;
  },
  saveCfg(cfg) {
    return saveCfg(cfg);
  },
  loadGames() {
    const games = {},
      gameKeys = [];
    try {
      if (!fs.existsSync(global.GL_DIR)) fs.mkdirSync(global.GL_DIR, { recursive: true });
      fs.readdirSync(global.GL_DIR)
        .filter((f) => f.endsWith(".gljson"))
        .forEach((k) => {
          try {
            const filePath = path.join(global.GL_DIR, k);
            const d = JSON.parse(fs.readFileSync(filePath, "utf8"));
            const key = k.replace(".gljson", "");

            // Auto-heal/re-verify engine for existing games in library
            if (d && d.constArgs && d.constArgs.gameExe && fs.existsSync(d.constArgs.gameExe)) {
              const currentEng = detectEngine(d.constArgs.gameExe);
              if (currentEng && currentEng !== d.constArgs.engine) {
                d.constArgs.engine = currentEng;
                try {
                  fs.writeFileSync(filePath, JSON.stringify(d, null, 2), "utf8");
} catch (e) { global.log("warn", `RPC Handlers: Error in KNS key extraction: ${e.message}`); }
              }
            }

            games[key] = d;
          } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
        });
    } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    return { games, gameKeys: Object.keys(games) };
  },
  saveGame({ key, data }) {
    try {
      if (!fs.existsSync(global.GL_DIR)) fs.mkdirSync(global.GL_DIR, { recursive: true });
      if (data && data.constArgs && data.constArgs.gameExe && fs.existsSync(data.constArgs.gameExe)) {
        const reDetect = detectEngine(data.constArgs.gameExe);
        if (reDetect && reDetect !== data.constArgs.engine) {
          data.constArgs.engine = reDetect;
        }
      }
      fs.writeFileSync(
        path.join(global.GL_DIR, key + ".gljson"),
        JSON.stringify(data, null, 2)
      );
      return true;
    } catch (e) {
      return false;
    }
  },
  delGame({ key }) {
    try {
      const p = path.join(global.GL_DIR, key + ".gljson");
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return true;
    } catch (e) {
      return false;
    }
  },
  detectEngine(params) {
    let exePath = params;
    let exeDir = undefined;
    if (params && typeof params === "object") {
      exePath = params.exePath || params.targetFile || params.path || params;
      exeDir = params.exeDir || params.dir;
    }
    return detectEngine(exePath, exeDir);
  },
  async translate_realtime({ text, engine }) {
    if (!text || typeof text !== "string") return { ok: false, error: "Texto inválido ou vazio" };
    const clean = text.trim();
    if (!clean) return { ok: false, error: "Texto vazio" };
    
    global.lastRpcTimestamp = Date.now();

    const cfg = handlers.loadCfg();
    const sl = cfg.sl || "auto";
    const tl = cfg.tl || "pt";
    const eng = cfg.engine || "google";

    const translated = await translateSingle(clean, sl, tl, eng);
    global.log(
      "success",
      `💬 [RPC REALTIME] "${clean}" ➔ 🌐 "${translated}" (${sl.toUpperCase()} ➔ ${tl.toUpperCase()} | Engine: ${eng.toUpperCase()})`
    );

    try {
      if (global.activeGameDir) {
        const jsonPath = path.join(global.activeGameDir, "game", "opent_translated.json");
        let dict = {};
        if (fs.existsSync(jsonPath)) {
          try { dict = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) { global.log("warn", `RPC Handlers: Failed to read translation dict: ${e.message}`); }
        }
        dict[clean] = translated;
        fs.writeFileSync(jsonPath, JSON.stringify(dict, null, 2), 'utf8');
      }
    } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }

    return { ok: true, data: { translated, text: translated } };
  },
  async launchGame({ key }) {
    if (isLaunchingMap.has(key)) {
      global.log("warn", `[Launch Protection] Game "${key}" is already initializing. Ignoring duplicate request.`);
      return { ok: true, message: "Already launching" };
    }
    if (global.isLaunchingGame) {
      global.log("warn", "launchGame: game initialization already in progress");
      return { ok: false, error: "Launch/pipeline already in progress" };
    }
    if (global.launchedProc && checkProcessRunning().running) {
      global.log("warn", "launchGame: game already running");
      return { ok: false, error: "A game is already running" };
    }

    isLaunchingMap.add(key);
    // Preservar monotonicidade de logSeq para evitar duplicacao de logs
    global.isLaunchingGame = true;
    global.launchTime = Date.now();
    try {
      if (global.restoreTimeout) {
        clearTimeout(global.restoreTimeout);
        global.restoreTimeout = null;
      }
      const games = handlers.loadGames().games;
      const g = games[key];
      if (!g) {
        global.log("error", "launchGame: game not found key=" + key);
        return { ok: false, error: "Game not found" };
      }
      const args = g.constArgs || {};
      const title = g.libConf?.title || key;
      let exe = args.gameExe || "";
      let eng = args.engine;

      if (!exe || !fs.existsSync(exe)) {
        global.log("warn", `Executable "${exe}" does not exist directly. Searching disk for auto-resolution...`);
        let resolvedExe = null;

        const possibleDir = exe ? path.dirname(exe) : null;
        if (possibleDir && fs.existsSync(possibleDir) && fs.statSync(possibleDir).isDirectory()) {
          try {
            const files = fs.readdirSync(possibleDir);
            const exes = files.filter(f => f.toLowerCase().endsWith(".exe") && !f.toLowerCase().includes("unitycrashhandler"));
            if (exes.length > 0) {
              const pref = exes.find(f => f.toLowerCase() === "game.exe" || f.toLowerCase() === "nw.exe" || f.toLowerCase().includes(title.toLowerCase().split(" ")[0])) || exes[0];
              resolvedExe = path.join(possibleDir, pref);
            }
          } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
        }

        if (!resolvedExe) {
          const searchName = exe ? path.basename(exe) : (title + ".exe");
          const found = await findGameOnDisk(searchName);
          if (found && found.length > 0) {
            resolvedExe = found[0].exePath;
          }
        }

        if (resolvedExe && fs.existsSync(resolvedExe)) {
          exe = resolvedExe;
          eng = detectEngine(exe);
          g.constArgs = { ...g.constArgs, gameExe: exe, engine: eng };
          handlers.saveGame({ key, data: g });
          global.log("info", `Auto-resolved game executable "${title}": ${exe} (Engine: ${eng})`);
        }
      }

      if (exe && fs.existsSync(exe)) {
        const detected = detectEngine(exe);
        if (detected && (detected !== eng || !eng)) {
          eng = detected;
          g.constArgs = { ...g.constArgs, engine: eng };
          try { handlers.saveGame({ key, data: g }); } catch (e) { global.log("warn", `RPC Handlers: Failed to save game data: ${e.message}`); }
        }
      }
      const gameDir = exe ? path.dirname(exe) : "";
      const cfg = handlers.loadCfg();
      const slStr = (cfg.sl || "auto").toUpperCase();
      const tlStr = (cfg.tl || "pt").toUpperCase();
      const engName = ENGINES_DEF[eng]?.label || eng;
      const archBits = exe ? getExeArch(exe) : 32;

      global.log("info", "============================================================");
      global.log("info", `🎮 LAUNCHING GAME: "${title}"`);
      global.log("info", `📁 Root Directory: ${gameDir}`);
      global.log("info", `🕹️ Executable: ${path.basename(exe)} (${archBits}-bit)`);
      global.log("info", `🧠 Detected Engine: ${engName} (${eng})`);
      global.log("info", `🌐 Configured Translation: ${slStr} ➔ ${tlStr} | Engine: ${(cfg.engine || "google").toUpperCase()}`);
      global.log("info", "============================================================");

      if (!exe || !fs.existsSync(exe))
        return { ok: false, error: "EXE não encontrado no disco: " + exe };

      try {
        // Seguro contra injeção: spawnSync passa o diretório como argumento
        // posicional ($args[0]) — o shell não interpreta o conteúdo do path.
        const args = [
          "-NoProfile", "-NonInteractive", "-Command",
          "Get-Process | Where-Object { $_.Path -like $args[0] } | Stop-Process -Force",
          gameDir + "\\*"
        ];
        const psRes = spawnSync("powershell", args, { stdio: "ignore" });
        if (psRes.error) throw psRes.error;
        global.log("info", "🧹 Cleanup of previous zombie processes completed.");
      } catch (e) { global.log("warn", `RPC Handlers: Error cleaning process: ${e.message}`); }

    let bakDir = "";
    const eInfo = ENGINES_DEF[eng];
    if (eInfo && eInfo.js) {
      try {
        bakDir = await executeTranslationPipeline(gameDir, cfg, title);
      } catch (pipeErr) {
        global.log("error", `❌ [Translation Pipeline Error] ${pipeErr.stack || pipeErr.message || pipeErr}`);
        throw pipeErr;
      }
    }

    // AUTO-PATCH NATIVO PARA REN'PY (SUPORTE MULTI-IDIOMA)
    if (eng === "python") {
      const targetLang = (cfg && (cfg.tl || cfg.targetLang || cfg.target_language || cfg.language || cfg.toLang)) || "pt";
      const gameSubDir = path.join(gameDir, "game");
      if (fs.existsSync(gameSubDir)) {
        try {
          const cacheDir = path.join(gameSubDir, "cache");
          if (fs.existsSync(cacheDir)) {
            try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove cache dir: ${e.message}`); }
          }
          // Cria a estrutura nativa de tradução do Ren'Py em game/tl/<targetLang>/
          const tlTargetDir = path.join(gameSubDir, "tl", targetLang);
          if (!fs.existsSync(tlTargetDir)) {
            try { fs.mkdirSync(tlTargetDir, { recursive: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to create tlTargetDir: ${e.message}`); }
          }
          const tlStringsFile = path.join(tlTargetDir, "strings.rpy");
          if (!fs.existsSync(tlStringsFile)) {
            const nativeDict = `
# Ren'Py Native Translation File (OpenTranslator Auto-Generated)
translate ${targetLang} strings:
    old "Start Game"
    new "Start Game"
`;
            try { fs.writeFileSync(tlStringsFile, nativeDict.trim(), 'utf8'); } catch (e) { global.log("warn", `RPC Handlers: Failed to write tlStringsFile: ${e.message}`); }
          }

          // Helper function to purge stale .rpy/.rpyc files from target directory
          const cleanTlPt = (targetDir) => {
            if (!targetDir || !fs.existsSync(targetDir)) return;
            try {
              const entries = fs.readdirSync(targetDir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(targetDir, entry.name);
                if (entry.isDirectory()) {
                  try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove dir ${fullPath} in recursiveSweep: ${e.message}`); }
                } else if (entry.isFile()) {
                  const lower = entry.name.toLowerCase();
                  if ((lower.endsWith(".rpy") && lower !== "font.rpy") || lower.endsWith(".rpyc")) {
try { fs.unlinkSync(fullPath); } catch (e) { global.log("warn", `RPC Handlers: Failed to unlink file ${fullPath}: ${e.message}`); }
                  }
                }
              }
            } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
          };

          const cleanRpyc = (targetDir) => {
            if (!targetDir || !fs.existsSync(targetDir)) return;
            try {
              const entries = fs.readdirSync(targetDir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(targetDir, entry.name);
                if (entry.isDirectory()) {
                  cleanRpyc(fullPath);
                } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".rpyc")) {
                  try { fs.unlinkSync(fullPath); } catch (e) { global.log("warn", `RPC Handlers: Failed to unlink file ${fullPath}: ${e.message}`); }
                }
              }
            } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
          };

          // Limpeza inicial de bytecodes e scripts defeituosos no diretório de destino
          cleanTlPt(tlTargetDir);
          // Surgical Engine Cleanup for Common Directories & Cache
          const performNuclearSweep = (targetDir) => {
            if (!targetDir || !fs.existsSync(targetDir)) return;

            const recursiveSweep = (dir) => {
              try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                  const fullPath = path.join(dir, entry.name);
                  const lowerName = entry.name.toLowerCase();
                  if (entry.isDirectory()) {
                    if (lowerName === "common") {
try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove dir ${fullPath}: ${e.message}`); }
                    } else {
                      recursiveSweep(fullPath);
                    }
                  }
                }
              } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
            };

            recursiveSweep(targetDir);

            // Purge AST Cache
            const cacheDir = path.join(targetDir, "cache");
            if (fs.existsSync(cacheDir)) {
try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove cacheDir: ${e.message}`); }
            }
          };

          // Perform surgical sweep exclusively inside game/ subfolder to protect custom game 00_ scripts
          performNuclearSweep(gameSubDir);

          // Anti-Namespace Shadowing: Purge extracted common engine directories and core engine scripts inside game/
          const engineCommonDirs = [
            path.join(gameSubDir, "common"),
            path.join(gameSubDir, "renpy", "common")
          ];
          engineCommonDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
              try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
            }
          });

          // Anti-Namespace Shadowing: Expurgo TOTAL de motor obsoleto vazado (.rpy e .rpyc)
          // Força o executável a ignorar o lixo do .rpa e usar o núcleo atualizado em renpy/common/
          const renpyEngineCore = [
            "000statements", "00action_audio", "00action_control", "00action_data",
            "00action_file", "00action_menu", "00action_other", "00build",
            "00compat", "00console", "00definitions", "00developer",
            "00director", "00gallery", "00gamepad", "00gltest",
            "00gui", "00joystick", "00keymap", "00layout",
            "00library", "00nvl_mode", "00preferences", "00presets",
            "00properties", "00sandbox", "00savelocation", "00style",
            "00themes", "00touch", "00transitions", "00translation",
            "00updater", "00vc_version", "00voice", "00window"
          ];

          const purgeEngineCoreFiles = (targetDir) => {
            renpyEngineCore.forEach(coreName => {
              const pRpy = path.join(targetDir, coreName + ".rpy");
              const pCommonRpy = path.join(targetDir, "common", coreName + ".rpy");
              if (fs.existsSync(pRpy)) try { fs.unlinkSync(pRpy); } catch(e){ global.log("warn", `RPC Handlers: Failed to unlink pRpy ${pRpy}: ${e.message}`); }
              if (fs.existsSync(pCommonRpy)) try { fs.unlinkSync(pCommonRpy); } catch(e){ global.log("warn", `RPC Handlers: Failed to unlink pCommonRpy ${pCommonRpy}: ${e.message}`); }
            });
          };

          purgeEngineCoreFiles(gameSubDir);


          // PASSO 2 & 3: Logs detalhados e desempacotamento de pacotes .rpa
          global.log("info", "[Pre-Patch] 🧹 Cleanup of stale bytecodes (.rpyc) and legacy scripts executed.");
          global.log("info", "[Pre-Patch] 🔍 Searching for .rpa archives in game folder...");

          const rpaFiles = fs.readdirSync(gameSubDir).filter(f => f.endsWith('.rpa'));
          const unpackScript = path.join(global.ROOT, "resources", "renpy", "unpack_renpy_all.py");
          const unpackMarker = path.join(gameSubDir, ".opent_unpacked");

          if (rpaFiles.length > 0 && fs.existsSync(unpackScript) && !fs.existsSync(unpackMarker)) {
            global.log("info", `[Pré-Patch] 📦 Encontrados ${rpaFiles.length} arquivos .rpa (${rpaFiles.join(', ')}). Unpacking game scripts...`);
            try {
              const { execSync } = require('child_process');
              execSync(`python "${unpackScript}" -i "${gameSubDir}" -o "${gameSubDir}"`, { 
                cwd: global.ROOT, 
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
                stdio: ['ignore', 'ignore', 'pipe'] 
              });
              try { fs.writeFileSync(unpackMarker, new Date().toISOString(), 'utf8'); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
              global.log("success", "[Pre-Patch] ✓ RPA package unpacking and decompilation completed!");
            } catch (eUnpack) {
              try { fs.writeFileSync(unpackMarker, new Date().toISOString(), 'utf8'); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
              const stderrRaw = (eUnpack.stderr ? eUnpack.stderr.toString() : "");
              const errLines = stderrRaw.split(/\r?\n/).filter(l => /error|exception|traceback|failed/i.test(l) && !l.includes('strategy extract_slot_legacy failed'));
              const shortErrMsg = (errLines.length > 0 ? errLines.slice(-3).join(' | ') : eUnpack.message).slice(0, 300);
              global.log("info", `[Pre-Patch] ✓ RPA package unpacking completed (${shortErrMsg})`);
            }
          } else if (fs.existsSync(unpackMarker)) {
            global.log("info", "[Pre-Patch] ✓ RPA package already unpacked previously (cached). Skipping unpacking.");
          } else {
            global.log("info", "[Pre-Patch] No pending .rpa files for unpacking.");
          }

          // Anti-Namespace Hijack & Trojan Engine File Purge (post-unrpyc)
          purgeEngineCoreFiles(gameSubDir);
          const rogueDirs = [
            path.join(gameSubDir, "common"),
            path.join(gameSubDir, "renpy")
          ];
          rogueDirs.forEach(roguePath => {
            if (fs.existsSync(roguePath)) {
              try { fs.rmSync(roguePath, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
            }
          });

          global.log("info", "[Pre-Patch] ✨ Native extractor activated for full script parsing.");

          // AppData Save Directory Resolution Log
          try {
            const appDataInfo = renpyAppDataResolver.resolveGameAppDataDir(gameSubDir, title);
            if (appDataInfo && appDataInfo.success && appDataInfo.appDataDir) {
              let saveFiles = [];
              try { saveFiles = fs.readdirSync(appDataInfo.appDataDir).filter(f => f.endsWith('.save') || f === 'persistent'); } catch(e) { global.log("warn", `RPC Handlers: Failed to read save files in AppData: ${e.message}`); }
              global.log("success", `📂 [AppData Resolver] Save directory detected: ${appDataInfo.appDataDir} (${saveFiles.length} save files) [Method: ${appDataInfo.method}]`);
            } else {
              global.log("warn", `📂 [AppData Resolver] Could not find save directory in AppData. Reason: ${appDataInfo.error || 'Desconhecido'}`);
            }
          } catch (eAppData) {
            global.log("warn", `📂 [AppData Resolver] Error looking up AppData directory: ${eAppData.message}`);
          }


          const syntaxRules = loadSyntaxRules();
          const renpyVersion = detectRenpyVersion(gameDir);
          global.log("info", `🔍 [Version Probing] Ren'Py Engine Version detected: ${renpyVersion.raw} (Major: ${renpyVersion.major}.${renpyVersion.minor})`);

          // Safe Purge: Purge registered stale runtime files without wildcard deletion
          const safePurgeFiles = syntaxRules.VERSION_PROBING?.SAFE_PURGE_FILES || [
            "00_opent_runtime.rpy", "00_opent_runtime.rpyc",
            "zz_opent_runtime.rpy", "zz_opent_runtime.rpyc",
            "000_opent_runtime.rpy", "000_opent_runtime.rpyc",
            "z_opentranslator.rpy", "z_opentranslator.rpyc"
          ];
          safePurgeFiles.forEach(f => {
            const p = path.join(gameSubDir, f);
            if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) { global.log("warn", `RPC Handlers: Failed to unlink safePurgeFile ${p}: ${e.message}`); }
          });

          // Injeta Hook de Runtime Nativo do Ren'Py em 00_opent_runtime.rpy
          const runtimeHookFile = path.join(gameSubDir, "00_opent_runtime.rpy");
          const runtimeHookFileC = path.join(gameSubDir, "00_opent_runtime.rpyc");
          if (fs.existsSync(runtimeHookFileC)) try { fs.unlinkSync(runtimeHookFileC); } catch (e) { global.log("warn", `RPC Handlers: Failed to unlink runtimeHookFileC: ${e.message}`); }
          const runtimeHookContent = `python early:
    def _opent_early_bootstrap():
        try:
            import renpy
            if not hasattr(renpy, 'suppress_transition'):
                def _safe_suppress_transition(*args, **kwargs):
                    try:
                        if hasattr(renpy, 'exports') and hasattr(renpy.exports, 'suppress_transition'):
                            return renpy.exports.suppress_transition(*args, **kwargs)
                        if hasattr(renpy, 'game') and hasattr(renpy.game, 'interface') and hasattr(renpy.game.interface, 'suppress_transition'):
                            return renpy.game.interface.suppress_transition(*args, **kwargs)
                    except Exception:
                        pass
                    return False
                try: setattr(renpy, 'suppress_transition', _safe_suppress_transition)
                except Exception: pass

            if hasattr(renpy, 'exports'):
                for export_name in dir(renpy.exports):
                    if not export_name.startswith('_') and not hasattr(renpy, export_name):
                        try: setattr(renpy, export_name, getattr(renpy.exports, export_name))
                        except Exception: pass

            try:
                import types
                import renpy.display.behavior as _rdb
                def _safe_rdb_run(action, *args, **kwargs):
                    if action is None:
                        return None
                    elif isinstance(action, (list, tuple)):
                        for i in action:
                            _safe_rdb_run(i, *args, **kwargs)
                        return None
                    elif isinstance(action, types.ModuleType):
                        return None
                    elif callable(action):
                        try:
                            return action(*args, **kwargs)
                        except TypeError as e:
                            if 'not callable' in str(e):
                                return None
                            raise
                    else:
                        return None
                _rdb.run = _safe_rdb_run
            except Exception:
                pass
        except Exception:
            pass
    _opent_early_bootstrap()

init -99999999 python:
    def _opent_init_99999999():
        try:
            import sys, os, renpy
            class SafeLogStream(object):
                def write(self, s): pass
                def flush(self): pass
                def isatty(self): return False

            for stream_name in ['stdout', 'stderr']:
                stream = getattr(sys, stream_name, None)
                if stream is None:
                    try: setattr(sys, stream_name, SafeLogStream())
                    except Exception: pass
                else:
                    try: stream.flush()
                    except Exception:
                        try: setattr(sys, stream_name, SafeLogStream())
                        except Exception: pass

                    orig_flush = getattr(stream, 'flush', None)
                    def _safe_flush(*args, **kwargs):
                        try:
                            if orig_flush: orig_flush(*args, **kwargs)
                        except Exception: pass
                    try: setattr(stream, 'flush', _safe_flush)
                    except Exception: pass

            if hasattr(renpy, 'log') and hasattr(renpy.log, 'stdout'):
                try:
                    rf = getattr(renpy.log.stdout, 'real_file', None)
                    if rf:
                        orig_rf_flush = getattr(rf, 'flush', None)
                        def _safe_rf_flush(*args, **kwargs):
                            try:
                                if orig_rf_flush: orig_rf_flush(*args, **kwargs)
                            except Exception: pass
                        try: setattr(rf, 'flush', _safe_rf_flush)
                        except Exception: pass
                except Exception: pass

            if hasattr(renpy, 'exports'):
                for export_name in dir(renpy.exports):
                    if not export_name.startswith('_') and not hasattr(renpy, export_name):
                        try: setattr(renpy, export_name, getattr(renpy.exports, export_name))
                        except Exception: pass

            if not hasattr(renpy, 'list_files'):
                def _fallback_list_files(common=False):
                    try:
                        if hasattr(renpy, 'loader') and hasattr(renpy.loader, 'list_files'):
                            return renpy.loader.list_files(common)
                    except Exception: pass
                    return []
                try: setattr(renpy, 'list_files', _fallback_list_files)
                except Exception: pass

            if hasattr(renpy, 'defaultstore') and hasattr(renpy.defaultstore, '_Config'):
                _orig_ds_cfg_getattr = getattr(renpy.defaultstore._Config, '__getattr__', None)
                def _safe_ds_cfg_getattr(self, name):
                    try:
                        if _orig_ds_cfg_getattr:
                            return _orig_ds_cfg_getattr(self, name)
                    except Exception:
                        pass
                    return None
                try: renpy.defaultstore._Config.__getattr__ = _safe_ds_cfg_getattr
                except Exception: pass

            if hasattr(renpy, 'config'):
                class SafeList(list):
                    def remove(self, x):
                        try:
                            if x in self:
                                super(SafeList, self).remove(x)
                        except Exception:
                            pass

                for k in dir(renpy.config):
                    if 'layer' in k.lower():
                        v = getattr(renpy.config, k, None)
                        if isinstance(v, list) and not isinstance(v, SafeList):
                            try: setattr(renpy.config, k, SafeList(v))
                            except Exception: pass
                        elif v is None:
                            try: setattr(renpy.config, k, SafeList(['bottom', 'master', 'transient', 'screens', 'overlay']))
                            except Exception: pass

                for lname in ['bottom_layers', 'top_layers', 'layers', 'context_clear_layers', 'overlay_layers', 'clear_layers', 'menu_clear_layers', 'sticky_layers', 'hide_layers']:
                    curr_l = getattr(renpy.config, lname, None)
                    if curr_l is None:
                        try: setattr(renpy.config, lname, SafeList(['bottom', 'master', 'transient', 'screens', 'overlay']))
                        except Exception: pass
                    elif not isinstance(curr_l, SafeList):
                        try: setattr(renpy.config, lname, SafeList(curr_l))
                        except Exception: pass

                for vname in ['script_version', 'early_script_version', 'version', 'name']:
                    if not hasattr(renpy.config, vname):
                        try: setattr(renpy.config, vname, None)
                        except Exception: pass

                cfg_obj = renpy.config
                cfg_cls = type(cfg_obj)
                _orig_cfg_setattr = getattr(cfg_cls, '__setattr__', None)
                def _safe_cfg_setattr(self, name, value):
                    if isinstance(value, list) and not isinstance(value, SafeList):
                        value = SafeList(value)
                    if _orig_cfg_setattr:
                        try:
                            _orig_cfg_setattr(self, name, value)
                        except Exception:
                            self.__dict__[name] = value
                    else:
                        self.__dict__[name] = value
                try:
                    cfg_cls.__setattr__ = _safe_cfg_setattr
                except Exception:
                    pass

                cfg_obj = renpy.config
                cfg_cls = type(cfg_obj)
                _orig_cfg_getattr = getattr(cfg_cls, '__getattr__', None)
                def _safe_cfg_getattr(self, name):
                    try:
                        if _orig_cfg_getattr:
                            return _orig_cfg_getattr(self, name)
                    except Exception:
                        pass
                    return None
                try: cfg_cls.__getattr__ = _safe_cfg_getattr
                except Exception: pass

            if hasattr(renpy, 'style'):
                if hasattr(renpy.style, 'get_style'):
                    _orig_get_style = renpy.style.get_style
                    def _safe_get_style(name, *args, **kwargs):
                        try:
                            return _orig_get_style(name, *args, **kwargs)
                        except Exception:
                            try:
                                if hasattr(renpy.style, 'Style'):
                                    return renpy.style.Style('default')
                            except Exception:
                                pass
                            return None
                    renpy.style.get_style = _safe_get_style

                if hasattr(renpy.style, 'StyleManager'):
                    sm_cls = renpy.style.StyleManager
                    _orig_sm_getattr = getattr(sm_cls, '__getattr__', None)
                    def _safe_sm_getattr(self, name):
                        try:
                            if _orig_sm_getattr:
                                val = _orig_sm_getattr(self, name)
                                if val is not None:
                                    return val
                        except Exception:
                            pass
                        try:
                            if hasattr(renpy.style, 'get_style'):
                                return renpy.style.get_style(name)
                        except Exception:
                            pass
                        return None
                    sm_cls.__getattr__ = _safe_sm_getattr
        except Exception:
            pass
    _opent_init_99999999()

init -9999999 python:
    def _opent_init_9999999():
        try:
            import sys, os, renpy
            if not hasattr(renpy, 'not_const'):
                renpy.not_const = lambda *args, **kwargs: None
            if not hasattr(renpy, 'is_const'):
                renpy.is_const = lambda *args, **kwargs: True
            if not hasattr(renpy, 'Keymap'):
                keymap_cls = getattr(getattr(getattr(renpy, 'display', None), 'behavior', None), 'Keymap', None)
                if not keymap_cls:
                    class Keymap(object):
                        def __init__(self, *args, **kwargs): pass
                        def __call__(self, *args, **kwargs): return self
                        def __getattr__(self, name): return lambda *args, **kwargs: self
                    keymap_cls = Keymap
                renpy.Keymap = keymap_cls
        except Exception:
            pass
    _opent_init_9999999()

init -1500 python:
    def _opent_polyfill_restart_interaction():
        try:
            import renpy
            if not hasattr(renpy, 'restart_interaction'):
                def _safe_restart_interaction(*args, **kwargs):
                    try:
                        if hasattr(renpy, 'exports') and hasattr(renpy.exports, 'restart_interaction'):
                            return renpy.exports.restart_interaction(*args, **kwargs)
                        if hasattr(renpy, 'game') and hasattr(renpy.game, 'interface') and hasattr(renpy.game.interface, 'restart_interaction'):
                            return renpy.game.interface.restart_interaction(*args, **kwargs)
                    except Exception:
                        pass
                    return None
                try: setattr(renpy, 'restart_interaction', _safe_restart_interaction)
                except Exception: pass

            if hasattr(renpy, 'exports') and not hasattr(renpy.exports, 'restart_interaction'):
                try: setattr(renpy.exports, 'restart_interaction', getattr(renpy, 'restart_interaction'))
                except Exception: pass
        except Exception:
            pass
    _opent_polyfill_restart_interaction()

init -1499 python:
    def _opent_init_1499():
        try:
            import sys, os, renpy
            if hasattr(renpy, 'store'):
                st = renpy.store
                class SafeCallable(object):
                    def __call__(self, *args, **kwargs): return None
                    def __contains__(self, item): return True
                def __iter__(self): return iter([])
                def __bool__(self): return True
                def __nonzero__(self): return True

            class LayoutProxy(object):
                def __init__(self):
                    self.provided = set(['compat', 'navigation', 'main_menu', 'classic', 'roundrect'])
                def __getattr__(self, name):
                    if name == 'provided':
                        return self.provided
                    return SafeCallable()
                def __call__(self, *args, **kwargs):
                    return self

            if not hasattr(st, '_layout') or st._layout is None:
                st._layout = LayoutProxy()
            else:
                if not hasattr(st._layout, 'provided') or not isinstance(getattr(st._layout, 'provided', None), (set, list, tuple, dict)):
                    try: setattr(st._layout, 'provided', set(['compat', 'navigation', 'main_menu', 'classic', 'roundrect']))
                    except Exception: pass

            if not hasattr(st, 'layout') or st.layout is None:
                st.layout = st._layout

            if not hasattr(st, 'preferences'):
                pref_obj = getattr(getattr(renpy, 'game', None), 'preferences', None)
                if not pref_obj:
                    pref_obj = getattr(renpy, 'preferences', None)
                if pref_obj:
                    st.preferences = pref_obj
                    st._preferences = pref_obj
                else:
                    class PreferencesProxy(object):
                        def __getattr__(self, name): return None
                        def __setattr__(self, name, val): pass
                    proxy_pref = PreferencesProxy()
                    st.preferences = proxy_pref
                    st._preferences = proxy_pref

            transitions_list = [
                'dissolve', 'fade', 'pixellate', 'move', 'ease', 'pushright', 'pushleft',
                'pushup', 'pushdown', 'vpunch', 'hpunch', 'blinds', 'squares', 'wipeleft',
                'wiperight', 'wipeup', 'wipedown', 'slideleft', 'slideright', 'slideup',
                'slidedown', 'slideawayleft', 'slideawayright', 'slideawayup', 'slideawaydown',
                'irisin', 'irisout', 'Dissolve', 'Fade', 'ImageDissolve'
            ]
            for tname in transitions_list:
                if not hasattr(st, tname):
                    try:
                        orig_t = getattr(renpy.exports, tname, None) if hasattr(renpy, 'exports') else None
                        if orig_t:
                            setattr(st, tname, orig_t)
                        else:
                            class DummyTransition(object):
                                def __init__(self, *a, **kw): pass
                                def __call__(self, *a, **kw): return self
                            setattr(st, tname, DummyTransition())
                    except Exception:
                        pass
        except Exception:
            pass
    _opent_init_1499()

python early:

    try:
        import sys, os, renpy
        if hasattr(renpy, 'log') and hasattr(renpy.log, 'Log'):
            _orig_log_write = getattr(renpy.log.Log, 'write', None)
            def _safe_log_write(self, s):
                try:
                    if _orig_log_write: _orig_log_write(self, s)
                except Exception: pass
            try: renpy.log.Log.write = _safe_log_write
            except Exception: pass

            _orig_log_flush = getattr(renpy.log.Log, 'flush', None)
            def _safe_log_flush(self):
                try:
                    if _orig_log_flush: _orig_log_flush(self)
                except Exception: pass
            try: renpy.log.Log.flush = _safe_log_flush
            except Exception: pass

        class SafeStreamWrapper(object):
            def __init__(self, target):
                self.target = target
            def write(self, s):
                try:
                    if self.target and hasattr(self.target, 'write'):
                        self.target.write(s)
                except Exception: pass
            def flush(self):
                try:
                    if self.target and hasattr(self.target, 'flush'):
                        self.target.flush()
                except Exception: pass
            def isatty(self): return False
            def __getattr__(self, name):
                return getattr(self.target, name, None)

        if sys.stdout is not None and not isinstance(sys.stdout, SafeStreamWrapper):
            sys.stdout = SafeStreamWrapper(sys.stdout)
        if sys.stderr is not None and not isinstance(sys.stderr, SafeStreamWrapper):
            sys.stderr = SafeStreamWrapper(sys.stderr)

        if hasattr(renpy, 'store'):
            orig_store_style = getattr(renpy.store, 'style', None)
            class SafeStyleManager(object):
                def __getattr__(self, name):
                    if orig_store_style and hasattr(orig_store_style, name):
                        try:
                            return getattr(orig_store_style, name)
                        except Exception:
                            pass
                    try:
                        if hasattr(renpy.style, 'get_style'):
                            return renpy.style.get_style(name)
                    except Exception:
                        pass
                    try:
                        if hasattr(renpy.style, 'styles') and isinstance(renpy.style.styles, dict):
                            if name not in renpy.style.styles:
                                default_st = renpy.style.styles.get('default', None)
                                st = renpy.style.Style(default_st) if default_st else renpy.style.Style('default')
                                renpy.style.styles[name] = st
                                return st
                    except Exception:
                        pass
                    class _FallbackStyle(object):
                        def __setattr__(self, k, v): pass
                        def __getattr__(self, k): return lambda *a, **kw: None
                    return _FallbackStyle()
                def __setattr__(self, name, value):
                    try:
                        if orig_store_style:
                            setattr(orig_store_style, name, value)
                    except Exception:
                        pass

            renpy.store.style = SafeStyleManager()
    except Exception:
        pass

    try:
        import sys, os, renpy
        class _BaseEq(object):
            def __eq__(self, other): return type(self) == type(other) and getattr(self, '__dict__', {}) == getattr(other, '__dict__', {})
            def __ne__(self, other): return not (self == other)

        for eq_name in ['FieldEquality', 'DictEquality', 'ListEquality', 'SetEquality', 'ValueEquality', 'IdentityEquality']:
            if not hasattr(renpy.store, eq_name):
                setattr(renpy.store, eq_name, _BaseEq)
                if hasattr(renpy, 'python') and hasattr(renpy.python, 'store_dicts'):
                    try: renpy.python.store_dicts['store'][eq_name] = _BaseEq
                    except Exception: pass

        if not hasattr(renpy.store, 'Action'):
            class Action(object):
                def __call__(self): pass
                def get_sensitive(self): return True
                def get_selected(self): return False
            renpy.store.Action = Action
            if hasattr(renpy, 'python') and hasattr(renpy.python, 'store_dicts'):
                try: renpy.python.store_dicts['store']['Action'] = Action
                except Exception: pass

        class _PySLDummy(object):
            def __init__(self, *args, **kwargs): pass
            def __call__(self, *args, **kwargs): return self
            def __getattr__(self, name): return lambda *args, **kwargs: self

        _pysl_dummy = _PySLDummy()

        def _safe_register_sl_statement(*args, **kwargs):
            try:
                reg_sl = getattr(getattr(renpy, 'sl2', None), 'register_sl_statement', None)
                if not reg_sl:
                    reg_sl = getattr(getattr(getattr(renpy, 'sl2', None), 'slast', None), 'register_sl_statement', None)
                if reg_sl and reg_sl != _safe_register_sl_statement:
                    res = reg_sl(*args, **kwargs)
                    if res is not None:
                        return res
            except Exception:
                pass
            return _pysl_dummy

        renpy.register_sl_statement = _safe_register_sl_statement

        if not hasattr(renpy, 'register_sl_displayable'):
            renpy.register_sl_displayable = lambda *args, **kwargs: _pysl_dummy

        def _safe_register_shader(*args, **kwargs):
            try:
                reg_sh = getattr(getattr(renpy, 'exports', None), 'register_shader', None)
                if not reg_sh:
                    reg_sh = getattr(getattr(getattr(renpy, 'gl2', None), 'gl2shadercache', None), 'register_shader', None)
                if reg_sh and reg_sh != _safe_register_shader:
                    return reg_sh(*args, **kwargs)
            except Exception:
                pass
            return None

        renpy.register_shader = _safe_register_shader
        if not hasattr(renpy, 'not_const'):
            renpy.not_const = lambda *args, **kwargs: None
        if not hasattr(renpy, 'is_const'):
            renpy.is_const = lambda *args, **kwargs: True
        if not hasattr(renpy, 'Keymap'):
            keymap_cls = getattr(getattr(getattr(renpy, 'display', None), 'behavior', None), 'Keymap', None)
            if not keymap_cls:
                class Keymap(object):
                    def __init__(self, *args, **kwargs): pass
                    def __call__(self, *args, **kwargs): return self
                    def __getattr__(self, name): return lambda *args, **kwargs: self
                keymap_cls = Keymap
            renpy.Keymap = keymap_cls


        if not hasattr(renpy, 'register_sstack'):
            renpy.register_sstack = lambda *args, **kwargs: None

    except Exception:
        pass


    try:
        import sys, os
        class _OpenTranslatorSafeStream(object):
            def write(self, *args, **kwargs): pass
            def flush(self, *args, **kwargs): pass
            def isatty(self, *args, **kwargs): return False

        _safe_stream = _OpenTranslatorSafeStream()
        try:
            if sys.stdout is None or not hasattr(sys.stdout, 'flush'):
                sys.stdout = _safe_stream
            else:
                try: sys.stdout.flush()
                except Exception: sys.stdout = _safe_stream
        except Exception:
            sys.stdout = _safe_stream

        try:
            if sys.stderr is None or not hasattr(sys.stderr, 'flush'):
                sys.stderr = _safe_stream
            else:
                try: sys.stderr.flush()
                except Exception: sys.stderr = _safe_stream
        except Exception:
            sys.stderr = _safe_stream

        try:
            import renpy.log
            def _safe_log_write(self, *args, **kwargs):
                try:
                    if self.real_file:
                        self.real_file.write(s)
                except Exception:
                    pass
            def _safe_log_flush(self):
                try:
                    if self.real_file:
                        self.real_file.flush()
                except Exception:
                    pass

            renpy.log.LogFile.write = _safe_log_write
            renpy.log.LogFile.flush = _safe_log_flush
            if hasattr(renpy.log, 'log_file') and renpy.log.log_file:
                renpy.log.log_file.real_file = None
                renpy.log.log_file.write = lambda *args, **kwargs: None
                renpy.log.log_file.flush = lambda *args, **kwargs: None
        except Exception:
            pass
    except Exception:
        pass

init -999999 python:
    def _opent_bootstrap_runtime():

        try:
            import renpy
            import types
            import sys
            # Anti-Crash: Fix IOError: [Errno 9] Bad file descriptor on print/flush calls in Ren'Py GUI mode
            class _OpenTranslatorSafeStream(object):
                def write(self, *args, **kwargs): pass
                def flush(self, *args, **kwargs): pass
                def isatty(self, *args, **kwargs): return False

                        # Anti-Crash: Neutralize renpy.log.log_file to prevent Bad file descriptor on self.real_file.flush()
            try:
                import renpy.log
                if hasattr(renpy.log, 'log_file') and renpy.log.log_file:
                    renpy.log.log_file.real_file = None
                    renpy.log.log_file.write = lambda *args, **kwargs: None
                    renpy.log.log_file.flush = lambda *args, **kwargs: None
            except Exception:
                pass

            _safe_stream = _OpenTranslatorSafeStream()
            try:
                if sys.stdout is None or not hasattr(sys.stdout, 'flush'):
                    sys.stdout = _safe_stream
                else:
                    try: sys.stdout.flush()
                    except Exception: sys.stdout = _safe_stream
            except Exception:
                sys.stdout = _safe_stream

            try:
                if sys.stderr is None or not hasattr(sys.stderr, 'flush'):
                    sys.stderr = _safe_stream
                else:
                    try: sys.stderr.flush()
                    except Exception: sys.stderr = _safe_stream
            except Exception:
                sys.stderr = _safe_stream

            try:
                import renpy.log
                if hasattr(renpy.log, 'log_file') and hasattr(renpy.log.log_file, 'real_file'):
                    try: renpy.log.log_file.real_file.flush()
                    except Exception: renpy.log.log_file.real_file = _safe_stream
            except Exception:
                pass


            # Patch renpy.translation immediately to suppress duplicate string translation exceptions
            try:
                import renpy.translation
                orig_add_string = getattr(renpy.translation, 'add_string_translation', None)
                if orig_add_string:
                    def _safe_add_string_translation(language, old, new, loc):
                        try:
                            orig_add_string(language, old, new, loc)
                        except Exception:
                            pass
                    renpy.translation.add_string_translation = _safe_add_string_translation

                if hasattr(renpy.translation, 'StringTranslates'):
                    st_cls = renpy.translation.StringTranslates
                    orig_st_add = getattr(st_cls, 'add', None)
                    if orig_st_add:
                        def _safe_st_add(self, old, new, loc):
                            try:
                                orig_st_add(self, old, new, loc)
                            except Exception:
                                pass
                        st_cls.add = _safe_st_add
            except Exception:
                pass

            # Single reusable dummy class for polyfilling missing displayables, actions and audio
            class _OpenTranslatorDummy(object):
                def __init__(self, *args, **kwargs): pass
                def __call__(self, *args, **kwargs): return self
                def __getattr__(self, name): return lambda *args, **kwargs: None

            # Helper for clean nested attribute resolution
            def _get_nested_attr(root, path):
                curr = root
                for p in path.split('.'):
                    curr = getattr(curr, p, None)
                    if curr is None:
                        break
                return curr

            # 1. Polyfill basic functions
            if not hasattr(renpy, 'pure'):
                renpy.pure = lambda fn_or_name: fn_or_name

            if not hasattr(renpy, 'register_persistent'):
                renpy.register_persistent = lambda name, func=None, *args, **kwargs: None

            # 2. Resolve renpy.curry module-shadowing & attribute lookup bug
            if hasattr(renpy, 'curry'):
                curry_target = None
                if isinstance(renpy.curry, types.ModuleType):
                    curry_target = getattr(renpy.curry, 'curry', getattr(renpy.curry, 'Curry', renpy.curry))
                elif callable(renpy.curry):
                    curry_target = renpy.curry

                if curry_target:
                    class _CurryWrapper(object):
                        def __init__(self, target):
                            self._target = target
                            self.curry = target
                        def __call__(self, *args, **kwargs):
                            return self._target(*args, **kwargs)

                    renpy.curry = _CurryWrapper(curry_target)

                        # 3. Polyfill GL2 shader registration & SL2 statements with Method Chaining support
            class _PySLDummyRuntime(object):
                def __init__(self, *args, **kwargs): pass
                def __call__(self, *args, **kwargs): return self
                def __getattr__(self, name): return lambda *args, **kwargs: self

            _pysl_dummy_rt = _PySLDummyRuntime()

            def _safe_register_sl_statement_rt(*args, **kwargs):
                try:
                    reg_sl = getattr(getattr(renpy, 'sl2', None), 'register_sl_statement', None)
                    if not reg_sl:
                        reg_sl = getattr(getattr(getattr(renpy, 'sl2', None), 'slast', None), 'register_sl_statement', None)
                    if reg_sl and reg_sl != _safe_register_sl_statement_rt:
                        res = reg_sl(*args, **kwargs)
                        if res is not None:
                            return res
                except Exception:
                    pass
                return _pysl_dummy_rt

            renpy.register_sl_statement = _safe_register_sl_statement_rt
            if not hasattr(renpy, 'register_sl_displayable'):
                renpy.register_sl_displayable = lambda *args, **kwargs: _pysl_dummy_rt

            if not hasattr(renpy, 'register_shader'):
                reg_sh = getattr(getattr(renpy, 'exports', None), 'register_shader', None)
                if not reg_sh:
                    reg_sh = _get_nested_attr(renpy, 'gl2.gl2shadercache.register_shader')
                renpy.register_shader = reg_sh if reg_sh else (lambda *args, **kwargs: None)

            # 4. Resolve Ren'Py export functions using a factory to avoid late-binding closure bugs
            def _make_dummy_fn(default_val):
                return lambda *args, **kwargs: default_val

            _export_fns = {
                'has_screen': ('display.screen', False),
                'get_screen': ('display.screen', None),
                'show_display_say': ('character', None),
                'predict_show_display_say': ('character', None)
            }
            for fname, (fmod, fdefault) in _export_fns.items():
                if not hasattr(renpy, fname):
                    found_fn = getattr(getattr(renpy, 'exports', None), fname, None)
                    if not found_fn:
                        found_fn = _get_nested_attr(renpy, fmod + '.' + fname)
                    setattr(renpy, fname, found_fn if found_fn else _make_dummy_fn(fdefault))

            # 5. Resolve dynamic class mappings
            _renpy_mappings = {
                'Displayable': ['display.core', 'display.displayable', 'display.layout'],
                'ParameterizedText': ['text.extras', 'character', 'display.text'],
                'Action': ['display.behavior'],
                'BarValue': ['display.behavior'],
                'FieldValue': ['display.behavior'],
                'Container': ['display.layout', 'display.core']
            }
            for attr, submods in _renpy_mappings.items():
                if not hasattr(renpy, attr):
                    found_cls = None
                    for sub in submods:
                        found_cls = _get_nested_attr(renpy, sub + '.' + attr)
                        if found_cls:
                            break
                    setattr(renpy, attr, found_cls if found_cls else _OpenTranslatorDummy)

            # 6. Audio polyfills
            if not hasattr(renpy, 'music'):
                renpy.music = getattr(getattr(renpy, 'audio', None), 'music', _OpenTranslatorDummy())
            elif not hasattr(renpy.music, 'register_channel'):
                renpy.music.register_channel = lambda *args, **kwargs: None

            if not hasattr(renpy, 'sound'):
                renpy.sound = getattr(getattr(renpy, 'audio', None), 'sound', _OpenTranslatorDummy())

            # 7. Safe Preference wrapper with dummy action fallback
            pref_cls = _get_nested_attr(renpy, 'display.behavior.Preference')
            if pref_cls:
                null_act = getattr(_get_nested_attr(renpy, 'display.behavior'), 'NullAction', _OpenTranslatorDummy)
                def _safe_Pref(name, value=None, *args, **kwargs):
                    try:
                        return pref_cls(name, value, *args, **kwargs)
                    except Exception:
                        return null_act() if callable(null_act) else _OpenTranslatorDummy()
                renpy.display.behavior.Preference = _safe_Pref
                try:
                    import store
                    store.Preference = _safe_Pref
                except Exception:
                    pass

            # 8. Enable developer/cheat config options cleanly
            if 'config' in globals():
                config.developer = True
                config.console = True
                config.rollback_enabled = True
                config.fast_skipping = True

            # 9. Ren'Py Cheat Telemetry & Remote Control Thread (Port 16005)
            try:
                import threading
                import time
                import json

                _opent_frozen_vars = {}
                _opent_audit_queue = []

                def _deep_mutate_var(obj, var_key, var_val, visited=None, depth=0):
                    if depth > 5:
                        return
                    if visited is None:
                        visited = set()
                    obj_id = id(obj)
                    if obj_id in visited:
                        return
                    visited.add(obj_id)

                    try:
                        def _is_heavy(k_name, val):
                            if isinstance(val, (int, float, str, bool)):
                                return False
                            k_s = str(k_name)
                            if k_s.startswith('_'):
                                return True
                            if k_s in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme', 'persistent', 'python', 'sys', 'os', 'main'):
                                return True
                            if callable(val) or isinstance(val, type):
                                return True
                            mod = getattr(type(val), '__module__', '') or ''
                            if mod.startswith(('renpy.', 'pygame.', 'sys', 'threading')):
                                return True
                            return False

                        if isinstance(obj, dict):
                            if var_key in obj:
                                try: obj[var_key] = var_val
                                except Exception: pass
                            for sub_k, sub_v in list(obj.items()):
                                if not _is_heavy(sub_k, sub_v):
                                    if isinstance(sub_v, (dict, list, tuple)) or hasattr(sub_v, '__dict__'):
                                        _deep_mutate_var(sub_v, var_key, var_val, visited, depth + 1)

                        elif isinstance(obj, (list, tuple)):
                            for item in list(obj):
                                if hasattr(item, '__dict__'):
                                    if hasattr(item, var_key):
                                        try: setattr(item, var_key, var_val)
                                        except Exception: pass
                                    item_id_val = str(getattr(item, 'id', '') or getattr(item, 'name', '') or getattr(item, 'item_id', '')).lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value', 'level', 'hp', 'mp'):
                                            if hasattr(item, attr_name):
                                                try: setattr(item, attr_name, var_val)
                                                except Exception: pass
                                elif isinstance(item, dict):
                                    if var_key in item:
                                        try: item[var_key] = var_val
                                        except Exception: pass
                                    item_id_val = str(item.get('id') or item.get('name') or item.get('item_id') or '').lower()
                                    if item_id_val and (item_id_val in var_key.lower() or var_key.lower() in item_id_val):
                                        for attr_name in ('durability', 'dur', 'count', 'qty', 'amount', 'val', 'value', 'level', 'hp', 'mp'):
                                            if attr_name in item:
                                                try: item[attr_name] = var_val
                                                except Exception: pass
                                if isinstance(item, (dict, list, tuple)) or hasattr(item, '__dict__'):
                                    _deep_mutate_var(item, var_key, var_val, visited, depth + 1)

                        elif hasattr(obj, '__dict__'):
                            if hasattr(obj, var_key):
                                try: setattr(obj, var_key, var_val)
                                except Exception: pass
                            for k_attr, v_attr in list(getattr(obj, '__dict__', {}).items()):
                                if not _is_heavy(k_attr, v_attr):
                                    if isinstance(v_attr, (dict, list, tuple)) or hasattr(v_attr, '__dict__'):
                                        _deep_mutate_var(v_attr, var_key, var_val, visited, depth + 1)
                    except Exception:
                        pass

                def _scan_nested_vars(obj, prefix="", visited=None, depth=0):
                    if depth > 3:
                        return []
                    if visited is None:
                        visited = set()
                    obj_id = id(obj)
                    if obj_id in visited:
                        return []
                    visited.add(obj_id)

                    res = []
                    try:
                        def _is_heavy(k_name, val):
                            if isinstance(val, (int, float, str, bool)):
                                return False
                            k_s = str(k_name)
                            if k_s.startswith('_'):
                                return True
                            if k_s in ('config', 'renpy', 'store', 'style', 'ui', 'adv', 'nvl', 'theme', 'persistent', 'python', 'sys', 'os', 'main'):
                                return True
                            if callable(val) or isinstance(val, type):
                                return True
                            mod = getattr(type(val), '__module__', '') or ''
                            if mod.startswith(('renpy.', 'pygame.', 'sys', 'threading')):
                                return True
                            return False

                        def _sanitize_val(val):
                            if isinstance(val, float):
                                if val != val or val == float('inf') or val == float('-inf'):
                                    return 9999999
                            return val

                        if isinstance(obj, dict):
                            for k, v in list(obj.items()):
                                k_str = str(k)
                                if _is_heavy(k_str, v):
                                    continue
                                path = (prefix + '["' + k_str + '"]') if prefix else k_str
                                if isinstance(v, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(v), 'type': v_type})
                                elif isinstance(v, (dict, list, tuple)) or hasattr(v, '__dict__'):
                                    res.extend(_scan_nested_vars(v, path, visited, depth + 1))

                        elif isinstance(obj, (list, tuple)):
                            for idx, item in enumerate(list(obj)):
                                if _is_heavy(idx, item):
                                    continue
                                path = (prefix + "[" + str(idx) + "]") if prefix else ("[" + str(idx) + "]")
                                if isinstance(item, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(item, (int, float)) else ('boolean' if isinstance(item, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(item), 'type': v_type})
                                elif isinstance(item, (dict, list, tuple)) or hasattr(item, '__dict__'):
                                    res.extend(_scan_nested_vars(item, path, visited, depth + 1))

                        elif hasattr(obj, '__dict__'):
                            for k, v in list(getattr(obj, '__dict__', {}).items()):
                                k_str = str(k)
                                if _is_heavy(k_str, v):
                                    continue
                                path = (prefix + "." + k_str) if prefix else k_str
                                if isinstance(v, (int, float, str, bool)):
                                    v_type = 'number' if isinstance(v, (int, float)) else ('boolean' if isinstance(v, bool) else 'string')
                                    res.append({'id': path, 'name': path, 'value': _sanitize_val(v), 'type': v_type})
                                elif isinstance(v, (dict, list, tuple)) or hasattr(v, '__dict__'):
                                    res.extend(_scan_nested_vars(v, path, visited, depth + 1))
                    except Exception:
                        pass
                    return res

                def _get_path_val(st, path_str):
                    try:
                        return eval("renpy.store." + path_str, globals(), st.__dict__)
                    except Exception:
                        try:
                            return eval(path_str, globals(), st.__dict__)
                        except Exception:
                            return getattr(st, path_str, None)

                def _set_path_val(st, path_str, val):
                    success = False
                    try:
                        exec("renpy.store." + path_str + " = " + repr(val), globals(), st.__dict__)
                        success = True
                    except Exception:
                        pass
                    if not success:
                        try:
                            exec(path_str + " = " + repr(val), globals(), st.__dict__)
                            success = True
                        except Exception:
                            pass
                    if not success:
                        try:
                            setattr(st, path_str, val)
                            st.__dict__[path_str] = val
                        except Exception:
                            pass
                    _deep_mutate_var(st, path_str, val)

                def _force_choice_path(target_label):
                    try:
                        if hasattr(renpy, 'jump'):
                            renpy.jump(target_label)
                        elif hasattr(getattr(renpy, 'exports', None), 'jump'):
                            renpy.exports.jump(target_label)
                    except Exception:
                        pass

                def _opent_python_callback():
                    try:
                        st = getattr(renpy, 'store', None)
                        if st and _opent_frozen_vars:
                            for f_key, f_val in list(_opent_frozen_vars.items()):
                                _set_path_val(st, f_key, f_val)
                    except Exception:
                        pass

                try:
                    if hasattr(renpy, 'config') and hasattr(renpy.config, 'python_callbacks'):
                        if _opent_python_callback not in renpy.config.python_callbacks:
                            renpy.config.python_callbacks.append(_opent_python_callback)
                except Exception:
                    pass

                def _opent_after_load_callback():
                    try:
                        st = getattr(renpy, 'store', None)
                        if st and _opent_frozen_vars:
                            for f_key, f_val in list(_opent_frozen_vars.items()):
                                try:
                                    if hasattr(st, f_key) or '[' in f_key or '.' in f_key:
                                        _set_path_val(st, f_key, f_val)
                                except Exception:
                                    pass
                        if hasattr(renpy, 'restart_interaction'):
                            renpy.restart_interaction()
                    except Exception:
                        pass

                try:
                    if hasattr(renpy, 'config') and hasattr(renpy.config, 'after_load_callbacks'):
                        if _opent_after_load_callback not in renpy.config.after_load_callbacks:
                            renpy.config.after_load_callbacks.append(_opent_after_load_callback)
                except Exception:
                    pass


                def _opent_renpy_cheat_loop():
                    import sys
                    if sys.version_info[0] >= 3:
                        import urllib.request as _urlreq
                    else:
                        import urllib2 as _urlreq

                    while True:
                        try:
                            time.sleep(1.0)
                            if not hasattr(renpy, 'game') or not renpy.game.context():
                                continue

                            st = getattr(renpy, 'store', None)

                            # --- MEMORY FREEZE TICK ---
                            if st and _opent_frozen_vars:
                                for f_key, f_val in list(_opent_frozen_vars.items()):
                                    try:
                                        _set_path_val(st, f_key, f_val)
                                    except Exception:
                                        pass

                            gold_val = 0
                            if st:
                                for g_attr in ('gold', 'money', 'coins', 'cash', 'g'):
                                    if hasattr(st, g_attr) and isinstance(getattr(st, g_attr), (int, float)):
                                        gold_val = int(getattr(st, g_attr))
                                        break

                            scanned_vars = []
                            if st:
                                scanned_vars = _scan_nested_vars(st)

                            current_audit = list(_opent_audit_queue)
                            _opent_audit_queue[:] = []

                            payload = {
                                'engine': 'renpy',
                                'gold': gold_val,
                                'through': getattr(getattr(renpy, 'config', None), 'developer', True),
                                'savedir': str(getattr(getattr(renpy, 'config', None), 'savedir', '') or ''),
                                'save_directory': str(getattr(getattr(renpy, 'config', None), 'save_directory', '') or ''),
                                'actors': [{'idx': 0, 'name': 'Protagonist', 'hp': 999, 'mhp': 999, 'mp': 999, 'mmp': 999, 'level': 1}],
                                'variables': scanned_vars,
                                'switches': [],
                                'audit': current_audit
                            }

                            req_data = json.dumps(payload).encode('utf-8')
                            req = _urlreq.Request('http://127.0.0.1:16005/cheat_poll', data=req_data, headers={'Content-Type': 'application/json'})
                            resp = _urlreq.urlopen(req, timeout=2.0)
                            resp_data = resp.read().decode('utf-8')

                            if resp_data:
                                cmds = json.loads(resp_data)
                                if isinstance(cmds, list):
                                    for cmd in cmds:
                                        try:
                                            cmd_type = cmd.get('comando') or cmd.get('cmd')
                                            if cmd_type in ('set_var', 'set_renpy_var') and st:
                                                var_key = str(cmd.get('id') if cmd.get('id') is not None else cmd.get('key'))
                                                var_val = cmd.get('valor') if 'valor' in cmd else cmd.get('value')
                                                try:
                                                    if hasattr(st, var_key):
                                                        orig_val = getattr(st, var_key)
                                                        if isinstance(orig_val, bool):
                                                            var_val = bool(str(var_val).lower() in ('true', '1', 'yes'))
                                                        elif isinstance(orig_val, int) and not isinstance(orig_val, bool):
                                                            try: var_val = int(var_val)
                                                            except Exception: pass
                                                        elif isinstance(orig_val, float):
                                                            try: var_val = float(var_val)
                                                            except Exception: pass

                                                    # Lock variable into Memory Freeze Map
                                                    _opent_frozen_vars[var_key] = var_val

                                                    old_val = getattr(st, var_key, None)
                                                    _set_path_val(st, var_key, var_val)
                                                    new_val = getattr(st, var_key, None)

                                                    # Targeted Audit Log for the specific variable modified by user
                                                    try:
                                                        sys.stderr.write("[Targeted Audit] Var '" + str(var_key) + "' | Prev: " + str(old_val) + " -> Set: " + str(var_val) + " (RAM: " + str(new_val) + ")\\n")
                                                        _opent_audit_queue.append({'key': str(var_key), 'old': str(old_val), 'new': str(new_val), 'val': str(var_val)})
                                                    except Exception:
                                                        pass

                                                    # Safe UI Refresh (Cross-Thread)
                                                    try:
                                                        def _force_ui_update():
                                                            try:
                                                                if hasattr(renpy, 'restart_interaction'):
                                                                    renpy.restart_interaction()
                                                                elif hasattr(getattr(renpy, 'exports', None), 'restart_interaction'):
                                                                    renpy.exports.restart_interaction()
                                                                elif hasattr(getattr(getattr(renpy, 'game', None), 'interface', None), 'restart_interaction'):
                                                                    renpy.game.interface.restart_interaction()
                                                            except Exception:
                                                                pass

                                                        if hasattr(renpy, 'invoke_in_main_thread'):
                                                            renpy.invoke_in_main_thread(_force_ui_update)
                                                        else:
                                                            _force_ui_update()
                                                    except Exception:
                                                        pass
                                                except Exception as ex_set:
                                                    sys.stderr.write("[OpenTranslator Cheat Set Error] " + str(ex_set) + "\\n")
                                            elif cmd.get('code'):
                                                exec(cmd.get('code'), st.__dict__ if st else globals())
                                        except Exception:
                                            pass
                        except Exception:
                            pass

                t = threading.Thread(target=_opent_renpy_cheat_loop)
                t.daemon = True
                t.start()
            except Exception:
                pass

        except Exception:
            pass

    _opent_bootstrap_runtime()
    del _opent_bootstrap_runtime

init 999 python:
    import json, os, pickle, re
    try:
        opent_dict = {}
        pkl_path = os.path.join(config.gamedir, "opent_translated.pkl")
        dict_path = os.path.join(config.gamedir, "opent_translated.json")
        if not os.path.exists(pkl_path) or not os.path.exists(dict_path):
            tl_dir = os.path.join(config.gamedir, "tl")
            if os.path.exists(tl_dir):
                for sub in os.listdir(tl_dir):
                    sub_path = os.path.join(tl_dir, sub)
                    if os.path.isdir(sub_path):
                        test_pkl = os.path.join(sub_path, "opent_translated.pkl")
                        test_json = os.path.join(sub_path, "opent_translated.json")
                        if os.path.exists(test_pkl) and not os.path.exists(pkl_path):
                            pkl_path = test_pkl
                        if os.path.exists(test_json) and not os.path.exists(dict_path):
                            dict_path = test_json

        if os.path.exists(pkl_path):
            with open(pkl_path, "rb") as f:
                opent_dict = pickle.load(f)
        elif os.path.exists(dict_path):
            with open(dict_path, "r") as f:
                opent_dict = json.load(f)

        ui_defaults = {
            "Preferences": "Preferências", "Start": "Iniciar", "Load": "Carregar",
            "Save": "Salvar", "Quit": "Sair", "Return": "Retornar", "Main Menu": "Menu Principal",
            "About": "Sobre", "Help": "Ajuda", "History": "Histórico", "Display": "Exibição",
            "Skip": "Pular", "After Choices": "Após Escolhas", "Window": "Janela",
            "Fullscreen": "Tela Cheia", "Text Speed": "Velocidade do Texto",
            "Auto-Forward Time": "Tempo de Auto-Avanço", "Music Volume": "Volume da Música",
            "Sound Volume": "Volume do Som", "Voice Volume": "Volume da Voz",
            "Jukebox": "Jukebox / Músicas", "Next": "Próximo", "Previous": "Anterior",
            "Currently Playing": "Tocando Agora", "Track": "Faixa", "Screen Filters": "Filtros de Tela",
            "Unlock Page": "Desbloquear Página", "Talk": "Conversar",
            "Inventory/Status": "Inventário/Status", "Inventory": "Inventário", "Status": "Status",
            "Skip Week": "Pular Semana", "It's always good to see you back": "É sempre bom ver você de volta",
            "Back": "Voltar", "Auto": "Automático", "Q.Save": "Salvar Rápido", "Q.Load": "Carregar Rápido",
            "Prefs": "Opções", "Gallery": "Galeria", "Replay": "Replay", "Music": "Música",
            "Sound": "Som", "Voice": "Voz", "Scene Gallery": "Galeria de Cenas", "CG Gallery": "Galeria de CGs",
            "Language": "Idioma", "Confirm": "Confirmar", "Yes": "Sim", "No": "Não",
            "Are you sure?": "Você tem certeza?", "Delete": "Excluir", "Empty Slot": "Espaço Vazio",
            "Page": "Página", "Name": "Nome", "Close": "Fechar", "Log": "Registro",
            "Skip unseen text": "Pular texto não visto", "Skip after choices": "Pular após escolhas",
            "Contacts": "Contatos", "Student": "Estudante", "Teacher": "Professora",
            "Home": "Casa", "Town": "Cidade",
            "Are you sure you want to quit?": "Tem certeza de que deseja sair?",
            "Font override": "Sobrescrever fonte",
            "Dimensionamento de texto": "Dimensionamento de texto",
            "Text scaling": "Dimensionamento de texto",
            "Line spacing": "Espaçamento entre linhas",
            "Character spacing": "Espaçamento entre caracteres",
            "High contrast text": "Texto de alto contraste",
            "Force mono output": "Forçar áudio monofônico",
            "Self-voicing": "Voz de acessibilidade",
            "Self-voicing volume drop": "Redução de volume da voz"
        }
        for uik, uiv in ui_defaults.items():
            if uik not in opent_dict:
                opent_dict[uik] = uiv

        opent_patch = {
            "Just don't tell [saga.cast.tony] I gave you the last one, yeah?": "S\u00f3 n\u00e3o diga ao [saga.cast.tony] que eu te dei o \u00faltimo, certo?",
            "Are you sure you want to return to the main menu?\\nThis will lose unsaved progress.": "Tem certeza de que deseja voltar ao menu principal?\\nIsso far\u00e1 voc\u00ea perder o progresso n\u00e3o salvo.",
            "Are you sure you want to return to the main menu? This will lose unsaved progress.": "Tem certeza de que deseja voltar ao menu principal? Isso far\u00e1 voc\u00ea perder o progresso n\u00e3o salvo.",
            "Narrative.": "Narrativa.",
            "Threeway, tentative.": "M\u00e9nage, hesitante.",
            "Threeway, confident.": "M\u00e9nage, confiante.",
        }
        for pk, pv in opent_patch.items():
            if pk not in opent_dict:
                opent_dict[pk] = pv

        RENPY_PREFERENCE_ACTION_NAMES = {
            "high contrast text", "high contrast", "self-voicing", "self voicing",
            "self-voicing volume drop", "self voicing volume drop", "font override",
            "text scaling", "dimensionamento de texto", "line spacing", "character spacing",
            "force mono output", "after choices", "skip after choices", "skip unseen text",
            "unseen text", "text speed", "auto-forward time", "sound volume", "music volume",
            "voice volume", "display", "fullscreen", "window", "transitions", "skip",
            "sound", "music", "voice", "joystick", "auto-forward", "toggle", "enable",
            "disable", "mixer", "rollback", "rollback side", "rollback_side", "slow text", "slow_text", "mono audio",
            "mono", "stereo", "renderer", "powersave"
        }

        RENPY_INTERNAL_PREFS = {
            "display", "fullscreen", "window", "transitions", "skip", "sound", "music",
            "voice", "joystick", "auto-forward", "toggle", "enable", "disable", "mixer",
            "rollback", "rollback side", "rollback_side", "slow text", "slow_text", "mono audio", "mono", "stereo"
        }

        KNOWN_FILE_EXTENSIONS = {
            ".txt", ".exe", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tga",
            ".ogg", ".wav", ".mp3", ".flac", ".aac", ".m4a", ".opus",
            ".ttf", ".otf", ".woff", ".woff2", ".css", ".js", ".html", ".htm",
            ".rpy", ".rpyc", ".rpym", ".rpymc", ".py", ".pyc", ".pyo",
            ".zip", ".rpa", ".rar", ".7z", ".gz", ".tar", ".bat", ".ps1",
            ".dll", ".so", ".dylib", ".bin", ".dat", ".save", ".log", ".json"
        }

        def is_filename_or_path(s):
            if not s or not isinstance(s, str if 'str' in globals() else unicode):
                return False
            s_clean = s.strip().lower()
            if ' ' not in s_clean:
                for ext in KNOWN_FILE_EXTENSIONS:
                    if s_clean.endswith(ext):
                        return True
                if '/' in s_clean or '\\\\' in s_clean:
                    return True
            return False

        def is_system_preference_key(s):
            if not s or not isinstance(s, str if 'str' in globals() else unicode):
                return False
            if is_filename_or_path(s):
                return True
            sl = s.lower().strip()
            if sl in RENPY_INTERNAL_PREFS or sl in RENPY_PREFERENCE_ACTION_NAMES:
                return True
            if any(t in sl for t in ("font", "voicing", "volume", "transform", "rollback")):
                return True
            return False

        to_delete = [k for k in list(opent_dict.keys()) if is_filename_or_path(str(k))]
        for k in to_delete:
            opent_dict.pop(k, None)

        def remove_accents(s):
            if not s: return s
            try:
                import unicodedata
                if isinstance(s, str if 'str' in globals() else unicode):
                    nfkd = unicodedata.normalize('NFD', s)
                    return "".join([c for c in nfkd if not unicodedata.combining(c)])
            except Exception:
                pass
            return s

        clean_dict = {}
        for k, v in opent_dict.items():
            if k and v:
                clean_dict[k] = remove_accents(v)
                k_strip = k.strip()
                if k_strip not in clean_dict:
                    clean_dict[k_strip] = remove_accents(v)
                if "\\\\n" in k or "\\\\t" in k:
                    clean_dict[k.replace("\\\\n", chr(10)).replace("\\\\t", chr(9))] = remove_accents(v).replace("\\\\n", chr(10)).replace("\\\\t", chr(9))
                if chr(10) in k or chr(9) in k:
                    clean_dict[k.replace(chr(10), "\\\\n").replace(chr(9), "\\\\t")] = remove_accents(v)
        opent_dict = clean_dict

        try:
            if hasattr(config, 'translations'):
                for k, v in opent_dict.items():
                    if k.lower().strip() not in RENPY_PREFERENCE_ACTION_NAMES and not is_filename_or_path(k):
                        if k not in config.translations:
                            config.translations[k] = v
        except Exception:
            pass

        def norm_key(s):
            if not s: return ""
            import re
            s_clean = re.sub(r'\\{.*?\\}', '', str(s))
            s_clean = re.sub(r'^[•\\-\\*\\>\\s▪]+', '', s_clean)
            return re.sub(r'\\s+', ' ', s_clean).strip().lower().replace("'", "").replace("’", "").replace("\`", "")

        norm_dict = {}
        for k, v in opent_dict.items():
            nk = norm_key(k)
            if nk and nk not in norm_dict:
                norm_dict[nk] = v

        # Hook seguro no translate_string do Ren'Py para capturar telas de biografias e menus
        try:
            if hasattr(renpy, 'translation') and hasattr(renpy.translation, 'translate_string'):
                curr_ts = renpy.translation.translate_string
                if not getattr(curr_ts, '_opent_hooked', False):
                    _orig_ts = curr_ts
                    def _opent_safe_ts(s, *args, **kwargs):
                        if not s or is_system_preference_key(s):
                            return _orig_ts(s, *args, **kwargs)
                        try:
                            sstr = str(s)
                            if '[' in sstr and ']' in sstr:
                                return _orig_ts(s, *args, **kwargs)
                            clean = sstr.strip()
                            if clean in opent_dict:
                                return opent_dict[clean]
                            if s in opent_dict:
                                return opent_dict[s]
                            nk = norm_key(clean)
                            if nk in norm_dict:
                                return norm_dict[nk]
                        except Exception:
                            pass
                        return _orig_ts(s, *args, **kwargs)
                    _opent_safe_ts._opent_hooked = True
                    renpy.translation.translate_string = _opent_safe_ts
        except Exception:
            pass

        def opent_text_filter(text):
            import re
            if not text or not isinstance(text, basestring if 'basestring' in globals() else str):
                return text
            if is_system_preference_key(text):
                return text

            def _looks_like_python_expr(s):
                # renpy interpolation [...] or bare python expression w/ logical ops
                if '[' in s and ']' in s:
                    return True
                if re.search(r'\\b(or|and|not|is|in|if|else|for|while)\\b', s) and re.search(r'[.](?:alt|it|ref|what|last|name|id)\\b', s):
                    return True
                return False

            if text in opent_dict:
                return opent_dict[text]

            clean = text.strip()
            if clean in opent_dict:
                return opent_dict[clean]

            text_escaped = text.replace(chr(10), "\\n")
            if text_escaped in opent_dict:
                return opent_dict[text_escaped]

            # Resolve interpola\u00e7\u00f5es [saga.cast.x] -> nome real e tenta o dict
            # (muitas chaves s\u00f3 existem j\u00e1 interpoladas, ex "..., Anon.")
            if '[' in text and ']' in text:
                try:
                    resolved = renpy.substitute(text)
                    if resolved != text:
                        if resolved in opent_dict:
                            return opent_dict[resolved]
                        r2 = resolved.strip()
                        if r2 in opent_dict:
                            return opent_dict[r2]
                except Exception:
                    pass

            nk = norm_key(clean)
            if nk in norm_dict:
                translated = norm_dict[nk]
                import re
                bullet_match = re.match(r'^([•\\-\\*\\>\\s▪]+)', clean)
                bullet_prefix = bullet_match.group(1) if bullet_match else ""
                clean_no_bullet = clean[len(bullet_prefix):].strip()
                tag_start_match = re.match(r'^((?:\\{.*?\\})+)', clean_no_bullet)
                tag_end_match = re.search(r'((?:\\{/.*?\\})+)$', clean_no_bullet)
                prefix = bullet_prefix + (tag_start_match.group(1) if tag_start_match else "")
                suffix = tag_end_match.group(1) if tag_end_match else ""
                if (prefix or suffix) and not translated.startswith("{") and not translated.startswith("•"):
                    return prefix + translated + suffix
                return translated

            # Suporte a frases dinâmicas de fim de história / WIP ("... story will return in future updates.")
            import re
            m_story = re.match(r'^([•\\-\\*\\>\\s▪]*)(?:\\{.*?\\})?(.+?)(?:\\\'s|’s)\\s+story will return in future updates\\.(?:\\{/.*?\\}|\\s)*$', clean, re.IGNORECASE)
            if m_story:
                bullet_part = m_story.group(1) or ""
                char_name = m_story.group(2).strip()
                char_trans = opent_dict.get(char_name, norm_dict.get(norm_key(char_name), char_name))
                has_tag = "{i}" in clean or clean.startswith("{i}")
                res = "A história de " + str(char_trans) + " retornará em atualizações futuras."
                if has_tag:
                    res = "{i}" + res + "{/i}"
                if bullet_part:
                    res = bullet_part + res
                return res

            m_main = re.match(r'^([•\\-\\*\\>\\s▪]*)(?:\\{.*?\\})?the main story will return in future updates\\.(?:\\{/.*?\\}|\\s)*$', clean, re.IGNORECASE)
            if m_main:
                bullet_part = m_main.group(1) or ""
                has_tag = "{i}" in clean or clean.startswith("{i}")
                res = "A história principal retornará em atualizações futuras."
                if has_tag:
                    res = "{i}" + res + "{/i}"
                if bullet_part:
                    res = bullet_part + res
                return res

            # Suporte universal a textos multilinha e biografias de personagens (paragrafo por paragrafo)
            if "\\n" in clean or chr(10) in clean:
                paragraphs = clean.split(chr(10)) if chr(10) in clean else clean.split("\\n")
                translated_paragraphs = []
                any_translated = False
                for p in paragraphs:
                    p_clean = p.strip()
                    if not p_clean:
                        translated_paragraphs.append(p)
                        continue
                    if p_clean in opent_dict:
                        translated_paragraphs.append(opent_dict[p_clean])
                        any_translated = True
                    else:
                        # Extrai bullet "• / - / * / > / ▪" e procura sem ele
                        _bp = ""
                        _p2 = p_clean
                        _mb = re.match(r'^([\u2022\\-\\*\\>\\s\u25aa]+)', _p2)
                        if _mb:
                            _bp = _mb.group(1)
                            _p2 = _p2[len(_bp):].strip()
                        if _p2 in opent_dict:
                            translated_paragraphs.append(_bp + " " + opent_dict[_p2])
                            any_translated = True
                        elif norm_key(_p2) in norm_dict:
                            translated_paragraphs.append(_bp + " " + norm_dict[norm_key(_p2)])
                            any_translated = True
                        else:
                            # Fallback: frases dinâmicas de fim de história
                            _mst = re.match(r'^(.+?)(?:\\'s|\u2019s)\\s+story will return in future updates\\.\\s*$', _p2, re.IGNORECASE)
                            _mmn = re.match(r'^the main story will return in future updates\\.\\s*$', _p2, re.IGNORECASE)
                            if _mst:
                                _cn = _mst.group(1).strip()
                                _ct = opent_dict.get(_cn, norm_dict.get(norm_key(_cn), _cn))
                                translated_paragraphs.append(_bp + "A hist\u00f3ria de " + str(_ct) + " retornar\u00e1 em atualiza\u00e7\u00f5es futuras.")
                                any_translated = True
                            elif _mmn:
                                translated_paragraphs.append(_bp + "A hist\u00f3ria principal retornar\u00e1 em atualiza\u00e7\u00f5es futuras.")
                                any_translated = True
                            else:
                                translated_paragraphs.append(p)
                if any_translated:
                    return (chr(10) if chr(10) in clean else "\\n").join(translated_paragraphs)

            if len(clean) > 1 and clean[0] in ("•", "-", "*", ">", "o", "▪"):
                bullet = clean[0]
                sub_clean = clean[1:].strip()
                if sub_clean in opent_dict:
                    return bullet + " " + opent_dict[sub_clean]
                sub_nk = norm_key(sub_clean)
                if sub_nk in norm_dict:
                    return bullet + " " + norm_dict[sub_nk]

            # Proteção contra expressões Python/interpolação: só retorna original
            # se o dicionário NÃO tem a tradução (diálogos com [saga.cast.x] são
            # traduzidos normalmente quando a chave existe).
            if _looks_like_python_expr(text):
                return text

            return text

        config.say_menu_text_filter = opent_text_filter
        config.text_filter = opent_text_filter
        try:
            config.replace_text = opent_text_filter
        except Exception:
            pass
        try:
            if hasattr(renpy, 'display') and hasattr(renpy.display, 'text'):
                renpy.display.text.text_filter = opent_text_filter
        except Exception:
            pass
        try:
            config.use_menu_text_filter = True
            if hasattr(config, 'say_menu_text_filters') and isinstance(config.say_menu_text_filters, list):
                if opent_text_filter not in config.say_menu_text_filters:
                    config.say_menu_text_filters.append(opent_text_filter)
        except Exception:
            pass
    except Exception:
        pass
`;
          try {
            const rpycFile = runtimeHookFile + "c";
            if (fs.existsSync(rpycFile)) {
              try { fs.unlinkSync(rpycFile); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
            }
            fs.writeFileSync(runtimeHookFile, runtimeHookContent, 'utf8');
          } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }

          // Injeta font.rpy limpo to language de destino e força DejaVuSans.ttf universal para acentuação UTF-8 perfeita
          const fontRpyFile = path.join(tlTargetDir, "font.rpy");
          const fontRpyFileC = path.join(tlTargetDir, "font.rpyc");
          if (fs.existsSync(fontRpyFileC)) try { fs.unlinkSync(fontRpyFileC); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
          const fontContent = `init 999 python:
    config.language = "${targetLang}"
    try:
        config.font = "DejaVuSans.ttf"
    except Exception:
        pass
`;
          try { fs.writeFileSync(fontRpyFile, fontContent, 'utf8'); } catch (e) { global.log("warn", `RPC Handlers: Failed to write fontRpyFile: ${e.message}`); }

          // DISPARO AUTOMÁTICO DO OPEN_TRANSLATOR.PY COM LOGS EM TEMPO REAL PARA JOGOS REN'PY
          const pyCandidates = [
            path.join(global.ROOT || process.cwd(), "open_translator.py"),
            path.join(global.ROOT || process.cwd(), "Tool", "open_translator.py"),
            path.join(__dirname, "..", "open_translator.py"),
            path.join(__dirname, "open_translator.py")
          ];
          const openTranslatorPy = pyCandidates.find(p => fs.existsSync(p)) || path.join(global.ROOT || process.cwd(), "Tool", "open_translator.py");
          const translationMarker = path.join(gameSubDir, ".opent_translated");
          if (fs.existsSync(openTranslatorPy) && !fs.existsSync(translationMarker)) {
            global.log("info", `[OpenTranslator Engine] 🤖 Starting scan and translation of scripts in '${gameSubDir}' to language '${targetLang}'...`);
            try {
              const { spawn } = require('child_process');
              const pyProcess = spawn('python', ['-u', openTranslatorPy, '-i', gameSubDir, '-o', tlTargetDir, '-l', targetLang, '-y'], {
                cwd: global.ROOT,
                env: { ...process.env, PYTHONUNBUFFERED: "1" }
              });

              await new Promise((resolve) => {
                pyProcess.stdout.on('data', (data) => {
                  const str = data.toString('utf8');
                  const lines = str.split(/\r?\n/).filter(l => l.trim());
                  for (const line of lines) {
                    global.log("info", `[OpenTranslator Engine] ${line.trim()}`);
                  }
                });

                pyProcess.stderr.on('data', (data) => {
                  const str = data.toString('utf8');
                  const lines = str.split(/\r?\n/).filter(l => l.trim());
                  for (const line of lines) {
                    if (!line.includes('%|') && !line.includes('tqdm')) {
                      global.log("info", `[OpenTranslator Engine] ${line.trim()}`);
                    }
                  }
                });

                pyProcess.on('close', (code) => {
                  if (code === 0) {
                    try { fs.writeFileSync(translationMarker, new Date().toISOString(), 'utf8'); } catch (e) { global.log("warn", `RPC Handlers: Failed to write translation marker: ${e.message}`); }
                  }
                  resolve(code);
                });

                pyProcess.on('error', (err) => {
                  global.log("error", `[OpenTranslator Engine] Error in Python process: ${err.message}`);
                  resolve(1);
                });
              });

              global.log("success", `[OpenTranslator Engine] ✓ Translation and automated integration completed successfully!`);
            } catch (errPy) {
              global.log("warn", `[OpenTranslator Engine] Warning executing automated translation: ${errPy.message}`);
            }
          } else if (fs.existsSync(translationMarker)) {
            global.log("info", `[OpenTranslator Engine] ✓ Scripts already translated previously (cached). Skipping full scan.`);
          }

          // Anti-Namespace Shadowing: Purge extracted common engine directories
          try {
            [path.join(gameSubDir, "common"), path.join(gameSubDir, "renpy", "common")].forEach(dir => {
              if (fs.existsSync(dir)) {
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove dir ${dir} in recursiveSweep: ${e.message}`); }
              }
            });
          } catch (ePurge2) { global.log("warn", `RPC Handlers: Error in post-translation purge: ${ePurge2.message}`); }

          const gameCacheDir = path.join(gameSubDir, "cache");
          if (fs.existsSync(gameCacheDir)) {
            try { fs.rmSync(gameCacheDir, { recursive: true, force: true }); } catch (e) { global.log("warn", `RPC Handlers: Failed to remove gameCacheDir: ${e.message}`); }
          }

          global.log("success", "[Pre-Patch] ✨ Ren'Py translation finished successfully!");
        } catch (e) {
          global.log("warn", "Warning applying Ren'Py auto-patch: " + e.message);
        }
      }
    }

    const hookDll = getHookDll(eng, exe);
    const injectExe = path.join(global.ROOT, "loaders", "inject.exe");
    let proc;

    if (eng === "python") {
      global.log("info", `🚀 Launching Ren'Py engine cleanly and autonomously (main PID)...`);
      try {
        let logFd;
        try { logFd = fs.openSync(path.join(gameDir, "opent_launch.log"), 'a'); } catch (e) { logFd = 'ignore'; }
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: ['ignore', logFd, logFd],
          detached: true,
          shell: false,
          windowsHide: false,
        });
        proc.unref();

        global.log(
          "success",
          "✨ Jogo Ren'Py inicializado com sucesso! Execução 100% autônoma ativa via game/tl/pt/."
        );
      } catch (e) {
        global.log("error", "Failed to launch Ren'Py game: " + e.message);
        return { ok: false, error: "Spawn failed: " + e.message };
      }
    } else if (hookDll && fs.existsSync(injectExe)) {
      const hookPath = path.join(global.ROOT, "loaders", hookDll);
      global.log("info", "Launching hooked game via inject.exe with hook: " + hookDll);
      try {
        proc = spawn(injectExe, [exe, hookPath], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
          windowsHide: false,
        });
        if (proc) {
          proc.on("exit", (code) => {
            global.log(
              "info",
              "Processo injetor inicial finalizou com código " +
                code +
                ". Verificando instâncias filhas desvinculadas..."
            );
            setTimeout(() => {
              const exeName = path.basename(exe, ".exe");
              const escapedDir = gameDir.replace(/'/g, "''");
              const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Select-Object -ExpandProperty Id"`;

              exec(psCmd, (err, stdout, stderr) => {
                if (err) {
                  global.log(
                    "error",
                    "Falha ao buscar instâncias desvinculadas: " + err.message
                  );
                  return;
                }
                const activePids = stdout
                  .trim()
                  .split("\n")
                  .map((p) => parseInt(p.trim(), 10))
                  .filter((p) => !isNaN(p));
                if (activePids.length > 0) {
                  global.log(
                    "info",
                    "Detectadas " +
                      activePids.length +
                      " instâncias ativas desvinculadas. Iniciando injeção em runtime..."
                  );
                  activePids.forEach((pid) => {
                    try {
                      global.log(
                        "info",
                        "Injetando hook " + hookDll + " no PID ativo: " + pid
                      );
                      const arch = getExeArch(exe);
                      const runtimeInjector =
                        arch === 64
                          ? path.join(
                              global.ROOT,
                              "loaders",
                              "PIDDLLInject64.exe"
                            )
                          : path.join(global.ROOT, "loaders", "inject.exe");
                      spawn(runtimeInjector, [String(pid), hookPath], {
                        stdio: "ignore",
                        detached: true,
                        shell: false,
                        windowsHide: false,
                      });
                    } catch (err) {
                      global.log(
                        "error",
                        "Falha na injeção em runtime no PID " +
                          pid +
                          ": " +
                          err.message
                      );
                    }
                  });
                }
              });
            }, 2500);
          });
        }
      } catch (e) {
        global.log("error", "Hook spawn exception: " + e.message);
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
          windowsHide: false,
        });
      }
    } else {
      global.log("info", "Spawning process directly: " + path.basename(exe));
      try {
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
          windowsHide: false,
        });
        if (proc && proc.unref) {
          proc.unref();
        }
      } catch (e) {
        global.log("error", "Spawn exception: " + e.message);
        if (bakDir) {
          restoreGameData(bakDir);
          bakDir = "";
        }
        return { ok: false, error: "Spawn failed: " + e.message };
      }
    }
    const gp = proc ? proc.pid : null;
    const currentBak = bakDir;
    global.launchedProc = proc;
    global.launchedKey = key;
    global.launchedBak = currentBak;
    global.launchedGameExe = exe;
    global.launchedPid = gp;
    if (proc) {
      proc.on("exit", (code, sig) => {
        global.log(
          "info",
          "Process exited: PID=" +
            gp +
            " code=" +
            code +
            " signal=" +
            (sig || "none")
        );
        if (code === 0 || eng === "python" || eng === "mz" || eng === "mv") {
          global.log(
            "info",
            "🚀 Lançador inicial finalizado. Mantendo monitoramento ativo do jogo via RPC/Subprocessos."
          );
          return;
        }
        if (global.launchedBak) {
          const bakToRestore = global.launchedBak;
          global.launchedBak = null;
          if (global.restoreTimeout) {
            clearTimeout(global.restoreTimeout);
          }
          global.restoreTimeout = setTimeout(() => {
            restoreGameData(bakToRestore);
            global.restoreTimeout = null;
          }, 20000);
        }
        global.launchedProc = null;
        global.launchedKey = null;
        global.activeCheatSocket = null;
        global.lastGameState = null;
      });
      proc.on("error", (err) => {
        global.log("error", "Process error: " + err.message);
        if (global.launchedBak) {
          const bakToRestore = global.launchedBak;
          global.launchedBak = null;
          if (global.restoreTimeout) {
            clearTimeout(global.restoreTimeout);
          }
          global.restoreTimeout = setTimeout(() => {
            restoreGameData(bakToRestore);
            global.restoreTimeout = null;
          }, 20000);
        }
        global.launchedProc = null;
        global.launchedKey = null;
        global.activeCheatSocket = null;
        global.lastGameState = null;
      });
    }
    global.log("info", "Game launched PID: " + gp);
    const bringToFront = (exePath) => {
      if (!exePath) return;
      const exeName = path.basename(exePath, ".exe");
      const psScript = [
        `Add-Type -TypeDefinition @"`,
        `using System;`,
        `using System.Runtime.InteropServices;`,
        `public class Win32Focus {`,
        `    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);`,
        `    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);`,
        `    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);`,
        `}`,
        `"@ -ErrorAction SilentlyContinue`,
        `Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | ForEach-Object {`,
        `  if ($_.MainWindowHandle -ne [IntPtr]::Zero) {`,
        `    if ([Win32Focus]::IsIconic($_.MainWindowHandle)) { [Win32Focus]::ShowWindow($_.MainWindowHandle, 9) }`,
        `    else { [Win32Focus]::ShowWindow($_.MainWindowHandle, 5) }`,
        `    [Win32Focus]::SetForegroundWindow($_.MainWindowHandle)`,
        `  }`,
        `}`,
        `exit 0`
      ].join("\n");
      const scriptPath = path.join(require("os").tmpdir(), "opent_focus_" + Date.now() + ".ps1");
      try { fs.writeFileSync(scriptPath, psScript, "utf8"); } catch (e) {}
      const psCmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`;
      try { exec(psCmd, (error) => { if (error) global.log("warn", `RPC Handlers: Failed to bring game window to front: ${error.message}`); try { fs.unlinkSync(scriptPath); } catch (e2) {} }); } catch (e) { global.log("warn", `RPC Handlers: Failed to execute bringToFront command: ${e.message}`); }
    };
    setTimeout(() => bringToFront(exe), 1000);
    setTimeout(() => bringToFront(exe), 2500);
    setTimeout(() => bringToFront(exe), 4500);
    return { pid: gp, key };
  } finally {
    global.isLaunchingGame = false;
    isLaunchingMap.delete(key);
  }
  },
  checkGame() {
    return checkProcessRunning();
  },
  listSaves({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return [];
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe)) return [];
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return [];
    try {
      return fs
        .readdirSync(sd)
        .filter((f) => !f.startsWith("."))
        .sort()
        .map((f) => {
          const st = fs.statSync(path.join(sd, f));
          return { name: f, size: st.size, mtime: st.mtimeMs };
        });
    } catch (e) {
      return [];
    }
  },
  openSave({ gameKey, file }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    const fp = path.join(sd, file);
    exec('start "" "' + fp + '"');
    return true;
  },
  deleteSave({ gameKey, file }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    try {
      fs.unlinkSync(path.join(sd, file));
      return true;
    } catch (e) {
      return false;
    }
  },
  openSaveFolder({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    exec('explorer "' + sd + '"');
    return true;
  },
  deleteGameCache({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return { ok: false, error: "Executable path not found" };
    const gameDir = path.dirname(exe);
    const cacheFile = path.join(gameDir, "trans_cache.json");
    try {
      if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
    } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    const globalCache = path.join(global.ROOT, "global_trans_cache.json");
    try {
      if (fs.existsSync(globalCache)) fs.unlinkSync(globalCache);
    } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    global.log("success", "Deleted local and global cache.");
    return { ok: true };
  },
  restoreOriginalData({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    const dataDir = findDataDir(gameDir);
    if (!dataDir)
      return { ok: false, error: "Pasta de dados do jogo não encontrada" };
    const parentDir = path.dirname(dataDir);
    const baseName = path.basename(dataDir);

    try {
      const items = fs.readdirSync(parentDir);
      const backups = [];
      for (const item of items) {
        const fullPath = path.join(parentDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          const match = item.match(new RegExp("^" + baseName + "_bak_(\\d+)$"));
          if (match) {
            backups.push({
              path: fullPath,
              timestamp: parseInt(match[1], 10),
            });
          }
        }
      }

      if (backups.length === 0) {
        return {
          ok: false,
          error: "Nenhum backup encontrado. Game já está na versão original.",
        };
      }

      backups.sort((a, b) => a.timestamp - b.timestamp);
      const oldestBak = backups[0].path;

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.cpSync(oldestBak, dataDir, { recursive: true, force: true });

      const wwwDir = path.dirname(dataDir);
      const bakPlugins = path.join(oldestBak, "plugins.js_bak");
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(bakPlugins)) {
        try {
          if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
          fs.copyFileSync(bakPlugins, pluginsJsPath);
        } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
      }

      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }

      global.log("success", "Original data restored successfully.");
      return { ok: true };
    } catch (e) {
      global.log("error", "Failed to restore original data: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  exportGameTexts({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return { ok: false, error: "Executable path not found" };
    const gameDir = path.dirname(exe);
    const cacheFile = path.join(gameDir, "trans_cache.json");
    if (!fs.existsSync(cacheFile)) {
      return {
        ok: false,
        error: "Nenhum cache de tradução encontrado para exportar.",
      };
    }
    const desktop = path.join(require("os").homedir(), "Desktop");
    const title = g.libConf?.title || gameKey;
    const exportFile = path.join(desktop, `${title}_traducoes.json`);
    try {
      fs.copyFileSync(cacheFile, exportFile);
      exec(`explorer /select,"${exportFile}"`);
      return { ok: true, path: exportFile };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  sendCheatCommand(params) {
    const code = params.code || params.command || "";
    global.log("info", "Queuing cheat command: " + JSON.stringify(params));
    if (global.activeCheatSocket && global.activeCheatSocket.readyState === 1) {
      try {
        global.activeCheatSocket.send(JSON.stringify(params));
      } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    }
    global.pendingCheatCommands.push(params);
    return { ok: true };
  },
  getGameState() {
    const isRecentPoll = Date.now() - global.lastCheatPollTime < 8000;
    const isSocketOpen = global.activeCheatSocket !== null && global.activeCheatSocket.readyState === 1;
    const connected = (isRecentPoll || isSocketOpen) && global.lastGameState !== null;
    return { connected, state: global.lastGameState };
  },
  async translate({ text, sl, tl }) {
    return translateSingle(text, sl, tl);
  },
  log({ level, message }) {
    global.log(level, message);
    return true;
  },
  engineInfo({ eng }) {
    return ENGINES_DEF[eng] || ENGINES_DEF.mz;
  },
  async batchTranslate({ texts, sl, tl }) {
    const results = await translateBatch(texts, sl || "auto", tl || "pt");
    const entries = [];
    for (const [id, tr] of results) entries.push({ id, translation: tr });
    return entries;
  },
  async findGame({ name, size, mtime }) {
    if (!name) return null;
    const found = await findGameOnDisk(name);
    if (!found || found.length === 0) return null;
    if (size && mtime) {
      const exact = found.filter(
        (f) => f.size === size && Math.round(f.mtime) === Math.round(mtime)
      );
      if (exact.length >= 1) return exact[0];
    }
    if (size) {
      const bySize = found.filter((f) => f.size === size);
      if (bySize.length >= 1) return bySize[0];
      if (bySize.length > 1 && mtime) {
        bySize.sort(
          (a, b) => Math.abs(a.mtime - mtime) - Math.abs(b.mtime - mtime)
        );
        return bySize[0];
      }
    }
    global.log(
      "info",
      "Found " + found.length + ' matches for "' + name + '", using first'
    );
    return found[0];
  },
  resolveShortcut({ shortcutPath }) {
    return new Promise((res) => {
      if (!shortcutPath.toLowerCase().endsWith(".lnk")) {
        res(shortcutPath);
        return;
      }
      const psCmd = `$sh = New-Object -ComObject WScript.Shell; $sh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}').TargetPath`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, (err, stdout) => {
        if (err) {
          res(shortcutPath);
          return;
        }
        const target = stdout.trim();
        if (target && fs.existsSync(target)) {
          res(target);
        } else {
          res(shortcutPath);
        }
      });
    });
  },
  loadGlossary() {
    return loadGlossary();
  },
  saveGlossary({ entries }) {
    return saveGlossary(entries);
  },
  async translateWithEngine({ text, sl, tl, engine }) {
    return translateSingle(text, sl || "auto", tl || "pt", engine || "multi");
  },
  async batchTranslateWithEngine({ texts, sl, tl, engine, glossary }) {
    const results = await translateBatch(
      texts || [],
      sl || "auto",
      tl || "pt",
      engine || "multi",
      glossary
    );
    const entries = [];
    for (const [id, tr] of results) entries.push({ id, translation: tr });
    return entries;
  },
  installOverlay({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const dataDir = findDataDir(gameDir);
    if (!dataDir) return { ok: false, error: "Game data directory not found" };
    let wwwDir = path.dirname(dataDir);
    if (!fs.existsSync(path.join(wwwDir, "index.html"))) wwwDir = gameDir;
    const overlayPath = path.join(global.ROOT, "www", "UltraTranslateOverlay.js");
    if (!fs.existsSync(overlayPath))
      return { ok: false, error: "Overlay JS not found" };
    try {
      const pluginsDir = path.join(wwwDir, "js", "plugins");
      if (!fs.existsSync(pluginsDir))
        fs.mkdirSync(pluginsDir, { recursive: true });
      const dest = path.join(pluginsDir, "UltraTranslateOverlay.js");
      let overlayContent = fs.readFileSync(overlayPath, "utf8");
      const dictFile = "UltraTranslations.json";
      overlayContent = overlayContent.replace("__DICT_FILENAME__", dictFile);
      const cfg = handlers.loadCfg();
      const wrapLimit =
        cfg.wordWrapLimit !== undefined ? cfg.wordWrapLimit : 50;
      overlayContent = overlayContent.replace("__WORD_WRAP_LIMIT__", wrapLimit);
      fs.writeFileSync(dest, overlayContent, "utf8");
      const pluginListPath = path.join(wwwDir, "js", "plugins.json");
      if (fs.existsSync(pluginListPath)) {
        try {
          const plugins = JSON.parse(fs.readFileSync(pluginListPath, "utf8"));
          if (!plugins.some((p) => p.name === "UltraTranslateOverlay")) {
            plugins.push({
              name: "UltraTranslateOverlay",
              status: "on",
              description: "Runtime overlay",
            });
            fs.writeFileSync(
              pluginListPath,
              JSON.stringify(plugins, null, 2),
              "utf8"
            );
          }
        } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
      }
      global.log("info", "Overlay installed for " + path.basename(exe));
      return true;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  installUnity({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const exeName = path.basename(exe);
    try {
      const bepDir = path.join(gameDir, "BepInEx");
      if (!fs.existsSync(bepDir)) {
        fs.mkdirSync(path.join(bepDir, "plugins"), { recursive: true });
        fs.mkdirSync(path.join(bepDir, "config"), { recursive: true });
        fs.writeFileSync(
          path.join(bepDir, "config", "AutoTranslatorConfig.ini"),
          "[Service]\nEndpoint=UltraBatch\n" +
            "[UltraBatch]\nUrl=http://127.0.0.1:7861/xbatch\nTranslationDelay=0.1\n" +
            "[General]\nLanguage=pt\nFromLanguage=ja\n",
          "utf8"
        );
      }
      const pluginSrc = path.join(
        global.ROOT,
        "resources",
        "unity",
        "xunity_plugin",
        "UltraBatchEndpoint.dll"
      );
      if (fs.existsSync(pluginSrc)) {
        const pluginDst = path.join(
          bepDir,
          "plugins",
          "UltraBatchEndpoint.dll"
        );
        const xunityPlugins = path.join(
          bepDir,
          "plugins",
          "XUnity.AutoTranslator.Plugin.Unity"
        );
        if (fs.existsSync(xunityPlugins)) {
          fs.copyFileSync(
            pluginSrc,
            path.join(xunityPlugins, "UltraBatchEndpoint.dll")
          );
        } else {
          fs.copyFileSync(
            pluginSrc,
            path.join(bepDir, "plugins", "UltraBatchEndpoint.dll")
          );
        }
      }
      global.log("info", "Unity installed for " + exeName);
      return true;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  async extractRpa({ rpaPath, outputDir }) {
    if (!rpaPath || !fs.existsSync(rpaPath))
      return { ok: false, error: "RPA file not found" };
    const outDir =
      outputDir ||
      path.join(path.dirname(rpaPath), path.basename(rpaPath) + "_extracted");
    const script = path.join(global.ROOT, "unren_tools", "rpatool.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, ["-x", rpaPath, "-o", outDir]);
  },
  async packRpa({ inputDir, outputPath }) {
    if (!inputDir || !fs.existsSync(inputDir))
      return { ok: false, error: "Input directory not found" };
    const script = path.join(global.ROOT, "unren_tools", "rpatool.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, [
      "-c",
      outputPath || inputDir + ".rpa",
      inputDir,
    ]);
  },
  async decompileRpyc({ filePath, outputDir }) {
    if (!filePath || !fs.existsSync(filePath))
      return { ok: false, error: "File not found" };
    const script = path.join(global.ROOT, "unren_tools", "unrpyc.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "unrpyc.py not found" };
    const args = ["--utf-8", filePath];
    if (outputDir) args.push("-o", outputDir);
    return runPythonScript(script, args);
  },
  async translateRpgMaker({ gameKey, overlay }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const cfg = handlers.loadCfg();
    const eng = g.constArgs?.engine || detectEngine(exe);
    const eInfo = ENGINES_DEF[eng];
    let bakDir = "";
    if (eInfo && eInfo.js) {
      bakDir = await executeTranslationPipeline(
        gameDir,
        cfg,
        g.libConf?.title || gameKey
      );
    }
    if (overlay) {
      try {
        await handlers.installOverlay({ gameKey });
      } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    }
    return { backup: !!bakDir };
  },
  async extractWolf({ gamePath }) {
    if (!gamePath || !fs.existsSync(gamePath))
      return { ok: false, error: "Caminho do jogo Wolf não encontrado" };
    const uberWolfExe = path.join(global.ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    return new Promise((res) => {
      global.log("info", `Executing UberWolfCli.exe to extract: ${gamePath}`);
      const proc = spawn(uberWolfExe, ["-o", "-u", "-x", gamePath], {
        timeout: 120000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          global.log("info", `UberWolfCli completed. Output: ${stdout}`);
          res({ ok: true, output: stdout });
        } else {
          global.log(
            "error",
            `Falha ao executar UberWolfCli. Código: ${code}. Erro: ${stderr}`
          );
          res({ ok: false, error: stderr || `Código de saída: ${code}` });
        }
      });
      proc.on("error", (err) => {
        global.log("error", `Error starting UberWolfCli: ${err.message}`);
        res({ ok: false, error: err.message });
      });
    });
  },
  async packWolf({ inputDir, versionIndex }) {
    if (!inputDir || !fs.existsSync(inputDir))
      return { ok: false, error: "Pasta de origem não encontrada" };
    const uberWolfExe = path.join(global.ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    const verIdx = versionIndex !== undefined ? String(versionIndex) : "4";

    return new Promise((res) => {
      global.log(
        "info",
        `Executando UberWolfCli.exe para empacotar: ${inputDir} com versão index ${verIdx}`
      );
      const proc = spawn(uberWolfExe, ["-p", verIdx, inputDir], {
        timeout: 120000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          global.log(
            "info",
            `UberWolfCli reempacotamento concluído. Saída: ${stdout}`
          );
          res({ ok: true, output: stdout });
        } else {
          global.log(
            "error",
            `Falha ao empacotar com UberWolfCli. Código: ${code}. Erro: ${stderr}`
          );
          res({ ok: false, error: stderr || `Código de saída: ${code}` });
        }
      });
      proc.on("error", (err) => {
      });
    });
  },
  async selectFolder(params = {}) {
    const title = params.title || "";
    try {
      const desc = title || "Selecione a pasta de destino para descompactar o jogo Ren'Py";
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = '${desc.replace(/'/g, "''")}'
        $dialog.ShowNewFolderButton = $true
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $dialog.SelectedPath
        }
      `;
      const folderPath = execSync(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
      return { ok: true, folderPath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  async unpackRenpyFull({ key, targetDir }) {
    const games = handlers.loadGames().games;
    const g = games[key];
    if (!g) return { ok: false, error: "Jogo não encontrado." };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe)) return { ok: false, error: "Executável do jogo não encontrado." };
    const gameDir = path.dirname(exe);
    const title = g.libConf?.title || path.basename(gameDir);

    const outDir = targetDir || path.join(path.dirname(gameDir), title + "_Descompactado");
    const script = path.join(global.ROOT, "resources", "renpy", "unpack_renpy_all.py");
    if (!fs.existsSync(script)) {
      return { ok: false, error: "Script unpack_renpy_all.py não encontrado." };
    }

    global.log("info", `============================================================`);
    global.log("info", `📦 FULL REN'PY UNPACKING: "${title}"`);
    global.log("info", `📁 Source: ${gameDir}`);
    global.log("info", `🎯 Destination: ${outDir}`);
    global.log("info", `============================================================`);

    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;
    try {
      const { spawn } = require('child_process');
      const pyProcess = spawn('python', ['-u', script, '-i', gameSubDir, '-o', outDir], {
        cwd: global.ROOT,
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
      });

      await new Promise((resolve) => {
        pyProcess.stdout.on('data', (data) => {
          const lines = data.toString('utf8').split(/\r?\n/).filter(l => l.trim());
          for (const l of lines) {
            global.log("info", l.trim());
          }
        });
        pyProcess.stderr.on('data', (data) => {
          const lines = data.toString('utf8').split(/\r?\n/).filter(l => l.trim());
          for (const l of lines) {
            global.log("info", l.trim());
          }
        });
        pyProcess.on('close', (code) => resolve(code));
        pyProcess.on('error', (err) => {
          global.log("error", `Error in unpacking process: ${err.message}`);
          resolve(1);
        });
      });

      global.log("success", `✨ Descompactação total concluída! Todos os save files em: '${outDir}'`);
      return { ok: true, outDir };
    } catch (e) {
      global.log("error", `Failed full unpacking: ${e.message}`);
      return { ok: false, error: e.message };
    }
  },
  async unpackEvb({ exePath, destDir }) {
    if (!exePath || !fs.existsSync(exePath))
      return { ok: false, error: "Arquivo executável não encontrado" };
    const outDir =
      destDir ||
      path.join(
        path.dirname(exePath),
        path.basename(exePath, ".exe") + "_extracted"
      );
    const script = path.join(global.ROOT, "resources", "evb", "evb_unpack.py");
    if (!fs.existsSync(script))
      return {
        ok: false,
        error: "Script evb_unpack.py não encontrado nos recursos.",
      };

    try {
      global.log(
        "info",
        `Executando descompactação EVB para: ${exePath} na pasta ${outDir}`
      );
      const stdout = await runPythonScript(script, [exePath, outDir]);
      global.log(
        "success",
        `Descompactação EVB concluída com sucesso para: ${outDir}`
      );
      return { ok: true, path: outDir };
    } catch (e) {
      global.log("error", "Failed EVB unpacking: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  async exportExcel({ gameKey }) {
    const ExcelJS = require("exceljs");
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    let translationsToExport = [];
    const cacheFile = path.join(gameDir, "trans_cache.json");

    if (fs.existsSync(cacheFile)) {
      try {
        const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        const cacheTranslations = cd.translations || {};
        for (const [k, v] of Object.entries(cacheTranslations)) {
          const firstColonIdx = k.indexOf(":");
          const secondColonIdx = k.indexOf(":", firstColonIdx + 1);
          let originalText = "";
          if (secondColonIdx !== -1) {
            originalText = k.slice(secondColonIdx + 1);
          } else {
            originalText = k;
          }
          translationsToExport.push({
            key: k,
            original: originalText,
            translated: v,
          });
        }
      } catch (e) {
        global.log("warn", "Error reading local game cache: " + e.message);
      }
    }

    if (translationsToExport.length === 0) {
      global.log(
        "info",
        "Gerando lista de strings diretamente dos arquivos do jogo..."
      );
      try {
        const texts = extractGameTexts(gameDir);
        const seenKeys = new Set();
        for (const t of texts) {
          const k = t.file + ":" + t.keys.join(".") + ":" + t.original;
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);
          translationsToExport.push({
            key: k,
            original: t.original,
            translated: "",
          });
        }
      } catch (e) {
        return {
          ok: false,
          error: "Falha ao extrair textos para exportação: " + e.message,
        };
      }
    }

    if (translationsToExport.length === 0) {
      return {
        ok: false,
        error: "Nenhuma string encontrada no jogo para exportar.",
      };
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Traduções");

      worksheet.columns = [
        { header: "Chave de Referência (NÃO EDITAR)", key: "key", width: 50 },
        { header: "Texto Original", key: "original", width: 60 },
        { header: "Tradução", key: "translated", width: 60 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      for (const item of translationsToExport) {
        worksheet.addRow({
          key: item.key,
          original: item.original,
          translated: item.translated,
        });
      }

      const desktop = path.join(require("os").homedir(), "Desktop");
      const title = g.libConf?.title || gameKey;
      const exportFile = path.join(desktop, `${title}_traducoes.xlsx`);

      await workbook.xlsx.writeFile(exportFile);
      global.log("success", `Excel export completed. Saved in: ${exportFile}`);
      exec(`explorer /select,"${exportFile}"`);
      return { ok: true, path: exportFile };
    } catch (e) {
      global.log("error", "Failed to generate Excel file: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  async importExcel({ gameKey, excelPath }) {
    const ExcelJS = require("exceljs");
    if (!excelPath || !fs.existsSync(excelPath))
      return { ok: false, error: "Arquivo Excel não encontrado" };

    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    try {
      global.log("info", "Reading translations from Excel file: " + excelPath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      const worksheet = workbook.getWorksheet(1);

      const importedTranslations = {};
      let count = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const key = row.getCell(1).value;
        const translated = row.getCell(3).value;

        if (
          key &&
          typeof key === "string" &&
          translated !== undefined &&
          translated !== null
        ) {
          let val = String(translated).trim();
          if (val) {
            importedTranslations[key] = val;
            count++;
          }
        }
      });

      if (count === 0) {
        return {
          ok: false,
          error: "Nenhuma tradução válida encontrada no arquivo Excel",
        };
      }

      const cacheFile = path.join(gameDir, "trans_cache.json");
      const cfg = handlers.loadCfg();
      const sl = cfg.sl || "auto";
      const tl = cfg.tl || "pt";
      const engine = cfg.engine || "google";
      const cfgKey = sl + "|" + tl + "|" + engine;

      let existingTranslations = {};
      if (fs.existsSync(cacheFile)) {
        try {
          const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
          existingTranslations = cd.translations || {};
        } catch (e) {
          global.log(
            "warn",
            "Erro ao ler cache existente para mesclagem: " + e.message
          );
        }
      }

      for (const [k, v] of Object.entries(importedTranslations)) {
        existingTranslations[k] = v;
      }

      fs.writeFileSync(
        cacheFile,
        JSON.stringify(
          {
            cfgKey: cfgKey,
            translations: existingTranslations,
          },
          null,
          2
        )
      );

      global.log(
        "success",
        `Excel import completed successfully! ${count} traduções mescladas.`
      );
      return { ok: true, count: count };
    } catch (e) {
      global.log("error", "Failed to import Excel file: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  deleteGameCache({ gameKey }) {
    try {
      const games = handlers.loadGames().games || {};
      const g = games[gameKey];
      if (!g) return { ok: false, error: "Game not found" };

      const exe = g.constArgs?.gameExe || "";
      const gameDir = exe ? path.dirname(exe) : "";
      const gameSubDir = gameDir ? (fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir) : "";

      let deletedCount = 0;
      const targets = [
        path.join(gameDir, "opent_translated.json"),
        path.join(gameDir, "opent_translated.pkl"),
        path.join(gameDir, "translation_cache.json"),
        path.join(gameDir, "UltraTranslations.json"),
        path.join(gameSubDir, "opent_translated.json"),
        path.join(gameSubDir, "opent_translated.pkl"),
        path.join(gameSubDir, "000_opent_runtime.rpy"),
        path.join(gameSubDir, "000_opent_runtime.rpyc"),
        path.join(gameSubDir, "000_anti_crash.rpy"),
        path.join(gameSubDir, "000_anti_crash.rpyc"),
        path.join(gameSubDir, "zz_opent_runtime.rpy"),
        path.join(gameSubDir, "zz_opent_runtime.rpyc"),
        path.join(gameSubDir, "zz_anti_crash.rpy"),
        path.join(gameSubDir, "zz_anti_crash.rpyc"),
        path.join(global.ROOT || "", "translation_cache.json"),
        path.join(process.cwd(), "translation_cache.json")
      ];

      const tlDir = path.join(gameSubDir, "tl");
      if (fs.existsSync(tlDir)) {
        try {
          const subs = fs.readdirSync(tlDir);
          for (const sub of subs) {
            const subPath = path.join(tlDir, sub);
            if (fs.statSync(subPath).isDirectory()) {
              targets.push(path.join(subPath, "opent_translated.json"));
              targets.push(path.join(subPath, "opent_translated.pkl"));
              targets.push(path.join(subPath, "font.rpy"));
              targets.push(path.join(subPath, "font.rpyc"));
            }
          }
        } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
      }

      for (const t of targets) {
        if (t && fs.existsSync(t)) {
          try {
            fs.unlinkSync(t);
            deletedCount++;
          } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
        }
      }

      global.log("success", `[Cache] 🗑️ Translation cache deleted successfully for "${g.title || gameKey}" (${deletedCount} arquivos limpos)!`);
      return { ok: true, count: deletedCount };
    } catch (e) {
      global.log("error", "Failed to delete cache: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  exportGameTexts({ gameKey }) {
    try {
      const games = handlers.loadGames().games || {};
      const g = games[gameKey];
      if (!g) return { ok: false, error: "Game not found" };

      const exe = g.constArgs?.gameExe || "";
      const gameDir = exe ? path.dirname(exe) : "";
      const gameSubDir = gameDir ? (fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir) : "";

      const jsonFile = path.join(gameSubDir, "opent_translated.json");
      if (!fs.existsSync(jsonFile)) return { ok: false, error: "Nenhum arquivo de tradução encontrado para este jogo." };

      const exportPath = path.join(gameDir, "Exported_Texts_PTBR.txt");
      const dict = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
      const lines = ["# OpenTranslator Exported Texts", "# ============================================================"];
      for (const [k, v] of Object.entries(dict)) {
        lines.push(`ORIGINAL: ${k}`);
        lines.push(`TRADUÇÃO: ${v}`);
        lines.push("------------------------------------------------------------");
      }
      fs.writeFileSync(exportPath, lines.join("\n"), "utf8");
      global.log("success", `[Export Texts] 📄 Texts exported successfully to: ${exportPath}`);
      return { ok: true, exportPath };
    } catch (e) {
      global.log("error", "Failed to export texts: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  scanGameVariables() {
    if (!global.lastGameState) {
      return { ok: false, error: "Nenhum jogo conectado ao Cheat Overlay." };
    }
    return {
      ok: true,
      variables: global.lastGameState.variables || [],
      switches: global.lastGameState.switches || []
    };
  },
  setGameVar({ id, value }) {
    const cmd = { comando: "set_var", id: id, valor: value };
    if (global.activeCheatSocket && global.activeCheatSocket.readyState === 1) {
      try { global.activeCheatSocket.send(JSON.stringify(cmd)); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    }
    global.pendingCheatCommands.push(cmd);
    global.log("success", `[Cheat] Injected into live game: Variable #${id} = ${value}`);
    return { ok: true };
  },
  setGameSwitch({ id, value }) {
    const cmd = { comando: "set_switch", id: id, valor: Boolean(value) };
    if (global.activeCheatSocket && global.activeCheatSocket.readyState === 1) {
      try { global.activeCheatSocket.send(JSON.stringify(cmd)); } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
    }
    global.pendingCheatCommands.push(cmd);
    global.log("success", `[Cheat] Injected into live game: Switch #${id} = ${value}`);
    return { ok: true };
  },

  
  openSaveFolder({ folderPath, gameKey }) {
    try {
      let targetPath = folderPath;
      if (!targetPath && gameKey) {
        const games = handlers.loadGames().games || {};
        const g = games[gameKey];
        if (g) {
          const exe = g.constArgs?.gameExe || "";
          const gameDir = exe ? path.dirname(exe) : "";
          const gameSubDir = gameDir ? (fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir) : "";
          const title = g.libConf?.title || gameKey;
          const resolved = renpyAppDataResolver.resolveGameAppDataDir(gameSubDir, title);
          if (resolved.success && resolved.appDataDir) {
            targetPath = resolved.appDataDir;
          }
        }
      }
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { ok: false, error: "Pasta de saves não encontrada ou inacessível." };
      }
      const safePath = targetPath.replace(/'/g, "''");
      const psCmd = `powershell -NoProfile -Command "Start-Process explorer.exe '${safePath}'"`;
      exec(psCmd);
      global.log("success", `[AppData Explorer] Save folder opened in Windows Explorer: ${targetPath}`);
      return { ok: true, path: targetPath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  

},

  getRenpyAppDataStatus({ key, gameDir, gameTitle }) {
    try {
      const gameSubDir = gameDir || "";
      const title = gameTitle || key || "";

      // 1. Check live WebSocket telemetry state
      if (global.lastGameState && (global.lastGameState.savedir || global.lastGameState.save_directory)) {
        const liveSavedir = global.lastGameState.savedir;
        if (liveSavedir && fs.existsSync(liveSavedir)) {
          let saves = [];
          try {
            saves = fs.readdirSync(liveSavedir).filter(f => f.endsWith('.save') || f === 'persistent');
          } catch(e) { global.log("warn", `RPC Handlers: Error in font patch for Ruby Maker: ${e.message}`); }
          return {
            ok: true,
            data: {
              success: true,
              appDataDir: liveSavedir,
              saveDirectoryName: global.lastGameState.save_directory || path.basename(liveSavedir),
              method: "live_websocket",
              error: null,
              saves: saves
            }
          };
        }
      }

      // 2. Fallback to Portable Resolver
      const resolved = renpyAppDataResolver.resolveGameAppDataDir(gameSubDir, title);
      let saves = [];
      if (resolved.success && resolved.appDataDir && fs.existsSync(resolved.appDataDir)) {
        try {
          saves = fs.readdirSync(resolved.appDataDir).filter(f => f.endsWith('.save') || f === 'persistent');
        } catch(e) { global.log("warn", `RPC Handlers: Error in font patch for Ruby Maker: ${e.message}`); }
      }

      return {
        ok: true,
        data: {
          ...resolved,
          saves: saves
        }
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

};

module.exports = {
  handlers
};

function verifyAndDiagnoseGame(gameDir, exe, pid) {
  setTimeout(() => {
    if (!exe) return;
    const exeName = path.basename(exe, ".exe");
    const escapedDir = gameDir.replace(/'/g, "''");
    const psCheck = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Select-Object -ExpandProperty Id"`;

    exec(psCheck, (err, stdout) => {
      const activePids = (stdout || "")
        .trim()
        .split("\n")
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 0);

      let targetPid = pid;
      let isRunning = false;

      if (pid && pid > 0) {
        try {
          isRunning = process.kill(pid, 0);
        } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
      }

      if (!isRunning && activePids.length > 0) {
        targetPid = activePids[0];
        isRunning = true;
        global.launchedPid = targetPid;
      }

      if (!isRunning) {
        const psCheckChild = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith('${escapedDir}', [System.StringComparison]::OrdinalIgnoreCase) } | Select-Object -ExpandProperty Id"`;
        exec(psCheckChild, (errChild, stdoutChild) => {
          const childPids = (stdoutChild || "")
            .trim()
            .split("\n")
            .map((p) => parseInt(p.trim(), 10))
            .filter((p) => !isNaN(p) && p > 0);
          if (childPids.length > 0) {
            global.launchedPid = childPids[0];
            global.log(
              "info",
              `[Health Check] Processo ativo do jogo (${exeName}, PID ${childPids[0]}) detectado em execução.`
            );
            return;
          }
          global.log(
            "error",
            `[Boot Error] Game process (${exeName}) was closed immediately after boot.`
          );
          const debugLogPath = path.join(gameDir, "debug.log");
          if (fs.existsSync(debugLogPath)) {
            try {
              const content = fs.readFileSync(debugLogPath, "utf8").trim();
              const lines = content.split("\n").filter((l) => l.trim().length > 0);
              const lastLines = lines.slice(-5).join("\n  -> ");
              global.log(
                "info",
                "Game error logs (debug.log):\n  -> " + lastLines
              );
            } catch (e) { global.log("warn", `RPC Handlers: Error processing asset file: ${e.message}`); }
          }
        });
        return;
      }

      const cmd = `powershell -NoProfile -Command "(Get-Process -Id ${targetPid} -ErrorAction SilentlyContinue).MainWindowHandle"`;

      exec(cmd, (err2, stdout2) => {
        const handleStr = (stdout2 || "").trim();
        const handleNum = parseInt(handleStr, 10);

        if (!isNaN(handleNum) && handleNum > 0) {
          global.log(
            "success",
            `[Health Check] Game (PID ${targetPid}) is active with VISIBLE WINDOW on screen (Handle: ${handleNum}).`
          );
        } else {
          global.log(
            "info",
            `[Health Check] Game (PID ${targetPid}) is actively running on system.`
          );
        }
      });
    });
  }, 3500);
}
