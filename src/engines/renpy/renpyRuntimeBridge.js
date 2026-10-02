/**
 * OpenTranslator - RenpyRuntimeBridge
 * 
 * Ponte de runtime para jogos Ren'Py.
 * Opera exclusivamente na cópia isolada de staging:
 * - Detecta executável Ren'Py (.exe)
 * - Prepara diretório de tradução nativa game/tl/<lang>/
 * - Inicia sessão controlada com RuntimeSessionManager
 * - Monitora logs do Ren'Py (log.txt) e captura eventos de texto
 * - Encerra de forma estritamente segura apenas o processo pertencente
 */

const fs = require('fs');
const path = require('path');
const RuntimeSession = require('../../core/runtimeSessionManager');
const RuntimeProbe = require('../../core/runtimeProbe');
const logCollector = require('../../core/runtimeLogCollector');

class RenpyRuntimeBridge {
  constructor(options = {}) {
    this.targetLanguage = options.targetLanguage || 'portuguese';
    this.session = null;
  }

  /**
   * Detecta o executável do Ren'Py na pasta de staging
   */
  detectExecutable(stagingDir) {
    if (!fs.existsSync(stagingDir)) return null;

    const entries = fs.readdirSync(stagingDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.exe')) {
        // Exclui instaladores e unins
        if (!ent.name.toLowerCase().includes('unins') && !ent.name.toLowerCase().includes('setup')) {
          return path.join(stagingDir, ent.name);
        }
      }
    }
    return null;
  }

  /**
   * Prepara o diretório e arquivos de tradução nativa do Ren'Py
   */
  prepareTranslation(stagingDir, translationEntries = []) {
    const tlDir = path.join(stagingDir, 'game', 'tl', this.targetLanguage);
    if (!fs.existsSync(tlDir)) {
      fs.mkdirSync(tlDir, { recursive: true });
    }

    // Gera arquivo de strings de tradução nativas (.rpy)
    const rpyLines = [
      `# OpenTranslator Ren'Py Translation Package`,
      `# Target Language: ${this.targetLanguage}`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
      `init python:`,
      `    config.language = "${this.targetLanguage}"`,
      ``,
      `translate ${this.targetLanguage} strings:`,
      ``
    ];

    for (const ent of translationEntries) {
      if (ent.original && ent.translation) {
        rpyLines.push(`    old "${ent.original}"`);
        rpyLines.push(`    new "${ent.translation}"`);
        rpyLines.push(``);
      }
    }

    const targetRpy = path.join(tlDir, 'opentranslator_tl.rpy');
    fs.writeFileSync(targetRpy, rpyLines.join('\n'), 'utf8');

    return { success: true, targetRpy, entriesCount: translationEntries.length };
  }

  /**
   * Inicia o jogo Ren'Py na cópia de staging
   */
  async launch(stagingDir, options = {}) {
    const exePath = this.detectExecutable(stagingDir);
    if (!exePath) {
      return { success: false, error: 'Executável Ren\'Py não encontrado no staging' };
    }

    this.session = new RuntimeSession({
      gameId: path.basename(stagingDir),
      stagingDir,
      executablePath: exePath,
      engine: 'renpy',
      runtime: 'python',
      strategy: 'NATIVE_TRANSLATION',
      environment: {
        RENPY_LANGUAGE: this.targetLanguage
      }
    });

    this.session.prepare();
    const launchRes = this.session.launch();

    logCollector.log('INFO', 'HOOK', `Ren'Py Runtime Bridge ativo (PID ${launchRes.pid})`, {
      sessionId: this.session.sessionId,
      pid: launchRes.pid
    });

    return {
      success: true,
      sessionId: this.session.sessionId,
      pid: launchRes.pid,
      executable: exePath
    };
  }

  /**
   * Observa a atividade do runtime e lê logs
   */
  observe() {
    if (!this.session || !this.session.pid) return { active: false };

    const probe = RuntimeProbe.probeProcess(this.session.pid);
    const logFile = path.join(this.session.stagingDir, 'log.txt');
    let logTail = [];

    if (fs.existsSync(logFile)) {
      try {
        const text = fs.readFileSync(logFile, 'utf8');
        logTail = text.split(/\r?\n/).slice(-10);
      } catch (e) {}
    }

    return {
      active: probe.alive,
      pid: this.session.pid,
      windowTitle: probe.windowTitle,
      windowHandle: probe.windowHandle,
      probe,
      logTail
    };
  }

  /**
   * Encerra com segurança a sessão
   */
  async stop() {
    if (this.session) {
      const res = await this.session.stop('RenpyRuntimeBridge Finish');
      return res;
    }
    return { success: true };
  }
}

module.exports = RenpyRuntimeBridge;
