const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const R = path.resolve(__dirname, '..', '..');
const { parseRpyEntries, classifyAll } = require(path.join(R, 'tools', 'reprocessIdentity.js'));
const SD = require(path.join(R, 'src', 'core', 'scriptDetector'));

let pass = 0, fail = 0; const failures = [];
function test(n, f) {
  try { f(); console.log('  ok   ' + n); pass++; }
  catch (e) { console.log('  FALHA ' + n + '  <<< ' + e.message); failures.push({ n, m: e.message }); fail++; }
}

console.log('='.repeat(70));
console.log('PASSO 12 — ciclo sem rede: identidade invalida -> PENDING, nunca success');
console.log('='.repeat(70));
console.log('');

// fixture em memoria: nao toca em nenhum jogo real
const FIXTURE = [
  '    # plot/a.rpy:10',
  '    old "You wanna pick {i}my{/i} brain?"',
  '    new "Você quer escolher {i}meu{/i} cérebro?"',
  '',
  '    # plot/b.rpy:22',
  '    old "( Heh, she must be bored at work again. )"',
  '    new "( Heh, she must be bored at work again. )"',
  '',
  '    # plot/c.rpy:5',
  '    old "Pink Cyclone"',
  '    new "Pink Cyclone"',
  '',
  '    # plot/d.rpy:9',
  '    old "save"',
  '    new "save"',
  '',
  '    # plot/e.rpy:31',
  '    old "Yeah, thanks... I guess."',
  '    new "Yeah, thanks... I guess."',
  '',
  '    # plot/f.rpy:2',
  '    old "Settings"',
  '    new "Configurações"',
].join('\n');

const tmp = path.join(os.tmpdir(), 'opencode', 'ciclo-fixture', 'tl', 'pt_BR');
fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, 'dialogues.rpy'), FIXTURE, 'utf8');

test('PX.1 o parser lê o bloco translate e associa origem', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  assert.strictEqual(e.length, 6);
  assert.strictEqual(e[0].original, 'You wanna pick {i}my{/i} brain?');
  assert.strictEqual(e[0].sourceFile, 'plot/a.rpy');
  assert.strictEqual(e[0].line, 10);
});

test('PX.2 traducao real vai para MANTIDA', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  const { keep } = classifyAll(e);
  assert.strictEqual(e[0].bucket, 'keep', 'traducao real nao pode virar pending');
  assert.ok(keep >= 1);
});

test('PX.3 prosa intacta vai para PENDING (o bug de 34% de identidade)', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  assert.strictEqual(e[1].bucket, 'pending', 'monologo intacto tem de ser pending');
  assert.match(e[1].reason, /TRANSLATION_IDENTITY/);
});

test('PX.4 menu curto intacto tambem vai para PENDING', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  assert.strictEqual(e[4].bucket, 'pending', '"Yeah, thanks... I guess."');
});

test('PX.5 nome proprio intacto e MANTIDO (nao e falha)', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  assert.strictEqual(e[2].bucket, 'keep', '"Pink Cyclone"');
  assert.match(e[2].reason, /identidade legítima/);
});

test('PX.6 identificador intacto e MANTIDO', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  assert.strictEqual(e[3].bucket, 'keep', '"save"');
});

test('PX.7 rotulo de UI traduzido e MANTIDO', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  assert.strictEqual(e[5].bucket, 'keep', '"Settings" -> "Configuracoes"');
});

test('PX.8 pendentes sao reenviaveis: tem original e origem preservados', () => {
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  const pend = e.filter((x) => x.bucket === 'pending');
  assert.strictEqual(pend.length, 2);
  for (const p of pend) {
    assert.ok(p.original && p.original.length > 0, 'pendente precisa do texto original');
    assert.ok(p.sourceFile, 'pendente precisa do arquivo de origem para o provider');
  }
});

test('PX.9 provider ausente => pendente, NUNCA success', () => {
  // Simula o pipeline sem rede: o que um provider falho produziria.
  const resultadoDoProvider = null; // offline
  const e = parseRpyEntries(path.join(tmp, 'dialogues.rpy'));
  classifyAll(e);
  const idsComFalha = e.filter((x) => x.bucket === 'pending').map((x) => x.original);
  assert.strictEqual(resultadoDoProvider, null);
  for (const id of idsComFalha) {
    const v = SD.isTranslated(id, id, { targetLang: 'pt' });
    assert.strictEqual(v.covered, false, 'sem provider, identidade em prosa nao pode ser coberta');
  }
});

test('PX.10 o ciclo e idempotente: rodar duas vezes da o mesmo numero', () => {
  const a = parseRpyEntries(path.join(tmp, 'dialogues.rpy')); classifyAll(a);
  const b = parseRpyEntries(path.join(tmp, 'dialogues.rpy')); classifyAll(b);
  const pa = a.filter((x) => x.bucket === 'pending').length;
  const pb = b.filter((x) => x.bucket === 'pending').length;
  assert.strictEqual(pa, pb);
});

test('PX.11 o jogo NAO e modificado pelo reprocessamento', () => {
  const agora = fs.readFileSync(path.join(tmp, 'dialogues.rpy'), 'utf8');
  assert.strictEqual(agora, FIXTURE, 'o arquivo de tl/ deve ficar intacto');
});

// limpeza
try { fs.rmSync(path.join(os.tmpdir(), 'opencode', 'ciclo-fixture'), { recursive: true, force: true }); } catch (_) {}

console.log('');
console.log(`RESULTADO: pass=${pass} fail=${fail}`);
if (fail > 0) {
  console.log('\nFALHAS:');
  for (const f of failures) console.log(`  * ${f.n}\n    ${f.m}`);
  process.exitCode = 1;
} else console.log('PASS');