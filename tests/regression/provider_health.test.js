const assert = require("assert");
const GlobalCircuitBreaker = require("../../src/core/globalCircuitBreaker");

console.log("=== TEST SUITE: Provider Health Monitoring & Schema ===");

(() => {
  const breaker = GlobalCircuitBreaker.getInstance();
  breaker.reset("google:gtx");

  // Health inicial
  const h1 = breaker.getProviderHealth("google:gtx");
  assert.strictEqual(h1.provider, "google:gtx");
  assert.strictEqual(h1.state, "AVAILABLE");
  assert.strictEqual(h1.inFlight, 0);
  assert.strictEqual(h1.requestsBlocked, 0);

  // Simula erro 429
  breaker.recordError("google:gtx", { type: "RATE_LIMITED", statusCode: 429, retryAfterMs: 600000 });

  // Tenta requests enquanto bloqueado
  breaker.canExecute("google:gtx");
  breaker.canExecute("google:gtx");
  breaker.canExecute("google:gtx");

  const h2 = breaker.getProviderHealth("google:gtx");
  assert.strictEqual(h2.state, "RATE_LIMITED");
  assert.strictEqual(h2.concurrency, 0);
  assert.strictEqual(h2.requests429, 1);
  assert.strictEqual(h2.requestsBlocked, 3);
  assert.ok(h2.cooldownUntil !== null, "CooldownUntil must be an ISO string timestamp");
  assert.strictEqual(h2.failoverAvailable, false);

  console.log("  Provider Health Snapshot:", JSON.stringify(h2, null, 2));
  console.log("✓ PASS: Provider Health Schema and Telemetry Verified.\n");
})();
