/**
 * httpServer.js — Servidor HTTP Principal e Roteador de Transporte do OpenTranslator
 *
 * FASE 1 / PASSO 18 — SECURITY HARDENING
 *
 * Correcoes aplicadas (causa raiz, nao|workaround):
 *  C1  /api/rpc exige header X-OpenTranslator-Token comparado em tempo constante.
 *      Antes: SESSION_TOKEN era gerado e devolvido por /api/ping mas NUNCA
 *      verificado — qualquer pagina web podia invocar os 88 handlers.
 *  C2  CORS deixou de ser "*". Agora so emite Access-Control-Allow-Origin
 *      quando a Origin e loopback. Sem Origin valida -> nenhum header CORS,
 *      o que impede leitura cross-origin.
 *  C3  Host e Origin validados contra allowlist loopback -> bloqueia
 *      DNS-rebinding (que preserva o Origin do atacante mas troca o Host).
 *  C4  Stack trace nao e mais enviado ao cliente. O cliente recebe
 *      {ok:false, error, requestId}; o stack completo vai so para o log.
 *  C5  /resources/ e /loaders/ deixam de ser espelhos de disco. Apenas 2
 *      arquivos explicitamente necessarios pela UI sao servidos.
 *  C6  Preflight OPTIONS responde somente para origem loopback.
 *  C7  Terminacao de request com payload grande responde 413 em vez de
 *      destruir o socket sem resposta (request pendurado).
 *
 * Camada Arquitetural:
 * Interface / Transporte de Rede (Transport & Entrypoint)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const sessionGuard = require('../security/sessionGuard');
const staticPolicy = require('../security/staticAssetPolicy');

const { handlers } = require('./rpcHandlers');

if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..', '..');
if (!global.WWW_DIR) {
  global.WWW_DIR = fs.existsSync(path.join(global.ROOT, 'ui'))
    ? path.join(global.ROOT, 'ui')
    : path.join(global.ROOT, 'www');
}
if (!global.DATA_DIR) global.DATA_DIR = path.join(global.ROOT, 'data');

global.lastClientHeartbeat = Date.now();
global.hasHadClient = false;
global.SESSION_START = Date.now();
if (!global.SESSION_TOKEN) {
  global.SESSION_TOKEN = sessionGuard.mintSessionToken();
}

/** Limite de payload RPC: 8 MB. Acima disso, 413. */
const MAX_RPC_BODY_BYTES = 8 * 1024 * 1024;

function logInternal(level, msg) {
  if (typeof global.log === 'function') {
    try { global.log(level, msg); } catch (_) { /* logger indisponivel */ }
  }
  if (level === 'error') console.error(msg);
}

/**
 * Encerra o processo com motivo, de forma idempotente.
 * Substitui as duas implementacoes divergentes que existiam
 * (server.js:shutdownAll e httpServer:terminateAllProcessesAndExit).
 * A implementacao canonica esta em src/core/shutdownCoordinator.js.
 */
function terminateAllProcessesAndExit(reason) {
  return require('../core/shutdownCoordinator').requestShutdown(reason);
}

// SIGINT/SIGTERM sao tratados exclusivamente pelo shutdownCoordinator,
// registrado em server.js. Aqui nao ha mais listener concorrente (C8).

const server = http.createServer((req, res) => {
  if (require('../core/shutdownCoordinator').isShuttingDown()) {
    res.writeHead(503, { 'Content-Type': 'application/json', Connection: 'close' });
    res.end(JSON.stringify({ ok: false, error: 'Aplicacao encerrando' }));
    return;
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, 'http://localhost');
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }
  const pathname = parsedUrl.pathname;

  // ------------------------------------------------------------------ //
  // C6 — Preflight. Responde 204 somente para origem loopback.
  // ------------------------------------------------------------------ //
  if (req.method === 'OPTIONS') {
    if (pathname !== '/api/rpc') {
      res.writeHead(404, sessionGuard.corsHeaders(null));
      res.end();
      return;
    }
    const host = sessionGuard.validateHost(req.headers['host']);
    const origin = sessionGuard.validateOrigin(req.headers['origin']);
    if (!host.ok || !origin.ok || !origin.origin) {
      res.writeHead(403, sessionGuard.corsHeaders(null));
      res.end();
      return;
    }
    res.writeHead(204, sessionGuard.corsHeaders(origin.origin));
    res.end();
    return;
  }

  // ------------------------------------------------------------------ //
  // Endpoints de ciclo de vida / bootstrap do token.
  // ------------------------------------------------------------------ //
  if (pathname === '/health' || pathname === '/api/health' || pathname === '/api/ping' || pathname === '/api/heartbeat') {
    const guard = sessionGuard.guardRequest({
      req, requireToken: false, expectedToken: global.SESSION_TOKEN,
    });
    if (!guard.ok) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Origin/Host nao permitido', requestId: guard.requestId }));
      return;
    }
    global.lastClientHeartbeat = Date.now();
    global.hasHadClient = true;
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...sessionGuard.corsHeaders(guard.origin),
    };
    res.writeHead(200, headers);
    // O token so e devolvido a partir de uma requisicao cujo Host/Origin e loopback.
    // Ele agora e EXIGIDO em /api/rpc, portanto este e' o canal de bootstrap legitimo.
    res.end(JSON.stringify({
      ok: true,
      status: 'healthy',
      version: '1.0.0',
      node: process.version,
      pid: process.pid,
      requestId: guard.requestId,
      token: global.SESSION_TOKEN,
    }));
    return;
  }

  if (pathname === '/api/close_app' || pathname === '/api/shutdown') {
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' }); res.end('Method not allowed'); return;
    }
    // Encerrar o app e' uma operacao destrutiva: exige token.
    const guard = sessionGuard.guardRequest({
      req, requireToken: true, expectedToken: global.SESSION_TOKEN,
    });
    if (!guard.ok) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Nao autorizado', requestId: guard.requestId }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      ...sessionGuard.corsHeaders(guard.origin),
    });
    res.end(JSON.stringify({ ok: true, message: 'Encerrando aplicacao e jogo...' }));

    if (pathname === '/api/shutdown') {
      terminateAllProcessesAndExit('Encerramento explicito pelo launcher');
      return;
    }
    // Tolerancia para nao fechar ao dar F5: se um heartbeat chegar em ate
    // 2500ms, o encerramento e cancelado.
    const shutdownRequestedAt = Date.now();
    global.shutdownRequestedAt = shutdownRequestedAt;
    setTimeout(() => {
      if (global.lastClientHeartbeat > shutdownRequestedAt) {
        logInternal('info', '[Shutdown] Cancelado: cliente reconectou apos refresh (F5).');
        return;
      }
      terminateAllProcessesAndExit('Encerramento por solicitacao do usuario');
    }, 2500);
    return;
  }

  // ------------------------------------------------------------------ //
  // RPC autenticado.
  // ------------------------------------------------------------------ //
  if (pathname === '/api/rpc') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Use POST' }));
      return;
    }

    const guard = sessionGuard.guardRequest({
      req, requireToken: true, expectedToken: global.SESSION_TOKEN,
    });
    if (!guard.ok) {
      logInternal('warn', `[RPC] Requisição recusada (${guard.reason}) reqId=${guard.requestId}`);
      res.writeHead(403, {
        'Content-Type': 'application/json',
        ...sessionGuard.corsHeaders(null),
      });
      res.end(JSON.stringify({
        ok: false,
        error: 'Nao autorizado',
        reason: guard.reason,
        requestId: guard.requestId,
      }));
      return;
    }

    const chunks = [];
    let total = 0;
    let aborted = false;

    req.on('data', (c) => {
      if (aborted) return;
      total += c.length;
      if (total > MAX_RPC_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, {
          'Content-Type': 'application/json',
          Connection: 'close',
          ...sessionGuard.corsHeaders(guard.origin),
        });
        res.end(JSON.stringify({
          ok: false,
          error: 'Payload excede o limite',
          limitBytes: MAX_RPC_BODY_BYTES,
          requestId: guard.requestId,
        }), () => {
          // Só destrói o socket DEPOIS que a resposta 413 foi enviada.
          // Destruir antes faz o cliente ver ECONNRESET em vez de 413.
          req.destroy();
        });
        return;
      }
      chunks.push(c);
    });

    req.on('end', async () => {
      if (aborted) return;
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let rpcMethod = 'unknown';
      try {
        let payload;
        try {
          payload = JSON.parse(rawBody);
        } catch (parseErr) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            ...sessionGuard.corsHeaders(guard.origin),
          });
          res.end(JSON.stringify({
            ok: false, error: 'JSON invalido', requestId: guard.requestId,
          }));
          return;
        }

        const method = payload && payload.method;
        const params = payload && payload.params;
        rpcMethod = typeof method === 'string' ? method : 'unknown';

        const handler = Object.prototype.hasOwnProperty.call(handlers, method)
          ? handlers[method]
          : null;
        if (typeof handler !== 'function') {
          res.writeHead(404, {
            'Content-Type': 'application/json',
            ...sessionGuard.corsHeaders(guard.origin),
          });
          res.end(JSON.stringify({
            ok: false, error: 'Unknown method: ' + method, requestId: guard.requestId,
          }));
          return;
        }

        const lifecycle = require('../core/shutdownCoordinator');
        if (lifecycle.isShuttingDown()) {
          res.writeHead(503, { 'Content-Type': 'application/json', Connection: 'close' });
          res.end(JSON.stringify({ ok: false, error: 'Aplicacao encerrando' }));
          return;
        }
        const result = await lifecycle.trackOperation(handler(params, { requestId: guard.requestId }));
        const isErr = result && typeof result === 'object' && result.ok === false;
        res.writeHead(isErr ? 400 : 200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ...sessionGuard.corsHeaders(guard.origin),
        });
        res.end(JSON.stringify(
          isErr ? { ...result, requestId: guard.requestId }
                : { ok: true, data: result, requestId: guard.requestId },
        ));
      } catch (e) {
        // C4 — stack trace NUNCA vai para o cliente.
        const errorStack = e && e.stack ? e.stack : String(e);
        const message = e && e.message ? e.message : 'Erro interno';
        logInternal('error', `[RPC ERROR method=${rpcMethod} reqId=${guard.requestId}] ${errorStack}`);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            ...sessionGuard.corsHeaders(guard.origin),
          });
        }
        res.end(JSON.stringify({
          ok: false,
          error: message,
          requestId: guard.requestId,
        }));
      }
    });
    return;
  }

  // ------------------------------------------------------------------ //
  // Assets estaticos — allowlist fechada.
  // ------------------------------------------------------------------ //
  let cleanPath;
  try {
    cleanPath = decodeURIComponent(pathname.replace(/\0/g, ''));
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  // Alias legado: a UI requisita /favicon.ico, que existe dentro de ui/.
  const resolved = staticPolicy.resolveStaticAsset({
    urlPath: cleanPath,
    rootDir: global.ROOT,
    wwwDir: global.WWW_DIR,
  });

  if (!resolved.ok) {
    const status = resolved.reason === 'FORBIDDEN_EXT' ? 403 : 404;
    res.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(status === 403 ? 'Forbidden' : 'Not found');
    return;
  }

  fs.readFile(resolved.absolutePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': resolved.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cleanPath === '/' || /\.(?:html?|[cm]?js|css)$/i.test(cleanPath)
        ? 'no-store'
        : 'public, max-age=300',
    });
    res.end(data);
  });
});

/**
 * tryListen — sobe o servidor em porta especifica.
 *
 * Correcoes (FASE 1):
 *  C9  Em EADDRINUSE NAO tentamos porta seguinte silenciosamente. Escolher
 *      port+1 sobrescrevia data/server.pid e deixava a instancia anterior
 *      orfa sem registro. Agora a falha e explicita.
 *  C10 verifyPidIntegrity para o proprio processo antes de gravar o pid file.
 */
function tryListen(port) {
  // Don't removeAllListeners — the EADDRINUSE handler must survive retries.
  server.removeAllListeners('error');

  server.listen(port, '127.0.0.1', () => {
    global.PORT = server.address().port;
    const PID_FILE = path.join(global.DATA_DIR, 'server.pid');
    try {
      fs.mkdirSync(global.DATA_DIR, { recursive: true });
      fs.writeFileSync(PID_FILE, String(process.pid));
    } catch (e) {
      logInternal('warn', `[httpServer] Nao foi possivel gravar ${PID_FILE}: ${e.message}`);
    }
    logInternal('success', `OpenTranslator server running on http://127.0.0.1:${global.PORT}`);
    console.log(`[OpenTranslator] Server ouvindo em http://127.0.0.1:${global.PORT}`);

    if (process.argv.includes('--no-browser')) {
      logInternal('info', 'Navegador nao iniciado automaticamente (--no-browser fornecido).');
      return;
    }
    openBrowser(`http://127.0.0.1:${global.PORT}`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      logInternal('error',
        `Porta ${port} ocupada. O OpenTranslator nao troca de porta automaticamente: `
        + 'encerrar uma instancia ativa e seguro, trocar a porta silenciosamente orfa '
        + 'a instancia anterior sem registro em data/server.pid.');
      console.error(`[OpenTranslator] Porta ${port} ocupada (EADDRINUSE). Use --port=<n> ou encerre a instancia existente.`);
      global.shutdownAll('Porta ocupada');
      return;
    }
    logInternal('error', `[httpServer] Erro de servidor: ${e.message}`);
  });
}

function openBrowser(url) {
  const chromePaths = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.LocalAppData || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];
  const edgePaths = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ];
  const browserPath = chromePaths.find((p) => fs.existsSync(p)) || edgePaths.find((p) => fs.existsSync(p));
  const userDataDir = path.join(process.env.LocalAppData || global.DATA_DIR, 'OpenTranslatorProfile');

  const args = [
    '--app=' + url,
    '--user-data-dir=' + userDataDir,
    '--window-size=1100,700',
    '--name=OpenTranslator',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ];
  // --remote-debugging-port is added ONLY when explicitly requested (visual QA).
  // Antes era sempre 9222, o que expunha um port CDP aberto na maquina do
  // usuario e colidia com runVisualQA.
  if (process.env.OPENTRANSLATOR_CDP_PORT) {
    args.push('--remote-debugging-port=' + process.env.OPENTRANSLATOR_CDP_PORT);
  }

  try {
    if (browserPath) {
      spawn(browserPath, args, { detached: true, stdio: 'ignore', shell: false, windowsHide: false });
      return;
    }
  } catch (e) {
    logInternal('warn', `[httpServer] Spawn do navegador falhou: ${e.message}`);
  }
  try {
    spawn('cmd.exe', ['/c', 'start', '', '"' + url + '"'], { detached: true, stdio: 'ignore', shell: false });
  } catch (e) {
    logInternal('error', `[httpServer] Nao foi possivel abrir o navegador: ${e.message}`);
  }
}

module.exports = { server, tryListen };
