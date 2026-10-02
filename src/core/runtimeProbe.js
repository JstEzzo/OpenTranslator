/**
 * OpenTranslator - RuntimeProbe
 * 
 * Sondador de processos em execução.
 * Observa: processo, PID, módulos carregados, janela, arquitetura, runtime e canais de texto.
 * Classifica a certeza em: DETECTED, LIKELY ou CONFIRMED.
 * 
 * REGRA ABSOLUTA: PROCESS_OBSERVED ou MODULE_OBSERVED NÃO É RUNTIME_VERIFIED!
 */

const { spawnSync } = require('child_process');
const path = require('path');

class RuntimeProbe {
  /**
   * Realiza uma sondagem aprofundada de um processo pelo PID
   */
  static probeProcess(pid) {
    if (!pid || typeof pid !== 'number') {
      return { alive: false, error: 'PID inválido' };
    }

    const result = {
      pid,
      alive: false,
      processName: null,
      executablePath: null,
      windowTitle: null,
      windowHandle: null,
      loadedModules: [],
      architecture: null,
      runtimeObservation: {
        type: 'PROCESS_OBSERVED',
        engineHypothesis: 'unknown',
        runtimeHypothesis: 'unknown',
        confidence: 'DETECTED', // DETECTED, LIKELY, CONFIRMED
        clues: []
      },
      textChannels: []
    };

    if (process.platform === 'win32') {
      try {
        const psScript = `
          $p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
          if ($p) {
            $mods = @()
            try { $mods = $p.Modules | Select-Object -ExpandProperty ModuleName -ErrorAction SilentlyContinue } catch {}
            @{
              Alive = $true
              Name = $p.ProcessName
              Path = $p.Path
              Title = $p.MainWindowTitle
              Handle = [int64]$p.MainWindowHandle
              Modules = $mods
            } | ConvertTo-Json -Compress
          } else {
            @{ Alive = $false } | ConvertTo-Json -Compress
          }
        `;

        const res = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
          encoding: 'utf8',
          timeout: 5000
        });

        if (res.stdout && res.stdout.trim().startsWith('{')) {
          const parsed = JSON.parse(res.stdout.trim());
          if (parsed.Alive) {
            result.alive = true;
            result.processName = parsed.Name;
            result.executablePath = parsed.Path;
            result.windowTitle = parsed.Title || null;
            result.windowHandle = parsed.Handle || null;
            result.loadedModules = Array.isArray(parsed.Modules) ? parsed.Modules : (parsed.Modules ? [parsed.Modules] : []);
          }
        }
      } catch (e) {
        result.error = e.message;
      }
    } else {
      // Fallback POSIX básico
      try {
        process.kill(pid, 0);
        result.alive = true;
      } catch (e) {
        result.alive = false;
      }
    }

    // Análise heurística das DLLs e módulos carregados
    this._analyzeLoadedModules(result);
    return result;
  }

  /**
   * Analisa assinaturas em módulos carregados
   */
  static _analyzeLoadedModules(probeResult) {
    if (!probeResult.alive || probeResult.loadedModules.length === 0) return;

    const mods = probeResult.loadedModules.map(m => String(m).toLowerCase());
    const obs = probeResult.runtimeObservation;

    // 1. Unity
    const hasUnityPlayer = mods.some(m => m.includes('unityplayer'));
    const hasGameAssembly = mods.some(m => m.includes('gameassembly'));
    const hasMono = mods.some(m => m.includes('mono'));

    if (hasUnityPlayer || hasGameAssembly || hasMono) {
      obs.engineHypothesis = 'unity';
      obs.clues.push(hasUnityPlayer ? 'UnityPlayer.dll carregado' : 'Mono/Assembly detectado');

      if (hasGameAssembly) {
        obs.runtimeHypothesis = 'IL2CPP';
        obs.confidence = 'LIKELY';
        obs.clues.push('GameAssembly.dll presente (IL2CPP)');
      } else if (hasMono) {
        obs.runtimeHypothesis = 'Mono';
        obs.confidence = 'LIKELY';
        obs.clues.push('Mono runtime detectado');
        probeResult.textChannels.push('MONO_BRIDGE');
      }
      return;
    }

    // 2. NW.js / Electron / HTML5
    const hasNw = mods.some(m => m.includes('nw.dll') || m.includes('node.dll'));
    const hasElectron = mods.some(m => m.includes('electron'));
    if (hasNw || hasElectron) {
      obs.engineHypothesis = 'rpgmaker_or_electron';
      obs.runtimeHypothesis = hasNw ? 'NW.js' : 'Electron';
      obs.confidence = 'LIKELY';
      obs.clues.push(hasNw ? 'nw.dll / node.dll carregados' : 'Electron framework carregado');
      probeResult.textChannels.push('DOM_INSPECTOR', 'WEBSOCKET_HOOK');
      return;
    }

    // 3. Ren'Py / Python
    const hasPython = mods.some(m => m.includes('python') || m.includes('renpy'));
    if (hasPython) {
      obs.engineHypothesis = 'renpy';
      obs.runtimeHypothesis = 'Python';
      obs.confidence = 'LIKELY';
      obs.clues.push('Python runtime / renpy.dll carregado');
      probeResult.textChannels.push('RENPY_LOG_STREAM', 'RENPY_TL_HOOK');
      return;
    }

    // 4. RPG Maker RGSS (Ruby)
    const hasRgss = mods.some(m => m.includes('rgss'));
    if (hasRgss) {
      obs.engineHypothesis = 'rpgmaker_ruby';
      obs.runtimeHypothesis = 'RGSS';
      obs.confidence = 'LIKELY';
      obs.clues.push('RGSS player DLL carregada');
      probeResult.textChannels.push('RUBY_BRIDGE');
      return;
    }

    // 5. Godot
    const hasGodot = mods.some(m => m.includes('godot'));
    if (hasGodot) {
      obs.engineHypothesis = 'godot';
      obs.runtimeHypothesis = 'GDScript/Native';
      obs.confidence = 'LIKELY';
      obs.clues.push('Godot core DLL detectada');
      return;
    }
  }
}

module.exports = RuntimeProbe;
