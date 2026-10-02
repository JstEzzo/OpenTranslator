/**
 * extractor.js — Módulo de Extração de Textos e Processamento Estrutural
 *
 * Responsabilidades:
 * - Extração de texto de múltiplos formatos de jogos (JSON RPG Maker, scripts, diálogos)
 * - Identificação e isolamento de códigos de escape, tags e identificadores de scripts
 * - Filtragem seletiva de campos de texto vs código JavaScript/metadados
 * - Navegação in-place em árvores de objetos/arrays com otimização de memória
 *
 * Camada Arquitetural:
 * Domínio / Extração e Normalização de Textos (Text Extraction & Processing Layer)
 *
 * Principais Componentes:
 * - TextExtractor Class
 * - extractGameTexts()
 * - extractEscapeCodes() / restoreEscapeCodes()
 * - isJsCode()
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
  "commands",
  "variables",
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
  "option",
  "speed",
  "suffix",
  "prefix",
  "slot",
  "category",
  "usable",
  "item",
  "playtime",
  "count",
  "cost",
  "tag",
  "status",
  "button",
  "prompt",
  "dialog",
  "hint",
  "type",
  "mode",
  "标签",
  "名称",
  "说明",
  "提示"
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
  isCodeOrFormulaKey,
  isAudioParamKey,
} = require("./utils");

const HTML_TAG_RE = /<\/?(div|span|body|head|html|video|script|style|iframe|canvas|img|a|font|br|hr|p|title|meta|link|table|tr|td|th|ul|ol|li|h[1-6])\b/i;

// ==================== FILTRO DE NOMES DE PARÂMETROS JAPONES ====================
const PLUGIN_PARAM_NAME_RE = /^(X|Y|Z)?[座標選択画像名スケール入力項目値番号ID|引数]$/;
const KNOWN_JP_PARAM_NAMES = new Set([
  "X座標", "Y座標", "Z座標", "座標", "選択肢名", "画像", "名前", "説明", "スケール",
  "拡大率", "入力", "項目", "値", "番号", "ID", "引数", "テキスト", "パラメータ",
]);
function isShortParamName(val) {
  if (typeof val !== "string") return false;
  const t = val.trim();
  if (t.length > 12) return false;
  if (KNOWN_JP_PARAM_NAMES.has(t)) return true;
  if (/^[X]?座標$/.test(t)) return true;
  return false;
}

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
  const cleanLen = clean.length;
  for (const p of parts) {
    p.origLen = cleanLen;
    if (p.idx >= cleanLen) p.isEnd = true;
  }
  return { clean, parts };
}

function restoreEscapeCodes(translated, parts) {
  let fixed = translated.replace(/%\s+(\d+)/g, "%$1");
  if (!parts || parts.length === 0) return fixed;
  if (parts.every((p) => p.idx === 0)) {
    return parts.map((p) => p.code).join("") + fixed;
  }
  let result = fixed;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.idx === 0) {
      result = p.code + result;
    } else if (p.isEnd || (p.origLen && p.idx >= p.origLen) || p.idx >= result.length) {
      result = result + p.code;
    } else {
      result = result.slice(0, p.idx) + p.code + result.slice(p.idx);
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
        let raw = fs.readFileSync(path.join(dataDir, file), "utf8");
        if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
        this.currentData = JSON.parse(raw);
        this.walk(this.currentData, []);
      } catch (e) {
        logWarn(`[Extractor] Falha ao ler/analisar JSON ${file}: ${e.message}`);
      }
    }

    this.extractFromPlugins(dataDir);
    this.extractFromPluginScripts(this.gameDir);
    this.extractFromTilesetTxt(this.gameDir);
    this.extractFromCsv(this.gameDir);
    this.extractFromHtml(this.gameDir);
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
      if (key === "meta" || key === "_original") continue;
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

    // Skip values that are JSON config strings (embedded plugin configs)
    if (
      (cleanVal.startsWith("{") && cleanVal.endsWith("}")) &&
      cleanVal.length > 10
    ) {
      try {
        JSON.parse(cleanVal);
        return;
      } catch (e) {
        if (cleanVal.includes('":') || cleanVal.includes('\\":')) return;
      }
    }

    // Also skip JSON arrays that contain config objects with key-value pairs
    if (
      (cleanVal.startsWith("[") && cleanVal.endsWith("]")) &&
      cleanVal.length > 10
    ) {
      try {
        const parsed = JSON.parse(cleanVal);
        if (Array.isArray(parsed) && parsed.some((item) => typeof item === "object")) {
          return;
        }
        if (cleanVal.includes('":') || cleanVal.includes('\\":')) return;
      } catch (e) {
        if (cleanVal.includes('":') || cleanVal.includes('\\":')) return;
      }
    }

    // Filtro estrito para caminhos, extensoes e nomes de midias/recursos em disco
    if (
      MEDIA_EXT_RE.test(cleanVal) ||
      RESOURCE_PATH_RE.test(cleanVal) ||
      (this.gameMediaFiles && this.gameMediaFiles.has(cleanVal.toLowerCase()))
    ) {
      return;
    }

    // Skip strings containing HTML tags (web overlays, error pages, video embeds)
    if (HTML_TAG_RE.test(cleanVal)) return;

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
          // In event command 357 (Plugin Command), parameters[1] is the command name — skip it
          if (cmd.code === 357 && key === 1) return;
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
      if (!isTranslatableText(clean)) continue;
      const trimmed = clean.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          JSON.parse(trimmed);
          continue;
        } catch (e) {
          if (trimmed.includes('":') || trimmed.includes('\\":')) continue;
        }
      }
      if (HTML_TAG_RE.test(trimmed)) continue;
      // Não extrai blocos de código JS contendo keywords ou sentenças executáveis
      if (/\b(var|let|const|function|return|typeof|instanceof)\b/i.test(trimmed)) continue;
      if (/\b(this\.|SceneManager\.|Graphics\.|AudioManager\.|Math\.)/.test(trimmed)) continue;
      if (trimmed.includes(";\n") || trimmed.includes(";\r\n") || (trimmed.includes(";") && trimmed.length > 50)) continue;
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

        const rawKey = getLastRealKey(keys);
        const lastRealKey = rawKey.toLowerCase();
        const isUnsafe = isCodeOrFormulaKey(lastRealKey) || isAudioParamKey(rawKey);
        if (isUnsafe) return;

        if (isJsCode(val)) {
          self.extractTextsFromJsCode(val, "../js/plugins.js", keys);
          return;
        }

        const isSafe = SAFE_PARAM_KEYS.some((sub) =>
          lastRealKey.includes(sub)
        );
        if (!isSafe) return;

        const clean = val.trim();
        if (MEDIA_EXT_RE.test(clean) || RESOURCE_PATH_RE.test(clean)) return;
        if (self.gameMediaFiles && self.gameMediaFiles.has(clean.toLowerCase())) return;
        if (/^(?:rgba?|hsla?)\s*\([^)]*\)$|^#[0-9a-fA-F]{3,8}$|^(?:white|black|red|green|blue|yellow|orange|purple|gray|grey|transparent)$/i.test(clean)) return;

        const { clean: c, parts } = extractEscapeCodes(clean);
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

  /**
   * Extrai textos traduzíveis de arquivos .js de plugins individuais.
   * Foca em strings literais que podem ser diálogos ou mensagens.
   */
  extractFromPluginScripts(gameDir) {
    const wwwDir = fs.existsSync(path.join(gameDir, "www"))
      ? path.join(gameDir, "www")
      : gameDir;
    const pluginsDir = path.join(wwwDir, "js", "plugins");
    if (!fs.existsSync(pluginsDir)) return;

    const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    for (const pf of pluginFiles) {
      const full = path.join(pluginsDir, pf);
      let content;
      try {
        content = fs.readFileSync(full, "utf8");
      } catch (e) {
        logWarn(`[Extractor] Falha ao ler plugin ${pf}: ${e.message}`);
        continue;
      }

      // Match string literals: "..." and '...'
      const STR_RE = /(["'])((?:[^"'\x5C]|\\.)*?)\1/g;
      let match;
      while ((match = STR_RE.exec(content)) !== null) {
        const val = match[2];
        if (isJsCode(val)) continue;
        if (!isTranslatableText(val)) continue;
        const trimmed = val.trim();
        // Skip Japanese parameter names in JSDoc comments (structural keys like 座標, 選択肢名)
        if (
          isShortParamName(val)
        ) continue;
        if (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
          try {
            JSON.parse(trimmed);
            continue;
          } catch (e) {
            if (trimmed.includes('":') || trimmed.includes('\\":')) continue;
          }
        }
        if (HTML_TAG_RE.test(trimmed)) continue;
        this.texts.push({
          id: this.idx++,
          file: path.join("js", "plugins", pf).replace(/\\/g, "/"),
          keys: [0, "raw", match.index],
          original: val,
          clean: val.trim(),
          escapeParts: [],
        });
      }
    }
  }

  /**
   * Extrai textos japoneses de arquivos .txt de tilesets.
   * Formatos suportados:
   * - "English|Japanese" (pipe-separated)
   * - Japanese text em linhas soltas
   */
  extractFromTilesetTxt(gameDir) {
    const imgDir = fs.existsSync(path.join(gameDir, "www", "img"))
      ? path.join(gameDir, "www", "img")
      : path.join(gameDir, "img");
    const tilesetsPath = path.join(imgDir, "tilesets");
    if (!fs.existsSync(tilesetsPath)) return;

    const txtFiles = fs.readdirSync(tilesetsPath).filter(f => f.endsWith(".txt"));
    for (const tf of txtFiles) {
      const full = path.join(tilesetsPath, tf);
      let content;
      try {
        content = fs.readFileSync(full, "utf8");
      } catch (e) {
        logWarn(`[Extractor] Falha ao ler tileset ${tf}: ${e.message}`);
        continue;
      }

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Formato "English|Japanese"
        const pipeMatch = line.match(/^(.+?)\|(.+)$/);
        if (pipeMatch) {
          const engPart = pipeMatch[1].trim();
          const jpPart = pipeMatch[2].trim();
          // Só extrai o JP se ele for texto traduzível
          if (jpPart && /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(jpPart) && isTranslatableText(jpPart)) {
            this.texts.push({
              id: this.idx++,
              file: path.join("img", "tilesets", tf).replace(/\\/g, "/"),
              keys: [i],
              original: jpPart,
              clean: jpPart,
              escapeParts: [],
              tilesetJpPart: jpPart,
              tilesetLineIndex: i,
              tilesetRawLine: line,
            });
          }
          continue;
        }

        // Texto japonês em linha solta (não pipe-separated)
        if (isTranslatableText(line) && /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(line)) {
          this.texts.push({
            id: this.idx++,
            file: path.join("img", "tilesets", tf),
            keys: [i, "raw"],
            original: line,
            clean: line.trim(),
            escapeParts: [],
            tilesetJpPart: line.trim(),
            tilesetLineIndex: i,
            tilesetRawLine: line,
          });
        }
      }
    }
  }

  /**
   * Extrai textos de arquivos CSV com suporte a UTF-16LE, UTF-8 e campos entre aspas.
   */
  extractFromCsv(gameDir) {
    const dataDir = findDataDir(gameDir);
    if (!dataDir || !fs.existsSync(dataDir)) return;
    const csvFiles = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith(".csv"));
    for (const cf of csvFiles) {
      let content = "";
      try {
        const buf = fs.readFileSync(path.join(dataDir, cf));
        if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
          content = buf.toString("utf16le");
        } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
          content = buf.toString("utf8");
        } else {
          content = buf.toString("utf8");
        }
      } catch (e) {
        logWarn("[Extractor] Falha ao ler CSV " + cf + ": " + e.message);
        continue;
      }

      // Parser RFC 4180 robusto para lidar com multiline e aspas
      const rows = [];
      let currentRow = [];
      let currentField = "";
      let inQuotes = false;
      for (let i = 0; i < content.length; i++) {
        const c = content[i];
        const next = content[i + 1];
        if (inQuotes) {
          if (c === '"') {
            if (next === '"') {
              currentField += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            currentField += c;
          }
        } else {
          if (c === '"') {
            inQuotes = true;
          } else if (c === ',') {
            currentRow.push(currentField);
            currentField = "";
          } else if (c === '\r') {
            if (next === '\n') i++;
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = "";
          } else if (c === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = "";
          } else {
            currentField += c;
          }
        }
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
      }
      if (rows.length === 0) continue;

      const header = rows[0];
      const textColIdx = header.findIndex(h => {
        const cleanH = h.replace(/^\uFEFF/, '').trim();
        return cleanH === "本文" || cleanH.toLowerCase() === "text" || cleanH.toLowerCase() === "memo" || cleanH.toLowerCase() === "message" || cleanH.toLowerCase() === "dialogue";
      });
      if (textColIdx === -1) continue;

      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        if (!cols || cols.length <= textColIdx) continue;
        const val = cols[textColIdx].trim();
        if (!val || !isTranslatableText(val)) continue;
        const { clean, parts } = extractEscapeCodes(val);
        if (!isTranslatableText(clean)) continue;
        this.texts.push({
          id: this.idx++,
          file: cf,
          keys: [r, textColIdx],
          original: val,
          clean: clean.trim(),
          escapeParts: parts,
          colIndex: textColIdx,
          csvLine: r,
        });
      }
    }
  }

  /**
   * Extrai o título do jogo de index.html
   */
  extractFromHtml(gameDir) {
    const wwwDir = fs.existsSync(path.join(gameDir, "www"))
      ? path.join(gameDir, "www")
      : gameDir;
    const paths = [path.join(gameDir, "index.html"), path.join(wwwDir, "index.html")];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, "utf8");
          const match = content.match(/<title>([\s\S]*?)<\/title>/i);
          if (match && match[1] && isTranslatableText(match[1])) {
            const relFile = path.relative(gameDir, p).replace(/\\/g, "/");
            this.texts.push({
              id: this.idx++,
              file: relFile,
              keys: ["title"],
              original: match[1],
              clean: match[1].trim(),
              escapeParts: [],
            });
          }
        } catch (e) {
          logWarn("[Extractor] Falha ao ler index.html: " + e.message);
        }
      }
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

