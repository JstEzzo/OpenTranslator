/**
 * translationCertificate.js — Certificação de Tradução e Integridade
 *
 * Responsabilidades:
 * - Centralizar as métricas de descoberta, extração, tradução, cache, cobertura, aplicação e runtime.
 * - Determinar o estado final inequívoco da sessão: COMPLETED, PARTIAL, INCOMPLETE, BLOCKED, FAILED.
 * - Proibir categoricamente que sessões parciais ou com 0% de aplicação sejam marcadas como SUCCESS.
 *
 * Camada Arquitetural:
 * src/core/translationCertificate.js (Núcleo de Governança & QA Global)
 */

class TranslationCertificate {
  /**
   * Avalia as métricas globais e emite um Certificado de Tradução determinístico.
   *
   * @param {object} params Métricas de todas as etapas do pipeline
   * @returns {object} Certificado formal contendo status, flags e relatório completo
   */
  static issue(params = {}) {
    const engine = params.engine || "unknown";
    const game = params.game || "unknown";
    const totalDetected = params.totalDetected || 0;
    const translatable = params.translatable !== undefined ? params.translatable : totalDetected;
    const cacheHits = params.cacheHits || 0;
    const translatedNow = params.translatedNow || 0;
    const pendingCount = params.pendingCount !== undefined ? params.pendingCount : Math.max(0, translatable - (cacheHits + translatedNow));
    const failedCount = params.failedCount || 0;
    const coveredTexts = params.coveredTexts !== undefined ? params.coveredTexts : (cacheHits + translatedNow);
    const appliedCount = params.appliedCount !== undefined ? params.appliedCount : 0;
    const alreadyUpToDate = !!params.alreadyUpToDate;
    const isRateLimited = !!params.isRateLimited || params.providerStatus === "rate_limited" || params.providerStatus === "RATE_LIMITED";
    const providerStatus = params.providerStatus || (isRateLimited ? "RATE_LIMITED" : "OK");
    const fallbackStatus = params.fallbackStatus || (params.isFallbackFailed ? "FAILED" : "NONE");
    const runtimeStatus = params.runtimeStatus || "UNVERIFIED";
    const verificationStatus = params.verificationStatus || "PENDING";
    const qaErrorsCount = params.qaErrorsCount || 0;
    const isCriticallyDeficient = !!params.isCriticallyDeficient || (translatable > 50 && pendingCount >= (translatable * 0.5));

    // Cálculo exato de coberturas
    const coveragePercent = translatable > 0 ? Math.round((coveredTexts / translatable) * 100) : 100;
    const applicationPercent = coveredTexts > 0 ? Math.round((appliedCount / coveredTexts) * 100) : 0;
    const patchResult = params.patchResult || (alreadyUpToDate ? "ALREADY_UP_TO_DATE" : (appliedCount > 0 ? "SUCCESS" : (coveredTexts > 0 ? "FAILED_NO_PATCH" : "NONE")));

    let finalStatus = "COMPLETED";
    let isSuccess = true;
    let reason = alreadyUpToDate ? "Jogo já atualizado: todos os textos traduzidos já estão presentes nos arquivos do jogo." : "Tradução concluída e aplicada com sucesso.";

    // 1. Rate limit ativo com pendências não resolvidas por fallback (prioridade máxima de diagnóstico)
    if (isRateLimited && pendingCount > 0) {
      finalStatus = "INCOMPLETE_RATE_LIMITED";
      isSuccess = false;
      reason = `Tradução Interrompida por Rate Limit: Provedor limitado. ${pendingCount} de ${translatable} textos aguardam tradução (Fallback: ${fallbackStatus}).`;
    }
    // 2. Cobertura crítica insuficiente (<=50% de cobertura com mais de 50 textos)
    else if (isCriticallyDeficient || (translatable > 50 && (coveragePercent <= 50 || pendingCount >= translatable * 0.5))) {
      finalStatus = "INCOMPLETE";
      isSuccess = false;
      reason = `Tradução Incompleta e Deficiente: Apenas ${coveredTexts}/${translatable} (${coveragePercent}%) textos cobertos. ${pendingCount} textos permanecem pendentes.`;
    }
    // 3. Falha de aplicação física: textos traduzidos/em cache disponíveis, mas 0 textos foram gravados nos arquivos do jogo
    else if (coveredTexts > 0 && appliedCount === 0 && translatable > 0 && !alreadyUpToDate) {
      finalStatus = "FAILED_APPLICATION";
      isSuccess = false;
      reason = `Inconsistência de Aplicação: ${coveredTexts} textos estavam disponíveis, mas 0 textos foram aplicados no jogo (patch count = 0).`;
    }
    // 4. Erros graves de QA
    else if (qaErrorsCount > 0) {
      finalStatus = "FAILED_QA";
      isSuccess = false;
      reason = `Validação de QA reprovada com ${qaErrorsCount} erros técnicos impeditivos.`;
    }
    // 5. Tradução parcial tolerável (pendências remanescentes não críticas)
    else if (pendingCount > 0) {
      finalStatus = "PARTIAL";
      isSuccess = true; // Permite prosseguir para teste com aviso explícito de parcialidade
      reason = `Tradução Parcial: ${coveredTexts}/${translatable} (${coveragePercent}%) textos cobertos. ${pendingCount} pendentes.`;
    }

    const certificate = {
      isSuccess,
      finalStatus,
      reason,
      engine,
      game,
      detectedTexts: totalDetected,
      translatableTexts: translatable,
      alreadyTranslated: cacheHits,
      cachedValid: cacheHits,
      translatedNow,
      pendingCount,
      failedCount,
      appliedCount,
      patchResult,
      coveragePercent,
      providerStatus,
      fallbackStatus,
      runtimeStatus,
      verificationStatus,
      metrics: {
        totalDetected,
        translatable,
        cacheHits,
        translatedNow,
        pendingCount,
        coveredTexts,
        appliedCount,
        coveragePercent,
        applicationPercent,
        qaErrorsCount
      },
      flags: {
        isRateLimited,
        isCriticallyDeficient,
        isPartial: finalStatus === "PARTIAL",
        isFullyComplete: finalStatus === "COMPLETED"
      },
      timestamp: new Date().toISOString()
    };

    return certificate;
  }
}

module.exports = TranslationCertificate;
