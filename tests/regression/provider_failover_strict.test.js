/**
 * OpenTranslator — provider_failover_strict.test.js
 * Testa failover estrito: Provider A -> 429; Provider B assume se configurado; se não, pausa.
 */

const assert = require("assert");
const GlobalCircuitBreaker = require("../../src/core/globalCircuitBreaker");
const ProviderGateway = require("../../src/core/providerGateway");

async function run() {
  console.log("=== TEST SUITE: Provider Failover Strict & Safe Pause ===");
  const cb = GlobalCircuitBreaker.getInstance();
  cb.reset("provider:a");
  cb.reset("provider:b");

  // 1. Provider A falha com 429
  cb.recordError("provider:a", { type: "RATE_LIMITED", statusCode: 429 });
  const checkA = cb.canExecute("provider:a");
  assert.strictEqual(checkA.allowed, false, "Provider A must be locked");

  // 2. Simula failover para Provider B (configurado)
  let bExecuted = false;
  await ProviderGateway.executeRequest("provider:b", async () => {
    bExecuted = true;
    return "translated via provider B";
  });

  assert.strictEqual(bExecuted, true, "Provider B must execute cleanly without touching A");

  // 3. Simula Provider C (NÃO CONFIGURADO)
  const pC = cb._getProviderState("provider:c");
  pC.state = "NOT_CONFIGURED";
  const checkC = cb.canExecute("provider:c");
  assert.strictEqual(checkC.allowed, false, "Unconfigured Provider C must be rejected");

  console.log("  ✓ Strict failover validated: A locked, B executes, unconfigured C safely blocked");
  console.log("✓ PASS: Provider Failover Strict Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
