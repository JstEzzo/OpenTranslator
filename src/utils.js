/**
 * utils.js — Módulo de Utilidades Compartilhadas e Constantes Estruturais
 *
 * Responsabilidades:
 * - Centralização de regexes de filtragem de mídias, recursos e escape codes
 * - Fornecimento de funções auxiliares de string, navegação em árvores de dados e logs com fallback
 * - Resolução segura de caminhos e prevenção de dependências circulares entre domínios
 *
 * Camada Arquitetural:
 * Compartilhada / Infraestrutura e Utilitários (Cross-Cutting Shared Layer)
 *
 * Principais Componentes:
 * - MEDIA_EXT_RE / RESOURCE_PATH_RE / ESC_RE
 * - logWarn()
 * - findDataDir()
 * - getLastRealKey()
 * - isTranslatableText()
 */

const fs = require("fs");
const path = require("path");
if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..');
if (!global.DATA_DIR) global.DATA_DIR = path.join(global.ROOT, "data");

// ==================== FILTERING CONSTANTS ====================
const MEDIA_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp|ogg|wav|mp3|m4a|json|efkefc|atlas|skel|bin|db|ttf|otf|woff|woff2)$/i;
const RESOURCE_PATH_RE = /^(img|audio|fonts|js|data|icon|css|locales|movies)[\/\\]/i;

// Strict regex for escape codes (supporting optional multiple backslashes \\+) and RPG Maker inline conditionals
const ESC_RE = /\\+([A-Za-z0-9_]+)(\[[^\]]*\])?|\\+([{}!.\|^$><\\%])|if\s*\([^)]*\)|\b[vs]\[\d+\]|<[^>]*[\u4e00-\u9fff\u3040-\u30ff][^>]*>/gi;

// ==================== STRING AND NAVIGATION UTILITIES ====================
const loggerManager = require("./loggerManager");

function logWarn(msg) {
  if (typeof global.log === "function") {
    global.log("warn", msg);
  } else {
    loggerManager.warn(msg);
  }
}

function findDataDir(gameDir, engineType = null) {
  if (!gameDir || typeof gameDir !== "string") return "";

  const mzData = path.join(gameDir, "data");
  const mvData = path.join(gameDir, "www", "data");

  if (engineType === "mz") {
    if (fs.existsSync(mzData)) return mzData;
    if (fs.existsSync(mvData)) return mvData;
  } else if (engineType === "mv") {
    if (fs.existsSync(mvData)) return mvData;
    if (fs.existsSync(mzData)) return mzData;
  } else {
    if (fs.existsSync(path.join(gameDir, "js", "rmmz_core.js")) || fs.existsSync(path.join(gameDir, "js", "rmtp_core.js"))) {
      if (fs.existsSync(mzData)) return mzData;
    }
    if (fs.existsSync(mvData)) return mvData;
    if (fs.existsSync(mzData)) return mzData;
  }
  return "";
}

function getValueAtPath(obj, pathArr) {
  let cur = obj;
  for (const key of pathArr) {
    if (cur && typeof cur === "object" && key in cur) {
      cur = cur[key];
    } else {
      return undefined;
    }
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

function isTranslatableText(clean) {
  if (typeof clean !== "string") return false;
  const s = clean.trim();
  if (s.length < 1) return false;
  if (s.length === 1 && !/[^\x00-\x7F]/.test(s)) return false;
  if (/^[a-z]{2}[-_][A-Z]{2}$/.test(s)) return false;
  if (s.length <= 4 && /^[A-Z]+$/.test(s)) return false;
  if (/^[\d\s.,!?\-+%=*/<>()\[\]{}@#$^&;:'"`~|\\\/]+$/.test(s)) return false;

  // Filtro centralizado de mídias e arquivos de recurso
  if (MEDIA_EXT_RE.test(s) || RESOURCE_PATH_RE.test(s)) return false;

  // Caracteres CJK (Japonês/Chinês/Coreano)
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(s)) return true;

  const skipWords = new Set([
    "hp", "mp", "tp", "lv", "exp", "gold", "true", "false",
    "__proto__", "constructor", "prototype", "tostring", "valueof",
    "hasownproperty", "isprototypeof", "propertyisenumerable", "tolocalestring"
  ]);
  const cleanWord = s.toLowerCase().replace(/[.:]/g, "");
  if (skipWords.has(cleanWord)) return false;

  if (!/\s/.test(s)) {
    if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s) && !/^[a-zA-Z]+[0-9]*[?!.]*$/.test(s)) return false;
    if (s.includes("/") || s.includes("\\") || /^[a-z0-9_]+\.(?:png|jpg|ogg|rpy|rpyc|js|json|css|ttf|otf|mp3|wav)$/i.test(s)) {
      return false;
    }
    if (/^[a-z]+[A-Z]/.test(s)) return false;
  }
  return true;
}

function loadSyntaxRules() {
  const cfgPath = path.join(global.ROOT || path.join(__dirname, ".."), "config", "syntax_rules.json");
  try {
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    }
  } catch (e) {
    logWarn("Failed to load syntax_rules.json: " + e.message);
  }
  return {
    DANGER_PREFIXES: ["gui/", "audio/", "images/", "fonts/", "tl/", "renpy/"],
    COMMON_RENPY_UI_KEYS: ["Start", "Load", "Save", "Options", "Preferences", "Main Menu", "Return", "Back", "History", "Skip", "Auto", "Help", "Quit", "About"],
    PROTECTED_ENGINE_DIRS: ["renpy/common", "common"],
    VERSION_PROBING: { RENPY_PREFERENCE_HOOK_MAX_VERSION: "9.9.99", SAFE_PURGE_FILES: ["00_opent_runtime.rpy", "00_opent_runtime.rpyc"] }
  };
}

function isCodeOrFormulaKey(key) {
  if (typeof key !== "string") return false;
  const lk = key.toLowerCase();
  return [
    "dateselect",
    "dataselect",
    "selectid",
    "select_id",
    "code",
    "formula",
    "eval",
    "script",
    "expr",
    "function",
    "condition",
    "color",
    "gradient",
    "folder",
    "path",
    "dir",
    "directory",
    "filename",
  ].some((sub) => lk.includes(sub));
}

function isAudioParamKey(key) {
  if (typeof key !== "string") return false;
  const k = key.trim();
  if (/^(?:sound|audio|bgm|bgs|se|me)$/i.test(k)) return true;
  if (/(?:^|[_\s-])(?:sound|audio|bgm|bgs)(?:$|[_\s-])/i.test(k)) return true;
  if (/(?:^|[_\s-])(?:se|me)(?:$|[_\s-])/i.test(k)) {
    if (!/(?:name|option|volume)/i.test(k)) return true;
  }
  if (/[a-z0-9](?:Se|Me|Bgm|Bgs|Sound|Audio)$/.test(k)) return true;
  if (/^(?:se|me|bgm|bgs|sound|audio)(?:Name|File|Pitch|Pan)$/i.test(k)) return true;
  return false;
}

module.exports = {
  MEDIA_EXT_RE,
  RESOURCE_PATH_RE,
  ESC_RE,
  logWarn,
  findDataDir,
  getValueAtPath,
  getLastRealKey,
  isTranslatableText,
  loadSyntaxRules,
  isCodeOrFormulaKey,
  isAudioParamKey,
};

