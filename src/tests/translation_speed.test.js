const assert = require('assert');
const TranslationQueue = require('../core/translationQueue');

console.log('=== TEST SUITE 2: Translation Speed & Telemetry Metrics ===');

(async () => {
  const queue = new TranslationQueue({ provider: 'GoogleGTX', startConcurrency: 2 });
  const sample = Array.from({ length: 30 }, (_, i) => ({
    id: `spd_${i}`,
    clean: `Item text number ${i}`
  }));

  const mockTranslate = async (items) => {
    await new Promise(r => setTimeout(r, 20));
    const res = new Map();
    items.forEach(it => res.set(it.id, `[PT] ${it.clean}`));
    return res;
  };

  const results = await queue.process(sample, { translateBatchFn: mockTranslate });
  assert.strictEqual(results.size, 30);

  const m = queue.getMetrics();
  assert.ok(m.throughputTextsSec > 0, 'throughputTextsSec must be > 0');
  assert.ok(m.throughputCharsSec > 0, 'throughputCharsSec must be > 0');
  assert.strictEqual(m.totalTexts, 30);
  assert.strictEqual(m.translatedTexts, 30);
  assert.strictEqual(m.progressPercentage, 100);
  assert.strictEqual(m.etaSeconds, 0);

  console.log(`  ✓ Throughput measured: ${m.throughputTextsSec} texts/s (${m.throughputCharsSec} chars/s)`);
  console.log(`  ✓ Latency: P50=${m.p50LatencyMs}ms, P95=${m.p95LatencyMs}ms`);
  console.log('✓ PASS: Translation Speed Test Suite Complete.\n');
})();
