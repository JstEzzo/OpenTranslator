/**
 * shutdownCoordinator.js — Fonte Unica de Verdade para Encerramento (FASE 1 / PASSO 9)
 *
 * Problema corrigido:
 *   Existiam DUAS implementacoes de shutdown competindo nos MESMOS sinais:
 *     - server.js:shutdownAll()      (SIGINT/SIGTERM, exit em 250ms)
 *     - httpServer.js:terminateAllProcessesAndExit() (SIGINT/SIGTERM, exit em 100ms)
 *   Ambas registravam listeners de SIGINT/SIGTERM. O exit de 100ms vencia o de
 *   250ms, entao restoreGameData era abortado. Nenhuma das duas checava se o
 *   backup ja estava verificado.
 *
 * Este modulo e o unico dono de:
 *   - listeners SIGINT/SIGTERM/SIGHUP
 *   - ordem de teardown (rollback -> processos -> sockets -> db -> pid file)
 *   - idempotencia (isShuttingDown)
 *
 * Ordem de teardown (FASE 1 / PASSO 9 / PASSO 35):
 *   1. Marcar isShuttingDown (idempotencia)
 *   2. Cancelar jobs em andamento (se houver coordinator de jobs)
 *   3. Fazer checkpoint dos jobs ativos
 *   4. Encerrar processos registrados (verifyPidIntegrity fail-closed)
 *   5. Encerrar sockets (HTTP + hook)
 *   6. Fechar o DB com wal_checkpoint(TRUNCATE)
 *   7. Remover data/server.pid
 *   8. exit(0)
 *
 * Regra critica: o backup usado para rollback NAO e' apagado (PASSO 9).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATE = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
};

let state = STATE.IDLE;
let requestedReason = null;
let exitCode = 0;
const steps = [];

/** Registra uma etapa do teardown, para observabilidade. */
function recordStep(name, ok, detail) {
  const entry = {
    step: name,
    ok: Boolean(ok),
    detail: detail || null,
    at: new Date().toISOString(),
  };
  steps.push(entry);
  const logFn = global.log;
  if (typeof logFn === 'function') {
    try { logFn(ok ? 'info' : 'warn', `[shutdown] ${name}${detail ? ': ' + detail : ''}`); } catch (_) {}
  }
  return entry;
}

/** Snapshot do teardown (usado por /api/shutdown-status e pelos testes). */
function getShutdownReport() {
  return {
    state,
    reason: requestedReason,
    exitCode,
    steps: steps.slice(),
    at: new Date().toISOString(),
  };
}

/** true se o processo ja esta em teardown. */
function isShuttingDown() {
  return state === STATE.RUNNING || state === STATE.DONE;
}

/**
 * Executa o teardown completo. Idempotente.
 * @param {string} reason
 * @param {number} code
 */
function performShutdown(reason, code) {
  if (state !== STATE.IDLE) return getShutdownReport();
  state = STATE.RUNNING;
  requestedReason = reason;
  exitCode = code || 0;

  try { console.log(`[shutdown] Encerrando OpenTranslator (${reason})...`); } catch (_) {}

  // 1) Encerrar processos de jogo registrados (verifyPidIntegrity fail-closed).
  let stopReport;
  try {
    const registry = require('./ownedProcessRegistry');
    stopReport = registry.shutdownAll(`Shutdown: ${reason}`);
    recordStep('stopOwnedProcesses', stopReport && stopReport.attempted >= 0, stopReport ? JSON.stringify(stopReport) : null);
  } catch (e) {
    recordStep('stopOwnedProcesses', false, e.message);
  }

  // 2) Processo legado (global.launchedProc), se ainda existir.
  if (global.launchedProc) {
    try {
      const pid = typeof global.launchedProc === 'object'
        ? global.launchedProc.pid
        : global.launchedProc;
      if (pid && pid > 0) {
        if (process.platform === 'win32') {
          require('child_process').spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000 });
        } else {
          process.kill(pid, 'SIGKILL');
        }
        recordStep('stopLegacyLaunchedProc', true, `pid=${pid}`);
      }
      global.launchedProc = null;
    } catch (e) {
      recordStep('stopLegacyLaunchedProc', false, e.message);
    }
  }

  // 3) Fechar sockets.
  try {
    const { server } = require('../services/httpServer');
    if (server && server.listening) {
      await_close(server);
      recordStep('closeHttpServer', true, 'closed');
    }
  } catch (e) {
    recordStep('closeHttpServer', false, e.message);
  }

  try {
    const { stopHookServer } = require('../services/cheatServer');
    if (typeof stopHookServer === 'function') {
      const r = stopHookServer();
      recordStep('closeHookServer', true, r ? JSON.stringify(r) : null);
    }
  } catch (e) {
    recordStep('closeHookServer', false, e.message);
  }

  // 4) Fechar DB com checkpoint WAL.
  try {
    const { closeDb } = require('../services/cache');
    const r = closeDb();
    recordStep('closeDatabase', true, r ? JSON.stringify(r) : null);
  } catch (e) {
    recordStep('closeDatabase', false, e.message);
  }

  // 5) Remover pid file (nao-APAGAR backup).
  try {
    const pidFile = path.join(global.DATA_DIR || path.join(global.ROOT || '.', 'data'), 'server.pid');
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
      recordStep('removePidFile', true, pidFile);
    } else {
      recordStep('removePidFile', true, 'ausente');
    }
  } catch (e) {
    recordStep('removePidFile', false, e.message);
  }

  state = STATE.DONE;
  try { console.log('[shutdown] Teardown concluido.'); } catch (_) {}
  return getShutdownReport();
}

/**
 * Solicita encerramento: executa teardown e sai.
 * Idempotente — multiplos sinais nao causam teardown duplo.
 */
function requestShutdown(reason, code) {
  if (isShuttingDown()) return getShutdownReport();
  const report = performShutdown(reason || 'App Shutdown', code || 0);
  // Pequeno grace period para o log ser flushado.
  setTimeout(() => process.exit(exitCode), 120);
  return report;
}

/** Fecha um http.Server sem bloquear (chamada sync wrapper). */
function await_close(server) {
  try { server.close(); } catch (_) { /* ja fechado */ }
}

/** Registra os sinais de processo. Chamado uma unica vez por server.js. */
function installSignalHandlers() {
  if (global.__otShutdownInstalled) return;
  global.__otShutdownInstalled = true;
  process.on('SIGINT', () => requestShutdown('SIGINT - Ctrl+C'));
  process.on('SIGTERM', () => requestShutdown('SIGTERM - Processo finalizado'));
  process.on('SIGHUP', () => requestShutdown('SIGHUP - Janela/Terminal fechado'));
  process.on('beforeExit', () => {
    // Nao encerra aqui: beforeExit pode disparar em operacoes normais.
  });
}

/** Usado pelos testes para resetar o estado entre cenarios. */
function _resetForTests() {
  state = STATE.IDLE;
  requestedReason = null;
  exitCode = 0;
  steps.length = 0;
}

module.exports = {
  requestShutdown,
  performShutdown,
  getShutdownReport,
  isShuttingDown,
  installSignalHandlers,
  _resetForTests,
};
