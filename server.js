/**
 * server.js — Ponto de Entrada Principal do Servidor OpenTranslator
 *
 * Responsabilidades:
 * - Inicializar variáveis e diretórios globais (ROOT, WWW_DIR, GL_DIR, DATA_DIR)
 * - Configurar agentes HTTPS com keepAlive para alta performance
 * - Gerenciar ciclo de vida do processo, sinais de shutdown e limpeza de PIDs órfãos
 * - Inicializar subsistemas centrais (logger, cache/SQLite, httpServer, hookServer)
 *
 * Localização Arquitetural:
 * Ponto de Entrada / Inicialização de Sistema (Application Host & Bootstrap)
 *
 * Principais componentes:
 * - shutdownAll()
 * - tryListen() via src/httpServer.js
 * - startHookServer() via src/cheatServer.js
 */

const fs = require("fs");
const path = require("path");

// ==================== CONSTANTES GLOBAIS ====================
global.ROOT     = __dirname;
global.WWW_DIR  = fs.existsSync(path.join(__dirname, "ui")) ? path.join(__dirname, "ui") : path.join(__dirname, "www");
global.GL_DIR   = path.join(__dirname, "gameLib");
global.DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(global.DATA_DIR)) fs.mkdirSync(global.DATA_DIR, { recursive: true });
global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
global.LOG_PATH = path.join(global.DATA_DIR, "openT.log");

// Redireciona stdout/stderr pro log file
try {
  const logStream = fs.createWriteStream(global.LOG_PATH.replace("openT.log", "server_stdout.log"), { flags: "a" });
  process.stdout = logStream;
  process.stderr = logStream;
} catch (e) {}

const https = require("https");

https.globalAgent = new https.Agent({ keepAlive: true, maxSockets: 32, keepAliveMsecs: 10000 });

global.PORT     = process.env.PORT || 8080;

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
const loggerManager = require("./src/utils/loggerManager");
loggerManager.setLogPath(global.LOG_PATH);
require("./src/utils/logger");

// ==================== TRATAMENTO DE EXCEÇÕES ====================
process.on("uncaughtException", (err) => {
  global.log("error", err);
});

process.on("unhandledRejection", (reason) => {
  global.log("error", reason instanceof Error ? reason : new Error("Unhandled Rejection: " + reason));
});

// Signals and HTTP requests share one awaited teardown.
const shutdownCoordinator = require('./src/core/shutdownCoordinator');
global.shutdownAll = shutdownCoordinator.requestShutdown;
shutdownCoordinator.installSignalHandlers();

// ==================== INICIALIZAÇÃO DOS MÓDULOS ====================
// O cache precisa ser carregado para inicializar o SQLite imediatamente
require("./src/services/cache");

// ==================== SERVIDOR HTTP ====================
const { tryListen } = require("./src/services/httpServer");
tryListen(global.PORT);

// ==================== HOOK SERVER (WebSocket + HTTP 16005) ====================
const { startHookServer } = require("./src/services/cheatServer");
startHookServer().catch((err) => {
  global.log("error", "Falha ao iniciar servidor de hooks: " + err.message);
});
