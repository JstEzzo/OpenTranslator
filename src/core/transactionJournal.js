/**
 * OpenTranslator — TransactionJournal 2.0
 * Gerenciador de transações atômicas com persistência em disco.
 * Suporta recuperação pós-crash (Resume / Rollback / Inspect).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TransactionJournal {
  constructor(storageDir) {
    this.storageDir = storageDir || path.join(global.DATA_DIR || path.join(__dirname, "../../data"), "transactions");
    if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
  }

  createTransaction(gamePath, engine) {
    const id = "tx_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");
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

  recordFile(txId, relativePath, originalHash, stagedHash) {
    const tx = this.getTransaction(txId);
    if (!tx) return;
    tx.files.push({
      relativePath,
      originalHash,
      stagedHash,
      status: "staged"
    });
    tx.updatedAt = new Date().toISOString();
    this._save(tx);
  }

  setCommitting(txId) {
    const tx = this.getTransaction(txId);
    if (tx) {
      tx.status = "committing";
      tx.updatedAt = new Date().toISOString();
      this._save(tx);
    }
  }

  setCommitted(txId) {
    const tx = this.getTransaction(txId);
    if (tx) {
      tx.status = "committed";
      tx.updatedAt = new Date().toISOString();
      this._save(tx);
    }
  }

  setRolledBack(txId) {
    const tx = this.getTransaction(txId);
    if (tx) {
      tx.status = "rolled_back";
      tx.updatedAt = new Date().toISOString();
      this._save(tx);
    }
  }

  getTransaction(txId) {
    const file = path.join(this.storageDir, txId + ".json");
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (e) {}
    }
    return null;
  }

  listUnfinished() {
    const files = fs.readdirSync(this.storageDir);
    const unfinished = [];
    for (const f of files) {
      if (f.endsWith(".json")) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.storageDir, f), "utf8"));
          if (data.status === "staged" || data.status === "committing") {
            unfinished.push(data);
          }
        } catch (e) {}
      }
    }
    return unfinished;
  }

  _save(tx) {
    const file = path.join(this.storageDir, tx.id + ".json");
    fs.writeFileSync(file, JSON.stringify(tx, null, 2), "utf8");
  }
}

const defaultJournal = new TransactionJournal();
module.exports = defaultJournal;
module.exports.TransactionJournal = TransactionJournal;
