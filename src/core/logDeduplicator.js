/**
 * OpenTranslator — LogDeduplicator
 * Evita tempestades de logs (storms) suprimindo mensagens de erro repetitivas
 * e consolidando sumários periódicos.
 */

class LogDeduplicator {
  constructor() {
    this.suppressedCounts = new Map();
    this.firstEvents = new Map();
    this.lastEvents = new Map();
  }

  static getInstance() {
    if (!global.__openTranslatorLogDeduplicator) {
      global.__openTranslatorLogDeduplicator = new LogDeduplicator();
    }
    return global.__openTranslatorLogDeduplicator;
  }

  logRateLimit(provider, errorMsg) {
    const key = `ratelimit:${provider}`;
    const now = Date.now();
    const count = this.suppressedCounts.get(key) || 0;

    if (count === 0) {
      this.firstEvents.set(key, now);
      this.lastEvents.set(key, now);
      this.suppressedCounts.set(key, 1);
      if (global.log) {
        global.log("error", `[ERROR][RATE_LIMIT] ${provider}: ${errorMsg}`);
      }
      return { logged: true, suppressed: 0 };
    }

    this.lastEvents.set(key, now);
    const newCount = count + 1;
    this.suppressedCounts.set(key, newCount);

    if (newCount === 2 && global.log) {
      global.log("warn", `[RATE_LIMIT] Eventos repetidos adicionais para ${provider} estão sendo suprimidos temporariamente.`);
    }

    return { logged: false, suppressed: newCount - 1 };
  }

  getSummary(provider) {
    const key = `ratelimit:${provider}`;
    const count = this.suppressedCounts.get(key) || 0;
    const first = this.firstEvents.get(key);
    const last = this.lastEvents.get(key);

    return {
      provider,
      totalEvents: count,
      suppressed: Math.max(0, count - 1),
      firstTimestamp: first ? new Date(first).toISOString() : null,
      lastTimestamp: last ? new Date(last).toISOString() : null
    };
  }

  emitSummary(provider, extraInfo = {}) {
    const sum = this.getSummary(provider);
    if (sum.suppressed > 0 && global.log) {
      global.log(
        "info",
        `[RATE_LIMIT SUMMARY] Provider: ${provider} | Suprimidos: ${sum.suppressed} eventos | Bloqueados: ${extraInfo.blockedRequests || 0} | Cooldown: ${extraInfo.cooldownUntil || "ativo"}`
      );
    }
  }

  reset(provider) {
    if (provider) {
      const key = `ratelimit:${provider}`;
      this.suppressedCounts.delete(key);
      this.firstEvents.delete(key);
      this.lastEvents.delete(key);
    } else {
      this.suppressedCounts.clear();
      this.firstEvents.clear();
      this.lastEvents.clear();
    }
  }
}

module.exports = LogDeduplicator;
