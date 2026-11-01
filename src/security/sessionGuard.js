/**
 * sessionGuard.js — Autenticação e Integridade de Transporte (FASE 1 / PASSO 18)
 *
 * Responsabilidades:
 * - Emitir e validar um token de sessão criptograficamente forte por processo.
 * - Validar Origin/Host para impedir CSRF e DNS-rebinding a partir de paginas web.
 * - Gerar requestId para correlacao log<->cliente sem vazar stack trace.
 * - Fornecer politica de CORS estrita (nunca "*").
 *
 * Threat model coberto:
 *   T1  CSRF simples (Content-Type:text/plain nao dispara preflight) -> bloqueado
 *       porque /api/rpc exige token no header X-OpenTranslator-Token.
 *   T2  DNS-rebinding (ataque controla o resolvedor, mantem Host malicioso) ->
 *       bloqueado porque o Host precisa ser loopback E o Origin (quando enviado)
 *       precisa ser loopback.
 *   T3 跨 origem com preflight (Content-Type:application/json dispara OPTIONS) ->
 *       bloqueado porque o preflight so responde a origens loopback.
 *
 * O token e por-processo (memoria). Reiniciar o servidor gera um novo token,
 * portanto um token vazado de uma sessao nao serve para a proxima.
 */

'use strict';

const crypto = require('crypto');

/** Hosts aceitos (loopback apenas — o servidor so faz bind em 127.0.0.1). */
const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** Esquemas+origens aceitos para chamadas com Origin. */
const ALLOWED_ORIGIN_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** Tamanho maximo do header de token. Evita DoS por header gigante. */
const MAX_TOKEN_HEADER_LENGTH = 512;

/**
 * Gera um token de sessao opaco e unpredictavel.
 * 32 bytes -> 64 chars hex = 256 bits de entropia.
 */
function mintSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Comparacao em tempo constante, tolerante a tamanho divergente. */
function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Compara sempre sobre o tamanho do maior para não vazar por timing de return.
  const len = Math.max(a.length, b.length, 64);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  bufA.write(a, 'utf8');
  bufB.write(b, 'utf8');
  try {
    return crypto.timingSafeEqual(bufA, bufB) && a.length === b.length;
  } catch (_) {
    return false;
  }
}

/** Extrai o hostname de uma URL, normalizando IPv6. */
function hostnameOf(urlString) {
  try {
    const u = new URL(urlString);
    let h = u.hostname;
    if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
    return h;
  } catch (_) {
    return null;
  }
}

/**
 * Valida o header Host contra a allowlist loopback.
 * @returns {{ok:boolean, reason?:string, hostname?:string}}
 */
function validateHost(hostHeader) {
  if (!hostHeader || typeof hostHeader !== 'string') {
    return { ok: false, reason: 'MISSING_HOST' };
  }
  // Host pode conter porta: "127.0.0.1:8080" / "localhost:8080"
  const raw = hostHeader.trim();
  const bracketless = raw.replace(/^\[|\]$/g, '');
  const hostname = bracketless.split(':')[0].toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname) && !ALLOWED_HOSTNAMES.has(bracketless.toLowerCase())) {
    return { ok: false, reason: 'HOST_NOT_ALLOWED', hostname };
  }
  return { ok: true, hostname };
}

/**
 * Valida o header Origin (quando presente) contra a allowlist loopback.
 * Ausência de Origin é aceitável para navegação/native (sendBeacon sem CORS),
 * mas nesse caso o token continua obrigatório para /api/rpc.
 * @returns {{ok:boolean, reason?:string, origin?:string}}
 */
function validateOrigin(originHeader) {
  if (originHeader === undefined || originHeader === null || originHeader === '') {
    return { ok: true, origin: null, absent: true };
  }
  if (typeof originHeader !== 'string') {
    return { ok: false, reason: 'ORIGIN_MALFORMED' };
  }
  // "null" é o origin do sandboxed iframe / file:// — nunca aceito.
  if (originHeader === 'null') {
    return { ok: false, reason: 'ORIGIN_NULL' };
  }
  const host = hostnameOf(originHeader);
  if (!host) return { ok: false, reason: 'ORIGIN_MALFORMED' };
  if (!ALLOWED_ORIGIN_HOSTS.has(host.toLowerCase())) {
    return { ok: false, reason: 'ORIGIN_NOT_ALLOWED', origin: originHeader };
  }
  return { ok: true, origin: originHeader };
}

/**
 * Valida o token de sessão do header customizado.
 * @param {string|undefined} headerValue
 * @param {string} expectedToken
 */
function validateToken(headerValue, expectedToken) {
  if (typeof headerValue !== 'string' || headerValue.length === 0) {
    return { ok: false, reason: 'TOKEN_MISSING' };
  }
  if (headerValue.length > MAX_TOKEN_HEADER_LENGTH) {
    return { ok: false, reason: 'TOKEN_TOO_LONG' };
  }
  if (!expectedToken || typeof expectedToken !== 'string') {
    return { ok: false, reason: 'SESSION_UNINITIALIZED' };
  }
  if (!timingSafeEqualStrings(headerValue, expectedToken)) {
    return { ok: false, reason: 'TOKEN_INVALID' };
  }
  return { ok: true };
}

/**
 * Gera um requestId curto para correlacao.
 * Formato: req_<12 hex>
 */
function newRequestId() {
  return 'req_' + crypto.randomBytes(6).toString('hex');
}

/**
 * Guard completo de um request. Usado em TODAS as rotas sensiveis.
 *
 * @param {object} opts
 * @param {import('http').IncomingMessage} opts.req
 * @param {boolean} opts.requireToken  true = exige X-OpenTranslator-Token
 * @param {string}  opts.expectedToken
 * @returns {{ok:boolean, requestId:string, reason?:string, host?:string, origin?:string}}
 */
function guardRequest({ req, requireToken, expectedToken }) {
  const requestId = newRequestId();

  const host = validateHost(req.headers['host']);
  if (!host.ok) {
    return { ok: false, requestId, reason: host.reason, host: host.hostname };
  }

  const origin = validateOrigin(req.headers['origin']);
  if (!origin.ok) {
    return { ok: false, requestId, reason: origin.reason, origin: origin.origin };
  }

  if (requireToken) {
    const token = validateToken(req.headers['x-opentranslator-token'], expectedToken);
    if (!token.ok) {
      return { ok: false, requestId, reason: token.reason, host: host.hostname };
    }
  }

  return {
    ok: true,
    requestId,
    host: host.hostname,
    origin: origin.origin || null,
  };
}

/**
 * Monta headers CORS estritos.
 * Nunca devolve "*". Quando allowOrigin e null, nenhum header CORS e emitido
 * (o browser bloqueia a leitura cross-origin, que e exatamente o desejado).
 */
function corsHeaders(allowOrigin) {
  if (!allowOrigin) return {};
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-OpenTranslator-Token',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

module.exports = {
  mintSessionToken,
  validateHost,
  validateOrigin,
  validateToken,
  guardRequest,
  newRequestId,
  corsHeaders,
  timingSafeEqualStrings,
  hostnameOf,
  ALLOWED_HOSTNAMES,
  ALLOWED_ORIGIN_HOSTS,
};
