/**
 * providerHttp.js — Camada HTTP única para provedores de tradução
 *
 * FASE 3 / PASSO 26 — FAZER VALER A REGRA DO GATEWAY
 *
 * O `providerGateway.js` declara, no próprio cabeçalho:
 *
 *   "Nenhuma função pode abrir socket HTTP para um provedor sem passar por
 *    ProviderGateway.executeRequest(providerKey, requestFn, options) que
 *    obrigatoriamente valida o Circuit Breaker antes de qualquer chamada."
 *
 * A regra não valia. `src/translation/translator.js` importava `ProviderGateway` e nunca o
 * usava, abrindo sockets direto em 10 lugares — com `https.request`,
 * `https.get` e `fetch`. Cada um com seu próprio tratamento de 429, seus
 * retries e sua contabilidade de ban (`engineBans`), duplicando em código
 * ad-hoc o que o Circuit Breaker já faz de forma centralizada.
 *
 * Consequência prática: o breaker não via nada. Uma função nova adicionada ao
 * arquivo podia furar o controle sem ninguém perceber, e o painel de saúde do
 * breaker mentia sobre Providers que ele nunca viu.
 *
 * ---------------------------------------------------------------------------
 * A CORREÇÃO
 *
 * Este módulo é o ÚNICO lugar do projeto que abre socket para um provedor de
 * tradução. Ele sempre passa por `ProviderGateway.executeRequest`, que valida
 * o breaker e registra início, sucesso, erro classificado e fim.
 *
 * As funções antigas de `translator.js` foram reescritas para delegar aqui.
 * Nenhum endpoint, cabeçalho, timeout ou formato de resposta foi alterado:
 * só o caminho passa a ser obrigatório e verificável.
 *
 * O teste `tests/unit/providerGatewayEnforcement.test.js` garante que a regra
 * não volta a ser decorativa.
 */

'use strict';

const https = require('https');
const http = require('http');
const ProviderGateway = require('./providerGateway');

/** Extrai a chave do breaker a partir da URL, para named metrics. */
function providerKeyFor(keyOrUrl, fallbackHost) {
  if (typeof keyOrUrl === 'string' && !keyOrUrl.includes('://')) {
    return keyOrUrl;
  }
  try {
    return new URL(keyOrUrl).hostname;
  } catch (e) {
    return fallbackHost || 'unknown-provider';
  }
}

/**
 * Erro de resposta HTTP de um provedor.
 * Carrega status, headers e corpo para que o classificador do gateway possa
 * decidir (RATE_LIMITED, CAPTCHA_OR_BLOCK, PAYLOAD_TOO_LARGE, ...).
 */
class ProviderHttpError extends Error {
  constructor(status, headers, body, providerKey) {
    super(`HTTP ${status} de ${providerKey}`);
    this.name = 'ProviderHttpError';
    this.statusCode = status;
    this.status = status;
    this.headers = headers || {};
    this.body = body || '';
    this.providerKey = providerKey;
  }
}

/** Status que sempre representam falha do provedor. */
function isErrorStatus(status) {
  return typeof status === 'number' && (status < 200 || status >= 400);
}

/**
 * Requisição HTTP/HTTPS genérica, sempre via gateway.
 *
 * @param {object} args
 * @param {string} args.url          URL completa
 * @param {string} [args.providerKey] chave do breaker (padrão: hostname)
 * @param {object} [args.options]    opções de https.request
 * @param {number} [args.timeoutMs]  timeout de socket
 * @param {boolean} [args.rejectOnErrorStatus]
 *        Quando true, status >= 400 (ou < 200) lança ProviderHttpError DENTRO
 *        do gateway, para que o classificador registre o erro. Sem isso o
 *        gateway registraria a chamada como sucesso mesmo com HTTP 429 — e o
 *        breaker não aprenderia com rate limit.
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
function request({
  url, providerKey, options = {}, timeoutMs, rejectOnErrorStatus = false,
}) {
  const key = providerKeyFor(providerKey || url);
  const isHttps = String(url).startsWith('https:');
  const agent = isHttps ? https : http;

  return ProviderGateway.executeRequest(key, () => new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    const req = agent.request(url, options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (rejectOnErrorStatus && isErrorStatus(res.statusCode)) {
          done(reject, new ProviderHttpError(res.statusCode, res.headers, data, key));
          return;
        }
        done(resolve, {
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
      res.on('error', (e) => done(reject, e));
    });

    if (timeoutMs && typeof req.setTimeout === 'function') {
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        done(reject, new Error(`timeout de ${timeoutMs}ms ao contatar ${key}`));
      });
    }

    req.on('error', (e) => done(reject, e));
    if (options.body !== undefined && options.body !== null
        && typeof req.write === 'function') {
      req.write(options.body);
    }
    req.end();
  }));
}

/**
 * GET via gateway.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} [args.providerKey]
 * @param {object} [args.options]
 * @param {number} [args.timeoutMs]
 * @param {boolean} [args.rejectOnErrorStatus]
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
function get({
  url, providerKey, options = {}, timeoutMs, rejectOnErrorStatus = false,
}) {
  const key = providerKeyFor(providerKey || url);
  return request({
    url,
    providerKey: key,
    timeoutMs,
    rejectOnErrorStatus,
    options: { ...options, method: options.method || 'GET' },
  });
}

/**
 * POST com corpo já serializado, via gateway.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} [args.providerKey]
 * @param {string|Buffer} args.body
 * @param {object} [args.headers]
 * @param {number} [args.timeoutMs]
 * @param {boolean} [args.rejectOnErrorStatus]
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
function post({
  url, providerKey, body, headers = {}, timeoutMs, rejectOnErrorStatus = false,
}) {
  const key = providerKeyFor(providerKey || url);
  const payload = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  return request({
    url,
    providerKey: key,
    timeoutMs,
    rejectOnErrorStatus,
    options: {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': payload ? payload.length : 0,
      },
      body: payload,
    },
  });
}

/**
 * fetch() via gateway, para provedores que usam a API moderna.
 * Converte a Response em `{status, headers, body}` para manter uma única
 * forma de resultado em todo o projeto.
 *
 * @param {object} args
 * @param {string} args.url
 * @param {string} [args.providerKey]
 * @param {object} [args.init]    opções do fetch
 * @param {number} [args.timeoutMs]
 * @param {boolean} [args.rejectOnErrorStatus]
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
async function fetchGuarded({
  url, providerKey, init = {}, timeoutMs, rejectOnErrorStatus = false,
}) {
  const key = providerKeyFor(providerKey || url);
  const effectiveInit = { ...init };
  if (timeoutMs && !effectiveInit.signal) {
    effectiveInit.signal = AbortSignal.timeout(timeoutMs);
  }

  const response = await ProviderGateway.executeRequest(
    key,
    async () => {
      const r = await fetch(url, effectiveInit);
      if (rejectOnErrorStatus && isErrorStatus(r.status)) {
        const text = await r.text();
        // Lança dentro do callback: o gateway registra como erro.
        throw new ProviderHttpError(r.status, r.headers, text, key);
      }
      return r;
    },
  );

  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

module.exports = {
  request,
  get,
  post,
  fetchGuarded,
  providerKeyFor,
  isErrorStatus,
  ProviderHttpError,
};
