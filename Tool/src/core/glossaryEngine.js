/**
 * OpenTranslator — GlossaryEngine
 * 
 * Gerenciador hierárquico de glossários e terminologias de tradução:
 * - Escopos: global -> game -> character -> scene
 * - Tipos de regras:
 *   - FORCED: Substituição obrigatória garantida (mesmo se provider traduzir diferente)
 *   - FORBIDDEN: Termos proibidos (ex: linguagem imprópria ou traduções erradas conhecidas)
 *   - PREFERRED: Tradução preferencial padrão
 * - Propriedades:
 *   - caseSensitive (sensibilidade a maiúsculas/minúsculas ou preservação de caixa)
 *   - regexSafe (garante limites de palavras \b e escape de caracteres especiais)
 */

class GlossaryEngine {
  constructor() {
    this.scopes = {
      global: new Map(),
      game: new Map(),       // gameId -> Map()
      character: new Map(),  // charId -> Map()
      scene: new Map()       // sceneId -> Map()
    };
  }

  /**
   * Adiciona uma regra de terminologia
   * @param {object} rule
   * @param {string} [rule.scope='global'] - 'global' | 'game' | 'character' | 'scene'
   * @param {string} [rule.scopeId=''] - ID do jogo, personagem ou cena
   * @param {string} rule.sourceTerm - Termo de origem (ex: "Gilgamesh", "Potion")
   * @param {string} [rule.targetTerm=''] - Termo traduzido obrigatório ou preferido
   * @param {'FORCED'|'FORBIDDEN'|'PREFERRED'} [rule.type='FORCED']
   * @param {boolean} [rule.caseSensitive=false]
   */
  addRule(rule) {
    const scope = rule.scope || 'global';
    const scopeId = rule.scopeId || 'default';
    const type = rule.type || 'FORCED';
    const caseSensitive = Boolean(rule.caseSensitive);

    let targetMap;
    if (scope === 'global') {
      targetMap = this.scopes.global;
    } else {
      if (!this.scopes[scope].has(scopeId)) {
        this.scopes[scope].set(scopeId, new Map());
      }
      targetMap = this.scopes[scope].get(scopeId);
    }

    const key = caseSensitive ? rule.sourceTerm : rule.sourceTerm.toLowerCase();
    targetMap.set(key, {
      sourceTerm: rule.sourceTerm,
      targetTerm: rule.targetTerm || '',
      type,
      caseSensitive,
      scope,
      scopeId
    });
  }

  /**
   * Coleta todas as regras ativas ordenadas por prioridade de escopo:
   * scene (mais específico) -> character -> game -> global (mais genérico)
   */
  _getActiveRules(context = {}) {
    const rules = [];

    // 1. Scene
    if (context.scene && this.scopes.scene.has(context.scene)) {
      rules.push(...Array.from(this.scopes.scene.get(context.scene).values()));
    }

    // 2. Character
    const charKey = context.character || context.speaker;
    if (charKey && this.scopes.character.has(charKey)) {
      rules.push(...Array.from(this.scopes.character.get(charKey).values()));
    }

    // 3. Game
    if (context.game && this.scopes.game.has(context.game)) {
      rules.push(...Array.from(this.scopes.game.get(context.game).values()));
    }

    // 4. Global
    rules.push(...Array.from(this.scopes.global.values()));

    // Ordena por comprimento decrescente para termos compostos terem precedência
    return rules.sort((a, b) => b.sourceTerm.length - a.sourceTerm.length);
  }

  /**
   * Aplica termos forçados (FORCED) no texto traduzido
   */
  apply(text, context = {}) {
    if (!text || typeof text !== 'string') return text;

    const rules = this._getActiveRules(context);
    let result = text;

    for (const rule of rules) {
      if (rule.type !== 'FORCED' || !rule.targetTerm) continue;

      const escaped = rule.sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = rule.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escaped}\\b`, flags);

      result = result.replace(regex, rule.targetTerm);
    }

    return result;
  }

  /**
   * Valida se o texto contém termos proibidos (FORBIDDEN)
   */
  validate(text, context = {}) {
    if (!text || typeof text !== 'string') return { valid: true, violations: [] };

    const rules = this._getActiveRules(context);
    const violations = [];

    for (const rule of rules) {
      if (rule.type !== 'FORBIDDEN') continue;

      const escaped = rule.sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = rule.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escaped}\\b`, flags);

      if (regex.test(text)) {
        violations.push({
          term: rule.sourceTerm,
          scope: rule.scope,
          scopeId: rule.scopeId
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

module.exports = GlossaryEngine;
