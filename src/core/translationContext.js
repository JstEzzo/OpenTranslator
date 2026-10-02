/**
 * OpenTranslator — TranslationContext
 * 
 * Modela o contexto semântico compacto para uma unidade de texto:
 * - source: Arquivo de origem ou fonte de runtime (ex: "data/Map001.json", "DialogueHook")
 * - speaker: Nome da personagem que está falando (ex: "Aldo", "Narrador")
 * - scene: Cena, mapa ou tela atual (ex: "TownSquare", "GameOverScreen")
 * - component: Componente da UI (ex: "ActionMenu/BtnAttack", "SubtitleLayer")
 * - previous: Texto imediatamente anterior na sequência de diálogo
 * - next: Texto imediatamente posterior (se conhecido no fluxo)
 * - menu: Se pertence a um menu ou escolha de opções
 * - character: Identificador único do personagem (ex: "hero_char_01")
 * - game: Identificador do jogo
 * 
 * Regra: O contexto gerado é compacto para não sobrecarregar cache ou providers.
 */

class TranslationContext {
  constructor(params = {}) {
    this.source = params.source || '';
    this.speaker = params.speaker || '';
    this.scene = params.scene || '';
    this.component = params.component || '';
    this.previous = params.previous ? String(params.previous).slice(0, 100) : '';
    this.next = params.next ? String(params.next).slice(0, 100) : '';
    this.menu = Boolean(params.menu);
    this.character = params.character || '';
    this.game = params.game || '';
  }

  /**
   * Retorna representação hash única para busca exata de contexto
   */
  getContextSignature() {
    const parts = [
      this.game,
      this.scene,
      this.character || this.speaker,
      this.component,
      this.menu ? 'menu' : 'narrative'
    ];
    return parts.filter(Boolean).join('|');
  }

  /**
   * Serializa de forma ultra compacta para metadados ou logs
   */
  toCompactJSON() {
    const res = {};
    if (this.speaker) res.spk = this.speaker;
    if (this.scene) res.scn = this.scene;
    if (this.component) res.cmp = this.component;
    if (this.character) res.chr = this.character;
    if (this.menu) res.mnu = 1;
    if (this.source) res.src = this.source;
    return res;
  }
}

module.exports = TranslationContext;
