const path = require('path');
const fs = require('fs');
const assert = require('assert');
const R = path.resolve(__dirname, '..', '..');
const RC = require(path.join(R, 'src/engines/renpy/renpyCommon.js'));

let pass = 0, fail = 0; const failures = [];
function test(n, f) {
  try { f(); console.log('  ok   ' + n); pass++; }
  catch (e) { console.log('  FALHA ' + n + '  <<< ' + e.message); failures.push({ n, m: e.message }); fail++; }
}

// O QUE o Ren'Py faz com % em string de traducao:
// Ren'Py usa %-formatting Python em `translate` blocks? NAO. Mas o JOGO
// usa `[...!t]` / `%` em substituicao de texto, e o Ren'Py ESCAPA % em
// literais de traducao porque o texto pode passar por `old % (...)`.
//
// Precisamos do comportamento REAL do Ren'Py: em `translate <lang> strings:`,
// o valor de `old` e procurado LITERALMENTE. Se o jogo tem "75%% OFF" no
// source, o Ren'Py le como "75%% OFF" (%% nao e formatado em bloco de
// traducao). Logo o `old` gerado tem de ser IDENTICO ao que o jogo tem.

console.log('='.repeat(70));
console.log('PASSO 7 — %% / % no gerador de literais Ren\'Py');
console.log('='.repeat(70));
console.log('');

test('PC.1 % simples NAO vira %% (sobra um %)', () => {
  const r = RC.formatRenpyStringLiteral('75% OFF');
  assert(r.includes('75% OFF'), 'esperado "75% OFF", veio ' + r);
  assert(!r.includes('%%'), 'nao deve introduzir %%: ' + r);
});

test('PC.2 %% que ja veio do jogo preserva os DOIS sinais', () => {
  const r = RC.formatRenpyStringLiteral('75%% OFF');
  assert(r.includes('75%% OFF'), 'esperado "75%% OFF", veio ' + r);
});

test('PC.3 texto sem % nao muda', () => {
  assert(RC.formatRenpyStringLiteral('Hello') === '"Hello"');
  assert(RC.formatRenpyStringLiteral('Are you sure?') === '"Are you sure?"');
});

test('PC.4 % no meio do texto', () => {
  const r = RC.formatRenpyStringLiteral('Battery usage: [game.size:.0%] now');
  assert(r.includes('[game.size:.0%]'), r);
});

test('PC.5 %s e %d nao sao convertidos', () => {
  const a = RC.formatRenpyStringLiteral('%s and %d');
  assert(a === '"%s and %d"', a);
  const b = RC.formatRenpyStringLiteral('%(name)s');
  assert(b === '"%(name)s"', b);
});

test('PC.6 escape de aspas continua funcionando junto com %', () => {
  const r = RC.formatRenpyStringLiteral('50% "off" now');
  assert(r.includes('\\"off\\"'), r);
  assert(r.includes('50%'), r);
});

test('PC.7 ida e volta: gerado -> lido devolve o texto original', () => {
  // O ciclo real: o que o extrator le do jogo -> gera -> o Ren'Py le de volta.
  const casos = ['75% OFF', '100% sure', 'a %s and %d', '50% "off"'];
  for (const c of casos) {
    const gerado = RC.formatRenpyStringLiteral(c);
    const lido = RC.unescapeRenpyString(gerado.slice(1, -1));
    assert.strictEqual(lido, c, `round-trip falhou: "${c}" -> ${gerado} -> "${lido}"`);
  }
});

test('PC.8 ida e volta com %% do jogo', () => {
  const c = '75%% OFF';
  const gerado = RC.formatRenpyStringLiteral(c);
  const lido = RC.unescapeRenpyString(gerado.slice(1, -1));
  assert.strictEqual(lido, c, `round-trip %% falhou: ${gerado} -> "${lido}"`);
});

console.log('');
console.log('='.repeat(70));
console.log('DIAGNOSTICO: por que o jogo tem %% e o gerador tambem troca por %%');
console.log('='.repeat(70));
console.log('');

const amostras = [
  'LOL!! That was 100%% worth all the effort.',
  'Buffer usage: [game.size:.0%%]',
  '75%% OFF',
];
for (const a of amostras) {
  const g = RC.formatRenpyStringLiteral(a);
  const volta = RC.unescapeRenpyString(g.slice(1, -1));
  console.log('  jogo tem : ' + JSON.stringify(a));
  console.log('  gerado   : ' + JSON.stringify(g));
  console.log('  relido   : ' + JSON.stringify(volta));
  console.log('  preserva : ' + (volta === a ? 'SIM' : 'NAO  <<< CORRUPIDO'));
  console.log('');
}

// As 3 entradas que faltaram
console.log('='.repeat(70));
console.log('AS 3 ENTRADAS %% QUE NAO FORAM GERADAS');
console.log('='.repeat(70));
const TL = 'C:/Users/Teste/Desktop/Nova pasta/summertimesaga-21.0.0-wip.8189-pc/game/tl/pt_BR/';
const targets = ['That was 100', 'Buffer usage', 'OFF'];
for (const f of ['dialogues', 'strings', 'screens']) {
  const s = fs.readFileSync(TL + f + '.rpy', 'utf8');
  for (const t of targets) {
    const i = s.indexOf(t);
    if (i < 0) continue;
    const ini = s.lastIndexOf('    old "', i);
    console.log('  ' + f + '.rpy:');
    console.log('    ' + JSON.stringify(s.slice(ini, ini + 120)));
  }
}
console.log('');
console.log('  (o verificador comparava a chave CRUA do piloto-result.json com a');
console.log('   chave gerada. Para %% o valor ja vem com %% do jogo, e o gerador');
console.log('   aplica %%->%% de novo: a chave bate, mas a forma e a do JOGO.)');
console.log('');
console.log(`RESULTADO: pass=${pass} fail=${fail}`);
if (fail > 0) { for (const f of failures) console.log(`  * ${f.n}: ${f.m}`); process.exitCode = 1; }
else console.log('PASS');