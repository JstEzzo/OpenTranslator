'use strict';

// Shared by signals, HTTP shutdown and the delayed game-exit restore.
const fs = require('fs');
const path = require('path');
let state = 'IDLE';
let reason = null;
let exitCode = 0;
let shutdownPromise = null;
let exitPromise = null;
let restorePromise = null;
const operations = new Set();
const steps = [];

function recordStep(step, ok, detail = null) {
  steps.push({ step, ok: Boolean(ok), detail, at: new Date().toISOString() });
  if (!ok) exitCode = 1;
  if (typeof global.log === 'function') {
    try { global.log(ok ? 'info' : 'error', `[shutdown] ${step}: ${detail || (ok ? 'OK' : 'falha')}`); } catch (_) { /* logging cannot interrupt recovery */ }
  }
}
function getShutdownReport() {
  return { state, reason, exitCode, steps: steps.map(s => ({ ...s })), at: new Date().toISOString() };
}
function isShuttingDown() { return state !== 'IDLE'; }

function trackOperation(operation) {
  const promise = Promise.resolve(operation);
  operations.add(promise);
  promise.then(() => operations.delete(promise), () => operations.delete(promise));
  return promise;
}
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
function clearRestoreTimer() {
  if (global.restoreTimeout) clearTimeout(global.restoreTimeout);
  global.restoreTimeout = null;
}
function restorePendingGame() {
  if (restorePromise) return restorePromise;
  clearRestoreTimer();
  const backup = global.launchedBak;
  if (!backup) return Promise.resolve({ ok: true, skipped: true });
  if (global.unverifiedDetachedGameProcess) return Promise.resolve({ ok: false,
    backupPreservedAt: backup, error: 'Processo filho do injetor nao confirmado como encerrado; backup preservado para recuperacao manual' });
  restorePromise = Promise.resolve().then(async () => {
    const { restoreGameData } = require('./gameEngine');
    const result = await restoreGameData(backup);
    const ok = result === true || Boolean(result && result.ok === true && result.verified === true);
    if (!ok) return { ok: false, backupPreservedAt: backup, error: result && result.error || 'Restauracao nao confirmada' };
    if (global.launchedBak === backup) global.launchedBak = null;
    return { ok: true, result };
  }).catch(err => ({ ok: false, backupPreservedAt: backup, error: err.message }))
    .finally(() => { restorePromise = null; });
  return restorePromise;
}
function scheduleGameRestore(backup, delayMs = 20000) {
  if (!backup) return;
  if (global.launchedBak && global.launchedBak !== backup) {
    throw new Error('Existe outra restauracao pendente; backup preservado');
  }
  global.launchedBak = backup;
  clearRestoreTimer();
  if (isShuttingDown()) return;
  global.restoreTimeout = setTimeout(() => {
    restorePendingGame().then(result => {
      if (!result.ok && typeof global.log === 'function') global.log('error', result.error);
    });
  }, delayMs);
}
function closeHttpServer(server, timeoutMs) {
  if (!server || !server.listening) return Promise.resolve();
  return withTimeout(new Promise((resolve, reject) => {
    server.close(err => err ? reject(err) : resolve());
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  }), timeoutMs, 'Requisicoes HTTP ainda ativas; restauracao preservada');
}

function performShutdown(requestedReason = 'App Shutdown', code = 0, options = {}) {
  if (shutdownPromise) return shutdownPromise;
  state = 'RUNNING'; reason = requestedReason; exitCode = code;
  clearRestoreTimer();
  const timeoutMs = options.timeoutMs || 30000;
  shutdownPromise = Promise.resolve().then(async () => {
    // Drain both foreground RPC and jobs started in the background before touching game files.
    let drained = true;
    try {
      const { server } = require('../services/httpServer');
      await Promise.all([
        closeHttpServer(server, timeoutMs),
        withTimeout(Promise.allSettled([...operations]), timeoutMs, 'Operacoes ainda ativas'),
        withTimeout(Promise.resolve(require('../services/cheatServer').stopHookServer()), timeoutMs, 'Hooks ainda ativos'),
      ]);
      recordStep('drainOperationsAndSockets', true);
    } catch (err) { drained = false; recordStep('drainOperationsAndSockets', false, err.message); }

    const legacy = global.launchedProc;
    const legacyPid = legacy && (typeof legacy === 'object' ? legacy.pid : legacy);
    let stopped = false;
    try {
      const registry = require('./ownedProcessRegistry');
      const owned = legacyPid ? registry.isOwned(legacyPid) : true;
      const report = registry.shutdownAll(`Shutdown: ${requestedReason}`);
      const legacyAlive = legacyPid && (!legacy || legacy.exitCode === null || legacy.exitCode === undefined);
      stopped = report.blocked === 0 && (!legacyAlive || owned);
      recordStep('stopOwnedProcesses', stopped, JSON.stringify(report));
      if (stopped) global.launchedProc = null;
    } catch (err) { recordStep('stopOwnedProcesses', false, err.message); }

    if (drained && stopped) {
      const restored = await restorePendingGame();
      recordStep('restoreGameBackup', restored.ok, restored.error || null);
    } else if (global.launchedBak) {
      recordStep('restoreGameBackup', false, 'Backup preservado: operacao ou processo ainda ativo');
    }
    if (drained) {
      try {
        const result = require('../services/cache').closeDb();
        recordStep('closeDatabase', !result || result.ok !== false, result && result.error);
      } catch (err) { recordStep('closeDatabase', false, err.message); }
      try {
        const memory = require('./translationMemory');
        if (memory.db && memory.db.open) memory.db.close();
        recordStep('closeTranslationMemory', true);
      } catch (err) { recordStep('closeTranslationMemory', false, err.message); }
    }
    try {
      const file = path.join(global.DATA_DIR || path.join(global.ROOT || '.', 'data'), 'server.pid');
      if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').trim() === String(process.pid)) fs.unlinkSync(file);
      recordStep('removeOwnedPidFile', true);
    } catch (err) { recordStep('removeOwnedPidFile', false, err.message); }
    state = 'DONE';
    return getShutdownReport();
  }).catch(err => {
    recordStep('shutdown', false, err.message); state = 'DONE'; return getShutdownReport();
  });
  return shutdownPromise;
}
function requestShutdown(requestedReason, code) {
  if (!exitPromise) exitPromise = performShutdown(requestedReason, code).then(report => {
    // Only log flushing happens after teardown; no restoration is cut short by this timer.
    setTimeout(() => process.exit(report.exitCode), 120);
    return report;
  });
  return exitPromise;
}
let installed = false;
function installSignalHandlers() {
  if (installed) return;
  installed = true;
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => requestShutdown(signal));
}
module.exports = {
  performShutdown, requestShutdown, installSignalHandlers, getShutdownReport,
  isShuttingDown, trackOperation, restorePendingGame, scheduleGameRestore,
};
