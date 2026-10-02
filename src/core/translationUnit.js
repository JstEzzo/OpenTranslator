/**
 * OpenTranslator - TranslationUnit & PlaceholderMasker
 * 
 * Unidade atômica e estruturada de tradução de produção (TranslationUnit 2.0).
 * Integra proteção real de placeholders (PlaceholderMasker) e seletores estruturados
 * (jsonPath, poMsgId, rpyTranslationBlock, csvCell, textRange).
 */

const crypto = require('crypto');

class PlaceholderMasker {
  /**
   * Mascara placeholders e tags especiais para proteger contra alteração pelo tradutor
   */
  static mask(text) {
    if (!text || typeof text !== 'string') return { protectedText: text, tokens: new Map() };

    const tokens = new Map();
    let counter = 1;

    // Padrões: RPG Maker (\C[n], \V[n], \N[n], \I[n], etc.), formatação C (%s, %d), tokens ({0}, {1}), tags Ren'Py e HTML
    const pattern = /(\{\d+\}|%[sdf]|\\(?:[CVNPGIRC]\[\d+\]|[.|\^!<>])|\{[a-zA-Z_/][^}]*\}|<[^>]+>)/g;

    const protectedText = text.replace(pattern, (match) => {
      const tokenKey = `__OT_TOK_${String(counter).padStart(3, '0')}__`;
      tokens.set(tokenKey, match);
      counter++;
      return tokenKey;
    });

    return { protectedText, tokens };
  }

  /**
   * Restaura os tokens originais após a tradução
   */
  static unmask(translatedText, tokens) {
    if (!translatedText || !tokens || tokens.size === 0) return translatedText;

    let restored = translatedText;
    for (const [tokenKey, originalTag] of tokens.entries()) {
      restored = restored.split(tokenKey).join(originalTag);
    }
    return restored;
  }

  /**
   * Valida se todos os tokens esperados foram preservados com integridade
   */
  static validate(protectedOriginal, translatedWithTokens, tokens) {
    if (!tokens || tokens.size === 0) return { valid: true, missingTokens: [] };

    const missingTokens = [];
    for (const [tokenKey] of tokens.entries()) {
      if (!translatedWithTokens.includes(tokenKey)) {
        missingTokens.push(tokenKey);
      }
    }

    return {
      valid: missingTokens.length === 0,
      missingTokens,
      error: missingTokens.length > 0 ? `PLACEHOLDER_CORRUPTION: Tokens perdidos: ${missingTokens.join(', ')}` : null
    };
  }
}

class TranslationUnit {
  constructor(data = {}) {
    this.id = data.id || `tu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.gameId = data.gameId || 'unknown_game';
    this.sourceFile = data.sourceFile || data.file || '';
    this.location = data.location || '';
    this.selector = data.selector || null; // { type: 'jsonPath'|'poMsgId'|'rpyTranslationBlock'|'csvCell'|'textRange', value }

    this.original = data.original || '';
    this.normalizedOriginal = (this.original || '').trim().replace(/\s+/g, ' ');

    const maskResult = PlaceholderMasker.mask(this.original);
    this.protectedOriginal = maskResult.protectedText;
    this.tokens = maskResult.tokens;

    this.translation = data.translation || null;
    this.normalizedTranslation = null;

    this.sourceHash = crypto.createHash('sha256').update(this.original || '').digest('hex').slice(0, 16);
    this.normalizedHash = crypto.createHash('sha256').update(this.normalizedOriginal || '').digest('hex').slice(0, 16);
    this.contextHash = data.context ? crypto.createHash('sha256').update(String(data.context)).digest('hex').slice(0, 16) : null;
    this.fileHash = data.fileHash || null;
    this.gameHash = data.gameHash || null;

    this.engine = data.engine || 'generic';
    this.runtime = data.runtime || 'unknown';
    this.framework = data.framework || 'unknown';
    this.scene = data.scene || null;
    this.speaker = data.speaker || null;
    this.provider = data.provider || null;
    this.confidence = data.confidence !== undefined ? data.confidence : 1.0;

    // Status: DISCOVERED, CANDIDATE, TRANSLATING, TRANSLATED, UNCHANGED, NOT_TRANSLATED, INVALID, REJECTED, VERIFIED, MANUAL_REVIEW, OBSOLETE, FAILED
    this.status = data.status || 'DISCOVERED';
    this.origin = data.origin || 'STATIC_SCAN';
    this.provenance = data.provenance || [];
  }

  /**
   * Aplica a tradução crua do provider desmascarando os placeholders
   */
  applyTranslation(rawTranslation, providerName = 'Unknown') {
    this.provider = providerName;

    // 1. Valida se o provider devolveu com os tokens protegidos
    const val = PlaceholderMasker.validate(this.protectedOriginal, rawTranslation, this.tokens);
    if (!val.valid) {
      this.status = 'INVALID';
      this.translation = this.original; // Fallback seguro
      return { success: false, error: val.error, unit: this };
    }

    // 2. Desmascara
    this.translation = PlaceholderMasker.unmask(rawTranslation, this.tokens);
    this.normalizedTranslation = this.translation.trim().replace(/\s+/g, ' ');
    this.status = this.translation === this.original ? 'UNCHANGED' : 'TRANSLATED';

    return { success: true, unit: this };
  }

  toJSON() {
    return {
      id: this.id,
      gameId: this.gameId,
      sourceFile: this.sourceFile,
      location: this.location,
      selector: this.selector,
      original: this.original,
      translation: this.translation,
      sourceHash: this.sourceHash,
      fileHash: this.fileHash,
      status: this.status,
      engine: this.engine,
      runtime: this.runtime,
      provider: this.provider,
      confidence: this.confidence
    };
  }
}

module.exports = {
  TranslationUnit,
  PlaceholderMasker
};
