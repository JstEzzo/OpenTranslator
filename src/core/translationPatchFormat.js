/**
 * OpenTranslator - TranslationPatchFormat
 * 
 * Formato canônico unificado de patch de tradução (.otpatch / JSON v3.1):
 * - Metadata unificado: patchId, gameId, gameHash, gameVersion, engine, runtime, targetLanguage, provider, createdAt
 * - Entries unificadas: id, location, original, translation, sourceHash, fileHash, context, status
 * - Incremental Patching: computa delta (new, changed, unchanged, obsolete)
 * - Version-Aware: invalida ou marca para revisão caso a versão do jogo ou hash do arquivo mude
 */

const crypto = require('crypto');
const TranslationPatchSchema = require('./translationPatchSchema');

class TranslationPatchFormat {
  /**
   * Cria um novo pacote de patch estruturado em conformidade com o schema canônico
   */
  static createPatch(metadata = {}, entries = []) {
    const raw = {
      otPatchVersion: '3.0',
      metadata: {
        patchId: metadata.patchId || `patch_${Date.now()}`,
        gameId: metadata.gameId || 'game',
        gameHash: metadata.gameHash || '',
        gameVersion: metadata.gameVersion || '1.0',
        engine: metadata.engine || 'generic',
        runtime: metadata.runtime || 'unknown',
        targetLanguage: metadata.targetLanguage || 'pt-BR',
        provider: metadata.provider || 'OpenTranslator Core',
        createdAt: metadata.createdAt || Date.now()
      },
      entries: entries.map(ent => ({
        id: ent.id || crypto.createHash('sha256').update(ent.original).digest('hex').slice(0, 16),
        location: ent.location || 'unknown',
        original: ent.original,
        translation: ent.translation,
        sourceHash: ent.sourceHash || crypto.createHash('sha256').update(ent.original || '').digest('hex').slice(0, 16),
        fileHash: ent.fileHash || '',
        context: ent.context || '',
        status: ent.status || 'VERIFIED'
      }))
    };

    return TranslationPatchSchema.normalize(raw);
  }

  /**
   * Computa o delta incremental entre um patch existente e uma nova versão de arquivos do jogo
   */
  static computeDiff(existingPatch, currentSources = []) {
    const norm = TranslationPatchSchema.normalize(existingPatch);
    const existingMap = new Map();
    const origMap = new Map();
    if (norm && norm.entries) {
      for (const ent of norm.entries) {
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
