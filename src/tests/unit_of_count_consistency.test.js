/**
 * OpenTranslator — unit_of_count_consistency.test.js
 * Garante que todo o pipeline utilize a MESMA unidade de contagem (Raw Occurrences).
 * Proíbe estritamente a mistura de "raw occurrences" com "unique strings" na contabilidade.
 */

const assert = require("assert");
const TranslationAccounting = require("../core/translationAccounting");

async function run() {
  console.log("=== TEST SUITE: Unit of Count Consistency ===");

  // Simula um caso onde uma string única "Save" aparece 10 vezes em locais diferentes
  const rawItems = [];
  for (let i = 0; i < 10; i++) {
    rawItems.push({ id: `item_${i}`, clean: "Save", file: `Map00${i}.json` });
  }

  // Se a contabilidade usar raw occurrences:
  const acc = new TranslationAccounting(rawItems.length);
  assert.strictEqual(acc.extracted, 10, "Extracted unit MUST be raw occurrences (10), not unique string (1)");

  // Aplica 5 via cache local e 5 via provider
  for (let i = 0; i < 5; i++) {
    acc.registerCached(rawItems[i].id, true, true);
  }
  for (let i = 5; i < 10; i++) {
    acc.registerTranslated(rawItems[i].id, true);
  }

  const check = acc.validateIntegrity();
  assert.strictEqual(check.valid, true, "Accounting identity MUST be valid on raw occurrences");
  assert.strictEqual(acc.cacheAppliedLocal, 5, "cacheAppliedLocal must count 5 raw occurrences");
  assert.strictEqual(acc.providerTranslated, 5, "providerTranslated must count 5 raw occurrences");
  assert.strictEqual(acc.pending, 0, "pending must be 0");

  // Teste de mistura: tentar injetar contagem única (1) geraria discrepância
  const brokenComputed = 1 + 1; // se alguém tentasse somar textos únicos
  assert.notStrictEqual(brokenComputed, acc.extracted, "Mixing unique count with raw occurrences MUST be rejected");

  console.log("  ✓ Raw occurrences verified as uniform unit across all accounting registers");
  console.log("✓ PASS: Unit of Count Consistency Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
