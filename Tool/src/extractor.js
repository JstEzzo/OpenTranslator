/**
 * OpenTranslator — Módulo de Extração de Textos (Extractor)
 *
 * Refatorado com Arquitetura ES6 (TextExtractor Class), Otimização de Memória (In-Place Array Traversal),
 * Regexes Estritas de Código JavaScript e Tratamento Seguro de Exceções.
 */

const fs = require("fs");
const path = require("path");

// ==================== CONSTANTES DE FILTRAGEM ====================
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
  "bgName",
  "bmeName",
  "seName",
  "bgmName",
  "fontFace",
  "fontFileName",
  "mainFontFace",
  "subFontFace",
  "fontFile",
  "font",
  "file",
  "fileName",
  "graphic",
  "src",
  "path",
  "url",
  "icon",
  "audio",
  "bgm",
  "bgs",
  "me",
  "se",
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

const {
  MEDIA_EXT_RE,
  RESOURCE_PATH_RE,
  ESC_RE,
  logWarn,
  findDataDir,
  getValueAtPath,
  getLastRealKey,
  isTranslatableText,
} = require("./utils");

// ==================== ANALISADOR DE CÓDIGO JAVASCRIPT ====================
/**
 * Detecta se uma string contém código ou instrução JavaScript real.
 * Emprega expressões regulares de contexto estrito para evitar falsos positivos em diálogos e ReDoS.
 */
function isJsCode(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t.length < 3) return false;

  // Comentários JS
  if (/^\/\//.test(t) || /^\/\*/.test(t)) return true;

  // Declarações de variáveis e arrow functions
  if (/\b(const|let|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/i.test(t)) return true;
  if (/\bfunction\s*\([^)]*\)\s*\{/i.test(t) || /=>\s*\{?/.test(t)) return true;
  if (/\btypeof\s+[a-zA-Z_$]/i.test(t) || /\binstanceof\s+[a-zA-Z_$]/i.test(t)) return true;

  // Retorno de instrução JS estrita (ReDoS-free)
  if (/\breturn\s+(true|false|null|undefined|this|\$[a-zA-Z0-9_$]+|\d+)\s*;?/i.test(t)) return true;
  if (/^return\b.*[;=]$/m.test(t)) return true;

  // Referências a propriedades e objetos nativos de motores RPG Maker
  if (/\$(game|data)[A-Z][a-zA-Z0-9_]*/.test(t)) return true;
  if (/\bthis\._[a-zA-Z0-9_]+/.test(t) || /\bthis\.[a-zA-Z0-9_]+\s*\(/.test(t)) return true;
  if (/\bMath\.(floor|ceil|round|abs|random|max|min)\b/.test(t)) return true;
  if (/\b(window|document|console|Graphics|AudioManager|ImageManager|SceneManager)\./.test(t)) return true;

  return false;
}

// ==================== ISOLAMENTO DE CÓDIGOS DE ESCAPE ====================
function extractEscapeCodes(text) {
  const parts = [];
  let lastIdx = 0;
  let clean = "";
  let match;
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
  if (parts.every((p) => p.idx === 0)) {
    return parts.map((p) => p.code).join("") + fixed;
  }
  let result = fixed;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.idx === 0) {
      result = p.code + result;
    } else if (p.idx <= result.length) {
      result = result.slice(0, p.idx) + p.code + result.slice(p.idx);
    } else {
      result += p.code;
    }
  }
  return result;
}

// ==================== CLASSE PRINCIPAL DE EXTRAÇÃO ====================
class TextExtractor {
  constructor(gameDir) {
    this.gameDir = gameDir;
    this.texts = [];
    this.idx = 0;
    this.currentFile = "";
    this.currentData = null;
    this.gameMediaFiles = new Set();
  }

  buildMediaIndex() {
    this.gameMediaFiles.clear();
    const findDataDir = getFindDataDir();
    const dataDir = findDataDir(this.gameDir);
    const wwwDir = dataDir ? path.dirname(dataDir) : this.gameDir;

    const searchDirs = [
      path.join(wwwDir, "img"),
      path.join(wwwDir, "audio"),
      path.join(wwwDir, "movies"),
      path.join(wwwDir, "fonts"),
      path.join(this.gameDir, "img"),
      path.join(this.gameDir, "audio"),
    ];

    const scanDir = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else {
            const ext = path.extname(item);
            const baseName = path.basename(item, ext);
            this.gameMediaFiles.add(item.toLowerCase());
            this.gameMediaFiles.add(baseName.toLowerCase());
          }
        }
      } catch (e) {}
    };

    searchDirs.forEach((d) => scanDir(d));
  }

  extract() {
    const findDataDir = getFindDataDir();
    const dataDir = findDataDir(this.gameDir);
    if (!dataDir) return [];

    this.buildMediaIndex();

    let files = [];
    try {
      files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
    } catch (e) {
      logWarn(`[Extractor] Falha ao ler diretório de dados em ${dataDir}: ${e.message}`);
      return [];
    }

    for (const file of files) {
      this.currentFile = file;
      try {
        const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
        this.currentData = JSON.parse(raw);
        this.walk(this.currentData, []);
      } catch (e) {
        logWarn(`[Extractor] Falha ao ler/analisar JSON ${file}: ${e.message}`);
      }
    }

    this.extractFromPlugins(dataDir);
    return this.texts;
  }

  /**
   * Navegação em profundidade (DFS) in-place na árvore JSON sem clonar arrays a cada nó.
   * Reduz alocações de memória temporária e pressão no Garbage Collector.
   */
  walk(obj, keys) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const v = obj[i];
        keys.push(i);
        if (typeof v === "string") {
          this.checkString(v, keys);
        } else if (v && typeof v === "object") {
          this.walk(v, keys);
        }
        keys.pop();
      }
      return;
    }
    for (const key in obj) {
      if (key === "meta") continue;
      const val = obj[key];
      keys.push(key);
      if (typeof val === "string") {
        this.checkString(val, keys);
      } else if (val && typeof val === "object") {
        this.walk(val, keys);
      }
      keys.pop();
    }
  }

  checkString(val, keys) {
    if (typeof val !== "string") return;
    const cleanVal = val.trim();
    if (!cleanVal) return;

    // Filtro estrito para caminhos, extensoes e nomes de midias/recursos em disco
    if (
      MEDIA_EXT_RE.test(cleanVal) ||
      RESOURCE_PATH_RE.test(cleanVal) ||
      (this.gameMediaFiles && this.gameMediaFiles.has(cleanVal.toLowerCase()))
    ) {
      return;
    }

    const key = keys[keys.length - 1];
    if (typeof key === "string" && SKIP_KEYS.has(key)) return;

    if (key === "name" && keys.length >= 2) {
      const parentKeys = keys.slice(0, -1);
      const parent = getValueAtPath(this.currentData, parentKeys);
      if (
        parent &&
        typeof parent === "object" &&
        ("pan" in parent || "volume" in parent || "pitch" in parent)
      ) {
        return;
      }
    }

    if (isJsCode(val)) {
      this.extractTextsFromJsCode(val, this.currentFile, keys);
      return;
    }

    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(val)) {
      const paramsIdx = keys.lastIndexOf("parameters");
      if (paramsIdx >= 1) {
        const cmdPath = keys.slice(0, paramsIdx);
        const cmd = getValueAtPath(this.currentData, cmdPath);
        if (cmd && typeof cmd === "object" && typeof cmd.code === "number") {
          const nonDialogueCodes = new Set([231, 232, 281, 241, 245, 249, 250, 132, 133, 139, 322, 323]);
          if (nonDialogueCodes.has(cmd.code)) return;
        }
      }
      return this.addTextEntry(this.currentFile, keys, val);
    }

    if (key === "name") {
      if (
        this.currentFile === "Tilesets.json" ||
        this.currentFile === "Animations.json" ||
        this.currentFile === "Troops.json" ||
        this.currentFile === "CommonEvents.json" ||
        (this.currentFile.startsWith("Map") && this.currentFile.endsWith(".json"))
      ) {
        return;
      }
    }

    if (typeof key === "string" && TEXT_FIELDS.has(key)) {
      return this.addTextEntry(this.currentFile, keys, val);
    }
    if (typeof key === "string" && ARRAY_LABELS.has(key)) {
      return this.addTextEntry(this.currentFile, keys, val);
    }
    if (
      keys.length >= 2 &&
      keys.some((k) => typeof k === "string" && ARRAY_LABELS.has(k))
    ) {
      return this.addTextEntry(this.currentFile, keys, val);
    }

    const paramsIdx = keys.lastIndexOf("parameters");
    if (paramsIdx >= 1) {
      const cmdPath = keys.slice(0, paramsIdx);
      const cmd = getValueAtPath(this.currentData, cmdPath);
      if (cmd && typeof cmd === "object") {
        const pi = keys[keys.length - 1];
        if (cmd.code === 401 || cmd.code === 405) {
          return this.addTextEntry(this.currentFile, keys, val);
        }
        if (cmd.code === 101 && pi === 4) {
          return this.addTextEntry(this.currentFile, keys, val);
        }
        if (cmd.code === 102) {
          return this.addTextEntry(this.currentFile, keys, val);
        }
        if (cmd.code === 320 || cmd.code === 324) {
          return this.addTextEntry(this.currentFile, keys, val);
        }
        if (
          (cmd.code === 355 || cmd.code === 655) &&
          typeof val === "string" &&
          val.startsWith("テキスト-")
        ) {
          return this.addTextEntry(this.currentFile, keys, val.substring(5));
        }
      }
    }

    if (keys.includes("terms")) {
      if (
        keys.includes("basic") ||
        keys.includes("params") ||
        keys.includes("messages")
      ) {
        return;
      }
      return this.addTextEntry(this.currentFile, keys, val);
    }
  }

  addTextEntry(file, keys, original) {
    const { clean, parts } = extractEscapeCodes(original);
    if (!isTranslatableText(clean)) return;
    this.texts.push({
      id: this.idx++,
      file,
      keys: keys.slice(), // snapshot do array in-place no momento da gravacao
      original,
      clean: clean.trim(),
      escapeParts: parts,
    });
  }

  extractTextsFromJsCode(val, file, keys) {
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
        this.texts.push({
          id: this.idx++,
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

  extractFromPlugins(dataDir) {
    const wwwDir = path.dirname(dataDir);
    const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
    if (!fs.existsSync(pluginsJsPath)) return;

    try {
      const content = fs.readFileSync(pluginsJsPath, "utf8");
      const startIdx = content.indexOf("[");
      const endIdx = content.lastIndexOf("]");
      if (startIdx < 0 || endIdx < 0) return;

      const jsonStr = content.slice(startIdx, endIdx + 1);
      const plugins = JSON.parse(jsonStr);

      const self = this;
      function extractParam(val, keys) {
        if (typeof val !== "string" || val.length === 0) return;

        if (
          (val.startsWith("[") && val.endsWith("]")) ||
          (val.startsWith("{") && val.endsWith("}"))
        ) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === "object") {
              extractParamObject(parsed, [...keys, "__json__"]);
              return;
            }
          } catch (e) {}
        }

        if (isJsCode(val)) {
          self.extractTextsFromJsCode(val, "../js/plugins.js", keys);
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
        if (MEDIA_EXT_RE.test(clean) || RESOURCE_PATH_RE.test(clean)) return;

        if (isTranslatableText(clean)) {
          const { clean: c, parts } = extractEscapeCodes(val);
          if (isTranslatableText(c)) {
            self.texts.push({
              id: self.idx++,
              file: "../js/plugins.js",
              keys: keys.slice(),
              original: val,
              clean: c.trim(),
              escapeParts: parts,
            });
          }
        }
      }

      function extractParamObject(obj, keys) {
        if (Array.isArray(obj)) {
          obj.forEach((v, i) => {
            extractParam(v, [...keys, i]);
          });
        } else if (obj && typeof obj === "object") {
          for (const k in obj) {
            extractParam(obj[k], [...keys, k]);
          }
        }
      }

      if (Array.isArray(plugins)) {
        plugins.forEach((p, pi) => {
          if (p && p.status && p.status !== "false" && p.parameters) {
            const pkeys = ["__plugins__", pi, "parameters"];
            for (const paramKey in p.parameters) {
              extractParam(p.parameters[paramKey], [...pkeys, paramKey]);
            }
          }
        });
      }
    } catch (e) {
      logWarn(`[Extractor] Falha ao analisar plugins.js: ${e.message}`);
    }
  }
}

// ==================== FUNÇÃO DE INTERFACE PÚBLICA ====================
function extractGameTexts(gameDir) {
  const extractor = new TextExtractor(gameDir);
  return extractor.extract();
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

function extractTextsFromJsCode(val, file, keys, texts, idxRef) {
  const extractor = new TextExtractor("");
  extractor.texts = texts;
  extractor.idx = idxRef.val;
  extractor.extractTextsFromJsCode(val, file, keys);
  idxRef.val = extractor.idx;
}

// ==================== EXPORTAÇÕES DO MÓDULO ====================
module.exports = {
  extractEscapeCodes,
  restoreEscapeCodes,
  isJsCode,
  extractTextsFromJsCode,
  extractGameTexts,
  isTranslatableText,
  addText,
  getValueAtPath,
  getLastRealKey,
  TextExtractor,
};
