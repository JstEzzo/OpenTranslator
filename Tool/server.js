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
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (oldPid > 0 && oldPid !== process.pid) {
      try {
        process.kill(oldPid, 0);
        try {
          const cmd =
            process.platform === "win32"
              ? "taskkill /PID " + oldPid + " /F 2>nul"
              : "kill -9 " + oldPid + " 2>/dev/null";
          execSync(cmd);
        } catch (e) {}
      } catch (e) {}
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {}
    }
  }
} catch (e) {}

let isCleaningUp = false;
const cleanup = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;
  try {
    fs.unlinkSync(PID_FILE);
  } catch (e) {}
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// ==================== INICIALIZAÇÃO DOS MÓDULOS ====================
// O cache precisa ser carregado para inicializar o SQLite imediatamente
require("./src/cache");

// ==================== SERVIDOR HTTP ====================
const { tryListen } = require("./src/httpServer");
tryListen(global.PORT);

// ==================== HOOK SERVER (WebSocket + HTTP 16005) ====================
const { startHookServer } = require("./src/cheatServer");
startHookServer();
