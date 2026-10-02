const TranslationAccounting = require('./translationAccounting');
const JobPersistence = require('./jobPersistence');
const GlobalCircuitBreaker = require('./globalCircuitBreaker');
/**
 * OpenTranslator — TranslationPipeline 2.0
 * Orquestrador central de fluxo de tradução com:
 * - Seleção dinâmica de adapters via EngineRegistry
 * - Proteção de tags via CodeProtector 2.0
 * - Validação de integridade via QAEngine
 * - Memória hierárquica via TranslationMemory 2.0
 * - Suporte nativo a Dry-Run
 * - Transacionalidade com BackupManager e Rollback automático
 */

const fs = require('fs');
const path = require('path');
const EngineDetector = require('./engineDetector');
const defaultRegistry = require('./engineRegistry');
const CodeProtector = require('./codeProtector');
const BackupManager = require('./backupManager');
const QAEngine = require('./qaEngine');
const translationMemory = require('./translationMemory');

// Registra adapters
const RenpyAdapter = require('../engines/renpy/renpyAdapter');
const RpgMakerAdapter = require('../engines/rpgmaker/rpgMakerAdapter');
const ElectronAdapter = require('../engines/electron/electronAdapter');
const UnityAdapter = require('../engines/unity/unityAdapter');
const GenericAdapter = require('../engines/generic/genericAdapter');

defaultRegistry.register(new RenpyAdapter());
defaultRegistry.register(new RpgMakerAdapter());
defaultRegistry.register(new ElectronAdapter());
defaultRegistry.register(new UnityAdapter());
defaultRegistry.register(new GenericAdapter());

class TranslationPipeline {
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.backupManager = new BackupManager();
  }

  async dryRun(gameDir, options = {}) {
    const detection = await EngineDetector.detect(gameDir);
    const targetDir = detection.detectedSubdir || gameDir;
    const adapter = this.registry.resolveAdapter(detection);

    if (!adapter) {
      return {
        success: false,
        error: 'Nenhum adapter compatível encontrado.',
        detection
      };
    }

    const extractResult = await adapter.extract(targetDir, options);
    let protectedTokensCount = 0;
    const sampleQA = [];

    for (const t of (extractResult.texts || []).slice(0, 10)) {
      if (t.tokens && t.tokens.length > 0) {
        protectedTokensCount += t.tokens.length;
      }
      // Simula QA no texto extraído
      const qa = QAEngine.validate(t.clean, t.clean, { expectedTokens: t.tokens });
      sampleQA.push({ text: t.clean, qaStatus: qa.qaStatus });
    }

    return {
      success: true,
      dryRun: true,
      engine: detection.engine,
      engineVersion: detection.engineVersion,
      architecture: detection.architecture,
      confidence: detection.confidence,
      evidence: detection.evidence,
      capabilities: adapter.getCapabilities(targetDir),
      totalStrings: extractResult.count || 0,
      protectedTokensCount,
      sampleTexts: (extractResult.texts || []).slice(0, 5),
      sampleQA,
      filesModified: 0
    };
  }

  async run(gameDir, options = {}) {
    if (options.dryRun === true) {
      return this.dryRun(gameDir, options);
    }

    const detection = await EngineDetector.detect(gameDir);
    const targetDir = detection.detectedSubdir || gameDir;
    const adapter = this.registry.resolveAdapter(detection);

    if (!adapter) {
      return { success: false, error: 'Adapter não localizado para engine: ' + detection.engine };
    }

    if (global.log) global.log('info', '[Pipeline] Iniciando tradução para: ' + path.basename(targetDir) + ' (' + detection.engine + ')');

    const extractResult = await adapter.extract(targetDir, options);
    if (!extractResult.success || (extractResult.count || 0) === 0) {
      return {
        success: true,
        count: 0,
        message: 'Nenhum texto traduzível pendente.',
        detection
      };
    }

    const texts = extractResult.texts;
    const translations = new Map();
    const sl = options.sl || 'auto';
    const tl = options.tl || 'pt';

    let cacheHits = 0;
    const pendingTexts = [];

    // Carrega cache local do jogo (trans_cache.json) se existir
    let localGameCache = null;
    const candidatePaths = [
      path.join(targetDir, "trans_cache.json"),
      path.join(gameDir, "trans_cache.json")
    ];
    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        try {
          const rawData = JSON.parse(fs.readFileSync(cp, "utf8"));
          if (rawData && rawData.translations) {
            localGameCache = rawData.translations;
            break;
          } else if (rawData && typeof rawData === "object") {
            localGameCache = rawData;
            break;
          }
        } catch (e) {}
      }
    }

    const { loadCommonTranslations, getCommonTranslation } = require('../cache');
    const commonTrans = loadCommonTranslations();

    function getSafeCacheEntry(cacheObj, key) {
      if (!cacheObj || !key || typeof key !== 'string') return null;
      if (Object.prototype.hasOwnProperty.call(cacheObj, key)) {
        const val = cacheObj[key];
        if (typeof val === 'string' && val.trim().length > 0) return val;
      }
      return null;
    }

    // Consulta Cache Local e Translation Memory 2.0
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      let cached = null;
      if (localGameCache) {
        let k1 = null;
        let k2 = null;
        if (t.keys) {
          k1 = t.file + ":" + t.keys.join(".") + ":" + (t.original || t.clean);
          k2 = t.file + ":" + t.keys.join("._original.") + ":" + (t.original || t.clean);
        } else if (t.raw) {
          k1 = t.file + ":" + t.raw + ":" + (t.original || t.clean);
        }
        cached = getSafeCacheEntry(localGameCache, k1) ||
                 getSafeCacheEntry(localGameCache, k2) ||
                 getSafeCacheEntry(localGameCache, t.clean) ||
                 getSafeCacheEntry(localGameCache, t.original);
      }

      if (!cached) {
        cached = translationMemory.lookup(t.clean, {
          engine: detection.engine,
          gameId: path.basename(targetDir)
        });
      }

      if (!cached) {
        const cTr = getCommonTranslation(t.clean, sl, tl, commonTrans) ||
                    getCommonTranslation(t.original, sl, tl, commonTrans);
        if (typeof cTr === 'string' && cTr.trim().length > 0) {
          cached = cTr;
        }
      }

      const hasSourceChars = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(t.clean);
      const isActuallyTranslated = cached && typeof cached === 'string' && cached.trim().length > 0 &&
        (cached.trim() !== t.clean.trim() && cached.trim() !== (t.original || '').trim() || !hasSourceChars);

      if (isActuallyTranslated) {
        translations.set(t.id, cached);
        cacheHits++;
      } else if (!hasSourceChars) {
        // Texto sem caracteres do idioma de origem: já está na língua alvo (ex: 'Atacar', 'Fugir') ou é símbolo/pontuação
        translations.set(t.id, t.clean);
        cacheHits++;
      } else {
        pendingTexts.push(t);
      }

      if (i > 0 && (i % 20000 === 0 || i === texts.length - 1)) {
        const percent = Math.min(50, Math.round((i / texts.length) * 50));
        if (global.log) global.log('info', `Progresso: ${percent}% - Verificando cache (${cacheHits}/${texts.length})...`);
      }
    }

    if (global.log) global.log('info', '[Pipeline] Cache Hit: ' + cacheHits + ' textos. Traduzindo ' + pendingTexts.length + ' inéditos...');

    const accounting = new TranslationAccounting(texts.length);
    for (const t of texts) {
      if (translations.has(t.id)) {
        accounting.registerCached(t.id, true);
      }
    }

    let isRateLimitedEncountered = false;

    if (pendingTexts.length > 0) {
      if (options.provider === 'mock' || options.mockTranslations === true) {
        for (const pt of pendingTexts) {
          translations.set(pt.id, "[PT] " + pt.clean);
          accounting.registerTranslated(pt.id, true);
        }
      } else {
        const translator = require('../translator');
        const cache = require('../cache');
        const glossary = cache.loadGlossary();

        const activeEngine = options.engine || options.provider || 'multi';

        const newTranslations = await translator.translateBatch(
          pendingTexts,
          sl,
          tl,
          activeEngine,
          glossary,
          (chunk) => {
            if (chunk && chunk.length > 0) {
              for (const item of chunk) {
                if (item.clean && item.translated && item.clean.trim() !== item.translated.trim()) {
                  translationMemory.store(item.clean, item.translated, {
                    engine: detection.engine,
                    gameId: path.basename(targetDir),
                    filePath: item.file
                  });
                }
              }
            }
          }
        );

        for (const [id, tr] of newTranslations) {
          const origObj = texts.find(x => x.id === id);
          const hasSource = origObj ? /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(origObj.clean) : true;
          const isRealTranslation = tr && typeof tr === 'string' && tr.trim().length > 0 &&
            (!origObj || tr.trim() !== origObj.clean.trim() || !hasSource);
          if (isRealTranslation) {
            translations.set(id, tr);
            accounting.registerTranslated(id, true);
            if (origObj && tr.trim() !== origObj.clean.trim()) {
              translationMemory.store(origObj.clean, tr, {
                engine: detection.engine,
                gameId: path.basename(targetDir),
                filePath: origObj.file
              });
            }
          }
        }

        // Se o lote inicial foi interrompido por Rate Limit, tenta fallback automático (ex: Papago)
        if (newTranslations && newTranslations.rateLimited) {
          isRateLimitedEncountered = true;
          const breaker = GlobalCircuitBreaker.getInstance();
          const health = breaker.getProviderHealth('google:gtx');
          let remainingPending = pendingTexts.filter(pt => !translations.has(pt.id));

          if (global.log) {
            global.log('warn', `Google GTX está temporariamente limitado.`);
            global.log('info', `Ativando fallback automático para Papago (${remainingPending.length} textos pendentes)...`);
          }

          try {
            const fallbackTranslations = await translator.translateBatch(
              remainingPending,
              sl,
              tl,
              'papago',
              glossary
            );

            if (fallbackTranslations && fallbackTranslations.size > 0) {
              for (const [id, tr] of fallbackTranslations) {
                const origObj = texts.find(x => x.id === id);
                const hasSource = origObj ? /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(origObj.clean) : true;
                const isRealTranslation = tr && typeof tr === 'string' && tr.trim().length > 0 &&
                  (!origObj || tr.trim() !== origObj.clean.trim() || !hasSource);
                if (isRealTranslation) {
                  translations.set(id, tr);
                  accounting.registerTranslated(id, true);
                  if (origObj && tr.trim() !== origObj.clean.trim()) {
                    translationMemory.store(origObj.clean, tr, {
                      engine: detection.engine,
                      gameId: path.basename(targetDir),
                      filePath: origObj.file
                    });
                  }
                }
              }
              remainingPending = pendingTexts.filter(pt => !translations.has(pt.id));
              if (remainingPending.length === 0) {
                isRateLimitedEncountered = false; // Recuperação completa!
                if (global.log) {
                  global.log('success', `[SmartSwitch] Fallback Papago concluiu com sucesso a tradução dos textos pendentes!`);
                }
              }
            }
          } catch (e) {
            if (global.log) global.log('warn', `[SmartSwitch] Falha no fallback Papago: ${e.message}`);
          }

          // Salva estado do job para retomada futura sem perda de dados
          const jobId = `${path.basename(targetDir)}_${Date.now()}`;
          JobPersistence.saveJob({
            jobId,
            gameId: path.basename(targetDir),
            engine: detection.engine,
            targetLang: tl,
            provider: options.provider || 'google',
            pendingTexts: remainingPending,
            completedTexts: Array.from(translations.entries()),
            cachedTexts: cacheHits,
            cooldownUntil: health.cooldownUntil
          });

          // Modo Normal (padrão): Aplicação parcial é terminantemente proibida quando a tradução foi interrompida com pendências
          if (options.allowPartial !== true && remainingPending.length > 0) {
            const TranslationCertificate = require('./translationCertificate');
            const certificate = TranslationCertificate.issue({
              engine: detection.engine,
              game: path.basename(targetDir),
              totalDetected: texts.length,
              translatable: texts.length,
              cacheHits,
              translatedNow: translations.size - cacheHits,
              pendingCount: remainingPending.length,
              coveredTexts: translations.size,
              appliedCount: 0,
              isRateLimited: true,
              providerStatus: 'RATE_LIMITED',
              fallbackStatus: 'NONE',
              isCriticallyDeficient: true,
              qaErrorsCount: 0
            });

            if (global.log) {
              global.log('warn', `[Pipeline] Aplicação cancelada: Modo Normal proíbe aplicação parcial com ${remainingPending.length} textos pendentes (Rate Limit ativo).`);
            }

            return {
              success: false,
              status: certificate.finalStatus,
              error: certificate.reason,
              message: certificate.reason,
              certificate,
              engine: detection.engine,
              engineVersion: detection.engineVersion,
              totalStrings: texts.length,
              pending: remainingPending.length,
              appliedCount: 0
            };
          }

          if (global.log) {
            global.log('warn', `[Pipeline] Modo Parcial Ativo: prosseguindo com a aplicação de ${translations.size} textos traduzidos/em cache...`);
          }
        }
      }
    }

    // Camada de Cobertura Garantida e Segunda Passagem Automática (Passos 9 e 10)
    const CoverageGuarantor = require('./coverageGuarantor');
    const guarantor = new CoverageGuarantor({ engine: detection.engine });
    const coverageReport = await guarantor.auditAndRecover(texts, translations, {
      engine: detection.engine,
      gameId: path.basename(targetDir),
      sl,
      tl,
      provider: options.provider || 'google'
    });

    // Validação com QAEngine (restaura tokens antes do QA para validar strings finais)
    let qaErrorsCount = 0;
    let qaWarningsCount = 0;
    for (const t of texts) {
      let tr = translations.get(t.id);
      if (tr) {
        if (t.tokens && t.tokens.length > 0 && adapter && adapter.codeProtector) {
          const restored = adapter.codeProtector.restore(tr, t.tokens);
          tr = restored.restoredText;
          translations.set(t.id, tr);
        }
        const qaRes = QAEngine.validate(t.clean, tr, { expectedTokens: t.tokens });
        if (qaRes.qaStatus === 'fail') qaErrorsCount++;
        else if (qaRes.qaStatus === 'warn') qaWarningsCount++;
      }
    }

    if (global.log) global.log('info', '[Pipeline QA] Status: ' + qaErrorsCount + ' erros, ' + qaWarningsCount + ' alertas.');

    // Validação estrutural do Adapter
    let valResult;
    try {
      valResult = await adapter.validate(targetDir, texts, translations);
    } catch (valErr) {
      if (global.log) global.log('error', '[Pipeline] Exceção durante validação do adapter: ' + (valErr.stack || valErr.message));
      return { success: false, error: 'Exceção na validação: ' + valErr.message, stack: valErr.stack };
    }

    if (!valResult || !valResult.valid) {
      const errList = valResult && valResult.errors ? valResult.errors : ['Validação do adapter retornou inválido sem detalhes.'];
      if (global.log) global.log('error', '[Pipeline] Validação falhou: ' + errList.join('; '));
      return { success: false, error: 'Validação pré-aplicação falhou.', details: errList };
    }

    // Aplicação Transacional
    try {
      const applyResult = await adapter.apply(targetDir, texts, translations, options);
      if (!applyResult || !applyResult.success) {
        const errorDetail = (applyResult && applyResult.error)
          ? applyResult.error
          : (applyResult && applyResult.validation && applyResult.validation.errors && applyResult.validation.errors.length > 0
              ? applyResult.validation.errors.join('; ')
              : 'Erro desconhecido na aplicação do adapter');
        if (global.log) global.log('warn', `[Pipeline] Falha na aplicação: ${errorDetail}. Executando rollback seguro...`);
        await adapter.rollback(targetDir, options);
        return {
          success: false,
          error: errorDetail,
          details: (applyResult && applyResult.validation && applyResult.validation.errors) || [errorDetail]
        };
      }

      const appliedCount = (applyResult.count !== undefined) ? applyResult.count : translations.size;
      const unappliedDiffs = texts.filter(t => {
        const tr = translations.get(t.id);
        return tr && tr !== t.clean;
      });
      const pendingCount = texts.length - (coverageReport.finalCovered || translations.size);
      const alreadyUpToDate = appliedCount === 0 && pendingCount === 0 &&
        (unappliedDiffs.length === 0 || unappliedDiffs.length <= Math.max(15, Math.round(texts.length * 0.01)));

      // Emissão e Verificação Formal do Certificado de Tradução
      const TranslationCertificate = require('./translationCertificate');
      const certificate = TranslationCertificate.issue({
        engine: detection.engine,
        game: path.basename(targetDir),
        totalDetected: texts.length,
        translatable: texts.length,
        cacheHits,
        translatedNow: translations.size - cacheHits,
        pendingCount: texts.length - (coverageReport.finalCovered || translations.size),
        coveredTexts: coverageReport.finalCovered || translations.size,
        appliedCount,
        alreadyUpToDate,
        isRateLimited: !!isRateLimitedEncountered,
        providerStatus: isRateLimitedEncountered ? 'RATE_LIMITED' : 'OK',
        fallbackStatus: coverageReport.fallbackAttempted ? (coverageReport.fallbackSucceeded ? 'SUCCEEDED' : 'FAILED') : 'NONE',
        qaErrorsCount,
        isCriticallyDeficient: coverageReport.isCriticallyDeficient || false
      });

      if (!certificate.isSuccess) {
        if (global.log) {
          global.log('warn', `[Pipeline] Status Final: ${certificate.finalStatus} — ${certificate.reason}`);
        }
        return {
          success: false,
          status: certificate.finalStatus,
          error: certificate.reason,
          message: certificate.reason,
          certificate,
          engine: detection.engine,
          engineVersion: detection.engineVersion,
          totalStrings: texts.length,
          appliedCount,
          coveragePercent: certificate.metrics.coveragePercent
        };
      }

      if (certificate.flags.isPartial) {
        if (global.log) {
          global.log('warn', `[Pipeline] Concluído Parcialmente! ${appliedCount} textos aplicados (${certificate.metrics.coveragePercent}% de cobertura).`);
        }
      } else {
        if (global.log) {
          global.log('success', `[Pipeline] Concluído com Sucesso Integral! ${appliedCount} textos aplicados.`);
        }
      }

      return {
        success: true,
        status: certificate.finalStatus,
        certificate,
        engine: detection.engine,
        engineVersion: detection.engineVersion,
        totalStrings: texts.length,
        cacheHits,
        translatedNew: pendingTexts.length,
        appliedCount,
        qaErrorsCount,
        qaWarningsCount,
        modifiedFiles: applyResult.modifiedFiles || []
      };
    } catch (err) {
      if (global.log) global.log('error', '[Pipeline] Exceção durante aplicação. Executando rollback...');
      await adapter.rollback(targetDir, options);
      return { success: false, error: err.message };
    }
  }
}

module.exports = TranslationPipeline;
