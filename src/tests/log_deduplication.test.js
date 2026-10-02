const assert = require("assert");
const LogDeduplicator = require("../core/logDeduplicator");

console.log("=== TEST SUITE: Log Deduplication & Rate Limit Storm Suppression ===");

(() => {
  const dedup = LogDeduplicator.getInstance();
  dedup.reset("test_flood_provider");

  // Intercepta logs globais
  const loggedLines = [];
  const origLog = global.log;
  global.log = (lvl, msg) => {
    loggedLines.push({ lvl, msg });
  };

  try {
    // Simula 500 eventos de 429
    for (let i = 0; i < 500; i++) {
      dedup.logRateLimit("test_flood_provider", "HTTP 429 Too Many Requests");
    }

    const summary = dedup.getSummary("test_flood_provider");
    assert.strictEqual(summary.totalEvents, 500, "Must record all 500 occurrences internally");
    assert.strictEqual(summary.suppressed, 499, "Must suppress 499 repetitive log events");

    // No log de console: deve haver apenas o 1º evento de erro e 1 aviso de supressão
    assert.strictEqual(loggedLines.length, 2, "Must log EXACTLY 2 messages to console instead of 500 lines");
    assert.ok(loggedLines[0].msg.includes("[ERROR][RATE_LIMIT]"), "1st message must be main rate limit error");
    assert.ok(loggedLines[1].msg.includes("[RATE_LIMIT] Eventos repetidos adicionais"), "2nd message must announce suppression");

    // Testa emissão de sumário consolidado
    dedup.emitSummary("test_flood_provider", { blockedRequests: 1200, cooldownUntil: "10:00" });
    assert.strictEqual(loggedLines.length, 3, "Summary emission adds single line");
    assert.ok(loggedLines[2].msg.includes("[RATE_LIMIT SUMMARY]"));

    console.log(`  ✓ 500 raw 429 events condensed into ${loggedLines.length} structured log entries`);
    console.log("✓ PASS: Log Deduplication Test Suite Complete.\n");
  } finally {
    global.log = origLog;
  }
})();
