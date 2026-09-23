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
 */

class TranslationProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.inFlight = new Map(); // key -> Promise
    this.activeProviderName = 'LocalDictionary';
  }

  register(name, providerInstance) {
    this.providers.set(name, providerInstance);
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

  /**
   * Traduz string única com coalescência em voo
   */
  async translate(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return { status: 'UNCHANGED', translation: text, provider: 'NONE' };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { status: 'UNCHANGED', translation: text, provider: 'NONE' };
    }

    const dedupeKey = `${trimmed}__ctx_${context.scene || context.file || ''}`;
    if (this.inFlight.has(dedupeKey)) {
      return this.inFlight.get(dedupeKey);
    }

    const promise = this._executeCompositeTranslation(text, context);
    this.inFlight.set(dedupeKey, promise);

    try {
      const result = await promise;
      return result;
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
    if (tm && tm.lookup) {
      const tmRes = await tm.lookup(text, context);
      if (tmRes && tmRes.translation) {
        return { status: 'TRANSLATED', translation: tmRes.translation, provider: 'TranslationMemory' };
      }
    }

    // 2. Provedor Ativo Configurado
    const activeProvider = this.providers.get(this.activeProviderName) || this.providers.get('LocalDictionary');
    if (activeProvider) {
      try {
        const trans = await activeProvider.translate(text, context);
        if (trans && trans !== text) {
          return { status: 'TRANSLATED', translation: trans, provider: this.activeProviderName };
        }
      } catch (err) {
        return { status: 'FAILED', translation: text, error: err.message, provider: this.activeProviderName };
      }
    }

    // 3. Fallback seguro: retorna texto original íntegro
    return { status: 'NOT_TRANSLATED', translation: text, provider: 'NONE' };
  }

  /**
   * Tradução em lote (batching) preservando contexto individual
   */
  async translateBatch(items = [], options = {}) {
    const results = [];
    const maxBatch = options.maxBatchSize || 20;

    for (let i = 0; i < items.length; i += maxBatch) {
      const chunk = items.slice(i, i + maxBatch);
      const chunkPromises = chunk.map(item => this.translate(item.text, item.context || {}));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Relatório de saúde de todos os provedores registrados
   */
  async checkHealth() {
    const report = {};
    for (const [name, p] of this.providers.entries()) {
      if (typeof p.healthCheck === 'function') {
        try {
          report[name] = await p.healthCheck();
        } catch (e) {
          report[name] = { status: 'ERROR', error: e.message };
        }
      } else {
        report[name] = { status: 'ONLINE', isLocal: true };
      }
    }
    return report;
  }
}

const defaultProviderRegistry = new TranslationProviderRegistry();
module.exports = defaultProviderRegistry;
module.exports.TranslationProviderRegistry = TranslationProviderRegistry;
