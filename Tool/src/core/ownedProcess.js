/**
 * OpenTranslator — OwnedProcess
 * Gerencia estritamente processos filhos iniciados pelo próprio OpenTranslator.
 * Garante que nenhuma operação de encerramento afete processos externos ou jogos pré-existentes do usuário.
 */

const { spawnSync } = require("child_process");

class OwnedProcess {
  constructor() {
    this.activeProcesses = new Map(); // pid -> { pid, exePath, gameKey, startTime, childProcess }
  }

  /**
   * Registra um processo como pertencente ao OpenTranslator.
   */
  register(childProcess, meta = {}) {
    if (!childProcess || !childProcess.pid) return;
    const pid = childProcess.pid;
    this.activeProcesses.set(pid, {
      pid,
      exePath: meta.exePath || "",
      gameKey: meta.gameKey || "",
      startTime: new Date().toISOString(),
      childProcess
    });

    childProcess.on("exit", () => {
      this.activeProcesses.delete(pid);
    });
  }

  /**
   * Encerra de forma segura SOMENTE um processo que pertença ao OpenTranslator.
   */
  terminateOwned(pid, reason = "User Request") {
    if (!this.activeProcesses.has(pid)) {
      if (global.log) global.log("warn", `[OwnedProcess] Tentativa de encerrar PID ${pid} rejeitada: processo não pertence ao OpenTranslator.`);
      return false;
    }

    const record = this.activeProcesses.get(pid);
    if (global.log) global.log("info", `[OwnedProcess] Encerrando processo pertencente (PID ${pid}, Motivo: ${reason})...`);

    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        process.kill(pid, "SIGKILL");
      }
      this.activeProcesses.delete(pid);
      return true;
    } catch (e) {
      if (global.log) global.log("error", `[OwnedProcess] Falha ao encerrar PID ${pid}: ${e.message}`);
      return false;
    }
  }

  /**
   * Retorna os processos pertencentes atualmente ativos.
   */
  getOwnedList() {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Limpa processos pertencentes ao desligar a aplicação.
   */
  shutdownOwnedAll() {
    for (const [pid] of this.activeProcesses) {
      this.terminateOwned(pid, "Application Shutdown");
    }
  }
}

const ownedProcessManager = new OwnedProcess();
module.exports = ownedProcessManager;
