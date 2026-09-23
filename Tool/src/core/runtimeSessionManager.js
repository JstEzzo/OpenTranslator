/**
 * OpenTranslator - RuntimeSessionManager
 * 
 * Gerenciador formal de sessões operacionais de runtime de jogos.
 * - Máquina de estados estrita: CREATED -> PREPARING -> READY -> STARTING -> RUNNING -> OBSERVING -> TRANSLATING -> VERIFYING -> STOPPING -> STOPPED -> CLEANUP
 * - Proteção contra encerramento indevido: integra-se ao OwnedProcessRegistry
 * - Captura e cálculo antecipado do SHA-256 do executável (executableHash)
 * - Monitoramento por RuntimeWatchdog e RuntimeLogCollector
 * - Persistência e detecção de sessões incompletas para Crash Recovery
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ownedProcessRegistry = require('./ownedProcessRegistry');
const logCollector = require('./runtimeLogCollector');
const watchdog = require('./runtimeWatchdog');

const VALID_TRANSITIONS = {
  CREATED: ['PREPARING', 'FAILED'],
  PREPARING: ['READY', 'FAILED'],
  READY: ['STARTING', 'CLEANUP', 'FAILED'],
  STARTING: ['RUNNING', 'FAILED', 'TIMEOUT'],
  RUNNING: ['OBSERVING', 'TRANSLATING', 'STOPPING', 'CRASHED', 'TIMEOUT'],
  OBSERVING: ['TRANSLATING', 'VERIFYING', 'STOPPING', 'CRASHED', 'TIMEOUT'],
  TRANSLATING: ['VERIFYING', 'OBSERVING', 'STOPPING', 'CRASHED', 'TIMEOUT'],
  VERIFYING: ['STOPPING', 'OBSERVING', 'CRASHED', 'TIMEOUT'],
  STOPPING: ['STOPPED', 'FAILED', 'TIMEOUT'],
  STOPPED: ['CLEANUP'],
  FAILED: ['CLEANUP'],
  TIMEOUT: ['STOPPING', 'CLEANUP'],
  CRASHED: ['CLEANUP'],
  CLEANUP: []
};

class RuntimeSession {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.gameId = options.gameId || 'unknown_game';
    this.gameDir = options.gameDir ? path.resolve(options.gameDir) : '';
    this.stagingDir = options.stagingDir ? path.resolve(options.stagingDir) : '';
    this.executablePath = options.executablePath ? path.resolve(options.executablePath) : '';
    this.executableHash = null;

    this.pid = null;
    this.parentPid = process.pid;
    this.childProcess = null;

    this.startedAt = null;
    this.endedAt = null;
    this.durationMs = 0;

    this.state = 'CREATED';
    this.exitCode = null;
    this.arguments = options.arguments || [];
    this.environment = options.environment || {};

    this.windowHandle = null;
    this.windowTitle = null;
    this.architecture = process.arch;
    this.runtime = options.runtime || 'native';
    this.engine = options.engine || 'generic';
    this.framework = options.framework || 'unknown';
    this.strategy = options.strategy || 'STATIC_PATCH';

    this.errors = [];
    this.evidence = [];
    this.ownedProcesses = [];

    this.sessionsDir = options.sessionsDir || path.resolve(__dirname, '../../data/sessions');
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }

    this._saveSession();
  }

  /**
   * Transiciona a máquina de estados com validação formal
   */
  transitionTo(newState) {
    const allowed = VALID_TRANSITIONS[this.state] || [];
    if (!allowed.includes(newState)) {
      throw new Error(`STATE_TRANSITION_INVALID: Transição ilegal de [${this.state}] para [${newState}]`);
    }

    const oldState = this.state;
    this.state = newState;
    logCollector.log('INFO', 'SESSION', `Sessão ${this.sessionId} transicionou: ${oldState} -> ${newState}`, {
      sessionId: this.sessionId,
      pid: this.pid
    });

    this._saveSession();
    return this.state;
  }

  /**
   * Prepara os parâmetros da sessão e calcula hash do executável
   */
  prepare() {
    this.transitionTo('PREPARING');

    if (this.executablePath && fs.existsSync(this.executablePath)) {
      const buf = fs.readFileSync(this.executablePath);
      this.executableHash = crypto.createHash('sha256').update(buf).digest('hex');
    }

    this.transitionTo('READY');
    return { success: true, sessionId: this.sessionId, executableHash: this.executableHash };
  }

  /**
   * Inicia a execução controlada do executável
   */
  launch(customArgs = [], customEnv = {}) {
    if (this.state !== 'READY') {
      throw new Error(`Não é possível iniciar sessão no estado [${this.state}]. Estado deve ser READY.`);
    }

    this.transitionTo('STARTING');

    const targetExe = this.executablePath;
    if (!targetExe || !fs.existsSync(targetExe)) {
      this.transitionTo('FAILED');
      throw new Error(`Executável alvo não encontrado: ${targetExe}`);
    }

    const workingDir = this.stagingDir || path.dirname(targetExe);
    const args = customArgs.length > 0 ? customArgs : this.arguments;
    const env = { ...process.env, ...this.environment, ...customEnv };

    this.startedAt = new Date().toISOString();

    try {
      this.childProcess = spawn(targetExe, args, {
        cwd: workingDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      this.pid = this.childProcess.pid;
      this.ownedProcesses.push(this.pid);

      // 1. Registra estritamente no OwnedProcessRegistry
      ownedProcessRegistry.register(this.childProcess, {
        sessionId: this.sessionId,
        executable: targetExe,
        command: `${targetExe} ${args.join(' ')}`
      });

      // 2. Conecta LogCollector para telemetria contínua
      logCollector.attachProcess(this.childProcess, {
        sessionId: this.sessionId,
        pid: this.pid
      });

      // 3. Conecta Watchdog para proteção contra hang
      watchdog.watch(this);

      // 4. Hook de término do processo filho
      this.childProcess.on('exit', (code, signal) => {
        this.endedAt = new Date().toISOString();
        this.exitCode = code;
        this.durationMs = this.startedAt ? (Date.now() - new Date(this.startedAt).getTime()) : 0;
        watchdog.unwatch(this.sessionId);

        if (this.state !== 'STOPPING' && this.state !== 'STOPPED' && this.state !== 'CLEANUP') {
          this.state = code === 0 ? 'STOPPED' : 'CRASHED';
          logCollector.log(code === 0 ? 'INFO' : 'ERROR', 'RUNTIME', `Processo filho (PID ${this.pid}) encerrou com código ${code}`, {
            sessionId: this.sessionId,
            pid: this.pid
          });
        }
        this._saveSession();
      });

      // 5. Query inicial de janela e transição para RUNNING
      setTimeout(() => {
        this._probeWindow();
      }, 500);

      this.transitionTo('RUNNING');
      return { success: true, pid: this.pid, sessionId: this.sessionId };

    } catch (err) {
      this.transitionTo('FAILED');
      this.errors.push(err.message);
      this._saveSession();
      throw err;
    }
  }

  /**
   * Encerra a sessão de forma segura e controlada (apenas processos pertencentes)
   */
  async stop(reason = 'User Requested Stop') {
    if (['STOPPED', 'FAILED', 'CLEANUP'].includes(this.state)) {
      return { success: true, state: this.state };
    }

    this.transitionTo('STOPPING');
    watchdog.unwatch(this.sessionId);

    let stopRes = { success: true };
    if (this.pid && ownedProcessRegistry.isOwned(this.pid)) {
      stopRes = ownedProcessRegistry.stop(this.pid, reason);
    }

    this.endedAt = new Date().toISOString();
    this.durationMs = this.startedAt ? (Date.now() - new Date(this.startedAt).getTime()) : 0;
    this.transitionTo('STOPPED');

    return {
      success: stopRes.success,
      sessionId: this.sessionId,
      pid: this.pid,
      durationMs: this.durationMs
    };
  }

  /**
   * Encerramento forçado em caso de timeout
   */
  forceStop(reason = 'Timeout Exceeded') {
    if (this.pid && ownedProcessRegistry.isOwned(this.pid)) {
      ownedProcessRegistry.stop(this.pid, reason);
    }
    this.state = 'TIMEOUT';
    this._saveSession();
  }

  handleTimeout(timeoutType) {
    this.errors.push(`Session timeout: ${timeoutType}`);
    this.forceStop(timeoutType);
  }

  /**
   * Limpa recursos da sessão
   */
  cleanup() {
    if (this.state !== 'CLEANUP') {
      try {
        this.transitionTo('CLEANUP');
      } catch (e) {
        this.state = 'CLEANUP';
      }
    }
    watchdog.unwatch(this.sessionId);
    this._saveSession();
    return { success: true, sessionId: this.sessionId };
  }

  /**
   * Detecta janela ativa no Windows
   */
  _probeWindow() {
    if (process.platform === 'win32' && this.pid) {
      try {
        const query = spawnSync('powershell', [
          '-NoProfile', '-NonInteractive', '-Command',
          `$p = Get-Process -Id ${this.pid} -ErrorAction SilentlyContinue; if ($p) { @{ Handle = [int64]$p.MainWindowHandle; Title = $p.MainWindowTitle } | ConvertTo-Json -Compress }`
        ], { encoding: 'utf8', timeout: 3000 });

        if (query.stdout && query.stdout.trim().startsWith('{')) {
          const parsed = JSON.parse(query.stdout.trim());
          this.windowHandle = parsed.Handle || null;
          this.windowTitle = parsed.Title || null;
          this._saveSession();
        }
      } catch (e) {}
    }
  }

  /**
   * Persiste estado da sessão para recuperação pós-falha
   */
  _saveSession() {
    try {
      const data = {
        sessionId: this.sessionId,
        gameId: this.gameId,
        gameDir: this.gameDir,
        stagingDir: this.stagingDir,
        executablePath: this.executablePath,
        executableHash: this.executableHash,
        pid: this.pid,
        parentPid: this.parentPid,
        startedAt: this.startedAt,
        endedAt: this.endedAt,
        durationMs: this.durationMs,
        state: this.state,
        exitCode: this.exitCode,
        windowHandle: this.windowHandle,
        windowTitle: this.windowTitle,
        engine: this.engine,
        runtime: this.runtime,
        strategy: this.strategy,
        errors: this.errors,
        ownedProcesses: this.ownedProcesses,
        updatedAt: new Date().toISOString()
      };
      const sessionFile = path.join(this.sessionsDir, `${this.sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
  }

  // ==================== CRASH RECOVERY STATIC HELPERS ====================

  /**
   * Detecta sessões interrompidas abruptamente após reinício
   */
  static detectIncompleteSessions(sessionsDir = path.resolve(__dirname, '../../data/sessions')) {
    if (!fs.existsSync(sessionsDir)) return [];
    const incomplete = [];

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const filePath = path.join(sessionsDir, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Sessões que não alcançaram estado terminal STOPPED ou CLEANUP
        if (!['STOPPED', 'CLEANUP'].includes(data.state)) {
          incomplete.push({
            sessionId: data.sessionId,
            filePath,
            state: data.state,
            pid: data.pid,
            executablePath: data.executablePath,
            stagingDir: data.stagingDir,
            recommendedAction: data.stagingDir ? 'ROLLBACK_AND_CLEANUP' : 'MARK_FAILED'
          });
        }
      } catch (e) {}
    }

    return incomplete;
  }

  /**
   * Executa recuperação segura de uma sessão órfã
   */
  static recoverSession(sessionData, action = 'MARK_FAILED') {
    // Se o PID ainda estiver rodando e for propriedade confirmada, encerra com segurança
    if (sessionData.pid && ownedProcessRegistry.isOwned(sessionData.pid)) {
      ownedProcessRegistry.stop(sessionData.pid, 'Crash Recovery');
    }

    if (fs.existsSync(sessionData.filePath)) {
      try {
        const cur = JSON.parse(fs.readFileSync(sessionData.filePath, 'utf8'));
        cur.state = 'CLEANUP';
        cur.recoveryAction = action;
        cur.recoveredAt = new Date().toISOString();
        fs.writeFileSync(sessionData.filePath, JSON.stringify(cur, null, 2), 'utf8');
      } catch (e) {}
    }

    return { recovered: true, sessionId: sessionData.sessionId, action };
  }
}

module.exports = RuntimeSession;
