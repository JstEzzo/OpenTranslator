/**
 * TranslationProvider — Provedor de tradução desacoplado.
 * Implementa suporte Offline-First através de dicionário local integrado,
 * eliminando dependência obrigatória de serviços em nuvem para execução básica.
 */
class TranslationProvider {
  constructor(name = 'OfflineDictionaryProvider') {
    this.name = name;
    this.dictionary = new Map([
      ['start', 'iniciar'],
      ['new game', 'novo jogo'],
      ['load game', 'carregar jogo'],
      ['continue', 'continuar'],
      ['options', 'opções'],
      ['settings', 'configurações'],
      ['exit', 'sair'],
      ['quit', 'sair'],
      ['save', 'salvar'],
      ['load', 'carregar'],
      ['yes', 'sim'],
      ['no', 'não'],
      ['back', 'voltar'],
      ['cancel', 'cancelar'],
      ['confirm', 'confirmar'],
      ['attack', 'atacar'],
      ['defend', 'defender'],
      ['item', 'item'],
      ['items', 'itens'],
      ['magic', 'magia'],
      ['skill', 'habilidade'],
      ['status', 'status'],
      ['equip', 'equipar'],
      ['hello', 'olá'],
      ['goodbye', 'adeus'],
      ['quest', 'missão'],
      ['map', 'mapa']
    ]);
  }

  async translate(text, context = {}) {
    const clean = (text || '').trim().toLowerCase();
    if (this.dictionary.has(clean)) {
      return { ok: true, original: text, translated: this.dictionary.get(clean), source: 'offline_dict' };
    }

    // Se não estiver no mini dicionário offline, retorna mock com prefixo se em teste
    return {
      ok: true,
      original: text,
      translated: context.mockPrefix ? `${context.mockPrefix} ${text}` : text,
      source: 'offline_fallback'
    };
  }

  async translateBatch(texts = [], context = {}) {
    const results = [];
    for (const t of texts) {
      results.push(await this.translate(t, context));
    }
    return results;
  }

  supportsBatch() { return true; }
  supportsOffline() { return true; }
}

module.exports = TranslationProvider;
