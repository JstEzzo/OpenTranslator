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
 *
 * ---------------------------------------------------------------------------
 * FASE 3 / PASSO 25 — O RESULTADO DIZ SE FOI TRADUZIDO
 *
 * Este arquivo tinha três defeitos que se combinavam para produzir texto falso
 * no jogo:
 *
 *  1. CONFUSÃO DE TIPO: `translatedText = await provider.translate(...)`
 *     atribuía o RETORNO INTEIRO (um objeto) à variável que deveria conter
 *     texto. Daí em diante o glossário, o validador de placeholders e o
 *     outputProvider operavam sobre um objeto, e o jogo recebia
 *     "[object Object]".
 *
 *  2. TEXTO FABRICADO: com o circuit breaker aberto, o código fazia
 *     `translatedText = `[Offline] ${originalText}``. O japonês com um prefixo
 *     inventado parece tradução e é gravado como se fosse.
 *
 *  3. SUCESSO NÃO VERIFICADO: `source = 'EXTERNAL_PROVIDER'` e
 *     `consecutiveFailures = 0` eram atribuídos sem checar se o provedor
 *     traduziu alguma coisa. Um provedor que devolvesse o original mantinha o
 *     contador zerado para sempre, aparecendo saudável enquanto nunca
 *     traduzia nada.
 *
 * Agora todo retorno de provedor passa por `translationResult.normalize()`, e o
 * resultado carrega `wasTranslated` e `notTranslatedReason`.
 */

const { performance } = require('perf_hooks');
const {
  TRANSLATION_STATUS: S, normalize: normalizeTranslationResult,
} = require('./translationResult');

/**
 * Normaliza o retorno de QUALQUER provedor, antigo ou novo.
 *
 * Provedores legados devolvem `{ok, original, translated, source}`; os novos
 * devolvem o contrato. Ambos são aceitos, e o formato errado nunca vira texto.
 */
function normalizeProviderResult(raw, sourceText) {
  // Formato legado {ok, translated, source}
  if (raw && typeof raw === 'object'
      && typeof raw.translated === 'string'
      && typeof raw.ok === 'boolean') {
    const t = raw.translated;
    if (raw.ok && t.trim() !== '' && t.trim() !== String(sourceText).trim()) {
      return normalizeTranslationResult(t, {
        sourceText, provider: raw.source || 'LEGACY_PROVIDER',
      });
    }
    return normalizeTranslationResult(
      {
        status: raw.ok ? S.NOT_TRANSLATED : S.FAILED,
        reason: raw.ok
          ? 'provedor legado devolveu o texto de origem'
          : (raw.error || 'provedor legado reportou falha'),
      },
      { sourceText, provider: raw.source || 'LEGACY_PROVIDER' },
    );
  }
  // Formato novo (contrato) ou string crua: deixa o contrato decidir.
  return normalizeTranslationResult(raw, { sourceText, provider: 'PROVIDER' });
}

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
      pipelineMs: 0,
      queueWaitMs: item.enqueuedAt ? Number((tStart - item.enqueuedAt).toFixed(3)) : 0,
      processingMs: 0
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
    // `wasTranslated` é a verdade da linha. Antes não existia: o pipeline
    // devolvia `translation` sem dizer se aquilo era tradução ou o original
    // devolvido por um provedor que não conseguiu traduzir.
    let wasTranslated = Boolean(translatedText);
    let notTranslatedReason = null;

    if (!translatedText) {
      // Verifica circuit breaker
      if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerResetTime) {
        source = 'CIRCUIT_BREAKER_OFFLINE';
        // FASE 3 — NADA de texto fabricado. O código original fazia
        // `translatedText = `[Offline] ${originalText}``: um prefixo inventado
        // sobre o texto japonês, que parecia tradução e ia parar no jogo
        // escrito como "[Offline] こんにちは". Sem tradução, a resposta honesta
        // é o original e a marca de que não foi traduzido.
        translatedText = originalText;
        wasTranslated = false;
        notTranslatedReason = 'circuit breaker aberto';
      } else {
        this.circuitBreakerOpen = false;
        try {
          if (contextServices.translationProvider && !this.offlineMode) {
            const raw = await contextServices.translationProvider.translate(originalText);

            // FASE 3 — CONFUSÃO DE TIPO CORRIGIDA.
            // O original asignava o RETORNO INTEIRO do provider a
            // `translatedText`. Os providers devolvem objeto
            // (`{ok, original, translated}`), então `translatedText` virava
            // objeto e chegava ao jogo como "[object Object]" — passando
            // ainda pelo validador de placeholders e pelo outputProvider.
            const res = normalizeProviderResult(raw, originalText);
            if (res.isSuccess && typeof res.translation === 'string') {
              translatedText = res.translation;
              wasTranslated = true;
              source = res.provider ? `PROVIDER:${res.provider}` : 'EXTERNAL_PROVIDER';
            } else {
              // O provedor respondeu mas não traduziu. Registrar sucesso
              // aqui era o que mantinha `consecutiveFailures` zerado para
              // sempre: um provedor que nunca traduz nada parecia saudável.
              translatedText = originalText;
              wasTranslated = false;
              notTranslatedReason = res.reason || 'provedor não retornou tradução';
              source = 'PROVIDER_NO_TRANSLATION';
              this.consecutiveFailures++;
            }
            if (res.status === S.FAILED) {
              this.consecutiveFailures++;
              if (this.consecutiveFailures >= 3) {
                this.circuitBreakerOpen = true;
                this.circuitBreakerResetTime = Date.now() + 15000;
              }
            } else if (res.isSuccess) {
              this.consecutiveFailures = 0;
            }
          } else {
            source = 'OFFLINE_FALLBACK';
            translatedText = originalText;
            wasTranslated = false;
            notTranslatedReason = 'modo offline: nenhum provedor consultado';
          }
        } catch (provErr) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= 3) {
            this.circuitBreakerOpen = true;
            this.circuitBreakerResetTime = Date.now() + 15000; // 15 segundos de cooldown
          }
          source = 'OFFLINE_ERROR_FALLBACK';
          translatedText = originalText;
          wasTranslated = false;
          notTranslatedReason = `provedor lançou: ${provErr.message}`;
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
        // FASE 3 — rever silenciosamente para o original escondia o problema.
        // Agora a reversão é registrada: o consumidor sabe que a tradução foi
        // ABANDONADA por corrupção de placeholder, e não simplesmente nunca
        // aconteceu. Antes, `source` continuava apontando para o provedor,
        // sugerindo que a tradução tinha sido aplicada.
        translatedText = originalText;
        wasTranslated = false;
        notTranslatedReason = `placeholder inválido: ${(valid.errors || []).join('; ') || 'motivo não informado'}`;
        source = 'PLACEHOLDER_REVERTED';
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
    latencies.processingMs = latencies.totalMs;
    latencies.pipelineMs = Number((latencies.totalMs - latencies.providerMs).toFixed(3));

    return {
      original: originalText,
      translation: translatedText,
      // FASE 3 — a verdade da linha, explícita.
      wasTranslated,
      isSuccess: wasTranslated,
      notTranslatedReason,
      source,
      priority: item.priority,
      latencies
    };
  }
}

module.exports = FastTextPipeline;
