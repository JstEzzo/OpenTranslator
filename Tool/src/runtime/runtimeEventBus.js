const EventEmitter = require('events');

/**
 * RuntimeEventBus: Centralized event broker for all runtime and diagnostic events.
 * Events:
 * - PROCESS_STARTED: { pid, name, path, arch }
 * - MODULE_LOADED: { pid, moduleName, path }
 * - RUNTIME_DETECTED: { pid, runtime, confidence }
 * - HOOK_READY: { pid, provider, endpoint }
 * - TEXT_DETECTED: { pid, source, text, context, confidence }
 * - TRANSLATION_APPLIED: { pid, original, translated, method }
 * - TEXT_CHANGED: { pid, textId, newText }
 * - GAME_ERROR: { pid, code, message, severity }
 * - GAME_CRASHED: { pid, exitCode, signal, forensics }
 * - PROCESS_EXITED: { pid, exitCode }
 */
class RuntimeEventBus extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.maxHistory = 1000;
  }

  emitEvent(eventName, payload = {}) {
    const entry = {
      event: eventName,
      timestamp: new Date().toISOString(),
      payload
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.emit(eventName, entry);
    this.emit('*', entry);
    return entry;
  }

  getRecentEvents(limit = 50, filterEvent = null) {
    let list = this.history;
    if (filterEvent) {
      list = list.filter(e => e.event === filterEvent);
    }
    return list.slice(-limit);
  }

  clearHistory() {
    this.history = [];
  }
}

module.exports = new RuntimeEventBus();
