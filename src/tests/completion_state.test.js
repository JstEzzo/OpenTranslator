const assert = require("assert");
const TranslationAccounting = require("../core/translationAccounting");

console.log("=== TEST SUITE: Completion State & Anti-False-Success Verification ===");

(() => {
  // Cenário do usuário: 100 extraídos, 20 cached, 30 translated, 50 pendentes/rate-limited
  const acc = new TranslationAccounting(100);

  for (let i = 0; i < 20; i++) acc.registerCached(`c_${i}`, true);
  for (let i = 20; i < 50; i++) acc.registerTranslated(`t_${i}`, true);

  // 50 continuam PENDING
  assert.strictEqual(acc.pending, 50);

  // Status NÃO PODE SER SUCCESS!
  const status = acc.getCompletionStatus();
  assert.notStrictEqual(status, "SUCCESS", "Pipeline MUST NOT declare SUCCESS when pending > 0");
  assert.strictEqual(status, "PARTIAL_SUCCESS", "Must be PARTIAL_SUCCESS or PAUSED_RATE_LIMIT");

  // Cenário 100% pendente por 429 inicial
  const accBlocked = new TranslationAccounting(100);
  assert.strictEqual(accBlocked.getCompletionStatus(), "PAUSED_RATE_LIMIT", "Zero translated must be PAUSED_RATE_LIMIT");

  // Cenário de sucesso legítimo
  const accFull = new TranslationAccounting(50);
  for (let i = 0; i < 50; i++) accFull.registerTranslated(`f_${i}`, true);
  assert.strictEqual(accFull.getCompletionStatus(), "SUCCESS", "Full completion must be SUCCESS");

  console.log("  ✓ False SUCCESS declaration strictly prohibited");
  console.log("  ✓ Accurate PARTIAL_SUCCESS and PAUSED_RATE_LIMIT transitions verified");
  console.log("✓ PASS: Completion State Test Suite Complete.\n");
})();
