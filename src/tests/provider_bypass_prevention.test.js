/**
 * OpenTranslator — provider_bypass_prevention.test.js
 * Garante que nenhuma chamada a provedor consiga abrir socket sem passar pelo ProviderGateway e Circuit Breaker.
 */

const assert = require("assert");
const GlobalCircuitBreaker = require("../core/globalCircuitBreaker");
const ProviderGateway = require("../core/providerGateway");

async function run() {
  console.log("=== TEST SUITE: Provider Bypass Prevention ===");
  const cb = GlobalCircuitBreaker.getInstance();
  cb.reset("google:gtx");

  // Coloca o provider em RATE_LIMITED
  cb.recordError("google:gtx", { type: "RATE_LIMITED", statusCode: 429 });

  let socketAttempted = false;
  let blockedCaught = false;

  try {
    await ProviderGateway.executeRequest("google:gtx", async () => {
      socketAttempted = true;
      return "never reached";
    });
  } catch (err) {
    if (err.name === "ProviderGatewayBlockedError" || err.blocked) {
      blockedCaught = true;
    }
  }

  assert.strictEqual(socketAttempted, false, "Socket HTTP operation must NOT be attempted when circuit is open");
  assert.strictEqual(blockedCaught, true, "ProviderGateway must block request before execution");
  console.log("  ✓ ProviderGateway pre-socket execution guard verified (0 sockets opened)");

  console.log("✓ PASS: Provider Bypass Prevention Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
