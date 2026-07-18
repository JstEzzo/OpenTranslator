const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, exec } = require("child_process");
const https = require("https");

const ROOT = __dirname;
const WWW_DIR = path.join(ROOT, "www");
const GL_DIR = path.join(ROOT, "gameLib");
const DATA_DIR = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const CFG_PATH = path.join(DATA_DIR, "openT.json");
const LOG_PATH = path.join(DATA_DIR, "openT.log");

process.on("uncaughtException", (err) => {
  log(
    "error",
    "Uncaught Exception detectada: " +
      (err ? err.stack || err.message || err : "desconhecida"),
  );
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  log(
    "error",
    "Unhandled Rejection detectada: " +
      (reason ? reason.stack || reason.message || reason : "desconhecido"),
  );
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/opentype",
  ".woff": "font/woff",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

let launchedProc = null,
  launchedKey = null,
  launchedBak = null,
  restoreTimeout = null;
let activeCheatSocket = null,
  lastGameState = null,
  pendingCheatCommands = [],
  lastCheatPollTime = 0;

let serverLogs = [];
let logSeq = 0;
function log(lvl, msg) {
  const ts = new Date().toLocaleTimeString();
  logSeq++;
  const entry = { id: logSeq, ts, level: lvl, message: msg };
  serverLogs.push(entry);
  if (serverLogs.length > 2000) serverLogs.shift();
  try {
    fs.appendFileSync(LOG_PATH, "[" + ts + "][" + lvl + "] " + msg + "\n");
  } catch (e) {}
}

async function limitConcurrency(concurrency, items, asyncFn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => asyncFn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// ==================== SQLITE CACHE STORAGE ====================
let db = null;
try {
  const Database = require("better-sqlite3");
  db = new Database(path.join(DATA_DIR, "global_cache.db"));
  db.pragma("journal_mode = WAL");
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS global_cache (
      lang_key TEXT,
      original TEXT,
      translated TEXT
    )
  `,
  ).run();
  db.prepare(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lang_original ON global_cache (lang_key, original)
  `,
  ).run();
} catch (e) {
  log("error", "Falha ao inicializar o banco SQLite: " + e.message);
}

function migrateJsonCacheToSqlite() {
  if (!db) return;
  const jsonPath = path.join(DATA_DIR, "global_trans_cache.json");
  if (fs.existsSync(jsonPath)) {
    log("info", "Migrando cache global JSON para o banco SQLite...");
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const insert = db.prepare(
        "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)",
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
      log(
        "success",
        "Migração do cache JSON para SQLite concluída com sucesso!",
      );
      fs.renameSync(jsonPath, jsonPath + ".bak");
    } catch (e) {
      log("error", "Falha ao migrar cache JSON para SQLite: " + e.message);
    }
  }
}

function loadGlobalCacheForLang(sl, tl) {
  const langKey = sl + "|" + tl;
  const dict = {};
  if (!db) return dict;
  try {
    const stmt = db.prepare(
      "SELECT original, translated FROM global_cache WHERE lang_key = ?",
    );
    const rows = stmt.all(langKey);
    for (const row of rows) {
      if (
        isTranslatableText(row.original) &&
        isTranslatableText(row.translated)
      ) {
        dict[row.original] = row.translated;
      }
    }
  } catch (e) {
    log(
      "error",
      "Erro ao ler cache SQLite para idioma " + langKey + ": " + e.message,
    );
  }
  return dict;
}

function saveNewGlobalTranslations(sl, tl, translationsArray) {
  if (!db || translationsArray.length === 0) return;
  const langKey = sl + "|" + tl;
  try {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)",
    );
    const transaction = db.transaction((items) => {
      for (const [orig, tr] of items) {
        if (isTranslatableText(orig) && isTranslatableText(tr)) {
          stmt.run(langKey, orig, tr);
        }
      }
    });
    transaction(translationsArray);
  } catch (e) {
    log("error", "Erro ao salvar novas traduções no SQLite: " + e.message);
  }
}

// Inicializa a migração
migrateJsonCacheToSqlite();

const COMMON_TRANS_PATH = path.join(DATA_DIR, "common_translations.json");
function loadCommonTranslations() {
  try {
    if (fs.existsSync(COMMON_TRANS_PATH)) {
      return JSON.parse(fs.readFileSync(COMMON_TRANS_PATH, "utf8"));
    }
  } catch (e) {
    log("error", "Error loading common translations: " + e.message);
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

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ENGINES_DEF = {
  mv: { label: "RPG Maker MV", js: true, icon: "\ud83c\udfae" },
  mz: { label: "RPG Maker MZ", js: true, icon: "\ud83c\udfae" },
  krkr: { label: "Kirikiri 2", js: false, icon: "\u2728" },
  krkrz: { label: "Kirikiri Z", js: false, icon: "\u2728" },
  wolf: { label: "Wolf RPG", js: false, icon: "\ud83d\udc3a" },
  rgss: { label: "RGSS (XP/VX/Ace)", js: false, icon: "\u2699" },
  unity: { label: "Unity", js: false, icon: "\ud83c\udf10" },
  python: { label: "Ren'Py", js: false, icon: "\ud83d\udc0d" },
  srpg: { label: "SRPG Studio", js: false, icon: "\u2694" },
  agtk: { label: "Action Game Toolkit", js: false, icon: "\ud83c\udff0" },
  kmy: { label: "KMY", js: false, icon: "\ud83d\udd2e" },
  bakin: { label: "Bakin", js: false, icon: "\ud83c\udfad" },
  tyrano: { label: "TyranoScript", js: true, icon: "\ud83d\udcdd" },
  renpy: { label: "Ren'Py (JS)", js: true, icon: "\ud83d\udc0d" },
};

function findDataDir(gameDir) {
  if (fs.existsSync(path.join(gameDir, "www", "data")))
    return path.join(gameDir, "www", "data");
  if (fs.existsSync(path.join(gameDir, "data")))
    return path.join(gameDir, "data");
  return "";
}

function detectEngine(exePath, exeDir) {
  const name = path.basename(exePath).toLowerCase();
  const dir = exeDir || path.dirname(exePath);
  if (!fs.existsSync(exePath)) {
    return "mz";
  }
  try {
    const buf = fs
      .readFileSync(exePath, { encoding: "utf8", flag: "r" })
      .substring(0, 100000);
    if (
      buf.includes("RPGVXAce") ||
      buf.includes("RGSS3") ||
      buf.includes("RGSS2")
    )
      return "rgss";
    if (buf.includes("WolfRPG") || buf.includes("Wolf RPG Editor"))
      return "wolf";
    if (buf.includes("TyranoBuilder") || buf.includes("tyranoscript"))
      return "tyrano";
    if (buf.includes("UnityPlayer") || buf.includes("UnityEngine"))
      return "unity";
    if (
      buf.includes("renpy") ||
      buf.includes("Ren'Py") ||
      buf.includes("renpython")
    )
      return "python";
    if (buf.includes("BootKirikiriZ")) return "krkrz";
    if (buf.includes("Kirikiri") || buf.includes("TVP")) return "krkr";
    if (buf.includes("SRPG Studio") || buf.includes("SRPG")) return "srpg";
    if (buf.includes("SmileBoom") || buf.includes("ActionGameToolkit"))
      return "agtk";
    if (buf.includes("Bakin")) return "bakin";
    if (buf.includes("kmy")) return "kmy";
    if (
      buf.includes("www/") ||
      buf.includes("System.png") ||
      buf.includes("rpg_core")
    )
      return "mz";
  } catch (e) {}
  try {
    const files = fs.readdirSync(dir);
    const fl = files.map((f) => f.toLowerCase());
    if (
      fl.some(
        (f) => f === "www" && fs.statSync(path.join(dir, "www")).isDirectory(),
      )
    )
      return "mz";
    if (
      fl.some((f) => f === "index.html") &&
      fl.some((f) => f === "package.json") &&
      fl.some((f) => f.startsWith("nw."))
    )
      return "mz";
    if (fl.some((f) => f === "rmmz_core.js" || f === "rpg_core.js"))
      return "mz";
    if (fl.includes("js")) {
      try {
        const jsFiles = fs
          .readdirSync(path.join(dir, "js"))
          .map((f) => f.toLowerCase());
        if (jsFiles.some((f) => f === "rmmz_core.js" || f === "rpg_core.js"))
          return "mz";
      } catch (e) {}
    }
    if (fl.includes("renpy") || fl.some((f) => f.endsWith(".rpy")))
      return "python";
    if (fl.some((f) => f.endsWith(".xp3"))) return "krkr";
    if (
      fl.some(
        (f) =>
          f === "game.rvproj2" || f === "game.rxproj" || f === "game.rvproj",
      )
    )
      return "rgss";
    if (
      fl.some(
        (f) =>
          f.endsWith(".rvdata2") ||
          f.endsWith(".rvdata") ||
          f.endsWith(".rxdata"),
      )
    )
      return "rgss";
    if (
      fl.some(
        (f) => f === "data.wolf" || f === "game.ini" || f === "editor.ini",
      )
    )
      return "wolf";
    if (fl.includes("data")) {
      try {
        const sub = fs
          .readdirSync(path.join(dir, "Data"))
          .map((f) => f.toLowerCase());
        if (
          sub.includes("basicdata") ||
          sub.includes("mapdata") ||
          sub.some((f) => f.endsWith(".wolf") || f === "basicdata.zip")
        )
          return "wolf";
      } catch (e) {}
    }
    if (fl.some((f) => f === "tyranoscript" || f === "tyranobuilder.html"))
      return "tyrano";
  } catch (e) {}
  if (name.includes("rpg") || name.includes("game")) return "mz";
  if (name.includes("unity") || name.includes("win")) return "unity";
  return "mz";
}

function getExeArch(exePath) {
  try {
    const fd = fs.openSync(exePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0x3c);
    const peOffset = buf.readUInt32LE(0);
    const machineBuf = Buffer.alloc(2);
    fs.readSync(fd, machineBuf, 0, 2, peOffset + 4);
    fs.closeSync(fd);
    const machine = machineBuf.readUInt16LE(0);
    if (machine === 0x8664) return 64;
    if (machine === 0x014c) return 32;
  } catch (e) {}
  return 32;
}

function getHookDll(eng, exePath) {
  const arch = getExeArch(exePath);
  if (eng === "wolf") {
    try {
      const stats = fs.statSync(exePath);
      if (stats.size > 4000000) {
        return "wolfHook.dll";
      }
    } catch (e) {}
    return "wolfHook3.dll";
  }
  if (eng === "krkrz") {
    return arch === 64 ? "krkrzHook64.dll" : "krkrzHook32.dll";
  }
  if (eng === "krkr") {
    return "krkr2Hook.dll";
  }
  if (eng === "rgss") {
    return arch === 64 ? "RGSSHook64.dll" : "RGSSHook.dll";
  }
  if (eng === "python") {
    return arch === 64 ? "PythonHook64.dll" : "PythonHook.dll";
  }
  if (eng === "srpg") {
    return "SRPGHook.dll";
  }
  if (eng === "agtk") {
    return "AgtkHook.dll";
  }
  return null;
}

const ESC_RE = /\\([A-Z])(\[\d+\])?|\\([{}!.\|^$><\\])/g;

function extractEscapeCodes(text) {
  const parts = [];
  let lastIdx = 0,
    clean = "",
    match;
  ESC_RE.lastIndex = 0;
  while ((match = ESC_RE.exec(text)) !== null) {
    if (match.index > lastIdx) clean += text.slice(lastIdx, match.index);
    parts.push({ idx: clean.length, code: match[0] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) clean += text.slice(lastIdx);
  return { clean, parts };
}

function restoreEscapeCodes(translated, parts) {
  let fixed = translated.replace(/%\s+(\d+)/g, "%$1");
  if (parts.length === 0) return fixed;
  if (parts.every((p) => p.idx === 0))
    return parts.map((p) => p.code).join("") + fixed;
  let result = fixed;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.idx === 0) result = p.code + result;
    else if (p.idx <= result.length)
      result = result.slice(0, p.idx) + p.code + result.slice(p.idx);
    else result += p.code;
  }
  return result;
}

const TEXT_FIELDS = new Set([
  "name",
  "nickname",
  "profile",
  "description",
  "message1",
  "message2",
  "gameTitle",
  "displayName",
  "currencyUnit",
]);
const ARRAY_LABELS = new Set([
  "elements",
  "equipTypes",
  "skillTypes",
  "weaponTypes",
  "armorTypes",
]);
const SKIP_KEYS = new Set([
  "characterName",
  "battlerName",
  "faceName",
  "parallaxName",
  "battleback1Name",
  "battleback2Name",
  "pictureName",
  "title1Name",
  "title2Name",
  "note",
]);
const SAFE_PARAM_KEYS = [
  "name",
  "text",
  "title",
  "msg",
  "message",
  "desc",
  "description",
  "term",
  "command",
  "word",
  "help",
  "display",
  "format",
  "menu",
  "label",
  "string",
  "header",
  "footer",
  "caption",
  "bio",
  "profile",
  "confirm",
  "ok",
  "ng",
  "cancel",
  "yes",
  "no",
  "select",
];

function isJsCode(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t.includes("//") || t.includes("/*")) return true;
  if (t.includes("const ") || t.includes("let ") || t.includes("var "))
    return true;
  if (t.includes("function(") || t.includes("=>") || t.includes("typeof "))
    return true;
  if (t.includes("this.") || t.includes("$game") || t.includes("$data"))
    return true;
  if (t.includes("return ") || t.includes("Math.")) return true;
  if (t.includes("()") || t.includes("};")) return true;
  return false;
}

function extractTextsFromJsCode(val, file, keys, texts, idxRef) {
  const JS_STR_RE = /(["'`])((?:\\\1|(?!\1).)*?)\1/g;
  let match;
  JS_STR_RE.lastIndex = 0;
  while ((match = JS_STR_RE.exec(val)) !== null) {
    const literal = match[0];
    const content = match[2];

    // Desescapar aspas da string literal
    const quoteChar = literal[0];
    const escapedQuoteRegex = new RegExp("\\\\" + quoteChar, "g");
    const cleanContent = content.replace(escapedQuoteRegex, quoteChar);

    const { clean, parts } = extractEscapeCodes(cleanContent);
    if (isTranslatableText(clean)) {
      texts.push({
        id: idxRef.val++,
        file,
        keys: [...keys, `__js__${match.index}`],
        original: val,
        clean: clean.trim(),
        escapeParts: parts,
        isJsString: true,
        jsLiteral: literal,
        jsIndex: match.index,
      });
    }
  }
}

function extractGameTexts(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return [];
  const texts = [];
  let idx = 0;
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
      const data = JSON.parse(raw);
      function checkString(val, keys) {
        const key = keys[keys.length - 1];
        if (typeof key === "string" && SKIP_KEYS.has(key)) return;
        if (key === "name") {
          if (
            file === "Tilesets.json" ||
            file === "Animations.json" ||
            file === "Troops.json" ||
            file === "CommonEvents.json" ||
            (file.startsWith("Map") && file.endsWith(".json"))
          )
            return;
        }
        if (key === "name" && keys.length >= 2) {
          const parentKeys = keys.slice(0, -1);
          const parent = getValueAtPath(data, parentKeys);
          if (
            parent &&
            typeof parent === "object" &&
            ("pan" in parent || "volume" in parent || "pitch" in parent)
          )
            return;
        }

        // Verificação inteligente de código JavaScript embutido!
        if (isJsCode(val)) {
          const idxRef = { val: idx };
          extractTextsFromJsCode(val, file, keys, texts, idxRef);
          idx = idxRef.val;
          return;
        }

        if (typeof key === "string" && TEXT_FIELDS.has(key))
          return addText(texts, { id: idx++, file, keys, original: val });
        if (typeof key === "string" && ARRAY_LABELS.has(key))
          return addText(texts, { id: idx++, file, keys, original: val });
        if (
          keys.length >= 2 &&
          keys.some((k) => typeof k === "string" && ARRAY_LABELS.has(k))
        )
          return addText(texts, { id: idx++, file, keys, original: val });
        const paramsIdx = keys.lastIndexOf("parameters");
        if (paramsIdx >= 1) {
          const cmdPath = keys.slice(0, paramsIdx);
          const cmd = getValueAtPath(data, cmdPath);
          if (cmd && typeof cmd === "object") {
            const pi = keys[keys.length - 1];
            if (cmd.code === 401 || cmd.code === 405)
              return addText(texts, { id: idx++, file, keys, original: val });
            if (cmd.code === 101 && pi === 4)
              return addText(texts, { id: idx++, file, keys, original: val });
            if (cmd.code === 102)
              return addText(texts, { id: idx++, file, keys, original: val });
            if (cmd.code === 320 || cmd.code === 324)
              return addText(texts, { id: idx++, file, keys, original: val });
            if (
              (cmd.code === 355 || cmd.code === 655) &&
              typeof val === "string" &&
              val.startsWith("テキスト-")
            ) {
              return addText(texts, {
                id: idx++,
                file,
                keys,
                original: val.substring(5),
              });
            }
          }
        }
        if (keys.includes("terms")) {
          if (
            keys.includes("basic") ||
            keys.includes("params") ||
            keys.includes("messages")
          )
            return;
          return addText(texts, { id: idx++, file, keys, original: val });
        }
      }
      function walk(obj, keys) {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          obj.forEach((v, i) => {
            const ek = [...keys, i];
            if (typeof v === "string") checkString(v, ek);
            else if (v && typeof v === "object") walk(v, ek);
          });
          return;
        }
        for (const key in obj) {
          if (key === "meta") continue;
          const val = obj[key];
          const nk = [...keys, key];
          if (typeof val === "string") checkString(val, nk);
          else if (val && typeof val === "object") walk(val, nk);
        }
      }
      walk(data, []);
    } catch (e) {}
  }

  // Extract from js/plugins.js
  const wwwDir = path.dirname(dataDir);
  const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
  if (fs.existsSync(pluginsJsPath)) {
    try {
      const content = fs.readFileSync(pluginsJsPath, "utf8");
      const startIdx = content.indexOf("[");
      const endIdx = content.lastIndexOf("]");
      if (startIdx >= 0 && endIdx >= 0) {
        const jsonStr = content.slice(startIdx, endIdx + 1);
        const plugins = JSON.parse(jsonStr);

        function extractParam(val, keys, idxRef) {
          if (typeof val === "string" && val.length > 0) {
            if (
              (val.startsWith("[") && val.endsWith("]")) ||
              (val.startsWith("{") && val.endsWith("}"))
            ) {
              try {
                const parsed = JSON.parse(val);
                if (parsed && typeof parsed === "object") {
                  extractParamObject(parsed, [...keys, "__json__"], idxRef);
                  return;
                }
              } catch (e) {}
            }

            // Verificação de código em parâmetros de plugins
            if (isJsCode(val)) {
              extractTextsFromJsCode(
                val,
                "../js/plugins.js",
                keys,
                texts,
                idxRef,
              );
              return;
            }

            const lastRealKey = getLastRealKey(keys);
            const isUnsafe = [
              "dateselect",
              "dataselect",
              "selectid",
              "select_id",
            ].includes(lastRealKey.toLowerCase());
            const isSafe =
              !isUnsafe &&
              SAFE_PARAM_KEYS.some((sub) =>
                lastRealKey.toLowerCase().includes(sub),
              );
            if (!isSafe) return;
            const clean = val.trim();
            if (isTranslatableText(clean)) {
              const { clean: c, parts } = extractEscapeCodes(val);
              if (isTranslatableText(c)) {
                texts.push({
                  id: idxRef.val++,
                  file: "../js/plugins.js",
                  keys,
                  original: val,
                  clean: c.trim(),
                  escapeParts: parts,
                });
              }
            }
          }
        }

        function extractParamObject(obj, keys, idxRef) {
          if (Array.isArray(obj)) {
            obj.forEach((v, i) => {
              extractParam(v, [...keys, i], idxRef);
            });
          } else if (obj && typeof obj === "object") {
            for (const k in obj) {
              extractParam(obj[k], [...keys, k], idxRef);
            }
          }
        }

        const idxRef = { val: idx };
        plugins.forEach((p, pIdx) => {
          if (p.parameters) {
            for (const k in p.parameters) {
              extractParam(p.parameters[k], [pIdx, "parameters", k], idxRef);
            }
          }
        });
        idx = idxRef.val;
      }
    } catch (e) {
      log("error", "Erro ao ler ou processar plugins.js: " + e.message);
    }
  }

  log("info", "Extracted " + texts.length + " texts from data files");
  return texts;
}

function isTranslatableText(clean) {
  const s = clean.trim();
  if (s.length < 1) return false;
  if (s.length === 1 && !/[^\x00-\x7F]/.test(s)) return false;

  // Ignorar locales de idioma (ex: en-US, pt-BR)
  if (/^[a-z]{2}[-_][A-Z]{2}$/.test(s)) return false;

  // Ignorar siglas/abreviações de atributos em maiúsculas (ex: HP, MP, PV, VP, ATK, AGI, LUK)
  if (s.length <= 4 && /^[A-Z]+$/.test(s)) return false;

  if (/^[\d\s.,!?\-+%=*/<>()\[\]{}@#$^&;:'"`~|\\\/]+$/.test(s)) return false;

  // Skip short RPG terms and boolean strings
  const skipWords = new Set([
    "hp",
    "mp",
    "tp",
    "lv",
    "exp",
    "gold",
    "true",
    "false",
  ]);
  const cleanWord = s.toLowerCase().replace(/[.:]/g, "");
  if (skipWords.has(cleanWord)) return false;

  if (!/\s/.test(s)) {
    if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) return false;
    if (
      s.includes("_") ||
      s.includes(".") ||
      s.includes("/") ||
      s.includes("\\")
    )
      return false;
    if (/^[a-z]+[A-Z]/.test(s)) return false;
    if (/^[A-Z0-9_-]{3,}$/.test(s) && (s.includes("_") || /[0-9]/.test(s)))
      return false;
  }

  return true;
}

function addText(texts, entry) {
  const { clean, parts } = extractEscapeCodes(entry.original);
  if (!isTranslatableText(clean)) return;
  texts.push({
    id: entry.id,
    file: entry.file,
    keys: entry.keys,
    original: entry.original,
    clean: clean.trim(),
    escapeParts: parts,
  });
}

function getValueAtPath(obj, pathArr) {
  let cur = obj;
  for (const key of pathArr) {
    if (cur && typeof cur === "object" && key in cur) cur = cur[key];
    else return undefined;
  }
  return cur;
}

function getLastRealKey(keys) {
  for (let i = keys.length - 1; i >= 0; i--) {
    const k = keys[i];
    if (typeof k === "string" && k !== "__json__") return k;
  }
  return "";
}

async function translateBatch(texts, sl, tl, engine, glossary) {
  if (!engine || engine === "auto") engine = "google";
  if (engine === "bing") return translateBingBatch(texts, sl, tl);
  if (engine === "multi") return translateMultiBatch(texts, sl, tl, glossary);
  const results = new Map();
  if (texts.length === 0) return results;

  // Pre-apply glossary
  const glos = glossary || loadGlossary();
  const glossaryMap = new Map();
  for (const g of glos) {
    if (g.term && g.translation) {
      glossaryMap.set(g.term.toLowerCase(), g.translation);
    }
  }
  const dedup = new Map();
  for (const t of texts) {
    let clean = t.clean;
    // Apply glossary substitutions before dedup
    if (glossaryMap.size > 0) {
      for (const [term, tr] of glossaryMap) {
        const idx = clean.toLowerCase().indexOf(term);
        if (idx >= 0) {
          const before = clean.slice(0, idx);
          const after = clean.slice(idx + term.length);
          clean = before + tr + after;
        }
      }
    }
    if (!dedup.has(clean)) dedup.set(clean, []);
    dedup.get(clean).push(t);
  }
  const unique = [...dedup.entries()];

  if (engine === "llm") {
    const actualCfg = handlers.loadCfg();
    return translateLlmBatchUnique(unique, sl, tl, actualCfg);
  }
  if (engine === "deepl") {
    const actualCfg = handlers.loadCfg();
    return translateDeepLBatchUnique(unique, sl, tl, actualCfg);
  }

  const SEP = "\n[|]\n";
  const SEP_LEN = 15;
  const MAX_URL_LEN = 6000;
  const BASE_URL =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
    sl +
    "&tl=" +
    tl +
    "&dt=t&q=";
  const BASE_LEN = BASE_URL.length;

  const batches = [];
  let batchIdx = 0;
  while (batchIdx < unique.length) {
    let batchSize = 0,
      estLen = BASE_LEN;
    for (let j = batchIdx; j < unique.length; j++) {
      const addLen =
        encodeURIComponent(unique[j][0]).length + (j > batchIdx ? SEP_LEN : 0);
      if ((estLen + addLen > MAX_URL_LEN || batchSize >= 15) && batchSize > 0)
        break;
      estLen += addLen;
      batchSize++;
    }
    if (batchSize === 0) batchSize = 1;
    const batch = unique.slice(batchIdx, batchIdx + batchSize);
    batches.push(batch);
    batchIdx += batchSize;
  }

  log(
    "info",
    `Dividido em ${unique.length} textos únicos em ${batches.length} lotes para tradução.`,
  );

  const CONCURRENCY_LIMIT = 6;
  let completedUniqueTexts = 0;
  let completedBatchesCount = 0;
  const startTime = Date.now();

  const processBatch = async (batch, bIdx) => {
    const joined = batch.map(([clean]) => clean).join(SEP);
    try {
      const q = encodeURIComponent(joined);
      const url = BASE_URL + q;
      const raw = await new Promise((res, rej) => {
        const rq = https.get(
          url,
          {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json",
            },
          },
          (rsp) => {
            let d = "";
            rsp.setEncoding("utf8");
            rsp.on("data", (c) => (d += c));
            rsp.on("end", () => res(d));
          },
        );
        rq.on("error", (e) => rej(e));
        rq.setTimeout(20000, () => {
          rq.destroy();
          rej(new Error("timeout"));
        });
      });
      const j = JSON.parse(raw);
      const translated = j[0]
        .map((x) => x[0])
        .filter(Boolean)
        .join("");
      const parts = translated.split(/\s*\[\s*\|\s*\]\s*/).map((p) => p.trim());
      if (parts.length !== batch.length) {
        throw new Error(
          `Alinhamento de lote incorreto (esperado: ${batch.length}, obtido: ${parts.length})`,
        );
      }
      for (let j = 0; j < batch.length; j++) {
        const [clean, related] = batch[j];
        const tr = parts[j] || clean;
        for (const t of related) results.set(t.id, tr);
      }
      completedUniqueTexts += batch.length;
      completedBatchesCount++;
      const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
      log(
        "info",
        `Lote ${completedBatchesCount}/${batches.length} (${batch.length} textos) traduzido com sucesso. Progresso: ${completedUniqueTexts}/${unique.length} (${pct}%)`,
      );
    } catch (e) {
      log(
        "warn",
        `Falha no lote ${bIdx + 1} (${e.message}). Iniciando tradução individual para este lote...`,
      );
      await limitConcurrency(3, batch, async ([clean, related]) => {
        try {
          const q = encodeURIComponent(clean);
          const url =
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
            sl +
            "&tl=" +
            tl +
            "&dt=t&q=" +
            q;
          const raw = await new Promise((res, rej) => {
            const rq = https.get(
              url,
              {
                headers: {
                  "User-Agent": "Mozilla/5.0",
                  Accept: "application/json",
                },
              },
              (rsp) => {
                let d = "";
                rsp.setEncoding("utf8");
                rsp.on("data", (c) => (d += c));
                rsp.on("end", () => res(d));
              },
            );
            rq.on("error", (e) => rej(e));
            rq.setTimeout(10000, () => {
              rq.destroy();
              rej(new Error("timeout"));
            });
          });
          const j = JSON.parse(raw);
          const tr =
            j[0]
              .map((x) => x[0])
              .filter(Boolean)
              .join("") || clean;
          for (const t of related) results.set(t.id, tr);
        } catch (e2) {
          log(
            "error",
            `Falha na tradução individual de "${clean.substring(0, 30)}...": ${e2.message}`,
          );
          for (const t of related) results.set(t.id, clean);
        }
      });
      completedUniqueTexts += batch.length;
      completedBatchesCount++;
      const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
      log(
        "info",
        `Concluído lote ${completedBatchesCount}/${batches.length} (via fallback individual). Progresso: ${completedUniqueTexts}/${unique.length} (${pct}%)`,
      );
    }
  };

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    batches.map((b, i) => ({ b, i })),
    ({ b, i }) => processBatch(b, i),
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(
    "info",
    `Tradução concluída: ${unique.length} textos únicos em ${elapsed}s.`,
  );
  return results;
}

async function translateBingBatch(texts, sl, tl) {
  const results = new Map();
  if (texts.length === 0) return results;
  const dedup = new Map();
  for (const t of texts) {
    if (!dedup.has(t.clean)) dedup.set(t.clean, []);
    dedup.get(t.clean).push(t);
  }
  const unique = [...dedup.entries()];

  log("info", `Traduzindo ${unique.length} textos únicos usando Bing...`);
  let completed = 0;
  const CONCURRENCY_LIMIT = 5;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateBingSingle(clean, sl, tl);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        log("info", `Progresso Bing: ${completed}/${unique.length} (${pct}%)`);
      }
    },
  );

  return results;
}

async function translateMultiBatch(texts, sl, tl, glossary) {
  const googleResults = await translateBatch(texts, sl, tl, "google", glossary);
  const failed = texts.filter((t) => {
    const tr = googleResults.get(t.id);
    return !tr || tr === t.clean;
  });
  if (failed.length === 0) return googleResults;
  log(
    "info",
    "Multi-Engine: " +
      failed.length +
      " textos falharam no Google. Enviando para o Bing...",
  );
  const bingResults = await translateBingBatch(failed, sl, tl);
  for (const [id, tr] of bingResults) {
    const cur = googleResults.get(id);
    if (!cur || cur === id) googleResults.set(id, tr);
  }
  return googleResults;
}

// ==================== GLOSSARY ====================
const GLOSSARY_PATH = path.join(DATA_DIR, "glossary.json");
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

// ==================== BING TRANSLATOR ====================
let bingToken = null,
  bingTokenExpiry = 0;
async function getBingToken() {
  if (bingToken && Date.now() < bingTokenExpiry) return bingToken;
  try {
    const html = await new Promise((res, rej) => {
      https
        .get(
          "https://www.bing.com/translator",
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
          (r) => {
            let d = "";
            r.setEncoding("utf8");
            r.on("data", (c) => (d += c));
            r.on("end", () => res(d));
          },
        )
        .on("error", rej);
    });
    const igMatch =
      html.match(/IG:"([^"]+)"/) ||
      html.match(/ig:"([^"]+)"/) ||
      html.match(/IG=([^&"]+)/);
    const iidMatch = html.match(/IID:"([^"]+)"/) || html.match(/iid:"([^"]+)"/);
    if (igMatch && iidMatch) {
      bingToken = { IG: igMatch[1], IID: iidMatch[1] };
      bingTokenExpiry = Date.now() + 300000;
      return bingToken;
    }
    // Fallback: use known values from page
    bingToken = { IG: "", IID: "translator" };
    bingTokenExpiry = Date.now() + 60000;
    return bingToken;
  } catch (e) {
    bingToken = { IG: "", IID: "translator" };
    bingTokenExpiry = Date.now() + 60000;
    return bingToken;
  }
}

async function translateBingSingle(text, sl, tl) {
  if (!text || text.trim().length < 2) return text;
  try {
    const token = await getBingToken();
    const url = "https://www.bing.com/ttranslatev3?isVertical=1";
    const body = new URLSearchParams();
    body.append("fromLang", sl === "auto" ? "auto-detect" : sl);
    body.append("toLang", tl);
    body.append("text", text);
    if (token.IG) body.append("IG", token.IG);
    if (token.IID) body.append("IID", token.IID);
    const raw = await new Promise((res, rej) => {
      const rq = https.request(
        url,
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        },
        (r) => {
          let d = "";
          r.setEncoding("utf8");
          r.on("data", (c) => (d += c));
          r.on("end", () => res(d));
        },
      );
      rq.on("error", rej);
      rq.setTimeout(12000, () => {
        rq.destroy();
        rej(new Error("timeout"));
      });
      rq.write(body.toString());
      rq.end();
    });
    const j = JSON.parse(raw);
    if (Array.isArray(j) && j[0] && j[0].translations && j[0].translations[0])
      return j[0].translations[0].text;
    if (j.errcode) return text;
    return text;
  } catch (e) {
    return text;
  }
}

async function translateBingBatch(texts, sl, tl) {
  const results = new Map();
  if (texts.length === 0) return results;
  const dedup = new Map();
  for (const t of texts) {
    if (!dedup.has(t.clean)) dedup.set(t.clean, []);
    dedup.get(t.clean).push(t);
  }
  const unique = [...dedup.entries()];

  log("info", `Traduzindo ${unique.length} textos únicos usando Bing...`);
  let completed = 0;
  const CONCURRENCY_LIMIT = 5;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateBingSingle(clean, sl, tl);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 20 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        log("info", `Progresso Bing: ${completed}/${unique.length} (${pct}%)`);
      }
    },
  );
  return results;
}

// ==================== MULTI-ENGINE ====================
async function translateMultiBatch(texts, sl, tl) {
  // Try Google first, fall back to Bing for failures
  const googleResults = await translateBatch(texts, sl, tl);
  const failed = texts.filter((t) => {
    const tr = googleResults.get(t.id);
    return !tr || tr === t.clean;
  });
  if (failed.length === 0) return googleResults;
  log("info", "Multi-Engine: " + failed.length + " texts falling back to Bing");
  const bingResults = await translateBingBatch(failed, sl, tl);
  for (const [id, tr] of bingResults) {
    const cur = googleResults.get(id);
    if (!cur || cur === id) googleResults.set(id, tr);
  }
  return googleResults;
}

// ===== LLM & DEEPL TRANSLATION SUPPORT =====
async function translateLlm(text, sl, tl, config) {
  const provider = config.llmProvider || "openai";
  const apiKey = config.llmApiKey || "";
  const model =
    config.llmModel ||
    (provider === "openai"
      ? "gpt-4o-mini"
      : provider === "deepseek"
        ? "deepseek-chat"
        : "claude-3-5-sonnet-20241022");
  let baseUrl = config.llmBaseUrl || "";
  const promptSystem =
    config.llmPrompt ||
    `Você é um tradutor de jogos profissional. Traduza o texto fornecido pelo usuário de ${sl} para ${tl}.
Regras estritas:
1. Retorne APENAS a tradução direta do texto. Não adicione notas, explicações ou aspas extras.
2. Preserve integralmente todas as tags de sistema, comandos de escape e códigos de controle (como \\V[n], \\C[n], \\N[n], %1, %2, etc.). Nunca os traduza nem altere seu espaçamento.
3. Adapte a linguagem ao contexto de jogos eletrônicos, mantendo-a natural e fluida no idioma destino.`;

  if (
    provider === "openai" ||
    provider === "deepseek" ||
    provider === "local"
  ) {
    if (!baseUrl) {
      if (provider === "openai") baseUrl = "https://api.openai.com/v1";
      else if (provider === "deepseek") baseUrl = "https://api.deepseek.com/v1";
      else baseUrl = "http://localhost:11434/v1";
    }

    const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey && provider !== "local") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const body = JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      const tr = data.choices?.[0]?.message?.content;
      if (tr) return tr.trim();
    } catch (e) {
      log("error", `Falha na tradução via LLM (${provider}): ` + e.message);
    }
  } else if (provider === "anthropic" || provider === "claude") {
    const url = "https://api.anthropic.com/v1/messages";
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    const body = JSON.stringify({
      model: model,
      max_tokens: 1024,
      system: promptSystem,
      messages: [{ role: "user", content: text }],
      temperature: 0.3,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      const tr = data.content?.[0]?.text;
      if (tr) return tr.trim();
    } catch (e) {
      log("error", `Falha na tradução via Claude: ` + e.message);
    }
  }
  return text;
}

async function translateDeepL(text, sl, tl, config) {
  const apiKey = config.deeplApiKey || "";
  const useFree = config.deeplUseFreeApi !== false;
  const domain = useFree ? "api-free.deepl.com" : "api.deepl.com";
  const url = `https://${domain}/v2/translate`;

  const headers = {
    Authorization: `DeepL-Auth-Key ${apiKey}`,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    text: [text],
    target_lang: tl.toUpperCase(),
    source_lang: sl && sl !== "auto" ? sl.toUpperCase() : undefined,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    const tr = data.translations?.[0]?.text;
    if (tr) return tr;
  } catch (e) {
    log("error", "Falha na tradução via DeepL API: " + e.message);
  }
  return text;
}

async function translateLlmBatchUnique(unique, sl, tl, config) {
  const results = new Map();
  const provider = config.llmProvider || "openai";
  log(
    "info",
    `Traduzindo ${unique.length} textos únicos usando LLM (${provider})...`,
  );
  let completed = 0;
  const CONCURRENCY_LIMIT = provider === "local" ? 4 : 8;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateLlm(clean, sl, tl, config);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        log("info", `Progresso LLM: ${completed}/${unique.length} (${pct}%)`);
      }
    },
  );
  return results;
}

async function translateDeepLBatchUnique(unique, sl, tl, config) {
  const results = new Map();
  log("info", `Traduzindo ${unique.length} textos únicos usando DeepL...`);
  let completed = 0;
  const CONCURRENCY_LIMIT = 5;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateDeepL(clean, sl, tl, config);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        log("info", `Progresso DeepL: ${completed}/${unique.length} (${pct}%)`);
      }
    },
  );
  return results;
}

async function translateSingle(text, sl, tl, engine) {
  const cfg = handlers.loadCfg();
  if (!engine || engine === "auto" || engine === "google") engine = "google";
  if (engine === "bing") return translateBingSingle(text, sl, tl);
  if (engine === "multi") return translateMultiSingle(text, sl, tl);
  if (engine === "llm") return translateLlm(text, sl, tl, cfg);
  if (engine === "deepl") return translateDeepL(text, sl, tl, cfg);
  try {
    const q = encodeURIComponent(text);
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      sl +
      "&tl=" +
      tl +
      "&dt=t&q=" +
      q;
    const raw = await new Promise((res, rej) => {
      const rq = https.get(
        url,
        {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        },
        (rsp) => {
          let d = "";
          rsp.setEncoding("utf8");
          rsp.on("data", (c) => (d += c));
          rsp.on("end", () => res(d));
        },
      );
      rq.on("error", (e) => rej(e));
      rq.setTimeout(8000, () => {
        rq.destroy();
        rej(new Error("timeout"));
      });
    });
    const j = JSON.parse(raw);
    return j && j[0]
      ? j[0]
          .map((x) => x[0])
          .filter(Boolean)
          .join("")
      : text;
  } catch (e) {}
  try {
    const rsp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const j = await rsp.json();
    return j && j[0]
      ? j[0]
          .map((x) => x[0])
          .filter(Boolean)
          .join("")
      : text;
  } catch (e) {
    return text;
  }
}

async function translateMultiSingle(text, sl, tl) {
  const googleResult = await translateSingle(text, sl, tl, "google");
  if (googleResult !== text && googleResult.length > 0) return googleResult;
  const bingResult = await translateBingSingle(text, sl, tl);
  return bingResult !== text ? bingResult : googleResult;
}

function autoWrapText(text, maxChars) {
  if (!text || typeof text !== "string" || maxChars <= 0) return text;
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => autoWrapText(line, maxChars))
      .join("\n");
  }
  if (text.length <= maxChars) return text;

  const tokenRegex = /(\\[A-Za-z]+\[\d+\]|\\[A-Za-z]+|[^\s\\]+|\\)/g;
  const tokens = text.match(tokenRegex) || [];

  let lines = [];
  let currentLine = "";
  let currentLength = 0;

  for (const token of tokens) {
    const tokenLen = token.length;

    if (currentLength + tokenLen + (currentLength > 0 ? 1 : 0) > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = token;
        currentLength = tokenLen;
      } else {
        lines.push(token);
        currentLine = "";
        currentLength = 0;
      }
    } else {
      if (currentLine) {
        currentLine += " " + token;
        currentLength += 1 + tokenLen;
      } else {
        currentLine = token;
        currentLength = tokenLen;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.join("\n");
}

function patchGameData(gameDir, texts, translations) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return 0;

  // Group translations by file
  const transByFile = new Map();
  for (const t of texts) {
    const tr = translations.get(t.id);
    if (!tr || tr === t.clean || tr.trim().length === 0) continue;
    if (!transByFile.has(t.file)) transByFile.set(t.file, new Map());
    transByFile.get(t.file).set(JSON.stringify(t.keys), {
      tr,
      escapeParts: t.escapeParts,
      isJsString: t.isJsString,
      jsLiteral: t.jsLiteral,
      jsIndex: t.jsIndex,
    });
  }

  let count = 0;
  for (const [file, fileTrans] of transByFile) {
    if (file === "../js/plugins.js") {
      // Patch plugins.js
      const wwwDir = path.dirname(dataDir);
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(pluginsJsPath)) {
        try {
          const content = fs.readFileSync(pluginsJsPath, "utf8");
          const startIdx = content.indexOf("[");
          const endIdx = content.lastIndexOf("]");
          if (startIdx >= 0 && endIdx >= 0) {
            const jsonStr = content.slice(startIdx, endIdx + 1);
            const plugins = JSON.parse(jsonStr);

            function patchParam(val, keys) {
              if (typeof val === "string" && val.length > 0) {
                if (
                  (val.startsWith("[") && val.endsWith("]")) ||
                  (val.startsWith("{") && val.endsWith("}"))
                ) {
                  try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === "object") {
                      patchParamObject(parsed, [...keys, "__json__"]);
                      return JSON.stringify(parsed);
                    }
                  } catch (e) {}
                }

                // Patchear código JS em parâmetros de plugins
                if (isJsCode(val)) {
                  const prefixStr = JSON.stringify(keys);
                  const prefix = prefixStr.slice(0, -1) + ",";
                  for (const [keyStr, entry] of fileTrans) {
                    if (
                      keyStr.startsWith(prefix) &&
                      keyStr.includes("__js__")
                    ) {
                      if (entry.isJsString) {
                        const quote = entry.jsLiteral[0];
                        let restored = restoreEscapeCodes(
                          entry.tr,
                          entry.escapeParts,
                        );
                        const newLiteral =
                          quote +
                          restored.replace(
                            new RegExp("\\" + quote, "g"),
                            "\\" + quote,
                          ) +
                          quote;
                        if (val.includes(entry.jsLiteral)) {
                          val = val.replace(entry.jsLiteral, newLiteral);
                          count++;
                        }
                      }
                    }
                  }
                  return val;
                }

                const lastRealKey = getLastRealKey(keys);
                const isUnsafe = [
                  "dateselect",
                  "dataselect",
                  "selectid",
                  "select_id",
                ].includes(lastRealKey.toLowerCase());
                if (!isUnsafe) {
                  const lookupKey = JSON.stringify(keys);
                  if (fileTrans.has(lookupKey)) {
                    const entry = fileTrans.get(lookupKey);
                    const restored = restoreEscapeCodes(
                      entry.tr,
                      entry.escapeParts,
                    );
                    if (restored !== val) {
                      val = restored;
                      count++;
                    }
                  }
                }
              }
              return val;
            }

            function patchParamObject(obj, keys) {
              if (Array.isArray(obj)) {
                obj.forEach((v, i) => {
                  obj[i] = patchParam(v, [...keys, i]);
                });
              } else if (obj && typeof obj === "object") {
                for (const k in obj) {
                  obj[k] = patchParam(obj[k], [...keys, k]);
                }
              }
            }

            plugins.forEach((p, pIdx) => {
              if (p.parameters) {
                for (const k in p.parameters) {
                  p.parameters[k] = patchParam(p.parameters[k], [
                    pIdx,
                    "parameters",
                    k,
                  ]);
                }
              }
            });

            const prefix = content.slice(0, startIdx);
            const suffix = content.slice(endIdx + 1);
            fs.writeFileSync(
              pluginsJsPath,
              prefix + JSON.stringify(plugins, null, 2) + suffix,
              "utf8",
            );
            log("info", "Arquivo de plugins patcheado: js/plugins.js");
          }
        } catch (e) {
          log("error", "Falha ao patchear js/plugins.js: " + e.message);
        }
      }
      continue;
    }

    // Normal JSON files in data/
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
      const data = JSON.parse(raw);
      let fileModified = false;
      for (const [keyStr, entry] of fileTrans) {
        const keys = JSON.parse(keyStr);
        let isJs = false;
        let realKeys = keys;
        if (
          keys.length > 0 &&
          typeof keys[keys.length - 1] === "string" &&
          keys[keys.length - 1].startsWith("__js__")
        ) {
          isJs = true;
          realKeys = keys.slice(0, -1);
        }

        let obj = data,
          success = true;
        for (let i = 0; i < realKeys.length - 1; i++) {
          const k = realKeys[i];
          if (obj && typeof obj === "object" && k in obj) obj = obj[k];
          else {
            success = false;
            break;
          }
        }
        if (!success) continue;
        const lastKey = realKeys[realKeys.length - 1];
        if (obj && typeof obj === "object" && lastKey in obj) {
          let restored = restoreEscapeCodes(entry.tr, entry.escapeParts);

          if (isJs && entry.isJsString) {
            // É uma string dentro de código JS!
            const originalScript = obj[lastKey];
            const quote = entry.jsLiteral[0];
            const newLiteral =
              quote +
              restored.replace(new RegExp("\\" + quote, "g"), "\\" + quote) +
              quote;
            if (originalScript.includes(entry.jsLiteral)) {
              obj[lastKey] = originalScript.replace(
                entry.jsLiteral,
                newLiteral,
              );
              fileModified = true;
              count++;
            }
          } else {
            // Processamento normal de string
            const parentCmd = getValueAtPath(data, realKeys.slice(0, -2));
            if (
              parentCmd &&
              (parentCmd.code === 355 || parentCmd.code === 655)
            ) {
              restored = "テキスト-" + restored;
            }
            if (parentCmd && parentCmd.code === 401) {
              const cfg = handlers.loadCfg();
              const wrapLimit = parseInt(cfg.wordWrapLimit, 10) || 0;
              if (wrapLimit > 0) {
                restored = autoWrapText(restored, wrapLimit);
              }
            }
            if (restored !== obj[lastKey]) {
              obj[lastKey] = restored;
              fileModified = true;
              count++;
            }
          }
        }
      }
      if (fileModified) {
        fs.writeFileSync(
          path.join(dataDir, file),
          JSON.stringify(data, null, 4),
          "utf8",
        );
        log("info", `Arquivo patcheado: ${file}`);
      }
    } catch (e) {
      log("error", `Falha ao patchear arquivo ${file}: ${e.message}`);
    }
  }
  log("success", "Patched " + count + " texts");
  return count;
}

function backupGameData(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return "";
  const bakDir = dataDir + "_bak_" + Date.now();
  try {
    fs.cpSync(dataDir, bakDir, { recursive: true, force: true });
    const wwwDir = path.dirname(dataDir);
    const htmlPath = path.join(wwwDir, "index.html");
    if (fs.existsSync(htmlPath)) {
      try {
        fs.copyFileSync(htmlPath, path.join(bakDir, "index.html"));
      } catch (e) {}
    }
    // Also backup js/plugins.js
    const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
    if (fs.existsSync(pluginsJsPath)) {
      try {
        fs.copyFileSync(pluginsJsPath, path.join(bakDir, "plugins.js_bak"));
      } catch (e) {}
    }
    log("info", "Backup: " + path.basename(bakDir));
    return bakDir;
  } catch (e) {
    log("error", "Backup failed: " + e.message);
    return "";
  }
}

function restoreGameData(bakDir) {
  if (!bakDir || !fs.existsSync(bakDir)) return false;
  const parentDir = path.dirname(bakDir);
  const baseName = path.basename(bakDir).replace(/_bak_\d+$/, "");
  const origDir = path.join(parentDir, baseName);
  try {
    if (fs.existsSync(origDir))
      fs.rmSync(origDir, { recursive: true, force: true });
    fs.cpSync(bakDir, origDir, { recursive: true, force: true });
    const bakHtml = path.join(bakDir, "index.html");
    const wwwDir = path.dirname(origDir);
    if (fs.existsSync(bakHtml)) {
      try {
        const htmlPath = path.join(wwwDir, "index.html");
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
        fs.copyFileSync(bakHtml, htmlPath);
      } catch (e) {}
    }
    // Restore js/plugins.js
    const bakPlugins = path.join(bakDir, "plugins.js_bak");
    const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
    if (fs.existsSync(bakPlugins)) {
      try {
        if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
        fs.copyFileSync(bakPlugins, pluginsJsPath);
      } catch (e) {}
    }
    const cheatScript = path.join(wwwDir, "CheatOverlay.js");
    if (fs.existsSync(cheatScript)) {
      try {
        fs.unlinkSync(cheatScript);
      } catch (e) {}
    }
    fs.rmSync(bakDir, { recursive: true, force: true });
    log("info", "Restored original data from backup");
    return true;
  } catch (e) {
    log("error", "Restore failed: " + e.message);
    return false;
  }
}

function restoreOldestBackup(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return;
  const parentDir = path.dirname(dataDir);
  const baseName = path.basename(dataDir);

  try {
    const items = fs.readdirSync(parentDir);
    const backups = [];
    for (const item of items) {
      const fullPath = path.join(parentDir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        const match = item.match(new RegExp("^" + baseName + "_bak_(\\d+)$"));
        if (match) {
          backups.push({
            path: fullPath,
            timestamp: parseInt(match[1], 10),
          });
        }
      }
    }

    if (backups.length > 0) {
      // Sort oldest first
      backups.sort((a, b) => a.timestamp - b.timestamp);
      const oldestBak = backups[0].path;
      log(
        "info",
        "Self-Healing: Restaurando backup anterior não-restaurado: " +
          path.basename(oldestBak),
      );

      // Delete current data
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }

      // Copy backup back
      fs.cpSync(oldestBak, dataDir, { recursive: true, force: true });

      // Restore plugins.js if backed up
      const wwwDir = path.dirname(dataDir);
      const bakPlugins = path.join(oldestBak, "plugins.js_bak");
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(bakPlugins)) {
        try {
          if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
          fs.copyFileSync(bakPlugins, pluginsJsPath);
        } catch (e) {}
      }

      // Remove all backup folders
      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }
      log(
        "info",
        "Self-Healing: Backup restaurado e arquivos temporários limpos com sucesso.",
      );
    }
  } catch (e) {
    log("warn", "Falha ao processar auto-restauração de backup: " + e.message);
  }
}

function checkProcessRunning() {
  if (!launchedProc) return { key: null, running: false, exitCode: null };
  try {
    const ec = launchedProc.exitCode;
    return ec === null
      ? { key: launchedKey, running: true, exitCode: null }
      : { key: null, running: false, exitCode: ec };
  } catch (e) {
    return { key: null, running: false, exitCode: null };
  }
}

// ==================== GAME SEARCH ====================
function findGameOnDisk(fileName) {
  const roots = [
    path.resolve(ROOT, "..", ".."), // Arquivos Switch
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Desktop", "Nova pasta"),
  ];
  const results = [];
  for (const root of roots) {
    try {
      if (!fs.existsSync(root)) continue;
      function scan(dir, depth) {
        if (depth > 3) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (!e.isDirectory() || e.name.startsWith(".")) continue;
            const sub = path.join(dir, e.name);
            try {
              const target = path.join(sub, fileName);
              if (fs.existsSync(target)) {
                const st = fs.statSync(target);
                results.push({
                  name: e.name,
                  exePath: target,
                  engine: "mz",
                  size: st.size,
                  mtime: st.mtimeMs,
                });
                continue;
              }
            } catch (er) {}
            scan(sub, depth + 1);
          }
        } catch (e) {}
      }
      scan(root, 0);
    } catch (e) {}
  }
  // Deduplicate by exePath
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.exePath)) return false;
    seen.add(r.exePath);
    return true;
  });
}

// ==================== PYTHON SCRIPT RUNNER ====================
function runPythonScript(scriptPath, args) {
  return new Promise((res, rej) => {
    const localPython = path.join(
      ROOT,
      "resources",
      "renpy",
      "python",
      "python.exe",
    );
    const pythonCmds = [];
    if (fs.existsSync(localPython)) {
      pythonCmds.push(localPython);
    }
    pythonCmds.push("python", "python3", "py");

    function tryCmd(idx) {
      if (idx >= pythonCmds.length) {
        rej(
          new Error(
            "Python nao foi encontrado no sistema ou na pasta de recursos. Por favor, instale o Python.",
          ),
        );
        return;
      }
      const proc = spawn(pythonCmds[idx], [scriptPath, ...args], {
        timeout: 60000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("error", () => tryCmd(idx + 1));
      proc.on("exit", (code) => {
        if (code === 0) res(stdout || "Done");
        else if (idx < pythonCmds.length - 1) tryCmd(idx + 1);
        else rej(new Error(stderr || "Exit code " + code));
      });
    }
    tryCmd(0);
  });
}

function healGameData(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return;
  const sysPath = path.join(dataDir, "System.json");
  if (!fs.existsSync(sysPath)) return;

  try {
    let modified = false;
    const sys = JSON.parse(fs.readFileSync(sysPath, "utf8"));

    // Find audio/se folder
    let seDir = path.join(gameDir, "audio", "se");
    if (!fs.existsSync(seDir)) {
      const wwwDir = path.join(gameDir, "www");
      if (fs.existsSync(path.join(wwwDir, "audio", "se"))) {
        seDir = path.join(wwwDir, "audio", "se");
      }
    }

    if (fs.existsSync(seDir) && sys.sounds && Array.isArray(sys.sounds)) {
      const defaultSounds = [
        "Cursor1",
        "Decision1",
        "Cancel1",
        "Buzzer1",
        "Equip1",
        "Save1",
        "Load1",
        "Battle1",
        "Escape1",
        "Attack1",
        "Damage1",
        "Collapse1",
        "Collapse2",
        "Damage2",
        "Collapse3",
        "Recovery1",
        "Miss1",
        "Evasion1",
        "Shop1",
        "Item1",
        "Skill1",
      ];

      sys.sounds.forEach((s, idx) => {
        if (s && s.name) {
          const fileExists =
            fs.existsSync(path.join(seDir, s.name + ".ogg")) ||
            fs.existsSync(path.join(seDir, s.name + ".ogg_"));
          if (!fileExists) {
            // Check if standard default sound exists
            const defName = defaultSounds[idx];
            if (defName) {
              const defExists =
                fs.existsSync(path.join(seDir, defName + ".ogg")) ||
                fs.existsSync(path.join(seDir, defName + ".ogg_"));
              if (defExists) {
                log(
                  "info",
                  `Autocorreção de Áudio: Som revertido no índice ${idx} de "${s.name}" para o padrão "${defName}"`,
                );
                s.name = defName;
                modified = true;
              }
            }
          }
        }
      });
    }

    if (modified) {
      fs.writeFileSync(sysPath, JSON.stringify(sys, null, 2), "utf8");
      log(
        "info",
        "Autocorreção de Áudio: System.json reparado e salvo com sucesso.",
      );
    }
  } catch (e) {
    log("warn", "Autocorreção de Áudio falhou: " + e.message);
  }
}

async function executeTranslationPipeline(gameDir, cfg, title) {
  log("info", "Iniciando pipeline de tradução para: " + (title || gameDir));

  // Restaura backups órfãos para evitar double-translation e corrupção
  restoreOldestBackup(gameDir);

  // Realiza autocorreção/self-healing de efeitos sonoros corrompidos
  healGameData(gameDir);

  log("info", "Criando backup dos arquivos de dados...");
  const bakDir = backupGameData(gameDir);
  if (!bakDir) {
    log("warn", "Backup não criado ou ignorado.");
  } else {
    log("info", "Backup criado com sucesso: " + bakDir);
  }

  log("info", "Escaneando arquivos de dados e extraindo textos...");
  const texts = extractGameTexts(gameDir);
  log("info", `Total de textos extraídos: ${texts.length}`);

  if (texts.length === 0) {
    log("info", "Nenhum texto traduzível encontrado.");
    return bakDir;
  }

  const cacheFile = path.join(gameDir, "trans_cache.json");
  let cacheTranslations = null;
  const sl = cfg.sl || "auto";
  const tl = cfg.tl || "pt";
  const engine = cfg.engine || "google";
  const cfgKey = sl + "|" + tl + "|" + engine;

  if (fs.existsSync(cacheFile)) {
    try {
      const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (cd.cfgKey === cfgKey && cd.translations) {
        cacheTranslations = cd.translations;
      }
    } catch (e) {
      log("error", "Falha ao ler cache local do jogo: " + e.message);
    }
  }

  const translations = new Map();
  let localCacheMatches = 0;
  let globalCacheMatches = 0;
  let commonMatches = 0;

  const globalCacheKey = sl + "|" + tl;
  const globalLangCache = loadGlobalCacheForLang(sl, tl);

  const commonTrans = loadCommonTranslations();

  // 1. Correspondência de cache local
  if (cacheTranslations) {
    for (const t of texts) {
      const k = t.file + ":" + t.keys.join(".") + ":" + t.original;
      if (cacheTranslations[k]) {
        translations.set(t.id, cacheTranslations[k]);
        localCacheMatches++;
      }
    }
  }

  // 2. Correspondência de cache global e termos comuns
  for (const t of texts) {
    if (translations.has(t.id)) continue;

    if (globalLangCache[t.clean]) {
      translations.set(t.id, globalLangCache[t.clean]);
      globalCacheMatches++;
      continue;
    }

    const commonTr = getCommonTranslation(t.clean, sl, tl, commonTrans);
    if (commonTr) {
      translations.set(t.id, commonTr);
      commonMatches++;
    }
  }

  log(
    "info",
    `Resultado do cache: matched ${localCacheMatches} do cache local do jogo, ${globalCacheMatches} do cache global, ${commonMatches} de termos comuns.`,
  );

  // 3. Traduzir o que sobrar
  const unmatched = texts.filter((t) => !translations.has(t.id));
  if (unmatched.length > 0) {
    log(
      "info",
      `Traduzindo os ${unmatched.length} textos inéditos restantes usando motor ${engine} (Idioma: ${sl} -> ${tl})...`,
    );
    const glossary = loadGlossary();
    const newTranslations = await translateBatch(
      unmatched,
      sl,
      tl,
      engine,
      glossary,
    );

    const toSave = [];
    for (const [id, tr] of newTranslations) {
      translations.set(id, tr);
      const item = unmatched.find((x) => x.id === id);
      if (item && tr && tr !== item.clean && tr.length > 0) {
        toSave.push([item.clean, tr]);
      }
    }
    if (toSave.length > 0) {
      saveNewGlobalTranslations(sl, tl, toSave);
    }
    log(
      "info",
      `Cache global SQLite atualizado com ${toSave.length} novas traduções.`,
    );
  }

  // 4. Salvar cache local
  try {
    const cd = { cfgKey, translations: {} };
    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr && tr !== t.clean && tr.length > 0) {
        cd.translations[t.file + ":" + t.keys.join(".") + ":" + t.original] =
          tr;
      }
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cd, null, 2));
    log("info", "Cache local salvo em: " + cacheFile);
  } catch (e) {
    log("error", "Falha ao salvar cache local: " + e.message);
  }

  // 5. Patchear arquivos
  log("info", "Aplicando patches nos arquivos de dados do jogo...");
  const patched = patchGameData(gameDir, texts, translations);
  log(
    "success",
    `Pipeline concluído. Substituídos ${patched} textos nos arquivos do jogo.`,
  );

  const dataDir = findDataDir(gameDir);
  if (dataDir) {
    const wwwDir = path.dirname(dataDir);
    const htmlPath = path.join(wwwDir, "index.html");
    if (fs.existsSync(htmlPath)) {
      try {
        const isMZ =
          fs.existsSync(path.join(gameDir, "effects")) ||
          fs.existsSync(path.join(wwwDir, "effects"));
        if (!isMZ) {
          let html = fs.readFileSync(htmlPath, "utf8");
          if (!html.includes("CheatOverlay.js")) {
            html = html.replace(
              "</head>",
              '<script type="text/javascript" src="CheatOverlay.js"></script></head>',
            );
            fs.writeFileSync(htmlPath, html, "utf8");
          }
          const cheatScriptPath = path.join(wwwDir, "CheatOverlay.js");
          const cheatScriptContent = `(function() {
          var fs;
          try { fs = require('fs'); } catch(e) {}
          function logToFile(msg) {
            if (!fs) return;
            try {
              fs.appendFileSync('cheat_overlay.log', '[' + new Date().toLocaleTimeString() + '] ' + msg + '\\n');
            } catch(e) {}
          }
          logToFile('Iniciando CheatOverlay...');
          var pollUrl = 'http://127.0.0.1:16005/cheat_poll';
          function pollCheat() {
            try {
              if (!window.$gameParty || !window.$gamePlayer || !window.$gameSystem || !window.$gameMap) {
                logToFile('Aguardando inicialização do jogo...');
                setTimeout(pollCheat, 1000);
                return;
              }
              var state;
              try {
                var ownedItems = [];
                var allDbItems = [];
                if (typeof $dataItems !== 'undefined' && $dataItems) {
                  try {
                    $gameParty.items().forEach(function(item) {
                      if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'item', count: $gameParty.numItems(item) });
                    });
                    $gameParty.weapons().forEach(function(item) {
                      if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'weapon', count: $gameParty.numItems(item) });
                    });
                    $gameParty.armors().forEach(function(item) {
                      if (item && item.name) ownedItems.push({ id: item.id, name: item.name, type: 'armor', count: $gameParty.numItems(item) });
                    });
                    
                    $dataItems.forEach(function(item) {
                      if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'item' });
                    });
                    $dataWeapons.forEach(function(item) {
                      if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'weapon' });
                    });
                    $dataArmors.forEach(function(item) {
                      if (item && item.name) allDbItems.push({ id: item.id, name: item.name, type: 'armor' });
                    });
                  } catch(e) {
                    logToFile('Erro ao ler itens: ' + e.message);
                  }
                }
                
                state = {
                  gold: typeof $gameParty.gold === 'function' ? $gameParty.gold() : 0,
                  mapId: typeof $gameMap.mapId === 'function' ? $gameMap.mapId() : 0,
                  x: $gamePlayer.x !== undefined ? $gamePlayer.x : 0,
                  y: $gamePlayer.y !== undefined ? $gamePlayer.y : 0,
                  through: typeof $gamePlayer.isThrough === 'function' ? $gamePlayer.isThrough() : false,
                  encounterDisabled: !$gameSystem.isEncounterEnabled(),
                  actors: (typeof $gameParty.members === 'function' ? $gameParty.members() : []).map(function(a, idx) {
                    return {
                      idx: idx, name: typeof a.name === 'function' ? a.name() : '', hp: a.hp || 0, mhp: a.mhp || 0, mp: a.mp || 0, mmp: a.mmp || 0, tp: a.tp || 0, level: a.level || 1
                    };
                  }),
                  ownedItems: ownedItems,
                  allDbItems: allDbItems
                };
              } catch(err) {
                logToFile('Erro ao extrair propriedades do jogo: ' + err.message);
                setTimeout(pollCheat, 1000);
                return;
              }
              
              logToFile('Enviando cheat_poll. Ouro: ' + state.gold);
              var xhr = new XMLHttpRequest();
              xhr.open('POST', pollUrl, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onload = function() {
                logToFile('cheat_poll respondido com status: ' + xhr.status);
                if (xhr.status === 200) {
                  try {
                    var commands = JSON.parse(xhr.responseText);
                    if (Array.isArray(commands) && commands.length > 0) {
                      logToFile('Processando ' + commands.length + ' comandos...');
                      commands.forEach(function(cmd) {
                        try { 
                          logToFile('Executando: ' + cmd.code);
                          eval(cmd.code); 
                        } catch(ex) {
                          logToFile('Erro no eval: ' + ex.message);
                        }
                      });
                    }
                  } catch(e) {
                    logToFile('Erro ao processar resposta: ' + e.message);
                  }
                }
                setTimeout(pollCheat, 1000);
              };
              xhr.onerror = function() {
                logToFile('Erro na requisição cheat_poll');
                setTimeout(pollCheat, 2000);
              };
              xhr.send(JSON.stringify(state));
            } catch(e) {
              logToFile('Erro na execução do pollCheat: ' + e.message);
              setTimeout(pollCheat, 2000);
            }
          }
          setInterval(function() {
            try {
              if (window.godHP && window.$gameParty && typeof window.$gameParty.members === 'function') {
                var members = window.$gameParty.members();
                if (Array.isArray(members)) {
                  members.forEach(function(a) {
                    if (a && typeof a.setHp === 'function') a.setHp(a.mhp);
                  });
                }
              }
              if (window.godMP && window.$gameParty && typeof window.$gameParty.members === 'function') {
                var members = window.$gameParty.members();
                if (Array.isArray(members)) {
                  members.forEach(function(a) {
                    if (a && typeof a.setMp === 'function') a.setMp(a.mmp);
                  });
                }
              }
            } catch(e) {}
          }, 100);
          pollCheat();
        })();`;
          fs.writeFileSync(cheatScriptPath, cheatScriptContent, "utf8");
          log("success", "CheatOverlay injetado com sucesso no jogo.");
        }
      } catch (e) {
        log("error", "Falha ao injetar CheatOverlay: " + e.message);
      }
    }
  }
  return bakDir;
}

// ==================== RPC HANDLERS ====================
const handlers = {
  async decryptImages({ gameKey, destDir, type }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    // Find img and audio folders
    let imgDir = path.join(gameDir, "img");
    let audioDir = path.join(gameDir, "audio");
    let dataDirParent = gameDir;

    if (!fs.existsSync(imgDir) && !fs.existsSync(audioDir)) {
      const wwwDir = path.join(gameDir, "www");
      imgDir = path.join(wwwDir, "img");
      audioDir = path.join(wwwDir, "audio");
      dataDirParent = wwwDir;
    }

    const targetType = type || "img";
    const targetDir = targetType === "audio" ? audioDir : imgDir;
    const targetName = targetType === "audio" ? "áudios" : "imagens";

    if (!fs.existsSync(targetDir)) {
      return {
        ok: false,
        error: `Pasta "${path.basename(targetDir)}" do jogo não encontrada`,
      };
    }

    // Find encryption key in System.json
    let keyHex = "";
    const systemJsonPath = path.join(dataDirParent, "data", "System.json");
    if (fs.existsSync(systemJsonPath)) {
      try {
        const sys = JSON.parse(fs.readFileSync(systemJsonPath, "utf8"));
        if (
          (sys.hasEncryptedImages || sys.hasEncryptedAudio) &&
          sys.encryptionKey
        ) {
          keyHex = sys.encryptionKey;
        }
      } catch (e) {
        log(
          "warn",
          "Falha ao ler System.json para obter chave de criptografia: " +
            e.message,
        );
      }
    }

    let keyBytes = null;
    if (keyHex && keyHex.length === 32) {
      keyBytes = Buffer.from(keyHex, "hex");
    }

    // Ensure destination directory exists
    try {
      fs.mkdirSync(destDir, { recursive: true });
    } catch (e) {
      return {
        ok: false,
        error: "Falha ao criar pasta de destino: " + e.message,
      };
    }

    log(
      "info",
      `Iniciando exportação e descriptografia de ${targetName} de ${targetDir} para ${destDir}...`,
    );

    let count = 0;
    function processDir(currentDir, currentDestDir) {
      if (!fs.existsSync(currentDir)) return;
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const nextDestDir = path.join(currentDestDir, file);
          fs.mkdirSync(nextDestDir, { recursive: true });
          processDir(fullPath, nextDestDir);
        } else {
          const ext = path.extname(file).toLowerCase();
          const isEncryptedImage = ext === ".rpgmvp" || ext === ".png_";
          const isEncryptedAudioOgg = ext === ".rpgmvo" || ext === ".ogg_";
          const isEncryptedAudioM4a = ext === ".rpgmvm" || ext === ".m4a_";

          if (isEncryptedImage || isEncryptedAudioOgg || isEncryptedAudioM4a) {
            try {
              const encryptedData = fs.readFileSync(fullPath);
              if (encryptedData.length > 32 && keyBytes) {
                const decryptedData = Buffer.alloc(encryptedData.length - 16);
                for (let i = 0; i < 16; i++) {
                  decryptedData[i] = encryptedData[16 + i] ^ keyBytes[i];
                }
                encryptedData.copy(decryptedData, 16, 32);

                let destName = path.basename(file, ext);
                if (isEncryptedImage) destName += ".png";
                else if (isEncryptedAudioOgg) destName += ".ogg";
                else if (isEncryptedAudioM4a) destName += ".m4a";

                const destFile = path.join(currentDestDir, destName);
                fs.writeFileSync(destFile, decryptedData);
                count++;
              }
            } catch (e) {
              log(
                "warn",
                `Falha ao descriptografar recurso ${file}: ${e.message}`,
              );
            }
          } else {
            const isNormalAsset =
              targetType === "audio"
                ? [".ogg", ".m4a", ".mp3", ".wav"].includes(ext)
                : [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
            if (isNormalAsset) {
              try {
                const destFile = path.join(currentDestDir, file);
                fs.copyFileSync(fullPath, destFile);
                count++;
              } catch (e) {}
            }
          }
        }
      }
    }

    try {
      processDir(targetDir, destDir);
      log(
        "success",
        `Exportação concluída. ${count} ${targetName} exportadas com sucesso.`,
      );
      return { ok: true, count };
    } catch (e) {
      return {
        ok: false,
        error: "Falha durante o processamento das pastas: " + e.message,
      };
    }
  },
  patchGameFont({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    let fontsDir = path.join(gameDir, "fonts");
    if (!fs.existsSync(fontsDir)) {
      const wwwDir = path.join(gameDir, "www");
      if (fs.existsSync(wwwDir)) {
        fontsDir = path.join(wwwDir, "fonts");
      }
    }

    try {
      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }

      const sourceFont = path.join(ROOT, "loaders", "opent_PGMMV_font.ttf");
      if (!fs.existsSync(sourceFont)) {
        return {
          ok: false,
          error:
            "Arquivo de fonte original não encontrado na pasta loaders do tradutor.",
        };
      }

      const destFont = path.join(fontsDir, "pt-br-font.ttf");
      fs.copyFileSync(sourceFont, destFont);

      const cssPath = path.join(fontsDir, "gamefont.css");
      if (fs.existsSync(cssPath)) {
        const bakCss = cssPath + "_bak";
        if (!fs.existsSync(bakCss)) {
          fs.copyFileSync(cssPath, bakCss);
        }
      }

      const customCss = `@font-face {
    font-family: GameFont;
    src: url("pt-br-font.ttf");
}
@font-face {
    font-family: rmmz-mainfont;
    src: url("pt-br-font.ttf");
}`;

      fs.writeFileSync(cssPath, customCss, "utf8");

      log(
        "success",
        "Patch de fontes aplicado com sucesso! Fonte pt-br-font.ttf instalada.",
      );
      return { ok: true };
    } catch (e) {
      log("error", "Falha ao aplicar patch de fontes: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  clearGlobalCache() {
    try {
      const jsonPath = path.join(ROOT, "global_trans_cache.json");
      const bakPath = jsonPath + ".bak";
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
      if (fs.existsSync(COMMON_TRANS_PATH)) fs.unlinkSync(COMMON_TRANS_PATH);
      try {
        if (db) {
          db.prepare("DELETE FROM global_cache").run();
          db.pragma("vacuum");
        }
      } catch (e2) {}
      log(
        "info",
        "Histórico de traduções globais (JSON e SQLite) excluído com sucesso.",
      );
      return true;
    } catch (e) {
      log("error", "Falha ao limpar histórico de traduções: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  loadCfg() {
    try {
      if (fs.existsSync(CFG_PATH))
        return JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
      return {};
    } catch (e) {
      return {};
    }
  },
  getLogs({ afterId }) {
    const id = afterId || 0;
    return serverLogs.filter((l) => l.id > id);
  },
  saveCfg(cfg) {
    fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
    return true;
  },
  loadGames() {
    const games = {},
      gameKeys = [];
    try {
      if (!fs.existsSync(GL_DIR)) fs.mkdirSync(GL_DIR, { recursive: true });
      fs.readdirSync(GL_DIR)
        .filter((f) => f.endsWith(".gljson"))
        .forEach((k) => {
          try {
            const d = JSON.parse(fs.readFileSync(path.join(GL_DIR, k), "utf8"));
            games[k.replace(".gljson", "")] = d;
          } catch (e) {}
        });
    } catch (e) {}
    return { games, gameKeys: Object.keys(games) };
  },
  saveGame({ key, data }) {
    try {
      if (!fs.existsSync(GL_DIR)) fs.mkdirSync(GL_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(GL_DIR, key + ".gljson"),
        JSON.stringify(data, null, 2),
      );
      return true;
    } catch (e) {
      return false;
    }
  },
  delGame({ key }) {
    try {
      const p = path.join(GL_DIR, key + ".gljson");
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return true;
    } catch (e) {
      return false;
    }
  },
  detectEngine({ exePath, exeDir }) {
    return detectEngine(exePath, exeDir);
  },
  async launchGame({ key }) {
    if (restoreTimeout) {
      clearTimeout(restoreTimeout);
      restoreTimeout = null;
    }
    const games = handlers.loadGames().games;
    const g = games[key];
    if (!g) {
      log("error", "launchGame: game not found key=" + key);
      return { ok: false, error: "Game not found" };
    }
    if (launchedProc && checkProcessRunning().running) {
      log("warn", "launchGame: already running");
      return { ok: false, error: "A game is already running" };
    }
    const args = g.constArgs || {};
    const exe = args.gameExe || "";
    const eng = args.engine || detectEngine(exe);
    const title = g.libConf?.title || key;
    log(
      "info",
      'launchGame: "' +
        title +
        '" exe="' +
        exe +
        '" exists=' +
        fs.existsSync(exe) +
        " eng=" +
        eng,
    );
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found: " + exe };
    const gameDir = path.dirname(exe);

    // Auto-Healing: Limpar quaisquer processos zumbis do jogo ativos na pasta do jogo
    try {
      const { execSync } = require("child_process");
      const escapedDir = gameDir.replace(/'/g, "''");
      const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Stop-Process -Force"`;
      execSync(psCmd);
      log("info", "Processos zumbis do jogo limpos antes do boot");
    } catch (e) {}

    let bakDir = "";
    const eInfo = ENGINES_DEF[eng];
    if (eInfo && eInfo.js) {
      const cfg = handlers.loadCfg();
      bakDir = await executeTranslationPipeline(gameDir, cfg, title);
    }

    const hookDll = getHookDll(eng, exe);
    const injectExe = path.join(__dirname, "loaders", "inject.exe");
    let proc;

    if (hookDll && fs.existsSync(injectExe)) {
      const hookPath = path.join(__dirname, "loaders", hookDll);
      log("info", "Launching hooked game via inject.exe with hook: " + hookDll);
      try {
        proc = spawn(injectExe, [exe, hookPath], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
        });
        if (proc) {
          proc.on("exit", (code) => {
            log(
              "info",
              "Processo injetor inicial finalizou com código " +
                code +
                ". Verificando instâncias filhas desvinculadas...",
            );
            setTimeout(() => {
              const exeName = path.basename(exe, ".exe");
              const escapedDir = gameDir.replace(/'/g, "''");
              const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name '${exeName}' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Select-Object -ExpandProperty Id"`;

              exec(psCmd, (err, stdout, stderr) => {
                if (err) {
                  log(
                    "error",
                    "Falha ao buscar instâncias desvinculadas: " + err.message,
                  );
                  return;
                }
                const activePids = stdout
                  .trim()
                  .split("\n")
                  .map((p) => parseInt(p.trim(), 10))
                  .filter((p) => !isNaN(p));
                if (activePids.length > 0) {
                  log(
                    "info",
                    "Detectadas " +
                      activePids.length +
                      " instâncias ativas desvinculadas. Iniciando injeção em runtime...",
                  );
                  activePids.forEach((pid) => {
                    try {
                      log(
                        "info",
                        "Injetando hook " + hookDll + " no PID ativo: " + pid,
                      );
                      const arch = getExeArch(exe);
                      const runtimeInjector =
                        arch === 64
                          ? path.join(
                              __dirname,
                              "loaders",
                              "PIDDLLInject64.exe",
                            )
                          : path.join(__dirname, "loaders", "inject.exe");
                      spawn(runtimeInjector, [String(pid), hookPath], {
                        stdio: "ignore",
                        detached: true,
                        shell: false,
                      });
                    } catch (err) {
                      log(
                        "error",
                        "Falha na injeção em runtime no PID " +
                          pid +
                          ": " +
                          err.message,
                      );
                    }
                  });
                }
              });
            }, 2500);
          });
        }
      } catch (e) {
        log("error", "Hook spawn exception: " + e.message);
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
        });
      }
    } else {
      log("info", "Spawning process directly: " + path.basename(exe));
      try {
        proc = spawn(exe, [], {
          cwd: gameDir,
          stdio: "ignore",
          detached: true,
          shell: false,
        });
      } catch (e) {
        log("error", "Spawn exception: " + e.message);
        if (bakDir) {
          restoreGameData(bakDir);
          bakDir = "";
        }
        return { ok: false, error: "Spawn failed: " + e.message };
      }
    }
    const gp = proc.pid;
    const currentBak = bakDir;
    launchedProc = proc;
    launchedKey = key;
    launchedBak = currentBak;
    proc.on("exit", (code, sig) => {
      log(
        "info",
        "Process exited: PID=" +
          gp +
          " code=" +
          code +
          " signal=" +
          (sig || "none"),
      );
      if (launchedBak) {
        const bakToRestore = launchedBak;
        launchedBak = null;
        if (restoreTimeout) {
          clearTimeout(restoreTimeout);
        }
        restoreTimeout = setTimeout(() => {
          restoreGameData(bakToRestore);
          restoreTimeout = null;
        }, 20000);
      }
      launchedProc = null;
      launchedKey = null;
      activeCheatSocket = null;
      lastGameState = null;
    });
    proc.on("error", (err) => {
      log("error", "Process error: " + err.message);
      if (launchedBak) {
        const bakToRestore = launchedBak;
        launchedBak = null;
        if (restoreTimeout) {
          clearTimeout(restoreTimeout);
        }
        restoreTimeout = setTimeout(() => {
          restoreGameData(bakToRestore);
          restoreTimeout = null;
        }, 20000);
      }
      launchedProc = null;
      launchedKey = null;
      activeCheatSocket = null;
      lastGameState = null;
    });
    proc.unref();
    log("info", "Game launched PID: " + gp);
    return { pid: gp, key };
  },
  checkGame() {
    return checkProcessRunning();
  },
  listSaves({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return [];
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe)) return [];
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return [];
    try {
      return fs
        .readdirSync(sd)
        .filter((f) => !f.startsWith("."))
        .sort()
        .map((f) => {
          const st = fs.statSync(path.join(sd, f));
          return { name: f, size: st.size, mtime: st.mtimeMs };
        });
    } catch (e) {
      return [];
    }
  },
  openSave({ gameKey, file }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    const fp = path.join(sd, file);
    exec('start "" "' + fp + '"');
    return true;
  },
  deleteSave({ gameKey, file }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    try {
      fs.unlinkSync(path.join(sd, file));
      return true;
    } catch (e) {
      return false;
    }
  },
  openSaveFolder({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return false;
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return false;
    const gameDir = path.dirname(exe);
    const candidates = [
      path.join(gameDir, "save"),
      path.join(gameDir, "www", "save"),
      path.join(gameDir, "Save"),
    ];
    let sd = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        sd = c;
        break;
      }
    }
    if (!sd) return false;
    exec('explorer "' + sd + '"');
    return true;
  },
  deleteGameCache({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return { ok: false, error: "Executable path not found" };
    const gameDir = path.dirname(exe);
    const cacheFile = path.join(gameDir, "trans_cache.json");
    try {
      if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
    } catch (e) {}
    const globalCache = path.join(ROOT, "global_trans_cache.json");
    try {
      if (fs.existsSync(globalCache)) fs.unlinkSync(globalCache);
    } catch (e) {}
    log("success", "Deletado cache local e global.");
    return { ok: true };
  },
  restoreOriginalData({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    const dataDir = findDataDir(gameDir);
    if (!dataDir)
      return { ok: false, error: "Pasta de dados do jogo não encontrada" };
    const parentDir = path.dirname(dataDir);
    const baseName = path.basename(dataDir);

    try {
      const items = fs.readdirSync(parentDir);
      const backups = [];
      for (const item of items) {
        const fullPath = path.join(parentDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          const match = item.match(new RegExp("^" + baseName + "_bak_(\\d+)$"));
          if (match) {
            backups.push({
              path: fullPath,
              timestamp: parseInt(match[1], 10),
            });
          }
        }
      }

      if (backups.length === 0) {
        return {
          ok: false,
          error: "Nenhum backup encontrado. O jogo já está na versão original.",
        };
      }

      backups.sort((a, b) => a.timestamp - b.timestamp);
      const oldestBak = backups[0].path;

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.cpSync(oldestBak, dataDir, { recursive: true, force: true });

      const wwwDir = path.dirname(dataDir);
      const bakPlugins = path.join(oldestBak, "plugins.js_bak");
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(bakPlugins)) {
        try {
          if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
          fs.copyFileSync(bakPlugins, pluginsJsPath);
        } catch (e) {}
      }

      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }

      log("success", "Restaurado dados originais com sucesso.");
      return { ok: true };
    } catch (e) {
      log("error", "Falha ao restaurar dados originais: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  exportGameTexts({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe) return { ok: false, error: "Executable path not found" };
    const gameDir = path.dirname(exe);
    const cacheFile = path.join(gameDir, "trans_cache.json");
    if (!fs.existsSync(cacheFile)) {
      return {
        ok: false,
        error: "Nenhum cache de tradução encontrado para exportar.",
      };
    }
    const desktop = path.join(require("os").homedir(), "Desktop");
    const title = g.libConf?.title || gameKey;
    const exportFile = path.join(desktop, `${title}_traducoes.json`);
    try {
      fs.copyFileSync(cacheFile, exportFile);
      exec(`explorer /select,"${exportFile}"`);
      return { ok: true, path: exportFile };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  sendCheatCommand({ code }) {
    log("info", "Enfileirando comando de cheat: " + code);
    pendingCheatCommands.push({ code });
    return { ok: true };
  },
  getGameState() {
    const connected = Date.now() - lastCheatPollTime < 3000;
    return { connected, state: lastGameState };
  },
  async translate({ text, sl, tl }) {
    return translateSingle(text, sl, tl);
  },
  log({ level, message }) {
    log(level, message);
    return true;
  },
  engineInfo({ eng }) {
    return ENGINES_DEF[eng] || ENGINES_DEF.mz;
  },
  async batchTranslate({ texts, sl, tl }) {
    const results = await translateBatch(texts, sl || "auto", tl || "pt");
    const entries = [];
    for (const [id, tr] of results) entries.push({ id, translation: tr });
    return entries;
  },
  findGame({ name, size, mtime }) {
    if (!name) return null;
    const found = findGameOnDisk(name);
    if (found.length === 0) return null;
    if (size && mtime) {
      const exact = found.filter(
        (f) => f.size === size && Math.round(f.mtime) === Math.round(mtime),
      );
      if (exact.length === 1) return exact[0];
    }
    if (size) {
      const bySize = found.filter((f) => f.size === size);
      if (bySize.length === 1) return bySize[0];
      if (bySize.length > 1 && mtime) {
        bySize.sort(
          (a, b) => Math.abs(a.mtime - mtime) - Math.abs(b.mtime - mtime),
        );
        return bySize[0];
      }
    }
    log(
      "info",
      "Found " + found.length + ' matches for "' + name + '", using first',
    );
    return found[0];
  },
  resolveShortcut({ shortcutPath }) {
    return new Promise((res) => {
      if (!shortcutPath.toLowerCase().endsWith(".lnk")) {
        res(shortcutPath);
        return;
      }
      const psCmd = `$sh = New-Object -ComObject WScript.Shell; $sh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}').TargetPath`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, (err, stdout) => {
        if (err) {
          res(shortcutPath);
          return;
        }
        const target = stdout.trim();
        if (target && fs.existsSync(target)) {
          res(target);
        } else {
          res(shortcutPath);
        }
      });
    });
  },
  // ===== GLOSSARY =====
  loadGlossary() {
    return loadGlossary();
  },
  saveGlossary({ entries }) {
    return saveGlossary(entries);
  },
  // ===== TRANSLATION WITH ENGINE =====
  async translateWithEngine({ text, sl, tl, engine }) {
    return translateSingle(text, sl || "auto", tl || "pt", engine || "multi");
  },
  async batchTranslateWithEngine({ texts, sl, tl, engine, glossary }) {
    const results = await translateBatch(
      texts || [],
      sl || "auto",
      tl || "pt",
      engine || "multi",
      glossary,
    );
    const entries = [];
    for (const [id, tr] of results) entries.push({ id, translation: tr });
    return entries;
  },
  // ===== OVERLAY (RPG Maker) =====
  installOverlay({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const dataDir = findDataDir(gameDir);
    if (!dataDir) return { ok: false, error: "Game data directory not found" };
    // www dir is parent of data dir, or gameDir if data is at root
    let wwwDir = path.dirname(dataDir);
    if (!fs.existsSync(path.join(wwwDir, "index.html"))) wwwDir = gameDir;
    const overlayPath = path.join(ROOT, "www", "UltraTranslateOverlay.js");
    if (!fs.existsSync(overlayPath))
      return { ok: false, error: "Overlay JS not found" };
    try {
      const pluginsDir = path.join(wwwDir, "js", "plugins");
      if (!fs.existsSync(pluginsDir))
        fs.mkdirSync(pluginsDir, { recursive: true });
      const dest = path.join(pluginsDir, "UltraTranslateOverlay.js");
      let overlayContent = fs.readFileSync(overlayPath, "utf8");
      const gEngine = g.constArgs?.engine || "mz";
      const dictFile = "UltraTranslations.json";
      overlayContent = overlayContent.replace("__DICT_FILENAME__", dictFile);
      const cfg = handlers.loadCfg();
      const wrapLimit =
        cfg.wordWrapLimit !== undefined ? cfg.wordWrapLimit : 50;
      overlayContent = overlayContent.replace("__WORD_WRAP_LIMIT__", wrapLimit);
      fs.writeFileSync(dest, overlayContent, "utf8");
      const pluginListPath = path.join(wwwDir, "js", "plugins.json");
      if (fs.existsSync(pluginListPath)) {
        try {
          const plugins = JSON.parse(fs.readFileSync(pluginListPath, "utf8"));
          if (!plugins.some((p) => p.name === "UltraTranslateOverlay")) {
            plugins.push({
              name: "UltraTranslateOverlay",
              status: "on",
              description: "Runtime overlay",
            });
            fs.writeFileSync(
              pluginListPath,
              JSON.stringify(plugins, null, 2),
              "utf8",
            );
          }
        } catch (e) {}
      }
      log("info", "Overlay installed for " + path.basename(exe));
      return true;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  // ===== UNITY TOOLS =====
  installUnity({ gameKey }) {
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const exeName = path.basename(exe);
    try {
      const bepDir = path.join(gameDir, "BepInEx");
      if (!fs.existsSync(bepDir)) {
        fs.mkdirSync(path.join(bepDir, "plugins"), { recursive: true });
        fs.mkdirSync(path.join(bepDir, "config"), { recursive: true });
        fs.writeFileSync(
          path.join(bepDir, "config", "AutoTranslatorConfig.ini"),
          "[Service]\nEndpoint=UltraBatch\n" +
            "[UltraBatch]\nUrl=http://127.0.0.1:7861/xbatch\nTranslationDelay=0.1\n" +
            "[General]\nLanguage=pt\nFromLanguage=ja\n",
          "utf8",
        );
      }
      // Copy batch plugin
      const pluginSrc = path.join(
        ROOT,
        "xunity_plugin",
        "UltraBatchEndpoint.dll",
      );
      if (fs.existsSync(pluginSrc)) {
        const pluginDst = path.join(
          bepDir,
          "plugins",
          "UltraBatchEndpoint.dll",
        );
        // Check if XUnity plugin folder exists
        const xunityPlugins = path.join(
          bepDir,
          "plugins",
          "XUnity.AutoTranslator.Plugin.Unity",
        );
        if (fs.existsSync(xunityPlugins)) {
          fs.copyFileSync(
            pluginSrc,
            path.join(xunityPlugins, "UltraBatchEndpoint.dll"),
          );
        } else {
          fs.copyFileSync(
            pluginSrc,
            path.join(bepDir, "plugins", "UltraBatchEndpoint.dll"),
          );
        }
      }
      log("info", "Unity installed for " + exeName);
      return true;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
  // ===== REN'PY TOOLS =====
  async extractRpa({ rpaPath, outputDir }) {
    if (!rpaPath || !fs.existsSync(rpaPath))
      return { ok: false, error: "RPA file not found" };
    const outDir =
      outputDir ||
      path.join(path.dirname(rpaPath), path.basename(rpaPath) + "_extracted");
    const script = path.join(ROOT, "unren_tools", "rpatool.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, ["-x", rpaPath, "-o", outDir]);
  },
  async packRpa({ inputDir, outputPath }) {
    if (!inputDir || !fs.existsSync(inputDir))
      return { ok: false, error: "Input directory not found" };
    const script = path.join(ROOT, "unren_tools", "rpatool.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "rpatool.py not found" };
    return runPythonScript(script, [
      "-c",
      outputPath || inputDir + ".rpa",
      inputDir,
    ]);
  },
  async decompileRpyc({ filePath, outputDir }) {
    if (!filePath || !fs.existsSync(filePath))
      return { ok: false, error: "File not found" };
    const script = path.join(ROOT, "unren_tools", "unrpyc.py");
    if (!fs.existsSync(script))
      return { ok: false, error: "unrpyc.py not found" };
    const args = ["--utf-8", filePath];
    if (outputDir) args.push("-o", outputDir);
    return runPythonScript(script, args);
  },
  // ===== RPG MAKER TOOLS =====
  async translateRpgMaker({ gameKey, overlay }) {
    // Full RPG Maker translation: pre-translate + optionally install overlay
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Game not found" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "EXE not found" };
    const gameDir = path.dirname(exe);
    const cfg = handlers.loadCfg();
    const eng = g.constArgs?.engine || detectEngine(exe);
    const eInfo = ENGINES_DEF[eng];
    let bakDir = "";
    if (eInfo && eInfo.js) {
      bakDir = await executeTranslationPipeline(
        gameDir,
        cfg,
        g.libConf?.title || gameKey,
      );
    }
    if (overlay) {
      try {
        await handlers.installOverlay({ gameKey });
      } catch (e) {}
    }
    return { backup: !!bakDir };
  },
  // ===== WOLF RPG TOOLS =====
  async extractWolf({ gamePath }) {
    if (!gamePath || !fs.existsSync(gamePath))
      return { ok: false, error: "Caminho do jogo Wolf não encontrado" };
    const uberWolfExe = path.join(ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    return new Promise((res) => {
      log("info", `Executando UberWolfCli.exe para extrair: ${gamePath}`);
      const proc = spawn(uberWolfExe, ["-o", "-u", "-x", gamePath], {
        timeout: 120000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          log("info", `UberWolfCli concluído. Saída: ${stdout}`);
          res({ ok: true, output: stdout });
        } else {
          log(
            "error",
            `Falha ao executar UberWolfCli. Código: ${code}. Erro: ${stderr}`,
          );
          res({ ok: false, error: stderr || `Código de saída: ${code}` });
        }
      });
      proc.on("error", (err) => {
        log("error", `Erro ao iniciar UberWolfCli: ${err.message}`);
        res({ ok: false, error: err.message });
      });
    });
  },
  async packWolf({ inputDir, versionIndex }) {
    if (!inputDir || !fs.existsSync(inputDir))
      return { ok: false, error: "Pasta de origem não encontrada" };
    const uberWolfExe = path.join(ROOT, "resources", "UberWolfCli.exe");
    if (!fs.existsSync(uberWolfExe))
      return {
        ok: false,
        error: "UberWolfCli.exe não encontrado em resources",
      };

    const verIdx = versionIndex !== undefined ? String(versionIndex) : "4";

    return new Promise((res) => {
      log(
        "info",
        `Executando UberWolfCli.exe para empacotar: ${inputDir} com versão index ${verIdx}`,
      );
      const proc = spawn(uberWolfExe, ["-p", verIdx, inputDir], {
        timeout: 120000,
      });
      let stdout = "",
        stderr = "";
      proc.stdout.on("data", (d) => (stdout += d));
      proc.stderr.on("data", (d) => (stderr += d));
      proc.on("exit", (code) => {
        if (code === 0) {
          log(
            "info",
            `UberWolfCli reempacotamento concluído. Saída: ${stdout}`,
          );
          res({ ok: true, output: stdout });
        } else {
          log(
            "error",
            `Falha ao empacotar com UberWolfCli. Código: ${code}. Erro: ${stderr}`,
          );
          res({ ok: false, error: stderr || `Código de saída: ${code}` });
        }
      });
      proc.on("error", (err) => {
        log("error", `Erro ao empacotar com UberWolfCli: ${err.message}`);
        res({ ok: false, error: err.message });
      });
    });
  },
  async unpackEvb({ exePath, destDir }) {
    if (!exePath || !fs.existsSync(exePath))
      return { ok: false, error: "Arquivo executável não encontrado" };
    const outDir =
      destDir ||
      path.join(
        path.dirname(exePath),
        path.basename(exePath, ".exe") + "_extracted",
      );
    const script = path.join(ROOT, "resources", "evb", "evb_unpack.py");
    if (!fs.existsSync(script))
      return {
        ok: false,
        error: "Script evb_unpack.py não encontrado nos recursos.",
      };

    try {
      log(
        "info",
        `Executando descompactação EVB para: ${exePath} na pasta ${outDir}`,
      );
      const stdout = await runPythonScript(script, [exePath, outDir]);
      log(
        "success",
        `Descompactação EVB concluída com sucesso para: ${outDir}`,
      );
      return { ok: true, path: outDir };
    } catch (e) {
      log("error", "Falha ao descompactar EVB: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  // ===== EXCEL EXPORT/IMPORT TOOLS =====
  async exportExcel({ gameKey }) {
    const ExcelJS = require("exceljs");
    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    const cacheFile = path.join(gameDir, "trans_cache.json");
    let translationsToExport = [];

    if (fs.existsSync(cacheFile)) {
      try {
        const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        const cacheTranslations = cd.translations || {};
        for (const [k, v] of Object.entries(cacheTranslations)) {
          const firstColonIdx = k.indexOf(":");
          const secondColonIdx = k.indexOf(":", firstColonIdx + 1);
          let originalText = "";
          if (secondColonIdx !== -1) {
            originalText = k.slice(secondColonIdx + 1);
          } else {
            originalText = k;
          }
          translationsToExport.push({
            key: k,
            original: originalText,
            translated: v,
          });
        }
      } catch (e) {
        log("warn", "Erro ao ler cache local do jogo: " + e.message);
      }
    }

    if (translationsToExport.length === 0) {
      log(
        "info",
        "Gerando lista de strings diretamente dos arquivos do jogo...",
      );
      try {
        const texts = extractGameTexts(gameDir);
        const seenKeys = new Set();
        for (const t of texts) {
          const k = t.file + ":" + t.keys.join(".") + ":" + t.original;
          if (seenKeys.has(k)) continue;
          seenKeys.add(k);
          translationsToExport.push({
            key: k,
            original: t.original,
            translated: "",
          });
        }
      } catch (e) {
        return {
          ok: false,
          error: "Falha ao extrair textos para exportação: " + e.message,
        };
      }
    }

    if (translationsToExport.length === 0) {
      return {
        ok: false,
        error: "Nenhuma string encontrada no jogo para exportar.",
      };
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Traduções");

      worksheet.columns = [
        { header: "Chave de Referência (NÃO EDITAR)", key: "key", width: 50 },
        { header: "Texto Original", key: "original", width: 60 },
        { header: "Tradução", key: "translated", width: 60 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      for (const item of translationsToExport) {
        worksheet.addRow({
          key: item.key,
          original: item.original,
          translated: item.translated,
        });
      }

      const desktop = path.join(require("os").homedir(), "Desktop");
      const title = g.libConf?.title || gameKey;
      const exportFile = path.join(desktop, `${title}_traducoes.xlsx`);

      await workbook.xlsx.writeFile(exportFile);
      log("success", `Exportação Excel concluída. Salvo em: ${exportFile}`);
      exec(`explorer /select,"${exportFile}"`);
      return { ok: true, path: exportFile };
    } catch (e) {
      log("error", "Falha ao gerar arquivo Excel: " + e.message);
      return { ok: false, error: e.message };
    }
  },
  async importExcel({ gameKey, excelPath }) {
    const ExcelJS = require("exceljs");
    if (!excelPath || !fs.existsSync(excelPath))
      return { ok: false, error: "Arquivo Excel não encontrado" };

    const games = handlers.loadGames().games;
    const g = games[gameKey];
    if (!g) return { ok: false, error: "Jogo não encontrado" };
    const exe = g.constArgs?.gameExe || "";
    if (!exe || !fs.existsSync(exe))
      return { ok: false, error: "Executável do jogo não encontrado" };
    const gameDir = path.dirname(exe);

    try {
      log("info", "Lendo traduções do arquivo Excel: " + excelPath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      const worksheet = workbook.getWorksheet(1);

      const importedTranslations = {};
      let count = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const key = row.getCell(1).value;
        const translated = row.getCell(3).value;

        if (
          key &&
          typeof key === "string" &&
          translated !== undefined &&
          translated !== null
        ) {
          let val = String(translated).trim();
          if (val) {
            importedTranslations[key] = val;
            count++;
          }
        }
      });

      if (count === 0) {
        return {
          ok: false,
          error: "Nenhuma tradução válida encontrada no arquivo Excel",
        };
      }

      const cacheFile = path.join(gameDir, "trans_cache.json");
      const cfg = handlers.loadCfg();
      const sl = cfg.sl || "auto";
      const tl = cfg.tl || "pt";
      const engine = cfg.engine || "google";
      const cfgKey = sl + "|" + tl + "|" + engine;

      let existingTranslations = {};
      if (fs.existsSync(cacheFile)) {
        try {
          const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
          existingTranslations = cd.translations || {};
        } catch (e) {
          log(
            "warn",
            "Erro ao ler cache existente para mesclagem: " + e.message,
          );
        }
      }

      for (const [k, v] of Object.entries(importedTranslations)) {
        existingTranslations[k] = v;
      }

      fs.writeFileSync(
        cacheFile,
        JSON.stringify(
          {
            cfgKey: cfgKey,
            translations: existingTranslations,
          },
          null,
          2,
        ),
      );

      log(
        "success",
        `Importação de Excel concluída com sucesso! ${count} traduções mescladas.`,
      );
      return { ok: true, count: count };
    } catch (e) {
      log("error", "Falha ao importar arquivo Excel: " + e.message);
      return { ok: false, error: e.message };
    }
  },
};

// ==================== HTTP SERVER ====================
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://localhost");
  const pathname = parsed.pathname;

  if (pathname === "/api/rpc" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { method, params } = JSON.parse(body);
        const handler = handlers[method];
        if (!handler) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ ok: false, error: "Unknown method: " + method }),
          );
          return;
        }
        const result = await handler(params);
        const isErr =
          result && typeof result === "object" && result.ok === false;
        const httpCode = isErr ? 400 : 200;
        res.writeHead(httpCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(isErr ? result : { ok: true, data: result }));
      } catch (e) {
        res.writeHead(500, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  let filePath = path.join(WWW_DIR, pathname === "/" ? "index.html" : pathname);
  // Segurança: normalizar e verificar se realmente está dentro de WWW_DIR
  filePath = path.normalize(filePath);
  if (
    !filePath.startsWith(WWW_DIR + path.sep) &&
    filePath !== WWW_DIR &&
    !pathname.startsWith("/resources/") &&
    !pathname.startsWith("/loaders/")
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (
        pathname.startsWith("/loaders/") ||
        pathname.startsWith("/resources/")
      ) {
        fs.readFile(path.join(ROOT, pathname.replace(/^\//, "")), (e2, d2) => {
          if (e2) {
            res.writeHead(404);
            res.end("Not found");
          } else {
            res.writeHead(200, {
              "Content-Type": MIME[ext] || "application/octet-stream",
            });
            res.end(d2);
          }
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
    });
    res.end(data);
  });
});

const PID_FILE = path.join(DATA_DIR, "server.pid");

// Kill stale instance from previous run — mas APENAS se ainda estiver vivo e for nosso processo
try {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (oldPid > 0 && oldPid !== process.pid) {
      try {
        // Verifica se o processo existe (signal 0 = teste, não mata)
        process.kill(oldPid, 0);
        // Se chegou aqui, o processo existe — tenta matar só se for node (seguro)
        try {
          const cmd =
            process.platform === "win32"
              ? "taskkill /PID " + oldPid + " /F 2>nul"
              : "kill -9 " + oldPid + " 2>/dev/null";
          const { execSync } = require("child_process");
          execSync(cmd);
        } catch (e) {}
      } catch (e) {
        // Processo não existe — sem ação
      }
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {}
    }
  }
} catch (e) {}

let isCleaningUp = false;
const cleanup = () => {
  if (isCleaningUp) return;
  isCleaningUp = true;
  try {
    fs.unlinkSync(PID_FILE);
  } catch (e) {}
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
// NÃO usar process.on('exit',cleanup) — isso causaria loop infinito pois cleanup chama process.exit()

let PORT = 3000;
function tryListen(port) {
  server.removeAllListeners("error");
  server.listen(port, () => {
    PORT = server.address().port;
    fs.writeFileSync(PID_FILE, String(process.pid));
    log("success", "OpenTranslator server running on http://localhost:" + PORT);
    console.log("OpenTranslator server running on http://localhost:" + PORT);
    const url = "http://localhost:" + PORT;
    const chromePaths = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
      path.join(
        process.env.LocalAppData || "",
        "Google\\Chrome\\Application\\chrome.exe",
      ),
    ];
    const edgePaths = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Microsoft\\Edge\\Application\\msedge.exe",
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Microsoft\\Edge\\Application\\msedge.exe",
      ),
    ];
    let chromePath = chromePaths.find((p) => fs.existsSync(p));
    let edgePath = edgePaths.find((p) => fs.existsSync(p));

    try {
      if (chromePath) {
        exec(
          'start "" "' +
            chromePath +
            '" --app="' +
            url +
            '" --window-size=960,660',
        );
      } else if (edgePath) {
        exec(
          'start "" "' +
            edgePath +
            '" --app="' +
            url +
            '" --window-size=960,660',
        );
      } else {
        exec('start "" "' + url + '"');
      }
    } catch (e) {
      try {
        exec('start "" "' + url + '"');
      } catch (err) {}
    }
  });
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log("Port " + port + " busy, trying " + (port + 1) + "...");
      tryListen(port + 1);
    } else {
      console.error("Server error:", e.message);
    }
  });
}

tryListen(PORT);

function startHookServer() {
  try {
    const whttp = require("http");
    const WebSocket = require("ws");

    const hookHttpServer = whttp.createServer(async (req, res) => {
      const parsed = new URL(req.url, "http://localhost");
      const pathname = parsed.pathname;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        });
        res.end();
        return;
      }

      if (pathname === "/cheat_poll") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const state = JSON.parse(body);
            lastGameState = state;
            lastCheatPollTime = Date.now();
            log("success", "Cheat poll recebido do jogo com sucesso!");
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*",
            });
            res.end(JSON.stringify(pendingCheatCommands));
            pendingCheatCommands = [];
          } catch (e) {
            log("error", "Falha ao processar cheat poll: " + e.message);
            res.writeHead(400, {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "*",
            });
            res.end("Invalid JSON");
          }
        });
        return;
      }

      if (
        pathname === "/translate" ||
        pathname === "/xbatch" ||
        pathname === "/batch"
      ) {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            let text = "";
            let texts = [];

            const queryText =
              parsed.searchParams.get("text") || parsed.searchParams.get("q");
            if (queryText) {
              text = queryText;
            } else if (body) {
              try {
                const data = JSON.parse(body);
                if (Array.isArray(data)) {
                  texts = data;
                } else if (Array.isArray(data.text)) {
                  texts = data.text;
                } else if (Array.isArray(data.texts)) {
                  texts = data.texts;
                } else {
                  text = data.text || data.original || data.q || "";
                }
              } catch (e) {
                const params = new URLSearchParams(body);
                text = params.get("text") || params.get("q") || body;
              }
            }

            const querySl =
              parsed.searchParams.get("from") ||
              parsed.searchParams.get("sl") ||
              parsed.searchParams.get("source");
            const queryTl =
              parsed.searchParams.get("to") ||
              parsed.searchParams.get("tl") ||
              parsed.searchParams.get("target");

            let reqSl = querySl;
            let reqTl = queryTl;

            if (body && (!reqSl || !reqTl)) {
              try {
                const data = JSON.parse(body);
                reqSl =
                  reqSl ||
                  data.from ||
                  data.sl ||
                  data.source ||
                  data.source_lang;
                reqTl =
                  reqTl ||
                  data.to ||
                  data.tl ||
                  data.target ||
                  data.target_lang;
              } catch (e) {
                const params = new URLSearchParams(body);
                reqSl =
                  reqSl ||
                  params.get("from") ||
                  params.get("sl") ||
                  params.get("source");
                reqTl =
                  reqTl ||
                  params.get("to") ||
                  params.get("tl") ||
                  params.get("target");
              }
            }

            const cfg = handlers.loadCfg();
            const sl = reqSl || cfg.sl || "auto";
            const tl = reqTl || cfg.tl || "pt";
            const engine = cfg.engine || "google";

            if (texts.length > 0) {
              log(
                "info",
                "Hook HTTP Batch translating " + texts.length + " items",
              );
              const glossary = loadGlossary();
              const formattedTexts = texts.map((t, idx) => ({
                id: idx,
                clean: t,
                original: t,
              }));
              const translatedMap = await translateBatch(
                formattedTexts,
                sl,
                tl,
                engine,
                glossary,
              );
              const responseTexts = texts.map(
                (t, idx) => translatedMap.get(idx) || t,
              );
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  translations: responseTexts.map((tr, idx) => ({
                    original: texts[idx],
                    translated: tr,
                  })),
                  text: responseTexts,
                }),
              );
            } else if (text) {
              log("info", 'Hook HTTP Translating: "' + text + '"');
              const translated = await translateSingle(text, sl, tl, engine);
              log("info", 'Hook HTTP Translated: "' + translated + '"');
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "success",
                  translated: translated,
                  text: translated,
                }),
              );
            } else {
              res.writeHead(400);
              res.end("Empty request");
            }
          } catch (err) {
            res.writeHead(500);
            res.end(err.message);
          }
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });

    const hookWss = new WebSocket.Server({ server: hookHttpServer });
    hookWss.on("error", (e) => {
      log("error", "WS Hook Server error: " + e.message);
      console.error("WS Hook Server error:", e.message);
    });
    hookWss.on("connection", (ws) => {
      log("info", "Game hook connected via WebSocket to 16005");
      ws.on("message", async (message) => {
        try {
          const msgStr = message.toString();
          let data;
          try {
            data = JSON.parse(msgStr);
          } catch (e) {
            data = msgStr;
          }

          if (data && typeof data === "object") {
            if (data.type === "register_cheat_client") {
              activeCheatSocket = ws;
              log(
                "success",
                "Cheat overlay client registered successfully on WebSocket 16005",
              );
              return;
            }
            if (data.type === "game_state") {
              lastGameState = data;
              return;
            }
          }

          log("info", "WS Hook Received: " + msgStr);

          let text = "";
          if (typeof data === "string") {
            text = data;
          } else if (data && typeof data === "object") {
            text = data.text || data.original || data.q || "";
          }

          if (text) {
            const cfg = handlers.loadCfg();
            const sl = cfg.sl || "auto";
            const tl = cfg.tl || "pt";
            const engine = cfg.engine || "google";

            const translated = await translateSingle(text, sl, tl, engine);
            log("info", 'WS Hook Translated: "' + translated + '"');

            let response;
            if (typeof data === "object") {
              response = {
                ...data,
                translated: translated,
                text: translated,
              };
            } else {
              response = {
                original: text,
                translated: translated,
                text: translated,
              };
            }
            ws.send(JSON.stringify(response));
          }
        } catch (err) {
          log("error", "WS Hook error: " + err.message);
        }
      });
      ws.on("close", () => {
        log("info", "Game hook WebSocket connection closed");
        if (ws === activeCheatSocket) {
          activeCheatSocket = null;
          lastGameState = null;
        }
      });
    });
    hookHttpServer.on("error", (e) => {
      log("error", "Dual Hook Server error: " + e.message);
      console.error("Dual Hook Server error:", e.message);
    });

    hookHttpServer.listen(16005, "127.0.0.1", () => {
      log("success", "Dual Hook Server listening on port 16005");
    });
  } catch (e) {
    log("error", "Failed to initialize Dual Hook Server: " + e.message);
  }
}

startHookServer();
