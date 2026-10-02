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
      wolf: [
        { type: "WOLF_VAR", regex: /\\[cC]?[sS]elf\[\d+\]|\\[vVsS]\[\d+\]|\\[uUcCdD]+\[[^\]]+\]/g },
        { type: "WOLF_CMD", regex: /\\[cCfFiIwW]\[\d+\]|@\d+\n?/g }
      ],
      godot: [
        { type: "GODOT_BBCODE", regex: /\[\/?[a-zA-Z0-9_#=,.:;% -]+\]/g },
        { type: "GODOT_DIALOG_VAR", regex: /<<[^>]+>>/g },
        { type: "GODOT_FMT", regex: /%[-+0-9]*[sdefgoxX]|(?:\{[a-zA-Z0-9_.]+\})/g }
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

  restore(translatedText, tokens = []) {
    if (!translatedText || typeof translatedText !== "string" || !tokens || !tokens.length) {
      return { restoredText: translatedText || "", valid: true, missingTokens: [] };
    }

    let restored = translatedText;
    let valid = true;
    const missingTokens = [];

    for (const t of tokens) {
      const rawVal = t.raw || t.original || "";
      const tokVal = t.token || t.placeholder || "";
      if (tokVal && restored.includes(tokVal)) {
        restored = restored.split(tokVal).join(rawVal);
      } else if (rawVal && !restored.includes(rawVal)) {
        // Auto-cura genérica para variáveis traduzidas por MT/LLM dentro de delimitadores
        let healed = false;
        
        // Colchetes [variavel]
        if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          const varMatches = restored.match(/\[[^\]]+\]/g);
          const bracketTokens = tokens.filter(tok => (tok.raw || "").startsWith('[') && (tok.raw || "").endsWith(']'));
          if (varMatches && bracketTokens.length > 0) {
            const idx = bracketTokens.indexOf(t);
            if (idx >= 0 && idx < varMatches.length) {
              const candidate = varMatches[idx];
              if (!tokens.some(otherTok => (otherTok.raw || "") === candidate)) {
                restored = restored.replace(candidate, rawVal);
                healed = true;
              }
            }
          }
        }
        
        // Chaves {variavel}
        if (!healed && rawVal.startsWith('{') && rawVal.endsWith('}')) {
          const braceMatches = restored.match(/\{[^}]+\}/g);
          const braceTokens = tokens.filter(tok => (tok.raw || "").startsWith('{') && (tok.raw || "").endsWith('}'));
          if (braceMatches && braceTokens.length > 0) {
            const idx = braceTokens.indexOf(t);
            if (idx >= 0 && idx < braceMatches.length) {
              const candidate = braceMatches[idx];
              if (!tokens.some(otherTok => (otherTok.raw || "") === candidate)) {
                restored = restored.replace(candidate, rawVal);
                healed = true;
              }
            }
          }
        }

        if (!healed && !restored.includes(rawVal)) {
          valid = false;
          missingTokens.push(rawVal || tokVal);
        }
      }
    }

    return {
      restoredText: restored,
      valid,
      missingTokens
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
