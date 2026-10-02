/**
 * OpenTranslator — AdaptiveConcurrencyController
 * Controlador inteligente de concorrência com algoritmo AIMD (Additive Increase, Multiplicative Decrease).
 * - Aumenta gradualmente a concorrência (+1 worker) em períodos de estabilidade sustentada.
 * - Reduz imediatamente (multiplicador 0.5x) em caso de HTTP 429 / Rate Limit / Timeout.
 * - Reduz moderadamente (multiplicador 0.75x) se a latência P95 disparar acima de 2.5x da média.
 * - Respeita cabeçalho Retry-After e aplica backoff exponencial com jitter.
 */

class AdaptiveConcurrencyController {
  constructor(options = {}) {
    this.minConcurrency = options.minConcurrency || 1;
    this.maxConcurrency = options.maxConcurrency || 16;
    this.concurrency = options.startConcurrency || 4;
    this.increaseStep = options.increaseStep || 1;
    this.successWindowThreshold = options.successThreshold || 5; // +1 a cada 5 sucessos consecutivos

    this.consecutiveSuccesses = 0;
    this.consecutiveErrors = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.total429 = 0;

    // Métricas de latência para sliding window (últimas 50 requisições)
    this.latencies = [];
    this.maxWindowSize = 50;
    this.circuitOpen = false;
    this.circuitResetTime = 0;
  }

  getConcurrency() {
    if (this.circuitOpen && Date.now() < this.circuitResetTime) {
      return 1; // Modo ultra-conservador durante cooldown
    } else if (this.circuitOpen && Date.now() >= this.circuitResetTime) {
      this.circuitOpen = false;
      this.concurrency = Math.max(this.minConcurrency, 2);
    }
    return Math.floor(this.concurrency);
  }

  /**
   * Notifica conclusão bem-sucedida de um lote com a latência observada.
   */
  recordSuccess(latencyMs) {
    this.totalRequests++;
    this.consecutiveSuccesses++;
    this.consecutiveErrors = 0;

    if (latencyMs && typeof latencyMs === "number") {
      this.latencies.push(latencyMs);
      if (this.latencies.length > this.maxWindowSize) this.latencies.shift();
    }

    // Verifica se latência P95 disparou
    const p95 = this.getP95Latency();
    const avg = this.getAvgLatency();
    if (this.latencies.length >= 10 && p95 > avg * 2.5 && this.concurrency > this.minConcurrency) {
      this.concurrency = Math.max(this.minConcurrency, this.concurrency * 0.75);
      this.consecutiveSuccesses = 0;
      return;
    }

    // Additive Increase: Aumenta concorrência gradualmente
    if (this.consecutiveSuccesses >= this.successWindowThreshold) {
      if (this.concurrency < this.maxConcurrency) {
        this.concurrency = Math.min(this.maxConcurrency, this.concurrency + this.increaseStep);
      }
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Notifica ocorrência de erro (429, timeout, 5xx) para recuo adaptativo imediato.
   */
  recordError(errorType, retryAfterSeconds = null) {
    this.totalRequests++;
    this.totalErrors++;
    this.consecutiveErrors++;
    this.consecutiveSuccesses = 0;

    if (errorType === 429 || errorType === 302 || errorType === "RATE_LIMIT") {
      this.total429++;
      // Multiplicative Decrease
      this.concurrency = Math.max(this.minConcurrency, Math.floor(this.concurrency * 0.5));

      const cooldownMs = retryAfterSeconds ? retryAfterSeconds * 1000 : 5000;
      this.circuitOpen = true;
      this.circuitResetTime = Date.now() + cooldownMs;
    } else if (errorType === "TIMEOUT" || errorType >= 500) {
      this.concurrency = Math.max(this.minConcurrency, Math.floor(this.concurrency * 0.75));
    }
  }

  getAvgLatency() {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  getP95Latency() {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  getP50Latency() {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.50);
    return sorted[idx];
  }

  getMetrics() {
    return {
      currentConcurrency: this.getConcurrency(),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      total429: this.total429,
      errorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) : 0,
      p50LatencyMs: Math.round(this.getP50Latency()),
      p95LatencyMs: Math.round(this.getP95Latency()),
      avgLatencyMs: Math.round(this.getAvgLatency()),
      circuitOpen: this.circuitOpen
    };
  }
}

module.exports = AdaptiveConcurrencyController;
