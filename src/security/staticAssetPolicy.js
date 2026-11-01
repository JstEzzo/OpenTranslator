/**
 * staticAssetPolicy.js — Allowlist de assets servidos por HTTP (FASE 1 / PASSO 18)
 *
 * Problema corrigido:
 *   httpServer.js montava /resources/ e /loaders/ como espelhos de disco.
 *   Isso expunha via HTTP:
 *     - loaders/inject.exe (192 MB, binario de injecao)
 *     - 20+ DLLs nativas de hook
 *     - resources/renpy/python/ (CPython embutido completo)
 *     - resources/unity/site-packages/ (45 MB de pacotes pip)
 *     - resources/unreal/*.exe
 *   Qualquer processo local (ou pagina web via DNS-rebinding, antes do fix de
 *   Origin/Host) podia baixar esses binarios.
 *
 * Politica:
 *   1. A UI (ui/) e servida integralmente — e o unico diretorio com codigo de
 *      frontend, e nao contem executaveis.
 *   2. Fora de ui/, somente arquivos explicitamente necessarios pela UI sao
 *      servidos, por caminho exato (nao por extensao nem por diretorio).
 *   3. Qualquer requisicao fora da allowlist responde 404 com corpo generico
 *      (nao 403, para nao confirmar a existencia do recurso).
 *
 * A allowlist abaixo foi derivada das referencias reais em ui/app.js e
 * ui/index.html (verificadas por varredura de url()/src=/href=).
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Arquivos servidos de fora de ui/, mapeados URL -> caminho relativo a ROOT.
 * ATENCAO: lista minima e fechada. Adicionar aqui e' uma decao de produto.
 */
const EXTERNAL_ASSET_ALLOWLIST = Object.freeze([
  // Logo usada no topo da janela (ui/app.js referencia /resources/OpenTranslator.png)
  { url: '/resources/OpenTranslator.png', rel: 'resources/OpenTranslator.png' },

  // Fonte do RPG Maker MV/MZ injetada via @font-face em ui/app.js
  // (ui/app.js usa a URL relativa "../loaders/opent_PGMMV_font.ttf",
  //  que normaliza para /loaders/opent_PGMMV_font.ttf)
  { url: '/loaders/opent_PGMMV_font.ttf', rel: 'loaders/opent_PGMMV_font.ttf' },
]);

/**
 * Extensoes que NUNCA podem ser servidas por HTTP, mesmo dentro de ui/.
 * Defesa em profundidade: se alguem colocar um .exe dentro de ui/, ele nao sai.
 */
const FORBIDDEN_EXTENSIONS = Object.freeze([
  '.exe', '.dll', '.pyd', '.node', '.sys', '.drv',
  '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.js.manifest',
  '.py', '.pyc', '.pyo', '.rpa', '.pak', '.assets', '.unity3d', '.bundle',
  '.rgss3a', '.rgss2a', '.rgssad', '.rpyc', '.rpy', '.rpym',
  '.sqlite', '.sqlite3', '.db', '.key', '.pem', '.pfx', '.p12', '.crt',
]);

/** Extensoes permitidas dentro de ui/ (allowlist positiva, nao negativa). */
const UI_ALLOWED_EXTENSIONS = Object.freeze([
  '.html', '.htm', '.js', '.mjs', '.css', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.ttf', '.otf', '.woff', '.woff2',
  '.txt', '.map',
]);

/**
 * Verifica se uma extensao e servivel dentro de ui/.
 * @param {string} ext  extensao com ponto, minuscula
 */
function isUiAssetServable(ext) {
  if (FORBIDDEN_EXTENSIONS.includes(ext)) return false;
  return UI_ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Resolve um pathname de request para um arquivo absoluto, aplicando a politica.
 *
 * @param {object} opts
 * @param {string} opts.urlPath        pathname ja decodificado (ex.: "/app.js")
 * @param {string} opts.rootDir        global.ROOT
 * @param {string} opts.wwwDir         global.WWW_DIR (ui/)
 * @returns {{ok:true, absolutePath:string, contentType:string}
 *          |{ok:false, reason:'NOT_ALLOWED'|'FORBIDDEN_EXT'|'ESCAPES_ROOT'|'NOT_FOUND'}}
 */
function resolveStaticAsset({ urlPath, rootDir, wwwDir }) {
  // Normaliza e remove segmentos ambiguos.
  const normalized = path.posix
    .normalize(urlPath.replace(/\\/g, '/'))
    .replace(/\/{2,}/g, '/');

  // 1) Allowlist externa (caminho exato, fora de ui/)
  const exact = EXTERNAL_ASSET_ALLOWLIST.find((a) => a.url === normalized);
  if (exact) {
    const abs = path.resolve(rootDir, exact.rel);
    if (!isInside(rootDir, abs)) return { ok: false, reason: 'ESCAPES_ROOT' };
    if (!fs.existsSync(abs)) return { ok: false, reason: 'NOT_FOUND' };
    return { ok: true, absolutePath: abs, contentType: contentTypeFor(abs) };
  }

  // Qualquer outro path que COMECE com /resources/ ou /loaders/ e' negado.
  // (Antes era servido como espelho de disco.)
  if (normalized === '/resources' || normalized.startsWith('/resources/')) {
    return { ok: false, reason: 'NOT_ALLOWED' };
  }
  if (normalized === '/loaders' || normalized.startsWith('/loaders/')) {
    return { ok: false, reason: 'NOT_ALLOWED' };
  }

  // 2) UI. "/" -> index.html
  let relPath = normalized === '/' ? '/index.html' : normalized;
  const ext = path.extname(relPath).toLowerCase();
  if (!isUiAssetServable(ext)) {
    return { ok: false, reason: 'FORBIDDEN_EXT' };
  }

  const abs = path.resolve(wwwDir, '.' + path.posix.normalize(relPath));
  if (!isInside(wwwDir, abs)) return { ok: false, reason: 'ESCAPES_ROOT' };
  if (!fs.existsSync(abs)) return { ok: false, reason: 'NOT_FOUND' };
  // So arquivos (nao diretorios).
  try {
    if (!fs.statSync(abs).isFile()) return { ok: false, reason: 'NOT_FOUND' };
  } catch (_) {
    return { ok: false, reason: 'NOT_FOUND' };
  }
  return { ok: true, absolutePath: abs, contentType: contentTypeFor(abs) };
}

/** Testa se `child` esta dentro de `parent` (path-aware, case-insensitive no Windows). */
function isInside(parent, child) {
  const p = path.resolve(parent);
  const c = path.resolve(child);
  const pn = process.platform === 'win32' ? p.toLowerCase() : p;
  const cn = process.platform === 'win32' ? c.toLowerCase() : c;
  if (cn === pn) return true;
  return cn.startsWith(pn + path.sep);
}

/** Mapa de content-type (inclui os tipos que o httpServer original nao tinha). */
const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
});

function contentTypeFor(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

/** Lista de URLs serviveis (usada por /api/static-manifest e pelos testes). */
function listServedUrls() {
  return {
    ui: `todos os arquivos com extensao em [${UI_ALLOWED_EXTENSIONS.join(', ')}]`,
    external: EXTERNAL_ASSET_ALLOWLIST.map((a) => a.url),
    deniedPrefixes: ['/resources/*', '/loaders/*'],
    forbiddenExtensions: FORBIDDEN_EXTENSIONS,
  };
}

module.exports = {
  resolveStaticAsset,
  isUiAssetServable,
  isInside,
  contentTypeFor,
  listServedUrls,
  EXTERNAL_ASSET_ALLOWLIST,
  FORBIDDEN_EXTENSIONS,
  UI_ALLOWED_EXTENSIONS,
  CONTENT_TYPES,
};
