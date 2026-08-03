const fs = require("fs");
const path = require("path");
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
  if (typeof global.log === "function") {
    global.log("info", "Sistema de cache de alta performance ativado no modo JSON.");
  }
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

function normalizeCacheKey(k) {
  if (typeof k !== "string") return k;
  let s = k.trim();
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'")
    ) {
      s = s.slice(1, -1);
    }
  }
  return s;
}

// Rejeita entradas de cache corrompidas: originais com códigos de escape (\dac,
// \c[n], \i[n]) ou fragmentos de literal JS extraídos por apóstrofos.
function isCleanCacheEntry(orig, tr) {
  if (!orig || typeof orig !== "string" || !tr || typeof tr !== "string") return false;
  if (orig.includes("\\")) return false;
  if (!isTranslatableText(orig) || !isTranslatableText(tr)) return false;
  // Fragmentos tipo "ll be able to see what" (sem letra maiúscula inicial e sem
  // pontuação final) são pedaços de frases quebradas — descarta.
  if (
    orig.length >= 3 &&
    /^[a-zà-ÿ]/.test(orig) &&
    !/[.!?。！？]$/.test(orig) &&
    orig.split(" ").length < 4
  ) {
    return false;
  }
  return true;
}

function loadGlobalCacheForLang(sl, tl, engine) {
  const engineKey = engine ? (sl + "|" + tl + "|" + engine) : null;
  const langKey = sl + "|" + tl;
  const dict = {};

  const possiblePaths = [
    path.join(global.DATA_DIR, "translation_cache.json"),
    path.join(process.cwd(), "translation_cache.json"),
    path.join(global.DATA_DIR, "global_trans_cache.json"),
    path.join(global.DATA_DIR, "global_trans_cache.json.bak")
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, "utf8"));
        if (engineKey && raw[engineKey] && typeof raw[engineKey] === "object") {
          for (const [k, v] of Object.entries(raw[engineKey])) {
            dict[normalizeCacheKey(k)] = normalizeCacheKey(v);
          }
        } else if (raw[langKey] && typeof raw[langKey] === "object") {
          for (const [k, v] of Object.entries(raw[langKey])) {
            dict[normalizeCacheKey(k)] = normalizeCacheKey(v);
          }
        } else {
          for (const [k, v] of Object.entries(raw)) {
            if (v && typeof v === "object" && (v[tl] || v["pt"])) {
              dict[normalizeCacheKey(k)] = normalizeCacheKey(v[tl] || v["pt"]);
            } else if (typeof v === "string" && normalizeCacheKey(k) !== v) {
              dict[normalizeCacheKey(k)] = normalizeCacheKey(v);
            }
          }
        }
      } catch (e) { global.log("warn", `cache: ${e.message}`); }
    }
  }

  if (!db) {
    return dict;
  }
  try {
    const keyToQuery = engineKey || langKey;
    const stmt = db.prepare(
      "SELECT original, translated FROM global_cache WHERE lang_key = ?"
    );
    const rows = stmt.all(keyToQuery);
    for (const row of rows) {
      const ok = normalizeCacheKey(row.original);
      const tk = normalizeCacheKey(row.translated);
      if (isCleanCacheEntry(ok, tk)) {
        dict[ok] = tk;
      }
    }
  } catch (e) {
    global.log("error", "Erro ao ler cache SQLite para idioma " + langKey + ": " + e.message);
  }
  return dict;
}

function saveNewGlobalTranslations(sl, tl, translationsArray, engine) {
  if (translationsArray.length === 0) return;
  const langKey = engine ? (sl + "|" + tl + "|" + engine) : (sl + "|" + tl);
  if (!db) {
    const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
    try {
      let data = {};
      if (fs.existsSync(jsonPath)) {
        data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      }
      if (!data[langKey]) data[langKey] = {};
      for (const [orig, tr] of translationsArray) {
        const ok = normalizeCacheKey(orig);
        const tk = normalizeCacheKey(tr);
        if (isCleanCacheEntry(ok, tk)) {
          data[langKey][ok] = tk;
        }
      }
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    } catch (e) { global.log("warn", `cache: ${e.message}`); }
    return;
  }
  try {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
    );
    const transaction = db.transaction((items) => {
      for (const [orig, tr] of items) {
        const ok = normalizeCacheKey(orig);
        const tk = normalizeCacheKey(tr);
        if (isCleanCacheEntry(ok, tk)) {
          stmt.run(langKey, ok, tk);
        }
      }
    });
    transaction(translationsArray);
  } catch (e) {
    global.log("error", "Erro ao salvar novas traduções no SQLite: " + e.message);
  }
}

migrateJsonCacheToSqlite();

const COMMON_TRANS_PATH = path.join(global.DATA_DIR || path.join(__dirname, "../data"), "common_translations.json");
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

const dataDir = global.DATA_DIR || path.join(__dirname, "..", "data");
const GLOSSARY_PATH = path.join(dataDir, "glossary.json");
function loadGlossary() {
  try {
    if (fs.existsSync(GLOSSARY_PATH))
      return JSON.parse(fs.readFileSync(GLOSSARY_PATH, "utf8"));
  } catch (e) { global.log("warn", `cache: ${e.message}`); }
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
