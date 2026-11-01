/**
 * tests/unit/successInvariant.test.js — PROVA QUE O GATE FECHA
 *
 * ===========================================================================
 * POR QUE ESTE TESTE EXISTE
 * ===========================================================================
 *
 * A FASE 9 corrigiu 10 defeitos reais de sucesso sem evidência. Depois disso
 * o gate reportou ZERO para A2 e A3 — e esse é exatamente o momento em que
 * um gate estático deve ser considerado suspeito, não aprovado.
 *
 * Zero pode significar "não há defeito". Também pode significar "o detector
 * parou de olhar". As duas coisas produzem o mesmo número, e só uma é boa.
 *
 * Este teste existe para separar as duas. Ele planta cada anti-pattern em
 * fixtures sintáticas e exige que o detector ACERTE — se um padrão deixa de
 * ser encontrado, o teste quebra. Sem ele, "0 defeitos" é uma afirmação sem
 * LASTRO, que é exatamente o defeito que esta fase existe para eliminar.
 *
 * Cada caso abaixo tem uma razão de existir, registrada no comentário.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const audit = require('../../tools/successAudit.js');

// ---------------------------------------------------------------------------
// Execução do detector sobre TRECHOS SINTETICOS.
//
// O detector opera sobre src/ do projeto. Para testá-lo sobre código
// controlado, montamos um src/ temporário com o mesmo layout e apontamos o
// scanner para lá. Reimplementar o classificador aqui seria testar uma cópia,
// não o código.
// ---------------------------------------------------------------------------

/** Executa o classificador sobre uma lista de arquivos {rel, conteudo}. */
function auditarArquivos(arquivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-success-'));
  const srcDir = path.join(raiz, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  for (const a of arquivos) {
    const destino = path.join(raiz, a.rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, a.conteudo, 'utf8');
  }

  // O modulo cacheia ROOT no require; para auditar outro diretorio, chamamos
  // a funcao interna com o ROOT trocado via require limpo.
  delete require.cache[require.resolve('../../tools/successAudit.js')];
  const mod = require('../../tools/successAudit.js');
  const ROOT_REAL = mod.__setRootForTest(raiz);
  const r = mod.audit();
  mod.__setRootForTest(ROOT_REAL);
  delete require.cache[require.resolve('../../tools/successAudit.js')];
  fs.rmSync(raiz, { recursive: true, force: true });
  return r;
}

const casos = [];
function teste(nome, fn) { casos.push({ nome, fn }); }

// ===========================================================================
// A1 — SUCESSO VAZIO
// ===========================================================================

teste('A1 DETECTA `{ ok: true }` sem payload e sem E/S', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function fechaSessao(id) {',
      '  this.mapa.delete(id);',
      '  return { ok: true };',
      '}',
    ].join('\n'),
  }]);
  // `this.mapa.delete(id)` é mutação, não I/S. O ponto é o objeto vazio.
  assert.ok(
    r.defeitos.some((d) => d.tipo === 'A1_SUCESSO_VAZIO'),
    'A1 deveria acusar success sem payload. Defeitos: ' + JSON.stringify(r.defeitos),
  );
});

teste('A1 DETECTA escrever-e-declarar-sucesso sem reler nada', () => {
  // Este é `installUnity` e `patchGameFont` no original: escrevia o arquivo e
  // devolvia `{ ok: true }`. Um write pode ter criado um `.ttf` vazio, e um
  // `@font-face` apontando para ele não muda uma letra na tela.
  //
  // A EXPECTATIVA AQUI E OPOSTA A DE "E/S E EVIDENCIA". Escrever não é
  // verificar. Se este teste passasse sem acusar, o gate estaria repetindo o
  // defeito que veio corrigir.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function grava(p) {',
      '  fs.writeFileSync(p, "conteudo");',
      '  return { ok: true };',
      '}',
    ].join('\n'),
  }]);
  assert.ok(
    r.defeitos.some((d) => d.tipo === 'A1_SUCESSO_VAZIO'),
    'A1 deve acusar escrita seguida de sucesso sem releitura. Defeitos: '
      + JSON.stringify(r.defeitos),
  );
});

teste('A1 NAO acusa quando o corpo RELE o que escreveu', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function grava(p) {',
      '  fs.writeFileSync(p, "conteudo");',
      '  const lido = fs.readFileSync(p, "utf8");',
      '  if (lido !== "conteudo") {',
      '    return { ok: false, error: "conteudo divergente" };',
      '  }',
      '  return { ok: true };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A1_SUCESSO_VAZIO').length, 0,
    'A1 nao deve acusar sucesso apos releitura e comparacao.',
  );
});

// ===========================================================================
// A2 — SUCESSO COM FALHA ENGOLIDA
// ===========================================================================

teste('A2 DETECTA catch engolido seguido de sucesso', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function limpaCache(dir) {',
      '  try {',
      '    fs.unlinkSync(dir);',
      '  } catch (e) {}',
      '  return { ok: true };',
      '}',
    ].join('\n'),
  }]);
  assert.ok(
    r.defeitos.some((d) => d.tipo === 'A2_FALHA_ENGOLIDA'),
    'A2 deveria acusar sucesso apesar do catch engolido. Defeitos: '
      + JSON.stringify(r.defeitos),
  );
});

teste('A2 NAO acusa o `return true` protegido pelo proprio try', () => {
  // Este é o caso `jobPersistence.deleteJob`, que é CÓDIGO CORRETO:
  // o sucesso está dentro do try, então falha leva ao `return false`.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function remove(p) {',
      '  if (fs.existsSync(p)) {',
      '    try { fs.unlinkSync(p); return true; } catch (e) {}',
      '  }',
      '  return false;',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A2_FALHA_ENGOLIDA').length, 0,
    'A2 nao deve acusar sucesso inalcancivel: o try protege o return.',
  );
});

teste('A2 NAO acusa quando o catch registra o erro', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function limpa(dir) {',
      '  try {',
      '    fs.unlinkSync(dir);',
      '  } catch (e) {',
      '    logWarn("falhou: " + e.message);',
      '  }',
      '  return { ok: true, partial: true };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A2_FALHA_ENGOLIDA').length, 0,
    'catch que REGISTRA o erro nao e falha engolida.',
  );
});

teste('A2 AINDA DETECTA quando nao ha nenhuma verificacao', () => {
  // FASE 9 / PASSO 64 — GUARDA CONTRA A PRÓPRIA RELAXAÇÃO.
  //
  // A2 foi relaxado para nao acusar quando o sucesso esta guardado por uma
  // releitura real (`cache.js`, `transactionJournal.js` acusavam codigo
  // correto). Relaxar um detector e perigoso: a tentacao de "resolver" os
  // falsos positivos e afrouxar ate nao detectar mais nada.
  //
  // Este teste existe para travar a outra ponta. Se o `!temVerificacao(corpo)`
  // for removido por engano, ou se `temVerificacao` passar a casar qualquer
  // coisa, este teste quebra. O alvo e: A2 so ignora o catch quando existe
  // prova — nunca quando ela falta.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function salvaArquivo(p, dados) {',
      '  try {',
      '    fs.unlinkSync(p);',
      '  } catch (e) {}',
      '  fs.writeFileSync(p, dados);',
      '  return { success: true };',
      '}',
    ].join('\n'),
  }]);
  assert.ok(
    r.defeitos.some((d) => d.tipo === 'A2_FALHA_ENGOLIDA'),
    'A2 deve continuar acusando catch engolido quando o sucesso NAO tem '
    + 'verificacao alguma. Defeitos: ' + JSON.stringify(r.defeitos),
  );
});

teste('A2 NAO acusa catch de LIMPEZA quando o sucesso tem releitura', () => {
  // O caso `transactionJournal.record`, que acusava indevidamente.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function gravaJournal(file, tx) {',
      '  const tmpPath = file + ".tmp";',
      '  try {',
      '    if (fs.existsSync(tmpPath)) {',
      '      try { fs.unlinkSync(tmpPath); } catch (e) { /* segue */ }',
      '    }',
      '    fs.writeFileSync(tmpPath, JSON.stringify(tx));',
      '    fs.renameSync(tmpPath, file);',
      '    const back = JSON.parse(fs.readFileSync(file, "utf8"));',
      '    if (back.id !== tx.id) {',
      '      throw new Error("registro divergente");',
      '    }',
      '    return true;',
      '  } catch (e) {',
      '    return false;',
      '  }',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A2_FALHA_ENGOLIDA').length, 0,
    'Catch de limpeza de .tmp nao contamina sucesso guardado por releitura.',
  );
});

// ===========================================================================
// A3 — SUCESSO QUE ECOA OS PROPRIOS ARGUMENTOS
// ===========================================================================

teste('A3 DETECTA metodo que devolve o parametro sem fazer nada', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'class P {',
      '  async substitui(identidade, texto) {',
      '    return { success: true, replaced: true, identity: identidade, text: texto };',
      '  }',
      '}',
    ].join('\n'),
  }]);
  assert.ok(
    r.defeitos.some((d) => d.tipo === 'A3_ECO_DE_ARGUMENTOS'),
    'A3 deveria acusar eco de argumento sem E/S. Defeitos: '
      + JSON.stringify(r.defeitos),
  );
});

teste('A3 NAO acusa quando o parametro foi realmente escrito', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'class P {',
      '  async substitui(identidade, texto) {',
      '    const res = await this.injector.write({ identity: identidade, text: texto });',
      '    return { success: true, replaced: true, identity: identidade };',
      '  }',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A3_ECO_DE_ARGUMENTOS').length, 0,
    'A3 nao deve acusar metodo que escreve de verdade antes de devolver.',
  );
});

teste('A3 NAO acusa variavel LOCAL confundida com parametro', () => {
  // Regressão do `inicioFuncao`: `if (matchedFolder) {` era lido como
  // assinatura de método, e `matchedFolder` (um const local) como parâmetro.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function resolve(base, nome) {',
      '  const achado = acharPasta(base, nome);',
      '  if (achado) {',
      '    const full = path.join(base, achado);',
      '    log("resolvido em " + full);',
      '    return { success: true, dir: full, folder: achado };',
      '  }',
      '  return { success: false };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A3_ECO_DE_ARGUMENTOS').length, 0,
    'A3 nao deve acusar variavel local como se fosse parametro.',
  );
});

// ===========================================================================
// ESCOPO — controles de fluxo nao sao assinaturas
// ===========================================================================

teste('ESCOPO `if (...) {` nao e tratado como inicio de funcao', () => {
  // Se `if` contasse como metodo, o corpo do `if` pareceria uma funcao sem
  // E/S, e o `return` interno seria acusado como A3.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function f(a) {',
      '  if (a) {',
      '    const b = a + 1;',
      '    return { success: true, valor: b };',
      '  }',
      '  return { success: false };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.length, 0,
    'Nenhum defeito esperado aqui. Achados: ' + JSON.stringify(r.defeitos),
  );
});

teste('ESCOPO `{}` de valor padrao NAO fecha o corpo da funcao', () => {
  // =========================================================================
  // REGRESSÃO: `ocrProvider.js:90`
  // =========================================================================
  //
  // `captureGameWindow(destImagePath, options = {})` tem um `{}` na
  // assinatura. Contando chaves ingenuamente, o par abre e fecha na mesma
  // linha e o classificador conclui que a função termina ali — `corpo`
  // ficava com UMA linha, sem E/S, e A3 acusava um método que faz
  // `spawnSync` + `existsSync` + `statSync`.
  //
  // A pior parte desse bug era que ele morava em `fimFuncao`, e `corpo` é
  // insumo de A1, A2 e A3 — então uma linha de brokenness contaminava as
  // três regras ao mesmo tempo.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'class P {',
      '  capture(destImagePath, options = {}) {',
      '    spawnSync("powershell", ["-Command", script], { encoding: "utf-8" });',
      '    if (fs.existsSync(destImagePath) && fs.statSync(destImagePath).size > 500) {',
      '      return { success: true, imagePath: destImagePath, preset: options.preset };',
      '    }',
      '    return { success: false, error: "Falha ao capturar imagem." };',
      '  }',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A3_ECO_DE_ARGUMENTOS').length, 0,
    '`options = {}` nao pode fazer o corpo da função virar uma linha. '
    + 'Achados: ' + JSON.stringify(r.defeitos),
  );
});

teste('ESCOPO valor padrao com objeto NAO multi, so um par de chaves', () => {
  // `{}` abre e fecha na mesma linha; `opts = { verbose: false }` tambem.
  // Nenhum dos dois pode ser confundido com bloco.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'function f(a, opts = { verbose: false }, cache = new Map()) {',
      '  const x = fs.readFileSync(a, "utf8");',
      '  return { success: true, valor: x, nome: opts.nome };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.length, 0,
    'Chave dentro de parenteses de assinatura nao e chave de bloco. '
    + 'Achados: ' + JSON.stringify(r.defeitos),
  );
});

// ===========================================================================
// COMENTÁRIO NÃO É CÓDIGO
// ===========================================================================

teste('COMENTARIO com `catch (e) {}` citado NAO e lido como catch vazio', () => {
  // Regressão real: documentar a correção exige citar o código antigo. Em
  // `rpcHandlers.getRenpyAppDataStatus` o comentário que explicava a remoção
  // do `catch (e) {}` fez o gate acusar o handler que eu já tinha consertado.
  // O defeito estava corrigido e o gate vermelho, por causa da documentação.
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'async status(dir) {',
      '  // FASE 9 - `catch (e) {}` aqui devolvia `saves: []`, que e',
      '  // indistinguivel de "este jogo nao tem saves".',
      '  const saves = [];',
      '  let savesError = null;',
      '  if (dir) {',
      '    try {',
      '      saves.push(1);',
      '    } catch (e) {',
      '      savesError = e.message;',
      '    }',
      '  }',
      '  return { ok: true, saves, savesError };',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.length, 0,
    'Comentário não pode ser lido como código. Achados: ' + JSON.stringify(r.defeitos),
  );
});

teste('COMENTARIO com assinatura de metodo citado NAO abre funcao', () => {
  const r = auditarArquivos([{
    rel: 'src/x.js',
    conteudo: [
      'class P {',
      '  // o original era `async substitui(identity, texto) {`',
      '  async substitui(identity, texto) {',
      '    const res = await this.io.write({ identity: identity, text: texto });',
      '    return { success: true, replaced: true, identity: identity };',
      '  }',
      '}',
    ].join('\n'),
  }]);
  assert.strictEqual(
    r.defeitos.filter((d) => d.tipo === 'A3_ECO_DE_ARGUMENTOS').length, 0,
    'Assinatura citada em comentário não pode virar início de função.',
  );
});

// ===========================================================================
// ESTADO REAL DO REPO
// ===========================================================================

teste('REPO o gate passa: nenhum dos tres anti-patterns em src/', () => {
  const r = audit.audit();
  assert.strictEqual(
    r.defeitos.length, 0,
    'O gate de sucesso deve passar. Defeitos:\n'
      + r.defeitos.map((d) => `  [${d.tipo}] ${d.rel}:${d.line} — ${d.detalhe}`).join('\n')
      + (r.staleAllowlist.length
        ? '\nJustificativas orfas (codigo mudou sob a justificativa):\n'
          + r.staleAllowlist.map((k) => `  ${k}`).join('\n')
        : ''),
  );
});

teste('REPO nenhuma justificativa ficou orfa', () => {
  const r = audit.audit();
  assert.strictEqual(
    r.staleAllowlist.length, 0,
    'Justificativas que nao casam mais indicam codigo alterado sem reavaliacao:\n'
      + r.staleAllowlist.join('\n'),
  );
});

teste('REPO o gate realmente varre src/ (nao passa por vazio)', () => {
  // Um gate que nao le nada reporta 0 defeitos e "passa". Este teste exige
  // que ele tenha realmente encontrado afirmacoes de sucesso para auditar.
  const r = audit.audit();
  assert.ok(
    r.afirmacoes > 100,
    `O gate deveria varrer centenas de afirmacoes de sucesso; viu ${r.afirmacoes}. `
    + 'Se este numero caiu, o detector parou de casar Patterns.',
  );
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

(async function rodar() {
  let pass = 0;
  let fail = 0;
  console.log('=== FASE 9 — INVARIANTE DE SUCESSO (gate anti-teatro) ===');
  for (const c of casos) {
    try {
      c.fn();
      console.log(`  ok   ${c.nome}`);
      pass++;
    } catch (e) {
      console.log(`  FAIL ${c.nome}`);
      console.log(`       ${e.message}`);
      fail++;
    }
  }
  console.log('');
  console.log('--- RESULTADO FASE 9 (invariante de sucesso) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) process.exit(1);
}());
