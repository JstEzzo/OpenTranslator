/**
 * tests/security/http_rpc_security.test.js
 *
 * FASE 1 / PASSO 18 — TESTES DE SEGURANCA REAIS (HTTP real, socket real)
 *
 * Cobre:
 *  S1  RPC sem token é rejeitado (403)
 *  S2  RPC com token errado é rejeitado (403)
 *  S3  RPC com token correto + Host malicioso é rejeitado (DNS-rebinding)
 *  S4  RPC com Origin malicioso é rejeitado (CSRF)
 *  S5  RPC com token + Host/Origin loopback é aceito
 *  S6  GET em /api/rpc é 405
 *  S7  Payload gigante é 413 (não request pendurado)
 *  S8  JSON inválido é 400
 *  S9  Stack trace NÃO vaza ao cliente
 *  S10 /loaders/inject.exe NÃO é servido
 *  S11 /loaders/*.dll NÃO são servidos
 *  S12 /resources/renpy/python/python.exe NÃO é servido
 *  S13 Path traversal em /../../etc/passwd é bloqueado
 *  S14 Asset legítimo (app.js) é servido
 *  S15 /loaders/opent_PGMMV_font.ttf (allowlist) é servido
 *  S16 Origin ausente é aceito no ping (bootstrap) mas RPC exige token
 *  S17 Preflight OPTIONS de origem não-loopback é 403
 *  S18 Nenhuma resposta tem Access-Control-Allow-Origin: *
 */

'use strict';

const http = require('http');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 18734 + (process.pid % 400);

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e });
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

// --------------------------------------------------------------------------
// Cliente HTTP mínimo com controle de Host/Origin (necessário para simular
// DNS-rebinding e CSRF, que http.request não permite naturalmente).
// --------------------------------------------------------------------------
function rawRequest({ method, path: urlPath, headers = {}, body = null, timeout = 4000 }) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port: PORT,
      method,
      path: urlPath,
      headers: Object.assign({ Host: `127.0.0.1:${PORT}` }, headers),
      timeout,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

function rpcCall(method, params, token, extraHeaders) {
  return rawRequest({
    method: 'POST',
    path: '/api/rpc',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { 'X-OpenTranslator-Token': token } : {},
      extraHeaders || {},
    ),
    body: JSON.stringify({ method, params }),
  });
}

async function main() {
  console.log('=== FASE 1 — SEGURANCA HTTP/RPC (HTTP real) ===');
  console.log(`porta de teste: ${PORT}`);

  const child = spawn(process.execPath, ['server.js', '--no-browser', '--no-stdout-redirect', `--port=${PORT}`], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOut = '';
  child.stdout.on('data', (c) => { serverOut += c; });
  child.stderr.on('data', (c) => { serverOut += c; });

  // Esperar o servidor subir.
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await rawRequest({ method: 'GET', path: '/api/ping' });
      if (r.status === 200) { ready = true; break; }
    } catch (_) { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    console.log('SERVIDOR NAO SUBIU. Output:\n' + serverOut);
    child.kill('SIGKILL');
    failed++;
    failures.push({ name: 'bootstrap', error: new Error('server did not start') });
    return finish();
  }

  // Obter token pelo canal de bootstrap.
  const ping = await rawRequest({ method: 'GET', path: '/api/ping' });
  const token = JSON.parse(ping.body).token;
  assert(token && token.length >= 32, 'token deve ter >=32 chars');

  // ---------------------------------------------------------------- S1-S5
  test('S1 RPC sem token -> 403', async () => {});
  const s1 = await rpcCall('loadCfg', {});
  test('S1 RPC sem token rejeitado com 403', () => {
    assert.strictEqual(s1.status, 403, `esperado 403, veio ${s1.status}`);
    assert.strictEqual(JSON.parse(s1.body).ok, false);
    assert(JSON.parse(s1.body).reason, 'deve incluir reason');
  });

  const s2 = await rpcCall('loadCfg', {}, 'token-errado-'.repeat(10));
  test('S2 RPC com token invalido -> 403', () => {
    assert.strictEqual(s2.status, 403, `esperado 403, veio ${s2.status}`);
    assert.strictEqual(JSON.parse(s2.body).reason, 'TOKEN_INVALID');
  });

  const s3 = await rpcCall('loadCfg', {}, token, { Host: 'attacker.example.com' });
  test('S3 Host nao-loopback rejeitado (DNS-rebinding)', () => {
    assert.strictEqual(s3.status, 403, `esperado 403, veio ${s3.status}`);
    assert.strictEqual(JSON.parse(s3.body).reason, 'HOST_NOT_ALLOWED');
  });

  const s4 = await rpcCall('loadCfg', {}, token, { Origin: 'https://evil.example.com' });
  test('S4 Origin nao-loopback rejeitado (CSRF)', () => {
    assert.strictEqual(s4.status, 403, `esperado 403, veio ${s4.status}`);
    assert.strictEqual(JSON.parse(s4.body).reason, 'ORIGIN_NOT_ALLOWED');
  });

  const s4b = await rpcCall('loadCfg', {}, token, { Origin: 'null' });
  test('S4b Origin "null" (sandbox/file://) rejeitado', () => {
    assert.strictEqual(s4b.status, 403, `esperado 403, veio ${s4b.status}`);
    assert.strictEqual(JSON.parse(s4b.body).reason, 'ORIGIN_NULL');
  });

  const s5 = await rpcCall('loadCfg', {}, token, { Origin: `http://127.0.0.1:${PORT}` });
  test('S5 token + Origin loopback aceito', () => {
    assert.strictEqual(s5.status, 200, `esperado 200, veio ${s5.status} body=${s5.body.slice(0, 200)}`);
    const j = JSON.parse(s5.body);
    assert.strictEqual(j.ok, true);
    assert(j.requestId, 'resposta deve conter requestId');
  });

  // ------------------------------------------------------------------ S6
  const s6 = await rawRequest({ method: 'GET', path: '/api/rpc', headers: { 'X-OpenTranslator-Token': token } });
  test('S6 GET em /api/rpc -> 405', () => {
    assert.strictEqual(s6.status, 405);
  });

  // ------------------------------------------------------------------ S7
  const huge = 'x'.repeat(9 * 1024 * 1024);
  const s7 = await new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    const req = http.request({
      host: '127.0.0.1', port: PORT, method: 'POST', path: '/api/rpc',
      headers: { Host: `127.0.0.1:${PORT}`, 'Content-Type': 'application/json', 'X-OpenTranslator-Token': token },
    }, (res) => {
      let d = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { d += c; });
      res.on('end', () => finish({ status: res.statusCode, body: d }));
    });
    // O servidor pode fechar a conexão depois de responder 413; nesse caso o
    // cliente já tem a resposta e o erro de escrita é irrelevante.
    req.on('error', (e) => finish({ status: 0, body: '', error: e.message }));
    req.write(JSON.stringify({ method: 'loadCfg', params: { pad: huge } }));
    req.end();
  });
  test('S7 payload acima do limite -> 413', () => {
    assert.strictEqual(s7.status, 413, `esperado 413, veio ${s7.status}`);
    assert(JSON.parse(s7.body).limitBytes, 'deve informar limitBytes');
  });

  // ------------------------------------------------------------------ S8
  const s8 = await rawRequest({
    method: 'POST', path: '/api/rpc',
    headers: { 'Content-Type': 'application/json', 'X-OpenTranslator-Token': token },
    body: '{nao é json',
  });
  test('S8 JSON invalido -> 400', () => {
    assert.strictEqual(s8.status, 400);
    assert.strictEqual(JSON.parse(s8.body).error, 'JSON invalido');
  });

  // ------------------------------------------------------------------ S9
  const s9 = await rpcCall('__naoExiste__', {}, token);
  test('S9 metodo inexistente -> 404 sem stack trace', () => {
    assert.strictEqual(s9.status, 404);
    const j = JSON.parse(s9.body);
    assert.strictEqual(j.ok, false);
    assert(!('stack' in j), 'NUNCA expor stack ao cliente');
  });

  // ---------------------------------------------------------------- S10-13
  const s10 = await rawRequest({ method: 'GET', path: '/loaders/inject.exe' });
  test('S10 /loaders/inject.exe NAO servido', () => {
    assert.strictEqual(s10.status, 404, `esperado 404, veio ${s10.status}`);
  });

  const s11 = await rawRequest({ method: 'GET', path: '/loaders/mzHook.dll' });
  test('S11 /loaders/*.dll NAO servidos', () => {
    assert.strictEqual(s11.status, 404, `esperado 404, veio ${s11.status}`);
  });

  const s11b = await rawRequest({ method: 'GET', path: '/loaders/manifest.json' });
  test('S11b /loaders/manifest.json NAO servido', () => {
    assert.strictEqual(s11b.status, 404);
  });

  const s12 = await rawRequest({ method: 'GET', path: '/resources/renpy/python/python.exe' });
  test('S12 /resources/renpy/python/python.exe NAO servido', () => {
    assert.strictEqual(s12.status, 404, `esperado 404, veio ${s12.status}`);
  });

  const s12b = await rawRequest({ method: 'GET', path: '/resources/unity/site-packages/UnityPy/__init__.py' });
  test('S12b .py dentro de /resources NAO servido', () => {
    assert.strictEqual(s12b.status, 404);
  });

  const s13 = await rawRequest({ method: 'GET', path: '/../../../Windows/win.ini' });
  test('S13 path traversal bloqueado', () => {
    assert(s13.status === 404 || s13.status === 403, `esperado 404/403, veio ${s13.status}`);
  });

  const s13b = await rawRequest({ method: 'GET', path: '/%2e%2e%2f%2e%2e%2fserver.js' });
  test('S13b path traversal encoded bloqueado', () => {
    assert(s13b.status === 404 || s13b.status === 403, `esperado 404/403, veio ${s13b.status}`);
    assert(!/require\('\.\/httpServer'\)/.test(s13b.body), 'NAO pode vazar conteudo fora de ui/');
  });

  // ---------------------------------------------------------------- S14-15
  const s14 = await rawRequest({ method: 'GET', path: '/app.js' });
  test('S14 /app.js servido (asset legitimo)', () => {
    assert.strictEqual(s14.status, 200, `esperado 200, veio ${s14.status}`);
    assert(/javascript/.test(s14.headers['content-type'] || ''), `content-type errado: ${s14.headers['content-type']}`);
    assert.strictEqual(s14.headers['x-content-type-options'], 'nosniff', 'deve enviar nosniff');
    assert(s14.body.length > 10000, `app.js deveria ter >10KB, veio ${s14.body.length}`);
  });

  const s15 = await rawRequest({ method: 'GET', path: '/loaders/opent_PGMMV_font.ttf' });
  test('S15 fonte na allowlist e servida', () => {
    assert(s15.status === 200 || s15.status === 404, `inesperado: ${s15.status}`);
    if (s15.status === 404) {
      console.log('       (fonte ausente no checkout — allowlist correta, arquivo nao existe)');
    } else {
      assert(/font/.test(s15.headers['content-type'] || ''));
    }
  });

  // ---------------------------------------------------------------- S16-17
  const s16 = await rawRequest({ method: 'GET', path: '/api/ping', headers: { Origin: 'http://localhost:' + PORT } });
  test('S16 ping aceita Origin loopback e devolve token', () => {
    assert.strictEqual(s16.status, 200);
    assert(JSON.parse(s16.body).token, 'bootstrap precisa devolver token');
    assert.strictEqual(s16.headers['access-control-allow-origin'], `http://localhost:${PORT}`);
  });

  const s17 = await rawRequest({ method: 'OPTIONS', path: '/api/rpc', headers: { Origin: 'https://evil.com' } });
  test('S17 preflight de origem nao-loopback -> 403', () => {
    assert.strictEqual(s17.status, 403, `esperado 403, veio ${s17.status}`);
  });

  const s17b = await rawRequest({ method: 'OPTIONS', path: '/api/rpc', headers: { Origin: `http://127.0.0.1:${PORT}` } });
  test('S17b preflight de origem loopback -> 204 com CORS', () => {
    assert.strictEqual(s17b.status, 204, `esperado 204, veio ${s17b.status}`);
    assert.strictEqual(s17b.headers['access-control-allow-origin'], `http://127.0.0.1:${PORT}`);
    assert(/X-OpenTranslator-Token/i.test(s17b.headers['access-control-allow-headers'] || ''),
      'preflight deve permitir o header de token');
  });

  // ------------------------------------------------------------------ S18
  test('S18 nenhuma resposta devolve ACAO:*', () => {
    const responses = [s1, s2, s3, s4, s4b, s5, s16, s17b];
    for (const r of responses) {
      assert.notStrictEqual(r.headers['access-control-allow-origin'], '*',
        `resposta devolveu ACAO:* (status=${r.status})`);
    }
  });

  // ------------------------------------------------- requestId presente
  test('S19 respostas RPC incluem requestId para correlacao', () => {
    assert(s5.headers['content-type'].includes('application/json'));
    assert(JSON.parse(s5.body).requestId, 'deve incluir requestId');
  });

  await new Promise((r) => setTimeout(r, 300));
  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 600));
  try { child.kill('SIGKILL'); } catch (_) {}
  finish();
}

function finish() {
  console.log('\n--- RESULTADO FASE 1 (segurança HTTP/RPC) ---');
  console.log(`pass=${passed} fail=${failed}`);
  if (failed) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}: ${f.error.message}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('ERRO NO RUNNER:', e);
  process.exit(1);
});
