/**
 * OpenTranslator — UnityTextMeshProProvider
 * 
 * Especializado em renderização e proteção de rich text do TextMeshPro:
 * - Tags ricas: <color=#hex>, <size=XX>, <b>, <i>, <sprite=X>, <align=...>, <alpha=#XX>, <font=...>
 * - Cálculo de fator de expansão de layout e limites de caixa de texto
 * - Detecção de quebra de linha TMP (<br>) e fallback de fonte
 */

class UnityTextMeshProProvider {
  /**
   * Protege tags do TextMeshPro substituindo por tokens seguros
   */
  static protectTags(text) {
    if (!text || typeof text !== 'string') return { protectedText: '', tokens: [] };

    const tokens = [];
    let counter = 0;

    // Tags TMP: <tag>, </tag>, <tag=value>
    const tmpRegex = /<\/?(?:color|size|b|i|u|s|sprite|align|alpha|font|link|style|material|voffset|pos|indent|line-height|cspace|space|width|page|noparse|br)(?:=[^>]+)?>/gi;
    let protectedText = text.replace(tmpRegex, (match) => {
      const token = `⟦OT_TMP_${counter++}⟧`;
      tokens.push({ token, original: match });
      return token;
    });

    // Placeholders no padrão C# string.Format ({0}, {1}, {0:D2})
    const fmtRegex = /\{[0-9]+(?::[^}]+)?\}/g;
    protectedText = protectedText.replace(fmtRegex, (match) => {
      const token = `⟦OT_FMT_${counter++}⟧`;
      tokens.push({ token, original: match });
      return token;
    });

    return { protectedText, tokens };
  }

  /**
   * Restaura tags e verifica se alguma tag foi perdida ou corrompida
   */
  static restoreTags(translatedText, tokens = []) {
    if (!translatedText || typeof translatedText !== 'string') {
      return { restoredText: '', valid: true, missingTokens: [] };
    }

    let restoredText = translatedText;
    const missingTokens = [];

    for (const item of tokens) {
      if (!restoredText.includes(item.token)) {
        missingTokens.push(item);
      } else {
        restoredText = restoredText.replace(item.token, item.original);
      }
    }

    return {
      restoredText,
      valid: missingTokens.length === 0,
      missingTokens
    };
  }

  /**
   * Estima se o texto expandirá além dos limites da caixa do TextMeshPro
   */
  static estimateOverflow(originalText, translatedText, options = {}) {
    const origLen = originalText.length || 1;
    const transLen = translatedText.length;
    const expansionRatio = transLen / origLen;

    const maxExpansion = options.maxExpansionRatio || 1.35;
    const isOverflowLikely = expansionRatio > maxExpansion && transLen > 30;

    return {
      expansionRatio: Number(expansionRatio.toFixed(2)),
      isOverflowLikely,
      suggestedAction: isOverflowLikely ? 'ENABLE_AUTO_SIZING' : 'KEEP_CURRENT_SIZE'
    };
  }
}

module.exports = UnityTextMeshProProvider;
