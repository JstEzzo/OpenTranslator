/**
 * OpenTranslator — CodeProtector 2.0
 * Sistema Híbrido: Tokenizer + Parser Específico de Engine + Validação Estrutural.
 */

class CodeProtector {
  constructor(defaultEngine = "generic") {
    let eng = "generic";
    if (typeof defaultEngine === "string") {
      eng = defaultEngine;
    } else if (defaultEngine && typeof defaultEngine === "object") {
      eng = defaultEngine.engine || "generic";
    }
    this.defaultEngine = eng.toLowerCase();
    this.tokenPrefix = "⟦OT_";
    this.tokenSuffix = "⟧";
  }

  getPatterns(engineName) {
    const eng = (engineName || this.defaultEngine || "generic").toLowerCase();
    const genericPatterns = [
      { type: "URL", regex: /https?:\/\/[^\s"'<>{}]+/gi },
      { type: "PATH", regex: /[a-zA-Z]:\\[^\s"'<>{}]+|[\w.-]+\/[\w.-]+\/[\w.-]+/gi },
      { type: "FORMAT", regex: /%[-+0-9]*[a-zA-Z]|%(?:\([a-zA-Z0-9_]+\))[-+0-9]*[a-zA-Z]/g },
      { type: "ESCAPE", regex: /\\[nrtbfav0\\'"\.]/g },
      { type: "PLACEHOLDER", regex: /\{[a-zA-Z0-9_]+\}|\{\d+\}|\$\([a-zA-Z0-9_]+\)|\$\{[a-zA-Z0-9_.]+\}/g },
      { type: "HTML_TAG", regex: /<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*)?>/gi }
    ];

    const enginePatterns = {
      renpy: [
        { type: "RENPY_TAG", regex: /\{[a-zA-Z0-9_#=,.:;% -]+\}|\{\/[a-zA-Z0-9_#=,.:;% -]+\}/g },
        { type: "RENPY_VAR", regex: /\[[a-zA-Z0-9_.]+\]/g },
        { type: "PYTHON_FORMAT", regex: /%\([a-zA-Z0-9_]+\)[a-zA-Z]/g }
      ],
      rpgmaker: [
        { type: "RPGM_ESC", regex: /\\[a-zA-Z]+(?:\[[^\]]+\])?|\\\./g },
        { type: "RPGM_VAR", regex: /\\[VvNnPpGgCcIi]<\d+>|\\[VvNnPpGgCcIi]\[\d+\]/g }
      ],
      unity: [
        { type: "RICH_TAG", regex: /<\/?[a-zA-Z0-9_#=,.:;% -]+>/g },
        { type: "UNITY_FMT", regex: /\{\d+(?::[^}]+)?\}/g },
        { type: "TMP_SPRITE", regex: /<sprite(?:=[^>]+)?>/gi }
      ],
      electron: [
        { type: "JS_TEMPLATE", regex: /\$\{[^}]+\}/g },
        { type: "HTML_ENTITY", regex: /&[a-zA-Z0-9#]+;/g },
        { type: "ICU_MSG", regex: /\{[a-zA-Z0-9_]+,\s*(?:plural|select|choice),[^}]+\}/gi }
      ]
    };

    const specific = enginePatterns[eng] || [];
    return [...specific, ...genericPatterns];
  }

  protect(text, engine) {
    if (!text || typeof text !== "string") return { protectedText: text, tokens: [] };

    let protectedText = text;
    const tokens = [];
    let counter = 0;
    const patterns = this.getPatterns(engine);

    for (const pat of patterns) {
      protectedText = protectedText.replace(pat.regex, (match) => {
        const tokenId = this.tokenPrefix + pat.type + "_" + counter + this.tokenSuffix;
        tokens.push({
          id: counter,
          token: tokenId,
          type: pat.type,
          raw: match
        });
        counter++;
        return tokenId;
      });
    }

    return { protectedText, tokens };
  }

  restore(translatedText, tokens) {
    if (!translatedText || typeof translatedText !== "string" || !tokens || !tokens.length) {
      return { restoredText: translatedText, valid: true };
    }

    let restored = translatedText;
    let valid = true;

    for (const t of tokens) {
      if (!restored.includes(t.token)) {
        valid = false;
      }
      restored = restored.split(t.token).join(t.raw);
    }

    return {
      restoredText: restored,
      valid
    };
  }

  validateTokens(originalTokens, translatedText) {
    const QAEngine = require("./qaEngine");
    return QAEngine.validate(
      originalTokens.map(t => t.token).join(" "),
      translatedText,
      { expectedTokens: originalTokens }
    );
  }
}

module.exports = CodeProtector;
