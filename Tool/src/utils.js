/**
 * OpenTranslator — Módulo de Utilitários Compartilhados (Utils)
 *
 * Centraliza funções utilitárias, constantes de filtragem e buscas de diretórios,
 * eliminando dependências cíclicas entre extractor.js, gameEngine.js e cache.js.
 */

const fs = require("fs");
const path = require("path");

// ==================== CONSTANTES DE FILTRAGEM ====================
const MEDIA_EXT_RE = /\.(png|jpg|jpeg|gif|bmp|webp|ogg|wav|mp3|m4a|json|efkefc|atlas|skel|bin|db|ttf|otf|woff|woff2)$/i;
const RESOURCE_PATH_RE = /^(img|audio|fonts|js|data|icon|css|locales|movies)[\/\\]/i;

// Regex estrito para códigos de escape e condicionais inline do RPG Maker
const ESC_RE = /\\([A-Za-z0-9_]+)(\[[^\]]*\])?|\\([{}!.\|^$><\\%])|if\s*\([^)]*\)|\b[vs]\[\d+\]|<[^>]+>/gi;

// ==================== UTILITÁRIOS DE NAVEGAÇÃO E STRINGS ====================
function logWarn(msg) {
  if (typeof global.log === "function") {
    global.log("warn", msg);
  } else {
    console.warn(msg);
  }
}

function findDataDir(gameDir) {
  if (!gameDir || typeof gameDir !== "string") return "";
  if (fs.existsSync(path.join(gameDir, "www", "data")))
    return path.join(gameDir, "www", "data");
  if (fs.existsSync(path.join(gameDir, "data")))
    return path.join(gameDir, "data");
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
  ]);
  const cleanWord = s.toLowerCase().replace(/[.:]/g, "");
  if (skipWords.has(cleanWord)) return false;

  if (!/\s/.test(s)) {
    if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) return false;
    if (s.includes("_") || s.includes(".") || s.includes("/") || s.includes("\\")) {
      return false;
    }
    if (/^[a-z]+[A-Z]/.test(s)) return false;
    if (/^[A-Z0-9_-]{3,}$/.test(s) && (s.includes("_") || /[0-9]/.test(s))) {
      return false;
    }
  }
  return true;
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
};
