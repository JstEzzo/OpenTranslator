/**
 * OpenTranslator - LocalDictionaryProvider
 * 
 * Provedor de tradução determinístico, 100% offline e local para laboratório e testes E2E reais.
 * Classificação oficial: LAB_TRANSLATION_PROVIDER
 * 
 * - Sem IA pesada, sem LLM, sem embeddings, sem dependência de internet.
 * - Suporta dicionário determinístico de termos de jogos (UI, menus, diálogos comuns).
 * - Suporta fuzzy matching leve (Levenshtein / token overlap) quando exact match falha.
 * - Preserva rigorosamente formatação, pontuação e casing original.
 */

class LocalDictionaryProvider {
  constructor(options = {}) {
    this.id = 'lab-dictionary';
    this.name = 'Local Deterministic Dictionary Provider';
    this.type = 'LAB_TRANSLATION_PROVIDER';
    this.targetLanguage = options.targetLanguage || 'pt-BR';
    this.terminologyLocks = new Map(options.terminologyLocks || []);

    // Dicionário base determinístico comum em jogos
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
      ['sword', 'espada'],
      ['shield', 'escudo'],
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

    // 1. Terminology Lock (Regra mais forte)
    for (const [term, lock] of this.terminologyLocks.entries()) {
      if (text.includes(term)) {
        text = text.split(term).join(lock);
      }
    }

    const lower = trimmed.toLowerCase();

    // 2. Exact Match no dicionário
    if (this.dictionary.has(lower)) {
      return this._matchCase(trimmed, this.dictionary.get(lower));
    }

    // 3. Substituição por partes / palavras-chave conhecidas
    let replaced = text;
    let anySub = false;

    for (const [src, trans] of this.dictionary.entries()) {
      const regex = new RegExp(`\\b${this._escapeRegExp(src)}\\b`, 'gi');
      if (regex.test(replaced)) {
        replaced = replaced.replace(regex, (match) => this._matchCase(match, trans));
        anySub = true;
      }
    }

    if (anySub) {
      return replaced;
    }

    // 4. Fuzzy match leve para termos simples (distância de Levenshtein <= 2)
    if (lower.length >= 4 && !lower.includes(' ')) {
      let bestMatch = null;
      let bestDist = Infinity;
      for (const [k, v] of this.dictionary.entries()) {
        if (!k.includes(' ') && Math.abs(k.length - lower.length) <= 2) {
          const dist = this._levenshtein(lower, k);
          if (dist <= 2 && dist < bestDist) {
            bestDist = dist;
            bestMatch = v;
          }
        }
      }
      if (bestMatch && bestDist <= 2) {
        return this._matchCase(trimmed, bestMatch);
      }
    }

    // Se nenhuma tradução foi encontrada no dicionário offline
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
