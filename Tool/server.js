/**
 * OpenTranslator — Ponto de Entrada Principal
 *
 * Este arquivo inicializa todas as variáveis globais e carrega os módulos
 * a partir de Tool/src/. A lógica de negócio está distribuída em:
 *
 *   src/logger.js       — Sistema de logs e buffer circular
 *   src/cache.js        — SQLite, cache global, glossário, config
 *   src/extractor.js    — Extração e filtragem de textos dos jogos
 *   src/translator.js   — Motores de tradução (Google, Bing, LLM, DeepL)
 *   src/gameEngine.js   — Engines, backup, patch, pipeline de tradução
 *   src/rpcHandlers.js  — Handlers RPC expostos ao frontend
 *   src/httpServer.js   — Servidor HTTP + serving de arquivos estáticos
 *   src/cheatServer.js  — Servidor WebSocket de cheats na porta 16005
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ==================== CONSTANTES GLOBAIS ====================
global.ROOT     = __dirname;
global.WWW_DIR  = path.join(__dirname, "www");
global.GL_DIR   = path.join(__dirname, "gameLib");
global.DATA_DIR = path.join(__dirname, "data");
global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
global.LOG_PATH = path.join(global.DATA_DIR, "openT.log");
global.PORT     = 3000;

if (!fs.existsSync(global.DATA_DIR))
  fs.mkdirSync(global.DATA_DIR, { recursive: true });

// ==================== ESTADO GLOBAL ====================
global.launchedProc      = null;
global.launchedKey       = null;
global.launchedBak       = null;
global.restoreTimeout    = null;
global.activeCheatSocket = null;
global.lastGameState     = null;
global.pendingCheatCommands = [];
global.lastCheatPollTime = 0;

// ==================== LOGGER ====================
// Deve ser carregado ANTES de qualquer outro módulo que use global.log
require("./src/logger");

// ==================== TRATAMENTO DE EXCEÇÕES ====================
process.on("uncaughtException", (err) => {
  global.log(
    "error",
    "Uncaught Exception detectada: " +
      (err ? err.stack || err.message || err : "desconhecida")
  );
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  global.log(
    "error",
    "Unhandled Rejection detectada: " +
      (reason ? reason.stack || reason.message || reason : "desconhecido")
  );
  console.error("Unhandled Rejection reason:", reason);
});

// ==================== GERENCIAMENTO DE INSTÂNCIAS (PID) ====================
const PID_FILE = path.join(global.DATA_DIR, "server.pid");
try {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -NonInteractive -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`
      );
    } catch (e) {}
  }
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (oldPid > 0 && oldPid !== process.pid) {
      try {
        const cmd =
          process.platform === "win32"
            ? "taskkill /PID " + oldPid + " /F 2>nul"
            : "kill -9 " + oldPid + " 2>/dev/null";
        execSync(cmd);
      } catch (e) {}
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {}
    }
  }
} catch (e) {}

let isCleaningUp = false;
function shutdownAll(reason = "App Shutdown") {
  if (isCleaningUp) return;
  isCleaningUp = true;
  global.log("info", `Encerrando OpenTranslator (${reason})...`);
  console.log(`[OpenTranslator] Encerrando aplicação (${reason})...`);

  // 1. Encerrar qualquer processo de jogo ativo
  if (global.launchedProc) {
    try {
      const pid = typeof global.launchedProc === "object" ? global.launchedProc.pid : global.launchedProc;
      if (pid && pid > 0) {
        global.log("info", `Encerrando processo de jogo ativo (PID ${pid})...`);
        if (process.platform === "win32") {
          execSync(`taskkill /F /T /PID ${pid} 2>nul`);
        } else {
          process.kill(pid, "SIGKILL");
        }
      }
    } catch (e) {}
    global.launchedProc = null;
  }

  // 2. Restaurar backups pendentes se o jogo ainda estiver modificando arquivos
  if (global.launchedBak) {
    try {
      const { restoreGameData } = require("./src/gameEngine");
      restoreGameData(global.launchedBak);
    } catch (e) {}
  }

  // 3. Fechar porta do servidor HTTP (3000)
  try {
    const { server } = require("./src/httpServer");
    if (server && server.listening) {
      server.close();
    }
  } catch (e) {}

  // 4. Fechar portas e sockets do Hook Server (16005)
  try {
    const { stopHookServer } = require("./src/cheatServer");
    stopHookServer();
  } catch (e) {}

  // 5. Limpar arquivo de PID
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {}

  setTimeout(() => process.exit(0), 250);
}

global.shutdownAll = shutdownAll;

process.on("SIGINT", () => shutdownAll("SIGINT - Ctrl+C"));
process.on("SIGTERM", () => shutdownAll("SIGTERM - Processo Finalizado"));
process.on("SIGHUP", () => shutdownAll("SIGHUP - Janela/Terminal Fechado"));

// ==================== INICIALIZAÇÃO DOS MÓDULOS ====================
// O cache precisa ser carregado para inicializar o SQLite imediatamente
require("./src/cache");

// ==================== SERVIDOR HTTP ====================
const { tryListen } = require("./src/httpServer");
tryListen(global.PORT);

// ==================== HOOK SERVER (WebSocket + HTTP 16005) ====================
const { startHookServer } = require("./src/cheatServer");
startHookServer();
