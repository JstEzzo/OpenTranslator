/**
 * httpServer.js — Servidor HTTP Principal e Roteador de Transporte do OpenTranslator
 *
 * Responsabilidades:
 * - Servir os ativos estáticos da interface web (ui/) de forma segura e com controle de MIME
 * - Fornecer endpoints de ciclo de vida (/health, /api/heartbeat, /api/close_app)
 * - Roteamento seguro de requisições RPC (/api/rpc) para os handlers de backend
 * - Proteção estrita contra Path Traversal e limites de payload
 * - Inicialização do navegador com isolamento de perfil
 *
 * Camada Arquitetural:
 * Interface / Transporte de Rede (Transport & Entrypoint)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { handlers } = require("./rpcHandlers");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/opentype",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

if (!global.ROOT) global.ROOT = path.resolve(__dirname, "..");
if (!global.WWW_DIR) global.WWW_DIR = fs.existsSync(path.join(global.ROOT, "ui")) ? path.join(global.ROOT, "ui") : path.join(global.ROOT, "www");
if (!global.DATA_DIR) global.DATA_DIR = path.join(global.ROOT, "data");

global.lastClientHeartbeat = Date.now();
global.hasHadClient = false;
global.SESSION_START = Date.now();
global.SESSION_TOKEN = Math.random().toString(36).slice(2);

function terminateAllProcessesAndExit(reason) {
  console.log("[Shutdown] Encerramento solicitado (" + (reason || "App fechado") + "). Encerrando processos pertencentes ao OpenTranslator...");

  const ownedProcessManager = require("./core/ownedProcess");
  ownedProcessManager.terminateAll();

  if (global.launchedProc) {
    try { global.launchedProc.kill("SIGKILL"); } catch (e) {}
    global.launchedProc = null;
  }

  try {
    const { closeDb } = require("./cache");
    closeDb();
  } catch (e) {}

  setTimeout(() => {
    process.exit(0);
  }, 100);
}

process.on("SIGINT", () => terminateAllProcessesAndExit("SIGINT"));
process.on("SIGTERM", () => terminateAllProcessesAndExit("SIGTERM"));

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://localhost");
  const pathname = parsed.pathname;

  if (pathname === "/health" || pathname === "/api/health" || pathname === "/api/ping" || pathname === "/api/heartbeat") {
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ 
      ok: true, 
      status: "healthy",
      version: "1.0.0",
      node: process.version,
      pid: process.pid,
      token: global.SESSION_TOKEN 
    }));
    return;
  }

  if (pathname === "/api/close_app" || pathname === "/api/shutdown") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, message: "Encerrando aplicação e jogo..." }));
    
    // Tolerância para evitar fechar ao dar F5 no navegador:
    // Se um heartbeat/ping chegar em até 3000ms, cancela o encerramento!
    const shutdownRequestedAt = Date.now();
    setTimeout(() => {
      if (global.lastClientHeartbeat > shutdownRequestedAt) {
        console.log("[Shutdown] Cancelado: cliente reconectado após refresh (F5).");
        return;
      }
      terminateAllProcessesAndExit("Encerramento por solicitação do usuário");
    }, 2500);
    return;
  }

  if (pathname === "/api/rpc" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", async () => {
      let rpcMethod = "unknown";
      try {
        const parsed = JSON.parse(body);
        const method = parsed.method;
        const params = parsed.params;
        rpcMethod = method || "unknown";
        const handler = handlers[method];
        if (!handler) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ ok: false, error: "Unknown method: " + method })
          );
          return;
        }
        const result = await handler(params);
        const isErr =
          result && typeof result === "object" && result.ok === false;
        const httpCode = isErr ? 400 : 200;
        res.writeHead(httpCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(isErr ? result : { ok: true, data: result }));
      } catch (e) {
        const errorStack = e && e.stack ? e.stack : String(e);
        console.error(`[RPC ERROR in ${rpcMethod}] ${errorStack}`);
        if (global.log) {
          global.log("error", `[RPC Exception in ${rpcMethod}] ${errorStack}`);
        }
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: false, error: e.message, stack: errorStack }));
      }
    });
    return;
  }

  function serveStaticFile(targetFile, response) {
    const ext = path.extname(targetFile).toLowerCase();
    fs.readFile(targetFile, (err, data) => {
      if (err) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
      } else {
        response.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(data);
      }
    });
  }

  let cleanPath = "";
  try {
    cleanPath = decodeURIComponent(pathname.replace(/\0/g, ""));
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (cleanPath === "/favicon.ico") {
    const iconPath = path.join(global.WWW_DIR, "favicon.ico");
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(fs.readFileSync(iconPath));
      return;
    }
  }

  // 1. Diretório /resources/ isolado estritamente
  if (cleanPath.startsWith("/resources/")) {
    const resourcesDir = path.resolve(global.ROOT, "resources");
    const rel = cleanPath.slice("/resources/".length);
    const targetPath = path.resolve(resourcesDir, "." + path.normalize("/" + rel));
    if (!targetPath.toLowerCase().startsWith(resourcesDir.toLowerCase() + path.sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    return serveStaticFile(targetPath, res);
  }

  // 2. Diretório /loaders/ isolado estritamente
  if (cleanPath.startsWith("/loaders/")) {
    const loadersDir = path.resolve(global.ROOT, "loaders");
    const rel = cleanPath.slice("/loaders/".length);
    const targetPath = path.resolve(loadersDir, "." + path.normalize("/" + rel));
    if (!targetPath.toLowerCase().startsWith(loadersDir.toLowerCase() + path.sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    return serveStaticFile(targetPath, res);
  }

  // 3. Ativos web da interface (ui/)
  const wwwDir = path.resolve(global.WWW_DIR);
  const targetPath = path.resolve(wwwDir, "." + path.normalize(cleanPath === "/" ? "/index.html" : cleanPath));
  if (
    !targetPath.toLowerCase().startsWith(wwwDir.toLowerCase() + path.sep) &&
    targetPath.toLowerCase() !== path.join(wwwDir, "index.html").toLowerCase()
  ) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  return serveStaticFile(targetPath, res);
});

function tryListen(port) {
  server.removeAllListeners("error");
  server.listen(port, "127.0.0.1", () => {
    global.PORT = server.address().port;
    const PID_FILE = path.join(global.DATA_DIR, "server.pid");
    fs.writeFileSync(PID_FILE, String(process.pid));
    global.log(
      "success",
      "OpenTranslator server running on http://localhost:" + global.PORT
    );
    console.log(
      "OpenTranslator server running on http://localhost:" + global.PORT
    );
    const url = "http://localhost:" + global.PORT;
    if (process.argv.includes("--no-browser")) {
      global.log("info", "Navegador não iniciado automaticamente (--no-browser fornecido).");
      return;
    }
    const chromePaths = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Google\\Chrome\\Application\\chrome.exe"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Google\\Chrome\\Application\\chrome.exe"
      ),
      path.join(
        process.env.LocalAppData || "",
        "Google\\Chrome\\Application\\chrome.exe"
      ),
    ];
    const edgePaths = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Microsoft\\Edge\\Application\\msedge.exe"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Microsoft\\Edge\\Application\\msedge.exe"
      ),
    ];
    let chromePath = chromePaths.find((p) => fs.existsSync(p));
    let edgePath = edgePaths.find((p) => fs.existsSync(p));
    const browserPath = chromePath || edgePath;

    const userDataDir = path.join(
      process.env.LocalAppData || global.DATA_DIR,
      "OpenTranslatorProfile"
    );

    try {
      if (browserPath) {
          spawn(
            browserPath,
            [
              '--app=' + url,
              '--remote-debugging-port=9222',
              '--user-data-dir=' + userDataDir,
              '--window-size=1100,700',
              '--name=OpenTranslator',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding'
            ],
            {
              detached: true,
              stdio: "ignore",
              shell: false,
              windowsHide: false
            }
         );
       } else {
         spawn("cmd.exe", ["/c", "start", "", '"' + url + '"'], {
           detached: true,
           stdio: "ignore",
           shell: false
         });
       }
     } catch (e) {
       try {
         spawn("cmd.exe", ["/c", "start", "", '"' + url + '"'], {
           detached: true,
           stdio: "ignore",
           shell: false
         });
       } catch (err) {}
     }
  });
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Port " + port + " busy, trying " + (port + 1) + "..."
      );
      tryListen(port + 1);
    } else {
      console.error("Server error:", e.message);
    }
  });
}

module.exports = { server, tryListen };
