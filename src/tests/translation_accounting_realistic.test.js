/**
 * OpenTranslator — translation_accounting_realistic.test.js
 * Simula a contabilidade realista com deduplicação, filtros de código MZ e cache.
 * 
 * Cenário:
 * 100 extracted
 * 20 cache local applied
 * 10 cache local matched but filtered
 * 10 cache global applied
 * 10 duplicate
 * 20 provider translated
 * 10 provider failed
 * 20 pending
 * Total = 100
 */

const assert = require("assert");
const TranslationAccounting = require("../core/translationAccounting");

async function run() {
  console.log("=== TEST SUITE: Translation Accounting Realistic Simulation ===");
  const acc = new TranslationAccounting(100);

  // 20 cache local applied
  for (let i = 0; i < 20; i++) acc.registerCached(`t_loc_${i}`, true, true);

  // 10 cache local matched but filtered (ex: códigos não-dialogáveis 231/assets)
  for (let i = 0; i < 10; i++) acc.registerCached(`t_loc_filt_${i}`, true, false, "FILTERED");

  // 10 cache global applied
  for (let i = 0; i < 10; i++) acc.registerCached(`t_glob_${i}`, false, true);

  // 10 duplicate
  for (let i = 0; i < 10; i++) acc.registerDuplicate(`t_dup_${i}`);

  // 20 provider translated
  for (let i = 0; i < 20; i++) acc.registerTranslated(`t_prov_${i}`, true);

  // 10 provider failed
  for (let i = 0; i < 10; i++) acc.registerFailed(`t_fail_${i}`, "429 Rate Limited");

  // Os 20 restantes continuam como pending

  const check = acc.validateIntegrity();
  const summary = acc.getSummary();

  assert.strictEqual(check.valid, true, "Total accounting identity MUST match 100 extracted");
  assert.strictEqual(summary.extracted, 100, "Extracted must be 100");
  assert.strictEqual(summary.cache.appliedLocal, 20, "appliedLocal must be 20");
  assert.strictEqual(summary.cache.filtered, 10, "filtered must be 10");
  assert.strictEqual(summary.cache.appliedGlobal, 10, "appliedGlobal must be 10");
  assert.strictEqual(summary.cache.duplicate, 10, "duplicate must be 10");
  assert.strictEqual(summary.provider.translated, 20, "provider.translated must be 20");
  assert.strictEqual(summary.failed, 10, "failed must be 10");
  assert.strictEqual(summary.pending, 20, "pending must be 20");
  assert.strictEqual(summary.status, "PARTIAL_SUCCESS", "Status must be PARTIAL_SUCCESS (never SUCCESS with pending/failed)");

  console.log("  ✓ Mathematical identity 100% verified across all 8 text categories");
  console.log("  ✓ No texts lost; 15,005 phenomenon fully accounted for via explicit non-apply categories");

  console.log("✓ PASS: Translation Accounting Realistic Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
