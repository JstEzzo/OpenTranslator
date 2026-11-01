const path = require('path');
const assert = require('assert');
const R = path.resolve(__dirname, '..', '..');
const { classifyDisplayText } = require(path.join(R, 'src', 'core', 'displayTextClassifier'));
const Ext = require(path.join(R, 'src', 'engines', 'renpy', 'extractor', 'renpyExtractor.js'));

let pass = 0, fail = 0; const failures = [];
function test(n, f) {
  try { f(); console.log('  ok   ' + n); pass++; }
  catch (e) { console.log('  FALHA ' + n + '  <<< ' + e.message); failures.push({ n, m: e.message }); fail++; }
}
const K = (s) => classifyDisplayText(s);
const D = (s) => classifyDisplayText(s).display;

console.log('='.repeat(70));
console.log('C2 — codigo nao entra no corpus; texto visivel entra');
console.log('='.repeat(70));
console.log('');

// ---------- PASSO 6: categorias ----------
test('C2.1 numero NAO e texto exibivel', () => {
  for (const s of ['242424', '02', '100', '-5', '3.14', '50%']) {
    assert.strictEqual(D(s), false, s);
    assert.strictEqual(K(s).kind, 'number', s);
  }
});

test('C2.2 simbolo NAO e texto exibivel', () => {
  for (const s of ['...', '?!', '-', '<<', '>>>', '/']) {
    assert.strictEqual(K(s).display, false, JSON.stringify(s));
  }
});

test('C2.3 caminho/extensao NAO e texto exibivel', () => {
  for (const s of ['art/', '.png', '/icon', 'cast.rpy', 'a/b/c', 'http://x/y']) {
    assert.strictEqual(K(s).kind, 'path', s);
    assert.strictEqual(D(s), false, s);
  }
});

test('C2.4 identificador de codigo NAO e texto exibivel', () => {
  // Somente forma INEQUIVOCA de identificador entra aqui. Palavra english isolada
// ('analyse', 'finalise', 'manifest', 'open', 'cast') e ambigua — pode ser
// rotulo de UI — e e preservada por padrao seguro. Ver C2.10.
  for (const s of ['_door', 'load_module', 'mod.attr', 'CONST_NAME', 'x_1', 'A_B_C']) {
    assert.strictEqual(D(s), false, s);
  }
});

test('C2.5 token opaco NAO e texto exibivel', () => {
  assert.strictEqual(D('vjnfAgpxp9Kd2mLq4'), false);
  assert.strictEqual(D('7ad4ee12bb993'), false);
});

test('C2.6 palavra reservada NAO e texto exibivel', () => {
  for (const s of ['true', 'false', 'None', 'self', 'return', 'import']) {
    assert.strictEqual(K(s).kind, 'code', s);
    assert.strictEqual(D(s), false, s);
  }
});

// ---------- PASSO 3/PASSO 6: texto visivel DENTRO de .py e preservado ----------
test('C2.7 prosa dentro de .py ENTRA (proibido "Python = intraduzivel")', () => {
  for (const s of ['Welcome to the game', 'Are you sure?', 'New Game', 'Save and quit?',
    'Loading...', 'Familiar female voice', 'Helpful young man']) {
    assert.strictEqual(D(s), true, `"${s}" nao pode ser descartado`);
  }
});

test('C2.8 rotulo de UI de palavra unica ENTRA', () => {
  for (const s of ['Inventory', 'Computer', 'Phone', 'Television', 'Settings', 'Volume',
    'Chat', 'Book', 'New', 'Continue', 'Save']) {
    assert.strictEqual(D(s), true, `"${s}"`);
  }
});

test('C2.9 nome proprio ENTRA', () => {
  // nome de DUAS palavras -> kind 'name'; palavra unica CamelCase -> 'label'. Ambas preservadas.
  for (const s of ['Pink Cyclone']) {
    assert.strictEqual(D(s), true, s);
    assert.strictEqual(K(s).kind, 'name', s);
  }
});

test('C2.10 palavra unica ambigua e PRESERVADA (default seguro)', () => {
  // "open" e "cast" podem ser identificador OU rotulo. A forma nao decide,
  // entao o classificador nao descarta: descartar aqui apagaria menus.
  for (const s of ['open', 'cast', 'pillarbox', 'color', 'menu', 'mono', 'old']) {
    assert.strictEqual(D(s), true, `"${s}" deve ser preservado por padrao seguro`);
    assert.strictEqual(K(s).kind, 'label', s);
  }
});

test('C2.11 pontuacao final NAO classifica como identificador', () => {
  // Regressao: uma versao anterior do classificador descartava "Loading..."
  // por terminar em ponto. Texto de UI real estava sendo perdido.
  assert.strictEqual(D('Loading...'), true);
  assert.strictEqual(D('Are you sure?'), true);
  assert.strictEqual(D('Continue!'), true);
});

// ---------- integracao com o extrator ----------
test('C2.12 o extrator descarta constante .py que e identificador', () => {
  const e = new Ext();
  assert.strictEqual(e.isTranslatable('load_module'), false, 'snake_case ja era barrado');
  assert.strictEqual(e.isTranslatable('art/'), false);
  assert.strictEqual(e.isTranslatable('#ffffff'), false);
});

test('C2.13 o classificador e estatico e nao depende de estado', () => {
  const a = K('Inventory');
  const b = K('Inventory');
  assert.deepStrictEqual(a, b);
  assert.strictEqual(classifyDisplayText(null).kind, 'empty');
  assert.strictEqual(classifyDisplayText(undefined).kind, 'empty');
  assert.strictEqual(classifyDisplayText('').kind, 'empty');
});

test('C2.14 o default do classificador e PRESERVAR', () => {
  // Regra de ouro: so descarta com evidencia positiva.
  const constEspeciais = ['Um', 'Sim', 'Nao', 'Mas', 'Entao', 'Ai', 'Ah', 'Ei'];
  for (const s of constEspeciais) assert.strictEqual(D(s), true, s);
});

test('C2.15 texto nao-ingles preservado (nao Assume idioma)', () => {
  for (const s of ['Nao entendo', 'Onde esta', 'Menu principal']) {
    assert.strictEqual(D(s), true, s);
  }
});

// ---------- prova de ausencia de hack especifico (PASSO 19) ----------
test('C2.16 a logica nao menciona o jogo nem o jogo-teste', () => {
  const src = require('fs').readFileSync(
    path.join(R, 'src', 'core', 'displayTextClassifier.js'), 'utf8');
  for (const proibido of ['summertime', 'saga', 'jos03', 'viv03', 'mel06',
    'summertimesaga', 'nova pasta']) {
    assert.ok(!src.toLowerCase().includes(proibido),
      `classificador nao pode mencionar "${proibido}"`);
  }
});

console.log('');
console.log(`RESULTADO: pass=${pass} fail=${fail}`);
if (fail > 0) {
  console.log('\nFALHAS:');
  for (const f of failures) console.log(`  * ${f.n}\n    ${f.m}`);
  process.exitCode = 1;
} else console.log('PASS');