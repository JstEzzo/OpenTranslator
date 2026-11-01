/**
 * tests/unit/applyVerification.test.js — FASE 2 / PASSO 22 & 23
 *
 * Prova que a verificação pós-aplicação realmente detecta o que o adapter
 * omitiu. O teste central usa um adapter que MENTE: diz que gravou tudo, mas
 * só grava parte. É exatamente o cenário que o código original tratava como
 * sucesso integral.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const os = require('os');
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
  console.log('=== FASE 2 — VERIFICAÇÃO PÓS-APLICAÇÃO ===');
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
  console.log('\n--- RESULTADO FASE 2 (verificação de apply) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const { verifyApplied } = require(path.join(ROOT, 'src', 'core', 'applyVerifier'));
const TranslationCertificate = require(path.join(ROOT, 'src', 'core', 'translationCertificate'));
const { CERT_STATUS } = TranslationCertificate;

/** Cria um texto no formato do pipeline. */
function txt(id, clean, tokens) {
  return {
    id, clean, original: clean, tokens: tokens || [], context: {},
  };
}

/**
 * Adapter de teste com comportamento programável.
 * `written` é o estado inicial do "disco". `claimedCount` é o que `apply`
 * AFIRMA — pode ser maior que o que realmente foi escrito, que é o cenário
 * que a auditoria encontrou.
 */
function makeAdapter({ written, claimedCount }) {
  let stored = (written || []).slice();
  return {
    _stored: () => stored,
    // O adapter MENTE se written < claimedCount.
    async apply() {
      stored = (written || []).slice();
      return { success: true, count: claimedCount, modifiedFiles: ['fake.rpy'] };
    },
    async extract() {
      // Releitura devolve o que está de fato no "disco".
      return stored.map((w) => txt(w.id, w.clean));
    },
    async validate() {
      return { valid: true, errors: [] };
    },
    async rollback() {
      stored = [];
      return { success: true, detail: 'restaurado' };
    },
  };
}

// ---------------------------------------------------------------------------
test('V1 verificação aprova quando as traduções estão no disco e os originais sumiram', async () => {
  // Cenário real de sucesso: o adapter reescreveu os arquivos, a releitura
  // traz as traduções no lugar dos originais.
  const texts = [txt(1, 'こんにちは'), txt(2, 'さようなら')];
  const translations = new Map([[1, 'Olá'], [2, 'Adeus']]);
  const adapter = makeAdapter({
    written: [{ id: 1, clean: 'Olá' }, { id: 2, clean: 'Adeus' }],
    claimedCount: 2,
  });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.checked, 2, 'deve conferir as 2 traduções esperadas');
  assert.strictEqual(r.present, 2);
  assert.strictEqual(r.missing, 0);
  assert.strictEqual(r.stillOriginal, 0);
  assert.strictEqual(r.verified, true);
  assert.strictEqual(r.verificationPercent, 100);
  assert.ok(r.evidenceHash && r.evidenceHash.length > 0, 'deve produzir evidência');
});

// ---------------------------------------------------------------------------
test('V2 adapter que MENTE (grava menos do que afirma) é DETECTADO', async () => {
  const texts = [txt(1, 'a'), txt(2, 'b'), txt(3, 'c'), txt(4, 'd')];
  const translations = new Map([[1, 'A'], [2, 'B'], [3, 'C'], [4, 'D']]);

  // O adapter afirma count=4, mas só 2 textos foram de fato gravados.
  const adapter = makeAdapter({
    written: [{ id: 1, clean: 'A' }, { id: 2, clean: 'B' }],
    claimedCount: 4,
  });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.checked, 4);
  assert.strictEqual(r.present, 2, 'apenas 2 textos realmente gravados');
  assert.strictEqual(r.missing, 2, 'os 2 omitidos devem faltar');
  assert.strictEqual(r.verified, false,
    'BUG ORIGINAL: o pipeline confiava no count=4 e declarava sucesso');
  assert.match(r.reason, /2 ausente/);
  assert.ok(r.missingSample.length > 0, 'deve mostrar exemplos do que faltou');
});

// ---------------------------------------------------------------------------
test('V3 original que continua no disco é DETECTADO (arquivo não reescrito)', async () => {
  const texts = [txt(1, 'こんにちは')];
  const translations = new Map([[1, 'Olá']]);
  // O disco ainda tem o japonês: a escrita não chegou ao arquivo.
  const adapter = makeAdapter({
    written: [{ id: 1, clean: 'こんにちは' }],
    claimedCount: 1,
  });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.checked, 1);
  assert.strictEqual(r.missing, 1, 'a tradução não está no disco');
  assert.strictEqual(r.verified, false);
  assert.ok(r.missingSample.length > 0);
});

// ---------------------------------------------------------------------------
test('V3b tradução presente MAS original remanescente é reprovado', async () => {
  // Caso que a verificação por conteúdo não pegaria: a tradução foi gravada em
  // algum lugar, porém o texto original continua no jogo. Isso significa que
  // o arquivo não foi substituído no ponto certo.
  const texts = [txt(1, 'ORIGINAL_A')];
  const translations = new Map([[1, 'TRADUCAO']]);
  const adapter = makeAdapter({
    written: [{ id: 1, clean: 'TRADUCAO' }, { id: 2, clean: 'ORIGINAL_A' }],
    claimedCount: 1,
  });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.present, 1, 'a tradução foi encontrada');
  assert.strictEqual(r.stillOriginal, 1, 'o original também foi encontrado');
  assert.strictEqual(r.verified, false,
    'tradução presente + original remanescente não é aplicação limpa');
  assert.match(r.reason, /ainda com o texto original/);
});

// ---------------------------------------------------------------------------
test('V3c identidade (tradução == original) é aceita sem exigir remoção', async () => {
  // Quando a tradução é igual ao original (palavra intraduzível), o original
  // permanecer não é falha.
  const texts = [txt(1, 'HP')];
  const translations = new Map([[1, 'HP']]);
  const adapter = makeAdapter({ written: [{ id: 1, clean: 'HP' }], claimedCount: 1 });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.verified, true);
  assert.strictEqual(r.stillOriginal, 0);
});

// ---------------------------------------------------------------------------
test('V3d texto repetido é contado por ocorrência, não por valor único', async () => {
  // A mesma linha aparece 3 vezes no jogo e foi esperada 3 vezes.
  const texts = [txt(1, ' Continuar? '), txt(2, ' Continuar? '), txt(3, ' Continuar? ')];
  const translations = new Map([[1, 'Continuar?'], [2, 'Continuar?'], [3, 'Continuar?']]);
  const adapter = makeAdapter({
    written: [
      { id: 1, clean: 'Continuar?' },
      { id: 2, clean: 'Continuar?' },
      { id: 3, clean: 'Continuar?' },
    ],
    claimedCount: 3,
  });

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.checked, 3);
  assert.strictEqual(r.present, 3, 'as 3 ocorrências devem ser conferidas');
  assert.strictEqual(r.verified, true);
});

// ---------------------------------------------------------------------------
test('V4 reextração que falha deixa a verificação inconclusiva, não aprovada', async () => {
  const adapter = {
    async apply() { return { success: true, count: 10 }; },
    async extract() { throw new Error('adaptador explodiu ao reextrair'); },
  };
  const texts = [txt(1, 'a')];
  const translations = new Map([[1, 'A']]);

  const r = await verifyApplied({ adapter, targetDir: '.', texts, translations });

  assert.strictEqual(r.verified, false,
    'não conseguir verificar NÃO pode virar "verificado"');
  assert.match(r.reextractFailed, /explodiu/);
});

// ---------------------------------------------------------------------------
test('V5 reextração vazia não conta como verificação', async () => {
  const adapter = { async extract() { return []; } };
  const r = await verifyApplied({
    adapter, targetDir: '.', texts: [txt(1, 'a')], translations: new Map([[1, 'A']]),
  });
  assert.strictEqual(r.verified, false);
  assert.ok(r.reextractFailed, 'a causa precisa estar registrada');
});

test('V6 sem traduções, a verificação é explicitamente inconclusiva', async () => {
  const adapter = { async extract() { return []; } };
  const r = await verifyApplied({
    adapter, targetDir: '.', texts: [], translations: new Map(),
  });
  assert.strictEqual(r.verified, false);
  assert.match(r.reason, /nenhuma tradução/);
});

// ---------------------------------------------------------------------------
test('V7 certificado rebaixa para FAILED_APPLICATION com verificação falha', async () => {
  // Cenário: adapter afirma 100, verificação em disco reprova.
  const cert = TranslationCertificate.issue({
    engine: 'renpy',
    game: 'meu-jogo',
    totalDetected: 100,
    translatable: 100,
    cacheHits: 0,
    translatedNow: 100,
    coveredTexts: 100,
    pendingCount: 0,
    appliedCount: 100,
    alreadyUpToDate: false,
    qaErrorsCount: 0,
    verification: { verified: false, checked: 100, present: 60, missing: 40 },
  });

  assert.notStrictEqual(cert.finalStatus, CERT_STATUS.COMPLETED,
    'com verificação reprovada NUNCA pode ser COMPLETED');
  assert.strictEqual(cert.isSuccess, false);
  assert.strictEqual(cert.finalStatus, CERT_STATUS.FAILED_APPLICATION);
});

test('V8 certificado SÓ é COMPLETED com verificação em disco aprovada', async () => {
  const cert = TranslationCertificate.issue({
    engine: 'renpy',
    game: 'meu-jogo',
    totalDetected: 100,
    translatable: 100,
    cacheHits: 0,
    translatedNow: 100,
    coveredTexts: 100,
    pendingCount: 0,
    appliedCount: 100,
    alreadyUpToDate: false,
    qaErrorsCount: 0,
    verification: {
      verified: true, method: 'POST_APPLY_REEXTRACT', checked: 100, present: 100, missing: 0,
    },
  });

  assert.strictEqual(cert.finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(cert.isSuccess, true);
  assert.strictEqual(cert.verification.method, 'POST_APPLY_REEXTRACT');
  assert.strictEqual(cert.verification.checked, 100);
  assert.strictEqual(cert.verification.missing, 0);
  assert.strictEqual(cert.metrics.verificationMethod, 'POST_APPLY_REEXTRACT');
});

test('V9 certificado aceita gameKey e gameId como alias de game', () => {
  for (const key of ['game', 'gameKey', 'gameId']) {
    const cert = TranslationCertificate.issue({
      engine: 'renpy',
      [key]: 'meu-jogo',
      totalDetected: 100,
      translatable: 100,
      coveredTexts: 100,
      pendingCount: 0,
      appliedCount: 100,
      verification: { verified: true, method: 'POST_APPLY_REEXTRACT' },
    });
    assert.strictEqual(cert.finalStatus, CERT_STATUS.COMPLETED,
      `alias '${key}' deveria ser reconhecido como jogo válido`);
  }
});

test('V10 evidenceHash muda quando o conteúdo verificado muda', async () => {
  const build = async (written, translated) => {
    const texts = [txt(1, 'a'), txt(2, 'b')];
    const adapter = makeAdapter({ written, claimedCount: 2 });
    return verifyApplied({
      adapter, targetDir: '.', texts, translations: new Map([[1, translated], [2, 'B']]),
    });
  };
  const h1 = (await build([{ id: 1, clean: 'A' }, { id: 2, clean: 'B' }], 'A')).evidenceHash;
  const h2 = (await build([{ id: 1, clean: 'X' }, { id: 2, clean: 'B' }], 'A')).evidenceHash;
  assert.strictEqual(typeof h1, 'string');
  assert.ok(h1.length > 0);
  assert.notStrictEqual(h1, h2, 'conteúdo diferente deve gerar hash diferente');
});

// ---------------------------------------------------------------------------
test('V11 o pipeline passa verification ao certificado (código, não sóunit)', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  );
  assert.ok(src.includes('require(\'./applyVerifier\')')
    || src.includes('require("./applyVerifier")'),
  'o pipeline deve chamar o verificador');
  assert.ok(/verification:\s*\{/.test(src),
    'o pipeline deve passar o bloco verification ao certificado');
  assert.ok(src.includes('rollbackInfo'),
    'o pipeline deve verificar o resultado do rollback');
  assert.ok(src.includes('NÃO CONFIRMADO'),
    'o pipeline deve avisar quando o rollback não é confirmado');
});

test('V12 a escotilha dos "15 diffs tolerados" sumiu', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  );
  assert.ok(!src.includes('Math.max(15, Math.round(texts.length * 0.01))'),
    'a tolerância a diferenças não aplicadas não pode voltar');
});

runAll();
