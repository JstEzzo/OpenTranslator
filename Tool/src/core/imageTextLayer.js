/**
 * OpenTranslator — ImageTextLayer
 * 
 * Camada de detecção e localização de imagens com texto:
 * - Filtra nomes de imagens com alta probabilidade de conter texto (title, gameover, ui_, logo, sign, tutorial)
 * - Evita OCR indiscriminado sobre texturas e sprites 3D
 * - Roteamento: Imagem -> OCR -> Tradução -> Asset Localizado (tl/<lang>/images/...) ou Overlay
 */

const fs = require('fs');
const path = require('path');

class ImageTextLayer {
  /**
   * Avalia a probabilidade de uma imagem conter texto traduzível com base em heurísticas
   */
  static isLikelyTextImage(filePath) {
    if (!filePath) return false;
    const base = path.basename(filePath).toLowerCase();

    // Palavras-chave indicando provável texto gráfico
    const textKeywords = [
      'title', 'gameover', 'game_over', 'logo', 'banner', 'sign',
      'ui_btn', 'button', 'menu', 'chapter', 'epilogue', 'prologue',
      'instruction', 'tutorial', 'help', 'start', 'option', 'quit'
    ];

    return textKeywords.some(kw => base.includes(kw));
  }

  /**
   * Mapeia caminho para imagem localizada substituta
   * Ex: game/images/title.png -> game/tl/portuguese/images/title.png
   */
  static getLocalizedAssetPath(originalPath, gameDir, language = 'portuguese') {
    const rel = path.relative(gameDir, originalPath);
    return path.join(gameDir, 'tl', language, rel);
  }
}

module.exports = ImageTextLayer;
