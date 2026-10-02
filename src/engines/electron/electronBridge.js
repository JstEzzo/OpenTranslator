/**
 * OpenTranslator — Electron Runtime Bridge 2.0
 * Bridge local seguro (localhost, random token) e script de injeção para observação de DOM e frameworks web.
 */

const http = require("http");
const crypto = require("crypto");

class ElectronBridge {
  constructor() {
    this.port = 16008;
    this.token = crypto.randomBytes(16).toString("hex");
    this.server = null;
    this.textCache = new Map();
  }

  start() {
    if (this.server) return { port: this.port, token: this.token };

    this.server = http.createServer((req, res) => {
      // Bloqueia conexões externas (apenas localhost permitido)
      const ip = req.socket.remoteAddress;
      if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
        res.writeHead(403);
        return res.end("Forbidden");
      }

      // Validação de Token de Segurança
      const auth = req.headers["authorization"] || "";
      if (auth !== "Bearer " + this.token) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }

      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const url = req.url;

          if (url === "/ping") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, status: "alive" }));
          }

          if (url === "/dom/text") {
            // Recebe nós de texto capturados do DOM
            const texts = payload.texts || [];
            for (const t of texts) {
              if (t.id && t.text) {
                this.textCache.set(t.id, t.text);
              }
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, received: texts.length }));
          }

          res.writeHead(404);
          res.end("Not Found");
        } catch (e) {
          res.writeHead(500);
          res.end(e.message);
        }
      });
    });

    this.server.listen(this.port, "127.0.0.1");
    return { port: this.port, token: this.token };
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /**
   * Gera o script de injeção que roda dentro do renderer do Electron.
   * Utiliza MutationObserver inteligente para evitar re-traduções infinitas.
   */
  getInjectionScript() {
    return `
(function() {
  if (window.__OT_INJECTED__) return;
  window.__OT_INJECTED__ = true;
  const bridgeUrl = 'http://127.0.0.1:${this.port}';
  const token = '${this.token}';
  const seenNodes = new WeakSet();

  function scanNode(node) {
    if (!node || seenNodes.has(node)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent ? node.textContent.trim() : '';
      if (txt.length > 1 && !/^[0-9\s.,:;!?\-_]+$/.test(txt)) {
        seenNodes.add(node);
        sendTexts([{ id: Math.random().toString(36).substring(2), text: txt }]);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'svg') return;
      // Shadow DOM Support
      if (node.shadowRoot) {
        scanNode(node.shadowRoot);
      }
      for (const child of node.childNodes) {
        scanNode(child);
      }
    }
  }

  function sendTexts(texts) {
    if (!texts.length) return;
    fetch(bridgeUrl + '/dom/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ texts })
    }).catch(function() {});
  }

  const observer = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const added of m.addedNodes) scanNode(added);
      } else if (m.type === 'characterData') {
        scanNode(m.target);
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  scanNode(document.body);
  console.log('[OpenTranslator Bridge] DOM Observer Ativado.');
})();
`;
  }
}

module.exports = new ElectronBridge();
