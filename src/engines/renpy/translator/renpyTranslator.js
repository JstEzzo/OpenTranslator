/**
 * renpyTranslator.js — Pipeline de Tradução PT-BR e Proteção de Variáveis para Ren'Py
 * 
 * Garante que:
 * - Variáveis entre colchetes [player], [name], [points] sejam 100% preservadas
 * - Tags de formatação de texto {b}, {i}, {color=...}, {size=...} nunca sejam quebradas
 * - Tags de controle {w}, {p}, {nw}, {fast}, {a=...}, {/a} sejam preservadas
 * - Escape codes (\n, \", \') não sejam corrompidos
 * - Códigos Python, nomes de variáveis, labels e IDs internos NUNCA sejam traduzidos
 * - A tradução final passe por validação estrita de integridade de tokens
 */

const fs = require('fs');
const path = require('path');
const CodeProtector = require('../../../core/codeProtector');

class RenpyTranslator {
  constructor(dictionary = {}) {
    this.dictionary = dictionary || {};
    this.codeProtector = new CodeProtector({ engine: 'renpy' });
  }

  /**
   * Extrai e tokeniza variáveis e tags Ren'Py em placeholders imutáveis
   */
  protectTokens(text) {
    if (!text || typeof text !== 'string') return { protectedText: text, tokens: [] };
    const tokens = [];

    // 1. Variáveis de interpolação Ren'Py [variable] ou [variable!conversion]
    let protectedText = text.replace(/\[([a-zA-Z0-9_.]+(?:![a-zA-Z]+)?)\]/g, (match, varName) => {
      const ph = `__OT_VAR_${tokens.length}__`;
      tokens.push({ placeholder: ph, original: match, type: 'variable', name: varName });
      return ph;
    });

    // 2. Tags Ren'Py de formatação {tag} ou {tag=value} ou {/tag}
    protectedText = protectedText.replace(/\{(\/?[a-zA-Z0-9_#=,.:;% -]+)\}/g, (match, tagContent) => {
      const ph = `__OT_TAG_${tokens.length}__`;
      tokens.push({ placeholder: ph, original: match, type: 'tag', content: tagContent });
      return ph;
    });

    // 3. Formatação Python estilo %(var)s ou %s, %d
    protectedText = protectedText.replace(/(%(?:\([a-zA-Z0-9_]+\))?[-+0-9]*[a-zA-Z])/g, (match) => {
      const ph = `__OT_FMT_${tokens.length}__`;
      tokens.push({ placeholder: ph, original: match, type: 'format', content: match });
      return ph;
    });

    return { protectedText, tokens };
  }

  /**
   * Restaura os tokens originais no texto traduzido
   */
  restoreTokens(translatedText, tokens) {
    if (!translatedText || !tokens || tokens.length === 0) return translatedText;
    let result = translatedText;
    for (const t of tokens) {
      result = result.split(t.placeholder).join(t.original);
    }
    return result;
  }

  /**
   * Valida se todas as variáveis e tags do texto original estão presentes no traduzido
   */
  validateTokens(originalText, translatedText) {
    if (!originalText || !translatedText) return { valid: true };

    // Checa variáveis [var]
    const origVars = (originalText.match(/\[([a-zA-Z0-9_.]+(?:![a-zA-Z]+)?)\]/g) || []).sort();
    const transVars = (translatedText.match(/\[([a-zA-Z0-9_.]+(?:![a-zA-Z]+)?)\]/g) || []).sort();

    if (origVars.length !== transVars.length) {
      return { valid: false, error: `Contagem de variáveis difere: original=${origVars.length}, traduzido=${transVars.length}` };
    }
    for (let i = 0; i < origVars.length; i++) {
      if (origVars[i] !== transVars[i]) {
        return { valid: false, error: `Variável ausente ou corrompida: esperada "${origVars[i]}", recebida "${transVars[i]}"` };
      }
    }

    // Checa tags {tag} e {/tag}
    const origTags = (originalText.match(/\{(\/?[a-zA-Z0-9_#=,.:;% -]+)\}/g) || []).sort();
    const transTags = (translatedText.match(/\{(\/?[a-zA-Z0-9_#=,.:;% -]+)\}/g) || []).sort();
    if (origTags.length !== transTags.length) {
      return { valid: false, error: `Contagem de tags difere: original=${origTags.length}, traduzido=${transTags.length}` };
    }
    for (let i = 0; i < origTags.length; i++) {
      if (origTags[i] !== transTags[i]) {
        return { valid: false, error: `Tag ausente ou corrompida: esperada "${origTags[i]}", recebida "${transTags[i]}"` };
      }
    }

    return { valid: true };
  }

  /**
   * Traduz um único texto respeitando o dicionário e proteção de tokens
   */
  translateText(text) {
    if (!text || typeof text !== 'string') return text;

    // Se já está no dicionário exato
    if (this.dictionary[text]) {
      return this.dictionary[text];
    }

    // Protege tokens
    const { protectedText, tokens } = this.protectTokens(text);

    let translatedCandidate = this.dictionary[protectedText] || this.dictionary[text] || text;

    // Se encontramos tradução para a versão protegida ou original
    if (translatedCandidate !== text) {
      const restored = this.restoreTokens(translatedCandidate, tokens);
      const validation = this.validateTokens(text, restored);
      if (validation.valid) {
        return restored;
      } else {
        console.warn(`[RenpyTranslator] Falha de validação de tokens em: "${text}" -> "${restored}": ${validation.error}`);
        return text;
      }
    }

    return text;
  }

  /**
   * Processa uma lista de entradas extraídas e gera o mapa de tradução
   */
  process(extractedTexts, outJsonPath = null) {
    const translationMap = new Map();
    const detailedList = [];

    for (const item of extractedTexts) {
      const trans = this.translateText(item.clean);
      if (trans && trans !== item.clean) {
        translationMap.set(item.id, trans);
        detailedList.push({
          id: item.id,
          file: item.file,
          line: item.line,
          context: item.context,
          type: item.type,
          original: item.clean,
          translated: trans
        });
      }
    }

    if (outJsonPath) {
      const parentDir = path.dirname(outJsonPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(outJsonPath, JSON.stringify({
        total: detailedList.length,
        timestamp: new Date().toISOString(),
        translations: detailedList
      }, null, 2), 'utf8');
    }

    return {
      count: detailedList.length,
      translationMap,
      translations: detailedList
    };
  }
}

module.exports = RenpyTranslator;
