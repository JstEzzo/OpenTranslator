const fs = require("fs");
const path = require("path");

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
  global.log("error", "Falha ao inicializar o banco SQLite: " + e.message);
}

// Para evitar dependência circular imediata, importamos isTranslatableText sob demanda
function getIsTranslatableText() {
  return require("./extractor").isTranslatableText;
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

function loadGlobalCacheForLang(sl, tl) {
  const langKey = sl + "|" + tl;
  const dict = {};
  if (!db) return dict;
  const isTrans = getIsTranslatableText();
  try {
    const stmt = db.prepare(
      "SELECT original, translated FROM global_cache WHERE lang_key = ?"
    );
    const rows = stmt.all(langKey);
    for (const row of rows) {
      if (isTrans(row.original) && isTrans(row.translated)) {
        dict[row.original] = row.translated;
      }
    }
  } catch (e) {
    global.log("error", "Erro ao ler cache SQLite para idioma " + langKey + ": " + e.message);
  }
  return dict;
}

function saveNewGlobalTranslations(sl, tl, translationsArray) {
  if (!db || translationsArray.length === 0) return;
  const langKey = sl + "|" + tl;
  const isTrans = getIsTranslatableText();
  try {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
    );
    const transaction = db.transaction((items) => {
      for (const [orig, tr] of items) {
        if (isTrans(orig) && isTrans(tr)) {
          stmt.run(langKey, orig, tr);
        }
      }
    });
    transaction(translationsArray);
  } catch (e) {
    global.log("error", "Erro ao salvar novas traduções no SQLite: " + e.message);
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
  loadGlobalCacheForLang,
  saveNewGlobalTranslations,
  loadCommonTranslations,
  getCommonTranslation,
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg
};
