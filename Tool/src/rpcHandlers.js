const fs = require("fs");
const path = require("path");
const { exec, spawn, execSync } = require("child_process");

const {
  ENGINES_DEF,
  detectEngine,
  findDataDir,
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

const { extractGameTexts } = require("./extractor");

const {
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg,
  getDb
} = require("./cache");

const { translateSingle, translateBatch } = require("./translator");

const handlers = {
  async decryptImages({ gameKey, destDir, type }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    let imgDir = path.join(gameDir, "img");
    let audioDir = path.join(gameDir, "audio");
    let dataDirParent = gameDir;

    if (!fs.existsSync(imgDir) && !fs.existsSync(audioDir)) {
      const wwwDir = path.join(gameDir, "www");
      imgDir = path.join(wwwDir, "img");
      audioDir = path.join(wwwDir, "audio");
      dataDirParent = wwwDir;
    }

    const targetType = type || "img";
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
        const sys = JSON.parse(fs.readFileSync(systemJsonPath, "utf8"));
        if (
          (sys.hasEncryptedImages || sys.hasEncryptedAudio) &&
          sys.encryptionKey
        ) {
          keyHex = sys.encryptionKey;
        }
      } catch (e) {
        global.log(
          "warn",
          "Falha ao ler System.json para obter chave de criptografia: " +
            e.message
        );
      }
    }

    let keyBytes = null;
    if (keyHex && keyHex.length === 32) {
      keyBytes = Buffer.from(keyHex, "hex");
    }

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
          const ext = path.extname(file).toLowerCase();
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
                ? [".ogg", ".m4a", ".mp3", ".wav"].includes(ext)
                : [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
            if (isNormalAsset) {
              try {
                const destFile = path.join(currentDestDir, file);
                fs.copyFileSync(fullPath, destFile);
                count++;
              } catch (e) {}
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
        "Patch de fontes aplicado com sucesso! Fonte pt-br-font.ttf instalada."
      );
      return { ok: true };
    } catch (e) {
      global.log("error", "Falha ao aplicar patch de fontes: " + e.message);
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
      } catch (e2) {}
      global.log(
        "info",
        "Histórico de traduções globais (JSON e SQLite) excluído com sucesso."
      );
      return true;
    } catch (e) {
      global.log("error", "Falha ao limpar histórico de traduções: " + e.message);
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
                } catch (e) {}
              }
            }

            games[key] = d;
          } catch (e) {}
        });
    } catch (e) {}
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
      `💬 [RPC REALTIME] "${clean}" ➔ 🌐 "${translated}" (${sl.toUpperCase()} ➔ ${tl.toUpperCase()} | Motor: ${eng.toUpperCase()})`
    );

    try {
      if (global.activeGameDir) {
        const jsonPath = path.join(global.activeGameDir, "game", "opent_translated.json");
        let dict = {};
        if (fs.existsSync(jsonPath)) {
          try { dict = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) {}
        }
        dict[clean] = translated;
        fs.writeFileSync(jsonPath, JSON.stringify(dict, null, 2), 'utf8');
      }
    } catch (e) {}

    return { ok: true, data: { translated, text: translated } };
  },
  async launchGame({ key }) {
    if (global.isLaunchingGame) {
      global.log("warn", "launchGame: inicialização de jogo já em andamento");
      return { ok: false, error: "Launch/pipeline already in progress" };
    }
    if (global.launchedProc && checkProcessRunning().running) {
      global.log("warn", "launchGame: jogo já em execução");
      return { ok: false, error: "A game is already running" };
    }

    global.serverLogs = [];
    global.logSeq = 0;
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
        global.log("warn", `Executable "${exe}" não existe diretamente. Procurando auto-resolução no disco...`);
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
          } catch (e) {}
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
          global.log("info", `Auto-resolvido executável do jogo "${title}": ${exe} (Engine: ${eng})`);
        }
      }

      if (exe && fs.existsSync(exe)) {
        const detected = detectEngine(exe);
        if (detected && (detected !== eng || !eng)) {
          eng = detected;
          g.constArgs = { ...g.constArgs, engine: eng };
          try { handlers.saveGame({ key, data: g }); } catch (e) {}
        }
      }
      const gameDir = exe ? path.dirname(exe) : "";
      const cfg = handlers.loadCfg();
      const slStr = (cfg.sl || "auto").toUpperCase();
      const tlStr = (cfg.tl || "pt").toUpperCase();
      const engName = ENGINES_DEF[eng]?.label || eng;
      const archBits = exe ? getExeArch(exe) : 32;

      global.log("info", "============================================================");
      global.log("info", `🎮 INICIANDO JOGO: "${title}"`);
      global.log("info", `📁 Diretório Raiz: ${gameDir}`);
      global.log("info", `🕹️ Executável: ${path.basename(exe)} (${archBits}-bit)`);
      global.log("info", `🧠 Engine Detectada: ${engName} (${eng})`);
      global.log("info", `🌐 Tradução Configurada: ${slStr} ➔ ${tlStr} | Motor: ${(cfg.engine || "google").toUpperCase()}`);
      global.log("info", "============================================================");

      if (!exe || !fs.existsSync(exe))
        return { ok: false, error: "EXE não encontrado no disco: " + exe };

      try {
        const escapedDir = gameDir.replace(/'/g, "''");
        const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Stop-Process -Force"`;
        execSync(psCmd);
        global.log("info", "🧹 Limpeza de processos zumbis anteriores concluída.");
      } catch (e) {}

    let bakDir = "";
    const eInfo = ENGINES_DEF[eng];
    if (eInfo && eInfo.js) {
      bakDir = await executeTranslationPipeline(gameDir, cfg, title);
    }

    // AUTO-PATCH NATIVO PARA REN'PY (SUPORTE MULTI-IDIOMA)
    if (eng === "python") {
      const targetLang = (cfg && (cfg.tl || cfg.targetLang || cfg.target_language || cfg.language || cfg.toLang)) || "pt";
      const gameSubDir = path.join(gameDir, "game");
      if (fs.existsSync(gameSubDir)) {
        try {
          const cacheDir = path.join(gameSubDir, "cache");
          if (fs.existsSync(cacheDir)) {
            try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch (e) {}
          }
          // Cria a estrutura nativa de tradução do Ren'Py em game/tl/<targetLang>/
          const tlTargetDir = path.join(gameSubDir, "tl", targetLang);
          if (!fs.existsSync(tlTargetDir)) {
            try { fs.mkdirSync(tlTargetDir, { recursive: true }); } catch (e) {}
          }
          const tlStringsFile = path.join(tlTargetDir, "strings.rpy");
          if (!fs.existsSync(tlStringsFile)) {
            const nativeDict = `
# Ren'Py Native Translation File (OpenTranslator Auto-Generated)
translate ${targetLang} strings:
    old "Start Game"
    new "Start Game"
`;
            try { fs.writeFileSync(tlStringsFile, nativeDict.trim(), 'utf8'); } catch (e) {}
          }

          // Helper function to purge stale .rpy/.rpyc files from target directory
          const cleanTlPt = (targetDir) => {
            if (!targetDir || !fs.existsSync(targetDir)) return;
            try {
              const entries = fs.readdirSync(targetDir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(targetDir, entry.name);
                if (entry.isDirectory()) {
                  try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) {}
                } else if (entry.isFile()) {
                  const lower = entry.name.toLowerCase();
                  if ((lower.endsWith(".rpy") && lower !== "font.rpy") || lower.endsWith(".rpyc")) {
                    try { fs.unlinkSync(fullPath); } catch (e) {}
                  }
                }
              }
            } catch (e) {}
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
                  try { fs.unlinkSync(fullPath); } catch (e) {}
                }
              }
            } catch (e) {}
          };

          // Limpeza inicial de bytecodes e scripts defeituosos no diretório de destino
          cleanTlPt(tlTargetDir);
          cleanRpyc(gameSubDir);

          // PASSO 2 & 3: Logs detalhados e desempacotamento de pacotes .rpa
          global.log("info", "[Pré-Patch] 🧹 Limpeza de bytecodes (.rpyc) e scripts legados executada.");
          global.log("info", "[Pré-Patch] 🔍 Procurando arquivos .rpa na pasta game...");

          const rpaFiles = fs.readdirSync(gameSubDir).filter(f => f.endsWith('.rpa'));
          const unpackScript = path.join(global.ROOT, "resources", "renpy", "unpack_renpy_all.py");

          if (rpaFiles.length > 0 && fs.existsSync(unpackScript)) {
            global.log("info", `[Pré-Patch] 📦 Encontrados ${rpaFiles.length} arquivos .rpa (${rpaFiles.join(', ')}). Descompactando scripts de jogo...`);
            try {
              const { execSync } = require('child_process');
              execSync(`python "${unpackScript}" -i "${gameSubDir}" -o "${gameSubDir}"`, { cwd: global.ROOT, stdio: 'ignore' });
              global.log("success", "[Pré-Patch] ✓ Descompactação e decompilação de pacotes .rpa concluída!");
            } catch (eUnpack) {
              global.log("warn", `[Pré-Patch] Aviso na descompactação de pacotes .rpa: ${eUnpack.message}`);
            }
          } else {
            global.log("info", "[Pré-Patch] Nenhum arquivo .rpa pendente de desempacotamento.");
          }

          global.log("info", "[Pré-Patch] ✨ Extrator nativo ativado para leitura completa dos scripts.");

          // Removida qualquer injeção de hooks legados/duplicados no Ren'Py
          ["z_opentranslator.rpy", "z_opentranslator.rpyc", "zz_opent_runtime.rpy", "zz_opent_runtime.rpyc", "000_opent_runtime.rpy", "000_opent_runtime.rpyc", "00_anti_crash.rpy", "00_anti_crash.rpyc", "000_anti_crash.rpy", "000_anti_crash.rpyc", "zz_anti_crash.rpy", "zz_anti_crash.rpyc"].forEach(f => {
            const p = path.join(gameSubDir, f);
            if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) {}
          });

          // Injeta Hook de Runtime Nativo do Ren'Py em 00_opent_runtime.rpy (Carregamento Prioritário Alfabetico)
          const runtimeHookFile = path.join(gameSubDir, "00_opent_runtime.rpy");
          const runtimeHookFileC = path.join(gameSubDir, "00_opent_runtime.rpyc");
          if (fs.existsSync(runtimeHookFileC)) try { fs.unlinkSync(runtimeHookFileC); } catch (e) {}
          const runtimeHookContent = `init -999999 python:
    def _opent_bootstrap_runtime():
        try:
            import renpy
            import types
            import sys

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

            # 3. Polyfill GL2 shader registration
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
                            clean = str(s).strip()
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
            if not text or not isinstance(text, basestring if 'basestring' in globals() else str):
                return text
            if is_system_preference_key(text):
                return text

            if text in opent_dict:
                return opent_dict[text]

            clean = text.strip()
            if clean in opent_dict:
                return opent_dict[clean]

            text_escaped = text.replace(chr(10), "\\n")
            if text_escaped in opent_dict:
                return opent_dict[text_escaped]

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
                    elif norm_key(p_clean) in norm_dict:
                        translated_paragraphs.append(norm_dict[norm_key(p_clean)])
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
              try { fs.unlinkSync(rpycFile); } catch (e) {}
            }
            fs.writeFileSync(runtimeHookFile, runtimeHookContent, 'utf8');
          } catch (e) {}

          // Injeta font.rpy limpo para o idioma de destino e força DejaVuSans.ttf universal para acentuação UTF-8 perfeita
          const fontRpyFile = path.join(tlTargetDir, "font.rpy");
          const fontRpyFileC = path.join(tlTargetDir, "font.rpyc");
          if (fs.existsSync(fontRpyFileC)) try { fs.unlinkSync(fontRpyFileC); } catch (e) {}
          const fontContent = `init 999 python:
    config.language = "${targetLang}"
    try:
        config.font = "DejaVuSans.ttf"
    except Exception:
        pass
`;
          try { fs.writeFileSync(fontRpyFile, fontContent, 'utf8'); } catch (e) {}

          // DISPARO AUTOMÁTICO DO OPEN_TRANSLATOR.PY COM LOGS EM TEMPO REAL PARA JOGOS REN'PY
          const openTranslatorPy = path.join(global.ROOT || process.cwd(), "open_translator.py");
          if (fs.existsSync(openTranslatorPy)) {
            global.log("info", `[OpenTranslator Engine] 🤖 Iniciando varredura e tradução dos scripts de '${gameSubDir}' para o idioma '${targetLang}'...`);
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
                  resolve(code);
                });

                pyProcess.on('error', (err) => {
                  global.log("error", `[OpenTranslator Engine] Erro no processo Python: ${err.message}`);
                  resolve(1);
                });
              });

              global.log("success", `[OpenTranslator Engine] ✓ Tradução e integração automatizada concluídas com sucesso!`);
            } catch (errPy) {
              global.log("warn", `[OpenTranslator Engine] Aviso ao executar a tradução automatizada: ${errPy.message}`);
            }
          }

          // Limpeza final de bytecodes .rpyc para forçar o Ren'Py a compilar os .rpy traduzidos no boot
          cleanRpyc(tlTargetDir);
          cleanRpyc(gameSubDir);
          cleanRpyc(path.join(gameSubDir, "cache"));

          global.log("success", "[Pré-Patch] ✨ Tradução Ren'Py finalizada com sucesso!");
        } catch (e) {
          global.log("warn", "Aviso ao aplicar auto-patch Ren'Py: " + e.message);
        }
      }
    }

    const hookDll = getHookDll(eng, exe);
    const injectExe = path.join(global.ROOT, "loaders", "inject.exe");
    let proc;

    if (eng === "python") {
      global.log("info", `🚀 Disparando o motor do Ren'Py de forma limpa e autônoma (PID principal)...`);
      try {
        let nulFd;
        try { nulFd = fs.openSync('NUL', 'w'); } catch (e) { nulFd = 'ignore'; }
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: ['ignore', nulFd, nulFd],
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
        global.log("error", "Falha ao iniciar jogo Ren'Py: " + e.message);
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
      } catch (e) {
        global.log("error", "Spawn exception: " + e.message);
        if (bakDir) {
          restoreGameData(bakDir);
          bakDir = "";
        }
        return { ok: false, error: "Spawn failed: " + e.message };
      }
    }
    const gp = proc.pid;
    const currentBak = bakDir;
    global.launchedProc = proc;
    global.launchedKey = key;
    global.launchedBak = currentBak;
    global.launchedGameExe = exe;
    global.launchedPid = gp;
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
      if (code === 0 || eng === "python") {
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
      global.log("info", "Game launched PID: " + gp);
      verifyAndDiagnoseGame(gameDir, exe, gp);
      return { pid: gp, key };
    } finally {
      global.isLaunchingGame = false;
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
    } catch (e) {}
    const globalCache = path.join(global.ROOT, "global_trans_cache.json");
    try {
      if (fs.existsSync(globalCache)) fs.unlinkSync(globalCache);
    } catch (e) {}
    global.log("success", "Deletado cache local e global.");
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
          error: "Nenhum backup encontrado. O jogo já está na versão original.",
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
        } catch (e) {}
      }

      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }

      global.log("success", "Restaurado dados originais com sucesso.");
      return { ok: true };
    } catch (e) {
      global.log("error", "Falha ao restaurar dados originais: " + e.message);
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
    global.log("info", "Enfileirando comando de cheat: " + JSON.stringify(params));
    if (global.activeCheatSocket && global.activeCheatSocket.readyState === 1) {
      try {
        global.activeCheatSocket.send(JSON.stringify(params));
      } catch (e) {}
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
        } catch (e) {}
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
      } catch (e) {}
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
      global.log("info", `Executando UberWolfCli.exe para extrair: ${gamePath}`);
      const proc = spawn(uberWolfExe, ["-o", "-u", "-x", gamePath], {
        timeout: 120000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          global.log("info", `UberWolfCli concluído. Saída: ${stdout}`);
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
        global.log("error", `Erro ao iniciar UberWolfCli: ${err.message}`);
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
    global.log("info", `📦 DESCOMPACTAÇÃO TOTAL REN'PY: "${title}"`);
    global.log("info", `📁 Origem: ${gameDir}`);
    global.log("info", `🎯 Destino: ${outDir}`);
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
          global.log("error", `Erro no processo de descompactação: ${err.message}`);
          resolve(1);
        });
      });

      global.log("success", `✨ Descompactação total concluída! Todos os arquivos salvos em: '${outDir}'`);
      return { ok: true, outDir };
    } catch (e) {
      global.log("error", `Falha na descompactação total: ${e.message}`);
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
      global.log("error", "Falha ao descompactar EVB: " + e.message);
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
        global.log("warn", "Erro ao ler cache local do jogo: " + e.message);
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
      global.log("success", `Exportação Excel concluída. Salvo em: ${exportFile}`);
      exec(`explorer /select,"${exportFile}"`);
      return { ok: true, path: exportFile };
    } catch (e) {
      global.log("error", "Falha ao gerar arquivo Excel: " + e.message);
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
      global.log("info", "Lendo traduções do arquivo Excel: " + excelPath);
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
        `Importação de Excel concluída com sucesso! ${count} traduções mescladas.`
      );
      return { ok: true, count: count };
    } catch (e) {
      global.log("error", "Falha ao importar arquivo Excel: " + e.message);
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
        } catch (e) {}
      }

      for (const t of targets) {
        if (t && fs.existsSync(t)) {
          try {
            fs.unlinkSync(t);
            deletedCount++;
          } catch (e) {}
        }
      }

      global.log("success", `[Cache] 🗑️ Cache de tradução deletado com sucesso para "${g.title || gameKey}" (${deletedCount} arquivos limpos)!`);
      return { ok: true, count: deletedCount };
    } catch (e) {
      global.log("error", "Falha ao deletar cache: " + e.message);
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
      global.log("success", `[Exportar Textos] 📄 Textos exportados com sucesso para: ${exportPath}`);
      return { ok: true, exportPath };
    } catch (e) {
      global.log("error", "Falha ao exportar textos: " + e.message);
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
      try { global.activeCheatSocket.send(JSON.stringify(cmd)); } catch (e) {}
    }
    global.pendingCheatCommands.push(cmd);
    global.log("success", `[Cheat] Injetado no jogo ao vivo: Variable #${id} = ${value}`);
    return { ok: true };
  },
  setGameSwitch({ id, value }) {
    const cmd = { comando: "set_switch", id: id, valor: Boolean(value) };
    if (global.activeCheatSocket && global.activeCheatSocket.readyState === 1) {
      try { global.activeCheatSocket.send(JSON.stringify(cmd)); } catch (e) {}
    }
    global.pendingCheatCommands.push(cmd);
    global.log("success", `[Cheat] Injetado no jogo ao vivo: Switch #${id} = ${value}`);
    return { ok: true };
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
        } catch (e) {}
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
              `[Verificação de Saúde] Processo ativo do jogo (${exeName}, PID ${childPids[0]}) detectado em execução.`
            );
            return;
          }
          global.log(
            "error",
            `[Erro de Boot] O processo do jogo (${exeName}) foi encerrado logo após a inicialização.`
          );
          const debugLogPath = path.join(gameDir, "debug.log");
          if (fs.existsSync(debugLogPath)) {
            try {
              const content = fs.readFileSync(debugLogPath, "utf8").trim();
              const lines = content.split("\n").filter((l) => l.trim().length > 0);
              const lastLines = lines.slice(-5).join("\n  -> ");
              global.log(
                "info",
                "Logs de erro do jogo (debug.log):\n  -> " + lastLines
              );
            } catch (e) {}
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
            `[Verificação de Saúde] O jogo (PID ${targetPid}) está ativo com JANELA VISÍVEL na tela (Handle: ${handleNum}).`
          );
        } else {
          global.log(
            "info",
            `[Verificação de Saúde] O jogo (PID ${targetPid}) está rodando ativamente no sistema.`
          );
        }
      });
    });
  }, 3500);
}
