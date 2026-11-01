const path = require('path');
const assert = require('assert');
const R = path.resolve(__dirname, '..', '..');
const SD = require(path.join(R, 'src', 'core', 'scriptDetector'));

let pass = 0, fail = 0; const failures = [];
function test(n, f) {
  try { f(); console.log('  ok   ' + n); pass++; }
  catch (e) { console.log('  FALHA ' + n + '  <<< ' + e.message); failures.push({ n, m: e.message }); fail++; }
}
const V = (o, t) => SD.isTranslated(o, t, { targetLang: 'pt' });

console.log('='.repeat(70));
console.log('C1 — TRANSLATION_IDENTITY: provider que devolve o original nao e sucesso');
console.log('='.repeat(70));
console.log('');

test('C1.1 frase de dialogo devolvida intacta NAO e cobertura', () => {
  const v = V('You wanna pick {i}my{/i} brain?', 'You wanna pick {i}my{/i} brain?');
  assert.strictEqual(v.covered, false);
  assert.match(v.reason, /TRANSLATION_IDENTITY/);
});

test('C1.2 monologo interno intacto NAO e cobertura', () => {
  const v = V('( Heh, she must be bored at work again. )', '( Heh, she must be bored at work again. )');
  assert.strictEqual(v.covered, false, 'monologo em prosa devolvido intacto precisa ser falha');
});

test('C1.3 menu/escolha intacta NAO e cobertura', () => {
  const v = V('Yeah, thanks... I guess.', 'Yeah, thanks... I guess.');
  assert.strictEqual(v.covered, false);
});

test('C1.4 o motivo TRANSLATION_IDENTITY e distinguivel e estavel', () => {
  const v = V('This ought to be good...', 'This ought to be good...');
  assert.strictEqual(v.covered, false);
  assert.ok(v.reason.startsWith('TRANSLATION_IDENTITY'), v.reason);
  assert.strictEqual(SD.TRANSLATION_IDENTITY_REASON, 'TRANSLATION_IDENTITY');
});

// ---- PASSO 12: identidade VALIDA continua valida
test('C1.5 nome proprio permanece coberto', () => {
  for (const s of ['Pink Cyclone', 'PA', 'sam9', 'DarkCookie', 'CaptainSploosh', 'Arboris']) {
    const v = V(s, s);
    assert.strictEqual(v.covered, true, `nome proprio "${s}" nao pode virar falha`);
    assert.strictEqual(v.identitySafe, true);
  }
});

test('C1.6 identificador de codigo permanece coberto', () => {
  for (const s of ['open', 'cast', 'menu', 'mono', 'old_', '_door', 'pillarbox', 'Shot', '242424']) {
    const v = V(s, s);
    assert.strictEqual(v.covered, true, `identificador "${s}" nao pode virar falha`);
  }
});

test('C1.7 simbolo e numero permanecem cobertos', () => {
  for (const s of ['...', '?!', '-', '100%', '3']) {
    assert.strictEqual(V(s, s).covered, true, `"${s}"`);
  }
});

test('C1.8 rotulo curto sem verbo permanece coberto', () => {
  for (const s of ['Familiar female voice', 'Helpful young man', 'Lady stuck in dryer']) {
    assert.strictEqual(V(s, s).covered, true, `"${s}"`);
  }
});

// ---- traducao real nunca pode regredir
test('C1.9 traducao real continua coberta', () => {
  const v = V('You wanna pick {i}my{/i} brain?', 'Você quer escolher {i}meu{/i} cérebro?');
  assert.strictEqual(v.covered, true);
  assert.strictEqual(v.reason, 'tradução no idioma alvo');
});

test('C1.10 traducao real de prosa longa continua coberta', () => {
  const o = 'I was actually hoping, I could pick your brain on something.';
  const t = 'Na verdade, eu esperava poder descobrir alguma coisa em sua mente.';
  assert.strictEqual(V(o, t).covered, true);
});

// ---- as outras formas de "traducao vazia" (PASSO 3)
test('C1.11 traducao vazia nunca e cobertura', () => {
  for (const t of ['', '   ', null, undefined]) {
    const v = V('You wanna pick my brain?', t);
    assert.strictEqual(v.covered, false, `traducao ${JSON.stringify(t)}`);
    assert.match(v.reason, /sem tradução/);
  }
});

test('C1.12 identitySo em japones NAO pode virar identidade segura', () => {
  // fonte nao-latina + destino latino: japones intacto e falha, nao nome proprio
  const v = V('これはテストです', 'これはテストです', { targetLang: 'pt' });
  assert.strictEqual(v.covered, false);
});

// ---- a superficie que o pipeline realmente usa
test('C1.13 classifyIdentity expoe a distincao', () => {
  assert.strictEqual(SD.classifyIdentity('open').identitySafe, true);
  assert.strictEqual(SD.classifyIdentity('( Heh, she must be bored. )').identitySafe, false);
  assert.strictEqual(SD.classifyIdentity('').identitySafe, true);
});

test('C1.14 a superficie publica do detector nao regrediu', () => {
  // SCRIPT_PATTERNS é um mapa nome->regex (não array); o que importa é que a
  // superfície usada pelos testes e pelo pipeline continua exportada.
  assert.ok(SD.SCRIPT_PATTERNS && typeof SD.SCRIPT_PATTERNS === 'object');
  assert.ok(Array.isArray(SD.NON_LATIN_GROUPS));
  assert.strictEqual(typeof SD.dominantScript, 'function');
  assert.strictEqual(typeof SD.isIdentitySafe, 'function');
  assert.strictEqual(typeof SD.isTranslated, 'function');
  assert.strictEqual(typeof SD.classifyIdentity, 'function');
});

// ---- prova contra o jogo real (evidencia, nao logica de producao)
test('C1.15 evidencia: dialogo real do jogo deixa de ser cobertura', () => {
  const amostras = [
    '( Heh, she must be bored at work again. )',
    'Yeah, thanks... I guess.',
    'Are you the only mechanic here?',
    'No one is quite sure why she is so dedicated to',
  ];
  for (const s of amostras) assert.strictEqual(V(s, s).covered, false, s);
});

console.log('');
console.log(`RESULTADO: pass=${pass} fail=${fail}`);
if (fail > 0) {
  console.log('\nFALHAS:');
  for (const f of failures) console.log(`  * ${f.n}\n    ${f.m}`);
  process.exitCode = 1;
} else console.log('PASS');