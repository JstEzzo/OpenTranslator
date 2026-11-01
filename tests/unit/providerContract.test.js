/**
 * tests/unit/providerContract.test.js — FASE 3 / PASSO 24
 *
 * Testa o contrato de TranslationResult e o registry que o obedece.
 *
 * O teste central usa provedores DEFECTUOSOS de propósito — valores de
 * retorno que só apareceriam num ambiente real (null, string vazia, o
 * original de volta, exceções) — e exige que NENHUM deles produza
 * `{status:'TRANSLATED'}` nem preencha `translation` com o texto de origem.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 3 — CONTRATO DE RESULTADO DE TRADUÇÃO ===');
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
  console.log('\n--- RESULTADO FASE 3 (contrato de tradução) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const TR = require(path.join(ROOT, 'src', 'core', 'translationResult'));
const { TranslationProviderRegistry } = require(
  path.join(ROOT, 'src', 'providers', 'translationProviderRegistry'),
);
const { TRANSLATION_STATUS: S } = TR;

const SRC = 'こんにちは、世界';

// ---------------------------------------------------------------------------
// translationResult
// ---------------------------------------------------------------------------
test('R1 string diferente do original vira TRANSLATED com translation preenchida', () => {
  const r = TR.normalize('Olá, mundo', { sourceText: SRC, provider: 'P' });
  assert.strictEqual(r.status, S.TRANSLATED);
  assert.strictEqual(r.isSuccess, true);
  assert.strictEqual(r.translation, 'Olá, mundo');
  assert.strictEqual(r.original, SRC);
  assert.strictEqual(TR.assertContract(r).ok, true);
});

test('R2 provedor que devolve NULL vira FAILED (antes: TRANSLATED com null)', () => {
  // `null !== text` era a única condição de sucesso antes.
  const r = TR.normalize(null, { sourceText: SRC, provider: 'P' });
  assert.notStrictEqual(r.status, S.TRANSLATED, 'BUG ORIGINAL: null virava sucesso');
  assert.strictEqual(r.status, S.FAILED);
  assert.strictEqual(r.isSuccess, false);
  assert.strictEqual(r.translation, null);
  assert.match(r.reason, /null/);
  assert.strictEqual(TR.assertContract(r).ok, true);
});

test('R3 provedor que devolve UNDEFINED vira FAILED', () => {
  const r = TR.normalize(undefined, { sourceText: SRC, provider: 'P' });
  assert.strictEqual(r.status, S.FAILED);
  assert.strictEqual(r.translation, null);
});

test('R4 provedor que devolve o ORIGINAL de volta vira NOT_TRANSLATED', () => {
  const r = TR.normalize(SRC, { sourceText: SRC, provider: 'P' });
  assert.strictEqual(r.status, S.NOT_TRANSLATED);
  assert.strictEqual(r.isSuccess, false);
  assert.strictEqual(r.translation, null, 'o original NÃO pode ir para translation');
  assert.strictEqual(r.original, SRC, 'o original continua disponível');
});

test('R5 string VAZIA do provedor nunca apaga o texto original', () => {
  for (const bad of ['', '   ', '\n\t']) {
    const r = TR.normalize(bad, { sourceText: SRC, provider: 'P' });
    assert.strictEqual(r.isSuccess, false, `"${bad}" não pode ser tradução`);
    assert.strictEqual(r.translation, null);
    assert.strictEqual(r.original, SRC, 'o texto de origem precisa ser preservado');
  }
});

test('R6 tipo errado (número, objeto, array, boolean) vira FAILED', () => {
  for (const bad of [42, {}, [], true, NaN]) {
    const r = TR.normalize(bad, { sourceText: SRC, provider: 'P' });
    assert.strictEqual(r.isSuccess, false, `${typeof bad} não pode ser tradução`);
    assert.strictEqual(r.translation, null);
    assert.strictEqual(r.original, SRC);
  }
});

test('R7 objeto com status FAILED mas translation preenchido é neutralizado', () => {
  // Malformação deliberada de um provedor.
  const r = TR.normalize(
    { status: S.FAILED, translation: SRC, error: 'caiu a rede' },
    { sourceText: SRC, provider: 'P' },
  );
  assert.strictEqual(r.isSuccess, false);
  assert.strictEqual(r.translation, null,
    'um status de falha NUNCA pode carregar tradução');
  assert.strictEqual(r.reason, 'caiu a rede');
});

test('R8 objeto com status inventado é tratado como FAILED', () => {
  const r = TR.normalize(
    { status: 'MEU_STATUS_INVENTADO', translation: 'x' },
    { sourceText: SRC, provider: 'P' },
  );
  assert.strictEqual(r.status, S.FAILED);
  assert.strictEqual(r.translation, null);
});

test('R9 status BLOCKED e REJECTED preservam o motivo', () => {
  for (const st of [S.BLOCKED, S.REJECTED]) {
    const r = TR.normalize(
      { status: st, reason: 'circuit breaker aberto' },
      { sourceText: SRC, provider: 'P' },
    );
    assert.strictEqual(r.status, st);
    assert.strictEqual(r.isSuccess, false);
    assert.strictEqual(r.translation, null);
    assert.strictEqual(r.reason, 'circuit breaker aberto');
  }
});

test('R10 todo resultado normalizado satisfaz o contrato', () => {
  const inputs = ['Olá', '', SRC, null, undefined, 42, {}, [],
    { status: S.TRANSLATED, translation: 'oi' },
    { status: S.FAILED, translation: SRC },
    { status: 'inventado' }];
  for (const i of inputs) {
    const r = TR.normalize(i, { sourceText: SRC, provider: 'P' });
    const c = TR.assertContract(r);
    assert.strictEqual(c.ok, true, `contrato violado por ${JSON.stringify(i)}: ${c.problems.join('; ')}`);
  }
});

test('R11 assertContract DETECTA violação (não é decorativo)', () => {
  const bad = { status: S.FAILED, isSuccess: false, translation: SRC, original: SRC };
  const c = TR.assertContract(bad);
  assert.strictEqual(c.ok, false);
  assert.ok(c.problems.some((p) => p.includes('translation')),
    'deve apontar que translation está preenchido em status de falha');

  const bad2 = { status: S.TRANSLATED, isSuccess: false, translation: 'x', original: SRC };
  assert.strictEqual(TR.assertContract(bad2).ok, false,
    'isSuccess contradizendo o status deve ser detectado');
});

test('R12 helpers translated/failed/notTranslated constroem resultados válidos', () => {
  const t = TR.translated('Olá', 'P', SRC);
  assert.strictEqual(t.status, S.TRANSLATED);
  const f = TR.failed('timeout', 'P', SRC);
  assert.strictEqual(f.status, S.FAILED);
  assert.strictEqual(f.translation, null);
  const n = TR.notTranslated('sem dicionário', 'P', SRC);
  assert.strictEqual(n.status, S.NOT_TRANSLATED);
  assert.strictEqual(n.translation, null);
  for (const r of [t, f, n]) assert.strictEqual(TR.assertContract(r).ok, true);
});

// ---------------------------------------------------------------------------
// TranslationProviderRegistry
// ---------------------------------------------------------------------------
function registryWith(provider) {
  const r = new TranslationProviderRegistry();
  r.register('TestProvider', provider);
  r.setActiveProvider('TestProvider');
  return r;
}

test('P1 registry aceita provedor que devolve string válida', async () => {
  const r = registryWith({ translate: async () => 'Olá, mundo' });
  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.TRANSLATED);
  assert.strictEqual(res.translation, 'Olá, mundo');
  assert.strictEqual(res.provider, 'TestProvider');
});

test('P2 registry com provedor que LANÇA devolve FAILED sem translation', async () => {
  const r = registryWith({
    translate: async () => { throw new Error('HTTP 503 do provedor'); },
  });
  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.FAILED);
  assert.strictEqual(res.isSuccess, false);
  assert.strictEqual(res.translation, null, 'BUG ORIGINAL: translation recebia o original');
  assert.strictEqual(res.original, SRC);
  assert.match(res.reason, /503/);
});

test('P3 registry com provedor que devolve null NÃO declara sucesso', async () => {
  const r = registryWith({ translate: async () => null });
  const res = await r.translate(SRC);
  assert.strictEqual(res.isSuccess, false);
  assert.strictEqual(res.translation, null);
  assert.strictEqual(res.status, S.FAILED);
});

test('P4 registry com provedor que devolve o original NÃO declara sucesso', async () => {
  const r = registryWith({ translate: async (t) => t });
  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.NOT_TRANSLATED);
  assert.strictEqual(res.isSuccess, false);
  assert.strictEqual(res.translation, null);
});

test('P5 TM que devolve o original não é tratada como acerto', async () => {
  const r = new TranslationProviderRegistry();
  // TM "acerta" devolvendo exatamente o texto de origem.
  r.register('TranslationMemory', {
    lookup: async () => ({ translation: SRC }),
  });
  r.register('TestProvider', { translate: async () => null });
  r.setActiveProvider('TestProvider');

  const res = await r.translate(SRC);
  assert.notStrictEqual(res.provider, 'TranslationMemory',
    'uma TM que devolve o original não acertou nada');
  assert.strictEqual(res.isSuccess, false);
});

test('P6 TM que devolve tradução real é usada', async () => {
  const r = new TranslationProviderRegistry();
  r.register('TranslationMemory', {
    lookup: async () => ({ translation: 'Olá da TM' }),
  });
  r.register('TestProvider', { translate: async () => 'Outro' });
  r.setActiveProvider('TestProvider');

  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.TRANSLATED);
  assert.strictEqual(res.translation, 'Olá da TM');
  assert.strictEqual(res.provider, 'TranslationMemory');
});

test('P7 falha de TM não aborta a cadeia', async () => {
  const r = new TranslationProviderRegistry();
  r.register('TranslationMemory', {
    lookup: async () => { throw new Error('TM fora do ar'); },
  });
  r.register('TestProvider', { translate: async () => 'Olá do ativo' });
  r.setActiveProvider('TestProvider');

  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.TRANSLATED);
  assert.strictEqual(res.translation, 'Olá do ativo');
});

test('P8 entrada vazia devolve UNCHANGED sem translation', async () => {
  const r = registryWith({ translate: async () => 'x' });
  for (const bad of ['', '   ', null, undefined, 42]) {
    const res = await r.translate(bad);
    assert.strictEqual(res.status, S.UNCHANGED);
    assert.strictEqual(res.translation, null);
  }
});

test('P9 registry sem nenhum provedor devolve NOT_TRANSLATED', async () => {
  const r = new TranslationProviderRegistry();
  const res = await r.translate(SRC);
  assert.strictEqual(res.status, S.NOT_TRANSLATED);
  assert.strictEqual(res.translation, null);
});

test('P10 register() rejeita provedor sem translate()', () => {
  const r = new TranslationProviderRegistry();
  assert.throws(() => r.register('Ruim', {}), /não implementa translate/);
  assert.throws(() => r.register('Ruim', null), /deve ser um objeto/);
  assert.throws(() => r.register('', { translate: async () => 'x' }), /nome/);
});

test('P11 checkHealth NÃO declara ONLINE sem healthCheck', async () => {
  const r = registryWith({ translate: async () => 'x' });
  const h = await r.checkHealth();
  assert.strictEqual(h.TestProvider.status, 'UNKNOWN',
    'BUG ORIGINAL: provedor sem healthCheck era ONLINE sem ser consultado');
  assert.match(h.TestProvider.detail, /não implementa healthCheck/);
  assert.strictEqual(h.__meta.unknown, 1);
});

test('P12 checkHealth usa o healthCheck quando existe', async () => {
  const r = registryWith({
    translate: async () => 'x',
    healthCheck: async () => ({ status: 'ONLINE', latencyMs: 42 }),
  });
  const h = await r.checkHealth();
  assert.strictEqual(h.TestProvider.status, 'ONLINE');
  assert.strictEqual(h.TestProvider.latencyMs, 42);
  assert.strictEqual(h.__meta.verified, 1);
});

test('P13 healthCheck que lança vira ERROR', async () => {
  const r = registryWith({
    translate: async () => 'x',
    healthCheck: async () => { throw new Error('timeout no health'); },
  });
  const h = await r.checkHealth();
  assert.strictEqual(h.TestProvider.status, 'ERROR');
  assert.match(h.TestProvider.error, /timeout/);
});

test('P14 coalescência mantém o contrato sob concorrência', async () => {
  let calls = 0;
  const r = registryWith({
    translate: async () => { calls++; return 'Olá'; },
  });
  const results = await Promise.all([
    r.translate(SRC), r.translate(SRC), r.translate(SRC),
  ]);
  assert.strictEqual(calls, 1, 'requisições idênticas devem coalescer');
  for (const res of results) {
    assert.strictEqual(res.status, S.TRANSLATED);
    assert.strictEqual(TR.assertContract(res).ok, true);
  }
});

test('P15 translateBatch devolve resultados com contrato válido', async () => {
  const r = registryWith({
    translate: async (t) => {
      if (t === 'ERRO') throw new Error('falhou');
      if (t === 'VAZIO') return null;
      return `pt:${t}`;
    },
  });
  const out = await r.translateBatch([
    { text: 'a' }, { text: 'ERRO' }, { text: 'VAZIO' }, { text: 'b' },
  ], { maxBatchSize: 2 });

  assert.strictEqual(out.length, 4);
  assert.strictEqual(out[0].status, S.TRANSLATED);
  assert.strictEqual(out[1].status, S.FAILED);
  assert.strictEqual(out[1].translation, null);
  assert.strictEqual(out[2].status, S.FAILED);
  assert.strictEqual(out[2].translation, null);
  assert.strictEqual(out[3].status, S.TRANSLATED);
  for (const res of out) {
    assert.strictEqual(TR.assertContract(res).ok, true,
      `contrato violado: ${JSON.stringify(res)}`);
  }
});

runAll();
