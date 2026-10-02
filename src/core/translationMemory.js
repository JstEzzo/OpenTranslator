/**
 * OpenTranslator — Translation Memory 2.0
 * Suporte a memória hierárquica (Game -> Project -> Engine -> Global),
 * StringIdentity estável, Delta Translation e Glossário Inteligente com prioridades.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TranslationMemory2 {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(global.DATA_DIR || path.join(__dirname, "../../data"), "translation_memory.sqlite");
    this.inMemoryStore = new Map();
    this.glossary = [];
    this.cacheStats = { hits: 0, misses: 0 };
    this.init();
  }

  init() {
    try {
      const Database = require("better-sqlite3");
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS translations (
          id TEXT PRIMARY KEY,
          engine TEXT,
          scope TEXT,
          game_id TEXT,
          file_path TEXT,
          speaker TEXT,
          source_text TEXT,
          normalized_source TEXT,
          translated_text TEXT,
          source_hash TEXT,
          lang_source TEXT,
          lang_target TEXT,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tm_hash ON translations(source_hash);
        CREATE INDEX IF NOT EXISTS idx_tm_scope ON translations(scope, engine);
      `);
      this.hasSqlite = true;
    } catch (e) {
      this.hasSqlite = false;
    }
  }

  /**
   * Gera um StringIdentity único e estável.
   */
  generateIdentity(engine, filePath, label, speaker, sourceText) {
    const norm = (sourceText || "").trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(norm).digest("hex").substring(0, 16);
    return [
      engine || "generic",
      filePath ? path.basename(filePath) : "unknown",
      label || "root",
      speaker || "none",
      hash
    ].join("|");
  }

  /**
   * Consulta hierárquica com prioridade: Game -> Project -> Engine -> Global
   */
  lookup(sourceText, options = {}) {
    if (!sourceText) return null;
    const norm = sourceText.trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(norm).digest("hex");
    const engine = options.engine || "generic";
    const gameId = options.gameId || "default";

    if (this.hasSqlite) {
      try {
        const stmt = this.db.prepare(`
          SELECT translated_text, scope FROM translations
          WHERE source_hash = ? AND (
            (scope = 'game' AND game_id = ?) OR
            (scope = 'engine' AND engine = ?) OR
            (scope = 'global')
          )
          ORDER BY CASE scope
            WHEN 'game' THEN 1
            WHEN 'engine' THEN 2
            WHEN 'global' THEN 3
            ELSE 4
          END ASC
          LIMIT 1
        `);
        const row = stmt.get(hash, gameId, engine);
        if (row) {
          this.cacheStats.hits++;
          return row.translated_text;
        }
      } catch (e) {}
    }

    if (this.inMemoryStore.has(hash)) {
      this.cacheStats.hits++;
      return this.inMemoryStore.get(hash).translated_text;
    }

    this.cacheStats.misses++;
    return null;
  }

  store(sourceText, translatedText, options = {}) {
    if (!sourceText || !translatedText) return;
    const norm = sourceText.trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(norm).digest("hex");
    const engine = options.engine || "generic";
    const scope = options.scope || "global";
    const gameId = options.gameId || "default";
    const id = this.generateIdentity(engine, options.filePath, options.label, options.speaker, sourceText);
    const now = new Date().toISOString();

    if (this.hasSqlite) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO translations (id, engine, scope, game_id, file_path, speaker, source_text, normalized_source, translated_text, source_hash, lang_source, lang_target, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            translated_text = excluded.translated_text,
            updated_at = excluded.updated_at
        `);
        stmt.run(
          id, engine, scope, gameId, options.filePath || "", options.speaker || "",
          sourceText, norm, translatedText, hash,
          options.langSource || "ja", options.langTarget || "pt_BR",
          now, now
        );
      } catch (e) {}
    }

    this.inMemoryStore.set(hash, {
      id, engine, scope, sourceText, translated_text: translatedText
    });
  }

  setGlossary(terms = []) {
    // Ordena termos de maior comprimento para menor comprimento
    // Evita substituições parciais ("Skills" antes de "Skill")
    this.glossary = [...terms].sort((a, b) => (b.source || "").length - (a.source || "").length);
  }

  applyGlossary(text) {
    if (!text || !this.glossary.length) return text;
    let res = text;
    for (const term of this.glossary) {
      if (!term.source || !term.target) continue;
      const flags = term.caseSensitive ? "g" : "gi";
      const escaped = term.source.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const reg = new RegExp("\\b" + escaped + "\\b", flags);
      res = res.replace(reg, term.target);
    }
    return res;
  }

  computeDelta(oldStrings = [], newStrings = []) {
    const oldMap = new Map();
    for (const item of oldStrings) {
      const id = typeof item === "string" ? item : item.id || item.text;
      oldMap.set(id, item);
    }

    const delta = {
      unchanged: [],
      newItems: [],
      changed: [],
      removed: []
    };

    const visitedOld = new Set();

    for (const newItem of newStrings) {
      const id = typeof newItem === "string" ? newItem : newItem.id || newItem.text;
      const oldItem = oldMap.get(id);

      if (!oldItem) {
        delta.newItems.push(newItem);
      } else {
        visitedOld.add(id);
        const oldText = typeof oldItem === "string" ? oldItem : oldItem.text;
        const newText = typeof newItem === "string" ? newItem : newItem.text;
        if (oldText === newText) {
          delta.unchanged.push(newItem);
        } else {
          delta.changed.push({ oldItem, newItem });
        }
      }
    }

    for (const [id, oldItem] of oldMap.entries()) {
      if (!visitedOld.has(id)) {
        delta.removed.push(oldItem);
      }
    }

    return delta;
  }

  getHitRate() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total === 0) return 0;
    return Math.round((this.cacheStats.hits / total) * 100);
  }
}

const tmInstance = new TranslationMemory2();
module.exports = tmInstance;
module.exports.TranslationMemory2 = TranslationMemory2;
