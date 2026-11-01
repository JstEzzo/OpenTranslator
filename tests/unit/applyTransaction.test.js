/**
 * tests/unit/applyTransaction.test.js — FASE 6 / PASSO 31
 *
 * A aplicação de tradução passa por uma transação verificável. Este teste usa
 * um jogo de FAKE no disco — arquivos reais num diretório temporário — e
 * adapters programáveis, inclusive adapters que MINTEM.
 *
 * ---------------------------------------------------------------------------
 * O QUE EXISTIA
 *
 * `patchInstaller.js` tinha o fluxo START → BACKUP → WRITE → VERIFY → COMMIT.
 * `translationPipeline`, pelo qual TODA tradução passa, chamava `adapter.apply`
 * direto: sem journal, sem backup verificado, sem verificação pós.
 *
 * Dois lugares que "aplicam", com garantias diferentes, e o que o usuário
 * exercita é o mais fraco.
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
  console.log('=== FASE 6 — TRANSAÇÃO DE APLICAÇÃO ===');
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
  console.log('\n--- RESULTADO FASE 6 (transação) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const TX = require(path.join(ROOT, 'src', 'core', 'applyTransaction'));
const { TransactionJournal } = require(path.join(ROOT, 'src', 'core', 'transactionJournal'));
const { hashFile } = TX;

global.log = () => {};

/** Cria um jogo fake com N arquivos de conteúdo original. */
function makeGame(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-tx-game-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  }
  return dir;
}

function cleanupDir(dir) {
  try { if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

const ORIG = { 'data/Actors.json': '{"name":"HERO","jp":"こんにちは"}' };

/** Adapter que escreve de verdade e devolve os hashes. */
function honestAdapter(onApply) {
  return {
    async apply(gameDir, texts, translations, options) {
      const written = [];
      for (const [rel, content] of Object.entries(options.writeMap || {})) {
        const p = path.join(gameDir, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content, 'utf8');
        written.push({ path: rel, hash: hashFile(p) });
      }
      if (onApply) onApply(gameDir);
      return { success: true, count: written.length, fileHashes: written };
    },
    async rollback(gameDir) {
      return { success: true, detail: 'restaurado' };
    },
  };
}

/** Adapter que declara sucesso mas escreve NADA. */
function lyingAdapter() {
  return {
    async apply() {
      // BUG ORIGINAL: success:true sem tocar no disco.
      return {
        success: true,
        count: 999,
        fileHashes: [{ path: 'data/Actors.json', hash: 'hash-que-nunca-existiu' }],
      };
    },
    async rollback() { return { success: true }; },
  };
}

/**
 * Adapter que grava um arquivo NOVO e devolve o hash dele — mas deixa o
 * arquivo que deveria ter traduzido intacto.
 *
 * FASE 6 — a primeira versão deste teste só escrevia o arquivo novo e
 * declarava o hash dele. A verificação passava (o hash era o do arquivo novo,
 * e ele estava correto), e a transação COMITAVA. O teste não media o que
 * dizia medir.
 *
 * Aqui o adapter declara o hash do ARQUIVO QUE NÃO TRADUZIU, com o hash do
 * conteúdo traduzido que ele deveria ter escrito. A verificação tem que ver
 * que o disco não bate.
 */
function partialAdapter() {
  return {
    async apply(gameDir) {
      // 1. Cria um arquivo novo, corretamente.
      const other = path.join(gameDir, 'data/Extra.json');
      fs.mkdirSync(path.dirname(other), { recursive: true });
      fs.writeFileSync(other, '{"novo":"arquivo"}', 'utf8');

      // 2. "Traduz" o arquivo principal... voltando o original. O jogador
      //    continua vendo japonês.
      const main = path.join(gameDir, 'data/Actors.json');
      fs.writeFileSync(main, ORIG['data/Actors.json'], 'utf8');

      // 3. E declara o hash do que DEVERIA ter escrito.
      const expectedContent = '{"name":"HERO","jp":"Olá"}';
      const expectedHash = require('crypto')
        .createHash('sha256').update(expectedContent, 'utf8').digest('hex');

      return {
        success: true,
        count: 2,
        fileHashes: [
          { path: 'data/Extra.json', hash: hashFile(other) }, // confere
          { path: 'data/Actors.json', hash: expectedHash },  // NÃO confere
        ],
      };
    },
    async rollback() { return { success: true }; },
  };
}

function mkJournal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-tx-journal-'));
  return { journal: new TransactionJournal(dir), dir };
}

const TEXTS = [{ id: 1, clean: 'こんにちは', tokens: [] }];
const TRANSLATIONS = new Map([[1, 'Olá']]);

// ---------------------------------------------------------------------------
test('T1 backup é feito e VERIFICADO antes de qualquer escrita', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const before = fs.readFileSync(path.join(game, 'data/Actors.json'), 'utf8');
    const r = await TX.applyTransaction({
      adapter: honestAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: {
        filesToBackup: ['data/Actors.json'],
        writeMap: { 'data/Actors.json': '{"name":"HERO","jp":"Olá"}' },
      },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.strictEqual(r.status, TX.STATUS.COMMITTED, `falhou: ${JSON.stringify(r)}`);

    // O backup existe e contém o ORIGINAL, não a tradução.
    const backupFile = path.join(game, '.ot_tx_backup', 'data/Actors.json');
    assert.ok(fs.existsSync(backupFile), 'o backup precisa existir');
    assert.strictEqual(fs.readFileSync(backupFile, 'utf8'), before,
      'o backup precisa guardar o estado ORIGINAL');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T2 COMMITTED significa bytes conferidos no disco', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const r = await TX.applyTransaction({
      adapter: honestAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: {
        filesToBackup: ['data/Actors.json'],
        writeMap: { 'data/Actors.json': '{"name":"HERO","jp":"Olá"}' },
      },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.strictEqual(r.committed, true);
    assert.ok(r.verify, 'a transação precisa trazer o relatório de verificação');
    assert.strictEqual(r.verify.checked, 1);
    assert.strictEqual(r.verify.matched, 1);
    assert.strictEqual(r.verify.verified, true);
    // E o disco realmente tem a tradução.
    assert.match(fs.readFileSync(path.join(game, 'data/Actors.json'), 'utf8'), /Olá/);
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T3 adapter que MENTE (success:true, não escreve) NÃO é COMMIT', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  const before = fs.readFileSync(path.join(game, 'data/Actors.json'), 'utf8');
  try {
    const r = await TX.applyTransaction({
      adapter: lyingAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: { filesToBackup: ['data/Actors.json'] },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.notStrictEqual(r.status, TX.STATUS.COMMITTED,
      'BUG ORIGINAL: success:true do adapter virava sucesso da transação');
    assert.strictEqual(r.committed, false);
    assert.ok(r.error, 'a falha precisa ser explicada');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T4 adapter que escreve só METADE é pego na verificação', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const r = await TX.applyTransaction({
      adapter: partialAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: { filesToBackup: ['data/Actors.json'] },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.notStrictEqual(r.status, TX.STATUS.COMMITTED,
      'BUG ORIGINAL: aplicação parcial declarada como sucesso');
    assert.strictEqual(r.committed, false);
    assert.strictEqual(r.applied, true, 'o adapter escreveu algo, mesmo que errado');
    assert.strictEqual(r.stage, 'VERIFY', 'a falha tem de ser na verificação');
    assert.ok(r.verify, 'precisa trazer o relatório de verificação');
    assert.strictEqual(r.verify.verified, false);
    assert.strictEqual(r.verify.checked, 2);
    assert.strictEqual(r.verify.matched, 1, 'só o arquivo novo confere');
    assert.strictEqual(r.verify.wrong.length, 1, 'o arquivo não traduzido tem de ser apontado');
    assert.strictEqual(r.verify.wrong[0].path, 'data/Actors.json');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T5 sem lista de arquivos, o backup é INCOMPLETO e nada é escrito', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  const before = fs.readFileSync(path.join(game, 'data/Actors.json'), 'utf8');
  try {
    const r = await TX.applyTransaction({
      adapter: honestAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: {
        writeMap: { 'data/Actors.json': '{"name":"HERO","jp":"Olá"}' },
        // sem filesToBackup
      },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.strictEqual(r.status, TX.STATUS.NOT_APPLIED);
    assert.strictEqual(r.applied, false);
    assert.strictEqual(r.stage, 'BACKUP');
    assert.strictEqual(fs.readFileSync(path.join(game, 'data/Actors.json'), 'utf8'), before,
      'nada pode ser escrito quando o backup não pôde ser feito');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T6 apply que lança faz rollback e diz se ele foi confirmado', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const boom = {
      async apply() { throw new Error('disco cheio'); },
      async rollback() { return { success: true }; },
    };
    const r = await TX.applyTransaction({
      adapter: boom,
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: { filesToBackup: ['data/Actors.json'] },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.strictEqual(r.status, TX.STATUS.FAILED_ROLLED_BACK);
    assert.strictEqual(r.clean, true);
    assert.strictEqual(r.applied, false);
    assert.ok(r.rollback.attempted);
    assert.strictEqual(r.rollback.ok, true);
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T7 rollback que NÃO confirma é distinguido do que confirma', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const silencioso = {
      async apply() { throw new Error('x'); },
      // Adapter que não diz nada sobre o rollback.
      async rollback() { return {}; },
    };
    const r = await TX.applyTransaction({
      adapter: silencioso,
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: { filesToBackup: ['data/Actors.json'] },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.strictEqual(r.status, TX.STATUS.FAILED_ROLLBACK_UNCONFIRMED,
      'BUG ORIGINAL: rollback sem confirmação era tratado como sucesso');
    assert.strictEqual(r.clean, false, 'estado desconhecido não é "limpo"');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T8 o journal registra a transação e o estado final', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    const r = await TX.applyTransaction({
      adapter: honestAdapter(),
      gameDir: game,
      texts: TEXTS,
      translations: TRANSLATIONS,
      options: {
        filesToBackup: ['data/Actors.json'],
        writeMap: { 'data/Actors.json': '{"name":"HERO","jp":"Olá"}' },
      },
      journal: j.journal,
      backupDir: path.join(game, '.ot_tx_backup'),
    });
    assert.ok(r.journalId, 'a transação precisa de um id');
    const rec = j.journal.getTransaction(r.journalId);
    assert.ok(rec, 'o registro tem que existir no diário');
    assert.strictEqual(rec.status, 'committed');
    assert.strictEqual(rec.files.length, 1);
    assert.strictEqual(rec.files[0].relativePath, 'data/Actors.json');
    assert.ok(rec.files[0].originalHash, 'o hash do original precisa ser registrado');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

test('T9 transação abandonada aparece em listUnfinished', async () => {
  const game = makeGame(ORIG);
  const j = mkJournal();
  try {
    // Uma transação que fica em "committing" é o que sobra de uma queda.
    const tx = j.journal.createTransaction(game, 'renpy');
    j.journal.recordFile(tx.id, 'data/Actors.json', 'hashA', 'hashB');
    j.journal.setCommitting(tx.id);

    const un = j.journal.listUnfinished();
    assert.ok(un.length >= 1, 'a transação abandonada tem de aparecer');
    const found = un.find((t) => t.id === tx.id);
    assert.ok(found, 'a transação específica tem de estar na lista');
    assert.strictEqual(found.status, 'committing');
  } finally {
    cleanupDir(game); cleanupDir(j.dir);
  }
});

// ---------------------------------------------------------------------------
// Journal: atomicidade e segurança
// ---------------------------------------------------------------------------
test('T10 o journal BLOQUEIA txId com travessia de caminho', () => {
  const j = mkJournal();
  try {
    for (const evil of ['../../evil', '..\\..\\evil', '/etc/passwd', 'tx_123_short', '']) {
      assert.strictEqual(j.journal.getTransaction(evil), null,
        `txId malformado ${JSON.stringify(evil)} não pode ser aceito`);
    }
    // E o registerFile não pode escrever fora do diretório.
    assert.throws(
      () => j.journal.recordFile('../../evil', 'x', 'a', 'b'),
      /txId inválido/,
    );
  } finally {
    cleanupDir(j.dir);
  }
});

test('T11 recordFile em transação inexistente LANÇA (não é no-op silencioso)', () => {
  const j = mkJournal();
  try {
    // BUG ORIGINAL: `if (!tx) return;` — o chamador achava que gravou.
    assert.throws(
      () => j.journal.recordFile('tx_9999999999999_aaaaaaaa', 'x', 'a', 'b'),
      /não encontrada/,
    );
    assert.throws(() => j.journal.setCommitting('tx_9999999999999_aaaaaaaa'), /não encontrada/);
  } finally {
    cleanupDir(j.dir);
  }
});

test('T12 registro CORROMPIDO é distinguível de "não existe"', () => {
  const j = mkJournal();
  try {
    const tx = j.journal.createTransaction('/games/x', 'renpy');
    const file = path.join(j.dir, `${tx.id}.json`);
    fs.writeFileSync(file, '{ truncado {{{', 'utf8');

    // getTransaction agora LANÇA, em vez de devolver null calado.
    let code = null;
    try {
      j.journal.getTransaction(tx.id);
    } catch (e) {
      code = e.code;
    }
    assert.strictEqual(code, 'CORRUPT',
      'BUG ORIGINAL: registro corrompido era indistinguível de inexistente');

    // E listUnfinished o reporta em vez de engolir.
    const un = j.journal.listUnfinished();
    assert.ok(un.corrupt && un.corrupt.length === 1,
      'um diário corrompido é a informação mais importante da lista');
  } finally {
    cleanupDir(j.dir);
  }
});

test('T13 o journal não deixa .tmp órfão e grava atomicamente', () => {
  const j = mkJournal();
  try {
    const tx = j.journal.createTransaction('/games/y', 'renpy');
    j.journal.setCommitting(tx.id);
    j.journal.setCommitted(tx.id);
    const leftovers = fs.readdirSync(j.dir).filter((f) => f.includes('.tmp'));
    assert.strictEqual(leftovers.length, 0, `órfãos: ${leftovers.join(', ')}`);
    assert.strictEqual(j.journal.getTransaction(tx.id).status, 'committed');
  } finally {
    cleanupDir(j.dir);
  }
});

test('T14 verifyBackup detecta arquivo ausente', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-tx-bk-'));
  try {
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'data/A.json'), '{}', 'utf8');
    const ok = TX.verifyBackup(dir, ['data/A.json']);
    assert.strictEqual(ok.verified, true);
    const bad = TX.verifyBackup(dir, ['data/A.json', 'data/B.json']);
    assert.strictEqual(bad.verified, false);
    assert.deepStrictEqual(bad.missing, ['data/B.json']);
  } finally {
    cleanupDir(dir);
  }
});

test('T15 verifyBackup em diretório inexistente não é "verificado"', () => {
  const r = TX.verifyBackup(path.join(os.tmpdir(), 'nao-existe-xyz'), ['a.json']);
  assert.strictEqual(r.verified, false);
  assert.strictEqual(r.missing.length, 1);
});

// ---------------------------------------------------------------------------
// gameService.rollback — o {ok:true,...res} mascarando falha
// ---------------------------------------------------------------------------
/**
 * Remove linhas de comentário.
 *
 * FASE 6 — a primeira versão deste teste falhou por causa disso: o comentário
 * que documenta o bug antigo contém literalmente `return { ok: true, ...res }`,
 * e a busca por padrão o encontra. Um teste que não distingue código de
 * comentário sobre o próprio defeito não protege nada.
 */
function codeOnly(src) {
  return src.split(/\r?\n/)
    .map((l) => l.replace(/^\s*\/\*.*$/, '')
      .replace(/^\s*\*.*$/, '')
      .replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

test('T16 gameService.rollback NÃO mascara falha do adapter com ok:true', () => {
  const src = codeOnly(fs.readFileSync(
    path.join(ROOT, 'src', 'core', 'gameService.js'), 'utf8',
  ));
  // BUG ORIGINAL: `return { ok: true, ...res }` — o ok:true vinha primeiro e
  // sobrevivia a um `{success:false}` do adapter.
  assert.ok(!/return\s*\{\s*ok:\s*true,\s*\.\.\.res\s*\}/.test(src),
    'o padrão {ok:true, ...res} não pode voltar');

  // E o spread de um resultado externo tem de vir ANTES dos campos derivados,
  // ou ele sobrescreve a classificação.
  //
  // FASE 6 — a primeira versão deste regex estava invertido e acusava a
  // ordem CORRETA. O padrão proibido é "campo derivado, depois spread":
  //      status: ..., ...restoreRes      <- spread sobrescreve o status
  assert.ok(
    !/(ok|status|restored|clean)\s*:[^\n]*,\s*\n\s*\.\.\.restoreRes/.test(src),
    'spread depois de campo derivado sobrescreve a classificação',
  );
  assert.ok(
    /\.\.\.restoreRes\s*,/.test(src),
    'o resultado do BackupManager precisa ser espalhado',
  );
});

test('T17 rollback sem confirmação do adapter tem status próprio', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'core', 'gameService.js'), 'utf8');
  assert.ok(src.includes('ROLLBACK_UNCONFIRMED'),
    'rollback sem confirmação do adapter precisa de status próprio');
  assert.ok(src.includes('ROLLBACK_FAILED'),
    'e um status para rollback que confirmou falha');
  assert.ok(src.includes('clean:'),
    'a resposta precisa declarar se o estado é limpo');
});

test('T18 o helper de rollback expõe clean E ok com o mesmo valor', async () => {
  // FASE 6 — o helper devolvia só `ok`, e o chamador lia `clean`. Um
  // rollback que funcionava era reportado como "não confirmado" por coerção
  // de undefined para false.
  const game = makeGame(ORIG);
  try {
    const bom = { async rollback() { return { success: true }; } };
    const r = await TX.rollback(game, {}, { backupDir: null, files: [] }, bom);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.clean, true, 'clean precisa espelhar ok');

    const mau = { async rollback() { return {}; } };
    const r2 = await TX.rollback(game, {}, { backupDir: null, files: [] }, mau);
    assert.strictEqual(r2.ok, false);
    assert.strictEqual(r2.clean, false);
  } finally {
    cleanupDir(game);
  }
});

test('T19 backup com bytes corrompidos impede apply antes da escrita no jogo', async () => {
  const game = makeGame(ORIG);
  const copy = fs.copyFileSync;
  let applied = false;
  try {
    fs.copyFileSync = (src, dst) => {
      copy(src, dst);
      if (String(dst).includes('.ot_tx_backup')) fs.writeFileSync(dst, 'CORROMPIDO');
    };
    const result = await TX.applyTransaction({
      adapter: { async apply() { applied = true; return { success: true }; } },
      gameDir: game, texts: [], translations: new Map(),
      options: { filesToBackup: Object.keys(ORIG) },
    });
    assert.strictEqual(result.stage, 'BACKUP_VERIFY');
    assert.strictEqual(result.committed, false);
    assert.strictEqual(applied, false);
    assert.deepStrictEqual(result.backupDetail.mismatched, Object.keys(ORIG));
    for (const [rel, content] of Object.entries(ORIG)) {
      assert.strictEqual(fs.readFileSync(path.join(game, rel), 'utf8'), content);
    }
  } finally { fs.copyFileSync = copy; cleanupDir(game); }
});

runAll();
