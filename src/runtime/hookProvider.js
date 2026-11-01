/**
 * OpenTranslator — HookProvider
 * 
 * Camada profissional de Hook em Runtime para processos nativos (x86 e x64):
 * - Capabilities: capture, replace, restore, observe, detach, healthcheck
 * - Ciclo de vida estrito: ATTACH -> VERIFY -> ACTIVE -> MONITOR -> DETACH -> CLEANUP
 * - Contenção de falhas: se attach/verify falhar, reverte atomicamente sem deixar estados pendentes
 * - Rastreamento de identidade de texto com TextObjectIdentity
 */

const EventEmitter = require('events');
const TextObjectIdentity = require('../core/textObjectIdentity');

class HookProvider extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'UniversalHookProvider';
    this.arch = options.arch || 'x64'; // 'x86' ou 'x64'
    this.pid = options.pid || null;
    this.state = 'DETACHED'; // DETACHED, ATTACHING, VERIFYING, ACTIVE, MONITORING, DETACHING, CLEANUP, FAILED
    this.installedHooks = new Map();
    this.lastHealthcheck = null;
    this.failureCount = 0;

    // FASE 9 / PASSO 38 — O INJETOR É OBRIGATÓRIO
    //
    // Este arquivo antes era uma fachada: `attach()` registrava um objeto num
    // Map e devolvia `success: true` com `hookCount`, e `verify()` devolvia
    // `true` incondicionalmente — o comentario prometia "sinal de vida,
    // ponteiro válido" e não havia sonda nenhuma. O `throw` de
    // "integridade de memória não confirmada" na linha 65 era inalcançável:
    // `verify()` nunca devolvia falso.
    //
    // O resultado era um ciclo de vida com nome de "estrito" que não verificava
    // nada. Nada real era injetado no processo, mas o estado chegava a ACTIVE.
    //
    // Agora o injetor real é REQUIRED. Sem ele, o provider não tem como
    // verificar e portanto não pode afirmar sucesso — devolve NO_INJECTOR.
    // O ciclo de vida continua utilizável (e testável) com um injetor
    // fornecido, mas ninguém mais recebe ACTIVE sem nada atrás dele.
    this.injector = typeof options.injector === 'function' ? options.injector : null;
  }

  getCapabilities() {
    return {
      capture: true,
      replace: true,
      restore: true,
      observe: true,
      detach: true,
      healthcheck: true,
      architectures: ['x86', 'x64'],
      // FASE 9: attach agora é CONDICIONAL, e a UI precisa poder consultá-lo
      // antes de prometer hook em runtime.
      attach: this.injector !== null,
      requiresInjector: true,
    };
  }

  /**
   * Ciclo de vida estrito: Passo 1: Attach
   */
  async attach(processInfo = {}) {
    if (this.state === 'ACTIVE' || this.state === 'MONITORING') {
      return { success: true, state: this.state, alreadyAttached: true, message: 'Já anexado e ativo' };
    }

    // FASE 9: sem injetor não há hook — e o erro diz exatamente isso, em vez
    // de fingir um attach que não aconteceu.
    if (!this.injector) {
      this.state = 'FAILED';
      this.emit('stateChange', { state: this.state, pid: this.pid });
      return {
        success: false,
        state: this.state,
        status: 'NO_INJECTOR',
        error: 'Nenhum injetor foi fornecido a este HookProvider.',
        warning: 'Sem injetor real não é possível injetar nada no processo, '
          + 'portanto não é possível verificar a instalação. Reportar sucesso '
          + 'aqui seria falso: nenhum hook foi instalado.',
        attached: false,
        hookCount: 0,
      };
    }

    this.state = 'ATTACHING';
    this.pid = processInfo.pid;
    this.arch = processInfo.architecture || this.arch;
    this.emit('stateChange', { state: this.state, pid: this.pid });

    try {
      // FASE 9 / PASSO 38 — a "simulação" (que só guardava um objeto em
      // memória e chamava aquilo de instalação) foi trocada pela chamada real
      // ao injetor. `install` recebe alvo e PID e devolve um handle que
      // descreve o que foi de fato instalado.
      const target = optionsTarget(processInfo);
      const installed = await this.injector.install({
        pid: this.pid,
        arch: this.arch,
        target,
        hookPoint: processInfo.hookPoint || null,
      });

      if (!installed || installed.ok !== true) {
        throw new Error(
          'O injetor recusou a instalação: '
          + ((installed && (installed.error || installed.reason)) || 'sem retorno'),
        );
      }

      const hookEntry = {
        id: installed.handleId || `hook_${Date.now()}`,
        targetFunction: target,
        arch: this.arch,
        pid: this.pid,
        handle: installed.handle || null,
        installedAt: Date.now()
      };
      this.installedHooks.set(hookEntry.id, hookEntry);

      // Passo 2: Verify — agora com sonda de verdade.
      this.state = 'VERIFYING';
      const verdict = await this.verify(hookEntry.id);
      if (!verdict.verified) {
        throw new Error(`Falha de verificação do hook injetado: ${verdict.reason}`);
      }

      // Passo 3: Active
      this.state = 'ACTIVE';
      this.emit('stateChange', { state: this.state, pid: this.pid });

      // Passo 4: Monitor
      this._startMonitoring();

      return {
        success: true,
        state: this.state,
        pid: this.pid,
        arch: this.arch,
        hookId: hookEntry.id,
        hookCount: this.installedHooks.size,
        verifiedBy: verdict.probe,
      };
    } catch (err) {
      // Falha no attach: desfaz o que foi injetado e não deixa lixo.
      this.state = 'FAILED';
      await this.cleanup();
      return {
        success: false,
        state: this.state,
        attached: false,
        error: err.message
      };
    }

    function optionsTarget(info) {
      return info.hookPoint || (info.isMono ? 'UnityEngine.UI.Text::set_text' : 'GetTextW');
    }
  }

  /**
   * Ciclo de vida estrito: Passo 2: Verify
   *
   * FASE 9 / PASSO 38 — ESTA É A FUNÇÃO QUE NÃO PODE MENTIR
   *
   * Antes: `if (!this.installedHooks.has(hookId)) return false; return true;`
   * Só conferia que o id existia no Map — o que o próprio `attach()` acabava
   * de inserir. Verificar a própria escrita não é verificação.
   *
   * A sonda agora é real, em duas partes:
   *   1. existe sonda disponível (senão não há o que afirmar);
   *   2. `injector.probe` responde, e responde `alive` + `processAlive`.
   *
   * Devolve objeto com o motivo da falha, e não booleano cru, para que
   * `attach` propague a causa em vez de um erro genérico.
   */
  async verify(hookId) {
    const hook = this.installedHooks.get(hookId);
    if (!hook) {
      return { verified: false, reason: `hook '${hookId}' não está registrado`, probe: null };
    }
    if (!this.injector || typeof this.injector.probe !== 'function') {
      return {
        verified: false,
        reason: 'não há sonda disponível para conferir a instalação',
        probe: null,
      };
    }

    let probe;
    try {
      probe = await this.injector.probe({
        handle: hook.handle,
        pid: hook.pid,
        target: hook.targetFunction,
      });
    } catch (e) {
      return { verified: false, reason: `a sonda lançou: ${e.message}`, probe: null };
    }

    // Sem sonda, não há o que dizer. `undefined` não é "tudo bem".
    if (!probe || typeof probe !== 'object') {
      return { verified: false, reason: 'a sonda não retornou um resultado', probe: null };
    }
    if (probe.processAlive !== true) {
      return {
        verified: false,
        reason: `o processo-alvo não está mais vivo (pid=${hook.pid})`,
        probe: null,
      };
    }
    if (probe.alive !== true) {
      return {
        verified: false,
        reason: `sinal de vida ausente no ponto de hook (alive=${String(probe.alive)})`,
        probe: null,
      };
    }

    hook.lastVerifiedAt = Date.now();
    hook.probe = probe;
    return {
      verified: true,
      reason: null,
      probe: probe.probeType || 'injector.probe',
    };
  }

  /**
   * Ciclo de vida: Passo 4: Monitor
   */
  _startMonitoring() {
    this.state = 'MONITORING';
    this.healthcheckTimer = setInterval(() => {
      this.healthcheck();
    }, 2000);
  }

  /**
   * Captura texto interceptado pelo hook
   */
  onTextCaptured(rawText, metadata = {}) {
    if (this.state !== 'ACTIVE' && this.state !== 'MONITORING') return;

    const identity = new TextObjectIdentity({
      gameId: metadata.gameId || 'game',
      processId: this.pid,
      sceneId: metadata.sceneId || 'scene',
      componentId: metadata.componentId || 'component',
      sourceType: metadata.sourceType || 'dialogue',
      text: rawText,
      position: metadata.position || null
    });

    this.emit('text', {
      text: rawText,
      identity: identity.toJSON(),
      timestamp: Date.now()
    });
  }

  /**
   * Substitui texto no componente original através do hook
   *
   * FASE 9 / PASSO 38 — ESTE MÉTODO NÃO SUBSTITUIA NADA
   *
   * O corpo antigo era, inteiro:
   *
   *     return { success: true, replaced: true, identity: ..., translatedText };
   *
   * Ele devolvia os argumentos de volta e declarava `replaced: true`. Nenhum
   * processo era contatado, nenhuma memória era escrita. Um chamador que
   * lesse `replaced: true` acreditaria que o texto na tela já estava em
   * português — e não estava. O pior caso de todos aqui: o usuário via o
   * jogo em inglês, o log dizia que a substituição teve sucesso, e a
   * tradução em runtime parecia simplesmente não funcionar.
   *
   * Agora a escrita vai pelo injetor e a resposta é a DELE. Se não houver
   * injetor com `write`, o método declara a incapacidade em vez de ensaiar.
   */
  async replaceText(identity, translatedText) {
    if (this.state !== 'ACTIVE' && this.state !== 'MONITORING') {
      return { success: false, replaced: false, error: 'Hook não está ativo' };
    }

    const key = identity && identity.compositeKey ? identity.compositeKey : identity;
    if (!key) {
      return { success: false, replaced: false, error: 'Identidade de texto ausente' };
    }
    if (!this.injector || typeof this.injector.write !== 'function') {
      return {
        success: false,
        replaced: false,
        status: 'NO_WRITE_CHANNEL',
        error: 'O injetor não expõe um canal de escrita.',
        warning: 'Sem canal de escrita não é possível alterar o texto no '
          + 'processo. Nenhuma substituição foi feita.',
      };
    }

    let res;
    try {
      res = await this.injector.write({
        action: 'replace',
        identity: key,
        text: translatedText,
        pid: this.pid,
      });
    } catch (e) {
      return { success: false, replaced: false, identity: key, error: e.message };
    }

    if (!res || res.ok !== true || res.applied !== true) {
      return {
        success: false,
        replaced: false,
        identity: key,
        error: (res && (res.error || res.reason)) || 'o injetor não confirmou a escrita',
      };
    }

    this.emit('replaced', { identity: key, translatedText, at: Date.now() });
    return {
      success: true,
      replaced: true,
      identity: key,
      translatedText,
      confirmedBy: res.probeType || 'injector.write',
    };
  }

  /**
   * Restaura o texto original no componente
   *
   * FASE 9: mesmo defeito de replaceText — devolvia `restored: true` sem
   * restaurar. Sem canal de escrita, declara a incapacidade.
   */
  async restoreText(identity, originalText) {
    const key = identity && identity.compositeKey ? identity.compositeKey : identity;
    if (!key) {
      return { success: false, restored: false, error: 'Identidade de texto ausente' };
    }
    if (!this.injector || typeof this.injector.write !== 'function') {
      return {
        success: false,
        restored: false,
        status: 'NO_WRITE_CHANNEL',
        error: 'O injetor não expõe um canal de escrita.',
        warning: 'Nenhum texto foi restaurado: não há como escrever no processo.',
      };
    }

    let res;
    try {
      res = await this.injector.write({
        action: 'restore',
        identity: key,
        text: originalText,
        pid: this.pid,
      });
    } catch (e) {
      return { success: false, restored: false, identity: key, error: e.message };
    }

    if (!res || res.ok !== true || res.applied !== true) {
      return {
        success: false,
        restored: false,
        identity: key,
        error: (res && (res.error || res.reason)) || 'o injetor não confirmou a escrita',
      };
    }

    this.emit('restored', { identity: key, at: Date.now() });
    return {
      success: true,
      restored: true,
      identity: key,
      originalText,
      confirmedBy: res.probeType || 'injector.write',
    };
  }

  /**
   * Ciclo de vida: Passo 5: Detach
   */
  async detach() {
    this.state = 'DETACHING';
    if (this.healthcheckTimer) {
      clearInterval(this.healthcheckTimer);
      this.healthcheckTimer = null;
    }

    // Remove todos os hooks instalados
    for (const [id, hook] of this.installedHooks.entries()) {
      hook.active = false;
    }
    this.installedHooks.clear();

    return this.cleanup();
  }

  /**
   * Ciclo de vida: Passo 6: Cleanup
   */
  async cleanup() {
    this.state = 'CLEANUP';
    if (this.healthcheckTimer) {
      clearInterval(this.healthcheckTimer);
      this.healthcheckTimer = null;
    }
    this.installedHooks.clear();
    this.state = 'DETACHED';
    this.emit('stateChange', { state: this.state });
    return { success: true, state: this.state };
  }

  /**
   * Healthcheck do estado do hook
   */
  healthcheck() {
    const isAlive = (this.state === 'ACTIVE' || this.state === 'MONITORING');
    this.lastHealthcheck = {
      timestamp: Date.now(),
      alive: isAlive,
      state: this.state,
      hookCount: this.installedHooks.size
    };
    return this.lastHealthcheck;
  }
}

module.exports = HookProvider;
