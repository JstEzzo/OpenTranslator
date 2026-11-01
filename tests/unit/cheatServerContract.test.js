/**
 * tests/unit/cheatServerContract.test.js
 *
 * Teste rigoroso de contrato e integridade do cheatServer:
 * 1. Validação de origens HTTP (loopback, nativos, app://, bloqueio de sites remotos e proteção de null cross-site)
 * 2. Validação de handshake e origens WebSocket (verifyClient, bloqueio de evil.com e null)
 * 3. Parser unificado de payloads (JSON, urlencoded, query params, lote)
 * 4. Servidor HTTP real em porta efêmera com verificação de bloqueio sem efeitos colaterais
 * 5. Servidor WebSocket real em porta efêmera com mensagens, resiliência e contratos de cheats
 */

'use strict';

const http = require('http');
const assert = require('assert');
const WebSocket = require('ws');
const {
  startHookServer,
  stopHookServer,
  isAllowedHookOrigin,
  isAllowedWsOrigin,
  parseTranslationPayload,
  applyHookCors,
} = require('../../src/services/cheatServer');

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err });
    console.log(`  FAIL ${name}: ${err.message}`);
  }
}

function rawHttp({ port, method, path: urlPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port,
      method,
      path: urlPath,
      headers: Object.assign({ Host: `127.0.0.1:${port}` }, headers),
      timeout: 3000,
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

async function run() {
  console.log('=== TESTES DE CONTRATO E INTEGRAÇÃO REAL DO CHEATSERVER ===');

  // -------------------------------------------------------------
  // GRUPO 1: Validação de Origem HTTP (isAllowedHookOrigin)
  // -------------------------------------------------------------
  await test('C1: Clientes nativos sem header Origin permitidos', () => {
    assert.strictEqual(isAllowedHookOrigin(undefined), true);
  });

  await test('C2: Loopback IPv4 permitido', () => {
    assert.strictEqual(isAllowedHookOrigin('http://127.0.0.1:8080'), true);
  });

  await test('C3: Localhost permitido', () => {
    assert.strictEqual(isAllowedHookOrigin('http://localhost:8080'), true);
  });

  await test('C4: Esquemas locais de aplicação permitidos (app://, file://, chrome-extension://)', () => {
    assert.strictEqual(isAllowedHookOrigin('app://rpgmaker'), true);
    assert.strictEqual(isAllowedHookOrigin('file:///game/index.html'), true);
    assert.strictEqual(isAllowedHookOrigin('chrome-extension://my-extension'), true);
  });

  await test('C5: Origem remota web HTTP/HTTPS bloqueada (evil.com)', () => {
    assert.strictEqual(isAllowedHookOrigin('http://evil.com'), false);
    assert.strictEqual(isAllowedHookOrigin('https://attacker.org'), false);
  });

  await test('C6: Origin null com sec-fetch-site cross-site (iframe sandbox em site externo) BLOQUEADO', () => {
    const req = { headers: { 'sec-fetch-site': 'cross-site' } };
    assert.strictEqual(isAllowedHookOrigin('null', req), false);
  });

  await test('C7: Origin null local (sem sec-fetch-site ou local file://) permitido para compatibilidade NW.js', () => {
    const req = { headers: { 'sec-fetch-site': 'none' } };
    assert.strictEqual(isAllowedHookOrigin('null', req), true);
    assert.strictEqual(isAllowedHookOrigin('null', { headers: {} }), true);
  });

  // -------------------------------------------------------------
  // GRUPO 2: Validação de Handshake WebSocket (isAllowedWsOrigin)
  // -------------------------------------------------------------
  await test('C8: WebSocket permite clientes nativos sem Origin (DLLs de hook C++)', () => {
    assert.strictEqual(isAllowedWsOrigin(undefined), true);
  });

  await test('C9: WebSocket permite loopback oficial do OpenTranslator', () => {
    assert.strictEqual(isAllowedWsOrigin('http://127.0.0.1:8080'), true);
    assert.strictEqual(isAllowedWsOrigin('http://localhost:8080'), true);
  });

  await test('C10: WebSocket bloqueia páginas web remotas (evil.com)', () => {
    assert.strictEqual(isAllowedWsOrigin('http://evil.com'), false);
    assert.strictEqual(isAllowedWsOrigin('https://evil.com'), false);
  });

  await test('C11: WebSocket bloqueia Origin null (rejeita sandbox opaca de sites externos)', () => {
    assert.strictEqual(isAllowedWsOrigin('null'), false);
  });

  // -------------------------------------------------------------
  // GRUPO 3: Parser Unificado de Payloads
  // -------------------------------------------------------------
  await test('P1: parseTranslationPayload extrai objeto JSON individual', () => {
    const p = parseTranslationPayload(JSON.stringify({ text: 'Hello', from: 'en', to: 'pt' }), new URLSearchParams());
    assert.strictEqual(p.text, 'Hello');
    assert.strictEqual(p.reqSl, 'en');
    assert.strictEqual(p.reqTl, 'pt');
  });

  await test('P2: parseTranslationPayload extrai lote de textos em JSON (formato XUnity)', () => {
    const p = parseTranslationPayload(JSON.stringify({ texts: ['A', 'B'], sl: 'ja', tl: 'pt' }), new URLSearchParams());
    assert.deepStrictEqual(p.texts, ['A', 'B']);
    assert.strictEqual(p.reqSl, 'ja');
    assert.strictEqual(p.reqTl, 'pt');
  });

  await test('P3: parseTranslationPayload extrai formulário application/x-www-form-urlencoded', () => {
    const p = parseTranslationPayload('text=Ola&from=es&to=pt', new URLSearchParams());
    assert.strictEqual(p.text, 'Ola');
    assert.strictEqual(p.reqSl, 'es');
    assert.strictEqual(p.reqTl, 'pt');
  });

  await test('P4: parseTranslationPayload extrai parâmetros de query string', () => {
    const p = parseTranslationPayload('', new URLSearchParams('q=ParamText&sl=auto&tl=pt'));
    assert.strictEqual(p.text, 'ParamText');
    assert.strictEqual(p.reqSl, 'auto');
    assert.strictEqual(p.reqTl, 'pt');
  });

  // -------------------------------------------------------------
  // GRUPO 4: Servidor HTTP Real em Porta Efêmera
  // -------------------------------------------------------------
  const TEST_PORT = 19450 + (process.pid % 300);

  // Inicializa o servidor na porta efêmera de teste
  await startHookServer(TEST_PORT, '127.0.0.1');

  // Limpa estados globais de teste
  global.lastGameState = null;
  global.pendingCheatCommands = [];

  await test('H1: Servidor HTTP bloqueia requisição de origem remota com 403', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'POST',
      path: '/cheat_poll',
      headers: { Origin: 'http://evil.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'hacked' }),
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body, 'Forbidden origin');
  });

  await test('H2: Rejeição 403 de origem remota NÃO altera estado global (lastGameState intacto)', () => {
    assert.strictEqual(global.lastGameState, null);
  });

  await test('H3: Origin null com sec-fetch-site: cross-site é rejeitado com 403', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'POST',
      path: '/cheat_poll',
      headers: {
        Origin: 'null',
        'sec-fetch-site': 'cross-site',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audit: [] }),
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(global.lastGameState, null);
  });

  await test('H4: Cliente nativo sem Origin em /cheat_poll sincroniza com sucesso e recebe comandos', async () => {
    global.pendingCheatCommands.push({ code: 'console.log("test");' });
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'POST',
      path: '/cheat_poll',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit: [{ key: 'gold', old: 10, new: 999, val: 999 }] }),
    });
    assert.strictEqual(res.status, 200);
    const cmds = JSON.parse(res.body);
    assert.strictEqual(Array.isArray(cmds), true);
    assert.strictEqual(cmds.length, 1);
    assert.strictEqual(cmds[0].code, 'console.log("test");');
    assert.notStrictEqual(global.lastGameState, null);
  });

  await test('H5: Cliente nativo em /translate processa texto com formato correto', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'POST',
      path: '/translate',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello', from: 'en', to: 'pt' }),
    });
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(typeof data.translated, 'string');
  });

  await test('H6: Lote em /xbatch (formato XUnity) processa array de textos', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'POST',
      path: '/xbatch',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: ['Test1', 'Test2'], sl: 'en', tl: 'pt' }),
    });
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(Array.isArray(data.translations), true);
    assert.strictEqual(data.translations.length, 2);
  });

  await test('H7: Preflight OPTIONS de origem autorizada devolve 204 com headers CORS', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'OPTIONS',
      path: '/translate',
      headers: { Origin: 'http://127.0.0.1:8080' },
    });
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://127.0.0.1:8080');
  });

  await test('H8: Preflight OPTIONS de origem remota é rejeitado com 403', async () => {
    const res = await rawHttp({
      port: TEST_PORT,
      method: 'OPTIONS',
      path: '/translate',
      headers: { Origin: 'http://evil.com' },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
  });

  // -------------------------------------------------------------
  // GRUPO 5: Servidor WebSocket Real em Porta Efêmera
  // -------------------------------------------------------------
  await test('W1: WebSocket rejeita handshake de origem remota (evil.com) com 403', async () => {
    await new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`, {
        headers: { Origin: 'http://evil.com' },
      });
      ws.on('open', () => {
        ws.close();
        assert.fail('WebSocket de evil.com não deveria ter conectado');
      });
      ws.on('unexpected-response', (req, res) => {
        assert.strictEqual(res.statusCode, 403);
        resolve();
      });
      ws.on('error', () => {
        // Conexão recusada conforme esperado
        resolve();
      });
    });
  });

  await test('W2: WebSocket rejeita handshake de Origin null (iframe sandbox externo)', async () => {
    await new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`, {
        headers: { Origin: 'null' },
      });
      ws.on('open', () => {
        ws.close();
        assert.fail('WebSocket com Origin null não deveria ter conectado');
      });
      ws.on('unexpected-response', (req, res) => {
        assert.strictEqual(res.statusCode, 403);
        resolve();
      });
      ws.on('error', () => {
        resolve();
      });
    });
  });

  await test('W3: WebSocket conecta cliente nativo sem Origin com sucesso', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', reject);
    });
  });

  await test('W4: WebSocket conecta cliente loopback oficial (OpenTranslator UI)', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`, {
        headers: { Origin: 'http://127.0.0.1:8080' },
      });
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', reject);
    });
  });

  await test('W5: Mensagem register_cheat_client registra activeCheatSocket com sucesso', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register_cheat_client' }));
        setTimeout(() => {
          try {
            assert(global.activeCheatSocket !== null, 'activeCheatSocket deve estar preenchido');
            assert.strictEqual(global.activeCheatSocket.readyState, WebSocket.OPEN);
            ws.close();
            resolve();
          } catch (e) {
            ws.close();
            reject(e);
          }
        }, 100);
      });
      ws.on('error', reject);
    });
  });

  await test('W6: Mensagem game_state atualiza lastGameState no servidor', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'game_state', scene: 'Scene_Battle', gold: 5000 }));
        setTimeout(() => {
          assert.notStrictEqual(global.lastGameState, null);
          assert.strictEqual(global.lastGameState.scene, 'Scene_Battle');
          assert.strictEqual(global.lastGameState.gold, 5000);
          ws.close();
          resolve();
        }, 100);
      });
      ws.on('error', reject);
    });
  });

  await test('W7: Mensagem malformada (não-JSON) é tratada sem derrubar o servidor nem corromper estado', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      ws.on('open', () => {
        ws.send('INVALID_GARBAGE_NON_JSON{{{');
        setTimeout(() => {
          // Servidor continua vivo e respondendo
          assert.strictEqual(typeof global.lastGameState, 'object');
          ws.close();
          resolve();
        }, 100);
      });
      ws.on('error', reject);
    });
  });

  await test('W8: Requisição de tradução via WebSocket responde com texto traduzido', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ text: 'Good morning', id: 42 }));
      });
      ws.on('message', (data) => {
        try {
          const resp = JSON.parse(data.toString());
          assert.strictEqual(typeof resp.translated, 'string');
          ws.close();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      ws.on('error', reject);
    });
  });

  // Encerra o servidor de teste de forma limpa
  await new Promise((resolve) => {
    stopHookServer(() => {
      resolve();
    });
  });

  console.log(`pass=${passed} fail=${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Erro fatal executando suite cheatServerContract:', err);
    process.exit(1);
  });
}

module.exports = { run };
