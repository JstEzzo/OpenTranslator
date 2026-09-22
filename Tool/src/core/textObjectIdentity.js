/**
 * OpenTranslator — TextObjectIdentity
 * 
 * Cria uma identidade multi-dimensional para qualquer string encontrada em runtime ou estaticamente:
 * - gameId: Hash único do jogo
 * - processId: PID do processo em execução
 * - sceneId: Nome ou hash da cena/mapa atual
 * - componentId: Caminho do nó/componente na hierarquia (ex: UI/Canvas/DialogueBox/Text)
 * - sourceType: Tipo de fonte (dialogue, menu, button, hud, system, item)
 * - textHash: Hash SHA-256 do texto original
 * - position: Coordenadas na tela ({ x, y, width, height })
 * - runtimeId: Endereço de memória ou ID de instância no runtime
 * 
 * Isso garante que o mesmo texto (ex: "Attack" ou "Voltar") usado em um botão
 * não seja confundido com o mesmo texto usado dentro de uma fala dramática.
 */

const crypto = require('crypto');

class TextObjectIdentity {
  constructor(params = {}) {
    this.gameId = params.gameId || 'default_game';
    this.processId = params.processId || 0;
    this.sceneId = params.sceneId || 'global';
    this.componentId = params.componentId || 'default_component';
    this.sourceType = params.sourceType || 'dialogue';
    this.text = params.text || '';
    this.position = params.position || null;
    this.runtimeId = params.runtimeId || null;

    this.textHash = crypto.createHash('sha256').update(this.text).digest('hex').slice(0, 16);
  }

  /**
   * Retorna uma chave única composta abrangendo componente e contexto
   */
  getCompositeKey() {
    const posStr = this.position ? `${Math.round(this.position.x || 0)},${Math.round(this.position.y || 0)}` : 'nopos';
    return `${this.gameId}:${this.sceneId}:${this.componentId}:${this.sourceType}:${this.textHash}:${posStr}`;
  }

  /**
   * Retorna uma chave canônica apenas por texto (para fallback de memória de tradução)
   */
  getTextKey() {
    return `text:${this.textHash}`;
  }

  /**
   * Serializa a identidade para logs ou pacotes de rede
   */
  toJSON() {
    return {
      gameId: this.gameId,
      processId: this.processId,
      sceneId: this.sceneId,
      componentId: this.componentId,
      sourceType: this.sourceType,
      textHash: this.textHash,
      position: this.position,
      runtimeId: this.runtimeId,
      compositeKey: this.getCompositeKey()
    };
  }
}

module.exports = TextObjectIdentity;
