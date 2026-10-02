/**
 * OpenTranslator — HealthMonitor
 * 
 * Monitor central de integridade para todos os provedores e subsistemas:
 * - Estados: HEALTHY -> DEGRADED -> FAILED
 * - Recuperação automática (probing de reconexão / cooldown)
 * - Circuit breaker por componente
 * - Isolamento total contra travamentos em cascata
 */

class HealthMonitor {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownMs = options.cooldownMs || 10000;
    this.providers = new Map();
  }

  /**
   * Registra ou inicializa o monitoramento de um provedor
   */
  registerProvider(id, name, type = 'generic') {
    this.providers.set(id, {
      id,
      name,
      type,
      state: 'HEALTHY',
      consecutiveFailures: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastError: null,
      lastSuccessAt: Date.now(),
      failedAt: 0,
      avgLatencyMs: 0
    });
  }

  /**
   * Registra uma operação bem-sucedida
   */
  recordSuccess(id, latencyMs = 0) {
    if (!this.providers.has(id)) {
      this.registerProvider(id, id);
    }

    const p = this.providers.get(id);
    p.totalSuccesses++;
    p.consecutiveFailures = 0;
    p.state = 'HEALTHY';
    p.lastSuccessAt = Date.now();
    p.avgLatencyMs = p.avgLatencyMs ? (p.avgLatencyMs * 0.8 + latencyMs * 0.2) : latencyMs;
  }

  /**
   * Registra uma falha e avalia transição de estado
   */
  recordFailure(id, error) {
    if (!this.providers.has(id)) {
      this.registerProvider(id, id);
    }

    const p = this.providers.get(id);
    p.totalFailures++;
    p.consecutiveFailures++;
    p.lastError = error ? (error.message || String(error)) : 'Unknown error';

    if (p.consecutiveFailures >= this.failureThreshold) {
      p.state = 'FAILED';
      p.failedAt = Date.now();
    } else {
      p.state = 'DEGRADED';
    }
  }

  /**
   * Verifica se o provedor está apto para uso
   */
  isUsable(id) {
    if (!this.providers.has(id)) return true;

    const p = this.providers.get(id);
    if (p.state === 'HEALTHY' || p.state === 'DEGRADED') return true;

    // Se está em FAILED, verifica se o tempo de cooldown passou para tentar recuperação
    if (p.state === 'FAILED' && (Date.now() - p.failedAt > this.cooldownMs)) {
      p.state = 'DEGRADED'; // Permite tentativa de sonda
      return true;
    }

    return false;
  }

  /**
   * Retorna o resumo do estado de saúde de todos os provedores
   */
  getStatusSummary() {
    const summary = {};
    for (const [id, p] of this.providers.entries()) {
      summary[id] = {
        name: p.name,
        state: p.state,
        failures: p.consecutiveFailures,
        usable: this.isUsable(id)
      };
    }
    return summary;
  }
}

module.exports = HealthMonitor;
