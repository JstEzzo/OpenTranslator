const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

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
            const d = JSON.parse(fs.readFileSync(path.join(global.GL_DIR, k), "utf8"));
            games[k.replace(".gljson", "")] = d;
          } catch (e) {}
        });
    } catch (e) {}
    return { games, gameKeys: Object.keys(games) };
  },
  saveGame({ key, data }) {
    try {
      if (!fs.existsSync(global.GL_DIR)) fs.mkdirSync(global.GL_DIR, { recursive: true });
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
  detectEngine({ exePath, exeDir }) {
    return detectEngine(exePath, exeDir);
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

    global.isLaunchingGame = true;
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
        const searchName = exe ? path.basename(exe) : (title + ".exe");
        const found = await findGameOnDisk(searchName);
        if (found && found.length > 0) {
          exe = found[0].exePath;
          eng = found[0].engine || detectEngine(exe);
          g.constArgs = { ...g.constArgs, gameExe: exe, engine: eng };
          handlers.saveGame({ key, data: g });
          global.log("info", `Auto-resolvido executável do jogo "${title}": ${exe} (Engine: ${eng})`);
        }
      }

      if (!eng && exe && fs.existsSync(exe)) {
        eng = detectEngine(exe);
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

    // AUTO-PATCH NATIVO PARA REN'PY
    if (eng === "python") {
      const gameSubDir = path.join(gameDir, "game");
      if (fs.existsSync(gameSubDir)) {
        try {
          const rpyTemplate = path.join(global.ROOT, "templates", "z_opentranslator.rpy");
          const targetRpy = path.join(gameSubDir, "z_opentranslator.rpy");
          if (fs.existsSync(rpyTemplate)) {
            fs.copyFileSync(rpyTemplate, targetRpy);
            global.log("success", "✨ [REN'PY AUTO-PATCH] Script de tradução universal ativado em: game/z_opentranslator.rpy");
          }
        } catch (e) {
          global.log("warn", "Aviso ao aplicar auto-patch Ren'Py: " + e.message);
        }
      }
    }

    const hookDll = getHookDll(eng, exe);
    const injectExe = path.join(global.ROOT, "loaders", "inject.exe");
    let proc;

    if (eng === "python") {
      global.log("info", `🚀 Disparando o motor do Ren'Py de forma limpa (PID principal)...`);
      try {
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
          windowsHide: false,
        });

        if (hookDll) {
          const hookPath = path.join(global.ROOT, "loaders", hookDll);
          const mainPid = proc ? proc.pid : null;
          setTimeout(() => {
            const exeName = path.basename(exe, ".exe");
            const escapedDir = gameDir.replace(/'/g, "''");
            const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Select-Object -ExpandProperty Id"`;

            exec(psCmd, (err, stdout) => {
              const pidsToInject = [];
              if (mainPid) {
                try {
                  if (process.kill(mainPid, 0)) {
                    pidsToInject.push(mainPid);
                  }
                } catch (e) {}
              }
              if (!err && stdout) {
                const activePids = stdout
                  .trim()
                  .split("\n")
                  .map((p) => parseInt(p.trim(), 10))
                  .filter((p) => !isNaN(p) && p > 0);
                pidsToInject.push(...activePids);
              }

              const uniquePids = [...new Set(pidsToInject)];
              global.log(
                "info",
                `🔎 PIDs ativos identificados para o jogo: ${
                  uniquePids.join(", ") || "Nenhum"
                }`
              );

              uniquePids.forEach((pid) => {
                try {
                  global.log(
                    "info",
                    `🚀 Injetando gancho de tradução (${hookDll}) no PID ativo do Ren'Py: ${pid}`
                  );
                  const arch = getExeArch(exe);
                  const runtimeInjector =
                    arch === 64
                      ? path.join(global.ROOT, "loaders", "PIDDLLInject64.exe")
                      : path.join(global.ROOT, "loaders", "inject.exe");
                  spawn(runtimeInjector, [String(pid), hookPath], {
                    stdio: "ignore",
                    detached: true,
                    shell: false,
                    windowsHide: false,
                  });
                } catch (e) {
                  global.log(
                    "error",
                    `Falha ao injetar no PID ${pid}: ` + e.message
                  );
                }
              });
            });
          }, 2500);
        }
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
        global.log("error", `Erro ao empacotar com UberWolfCli: ${err.message}`);
        res({ ok: false, error: err.message });
      });
    });
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
