/**
 * OpenTranslator — FontCompatibilityEngine
 * 
 * Analisa a cobertura de glifos e caracteres necessários para o idioma de destino:
 * - CJK (Kanji, Hiragana, Katakana, Hanzi, Hangul)
 * - Latin com acentos (á, é, í, ó, ú, ç, ã, õ, â, ê, ô, etc.)
 * - Cyrillic (alfabeto cirílico russo, ucraniano, etc.)
 * - Greek (grego clássico e moderno)
 * - RTL (árabe, hebraico)
 * - Símbolos especiais de videogame (botões, setas, moedas)
 * 
 * Regra de ouro: Não substitui fontes indiscriminadamente se a fonte original já cobrir os glifos.
 */

class FontCompatibilityEngine {
  /**
   * Avalia os caracteres presentes no texto traduzido e identifica conjuntos de caracteres
   * @param {string} text
   * @returns {object} Relatório de cobertura e categorias necessárias
   */
  static analyzeGlyphRequirements(text) {
    if (!text || typeof text !== 'string') {
      return { requiredCharsets: [], needsFallbackFont: false, sampleMissingGlyphs: [] };
    }

    const charsets = new Set();
    const missingSamples = [];

    for (let i = 0; i < text.length; i++) {
      const code = text.codePointAt(i);

      if (code >= 0x0020 && code <= 0x007E) {
        charsets.add('BASIC_LATIN');
      } else if ((code >= 0x00C0 && code <= 0x024F) || (code >= 0x1E00 && code <= 0x1EFF)) {
        charsets.add('ACCENTED_LATIN');
      } else if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
        charsets.add('CJK_KANA');
      } else if (code >= 0x4E00 && code <= 0x9FFF) {
        charsets.add('CJK_HANZI_KANJI');
      } else if (code >= 0xAC00 && code <= 0xD7AF) {
        charsets.add('CJK_HANGUL');
      } else if (code >= 0x0400 && code <= 0x04FF) {
        charsets.add('CYRILLIC');
      } else if (code >= 0x0370 && code <= 0x03FF) {
        charsets.add('GREEK');
      } else if (code >= 0x0600 && code <= 0x06FF) {
        charsets.add('ARABIC_RTL');
      } else if (code >= 0x0590 && code <= 0x05FF) {
        charsets.add('HEBREW_RTL');
      } else if (code >= 0x2190 && code <= 0x2BFF) {
        charsets.add('SPECIAL_SYMBOLS');
      } else {
        charsets.add('EXTENDED_UNICODE');
        if (missingSamples.length < 5) {
          missingSamples.push(String.fromCodePoint(code));
        }
      }
    }

    const requiredCharsets = Array.from(charsets);
    const isLatinOnly = requiredCharsets.every(c => c === 'BASIC_LATIN' || c === 'ACCENTED_LATIN');

    return {
      requiredCharsets,
      isLatinOnly,
      hasRTL: requiredCharsets.includes('ARABIC_RTL') || requiredCharsets.includes('HEBREW_RTL'),
      hasCJK: requiredCharsets.some(c => c.startsWith('CJK')),
      hasCyrillic: requiredCharsets.includes('CYRILLIC'),
      needsFontReplacement: !isLatinOnly,
      sampleMissingGlyphs: missingSamples
    };
  }

  /**
   * Recomenda fonte de substituição adequada do pacote OpenTranslator
   */
  static recommendFont(requirements) {
    if (requirements.hasCJK) {
      return {
        fontFamily: 'Noto Sans CJK SC',
        fileName: 'NotoSansCJKsc-Regular.otf',
        reason: 'Texto traduzido requer suporte CJK completo'
      };
    }
    if (requirements.hasRTL) {
      return {
        fontFamily: 'Noto Sans Arabic',
        fileName: 'NotoSansArabic-Regular.ttf',
        reason: 'Texto traduzido requer suporte RTL bidirecional'
      };
    }
    if (requirements.hasCyrillic) {
      return {
        fontFamily: 'Noto Sans',
        fileName: 'NotoSans-Regular.ttf',
        reason: 'Texto requer glifos cirílicos'
      };
    }
    return {
      fontFamily: 'Noto Sans',
      fileName: 'NotoSans-Regular.ttf',
      reason: 'Fonte padrão com suporte a acentos latinos'
    };
  }
}

module.exports = FontCompatibilityEngine;
