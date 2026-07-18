const fs = require("fs");
const path = require("path");

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

// Para evitar dependência cíclica, importamos findDataDir sob demanda
function getFindDataDir() {
  return require("./gameEngine").findDataDir;
}

function extractGameTexts(gameDir) {
  const findDataDir = getFindDataDir();
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

            if (isJsCode(val)) {
              extractTextsFromJsCode(
                val,
                "../js/plugins.js",
                keys,
                texts,
                idxRef
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
                lastRealKey.toLowerCase().includes(sub)
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
      global.log("error", "Erro ao ler ou processar plugins.js: " + e.message);
    }
  }

  global.log("info", "Extracted " + texts.length + " texts from data files");
  return texts;
}

function isTranslatableText(clean) {
  const s = clean.trim();
  if (s.length < 1) return false;
  if (s.length === 1 && !/[^\x00-\x7F]/.test(s)) return false;
  if (/^[a-z]{2}[-_][A-Z]{2}$/.test(s)) return false;
  if (s.length <= 4 && /^[A-Z]+$/.test(s)) return false;
  if (/^[\d\s.,!?\-+%=*/<>()\[\]{}@#$^&;:'"`~|\\\/]+$/.test(s)) return false;

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

module.exports = {
  extractEscapeCodes,
  restoreEscapeCodes,
  isJsCode,
  extractTextsFromJsCode,
  extractGameTexts,
  isTranslatableText,
  addText,
  getValueAtPath,
  getLastRealKey
};
