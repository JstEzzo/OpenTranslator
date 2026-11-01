/**
 * OpenTranslator — GlobalCircuitBreaker
 * Circuit Breaker global compartilhado entre TODOS os workers e requisições concorrentes.
 * 
 * Funcionalidades avançadas:
 * - Estados: AVAILABLE, DEGRADED, RATE_LIMITED, COOLDOWN, HALF_OPEN, AUTH_ERROR, NETWORK_ERROR, DISABLED, NOT_CONFIGURED
 * - Transição controlada para HALF_OPEN após expiração de cooldown
 * - Health Probe Protocol: exatamente 1 único probe permitido em HALF_OPEN; todos os demais workers bloqueados
 * - Backoff exponencial em reincidência de 429 (10min -> 20min -> 40min -> 80min)
 * - Telemetria completa e detalhada para o painel de saúde
 */

const STATES = {
  AVAILABLE: "AVAILABLE",
  DEGRADED: "DEGRADED",
  RATE_LIMITED: "RATE_LIMITED",
  COOLDOWN: "COOLDOWN",
  HALF_OPEN: "HALF_OPEN",
  AUTH_ERROR: "AUTH_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  DISABLED: "DISABLED",
  NOT_CONFIGURED: "NOT_CONFIGURED"
};

class ProviderCircuitState {
  constructor(providerKey) {
    this.providerKey = providerKey;
    this.state = STATES.AVAILABLE;
    this.cooldownUntil = 0;
    this.nextProbeAt = 0;
    this.probeInFlight = false;
    this.concurrency = 4;
    this.inFlight = 0;
    this.requestsBlocked = 0;
    this.requestsSuccess = 0;
    this.requestsFailed = 0;
    this.requests429 = 0;
    this.requests5xx = 0;
    this.consecutive429 = 0;
    this.consecutiveErrors = 0;
    this.first429Time = null;
    this.last429Time = null;
    this.lastError = null;
    this.lastStatusCode = null;
    this.failoverAvailable = false;
  }
}

class GlobalCircuitBreaker {
  constructor() {
    this.providers = new Map();
    this.baseCooldownMs = 15 * 1000; // 15 segundos base adaptativo (NÃO 10 minutos!)
    this.maxCooldownMs = 5 * 60 * 1000; // 5 minutos teto
    // FASE 3 / PASSO 27 — falhas consecutivas (rede/5xx) também cooldown.
    this.failureThreshold = 3;         // 3 falhas seguidas abrem o cooldown
    this.failureCooldownBaseMs = 5 * 1000; // 5s base, crescendo até maxCooldownMs
  }

  static getInstance() {
    if (!global.__openTranslatorCircuitBreaker) {
      global.__openTranslatorCircuitBreaker = new GlobalCircuitBreaker();
    }
    return global.__openTranslatorCircuitBreaker;
  }

  _getProviderState(providerKey) {
    const key = providerKey || "default";
    if (!this.providers.has(key)) {
      this.providers.set(key, new ProviderCircuitState(key));
    }
    return this.providers.get(key);
  }

  canExecute(providerKey) {
    const p = this._getProviderState(providerKey);
    const now = Date.now();

    // Transição de COOLDOWN/RATE_LIMITED para HALF_OPEN quando o tempo expira
    if (p.state === STATES.RATE_LIMITED || p.state === STATES.COOLDOWN
        || p.state === STATES.NETWORK_ERROR) {
      // FASE 3 / PASSO 27 — NETWORK_ERROR entra no mesmo protocolo de cooldown.
      // Sem esta linha, uma falha de rede com cooldown aplicado voltava a ser
      // autorizada imediatamente, porque o estado não era coberto aqui.
      //
      // `cooldownUntil > 0` é a condição que distingue "cooldown ativo" de
      // "falha isolada registrada": abaixo do threshold, _applyFailureCooldown
      // zera o cooldown justamente para NÃO bloquear o provedor.
      const cooldownActive = p.cooldownUntil > now;
      if (p.cooldownUntil > 0 && now >= p.cooldownUntil) {
        p.state = STATES.HALF_OPEN;
        p.nextProbeAt = now;
        p.probeInFlight = false;
      } else if (cooldownActive) {
        p.requestsBlocked++;
        return {
          allowed: false,
          state: p.state,
          reason: p.state === STATES.NETWORK_ERROR ? 'NETWORK_ERROR' : 'RATE_LIMITED',
          cooldownUntil: p.cooldownUntil ? new Date(p.cooldownUntil).toISOString() : null,
          remainingMs: Math.max(0, p.cooldownUntil - now),
          nextProbeAt: p.cooldownUntil ? new Date(p.cooldownUntil).toISOString() : null,
          requestsBlocked: p.requestsBlocked
        };
      }
      // NETWORK_ERROR com cooldown já expirado OU falha isolada (cooldownUntil
      // = 0): seguir para o protocolo HALF_OPEN / AVAILABLE normalmente.
      if (p.state === STATES.NETWORK_ERROR && !cooldownActive) {
        p.state = p.consecutiveErrors > 0 ? STATES.DEGRADED : STATES.AVAILABLE;
      }
    }

    // Protocolo HALF_OPEN: apenas 1 único probe permitido
    if (p.state === STATES.HALF_OPEN) {
      if (!p.probeInFlight) {
        p.probeInFlight = true;
        return {
          allowed: true,
          state: STATES.HALF_OPEN,
          isProbe: true,
          concurrency: 1
        };
      }
      // Outros workers que tentarem durante o probe em andamento são bloqueados
      p.requestsBlocked++;
      return {
        allowed: false,
        state: STATES.HALF_OPEN,
        isProbe: false,
        reason: "HALF_OPEN_PROBE_IN_PROGRESS",
        requestsBlocked: p.requestsBlocked
      };
    }

    if (p.state === STATES.AUTH_ERROR || p.state === STATES.DISABLED || p.state === STATES.NOT_CONFIGURED) {
      p.requestsBlocked++;
      return {
        allowed: false,
        state: p.state,
        reason: p.state,
        lastError: p.lastError,
        requestsBlocked: p.requestsBlocked
      };
    }

    return { allowed: true, state: p.state, isProbe: false };
  }

  recordRequestStart(providerKey) {
    const p = this._getProviderState(providerKey);
    p.inFlight++;
  }

  recordRequestEnd(providerKey) {
    const p = this._getProviderState(providerKey);
    p.inFlight = Math.max(0, p.inFlight - 1);
  }

  recordSuccess(providerKey) {
    const p = this._getProviderState(providerKey);
    p.requestsSuccess++;
    p.probeInFlight = false;
    p.consecutive429 = 0;
    p.consecutiveErrors = 0;
    p.lastStatusCode = 200;

    // FASE 3 / PASSO 27 — um sucesso limpa QUALQUER estado de falha,
    // inclusive os novos (COOLDOWN por 5xx/rede e NETWORK_ERROR).
    // Antes, a recuperação só tratava HALF_OPEN e DEGRADED: um provedor que
    // voltava a responder continuava bloqueado até o próximo canExecute, e o
    // cooldown era zerado mas o estado não.
    if (p.state === STATES.HALF_OPEN || p.state === STATES.DEGRADED
        || p.state === STATES.COOLDOWN || p.state === STATES.NETWORK_ERROR) {
      p.state = STATES.AVAILABLE;
      p.cooldownUntil = 0;
      p.nextProbeAt = 0;
      p.concurrency = 4;
      p.cooldownUntil = 0;
      p.nextProbeAt = 0;
    }
  }

  recordError(providerKey, classifiedError = {}) {
    const p = this._getProviderState(providerKey);
    const now = Date.now();
    p.probeInFlight = false;
    p.requestsFailed++;
    p.consecutiveErrors++;
    p.lastStatusCode = classifiedError.statusCode || null;

    if (classifiedError.type === "RATE_LIMITED" || classifiedError.statusCode === 429) {
      p.state = STATES.RATE_LIMITED;
      p.requests429++;
      p.consecutive429++;
      if (!p.first429Time) p.first429Time = now;
      p.last429Time = now;

      // Backoff exponencial baseado em reincidências:
      // 1ª vez = baseCooldown (ex: 10 min)
      // 2ª vez = baseCooldown * 2 (20 min)
      // 3ª vez = baseCooldown * 4 (40 min)
      // 4ª vez = baseCooldown * 8 (80 min)
      const multiplier = Math.pow(2, Math.max(0, p.consecutive429 - 1));
      const calculatedCooldown = Math.min(this.maxCooldownMs, this.baseCooldownMs * multiplier);
      const cd = classifiedError.retryAfterMs || calculatedCooldown;

      p.cooldownUntil = now + cd;
      p.nextProbeAt = p.cooldownUntil;
      p.lastError = classifiedError.message || `HTTP 429 Too Many Requests (Reincidência ${p.consecutive429})`;
      p.concurrency = 0;
      return;
    }

    if (classifiedError.type === "CAPTCHA_OR_BLOCK" || classifiedError.statusCode === 302) {
      p.state = STATES.RATE_LIMITED;
      p.consecutive429++;
      const multiplier = Math.pow(2, Math.max(0, p.consecutive429 - 1));
      const cd = Math.min(this.maxCooldownMs, (15 * 60 * 1000) * multiplier);
      p.cooldownUntil = now + cd;
      p.nextProbeAt = p.cooldownUntil;
      p.lastError = classifiedError.message || "HTTP 302 CAPTCHA / Unusual Traffic";
      p.concurrency = 0;
      return;
    }

    if (classifiedError.type === "AUTH_ERROR" || classifiedError.statusCode === 401 || classifiedError.statusCode === 403) {
      p.state = STATES.AUTH_ERROR;
      p.lastError = classifiedError.message || `HTTP ${classifiedError.statusCode} Auth Error`;
      p.concurrency = 0;
      return;
    }

    if (classifiedError.type === "SERVER_ERROR") {
      p.requests5xx++;
      p.lastError = classifiedError.message || "Server Error 5xx";
      // FASE 3 / PASSO 27 — 5xx agora COOLDA.
      // Antes, um provedor devolvendo 500 registrava a contagem e seguia
      // recebendo requisições indefinidamente: o breaker existia para parar
      // de martelar provedor quebrado e não parava.
      // O estado precisa ser COOLDOWN, e não apenas ter o cooldownUntil
      // preenchido: `canExecute` só consulta o cooldown para os estados que
      // entram no protocolo de transição.
      this._applyFailureCooldown(p, now, 'SERVER_ERROR');
      if (p.cooldownUntil > now) p.state = STATES.COOLDOWN;
      return;
    }

    if (classifiedError.type === "NETWORK_ERROR") {
      p.state = STATES.NETWORK_ERROR;
      p.lastError = classifiedError.message || "Network Error";
      this._applyFailureCooldown(p, now, 'NETWORK_ERROR');
      return;
    }
  }

  /**
   * Aplica cooldown a falhas que não são rate limit.
   *
   * FASE 3 / PASSO 27 — O breaker só cooldownava em 429, 302 e auth. Erro de
   * rede e 5xx apenas marcavam o estado, e `canExecute` continuava devolvendo
   * `allowed: true`. Na prática, um provedor fora do ar ou devolvendo 500
   * recebia requisições indefinidamente, que é exatamente o que um circuit
   * breaker existe para impedir.
   *
   * Política: uma falha isolada pode ser transitória e passa. Falhas
   * CONSECUTIVAS abrem o cooldown, com backoff exponencial a partir de
   * `failureCooldownBaseMs`, até `maxCooldownMs`.
   */
  _applyFailureCooldown(p, now, kind) {
    if (p.consecutiveErrors < this.failureThreshold) {
      p.cooldownUntil = 0;
      p.nextProbeAt = 0;
      return;
    }
    const over = p.consecutiveErrors - this.failureThreshold;
    const multiplier = Math.pow(2, Math.min(over, 6));
    const cd = Math.min(this.maxCooldownMs, this.failureCooldownBaseMs * multiplier);
    p.cooldownUntil = now + cd;
    p.nextProbeAt = p.cooldownUntil;
    p.concurrency = 0;
    p.lastError = `${p.lastError || kind} (${p.consecutiveErrors} falhas consecutivas; `
      + `pausa de ${Math.round(cd / 1000)}s)`;
  }

  getProviderHealth(providerKey) {
    const p = this._getProviderState(providerKey);
    return {
      provider: p.providerKey,
      state: p.state,
      concurrency: p.concurrency,
      inFlight: p.inFlight,
      requestsBlocked: p.requestsBlocked,
      requestsSuccess: p.requestsSuccess,
      requestsFailed: p.requestsFailed,
      requests429: p.requests429,
      requests5xx: p.requests5xx,
      consecutive429: p.consecutive429,
      consecutiveErrors: p.consecutiveErrors,
      lastStatusCode: p.lastStatusCode,
      cooldownUntil: p.cooldownUntil ? new Date(p.cooldownUntil).toISOString() : null,
      nextProbeAt: p.nextProbeAt ? new Date(p.nextProbeAt).toISOString() : null,
      lastError: p.lastError,
      failoverAvailable: p.failoverAvailable
    };
  }

  reset(providerKey) {
    if (providerKey) {
      this.providers.delete(providerKey);
    } else {
      this.providers.clear();
    }
  }
}

module.exports = GlobalCircuitBreaker;
module.exports.STATES = STATES;
