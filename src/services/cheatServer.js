/**
 * cheatServer.js — Servidor de Telemetria em Tempo Real, Hooking e Cheat Engine
 *
 * Responsabilidades:
 * - WebSocket e HTTP Server para comunicação bidirecional com overlays injetados (CheatOverlay, XUnity, etc.)
 * - Polling de estado de memória e aplicação de cheats em runtime (/cheat_poll)
 * - Endpoint local /xbatch e /translate para tradução on-the-fly de strings capturadas na RAM
 *
 * Camada Arquitetural:
 * Comunicação & Runtime Hooks (Runtime Hook Server & IPC)
 */

'use strict';

const whttp = require("http");
const WebSocket = require("ws");
const { translateSingle } = require("../translation/translator");
const { loadGlossary, loadCfg } = require("./cache");
const RuntimeTextManager = require("../core/runtimeTextManager");

global.activeCheatSocket = null;
global.lastGameState = null;
global.pendingCheatCommands = [];
global.lastCheatPollTime = 0;

let hookHttpServer = null;
let hookWss = null;
const activeWsClients = new Set();

/** Logger seguro que não lança se global.log não estiver configurado. */
function safeLog(level, msg) {
  if (typeof global.log === 'function') {
    global.log(level, msg);
  }
}

/**
 * Valida se a origem da requisição HTTP é local/legítima para o modelo desktop.
 * - Clientes nativos locais (C# XUnity, Python Ren'Py, DLLs de hook, curl) não enviam Origin: permitido.
 * - Loopback local (127.0.0.1 / localhost em qualquer porta): permitido.
 * - Esquemas de aplicativo de jogos (app://, file://, chrome-extension://, vscode-webview://): permitido.
 * - Origem "null":
 *   - Se vier acompanhada de 'sec-fetch-site': 'cross-site' (iframe sandbox em site externo hostil), é bloqueada.
 *   - Se não for cross-site (ambiente local file:///), é permitida para compatibilidade com NW.js.
 * - Origens web remotas (http://evil.com, https://attacker.org): bloqueadas (HTTP 403).
 */
function isAllowedHookOrigin(origin, req) {
  if (!origin) return true;
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return true;
  if (/^(app|file|chrome-extension|vscode-webview):\/\//i.test(origin)) return true;
  if (origin === "null") {
    const secFetchSite = req && req.headers ? req.headers['sec-fetch-site'] : null;
    if (secFetchSite === 'cross-site') {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Valida a origem no handshake do WebSocket (HTTP Upgrade).
 * - Clientes nativos sem Origin (DLLs C++, loaders .NET): permitidos.
 * - Loopback oficial (127.0.0.1 / localhost): permitido (UI do OpenTranslator).
 * - Esquemas de engine (app://, file://, chrome-extension://): permitidos (NW.js / Electron).
 * - Origem "null": REJEITADA no WebSocket! Em navegadores, "null" no handshake WS é
 *   originado por sandboxed iframes de páginas externas. Clientes legítimos de WS
 *   usam loopback, esquemas de app ou são nativos sem Origin.
 * - Origens remotas web: REJEITADAS.
 */
function isAllowedWsOrigin(origin, req) {
  if (!origin) return true;
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return true;
  if (/^(app|file|chrome-extension|vscode-webview):\/\//i.test(origin)) return true;
  return false;
}

/**
 * Aplica headers CORS centralizados e proporcionais.
 * Permite origens locais legítimas; nega emissão para origens remotas de terceiros.
 */
function applyHookCors(req, res) {
  const origin = req.headers ? req.headers.origin : null;
  if (isAllowedHookOrigin(origin, req)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-OpenTranslator-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    return true;
  }
  return false;
}

/**
 * Extrai texto, lote de textos e idiomas de forma unificada e sem parsing redundante.
 */
function parseTranslationPayload(body, searchParams) {
  let text = searchParams.get("text") || searchParams.get("q") || "";
  let texts = [];
  let reqSl = searchParams.get("from") || searchParams.get("sl") || searchParams.get("source");
  let reqTl = searchParams.get("to") || searchParams.get("tl") || searchParams.get("target");

  if (body) {
    try {
      const data = JSON.parse(body);
      if (Array.isArray(data)) {
        texts = data;
      } else if (data && typeof data === "object") {
        if (Array.isArray(data.text)) texts = data.text;
        else if (Array.isArray(data.texts)) texts = data.texts;
        else if (!text) text = data.text || data.original || data.q || "";

        reqSl = reqSl || data.from || data.sl || data.source || data.source_lang;
        reqTl = reqTl || data.to || data.tl || data.target || data.target_lang;
      }
    } catch {
      try {
        const params = new URLSearchParams(body);
        if (!text) text = params.get("text") || params.get("q") || body;
        reqSl = reqSl || params.get("from") || params.get("sl") || params.get("source");
        reqTl = reqTl || params.get("to") || params.get("tl") || params.get("target");
      } catch {
        if (!text) text = body;
      }
    }
  }

  return { text, texts, reqSl, reqTl };
}

function startHookServer(port = 16005, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    try {
      hookHttpServer = whttp.createServer(async (req, res) => {
        let parsed;
        try {
          parsed = new URL(req.url, "http://localhost");
        } catch (_) {
          res.writeHead(400);
          res.end("Invalid URL");
          return;
        }
        const pathname = parsed.pathname;

        const originAllowed = applyHookCors(req, res);
        if (!originAllowed) {
          res.writeHead(403);
          res.end("Forbidden origin");
          return;
        }

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (pathname === "/cheat_poll") {
          let body = "";
          req.on("data", (c) => {
            body += c;
            if (body.length > 10 * 1024 * 1024) {
              res.writeHead(413);
              res.end("Payload too large");
              req.destroy();
            }
          });
          req.on("end", () => {
            if (res.writableEnded) return;
            try {
              const safeBody = body
                .replace(/:\s*Infinity\b/gi, ": 9999999")
                .replace(/:\s*-Infinity\b/gi, ": -9999999")
                .replace(/:\s*NaN\b/gi, ": 0");
              const state = JSON.parse(safeBody);
              if (!global.lastGameState) {
                safeLog("success", "CheatOverlay conectado! Menu de cheats ativo.");
              }
              if (state && Array.isArray(state.audit)) {
                state.audit.forEach(item => {
                  safeLog("success", `[RAM Audit] 🎯 Item '${item.key}': RAM value mutated from ${item.old} to ${item.new} (Frozen at ${item.val})`);
                });
              }
              global.lastGameState = state;
              global.lastCheatPollTime = Date.now();
              const commandsToSend = global.pendingCheatCommands.splice(
                0,
                global.pendingCheatCommands.length
              );
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(commandsToSend));
            } catch (e) {
              safeLog("error", "Falha ao processar cheat poll: " + e.message);
              res.writeHead(400);
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
          req.on("data", (c) => {
            body += c;
            if (body.length > 20 * 1024 * 1024) {
              res.writeHead(413);
              res.end("Payload too large");
              req.destroy();
            }
          });
          req.on("end", async () => {
            if (res.writableEnded) return;
            try {
              const { text, texts, reqSl, reqTl } = parseTranslationPayload(body, parsed.searchParams);

              const cfg = loadCfg();
              const sl = reqSl || cfg.sl || "auto";
              const tl = reqTl || cfg.tl || "pt";
              const engine = cfg.engine || "multi";

              const rtm = RuntimeTextManager.getInstance();

              if (texts.length > 0) {
                safeLog(
                  "info",
                  `📦 [TRADUÇÃO TEMPO REAL LOTE] Processando ${texts.length} itens via RuntimeTextManager...`
                );
                loadGlossary();
                const responseTexts = [];

                for (const itemText of texts) {
                  const result = await rtm.processRuntimeText(
                    itemText,
                    { engine: "runtime", origin: "dual_hook_batch" },
                    async (protectedStr) => {
                      return translateSingle(protectedStr, sl, tl, engine);
                    }
                  );
                  responseTexts.push(result.translated);
                }

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
                const result = await rtm.processRuntimeText(
                  text,
                  { engine: "runtime", origin: "dual_hook_http" },
                  async (protectedStr) => {
                    return translateSingle(protectedStr, sl, tl, engine);
                  }
                );

                const translated = result.translated;
                if (!result.fromCache && !result.skipped) {
                  safeLog(
                    "success",
                    `💬 [TEMPO REAL] "${text}" ➔ 🌐 "${translated}" (${sl.toUpperCase()} ➔ ${tl.toUpperCase()} | Motor: ${engine.toUpperCase()})`
                  );
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    status: "success",
                    translated: translated,
                    text: translated,
                    fromCache: result.fromCache
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

      hookWss = new WebSocket.Server({
        server: hookHttpServer,
        maxPayload: 10 * 1024 * 1024,
        verifyClient: (info, callback) => {
          const origin = info.origin || (info.req && info.req.headers ? info.req.headers.origin : null);
          const allowed = isAllowedWsOrigin(origin, info.req);
          if (typeof callback === 'function') {
            callback(allowed, allowed ? 200 : 403, allowed ? 'OK' : 'Forbidden WebSocket Origin');
          }
          return allowed;
        }
      });

      hookWss.on("error", (e) => {
        safeLog("error", "WS Hook Server error: " + e.message);
      });

      hookWss.on("connection", (ws) => {
        activeWsClients.add(ws);
        safeLog("info", "Game hook connected via WebSocket to " + port);
        ws.on("message", async (message) => {
          try {
            const msgStr = message.toString();
            let data;
            try {
              data = JSON.parse(msgStr);
            } catch {
              data = msgStr;
            }

            if (data && typeof data === "object") {
              if (data.type === "register_cheat_client") {
                global.activeCheatSocket = ws;
                global.lastCheatPollTime = Date.now();
                safeLog(
                  "success",
                  "Cheat overlay client registered successfully on WebSocket " + port
                );
                return;
              }
              if (data.type === "game_state") {
                global.lastGameState = data;
                global.lastCheatPollTime = Date.now();
                return;
              }
            }

            safeLog("info", "WS Hook Received: " + msgStr);

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
              const engine = cfg.engine || "multi";

              const rtm = RuntimeTextManager.getInstance();

              const result = await rtm.processRuntimeText(
                text,
                { engine: "runtime", origin: "dual_hook_ws" },
                async (protectedStr) => {
                  return translateSingle(protectedStr, sl, tl, engine);
                }
              );

              const translated = result.translated;
              if (!result.fromCache && !result.skipped) {
                safeLog("info", 'WS Hook Translated: "' + translated + '"');
              }

              let response;
              if (typeof data === "object") {
                response = {
                  ...data,
                  translated: translated,
                  text: translated,
                  fromCache: result.fromCache
                };
              } else {
                response = {
                  original: text,
                  translated: translated,
                  text: translated,
                  fromCache: result.fromCache
                };
              }
              ws.send(JSON.stringify(response));
            }
          } catch (err) {
            safeLog("error", "WS Hook error: " + err.message);
          }
        });
        ws.on("close", () => {
          activeWsClients.delete(ws);
          safeLog("info", "Game hook WebSocket connection closed");
          if (ws === global.activeCheatSocket) {
            global.activeCheatSocket = null;
            global.lastGameState = null;
          }
        });
      });

      hookHttpServer.on("error", (e) => {
        if (e.code === "EADDRINUSE") {
          safeLog("warn", `Dual Hook Server: Porta ${port} já está em uso por uma instância ativa. Nao foi possivel iniciar o servidor de hooks.`);
        } else {
          safeLog("error", "Dual Hook Server error: " + e.message);
        }
        reject(e);
      });

      hookHttpServer.listen(port, host, () => {
        safeLog("success", `Dual Hook Server listening on port ${port}`);
        resolve({ server: hookHttpServer, wss: hookWss });
      });
    } catch (e) {
      safeLog("warn", "Dual Hook Server status: " + e.message);
      reject(e);
    }
  });
}

function stopHookServer(callback) {
  for (const ws of activeWsClients) {
    try {
      ws.terminate();
    } catch (e) { safeLog("warn", `cheatServer: ${e.message}`); }
  }
  activeWsClients.clear();

  if (global.activeCheatSocket) {
    try {
      global.activeCheatSocket.terminate();
    } catch (e) { safeLog("warn", `cheatServer: ${e.message}`); }
    global.activeCheatSocket = null;
  }
  if (hookWss) {
    try {
      hookWss.close();
    } catch (e) { safeLog("warn", `cheatServer: ${e.message}`); }
    hookWss = null;
  }
  if (hookHttpServer) {
    const s = hookHttpServer;
    hookHttpServer = null;
    try {
      s.close(callback);
    } catch (e) {
      safeLog("warn", `cheatServer: ${e.message}`);
      if (typeof callback === 'function') callback();
    }
  } else if (typeof callback === 'function') {
    callback();
  }
}

module.exports = {
  startHookServer,
  stopHookServer,
  isAllowedHookOrigin,
  isAllowedWsOrigin,
  applyHookCors,
  parseTranslationPayload,
};
