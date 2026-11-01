/**
 * tests/unit/providerFalseSuccess.test.js — FASE 3 / PASSO 25
 *
 * Cobre os "returns falsos" que existiam FORA do registry, em
 * `translationProvider.js` e `fastTextPipeline.js`.
 *
 * São os piores do projeto porque não exigem erro de rede para mentir:
 *
 *  - `translationProvider.translate()` devolvia `ok:true` com `translated`
 *    igual ao TEXTO DE ORIGEM quando o dicionário não tinha a entrada.
 *  - `fastTextPipeline` fabricava `[Offline] <original>` com o circuit
 *    breaker aberto, e gravava essa falsidade no jogo.
 *  - `fastTextPipeline` atribuía o OBJETO devolvido pelo provedor à variável
 *    `translatedText`, entregando "[object Object]" ao jogo.
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
  console.log('=== FASE 3 — RETURNS FALSOS FORA DO REGISTRY ===');
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
  console.log('\n--- RESULTADO FASE 3 (returns falsos) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const TR = require(path.join(ROOT, 'src', 'core', 'translationResult'));
const { TRANSLATION_STATUS: S } = TR;
const TranslationProvider = require(path.join(ROOT, 'src', 'core', 'translationProvider'));
const FastTextPipeline = require(path.join(ROOT, 'src', 'core', 'fastTextPipeline'));

const JP = 'こんにちは、世界';

// ---------------------------------------------------------------------------
// translationProvider
// ---------------------------------------------------------------------------
test('T1 termo no dicionário é traduzido de verdade', async () => {
  const p = new TranslationProvider();
  const r = await p.translate('start');
  assert.strictEqual(r.status, S.TRANSLATED);
  assert.strictEqual(r.isSuccess, true);
  assert.strictEqual(r.translation, 'iniciar');
});

test('T2 termo AUSENTE do dicionário NÃO é sucesso nem tradução', async () => {
  const p = new TranslationProvider();
  const r = await p.translate(JP);
  assert.strictEqual(r.isSuccess, false,
    'BUG ORIGINAL: devolvia {ok:true, translated: <texto de origem>}');
  assert.strictEqual(r.translation, null,
    'BUG ORIGINAL: translation recebia o japonês inalterado');
  assert.strictEqual(r.original, JP);
  assert.strictEqual(r.status, S.NOT_TRANSLATED);
  assert.match(r.reason, /dicionário offline/);
});

test('T3 mockPrefix só funciona com opt-in e é rotulado como MOCK', async () => {
  const p = new TranslationProvider();
  const comMock = await p.translate(JP, { mockPrefix: '[T]' });
  assert.strictEqual(comMock.status, S.TRANSLATED);
  assert.match(comMock.reason, /MOCK/);
  assert.strictEqual(comMock.meta.isMock, true,
    'o consumidor precisa poder distinguir mock de tradução real');

  // Sem a flag, nada é inventado.
  const semMock = await p.translate(JP, {});
  assert.strictEqual(semMock.translation, null,
    'sem opt-in explícito, nenhum texto pode ser fabricado');
});

test('T4 entrada vazia ou não-string devolve UNCHANGED', async () => {
  const p = new TranslationProvider();
  for (const bad of ['', '   ', null, undefined, 42]) {
    const r = await p.translate(bad);
    assert.strictEqual(r.status, S.UNCHANGED, `entrada ${JSON.stringify(bad)}`);
    assert.strictEqual(r.translation, null);
  }
});

test('T5 todo resultado do TranslationProvider respeita o contrato', async () => {
  const p = new TranslationProvider();
  const inputs = ['start', JP, '', 'x'.repeat(500), null];
  for (const i of inputs) {
    for (const ctx of [{}, { mockPrefix: '[T]' }]) {
      const r = await p.translate(i, ctx);
      const c = TR.assertContract(r);
      assert.strictEqual(c.ok, true,
        `contrato violado por ${JSON.stringify(i)}: ${c.problems.join('; ')}`);
    }
  }
});

// ---------------------------------------------------------------------------
// fastTextPipeline
// ---------------------------------------------------------------------------
function makeServices(over = {}) {
  return {
    textClassifier: { classify: () => ({ isCode: false }) },
    translationMemory: null,
    multiLevelCache: null,
    translationProvider: null,
    glossaryEngine: null,
    placeholderValidator: null,
    outputProvider: null,
    ...over,
  };
}

async function runOne(pipeline, services, text) {
  return pipeline.processItem({ text, priority: 'P2', metadata: {} }, services);
}

test('F1 provider no formato LEGADO ({ok,translated}) é interpretado certo', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationProvider: {
      translate: async () => ({ ok: true, original: JP, translated: 'Olá, mundo', source: 'legacy' }),
    },
  });
  const r = await runOne(pipeline, services, JP);
  assert.strictEqual(r.translation, 'Olá, mundo');
  assert.strictEqual(typeof r.translation, 'string',
    'BUG ORIGINAL: o objeto do provider era atribuído a translatedText');
  assert.strictEqual(r.wasTranslated, true);
});

test('F2 provider legado com translated == original NÃO é sucesso', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationProvider: {
      translate: async () => ({ ok: true, original: JP, translated: JP, source: 'legacy' }),
    },
  });
  const r = await runOne(pipeline, services, JP);
  assert.strictEqual(r.wasTranslated, false,
    'BUG ORIGINAL: source=EXTERNAL_PROVIDER e failures zerados sem traduzir');
  assert.strictEqual(r.translation, JP, 'o original é preservado, não inventado');
  assert.ok(r.notTranslatedReason, 'a razão precisa ser informada');
});

test('F3 objeto do provider NUNCA vira [object Object]', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationProvider: {
      translate: async () => ({ ok: true, original: JP, translated: 'Olá', source: 'x' }),
    },
    placeholderValidator: {
      validate: (orig, trans) => {
        // Se(trans) fosse objeto, este validador receberia algo incorreto.
        assert.strictEqual(typeof trans, 'string',
          `o validador de placeholders recebeu ${typeof trans}`);
        return { valid: true, errors: [] };
      },
    },
    outputProvider: {
      deliver: async (meta, text) => {
        assert.strictEqual(typeof text, 'string',
          `o outputProvider recebeu ${typeof text}`);
        assert.ok(!String(text).includes('[object'),
          'texto entregue contém [object Object]');
      },
    },
  });
  const r = await runOne(pipeline, services, JP);
  assert.strictEqual(r.translation, 'Olá');
});

test('F4 circuit breaker aberto NÃO fabrica "[Offline] <original>"', async () => {
  const pipeline = new FastTextPipeline();
  pipeline.circuitBreakerOpen = true;
  pipeline.circuitBreakerResetTime = Date.now() + 60000;
  const r = await runOne(pipeline, makeServices(), JP);

  assert.ok(!String(r.translation).includes('[Offline'),
    'BUG ORIGINAL: fabricava "[Offline] こんにちは" e gravava no jogo');
  assert.strictEqual(r.translation, JP);
  assert.strictEqual(r.wasTranslated, false);
  assert.strictEqual(r.isSuccess, false);
  assert.match(r.notTranslatedReason, /circuit breaker/);
});

test('F5 o resultado SEMPRE declara se foi traduzido', async () => {
  const pipeline = new FastTextPipeline();

  const semProvider = await runOne(pipeline, makeServices(), JP);
  assert.strictEqual(semProvider.wasTranslated, false);
  assert.strictEqual(semProvider.isSuccess, false);
  assert.ok(semProvider.notTranslatedReason);

  const comCache = await runOne(
    pipeline,
    makeServices({ multiLevelCache: { get: () => 'Do cache' } }),
    JP,
  );
  assert.strictEqual(comCache.wasTranslated, true,
    'um acerto de cache É uma tradução válida');
  assert.strictEqual(comCache.translation, 'Do cache');

  const comTM = await runOne(
    pipeline,
    makeServices({ translationMemory: { lookup: () => ({ translation: 'Da TM', matchType: 'EXACT' }) } }),
    JP,
  );
  assert.strictEqual(comTM.wasTranslated, true);
  assert.strictEqual(comTM.source, 'EXACT');
});

test('F6 placeholder inválido reverte E registra o motivo', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationProvider: {
      translate: async () => ({ ok: true, original: JP, translated: 'Oi {name}', source: 'x' }),
    },
    placeholderValidator: {
      validate: () => ({ valid: false, errors: ['placeholder {name} perdido'] }),
    },
  });
  const r = await runOne(pipeline, services, JP);

  assert.strictEqual(r.translation, JP, 'o original é restaurado');
  assert.strictEqual(r.wasTranslated, false,
    'BUG ORIGINAL: a reversão era silenciosa e wasTranslated não existia');
  assert.match(r.notTranslatedReason, /placeholder/);
  assert.strictEqual(r.source, 'PLACEHOLDER_REVERTED',
    'a origem deixa de fingir que foi o provedor');
});

test('F7 provedor que lança conta como falha e abre o circuit breaker', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationProvider: {
      translate: async () => { throw new Error('503 do provedor'); },
    },
  });

  // Três falhas consecutivas abrem o breaker.
  let r;
  for (let i = 0; i < 3; i++) {
    r = await runOne(pipeline, services, JP);
  }
  assert.strictEqual(r.wasTranslated, false);
  assert.match(r.notTranslatedReason, /503/);
  assert.strictEqual(pipeline.circuitBreakerOpen, true,
    'provedor quebrado precisa abrir o breaker');
});

test('F8 TM que devolve string vazia NÃO conta como tradução', async () => {
  const pipeline = new FastTextPipeline();
  const services = makeServices({
    translationMemory: { lookup: () => ({ translation: '', matchType: 'EXACT' }) },
    multiLevelCache: null,
  });
  const r = await runOne(pipeline, services, JP);
  // Vazio é falsy, então o pipeline segue para o provedor (que não existe
  // aqui) e cai no fallback offline.
  assert.strictEqual(r.translation, JP);
  assert.strictEqual(r.wasTranslated, false);
});

test('F9 nenhum caminho do pipeline devolve texto não-string', async () => {
  const pipeline = new FastTextPipeline();
  const providers = [
    null,
    { translate: async () => 'texto simples' },
    { translate: async () => ({ ok: true, translated: 'obj ok', source: 'a' }) },
    { translate: async () => ({ ok: false, translated: 'obj falha', source: 'b' }) },
    { translate: async () => null },
    { translate: async () => 12345 },
    { translate: async () => ({ status: S.TRANSLATED, translation: 'contrato' }) },
    { translate: async () => { throw new Error('boom'); } },
  ];
  for (const p of providers) {
    const r = await runOne(pipeline, makeServices({ translationProvider: p }), JP);
    assert.strictEqual(typeof r.translation, 'string',
      `provedor ${JSON.stringify(String(p && p.translate))} produziu ${typeof r.translation}`);
    assert.ok(!String(r.translation).includes('[object'),
      'resultado contém [object Object]');
    assert.strictEqual(typeof r.wasTranslated, 'boolean');
  }
});

runAll();
