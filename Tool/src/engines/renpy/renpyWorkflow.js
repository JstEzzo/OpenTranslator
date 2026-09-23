/**
 * OpenTranslator - RenpyWorkflow
 * 
 * Implementa o suporte avançado a Ren'Py em produção:
 * - Estrutura oficial game/tl/<language>/
 * - Geração de blocos translate <language> <label>: e translate <language> strings:
 * - Variáveis de ambiente: RENPY_LANGUAGE=<lang> para seleção forçada de idioma
 * - RENPY_UPDATE_STRINGS=1 para captura não-sancionada de strings observadas em runtime
 * - Watcher de arquivos de tradução incremental
 */

const fs = require('fs');
const path = require('path');
const { RenpyTranslationProvider, RenpyStringProvider, RenpyStyleProvider } = require('./renpyProductionProvider');

class RenpyWorkflow {
  constructor(gameDir, language = 'portuguese') {
    this.gameDir = gameDir;
    this.language = language;
    this.tlDir = path.join(gameDir, 'game', 'tl', language);
  }

  /**
   * Configura o ambiente de execução com suporte a tradução Ren'Py
   */
  getLaunchEnvironment() {
    return {
      RENPY_LANGUAGE: this.language,
      RENPY_UPDATE_STRINGS: '1' // Ativa descoberta automática de strings vistas em runtime
    };
  }

  /**
   * Inicializa ou atualiza o pacote de tradução nativo do Ren'Py
   */
  initializeNativeTranslation(options = {}) {
    if (!fs.existsSync(this.tlDir)) {
      fs.mkdirSync(this.tlDir, { recursive: true });
    }

    // 1. Gera arquivo de estilos (fontes e tamanho)
    const styleContent = RenpyStyleProvider.generateLanguageStyles(this.language, {
      fontPath: options.fontPath || null,
      sizeAdjustment: options.sizeAdjustment || 0
    });
    fs.writeFileSync(path.join(this.tlDir, '00_opentranslator_styles.rpy'), styleContent, 'utf8');

    // 2. Gera arquivo de strings base se não existir
    const stringsPath = path.join(this.tlDir, 'strings.rpy');
    if (!fs.existsSync(stringsPath)) {
      const rawPairs = options.initialStrings || [];
      const normalizedPairs = rawPairs.map(p => ({
        oldText: p.oldText || p.original || '',
        newText: p.newText || p.translation || ''
      }));
      const initialStrings = RenpyStringProvider.generateStringsBlock(this.language, normalizedPairs);
      fs.writeFileSync(stringsPath, initialStrings, 'utf8');
    }

    return {
      success: true,
      tlDir: this.tlDir,
      language: this.language
    };
  }

  /**
   * Lê e sincroniza novas strings descobertas pelo modo RENPY_UPDATE_STRINGS
   */
  syncDiscoveredStrings() {
    const stringsPath = path.join(this.tlDir, 'strings.rpy');
    if (!fs.existsSync(stringsPath)) return [];

    const content = fs.readFileSync(stringsPath, 'utf8');
    return RenpyStringProvider.extractStringsPairs(content);
  }
}

module.exports = RenpyWorkflow;
