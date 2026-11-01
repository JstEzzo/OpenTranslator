/**
 * translationCertificate.js — Certificação de Tradução e Integridade
 *
 * FASE 2 / PASSO 2 — SINGLE SOURCE OF TRUTH PARA SUCCESS
 *
 * PROBLEMA CORRIGIDO (causa raiz):
 *   A versão anterior emitia, para uma entrada VAZIA (TranslationCertificate.issue({})):
 *     finalStatus = "COMPLETED", isSuccess = true
 *     reason = "Tradução concluída e aplicada com sucesso."
 *   Motivo: nenhum dos 5 blocos de falha disparava (todos exigiam pendingCount>0
 *   OU coveredTexts>0). O default era sucesso.
 *   Além disso, PARTIAL era emitido com isSuccess = true (linha 76 antiga),
 *   e patchResult podia ser "SUCCESS" enquanto finalStatus era "PARTIAL".
 *
 * INVARIANTES DESTA IMPLEMENTAÇÃO (garantidas por construção + assert):
 *
 *   I1  status === "COMPLETED"  <=>  isSuccess === true
 *       Nenhum outro status pode ter isSuccess === true. Isso e' imposto em
 *       finalize(), nao por convencao: qualquer combinacao invalida LANCA.
 *
 *   I2  COMPLETED exige TODAS as evidencias:
 *         engine != UNKNOWN
 *         game != UNKNOWN
 *         totalDetected > 0        (houve varredura real)
 *         translatable > 0        (universo traduzivel calculado)
 *         pendingCount === 0
 *         failedCount === 0
 *         coveredTexts >= translatable
 *         appliedCount > 0 OU alreadyUpToDate (com evidencia de verificacao)
 *         qaErrorsCount === 0
 *         nao rate-limited
 *         nao UNSUPPORTED
 *         runtime verificado, se exigido
 *
 *   I3  PARTIAL           => isSuccess = false
 *   I4  INCOMPLETE        => isSuccess = false
 *   I5  FAILED_APPLICATION=> isSuccess = false
 *   I6  FAILED_QA         => isSuccess = false
 *   I7  RATE_LIMITED      => isSuccess = false
 *   I8  UNSUPPORTED       => isSuccess = false
 *   I9  UNKNOWN           => isSuccess = false
 *   I10 patchResult nunca contradiz finalStatus
 *
 * Este módulo NÃO verifica nada por conta própria. Ele CLASSIFICA e REJEITA.
 * A verificação física (arquivos realmente alterados, hash conferido) é
 * responsabilidade do pipeline e chega em appliedCount/verificationStatus.
 */

'use strict';

/** Status possíveis. Ordem importa para o relatório. */
const CERT_STATUS = Object.freeze({
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_RATE_LIMITED: 'INCOMPLETE_RATE_LIMITED',
  FAILED_APPLICATION: 'FAILED_APPLICATION',
  FAILED_QA: 'FAILED_QA',
  UNSUPPORTED: 'UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
  BLOCKED: 'BLOCKED',
});

/** Status que implicam isSuccess === false por definição. */
const NEVER_SUCCESS_STATUSES = new Set([
  CERT_STATUS.PARTIAL,
  CERT_STATUS.INCOMPLETE,
  CERT_STATUS.INCOMPLETE_RATE_LIMITED,
  CERT_STATUS.FAILED_APPLICATION,
  CERT_STATUS.FAILED_QA,
  CERT_STATUS.UNSUPPORTED,
  CERT_STATUS.UNKNOWN,
  CERT_STATUS.BLOCKED,
]);

const SENTINEL_UNKNOWN = 'unknown';

/**
 * Universo mínimo para que "PARTIAL" seja uma afirmação honesta.
 * Abaixo disso, qualquer pendência é tratada como INCOMPLETE: com 8 textos e
 * 1 pendente, 87% de cobertura não é uma tradução parcial, é uma tradução
 * quase inexistente apresentada como parcial.
 */
const MIN_UNIVERSE_FOR_PARTIAL = 20;

function isUnknownToken(v) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === '' || s === SENTINEL_UNKNOWN || s === 'null' || s === 'undefined';
}

function num(v, fb = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fb;
}

class TranslationCertificate {
  /**
   * Emite o certificado a partir de métricas do pipeline.
   *
   * @param {object} params
   * @param {string} params.engine            engine detectado
   * @param {string} params.game              jogo identificado
   * @param {number} params.totalDetected     textos encontrados na varredura
   * @param {number} params.translatable      universo traduzível
   * @param {number} params.cacheHits         resolvidos por cache
   * @param {number} params.translatedNow     traduzidos por provider
   * @param {number} params.pendingCount      ainda pendentes
   * @param {number} params.failedCount       falhas
   * @param {number} params.appliedCount      textos FISICAMENTE aplicados
   * @param {boolean} params.alreadyUpToDate  sem alteração necessária
   * @param {object} params.verification      {filesChanged, verified, method}
   * @param {string} params.runtimeStatus     UNVERIFIED|RUNTIME_VERIFIED|NOT_REQUIRED
   * @param {boolean} params.runtimeRequired
   * @param {number} params.qaErrorsCount
   * @param {boolean} params.isUnsupported
   * @param {boolean} params.isRateLimited
   * @param {boolean} params.isFallbackFailed
   */
  static issue(params = {}) {
    const engine = params.engine || SENTINEL_UNKNOWN;
    // Aliases aceitos: o resto do projeto identifica jogo por `gameKey`
    // (rpcHandlers) ou `gameId` (translationMemory). Aceitar só `game` fazia
    // o certificado recusar com "Jogo não identificado" chamadas que Loading
    // passavam gameKey legítimamente — um falso negativo que escondia o
    // resultado real do pipeline.
    const game = params.game || params.gameKey || params.gameId || SENTINEL_UNKNOWN;

    const totalDetected = num(params.totalDetected);
    const translatable = params.translatable !== undefined ? num(params.translatable) : totalDetected;
    // FASE 4 / PASSO 29 — Proveniência do universo.
    //
    // O pipeline usava `texts.length` como total detectado E como tradutível,
    // o que fazia a cobertura 100% por construção: o denominador era o
    // numerador. Um adapter que lesse 200 de 3.000 textos reportaria
    // "tradução completa".
    //
    // `universeComplete` e `universeUnknown` dizem se a contagem cobre o jogo
    // inteiro. Sem isso, o certificado pode descrever com precisão o que foi
    // feito e ainda assim parecer uma afirmação sobre o jogo inteiro.
    const universeComplete = params.universeComplete === true;
    const universeUnknown = params.universeUnknown === true;
    const universeSource = params.universeSource || 'UNSPECIFIED';
    const unseenCount = Math.max(0, num(params.unseenCount));
    const cacheHits = num(params.cacheHits);
    const translatedNow = num(params.translatedNow);
    const failedCount = num(params.failedCount);
    const appliedCount = num(params.appliedCount);

    // pendingCount: usa o informado se for coerente; senao deriva.
    // Derivar por (translatable - covered) evita que o pipeline esconda
    // pendenciasInformando um numero menor.
    const coveredTexts = params.coveredTexts !== undefined
      ? num(params.coveredTexts)
      : (cacheHits + translatedNow);
    const derivedPending = Math.max(0, translatable - coveredTexts);
    const pendingCount = Math.max(
      num(params.pendingCount),
      // Nunca aceitar pending menor do que a aritmética indica.
      derivedPending,
    );

    const alreadyUpToDate = !!params.alreadyUpToDate;
    const qaErrorsCount = num(params.qaErrorsCount);
    const qaWarningsCount = num(params.qaWarningsCount);

    const isRateLimited = !!params.isRateLimited
      || String(params.providerStatus || '').toUpperCase() === 'RATE_LIMITED';
    const isUnsupported = !!params.isUnsupported;
    const isFallbackFailed = !!params.isFallbackFailed;
    const providerStatus = params.providerStatus || (isRateLimited ? 'RATE_LIMITED' : 'OK');
    const fallbackStatus = params.fallbackStatus || (isFallbackFailed ? 'FAILED' : 'NONE');

    const runtimeStatus = params.runtimeStatus || 'UNVERIFIED';
    const runtimeRequired = !!params.runtimeRequired;
    const runtimeVerified = runtimeStatus === 'RUNTIME_VERIFIED'
      || runtimeStatus === 'NOT_REQUIRED';

    // Verificação física: o pipeline precisa dizer que conferiu.
    const verification = params.verification || {};
    const verificationStatus = params.verificationStatus
      || (verification.verified ? 'VERIFIED' : 'PENDING');
    const verificationOk = verificationStatus === 'VERIFIED' || alreadyUpToDate;

    // ------------------------------------------------------------------
    // Classificação. Cada ramo define status E isSuccess de forma coerente.
    // Não existe caminho que atribua status não-COMPLETED com isSuccess=true.
    // ------------------------------------------------------------------
    let finalStatus;
    let reason;
    let violations = [];

    // ------------------------------------------------------------------
    // COERENCIA DOS COUNTERS (B-10 / B-11 / B-12).
    //
    // Estas relacoes sao aritmeticas, nao opinativas:
    //   coveredTexts  = textos cobertos (cache + traduzidos agora)
    //   translatable  = universo traduzivel declarado
    //   appliedCount  = textos fisicamente gravados
    // Nenhuma pode exceder o seu universo. Antes these dados incoerentes
    // produziam `pendingCount = 0` (porque translatable - covered fica
    // negativo e o Math.max zera) e destravavam o ramo COMPLETED, com o
    // reason asserting "9999/100 textos" -- uma frase autocontraditoria.
    //
    // Nao mascaramos com clamp: a incoerencia e registrada e o certificado
    // rebaixa, porque um certificado com numeros impossiveis nao pode
    // afirmar completude sobre nada.
    // ------------------------------------------------------------------
    const incoerencias = [];
    if (coveredTexts > translatable && translatable > 0) {
      incoerencias.push(
        `coveredTexts (${coveredTexts}) excede translatable (${translatable})`,
      );
    }
    if (translatedNow > totalDetected && totalDetected > 0) {
      incoerencias.push(
        `translatedNow (${translatedNow}) excede totalDetected (${totalDetected})`,
      );
    }
    if (coveredTexts > 0 && appliedCount > coveredTexts) {
      incoerencias.push(
        `appliedCount (${appliedCount}) excede coveredTexts (${coveredTexts})`,
      );
    }
    // Contagens nao podem ser negativas: um -1 significa que o produtor
    // calculou a diferenca ao contrario. Sem esta guarda, `appliedCount: -1`
    // produz `applicationPercent: -100`, que e um percentual invalido exposto.
    if (appliedCount < 0 || coveredTexts < 0 || translatedNow < 0 || totalDetected < 0 || translatable < 0) {
      incoerencias.push('contagem negativa em totalDetected/translatable/coveredTexts/appliedCount');
    }
    // Nao-finite nao pode virar 0 silencioso: `num()` cai no fallback, e um
    // fallback 0 parece "nada foi aplicado" em vez de "o produtor mandou NaN".
    const naoFinitos = Object.entries({
      totalDetected: params.totalDetected, translatable: params.translatable,
      coveredTexts: params.coveredTexts, appliedCount: params.appliedCount,
      translatedNow: params.translatedNow, pendingCount: params.pendingCount,
      failedCount: params.failedCount,
    }).filter(([, v]) => typeof v === 'number' && !Number.isFinite(v)).map(([k]) => k);
    if (naoFinitos.length) {
      incoerencias.push('valor nao-finito em: ' + naoFinitos.join(', '));
    }

    const coveragePercent = translatable > 0
      ? Math.min(100, Math.round((coveredTexts / translatable) * 100))
      : 0;
    // Simetrico com coveragePercent: o teto aqui impede que uma razao
    // invalida seja exibida como "50000%". A incoerencia que a produziu
    // ja foi registrada acima e rebaixa o certificado; o clamp aqui existe
    // apenas para que o numero exposto nunca seja invalido.
    const applicationPercent = coveredTexts > 0
      ? Math.min(100, Math.max(0, Math.round((appliedCount / coveredTexts) * 100)))
      : 0;

    if (incoerencias.length > 0) {
      // Precede QUALQUER outro ramo: nao faz sentido classificar
      // PARTIAL/INCOMPLETE/COMPLETED a partir de numeros que nao descrevem
      // um estado possivel.
      finalStatus = CERT_STATUS.FAILED_QA;
      reason = `Metricas incoerentes (${incoerencias.length}): `
        + incoerencias.join('; ') + '. Nenhum estado de traducao pode ser '
        + 'afirmado a partir de contadores impossiveis.';
    } else if (isUnsupported) {
      finalStatus = CERT_STATUS.UNSUPPORTED;
      reason = params.unsupportedReason
        || 'Engine sem adapter aplicável: SAFE_UNSUPPORTED (nenhuma alteração foi feita).';
    } else if (isUnknownToken(engine)) {
      finalStatus = CERT_STATUS.UNKNOWN;
      reason = 'Engine não identificado. Nenhum trabalho foi executado — recusado por segurança.';
    } else if (isUnknownToken(game)) {
      finalStatus = CERT_STATUS.UNKNOWN;
      reason = 'Jogo não identificado. Nenhum trabalho foi executado — recusado por segurança.';
    } else if (translatable <= 0 || totalDetected <= 0) {
      finalStatus = CERT_STATUS.UNKNOWN;
      reason = totalDetected <= 0
        ? 'Nenhum texto foi detectado no jogo. Nada a traduzir.'
        : 'Nenhum texto traduzível foi identificado entre os textos detectados.';
    } else if (isRateLimited && pendingCount > 0) {
      finalStatus = CERT_STATUS.INCOMPLETE_RATE_LIMITED;
      reason = `Rate limit do provedor: ${pendingCount}/${translatable} textos pendentes `
        + `(fallback: ${fallbackStatus}).`;
    } else if (qaErrorsCount > 0) {
      finalStatus = CERT_STATUS.FAILED_QA;
      reason = `Validação de QA reprovada: ${qaErrorsCount} erro(s) impeditivo(s).`;
    } else if (coveredTexts > 0 && appliedCount === 0 && !alreadyUpToDate) {
      // Distincao entre "a traducao nao terminou" e "a aplicacao falhou".
      //
      // `translationPipeline.js:638` ja encerra o fluxo ANTES do certificado
      // quando `applyResult.success === false` — entao chegar aqui com
      // applied === 0 e pending > 0 NAO e "o apply foi tentado e falhou".
      // E o caso real de traducao parcial: sobrou texto para traduzir, o
      // pipeline nao tinha o que aplicar ainda, e o certificado rotulava isso
      // como erro de aplicacao.
      //
      // Ja havia trabalho para aplicar? -> se covered > 0 e pending === 0, a
      // traducao acabou e nada foi gravado: isso E falha de aplicacao.
      // Se pending > 0, a traducao esta em andamento: e INCOMPLETE.
      if (pendingCount > 0) {
        finalStatus = CERT_STATUS.INCOMPLETE;
        reason = `Traducao incompleta: ${coveredTexts}/${translatable} textos cobertos `
          + `(${coveragePercent}%), ${pendingCount} ainda pendentes; `
          + 'nada foi aplicado porque ainda havia traducao a fazer.';
      } else {
        finalStatus = CERT_STATUS.FAILED_APPLICATION;
        reason = `Inconsistência de aplicação: ${coveredTexts} textos disponíveis, `
          + 'mas 0 foram gravados nos arquivos do jogo.';
      }
    } else if (verificationStatus !== 'VERIFIED' && !alreadyUpToDate) {
      finalStatus = CERT_STATUS.FAILED_APPLICATION;
      reason = 'A aplicação não foi verificada: nenhum relatório de verificação foi produzido.';
    } else if (runtimeRequired && !runtimeVerified) {
      finalStatus = CERT_STATUS.INCOMPLETE;
      reason = `Runtime exigido mas não confirmado (status: ${runtimeStatus}).`;
    } else if (universeUnknown) {
      // FASE 4 — o universo é desconhecido: sabemos o que fizemos, mas não
      // quanto havia para fazer. Isso não é COMPLETED, porque COMPLETED
      // afirma completude sobre o jogo. É INCOMPLETE com a causa nomeada.
      finalStatus = CERT_STATUS.INCOMPLETE;
      reason = `Universo de textos desconhecido (fonte: ${universeSource}). `
        + `A cobertura de ${coveragePercent}% vale sobre ${translatable} textos `
        + 'extraídos, não sobre o jogo inteiro; não é possível afirmar completude.';
    } else if (!universeComplete && unseenCount > 0) {
      finalStatus = CERT_STATUS.INCOMPLETE;
      reason = `${unseenCount} texto(s) do jogo não foram extraídos `
        + `(universo declarado: ${totalDetected}, carregados: ${coveredTexts} cobertos `
        + `de ${translatable} traduzíveis).`;
    } else if (pendingCount > 0) {
      // Cobertura parcial nunca é sucesso.
      // INCOMPLETE quando o déficit é material (>= 50% pendente) ou quando o
      // universo é pequeno demais para que "parcial" signifique algo
      // (com 8 textos e 1 pendente, dizer "parcial" é fraudar cobertura).
      finalStatus = CERT_STATUS.PARTIAL;
      const deficit = pendingCount >= translatable * 0.5;
      const universeTooSmallForPartial = translatable < MIN_UNIVERSE_FOR_PARTIAL;
      if (deficit || universeTooSmallForPartial) {
        finalStatus = CERT_STATUS.INCOMPLETE;
        reason = `Cobertura insuficiente: ${coveredTexts}/${translatable} (${coveragePercent}%), `
          + `${pendingCount} pendentes.`;
      } else {
        reason = `Tradução parcial: ${coveredTexts}/${translatable} (${coveragePercent}%), `
          + `${pendingCount} pendentes.`;
      }
    } else if (failedCount > 0) {
      finalStatus = CERT_STATUS.INCOMPLETE;
      reason = `${failedCount} texto(s) falharam durante a tradução.`;
    } else {
      // Único caminho que pode chegar a COMPLETED.
      finalStatus = CERT_STATUS.COMPLETED;
      reason = alreadyUpToDate
        ? 'Jogo já atualizado: todas as traduções já estão presentes nos arquivos.'
        : `Tradução concluída: ${coveredTexts}/${translatable} textos, `
          + `${appliedCount} aplicados, validação aprovada.`;
    }

    // ------------------------------------------------------------------
    // Evidências que COMPLETED exige. Se alguma faltar, COMPLETED rebaixa.
    // ------------------------------------------------------------------
    if (finalStatus === CERT_STATUS.COMPLETED) {
      if (isUnknownToken(engine)) violations.push('engine desconhecido');
      if (isUnknownToken(game)) violations.push('jogo desconhecido');
      if (totalDetected <= 0) violations.push('nenhum texto detectado');
      if (translatable <= 0) violations.push('universo traduzível vazio');
      if (pendingCount > 0) violations.push(`pendingCount=${pendingCount}`);
      if (failedCount > 0) violations.push(`failedCount=${failedCount}`);
      if (coveredTexts < translatable) {
        violations.push(`coveredTexts(${coveredTexts}) < translatable(${translatable})`);
      }
      if (!alreadyUpToDate && appliedCount <= 0) violations.push('appliedCount=0');
      if (!alreadyUpToDate && verificationStatus !== 'VERIFIED') {
        violations.push(`verificationStatus=${verificationStatus}`);
      }
      if (qaErrorsCount > 0) violations.push(`qaErrorsCount=${qaErrorsCount}`);
      if (isRateLimited) violations.push('rate limited');
      if (runtimeRequired && !runtimeVerified) violations.push(`runtime=${runtimeStatus}`);
      // FASE 4 — COMPLETED afirma completude sobre o jogo. Se o universo não
      // é conhecido, ou há textos que não foram extraídos, a afirmação não se
      // sustenta: sem isso, um adapter que lê 200 de 3.000 textos produz
      // COMPLETED com 100% de cobertura.
      if (universeUnknown) violations.push(`universo desconhecido (${universeSource})`);
      if (!universeComplete && unseenCount > 0) violations.push(`${unseenCount} textos não extraídos`);

      if (violations.length > 0) {
        finalStatus = CERT_STATUS.INCOMPLETE;
        reason = `Evidências insuficientes para COMPLETED: ${violations.join('; ')}.`;
      }
    }

    // ------------------------------------------------------------------
    // Invariante I1: só COMPLETED pode ter isSuccess === true.
    // Imposto aqui, depois de toda a classificação.
    // ------------------------------------------------------------------
    const isSuccess = finalStatus === CERT_STATUS.COMPLETED;

    // I10: patchResult coerente com finalStatus.
    // A ordem importa: FAILED_APPLICATION tem precedência sobre APPLIED, porque
    // "apliquei N textos mas a verificação falhou" é uma FALHA, não uma
    // aplicação bem-sucedida. Sem esta precedência, o certificado dizia
    // FAILED_APPLICATION com patchResult=APPLIED (contradicao).
    let patchResult;
    if (finalStatus === CERT_STATUS.FAILED_APPLICATION) {
      patchResult = appliedCount > 0 ? 'APPLIED_UNVERIFIED' : 'FAILED_NO_PATCH';
    } else if (alreadyUpToDate && appliedCount === 0) {
      patchResult = 'ALREADY_UP_TO_DATE';
    } else if (appliedCount > 0) {
      patchResult = 'APPLIED';
    } else {
      patchResult = 'NONE';
    }

    const certificate = {
      isSuccess,
      finalStatus,
      reason,
      violations,

      engine,
      game,

      detectedTexts: totalDetected,
      translatableTexts: translatable,
      universeComplete,
      universeUnknown,
      universeSource,
      unseenCount,
      alreadyTranslated: cacheHits,
      cachedValid: cacheHits,
      translatedNow,
      coveredTexts,
      pendingCount,
      failedCount,
      appliedCount,
      qaWarningsCount,

      patchResult,
      coveragePercent,
      applicationPercent,
      providerStatus,
      fallbackStatus,
      runtimeStatus,
      runtimeRequired,
      verificationStatus,
      // Evidência completa da verificação em disco. Fica exposta no
      // certificado para que qualquer consumidor possa auditar quantos textos
      // foram realmente confirmados — e não apenas acreditar em `verified`.
      verification: {
        verified: verificationOk,
        method: verification.method || null,
        checked: num(verification.checked),
        present: num(verification.present),
        missing: num(verification.missing),
        evidenceHash: verification.evidenceHash || null,
        detail: verification.detail || null,
      },

      metrics: {
        totalDetected,
        translatable,
        universeComplete,
        universeUnknown,
        unseenCount,
        cacheHits,
        translatedNow,
        coveredTexts,
        pendingCount,
        failedCount,
        appliedCount,
        qaErrorsCount,
        coveragePercent,
        applicationPercent,
        filesChanged: verification.filesChanged === undefined ? null : verification.filesChanged,
        verificationMethod: verification.method || null,
      },

      flags: {
        isRateLimited,
        isFallbackFailed,
        isUnsupported,
        isPartial: finalStatus === CERT_STATUS.PARTIAL,
        isIncomplete: finalStatus === CERT_STATUS.INCOMPLETE
          || finalStatus === CERT_STATUS.INCOMPLETE_RATE_LIMITED,
        isFullyComplete: finalStatus === CERT_STATUS.COMPLETED,
        isVerified: verificationStatus === 'VERIFIED' || alreadyUpToDate,
      },

      timestamp: new Date().toISOString(),
    };

    // Assert final: se por algum motivo futuro a classificação violar a
    // invariante, o certificado é destruído em vez de emitido.
    TranslationCertificate.assertInvariants(certificate);

    return certificate;
  }

  /**
   * Invariantes estruturais do certificado.
   * Lança se alguma for violada. Chamado automaticamente por issue().
   *
   * @param {object} cert
   */
  static assertInvariants(cert) {
    if (!cert || typeof cert !== 'object') {
      throw new TranslationCertificateInvariantError('certificado inexistente');
    }

    // I1
    if (cert.isSuccess === true && cert.finalStatus !== CERT_STATUS.COMPLETED) {
      throw new TranslationCertificateInvariantError(
        `INVARIANTE I1 VIOLADA: isSuccess=true com finalStatus='${cert.finalStatus}'. `
        + 'Somente COMPLETED pode ser sucesso.',
      );
    }

    // I3..I9
    if (cert.finalStatus !== CERT_STATUS.COMPLETED && cert.isSuccess !== false) {
      throw new TranslationCertificateInvariantError(
        `INVARIANTE VIOLADA: finalStatus='${cert.finalStatus}' exige isSuccess=false, veio `
        + `${cert.isSuccess}.`,
      );
    }

    // I2: COMPLETED exige as evidências mínimas.
    if (cert.finalStatus === CERT_STATUS.COMPLETED) {
      if (!cert.engine || cert.engine === SENTINEL_UNKNOWN) {
        throw new TranslationCertificateInvariantError('INVARIANTE I2: COMPLETED sem engine.');
      }
      if (!cert.game || cert.game === SENTINEL_UNKNOWN) {
        throw new TranslationCertificateInvariantError('INVARIANTE I2: COMPLETED sem jogo.');
      }
      if (cert.translatableTexts <= 0) {
        throw new TranslationCertificateInvariantError('INVARIANTE I2: COMPLETED com universo vazio.');
      }
      if (cert.pendingCount !== 0) {
        throw new TranslationCertificateInvariantError(
          `INVARIANTE I2: COMPLETED com ${cert.pendingCount} pendentes.`,
        );
      }
      if (cert.failedCount !== 0) {
        throw new TranslationCertificateInvariantError(
          `INVARIANTE I2: COMPLETED com ${cert.failedCount} falhas.`,
        );
      }
      if (cert.appliedCount <= 0 && cert.patchResult !== 'ALREADY_UP_TO_DATE') {
        throw new TranslationCertificateInvariantError(
          'INVARIANTE I2: COMPLETED sem aplicação física confirmada.',
        );
      }
      if (cert.flags && cert.isRateLimited) {
        throw new TranslationCertificateInvariantError('INVARIANTE I2: COMPLETED com rate limit.');
      }
    }

    // I10
    if (cert.finalStatus === CERT_STATUS.FAILED_APPLICATION
        && cert.patchResult === 'APPLIED') {
      throw new TranslationCertificateInvariantError(
        'INVARIANTE I10: FAILED_APPLICATION com patchResult=APPLIED.',
      );
    }
    if (cert.finalStatus === CERT_STATUS.COMPLETED
        && cert.patchResult !== 'APPLIED'
        && cert.patchResult !== 'ALREADY_UP_TO_DATE') {
      throw new TranslationCertificateInvariantError(
        `INVARIANTE I10: COMPLETED com patchResult='${cert.patchResult}'.`,
      );
    }

    return true;
  }

  /**
   * Verdadeiro se o certificado representa uma Tradução realmente concluída.
   * @param {object} cert
   */
  static isCompleted(cert) {
    try {
      TranslationCertificate.assertInvariants(cert);
    } catch (_) {
      return false;
    }
    return Boolean(cert && cert.finalStatus === CERT_STATUS.COMPLETED && cert.isSuccess === true);
  }

  /**
   * Converte uma falha arbitrária em certificado FAILED (nunca em sucesso).
   * Usado pelo pipeline quando uma etapa lança exceção.
   */
  static fromFailure(reason, context = {}) {
    return TranslationCertificate.issue(Object.assign({}, context, {
      engine: context.engine || SENTINEL_UNKNOWN,
      game: context.game || SENTINEL_UNKNOWN,
      totalDetected: context.totalDetected || 0,
      translatable: context.translatable || 0,
      qaErrorsCount: (context.qaErrorsCount || 0) + 1,
appliedCount: 0,
      pendingCount: context.translatable || 1,
      alreadyUpToDate: false,
      failureReason: reason,
    }));
  }
}

/** Erro de violacao de invariante do certificado. */
class TranslationCertificateInvariantError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranslationCertificateInvariantError';
  }
}

module.exports = TranslationCertificate;
module.exports.CERT_STATUS = CERT_STATUS;
module.exports.TranslationCertificateInvariantError = TranslationCertificateInvariantError;
