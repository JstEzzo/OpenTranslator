class LayoutAnalyzer {
  /**
   * Avalia se a tradução expandiu excessivamente o texto e pode causar overflow.
   */
  static analyzeExpansion(original, translated, maxWidth = 300) {
    const origLen = (original || '').length;
    const transLen = (translated || '').length;
    const expansionRatio = origLen > 0 ? transLen / origLen : 1.0;

    const issues = [];
    if (expansionRatio > 2.5 && transLen > 30) {
      issues.push({ type: 'SEVERE_EXPANSION', ratio: expansionRatio, message: 'Tradução 2.5x maior que o original' });
    } else if (expansionRatio > 1.8 && transLen > 40) {
      issues.push({ type: 'MODERATE_EXPANSION', ratio: expansionRatio, message: 'Tradução 1.8x maior que o original' });
    }

    return {
      ok: issues.length === 0,
      originalLength: origLen,
      translatedLength: transLen,
      expansionRatio: Number(expansionRatio.toFixed(2)),
      issues,
      needsResize: expansionRatio > 1.8
    };
  }
}

class FontCompatibilityAnalyzer {
  static checkCoverage(text, targetLang = 'pt-BR') {
    // Caracteres especiais em português: á, é, í, ó, ú, ã, õ, ç, etc.
    const ptChars = /[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/;
    const hasPtAccents = ptChars.test(text);

    return {
      compatible: true,
      hasAccents: hasPtAccents,
      recommendedEncoding: 'UTF-8'
    };
  }
}

module.exports = {
  LayoutAnalyzer,
  FontCompatibilityAnalyzer
};
