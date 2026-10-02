/**
 * OpenTranslator - ProductRuntimeFixture
 * 
 * Processo real e independente utilizado exclusivamente para validação factual
 * do ciclo de vida de runtime do OpenTranslator (RuntimeSessionManager, RuntimeProbe,
 * ScreenCapture, observação de texto e encerramento seguro).
 * 
 * CLASSIFICAÇÃO: PRODUCT_RUNTIME_FIXTURE (NUNCA chamado de jogo real).
 */

const http = require('http');

let currentText = "Welcome to OpenTranslator Fixture";
let translationDelivered = false;

const port = process.env.FIXTURE_PORT || 16008;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/text' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ text: currentText, translated: translationDelivered, pid: process.pid }));
    return;
  }

  if (req.url === '/translate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.newText) {
          currentText = data.newText;
          translationDelivered = true;
          console.log(`[FIXTURE_RUNTIME_TEXT_OBSERVED] Text updated to: ${currentText}`);
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, text: currentText }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/ping') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'PONG', pid: process.pid, uptime: process.uptime() }));
    return;
  }

  if (req.url === '/exit') {
    res.writeHead(200);
    res.end(JSON.stringify({ exiting: true }));
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 100);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[FIXTURE_STARTED] PID: ${process.pid} listening on 127.0.0.1:${port}`);
  console.log(`[FIXTURE_INITIAL_TEXT] ${currentText}`);
});

process.on('SIGTERM', () => {
  console.log(`[FIXTURE_SIGTERM] Shutting down cleanly...`);
  server.close();
  process.exit(0);
});
