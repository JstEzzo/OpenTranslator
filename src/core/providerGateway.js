/**
 * OpenTranslator — ProviderGateway
 * Porta única e unificada de entrada para todas as requisições de rede aos provedores.
 * 
 * Regra Arquitetural Obrigatória:
 * Nenhuma função pode abrir socket HTTP para um provedor sem passar por:
 * ProviderGateway.executeRequest(providerKey, requestFn, options)
 * que obrigatoriamente valida o Circuit Breaker antes de qualquer chamada.
 */

const GlobalCircuitBreaker = require("./globalCircuitBreaker");
const ProviderErrorClassifier = require("./providerErrorClassifier");

class ProviderGatewayBlockedError extends Error {
  constructor(providerKey, check) {
    super(`[GATEWAY_BLOCKED] CIRCUIT_BREAKER_OPEN: Provedor '${providerKey}' bloqueado pelo Circuit Breaker (${check.reason || check.state}).`);
    this.name = "ProviderGatewayBlockedError";
    this.providerKey = providerKey;
    this.circuitCheck = check;
    this.blocked = true;
  }
}

class ProviderGateway {
  static async executeRequest(providerKey, requestFn, options = {}) {
    if (String(providerKey).startsWith('google:')) {
      const previous = this.googleQueue || Promise.resolve();
      const task = previous.catch(() => {}).then(async () => {
        const wait = Math.max(0, (this.googleLastStart || 0) + (this.googleMinIntervalMs ?? 1000) - Date.now());
        if (wait) await new Promise(resolve => setTimeout(resolve, wait));
        this.googleLastStart = Date.now();
        return this._executeRequest(providerKey, requestFn, options);
      });
      this.googleQueue = task.then(() => {}, () => {});
      return task;
    }
    return this._executeRequest(providerKey, requestFn, options);
  }

  static async _executeRequest(providerKey, requestFn, options = {}) {
    if (require("./shutdownCoordinator").isShuttingDown()) { const error=new Error("Translation cancelled during shutdown");error.code="TRANSLATION_CANCELLED";throw error; }
    const cb = GlobalCircuitBreaker.getInstance();
    const check = cb.canExecute(providerKey);

    if (!check.allowed) {
      const err = new ProviderGatewayBlockedError(providerKey, check);
      throw err;
    }

    cb.recordRequestStart(providerKey);
    try {
      const result = await requestFn(check);
      const status = result && (result.status || result.statusCode);
      if (status >= 400 || status === 302) {
        cb.recordError(providerKey, ProviderErrorClassifier.classify(null, {
          statusCode: status, headers: result.headers, body: typeof result.body === 'string' ? result.body : ''
        }));
      } else {
        cb.recordSuccess(providerKey);
      }
      return result;
    } catch (err) {
      const classified = ProviderErrorClassifier.classify(err, { statusCode: err.statusCode || err.status, headers: err.headers, body: err.body });
      cb.recordError(providerKey, classified);
      throw err;
    } finally {
      cb.recordRequestEnd(providerKey);
    }
  }

  static canExecute(providerKey) {
    return GlobalCircuitBreaker.getInstance().canExecute(providerKey);
  }
}

module.exports = ProviderGateway;
module.exports.ProviderGatewayBlockedError = ProviderGatewayBlockedError;
