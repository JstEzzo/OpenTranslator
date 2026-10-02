/**
 * OpenTranslator — Translation QA Engine
 * Validador dedicado de integridade técnica, sintática e de proteção.
 */

class QAEngine {
  static validate(original, translated, options = {}) {
    const qaErrors = [];
    const qaWarnings = [];

    if (typeof original !== "string") original = String(original || "");
    if (typeof translated !== "string") translated = String(translated || "");

    // 1. Strings vazias
    if (original.trim().length > 0 && translated.trim().length === 0) {
      qaErrors.push("Tradução vazia para texto original não-vazio.");
    }

    // 2. Integridade de Tokens de Proteção
    const tokenRegex = /⟦OT_[A-Z]+_\d+⟧/g;
    const origTokens = (original.match(tokenRegex) || []).sort();
    const transTokens = (translated.match(tokenRegex) || []).sort();

    if (origTokens.length !== transTokens.length) {
      qaErrors.push("Discrepância na contagem de tokens de proteção: esperado " + origTokens.length + ", encontrado " + transTokens.length + ".");
    } else {
      for (let i = 0; i < origTokens.length; i++) {
        if (origTokens[i] !== transTokens[i]) {
          qaErrors.push("Token corrompido: esperado " + origTokens[i] + ", encontrado " + transTokens[i] + ".");
        }
      }
    }

    // 3. Validação de tokens esperados
    if (options.expectedTokens && Array.isArray(options.expectedTokens)) {
      for (const tok of options.expectedTokens) {
        const tokenStr = typeof tok === 'string' ? tok : (tok.token || '');
        const rawStr = typeof tok === 'object' && tok.raw ? tok.raw : '';
        const hasToken = tokenStr && translated.includes(tokenStr);
        const hasRaw = rawStr && translated.includes(rawStr);
        if (!hasToken && !hasRaw) {
          qaErrors.push("Token obrigatório '" + (rawStr || tokenStr) + "' (" + (tok.type || 'TOKEN') + ") ausente na tradução.");
        }
      }
    }

    // 4. Balanço de chaves e colchetes
    const checkBalance = (str, openCh, closeCh) => {
      let bal = 0;
      for (const c of str) {
        if (c === openCh) bal++;
        else if (c === closeCh) {
          bal--;
          if (bal < 0) return false;
        }
      }
      return bal === 0;
    };

    if (!checkBalance(translated, '{', '}')) {
      qaErrors.push("Desbalanceamento de chaves '{ }' na tradução.");
    }
    if (!checkBalance(translated, '[', ']')) {
      qaWarnings.push("Desbalanceamento de colchetes '[ ]' na tradução.");
    }

    // 5. Preservação de URLs
    const urlRegex = /https?:\/\/[\w\.-]+(?:\/[\w\.-]*)*(?:\?[\w\.-=&%]*)?/gi;
    const origUrls = original.match(urlRegex) || [];
    const transUrls = translated.match(urlRegex) || [];
    for (const u of origUrls) {
      if (!transUrls.includes(u)) {
        qaWarnings.push("URL original '" + u + "' pode ter sido modificada.");
      }
    }

    // 6. Integridade de números
    const origNums = original.match(/\b\d+\b/g) || [];
    const transNums = translated.match(/\b\d+\b/g) || [];
    for (const n of origNums) {
      if (!transNums.includes(n)) {
        qaWarnings.push("Número '" + n + "' presente no original não foi localizado na tradução.");
      }
    }

    // 7. Normalização Unicode e codificação
    if (translated.includes('\uFFFD')) {
      qaErrors.push("Caractere de substituição Unicode detectado (corrupção de encoding).");
    }

    // 8. Tamanho anômalo
    if (original.length > 5 && translated.length > original.length * 3.5) {
      qaWarnings.push("Tradução excessivamente longa (" + translated.length + " vs " + original.length + " caracteres).");
    }

    // 9. Texto idêntico
    const words = original.trim().split(/\s+/);
    if (words.length >= 4 && original.trim() === translated.trim()) {
      qaWarnings.push("Texto idêntico ao original (possível frase não-traduzida).");
    }

    let qaStatus = "pass";
    if (qaErrors.length > 0) qaStatus = "fail";
    else if (qaWarnings.length > 0) qaStatus = "warn";

    return { qaStatus, qaErrors, qaWarnings };
  }
}

module.exports = QAEngine;
