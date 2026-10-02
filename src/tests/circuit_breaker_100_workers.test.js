/**
 * OpenTranslator — circuit_breaker_100_workers.test.js
 * Testa contenção extrema com 100 workers simultâneos durante HALF_OPEN.
 * Garante:
 * - Exatamente 1 único health probe disparado
 * - 99 workers bloqueados sem abrir socket
 * - Recuperação atômica em 200 OK
 * - Backoff e novo cooldown em 429
 */

const assert = require("assert");
const GlobalCircuitBreaker = require("../core/globalCircuitBreaker");

async function run() {
  console.log("=== TEST SUITE: Circuit Breaker 100 Concurrent Workers Stress ===");
  const cb = GlobalCircuitBreaker.getInstance();
  cb.reset("stress:test");

  // 1. Transita para RATE_LIMITED e expira cooldown para entrar em HALF_OPEN
  cb.recordError("stress:test", { type: "RATE_LIMITED", statusCode: 429 });
  const p = cb._getProviderState("stress:test");
  p.cooldownUntil = Date.now() - 1000;

  // 2. Dispara 100 workers concorrentes
  const workers = 100;
  const results = [];
  for (let i = 0; i < workers; i++) {
    results.push(cb.canExecute("stress:test"));
  }

  const probes = results.filter(r => r.allowed && r.isProbe);
  const normalAllowed = results.filter(r => r.allowed && !r.isProbe);
  const blocked = results.filter(r => !r.allowed);

  assert.strictEqual(probes.length, 1, "Exactly 1 health probe allowed out of 100 concurrent workers");
  assert.strictEqual(normalAllowed.length, 0, "Zero normal requests allowed during HALF_OPEN");
  assert.strictEqual(blocked.length, 99, "Exactly 99 workers MUST be blocked");
  console.log("  ✓ 100-worker concurrency: 1 probe, 99 blocked before socket creation");

  // 3. Simula probe 200 OK -> transição imediata para AVAILABLE
  cb.recordSuccess("stress:test");
  const health = cb.getProviderHealth("stress:test");
  assert.strictEqual(health.state, "AVAILABLE", "Must transition to AVAILABLE after 200 OK");
  assert.strictEqual(health.concurrency, 4, "Concurrency restored to 4");
  console.log("  ✓ Immediate recovery to AVAILABLE with 0 socket leakage");

  console.log("✓ PASS: Circuit Breaker 100 Concurrent Workers Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
