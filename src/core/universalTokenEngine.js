/**
 * OpenTranslator — UniversalTokenEngine
 * Sistema universal de proteção, restauração e validação de placeholders e tokens.
 * Suporta todas as principais engines e formatos:
 * - Ren'Py: [player_name], $[cash], {i}, {b}, {size}, {color}, [variable]
 * - Unity / C#: {0}, {name}, <color>, <sprite>, TMP tags, SmartStrings
 * - Unreal Engine: {0}, {Arg}, LOCGEN_FORMAT_NAMED, FText namespaces
 * - Godot: %s, %d, {0}, tr(), tr_n()
 * - RPG Maker: \\V[n], \\N[n], \\C[n], \\I[n], \\G, \\., \\|, \\!, \\^
 * - GameMaker / Printf: %s, %d, %f, %1, \\n, \\r\\n, \\t
 * - Construct 3 / ICU: {variable}, {{variable}}, {0, plural, ...}
 */

class UniversalTokenEngine {
  constructor(engine = "generic") {
    this.engine = engine;
  }

  /**
   * Padrões regex para detecção de tokens por engine.
   */
  static getPatterns(engine = "generic") {
    const patterns = [];

    // 1. Quebras de linha e escapes universais
    patterns.push({ type: "ESCAPE", regex: /\\r\\n|\\n|\\t/g });

    // 2. Ren'Py (variáveis em colchetes e tags de estilo)
    patterns.push({ type: "RENPY_VAR", regex: /\$?\[[a-zA-Z0-9_.]+\]/g });
    patterns.push({ type: "RENPY_TAG", regex: /\{[a-zA-Z0-9_#=.-]+\}|\{\/[a-zA-Z0-9_#=.-]+\}/g });

    // 3. Unity / TextMeshPro / C# format
    patterns.push({ type: "UNITY_TMP", regex: /<\/?[a-zA-Z0-9_#=."' -]+>/g });
    patterns.push({ type: "CSHARP_ARG", regex: /\{[0-9]+(?:,[0-9-]+)?(?::[a-zA-Z0-9_-]+)?\}/g });
    patterns.push({ type: "CSHARP_NAMED", regex: /\{[a-zA-Z_][a-zA-Z0-9_]*(?:,[0-9-]+)?(?::[a-zA-Z0-9_-]+)?\}/g });

    // 4. Unreal FText format
    patterns.push({ type: "UNREAL_ARG", regex: /\{[0-9]+\}|\{[a-zA-Z_][a-zA-Z0-9_]*\}/g });

    // 5. RPG Maker escape codes
    patterns.push({ type: "RPGM_ESCAPE", regex: /\\[a-zA-Z]+(?:\[[0-9]+\])?|\\[.!|<>^]/g });

    // 6. Printf / GameMaker format
    patterns.push({ type: "PRINTF_ARG", regex: /%[-+0 #]*[0-9]*(?:\.[0-9]+)?[hlLzjt]*[diuoxXfFeEgGaAcspn%]|%[0-9]+/g });

    // 7. Construct / ICU format
    patterns.push({ type: "CONSTRUCT_VAR", regex: /\{\{[a-zA-Z0-9_.]+\}\}|\{[a-zA-Z0-9_.]+,\s*(?:plural|select)[^{}]*\}/g });

    return patterns;
  }

  /**
   * Protege todos os tokens em um texto com marcadores opacos seguros.
   * @param {string} text
   * @param {string} engine
   * @returns {{ protectedText: string, tokens: Array<object> }}
   */
  protect(text, engine = this.engine) {
    if (!text || typeof text !== "string") {
      return { protectedText: text, tokens: [] };
    }

    const patterns = UniversalTokenEngine.getPatterns(engine);
    const tokens = [];
    let currentText = text;
    let tokenIndex = 0;

    for (const pat of patterns) {
      currentText = currentText.replace(pat.regex, (match) => {
        const placeholder = `⟦OT_${pat.type}_${tokenIndex}⟧`;
        tokens.push({
          id: tokenIndex,
          type: pat.type,
          token: placeholder,
          raw: match
        });
        tokenIndex++;
        return placeholder;
      });
    }

    return { protectedText: currentText, tokens };
  }

  /**
   * Restaura os tokens protegidos no texto traduzido, com autocura para variáveis traduzidas.
   * @param {string} translatedText
   * @param {Array<object>} tokens
   * @returns {{ restoredText: string, valid: boolean, missingTokens: Array<string> }}
   */
  restore(translatedText, tokens = []) {
    if (!translatedText || typeof translatedText !== "string") {
      return { restoredText: translatedText, valid: true, missingTokens: [] };
    }
    if (!tokens || tokens.length === 0) {
      return { restoredText: translatedText, valid: true, missingTokens: [] };
    }

    let out = translatedText;
    const missing = [];

    // Mapeamento de termos traduzidos para autocura de variáveis (ex: [player_name] -> [nome_do_jogador])
    const TRANSLATED_VARIABLE_MAP = {
      "[nome_do_jogador]": "[player_name]",
      "[dinheiro]": "[cash]",
      "$[dinheiro]": "$[cash]",
      "[local]": "[location]",
      "v[config.versão]": "v[config.version]",
      "v[config.versao]": "v[config.version]",
      "[pontos]": "[points]",
      "[saúde]": "[health]",
      "[vida]": "[health]"
    };

    for (const [transVar, origVar] of Object.entries(TRANSLATED_VARIABLE_MAP)) {
      if (out.includes(transVar)) {
        out = out.split(transVar).join(origVar);
      }
    }

    for (const tok of tokens) {
      if (out.includes(tok.token)) {
        out = out.split(tok.token).join(tok.raw);
      } else if (out.includes(tok.raw)) {
        // Tag já está presente no texto em sua forma pura
        continue;
      } else {
        missing.push(tok.raw || tok.token);
      }
    }

    return {
      restoredText: out,
      valid: missing.length === 0,
      missingTokens: missing
    };
  }

  /**
   * Valida se todos os tokens esperados estão presentes no texto final.
   * @param {string} original
   * @param {string} translated
   * @param {Array<object>} tokens
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  validate(original, translated, tokens = []) {
    const errors = [];
    if (!tokens || tokens.length === 0) return { valid: true, errors: [] };

    for (const tok of tokens) {
      const hasToken = translated.includes(tok.token);
      const hasRaw = tok.raw && translated.includes(tok.raw);
      if (!hasToken && !hasRaw) {
        errors.push(`Token ${tok.raw || tok.token} (${tok.type}) ausente na tradução.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static protect(text, engine = 'generic') {
    return new UniversalTokenEngine(engine).protect(text, engine);
  }

  static restore(translatedText, tokens = [], engine = 'generic') {
    return new UniversalTokenEngine(engine).restore(translatedText, tokens, engine);
  }

  static validate(original, translated, tokens = []) {
    return new UniversalTokenEngine().validate(original, translated, tokens);
  }
}

module.exports = UniversalTokenEngine;
