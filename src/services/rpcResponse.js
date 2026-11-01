/**
 * rpcResponse.js — Construtores de resposta honesta para handlers RPC
 *
 * FASE 2 / PASSO 21 & 36 — FIM DOS "SUCCESS" HARDCODED
 *
 * Regra central do projeto (aplicada a partir deste modulo):
 *   Um handler NUNCA devolve {ok:true} a nao ser que tenha executado a
 *   operacao e puder provar isso. Quando a operacao nao esta implementada,
 *   a resposta correta e {ok:false, status:'UNIMPLEMENTED'}.
 *
 *   Falhar explicitamente e melhor que mentir: a UI mostra o erro, o log
 *   registra, e o usuario sabe que a funcionalidade nao existe.
 */

/** Status padronizados de resposta. */
const RPC_STATUS = Object.freeze({
  OK: 'OK',
  UNIMPLEMENTED: 'UNIMPLEMENTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
});

/** Resposta de sucesso — exige que o caller tenha executado a operação. */
function ok(data) {
  const r = { ok: true, status: RPC_STATUS.OK };
  if (data && typeof data === 'object') Object.assign(r, data);
  return r;
}

/** Operação explicitamente não implementada. Preferível a sucesso falso. */
function unimplemented(operation, reason) {
  return {
    ok: false,
    status: RPC_STATUS.UNIMPLEMENTED,
    error: `Operação não implementada: ${operation}.`,
    reason: reason || 'Nenhuma implementação real existe para esta operação. '
      + 'Retornar sucesso aqui seria falso.',
    operation,
  };
}

/** Falha com Input invalido. */
function invalidInput(message, detail) {
  return { ok: false, status: RPC_STATUS.INVALID_INPUT, error: message, detail: detail || null };
}

/** Recurso inexistente. */
function notFound(message) {
  return { ok: false, status: RPC_STATUS.NOT_FOUND, error: message };
}

/** Dependência externa ausente (jogo não conectado, socket fechado). */
function notConnected(message, detail) {
  return { ok: false, status: RPC_STATUS.NOT_CONNECTED, error: message, detail: detail || null };
}

/** Operação bloqueada por guard de segurança. */
function blocked(message, reason) {
  return { ok: false, status: RPC_STATUS.BLOCKED, error: message, reason: reason || null };
}

/** Falha genérica com detalhe. */
function failed(message, detail) {
  return { ok: false, status: RPC_STATUS.FAILED, error: message, detail: detail || null };
}

/**
 * Valida um `level` de log vindo do cliente.
 * Antes: `level.toUpperCase()` era chamado sem validar o tipo, e um
 * cliente mandando `{level: 123}` causava TypeError -> HTTP 500.
 */
function sanitizeLogLevel(level, fallback) {
  const ALLOWED = new Set(['error', 'warn', 'warning', 'info', 'success', 'debug', 'trace']);
  const s = typeof level === 'string' ? level.trim().toLowerCase() : '';
  if (ALLOWED.has(s)) return s === 'warning' ? 'warn' : s;
  return fallback || 'info';
}

/**
 * Conta quantos itens de um Map foram realmente alterados por uma escrita
 * fisica (usado para garantir que appliedCount reflete o disco).
 *
 * @param {object} before  estado anterior (Map serializado ou objeto)
 * @param {object} after   estado posterior
 * @returns {number} quantidade de chaves cujo valor mudou
 */
function countChanged(before, after) {
  if (!after) return 0;
  const keys = after instanceof Map ? after.keys() : Object.keys(after);
  let changed = 0;
  for (const k of keys) {
    const a = after instanceof Map ? after.get(k) : after[k];
    const b = before instanceof Map ? before.get(k)
      : (before && typeof before === 'object' ? before[k] : undefined);
    if (b === undefined) { changed++; continue; }
    if (typeof a === 'string' && typeof b === 'string') {
      if (a !== b) changed++;
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed++;
    }
  }
  return changed;
}

module.exports = {
  RPC_STATUS,
  ok,
  unimplemented,
  invalidInput,
  notFound,
  notConnected,
  blocked,
  failed,
  sanitizeLogLevel,
  countChanged,
};
