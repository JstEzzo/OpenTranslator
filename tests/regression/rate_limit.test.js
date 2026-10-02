const assert = require('assert');
const ProviderRateLimiter = require('../../src/core/providerRateLimiter');

console.log('=== TEST SUITE 3: Provider Rate Limiter & Token Bucket ===');

(async () => {
  const limiter = new ProviderRateLimiter({ capacity: 5, refillRate: 5, minIntervalMs: 15 });

  const t0 = Date.now();
  for (let i = 0; i < 3; i++) {
    await limiter.acquire(1);
  }
  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= 30, `Expected minIntervalMs spacing, got ${elapsed}ms`);

  limiter.adjustRate(20, 15);
  assert.strictEqual(limiter.refillRate, 20);
  assert.strictEqual(limiter.minIntervalMs, 15);

  console.log('  ✓ Token bucket rate limiter and interval spacing verified');
  console.log('✓ PASS: Rate Limit Test Suite Complete.\n');
})();
