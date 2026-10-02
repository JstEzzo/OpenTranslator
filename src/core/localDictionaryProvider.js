/**
 * OpenTranslator - LocalDictionaryProvider
 * 
 * Provedor de tradução determinístico, 100% offline e local para laboratório e testes E2E.
 * Classificação oficial: LAB_TRANSLATION_PROVIDER
 * 
 * - Sem IA pesada, sem LLM, sem embeddings, sem dependência de internet.
 * - Suporta dicionário determinístico de termos de jogos.
 * - Fuzzy matching com cálculo estrito de confiança (confidence >= threshold).
 * - Preserva pontuação, quebras de linha e casing.
 */

class LocalDictionaryProvider {
  constructor(options = {}) {
    this.id = 'lab-dictionary';
    this.name = 'Local Deterministic Dictionary Provider';
    this.type = 'LAB_TRANSLATION_PROVIDER';
    this.targetLanguage = options.targetLanguage || 'pt-BR';
    this.fuzzyConfidenceThreshold = options.fuzzyConfidenceThreshold !== undefined ? options.fuzzyConfidenceThreshold : 0.80; // 80% mín
    this.terminologyLocks = new Map(options.terminologyLocks || []);

    this.dictionary = new Map([
      ['start', 'iniciar'],
      ['start game', 'iniciar jogo'],
      ['new game', 'novo jogo'],
      ['continue', 'continuar'],
      ['load game', 'carregar jogo'],
      ['save game', 'salvar jogo'],
      ['options', 'opções'],
      ['settings', 'configurações'],
      ['quit', 'sair'],
      ['exit', 'sair'],
      ['back', 'voltar'],
      ['yes', 'sim'],
      ['no', 'não'],
      ['cancel', 'cancelar'],
      ['confirm', 'confirmar'],
      ['attack', 'atacar'],
      ['defend', 'defender'],
      ['magic', 'magia'],
      ['item', 'item'],
      ['items', 'itens'],
      ['skills', 'habilidades'],
      ['equipment', 'equipamento'],
      ['status', 'estado'],
      ['potion', 'poção'],
      ['potions', 'poções'],
      ['sword', 'espada'],
      ['swords', 'espadas'],
      ['shield', 'escudo'],
      ['shields', 'escudos'],
      ['armor', 'armadura'],
      ['gold', 'ouro'],
      ['level', 'nível'],
      ['experience', 'experiência'],
      ['hello', 'olá'],
      ['welcome', 'bem-vindo'],
      ['goodbye', 'adeus'],
      ['game over', 'fim de jogo'],
      ['victory', 'vitória'],
      ['defeat', 'derrota'],
      ['castle', 'castelo'],
      ['throne', 'trono'],
      ['room', 'sala'],
      ['throne room', 'sala do trono'],
      ['castle throne room', 'sala do trono do castelo']
    ]);

    if (options.customDictionary) {
      for (const [k, v] of Object.entries(options.customDictionary)) {
        this.dictionary.set(k.toLowerCase().trim(), v);
      }
    }
  }

  /**
   * Traduz um único texto de forma determinística
   */
  async translate(text, context = {}) {
    if (!text || typeof text !== 'string') return text;

    const trimmed = text.trim();
    if (trimmed.length === 0) return text;

    // Preserva pontuação no início e fim
    const punctMatch = trimmed.match(/^([^a-zA-Z0-9\s]*)(.*?)([^a-zA-Z0-9\s]*)$/);
    const prefixPunct = punctMatch ? punctMatch[1] : '';
    const coreText = punctMatch ? punctMatch[2] : trimmed;
    const suffixPunct = punctMatch ? punctMatch[3] : '';

    if (!coreText) return text;

    // 1. Terminology Lock (Máxima Prioridade)
    for (const [term, lock] of this.terminologyLocks.entries()) {
      if (coreText.includes(term)) {
        return prefixPunct + coreText.split(term).join(lock) + suffixPunct;
      }
    }

    const lower = coreText.toLowerCase();

    // 2. Exact Match no dicionário
    if (this.dictionary.has(lower)) {
      const trans = this._matchCase(coreText, this.dictionary.get(lower));
      return prefixPunct + trans + suffixPunct;
    }

    // 3. Substituição por palavras com limites de palavra (\b)
    let replaced = coreText;
    let anySub = false;

    for (const [src, trans] of this.dictionary.entries()) {
      const regex = new RegExp(`\\b${this._escapeRegExp(src)}\\b`, 'gi');
      if (regex.test(replaced)) {
        replaced = replaced.replace(regex, (match) => this._matchCase(match, trans));
        anySub = true;
      }
    }

    if (anySub) {
      return prefixPunct + replaced + suffixPunct;
    }

    // 4. Fuzzy Matching leve com limiar de confiança estrito
    if (lower.length >= 4 && !lower.includes(' ')) {
      let bestMatch = null;
      let bestConfidence = 0;

      for (const [k, v] of this.dictionary.entries()) {
        if (!k.includes(' ') && Math.abs(k.length - lower.length) <= 2) {
          const dist = this._levenshtein(lower, k);
          const maxLen = Math.max(lower.length, k.length);
          const confidence = 1 - (dist / maxLen);

          if (confidence >= this.fuzzyConfidenceThreshold && confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = v;
          }
        }
      }

      if (bestMatch) {
        const trans = this._matchCase(coreText, bestMatch);
        return prefixPunct + trans + suffixPunct;
      }
    }

    return text;
  }

  /**
   * Traduz um lote de strings de forma eficiente
   */
  async translateBatch(items, context = {}) {
    const results = [];
    for (const item of items) {
      const original = typeof item === 'string' ? item : (item.text || item.original || '');
      const translation = await this.translate(original, context);
      results.push({ original, translation });
    }
    return results;
  }

  _matchCase(original, translated) {
    if (!original || !translated) return translated;
    if (original === original.toUpperCase()) return translated.toUpperCase();
    if (original[0] === original[0].toUpperCase()) {
      return translated.charAt(0).toUpperCase() + translated.slice(1);
    }
    return translated.toLowerCase();
  }

  _escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

module.exports = LocalDictionaryProvider;
