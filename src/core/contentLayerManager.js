/**
 * OpenTranslator — ContentLayerManager
 * 
 * Gerenciador e classificador de camadas de conteúdo:
 *   - GAME: Dados base do jogo original
 *   - DLC: Conteúdos adicionais e expansões
 *   - MOD: Modificações de terceiros ou plugins da comunidade
 *   - PATCH: Patches de correção ou atualizações
 *   - USER_CONTENT: Saves, logs, configurações do jogador (PROTEÇÃO ESTRITA: NUNCA SOBRESCREVER)
 */

const path = require('path');

const ContentLayer = {
  GAME: 'GAME',
  DLC: 'DLC',
  MOD: 'MOD',
  PATCH: 'PATCH',
  USER_CONTENT: 'USER_CONTENT'
};

class ContentLayerManager {
  /**
   * Classifica um caminho de arquivo em uma das camadas de conteúdo.
   * @param {string} filePath - Caminho relativo ou absoluto do arquivo
   * @param {string} [gameDir='']
   * @returns {string} ContentLayer
   */
  static classifyPath(filePath, gameDir = '') {
    if (!filePath || typeof filePath !== 'string') return ContentLayer.GAME;

    const relPath = gameDir ? path.relative(gameDir, filePath).replace(/\\/g, '/') : filePath.replace(/\\/g, '/');
    const lower = relPath.toLowerCase();

    // 1. USER_CONTENT (Saves, logs, configs do jogador - Prioridade máxima de segurança)
    if (
      lower.startsWith('save/') ||
      lower.startsWith('saves/') ||
      lower.includes('/save/') ||
      lower.includes('/saves/') ||
      lower.endsWith('.save') ||
      lower.endsWith('.rpgsave') ||
      lower.endsWith('.sav') ||
      lower.includes('savedata') ||
      lower.startsWith('screenshots/') ||
      lower.startsWith('logs/') ||
      lower === 'config.rpgsave' ||
      lower === 'global.rpgsave'
    ) {
      return ContentLayer.USER_CONTENT;
    }

    // 2. MODS (Pastas de modificação ou plugins de terceiros)
    if (
      lower.startsWith('mods/') ||
      lower.startsWith('mod/') ||
      lower.includes('/mods/') ||
      lower.includes('/mod/') ||
      lower.startsWith('custom/') ||
      lower.includes('/custom/')
    ) {
      return ContentLayer.MOD;
    }

    // 3. DLC (Downloadable Content / Expansões)
    if (
      lower.startsWith('dlc/') ||
      lower.includes('/dlc/') ||
      lower.startsWith('expansion/') ||
      lower.includes('/expansion/') ||
      lower.includes('_dlc') ||
      lower.includes('dlc_')
    ) {
      return ContentLayer.DLC;
    }

    // 4. PATCH (Atualizações ou patches)
    if (
      lower.startsWith('patch/') ||
      lower.includes('/patch/') ||
      lower.startsWith('update/') ||
      lower.includes('/update/') ||
      lower.startsWith('patch_') ||
      lower.includes('/patch_')
    ) {
      return ContentLayer.PATCH;
    }

    // 5. GAME (Base)
    return ContentLayer.GAME;
  }

  /**
   * Verifica se o arquivo pertence a uma camada segura para tradução.
   * USER_CONTENT nunca deve ser modificado por padrão!
   */
  static isSafeForTranslation(filePath, gameDir = '') {
    const layer = this.classifyPath(filePath, gameDir);
    return layer !== ContentLayer.USER_CONTENT;
  }

  /**
   * Separa uma lista de textos extraídos pelas respectivas camadas de conteúdo.
   * @param {Array<object>} texts
   * @param {string} gameDir
   * @returns {{ GAME: Array, DLC: Array, MOD: Array, PATCH: Array, USER_CONTENT: Array }}
   */
  static separateTextsByLayer(texts = [], gameDir = '') {
    const separated = {
      [ContentLayer.GAME]: [],
      [ContentLayer.DLC]: [],
      [ContentLayer.MOD]: [],
      [ContentLayer.PATCH]: [],
      [ContentLayer.USER_CONTENT]: []
    };

    for (const t of texts) {
      const layer = this.classifyPath(t.file || '', gameDir);
      t.layer = layer;
      if (separated[layer]) {
        separated[layer].push(t);
      } else {
        separated[ContentLayer.GAME].push(t);
      }
    }

    return separated;
  }
}

module.exports = ContentLayerManager;
module.exports.ContentLayer = ContentLayer;
