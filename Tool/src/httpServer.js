const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
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

global.lastClientHeartbeat = Date.now();
global.hasHadClient = false;
global.SESSION_START = Date.now();
global.SESSION_TOKEN = Math.random().toString(36).slice(2);

function terminateAllProcessesAndExit(reason) {
  console.log(`[Shutdown] Encerramento solicitado (${reason || "App fechado"}). Matando todos os processos...`);

  if (global.launchedProc) {
    try {
      global.launchedProc.kill("SIGKILL");
    } catch (e) {}
    global.launchedProc = null;
  }

  if (global.launchedPid) {
    try {
      const { execSync } = require("child_process");
      execSync(`taskkill /F /PID ${global.launchedPid} /T`, { stdio: "ignore" });
    } catch (e) {}
    global.launchedPid = null;
  }

  if (global.launchedGameExe && fs.existsSync(global.launchedGameExe)) {
    try {
      const { execSync } = require("child_process");
      const exeName = path.basename(global.launchedGameExe);
      execSync(`taskkill /F /IM "${exeName}" /T`, { stdio: "ignore" });
    } catch (e) {}
  }

  const auxiliaryExes = ["inject.exe", "PIDDLLInject64.exe", "JoyCon2Mapper.exe", "BakinLauncher.exe"];
  auxiliaryExes.forEach((exe) => {
    try {
      const { execSync } = require("child_process");
      execSync(`taskkill /F /IM "${exe}" /T`, { stdio: "ignore" });
    } catch (e) {}
  });

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

  if (pathname === "/api/ping" || pathname === "/api/heartbeat") {
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, token: global.SESSION_TOKEN }));
    return;
  }

  if (pathname === "/api/close_app" || pathname === "/api/shutdown") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, message: "Encerrando aplicação e jogo..." }));
    terminateAllProcessesAndExit("Encerramento por solicitação do usuário");
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
      try {
        const { method, params } = JSON.parse(body);
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
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (pathname === "/favicon.ico") {
    const iconPath = path.join(global.WWW_DIR, "favicon.ico");
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(fs.readFileSync(iconPath));
      return;
    }
  }

  let filePath = path.join(
    global.WWW_DIR,
    pathname === "/" ? "index.html" : pathname
  );
  filePath = path.normalize(filePath);
  if (
    !filePath.startsWith(global.WWW_DIR + path.sep) &&
    filePath !== global.WWW_DIR &&
    !pathname.startsWith("/resources/") &&
    !pathname.startsWith("/loaders/")
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (
        pathname.startsWith("/loaders/") ||
        pathname.startsWith("/resources/")
      ) {
        const targetPath = path.normalize(
          path.join(global.ROOT, pathname.replace(/^\//, ""))
        );
        if (
          !targetPath.startsWith(global.ROOT + path.sep) &&
          targetPath !== global.ROOT
        ) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        fs.readFile(targetPath, (e2, d2) => {
          if (e2) {
            res.writeHead(404);
            res.end("Not found");
          } else {
            res.writeHead(200, {
              "Content-Type": MIME[ext] || "application/octet-stream",
            });
            res.end(d2);
          }
        });
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    } else {
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
      });
      res.end(data);
    }
  });
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
        exec(
          '"' +
            browserPath +
            '" --app="' +
            url +
            '" --user-data-dir="' +
            userDataDir +
            '" --window-size=1100,700 --name="OpenTranslator"'
        );
      } else {
        exec('start "" "' + url + '"');
      }
    } catch (e) {
      try {
        exec('start "" "' + url + '"');
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
