/**
 * OpenTranslator - TranslationProviderRegistry
 *
 * Registro formal e unificado de provedores de tradução:
 * - LocalDictionaryProvider (LAB_TRANSLATION_PROVIDER determinístico)
 * - TranslationMemoryProvider
 * - ManualProvider
 * - ConfiguredHttpProvider
 *
 * Pipeline Composto: TM -> LocalDictionary -> Provider Remoto -> Fallback
 * Coalescência de requisições em voo (inFlight Map) e batching real.
 *
 * ---------------------------------------------------------------------------
 * FASE 3 / PASSO 24 — TODOS OS RETORNOS PASSAM PELO CONTRATO
 *
 * Antes, este arquivo devolvia `{status:'FAILED', translation: text}` e
 * `{status:'NOT_TRANSLATED', translation: text}`: em falha, o campo
 * `translation` recebia o TEXTO DE ORIGEM. Um consumidor que usasse o campo
 * — em vez de checar `status` — gravaria o japonês no jogo e reportaria
 * sucesso. Também aceitava `null` como tradução, porque o teste era apenas
 * `trans !== text`.
 *
 * Agora todo resultado passa por `translationResult.normalize()`, que
 * garante: `translation` só é preenchido em TRANSLATED, e é `null` em todos
 * os demais casos. O original continua disponível em `original`.
 */

'use strict';

const {
  TRANSLATION_STATUS: S, normalize, assertContract,
} = require('../core/translationResult');

class TranslationProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.inFlight = new Map(); // key -> Promise
    this.activeProviderName = 'LocalDictionary';
    // Integridade do contrato é verificada em todo resultado. Um provedor
    // que tente burlar o contrato é detectado em vez de silenciado.
    this.enforceContract = true;
  }

  /**
   * Registra um provedor. Rejeita o que não tem nem `translate` nem `lookup`.
   *
   * Existem duas formas legítimas de provedor:
   *   - tradutor: implementa `translate(text, ctx)`
   *   - memória de tradução: implementa `lookup(text, ctx)` e é consultada
   *     antes da cadeia, sem gastar chamada de rede
   *
   * Exigir `translate` para todos rejeitaria a TranslationMemory, que é o
   * provedor mais consultado do sistema.
   */
  register(name, providerInstance) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('register(): nome do provedor é obrigatório');
    }
    if (!providerInstance || typeof providerInstance !== 'object') {
      throw new TypeError(`register('${name}'): provedor deve ser um objeto`);
    }
    if (typeof providerInstance.translate !== 'function'
        && typeof providerInstance.lookup !== 'function') {
      throw new TypeError(
        `register('${name}'): provedor não implementa translate() nem lookup()`,
      );
    }
    providerInstance.__kind = typeof providerInstance.translate === 'function'
      ? 'TRANSLATOR'
      : 'LOOKUP';
    providerInstance.__registeredName = name;
    this.providers.set(name, providerInstance);
    return true;
  }

  get(name) {
    return this.providers.get(name) || null;
  }

  setActiveProvider(name) {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
      return true;
    }
    return false;
  }

  _finalize(raw, ctx) {
    const result = normalize(raw, ctx);
    if (this.enforceContract) {
      const check = assertContract(result);
      if (!check.ok) {
        // Não lançamos: um provedor defeituoso não pode derrubar o job.
        // Mas o resultado é marcado como falha, porque um resultado que
        // viola o contrato não é confiável.
        return normalize(
          {
            status: S.FAILED,
            reason: `provedor violou o contrato de resultado: ${check.problems.join('; ')}`,
            provider: ctx.provider,
          },
          { sourceText: ctx.sourceText, provider: ctx.provider },
        );
      }
    }
    return result;
  }

  /**
   * Traduz string única com coalescência em voo
   */
  async translate(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return normalize(
        { status: S.UNCHANGED, reason: 'entrada vazia ou não-string' },
        { sourceText: typeof text === 'string' ? text : '', provider: 'NONE' },
      );
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return normalize(
        { status: S.UNCHANGED, reason: 'texto whitespace-only' },
        { sourceText: text, provider: 'NONE' },
      );
    }

    const dedupeKey = `${trimmed}__ctx_${context.scene || context.file || ''}`;
    if (this.inFlight.has(dedupeKey)) {
      return this.inFlight.get(dedupeKey);
    }

    const promise = this._executeCompositeTranslation(text, context);
    this.inFlight.set(dedupeKey, promise);

    try {
      return await promise;
    } finally {
      this.inFlight.delete(dedupeKey);
    }
  }

  /**
   * Executa a cadeia de tradução composta
   */
  async _executeCompositeTranslation(text, context) {
    // 1. Translation Memory (se disponível)
    const tm = this.providers.get('TranslationMemory');
    if (tm && typeof tm.lookup === 'function') {
      try {
        const tmRes = await tm.lookup(text, context);
        // Uma TM que devolve o texto de origem NÃO é um acerto de tradução.
        // Aceitar isso marcava como TRANSLATED sem ter traduzido nada.
        if (tmRes && typeof tmRes.translation === 'string'
            && tmRes.translation.trim() !== ''
            && tmRes.translation.trim() !== text.trim()) {
          return this._finalize(
            { status: S.TRANSLATED, translation: tmRes.translation, provider: 'TranslationMemory' },
            { sourceText: text, provider: 'TranslationMemory' },
          );
        }
      } catch (err) {
        // Falha de TM não é motivo para abortar: segue para o próximo provedor.
        if (global.log) {
          global.log('debug', `[ProviderRegistry] TM falhou, seguindo cadeia: ${err.message}`);
        }
      }
    }

    // 2. Provedor Ativo Configurado
    const activeName = this.providers.has(this.activeProviderName)
      ? this.activeProviderName
      : 'LocalDictionary';
    const activeProvider = this.providers.get(activeName);

    if (!activeProvider) {
      return this._finalize(
        { status: S.NOT_TRANSLATED, reason: 'nenhum provedor registrado' },
        { sourceText: text, provider: 'NONE' },
      );
    }

    // Um provedor apenas-lookup (memória de tradução) não pode ser o provedor
    // ativo: ele não sabe traduzir. Se for o caso, procuramos um tradutor real
    // em vez de chamar `.translate` e tomar um TypeError no meio do job.
    let usableProvider = activeProvider;
    if (typeof usableProvider.translate !== 'function') {
      const fallback = [...this.providers.entries()].find(
        ([, p]) => typeof p.translate === 'function' && p !== usableProvider,
      );
      if (fallback) {
        usableProvider = fallback[1];
      } else {
        return this._finalize(
          {
            status: S.NOT_TRANSLATED,
            reason: `provedor ativo '${activeName}' é apenas-lookup e não há `
              + 'nenhum tradutor registrado',
          },
          { sourceText: text, provider: 'NONE' },
        );
      }
    }
    const usableName = typeof activeProvider.translate === 'function'
      ? activeName
      : (usableProvider.__registeredName || 'UNKNOWN');

    try {
      const raw = await usableProvider.translate(text, context);
      // `normalize` decide. Um provedor que devolva null, undefined, vazio
      // ou o próprio original NUNCA vira TRANSLATED.
      return this._finalize(raw, { sourceText: text, provider: usableName });
    } catch (err) {
      // FALHA: `translation` é null. O original fica em `original`.
      return this._finalize(
        {
          status: S.FAILED,
          reason: err.message,
          error: err.message,
          provider: usableName,
        },
        { sourceText: text, provider: usableName },
      );
    }
  }

  /**
   * Tradução em lote (batching) preservando contexto individual
   */
  async translateBatch(items = [], options = {}) {
    const results = [];
    const maxBatch = options.maxBatchSize || 20;

    for (let i = 0; i < items.length; i += maxBatch) {
      const chunk = items.slice(i, i + maxBatch);
      const chunkPromises = chunk.map(item => this.translate(
        item.text, item.context || {},
      ));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Relatório de saúde de todos os provedores registrados.
   *
   * FASE 3 — antes, um provedor SEM `healthCheck` recebia
   * `{status:'ONLINE', isLocal:true}` sem nunca ser consultado. Ausência de
   * verificação era reportada como verificação bem-sucedida: a segunda
   * variante do mesmo bug, agora no painel de saúde.
   *
   * Agora: sem `healthCheck`, o status é UNKNOWN, que é a única afirmação
   * honesta. Só quem responde de fato vira ONLINE.
   */
  async checkHealth() {
    const report = {};
    for (const [name, p] of this.providers.entries()) {
      if (typeof p.healthCheck === 'function') {
        try {
          const res = await p.healthCheck();
          report[name] = (res && typeof res === 'object')
            ? res
            : { status: 'UNKNOWN', detail: 'healthCheck devolveu formato inesperado' };
        } catch (e) {
          report[name] = { status: 'ERROR', error: e.message };
        }
      } else {
        report[name] = {
          status: 'UNKNOWN',
          isLocal: true,
          detail: 'provedor não implementa healthCheck; estado não verificado',
        };
      }
    }
    report.__meta = {
      total: this.providers.size,
      verified: Object.values(report).filter((r) => r && r.status === 'ONLINE').length,
      unknown: Object.values(report).filter((r) => r && r.status === 'UNKNOWN').length,
      note: 'UNKNOWN significa que o provedor não foi consultado — não que esté bem.',
    };
    return report;
  }
}

const defaultProviderRegistry = new TranslationProviderRegistry();
module.exports = defaultProviderRegistry;
module.exports.TranslationProviderRegistry = TranslationProviderRegistry;
