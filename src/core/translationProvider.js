/**
 * TranslationProvider — Provedor de tradução desacoplado.
 * Implementa suporte Offline-First através de dicionário local integrado,
 * eliminando dependência obrigatória de serviços em nuvem para execução básica.
 *
 * ---------------------------------------------------------------------------
 * FASE 3 / PASSO 25 — FIM DO "ok:true SEM TRADUZIR"
 *
 * O corpo original terminava assim:
 *
 *     return {
 *       ok: true,
 *       original: text,
 *       translated: context.mockPrefix ? `${context.mockPrefix} ${text}` : text,
 *       source: 'offline_fallback'
 *     };
 *
 * Dois defeitos:
 *
 *  1. Sem entrada no dicionário, devolvia `ok:true` com `translated` igual ao
 *     ORIGINAL. Quem escrevesse esse campo no jogo gravaria o japonês e
 *     reportaria sucesso. Sucesso sem tradução — o defeito mais direto
 *     possível, porque nem exigia erro de rede.
 *
 *  2. `context.mockPrefix` fabricava texto("[PREFIX] こんにちは") que não é
 *     tradução nenhuma, marcado como sucesso. Um fixture de teste vazando
 *     para produção: qualquer chamador que passasse essa flag escreveria lixo
 *     nos arquivos do jogo.
 *
 * Agora o provedor devolve o CONTRATO (src/core/translationResult.js): em
 * falha, `translation` é `null` e o original fica em `original`. O mockPrefix
 * só funciona com opt-in explícito e é rotulado como o que é.
 */
const {
  TRANSLATION_STATUS: S, normalize,
} = require('./translationResult');

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
    const ctx = { sourceText: typeof text === 'string' ? text : '', provider: this.name };

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return normalize(
        { status: S.UNCHANGED, reason: 'entrada vazia, whitespace-only ou não-string' },
        ctx,
      );
    }

    const clean = text.trim().toLowerCase();
    if (this.dictionary.has(clean)) {
      return normalize(
        { status: S.TRANSLATED, translation: this.dictionary.get(clean) },
        ctx,
      );
    }

    // Opt-in explícito e consciente: mockPrefix existe para testes E2E e é
    // rotulado como MOCK no resultado, para nunca ser confundido com uma
    // tradução real. Sem a flag, NADA é inventado.
    if (context.mockPrefix) {
      return normalize(
        {
          status: S.TRANSLATED,
          translation: `${context.mockPrefix} ${text}`,
          reason: 'MOCK: texto prefixado artificialmente para teste',
          meta: { isMock: true },
        },
        ctx,
      );
    }

    // Sem dicionário e sem mock: NÃO é sucesso e NÃO é tradução.
    return normalize(
      {
        status: S.NOT_TRANSLATED,
        reason: `termo ausente no dicionário offline: "${text.slice(0, 60)}"`,
      },
      ctx,
    );
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
