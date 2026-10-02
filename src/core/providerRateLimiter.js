/**
 * OpenTranslator — ProviderRateLimiter
 * Token Bucket compartilhado entre múltiplos workers concorrentes.
 * Impede que a multiplicação de workers estoure quotas e cause bans de provedor.
 */

class ProviderRateLimiter {
  constructor(options = {}) {
    this.capacity = options.capacity || 30; // Capacidade máxima de tokens
    this.refillRate = options.refillRate || 10; // Tokens adicionados por segundo
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.minIntervalMs = options.minIntervalMs || 10;
    this.lastRequestTime = 0;
    this.queue = [];
    this.timer = null;
  }

  _refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    if (elapsedSeconds > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
      this.lastRefill = now;
    }
  }

  /**
   * Aguarda um token disponível no bucket de forma não-bloqueante.
   * @param {number} cost - Número de tokens
   * @returns {Promise<void>}
   */
  async acquire(cost = 1) {
    this._refill();

    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    const intervalWait = Math.max(0, this.minIntervalMs - timeSinceLast);

    if (this.queue.length === 0 && this.tokens >= cost && intervalWait === 0) {
      this.tokens -= cost;
      this.lastRequestTime = Date.now();
      return;
    }

    return new Promise((resolve) => {
      this.queue.push({ cost, resolve });
      this._scheduleProcess();
    });
  }

  _scheduleProcess() {
    if (this.timer) return;
    this._refill();

    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    const intervalWait = Math.max(0, this.minIntervalMs - timeSinceLast);

    if (intervalWait > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this._scheduleProcess();
      }, intervalWait);
      return;
    }

    if (this.queue.length > 0 && this.tokens >= this.queue[0].cost) {
      const next = this.queue.shift();
      this.tokens -= next.cost;
      this.lastRequestTime = Date.now();
      next.resolve();

      if (this.queue.length > 0) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this._scheduleProcess();
        }, this.minIntervalMs);
      }
      return;
    }

    if (this.queue.length > 0) {
      const needed = this.queue[0].cost - this.tokens;
      const waitMs = Math.max(10, Math.ceil((needed / this.refillRate) * 1000));
      this.timer = setTimeout(() => {
        this.timer = null;
        this._scheduleProcess();
      }, waitMs);
    }
  }

  adjustRate(newRefillRate, newMinIntervalMs) {
    if (newRefillRate) this.refillRate = Math.max(1, newRefillRate);
    if (newMinIntervalMs) this.minIntervalMs = Math.max(10, newMinIntervalMs);
  }
}

module.exports = ProviderRateLimiter;
