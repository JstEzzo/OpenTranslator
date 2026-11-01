/**
 * ownedProcessRegistry.js — Registro formal e infalsificavel de propriedade de processos.
 *
 * FASE 1 / PASSO 20 — OWNERSHIP FAIL-CLOSED
 *
 * Vulnerabilidades corrigidas (causa raiz):
 *  V1  FAIL-OPEN na verificacao. Se o PowerShell falhasse (politica de execucao,
 *      PATH adulterado, timeout), o catch vazio deixava o codigo seguir e
 *      retornava safe:true -> matava com verificacao inexistente.
 *      AGORA: qualquer inability de provar e' safe:false.
 *  V2  EXCECAO PARA 'node'. O proprio processo do OpenTranslator e' node, entao
 *      dois node.exe distintos (usuario vs app) eram sempre considerados iguais.
 *      A protecao de PID-reuse ficava anulada exatamente no caso de maior risco.
 *      AGORA: sem excecao. Compara caminho completo normalizado.
 *  V3  BIZARRO: se record.executable estivesse vazio, toda a verificacao era
 *      pulada (L77 antigo). AGORA: executable ausente => safe:false.
 *  V4  POSIX sem verificacao nenhuma. AGORA: usa /proc para starttime + exe path.
 *  V5  taskkill falha mas retornava success:true. AGORA: inspeciona-se o codigo
 *      de saida e confirma-se que o processo morreu.
 *  V6  stop() na falha de integridade REMOVIA o pid do registro sem matar,
 *      tornando o processo real inalcancavel. AGORA: mantem o registro e
 *      sinaliza explicitamente, para retry/inspecao.
 *  V7  Nenhum uso de taskkill /F /IM (nome global). Mantido como invariante:
 *      NUNCA por nome, SO por PID validado.
 *  V8  Sem persistencia: apos restart, processos orfaos eram inalcancaveis.
 *      AGORA: o registro e' gravado em data/owned_processes.json e reidratado.
 *
 * Identidade do processo = (pid, executable normalizado, startTime do SO).
 * Reuso de PID com startTime diferente e' detectado mesmo que o executavel
 * coincida.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/** Caminho do registro persistido. */
function registryFile() {
  const root = global.ROOT || path.resolve(__dirname, '..', '..');
  const dataDir = global.DATA_DIR || path.join(root, 'data');
  return path.join(dataDir, 'owned_processes.json');
}

/** Normaliza um caminho de executavel para comparacao estavel. */
function normalizeExe(p) {
  if (!p || typeof p !== 'string') return null;
  let s = p.trim().replace(/^"+|"+$/g, '');
  if (!s) return null;
  try { s = path.resolve(s); } catch (_) { /* caminho literal */ }
  if (process.platform === 'win32') return s.toLowerCase();
  return path.normalize(s);
}

/**
 * Le o start time (creation time) de um PID.
 * Windows: (Get-Process -Id N).StartTime em ticks.
 * POSIX: campo 22 de /proc/N/stat (starttime em ticks de boot).
 * @returns {string|null}
 */
function readProcessStartTime(pid) {
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue).StartTime.ToUniversalTime().Ticks`,
      ], { encoding: 'utf8', timeout: 3000, windowsHide: true });
      if (r.error || r.status !== 0) return null;
      const v = (r.stdout || '').trim();
      return v || null;
    }
    // POSIX: /proc/<pid>/stat — campo 22 (1-indexed) = starttime.
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    // O campo comm (2) pode conter ')' e espacos; o nome do comeco esta depois
    // do ultimo ')'. Os campos seguintes sao 3-indexed relative ao ')' .
    const afterComm = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    // afterComm[0] = state (campo 3). starttime = campo 22 -> indice 22-3 = 19.
    const starttime = afterComm[19];
    return starttime || null;
  } catch (_) {
    return null;
  }
}

/** Le o caminho do executavel de um PID. */
function readProcessExecutable(pid) {
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue).Path`,
      ], { encoding: 'utf8', timeout: 3000, windowsHide: true });
      if (r.error || r.status !== 0) return null;
      const v = (r.stdout || '').trim();
      return v || null;
    }
    const link = fs.readlinkSync(`/proc/${pid}/exe`);
    return link || null;
  } catch (_) {
    return null;
  }
}

/** Le a command line de um PID (best effort; pode falhar sem permissao). */
function readProcessCommandLine(pid) {
  try {
    if (process.platform === 'win32') {
      const r = spawnSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}" -ErrorAction SilentlyContinue).CommandLine`,
      ], { encoding: 'utf8', timeout: 3000, windowsHide: true });
      if (r.error || r.status !== 0) return null;
      return (r.stdout || '').trim() || null;
    }
    const raw = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    const parts = raw.split('\0').filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  } catch (_) {
    return null;
  }
}

/** Snapshot do estado de um PID no SO. */
function probeProcess(pid) {
  const startTime = readProcessStartTime(pid);
  const executable = readProcessExecutable(pid);
  const commandLine = readProcessCommandLine(pid);
  return {
    pid: Number(pid),
    alive: Boolean(startTime !== null || executable !== null),
    startTime,
    executable,
    commandLine,
  };
}

class OwnedProcessRegistry {
  constructor() {
    /** @type {Map<number, object>} pid -> record */
    this.processes = new Map();
    this._load();
  }

  /**
   * Registra um processo como propriedade estrita do OpenTranslator.
   * Captura o startTime do SO no momento do registro — e' a ancora de
   * identidade que sobrevive a reuso de PID.
   *
   * @param {object} childProcess  require('child_process').ChildProcess
   * @param {object} meta {command, executable|exePath, sessionId}
   */
  register(childProcess, meta = {}) {
    if (!childProcess || typeof childProcess.pid !== 'number' || childProcess.pid <= 0) {
      return { ok: false, reason: 'INVALID_CHILD_PROCESS' };
    }
    const pid = childProcess.pid;
    const executable = normalizeExe(meta.executable || meta.exePath || '');

    if (!executable) {
      // V3: sem executable nao ha como provar ownership depois. Recusar.
      return {
        ok: false,
        reason: 'EXECUTABLE_REQUIRED',
        detail: 'register() exige meta.executable para que a verificacao de posse seja possivel.',
      };
    }

    // Ancora de identidade: startTime do SO. Se nao for lido (processo ja
    // morreu, ou SO sem suporte), o registro ainda e' criado mas marcado
    // como NAO-VERIFICAVEL — e verifyPidIntegrity vai recusar matar.
    const startTime = readProcessStartTime(pid);

    const record = {
      pid,
      command: meta.command || '',
      executable,
      sessionId: meta.sessionId || null,
      parentPid: process.pid,
      createdAt: new Date().toISOString(),
      startTime,
      startTimeReadable: startTime !== null,
      childProcess,
    };

    this.processes.set(pid, record);
    this._save();

    const onExit = () => {
      const rec = this.processes.get(pid);
      if (rec) {
        rec.exited = true;
        rec.endedAt = new Date().toISOString();
        this.processes.delete(pid);
        this._save();
      }
    };
    childProcess.once('exit', onExit);
    if (typeof childProcess.once === 'function') {
      childProcess.once('error', onExit);
    }

    return { ok: true, pid, startTimeReadable: record.startTimeReadable };
  }

  /** true somente se o PID estiver no registro. */
  isOwned(pid) {
    if (!pid || typeof pid !== 'number') return false;
    return this.processes.has(pid);
  }

  get(pid) {
    return this.processes.get(pid) || null;
  }

  /** Remove do registro SEM matar. Usar apenas em shutdown confirmado. */
  unregister(pid) {
    const ok = this.processes.delete(pid);
    this._save();
    return ok;
  }

  /**
   * Verificacao FAIL-CLOSED de posse.
   *
   * @returns {{safe:boolean, reason?:string, record?:object, probe?:object}}
   */
  verifyPidIntegrity(pid) {
    const record = this.processes.get(pid);
    if (!record) return { safe: false, reason: 'PROCESS_NOT_OWNED' };

    // V1/V3: sem executable, sem startTime, ou SO sem leitura => nao e' seguro.
    if (!record.executable) {
      return { safe: false, reason: 'NO_EXECUTABLE_RECORDED', record };
    }
    if (!record.startTimeReadable) {
      return { safe: false, reason: 'NO_START_TIME_ANCHOR', record };
    }

    const probe = probeProcess(pid);

    // Processo ja encerrou: nao ha o que matar, e nao e' falha.
    if (!probe.alive) {
      return { safe: false, reason: 'PROCESS_ALREADY_EXITED', record, probe };
    }

    // Comparacao de executavel: caminho COMPLETO normalizado, sem excecao para node.
    const expected = normalizeExe(record.executable);
    const actual = normalizeExe(probe.executable);
    if (expected && actual && expected !== actual) {
      return {
        safe: false,
        reason: 'PID_REUSE_DETECTED_EXECUTABLE',
        detail: `PID ${pid} agora pertence a '${probe.executable}', esperado '${record.executable}'`,
        record,
        probe,
      };
    }
    if (!actual) {
      // Nao conseguimos ler o executavel (permissao). Fail-closed.
      return { safe: false, reason: 'EXECUTABLE_UNREADABLE', record, probe };
    }

    // StartTime: mesmo executavel + startTime diferente => PID reusado.
    if (record.startTime && probe.startTime && record.startTime !== probe.startTime) {
      return {
        safe: false,
        reason: 'PID_REUSE_DETECTED_START_TIME',
        detail: `PID ${pid}: startTime ${probe.startTime} != registrado ${record.startTime}`,
        record,
        probe,
      };
    }

    return { safe: true, record, probe };
  }

  /**
   * Encerra SOMENTE um processo de posse comprovada.
   * NUNCA por nome de imagem — apenas por PID validado.
   */
  stop(pid, reason = 'Normal Stop') {
    if (!this.isOwned(pid)) {
      return {
        success: false,
        blocked: true,
        reason: 'PROCESS_NOT_OWNED',
        error: `Processo PID ${pid} NAO pertence ao OpenTranslator`,
      };
    }

    const integrity = this.verifyPidIntegrity(pid);

    if (integrity.reason === 'PROCESS_ALREADY_EXITED') {
      this.processes.delete(pid);
      this._save();
      return { success: true, pid, alreadyExited: true, reason };
    }

    if (!integrity.safe) {
      // V6: manter o registro. O processo existe mas nao podemos provar posse;
      // descartar o registro o tornaria inalcancavel.
      return {
        success: false,
        blocked: true,
        reason: integrity.reason,
        detail: integrity.detail || null,
        error: `Encerramento bloqueado: ${integrity.reason}`,
      };
    }

    let killed = false;
    let killError = null;
    try {
      if (process.platform === 'win32') {
        const r = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
          stdio: 'ignore', timeout: 5000, windowsHide: true,
        });
        // V5: verificar o codigo de saida.
        if (r.error) {
          killError = r.error.message;
        } else if (r.status !== 0) {
          killError = `taskkill saiu com codigo ${r.status}`;
        } else {
          killed = true;
        }
      } else {
        process.kill(pid, 'SIGKILL');
        killed = true;
      }
    } catch (e) {
      killError = e.message;
    }

    // Confirmar que o processo morreu (evita sucesso falso).
    if (killed) {
      const still = readProcessStartTime(pid);
      if (still !== null) {
        killed = false;
        killError = killError || 'processo ainda existe apos taskkill';
      }
    }

    if (killed) {
      this.processes.delete(pid);
      this._save();
      return { success: true, pid, reason };
    }

    return {
      success: false,
      blocked: false,
      reason: 'KILL_FAILED',
      error: killError || 'falha desconhecida ao encerrar',
    };
  }

  /** Encerra todos os processos de uma sessao. */
  stopSession(sessionId, reason = 'Session Ended') {
    const stopped = [];
    const blocked = [];
    for (const [pid, rec] of Array.from(this.processes.entries())) {
      if (rec.sessionId === sessionId) {
        const res = this.stop(pid, reason);
        if (res.success) stopped.push(pid);
        else blocked.push({ pid, reason: res.reason || res.error });
      }
    }
    return {
      success: blocked.length === 0,
      stoppedPids: stopped,
      blocked,
      stoppedCount: stopped.length,
      blockedCount: blocked.length,
    };
  }

  /** Lista os processos registrados (sem expor o handle interno). */
  list() {
    return Array.from(this.processes.values()).map((r) => ({
      pid: r.pid,
      command: r.command,
      executable: r.executable,
      sessionId: r.sessionId,
      createdAt: r.createdAt,
      startTime: r.startTime,
      startTimeReadable: r.startTimeReadable,
    }));
  }

  /** Encerra todos os processos registrados. Idempotente. */
  shutdownAll(reason = 'Application Shutdown') {
    const pids = Array.from(this.processes.keys());
    let stopped = 0;
    let blocked = 0;
    const details = [];
    for (const pid of pids) {
      const res = this.stop(pid, reason);
      if (res.success) stopped += 1;
      else {
        blocked += 1;
        details.push({ pid, reason: res.reason || res.error });
      }
    }
    return { attempted: pids.length, stopped, blocked, details };
  }

  // ---- Persistencia (V8) ------------------------------------------------ //

  _save() {
    try {
      const data = Array.from(this.processes.values()).map((r) => ({
        pid: r.pid,
        command: r.command,
        executable: r.executable,
        sessionId: r.sessionId,
        parentPid: r.parentPid,
        createdAt: r.createdAt,
        startTime: r.startTime,
        startTimeReadable: r.startTimeReadable,
      }));
      const file = registryFile();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), processes: data }, null, 2));
    } catch (e) {
      if (typeof global.log === 'function') {
        try { global.log('warn', `[ownedProcessRegistry] falha ao persistir: ${e.message}`); } catch (_) {}
      }
    }
  }

  _load() {
    try {
      const file = registryFile();
      if (!fs.existsSync(file)) return;
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      const list = parsed && Array.isArray(parsed.processes) ? parsed.processes : [];
      for (const r of list) {
        if (typeof r.pid !== 'number') continue;
        // Re-hidratar: o handle childProcess nao sobrevive a um restart, mas
        // o registro ainda permite MATAR um processo orfao com posse verificavel.
        this.processes.set(r.pid, {
          ...r,
          childProcess: null,
          rehydrated: true,
        });
      }
      if (list.length) {
        if (typeof global.log === 'function') {
          try { global.log('info', `[ownedProcessRegistry] ${list.length} processo(s) orfao(s) reidratado(s) do registro.`); } catch (_) {}
        }
      }
    } catch (e) {
      if (typeof global.log === 'function') {
        try { global.log('warn', `[ownedProcessRegistry] registro ilegivel: ${e.message}`); } catch (_) {}
      }
    }
  }

  /** Limpa o registro persistido (usado quando a lista esta vazia). */
  _clearPersisted() {
    try {
      const file = registryFile();
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_) { /* best effort */ }
  }
}

const ownedRegistryInstance = new OwnedProcessRegistry();

/** Exporta a classe para testes (permite instâncias isoladas). */
module.exports = ownedRegistryInstance;
module.exports.OwnedProcessRegistry = OwnedProcessRegistry;
module.exports.__probeProcess = probeProcess;
module.exports.__normalizeExe = normalizeExe;
module.exports.__registryFile = registryFile;
