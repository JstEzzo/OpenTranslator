/**
 * OpenTranslator — UnityUGUIProvider
 * 
 * Especializado no subsistema UGUI (UnityEngine.UI) clássico:
 * - Text, TextMesh, InputField, Text Generator
 * - Suporte a Best Fit / Auto Size
 * - Preservação de quebras de linha e formatação HTML básica (color, b, i, size)
 */

class UnityUGUIProvider {
  /**
   * Protege tags do UGUI (subconjunto de tags HTML)
   */
  static protectTags(text) {
    if (!text || typeof text !== 'string') return { protectedText: '', tokens: [] };

    const tokens = [];
    let counter = 0;

    const uguiRegex = /<\/?(?:color|size|b|i)(?:=[^>]+)?>/gi;
    let protectedText = text.replace(uguiRegex, (match) => {
      const token = `⟦OT_UGUI_${counter++}⟧`;
      tokens.push({ token, original: match });
      return token;
    });

    const fmtRegex = /\{[0-9]+\}/g;
    protectedText = protectedText.replace(fmtRegex, (match) => {
      const token = `⟦OT_UFMT_${counter++}⟧`;
      tokens.push({ token, original: match });
      return token;
    });

    return { protectedText, tokens };
  }

  /**
   * Restaura tags UGUI
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
}

module.exports = UnityUGUIProvider;
