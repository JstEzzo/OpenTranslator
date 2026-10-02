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
const { spawnSync } = require("child_process");

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
const loggerManager = require("./src/loggerManager");
loggerManager.setLogPath(global.LOG_PATH);
require("./src/logger");

// ==================== TRATAMENTO DE EXCEÇÕES ====================
process.on("uncaughtException", (err) => {
  global.log("error", err);
});

process.on("unhandledRejection", (reason) => {
  global.log("error", reason instanceof Error ? reason : new Error("Unhandled Rejection: " + reason));
});

// ==================== GERENCIAMENTO DE INSTÂNCIAS (PID) ====================
const PID_FILE = path.join(global.DATA_DIR, "server.pid");
try {
  const portNum = parseInt(global.PORT, 10);
  if (process.platform === "win32" && !isNaN(portNum) && portNum >= 1 && portNum <= 65535) {
    const args = [
      "-NoProfile", "-NonInteractive", "-Command",
      `Get-NetTCPConnection -LocalPort ${portNum} -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`
    ];
    spawnSync("powershell", args, { stdio: "ignore" });
  }
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!isNaN(oldPid) && oldPid > 0 && oldPid !== process.pid) {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(oldPid), "/F"], { stdio: "ignore" });
      } else {
        spawnSync("kill", ["-9", String(oldPid)], { stdio: "ignore" });
      }
      fs.unlinkSync(PID_FILE);
    }
  }
} catch (e) {
  // Erros na limpeza inicial do PID/porta são silenciosos, não críticos.
}

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
          spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
        } else {
          process.kill(pid, "SIGKILL");
        }
      }
    } catch (e) { if (global.log) global.log("warn", `server: ${e.message}`); }
    global.launchedProc = null;
  }

  // 2. Restaurar backups pendentes se o jogo ainda estiver modificando arquivos
  if (global.launchedBak) {
    try {
      const { restoreGameData } = require("./src/gameEngine");
      restoreGameData(global.launchedBak);
    } catch (e) { if (global.log) global.log("warn", `server: ${e.message}`); }
  }

  // 3. Fechar porta do servidor HTTP (3000)
  try {
    const { server } = require("./src/httpServer");
    if (server && server.listening) {
      server.close();
    }
  } catch (e) { if (global.log) global.log("warn", `server: ${e.message}`); }

  // 4. Fechar portas e sockets do Hook Server (16005)
  try {
    const { stopHookServer } = require("./src/cheatServer");
    stopHookServer();
  } catch (e) { if (global.log) global.log("warn", `server: ${e.message}`); }

  // 5. Limpar arquivo de PID
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) { if (global.log) global.log("warn", `server: ${e.message}`); }

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
