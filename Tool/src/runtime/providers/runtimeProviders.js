class BaseRuntimeProvider {
  constructor(name, capabilities = []) {
    this.name = name;
    this.capabilities = capabilities;
    this.status = 'READY';
  }

  getCapabilities() {
    return this.capabilities;
  }

  async observeProcess(pid) {
    return { ok: true, provider: this.name, pid, observed: true };
  }
}

class GenericRuntimeProvider extends BaseRuntimeProvider {
  constructor() {
    super('GenericRuntimeProvider', ['process-observe', 'module-list', 'window-detect']);
  }
}

class UnityMonoProvider extends BaseRuntimeProvider {
  constructor() {
    super('UnityMonoProvider', ['process-observe', 'bepinex-detect', 'harmony-hook', 'textmeshpro-detect']);
  }
}

class UnityIL2CPPProvider extends BaseRuntimeProvider {
  constructor() {
    super('UnityIL2CPPProvider', ['process-observe', 'static-assets-inspect', 'screen-ocr-fallback']);
  }
}

class V8Provider extends BaseRuntimeProvider {
  constructor() {
    super('V8Provider', ['cdp-bridge', 'dom-observe', 'live-dom-patch']);
  }
}

class PythonProvider extends BaseRuntimeProvider {
  constructor() {
    super('PythonProvider', ['python-rpy-inspect', 'tl-inject', 'syntax-check']);
  }
}

class RubyProvider extends BaseRuntimeProvider {
  constructor() {
    super('RubyProvider', ['process-observe', 'rgss-hook-detect', 'screen-ocr-fallback']);
  }
}

module.exports = {
  BaseRuntimeProvider,
  GenericRuntimeProvider,
  UnityMonoProvider,
  UnityIL2CPPProvider,
  V8Provider,
  PythonProvider,
  RubyProvider
};
