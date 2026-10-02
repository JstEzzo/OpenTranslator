const assert = require('assert');
const AdaptiveConcurrencyController = require('../core/adaptiveConcurrency');

console.log('=== TEST SUITE 4: Adaptive Concurrency (AIMD) ===');

(() => {
  const acc = new AdaptiveConcurrencyController({
    minConcurrency: 1,
    maxConcurrency: 10,
    startConcurrency: 4,
    successThreshold: 3
  });

  assert.strictEqual(acc.getConcurrency(), 4);

  // 1. Additive Increase: 3 successes -> +1 concurrency
  acc.recordSuccess(100);
  acc.recordSuccess(105);
  acc.recordSuccess(95);
  assert.strictEqual(acc.getConcurrency(), 5, 'Concurrency should increase to 5 after 3 successes');
  console.log('  ✓ Additive increase verified (4 -> 5)');

  // 2. Multiplicative Decrease on 429
  acc.recordError(429, 2);
  assert.strictEqual(acc.getConcurrency(), 1, 'Concurrency drops to 1 during circuit cooldown');
  assert.strictEqual(acc.circuitOpen, true);
  console.log('  ✓ Multiplicative decrease on 429 verified (circuit open)');

  // 3. Reset
  acc.circuitOpen = false;
  acc.concurrency = 6;

  // 4. Latency Surge reduction (P95 spike)
  for (let i = 0; i < 20; i++) acc.latencies.push(100);
  acc.latencies.push(600); // Massive outlier
  acc.recordSuccess(600);
  assert.ok(acc.concurrency < 6, 'Concurrency should reduce when P95 surges');
  console.log('  ✓ Latency surge reduction verified');

  console.log('✓ PASS: Adaptive Concurrency Test Suite Complete.\n');
})();
