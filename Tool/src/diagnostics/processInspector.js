/**
 * OpenTranslator — ProcessInspector
 * Inspeciona processos em execução no Windows: módulos carregados, linha de comando,
 * título de janela e portas locais ativas, sem interferir no processo inspecionado.
 */

const { spawnSync } = require("child_process");

class ProcessInspector {
  static inspectProcess(pid) { return this.inspectPid(pid); }
  static inspectPid(pid) {
    if (!pid || isNaN(pid)) return { ok: false, error: "PID inválido" };

    try {
      const psScript = `
        $p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
        if (!$p) { Write-Output "NOT_FOUND"; exit }
        $mods = $p.Modules | Select-Object -ExpandProperty ModuleName
        $info = @{
          Id = $p.Id
          ProcessName = $p.ProcessName
          Path = $p.Path
          MainWindowTitle = $p.MainWindowTitle
          MainWindowHandle = $p.MainWindowHandle.ToInt64()
          Modules = $mods
        }
        $info | ConvertTo-Json -Compress
      `;

      const res = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
        encoding: "utf8",
        maxBuffer: 5 * 1024 * 1024
      });

      const stdout = (res.stdout || "").trim();
      if (stdout === "NOT_FOUND" || !stdout) {
        return { ok: false, error: "Processo não encontrado ou encerrado." };
      }

      const data = JSON.parse(stdout);
      const modules = Array.isArray(data.Modules) ? data.Modules : [data.Modules];

      // Detecta assinaturas nos módulos carregados
      const runtimeMarkers = [];
      if (modules.some(m => /mono|unity/i.test(m))) runtimeMarkers.push("Unity/Mono");
      if (modules.some(m => /bepinex|doorstop/i.test(m))) runtimeMarkers.push("BepInEx");
      if (modules.some(m => /python/i.test(m))) runtimeMarkers.push("Python/Ren'Py");
      if (modules.some(m => /electron|node|ffmpeg/i.test(m))) runtimeMarkers.push("Electron/Node");
      if (modules.some(m => /rgss/i.test(m))) runtimeMarkers.push("RGSS");

      return {
        ok: true,
        pid: data.Id,
        name: data.ProcessName,
        executablePath: data.Path,
        windowTitle: data.MainWindowTitle,
        hasVisibleWindow: data.MainWindowHandle > 0,
        moduleCount: modules.length,
        runtimeMarkers,
        loadedModules: modules,
        modulesSample: modules.slice(0, 15),
        architecture: (process.arch === "x64" || process.env.PROCESSOR_ARCHITECTURE === "AMD64") ? "x64" : "x86"
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = ProcessInspector;
