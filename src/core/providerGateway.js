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
    super(`[GATEWAY_BLOCKED] Provedor '${providerKey}' bloqueado pelo Circuit Breaker (${check.reason || check.state}).`);
    this.name = "ProviderGatewayBlockedError";
    this.providerKey = providerKey;
    this.circuitCheck = check;
    this.blocked = true;
  }
}

class ProviderGateway {
  static async executeRequest(providerKey, requestFn, options = {}) {
    const cb = GlobalCircuitBreaker.getInstance();
    const check = cb.canExecute(providerKey);

    if (!check.allowed) {
      const err = new ProviderGatewayBlockedError(providerKey, check);
      throw err;
    }

    cb.recordRequestStart(providerKey);
    try {
      const result = await requestFn(check);
      cb.recordSuccess(providerKey);
      return result;
    } catch (err) {
      const classified = ProviderErrorClassifier.classify(err, { statusCode: err.statusCode || err.status });
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
