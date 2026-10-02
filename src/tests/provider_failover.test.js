const assert = require('assert');
const TranslationQueue = require('../core/translationQueue');

console.log('=== TEST SUITE 5: Provider Failover & Retry Resilience ===');

(async () => {
  const queue = new TranslationQueue({ provider: 'GoogleGTX', startConcurrency: 2 });
  const sample = [{ id: 'fail_1', clean: 'Error recovery sentence' }];

  let attempt = 0;
  const failingTranslate = async (items) => {
    attempt++;
    if (attempt === 1) {
      throw new Error('HTTP 429 Rate Limit Exceeded');
    }
    const res = new Map();
    items.forEach(it => res.set(it.id, '[RECOVERED] ' + it.clean));
    return res;
  };

  const results = await queue.process(sample, { translateBatchFn: failingTranslate });
  assert.strictEqual(results.get('fail_1'), '[RECOVERED] Error recovery sentence');
  assert.strictEqual(queue.stats.retryCount, 1);
  assert.strictEqual(queue.stats.total429, 1);

  console.log('  ✓ Automatic retry and graceful recovery after 429 confirmed');
  console.log('✓ PASS: Provider Failover Test Suite Complete.\n');
})();
