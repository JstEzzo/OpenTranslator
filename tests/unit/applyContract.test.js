/**
 * tests/unit/applyContract.test.js — o contrato de apply é verificável?
 *
 * ===========================================================================
 * A PERGUNTA QUE DECIDE SE ESTE MÓDULO VALE ALGO
 * ===========================================================================
 *
 * `fileHashes` é verificacao apenas se os dois lados da comparação forem
 * INDEPENDENTES:
 *
 *     escrita:  conteudoEmMemoria --hash--> esperado
 *     disco:    releituraDoDisco   --hash--> observado
 *
 * Se o hash fosse calculado lendo o arquivo DEPOIS de escrever, a comparação
 * seria o número contra ele mesmo: sempre passaria, e o campo seria
 * decoração. Esse é o modo de falha silencioso mais perigoso possível num
 * mecanismo de verificação — parece funcionar, e não verifica.
 *
 * Estes testes plantam um adapter que grava um conteúdo DIFERENTE do que
 * declara no contrato, e exigem que a transação reprove. Se alguém "simplificar"
 * a implementação para hashear pós-escrita, estes testes quebram.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { planFilesFromTexts, startApplyContract } = require('../../src/core/applyContract.js');
const { applyTransaction, STATUS, verifyApplied } = require('../../src/core/applyTransaction.js');

let pass = 0;
let fail = 0;
const casos = [];
function teste(nome, fn) { casos.push({ nome, fn }); }

function tmpGame(arquivos) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-contract-'));
  for (const [rel, conteudo] of Object.entries(arquivos || {})) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, conteudo, 'utf8');
  }
  return dir;
}

// ===========================================================================
// planFilesFromTexts
// ===========================================================================

teste('C1 planFilesFromTexts deriva caminhos dos textos e remove duplicata', () => {
  const r = planFilesFromTexts([
    { file: 'data/Map001.json' },
    { file: 'data\\Map002.json' },
    { file: 'data/Map001.json' },
    { file: './data/Map003.json' },
  ]);
  assert.deepStrictEqual(r, ['data/Map001.json', 'data/Map002.json', 'data/Map003.json']);
});

teste('C2 planFilesFromTexts RECUSA caminho que sai do jogo', () => {
  // Um `file` com `../` faria o backup escrever FORA do diretorio do jogo.
  // E a mesma classe de defeito que o sanitizePath da FASE 1 fechou no HTTP.
  const r = planFilesFromTexts([
    { file: '../../windows/system32/config' },
    { file: '/etc/passwd' },
    { file: 'C:/temp/x.json' },
    { file: 'data/ok.json' },
  ]);
  assert.deepStrictEqual(r, ['data/ok.json']);
});

teste('C3 planFilesFromTexts ignora texto sem `file`', () => {
  const r = planFilesFromTexts([{ id: 'x' }, { file: null }, {}, { file: 'a.json' }]);
  assert.deepStrictEqual(r, ['a.json']);
});

// ===========================================================================
// o contrato
// ===========================================================================

teste('C4 finish() so marca transactional quando o plano e satisfeito', () => {
  const ac = startApplyContract('/tmp/x', [{ file: 'data/a.json' }]);
  const out = ac.finish({ success: true, count: 1 });
  // Nada declarado ainda: nao pode-se prometer transacao.
  assert.strictEqual(out.transactional, false);
  assert.deepStrictEqual(out.filesToBackup, ['data/a.json']);
});

teste('C5 escrever dentro do plano torna o adapter transacional', () => {
  const ac = startApplyContract('/tmp/x', [{ file: 'data/a.json' }]);
  const w = ac.wrote('data/a.json', '{"k":"traducao"}');
  assert.strictEqual(w.recorded, true);
  const out = ac.finish({ success: true });
  assert.strictEqual(out.transactional, true);
  assert.strictEqual(out.fileHashes.length, 1);
  assert.strictEqual(out.fileHashes[0].path, 'data/a.json');
});

teste('C6 escrever FORA do plano NAO marca transacional', () => {
  // O adapter escreve um arquivo que os textos nao mencionam (plugin
  // registration, CSS, manifesto). O backup nao cobriria esse arquivo, e o
  // rollback nao o alcançaria: a transacao seria incompleta.
  const ac = startApplyContract('/tmp/x', [{ file: 'data/a.json' }]);
  ac.wrote('data/a.json', 'ok');
  const w = ac.wrote('js/plugins.js', 'registro');
  assert.strictEqual(w.recorded, false);
  const out = ac.finish({ success: true });
  assert.strictEqual(out.transactional, false,
    'Escrever fora do plano precisa BLOQUEAR a transacao.');
});

// ===========================================================================
// A PROVA DE QUE NAO É VACUOSO
//
// E A ARMADILHA DOS DOIS FORMATOS
//
// O codigo tem DOIS formatos, e eles nao se chamam igual:
//
//   applyResult.fileHashes        -> [{ path, hash }]           (do adapter)
//   verifyApplied(expectations)   -> [{ path, expectedHash }]  (da funcao)
//
// `applyTransaction` faz a ponte entre os dois. A primeira versao destes
// testes passava `fileHashes` DIRETO para `verifyApplied`, e o resultado foi:
//
//   - C7 ("reprova divergente") PASSAVA — mas porque `expectedHash` chegava
//     `undefined` e NADA NUNCA casava. Um teste que passa sem validar nada.
//   - C8 ("aprova igual") FALHAVA — e era o unico que estava certo.
//
// Ou seja: o teste que devia provar que a verificacao FUNCIONA era o unico
// vermelho, e o que devia provar que ela DETECTA MENTIRA era o que "passava".
// Com so o C7, o bug do nome do campo teria passado inteiro.
//
// Aqui os dois passam pela mesma ponte que `applyTransaction` usa.
const comoExpectations = (fileHashes) => fileHashes.map((h) => ({
  path: h.path, expectedHash: h.hash,
}));

teste('C7 verifyApplied REPROVA adapter que grava diferente do que declarou', () => {
  const dir = tmpGame({ 'data/a.json': '{"original":1}' });

  // O adapter DECLARA que escreveu `{"k":"traducao"}`...
  const conteudoDeclarado = '{"k":"traducao"}';
  const ac = startApplyContract(dir, [{ file: 'data/a.json' }]);
  ac.wrote('data/a.json', conteudoDeclarado);

  // ... mas grava outra coisa no disco.
  const conteudoReal = '{"k":"TRADUCAO_MAS_DIFERENTE"}';
  fs.writeFileSync(path.join(dir, 'data', 'a.json'), conteudoReal, 'utf8');

  const v = verifyApplied(dir, comoExpectations(ac.finish({ success: true }).fileHashes));
  assert.strictEqual(
    v.verified, false,
    'verifyApplied APROVOU um arquivo cujo conteudo diverge do declarado. '
    + 'O hash esta sendo calculado dos dois lados a partir da mesma leitura — '
    + 'a verificacao e vacuosa.',
  );
});

teste('C8 verifyApplied APROVA quando o disco bate com o declarado', () => {
  const dir = tmpGame({ 'data/a.json': '{"original":1}' });
  const conteudo = '{"k":"traducao"}';
  const ac = startApplyContract(dir, [{ file: 'data/a.json' }]);
  ac.wrote('data/a.json', conteudo);
  fs.writeFileSync(path.join(dir, 'data', 'a.json'), conteudo, 'utf8');

  const v = verifyApplied(dir, comoExpectations(ac.finish({ success: true }).fileHashes));
  assert.strictEqual(v.verified, true, 'Deve aprovar quando disco e declaracao concordam.');
});

teste('C8b os DOIS formatos existem, e a ponte entre eles e nomeada', () => {
  // Trava o nome do campo dos dois lados. Se alguem renomear `hash` para
  // `expectedHash` no contrato (ou o inverso), a transformacao em
  // `applyTransaction` passa a ler `undefined` e a verificacao falha
  // SEMPRE — sem erro visivel e sem aviso.
  const dir = tmpGame({ 'data/a.json': 'x' });
  const ac = startApplyContract(dir, [{ file: 'data/a.json' }]);
  ac.wrote('data/a.json', 'y');
  const fh = ac.finish({ success: true }).fileHashes;

  assert.strictEqual(fh.length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(fh[0], 'hash'),
    'fileHashes deve usar o campo `hash`.');
  assert.ok(!Object.prototype.hasOwnProperty.call(fh[0], 'expectedHash'),
    'fileHashes nao deve emitir `expectedHash`: applyTransaction le `h.hash`.');

  // E a ponte precisa produzir o formato que verifyApplied consome.
  const exp = comoExpectations(fh);
  assert.ok(Object.prototype.hasOwnProperty.call(exp[0], 'expectedHash'),
    'A ponte precisa produzir `expectedHash` para verifyApplied.');
});

// ===========================================================================
// ADOÇAO REAL: um adapter do projeto, exercitado de verdade
// ===========================================================================

teste('C11 genericAdapter adotou o contrato e emits os tres campos', () => {
  // Nao e teste de que o texto existe no arquivo: e teste de que a ADOCAO
  // produziu um resultado utilizavel pela transacao.
  const GenericAdapter = require('../../src/engines/generic/genericAdapter.js');
  const a = new GenericAdapter();
  assert.strictEqual(a.transactional, true,
    'genericAdapter declarou `transactional` mas nao adotou o contrato.');

  const raiz = path.resolve(__dirname, '..', '..');
  const src = fs.readFileSync(
    path.join(raiz, 'src', 'engines', 'generic', 'genericAdapter.js'), 'utf8',
  );
  assert.ok(/ac\.finish\(/.test(src), 'apply deve devolver via ac.finish().');
  assert.ok(/ac\.wrote\(/.test(src), 'apply deve declarar as escritas com ac.wrote().');
});

teste('C12 genericAdapter: apply real produz filesToBackup e fileHashes coerentes', () => {
  const GenericAdapter = require('../../src/engines/generic/genericAdapter.js');
  const dir = tmpGame({});
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'data', 'strings.json'),
    JSON.stringify({ greeting: 'こんにちは' }, null, 2), 'utf8',
  );

  const a = new GenericAdapter();
  const texts = [{
    id: 'g1', file: 'data/strings.json', key: 'greeting',
    original: 'こんにちは', clean: 'こんにちは',
    protectedText: 'こんにちは', tokens: [], engine: 'generic',
  }];
  const translations = new Map([['g1', 'Olá']]);

  return a.apply(dir, texts, translations, {}).then((r) => {
    assert.ok(r, 'apply deve retornar um objeto.');
    assert.deepStrictEqual(r.filesToBackup, ['data/strings.json'],
      'filesToBackup deveria conter o arquivo de origem do texto.');
    assert.strictEqual(r.fileHashes.length, 1, 'deveria haver 1 hash declarado.');
    assert.strictEqual(r.fileHashes[0].path, 'data/strings.json');
    assert.ok(r.transactional === true,
      'com a escrita dentro do plano, transactional deveria ser true. '
      + `veio ${r.transactional} (contrato: ${JSON.stringify(r.applyContract)})`);

    // E o hash declarado tem que casar com o que está no disco — que é a
    // verificação que a transação vai fazer.
    const v = verifyApplied(dir, comoExpectations(r.fileHashes));
    assert.strictEqual(v.verified, true,
      'o hash declarado nao casou com o disco apos o apply.');
  });
});

teste('C13 genericAdapter: apply que nao escreve NAO se declara transacional', () => {
  // Se nenhum texto casar, nada e escrito. Declarar `transactional: true`
  // aqui seria afirmar um backup deuma transacao que nao aconteceu.
  const GenericAdapter = require('../../src/engines/generic/genericAdapter.js');
  const dir = tmpGame({});
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'strings.json'), '{"a":"b"}', 'utf8');

  const a = new GenericAdapter();
  const texts = [{
    id: 'g1', file: 'data/strings.json', key: 'a',
    original: 'b', clean: 'b',
    protectedText: 'b', tokens: [], engine: 'generic',
  }];
  // Traducao igual ao original: o adapter nao escreve nada.
  const translations = new Map([['g1', 'b']]);

  return a.apply(dir, texts, translations, {}).then((r) => {
    assert.strictEqual(r.fileHashes.length, 0);
    assert.strictEqual(r.transactional, false,
      'sem escrita declarada, transactional tem de ser false.');
  });
});

// ===========================================================================
// INTEGRACAO: a transacao usa o contrato de ponta a ponta
// ===========================================================================

teste('C9 applyTransaction COMMITTED exige os hashes do contrato', () => {
  const dir = tmpGame({ 'data/a.json': '{"original":1}' });
  const ac = startApplyContract(dir, [{ file: 'data/a.json' }]);

  const adapter = {
    transactional: true,
    async apply(gameDir, texts, translations, options) {
      const conteudo = '{"k":"traducao"}';
      fs.writeFileSync(path.join(gameDir, 'data', 'a.json'), conteudo, 'utf8');
      ac.wrote('data/a.json', conteudo);
      return ac.finish({ success: true, count: 1 });
    },
    async rollback() { return { success: true }; },
  };

  return applyTransaction({
    adapter,
    gameDir: dir,
    texts: [{ file: 'data/a.json', original: '{"original":1}' }],
    translations: new Map([['x', '{"k":"traducao"}']]),
    options: { filesToBackup: ac.filesToBackup, backupDir: path.join(dir, '.bk') },
  }).then((tx) => {
    assert.strictEqual(tx.status, STATUS.COMMITTED,
      `esperava COMMITTED, veio ${tx.status}: ${tx.error || ''}`);
    assert.strictEqual(tx.committed, true);
  });
});

teste('C10 applyTransaction NAO COMMIT quando o adapter grava diferente do declarado', () => {
  const dir = tmpGame({ 'data/a.json': '{"original":1}' });
  const ac = startApplyContract(dir, [{ file: 'data/a.json' }]);

  const adapter = {
    transactional: true,
    async apply(gameDir) {
      // DECLARA uma coisa, ESCREVE outra.
      ac.wrote('data/a.json', '{"k":"traducao"}');
      fs.writeFileSync(path.join(gameDir, 'data', 'a.json'), '{"k":"OUTRA"}', 'utf8');
      return ac.finish({ success: true, count: 1 });
    },
    async rollback() { return { success: true }; },
  };

  return applyTransaction({
    adapter,
    gameDir: dir,
    texts: [{ file: 'data/a.json' }],
    translations: new Map([['x', 'y']]),
    options: { filesToBackup: ac.filesToBackup, backupDir: path.join(dir, '.bk') },
  }).then((tx) => {
    assert.notStrictEqual(tx.status, STATUS.COMMITTED,
      'A transacao COMMITTED com o conteudo do disco divergente do declarado. '
      + 'E o modo de falha mais caro: rollbackReleased um jogo que nao esta '
      + 'no estado que o usuario esperava.');
  });
});

// ===========================================================================
// Runner
// ===========================================================================

(async function rodar() {
  console.log('=== FASE 10 — CONTRATO DE APPLY (filesToBackup + fileHashes) ===');
  for (const c of casos) {
    try {
      await c.fn();
      console.log(`  ok   ${c.nome}`);
      pass++;
    } catch (e) {
      console.log(`  FAIL ${c.nome}`);
      console.log(`       ${e.message}`);
      fail++;
    }
  }
  console.log('');
  console.log('--- RESULTADO FASE 10 (contrato de apply) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) process.exit(1);
}());
