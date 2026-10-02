const assert = require("assert");
const GlobalCircuitBreaker = require("../../src/core/globalCircuitBreaker");

console.log("=== TEST SUITE: Provider Rate Limit Storm Prevention ===");

(async () => {
  const breaker = GlobalCircuitBreaker.getInstance();
  breaker.reset("mock_storm_provider");

  let actualHttpCalls = 0;
  const mockHttpService = async () => {
    actualHttpCalls++;
    const err = new Error("HTTP 429 Too Many Requests");
    err.statusCode = 429;
    throw err;
  };

  const workers = 4;
  const totalBatches = 20;
  const queue = Array.from({ length: totalBatches }, (_, i) => ({ batchId: i }));
  const completed = [];
  const blockedBatches = [];

  // Simula execução concorrente com pacing padrão
  const runWorker = async (workerId) => {
    // Pacing entre workers ao iniciar o pool
    if (workerId > 0) {
      await new Promise(r => setTimeout(r, workerId * 15));
    }

    while (queue.length > 0) {
      const check = breaker.canExecute("mock_storm_provider");
      if (!check.allowed) {
        // Circuit breaker impediu o request ANTES de abrir qualquer socket
        const item = queue.shift();
        if (item) blockedBatches.push(item);
        continue;
      }

      const item = queue.shift();
      if (!item) break;

      try {
        breaker.recordRequestStart("mock_storm_provider");
        await mockHttpService();
        breaker.recordSuccess("mock_storm_provider");
        completed.push(item);
      } catch (e) {
        breaker.recordRequestEnd("mock_storm_provider");
        breaker.recordError("mock_storm_provider", { type: "RATE_LIMITED", statusCode: 429 });
        // Requeue do batch que falhou
        blockedBatches.push(item);
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, (_, i) => runWorker(i)));

  console.log(`  Actual HTTP mock calls made: ${actualHttpCalls}`);
  console.log(`  Batches blocked/preserved by Circuit Breaker: ${blockedBatches.length}`);

  // EXATAMENTE 1 tentativa feita; 0 tempestade de requests subsequentes
  assert.strictEqual(actualHttpCalls, 1, "Must make EXACTLY 1 request before circuit breaker trips open");
  const health = breaker.getProviderHealth("mock_storm_provider");
  assert.strictEqual(health.state, "RATE_LIMITED", "Circuit breaker must be in RATE_LIMITED state");
  assert.strictEqual(health.requests429, 1, "Must record 1 429 event");
  assert.ok(health.requestsBlocked >= totalBatches - 1, "All subsequent batches must be blocked without opening sockets");

  console.log("✓ PASS: Provider Rate Limit Storm successfully blocked by shared Global Circuit Breaker.\n");
})();
