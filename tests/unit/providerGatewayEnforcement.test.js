/**
 * tests/unit/providerGatewayEnforcement.test.js — FASE 3 / PASSO 26
 *
 * Garante que a regra declarada pelo próprio `providerGateway.js` —
 * "nenhuma função pode abrir socket HTTP para um provedor sem passar por
 * ProviderGateway.executeRequest" — deixe de ser decorativa.
 *
 * ANTES DESTE PASSO: `translator.js` importava `ProviderGateway` e nunca o
 * usava. Havia 10 sockets abertos direto, cada um com tratamento de 429,
 * retries e ban próprios. O Circuit Breaker não via nenhuma dessas chamadas,
 * e o painel de saúde dele mentia sobre provedores que nunca observeve.
 *
 * O teste é estático por escolha: a garantia que importa não é "nesta execução
 * o breaker foi consultado", e sim "é IMPOSSÍVEL adicionar uma chamada direta
 * sem que a verificação que roda em todo `npm test` perceba".
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 3 — ENFORCIMENTO DO PROVIDER GATEWAY ===');
  for (const { name, fn } of queue) {
    try {
      await fn();
      pass++;
      console.log(`  ok   ${name}`);
    } catch (e) {
      fail++;
      failures.push({ name, message: e.message });
      console.log(`  FAIL ${name}`);
      console.log(`       ${e.message.split('\n').join('\n       ')}`);
    }
  }
  console.log('\n--- RESULTADO FASE 3 (gateway) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const SRC = path.join(ROOT, 'src');

/** Arquivos que abrem socket para provedores. */
const CALLER_FILES = [
  'translation/translator.js',
  'core/realProviderBenchmark.js',
];

/** Arquivos que têm o direito de abrir socket: a camada HTTP e o benchmark. */
const ALLOWED_DIRECT = new Set([
  // A camada HTTP única: É o gateway. Aqui o socket é o ponto.
  'core/providerHttp.js',
  // Exceção documentada: benchmark precisa medir o comportamento cru.
  'core/realProviderBenchmark.js',
]);

const DIRECT_CALL_PATTERNS = [
  { name: 'https.request', re: /\bhttps\.request\s*\(/ },
  { name: 'https.get', re: /\bhttps\.get\s*\(/ },
  { name: 'fetch', re: /(?<![\w.$])fetch\s*\(/ },
  { name: 'http.request', re: /\bhttp\.request\s*\(/ },
  { name: 'http.get', re: /\bhttp\.get\s*\(/ },
];

/** Remove linhas de comentário para não contar documentação como chamada. */
function stripComments(line) {
  return line
    .replace(/^\s*\/\*.*$/, '')
    .replace(/^\s*\*.*$/, '')
    .replace(/^\s*\/\/.*$/, '');
}

/** Lista chamadas de socket diretas (não-via-gateway) em um arquivo. */
function findDirectCalls(relPath) {
  const abs = path.join(SRC, relPath);
  if (!fs.existsSync(abs)) return null;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const hits = [];
  lines.forEach((raw, i) => {
    const line = stripComments(raw);
    if (!line.trim()) return;
    for (const { name, re } of DIRECT_CALL_PATTERNS) {
      if (!re.test(line)) continue;
      // A camada HTTP pode chamar; nos demais, o uso deve ser via ProviderHttp.
      if (relPath === 'core/providerHttp.js') continue;
      if (line.includes('ProviderHttp.')) continue;
      hits.push({ kind: name, line: i + 1, text: line.trim().slice(0, 90) });
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
test('G1 translator.js NÃO abre socket direto (a regra do gateway vale)', () => {
  const hits = findDirectCalls('translation/translator.js');
  assert.ok(hits, 'translator.js deve existir');
  assert.strictEqual(hits.length, 0,
    `BUG ORIGINAL: ${hits.length} chamada(s) de socket fora do gateway:\n`
    + hits.map((h) => `  ${h.kind} linha ${h.line}: ${h.text}`).join('\n'));
});

test('G2 as 10 chamadas de translator.js agora passam por ProviderHttp', () => {
  const src = fs.readFileSync(path.join(SRC, 'translation', 'translator.js'), 'utf8');
  const viaGateway = (src.match(/ProviderHttp\.(get|post|request|fetchGuarded)\s*\(/g) || []).length;
  assert.ok(viaGateway >= 8,
    `esperado >= 8 chamadas roteadas pelo gateway, encontrei ${viaGateway}`);
});

test('G3 a única exceção ao gateway é o benchmark, e ela é JUSTIFICADA', () => {
  const benchPath = path.join(SRC, 'core', 'realProviderBenchmark.js');
  const src = fs.readFileSync(benchPath, 'utf8');

  // A exceção precisa se explicar, não apenas existir.
  assert.match(src, /GATEWAY_EXEMPT/,
    'a exceção do benchmark precisa estar marcada no código');
  assert.match(src, /EXCEÇÃO DOCUMENTADA/,
    'a exceção precisa ser documentada no cabeçalho');

  const bench = require(benchPath);
  assert.ok(typeof bench.GATEWAY_EXEMPT === 'string' && bench.GATEWAY_EXEMPT.length > 0,
    'GATEWAY_EXEMPT deve ser exportado para o teste conferir');
  assert.ok(bench.BENCHMARK_BREAKER_KEY,
    'o benchmark deve usar uma chave de breaker isolada');
  assert.match(bench.BENCHMARK_BREAKER_KEY, /^benchmark:/,
    'a chave do benchmark não pode colidir com a de produção');
});

test('G4 nenhum OUTRO arquivo de src/ abre socket direto para provedor', () => {
  const offenders = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, e.name).replace(/\\/g, '/').replace(/^src\//, '');
      if (e.isDirectory()) {
        // Locais que não falam com provedores externos.
        if (['mediaExtractor', 'diagnostics'].includes(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.name.endsWith('.js') && !ALLOWED_DIRECT.has(rel)) {
        const hits = findDirectCalls(rel);
        if (hits && hits.length > 0) {
          offenders.push(...hits.map((h) => `${rel}:${h.line} ${h.kind}`));
        }
      }
    }
  })(SRC);

  assert.strictEqual(offenders.length, 0,
    `chamadas de socket fora da camada HTTP:\n  ${offenders.join('\n  ')}`);
});

test('G5 providerHttp é realmente o único que constrói socket', () => {
  const src = fs.readFileSync(path.join(SRC, 'core', 'providerHttp.js'), 'utf8');
  assert.match(src, /ProviderGateway\.executeRequest/,
    'a camada HTTP precisa passar pelo gateway');
  // E passa em TODOS os verbos, não só em um.
  const calls = (src.match(/ProviderGateway\.executeRequest/g) || []).length;
  assert.ok(calls >= 3,
    `esperado o gateway em request/get/post/fetchGuarded, achei ${calls} usos`);

  const http = require(path.join(SRC, 'core', 'providerHttp.js'));
  assert.ok(typeof http.request === 'function');
  assert.ok(typeof http.get === 'function');
  assert.ok(typeof http.post === 'function');
  assert.ok(typeof http.fetchGuarded === 'function');
});

test('G6 com breaker aberto, a chamada é BLOQUEADA antes do socket', async () => {
  const breaker = require(path.join(SRC, 'core', 'globalCircuitBreaker'));
  const ProviderHttp = require(path.join(SRC, 'core', 'providerHttp.js'));

  // Chave dedicada ao teste, para não afetar outras suítes.
  const KEY = 'teste-gateway-bloqueio';
  const cb = breaker.getInstance();
  cb.reset(KEY);
  //força o breaker a abrir
  for (let i = 0; i < 40; i++) {
    try {
      await ProviderHttp.get({
        url: 'http://127.0.0.1:1/qualquer',
        providerKey: KEY,
        timeoutMs: 200,
      });
    } catch (e) { /* esperado: conexão recusada */ }
  }

  const check = cb.canExecute(KEY);
  assert.ok(!check.allowed || check.state !== 'CLOSED',
    `o breaker deveria ter aberto após 40 falhas, estado=${check.state}`);

  // E agora a próxima chamada é recusada sem tocar na rede.
  await assert.rejects(
    () => ProviderHttp.get({
      url: 'http://127.0.0.1:1/qualquer',
      providerKey: KEY,
      timeoutMs: 200,
    }),
    /GATEWAY_BLOCKED|Circuit/i,
    'com o breaker aberto a chamada deve ser recusada',
  );
  cb.reset(KEY);
});

test('G7 status HTTP de erro é registrado como ERRO, não como sucesso', async () => {
  const http = require('http');
  const ProviderHttp = require(path.join(SRC, 'core', 'providerHttp.js'));
  const breaker = require(path.join(SRC, 'core', 'globalCircuitBreaker'));
  const cb = breaker.getInstance();

  // Servidor local que responde 429, como um provedor real sob rate limit.
  const server = http.createServer((req, res) => {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '7' });
    res.end(JSON.stringify({ error: 'rate limited' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const KEY = 'teste-429';

  try {
    await assert.rejects(
      () => ProviderHttp.get({
        url: `http://127.0.0.1:${port}/x`,
        providerKey: KEY,
        rejectOnErrorStatus: true,
        timeoutMs: 2000,
      }),
      /HTTP 429/,
      'um 429 deve lançar, não ser tratado como sucesso',
    );

    // O breaker precisa ter aprendido: estado degradado, não fechado.
    const st = cb.canExecute(KEY);
    assert.ok(!st.allowed,
      `BUG: o breaker não reagiu a um 429 (estado=${st.state}, ${st.reason || ''})`);
  } finally {
    cb.reset(KEY);
    await new Promise((r) => server.close(r));
  }
});

test('G8 status de erro SEM rejectOnErrorStatus é devolvido para inspeção', async () => {
  const http = require('http');
  const ProviderHttp = require(path.join(SRC, 'core', 'providerHttp.js'));
  const server = http.createServer((req, res) => {
    res.writeHead(429);
    res.end('limite');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  try {
    const r = await ProviderHttp.get({
      url: `http://127.0.0.1:${port}/x`,
      providerKey: `teste-429-inspecionar-${Date.now()}`,
      timeoutMs: 2000,
    });
    assert.strictEqual(r.status, 429,
      'sem a flag, o chamador precisa poder inspecionar o status');
    assert.strictEqual(r.body, 'limite');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('G9 o gateway classifica e o benchmark segue separado', () => {
  const Gateway = require(path.join(SRC, 'core', 'providerGateway.js'));
  assert.ok(Gateway.executeRequest);
  assert.ok(Gateway.ProviderGatewayBlockedError);
  // O erro carrega a chave, para o log ser atribuível ao provedor certo.
  const e = new Gateway.ProviderGatewayBlockedError('meu-prov', { reason: 'cooldown' });
  assert.strictEqual(e.providerKey, 'meu-prov');
  assert.strictEqual(e.blocked, true);
});

// ---------------------------------------------------------------------------
// O breaker só cooldownava 429/302/auth. Erro de rede e 5xx NÃO bloqueavam.
// ---------------------------------------------------------------------------
test('G10 falha de rede ISOLADA não abre cooldown (transitória passa)', () => {
  const cb = require(path.join(SRC, 'core', 'globalCircuitBreaker')).getInstance();
  const K = `teste-isolada-${Date.now()}`;
  try {
    assert.strictEqual(cb.canExecute(K).allowed, true, 'estado inicial é AVAILABLE');

    // Uma única falha de rede: registra, mas NÃO pode derrubar o provedor.
    cb.recordError(K, { type: 'NETWORK_ERROR', message: 'timeout' });
    const after = cb.canExecute(K);
    assert.strictEqual(after.allowed, true,
      'uma falha de rede pontual deve deixar o provedor disponível');
  } finally {
    cb.reset(K);
  }
});

test('G11 falhas de rede SUSTENTADAS abrem cooldown (o breaker para de martelar)', () => {
  const cb = require(path.join(SRC, 'core', 'globalCircuitBreaker')).getInstance();
  const K = `teste-sustentada-${Date.now()}`;
  try {
    const threshold = cb.failureThreshold;
    for (let i = 0; i < threshold; i++) {
      cb.recordError(K, { type: 'NETWORK_ERROR', message: 'ECONNREFUSED' });
    }
    const st = cb.canExecute(K);
    assert.strictEqual(st.allowed, false,
      `BUG ORIGINAL: ${threshold} falhas de rede seguidas e o breaker seguia autorizando `
      + `(estado=${st.state})`);
    assert.match(st.reason, /NETWORK_ERROR/);
    assert.ok(st.remainingMs > 0, 'o bloqueio precisa informar quanto falta');
  } finally {
    cb.reset(K);
  }
});

test('G12 5xx repetido também abre cooldown', () => {
  const cb = require(path.join(SRC, 'core', 'globalCircuitBreaker')).getInstance();
  const K = `teste-5xx-${Date.now()}`;
  try {
    for (let i = 0; i < cb.failureThreshold; i++) {
      cb.recordError(K, { type: 'SERVER_ERROR', statusCode: 503, message: 'unavailable' });
    }
    const st = cb.canExecute(K);
    assert.strictEqual(st.allowed, false,
      `BUG ORIGINAL: 5xx apenas contava e seguia liberando (estado=${st.state})`);
    const h = cb.getProviderHealth(K);
    assert.ok(h.requests5xx >= cb.failureThreshold);
  } finally {
    cb.reset(K);
  }
});

test('G13 sucesso zera o contador de falhas (recuperação limpa o cooldown)', () => {
  const cb = require(path.join(SRC, 'core', 'globalCircuitBreaker')).getInstance();
  const K = `teste-recuperacao-${Date.now()}`;
  try {
    for (let i = 0; i < cb.failureThreshold; i++) {
      cb.recordError(K, { type: 'NETWORK_ERROR', message: 'boom' });
    }
    assert.strictEqual(cb.canExecute(K).allowed, false);

    // Um sucesso (p.ex. sonda em HALF_OPEN) reabre.
    cb.recordSuccess(K);
    const st = cb.canExecute(K);
    assert.strictEqual(st.allowed, true, 'após um sucesso o provedor volta');
    assert.strictEqual(cb.getProviderHealth(K).consecutiveErrors, 0);
  } finally {
    cb.reset(K);
  }
});

test('G14 o cooldown de rede TEM TETO (não vira bloqueio permanente)', () => {
  const cb = require(path.join(SRC, 'core', 'globalCircuitBreaker')).getInstance();
  const K = `teste-teto-${Date.now()}`;
  try {
    // Muitas falhas: o cooldown não pode passar de maxCooldownMs.
    for (let i = 0; i < 60; i++) {
      cb.recordError(K, { type: 'NETWORK_ERROR', message: 'boom' });
    }
    const h = cb.getProviderHealth(K);
    const remaining = new Date(h.cooldownUntil).getTime() - Date.now();
    assert.ok(remaining <= cb.maxCooldownMs + 1000,
      `cooldown excedeu o teto: ${remaining}ms > ${cb.maxCooldownMs}ms`);
    assert.ok(remaining > 0, 'o cooldown ainda precisa estar ativo');
  } finally {
    cb.reset(K);
  }
});

runAll();
