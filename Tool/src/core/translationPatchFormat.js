/**
 * OpenTranslator — TranslationPatchFormat
 * 
 * Formato canônico de patch de tradução (.otpatch / JSON):
 * - Header: gameId, gameHash, gameVersion, targetLanguage, provider, timestamp
 * - Entries: id, original, translation, location, fileHash, sourceHash, status, context
 * - Incremental Patching: computa delta (new, changed, unchanged, obsolete)
 * - Version-Aware: invalida ou marca para revisão caso a versão do jogo ou hash do arquivo mude
 */

const crypto = require('crypto');

class TranslationPatchFormat {
  /**
   * Cria um novo pacote de patch estruturado
   */
  static createPatch(metadata = {}, entries = []) {
    const patch = {
      otPatchVersion: '3.0',
      gameId: metadata.gameId || 'game',
      gameHash: metadata.gameHash || '',
      gameVersion: metadata.gameVersion || '1.0',
      targetLanguage: metadata.targetLanguage || 'pt_BR',
      provider: metadata.provider || 'OpenTranslator Core',
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: Date.now(),
      stats: {
        totalEntries: entries.length,
        verifiedCount: entries.filter(e => e.status === 'VERIFIED').length,
        needsReviewCount: entries.filter(e => e.status === 'NEEDS_REVIEW').length
      },
      entries: entries.map(ent => ({
        id: ent.id || crypto.createHash('sha256').update(ent.original).digest('hex').slice(0, 16),
        original: ent.original,
        translation: ent.translation,
        location: ent.location || 'unknown',
        fileHash: ent.fileHash || '',
        status: ent.status || 'VERIFIED',
        context: ent.context || null,
        updatedAt: ent.updatedAt || Date.now()
      }))
    };

    return patch;
  }

  /**
   * Computa o delta incremental entre um patch existente e uma nova versão de arquivos do jogo
   * @param {object} existingPatch - Patch anterior carregado
   * @param {Array<{ original: string, location: string, fileHash: string }>} currentSources - Novas strings extraídas
   * @returns {{ unchanged: Array, newEntries: Array, changed: Array, obsolete: Array }}
   */
  static computeDiff(existingPatch, currentSources = []) {
    const existingMap = new Map();
    const origMap = new Map();
    if (existingPatch && existingPatch.entries) {
      for (const ent of existingPatch.entries) {
        existingMap.set(ent.id, ent);
        origMap.set(ent.original, ent);
      }
    }

    const seenIds = new Set();
    const seenOriginals = new Set();
    const unchanged = [];
    const newEntries = [];
    const changed = [];
    const obsolete = [];

    for (const src of currentSources) {
      const id = crypto.createHash('sha256').update(src.original).digest('hex').slice(0, 16);
      const prev = existingMap.get(id) || origMap.get(src.original);

      if (prev) {
        seenIds.add(prev.id);
        seenOriginals.add(prev.original);
        if (prev.fileHash && src.fileHash && prev.fileHash !== src.fileHash) {
          // Arquivo de origem mudou hash, marca para revisão
          changed.push({
            id: prev.id,
            original: src.original,
            previousTranslation: prev.translation,
            location: src.location,
            reason: 'SOURCE_FILE_HASH_CHANGED'
          });
        } else {
          unchanged.push(prev);
        }
      } else {
        seenIds.add(id);
        seenOriginals.add(src.original);
        newEntries.push({
          id,
          original: src.original,
          location: src.location,
          fileHash: src.fileHash || '',
          status: 'NEW'
        });
      }
    }

    // Identifica entradas obsoletas que não existem mais no jogo atualizado
    for (const [id, ent] of existingMap.entries()) {
      if (!seenIds.has(ent.id) && !seenOriginals.has(ent.original)) {
        obsolete.push({
          ...ent,
          status: 'OBSOLETE'
        });
      }
    }

    return {
      stats: {
        unchangedCount: unchanged.length,
        newCount: newEntries.length,
        changedCount: changed.length,
        obsoleteCount: obsolete.length
      },
      unchanged,
      newEntries,
      changed,
      obsolete
    };
  }
}

module.exports = TranslationPatchFormat;
