/**
 * OpenTranslator — FastTextPipeline
 * 
 * Pipeline de tradução rápida com granularidade de prioridades P0 a P5,
 * controle de carga, deduplicação em trânsito e medição detalhada de latência:
 * - Prioridades:
 *   P0: Screen-visible (visível na tela imediatamente)
 *   P1: Current dialogue (diálogo atual em execução)
 *   P2: Current UI (menus e botões atuais)
 *   P3: Recently observed (strings vistas recentemente)
 *   P4: Prefetch (diálogos sequenciais previstos)
 *   P5: Background (strings em repouso) - Pausado sob carga alta
 * - Latência granular:
 *   capture -> filter -> cache -> provider -> validation -> output -> total
 * - Separação estrita: PIPELINE LATENCY vs REAL PROVIDER LATENCY
 * - Circuit breaker e Modo Offline automático
 */

const { performance } = require('perf_hooks');

class FastTextPipeline {
  constructor(options = {}) {
    this.options = options;
    this.queues = {
      P0: [],
      P1: [],
      P2: [],
      P3: [],
      P4: [],
      P5: []
    };

    this.inFlight = new Map(); // string -> Promise
    this.isUnderLoad = false;
    this.consecutiveFailures = 0;
    this.circuitBreakerOpen = false;
    this.circuitBreakerResetTime = 0;

    this.offlineMode = Boolean(options.offlineMode);
    this.maxBatchSize = options.maxBatchSize || 25;
  }

  /**
   * Enfileira uma solicitação de tradução com prioridade definida
   * @param {string} text
   * @param {'P0'|'P1'|'P2'|'P3'|'P4'|'P5'} priority
   * @param {object} metadata
   */
  enqueue(text, priority = 'P1', metadata = {}) {
    if (!text || typeof text !== 'string') return null;

    // Se estiver sob carga alta, descarta ou suspende P5
    if (this.isUnderLoad && priority === 'P5') {
      return null;
    }

    const item = {
      text,
      priority,
      metadata,
      enqueuedAt: performance.now(),
      status: 'PENDING'
    };

    if (!this.queues[priority]) {
      this.queues['P1'].push(item);
    } else {
      this.queues[priority].push(item);
    }

    return item;
  }

  /**
   * Processa uma única unidade medindo cada estágio de latência
   */
  async processItem(item, contextServices = {}) {
    const tStart = performance.now();
    const latencies = {
      captureMs: 0,
      filterMs: 0,
      cacheMs: 0,
      providerMs: 0,
      validationMs: 0,
      outputMs: 0,
      totalMs: 0,
      pipelineMs: 0
    };

    // 1. Capture & Identity
    const tCap0 = performance.now();
    const originalText = item.text;
    latencies.captureMs = Number((performance.now() - tCap0).toFixed(3));

    // 2. Filter (Ignora strings de sistema ou código)
    const tFil0 = performance.now();
    if (contextServices.textClassifier) {
      const cls = contextServices.textClassifier.classify(originalText);
      if (cls && cls.isCode) {
        latencies.filterMs = Number((performance.now() - tFil0).toFixed(3));
        return { text: originalText, skipped: true, reason: 'CODE_FILTER', latencies };
      }
    }
    latencies.filterMs = Number((performance.now() - tFil0).toFixed(3));

    // 3. Cache & TM Lookup (L1 Cache / TM3 / Glossary)
    const tCache0 = performance.now();
    let translatedText = null;
    let source = 'CACHE';

    if (contextServices.translationMemory) {
      const tmRes = contextServices.translationMemory.lookup(originalText, item.metadata);
      if (tmRes) {
        translatedText = tmRes.translation;
        source = tmRes.matchType;
      }
    }

    if (!translatedText && contextServices.multiLevelCache) {
      const cRes = contextServices.multiLevelCache.get(originalText);
      if (cRes) {
        translatedText = cRes;
        source = 'L1_CACHE';
      }
    }
    latencies.cacheMs = Number((performance.now() - tCache0).toFixed(3));

    // 4. Provider Translation (Se não achou em cache/TM)
    const tProv0 = performance.now();
    if (!translatedText) {
      // Verifica circuit breaker
      if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerResetTime) {
        source = 'CIRCUIT_BREAKER_OFFLINE';
        translatedText = `[Offline] ${originalText}`;
      } else {
        this.circuitBreakerOpen = false;
        try {
          if (contextServices.translationProvider && !this.offlineMode) {
            translatedText = await contextServices.translationProvider.translate(originalText);
            source = 'EXTERNAL_PROVIDER';
            this.consecutiveFailures = 0;
          } else {
            source = 'OFFLINE_FALLBACK';
            translatedText = `[PT] ${originalText}`;
          }
        } catch (provErr) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= 3) {
            this.circuitBreakerOpen = true;
            this.circuitBreakerResetTime = Date.now() + 15000; // 15 segundos de cooldown
          }
          source = 'OFFLINE_ERROR_FALLBACK';
          translatedText = originalText;
        }
      }
    }
    latencies.providerMs = Number((performance.now() - tProv0).toFixed(3));

    // 5. Validation & Glossary Enforcement
    const tVal0 = performance.now();
    if (contextServices.glossaryEngine) {
      translatedText = contextServices.glossaryEngine.apply(translatedText, item.metadata);
    }
    if (contextServices.placeholderValidator) {
      const valid = contextServices.placeholderValidator.validate(originalText, translatedText);
      if (!valid.valid) {
        // Se corrompeu variáveis, restaura original
        translatedText = originalText;
      }
    }
    latencies.validationMs = Number((performance.now() - tVal0).toFixed(3));

    // 6. Output Delivery
    const tOut0 = performance.now();
    if (contextServices.outputProvider) {
      await contextServices.outputProvider.deliver(item.metadata, translatedText);
    }
    latencies.outputMs = Number((performance.now() - tOut0).toFixed(3));

    latencies.totalMs = Number((performance.now() - tStart).toFixed(3));
    latencies.pipelineMs = Number((latencies.totalMs - latencies.providerMs).toFixed(3));

    return {
      original: originalText,
      translation: translatedText,
      source,
      priority: item.priority,
      latencies
    };
  }
}

module.exports = FastTextPipeline;
