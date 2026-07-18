const whttp = require("http");
const WebSocket = require("ws");
const { translateBatch, translateSingle } = require("./translator");
const { loadGlossary, loadCfg } = require("./cache");

global.activeCheatSocket = null;
global.lastGameState = null;
global.pendingCheatCommands = [];
global.lastCheatPollTime = 0;

function startHookServer() {
  try {
    const hookHttpServer = whttp.createServer(async (req, res) => {
      const parsed = new URL(req.url, "http://localhost");
      const pathname = parsed.pathname;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        });
        res.end();
        return;
      }

      if (pathname === "/cheat_poll") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const state = JSON.parse(body);
            global.lastGameState = state;
            global.lastCheatPollTime = Date.now();
            global.log("success", "Cheat poll recebido do jogo com sucesso!");
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*",
            });
            res.end(JSON.stringify(global.pendingCheatCommands));
            global.pendingCheatCommands = [];
          } catch (e) {
            global.log("error", "Falha ao processar cheat poll: " + e.message);
            res.writeHead(400, {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*",
            });
            res.end("Invalid JSON");
          }
        });
        return;
      }

      if (
        pathname === "/translate" ||
        pathname === "/xbatch" ||
        pathname === "/batch"
      ) {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            let text = "";
            let texts = [];

            const queryText =
              parsed.searchParams.get("text") || parsed.searchParams.get("q");
            if (queryText) {
              text = queryText;
            } else if (body) {
              try {
                const data = JSON.parse(body);
                if (Array.isArray(data)) {
                  texts = data;
                } else if (Array.isArray(data.text)) {
                  texts = data.text;
                } else if (Array.isArray(data.texts)) {
                  texts = data.texts;
                } else {
                  text = data.text || data.original || data.q || "";
                }
              } catch (e) {
                const params = new URLSearchParams(body);
                text = params.get("text") || params.get("q") || body;
              }
            }

            const querySl =
              parsed.searchParams.get("from") ||
              parsed.searchParams.get("sl") ||
              parsed.searchParams.get("source");
            const queryTl =
              parsed.searchParams.get("to") ||
              parsed.searchParams.get("tl") ||
              parsed.searchParams.get("target");

            let reqSl = querySl;
            let reqTl = queryTl;

            if (body && (!reqSl || !reqTl)) {
              try {
                const data = JSON.parse(body);
                reqSl =
                  reqSl ||
                  data.from ||
                  data.sl ||
                  data.source ||
                  data.source_lang;
                reqTl =
                  reqTl ||
                  data.to ||
                  data.tl ||
                  data.target ||
                  data.target_lang;
              } catch (e) {
                const params = new URLSearchParams(body);
                reqSl =
                  reqSl ||
                  params.get("from") ||
                  params.get("sl") ||
                  params.get("source");
                reqTl =
                  reqTl ||
                  params.get("to") ||
                  params.get("tl") ||
                  params.get("target");
              }
            }

            const cfg = loadCfg();
            const sl = reqSl || cfg.sl || "auto";
            const tl = reqTl || cfg.tl || "pt";
            const engine = cfg.engine || "google";

            if (texts.length > 0) {
              global.log(
                "info",
                "Hook HTTP Batch translating " + texts.length + " items"
              );
              const glossary = loadGlossary();
              const formattedTexts = texts.map((t, idx) => ({
                id: idx,
                clean: t,
                original: t,
              }));
              const translatedMap = await translateBatch(
                formattedTexts,
                sl,
                tl,
                engine,
                glossary
              );
              const responseTexts = texts.map(
                (t, idx) => translatedMap.get(idx) || t
              );
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  translations: responseTexts.map((tr, idx) => ({
                    original: texts[idx],
                    translated: tr,
                  })),
                  text: responseTexts,
                })
              );
            } else if (text) {
              global.log("info", 'Hook HTTP Translating: "' + text + '"');
              const translated = await translateSingle(text, sl, tl, engine);
              global.log("info", 'Hook HTTP Translated: "' + translated + '"');
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  translated: translated,
                  text: translated,
                })
              );
            } else {
              res.writeHead(400);
              res.end("Empty request");
            }
          } catch (err) {
            res.writeHead(500);
            res.end(err.message);
          }
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });

    const hookWss = new WebSocket.Server({ server: hookHttpServer });
    hookWss.on("error", (e) => {
      global.log("error", "WS Hook Server error: " + e.message);
      console.error("WS Hook Server error:", e.message);
    });
    hookWss.on("connection", (ws) => {
      global.log("info", "Game hook connected via WebSocket to 16005");
      ws.on("message", async (message) => {
        try {
          const msgStr = message.toString();
          let data;
          try {
            data = JSON.parse(msgStr);
          } catch (e) {
            data = msgStr;
          }

          if (data && typeof data === "object") {
            if (data.type === "register_cheat_client") {
              global.activeCheatSocket = ws;
              global.log(
                "success",
                "Cheat overlay client registered successfully on WebSocket 16005"
              );
              return;
            }
            if (data.type === "game_state") {
              global.lastGameState = data;
              return;
            }
          }

          global.log("info", "WS Hook Received: " + msgStr);

          let text = "";
          if (typeof data === "string") {
            text = data;
          } else if (data && typeof data === "object") {
            text = data.text || data.original || data.q || "";
          }

          if (text) {
            const cfg = loadCfg();
            const sl = cfg.sl || "auto";
            const tl = cfg.tl || "pt";
            const engine = cfg.engine || "google";

            const translated = await translateSingle(text, sl, tl, engine);
            global.log("info", 'WS Hook Translated: "' + translated + '"');

            let response;
            if (typeof data === "object") {
              response = {
                ...data,
                translated: translated,
                text: translated,
              };
            } else {
              response = {
                original: text,
                translated: translated,
                text: translated,
              };
            }
            ws.send(JSON.stringify(response));
          }
        } catch (err) {
          global.log("error", "WS Hook error: " + err.message);
        }
      });
      ws.on("close", () => {
        global.log("info", "Game hook WebSocket connection closed");
        if (ws === global.activeCheatSocket) {
          global.activeCheatSocket = null;
          global.lastGameState = null;
        }
      });
    });
    hookHttpServer.on("error", (e) => {
      global.log("error", "Dual Hook Server error: " + e.message);
      console.error("Dual Hook Server error:", e.message);
    });

    hookHttpServer.listen(16005, "127.0.0.1", () => {
      global.log("success", "Dual Hook Server listening on port 16005");
    });
  } catch (e) {
    global.log("error", "Failed to initialize Dual Hook Server: " + e.message);
  }
}

module.exports = {
  startHookServer
};
