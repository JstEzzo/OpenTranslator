/**
 * OpenTranslator — RenpyProductionProvider
 * 
 * Expansão completa para tradução nativa de Ren'Py em produção:
 * - RenpyTranslationProvider: diálogo, labels e blocos translate <lang> <label>:
 * - RenpyStringProvider: interface, menus e translate <lang> strings:
 * - RenpyStyleProvider: fontes, tamanhos, estilos por idioma (style default font = ...)
 * - RenpyAssetLocalization: imagens localizadas (image splash = "tl/<lang>/splash.png")
 * - Suporte a deferred translation e arquivos incrementais
 */

const fs = require('fs');
const path = require('path');

class RenpyStringProvider {
  /**
   * Gera um bloco canônico de translate <lang> strings:
   * @param {string} language
   * @param {Array<{ oldText: string, newText: string }>} stringPairs
   * @returns {string}
   */
  static generateStringsBlock(language, stringPairs = []) {
    const lines = [`translate ${language} strings:`, ''];
    for (const pair of stringPairs) {
      const oldEsc = pair.oldText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const newEsc = pair.newText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`    old "${oldEsc}"`);
      lines.push(`    new "${newEsc}"`);
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * Extrai pares old/new de um arquivo .rpy
   */
  static extractStringsPairs(rpyContent) {
    const pairs = [];
    const regex = /old\s+"([^"\\]*(?:\\.[^"\\]*)*)"\s*\r?\n\s*new\s+"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let match;
    while ((match = regex.exec(rpyContent)) !== null) {
      pairs.push({
        oldText: match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
        newText: match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      });
    }
    return pairs;
  }
}

class RenpyStyleProvider {
  /**
   * Gera arquivo de estilos para substituição de fontes e ajustes de tamanho
   * @param {string} language
   * @param {object} options
   * @param {string} [options.fontPath] - Caminho relativo da fonte (ex: "tl/portuguese/NotoSans.ttf")
   * @param {number} [options.sizeAdjustment] - Ajuste no tamanho de fonte (ex: -2 para texto expandido)
   */
  static generateLanguageStyles(language, options = {}) {
    const lines = [
      `# OpenTranslator Style Override for ${language}`,
      `init python:`,
      `    gui.language = "${language}"`
    ];

    if (options.fontPath) {
      lines.push(`    gui.text_font = "${options.fontPath}"`);
      lines.push(`    gui.name_text_font = "${options.fontPath}"`);
      lines.push(`    gui.interface_text_font = "${options.fontPath}"`);
    }

    if (options.sizeAdjustment) {
      lines.push(`    # Font size adjustment: ${options.sizeAdjustment}`);
      lines.push(`    gui.text_size = gui.text_size + (${options.sizeAdjustment})`);
    }

    lines.push('');
    lines.push(`translate ${language} style default:`);
    if (options.fontPath) {
      lines.push(`    font "${options.fontPath}"`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

class RenpyAssetLocalization {
  /**
   * Registra substituição de imagem ou áudio localizada para a língua alvo
   * Ex: image title = "tl/portuguese/images/title.png"
   */
  static generateAssetOverrides(language, assetMap = {}) {
    const lines = [`# OpenTranslator Asset Localization for ${language}`, ''];
    for (const [imageName, assetPath] of Object.entries(assetMap)) {
      lines.push(`image ${imageName} = "${assetPath}"`);
    }
    lines.push('');
    return lines.join('\n');
  }
}

class RenpyTranslationProvider {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Cria estrutura incremental de pastas para tradução nativa em game/tl/<language>
   */
  static ensureTlStructure(gameDir, language = 'portuguese') {
    const tlDir = path.join(gameDir, 'game', 'tl', language);
    if (!fs.existsSync(tlDir)) {
      fs.mkdirSync(tlDir, { recursive: true });
    }
    return tlDir;
  }

  /**
   * Salva tradução incremental em game/tl/<language>/opentranslator_<category>.rpy
   */
  static saveIncrementalTranslation(gameDir, language, category, rpyContent) {
    const tlDir = RenpyTranslationProvider.ensureTlStructure(gameDir, language);
    const fileName = `opentranslator_${category}.rpy`;
    const fullPath = path.join(tlDir, fileName);
    fs.writeFileSync(fullPath, rpyContent, 'utf8');
    return {
      success: true,
      path: fullPath,
      sizeBytes: Buffer.byteLength(rpyContent, 'utf8')
    };
  }
}

module.exports = {
  RenpyTranslationProvider,
  RenpyStringProvider,
  RenpyStyleProvider,
  RenpyAssetLocalization
};
