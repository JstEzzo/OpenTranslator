/**
 * unrealApplyHonesty.test.js — REGRESSAO do U-001.
 *
 * Bug: o catch por arquivo ENGOEDIA a falha e o return era
 * success:true INCONDICIONAL. Evidencia do bug: .locres invalido ->
 * SHA256 do arquivo INALTERADO, count 0, e ainda assim success:true com a
 * mensagem afirmando 'compilado com sucesso (0 textos)'.
 *
 * Este teste verifica o EFEITO FISICO (hash antes/depois), alem do retorno:
 * um apply que falha nao pode ter gravado nada.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = path.resolve(__dirname, '..', '..');
const UnrealAdapter = require(path.join(R, 'src/engines/unreal/unrealAdapter.js'));
const crypto = require('crypto');
const RAIZ = fs.mkdtempSync(path.join(os.tmpdir(), 'u001-'));
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log('  ok   ' + n); };
const bad = (n, d) => { fail++; console.log('  FALHA ' + n + (d ? '  <<< ' + d : '')); };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

function inst() {
  const a = new UnrealAdapter();
  a.backupManager = { createBackup: () => ({ ok: true }), restoreOldestBackup: () => ({ ok: false }) };
  return a;
}
async function caso(nome, conteudo, expectSuccess) {
  const d = path.join(RAIZ, nome.replace(/\W/g, '_'));
  fs.mkdirSync(path.join(d, 'Content', 'Localization'), { recursive: true });
  const loc = path.join(d, 'Content', 'Localization', 'x.locres');
  fs.writeFileSync(loc, conteudo);
  const antes = sha(loc);
  const texts = [{ id: 'ue1', file: 'Content/Localization/x.locres', original: 'Hello', clean: 'Hello', format: 'locres_text', namespace: 'ns', key: 'k0', tokens: [] }];
  let r = null, lancou = false;
  try { r = await inst().apply(d, texts, new Map([['ue1', 'Ola']])); }
  catch (e) { lancou = true; }
  const depois = sha(loc);
  const shaIgual = antes === depois;
  const problems = [];
  if (lancou) problems.push('apply lancou');
  if (!r) problems.push('apply nao retornou nada');
  if (r && expectSuccess === false) {
    // O coracao do U-001: uma falha fisica NUNCA pode virar success:true.
    if (r.success === true) problems.push('success=true apos falha fisica');
    if (!shaIgual) problems.push('arquivo foi alterado apesar da falha');
    if (typeof r.message === 'string' && /com sucesso/i.test(r.message)) problems.push('message afirma sucesso');
  }
  if (problems.length) bad(nome + ' -> success=' + (r && r.success) + ' sha=' + (shaIgual ? 'igual' : 'mudou'), problems.join(' | '));
  else ok(nome + ' -> success=' + (r && r.success) + ' sha=' + (shaIgual ? 'igual' : 'mudou'));
  return r;
}

(async () => {
  console.log('=== U-001: excecao nunca pode virar success:true ===');
  await caso('locres invalido (bytes garbage)', Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]), false);
  await caso('locres truncado (1 byte)', Buffer.from([0x00]), false);
  await caso('locres vazio', Buffer.alloc(0), false);
  await caso('locres e diretorio', Buffer.from([0x41]), false);

  console.log('\n--- caso VALIDO continua funcionando (nao desligamos o adapter) ---');
  const ULP = require(path.join(R, 'src/engines/unreal/unrealLocResProvider.js'));
  const d = path.join(RAIZ, 'valido');
  fs.mkdirSync(path.join(d, 'Content', 'Localization'), { recursive: true });
  const loc = path.join(d, 'Content', 'Localization', 'y.locres');
  const ns = { ns: { k0: 'Hello' } };
  let buf;
  try { buf = ULP.buildLocRes(ns); } catch (e) { buf = Buffer.alloc(0); }
  fs.writeFileSync(loc, buf);
  const antes = sha(loc);
  const texts = [{ id: 'ue1', file: 'Content/Localization/y.locres', original: 'Hello', clean: 'Hello', format: 'locres_text', namespace: 'ns', key: 'k0', tokens: [] }];
  let r = null;
  try { r = await inst().apply(d, texts, new Map([['ue1', 'Ola']])); }
  catch (e) { console.log('  apply lancou: ' + e.message); }
  if (r) {
    console.log('  success=' + r.success + ' count=' + r.count + ' msg=' + String(r.message).slice(0, 70));
    if (r.success === true && r.count > 0) ok('caso valido -> apply bem-sucedido, count=' + r.count);
    else bad('caso valido', 'success=' + r.success + ' count=' + r.count);
  } else bad('caso valido', 'apply nao retornou');

  fs.rmSync(RAIZ, { recursive: true, force: true });
  console.log('\npass=' + pass + ' fail=' + fail);
  if (fail > 0) process.exit(1);
})();