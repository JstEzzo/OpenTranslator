/**
 * OpenTranslator - ElectronRuntimeBridge
 * 
 * Ponte de runtime para aplicações e jogos Electron / HTML5.
 * Observa texto em runtime através do DOM / innerText no staging.
 */

const fs = require('fs');
const path = require('path');
const RuntimeSession = require('../../core/runtimeSessionManager');
const RuntimeProbe = require('../../core/runtimeProbe');
const logCollector = require('../../core/runtimeLogCollector');

class ElectronRuntimeBridge {
  constructor(options = {}) {
    this.session = null;
    this.hookPort = options.hookPort || 16005;
  }

  detectExecutable(stagingDir) {
    if (!fs.existsSync(stagingDir)) return null;
    const entries = fs.readdirSync(stagingDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.exe')) {
        if (!ent.name.toLowerCase().includes('unins') && !ent.name.toLowerCase().includes('setup')) {
          return path.join(stagingDir, ent.name);
        }
      }
    }
    return null;
  }

  /**
   * Prepara injeção de MutationObserver para observar nós de texto no DOM
   */
  prepareDomObserver(stagingDir) {
    const htmlFiles = ['index.html', 'app.html', 'main.html'];
    let targetHtml = null;

    for (const h of htmlFiles) {
      const full = path.join(stagingDir, h);
      if (fs.existsSync(full)) {
        targetHtml = full;
        break;
      }
    }

    if (!targetHtml) return { success: false, error: 'HTML principal não encontrado' };

    let content = fs.readFileSync(targetHtml, 'utf8');
    if (content.includes('OT_DOM_OBSERVER_LOADED')) {
      return { success: true, alreadyInjected: true };
    }

    const observerScript = `
    <!-- OpenTranslator DOM Observer Bridge -->
    <script>
      window.OT_DOM_OBSERVER_LOADED = true;
      (function() {
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(m) {
            if (m.type === 'characterData' || m.type === 'childList') {
              // Notifica observação de nó DOM
            }
          });
        });
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
      })();
    </script>
    `;

    content = content.replace('</body>', `${observerScript}\n</body>`);
    fs.writeFileSync(targetHtml, content, 'utf8');

    return { success: true, injectedFile: targetHtml };
  }

  async launch(stagingDir) {
    const exePath = this.detectExecutable(stagingDir);
    if (!exePath) return { success: false, error: 'Executável Electron não encontrado' };

    this.prepareDomObserver(stagingDir);

    this.session = new RuntimeSession({
      gameId: path.basename(stagingDir),
      stagingDir,
      executablePath: exePath,
      engine: 'electron',
      runtime: 'electron_dom',
      strategy: 'DOM_RUNTIME'
    });

    this.session.prepare();
    const launchRes = this.session.launch();

    logCollector.log('INFO', 'HOOK', `Electron DOM Runtime Bridge iniciado (PID ${launchRes.pid})`, {
      sessionId: this.session.sessionId,
      pid: launchRes.pid
    });

    return { success: true, pid: launchRes.pid, sessionId: this.session.sessionId };
  }

  observe() {
    if (!this.session || !this.session.pid) return { active: false };
    const probe = RuntimeProbe.probeProcess(this.session.pid);
    return {
      active: probe.alive,
      pid: this.session.pid,
      windowTitle: probe.windowTitle,
      windowHandle: probe.windowHandle,
      probe
    };
  }

  async stop() {
    if (this.session) return this.session.stop('ElectronRuntimeBridge Finish');
    return { success: true };
  }
}

module.exports = ElectronRuntimeBridge;
