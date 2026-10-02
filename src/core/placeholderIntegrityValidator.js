class PlaceholderIntegrityValidator {
  static extractPlaceholders(text) {
    if (!text || typeof text !== 'string') return [];
    const tokens = [];

    // Format strings: {0}, {player}, %s, %d, %1$s
    const fmtRegex = /\{(\w+)\}|%[0-9]*[a-zA-Z]|%\d+\$[a-zA-Z]/g;
    let m;
    while ((m = fmtRegex.exec(text)) !== null) {
      tokens.push(m[0]);
    }

    // Unity / HTML Rich text: <color=red>, </color>, <b>, </b>, [ruby=x]
    const richRegex = /<[^>]+>|\[[^\]]+\]/g;
    while ((m = richRegex.exec(text)) !== null) {
      tokens.push(m[0]);
    }

    // RPG Maker escapes: \V[1], \N[2], \C[3]
    const rmRegex = /\\[VNCIPC]\[\d+\]/gi;
    while ((m = rmRegex.exec(text)) !== null) {
      tokens.push(m[0]);
    }

    return tokens;
  }

  static validate(original, translated) {
    const origTokens = this.extractPlaceholders(original);
    const transTokens = this.extractPlaceholders(translated);

    const missing = [];
    for (const tok of origTokens) {
      if (!transTokens.includes(tok)) {
        missing.push(tok);
      }
    }

    return {
      valid: missing.length === 0,
      originalTokens: origTokens,
      translatedTokens: transTokens,
      missingTokens: missing
    };
  }
}

module.exports = PlaceholderIntegrityValidator;
