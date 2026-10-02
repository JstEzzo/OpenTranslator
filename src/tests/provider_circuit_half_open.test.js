/**
 * OpenTranslator — provider_circuit_half_open.test.js
 * Testa o protocolo HALF_OPEN com probe de saúde único e backoff exponencial.
 */

const assert = require("assert");
const GlobalCircuitBreaker = require("../core/globalCircuitBreaker");

async function run() {
  console.log("=== TEST SUITE: Provider Circuit Half-Open & Backoff ===");
  const cb = GlobalCircuitBreaker.getInstance();
  cb.reset("mock:test");

  // 1. Simula Request 1 -> 429
  cb.recordError("mock:test", { type: "RATE_LIMITED", statusCode: 429 });
  let health = cb.getProviderHealth("mock:test");
  assert.strictEqual(health.state, "RATE_LIMITED", "Must enter RATE_LIMITED on 429");
  assert.strictEqual(health.consecutive429, 1, "consecutive429 must be 1");

  // Simula passagem do cooldown mínimo (força cooldownUntil no passado)
  const p = cb._getProviderState("mock:test");
  p.cooldownUntil = Date.now() - 1000;

  // 2. Dispara 10 workers simultaneamente
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(cb.canExecute("mock:test"));
  }

  const probes = results.filter(r => r.allowed && r.isProbe);
  const normalAllowed = results.filter(r => r.allowed && !r.isProbe);
  const blocked = results.filter(r => !r.allowed);

  assert.strictEqual(probes.length, 1, "Exactly 1 health probe must be allowed during HALF_OPEN");
  assert.strictEqual(normalAllowed.length, 0, "Zero normal requests allowed during HALF_OPEN");
  assert.strictEqual(blocked.length, 9, "Remaining 9 workers must be blocked pending probe");
  console.log("  ✓ Half-Open single probe constraint verified (1 probe, 9 blocked)");

  // 3. Simula probe com 429 (Reincidência -> backoff exponencial)
  cb.recordError("mock:test", { type: "RATE_LIMITED", statusCode: 429 });
  health = cb.getProviderHealth("mock:test");
  assert.strictEqual(health.state, "RATE_LIMITED", "Must return to RATE_LIMITED after failed probe");
  assert.strictEqual(health.consecutive429, 2, "consecutive429 must increment to 2");
  
  // 4. Simula expiração de novo e probe com sucesso 200
  p.cooldownUntil = Date.now() - 1000;
  const probe2 = cb.canExecute("mock:test");
  assert.strictEqual(probe2.isProbe, true, "Probe allowed on subsequent window");
  cb.recordSuccess("mock:test");
  
  health = cb.getProviderHealth("mock:test");
  assert.strictEqual(health.state, "AVAILABLE", "Must recover to AVAILABLE on probe success");
  assert.strictEqual(health.consecutive429, 0, "consecutive429 reset to 0");
  assert.strictEqual(health.concurrency, 4, "Concurrency restored");
  console.log("  ✓ Circuit recovery to AVAILABLE with restored concurrency verified");

  console.log("✓ PASS: Provider Circuit Half-Open & Backoff Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
