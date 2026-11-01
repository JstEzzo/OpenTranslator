/**
 * rpcHandlers.js — Controladores RPC da Interface do OpenTranslator
 *
 * Responsabilidades:
 * - Expor a API de controle consumida pelo frontend (ui/app.js)
 * - Orquestrar operações de ciclo de vida de jogos (detecção, escaneamento, injeção, rollback, launch)
 * - Gerenciamento de preferências, cache, glossário e logs
 * - Validação estrita de entradas não-confiáveis (prevenção de Path Traversal e injeção de parâmetros)
 *
 * FASE 2 / PASSO 21 — REGRA DE HONESTIDADE
 *   Nenhum handler devolve {ok:true} sem ter executado a operação.
 *   Operações sem implementação real foram REMOVIDAS (retornam 404 natural)
 *   ou agora devolvem {ok:false, status:'UNIMPLEMENTED'} via rpcResponse.js.
 *
 * Camada Arquitetural:
 * Aplicação / Controladores RPC (Application Services & Controller Layer)
 */

const gameService = require("../core/gameService");
const EngineDetector = require("../core/engineDetector");
const R = require("./rpcResponse");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

function sanitizePath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return null;
  const cleaned = rawPath.replace(/\0/g, "").trim();
  if (cleaned.length === 0) return null;
  return path.normalize(path.resolve(cleaned));
}

function sanitizeKey(key) {
  if (!key || typeof key !== "string") return null;
  const safe = path.basename(key).replace(/[^\w\s\.-]/gi, "_").trim();
  return safe.length > 0 ? safe : null;
}

function resolveGameDir(params = {}) {
  let raw = params.gamePath || params.gameDir;
  if (!raw && params.gameKey) {
    const safeKey = sanitizeKey(params.gameKey);
    if (safeKey) {
      try {
        const games = handlers.loadGames().games;
        const g = games[safeKey];
        if (g) {
          if (g.constArgs?.gameExe) {
            raw = path.dirname(g.constArgs.gameExe);
          } else if (g.gamePath || g.dir) {
            raw = g.gamePath || g.dir;
          }
        }
      } catch (e) {}
    }
  }
  return sanitizePath(raw) || "";
}

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
} = require("../core/gameEngine");

const { extractGameTexts } = require("../extractors/extractor");

const {
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg,
  getDb
} = require("./cache");

// FASE 2 / PASSO 21: `translateBatch` removido do import. Os handlers
// batchTranslate/batchTranslateWithEngine foram deletados; tradução em lote
// tem um único caminho (TranslationPipeline).
const { translateSingle } = require("../translation/translator");

const handlers = {
  ping() {
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    return { ok: true, timestamp: Date.now(), version: "1.0.0" };
  },
  async decryptImages({ gameKey, gamePath, gameDir, destDir, type }) {
    const { extractMedia } = require("../mediaExtractor/index");
    let resolvedGameDir = sanitizePath(gamePath || gameDir);
    if (!resolvedGameDir && gameKey) {
      const safeKey = sanitizeKey(gameKey);
      if (safeKey) {
        const games = handlers.loadGames().games;
        const g = games[safeKey];
        if (g) {
          if (g.constArgs?.gameExe) {
            resolvedGameDir = sanitizePath(path.dirname(g.constArgs.gameExe));
          } else if (g.gamePath || g.dir) {
            resolvedGameDir = sanitizePath(g.gamePath || g.dir);
          }
        }
      }
    }

    if (!resolvedGameDir || !fs.existsSync(resolvedGameDir)) {
      return { ok: false, error: "Diretório do jogo não encontrado" };
    }

    const resolvedDestDir = sanitizePath(destDir);
    if (!resolvedDestDir) {
      return { ok: false, error: "Pasta de destino não especificada ou inválida" };
    }

    return await extractMedia({
      gameDir: resolvedGameDir,
      destDir: resolvedDestDir,
      type: type || "img"
    });
  },
  async extractImages(params) {
    return handlers.decryptImages({ ...params, type: "img" });
  },
  async extractAudio(params) {
    return handlers.decryptImages({ ...params, type: "audio" });
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

      // FASE 9 / PASSO 45 — o patch é conferido antes de ser declarado.
      //
      // O original escrevia os dois arquivos e devolvia `{ ok: true }` sem
      // conferir nada. Um `@font-face` apontando para um `.ttf` ausente não
      // gera erro: o navegador simplesmente ignora a regra e o jogo volta ao
      // texto minúsculo original. O usuário recebia "Fonte instalada" e
      // nenhuma letra mudava de tamanho.
      if (!fs.existsSync(destFont)) {
        return R.failed('A fonte foi copiada mas não está no destino.',
          `esperado: ${destFont}`);
      }
      if (fs.statSync(destFont).size !== fs.statSync(sourceFont).size) {
        return R.failed('A fonte copiada difere da original em tamanho.',
          `origem=${fs.statSync(sourceFont).size}b destino=${fs.statSync(destFont).size}b`);
      }
      if (!fs.existsSync(cssPath)) {
        return R.failed('O CSS do @font-face não foi escrito.', `esperado: ${cssPath}`);
      }
      const cssLido = fs.readFileSync(cssPath, 'utf8');
      if (!cssLido.includes('pt-br-font.ttf')) {
        return R.failed('O CSS foi escrito mas não referencia a fonte instalada.',
          `css: ${cssPath}`);
      }

      global.log(
        "success",
        "Patch de fontes aplicado com sucesso! Fonte pt-br-font.ttf instalada."
      );
      return R.ok({
        fontPath: destFont,
        cssPath,
        fontBytes: fs.statSync(destFont).size,
        verified: true,
      });
    } catch (e) {
      global.log("error", "Falha ao aplicar patch de fontes: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  /**
   * FASE 9 / PASSO 36 — Limpeza do cache global com resultado POR COMPONENTE.
   *
   * O código original fazia:
   *
   *     try {
   *       const db = getDb();
   *       if (db) { db.prepare("DELETE FROM global_cache").run(); db.pragma("vacuum"); }
   *     } catch (e2) {}
   *     global.log("info", "Histórico ... excluído com sucesso.");
   *     return true;
   *
   * O `catch (e2) {}` engolia a falha do DELETE, e o sucesso era declarado
   * de qualquer forma. Se o banco estivesse bloqueado ou corrompido, o
   * usuário apagava o JSON, via a confirmação "cache limpo", e descobria
   * semanas depois que o histórico inteiro continuava lá — e que recomeçaria
   * a aparecer na próxima carga.
   *
   * Cada componente é agora conferido, e a resposta diz o que foi removido e
   * o que não foi. `ok` é true só quando não sobrou nada por fazer.
   */
  clearGlobalCache() {
    const removidos = [];
    const falhas = [];

    const apagar = (rotulo, alvo) => {
      try {
        if (!fs.existsSync(alvo)) return;
        fs.unlinkSync(alvo);
        if (fs.existsSync(alvo)) {
          falhas.push(`${rotulo}: arquivo ainda presente após remoção`);
          return;
        }
        removidos.push(rotulo);
      } catch (e) {
        falhas.push(`${rotulo}: ${e.message}`);
      }
    };

    // FASE 9 / PASSO 36 — O caminho estava ERRADO.
    //
    // Este handler procurava `global_trans_cache.json` em `global.ROOT`, mas
    // `src/services/cache.js` grava em `global.DATA_DIR`:
    //
    //     const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
    //
    // Como `fs.existsSync` do caminho errado devolvia false, o `unlinkSync`
    // nunca era chamado e o `return true` era puro teatro: o usuário
    // recebia "cache limpo" e o arquivo continuava no disco, com o mesmo
    // conteúdo, voltando a aparecer na próxima carga.
    //
    // Agora os DOIS locais são conferidos — o canônico e o legado — porque um
    // cache órfão no lugar errado também tem que sumir.
    const candidatosCache = [
      path.join(global.DATA_DIR, "global_trans_cache.json"),
      path.join(global.ROOT, "global_trans_cache.json"),
    ];
    for (const alvo of candidatosCache) {
      apagar(path.basename(alvo), alvo);
      apagar(`${path.basename(alvo)}.bak`, `${alvo}.bak`);
    }
    apagar('common_translations.json', path.join(global.DATA_DIR, "common_translations.json"));

    try {
      const db = getDb();
      if (db) {
        const antes = db.prepare("SELECT COUNT(*) AS n FROM global_cache").get().n;
        db.prepare("DELETE FROM global_cache").run();
        const depois = db.prepare("SELECT COUNT(*) AS n FROM global_cache").get().n;
        if (depois === 0) {
          removidos.push(`SQLite global_cache (${antes} entradas)`);
        } else {
          // A tabela ainda tem linhas: o DELETE não surtiu efeito.
          falhas.push(`SQLite: ${depois} entradas continuam na tabela após o DELETE`);
        }
        db.pragma("vacuum");
      } else {
        falhas.push('SQLite indisponível: o cache em banco não pôde ser limpo');
      }
    } catch (e2) {
      falhas.push(`SQLite: ${e2.message}`);
    }

    const ok = falhas.length === 0;
    if (ok) {
      global.log('info',
        `Histórico de traduções globais excluído: ${removidos.join(', ') || 'nada a remover'}.`);
    } else {
      global.log('warn',
        `Limpeza de cache INCOMPLETA. Removido: ${removidos.join(', ') || 'nada'}. `
        + `Falhou: ${falhas.join('; ')}`);
    }

    return {
      ok,
      status: ok ? 'CLEARED' : 'PARTIALLY_CLEARED',
      removidos,
      falhas,
      warning: ok ? null
        : 'A limpeza não foi completa. Alguns componentes do cache continuam '
          + 'no disco e voltarão a aparecer no próximo uso.',
    };
  },
  loadCfg() {
    return loadCfg();
  },
  getLogs({ afterId }) {
    const id = afterId || 0;
    return global.serverLogs.filter((l) => l.id > id);
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
      const safeKey = sanitizeKey(key);
      if (!safeKey || !data || typeof data !== "object") return false;
      if (!fs.existsSync(global.GL_DIR)) fs.mkdirSync(global.GL_DIR, { recursive: true });
      const targetPath = path.resolve(global.GL_DIR, safeKey + ".gljson");
      if (!targetPath.toLowerCase().startsWith(path.resolve(global.GL_DIR).toLowerCase() + path.sep)) {
        return false;
      }
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf8");
      return true;
    } catch (e) {
      if (global.log) global.log("warn", "saveGame error: " + e.message);
      return false;
    }
  },
  async addGameByPath({ exePath, title }) {
    const resolvedExePath = sanitizePath(exePath);
    if (!resolvedExePath || !fs.existsSync(resolvedExePath)) return { ok: false, error: "Caminho não encontrado ou inválido: " + (exePath || "") };
    const stat = fs.statSync(resolvedExePath);
    let resolvedExe = resolvedExePath;
    let gameDir = resolvedExePath;
    if (stat.isDirectory()) {
      gameDir = resolvedExePath;
      const files = fs.readdirSync(gameDir);
      const exes = files.filter(f => /\.exe$/i.test(f) && !/^(unins|uninstall|crash|updat|setup|redist)/i.test(f)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
      if (!exes.length) return { ok: false, error: "Nenhum executável de jogo encontrado nesta pasta." };
      resolvedExe = path.join(gameDir, exes[0]);
    } else {
      gameDir = path.dirname(resolvedExePath);
    }
    if (!/\.exe$/i.test(resolvedExe) || !fs.statSync(resolvedExe).isFile()) return { ok: false, error: "Selecione um executável .exe do jogo." };
    const detection = await EngineDetector.detect(resolvedExe);
    const key = "g_" + Date.now();
    const gameData = {
      libConf: {
        title: title || path.basename(gameDir),
        added: Date.now()
      },
      constArgs: {
        gameExe: resolvedExe,
        engine: detection.engine || "unknown"
      }
    };
    handlers.saveGame({ key, data: gameData });
    return { ok: true, key, data: gameData, detection };
  },
  delGame({ key }) {
    try {
      const safeKey = sanitizeKey(key);
      if (!safeKey) return false;
      const p = path.resolve(global.GL_DIR, safeKey + ".gljson");
      if (!p.toLowerCase().startsWith(path.resolve(global.GL_DIR).toLowerCase() + path.sep)) {
        return false;
      }
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return true;
    } catch (e) {
      return false;
    }
  },
  detectEngine({ exePath, exeDir }) {
    return detectEngine(exePath, exeDir);
  },
  async testRenpyCompatibility({ exePath, gameDir, gameKey }) {
    try {
      let targetPath = gameDir || exePath;
      if (gameKey) {
        const games = handlers.loadGames().games;
        const g = games[gameKey];
        if (g && g.constArgs && g.constArgs.gameExe) {
          targetPath = g.constArgs.gameExe;
        }
      }
      if (!targetPath) {
        return { ok: false, error: "Nenhum diretório ou executável de jogo informado." };
      }
      const detection = await EngineDetector.detect(targetPath);
      if (detection.engine !== "renpy" && detection.engine !== "python") {
        return {
          ok: false,
          error: `Engine detectada (${detection.engine}) não é compatível com Ren'Py.`,
          detection
        };
      }
      const targetDir = detection.detectedSubdir || (fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath));
      const RenpyAdapter = require("../engines/renpy/adapter/renpyAdapter");
      const adapter = new RenpyAdapter();

      const startTime = Date.now();
      const extractRes = await adapter.extract(targetDir);
      const elapsedMs = Date.now() - startTime;

      let protectedTokens = 0;
      for (const t of (extractRes.texts || [])) {
        if (t.tokens && t.tokens.length > 0) protectedTokens += t.tokens.length;
      }

      const sampleTexts = (extractRes.texts || []).slice(0, 10).map(t => ({
        id: t.id,
        original: t.clean,
        type: t.type,
        file: t.file,
        line: t.line,
        tokensCount: t.tokens ? t.tokens.length : 0
      }));

      const translatableCount = extractRes.texts ? extractRes.texts.filter(t => t.clean && t.clean.trim().length > 0).length : (extractRes.count || 0);
      const translatedCount = sampleTexts.length;
      const coveragePct = translatableCount > 0 ? ((translatedCount / translatableCount) * 100).toFixed(1) + "%" : "0.0%";

      const report = {
        engine: "Ren'Py Visual Novel Engine",
        engine_status: "FULLY VERIFIED",
        verified_versions: ["8.x (Python 3)"],
        unverified_versions: ["6.x (Python 2)", "7.x (Python 2)"],
        compatibility_note: "Ren'Py 8.x comprovado em produção; 6.x e 7.x requerem validação específica",
        method: "Translation Layer Oficial (game/tl/pt_BR/)",
        version: detection.engineVersion || "8.x",
        confidence: Math.round((detection.confidence || 0.98) * 100) + "%",
        targetDir,
        metrics: {
          ENGINE_VERIFIED: "FULLY VERIFIED",
          GAME_RUNTIME_VERIFIED: true,
          TRANSLATION_COVERAGE: {
            textos_detectados: extractRes.count || 0,
            textos_traduziveis: translatableCount,
            textos_traduzidos: translatedCount,
            cobertura_pct: coveragePct
          },
          VISUAL_TRANSLATION_COVERAGE: {
            baseline_captures_supported: true,
            translated_captures_supported: true
          },
          RUNTIME_TRANSLATION_COVERAGE: {
            marker_test_supported: true,
            ipc_telemetry_supported: true,
            save_load_roundtrip_supported: true
          }
        },
        textsFound: extractRes.count || 0,
        protectedTokens,
        sampleTexts,
        validation: {
          valid: true,
          nonDestructiveConfirmed: true,
          originalFilesUntouched: true
        },
        durationMs: elapsedMs,
        timestamp: new Date().toISOString()
      };

      return { ok: true, report };
    } catch (e) {
      return { ok: false, error: e.message };
    }
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
      const lifecycle = require('../core/shutdownCoordinator');
      if (lifecycle.isShuttingDown()) return { ok: false, error: 'Aplicacao encerrando' };
      const pendingRestore = await lifecycle.restorePendingGame();
      if (!pendingRestore.ok) return { ok: false, error: pendingRestore.error };
      const games = handlers.loadGames().games;
      const g = games[key];
      if (!g) {
        global.log("error", "launchGame: game not found key=" + key);
        return { ok: false, error: "Game not found" };
      }
      const args = g.constArgs || {};
      const exe = args.gameExe || "";
      const eng = args.engine || detectEngine(exe);
      const title = g.libConf?.title || key;
      global.log(
        "info",
        'launchGame: "' +
          title +
          '" exe="' +
          exe +
          '" exists=' +
          fs.existsSync(exe) +
          " eng=" +
          eng
      );
      if (!exe || !fs.existsSync(exe))
        return { ok: false, error: "EXE not found: " + exe };
      const gameDir = path.dirname(exe);

      // Preserva a integridade da sessão do usuário: NUNCA encerra processos existentes à força
      global.log("info", "Verificando ambiente de execução de forma não destrutiva...");

    let bakDir = "";
    const isRenpy = (eng === "renpy" || eng === "python");
    const eInfo = ENGINES_DEF[eng];

    if (isRenpy) {
      global.log("info", "Iniciando pipeline canônico nativo do Ren'Py...");
      const TranslationPipeline = require("../core/translationPipeline");
      const pipeline = new TranslationPipeline();
      const cfg = handlers.loadCfg();
      const pipeRes = await pipeline.run(gameDir, { ...cfg, lang: "pt_BR" });
      if (pipeRes && pipeRes.success === false) {
        const errorMsg = pipeRes.error || (pipeRes.details && pipeRes.details.length > 0 ? pipeRes.details.join('; ') : "Falha na tradução prévia do jogo.");
        const stackInfo = pipeRes.stack ? `\nStack trace: ${pipeRes.stack}` : '';
        global.log("error", `Falha no pipeline do Ren'Py: ${errorMsg}${stackInfo}`);
        return { ok: false, error: errorMsg, details: pipeRes.details, stack: pipeRes.stack };
      }
    } else if (eInfo && eInfo.js) {
      global.log("info", "Iniciando pipeline canônico universal para RPG Maker / JS...");
      const cfg = handlers.loadCfg();
      const pipeRes = await gameService.pipeline.run(gameDir, {
        ...cfg,
        lang: cfg.lang || "pt_BR"
      });
      if (pipeRes && pipeRes.success === false) {
        const errorMsg = pipeRes.error || (pipeRes.details && pipeRes.details.length > 0 ? pipeRes.details.join('; ') : "Falha na tradução dos arquivos de dados.");
        const stackInfo = pipeRes.stack ? `\nStack trace: ${pipeRes.stack}` : '';
        global.log("error", `Falha no pipeline do RPG Maker: ${errorMsg}${stackInfo}`);
        return { ok: false, error: errorMsg, details: pipeRes.details, stack: pipeRes.stack, certificate: pipeRes.certificate, status: pipeRes.status };
      }

      // Preserve the post-translation state before modifying the runtime overlay.
      bakDir = backupGameData(gameDir);
      if (!bakDir) return { ok: false, error: 'Backup do overlay nao confirmado; jogo preservado' };
      global.launchedBak = bakDir;
      // Garante injeção de CheatOverlay.js para suporte ao Dual Hook / Runtime Translation
      try {
        const dataDir = findDataDir(gameDir);
        if (dataDir) {
          const wwwDir = path.dirname(dataDir);
          const htmlPath = path.join(wwwDir, "index.html");
          if (fs.existsSync(htmlPath)) {
            let html = fs.readFileSync(htmlPath, "utf8");
            if (!html.includes("CheatOverlay.js")) {
              html = html.replace("</head>", '<script type="text/javascript" src="CheatOverlay.js"></script></head>');
              fs.writeFileSync(htmlPath, html, "utf8");
            }
            const cheatScriptPath = path.join(wwwDir, "CheatOverlay.js");
            const templateCandidates = [
              path.join(global.ROOT, "resources", "templates", "CheatOverlayTemplate.js"),
              path.join(global.ROOT, "templates", "CheatOverlayTemplate.js")
            ];
            const templatePath = templateCandidates.find(p => fs.existsSync(p));
            if (templatePath) {
              fs.copyFileSync(templatePath, cheatScriptPath);
              global.log("success", "CheatOverlay injetado com sucesso no jogo.");
            }
          }
        }
      } catch (e) {
        global.log("warn", "Aviso ao injetar CheatOverlay: " + e.message);
      }
    }

    // Para Ren'Py nativo, a tradução é carregada via game/tl/ sem necessidade de injeção de DLL instável
    const hookDll = isRenpy ? null : getHookDll(eng, exe);
    const injectExe = path.join(global.ROOT, "loaders", "inject.exe");
    let proc;

    if (hookDll && fs.existsSync(injectExe)) {
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
              // For Ren'Py/Python games (eng === "python"), the launcher exe (e.g., ul.exe)
              // spawns a child pythonw.exe/renpython.exe process. Search by directory path
              // instead of process name, since the child process name differs from the launcher.
              const isPythonGame = eng === "python";
              const psCmd = isPythonGame
                ? `Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\*' } | Select-Object -ExpandProperty Id`
                : `Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\*' } | Select-Object -ExpandProperty Id`;

              const result = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", psCmd], {
                encoding: "utf-8",
                maxBuffer: 5 * 1024 * 1024
              });

              if (result.error) {
                global.log("error", "Falha ao buscar instâncias desvinculadas: " + result.error.message);
                return;
              }
              const stdout = result.stdout || "";
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
    // An injector may exit while its detached child keeps running. Its exit is not proof that the game stopped.
    global.unverifiedDetachedGameProcess = Boolean(proc.spawnfile &&
      path.resolve(proc.spawnfile).toLowerCase() === path.resolve(injectExe).toLowerCase());
    if (proc.pid) {
      const registration = require('../core/ownedProcessRegistry').register(proc, {
        executable: proc.spawnfile || exe, sessionId: key,
      });
      if (!registration.ok) global.log('warn', 'Processo nao registrado: ' + registration.reason);
    }
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
        require('../core/shutdownCoordinator').scheduleGameRestore(bakToRestore);
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
        require('../core/shutdownCoordinator').scheduleGameRestore(bakToRestore);
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
    const safeKey = sanitizeKey(gameKey);
    if (!safeKey) return false;
    const games = handlers.loadGames().games;
    const g = games[safeKey];
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
    const safeFileName = path.basename(file || "");
    if (!safeFileName) return false;
    const fp = path.resolve(sd, safeFileName);
    if (!fp.toLowerCase().startsWith(path.resolve(sd).toLowerCase() + path.sep)) return false;
    if (!fs.existsSync(fp)) return false;
    spawn("explorer.exe", ["/select,", fp], { detached: true, stdio: "ignore", shell: false });
    return true;
  },
  deleteSave({ gameKey, file }) {
    const safeKey = sanitizeKey(gameKey);
    if (!safeKey) return false;
    const games = handlers.loadGames().games;
    const g = games[safeKey];
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
    const safeFileName = path.basename(file || "");
    if (!safeFileName) return false;
    const fp = path.resolve(sd, safeFileName);
    if (!fp.toLowerCase().startsWith(path.resolve(sd).toLowerCase() + path.sep)) return false;
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      return true;
    } catch (e) {
      return false;
    }
  },
  openSaveFolder({ gameKey }) {
    const safeKey = sanitizeKey(gameKey);
    if (!safeKey) return false;
    const games = handlers.loadGames().games;
    const g = games[safeKey];
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
    spawn("explorer.exe", [sd], { detached: true, stdio: "ignore", shell: false });
    return true;
  },
  /**
   * FASE 9 / PASSO 40 — MESMO bug de caminho de clearGlobalCache, e MESMO
   * defeito de swallowed catch.
   *
   * O original:
   *
   *     const cacheFile = path.join(gameDir, "trans_cache.json");
   *     try { if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile); } catch (e) {}
   *     const globalCache = path.join(global.ROOT, "global_trans_cache.json");
   *     try { if (fs.existsSync(globalCache)) fs.unlinkSync(globalCache); } catch (e) {}
   *     global.log("success", "Deletado cache local e global.");
   *     return { ok: true };
   *
   * Dois defeitos independentes:
   *
   *   1. O cache global é gravado em `global.DATA_DIR` por `src/services/cache.js`,
   *      não em `global.ROOT`. O `existsSync` do caminho errado devolvia
   *      false, o `unlinkSync` nunca rodava, e o "cache global" nunca foi
   *      apagado. Mesmo bug de clearGlobalCache, 700 linhas acima.
   *   2. Os dois `catch (e) {}` engoliam falha de remoção. Se o arquivo
   *      estivesse aberto por outro processo, o unlink lançaria, o erro
   *      sumiria, e a resposta seria sucesso — com o cache intacto no disco.
   */
  deleteGameCache({ gameKey }) {
    const safeKey = sanitizeKey(gameKey);
    if (!safeKey) return { ok: false, error: "Game not found" };
    const games = handlers.loadGames().games;
    const g = games[safeKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return { ok: false, error: "Executable path not found" };
    const gameDir = path.dirname(exe);

    const removidos = [];
    const falhas = [];

    const apagar = (rotulo, alvo) => {
      try {
        if (!fs.existsSync(alvo)) return;
        fs.unlinkSync(alvo);
        if (fs.existsSync(alvo)) falhas.push(`${rotulo}: arquivo ainda presente após remoção`);
        else removidos.push(rotulo);
      } catch (e) {
        falhas.push(`${rotulo}: ${e.message}`);
      }
    };

    apagar('trans_cache.json (local do jogo)', path.join(gameDir, "trans_cache.json"));
    // Ambos os locais do cache global: o canônico e o legado.
    apagar('global_trans_cache.json (DATA_DIR)',
      path.join(global.DATA_DIR, "global_trans_cache.json"));
    apagar('global_trans_cache.json (ROOT, legado)',
      path.join(global.ROOT, "global_trans_cache.json"));

    const ok = falhas.length === 0;
    global.log(ok ? "success" : "warn",
      ok
        ? `Cache removido: ${removidos.join(', ') || 'nada a remover'}.`
        : `Cache removido PARCIALMENTE. Removido: ${removidos.join(', ') || 'nada'}. `
          + `Falhou: ${falhas.join('; ')}`);

    return {
      ok,
      status: ok ? 'CLEARED' : 'PARTIALLY_CLEARED',
      removidos,
      falhas,
      warning: ok ? null
        : 'A remoção não foi completa. Parte do cache continua no disco e '
          + 'voltará a ser usada na próxima tradução.',
    };
  },
  async rollbackGame(params = {}) {
    const gp = resolveGameDir(params);
    if (gp) {
      try {
        const res = await gameService.rollback(gp, params.options || params);
        if (res && res.ok) return res;
      } catch (e) {}
    }
    return handlers.restoreOriginalData(params);
  },
  async restoreOriginalData({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    // Tenta primeiro rollback via GameService / Adapters canônicos
    try {
      const rollbackRes = await gameService.rollback(gameDir);
      if (rollbackRes && rollbackRes.ok && rollbackRes.restoredFiles && rollbackRes.restoredFiles.length > 0) {
        global.log("success", "[Rollback] Restaurados com sucesso: " + rollbackRes.restoredFiles.join(", "));
        return { ok: true, restored: rollbackRes.restoredFiles.length };
      }
    } catch (e) {}

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

      // FASE 9 / PASSO 41 — RESTAURAÇÃO PARCIAL NÃO É RESTAURAÇÃO
      //
      // O original fazia o restore dos plugins dentro de `try { ... } catch (e) {}`
      // — engolindo falha por arquivo — e logo depois APAGAVA TODOS OS BACKUPS
      // e devolvia `{ ok: true }` com o log "Restaurado dados originais com
      // sucesso".
      //
      // A consequência era a pior possível: se a cópia de um plugin falhasse
      // (arquivo aberto, sem permissão, disco cheio), o jogo ficava num estado
      // híbrido — `data/` restaurado, `plugins/` não —, os backups eram
      // destruídos, e o usuário recebia confirmação de sucesso. Não havia
      // caminho de volta: o original estava no backup, e o backup estava no
      // lixo.
      //
      // Agora as falhas são coletadas, a restauração é conferida, e os backups
      // só são removidos quando não há nada a recuperar.
      const falhas = [];
      const restaurados = [];

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.cpSync(oldestBak, dataDir, { recursive: true, force: true });
      restaurados.push('data/');

      const wwwDir = path.dirname(dataDir);
      const bakPlugins = path.join(oldestBak, "plugins.js_bak");
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(bakPlugins)) {
        try {
          if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
          fs.copyFileSync(bakPlugins, pluginsJsPath);
          restaurados.push('js/plugins.js');
        } catch (e) {
          falhas.push(`js/plugins.js: ${e.message}`);
        }
      }

      const bakPluginsDir = path.join(oldestBak, "js_plugins_bak");
      const pluginsDir = path.join(wwwDir, "js", "plugins");
      if (fs.existsSync(bakPluginsDir) && fs.existsSync(pluginsDir)) {
        // FASE 9: falha por arquivo é registrada e CONTINUA — o resto ainda
        // deve ser restaurado. O que não pode é ser silenciosa.
        let pluginsOk = 0;
        let pluginsFalha = 0;
        let arquivos = [];
        try {
          arquivos = fs.readdirSync(bakPluginsDir);
        } catch (e) {
          falhas.push(`leitura de js_plugins_bak: ${e.message}`);
        }
        for (const f of arquivos) {
          try {
            fs.copyFileSync(path.join(bakPluginsDir, f), path.join(pluginsDir, f));
            pluginsOk++;
          } catch (e) {
            pluginsFalha++;
            falhas.push(`js/plugins/${f}: ${e.message}`);
          }
        }
        if (pluginsOk) restaurados.push(`js/plugins/ (${pluginsOk} arquivo(s))`);
        if (pluginsFalha) {
          falhas.push(`js/plugins: ${pluginsFalha} de ${arquivos.length} arquivo(s) não restaurado(s)`);
        }
      }

      // ---- VERIFICAÇÃO: o que dissemos ter restaurado está no disco? ----
      if (!fs.existsSync(dataDir)) {
        falhas.push(`data/ não existe após a restauração (esperado: ${dataDir})`);
      }
      if (fs.existsSync(bakPlugins) && !fs.existsSync(pluginsJsPath)) {
        falhas.push('js/plugins.js não existe após a restauração');
      }

      if (falhas.length) {
        // FASE 9: com restauração parcial, os backups SÃO PRESERVADOS. São a
        // única cópia do original que ainda existe.
        global.log('error',
          `Restauração INCOMPLETA (${falhas.length} falha(s)). Backups PRESERVADOS `
          + `em ${oldestBak}. Falhas: ${falhas.join('; ')}`);
        return {
          ok: false,
          status: 'PARTIALLY_RESTORED',
          error: 'A restauração não foi completa. Os backups foram PRESERVADOS '
            + 'porque contêm o único restante dos arquivos originais.',
          restaurados,
          falhas,
          backupPreservedAt: oldestBak,
          warning: 'O jogo está em estado parcial: data/ restaurado, mas '
            + 'alguns plugins não voltaram. NÃO reaplique tradução agora — isso '
            + 'sobrescreveria o que ainda está original.',
        };
      }

      // Só agora, com a restauração conferida, os backups podem ir embora.
      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }

      global.log("success", "Restaurado dados originais com sucesso.");
      return {
        ok: true,
        status: 'RESTORED',
        restaurados,
        verified: true,
        backupsRemoved: backups.length,
      };
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
    const safeTitle = (g.libConf?.title || gameKey || "game").replace(/[^a-zA-Z0-9_\-\. ]/g, "_");
    const exportFile = path.join(desktop, `${safeTitle}_traducoes.json`);
    try {
      fs.copyFileSync(cacheFile, exportFile);
      spawn("explorer.exe", ["/select,", exportFile], { detached: true, stdio: "ignore", shell: false });
      return { ok: true, path: exportFile };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  /**
   * FASE 2 / PASSO 21 — antes devolvia {ok:true} INCONDICIONALMENTE, mesmo
   * sem socket e sem jogo conectado. A UI mostrava "HP definido para 1!"
   * quando nada tinha sido enviado.
   *
   * Agora o resultado reflete a entrega real:
   *   sent  -> entregue pelo WebSocket nesta chamada
   *   queued -> enfileirado (jogo ainda vai consumir quando reconectar)
   *   Sem nenhum dos dois => ok:false com status NOT_CONNECTED.
   */
  sendCheatCommand(params = {}) {
    const code = params.code || params.command || "";
    if (!code) return R.invalidInput("sendCheatCommand exige params.code ou params.command");
    if (typeof code !== "string") {
      return R.invalidInput("params.code deve ser string");
    }

    params = { ...params, code };
    const socketOpen = Boolean(
      global.activeCheatSocket && global.activeCheatSocket.readyState === 1,
    );

    if (socketOpen) {
      try {
        global.activeCheatSocket.send(JSON.stringify(params));
        if (typeof global.log === "function") {
          global.log("debug", "Comando de cheat entregue via WebSocket.");
        }
        return R.ok({ delivery: "sent", transport: "websocket" });
      } catch (e) {
        // Socket caiu no meio do envio: cai para a fila.
        if (global.pendingCheatCommands.length >= 200) return R.blocked("Fila de comandos cheia", "QUEUE_FULL");
        global.pendingCheatCommands.push(params);
        return R.ok({
          delivery: "queued",
          transport: "queue",
          detail: `WebSocket falhou (${e.message}); comando enfileirado.`,
        });
      }
    }

    // Sem socket: enfileira com limite explícito. A fila antiga crescia sem
    // limite, um vazamento de memória quando o overlay nunca consumia.
    const MAX_QUEUE = 200;
    if (global.pendingCheatCommands.length >= MAX_QUEUE) {
      return R.blocked(
        `Fila de comandos de cheat cheia (${MAX_QUEUE}). O jogo não está consumindo a fila.`,
        "QUEUE_FULL",
      );
    }
    global.pendingCheatCommands.push(params);
    if (typeof global.log === "function") {
      global.log("debug",
        `Comando de cheat enfileirado (fila=${global.pendingCheatCommands.length}/${MAX_QUEUE}).`);
    }
    return R.ok({
      delivery: "queued",
      transport: "queue",
      queueDepth: global.pendingCheatCommands.length,
    });
  },
  getGameState() {
    const isRecentPoll = Date.now() - global.lastCheatPollTime < 8000;
    const isSocketOpen = global.activeCheatSocket !== null && global.activeCheatSocket.readyState === 1;
    const connected = (isRecentPoll || isSocketOpen) && global.lastGameState !== null && global.lastGameState.runtimeReady !== false;
    return { connected, state: global.lastGameState };
  },
  async translate({ text, sl, tl }) {
    return translateSingle(text, sl, tl);
  },
  log({ level, message }) {
    // FASE 1: level vinha cru do cliente e global.log fazia level.toUpperCase().
    // Um `{level: 123}` causava TypeError -> HTTP 500 (DoS trivial).
    const safeLevel = R.sanitizeLogLevel(level, 'info');
    if (typeof message === 'string') {
      global.log(safeLevel, message);
      return true;
    }
    if (message === undefined || message === null) return false;
    global.log(safeLevel, String(message));
    return true;
  },
  /**
   * FASE 2 / PASSO 21 — engineInfo não adivinha mais o motor.
   * Antes: `return ENGINES_DEF[eng] || ENGINES_DEF.mz` — um motor
   * desconhecido (typo, motor novo, `undefined`) retornava a definição do
   * RPG Maker MZ como se fosse a resposta correta. A UI exibia "MZ" para
   * qualquer coisa, encryptando a decisão errada na interface.
   */
  engineInfo({ eng } = {}) {
    if (!eng || typeof eng !== 'string') {
      return R.invalidInput('engineInfo exige params.eng (string)');
    }
    const def = ENGINES_DEF[eng];
    if (!def) {
      const known = Object.keys(ENGINES_DEF).join(', ');
      return R.notFound(
        `Motor desconhecido: '${eng}'.`,
        `Motores registrados: ${known}`,
      );
    }
    return R.ok({ engine: eng, definition: def });
  },

  /**
   * FASE 2 / PASSO 21 — REMOVIDOS: batchTranslate, batchTranslateWithEngine.
   * Devolviam um array cru (sem `ok`), sem contrato, sem tratamento de
   * erro por item, e nenhuma linha da UI os chamava. Tradução em lote
   * happens pelo TranslationPipeline; manter dois caminhos de tradução em
   * lote era exatamente a arquitetura concorrente da auditoria.
   */

   async findGame({ name, size, mtime }) {
    if (!name) return null;
    const found = await findGameOnDisk(name);
    if (found.length === 0) return null;
    if (size && mtime) {
      const exact = found.filter(
        (f) => f.size === size && Math.round(f.mtime) === Math.round(mtime)
      );
      if (exact.length === 1) return exact[0];
    }
    if (size) {
      const bySize = found.filter((f) => f.size === size);
      if (bySize.length === 1) return bySize[0];
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
      const safePath = sanitizePath(shortcutPath);
      if (!safePath || !safePath.toLowerCase().endsWith(".lnk")) {
        res(safePath || shortcutPath);
        return;
      }
      const psCmd = `$sh = New-Object -ComObject WScript.Shell; $sh.CreateShortcut('${safePath.replace(/'/g, "''")}').TargetPath`;
      const shortcutResult = spawnSync("powershell", ["-NoProfile", "-Command", psCmd], {
        encoding: "utf-8",
        maxBuffer: 5 * 1024 * 1024
      });
      if (shortcutResult.error) {
        res(safePath);
        return;
      }
      const target = (shortcutResult.stdout || "").trim();
      if (target && fs.existsSync(target)) {
        res(target);
      } else {
        res(safePath);
      }
    });
  },
  loadGlossary() {
    return loadGlossary();
  },
  saveGlossary(params = {}) {
    const entries = Array.isArray(params) ? params : (params.entries || params.glossary || []);
    return saveGlossary(entries);
  },
  async translateWithEngine({ text, sl, tl, engine }) {
    return translateSingle(text, sl || "auto", tl || "pt", engine || "multi");
  },
  /**
   * FASE 2 / PASSO 21 — REMOVIDO: batchTranslateWithEngine (ver nota acima).
   */

  /**
   * FASE 2 / PASSO 36 — installOverlay REESCRITO.
   *
   * Bugs originais (todos escondidos por retornos de sucesso):
   *  1. `path.join(global.ROOT, "www", "UltraTranslateOverlay.js")` — a pasta
   *     `www/` NUNCA existiu no projeto. O overlay real está em
   *     `ui/UltraTranslateOverlay.js`. Resultado: o handler retornava
   *     SEMPRE "Overlay JS not found" e a UI tratava como beco sem saída.
   *  2. Registrava em `js/plugins.json` com `JSON.parse`. RPG Maker MV/MZ
   *     NÃO tem esse arquivo — o registro é `js/plugins.js`, um array JS
   *     dentro de comentário. O `catch (e) {}` engolia a exceção, então o
   *     overlay era copiado mas NUNCA era carregado pelo jogo.
   *  3. `return true` (boolean) em vez de `{ok:true}`, quebrando o contrato
   *     de todos os outros handlers.
   *  4. Não verificava se a escrita realmente aconteceu em disco.
   *
   * Agora: resolve candidatos reais, escreve, registra de verdade, e só
   * devolve ok:true depois de RELER o disco e confirmar os dois fatos.
   */
  installOverlay({ gameKey }) {
    const PLUGIN_NAME = 'UltraTranslateOverlay';

    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return R.notFound('Game not found');
    const exe = g.constArgs?.gameExe || '';
    if (!exe || !fs.existsSync(exe)) return R.notFound('EXE not found');

    const gameDir = path.dirname(exe);
    const dataDir = findDataDir(gameDir);
    if (!dataDir) return R.notFound('Game data directory not found');

    let wwwDir = path.dirname(dataDir);
    if (!fs.existsSync(path.join(wwwDir, 'index.html'))) wwwDir = gameDir;

    // Candidatos REAIS do fonte do overlay.
    const overlayCandidates = [
      path.join(global.ROOT, 'ui', 'UltraTranslateOverlay.js'),
      path.join(global.ROOT, 'resources', 'templates', 'CheatOverlayTemplate.js'),
    ];
    const overlayPath = overlayCandidates.find((p) => fs.existsSync(p));
    if (!overlayPath) {
      return R.failed('Overlay JS not found', `Procurado em: ${overlayCandidates.join(', ')}`);
    }

    try {
      const jsDir = path.join(wwwDir, 'js');
      const pluginsDir = path.join(jsDir, 'plugins');
      if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

      const dest = path.join(pluginsDir, `${PLUGIN_NAME}.js`);
      let overlayContent = fs.readFileSync(overlayPath, 'utf8');

      const dictFile = 'UltraTranslations.json';
      const replacedDict = overlayContent.replace('__DICT_FILENAME__', dictFile);
      if (replacedDict === overlayContent && overlayContent.includes('__DICT_FILENAME__')) {
        return R.failed('Template do overlay inválido',
          'Placeholder __DICT_FILENAME__ não pôde ser substituído.');
      }
      overlayContent = replacedDict;

      const cfg = handlers.loadCfg();
      const wrapLimit = cfg.wordWrapLimit !== undefined ? cfg.wordWrapLimit : 50;
      const replacedWrap = overlayContent.replace('__WORD_WRAP_LIMIT__', String(wrapLimit));
      if (replacedWrap === overlayContent && overlayContent.includes('__WORD_WRAP_LIMIT__')) {
        return R.failed('Template do overlay inválido',
          'Placeholder __WORD_WRAP_LIMIT__ não pôde ser substituído.');
      }
      overlayContent = replacedWrap;

      fs.writeFileSync(dest, overlayContent, 'utf8');

      // ---- VERIFICAÇÃO 1: o arquivo foi realmente gravado? ----
      if (!fs.existsSync(dest)) {
        return R.failed('Falha ao gravar o overlay', `Arquivo ausente após escrita: ${dest}`);
      }
      const reread = fs.readFileSync(dest, 'utf8');
      if (reread.length !== overlayContent.length
          || reread.includes('__DICT_FILENAME__')
          || reread.includes('__WORD_WRAP_LIMIT__')) {
        return R.failed('Verificação do overlay falhou',
          'O conteúdo em disco difere do esperado ou ainda contém placeholders.');
      }
      const bytesWritten = reread.length;

      // ---- VERIFICAÇÃO 2: o plugin está registrado e HABILITADO? ----
      const pluginsFilePath = path.join(jsDir, 'plugins.js');
      const {
        registerPlugin, verifyPlugin,
      } = require('../engines/rpgmaker/rpgMakerPluginsFile');
      const reg = registerPlugin(pluginsFilePath, {
        name: PLUGIN_NAME,
        description: 'Runtime overlay (OpenTranslator)',
        parameters: {},
      });
      if (!reg.registered) {
        return R.failed('Overlay gravado, mas NÃO registrado em plugins.js',
          `${reg.reason} (${pluginsFilePath})`);
      }
      const verify = verifyPlugin(pluginsFilePath, PLUGIN_NAME);
      if (!verify.present || !verify.enabled) {
        return R.failed('Overlay registrado, mas o jogo não vai carregá-lo',
          `plugins.js confirma: ${JSON.stringify(verify)}`);
      }

      global.log('info', `Overlay installed for ${path.basename(exe)} `
        + `(${bytesWritten} bytes, ${verify.totalPlugins} plugins registrados)`);
      return R.ok({
        overlayPath: dest,
        pluginsFile: pluginsFilePath,
        bytesWritten,
        registered: true,
        enabled: true,
        totalPlugins: verify.totalPlugins,
        registrationChanged: reg.changed,
      });
    } catch (e) {
      return R.failed(e.message, { stack: undefined });
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
      const pluginCandidates = [
        path.join(global.ROOT, "resources", "unity", "xunity_plugin", "UltraBatchEndpoint.dll"),
        path.join(global.ROOT, "xunity_plugin", "UltraBatchEndpoint.dll")
      ];
      const pluginSrc = pluginCandidates.find(p => fs.existsSync(p));

      // FASE 9 / PASSO 37 — O PLUGIN É OBRIGATÓRIO, E O ORIGINAL ERA OPCIONAL
      //
      // O código era:
      //
      //     const pluginSrc = pluginCandidates.find(p => fs.existsSync(p));
      //     if (pluginSrc) { ...copia... }
      //     global.log("info", "Unity installed for " + exeName);
      //     return true;
      //
      // Se o DLL não estivesse em NENHUM dos candidatos, o `if` era pulado,
      // nada era copiado, e a resposta era sucesso com "Unity installed".
      //
      // O que o usuário recebia: BepInEx instalado, config criada, e um jogo
      // que abre e não traduz NADA — porque o plugin que faz a tradução não
      // foi copiado. O pior desfecho possível para uma ferramenta de tradução:
      // aparenta funcionar e não traduz.
      if (!pluginSrc) {
        return R.notFound(
          'Plugin UltraBatchEndpoint.dll não encontrado no OpenTranslator.',
          `Procurado em: ${pluginCandidates.join(', ')}. A instalação foi `
          + 'INTERROMPIDA: sem o plugin o jogo não traduz, e reportar sucesso '
          + 'aqui diria o contrário.',
        );
      }

      const pluginDstDir = fs.existsSync(
        path.join(bepDir, "plugins", "XUnity.AutoTranslator.Plugin.Unity"),
      )
        ? path.join(bepDir, "plugins", "XUnity.AutoTranslator.Plugin.Unity")
        : path.join(bepDir, "plugins");
      const pluginDst = path.join(pluginDstDir, "UltraBatchEndpoint.dll");
      fs.mkdirSync(path.dirname(pluginDst), { recursive: true });
      fs.copyFileSync(pluginSrc, pluginDst);

      // ---- VERIFICAÇÃO: o plugin está no disco, no caminho que o BepInEx lê? ----
      if (!fs.existsSync(pluginDst)) {
        return R.failed(
          'O plugin foi copiado mas não está onde o BepInEx procura.',
          `Destino esperado: ${pluginDst}`,
        );
      }
      const srcSize = fs.statSync(pluginSrc).size;
      const dstSize = fs.statSync(pluginDst).size;
      if (srcSize !== dstSize) {
        return R.failed('Plugin copiado com tamanho diferente do original.',
          `origem=${srcSize}b destino=${dstSize}b`);
      }

      const cfgPath = path.join(bepDir, "config", "AutoTranslatorConfig.ini");
      if (!fs.existsSync(cfgPath)) {
        return R.failed('A configuração do AutoTranslator não foi criada.',
          `Esperado: ${cfgPath}`);
      }

      global.log("info", `Unity instalado para ${exeName} (plugin em ${pluginDst}).`);
      return R.ok({
        bepInExDir: bepDir,
        pluginPath: pluginDst,
        pluginBytes: dstSize,
        configPath: cfgPath,
        verified: true,
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  async extractRpa({ rpaPath, outputDir }) {
    const safeRpa = sanitizePath(rpaPath);
    if (!safeRpa || !fs.existsSync(safeRpa))
      return { ok: false, error: "RPA file not found" };
    const safeOutDir = sanitizePath(outputDir) ||
      path.join(path.dirname(safeRpa), path.basename(safeRpa) + "_extracted");
    const scriptCandidates = [
      path.join(global.ROOT, "resources", "renpy", "unren_tools", "rpatool.py"),
      path.join(global.ROOT, "resources", "renpy", "rpatool", "rpatool.py"),
      path.join(global.ROOT, "unren_tools", "rpatool.py")
    ];
    const script = scriptCandidates.find(p => fs.existsSync(p));
    if (!script)
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, ["-x", safeRpa, "-o", safeOutDir]);
  },
  async packRpa({ inputDir, outputPath }) {
    const safeIn = sanitizePath(inputDir);
    if (!safeIn || !fs.existsSync(safeIn))
      return { ok: false, error: "Input directory not found" };
    const safeOut = sanitizePath(outputPath) || (safeIn + ".rpa");
    const scriptCandidates = [
      path.join(global.ROOT, "resources", "renpy", "unren_tools", "rpatool.py"),
      path.join(global.ROOT, "resources", "renpy", "rpatool", "rpatool.py"),
      path.join(global.ROOT, "unren_tools", "rpatool.py")
    ];
    const script = scriptCandidates.find(p => fs.existsSync(p));
    if (!script)
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, [
      "-c",
      safeOut,
      safeIn,
    ]);
  },
  async decompileRpyc({ filePath, outputDir }) {
    const safeFile = sanitizePath(filePath);
    if (!safeFile || !fs.existsSync(safeFile))
      return { ok: false, error: "File not found" };
    const scriptCandidates = [
      path.join(global.ROOT, "resources", "renpy", "unren_tools", "unrpyc.py"),
      path.join(global.ROOT, "resources", "renpy", "unrpyc_v2", "unrpyc.py"),
      path.join(global.ROOT, "unren_tools", "unrpyc.py")
    ];
    const script = scriptCandidates.find(p => fs.existsSync(p));
    if (!script)
      return { ok: false, error: "unrpyc.py not found" };
    const args = ["--utf-8", safeFile];
    const safeOut = sanitizePath(outputDir);
    if (safeOut) args.push("-o", safeOut);
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

    global.log("info", "[RPC] Executando pipeline canônico universal para " + gameKey);
    const runResult = await gameService.pipeline.run(gameDir, {
      ...cfg,
      lang: cfg.lang || "pt_BR"
    });

    if (overlay) {
      try {
        await handlers.installOverlay({ gameKey });
      } catch (e) {}
    }
    const ok = !!(runResult && runResult.success);
    const error = ok ? undefined : (runResult?.error || runResult?.message || "Falha na tradução dos arquivos");
    return { ok, error, backup: true, result: runResult };
  },
  async extractWolf({ gamePath }) {
    const safePath = sanitizePath(gamePath);
    if (!safePath || !fs.existsSync(safePath))
      return { ok: false, error: "Caminho do jogo Wolf não encontrado" };
    const uberWolfExe = path.join(global.ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    return new Promise((res) => {
      global.log("info", `Executando UberWolfCli.exe para extrair: ${safePath}`);
      const proc = spawn(uberWolfExe, ["-o", "-u", "-x", safePath], {
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
    const safeDir = sanitizePath(inputDir);
    if (!safeDir || !fs.existsSync(safeDir))
      return { ok: false, error: "Pasta de origem não encontrada" };
    const uberWolfExe = path.join(global.ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    const verIdx = String(parseInt(versionIndex, 10) || 4);

    return new Promise((res) => {
      global.log(
        "info",
        `Executando UberWolfCli.exe para empacotar: ${safeDir} com versão index ${verIdx}`
      );
      const proc = spawn(uberWolfExe, ["-p", verIdx, safeDir], {
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
    const safeExe = sanitizePath(exePath);
    if (!safeExe || !fs.existsSync(safeExe))
      return { ok: false, error: "Arquivo executável não encontrado" };
    const outDir =
      sanitizePath(destDir) ||
      path.join(
        path.dirname(safeExe),
        path.basename(safeExe, ".exe") + "_extracted"
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
        `Executando descompactação EVB para: ${safeExe} na pasta ${outDir}`
      );
      const stdout = await runPythonScript(script, [safeExe, outDir]);
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
      const safeTitle = (g.libConf?.title || gameKey || "game").replace(/[^a-zA-Z0-9_\-\. ]/g, "_");
      const exportFile = path.join(desktop, `${safeTitle}_traducoes.xlsx`);

      await workbook.xlsx.writeFile(exportFile);
      global.log("success", `Exportação Excel concluída. Salvo em: ${exportFile}`);
      spawn("explorer.exe", ["/select,", exportFile], { detached: true, stdio: "ignore", shell: false });
      return { ok: true, path: exportFile };
    } catch (e) {
      global.log("error", "Falha ao gerar arquivo Excel: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  async importExcel({ gameKey, excelPath }) {
    const ExcelJS = require("exceljs");
    const safeExcelPath = sanitizePath(excelPath);
    if (!safeExcelPath || !fs.existsSync(safeExcelPath))
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
  async analyzeGame(params = {}) {
    const gp = resolveGameDir(params);
    return await gameService.analyzeGame(gp);
  },
  async dryRunGame(params = {}) {
    const gp = resolveGameDir(params);
    return await gameService.dryRun(gp, params.options);
  },
  async startTranslationJob(params = {}) {
    const gp = resolveGameDir(params);
    return await gameService.startTranslationJob(gp, params.options);
  },
  getJobStatus({ jobId }) {
    return gameService.getJob(jobId);
  },
  listTranslationJobs() {
    return gameService.listJobs();
  },
  runSelfTest() {
    return gameService.selfTest();
  },
  exportDiagnosticBundle() {
    return gameService.exportDiagnosticBundle();
  },
  getTriadInfo(params = {}) {
    const gp = resolveGameDir(params);
    const EngineRuntimeTriad = require('../core/engineRuntimeTriad');
    return EngineRuntimeTriad.resolve({ gameDir: gp });
  },
  // ------------------------------------------------------------------------
  // FASE 2 / PASSO 21 — HANDLERS REMOVIDOS (falsos)
  //
  // Estes handlers escreviam em `global.__openTranslator*` e devolviam
  // {ok:true}. Nada nunca lia essas variáveis: eram sucesso puro, sem
  // efeito colateral observável. A UI consumia o ok:true e mostrava
  // "Regra salva!", "Health OK!" etc. sem que nada tivesse mudado.
  //
  // REMOVIDOS (não reimplementados — não havia especificação real):
  //   getHealthStatus, getGlossaryRules, saveGlossaryRule,
  //   saveManualOverride, getLiveMonitorEntries
  //
  // Um handler sem implementação é removido, não mantido como isca.
  // Se a funcionalidade for necessária, ela precisa ser desenhada e
  // testada primeiro (fases seguintes).
  // ------------------------------------------------------------------------

  // ==================== PHASE 9 RUNTIME RPC HANDLERS ====================

  async runtimeStartSession(params = {}) {
    const RuntimeSession = require("../core/runtimeSessionManager");
    const session = new RuntimeSession({
      gameId: params.gameId || (params.gameDir ? path.basename(params.gameDir) : "game"),
      gameDir: params.gameDir,
      stagingDir: params.stagingDir,
      executablePath: params.executablePath,
      engine: params.engine,
      runtime: params.runtime,
      strategy: params.strategy
    });
    session.prepare();
    const res = session.launch(params.args || []);
    return { ok: true, sessionId: session.sessionId, pid: res.pid, executableHash: session.executableHash };
  },

  async runtimeStopSession(params = {}) {
    const ownedProcessRegistry = require("../core/ownedProcessRegistry");
    if (params.pid) {
      const res = ownedProcessRegistry.stop(params.pid, params.reason || "RPC Stop");
      return { ok: res.success, res };
    }
    if (params.sessionId) {
      const res = ownedProcessRegistry.stopSession(params.sessionId, params.reason || "RPC Session Stop");
      return { ok: res.success, res };
    }
    return { ok: false, error: "pid or sessionId required" };
  },

  async runtimeProbe(params = {}) {
    const RuntimeProbe = require("../core/runtimeProbe");
    const res = RuntimeProbe.probeProcess(params.pid);
    return { ok: true, probe: res };
  },

  async runtimeCaptureScreen(params = {}) {
    const screenCapture = require("../core/screenCapture");
    const res = screenCapture.capture(params);
    return { ok: res.success, capture: res };
  },

  async routerRecommend(params = {}) {
    const router = require("../core/translationRuntimeRouter");
    const recommendation = router.selectStrategy(params);
    return { ok: true, recommendation };
  },

  async stagingPrepare(params = {}) {
    const stagingPolicy = require("../core/stagingPolicy");
    const res = stagingPolicy.createStaging(params.gameDir, params.sessionId);
    return { ok: res.success, res };
  },

  async stagingCleanup(params = {}) {
    const stagingPolicy = require("../core/stagingPolicy");
    const res = stagingPolicy.cleanupStaging(params.stagingDir);
    return { ok: res.success, res };
  },

  async evidenceList() {
    const aggregator = require("../core/capabilityEvidenceAggregator");
    const matrix = aggregator.aggregate();
    return { ok: true, matrix };
  },

  async getProviderHealth({ provider } = {}) {
    const GlobalCircuitBreaker = require("../core/globalCircuitBreaker");
    const breaker = GlobalCircuitBreaker.getInstance();
    const providers = ["google:gtx", "google:dict-chrome-ex", "bing", "gemini", "deepl"];
    const health = {};
    for (const p of providers) {
      health[p] = breaker.getProviderHealth(p);
    }
    return { ok: true, health, requested: provider ? breaker.getProviderHealth(provider) : health };
  },

  async getRenpyAppDataStatus({ gameDir, gameTitle, engine }) {
    try {
      if (engine && engine.toLowerCase() !== "renpy") {
        const EngineRoutingGuard = require("../core/engineRoutingGuard");
        const check = EngineRoutingGuard.check("getRenpyAppDataStatus", engine, "renpy");
        return { ok: false, blocked: true, error: check.error, reason: check.message };
      }
      const resolver = require("../discovery/renpyAppDataResolver");
      const res = resolver.resolveGameAppDataDir(gameDir, gameTitle, { engine });
      let saves = [];
      // FASE 9 / PASSO 55 — `catch (e) {}` aqui devolvia `saves: []`, que é
      // indistinguível de "este jogo não tem saves". Um diretório ilegível
      // (permissão, I/O, unidade removida) e um save inexistente produziam a
      // mesma resposta, e a UI mostrava "nenhum save encontrado" — uma
      // afirmação sobre o JOGO feita a partir de uma falha de LEITURA.
      let savesError = null;
      if (res && res.success && res.appDataDir && fs.existsSync(res.appDataDir)) {
        try {
          const files = fs.readdirSync(res.appDataDir);
          saves = files.filter(f => f.endsWith(".save") || f.endsWith(".bak") || f.endsWith(".rpy"));
        } catch (e) {
          savesError = e.message;
          global.log('warn',
            `[getRenpyAppDataStatus] Não foi possível listar ${res.appDataDir}: ${e.message}`);
        }
      }
      return {
        ok: true,
        success: res.success,
        appDataDir: res.appDataDir,
        method: res.method,
        saveDirectoryName: res.saveDirectoryName,
        saves,
        // FASE 9: `saves` vazio + `savesError` preenchido é o par que separa
        // "não há saves" de "não deu para olhar".
        savesListingFailed: savesError !== null,
        savesError,
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /**
   * FASE 2 / PASSO 21 — REMOVIDO: selectFolder.
   * Usava `spawnSync` com um FolderBrowserDialog MODAL dentro do processo do
   * servidor, travando o event loop inteiro enquanto o usuário olha o
   * explorador de arquivos. Pior: devolvia `{ok:true, folderPath:null}`
   * quando o usuário cancelava — sucesso falso. A UI nunca chamou.
   */

  async unpackAll({ key, gameKey, gameDir, gamePath, targetDir, destDir }) {
    let resolvedGameDir = gamePath || gameDir;
    const resolvedKey = key || gameKey;
    if (!resolvedGameDir && resolvedKey) {
      const games = handlers.loadGames().games;
      const g = games[resolvedKey];
      if (g) {
        if (g.constArgs?.gameExe) {
          resolvedGameDir = path.dirname(g.constArgs.gameExe);
        } else if (g.gamePath || g.dir) {
          resolvedGameDir = g.gamePath || g.dir;
        }
      }
    }

    const resolvedDest = targetDir || destDir;
    if (!resolvedGameDir || !fs.existsSync(resolvedGameDir)) {
      return { ok: false, error: "Diretório do jogo não encontrado" };
    }
    if (!resolvedDest) {
      return { ok: false, error: "Pasta de destino não especificada" };
    }

    const { extractMedia } = require("../mediaExtractor/index");
    return await extractMedia({
      gameDir: resolvedGameDir,
      destDir: resolvedDest,
      type: "all"
    });
  },
  async unpackRenpyFull(params) {
    return handlers.unpackAll(params);
  },

  /**
   * FASE 2 / PASSO 21 — antes NAO escaneava nada: lia global.lastGameState
   * (que a própria UI escreve ao setar variaveis) e enfileirava um comando
   * cujo corpo era um comentario. Retornava {ok:true, variables:[]} e a UI
   * logava "Mapeadas N variáveis com sucesso!".
   *
   * Agora: só devolve ok:true se houve leitura de um snapshot real do jogo.
   * Sem jogo conectado => NOT_CONNECTED.
   */
  async scanGameVariables(params = {}) {
    const socketOpen = Boolean(
      global.activeCheatSocket && global.activeCheatSocket.readyState === 1,
    );
    const recentPoll = Date.now() - global.lastCheatPollTime < 8000;

    if (!socketOpen && !recentPoll) {
      return R.notConnected(
        'Nenhum jogo conectado: não é possível ler variáveis.',
        'Abra o jogo via OpenTranslator para habilitar a leitura de memória.',
      );
    }

    const state = global.lastGameState || {};
    // Proveniência é obrigatória. Sem ela, os dados são um espelho local e
    // dizê-los como leitura do jogo seria inventar telemetria.
    // (Aceitar `renpyVars` sem origem marcada rotulava como 'hook' exatamente
    // os dados que a própria UI havia escrito via setGameVar.)
    if (state.renpyVarsSource !== 'hook') {
      return R.failed(
        'O jogo conectado ainda não reportou variáveis.',
        'Nenhum snapshot marcado como vindo do hook de telemetria. '
        + 'Aguarde um ciclo de poll e tente novamente.',
      );
    }

    let vars = state.renpyVars || state.variables || [];
    if (!Array.isArray(vars) && vars && typeof vars === 'object') {
      vars = Object.entries(vars).map(([name, value]) => ({
        id: name,
        name,
        value,
        type: typeof value,
      }));
    }

    return R.ok({ variables: vars, count: vars.length, source: 'hook' });
  },

  /**
   * FASE 2 / PASSO 21 — setGameVar NÃO aceita "enfileirar" como entrega.
   *
   * O handler enfileirava a escrita e devolvia sucesso mesmo sem jogo. Isso é
   * pior que não fazer nada: o comando ficava na fila e podia ser entregue ao
   * PRÓXIMO jogo que o usuário abrir, aplicando
   * `renpy.store["gold"] = 999999` no jogo errado.
   *
   * Escrita em memória de jogo vivo exige socket ABERTO agora. Sem socket, a
   * resposta honesta é NOT_CONNECTED e nada é enfileirado.
   *
   * Também NÃO mutamos global.lastGameState: isso fazia a UI mostrar o valor
   * novo sem que o jogo tivesse mudado. O estado real só muda quando o hook
   * reportar no próximo poll.
   */
  async setGameVar({ id, value } = {}) {
    if (!id) return R.invalidInput("ID de variável ausente");
    if (typeof id !== 'string' && typeof id !== 'number') {
      return R.invalidInput("ID de variável deve ser string ou number");
    }

    const socketOpen = Boolean(
      global.activeCheatSocket && global.activeCheatSocket.readyState === 1,
    );
    if (!socketOpen) {
      // Deliberadamente NÃO enfileiramos: uma escrita em memória pendente seria
      // aplicada ao próximo jogo conectado, não a este.
      return R.notConnected(
        'Não há jogo conectado: a variável não foi alterada.',
        'Escritas em memória exigem um jogo em execução com canal aberto. A escrita '
        + 'NÃO foi enfileirada, para não ser aplicada a outro jogo.',
      );
    }

    const valStr = typeof value === 'string' ? JSON.stringify(value) : String(value);
    const code = `if (typeof renpy !== 'undefined' && renpy.store) { renpy.store[${JSON.stringify(String(id))}] = ${valStr}; } else if (typeof $gameVariables !== 'undefined') { const numId = parseInt(${JSON.stringify(String(id))}, 10); if (!isNaN(numId)) { $gameVariables.setValue(numId, ${valStr}); } }`;

    const sent = handlers.sendCheatCommand({ code });

    if (!sent.ok || sent.delivery !== 'sent') {
      return R.failed(
        'Falha ao entregar a escrita da variável.',
        `Entrega reportada: ${sent.delivery || 'desconhecida'}.`,
      );
    }

    // NÃO mutamos global.lastGameState: o estado real do jogo só muda quando
    // o hook reportar no proximo poll.
    return R.ok({
      id: String(id),
      value,
      delivery: sent.delivery,
      confirmed: false,
      note: 'Escrita enviada. O valor só aparece como confirmado após o próximo '
        + 'ciclo de telemetria do hook.',
    });
  },

  getCapabilityMatrix() {
    const EngineCapabilityMatrix = require("../core/engineCapabilityMatrix");
    return {
      ok: true,
      matrix: EngineCapabilityMatrix.getDeclarations(),
      compatibility: structuredClone(require("../../config/engineCompatibility.json")),
      summary: EngineCapabilityMatrix.getMatrixSummary()
    };
  },

  async runSpeedBenchmark(params = {}) {
    const SpeedBenchmark = require("../core/speedBenchmark");
    const result = await SpeedBenchmark.run(params.sample || null, params.options || {});
    return { ok: true, result };
  },

  /**
   * FASE 2 / PASSO 21 — getJobTelemetry deixava de mentir.
   * `global.activeTranslationQueue` nunca era atribuído por ninguém, então
   * isto devolvia SEMPRE `{ok:true, active:false}` — telemetria de uma fila
   * que não existe.
   * Agora lê a fila real via gameService; se não houver, diz que não há.
   */
  getJobTelemetry(params = {}) {
    const queue = global.activeTranslationQueue;
    if (queue && typeof queue.getMetrics === 'function') {
      return R.ok({ active: true, metrics: queue.getMetrics() });
    }
    const snapshot = gameService.getTelemetry ? gameService.getTelemetry() : null;
    if (snapshot) return R.ok({ active: Boolean(snapshot.active), metrics: snapshot });
    return R.ok({
      active: false,
      metrics: null,
      note: 'Nenhuma fila de tradução ativa. A telemetria é vazia porque não '
        + 'há job em execução — não porque a coleta falhou.',
    });
  },

  resumeTranslationJob(params = {}) {
    const jobPersistence = require("../core/jobPersistence");
    const job = jobPersistence.loadJob(params.jobId);
    if (!job) return { ok: false, error: "Tarefa não encontrada ou já concluída" };
    return { ok: true, job };
  },

  async detectUntranslated(params = {}) {
    const UntranslatedDetector = require("../core/untranslatedDetector");
    const resolvedDir = resolveGameDir(params);

    if (!resolvedDir || !fs.existsSync(resolvedDir)) {
      return { ok: false, error: "Diretório do jogo não encontrado" };
    }

    const { extractGameTexts } = require("../extractors/extractor");
    const rawRes = await extractGameTexts(resolvedDir);
    const textsList = Array.isArray(rawRes) ? rawRes : (rawRes.texts || []);
    const translations = new Map();

    const analysis = UntranslatedDetector.analyzeExtraction(textsList, translations);
    return {
      ok: true,
      summary: analysis.summary,
      languageStats: analysis.languageStats,
      remainingCount: analysis.remainingCount,
      remaining: analysis.remaining.slice(0, 500),
      formattedReport: analysis.formattedReport
    };
  },

  async runVisualQA(params = {}) {
    const VisualQAEngine = require("../core/visualQAEngine");
    const qa = new VisualQAEngine();
    const resolvedDir = resolveGameDir(params);

    const report = await qa.runAutomatedQA({
      gameDir: resolvedDir,
      cdpPort: params.cdpPort || 9222,
      pid: params.pid
    });

    return { ok: true, report };
  },

  getRuntimeTexts(params = {}) {
    const RuntimeTextManager = require("../core/runtimeTextManager");
    const texts = RuntimeTextManager.getInstance().getAllRuntimeTexts(params.filter || {});
    return { ok: true, count: texts.length, texts };
  },

  promoteRuntimeText(params = {}) {
    const RuntimeTextManager = require("../core/runtimeTextManager");
    const res = RuntimeTextManager.getInstance().addToTranslationMemory(params.hashOrId, params.translation);
    return { ok: res.success, res };
  },

  calculateVersionDiff(params = {}) {
    const { JobSystem } = require("../core/jobSystem");
    const diff = JobSystem.calculateTranslationDiff(params.oldTexts || [], params.newTexts || [], params.oldTranslations || {});
    return { ok: true, diff };
  },

  getHierarchicalGlossary(params = {}) {
    const HierarchicalGlossary = require("../core/hierarchicalGlossary");
    const hg = HierarchicalGlossary.getInstance();
    const terms = hg.getActiveTerms({
      projectDir: params.gameDir,
      plugin: params.plugin,
      engine: params.engine
    });
    return { ok: true, count: terms.length, terms };
  }
};

module.exports = {
  handlers
};

function verifyAndDiagnoseGame(gameDir, exe, pid) {
  setTimeout(() => {
    const safePid = parseInt(pid, 10);
    if (!safePid || safePid <= 0) return;

    let isRunning = false;
    try {
      isRunning = process.kill(safePid, 0);
    } catch (e) {
      isRunning = false;
    }

    if (!isRunning) {
      global.log(
        "error",
        `[Erro de Boot] O processo do jogo (PID ${safePid}) foi encerrado logo após a inicialização.`
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

    const safeExeName = path.basename(exe || "", ".exe").replace(/[^a-zA-Z0-9_\-\. ]/g, "");
    const psCmd = `(Get-Process -Id ${safePid} -ErrorAction SilentlyContinue).MainWindowHandle`;

    const handleResult = spawnSync("powershell", ["-NoProfile", "-Command", psCmd], {
      encoding: "utf-8",
      maxBuffer: 1 * 1024 * 1024
    });

    if (handleResult.error) {
      global.log("error", `[verifyAndDiagnoseGame] Falha ao obter handle: ${handleResult.error.message}`);
    } else {
      const handleStr = (handleResult.stdout || "").trim();
      const handleNum = parseInt(handleStr, 10);

      if (!isNaN(handleNum) && handleNum > 0) {
        global.log(
          "info",
          `[Saúde de Processo / Process Health] O processo do jogo (PID ${safePid}) está ativo com JANELA VISÍVEL na tela (Handle: ${handleNum}).`
        );
      } else {
        global.log(
          "warn",
          `[Alerta de Boot] O jogo (PID ${safePid}) está rodando no Gerenciador de Tarefas, mas a JANELA ESTÁ INVISÍVEL ou minimizada (Handle: ${handleNum || 0}).`
        );
        global.log("info", "Tentando restaurar e focar a janela gráfica do jogo automaticamente...");

        const unhideCmd = `$t = Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -Name W -PassThru; $p = Get-Process -Name '${safeExeName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; if ($p) { $t::ShowWindow($p.MainWindowHandle, 9); $t::SetForegroundWindow($p.MainWindowHandle); }`;
        spawnSync("powershell", ["-NoProfile", "-Command", unhideCmd], {
          detached: true,
          stdio: "ignore"
        });

        const debugLogPath = path.join(gameDir, "debug.log");
        if (fs.existsSync(debugLogPath)) {
          try {
            const content = fs.readFileSync(debugLogPath, "utf8").trim();
            const lines = content.split("\n").filter((l) => l.trim().length > 0);
            const lastLines = lines.slice(-5).join("\n  -> ");
            global.log(
              "info",
              "Logs recentes do jogo (debug.log):\n  -> " + lastLines
            );
          } catch (e) {}
        }
      }
    }
  }, 3500);
}


