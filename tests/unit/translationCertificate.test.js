/**
 * tests/unit/translationCertificate.test.js
 *
 * FASE 2 / PASSO 2 — INVARIANTES DO CERTIFICADO
 *
 * O teste que a auditoria exigia: entrada vazia NUNCA pode virar COMPLETED.
 * Aqui isso e' provado com casos concretos, incluindo tentativas de contorno.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const TranslationCertificate = require(
  path.join(__dirname, '..', '..', 'src', 'core', 'translationCertificate'),
);
const { CERT_STATUS, TranslationCertificateInvariantError } = TranslationCertificate;

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

/** Métricas de um caso 100% bem-sucedido. */
function perfect(over) {
  return Object.assign({
    engine: 'renpy',
    game: 'meu_jogo',
    totalDetected: 500,
    translatable: 500,
    cacheHits: 100,
    translatedNow: 400,
    pendingCount: 0,
    failedCount: 0,
    appliedCount: 500,
    alreadyUpToDate: false,
    qaErrorsCount: 0,
    verification: { verified: true, filesChanged: 12, method: 'sha256' },
    runtimeStatus: 'NOT_REQUIRED',
    runtimeRequired: false,
  }, over || {});
}

console.log('=== FASE 2 — TRANSLATION CERTIFICATE (invariantes) ===');

// -------------------------------------------------------------------------
// O caso central da auditoria
// -------------------------------------------------------------------------
test('BUG-1 issue({}) NAO retorna COMPLETED (o bug original da auditoria)', () => {
  const c = TranslationCertificate.issue({});
  assert.notStrictEqual(c.finalStatus, CERT_STATUS.COMPLETED,
    `vazio virou ${c.finalStatus} — o bug original voltou`);
  assert.strictEqual(c.isSuccess, false, 'entrada vazia NUNCA pode ter isSuccess=true');
  assert.strictEqual(c.finalStatus, CERT_STATUS.UNKNOWN);
  assert(c.reason && c.reason.length > 0, 'deve haver reason explicando');
});

test('BUG-1b issue() sem argumentos tambem e recusado', () => {
  const c = TranslationCertificate.issue();
  assert.strictEqual(c.isSuccess, false);
  assert.strictEqual(c.finalStatus, CERT_STATUS.UNKNOWN);
});

test('BUG-1c nao ha NENHUM parametro opcional que produza COMPLETED sozinho', () => {
  // Cada parametro isolado, sem os demais, deve falhar.
  const singles = [
    { engine: 'renpy' },
    { game: 'x' },
    { totalDetected: 100 },
    { translatable: 100 },
    { cacheHits: 100 },
    { translatedNow: 100 },
    { appliedCount: 100 },
    { alreadyUpToDate: true },
    { qaErrorsCount: 0 },
    { verification: { verified: true } },
    { runtimeStatus: 'RUNTIME_VERIFIED' },
  ];
  for (const p of singles) {
    const c = TranslationCertificate.issue(p);
    assert.strictEqual(c.isSuccess, false,
      `parametro isolado ${JSON.stringify(p)} produziu isSuccess=true`);
  }
});

// -------------------------------------------------------------------------
// I1: status != COMPLETED implica isSuccess == false
// -------------------------------------------------------------------------
test('I1 nenhum status nao-COMPLETED tem isSuccess=true', () => {
  const cases = [
    perfect({ pendingCount: 10, coveredTexts: 490 }),
    perfect({ pendingCount: 400 }),
    perfect({ appliedCount: 0 }),
    perfect({ qaErrorsCount: 3 }),
    perfect({ isRateLimited: true, pendingCount: 5 }),
    perfect({ isUnsupported: true }),
    perfect({ engine: 'unknown' }),
    perfect({ game: '' }),
    perfect({ totalDetected: 0, translatable: 0 }),
    perfect({ failedCount: 7, pendingCount: 7, coveredTexts: 493 }),
    perfect({ runtimeRequired: true, runtimeStatus: 'UNVERIFIED' }),
    perfect({ verification: { verified: false }, verificationStatus: 'PENDING' }),
  ];
  for (const p of cases) {
    const c = TranslationCertificate.issue(p);
    assert.strictEqual(c.isSuccess, false,
      `case ${JSON.stringify(Object.keys(p))} -> ${c.finalStatus} com isSuccess=true`);
    assert.notStrictEqual(c.finalStatus, CERT_STATUS.COMPLETED);
  }
});

test('I3 PARTIAL => isSuccess=false (corrige o isSuccess=true da versao antiga)', () => {
  // 1000 textos, 20 pendentes: parcial tolerável.
  const c = TranslationCertificate.issue(perfect({
    totalDetected: 1000,
    translatable: 1000,
    cacheHits: 0,
    translatedNow: 980,
    coveredTexts: 980,
    pendingCount: 20,
    appliedCount: 980,
  }));
  assert.strictEqual(c.finalStatus, CERT_STATUS.PARTIAL, `veio ${c.finalStatus}`);
  assert.strictEqual(c.isSuccess, false, 'PARTIAL NUNCA pode ter isSuccess=true');
});

test('I4 INCOMPLETE quando a metade+ fica pendente', () => {
  const c = TranslationCertificate.issue(perfect({
    totalDetected: 1000,
    translatable: 1000,
    cacheHits: 0,
    translatedNow: 400,
    coveredTexts: 400,
    pendingCount: 600,
    appliedCount: 400,
  }));
  assert.strictEqual(c.finalStatus, CERT_STATUS.INCOMPLETE);
  assert.strictEqual(c.isSuccess, false);
});

// -------------------------------------------------------------------------
// I2: COMPLETED exige evidências
// -------------------------------------------------------------------------
test('I2 COMPLETED exige engine, jogo, universo e pendencia zero', () => {
  const c = TranslationCertificate.issue(perfect());
  assert.strictEqual(c.finalStatus, CERT_STATUS.COMPLETED, `veio ${c.finalStatus}: ${c.reason}`);
  assert.strictEqual(c.isSuccess, true);
  assert.deepStrictEqual(c.violations, []);
  assert.strictEqual(c.pendingCount, 0);
  assert.strictEqual(c.failedCount, 0);
});

test('I2b COMPLETED exige appliedCount>0 (ou alreadyUpToDate)', () => {
  const semAplicacao = TranslationCertificate.issue(perfect({ appliedCount: 0 }));
  assert.strictEqual(semAplicacao.isSuccess, false);
  assert.notStrictEqual(semAplicacao.finalStatus, CERT_STATUS.COMPLETED);

  const jaAtualizado = TranslationCertificate.issue(perfect({
    appliedCount: 0,
    alreadyUpToDate: true,
  }));
  assert.strictEqual(jaAtualizado.finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(jaAtualizado.patchResult, 'ALREADY_UP_TO_DATE');
  assert.strictEqual(jaAtualizado.isSuccess, true);
});

test('I2c COMPLETED exige verificacao', () => {
  const semVerif = TranslationCertificate.issue(perfect({
    verification: { verified: false },
    verificationStatus: 'PENDING',
  }));
  assert.strictEqual(semVerif.isSuccess, false);
  assert.strictEqual(semVerif.finalStatus, CERT_STATUS.FAILED_APPLICATION);
});

test('I2d COMPLETED exige runtime verificado quando runtimeRequired', () => {
  const semRuntime = TranslationCertificate.issue(perfect({
    runtimeRequired: true,
    runtimeStatus: 'UNVERIFIED',
  }));
  assert.strictEqual(semRuntime.isSuccess, false);
  assert.strictEqual(semRuntime.finalStatus, CERT_STATUS.INCOMPLETE);

  const comRuntime = TranslationCertificate.issue(perfect({
    runtimeRequired: true,
    runtimeStatus: 'RUNTIME_VERIFIED',
  }));
  assert.strictEqual(comRuntime.finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(comRuntime.isSuccess, true);
});

// -------------------------------------------------------------------------
// Cobertura não pode ser inflada
// -------------------------------------------------------------------------
test('COV-1 pendingCount nunca pode ser MENOR que a aritmetica permite', () => {
  // O pipeline antigo podia informar pending=0 com covered=100 de 500.
  const c = TranslationCertificate.issue(perfect({
    totalDetected: 500,
    translatable: 500,
    cacheHits: 0,
    translatedNow: 100,
    coveredTexts: 100,
    pendingCount: 0, // MENTIRA do pipeline
    appliedCount: 100,
  }));
  // O certificado corrige: 500 - 100 = 400 pendentes reais.
  assert.strictEqual(c.pendingCount, 400,
    `pending deveria ser 400 (aritmetica), veio ${c.pendingCount}`);
  assert.strictEqual(c.isSuccess, false);
  assert.strictEqual(c.finalStatus, CERT_STATUS.INCOMPLETE);
});

test('COV-2 coveragePercent nunca excede 100', () => {
  const c = TranslationCertificate.issue(perfect({
    translatable: 10,
    cacheHits: 20,
    translatedNow: 20,
    coveredTexts: 40,
  }));
  assert(c.coveragePercent <= 100, `coverage ${c.coveragePercent} > 100`);
});

// -------------------------------------------------------------------------
// I10: patchResult coerente
// -------------------------------------------------------------------------
test('I10 patchResult nunca contradiz finalStatus', () => {
  const falhou = TranslationCertificate.issue(perfect({ appliedCount: 0 }));
  assert.strictEqual(falhou.finalStatus, CERT_STATUS.FAILED_APPLICATION);
  assert.notStrictEqual(falhou.patchResult, 'APPLIED',
    'FAILED_APPLICATION nao pode ter patchResult=APPLIED');

  const parcial = TranslationCertificate.issue(perfect({
    totalDetected: 1000, translatable: 1000,
    cacheHits: 0, translatedNow: 980, coveredTexts: 980,
    pendingCount: 20, appliedCount: 980,
  }));
  assert.strictEqual(parcial.finalStatus, CERT_STATUS.PARTIAL);
  assert.strictEqual(parcial.patchResult, 'APPLIED');
});

// -------------------------------------------------------------------------
// Assert interno é real
// -------------------------------------------------------------------------
test('ASRT assertInvariants LANCARA se alguem violar I1', () => {
  const fake = { isSuccess: true, finalStatus: CERT_STATUS.PARTIAL };
  assert.throws(
    () => TranslationCertificate.assertInvariants(fake),
    (e) => e instanceof TranslationCertificateInvariantError,
    'deve lançar TranslationCertificateInvariantError',
  );
});

test('ASRT assertInvariants LANCARA se violar I2 (COMPLETED sem evidencias)', () => {
  const fakeIncompleto = {
    isSuccess: true,
    finalStatus: CERT_STATUS.COMPLETED,
    engine: 'renpy',
    game: 'g',
    translatableTexts: 0,
    pendingCount: 0,
    failedCount: 0,
    appliedCount: 0,
    patchResult: 'NONE',
    flags: { isRateLimited: false },
  };
  assert.throws(
    () => TranslationCertificate.assertInvariants(fakeIncompleto),
    (e) => e instanceof TranslationCertificateInvariantError,
  );
});

test('ASRT isCompleted() retorna false para certificado violado', () => {
  assert.strictEqual(TranslationCertificate.isCompleted({ isSuccess: true, finalStatus: 'PARTIAL' }), false);
  assert.strictEqual(TranslationCertificate.isCompleted(null), false);
  assert.strictEqual(TranslationCertificate.isCompleted(TranslationCertificate.issue({})), false);
});

// -------------------------------------------------------------------------
// fromFailure nunca produz sucesso
// -------------------------------------------------------------------------
test('FAIL fromFailure() sempre produz nao-sucesso', () => {
  const c = TranslationCertificate.fromFailure('excecao na rede');
  assert.strictEqual(c.isSuccess, false);
  assert.notStrictEqual(c.finalStatus, CERT_STATUS.COMPLETED);
});

// -------------------------------------------------------------------------
// Cobertura de cada status
// -------------------------------------------------------------------------
test('STATUS todos os 9 status sao alcancaveis e coerentes', () => {
  const expected = {
    [CERT_STATUS.UNKNOWN]: TranslationCertificate.issue({}),
    [CERT_STATUS.UNSUPPORTED]: TranslationCertificate.issue(perfect({ isUnsupported: true })),
    [CERT_STATUS.INCOMPLETE_RATE_LIMITED]: TranslationCertificate.issue(
      perfect({ isRateLimited: true, pendingCount: 30 }),
    ),
    [CERT_STATUS.FAILED_QA]: TranslationCertificate.issue(perfect({ qaErrorsCount: 2 })),
    [CERT_STATUS.FAILED_APPLICATION]: TranslationCertificate.issue(
      perfect({ appliedCount: 0, verification: { verified: true } }),
    ),
    [CERT_STATUS.PARTIAL]: TranslationCertificate.issue(perfect({
      totalDetected: 1000, translatable: 1000, cacheHits: 0,
      translatedNow: 980, coveredTexts: 980, pendingCount: 20, appliedCount: 980,
    })),
    [CERT_STATUS.INCOMPLETE]: TranslationCertificate.issue(perfect({
      totalDetected: 1000, translatable: 1000, cacheHits: 0,
      translatedNow: 400, coveredTexts: 400, pendingCount: 600, appliedCount: 400,
    })),
    [CERT_STATUS.COMPLETED]: TranslationCertificate.issue(perfect()),
  };
  for (const [status, cert] of Object.entries(expected)) {
    assert.strictEqual(cert.finalStatus, status,
      `esperava ${status}, veio ${cert.finalStatus} (${cert.reason})`);
    const shouldSucceed = status === CERT_STATUS.COMPLETED;
    assert.strictEqual(cert.isSuccess, shouldSucceed,
      `${status}: isSuccess deveria ser ${shouldSucceed}`);
  }
});

// -------------------------------------------------------------------------
// Compatibilidade: o teste antigo do projeto (12 casos) continua valendo
// -------------------------------------------------------------------------
test('COMP os 12 casos do test_translation_completeness usam a nova semantica', () => {
  const pct = (p) => TranslationCertificate.issue(perfect({
    totalDetected: 10000, translatable: 10000,
    cacheHits: 0, translatedNow: Math.round(10000 * p),
    coveredTexts: Math.round(10000 * p),
    pendingCount: 10000 - Math.round(10000 * p),
    appliedCount: Math.round(10000 * p),
  }));

  // Déficit material: metade ou mais pendente => INCOMPLETE.
  // Regra: pending >= 50% do universo.
  for (const p of [0, 0.01, 0.1, 0.3, 0.49, 0.5]) {
    assert.strictEqual(pct(p).finalStatus, CERT_STATUS.INCOMPLETE,
      `${p * 100}% coberto deveria ser INCOMPLETE`);
    assert.strictEqual(pct(p).isSuccess, false,
      `${p * 100}% de cobertura nao pode ser sucesso`);
  }

  // Pendência residual sem déficit => PARTIAL, e ainda assim não é sucesso.
  for (const p of [0.6, 0.8, 0.9, 0.99]) {
    const c = pct(p);
    assert.strictEqual(c.finalStatus, CERT_STATUS.PARTIAL,
      `${p * 100}% coberto deveria ser PARTIAL, veio ${c.finalStatus}`);
    assert.strictEqual(c.isSuccess, false,
      `PARTIAL (${p * 100}%) nao pode ser sucesso`);
  }

  // Só 100% é COMPLETED.
  assert.strictEqual(pct(1).finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(pct(1).isSuccess, true);
});

test('COMP-2 universo pequeno com qualquer pendencia e INCOMPLETE (nao "parcial")', () => {
  // 8 textos, 1 pendente = 87% de cobertura. Chamar isso de "parcial" seria
  // presentations uma traducao quase inexistente como parcial.
  const c = TranslationCertificate.issue(perfect({
    totalDetected: 8, translatable: 8, cacheHits: 0,
    translatedNow: 7, coveredTexts: 7, pendingCount: 1, appliedCount: 7,
  }));
  assert.strictEqual(c.finalStatus, CERT_STATUS.INCOMPLETE,
    `veio ${c.finalStatus}: ${c.reason}`);
  assert.strictEqual(c.isSuccess, false);
});

console.log('\n--- RESULTADO FASE 2 (certificado) ---');
console.log(`pass=${passed} fail=${failed}`);
if (failed) {
  console.log('\nFALHAS:');
  for (const f of failures) console.log(`  * ${f.name}: ${f.error.message}`);
}
process.exit(failed ? 1 : 0);
