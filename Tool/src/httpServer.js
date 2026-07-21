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

setInterval(() => {
  if (!global.hasHadClient) return;
  if (Date.now() - global.lastClientHeartbeat > 7000) {
    if (typeof global.shutdownAll === "function") {
      global.shutdownAll("Nenhuma janela de UI ativa por mais de 7s");
    }
  }
}, 3000);

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
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/api/shutdown") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, message: "Encerrando servidor..." }));
    if (typeof global.shutdownAll === "function") {
      setTimeout(() => global.shutdownAll("Fechamento via janela do usuário"), 100);
    }
    return;
  }

  if (pathname === "/api/rpc" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
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
        fs.readFile(
          path.join(global.ROOT, pathname.replace(/^\//, "")),
          (e2, d2) => {
            if (e2) {
              res.writeHead(404);
              res.end("Not found");
            } else {
              res.writeHead(200, {
                "Content-Type": MIME[ext] || "application/octet-stream",
              });
              res.end(d2);
            }
          }
        );
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
    });
    res.end(data);
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

    try {
      if (chromePath) {
        exec(
          'start "" "' +
            chromePath +
            '" --app="' +
            url +
            '" --window-size=960,660'
        );
      } else if (edgePath) {
        exec(
          'start "" "' +
            edgePath +
            '" --app="' +
            url +
            '" --window-size=960,660'
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
