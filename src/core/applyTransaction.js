/**
 * applyTransaction.js — Transação de aplicação sobre o jogo
 *
 * FASE 6 / PASSO 31 — O FLUXO DE TRADUÇÃO NÃO ERA TRANSACIONAL
 *
 * ---------------------------------------------------------------------------
 * O QUE EXISTIA
 *
 * `patchInstaller.js` tinha o fluxo correto, bem documentado:
 *
 *     START -> BACKUP -> WRITE -> VERIFY -> COMMIT
 *
 * Mas `translationPipeline` — o caminho por onde TODA tradução passa — chamava
 * direto:
 *
 *     const applyResult = await adapter.apply(targetDir, texts, translations, options);
 *
 * Sem journal, sem backup verificado antes de escrever, sem verificação pós.
 * Havia dois lugares que "aplicam", com garantias diferentes, e o que o
 * usuário exercita é o mais fraco.
 *
 * ---------------------------------------------------------------------------
 * O QUE ISTO FAZ
 *
 * Envolve a aplicação do adapter numa transação com:
 *
 *  1. BACKUP verificado por hash ANTES de qualquer escrita. Um backup que não
 *     confere não é backup.
 *  2. JOURNAL de transação, para que uma queda no meio possa ser detectada na
 *     próxima execução.
 *  3. VERIFY pós-escrita: relê os arquivos e compara com o que foi aplicado.
 *  4. COMMIT apenas com as três etapas acima confirmadas.
 *
 * Qualquer falha no meio deixa o jogo no estado do último checkpoint COMPROVADO,
 * e o resultado diz exatamente em que ponto parou.
 *
 * O ponto central: `committed` significa "os bytes no disco são os que
 * queríamos". Não significa "o adapter devolveu success".
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATUS = Object.freeze({
  COMMITTED: 'COMMITTED',
  FAILED_ROLLED_BACK: 'FAILED_ROLLED_BACK',
  FAILED_ROLLBACK_UNCONFIRMED: 'FAILED_ROLLBACK_UNCONFIRMED',
  NOT_APPLIED: 'NOT_APPLIED',
});

/** Hash do conteúdo de um arquivo, ou null se não existir. */
function hashFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch (e) {
    return null;
  }
}

/** Hash de um texto. */
function hashText(text) {
  if (typeof text !== 'string') return null;
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Verifica que um backup realmente contém os arquivos com o conteúdo certo.
 *
 * FASE 6 — um backup criado com `success: true` mas com conteúdo divergente
 * não protege nada: o rollback vai restaurar o arquivo errado e ninguém
 * percebe até o jogo estar quebrado.
 *
 * @param {string} backupDir
 * @param {string[]} relativePaths arquivos que deveriam estar no backup
 * @returns {{verified:boolean, checked:number, missing:string[], mismatched:string[]}}
 */
function verifyBackup(backupDir, relativePaths, expectedHashes = null) {
  const out = { verified: true, checked: 0, missing: [], mismatched: [] };
  if (!backupDir || !fs.existsSync(backupDir)) {
    out.verified = false;
    out.missing = [...(relativePaths || [])];
    return out;
  }
  for (const rel of relativePaths || []) {
    out.checked++;
    const backupFile = path.join(backupDir, rel);
    if (!fs.existsSync(backupFile)) {
      out.missing.push(rel);
      out.verified = false;
    } else if (expectedHashes && (!expectedHashes[rel] || hashFile(backupFile) !== expectedHashes[rel])) {
      out.mismatched.push(rel);
      out.verified = false;
    }
  }
  return out;
}

/**
 * Compara o estado do jogo com o esperado após a aplicação.
 *
 * @param {string} gameDir
 * @param {Array<{path:string, expectedHash:string}>} expectations
 * @returns {{verified:boolean, checked:number, matched:number, wrong:string[]}}
 */
function verifyApplied(gameDir, expectations) {
  const out = { verified: true, checked: 0, matched: 0, wrong: [] };
  for (const e of expectations || []) {
    out.checked++;
    const actual = hashFile(path.join(gameDir, e.path));
    if (actual && actual === e.expectedHash) out.matched++;
    else {
      out.wrong.push({ path: e.path, expected: e.expectedHash, actual });
      out.verified = false;
    }
  }
  return out;
}

/**
 * Aplica traduções dentro de uma transação verificável.
 *
 * @param {object} args
 * @param {object} args.adapter        adapter com apply/rollback
 * @param {string} args.gameDir        diretório do jogo (para backup e journal)
 * @param {Array}  args.texts          textos originais
 * @param {Map}    args.translations   traduções
 * @param {object} args.options        opções do adapter
 * @param {object} [args.journal]      TransactionJournal (injetável para teste)
 * @param {object} [args.backupDir]    onde gravar o backup (injetável)
 * @param {boolean} [args.skipBackup]  pula o backup (só para testes)
 * @returns {Promise<object>} relatório da transação
 */
async function applyTransaction(args) {
  const {
    adapter, gameDir, texts, translations, options = {},
    journal = require('./transactionJournal'),
    skipBackup = false,
  } = args;

  const startedAt = Date.now();
  const tx = { id: null, backupDir: null, files: [] };

  // ------------------------------------------------------------------
  // 1. BACKUP verificado ANTES de escrever.
  // ------------------------------------------------------------------
  if (!skipBackup) {
    const backupRoot = args.backupDir
      || path.join(gameDir, '.ot_tx_backup');
    try {
      if (!fs.existsSync(backupRoot)) fs.mkdirSync(backupRoot, { recursive: true });
      // Backup dos arquivos que o adapter vai tocar.
      // Sem lista explícita de arquivos, não há como saber o que copiar:
      // nesse caso o backup é declarado INCOMPLETO, não "feito".
      const filesToBackup = Array.isArray(options.filesToBackup) && options.filesToBackup.length
        ? options.filesToBackup
        : null;

      if (!filesToBackup) {
        return {
          status: STATUS.NOT_APPLIED,
          committed: false,
          clean: true,
          applied: false,
          error: 'Não foi possível fazer backup: a lista de arquivos a alterar '
            + 'não foi informada. Nada foi escrito no jogo.',
          stage: 'BACKUP',
          journalId: null,
          files: 0,
          durationMs: Date.now() - startedAt,
        };
      }

      tx.files = filesToBackup.slice();
      const originalHashes = Object.create(null);
      for (const rel of tx.files) {
        const src = path.join(gameDir, rel);
        const dst = path.join(backupRoot, rel);
        if (!fs.existsSync(src)) continue;
        originalHashes[rel] = hashFile(src);
        if (!originalHashes[rel]) throw new Error(`Nao foi possivel conferir o original: ${rel}`);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      }
      tx.backupDir = backupRoot;

      const bver = verifyBackup(backupRoot, Object.keys(originalHashes), originalHashes);
      if (!bver.verified) {
        return {
          status: STATUS.NOT_APPLIED,
          committed: false,
          clean: true,
          applied: false,
          error: `Backup invalido: ${bver.missing.length} arquivo(s) ausentes, ${bver.mismatched.length} divergentes. `
            + 'Nada foi escrito no jogo.',
          backupDetail: bver,
          stage: 'BACKUP_VERIFY',
          journalId: null,
          files: tx.files.length,
          durationMs: Date.now() - startedAt,
        };
      }
    } catch (e) {
      return {
        status: STATUS.NOT_APPLIED,
        committed: false,
        clean: true,
        applied: false,
        error: `Falha ao preparar backup: ${e.message}. Nada foi escrito no jogo.`,
        stage: 'BACKUP',
        journalId: null,
        files: 0,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  // ------------------------------------------------------------------
  // 2. JOURNAL: registra a transação antes da primeira escrita.
  // ------------------------------------------------------------------
  try {
    const record = journal.createTransaction(gameDir, options.engine || 'generic');
    tx.id = record.id;
    journal.setCommitting(record.id);
    for (const rel of tx.files) {
      journal.recordFile(
        record.id, rel,
        hashFile(path.join(gameDir, rel)),
        null,
      );
    }
  } catch (e) {
    // Sem journal não dá para recuperar de uma queda. Melhor não começar.
    return {
      status: STATUS.NOT_APPLIED,
      committed: false,
      clean: true,
      applied: false,
      error: `Não foi possível iniciar a transação no diário: ${e.message}. `
        + 'Nada foi escrito no jogo.',
      stage: 'JOURNAL',
      journalId: null,
      files: tx.files.length,
      durationMs: Date.now() - startedAt,
    };
  }

  // ------------------------------------------------------------------
  // 3. APPLY.
  // ------------------------------------------------------------------
  let applyResult;
  try {
    applyResult = await adapter.apply(gameDir, texts, translations, options);
  } catch (e) {
    const rb = await rollback(gameDir, options, tx, adapter);
    return {
      status: rb.clean ? STATUS.FAILED_ROLLED_BACK : STATUS.FAILED_ROLLBACK_UNCONFIRMED,
      committed: false,
      applied: false,
      clean: rb.clean,
      error: `O adapter lançou durante a aplicação: ${e.message}`,
      rollback: rb,
      stage: 'APPLY',
      journalId: tx.id,
      files: tx.files.length,
      durationMs: Date.now() - startedAt,
    };
  }

  if (!applyResult || applyResult.success !== true) {
    const detail = (applyResult && (applyResult.error || applyResult.reason))
      || 'adapter não confirmou sucesso';
    const rb = await rollback(gameDir, options, tx, adapter);
    try { journal.setRolledBack(tx.id); } catch (e) { /* journal é secundário aqui */ }
    return {
      status: rb.clean ? STATUS.FAILED_ROLLED_BACK : STATUS.FAILED_ROLLBACK_UNCONFIRMED,
      committed: false,
      applied: false,
      clean: rb.clean,
      error: `Aplicação falhou: ${detail}`,
      adapterResult: applyResult || null,
      rollback: rb,
      stage: 'APPLY',
      journalId: tx.id,
      files: tx.files.length,
      durationMs: Date.now() - startedAt,
    };
  }

  // ------------------------------------------------------------------
  // 4. VERIFY: relê o disco e compara com o que foi aplicado.
  // ------------------------------------------------------------------
  const expectations = (applyResult.fileHashes || []).map((h) => ({
    path: h.path, expectedHash: h.hash,
  }));
  let vres;
  if (expectations.length === 0) {
    // O adapter não declarou hashes. Não podemos confirmar os bytes.
    vres = {
      verified: false,
      checked: 0,
      matched: 0,
      wrong: [],
      reason: 'adapter não forneceu hashes dos arquivos escritos; a aplicação '
        + 'não pode ser verificada independentemente',
    };
  } else {
    vres = verifyApplied(gameDir, expectations);
  }

  if (!vres.verified) {
    const rb = await rollback(gameDir, options, tx, adapter);
    try { journal.setRolledBack(tx.id); } catch (e) { /* ignore */ }
    return {
      status: rb.clean ? STATUS.FAILED_ROLLED_BACK : STATUS.FAILED_ROLLBACK_UNCONFIRMED,
      committed: false,
      // Aplicou alguma coisa, mas não no estado esperado.
      applied: true,
      clean: rb.clean,
      error: `A aplicação não foi confirmada em disco: ${vres.reason
        || `${vres.wrong.length} arquivo(s) divergem do esperado`}.`,
      verify: vres,
      rollback: rb,
      stage: 'VERIFY',
      journalId: tx.id,
      files: tx.files.length,
      durationMs: Date.now() - startedAt,
    };
  }

  // ------------------------------------------------------------------
  // 5. COMMIT: só agora, com backup verificado + escrita feita + disco conferido.
  // ------------------------------------------------------------------
  try {
    journal.setCommitted(tx.id);
  } catch (e) {
    // O jogo está correto, mas o diário não registrou. Declarar o commit
    // mesmo assim seria mentir sobre a recuperabilidade; declarar falha
    // seria exagerado, porque os dados estão lá.
    return {
      status: STATUS.COMMITTED,
      committed: true,
      applied: true,
      clean: true,
      error: null,
      warning: `A aplicação foi confirmada em disco, mas o diário não pôde `
        + `registrar o commit: ${e.message}. Uma recuperação automática após `
        + 'queda pode não reconhecer esta transação.',
      journalId: tx.id,
      verify: vres,
      files: tx.files.length,
      durationMs: Date.now() - startedAt,
    };
  }

  return {
    status: STATUS.COMMITTED,
    committed: true,
    applied: true,
    clean: true,
    error: null,
    warning: null,
    journalId: tx.id,
    backupDir: tx.backupDir,
    verify: vres,
    adapterResult: applyResult,
    files: tx.files.length,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Executa o rollback e classifica se ele foi confirmado.
 *
 * FASE 6 — o relatorio expoe `clean` E `ok` com o mesmo valor. A primeira
 * versao devolvia so `ok`, e o chamador lia `rb.clean` — que vinha
 * `undefined`, portanto falso por coerção. Um rollback que TINHA funcionado
 * era reportado como "nao confirmado", e o usuario recebia aviso de estado
 * possivelmente parcial com o jogo intacto. Divergencia de nome de campo
 * entre escritor e leitor e um falso negativo silencioso.
 */
async function rollback(gameDir, options, tx, adapter) {
  const done = (extra) => ({ attempted: true, ok: true, clean: true, ...extra });
  const unconfirmed = (extra) => ({
    attempted: true, ok: false, clean: false, ...extra,
  });

  // 1. Tenta pelo adapter (que conhece o formato do jogo).
  if (adapter && typeof adapter.rollback === 'function') {
    try {
      const r = await adapter.rollback(gameDir, options);
      if (r === true || (r && typeof r === 'object' && (r.success === true || r.ok === true))) {
        return done({ adapterResult: r === true ? null : r });
      }
      return unconfirmed({
        adapterResult: r === undefined ? null : r,
        detail: (r && typeof r === 'object' && (r.error || r.reason))
          || 'adapter nao confirmou a restauracao',
      });
    } catch (e) {
      return unconfirmed({ detail: `adapter.rollback lancou: ${e.message}` });
    }
  }
  // 2. Sem adapter: restaura do backup que nos mesmos fizemos, por hash.
  if (tx.backupDir) {
    const results = { restored: 0, failed: [] };
    for (const rel of tx.files) {
      const src = path.join(tx.backupDir, rel);
      const dst = path.join(gameDir, rel);
      try {
        if (!fs.existsSync(src)) { results.failed.push(rel); continue; }
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        // Confere por hash: restaurar nao e o mesmo que restaurar o certo.
        if (hashFile(src) !== hashFile(dst)) results.failed.push(rel);
        else results.restored++;
      } catch (e) {
        results.failed.push(rel);
      }
    }
    const allOk = results.failed.length === 0;
    const detail = allOk
      ? `${results.restored} arquivo(s) restaurados e verificados por hash`
      : `${results.failed.length} arquivo(s) nao puderam ser restaurados: `
        + results.failed.join(', ');
    return allOk
      ? done({ restored: results.restored, failed: [], detail })
      : unconfirmed({ restored: results.restored, failed: results.failed, detail });
  }
  return {
    attempted: false, ok: false, clean: false,
    detail: 'nenhum mecanismo de rollback disponivel',
  };
}

module.exports = {
  applyTransaction,
  rollback,
  verifyBackup,
  verifyApplied,
  hashFile,
  hashText,
  STATUS,
};
