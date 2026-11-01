/**
 * tests/unit/engineAndRollback.test.js — FASE 7 / PASSO 32 & 33
 *
 * Dois defeitos com a mesma natureza: um valor inventado que decide o fluxo.
 *
 * ---------------------------------------------------------------------------
 * PASSO 32 — `findGameOnDisk` rotulava TODO jogo como `mz`
 *
 *     results.push({ name: e.name, exePath: target, engine: "mz", ... });
 *
 * A UI exibe esse campo, e o adapter/extractor/estratégia partem dele. Não
 * era um default cosmético: um jogo RenPy aparecia como "MZ" e todo o fluxo
 * seguinte era escolhido a partir de um motor inventado.
 *
 * ---------------------------------------------------------------------------
 * PASSO 33 — `restoredFiles` fabricado em 11 adapters
 *
 *     return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
 *
 * Quando o BackupManager não informava a lista, o adapter preenchia com
 * `gameDir` — um DIRETÓRIO, apresentado como arquivo restaurado. O `||` só
 * inventava quando a informação verdadeira não existia.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 7 — ENGINE E ROLLBACK DE ADAPTERS ===');
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
  console.log('\n--- RESULTADO FASE 7 (engine/rollback) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const { rollbackResult } = require(path.join(ROOT, 'src', 'engines', 'rollbackResult'));
const EngineDetector = require(path.join(ROOT, 'src', 'core', 'engineDetector'));

/** Todos os .js de src/, para varreduras estáticas. */
function srcFiles() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', 'data'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(p);
    }
  })(path.join(ROOT, 'src'));
  return out;
}

function stripComments(src) {
  return src.split(/\r?\n/)
    .map((l) => l.replace(/^\s*\/\*.*$/, '')
      .replace(/^\s*\*.*$/, '')
      .replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

// ---------------------------------------------------------------------------
// PASSO 32 — detecção de engine
// ---------------------------------------------------------------------------
test('E1 o engineDetector devolve unknown com confidence 0 para caminho inexistente', async () => {
  const r = await EngineDetector.detect('C:/definitivamente-nao-existe/jogo.exe');
  assert.strictEqual(r.engine, 'unknown',
    'caminho inexistente não pode virar um motor');
  assert.strictEqual(r.confidence, 0);
  assert.ok(Array.isArray(r.evidence) && r.evidence.length > 0,
    'a ausência precisa vir com evidência');
});

test('E2 findGameOnDisk NÃO rotula mais nada como "mz"', () => {
  const src = stripComments(fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'gameEngine.js'), 'utf8',
  ));
  assert.ok(!/engine:\s*["']mz["']/.test(src),
    'BUG ORIGINAL: todo jogo encontrado era rotulado como mz');
  assert.ok(src.includes('EngineDetector'),
    'a busca no disco precisa usar o detector real');
  assert.ok(src.includes('engineConfidence'),
    'e propagar a confiança da detecção');
});

test('E3 a confiança baixa produz "unknown", não um chute', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'core', 'gameEngine.js'), 'utf8');
  assert.ok(src.includes('MIN_CONFIDENCE_TO_LABEL'),
    'deve existir um piso de confiança para rotular o motor');
  assert.ok(/confidence\s*<\s*MIN_CONFIDENCE_TO_LABEL/.test(src),
    'e a regra que rebaixa para unknown quando a confiança é baixa');
});

test('E4 o detector reconhece um jogo RenPy de verdade', async () => {
  // Jogo RenPy mínimo: game/ + *.rpy
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-eng-'));
  try {
    fs.mkdirSync(path.join(dir, 'game'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'game', 'script.rpy'), 'label start:\n    "Oi"\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'game', 'options.rpy'), '', 'utf8');
    fs.writeFileSync(path.join(dir, 'Jogo.exe'), 'MZ', 'utf8');

    const r = await EngineDetector.detect(path.join(dir, 'Jogo.exe'));
    assert.notStrictEqual(r.engine, 'unknown',
      `um jogo com game/*.rpy deveria ser identificado, veio ${r.engine}`);
    assert.ok(r.confidence > 0.5, `confiança baixa: ${r.confidence}`);
    assert.ok(Array.isArray(r.evidence) && r.evidence.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E5 diretório sem sinal de engine devolve confidence baixa, não motor chutado', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-eng2-'));
  try {
    fs.writeFileSync(path.join(dir, 'qualquer.exe'), 'MZ', 'utf8');
    const r = await EngineDetector.detect(dir);
    // Pode haver detecção genérica; o que não pode é haver certeza alta sem
    // evidência.
    assert.ok(r.confidence <= 1);
    if (r.engine === 'unknown') assert.strictEqual(r.confidence, 0);
    else assert.ok(r.evidence && r.evidence.length > 0,
      'engine identificada exige evidência');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// PASSO 33 — restoredFiles
// ---------------------------------------------------------------------------
test('R1 rollback sem lista de arquivos NÃO inventa diretório como arquivo', () => {
  const r = rollbackResult({ success: true }, 'renpy');
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.restoredFiles, null,
    'BUG ORIGINAL: restoredFiles recebia [gameDir] quando não havia lista');
  assert.strictEqual(r.restored, false,
    'sem lista não há o que afirmar sobre arquivos');
  assert.strictEqual(r.verified, false);
  assert.strictEqual(r.warning && r.warning.length > 0, true,
    'o consumidor precisa ser avisado de que não pode confirmar');
  assert.match(r.warning, /não (informou|sabe|confirm)/i,
    'o aviso precisa dizer que os arquivos não foram informados');
});

test('R2 com lista real, o relatório confirma', () => {
  const r = rollbackResult({ success: true, restoredFiles: ['a.rpy', 'b.rpy'] }, 'renpy');
  assert.strictEqual(r.restoredFiles.length, 2);
  assert.strictEqual(r.restoredCount, 2);
  assert.strictEqual(r.restored, true);
  assert.strictEqual(r.verified, true);
  assert.strictEqual(r.warning, null);
});

test('R3 lista VAZIA é informação, não ausência', () => {
  const r = rollbackResult({ success: true, restoredFiles: [] }, 'renpy');
  assert.deepStrictEqual(r.restoredFiles, []);
  assert.strictEqual(r.restoredCount, 0);
  assert.strictEqual(r.restored, false, 'nada restaurado não é restaurado');
  assert.ok(r.warning, 'e precisa avisar');
});

test('R4 falha do backup é declarada, com aviso', () => {
  const r = rollbackResult({ success: false, error: 'sem backup' }, 'unity');
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.restored, false);
  assert.strictEqual(r.detail, 'sem backup');
  assert.match(r.warning, /NÃO foi confirmado/);
});

test('R5 undefined do backup manager é falha, não sucesso', () => {
  const r = rollbackResult(undefined, 'wolf');
  assert.strictEqual(r.success, false,
    'BUG ORIGINAL: res.success de undefined era tratado como caminho do adapter');
  assert.strictEqual(r.restored, false);
});

test('R6 nenhum retorno inventando gameDir sobrou em src/', () => {
  const offenders = [];
  for (const f of srcFiles()) {
    if (f.includes('rollbackResult')) continue; // o módulo que DOCUMENTA o padrão
    const src = stripComments(fs.readFileSync(f, 'utf8'));
    const m = src.match(/restoredFiles:\s*[\w$.]+\.restoredFiles\s*\|\|\s*\[/g);
    if (m) offenders.push(`${path.relative(ROOT, f)}: ${m.length}`);
  }
  assert.strictEqual(offenders.length, 0,
    `padrão fabricado restante:\n  ${offenders.join('\n  ')}`);
});

test('R7 todo adapter usa o helper de rollback ou delega de forma verificável', () => {
  const adapters = srcFiles().filter((f) => f.includes(`${path.sep}engines${path.sep}`));
  let comRollback = 0;
  let comHelper = 0;
  let delegando = 0;
  for (const f of adapters) {
    const src = fs.readFileSync(f, 'utf8');
    const i = src.search(/async\s+rollback\s*\(/);
    if (i < 0) continue;
    comRollback++;
    if (/rollbackResult\s*\(/.test(src)) { comHelper++; continue; }
    // Rollback sem o helper é aceitável SÓ se ele próprio for verificável:
    // ou declara a lista real do que restaurou, ou delega a um componente
    // que declara.
    const corpo = src.slice(i, i + 1400);
    const listaReal = /restoredFiles\s*:\s*\[[^\]]*\w/.test(corpo)
      || /restoredFiles\s*=\s*\[\]/.test(corpo)
      || /removedCount/.test(corpo);
    const delega = /return\s+await\s+this\.\w+\.rollback\s*\(/.test(corpo)
      || /return\s+this\.\w+\.rollback\s*\(/.test(corpo);
    if (delega) { delegando++; continue; }
    assert.ok(listaReal,
      `${path.relative(ROOT, f)}: rollback sem helper, sem lista e sem delegação`);
  }
  assert.ok(comRollback >= 10,
    `esperado >= 10 adapters com rollback, achei ${comRollback}`);
  console.log(`       adapters com rollback: ${comRollback} | helper: ${comHelper}`
    + ` | delegando: ${delegando}`);
});

test('R8 nenhum adapter declara success:true com lista de fallback INVENTADA', () => {
  // O padrão proibido é a lista de fallback: `X.restoredFiles || [algo]`,
  // onde o inventado só aparece quando a informação verdadeira falta.
  // Uma lista FIXA de arquivos que o adapter realmente restaurou (ex.: o
  // app.asar que ele copiou) é legítima e não é alvo deste teste.
  for (const f of srcFiles()) {
    if (!f.includes(`${path.sep}engines${path.sep}`)) continue;
    const src = stripComments(fs.readFileSync(f, 'utf8'));
    const m = src.match(/success:\s*true[\s\S]{0,160}?restoredFiles:\s*[\w$.]+\.\w+\s*\|\|/g);
    if (m) {
      assert.fail(`${path.relative(ROOT, f)}: lista de fallback inventada: `
        + JSON.stringify(m[0].slice(0, 140)));
    }
    // E `success:true` literal acompanhado de lista literal precisa ter a
    // lista preenchida por algo que o adapter copiou de verdade.
    const m2 = src.match(/success:\s*true[\s\S]{0,120}?restoredFiles:\s*\[[^\]]*\]/g);
    for (const hit of m2 || []) {
      assert.ok(!/\[\s*(gameDir|root|dir)\s*\]/.test(hit),
        `${path.relative(ROOT, f)}: diretório listado como arquivo restaurado`);
    }
  }
});

test('R9 o helper preserva campos extras e o detalhe do backup', () => {
  const r = rollbackResult(
    { success: true, restoredFiles: ['a'], detail: 'restaurado do snapshot' },
    'godot',
    { source: 'sessionBackup' },
  );
  assert.strictEqual(r.engine, 'godot');
  assert.strictEqual(r.source, 'sessionBackup');
  assert.strictEqual(r.detail, 'restaurado do snapshot');
  assert.strictEqual(r.isPerfectRestore, null, 'ausente não é "true"');
});

test('R10 o relatório distingue restaurado de não-confirmado no status', () => {
  const comLista = rollbackResult({ success: true, restoredFiles: ['a'] }, 'x');
  const semLista = rollbackResult({ success: true }, 'x');
  assert.strictEqual(comLista.verified, true);
  assert.strictEqual(semLista.verified, false);
  // E os dois não podem ter o mesmo `success`, senão o consumidor não tem
  // como diferenciar sem ler `warning`.
  assert.notStrictEqual(comLista.restored, semLista.restored);
});

runAll();
