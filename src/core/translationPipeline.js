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
const crypto = require('crypto');
const EngineDetector = require('./engineDetector');
const defaultRegistry = require('./engineRegistry');
const CodeProtector = require('./codeProtector');
const BackupManager = require('./backupManager');
const QAEngine = require('./qaEngine');
const TranslationQuality = require('./translationQuality');
const translationMemory = require('./translationMemory');

// Registra adapters
const RenpyAdapter = require('../engines/renpy/renpyAdapter');
const RpgMakerAdapter = require('../engines/rpgmaker/rpgMakerAdapter');
const ElectronAdapter = require('../engines/electron/electronAdapter');
const UnityAdapter = require('../engines/unity/unityAdapter');
const GenericAdapter = require('../engines/generic/genericAdapter');

const { buildUniverse } = require('../translation/extraction/buildUniverse');

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
    if (!extractResult || extractResult.success !== true) {
      return { success: false, dryRun: true, status: 'FAILED_EXTRACTION', detection,
        error: extractResult?.error || 'Adapter did not confirm successful extraction',
        totalStrings: 0, universeComplete: false };
    }
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

    // FASE 4 / PASSO 29 — FALHA DE EXTRAÇÃO NÃO É "NADA PARA TRADUZIR"
    //
    // A condição original era:
    //
    //   if (!extractResult.success || (extractResult.count || 0) === 0) {
    //     return { success: true, count: 0, message: 'Nenhum texto traduzível pendente.' };
    //   }
    //
    // Se a EXTRAÇÃO FALHASSE — adapter que explodiu, jogo protegido, disco
    // ilegível — a resposta era sucesso com a mensagem "nenhum texto
    // pendente". O usuário lia "não há nada a fazer" quando o motivo real era
    // que nada tinha sido lido. Isso é a pior forma de falso sucesso: não
    // exige erro visível, e a mensagem afirmava o oposto do que aconteceu.
    //
    // As duas condições agora têm respostas distintas e verificáveis.
    if (!extractResult || extractResult.success !== true) {
      const reason = (extractResult && (extractResult.error || extractResult.reason))
        || 'adapter não confirmou sucesso na extração';
      if (global.log) {
        global.log('error', '[Pipeline] Falha na extração: ' + reason);
      }
      return {
        success: false,
        status: 'FAILED_EXTRACTION',
        error: `Falha na extração de textos: ${reason}`,
        reason,
        detection,
        engine: detection.engine,
        engineVersion: detection.engineVersion,
        // Nada foi lido, então nada foi traduzido. Dizê-lo explicitamente
        // impede que o consumidor trate "0 textos" como "jogo vazio".
        totalStrings: 0,
        extractedCount: 0,
        universeComplete: false,
      };
    }

    // Sucesso confirmado e genuinely vazio: aí sim, não há o que traduzir.
    if ((extractResult.count || 0) === 0) {
      return {
        success: true,
        status: 'NOTHING_TO_TRANSLATE',
        count: 0,
        message: 'Nenhum texto traduzível encontrado. A extração foi concluída e o jogo não expõe texto a traduzir.',
        detection,
        totalStrings: 0,
        extractedCount: 0,
        universeComplete: true,
      };
    }

    const texts = extractResult.texts;
    const textsById = new Map(texts.map(text => [text.id, text]));
    const gameIdentity = options.gameId || crypto.createHash('sha256').update(path.resolve(targetDir)).digest('hex');
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
          if (rawData && rawData.translations &&
              String(rawData.langSource || rawData.sl || '').replace(/_/g, '-').toLowerCase() === String(sl).replace(/_/g, '-').toLowerCase() &&
              String(rawData.langTarget || rawData.tl || '').replace(/_/g, '-').toLowerCase() === String(tl).replace(/_/g, '-').toLowerCase()) {
            localGameCache = rawData.translations;
            break;
          } else if (options.allowLegacyCache === true && rawData && typeof rawData === "object") {
            localGameCache = rawData;
            break;
          }
        } catch (e) {}
      }
    }

    const { loadCommonTranslations, getCommonTranslation } = require('../services/cache');
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
          gameId: gameIdentity,
          langSource: sl, langTarget: tl
        });
      }

      if (!cached) {
        const cTr = getCommonTranslation(t.clean, sl, tl, commonTrans) ||
                    getCommonTranslation(t.original, sl, tl, commonTrans);
        if (typeof cTr === 'string' && cTr.trim().length > 0) {
          cached = cTr;
        }
      }

      const isActuallyTranslated = typeof cached === 'string' && cached.trim().length > 0 &&
        cached.trim() !== t.clean.trim() && cached.trim() !== (t.original || '').trim() &&
        TranslationQuality.inspect(t.clean, cached).valid;
      if (isActuallyTranslated) {
        translations.set(t.id, cached);
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
        const translator = require('../translation/translator');
        const cache = require('../services/cache');
        const glossary = cache.loadGlossary();

        const activeEngine = options.engine || options.provider || 'multi';
        const allowProviderFallback = options.allowProviderFallback === true || activeEngine === 'multi';

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
                    gameId: gameIdentity,
                    langSource: sl, langTarget: tl,
                    filePath: item.file
                  });
                }
              }
            }
          },
          { allowProviderFallback }
        );

        if (newTranslations.rejectedTranslations?.length) {
          return { success:false, status:'FAILED_QA', error:'Provider output failed translation quality checks. No game files were modified.',
            details:newTranslations.rejectedTranslations, appliedCount:0, pending:newTranslations.rejectedTranslations.length };
        }
        for (const [id, tr] of newTranslations) {
          const origObj = textsById.get(id);
          const isRealTranslation = tr && typeof tr === 'string' && tr.trim().length > 0 &&
            (origObj && tr.trim() !== origObj.clean.trim());
          if (isRealTranslation) {
            translations.set(id, tr);
            accounting.registerTranslated(id, true);
            if (origObj && tr.trim() !== origObj.clean.trim()) {
              translationMemory.store(origObj.clean, tr, {
                engine: detection.engine,
                gameId: gameIdentity,
                langSource: sl, langTarget: tl,
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
            if (allowProviderFallback) global.log('info', `Ativando fallback automático para Papago (${remainingPending.length} textos pendentes)...`);
          }

          try {
            if (!allowProviderFallback) throw new Error('Provider fallback is disabled for the selected provider.');
            const fallbackTranslations = await translator.translateBatch(
              remainingPending,
              sl,
              tl,
              'papago',
              glossary
            );

            if (fallbackTranslations && fallbackTranslations.size > 0) {
              for (const [id, tr] of fallbackTranslations) {
                const origObj = textsById.get(id);
                const isRealTranslation = tr && typeof tr === 'string' && tr.trim().length > 0 &&
                  (origObj && tr.trim() !== origObj.clean.trim());
                if (isRealTranslation) {
                  translations.set(id, tr);
                  accounting.registerTranslated(id, true);
                  if (origObj && tr.trim() !== origObj.clean.trim()) {
                    translationMemory.store(origObj.clean, tr, {
                      engine: detection.engine,
                      gameId: gameIdentity,
                      langSource: sl, langTarget: tl,
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
            gameId: gameIdentity,
            langSource: sl, langTarget: tl,
            engine: detection.engine,
            targetLang: tl,
            provider: options.engine || options.provider || 'multi',
      allowProviderFallback: options.allowProviderFallback === true,
      allowNetworkFallback: options.allowNetworkFallback !== false && !isRateLimitedEncountered,
            pendingTexts: remainingPending,
            completedTexts: Array.from(translations.entries()),
            cachedTexts: cacheHits,
            cooldownUntil: health.cooldownUntil
          });

          // Modo Normal (padrão): Aplicação parcial é terminantemente proibida quando a tradução foi interrompida com pendências
          if (options.allowPartial !== true && remainingPending.length > 0) {
            const TranslationCertificate = require('./translationCertificate');
            // FASE 4 / PASSO 29 — Este segundo ponto de emissão tinha o mesmo
            // defeito de universo do primeiro: `totalDetected: texts.length`
            // e `translatable: texts.length`. Aqui ele era menos visível
            // porque o status já era de falha, mas a contagem de pendência
            // exibida ao usuário era calculada sobre um universo inventado.
            const universeRL = buildUniverse({
              extractResult, texts, options,
            });
            const certificate = TranslationCertificate.issue({
              engine: detection.engine,
              game: path.basename(targetDir),
              gameKey: path.basename(targetDir),
              totalDetected: universeRL.totalDetected,
              translatable: universeRL.translatable,
              universeComplete: universeRL.complete,
              universeUnknown: universeRL.unknown,
              universeSource: universeRL.source,
              unseenCount: universeRL.unseenCount,
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
      gameId: gameIdentity,
      langSource: sl, langTarget: tl,
      sl,
      tl,
      provider: options.engine || options.provider || 'multi',
      allowProviderFallback: options.allowProviderFallback === true,
      allowNetworkFallback: options.allowNetworkFallback !== false && !isRateLimitedEncountered
    });

    // Validação com QAEngine (restaura tokens antes do QA para validar strings finais)
    let qaErrorsCount = 0;
    let qaWarningsCount = 0;
    const qualityFailures = [];
    for (const t of texts) {
      let tr = translations.get(t.id);
      if (tr) {
        if (t.tokens && t.tokens.length > 0 && adapter && adapter.codeProtector) {
          const restored = adapter.codeProtector.restore(tr, t.tokens);
          tr = restored.restoredText;
          translations.set(t.id, tr);
        }
        const quality = TranslationQuality.inspect(t.original || t.clean, tr);
        if (!quality.valid) qualityFailures.push({ id:t.id, issues:quality.issues });
        const qaRes = QAEngine.validate(t.clean, tr, { expectedTokens: t.tokens });
        if (qaRes.qaStatus === 'fail') qaErrorsCount++;
        else if (qaRes.qaStatus === 'warn') qaWarningsCount++;
      }
    }

    if (global.log) global.log('info', '[Pipeline QA] Status: ' + qaErrorsCount + ' erros, ' + qaWarningsCount + ' alertas.');

    if (qualityFailures.length) {
      return { success:false, status:'FAILED_QA', error:'Translation contains repeated words or invalid model output. No game files were modified.',
        details:qualityFailures, appliedCount:0, pending:qualityFailures.length };
    }

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

    // =====================================================================
    // FASE 10 / D1 — O CAMINHO DO PRODUTO PASSOU A SER TRANSACIONAL
    // =====================================================================
    //
    // O comentario desta seção dizia "Aplicação Transacional" desde a FASE 6,
    // e a linha seguinte era `await adapter.apply(...)`. O comentário mentia,
    // que é a mesma classe de defeito que a FASE 9 acabou de remover em 26
    // lugares: um rótulo que descreve uma garantia que o código não tem.
    //
    // `applyTransaction` existia, tinha 18 asserts, e NÃO era o caminho do
    // produto. Pior: ela é fail-closed por projeto — sem `options.filesToBackup`
    // ela recusa escrever, porque não tem como saber o que copiar. Ligá-la
    // sem gate derrubaria toda tradução de todos os 17 adapters, nenhum dos
    // quais declara a lista de arquivos nem devolve `fileHashes`.
    //
    // Então a integração é CAPABILITY-GATED, e a cobertura é medida em teste
    // (`tests/unit/pipelineTransaction.test.js`) para que a dívida restante
    // seja um número reportável, e não uma frase esquecida num relatório.
    //
    // O que muda para os adapters transacionais: backup verificado ANTES de
    // qualquer escrita, journal com estado final, e rollback passando pelo
    // mesmo caminho. O que NÃO muda para os demais: eles seguem no apply
    // direto, com o `verifyApplied` da FASE 2 — que já é verificação real
    // pós-apply, releendo o jogo do disco.
    try {
    const podeUsarTransacao = !!(adapter && adapter.transactional === true
      && Array.isArray(options.filesToBackup) && options.filesToBackup.length > 0);

    let applyResult;
    let transactionInfo = null;

    if (podeUsarTransacao) {
      const { applyTransaction, STATUS: TX_STATUS } = require('./applyTransaction');
      const tx = await applyTransaction({
        adapter,
        gameDir: targetDir,
        texts,
        translations,
        options,
      });
      transactionInfo = {
        used: true,
        status: tx.status,
        committed: tx.committed === true,
        journalId: tx.journalId || null,
        files: typeof tx.files === 'number' ? tx.files : null,
        durationMs: typeof tx.durationMs === 'number' ? tx.durationMs : null,
      };
      applyResult = {
        success: tx.status === TX_STATUS.COMMITTED,
        error: tx.error || null,
        transaction: tx,
      };
      if (global.log) {
        global.log(
          tx.status === TX_STATUS.COMMITTED ? 'info' : 'warn',
          `[Pipeline] Transação ${tx.status} (journal ${tx.journalId || '-'}).`,
        );
      }
    } else {
      if (global.log) {
        global.log('info',
          '[Pipeline] Aplicação sem transação: o adapter não declara '
          + '`transactional`/`filesToBackup`. Segue com apply direto e '
          + 'verificação pós-apply (applyVerifier).');
      }
      applyResult = await adapter.apply(targetDir, texts, translations, options);
    }

    if (!applyResult || !applyResult.success) {
        const errorDetail = (applyResult && applyResult.error)
          ? applyResult.error
          : (applyResult && applyResult.validation && applyResult.validation.errors && applyResult.validation.errors.length > 0
              ? applyResult.validation.errors.join('; ')
              : 'Erro desconhecido na aplicação do adapter');
        if (global.log) global.log('warn', `[Pipeline] Falha na aplicação: ${errorDetail}. Executando rollback seguro...`);
        // FASE 2 / PASSO 23 — o resultado do rollback é verificado e declarado.
        // Antes o retorno era descartado: uma falha de aplicação com rollback
        // falho era indistinguível de uma falha de aplicação limpa.
        let rollbackInfo;
        try {
          const rb = await adapter.rollback(targetDir, options);
          rollbackInfo = (rb === true || (rb && rb.success === true))
            ? { attempted: true, ok: true, detail: (rb && rb.detail) || 'rollback confirmado' }
            : {
              attempted: true,
              ok: false,
              detail: (rb && (rb.error || rb.detail))
                || 'adapter não confirmou o rollback',
            };
        } catch (rbErr) {
          rollbackInfo = { attempted: true, ok: false, detail: `rollback lançou: ${rbErr.message}` };
        }
        if (global.log) {
          global.log(
            rollbackInfo.ok ? 'warn' : 'error',
            `[Pipeline] Rollback ${rollbackInfo.ok ? 'CONCLUÍDO' : 'NÃO CONFIRMADO'}: ${rollbackInfo.detail}`,
          );
        }
        return {
          success: false,
          clean: rollbackInfo.ok,
          rollback: rollbackInfo,
          error: errorDetail,
          warning: rollbackInfo.ok
            ? null
            : 'ATENÇÃO: o rollback não foi confirmado. O jogo pode estar em estado parcial.',
          details: (applyResult && applyResult.validation && applyResult.validation.errors) || [errorDetail]
        };
      }

      const appliedCount = (applyResult.count !== undefined) ? applyResult.count : translations.size;

      // ------------------------------------------------------------------
      // FASE 2 / PASSO 22 — VERIFICAÇÃO PÓS-APLICAÇÃO EM DISCO
      //
      // `applyResult.count` é o que o adapter DISSE que fez. Antes disto o
      // certificado aceitava essa autoinformação como prova, e um adapter que
      // gravasse menos do que afirmava produzia sucesso integral.
      // Agora relemos o jogo do disco e comparamos. O que não estiver lá
      // conta como falha, e o certificado rebaixa sozinho.
      // ------------------------------------------------------------------
      let verificationReport = null;
      try {
        const { verifyApplied } = require('./applyVerifier');
        verificationReport = await verifyApplied({
          adapter,
          targetDir,
          texts,
          translations,
          options,
        });
        if (global.log) {
          global.log(
            verificationReport.verified ? 'info' : 'warn',
            `[Pipeline] Verificação em disco: ${verificationReport.present}`
            + `/${verificationReport.checked} presentes, `
            + `${verificationReport.missing} ausentes.`
            + (verificationReport.verified ? '' : ` Motivo: ${verificationReport.reason}`),
          );
        }
      } catch (verErr) {
        verificationReport = {
          verified: false,
          method: 'POST_APPLY_REEXTRACT',
          checked: 0,
          present: 0,
          missing: 0,
          reason: `verificação lançou exceção: ${verErr.message}`,
          evidenceHash: null,
        };
        if (global.log) {
          global.log('error', '[Pipeline] Falha na verificação pós-apply: ' + verErr.message);
        }
      }

      const unappliedDiffs = texts.filter(t => {
        const tr = translations.get(t.id);
        return tr && tr !== t.clean;
      });
      const pendingCount = texts.length - (coverageReport.finalCovered || translations.size);

      // FASE 2 — `alreadyUpToDate` sem a escotilha dos "15 diffs tolerados".
      // A condição antiga aceitava até max(15, 1%) de diferenças não
      // aplicadas e ainda declarava o jogo atualizado: trabalho real ficava
      // invisível. "Já atualizado" significa exatamente zero diferenças.
      const alreadyUpToDate = appliedCount === 0 && pendingCount === 0 && unappliedDiffs.length === 0;

      // Status de runtime. Quando o runtime é exigido e o chamador não traz
      // prova, o status fica UNVERIFIED e o certificado NÃO pode ser
      // COMPLETED. Fail-closed: melhor bloquear o sucesso do que affirmar
      // uma verificação de runtime que ninguém fez.
      // (A verificação de runtime em si é escopo da fase de runtime.)
      const runtimeRequired = Boolean(options.runtimeRequired);
      const runtimeStatusForCertificate = runtimeRequired
        ? (options.runtimeVerified === true ? 'RUNTIME_VERIFIED' : 'UNVERIFIED')
        : 'NOT_REQUIRED';

      // Emissão e Verificação Formal do Certificado de Tradução
      const TranslationCertificate = require('./translationCertificate');

      // FASE 4 / PASSO 29 — O UNIVERSO É O QUE O ADAPTER DECLAROU, NÃO O QUE
      // ELE DEVOLVEU.
      //
      // O certificado recebia `totalDetected: texts.length` e
      // `translatable: texts.length`. Ou seja, o denominador da cobertura era
      // exatamente o numerador: o que o pipeline conseguiu carregar. Assim,
      // 100% de cobertura era garantido por construção, qualquer que fosse o
      // estado real do jogo, e um adapter que extraísse 200 de 3.000 textos
      // reportaria "100% traduzido".
      //
      // Agora o universo vem do próprio adapter, que é quem sabe o que
      // encontrou no jogo, e o certificado exige que essa contagem esteja
      // declarada. Quando o adapter não sabe, isso é registrado como
      // `universeUnknown` — e a cobertura deixa de ser interpretável como
      // afirmação sobre o jogo inteiro.
      const universe = buildUniverse({
        extractResult,
        texts,
        options,
        coverageReport,
      });

      const certificate = TranslationCertificate.issue({
        engine: detection.engine,
        game: path.basename(targetDir),
        gameKey: path.basename(targetDir),
        totalDetected: universe.totalDetected,
        translatable: universe.translatable,
        // Quando o universo é desconhecido e maior que o que vimos, o
        // pendente é tudo que não foi visto.
        universeComplete: universe.complete,
        universeUnknown: universe.unknown,
        universeSource: universe.source,
        unseenCount: universe.unseenCount,
        cacheHits,
        translatedNow: translations.size - cacheHits,
        // pendingCount/coveredTexts vêm da MESMA expressão — antes eram
        // calculados duas vezes em linhas diferentes, com risco de divergência.
        pendingCount,
        coveredTexts: coverageReport.finalCovered || translations.size,
        appliedCount: verificationReport && verificationReport.present > 0
          ? verificationReport.present
          : appliedCount,
        alreadyUpToDate,
        isRateLimited: !!isRateLimitedEncountered,
        providerStatus: isRateLimitedEncountered ? 'RATE_LIMITED' : 'OK',
        fallbackStatus: coverageReport.fallbackAttempted ? (coverageReport.fallbackSucceeded ? 'SUCCEEDED' : 'FAILED') : 'NONE',
        qaErrorsCount,
        isCriticallyDeficient: coverageReport.isCriticallyDeficient || false,
        // Evidência real: a releitura do disco.
        verification: {
          verified: Boolean(verificationReport && verificationReport.verified),
          method: verificationReport ? verificationReport.method : null,
          checked: verificationReport ? verificationReport.checked : 0,
          present: verificationReport ? verificationReport.present : 0,
          missing: verificationReport ? verificationReport.missing : 0,
          evidenceHash: verificationReport ? verificationReport.evidenceHash : null,
          detail: verificationReport ? verificationReport.reason : null,
        },
        runtimeStatus: runtimeStatusForCertificate,
        runtimeRequired,
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
      // FASE 2 / PASSO 23 — ROLLBACK COM RESULTADO VERIFICADO
      //
      // O catch antigo chamava `adapter.rollback(...)` e descartava o
      // retorno, respondendo só `{success:false, error}`. Se o rollback
      // falhasse, o usuário recebia a mesma resposta de "deu errado, não
      // mudou nada" — quando na verdade o jogo podia ter ficado pela metade.
      // Isso é o pior caso possível: erro com estado desconhecido escrito
      // como se fosse erro limpo.
      //
      // Agora o rollback é executado, seu resultado é inspecionado, e o
      // estado do jogo é declarado na resposta.
      if (global.log) {
        global.log('error', '[Pipeline] Exceção durante aplicação. Executando rollback...');
      }
      let rollback = { attempted: true, ok: false, detail: 'rollback não retornou' };
      try {
        const rb = await adapter.rollback(targetDir, options);
        if (rb === true) {
          rollback = { attempted: true, ok: true, detail: 'rollback confirmou restauração' };
        } else if (rb && rb.success === true) {
          rollback = { attempted: true, ok: true, detail: rb.detail || 'rollback confirmado pelo adapter' };
        } else if (rb && rb.success === false) {
          rollback = {
            attempted: true,
            ok: false,
            detail: rb.error || rb.detail || 'adapter reportou rollback falho',
          };
        } else {
          rollback = {
            attempted: true,
            ok: false,
            detail: 'adapter não confirmou o rollback (retorno sem success)',
          };
        }
      } catch (rbErr) {
        rollback = { attempted: true, ok: false, detail: `rollback lançou: ${rbErr.message}` };
      }

      if (global.log) {
        global.log(
          rollback.ok ? 'warn' : 'error',
          `[Pipeline] Rollback ${rollback.ok ? 'CONCLUÍDO' : 'NÃO CONFIRMADO'}: ${rollback.detail}`,
        );
      }

      return {
        success: false,
        error: err.message,
        // `clean:false` significa: o estado do jogo NÃO é garantidamente o
        // original. O consumidor é obrigado a mostrar isso ao usuário.
        clean: rollback.ok,
        rollback,
        warning: rollback.ok
          ? null
          : 'ATENÇÃO: o rollback não foi confirmado. O jogo pode estar em estado '
            + 'parcial. Verifique os arquivos antes de tentar novamente.',
      };
    }
  }
}

module.exports = TranslationPipeline;
