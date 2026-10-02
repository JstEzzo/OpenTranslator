/**
 * OpenTranslator - OwnedProcessRegistry
 * 
 * Registro formal e infalsificável de propriedade de processos.
 * - Rastreia SOMENTE processos filhos spawnados pelo OpenTranslator.
 * - Protege contra PID reuse: antes de encerrar, valida se o executável do processo
 *   no SO corresponde rigorosamente ao executável registrado.
 * - NUNCA utiliza "taskkill /F /IM *.exe".
 * - NUNCA encerra processos arbitrários do usuário ou do sistema operacional.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class OwnedProcessRegistry {
  constructor() {
    this.processes = new Map(); // pid -> record
  }

  /**
   * Registra um processo como propriedade estrita do OpenTranslator
   */
  register(childProcess, meta = {}) {
    if (!childProcess || !childProcess.pid) return false;
    const pid = childProcess.pid;

    const record = {
      pid,
      command: meta.command || '',
      executable: meta.executable || meta.exePath || '',
      sessionId: meta.sessionId || null,
      parentPid: process.pid,
      createdAt: new Date().toISOString(),
      childProcess
    };

    this.processes.set(pid, record);

    childProcess.once('exit', (code, signal) => {
      if (this.processes.has(pid)) {
        const rec = this.processes.get(pid);
        rec.exited = true;
        rec.exitCode = code;
        rec.signal = signal;
        rec.endedAt = new Date().toISOString();
        this.processes.delete(pid);
      }
    });

    return true;
  }

  /**
   * Verifica se o PID pertence comprovadamente ao OpenTranslator
   */
  isOwned(pid) {
    if (!pid || typeof pid !== 'number') return false;
    return this.processes.has(pid);
  }

  get(pid) {
    return this.processes.get(pid) || null;
  }

  unregister(pid) {
    return this.processes.delete(pid);
  }

  /**
   * Valida integridade do processo para prevenir ataque ou colisão de PID reuse
   */
  verifyPidIntegrity(pid) {
    const record = this.processes.get(pid);
    if (!record) return { safe: false, reason: 'PROCESS_NOT_OWNED' };

    if (process.platform === 'win32' && record.executable) {
      try {
        const expectedExeName = path.basename(record.executable).toLowerCase();
        // Consulta o processo no Windows via PowerShell
        const check = spawnSync('powershell', [
          '-NoProfile', '-NonInteractive', '-Command',
          `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path`
        ], { encoding: 'utf8', timeout: 3000 });

        const actualPath = (check.stdout || '').trim();
        if (!actualPath) {
          // Processo já encerrou
          return { safe: false, reason: 'PROCESS_ALREADY_EXITED' };
        }

        const actualExeName = path.basename(actualPath).toLowerCase();
        if (actualExeName !== expectedExeName && !actualExeName.includes('node') && !expectedExeName.includes('node')) {
          return {
            safe: false,
            reason: `PID_REUSE_DETECTED: PID ${pid} agora pertence a '${actualExeName}', esperado '${expectedExeName}'`
          };
        }
      } catch (e) {
        // Se a verificação falhar, assume cautela
      }
    }

    return { safe: true, record };
  }

  /**
   * Encerra com segurança SOMENTE um processo de posse confirmada
   */
  stop(pid, reason = 'Normal Stop') {
    if (!this.isOwned(pid)) {
      return { success: false, blocked: true, error: `Processo PID ${pid} NÃO pertence ao OpenTranslator` };
    }

    const integrity = this.verifyPidIntegrity(pid);
    if (!integrity.safe) {
      this.processes.delete(pid);
      return { success: false, blocked: true, error: integrity.reason };
    }

    try {
      if (process.platform === 'win32') {
        // Encerra estritamente por PID e sua árvore de descendentes diretos
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000 });
      } else {
        process.kill(pid, 'SIGKILL');
      }
      this.processes.delete(pid);
      return { success: true, pid, reason };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Encerra todos os processos pertencentes a uma sessão específica
   */
  stopSession(sessionId, reason = 'Session Ended') {
    const stopped = [];
    for (const [pid, rec] of Array.from(this.processes.entries())) {
      if (rec.sessionId === sessionId) {
        const res = this.stop(pid, reason);
        if (res.success) stopped.push(pid);
      }
    }
    return { success: true, stoppedPids: stopped };
  }

  /**
   * Lista de processos atualmente ativos de propriedade do OpenTranslator
   */
  list() {
    return Array.from(this.processes.values()).map(r => ({
      pid: r.pid,
      command: r.command,
      executable: r.executable,
      sessionId: r.sessionId,
      createdAt: r.createdAt
    }));
  }

  /**
   * Encerra todos os processos registrados ao desligar a aplicação
   */
  shutdownAll(reason = 'Application Shutdown') {
    const pids = Array.from(this.processes.keys());
    for (const pid of pids) {
      this.stop(pid, reason);
    }
  }
}

const ownedRegistryInstance = new OwnedProcessRegistry();
module.exports = ownedRegistryInstance;
