/**
 * OpenTranslator — BaseEngineAdapter
 * Interface base para todos os adaptadores de motores de jogo.
 */

class BaseEngineAdapter {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  /**
   * Avalia a pasta do jogo e retorna evidências e nível de confiança (0.0 a 1.0).
   * @param {string} gameDir
   * @param {string} exePath
   * @param {Array<string>} filesList
   * @returns {{ matches: boolean, confidence: number, version: string, evidence: Array<string>, warnings: Array<string> }}
   */
  async detect(gameDir, exePath, filesList = []) {
    return {
      matches: false,
      confidence: 0,
      version: "unknown",
      evidence: [],
      warnings: []
    };
  }

  /**
   * Retorna o mapa de capacidades técnicas desta engine no jogo específico.
   * @param {string} gameDir
   * @param {string} exePath
   * @returns {object}
   */
  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: false,
      nativeLocalization: false,
      archives: false,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true
    };
  }

  /**
   * Extrai textos traduzíveis do jogo.
   * @param {string} gameDir
   * @param {object} options
   * @returns {Promise<{ success: boolean, texts: Array<object>, count: number, error?: string }>}
   */
  async extract(gameDir, options = {}) {
    throw new Error(`Método extract() não implementado no adapter ${this.id}`);
  }

  /**
   * Valida integridade antes de aplicar a tradução.
   * @param {string} gameDir
   * @param {Array<object>} texts
   * @param {Map<string, string>} translations
   * @returns {Promise<{ valid: boolean, errors: Array<string>, warnings: Array<string> }>}
   */
  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Aplica a tradução nos arquivos do jogo ou na estrutura nativa.
   * @param {string} gameDir
   * @param {Array<object>} texts
   * @param {Map<string, string>} translations
   * @param {object} options
   * @returns {Promise<{ success: boolean, modifiedFiles: Array<string>, count: number, error?: string }>}
   */
  async apply(gameDir, texts, translations, options = {}) {
    throw new Error(`Método apply() não implementado no adapter ${this.id}`);
  }

  /**
   * Restaura o estado original do jogo desfazendo qualquer modificação.
   * @param {string} gameDir
   * @param {object} options
   * @returns {Promise<{ success: boolean, restoredFiles: Array<string>, error?: string }>}
   */
  async rollback(gameDir, options = {}) {
    throw new Error(`Método rollback() não implementado no adapter ${this.id}`);
  }

  /**
   * Gera relatório de diagnóstico estruturado.
   * @param {string} gameDir
   * @param {string} exePath
   * @returns {Promise<object>}
   */
  async getDiagnostics(gameDir, exePath) {
    const detection = await this.detect(gameDir, exePath);
    const caps = this.getCapabilities(gameDir, exePath);
    return {
      engine: this.id,
      name: this.name,
      version: detection.version,
      confidence: detection.confidence,
      evidence: detection.evidence,
      warnings: detection.warnings,
      capabilities: caps,
      recommendedStrategy: caps.nativeLocalization ? "native" : caps.staticFiles ? "static" : caps.runtimeHook ? "hook" : "ocr"
    };
  }
}

module.exports = BaseEngineAdapter;
