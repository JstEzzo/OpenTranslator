/**
 * OpenTranslator - RuntimeLogCollector
 * 
 * Coletor central e estruturado de telemetria e logs de sessões de runtime.
 * Normaliza e classifica automaticamente saídas de stdout/stderr, eventos de hook
 * e mensagens do tradutor.
 */

const fs = require('fs');
const path = require('path');

class RuntimeLogCollector {
  constructor(options = {}) {
    this.logs = [];
    this.maxLogs = options.maxLogs || 5000;
    this.logDir = options.logDir || path.resolve(__dirname, '../../data/logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Registra uma entrada normalizada de log
   */
  log(level, source, message, meta = {}) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      level: (level || 'INFO').toUpperCase(),
      source: (source || 'SYSTEM').toUpperCase(),
      sessionId: meta.sessionId || null,
      pid: meta.pid || null,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      category: this._classifyCategory(message, level, source),
      errorAnalysis: this._analyzeError(message, level)
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  /**
   * Conecta um child process para capturar stdout e stderr continuamente
   */
  attachProcess(childProc, meta = {}) {
    if (!childProc) return;
    const pid = childProc.pid;
    const sessionId = meta.sessionId;

    if (childProc.stdout) {
      childProc.stdout.on('data', (data) => {
        const text = data.toString('utf8');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        for (const line of lines) {
          this.log('INFO', 'STDOUT', line, { pid, sessionId });
        }
      });
    }

    if (childProc.stderr) {
      childProc.stderr.on('data', (data) => {
        const text = data.toString('utf8');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        for (const line of lines) {
          this.log('ERROR', 'STDERR', line, { pid, sessionId });
        }
      });
    }
  }

  /**
   * Classifica automaticamente a categoria da mensagem
   */
  _classifyCategory(msg, level, source) {
    const m = String(msg).toLowerCase();
    if (m.includes('hook') || m.includes('websocket') || source === 'HOOK') return 'HOOK';
    if (m.includes('translat') || m.includes('traduz') || source === 'TRANSLATOR') return 'TRANSLATION';
    if (m.includes('security') || m.includes('traversal') || m.includes('blocked')) return 'SECURITY';
    if (m.includes('crash') || m.includes('exception') || m.includes('fatal') || level === 'ERROR') return 'RUNTIME_ERROR';
    if (m.includes('loaded') || m.includes('module') || m.includes('dll')) return 'MODULE';
    return 'GENERAL';
  }

  /**
   * Diagnostica causa provável de erros recorrentes
   */
  _analyzeError(msg, level) {
    if (level !== 'ERROR' && level !== 'FATAL') return null;
    const m = String(msg).toLowerCase();

    if (m.includes('enoent') || m.includes('not found') || m.includes('arquivo não encontrado')) {
      return { cause: 'MISSING_RESOURCE', severity: 'HIGH', recommendation: 'Verifique caminhos e integridade dos assets no staging' };
    }
    if (m.includes('dll') || m.includes('entry point') || m.includes('bad image')) {
      return { cause: 'ARCHITECTURE_OR_DEPENDENCY_MISMATCH', severity: 'CRITICAL', recommendation: 'Incompatibilidade de arquitetura (x86 vs x64) ou dependência de runtime ausente' };
    }
    if (m.includes('access denied') || m.includes('eperm')) {
      return { cause: 'PERMISSION_DENIED', severity: 'HIGH', recommendation: 'Execução bloqueada por permissão do SO ou antivírus' };
    }
    if (m.includes('syntaxerror') || m.includes('unexpected token')) {
      return { cause: 'SCRIPT_SYNTAX_CORRUPTION', severity: 'CRITICAL', recommendation: 'Patch ou injeção corrompeu sintaxe do arquivo de código' };
    }
    return { cause: 'UNKNOWN_RUNTIME_EXCEPTION', severity: 'MEDIUM', recommendation: 'Inspecione a pilha de execução completa' };
  }

  /**
   * Recupera logs com filtros
   */
  query(filter = {}) {
    return this.logs.filter(entry => {
      if (filter.sessionId && entry.sessionId !== filter.sessionId) return false;
      if (filter.level && entry.level !== filter.level.toUpperCase()) return false;
      if (filter.source && entry.source !== filter.source.toUpperCase()) return false;
      if (filter.category && entry.category !== filter.category) return false;
      return true;
    });
  }

  /**
   * Exporta os logs da sessão para arquivo
   */
  exportSessionLogs(sessionId) {
    const sessionLogs = this.query({ sessionId });
    const targetFile = path.join(this.logDir, `session_${sessionId}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(sessionLogs, null, 2), 'utf8');
    return targetFile;
  }
}

const defaultLogCollector = new RuntimeLogCollector();
module.exports = defaultLogCollector;
module.exports.RuntimeLogCollector = RuntimeLogCollector;
