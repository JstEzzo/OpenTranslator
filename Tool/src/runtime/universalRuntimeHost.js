const path = require('path');
const eventBus = require('./runtimeEventBus');
const processInspector = require('../diagnostics/processInspector');
const logIntelligence = require('../diagnostics/logIntelligence');
const errorAnalyzer = require('../diagnostics/errorAnalyzer');

/**
 * UniversalRuntimeHost
 * 
 * Central coordinator for runtime observation, telemetry, and per-engine providers.
 * ARCHITECTURAL DECISION (Phase 4A Audit):
 * A single native "Super DLL" injected universally across all engines (Ren'Py Python VM,
 * Chromium V8, Mono CLR, IL2CPP native C++, RGSS Ruby VM, Wolf assembly) is NOT viable
 * and causes process crashes, AV blocks, and runtime instability.
 * 
 * UniversalRuntimeHost implements the validated architecture:
 * 1. Universal coordinator host (Process, Session, Security, Telemetry, Observe-Only).
 * 2. Per-Engine Providers (ElectronBridge, BepInEx loader, Ren'Py hook, OCR).
 * 3. Generic Native Observer (Safe read-only memory/window/module inspector).
 */
class UniversalRuntimeHost {
  constructor() {
    this.sessions = new Map();
    this.providers = new Map();
    this.eventBus = eventBus;
  }

  registerProvider(engineName, provider) {
    this.providers.set(engineName.toLowerCase(), provider);
  }

  getProvider(engineName) {
    return this.providers.get(engineName.toLowerCase()) || null;
  }

  /**
   * Start an observed runtime session for a game process.
   */
  startSession(pid, gamePath, options = {}) {
    const session = {
      id: `sess_${pid}_${Date.now()}`,
      pid,
      gamePath,
      mode: options.mode || 'OBSERVE_ONLY', // 'OBSERVE_ONLY' or 'ATTACH_ACTIVE'
      startTime: new Date().toISOString(),
      provider: null,
      status: 'INITIALIZING',
      telemetry: {
        modulesCount: 0,
        textsDetected: 0,
        translationsApplied: 0,
        errors: []
      }
    };

    this.sessions.set(pid, session);
    this.eventBus.emitEvent('PROCESS_STARTED', { pid, gamePath, mode: session.mode });

    // Initial inspection
    try {
      const pInfo = processInspector.inspectProcess(pid);
      session.processInfo = pInfo;
      session.telemetry.modulesCount = pInfo.loadedModules ? pInfo.loadedModules.length : 0;
      session.status = 'OBSERVING';

      this.eventBus.emitEvent('RUNTIME_DETECTED', {
        pid,
        engineClues: pInfo.engineClues,
        arch: pInfo.architecture
      });
    } catch (err) {
      session.status = 'ERROR';
      session.telemetry.errors.push(err.message);
    }

    return session;
  }

  /**
   * Observe live text and state without mutating code/memory.
   */
  observeTick(pid) {
    const session = this.sessions.get(pid);
    if (!session) return { ok: false, error: 'Session not found' };

    const pInfo = processInspector.inspectProcess(pid);
    if (!pInfo.ok) {
      session.status = 'TERMINATED';
      this.eventBus.emitEvent('PROCESS_EXITED', { pid, code: 0 });
      return { ok: false, status: 'TERMINATED' };
    }

    return {
      ok: true,
      pid,
      mode: session.mode,
      windowTitle: pInfo.windowTitle,
      modulesCount: pInfo.loadedModules.length,
      engineClues: pInfo.engineClues,
      recentEvents: this.eventBus.getRecentEvents(10)
    };
  }

  stopSession(pid) {
    const session = this.sessions.get(pid);
    if (!session) return { ok: false };
    session.status = 'CLOSED';
    this.eventBus.emitEvent('PROCESS_EXITED', { pid, code: 0 });
    this.sessions.delete(pid);
    return { ok: true };
  }

  getStatus() {
    return {
      architecture: 'UniversalRuntimeHost + Modular Engine Providers',
      superDllViability: 'REJECTED: Universal DLL injection across disparate runtimes causes instability',
      activeSessions: Array.from(this.sessions.values()),
      registeredProviders: Array.from(this.providers.keys())
    };
  }
}

module.exports = new UniversalRuntimeHost();
