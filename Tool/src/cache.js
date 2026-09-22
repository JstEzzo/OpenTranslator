const fs = require("fs");
const path = require("path");
if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..');
if (!global.DATA_DIR) global.DATA_DIR = path.join(global.ROOT, "data");
const { isTranslatableText, logWarn } = require("./utils");

let db = null;
try {
  const Database = require("better-sqlite3");
  db = new Database(path.join(global.DATA_DIR, "global_cache.db"));
  db.pragma("journal_mode = WAL");
  db.prepare(`
    CREATE TABLE IF NOT EXISTS global_cache (
      lang_key TEXT,
      original TEXT,
      translated TEXT
    )
  `).run();
  db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lang_original ON global_cache (lang_key, original)
  `).run();
} catch (e) {
  logWarn("Falha ao inicializar o banco SQLite: " + e.message);
}

function closeDb() {
  if (db) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
      db = null;
    } catch (e) {
      logWarn("Aviso ao fechar banco de dados SQLite: " + e.message);
    }
  }
}

function migrateJsonCacheToSqlite() {
  if (!db) return;
  const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
  if (fs.existsSync(jsonPath)) {
    global.log("info", "Migrando cache global JSON para o banco SQLite...");
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const insert = db.prepare(
        "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
      );

      const transaction = db.transaction((cacheData) => {
        for (const [langKey, translations] of Object.entries(cacheData)) {
          if (translations && typeof translations === "object") {
            for (const [orig, tr] of Object.entries(translations)) {
              if (orig && tr) {
                insert.run(langKey, orig, tr);
              }
            }
          }
        }
      });

      transaction(data);
      global.log("success", "Migração do cache JSON para SQLite concluída com sucesso!");
      fs.renameSync(jsonPath, jsonPath + ".bak");
    } catch (e) {
      global.log("error", "Falha ao migrar cache JSON para SQLite: " + e.message);
    }
  }
}

function loadGlobalCacheForLang(sl, tl, engine) {
  const engineKey = engine || global.CURRENT_ENGINE || "generic";
  const langKey = sl + "|" + tl + "|" + engineKey;
  const dict = {};
  if (db) {
    try {
      const stmt = db.prepare(
        "SELECT original, translated FROM global_cache WHERE lang_key = ?"
      );
      const rows = stmt.all(langKey);
      for (const row of rows) {
        if (row.original && row.translated && row.original !== row.translated) {
          dict[row.original] = row.translated;
        }
      }
      return dict;
    } catch (e) {
      global.log("error", "Erro lendo SQLite, fallback pro JSON: " + e.message);
    }
  }
  try {
    const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const keysToCheck = [langKey, sl + "|" + tl];
      for (const k of keysToCheck) {
        if (data[k]) {
          for (const [orig, tr] of Object.entries(data[k])) {
            if (orig && tr && orig !== tr) {
              dict[orig] = tr;
            }
          }
        }
      }
    }
  } catch (e) {
    global.log("error", "Fallback JSON read falhou: " + e.message);
  }
  return dict;
}

function saveNewGlobalTranslations(sl, tl, translationsArray, engine) {
  if (translationsArray.length === 0) return;
  const engineKey = engine || global.CURRENT_ENGINE || "generic";
  const langKey = sl + "|" + tl + "|" + engineKey;
  if (db) {
    try {
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
      );
      const transaction = db.transaction((items) => {
        for (const [orig, tr] of items) {
          if (isTranslatableText(orig) && isTranslatableText(tr)) {
            stmt.run(langKey, orig, tr);
          }
        }
      });
      transaction(translationsArray);
      return;
    } catch (e) {
      global.log("error", "Erro salvando SQLite, fallback pro JSON: " + e.message);
    }
  }
  // Fallback: JSON
  try {
    const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
    let cache = {};
    if (fs.existsSync(jsonPath)) {
      cache = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    }
    if (!cache[langKey]) cache[langKey] = {};
    for (const [orig, tr] of translationsArray) {
      if (isTranslatableText(orig) && isTranslatableText(tr)) {
        cache[langKey][orig] = tr;
      }
    }
    const tmpPath = jsonPath + ".tmp";
     fs.writeFileSync(tmpPath, JSON.stringify(cache, null, 2), "utf8");
     fs.renameSync(tmpPath, jsonPath);
  } catch (e) {
    global.log("error", "Fallback JSON cache falhou: " + e.message);
  }
}

migrateJsonCacheToSqlite();

const COMMON_TRANS_PATH = path.join(global.DATA_DIR, "common_translations.json");
function loadCommonTranslations() {
  try {
    if (fs.existsSync(COMMON_TRANS_PATH)) {
      return JSON.parse(fs.readFileSync(COMMON_TRANS_PATH, "utf8"));
    }
  } catch (e) {
    global.log("error", "Error loading common translations: " + e.message);
  }
  return {};
}

function getCommonTranslation(text, sl, tl, commonTrans) {
  if (!commonTrans) return null;
  const targetLang = tl || "pt";
  if (sl && sl !== "auto") {
    const pair = `${sl}_${targetLang}`;
    if (commonTrans[pair] && commonTrans[pair][text]) {
      return commonTrans[pair][text];
    }
  }
  if (/^[a-zA-Z0-9\s.,!?:;'\-()_]+$/.test(text)) {
    const pair = `en_${targetLang}`;
    if (commonTrans[pair] && commonTrans[pair][text]) {
      return commonTrans[pair][text];
    }
  }
  return null;
}

const GLOSSARY_PATH = path.join(global.DATA_DIR, "glossary.json");
function loadGlossary() {
  try {
    if (fs.existsSync(GLOSSARY_PATH))
      return JSON.parse(fs.readFileSync(GLOSSARY_PATH, "utf8"));
  } catch (e) {}
  return [];
}

function saveGlossary(entries) {
  fs.writeFileSync(GLOSSARY_PATH, JSON.stringify(entries, null, 2));
  return true;
}

function loadCfg() {
  const fs = require("fs");
  try {
    if (fs.existsSync(global.CFG_PATH))
      return JSON.parse(fs.readFileSync(global.CFG_PATH, "utf8"));
    return {};
  } catch (e) {
    return {};
  }
}

function saveCfg(cfg) {
  const fs = require("fs");
  fs.writeFileSync(global.CFG_PATH, JSON.stringify(cfg, null, 2));
  return true;
}

module.exports = {
  getDb: () => db,
  closeDb,
  loadGlobalCacheForLang,
  saveNewGlobalTranslations,
  loadCommonTranslations,
  getCommonTranslation,
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg,
};
