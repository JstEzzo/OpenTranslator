/**
 * OpenTranslator - RuntimeWatchdog
 * 
 * Monitor de saúde e cão de guarda para sessões de execução de jogos.
 * Garante que travamentos, deadlocks ou ausência de resposta não congelem a GUI
 * ou deixem processos zumbis consumindo recursos da máquina.
 */

const EventEmitter = require('events');

class RuntimeWatchdog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.startupTimeoutMs = options.startupTimeoutMs || 20000;
    this.idleTimeoutMs = options.idleTimeoutMs || 60000;
    this.translationTimeoutMs = options.translationTimeoutMs || 30000;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs || 5000;

    this.checkIntervalMs = options.checkIntervalMs || 2000;
    this.timer = null;
    this.sessions = new Map(); // sessionId -> { session, lastActivity, startTime, state }
  }

  /**
   * Monitora uma sessão ativa
   */
  watch(session) {
    if (!session || !session.sessionId) return;
    this.sessions.set(session.sessionId, {
      session,
      startTime: Date.now(),
      lastActivity: Date.now(),
      state: session.state
    });

    if (!this.timer) {
      this.timer = setInterval(() => this._tick(), this.checkIntervalMs);
    }
  }

  /**
   * Registra pulso de atividade (ex: novo texto capturado, resposta do hook)
   */
  heartbeat(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.get(sessionId).lastActivity = Date.now();
    }
  }

  /**
   * Desconecta sessão do monitoramento
   */
  unwatch(sessionId) {
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Varredura periódica de timeouts e saúde
   */
  _tick() {
    const now = Date.now();

    for (const [sessionId, data] of Array.from(this.sessions.entries())) {
      const { session, startTime, lastActivity } = data;

      // 1. Timeout de inicialização
      if (session.state === 'STARTING' && (now - startTime > this.startupTimeoutMs)) {
        this.emit('timeout', {
          sessionId,
          type: 'STARTUP_TIMEOUT',
          durationMs: now - startTime,
          limitMs: this.startupTimeoutMs
        });
        session.handleTimeout('STARTUP_TIMEOUT');
        this.unwatch(sessionId);
        continue;
      }

      // 2. Timeout de inatividade prolongada
      if (['RUNNING', 'OBSERVING'].includes(session.state) && (now - lastActivity > this.idleTimeoutMs)) {
        this.emit('idle', {
          sessionId,
          idleDurationMs: now - lastActivity,
          limitMs: this.idleTimeoutMs
        });
      }

      // 3. Timeout durante encerramento (forçar término seguro se processo travar ao sair)
      if (session.state === 'STOPPING' && (now - lastActivity > this.shutdownTimeoutMs)) {
        this.emit('timeout', {
          sessionId,
          type: 'SHUTDOWN_TIMEOUT',
          durationMs: now - lastActivity,
          limitMs: this.shutdownTimeoutMs
        });
        session.forceStop('SHUTDOWN_TIMEOUT');
        this.unwatch(sessionId);
        continue;
      }
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.sessions.clear();
  }
}

const defaultWatchdog = new RuntimeWatchdog();
module.exports = defaultWatchdog;
module.exports.RuntimeWatchdog = RuntimeWatchdog;
