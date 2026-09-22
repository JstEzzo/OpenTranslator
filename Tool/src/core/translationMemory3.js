/**
 * OpenTranslator — TranslationMemory3
 * 
 * Memória de Tradução 3.0 de alta performance com priorização estrita:
 * 1. manual override (prioridade máxima absoluta definida pelo usuário)
 * 2. exact + context-aware (match exato com mesmo personagem/cena)
 * 3. exact (match exato do texto no mesmo jogo)
 * 4. normalized (espaços/pontuação normalizados)
 * 5. fuzzy (similaridade de Levenshtein >= 85%)
 * 6. null (repassa para o TranslationProvider)
 */

class TranslationMemory3 {
  constructor(options = {}) {
    this.options = options;
    // Armazenamento em memória organizado por gameId
    this.memory = new Map(); // gameId -> Map(compositeKey -> record)
    this.manualOverrides = new Map(); // gameId -> Map(text -> record)
  }

  /**
   * Adiciona ou atualiza uma entrada na memória
   */
  set(original, translation, options = {}) {
    const gameId = options.gameId || 'global';
    const isManual = Boolean(options.isManualOverride);
    const contextSig = options.contextSignature || '';
    const charId = options.character || '';
    const version = options.version || '1.0';

    if (!this.memory.has(gameId)) {
      this.memory.set(gameId, new Map());
      this.manualOverrides.set(gameId, new Map());
    }

    const record = {
      original,
      translation,
      gameId,
      version,
      character: charId,
      contextSignature: contextSig,
      isManualOverride: isManual,
      updatedAt: Date.now()
    };

    if (isManual) {
      this.manualOverrides.get(gameId).set(original, record);
    }

    const key = contextSig ? `${original}::${contextSig}` : original;
    this.memory.get(gameId).set(key, record);
  }

  /**
   * Consulta a memória seguindo a hierarquia estrita:
   * manual -> exact+context -> exact -> normalized -> fuzzy
   */
  lookup(text, options = {}) {
    if (!text || typeof text !== 'string') return null;

    const gameId = options.gameId || 'global';
    const contextSig = options.contextSignature || '';

    // 1. MANUAL OVERRIDE (Prioridade 1)
    if (this.manualOverrides.has(gameId)) {
      const manual = this.manualOverrides.get(gameId).get(text);
      if (manual) {
        return {
          translation: manual.translation,
          matchType: 'MANUAL_OVERRIDE',
          confidence: 1.0,
          record: manual
        };
      }
    }

    if (!this.memory.has(gameId)) return null;
    const gameMap = this.memory.get(gameId);

    // 2. EXACT + CONTEXT-AWARE (Prioridade 2)
    if (contextSig) {
      const ctxKey = `${text}::${contextSig}`;
      if (gameMap.has(ctxKey)) {
        return {
          translation: gameMap.get(ctxKey).translation,
          matchType: 'EXACT_CONTEXT',
          confidence: 1.0,
          record: gameMap.get(ctxKey)
        };
      }
    }

    // 3. EXACT (Prioridade 3)
    if (gameMap.has(text)) {
      return {
        translation: gameMap.get(text).translation,
        matchType: 'EXACT',
        confidence: 1.0,
        record: gameMap.get(text)
      };
    }

    // 4. NORMALIZED (Prioridade 4)
    const normSearch = this._normalize(text);
    for (const [k, rec] of gameMap.entries()) {
      if (this._normalize(rec.original) === normSearch) {
        return {
          translation: rec.translation,
          matchType: 'NORMALIZED',
          confidence: 0.95,
          record: rec
        };
      }
    }

    // 5. FUZZY (Prioridade 5, apenas se habilitado)
    if (options.enableFuzzy !== false && text.length > 5) {
      let bestSim = 0;
      let bestRec = null;

      for (const [k, rec] of gameMap.entries()) {
        const sim = this._similarity(text, rec.original);
        if (sim > bestSim && sim >= (options.fuzzyThreshold || 0.85)) {
          bestSim = sim;
          bestRec = rec;
        }
      }

      if (bestRec) {
        return {
          translation: bestRec.translation,
          matchType: 'FUZZY',
          confidence: Number(bestSim.toFixed(2)),
          record: bestRec
        };
      }
    }

    return null;
  }

  _normalize(s) {
    return String(s || '').toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
  }

  _similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;

    const editDistance = this._levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  _levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

module.exports = TranslationMemory3;
