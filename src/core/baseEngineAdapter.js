/**
 * OpenTranslator — BaseEngineAdapter / EngineAdapter
 * Contrato universal e interface base para todos os adaptadores de motores de jogo.
 * Suporta o ciclo completo:
 * detect -> inspect -> extractTexts -> extractResources -> prepareTranslation ->
 * translate -> restorePlaceholders -> applyTranslations -> validate -> package -> launch -> rollback
 */

class BaseEngineAdapter {
  constructor(id, name, options = {}) {
    this.id = id;
    this.name = name;
    this.options = options;
  }

  /**
   * Avalia a pasta do jogo e retorna evidências e nível de confiança (0.0 a 1.0).
   * @param {string} gameDir
   * @param {string} exePath
   * @param {Array<string>} filesList
   * @returns {Promise<{ matches: boolean, confidence: number, version: string, evidence: Array<string>, warnings: Array<string> }>}
   */
  async detect(gameDir, exePath, filesList = []) {
    try {
      const EngineDetector = require('./engineDetector');
      const result = await EngineDetector.detect(gameDir);
      const matches = result.engine === this.id ||
        (this.id === "rpgmaker" && (result.engine === "mv" || result.engine === "mz" || result.engine === "rgss")) ||
        (this.id === "mv" && result.engine === "mv") ||
        (this.id === "mz" && result.engine === "mz") ||
        (this.id === "rgss" && result.engine === "rgss") ||
        (this.id === "renpy" && result.engine === "renpy") ||
        (this.id === "cocos_creator" && (result.engine === "cocos_creator" || result.engine === "cocos")) ||
        (this.id === "cocos2dx" && result.engine === "cocos2dx") ||
        (this.id === "wolf" && result.engine === "wolf") ||
        (this.id === "unreal" && result.engine === "unreal") ||
        (this.id === "unity" && result.engine === "unity") ||
        (this.id === "godot" && result.engine === "godot") ||
        (this.id === "gamemaker" && result.engine === "gamemaker") ||
        (this.id === "construct" && result.engine === "construct") ||
        (this.id === "defold" && result.engine === "defold") ||
        (this.id === "gdevelop" && result.engine === "gdevelop") ||
        (this.id === "electron" && result.engine === "electron") ||
        (this.id === "generic");

      return {
        matches,
        confidence: matches ? result.confidence : 0,
        version: matches ? (result.engineVersion || "unknown") : "unknown",
        evidence: matches ? (result.evidence || []) : [],
        warnings: matches ? (result.warnings || []) : []
      };
    } catch (e) {
      return {
        matches: false,
        confidence: 0,
        version: "unknown",
        evidence: [],
        warnings: [e.message]
      };
    }
  }

  /**
   * Inspeciona detalhadamente a estrutura do jogo para identificar componentes e estratégias.
   * @param {string} gameDir
   * @returns {Promise<object>}
   */
  async inspect(gameDir) {
    return {
      engine: this.id,
      gameDir,
      inspectedAt: new Date().toISOString(),
      capabilities: this.getCapabilities(gameDir),
      declaration: this.getDetailedDeclaration()
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
   * Declaração formal e estrita de capacidades para a EngineCapabilityMatrix.
   * @returns {object}
   */
  getDetailedDeclaration() {
    return {
      engine: this.id,
      name: this.name,
      versions: [],
      staticTranslation: false,
      runtimeTranslation: false,
      packagedResources: false,
      fonts: false,
      images: false,
      audio: false,
      binaryFormats: false,
      placeholders: false,
      pluralization: false
    };
  }

  /**
   * Extrai textos traduzíveis do jogo (Interface unificada).
   * @param {string} gameDir
   * @param {object} options
   * @returns {Promise<{ success: boolean, texts: Array<object>, count: number, error?: string }>}
   */
  async extractTexts(gameDir, options = {}) {
    return this.extract(gameDir, options);
  }

  /**
   * Legado / Retrocompatibilidade de extração.
   */
  async extract(gameDir, options = {}) {
    throw new Error(`Método extract() não implementado no adapter ${this.id}`);
  }

  /**
   * Extrai recursos multimídia (imagens, texturas, áudio) empacotados ou avulsos.
   * @param {string} gameDir
   * @param {object} options
   * @returns {Promise<{ success: boolean, resources: Array<object>, count: number, error?: string }>}
   */
  async extractResources(gameDir, options = {}) {
    return {
      success: true,
      resources: [],
      count: 0,
      message: `Extração de recursos específicos delegada ao extrator universal para ${this.id}.`
    };
  }

  /**
   * Prepara os textos e recursos para a etapa de tradução (tokenização, normalização).
   * @param {string} gameDir
   * @param {Array<object>} texts
   * @param {object} options
   * @returns {Promise<{ texts: Array<object>, protectedCount: number }>}
   */
  async prepareTranslation(gameDir, texts = [], options = {}) {
    if (this.codeProtector) {
      let protectedCount = 0;
      const prepared = texts.map((t) => {
        if (!t.clean) return t;
        const { protectedText, tokens } = this.codeProtector.protect(t.clean, this.id);
        if (tokens && tokens.length > 0) protectedCount += tokens.length;
        return {
          ...t,
          clean: protectedText,
          tokens: tokens || []
        };
      });
      return { texts: prepared, protectedCount };
    }
    return { texts, protectedCount: 0 };
  }

  /**
   * Traduz textos diretamente pelo adapter se a engine possuir mecanismo proprietário.
   */
  async translate(texts, options = {}) {
    return { delegated: true };
  }

  /**
   * Restaura placeholders e tokens específicos da engine após a tradução.
   * @param {string} text
   * @param {Array<object>} tokens
   * @returns {{ restoredText: string, valid: boolean, missingTokens: Array<string> }}
   */
  restorePlaceholders(text, tokens = []) {
    if (this.codeProtector && typeof this.codeProtector.restore === 'function') {
      return this.codeProtector.restore(text, tokens);
    }
    return { restoredText: text, valid: true, missingTokens: [] };
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
   * Aplica as traduções (Interface unificada).
   */
  async applyTranslations(gameDir, texts, translations, options = {}) {
    return this.apply(gameDir, texts, translations, options);
  }

  /**
   * Legado / Retrocompatibilidade de aplicação.
   */
  async apply(gameDir, texts, translations, options = {}) {
    throw new Error(`Método apply() não implementado no adapter ${this.id}`);
  }

  /**
   * Empacota arquivos modificados de volta nos arquivos de pacote (.pck, .pak, .rpa, etc.)
   */
  async package(gameDir, options = {}) {
    return { success: true, packagedFiles: [] };
  }

  /**
   * Inicia o jogo ou configura o launcher para a engine.
   */
  async launch(gameDir, options = {}) {
    return { success: true, message: "Lançamento delegado ao GameLauncher." };
  }

  /**
   * Restaura o estado original do jogo desfazendo qualquer modificação.
   */
  async rollback(gameDir, options = {}) {
    throw new Error(`Método rollback() não implementado no adapter ${this.id}`);
  }

  /**
   * Gera relatório de diagnóstico estruturado.
   */
  async diagnose(gameDir, exePath) {
    return this.getDiagnostics(gameDir, exePath);
  }

  async getDiagnostics(gameDir, exePath) {
    const detection = await this.detect(gameDir, exePath);
    const caps = this.getCapabilities(gameDir, exePath);
    const declaration = this.getDetailedDeclaration();

    let readiness = "READY_FULL";
    const externalTools = [];

    if (this.id === "unity" && detection.version && detection.version.includes("IL2CPP")) {
      readiness = "READY_PARTIAL";
      externalTools.push({
        tool: "Il2CppDumper / Unity Hook",
        reason: "Compilação C++ nativa IL2CPP requer módulo OCR ou injeção em memória"
      });
    } else if (this.id === "wolf" && caps.archives && !caps.nativeLocalization) {
      readiness = "REQUIRES_EXTERNAL_TOOL";
      externalTools.push({
        tool: "UberWolfCli.exe",
        reason: "Pacote data.wolf criptografado requer descompactação via UberWolfCli para tradução estática direta"
      });
    } else if (this.id === "unreal" && caps.archives && !caps.staticFiles) {
      readiness = "REQUIRES_EXTERNAL_TOOL";
      externalTools.push({
        tool: "UnrealPak / AES Key",
        reason: "Arquivos .pak compilados requerem chave AES se não houver pasta Content/Localization descompactada"
      });
    } else if (this.id === "generic") {
      readiness = "READY_PARTIAL";
    }

    return {
      engine: this.id,
      name: this.name,
      matched: detection.matches,
      version: detection.version,
      confidence: detection.confidence,
      evidence: detection.evidence,
      warnings: detection.warnings,
      capabilities: caps,
      declaration,
      readiness,
      externalTools,
      recommendedStrategy: caps.nativeLocalization ? "native" : caps.staticFiles ? "static" : caps.runtimeHook ? "hook" : "ocr"
    };
  }
}

module.exports = BaseEngineAdapter;
module.exports.EngineAdapter = BaseEngineAdapter;
