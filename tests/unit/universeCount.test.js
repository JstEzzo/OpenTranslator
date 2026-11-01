/**
 * tests/unit/universeCount.test.js — FASE 4 / PASSO 29
 *
 * A cobertura precisa de um DENOMINADOR. Este teste cobre a segunda metade
 * da FASE 4: não apenas "a tradução existe", mas "quanto havia para traduzir".
 *
 * ---------------------------------------------------------------------------
 * OS DOIS BUGS
 *
 * 1. Cobertura 100% POR CONSTRUÇÃO. O pipeline passava ao certificado
 *
 *      totalDetected: texts.length,
 *      translatable:  texts.length,
 *
 *    Denominador igual ao numerador. Um adapter que lesse 200 dos 3.000
 *    textos de um jogo reportaria "tradução 100% completa", e o certificado
 *    não teria como discordar: para ele, 200 era o todo.
 *
 * 2. FALHA DE EXTRAÇÃO COMO SUCESSO. Em translationPipeline:
 *
 *      if (!extractResult.success || (extractResult.count || 0) === 0) {
 *        return { success: true, count: 0, message: 'Nenhum texto traduzível pendente.' };
 *      }
 *
 *    Extração que FALHASSE devolvia sucesso com a mensagem "nada pendente".
 *    O usuário lia "não há o que fazer" quando o motivo real era que nada
 *    tinha sido lido.
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
  console.log('=== FASE 4 — UNIVERSO E EXTRAÇÃO ===');
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
  console.log('\n--- RESULTADO FASE 4 (universo) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

global.log = () => {};
const TC = require(path.join(ROOT, 'src', 'core', 'translationCertificate'));
const { CERT_STATUS } = TC;

/** Todos os campos que um certificado COMPLETED precisa. */
const PERFEITO = {
  engine: 'renpy',
  game: 'meu-jogo',
  cacheHits: 0,
  qaErrorsCount: 0,
  verification: { verified: true, method: 'POST_APPLY_REEXTRACT', checked: 100, present: 100, missing: 0 },
};

/**
 * Constrói params de certificado.
 * O padrão é um jogo de 100 textos, 100 tradutíveis, tudo coberto e aplicado.
 */
function cert(over = {}) {
  const total = over.totalDetected !== undefined ? over.totalDetected : 100;
  const translatable = over.translatable !== undefined ? over.translatable : total;
  const covered = over.coveredTexts !== undefined ? over.coveredTexts : translatable;
  const applied = over.appliedCount !== undefined ? over.appliedCount : covered;
  return TC.issue({
    ...PERFEITO,
    totalDetected: total,
    translatable,
    coveredTexts: covered,
    appliedCount: applied,
    translatedNow: applied,
    pendingCount: Math.max(0, translatable - covered),
    alreadyUpToDate: false,
    universeComplete: true,
    universeSource: 'adapter.totalDetected',
    ...over,
  });
}

// ---------------------------------------------------------------------------
// O certificado exige um denominador conhecido
// ---------------------------------------------------------------------------
test('U1 com universo COMPLETO e tudo coberto, o certificado é COMPLETED', () => {
  const c = cert();
  assert.strictEqual(c.finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(c.isSuccess, true);
  assert.strictEqual(c.metrics.coveragePercent, 100);
});

test('U2 universo DESCONHIDO nunca pode ser COMPLETED', () => {
  // BUG ORIGINAL: `texts.length` como total e como tradutível produzia
  // COMPLETED com 100% sem qualquer informação sobre o jogo inteiro.
  const c = cert({ universeComplete: false, universeUnknown: true, universeSource: 'EXTRACTED_ONLY' });
  assert.notStrictEqual(c.finalStatus, CERT_STATUS.COMPLETED,
    'BUG ORIGINAL: universo desconhecido produzia COMPLETED');
  assert.strictEqual(c.isSuccess, false);
  assert.strictEqual(c.finalStatus, CERT_STATUS.INCOMPLETE);
  assert.match(c.reason, /Universo de textos desconhecido/);
});

test('U3 textos NÃO EXTRAÍDOS (unseenCount>0) nunca pode ser COMPLETED', () => {
  const c = cert({
    totalDetected: 3000,
    translatable: 3000,
    coveredTexts: 200,
    appliedCount: 200,
    pendingCount: 2800,
    universeComplete: false,
    universeUnknown: false,
    unseenCount: 2800,
  });
  assert.notStrictEqual(c.finalStatus, CERT_STATUS.COMPLETED);
  assert.strictEqual(c.isSuccess, false);
  // E a cobertura reflete o universo real, não o que foi carregado.
  assert.strictEqual(c.metrics.coveragePercent, 7,
    '200 de 3000 é ~7%, não 100%');
});

test('U4 adapter que lê 200 de 3000 NÃO produz 100% de cobertura', () => {
  const c = cert({
    totalDetected: 3000, translatable: 3000, coveredTexts: 200, appliedCount: 200,
    universeComplete: true, universeSource: 'adapter.totalDetected',
  });
  assert.strictEqual(c.metrics.coveragePercent, 7);
  assert.strictEqual(c.finalStatus, CERT_STATUS.INCOMPLETE);
});

test('U5 o certificado declara a procedência do universo', () => {
  const c = cert({ universeComplete: false, universeUnknown: true, universeSource: 'EXTRACTED_ONLY' });
  assert.strictEqual(c.universeUnknown, true);
  assert.strictEqual(c.universeComplete, false);
  assert.strictEqual(c.universeSource, 'EXTRACTED_ONLY');
  assert.strictEqual(c.metrics.universeUnknown, true);
});

test('U6 unseenCount e totalDetected são coerentes no relatório', () => {
  const c = cert({
    totalDetected: 500, translatable: 500, coveredTexts: 500, appliedCount: 500,
    universeComplete: true, unseenCount: 0,
  });
  assert.strictEqual(c.detectedTexts, 500);
  assert.strictEqual(c.unseenCount, 0);
  assert.strictEqual(c.finalStatus, CERT_STATUS.COMPLETED);
});

// ---------------------------------------------------------------------------
// Falha de extração não é sucesso
// ---------------------------------------------------------------------------
/**
 * Remove linhas de comentário.
 *
 * FASE 4 — a primeira versão deste teste falhou por causa disso: o comentário
 * que DOCUMENTA o bug antigo contém literalmente o código antigo
 * (`if (!extractResult.success || ...)`), e a busca por padrão o encontra.
 * Um teste que não distingue código de comentário sobre o próprio defeito
 * não serve para nada.
 */
function codeOnly(src) {
  return src.split(/\r?\n/)
    .map((l) => l.replace(/^\s*\/\*.*$/, '')
      .replace(/^\s*\*.*$/, '')
      .replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

test('U7 o pipeline NÃO tem mais o "success:true em extração falha"', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  );
  const code = codeOnly(src);
  assert.ok(!/!extractResult\.success\s*\|\|/.test(code),
    'a condição que fundia "extração falhou" com "nada a traduzir" não pode voltar');
  // E a verificação tem de ser explícita, não herdada de um truthy.
  assert.ok(/extractResult\.success\s*!==\s*true/.test(code),
    'a falha de extração precisa ser testada explicitamente');
  assert.ok(code.includes('FAILED_EXTRACTION'),
    'o pipeline precisa de um status explícito para falha de extração');
  assert.ok(code.includes('NOTHING_TO_TRANSLATE'),
    'e um status distinto para extração bem-sucedida e vazia');
});

test('U8 os dois caminhos de extração têm respostas DISTINTAS', () => {
  const src = codeOnly(fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  ));
  const idxFailed = src.indexOf('FAILED_EXTRACTION');
  const idxNothing = src.indexOf('NOTHING_TO_TRANSLATE');
  assert.ok(idxNothing > 0 && idxFailed > 0);

  // Os dois objetos de retorno: cada status com sua resposta correta.
  const failBlock = src.slice(Math.max(0, idxFailed - 700), idxFailed + 300);
  assert.match(failBlock, /success:\s*false/,
    'falha de extração não pode ser sucesso');
  assert.match(failBlock, /universeComplete:\s*false/,
    'falha de extração precisa dizer que o universo não é conhecido');

  const nothingBlock = src.slice(Math.max(0, idxNothing - 700), idxNothing + 300);
  assert.match(nothingBlock, /success:\s*true/,
    'extração confirmada e vazia pode ser sucesso');
  assert.match(nothingBlock, /universeComplete:\s*true/,
    'e declara que o universo foi verificado');
});

test('U9 buildUniverse usa o total declarado pelo adapter quando existe', () => {
  // FASE 5.5 — `buildUniverse` saiu do God Object: a construção do universo é
  // responsabilidade de EXTRAÇÃO, e agora vive em translation/extraction/.
  const pipelineSrc = fs.readFileSync(
    path.join(ROOT, 'src', 'translation', 'extraction', 'buildUniverse.js'),
    'utf8',
  );
  assert.ok(pipelineSrc.includes('function buildUniverse'),
    'o helper buildUniverse precisa existir');

  // A lista de campos declarados precisa cobrir os nomes usuais.
  for (const field of ['totalDetected', 'detectedTotal', 'totalStrings', 'universeSize', 'totalFound']) {
    assert.ok(pipelineSrc.includes(`'${field}'`),
      `buildUniverse deve reconhecer o campo ${field}`);
  }

  // O pipeline deve CONSUMIR o helper, não duplicar a lógica.
  const consumer = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  );
  assert.match(consumer, /require\('\.\.\/translation\/extraction\/buildUniverse'\)/,
    'translationPipeline deve importar buildUniverse do módulo de extração');
});

test('U10 o pipeline declara proveniência (EXTRACTED_ONLY quando desconhecido)', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src', 'translation', 'extraction', 'buildUniverse.js'),
    'utf8',
  );
  assert.ok(src.includes('EXTRACTED_ONLY'),
    'sem total declarado, a fonte do universo precisa ser identificada');
  assert.ok(/Não é possível afirmar completude/i.test(src),
    'e o pipeline precisa avisar que não pode afirmar completude');
});

test('U11 NENHUMA emissão de certificado usa texts.length como total', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'translationPipeline.js'),
    'utf8',
  );
  // FASE 4 — a primeira versão deste teste olhava só a PRIMEIRA ocorrência de
  // `issue(`. Havia uma segunda, no caminho de rate limit, com o mesmo defeito
  // de universo. Um teste que passa olhando um dos dois pontos não protege
  // nenhum deles: é preciso varrer todas as emissões.
  const re = /TranslationCertificate\.issue\s*\(/g;
  const blocks = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const end = src.indexOf('});', m.index);
    if (end === -1) continue;
    blocks.push({
      line: src.slice(0, m.index).split('\n').length,
      body: src.slice(m.index, end + 3),
    });
  }
  assert.ok(blocks.length >= 2,
    `esperado ao menos 2 emissões de certificado, achei ${blocks.length}`);

  for (const { line, body } of blocks) {
    assert.ok(body.length > 150, `emissão da linha ${line} não capturada inteira`);
    assert.ok(!/totalDetected:\s*texts\.length/.test(body),
      `BUG ORIGINAL: totalDetected era texts.length na emissão da linha ${line}`);
    assert.ok(!/translatable:\s*texts\.length/.test(body),
      `BUG ORIGINAL: translatable era texts.length na emissão da linha ${line}`);
    assert.ok(/totalDetected:\s*universe\w*\.totalDetected/.test(body),
      `emissão da linha ${line} precisa usar o universo construído`);
    assert.ok(/translatable:\s*universe\w*\.translatable/.test(body),
      `emissão da linha ${line} precisa usar o tradutível do universo`);
    assert.ok(/universeComplete:\s*universe\w*\.complete/.test(body),
      `emissão da linha ${line} precisa declarar a completude do universo`);
  }
});

runAll();
