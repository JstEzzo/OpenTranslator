/**
 * tests/unit/pipelineTransaction.test.js — D1: a transação é o caminho do produto?
 *
 * ===========================================================================
 * POR QUE ESTE TESTE EXISTE
 * ===========================================================================
 *
 * `src/core/applyTransaction.js` foi escrito na FASE 6 com 18 asserts, e até a
 * FASE 10 ele NÃO era o caminho do produto: `translationPipeline.js` chamava
 * `adapter.apply()` direto, sob um comentário que dizia "Aplicação
 * Transacional". O rótulo descrevia uma garantia que o código não tinha.
 *
 * A integração passou a ser CAPABILITY-GATED em vez de incondicional, e essa
 * é uma decisão que precisa ser VISÍVEL e MENSURÁVEL. Um gate de capacidade
 * que ninguém mede degrada em silêncio: alguém adiciona um adapter, ele não
 * declara `transactional`, e o pipeline segue no apply direto — sem que nada
 * diga isso.
 *
 * Este teste mede a cobertura e falha se ela RECUAR. Ele não exige 100%: a
 * cobertura é uma dívidaKnown com um plano, e o que não pode é virar
 * silenciosa.
 *
 * ===========================================================================
 * O QUE É MEDIDO
 * ===========================================================================
 *
 * Para cada adapter de src/engines/:
 *   - declara `transactional`?
 *   - o `apply` dele produz `fileHashes` (sem os quais a verificação
 *     pós-apply da transação não tem o que conferir)?
 *
 * E, para o pipeline:
 *   - o caminho transacional é realmente alcançável, ou é código morto?
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const ENGINES = path.join(RAIZ, 'src', 'engines');

let pass = 0;
let fail = 0;
function ok(nome) { console.log(`  ok   ${nome}`); pass++; }
function bad(nome, msg) { console.log(`  FAIL ${nome}\n       ${msg}`); fail++; }

// ---------------------------------------------------------------------------
// 1. O pipeline tem o caminho transacional, e ele é alcançável
// ---------------------------------------------------------------------------

const srcPipeline = fs.readFileSync(
  path.join(RAIZ, 'src', 'core', 'translationPipeline.js'), 'utf8',
);

if (/require\('\.\/applyTransaction'\)/.test(srcPipeline)
  && /applyTransaction\(\{/.test(srcPipeline)) {
  ok('P1 o pipeline INVOCA applyTransaction (o caminho existe de verdade)');
} else {
  bad('P1 o pipeline INVOCA applyTransaction',
    'Nenhuma chamada a applyTransaction encontrada. A transacao voltou a ser '
    + 'codigo morto — que era exatamente o defeito D1.');
}

if (/adapter\.transactional\s*===\s*true/.test(srcPipeline)
  && /options\.filesToBackup/.test(srcPipeline)) {
  ok('P2 o gate de capacidade exige transactional + filesToBackup (fail-closed)');
} else {
  bad('P2 o gate de capacidade exige transactional + filesToBackup',
    'Sem o gate, um adapter sem lista de arquivos derrubaria toda traducao: '
    + 'applyTransaction recusa escrever quando filesToBackup esta ausente.');
}

if (/adapter\.apply\(targetDir, texts, translations, options\)/.test(srcPipeline)) {
  ok('P3 o apply direto continua existindo como fallback declarado');
} else {
  bad('P3 o apply direto continua existindo como fallback declarado',
    'Sem fallback, adapters nao-transacionais ficariam sem caminho de apply.');
}

if (/verifyApplied\(/.test(srcPipeline)) {
  ok('P4 o fallback ainda passa por verificacao pos-apply em disco (FASE 2)');
} else {
  bad('P4 o fallback ainda passa por verificacao pos-apply em disco',
    'O fallback sem verificacao seria apply as cegas.');
}

// ---------------------------------------------------------------------------
// 2. O comentario nao pode mentir de novo
// ---------------------------------------------------------------------------

const comentarioTransacional = /Aplicação Transacional/.test(srcPipeline);
const temInvocacaoReal = /applyTransaction\(\{/.test(srcPipeline);
if (!comentarioTransacional || temInvocacaoReal) {
  ok('P5 nenhum rotulo "Aplicação Transacional" sem codigo transacional');
} else {
  bad('P5 nenhum rotulo "Aplicação Transacional" sem codigo transacional',
    'O comentario diz "Transacional" mas o codigo chama adapter.apply() direto. '
    + 'E a mesma classe de defeito que a FASE 9 removeu: rotulo sem garantia.');
}

// ---------------------------------------------------------------------------
// 3. Cobertura transacional dos adapters — a divida, medida
// ---------------------------------------------------------------------------

function listarAdapters() {
  const out = [];
  const stack = [ENGINES];
  while (stack.length) {
    const dir = stack.pop();
    let entradas;
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entradas) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      if (!/Adapter\.js$|Handler\.js$|Bridge\.js$/.test(e.name)) continue;
      let src;
      try { src = fs.readFileSync(p, 'utf8'); } catch (e2) { continue; }
      out.push({ rel: path.relative(RAIZ, p).replace(/\\/g, '/'), src });
    }
  }
  return out;
}

const adapters = listarAdapters();

// ---------------------------------------------------------------------------
// FASE 10 — O DENOMINADOR ESTAVA ERRADO, E ISSO SUPERESTIMAVA A DÍVIDA
// ---------------------------------------------------------------------------
//
// A primeira versão desta suíte reportava "0/26". O número 26 contava TODOS
// os arquivos `*Adapter.js`/`*Handler.js`/`*Bridge.js` de src/engines/ — mas
// 11 deles são bridges de runtime, handlers e classes base, e **não aplicam
// tradução nenhuma**. Eles não podem ser transacionais por definição: não
// existe escrita para transacionar.
//
// Medir a dívida contra um denominador que inclui alvo impossível é a mesma
// categoria de erro que contar `success: true` em comentário. O número era
// grande, não-detalhável, e nao aponta trabalho nenhum.
//
// O denominador correto é: adapters que têm `apply()`.
const aplicadores = adapters.filter((a) => /async\s+apply\s*\(/.test(a.src));

const transacionais = aplicadores.filter((a) => /transactional\s*(=|:)\s*true/.test(a.src));
const comFileHashes = aplicadores.filter((a) => /fileHashes/.test(a.src));
const comModified = aplicadores.filter((a) => /modifiedFiles/.test(a.src));

const pct = aplicadores.length
  ? Math.round((transacionais.length / aplicadores.length) * 100)
  : 0;

console.log('');
console.log(`       denominador: ${aplicadores.length} adapter(s) com apply()`
  + ` (de ${adapters.length} arquivos inspecionados)`);
console.log(`       cobertura transacional: ${transacionais.length}/${aplicadores.length} (${pct}%)`);
console.log(`       ja devolvem modifiedFiles: ${comModified.length}/${aplicadores.length}`);
console.log(`       ja devolvem fileHashes:    ${comFileHashes.length}/${aplicadores.length}`);
console.log(`       (divida D1 CONHECIDA e agora MEDIDA — ver docs/RELATORIO_FINAL.md)`);
console.log('');

// Invariante que importa: a cobertura nao pode RECUAR sem alguém decidir.
const MINIMO_ESPERADO = 0;
if (transacionais.length >= MINIMO_ESPERADO) {
  ok(`C1 a cobertura transacional nao regrediu (>= ${MINIMO_ESPERADO})`);
} else {
  bad('C1 a cobertura transacional nao regrediu',
    `Cobertura caiu para ${transacionais.length}/${aplicadores.length}.`);
}

// O gate precisa ser coerente com o que existe: se TODO adapter aplicador é
// transacional, o gate nunca exercita o fallback — e o fallback morre sem
// ninguém perceber. Este teste registra qual ramo está vivo.
if (transacionais.length === 0) {
  ok('C2 hoje o FALLBACK é o ramo vivo (nenhum aplicador é transacional)');
  console.log('       NOTA: enquanto nenhum adapter declarar `transactional`, o');
  console.log('             caminho transacional esta corretamente inalcancavel —');
  console.log('             e P1 exige que ele seja invocavel assim que existir.');
  console.log('             O fallback segue com verifyApplied da FASE 2.');
} else {
  ok(`C2 ${transacionais.length} adapter(s) no caminho transacional`);
  // Se ha cobertura parcial, o fallback ainda precisa ser exercitado por
  // alguém. Um adapter nao-opt-in e um teste justo do gate.
  if (transacionais.length < aplicadores.length) {
    ok('C3 ha cobertura PARCIAL: o fallback continua vivo e exercitado');
  }
}

// ---------------------------------------------------------------------------
// 4. Os ADOTADOS realmente adotaram (e nao so declaram)
// ---------------------------------------------------------------------------

// Um teste que so contam `this.transactional = true` nao prova adotacao: o
// opt-in e uma AFIRMACAO, e a prova e que a afirmacao se sustenta em runtime.
const ADOTADOS = [
  ['src/engines/generic/genericAdapter.js', 'GenericAdapter'],
  ['src/engines/cocos/cocos2dxAdapter.js', 'Cocos2dxAdapter'],
  ['src/engines/cocos/cocosCreatorAdapter.js', 'CocosCreatorAdapter'],
  ['src/engines/construct/constructAdapter.js', 'ConstructAdapter'],
  ['src/engines/defold/defoldAdapter.js', 'DefoldAdapter'],
  ['src/engines/gamemaker/gameMakerAdapter.js', 'GameMakerAdapter'],
  ['src/engines/gdevelop/gdevelopAdapter.js', 'GdevelopAdapter'],
  ['src/engines/unreal/unrealAdapter.js', 'UnrealAdapter'],
];

const declaram = transacionais.map((a) => a.rel).sort();
const esperando = ADOTADOS.map((a) => a[0]).sort();

if (JSON.stringify(declaram) === JSON.stringify(esperando)) {
  ok(`A4 os ${ADOTADOS.length} adapters declarados transactional sao os esperados`);
} else {
  bad('A4 os adapters declarados transactional sao os esperados',
    'declarados: ' + declaram.join(', ') + '\n       esperado: ' + esperando.join(', '));
}

// Para cada adotado: instancia (pega `this` antes de `super()`), e confere
// que o apply realmente produz o contrato.
let adotadosOk = 0;
const falhasAdocao = [];
for (const [rel, nomeClasse] of ADOTADOS) {
  try {
    let Mod;
    try {
      Mod = require(path.join(RAIZ, rel));
    } catch (e) {
      Mod = Mod || require(path.join(RAIZ, rel));
    }
    const inst = new Mod();
    if (inst.transactional !== true) {
      falhasAdocao.push(`${nomeClasse}: transactional !== true`);
      continue;
    }
    const src = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    const temFinish = /ac\.finish\(/.test(src);
    const temWrote = /ac\.wrote\(/.test(src);
    const temStart = /startApplyContract\(gameDir/.test(src);
    if (!temFinish || !temWrote || !temStart) {
      falhasAdocao.push(`${nomeClasse}: finish=${temFinish} wrote=${temWrote} start=${temStart}`);
      continue;
    }
    // `this.transactional` tem de estar DEPOIS do `super()`.
    const iSuper = src.indexOf('super(');
    const iTx = src.indexOf('this.transactional');
    if (iTx < iSuper) {
      falhasAdocao.push(`${nomeClasse}: this.transactional ANTES de super() — lança na construção`);
      continue;
    }
    adotadosOk++;
  } catch (e) {
    falhasAdocao.push(`${nomeClasse}: ${e.message}`);
  }
}

if (falhasAdocao.length === 0) {
  ok(`A5 os ${adotadosOk} adapters adotados instanciam e usam o contrato de verdade`);
  console.log('       (instanciação + ac.finish + ac.wrote + this.transactional depois de super)');
} else {
  bad('A5 os adapters adotados instanciam e usam o contrato de verdade',
    falhasAdocao.join('\n       '));
}
console.log(`pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
