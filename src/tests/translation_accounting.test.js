const assert = require("assert");
const TranslationAccounting = require("../core/translationAccounting");

console.log("=== TEST SUITE: Translation Accounting & Integrity Identities ===");

(() => {
  const TOTAL = 1000;
  const acc = new TranslationAccounting(TOTAL);

  // 1. Simula 400 locais e 100 globais em cache
  for (let i = 0; i < 400; i++) acc.registerCached(`id_${i}`, true);
  for (let i = 400; i < 500; i++) acc.registerCached(`id_${i}`, false);

  // 2. Simula 350 traduzidos pelo provedor
  for (let i = 500; i < 850; i++) acc.registerTranslated(`id_${i}`, true);

  // 3. Simula 50 que falharam
  for (let i = 850; i < 900; i++) acc.registerFailed(`id_${i}`, "RATE_LIMIT");

  // 4. Simula 50 ignorados/skipped
  for (let i = 900; i < 950; i++) acc.registerSkipped(`id_${i}`, "CODE");

  // 5. Restam 50 pendentes
  assert.strictEqual(acc.pending, 50, "Pending must match remaining");

  // 6. Validação da Identidade Fundamental:
  // EXTRACTED = CACHED_LOCAL + CACHED_GLOBAL + TRANSLATED_PROVIDER + FAILED + SKIPPED + PENDING
  const integrity = acc.validateIntegrity();
  assert.strictEqual(integrity.valid, true, "Accounting identity must hold 100%");
  assert.strictEqual(integrity.computed, TOTAL);
  assert.strictEqual(integrity.discrepancy, 0);

  // 7. Auditoria de Patches
  acc.recordPatch({
    fromLocalCache: 400,
    fromGlobalCache: 100,
    fromProvider: 350,
    fromFallback: 0,
    skipped: 50
  });

  const sum = acc.getSummary();
  assert.strictEqual(sum.patched.total, 850);
  assert.strictEqual(sum.patched.fromLocalCache, 400);
  assert.strictEqual(sum.patched.fromGlobalCache, 100);
  assert.strictEqual(sum.patched.fromProvider, 350);

  console.log("  ✓ Mathematical identity EXTRACTED === COMPUTED verified");
  console.log("  ✓ Granular patch count breakdown verified");
  console.log("✓ PASS: Translation Accounting Test Suite Complete.\n");
})();
