/**
 * translationResult.js — Contrato único de resultado de tradução
 *
 * FASE 3 / PASSO 24 — FIM DOS "RETURNS FALSOS" DOS PROVEDORES
 *
 * ---------------------------------------------------------------------------
 * O PROBLEMA QUE ESTE MÓDULO RESOLVE
 *
 * O TranslationProviderRegistry devolvia, em falha:
 *
 *     return { status: 'FAILED', translation: text, error: ... }
 *
 * O campo `translation` era preenchido com o TEXTO DE ORIGEM. Um consumidor
 * que fizesse o natural —
 *
 *     const { translation } = await registry.translate(linha);
 *     saidas.push(translation);
 *
 * — gravaria o japonês no jogo e informaria "traduzido". O `status` era a
 * única barreira, e barreira opcional não é barreira: qualquer caminho novo
 * que usasse o campo errado passaria despercebido.
 *
 * Pior, o caminho de sucesso aceitava QUALQUER valor diferente do original:
 *
 *     if (trans && trans !== text) return { status: 'TRANSLATED', ... }
 *
 * Um provedor que devolvesse `null` passava em `null !== text` e produzia
 * `{status:'TRANSLATED', translation: null}`. Sucesso sem tradução.
 *
 * ---------------------------------------------------------------------------
 * A REGRA
 *
 * `translation` só é preenchido quando existe tradução de verdade. Nos demais
 * casos é `null`. Quem quiser o original usa `original`, que é sempre
 * preenchido. Não existe ambiguidade a explorar por engano.
 */

'use strict';

/** Status possíveis. `TRANSLATED` é o único que representa tradução obtida. */
const TRANSLATION_STATUS = Object.freeze({
  /** Texto vazio, whitespace, ou não-string. Nada a fazer. */
  UNCHANGED: 'UNCHANGED',
  /** Tradução obtida de verdade. */
  TRANSLATED: 'TRANSLATED',
  /** O provedor respondeu, mas devolveu o original. Sem tradução. */
  NOT_TRANSLATED: 'NOT_TRANSLATED',
  /** Erro de provedor (rede, auth, formato). */
  FAILED: 'FAILED',
  /** Provedor recusou por política (idioma não suportado, filtro). */
  REJECTED: 'REJECTED',
  /** Provedor indisponível por Circuit Breaker. */
  BLOCKED: 'BLOCKED',
});

/** Os status que contam como "obtivemos tradução". */
const SUCCESS_STATUSES = new Set([TRANSLATION_STATUS.TRANSLATED]);

/**
 * Normaliza qualquer valor devolvido por um provedor em um TranslationResult
 * válido. Nunca lança: um provedor defeituoso não pode derrubar o pipeline.
 *
 * @param {any} raw         valor devolvido pelo provedor
 * @param {object} ctx      {sourceText, provider, error, reason}
 * @returns {object} TranslationResult normalizado
 */
function normalize(raw, ctx = {}) {
  const sourceText = typeof ctx.sourceText === 'string' ? ctx.sourceText : '';
  const provider = ctx.provider || 'UNKNOWN';

  // --- Provedor devolveu um objeto já no formato ---
  if (raw && typeof raw === 'object' && typeof raw.status === 'string') {
    const status = Object.values(TRANSLATION_STATUS).includes(raw.status)
      ? raw.status
      : TRANSLATION_STATUS.FAILED;
    const isSuccess = SUCCESS_STATUSES.has(status);
    return {
      status,
      isSuccess,
      // Regra central: sem tradução, `translation` é null. Nunca o original.
      translation: isSuccess
        ? coerceTranslation(raw.translation)
        : null,
      original: sourceText || coerceOriginal(raw),
      provider: raw.provider || provider,
      reason: raw.reason || raw.error || null,
      meta: raw.meta || null,
    };
  }

  // --- Provedor devolveu uma string crua ---
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') {
      // String vazia do provedor NÃO é tradução. Devolver isso como
      // TRANSLATED apagaria o texto original do jogo.
      return {
        status: TRANSLATION_STATUS.NOT_TRANSLATED,
        isSuccess: false,
        translation: null,
        original: sourceText,
        provider,
        reason: 'provedor devolveu string vazia',
        meta: null,
      };
    }
    if (trimmed === sourceText.trim()) {
      return {
        status: TRANSLATION_STATUS.NOT_TRANSLATED,
        isSuccess: false,
        translation: null,
        original: sourceText,
        provider,
        reason: 'provedor devolveu o texto de origem inalterado',
        meta: null,
      };
    }
    return {
      status: TRANSLATION_STATUS.TRANSLATED,
      isSuccess: true,
      translation: raw,
      original: sourceText,
      provider,
      reason: null,
      meta: null,
    };
  }

  // --- Provedor devolveu null/undefined/número/objeto solto ---
  // Tudo aqui é FAILED. Antes, `null !== text` passava no teste de sucesso.
  return {
    status: TRANSLATION_STATUS.FAILED,
    isSuccess: false,
    translation: null,
    original: sourceText,
    provider,
    reason: ctx.reason
      || `provedor devolveu ${describe(raw)} em vez de texto`,
    meta: null,
  };
}

/** Garante que a tradução é string não vazia. */
function coerceTranslation(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (t === '') return null;
  return v;
}

/** Extrai o original de um raw malformado, se houver. */
function coerceOriginal(raw) {
  if (raw && typeof raw === 'object' && typeof raw.original === 'string') {
    return raw.original;
  }
  return '';
}

/** Nome legível do tipo devolvido, para o relatório de erro. */
function describe(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/** Constrói um resultado de sucesso de forma explícita. */
function translated(text, provider, original) {
  return normalize(text, { sourceText: original, provider });
}

/** Constrói um resultado de falha de forma explícita. */
function failed(reason, provider, original, status) {
  return normalize(
    { status: status || TRANSLATION_STATUS.FAILED, error: reason, provider },
    { sourceText: original, provider },
  );
}

/** Constrói "não traduzido" sem colocar o original em `translation`. */
function notTranslated(reason, provider, original) {
  return normalize(
    { status: TRANSLATION_STATUS.NOT_TRANSLATED, reason, provider },
    { sourceText: original, provider },
  );
}

/**
 * Verifica a invariante central do contrato.
 * Usada em testes e em desenvolvimento; barata o bastante para rodar em
 * cada resultado em produção.
 */
function assertContract(result) {
  const problems = [];
  if (!result || typeof result !== 'object') {
    return { ok: false, problems: ['resultado não é objeto'] };
  }
  if (!Object.values(TRANSLATION_STATUS).includes(result.status)) {
    problems.push(`status desconhecido: ${result.status}`);
  }
  if (result.isSuccess !== SUCCESS_STATUSES.has(result.status)) {
    problems.push(`isSuccess=${result.isSuccess} contradiz status=${result.status}`);
  }
  if (!result.isSuccess && result.translation !== null) {
    problems.push(`status ${result.status} NÃO é sucesso, mas translation=`
      + `${JSON.stringify(result.translation)} (deveria ser null)`);
  }
  if (result.isSuccess && typeof result.translation !== 'string') {
    problems.push('TRANSLATED sem translation string');
  }
  if (result.isSuccess && result.translation !== null
      && result.translation.trim() === '') {
    problems.push('TRANSLATED com tradução vazia');
  }
  if (typeof result.original !== 'string') {
    problems.push('original deve ser sempre string');
  }
  return { ok: problems.length === 0, problems };
}

module.exports = {
  TRANSLATION_STATUS,
  SUCCESS_STATUSES,
  normalize,
  translated,
  failed,
  notTranslated,
  assertContract,
  describe,
};
