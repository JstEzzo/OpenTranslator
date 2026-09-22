/**
 * OpenTranslator — GodotControlTextProvider
 * 
 * Suporte a nós de interface gráfica da Godot Engine (Control / Label / RichTextLabel)
 * Protege formatação BBCode e tokens de interpolação:
 * - [b], [i], [u], [s], [code], [color=#hex], [url], [wave], [tornado], [shake]
 * - Placeholders: {0}, {player}, %s, %d, %f
 */

class GodotControlTextProvider {
  /**
   * Protege tags BBCode da Godot antes do envio para tradução
   */
  static protectBBCode(text) {
    if (!text || typeof text !== 'string') return { protectedText: '', tokens: [] };

    const tokens = [];
    let counter = 0;

    // Regex para tags BBCode: [tag], [/tag], [tag=value]
    const bbRegex = /\[\/?[a-zA-Z0-9_]+(?:=[^\]]+)?\]/g;
    let protectedText = text.replace(bbRegex, (match) => {
      const token = `⟦OT_BB_${counter++}⟧`;
      tokens.push({ token, original: match, type: 'bbcode' });
      return token;
    });

    // Placeholders no estilo Godot: {var}, {0}, %s, %d
    const varRegex = /\{[a-zA-Z0-9_]+\}|%[0-9]*[sdf]/g;
    protectedText = protectedText.replace(varRegex, (match) => {
      const token = `⟦OT_GVAR_${counter++}⟧`;
      tokens.push({ token, original: match, type: 'variable' });
      return token;
    });

    return { protectedText, tokens };
  }

  /**
   * Restaura tags BBCode e variáveis originais
   */
  static restoreBBCode(translatedText, tokens = []) {
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
   * Mapeamento de tipos comuns de nós da Godot e propriedades traduzíveis
   */
  static getNodeTextProperties(nodeType) {
    const map = {
      'Label': ['text'],
      'RichTextLabel': ['bbcode_text', 'text'],
      'Button': ['text', 'tooltip_text'],
      'CheckButton': ['text'],
      'CheckBox': ['text'],
      'MenuButton': ['text'],
      'OptionButton': ['text'],
      'LineEdit': ['text', 'placeholder_text'],
      'TextEdit': ['text'],
      'FileDialog': ['title'],
      'AcceptDialog': ['title', 'dialog_text'],
      'ConfirmationDialog': ['title', 'dialog_text']
    };
    return map[nodeType] || ['text'];
  }
}

module.exports = GodotControlTextProvider;
