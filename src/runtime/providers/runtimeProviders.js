/**
 * FASE 9 / PASSO 39 — OBSERVAR DE VERDADE, OU DECLARAR QUE NÃO SE OBSERVA
 *
 * A implementação anterior era:
 *
 *     async observeProcess(pid) {
 *       return { ok: true, provider: this.name, pid, observed: true };
 *     }
 *
 * Ela devolvia `observed: true` sem tocar em nada — nem no sistema, nem no
 * processo. E como era o método da classe BASE, todos os providers herdavam a
 * mesma mentira: GenericRuntimeProvider, UnityMonoProvider, V8Provider,
 * PythonProvider, RubyProvider. Um `observed: true` desses significava
 * literalmente "não olhamos".
 *
 * O risco não era o relatório: era a decisão. O runtime usa isto para decidir
 * se há um jogo vivo para hooked,ar, capturar texto e hot-reload. Um
 * observador que responde "sim, observado" para qualquer PID transforma essa
 * decisão em sempre-ou-nunca, e o sempre custa caro: a UI mostra sessão ativa,
 * a captura não recebe nada, e nada no log explica por quê.
 *
 * Agora:
 *   - a observations de VIDA DO PROCESSO é real (`process.kill(pid, 0)`), e
 *     vale para todos os providers porque é o que todos de fato sabem fazer;
 *   - o detalhe específico do engine (módulos carregados, BepInEx presente,
 *     bridge CDP) exige um `observer` injetado. Sem ele, o provider diz
 *     `observed: false` com o motivo, em vez de inventar.
 */
function processoVivo(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) {
    return { vivo: false, motivo: `PID inválido: ${JSON.stringify(pid)}` };
  }
  try {
    // Sinal 0 não envia nada: apenas testa se o processo existe e é
    // endereçável por este usuário.
    process.kill(n, 0);
    return { vivo: true, motivo: null };
  } catch (e) {
    // EPERM = existe, mas pertence a outro usuário. Ainda é vivo.
    if (e && e.code === 'EPERM') return { vivo: true, motivo: null };
    return {
      vivo: false,
      motivo: e && e.code === 'ESRCH'
        ? `não existe processo com PID ${n}`
        : `não foi possível consultar o PID ${n}: ${e && e.message}`,
    };
  }
}

class BaseRuntimeProvider {
  /**
   * @param {string} name
   * @param {string[]} capabilities
   * @param {object} [options]
   * @param {function} [options.observer] Sondagem específica do engine.
   *   Recebe `{ pid }` e devolve um objeto de detalhe. Sem ela, o provider
   *   observa apenas a vida do processo — e reporta isso.
   */
  constructor(name, capabilities = [], options = {}) {
    this.name = name;
    this.capabilities = capabilities;
    this.status = 'READY';
    this.observer = typeof options.observer === 'function' ? options.observer : null;
  }

  getCapabilities() {
    return this.capabilities;
  }

  /** O provider sabe observar detalhes de engine? */
  get observationDepth() {
    return this.observer ? 'PROCESS_AND_ENGINE' : 'PROCESS_ONLY';
  }

  async observeProcess(pid) {
    const vida = processoVivo(pid);
    if (!vida.vivo) {
      // FASE 9: PID morto é resposta negativa explícita, com motivo.
      this.status = 'NO_PROCESS';
      return {
        ok: true,
        observed: false,
        provider: this.name,
        pid,
        status: 'PROCESS_NOT_FOUND',
        processAlive: false,
        depth: this.observationDepth,
        error: vida.motivo,
      };
    }

    this.status = 'OBSERVING';

    if (!this.observer) {
      // Realmente observed, mas só no que dá para saber sem sondagem de
      // engine. Declarar o limite é o que torna a afirmação confiável.
      return {
        ok: true,
        observed: true,
        provider: this.name,
        pid,
        status: 'PROCESS_ALIVE',
        processAlive: true,
        depth: this.observationDepth,
        engineDetail: null,
        warning: 'Somente a vida do processo foi verificada. Este provider não '
          + 'foi configurado com um `observer`, então nada específico do engine '
          + '(módulos, BepInEx, bridge) foi inspecionado.',
      };
    }

    let detalhe;
    try {
      detalhe = await this.observer({ pid, provider: this.name });
    } catch (e) {
      this.status = 'OBSERVE_FAILED';
      return {
        ok: true,
        observed: false,
        provider: this.name,
        pid,
        status: 'OBSERVE_FAILED',
        processAlive: true,
        depth: this.observationDepth,
        error: `a sondagem do engine lançou: ${e.message}`,
      };
    }

    if (!detalhe || typeof detalhe !== 'object') {
      this.status = 'OBSERVE_FAILED';
      return {
        ok: true,
        observed: false,
        provider: this.name,
        pid,
        status: 'OBSERVE_NO_RESULT',
        processAlive: true,
        depth: this.observationDepth,
        error: 'a sondagem do engine não retornou um resultado',
      };
    }

    this.status = 'OBSERVING';
    return {
      ok: true,
      // A observação é verdadeira se a sondagem do engine confirmou que o
      // alvo é o que ele diz ser. Uma sondagem que não confirma, não confirma.
      observed: detalhe.matched === true,
      provider: this.name,
      pid,
      status: detalhe.matched === true ? 'ENGINE_MATCHED' : 'ENGINE_NOT_MATCHED',
      processAlive: true,
      depth: this.observationDepth,
      engineDetail: detalhe,
      error: detalhe.matched === true ? null
        : (detalhe.reason || 'a sondagem do engine não reconheceu o processo'),
    };
  }
}

class GenericRuntimeProvider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('GenericRuntimeProvider',
      ['process-observe', 'module-list', 'window-detect'], options);
  }
}

class UnityMonoProvider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('UnityMonoProvider',
      ['process-observe', 'bepinex-detect', 'harmony-hook', 'textmeshpro-detect'], options);
  }
}

class UnityIL2CPPProvider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('UnityIL2CPPProvider',
      ['process-observe', 'static-assets-inspect', 'screen-ocr-fallback'], options);
  }
}

class V8Provider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('V8Provider', ['cdp-bridge', 'dom-observe', 'live-dom-patch'], options);
  }
}

class PythonProvider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('PythonProvider', ['python-rpy-inspect', 'tl-inject', 'syntax-check'], options);
  }
}

class RubyProvider extends BaseRuntimeProvider {
  constructor(options = {}) {
    super('RubyProvider', ['process-observe', 'rgss-hook-detect', 'screen-ocr-fallback'], options);
  }
}

module.exports = {
  BaseRuntimeProvider,
  GenericRuntimeProvider,
  UnityMonoProvider,
  UnityIL2CPPProvider,
  V8Provider,
  PythonProvider,
  RubyProvider,
  processoVivo,
};
