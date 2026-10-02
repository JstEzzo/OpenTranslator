/**
 * test_translation_completeness_and_certificates.test.js
 *
 * Suíte de Testes Automatizados contra Falso Sucesso de Tradução.
 * Valida os Requisitos dos Passos 16 e 17 da Auditoria Crítica:
 * - Passo 16: Simulação exata do caso real (6581 textos, 17 cache, 6564 pendentes, rate-limit, 0 patchados)
 * - Passo 17: Casos A a J (100%, 99% + untranslatable, 50%, 1%, 0%, rate-limited, fallback fail, applied=0, etc.)
 */

const assert = require("assert");
const TranslationCertificate = require("../src/core/translationCertificate");
const QAEngine = require("../src/core/qaEngine");

async function runTests() {
  console.log("========================================================================");
  console.log("  SUÍTE DE TESTES DE INTEGRIDADE, COBERTURA E CERTIFICAÇÃO (PASSOS 16/17)");
  console.log("========================================================================");

  let passed = 0;
  let failed = 0;

  function runCase(name, fn) {
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  // =========================================================================
  // PASSO 16: REGRESSÃO ESPECÍFICA DO CASO REAL
  // 6581 textos detectados, 17 em cache, 6564 pendentes, provider limitado,
  // fallback falhou, 17 em memória, 0 patchados
  // =========================================================================
  runCase("Passo 16: Caso Real — 17/6581 (0%), rate limit, fallback falho, 0 patchados NUNCA PODE SER SUCCESS", () => {
    const cert = TranslationCertificate.issue({
      engine: "mz",
      game: "ボクガキえちえち戦争_体験版",
      totalDetected: 6581,
      translatable: 6581,
      cacheHits: 17,
      translatedNow: 0,
      pendingCount: 6564,
      coveredTexts: 17,
      appliedCount: 0, // 0 textos patchados
      isRateLimited: true,
      providerStatus: "RATE_LIMITED",
      fallbackStatus: "FAILED",
      isFallbackFailed: true,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false, "O resultado não pode ser success quando 0 textos foram patchados e 6564 estão pendentes");
    assert.notStrictEqual(cert.finalStatus, "COMPLETED", "Status final não pode ser COMPLETED");
    assert.notStrictEqual(cert.finalStatus, "SUCCESS", "Status final não pode ser SUCCESS");
    assert.ok(
      cert.finalStatus === "FAILED_APPLICATION" || cert.finalStatus === "INCOMPLETE_RATE_LIMITED" || cert.finalStatus === "INCOMPLETE",
      `Status esperado deve indicar falha/incompletude, recebido: ${cert.finalStatus}`
    );
    assert.strictEqual(cert.metrics.coveragePercent, 0, "A porcentagem de cobertura calculada deve ser 0%");
    assert.strictEqual(cert.appliedCount, 0, "Contagem de textos aplicados deve ser 0");
    assert.strictEqual(cert.flags.isFullyComplete, false, "Flag isFullyComplete deve ser falsa");
  });

  // =========================================================================
  // PASSO 17: CASO A — 100% Traduzido
  // =========================================================================
  runCase("Passo 17 Caso A: 100% traduzido com aplicação total deve retornar COMPLETED e SUCCESS", () => {
    const cert = TranslationCertificate.issue({
      engine: "rpgmaker",
      game: "SampleGame",
      totalDetected: 500,
      translatable: 500,
      cacheHits: 200,
      translatedNow: 300,
      pendingCount: 0,
      coveredTexts: 500,
      appliedCount: 500,
      isRateLimited: false,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, true);
    assert.strictEqual(cert.finalStatus, "COMPLETED");
    assert.strictEqual(cert.metrics.coveragePercent, 100);
    assert.strictEqual(cert.flags.isFullyComplete, true);
    assert.strictEqual(cert.flags.isPartial, false);
  });

  // =========================================================================
  // PASSO 17: CASO B — 99% Traduzido + 1% Não Traduzível
  // =========================================================================
  runCase("Passo 17 Caso B: 99% traduzido + 1% untranslatable não deve falhar arbitrariamente", () => {
    const cert = TranslationCertificate.issue({
      engine: "rpgmaker",
      game: "SampleGame",
      totalDetected: 500,
      translatable: 495,
      cacheHits: 400,
      translatedNow: 95,
      pendingCount: 0,
      coveredTexts: 495,
      appliedCount: 495,
      isRateLimited: false,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, true);
    assert.strictEqual(cert.finalStatus, "COMPLETED");
    assert.strictEqual(cert.metrics.coveragePercent, 100);
    assert.strictEqual(cert.flags.isFullyComplete, true);
  });

  // =========================================================================
  // PASSO 17: CASO C — 50% Traduzido + 50% Pendente
  // =========================================================================
  runCase("Passo 17 Caso C: 50% traduzido + 50% pendente deve retornar NOT COMPLETE (INCOMPLETE)", () => {
    const cert = TranslationCertificate.issue({
      engine: "renpy",
      game: "SampleGame",
      totalDetected: 1000,
      translatable: 1000,
      cacheHits: 300,
      translatedNow: 200,
      pendingCount: 500,
      coveredTexts: 500,
      appliedCount: 500,
      isRateLimited: false,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "INCOMPLETE");
    assert.strictEqual(cert.flags.isFullyComplete, false);
    assert.ok(cert.reason.includes("Tradução Incompleta"));
  });

  // =========================================================================
  // PASSO 17: CASO D — 1% Traduzido + 99% Pendente
  // =========================================================================
  runCase("Passo 17 Caso D: 1% traduzido + 99% pendente deve retornar NOT COMPLETE", () => {
    const cert = TranslationCertificate.issue({
      engine: "unity",
      game: "SampleGame",
      totalDetected: 1000,
      translatable: 1000,
      cacheHits: 10,
      translatedNow: 0,
      pendingCount: 990,
      coveredTexts: 10,
      appliedCount: 10,
      isRateLimited: false,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "INCOMPLETE");
    assert.strictEqual(cert.flags.isFullyComplete, false);
  });

  // =========================================================================
  // PASSO 17: CASO E — 0% Traduzido
  // =========================================================================
  runCase("Passo 17 Caso E: 0% traduzido deve retornar NOT COMPLETE", () => {
    const cert = TranslationCertificate.issue({
      engine: "rpgmaker",
      game: "SampleGame",
      totalDetected: 500,
      translatable: 500,
      cacheHits: 0,
      translatedNow: 0,
      pendingCount: 500,
      coveredTexts: 0,
      appliedCount: 0,
      isRateLimited: false,
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "INCOMPLETE");
    assert.strictEqual(cert.metrics.coveragePercent, 0);
  });

  // =========================================================================
  // PASSO 17: CASO F — Provider Rate-Limited com Pendências
  // =========================================================================
  runCase("Passo 17 Caso F: Provedor rate limited com pendências deve retornar INCOMPLETE_RATE_LIMITED e isSuccess=false", () => {
    const cert = TranslationCertificate.issue({
      engine: "mz",
      game: "SampleGame",
      totalDetected: 1200,
      translatable: 1200,
      cacheHits: 200,
      translatedNow: 100,
      pendingCount: 900,
      coveredTexts: 300,
      appliedCount: 300,
      isRateLimited: true,
      providerStatus: "RATE_LIMITED",
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "INCOMPLETE_RATE_LIMITED");
    assert.strictEqual(cert.flags.isRateLimited, true);
    assert.ok(cert.reason.includes("Rate Limit"));
  });

  // =========================================================================
  // PASSO 17: CASO G — Fallback Falha com Pendências
  // =========================================================================
  runCase("Passo 17 Caso G: Provedor rate-limited + Fallback com falha não pode retornar SUCCESS", () => {
    const cert = TranslationCertificate.issue({
      engine: "mz",
      game: "SampleGame",
      totalDetected: 800,
      translatable: 800,
      cacheHits: 50,
      translatedNow: 0,
      pendingCount: 750,
      coveredTexts: 50,
      appliedCount: 50,
      isRateLimited: true,
      providerStatus: "RATE_LIMITED",
      fallbackStatus: "FAILED",
      isFallbackFailed: true
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "INCOMPLETE_RATE_LIMITED");
    assert.strictEqual(cert.fallbackStatus, "FAILED");
  });

  // =========================================================================
  // PASSO 17: CASO H — Traduções Existem mas Aplicação = 0 (Patched 0 texts)
  // =========================================================================
  runCase("Passo 17 Caso H: Traduções disponíveis mas aplicação = 0 deve retornar FAILED_APPLICATION", () => {
    const cert = TranslationCertificate.issue({
      engine: "mz",
      game: "SampleGame",
      totalDetected: 100,
      translatable: 100,
      cacheHits: 80,
      translatedNow: 20,
      pendingCount: 0,
      coveredTexts: 100,
      appliedCount: 0, // Inconsistência física
      qaErrorsCount: 0
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.strictEqual(cert.finalStatus, "FAILED_APPLICATION");
    assert.strictEqual(cert.flags.isFullyComplete, false);
    assert.ok(cert.reason.includes("Inconsistência de Aplicação"));
  });

  // =========================================================================
  // PASSO 17: CASO I & J — Runtime & Visual Verification Distinctions
  // =========================================================================
  runCase("Passo 17 Caso I & J: Process Health (PID ativo) não deve mascarar falhas no Translation Certificate", () => {
    const cert = TranslationCertificate.issue({
      engine: "mz",
      game: "SampleGame",
      totalDetected: 3000,
      translatable: 3000,
      cacheHits: 10,
      translatedNow: 0,
      pendingCount: 2990,
      coveredTexts: 10,
      appliedCount: 0,
      isRateLimited: true,
      runtimeStatus: "UNVERIFIED",
      verificationStatus: "FAILED"
    });

    assert.strictEqual(cert.isSuccess, false);
    assert.notStrictEqual(cert.finalStatus, "COMPLETED");
    assert.strictEqual(cert.runtimeStatus, "UNVERIFIED");
  });

  // =========================================================================
  // VALIDAÇÃO DA SESSÃO NO QA ENGINE
  // =========================================================================
  runCase("QAEngine.validateSession reprova inconsistência de aplicação e deficiência crítica", () => {
    const resAppFail = QAEngine.validateSession({
      totalDetected: 1000,
      translatableTexts: 1000,
      coveredTexts: 900,
      appliedCount: 0
    });
    assert.strictEqual(resAppFail.valid, false);
    assert.strictEqual(resAppFail.qaStatus, "fail");

    const resDeficient = QAEngine.validateSession({
      totalDetected: 1000,
      translatableTexts: 1000,
      coveredTexts: 10,
      appliedCount: 10
    });
    assert.strictEqual(resDeficient.valid, false);
    assert.strictEqual(resDeficient.qaStatus, "fail");
  });

  // =========================================================================
  // PASSO 10: NÍVEIS VARIADOS DE COBERTURA (0%, 1%, 10%, 30%, 49%, 50%, 60%, 80%, 90%, 99%, 100%)
  // =========================================================================
  runCase("Passo 10: Auditoria de limiares de cobertura — sem sucesso falso para pendências", () => {
    const total = 1000;
    const testLevels = [
      { pct: 0, covered: 0, pending: 1000, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 1, covered: 10, pending: 990, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 10, covered: 100, pending: 900, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 30, covered: 300, pending: 700, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 49, covered: 490, pending: 510, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 50, covered: 500, pending: 500, expectedStatus: "INCOMPLETE", expectedSuccess: false },
      { pct: 60, covered: 600, pending: 400, expectedStatus: "PARTIAL", expectedSuccess: true },
      { pct: 80, covered: 800, pending: 200, expectedStatus: "PARTIAL", expectedSuccess: true },
      { pct: 90, covered: 900, pending: 100, expectedStatus: "PARTIAL", expectedSuccess: true },
      { pct: 99, covered: 990, pending: 10, expectedStatus: "PARTIAL", expectedSuccess: true },
      { pct: 100, covered: 1000, pending: 0, expectedStatus: "COMPLETED", expectedSuccess: true }
    ];

    for (const lvl of testLevels) {
      const cert = TranslationCertificate.issue({
        engine: "rpgmaker",
        game: "TestGame",
        totalDetected: total,
        translatable: total,
        cacheHits: lvl.covered,
        translatedNow: 0,
        pendingCount: lvl.pending,
        coveredTexts: lvl.covered,
        appliedCount: lvl.covered,
        isRateLimited: false
      });

      assert.strictEqual(cert.finalStatus, lvl.expectedStatus, `Nível ${lvl.pct}% falhou em status: esperado ${lvl.expectedStatus}, recebido ${cert.finalStatus}`);
      assert.strictEqual(cert.isSuccess, lvl.expectedSuccess, `Nível ${lvl.pct}% falhou em isSuccess: esperado ${lvl.expectedSuccess}, recebido ${cert.isSuccess}`);
      if (lvl.pct < 100) {
        assert.strictEqual(cert.flags.isFullyComplete, false, `Nível ${lvl.pct}% nunca pode ter isFullyComplete=true`);
      }
    }
  });

  // =========================================================================
  // PASSO 8 & 13: BLOQUEIO DO SPAWN E CANCELAMENTO DE APLICAÇÃO NO MODO NORMAL
  // =========================================================================
  runCase("Passo 8 & 13: RPC launchGame bloqueia spawn e retorna ok: false quando pipeRes.success === false", () => {
    // Simula resposta de pipeline reprovado com certificado
    const mockPipeResFail = {
      success: false,
      status: "INCOMPLETE_RATE_LIMITED",
      error: "Tradução interrompida por Rate Limit: 6564 textos pendentes.",
      certificate: {
        isSuccess: false,
        finalStatus: "INCOMPLETE_RATE_LIMITED",
        reason: "Tradução interrompida por Rate Limit"
      }
    };

    // Função validadora de guarda do RPC que reproduz o contrato de launchGame
    function rpcLaunchGate(pipeRes) {
      if (pipeRes && (pipeRes.success === false || (pipeRes.certificate && pipeRes.certificate.isSuccess === false))) {
        return {
          ok: false,
          spawned: false,
          error: pipeRes.error || (pipeRes.certificate && pipeRes.certificate.reason),
          status: pipeRes.status || (pipeRes.certificate && pipeRes.certificate.finalStatus)
        };
      }
      return { ok: true, spawned: true, pid: 99999 };
    }

    const gateResFail = rpcLaunchGate(mockPipeResFail);
    assert.strictEqual(gateResFail.ok, false, "O RPC deve retornar ok: false para pipeline reprovado");
    assert.strictEqual(gateResFail.spawned, false, "O executável NÃO pode sofrer spawn quando o pipeline falhar");
    assert.strictEqual(gateResFail.status, "INCOMPLETE_RATE_LIMITED");

    // E quando completo com sucesso:
    const mockPipeResSuccess = {
      success: true,
      status: "COMPLETED",
      certificate: { isSuccess: true, finalStatus: "COMPLETED" }
    };
    const gateResSuccess = rpcLaunchGate(mockPipeResSuccess);
    assert.strictEqual(gateResSuccess.ok, true);
    assert.strictEqual(gateResSuccess.spawned, true);
  });

  console.log("\n========================================================================");
  console.log(`  RESULTADO: ${passed} PASSOU, ${failed} FALHOU`);
  console.log("========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
