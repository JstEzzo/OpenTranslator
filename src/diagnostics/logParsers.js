class ErrorTimeline {
  constructor() {
    this.events = [];
    this.startTime = Date.now();
  }

  record(event, details = {}) {
    const deltaMs = Date.now() - this.startTime;
    const deltaSec = Math.floor(deltaMs / 1000);
    const entry = {
      marker: `T+${deltaSec}`,
      deltaMs,
      event,
      details,
      timestamp: new Date().toISOString()
    };
    this.events.push(entry);
    return entry;
  }

  getTimeline() {
    return this.events;
  }
}

class LogParsers {
  static parseUnityLog(content) {
    const lines = content.split('\n');
    const versionMatch = content.match(/Initialize engine version:\s*([\d\.\w]+)/i);
    const errors = [];
    for (const l of lines) {
      if (/Exception|Error|NullReference/i.test(l) && !/CrashReporter: Initialized/i.test(l)) {
        errors.push(l.trim());
      }
    }
    return {
      engine: 'Unity',
      version: versionMatch ? versionMatch[1] : 'unknown',
      errors: errors.slice(0, 15)
    };
  }

  static parseRenPyLog(content) {
    const errors = [];
    const lines = content.split('\n');
    for (const l of lines) {
      if (/Traceback|Exception|Error/i.test(l)) {
        errors.push(l.trim());
      }
    }
    return {
      engine: "Ren'Py",
      errors: errors.slice(0, 15)
    };
  }

  static parseElectronLog(content) {
    const errors = [];
    const lines = content.split('\n');
    for (const l of lines) {
      if (/Uncaught|Error|SyntaxError|TypeError/i.test(l)) {
        errors.push(l.trim());
      }
    }
    return {
      engine: 'Electron/Node',
      errors: errors.slice(0, 15)
    };
  }
}

module.exports = {
  ErrorTimeline,
  LogParsers
};
