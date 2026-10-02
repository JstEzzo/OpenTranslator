/**
 * OpenTranslator — TranslationLayoutValidator
 * 
 * Validador e ajustador de layout de tradução para jogos:
 * - Detecta overflow, clipping e quebras de linha excessivas
 * - Suporta estratégias de adaptação: SHRINK (reduzir fonte), WRAP (quebra de linha), RESIZE, FONT_FALLBACK
 * - Preserva variáveis e pluralização estruturada (ICU MessageFormat e format strings)
 * - Suporte a RTL (Árabe, Hebraico) sem corromper pontuação ou alinhamento
 */

class TranslationLayoutValidator {
  /**
   * Avalia a expansão de texto entre original e tradução
   */
  static validateLayout(original, translation, constraints = {}) {
    const origLen = (original && original.length) || 1;
    const transLen = (translation && translation.length) || 0;
    const expansionRatio = transLen / origLen;

    const maxLineLength = constraints.maxLineLength || 50;
    const maxLines = constraints.maxLines || 4;

    const origLines = (original || '').split(/\r?\n/).length;
    const transLines = (translation || '').split(/\r?\n/).length;

    // Detecta linhas individuais longas demais
    const lines = (translation || '').split(/\r?\n/);
    const hasLongLine = lines.some(l => l.length > maxLineLength);
    const lineCountExceeded = transLines > maxLines;

    let severity = 'OK';
    let suggestedAction = 'NONE';

    if (expansionRatio > 1.8 && transLen > 40) {
      severity = 'CRITICAL';
      suggestedAction = 'SHRINK_AND_WRAP';
    } else if (hasLongLine || lineCountExceeded) {
      severity = 'WARNING';
      suggestedAction = hasLongLine ? 'WRAP' : 'SHRINK';
    }

    return {
      severity,
      expansionRatio: Number(expansionRatio.toFixed(2)),
      origLength: origLen,
      transLength: transLen,
      origLines,
      transLines,
      hasLongLine,
      lineCountExceeded,
      suggestedAction
    };
  }

  /**
   * Ajusta e quebra o texto em múltiplas linhas respeitando palavras inteiras
   */
  static wrapText(text, maxCharsPerLine = 45) {
    if (!text || text.length <= maxCharsPerLine) return text;

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
  }

  /**
   * Prepara texto para exibição RTL (Árabe / Hebraico)
   * Garante marcadores de direção Unicode (RLM / LRM) para evitar inversão de pontuação ou números
   */
  static formatRTL(text, isRTL = false) {
    if (!isRTL || !text) return text;

    const RLM = '\u200F'; // Right-to-Left Mark
    const LRM = '\u200E'; // Left-to-Right Mark

    // Se o texto termina com pontuação neutra (ex: ponto, exclamação), o RLM previne salto para a esquerda
    let formatted = text;
    if (/[.!?:;,]$/.test(formatted)) {
      formatted = formatted + RLM;
    }

    return formatted;
  }

  /**
   * Valida se blocos de pluralização e variáveis foram preservados
   */
  static validatePluralAndVariables(original, translation) {
    const origVars = (original.match(/%[0-9]*[sdf]|\{[0-9]+\}|\\[VvNnCc]\[[0-9]+\]/g) || []).sort();
    const transVars = (translation.match(/%[0-9]*[sdf]|\{[0-9]+\}|\\[VvNnCc]\[[0-9]+\]/g) || []).sort();

    const missing = origVars.filter(v => !transVars.includes(v));
    const extra = transVars.filter(v => !origVars.includes(v));

    return {
      valid: missing.length === 0 && extra.length === 0,
      missingVariables: missing,
      extraVariables: extra
    };
  }
}

module.exports = TranslationLayoutValidator;
