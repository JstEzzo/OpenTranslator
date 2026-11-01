/**
 * OpenTranslator — TransactionJournal 2.0
 * Gerenciador de transações atômicas com persistência em disco.
 * Suporta recuperação pós-crash (Resume / Rollback / Inspect).
 *
 * ---------------------------------------------------------------------------
 * FASE 6 / PASSO 31 — O DIÁRIO NÃO PODE PERDER A PRÓPRIA TRANSAÇÃO
 *
 * O diário é a única coisa que sobrevive a uma queda no meio da aplicação. Se
 * ele se corromper, não há como saber o que foi alterado, e o usuário fica
 * com um jogo pela metade e nenhum registro do que aconteceu.
 *
 * Defeitos corrigidos:
 *
 * 1. `_save` usava `fs.writeFileSync` direto. Uma queda no meio da escrita
 *    deixava um JSON truncado — e um JSON truncado é pior que nenhum, porque
 *    `listUnfinished()` o engole no `catch (e) {}` e o jogo fica modificado sem
 *    que ninguém saiba qual arquivo. Agora: tmp + fsync + rename atômico.
 *
 * 2. `txId` ia direto para `path.join(storageDir, txId + ".json")`. Um
 *    `txId` com `../` lia ou escrevia JSON fora do diretório de transações.
 *    O id pode vir de RPC, então a travessia era alcançável. Agora o id é
 *    validado e o caminho resolvido é conferido contra o diretório.
 *
 * 3. `recordFile`/`setCommitting`/`setCommitted`/`setRolledBack` faziam
 *    `if (!tx) return;` — no-op silencioso. Um commit que não achou a
 *    transação retornava sem erro e o chamador acreditava queGravou.
 *
 * 4. `getTransaction` devolvia `null` tanto para "não existe" quanto para
 *    "existe e está corrompido". Um diário corrompido é justamente o caso que
 *    precisa de tratamento especial, e era invisível.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/** Formato aceito de id: tx_<timestamp>_<hex>. Nada fora disso. */
const TX_ID_RE = /^tx_[0-9]{10,17}_[0-9a-f]{8,32}$/;

class TransactionJournalError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'TransactionJournalError';
    this.code = code;
  }
}

class TransactionJournal {
  constructor(storageDir) {
    this.storageDir = storageDir
      || path.join(global.DATA_DIR || path.join(__dirname, "../../data"), "transactions");
    if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
  }

  /**
   * Valida um txId e devolve o caminho ABSOLUTO do registro, garantindo que
   * ele está dentro de storageDir.
   *
   * FASE 6 — sem isto, `txId = "../../evil"` escrevia fora do diretório.
   */
  _txFile(txId) {
    if (typeof txId !== 'string' || !TX_ID_RE.test(txId)) {
      throw new TransactionJournalError(
        `txId inválido: ${JSON.stringify(String(txId).slice(0, 60))}`, 'BAD_TX_ID',
      );
    }
    const file = path.resolve(this.storageDir, `${txId}.json`);
    const root = path.resolve(this.storageDir);
    if (!file.startsWith(root + path.sep)) {
      throw new TransactionJournalError(
        'txId resolve para fora do diretório de transações', 'PATH_ESCAPE',
      );
    }
    return file;
  }

  createTransaction(gamePath, engine) {
    const id = "tx_" + Date.now() + "_" + crypto.randomBytes(6).toString("hex");
    const record = {
      id,
      gamePath,
      engine,
      status: "staged", // staged -> committing -> committed | rolled_back | failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: []
    };
    this._save(record);
    return record;
  }

  /**
   * FASE 6 — registra um arquivo na transação.
   * Antes: `if (!tx) return;` — no-op silencioso que o chamador não detectava.
   */
  recordFile(txId, relativePath, originalHash, stagedHash) {
    const tx = this._mustGet(txId);
    if (typeof relativePath !== 'string' || relativePath === '') {
      throw new TransactionJournalError('relativePath ausente', 'BAD_PATH');
    }
    tx.files.push({
      relativePath,
      originalHash: originalHash || null,
      stagedHash: stagedHash || null,
      status: "staged"
    });
    tx.updatedAt = new Date().toISOString();
    this._save(tx);
    return tx;
  }

  setCommitting(txId) {
    return this._setStatus(txId, "committing");
  }

  setCommitted(txId) {
    return this._setStatus(txId, "committed");
  }

  setRolledBack(txId) {
    return this._setStatus(txId, "rolled_back");
  }

  setFailed(txId, reason) {
    const tx = this._mustGet(txId);
    tx.status = 'failed';
    tx.failureReason = reason || null;
    tx.updatedAt = new Date().toISOString();
    this._save(tx);
    return tx;
  }

  _setStatus(txId, status) {
    const tx = this._mustGet(txId);
    tx.status = status;
    tx.updatedAt = new Date().toISOString();
    this._save(tx);
    return tx;
  }

  _mustGet(txId) {
    // FASE 6 — valida o formato do id ANTES de procurar. Sem esta validação
    // prévia, um id malformado gerava "transação não encontrada", que é uma
    // afirmação falsa: o problema não é ausência, é entrada inválida. O
    // chamador que tentava uma travessia de caminho recebia um erro que não
    // apontava a causa.
    this._txFile(txId);
    const tx = this.getTransaction(txId);
    if (!tx) {
      throw new TransactionJournalError(
        `transação não encontrada ou registro corrompido: ${txId}`, 'TX_NOT_FOUND',
      );
    }
    return tx;
  }

  /**
   * @returns {object|null} a transação, ou null.
   * @throws {TransactionJournalError} com code CORRUPT quando o registro
   *         existe mas não pôde ser lido. Antes esse caso era indistinguível
   *         de "não existe", e é justamente o caso que exige ação.
   */
  getTransaction(txId) {
    let file;
    try {
      file = this._txFile(txId);
    } catch (e) {
      // id malformado é "não existe", não erro: quem pergunta por um id
      // inválido quer um null, não uma exceção.
      return null;
    }
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      const err = new TransactionJournalError(
        `registro ${txId} existe mas está corrompido: ${e.message}`, 'CORRUPT',
      );
      err.txId = txId;
      err.file = file;
      throw err;
    }
  }

  /**
   * Transações que não chegaram a um estado terminal.
   * Um registro CORROMPIDO aparece aqui, marked, em vez de sumir.
   */
  listUnfinished() {
    let files = [];
    try {
      files = fs.readdirSync(this.storageDir);
    } catch (e) {
      return [];
    }
    const unfinished = [];
    const corrupt = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.storageDir, f), "utf8"));
        if (data.status === "staged" || data.status === "committing") {
          unfinished.push(data);
        }
      } catch (e) {
        // FASE 6 — antes: `catch (e) {}` e o registro sumia. Um diário
        // corrompido é a informação mais importante que existe aqui.
        corrupt.push({
          file: f,
          error: e.message,
          note: 'registro de transação ilegível; o jogo pode ter sido modificado '
            + 'parcialmente e não há como saber o que foi alterado',
        });
      }
    }
    if (corrupt.length > 0) unfinished.corrupt = corrupt;
    return unfinished;
  }

  /**
   * FASE 6 — escrita ATÔMICA do diário.
   *
   * tmp → fsync → rename. O rename é atômico no mesmo volume: ou o registro
   * antigo está lá, ou o novo, nunca um meio-termo truncado.
   */
  _save(tx) {
    const file = this._txFile(tx.id);
    const tmpPath = `${file}.${process.pid}.tmp`;
    let fd = null;
    try {
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch (e) { /* segue */ }
      }
      const payload = JSON.stringify(tx, null, 2);
      fd = fs.openSync(tmpPath, 'w');
      fs.writeFileSync(fd, payload, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = null;
      fs.renameSync(tmpPath, file);

      // ---- VERIFICAÇÃO: o registro relido é o que queríamos gravar? ----
      const back = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (back.id !== tx.id || back.status !== tx.status) {
        throw new Error(`registro gravado divergente: esperado ${tx.id}/${tx.status}, `
          + `obtido ${back.id}/${back.status}`);
      }
      return true;
    } catch (e) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (e2) { /* ignore */ }
      }
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e2) { /* ignore */ }
      throw new TransactionJournalError(
        `falha ao gravar transação ${tx.id}: ${e.message}`, 'WRITE_FAILED',
      );
    }
  }
}

const defaultJournal = new TransactionJournal();
module.exports = defaultJournal;
module.exports.TransactionJournal = TransactionJournal;
module.exports.TransactionJournalError = TransactionJournalError;
module.exports.TX_ID_RE = TX_ID_RE;
