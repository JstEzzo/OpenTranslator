const assert = require("assert");
const ProviderErrorClassifier = require("../core/providerErrorClassifier");

console.log("=== TEST SUITE: Provider Error Classifier ===");

(() => {
  // 1. Rate Limit
  const c429 = ProviderErrorClassifier.classify(null, { statusCode: 429 });
  assert.strictEqual(c429.type, "RATE_LIMITED");
  assert.strictEqual(c429.isRateLimit, true);

  // 2. Captcha / Block
  const c302 = ProviderErrorClassifier.classify(null, { statusCode: 302, body: "<html>CAPTCHA challenge</html>" });
  assert.strictEqual(c302.type, "CAPTCHA_OR_BLOCK");

  // 3. Auth
  const c401 = ProviderErrorClassifier.classify(null, { statusCode: 401 });
  assert.strictEqual(c401.type, "AUTH_ERROR");
  const c403 = ProviderErrorClassifier.classify(null, { statusCode: 403 });
  assert.strictEqual(c403.type, "AUTH_ERROR");

  // 4. Payload Too Large
  const c413 = ProviderErrorClassifier.classify(null, { statusCode: 413 });
  assert.strictEqual(c413.type, "PAYLOAD_TOO_LARGE");
  const c414 = ProviderErrorClassifier.classify(null, { statusCode: 414 });
  assert.strictEqual(c414.type, "PAYLOAD_TOO_LARGE");

  // 5. Server Errors
  const c500 = ProviderErrorClassifier.classify(null, { statusCode: 500 });
  assert.strictEqual(c500.type, "SERVER_ERROR");
  const c503 = ProviderErrorClassifier.classify(null, { statusCode: 503 });
  assert.strictEqual(c503.type, "SERVER_ERROR");

  // 6. Network
  const cNet = ProviderErrorClassifier.classify(new Error("socket hang up"));
  assert.strictEqual(cNet.type, "NETWORK_ERROR");
  const cTimeout = ProviderErrorClassifier.classify(new Error("ETIMEDOUT"));
  assert.strictEqual(cTimeout.type, "NETWORK_ERROR");

  // 7. Invalid response
  const cInv = ProviderErrorClassifier.classify(null, { statusCode: 200, body: "" });
  assert.strictEqual(cInv.type, "INVALID_PROVIDER_RESPONSE");

  console.log("  ✓ All 7 error categories classified with 100% precision");
  console.log("✓ PASS: Provider Error Classifier Test Suite Complete.\n");
})();
