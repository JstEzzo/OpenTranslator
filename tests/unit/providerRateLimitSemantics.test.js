const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');
global.log = () => {};

const ProviderErrorClassifier = require(path.join(ROOT, 'src', 'core', 'providerErrorClassifier'));

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    pass++;
  } catch (e) {
    console.log(`  FALHA ${name}  <<< ${e.message}`);
    failures.push({ name, message: e.message });
    fail++;
  }
}

console.log('='.repeat(70));
console.log('P-008 — 429 NAO e banimento permanente');
console.log('Classificador canonico + semantica aplicada no translator');
console.log('='.repeat(70));
console.log('');

// ---------------------------------------------------------------- CASO 1
test('C1 HTTP 429 => RATE_LIMITED, nunca ban permanente', () => {
  const r = ProviderErrorClassifier.classify({ statusCode: 429, message: 'HTTP 429' });
  assert.strictEqual(r.type, 'RATE_LIMITED');
  assert.strictEqual(r.isRateLimit, true);
  assert.strictEqual(r.isBlock, undefined, '429 nao pode carregar isBlock');
  assert.ok(!/banid/i.test(r.message), `mensagem nao pode falar em ban: ${r.message}`);
  assert.ok(/tempor/i.test(r.message), 'a mensagem precisa dizer que e temporario');
});

test('C1b o cooldown de 429 usa o Retry-After, nao 10 minutos', () => {
  const r = ProviderErrorClassifier.classify(
    { statusCode: 429, message: 'HTTP 429' },
    { statusCode: 429, headers: { 'retry-after': '42' } },
  );
  assert.strictEqual(r.retryAfterProvided, true);
  assert.strictEqual(r.retryAfterMs, 42000);
  assert.strictEqual(r.retryAfterSec, 42);
});

// ---------------------------------------------------------------- CASO 2
test('C2 Retry-After ausente => backoff adaptativo de 15s, nao 600s', () => {
  const r = ProviderErrorClassifier.classify({ statusCode: 429, message: 'HTTP 429' });
  assert.strictEqual(r.retryAfterProvided, false);
  assert.strictEqual(r.retryAfterMs, 15000);
  assert.ok(r.retryAfterMs < 60000,
    `fallback de rate limit nao pode ser 10min, foi ${r.retryAfterMs}ms`);
});

// ---------------------------------------------------------------- CASO 3
test('C3 302 + evidencia de CAPTCHA => CAPTCHA_OR_BLOCK', () => {
  const r = ProviderErrorClassifier.classify(
    { statusCode: 302, message: 'HTTP 302' },
    { statusCode: 302, body: '<div>CAPTCHA</div>' },
  );
  assert.strictEqual(r.type, 'CAPTCHA_OR_BLOCK');
  assert.strictEqual(r.isBlock, true);
  assert.strictEqual(r.isRateLimit, undefined);
});

test('C3b 411 NAO e classificado como ban nem como rate limit', () => {
  const r = ProviderErrorClassifier.classify({ statusCode: 411, message: 'HTTP 411' });
  assert.ok(r.type !== 'RATE_LIMITED', '411 nao pode virar RATE_LIMITED');
  assert.ok(!r.isBlock, '411 sem evidencia de bloqueio nao pode virar CAPTCHA_OR_BLOCK');
});

// ---------------------------------------------------------------- CASO 4
test('C4 413/414 => PAYLOAD_TOO_LARGE', () => {
  for (const s of [413, 414]) {
    const r = ProviderErrorClassifier.classify({ statusCode: s, message: `HTTP ${s}` });
    assert.strictEqual(r.type, 'PAYLOAD_TOO_LARGE', `HTTP ${s}`);
    assert.strictEqual(r.isPayload, true);
  }
});

test('C4b 413 nao pode ser confundido com rate limit nem bloqueio', () => {
  const r = ProviderErrorClassifier.classify({ statusCode: 413, message: 'Payload Too Large' });
  assert.strictEqual(r.type, 'PAYLOAD_TOO_LARGE');
  assert.strictEqual(r.isRateLimit, undefined);
  assert.strictEqual(r.isBlock, undefined);
});

// ---------------------------------------------------------------- CASO 5
test('C5 5xx => SERVER_ERROR', () => {
  for (const s of [500, 502, 503, 504]) {
    const r = ProviderErrorClassifier.classify({ statusCode: s, message: `HTTP ${s}` });
    assert.strictEqual(r.type, 'SERVER_ERROR', `HTTP ${s}`);
    assert.strictEqual(r.isServer, true);
  }
});

// ---------------------------------------------------------------- CASO 6
test('C6 erro de rede => NETWORK_ERROR', () => {
  for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']) {
    const e = new Error('falhou');
    e.code = code;
    const r = ProviderErrorClassifier.classify(e);
    assert.strictEqual(r.type, 'NETWORK_ERROR', code);
    assert.strictEqual(r.isNetwork, true);
  }
  const r = ProviderErrorClassifier.classify(new Error('socket hang up'));
  assert.strictEqual(r.type, 'NETWORK_ERROR');
});

// ---------------------------------------------------------------- CASO 7
test('C7 NETWORK_ERROR nao pode ser tratado como ban', () => {
  const e = new Error('connect ETIMEDOUT');
  e.code = 'ETIMEDOUT';
  const r = ProviderErrorClassifier.classify(e);
  assert.notStrictEqual(r.type, 'RATE_LIMITED');
  assert.notStrictEqual(r.type, 'CAPTCHA_OR_BLOCK');
});

// ================================================================== CODIGO
console.log('');
console.log('-'.repeat(70));
console.log('APLICACAO REAL NO translator.js (leitura do fonte)');
console.log('-'.repeat(70));
console.log('');

const src = fs.readFileSync(
  path.join(ROOT, 'src', 'translation', 'translator.js'),
  'utf8',
);

test('C8 o translator NAO tem mais "Banido por 10min"', () => {
  assert.ok(!/Banido por 10min/.test(src),
    'a mensagem de banimento de 10min ainda existe no translator');
});

test('C9 o translator NAO bane o Bing por 10*60*1000', () => {
  assert.ok(!/engineBans\["bing"\]\s*=\s*Date\.now\(\)\s*\+\s*10\s*\*\s*60\s*\*\s*1000/.test(src),
    'ainda ha atribuicao direta de 10 minutos no engineBans["bing"]');
});

test('C10 o translator USA o classificador canonico no caminho do Bing', () => {
  assert.ok(/ProviderErrorClassifier\.classify\(/.test(src),
    'o tratamento de status do Bing precisa passar por ProviderErrorClassifier');
});

test('C11 o cooldown do Bing respeita o Retry-After do classificador', () => {
  // A atribuicao do cooldown precisa CONSUMIR classified.retryAfterMs.
  // Um simples includes() nao protege: o mesmo identificador pode sobrar
  // apenas numa mensagem de log enquanto o cooldown usa um numero fixo.
  const atrib = src.match(/engineBans\["bing"\]\s*=\s*Date\.now\(\)\s*\+\s*[^;]+;/);
  assert.ok(atrib, 'nao encontrei a atribuicao de cooldown do Bing');
  assert.ok(/classified\.retryAfterMs/.test(atrib[0]),
    `o cooldown do Bing ignora o Retry-After: ${atrib[0].trim()}`);
  assert.ok(!/600\s*\*\s*1000|10\s*\*\s*60\s*\*\s*1000/.test(atrib[0]),
    `o cooldown do Bing voltou a ser 10 minutos: ${atrib[0].trim()}`);
});

test('C12 o log declara que rate limit NAO e banimento permanente', () => {
  assert.ok(/NÃO é banimento permanente/i.test(src),
    'o log precisa deixar explícito que rate limit nao e ban');
});

test('C13 o catch do Bing nao bane por erro de parsing/rede', () => {
  // o `catch` só pode aplicar cooldown via triggerSmartSwitch (15s adaptativo)
  const bloco = src.slice(src.indexOf('[Bing] Erro traduzindo'));
  const janela = bloco.slice(0, 400);
  assert.ok(/triggerSmartSwitch\("bing"\)/.test(janela),
    'o catch precisa usar triggerSmartSwitch, nao um ban de 10 minutos');
  assert.ok(!/10\s*\*\s*60\s*\*\s*1000/.test(janela),
    'o catch ainda contem 10 minutos de ban');
});

test('C14 infraestrutura adaptativa de 15s permanece disponivel', () => {
  assert.ok(/const BAN_DURATION_MS = 15 \* 1000/.test(src),
    'BAN_DURATION_MS adaptativo precisa existir');
  assert.ok(/function triggerSmartSwitch\(/.test(src),
    'triggerSmartSwitch precisa existir');
});

console.log('');
console.log(`RESULTADO: pass=${pass} fail=${fail}`);
if (fail > 0) {
  console.log('');
  console.log('FALHAS:');
  for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
  process.exitCode = 1;
} else {
  console.log('PASS');
}