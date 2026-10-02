/**
 * OpenTranslator - TranslationPatchSchema
 * 
 * Validador e normalizador oficial do schema canônico .otpatch (v3.x):
 * 
 * Contrato Canônico Unificado:
 * {
 *   "otPatchVersion": "3.1",
 *   "metadata": {
 *     "patchId": "string",
 *     "gameId": "string",
 *     "gameHash": "string",
 *     "gameVersion": "string",
 *     "engine": "string",
 *     "runtime": "string",
 *     "targetLanguage": "string",
 *     "provider": "string",
 *     "createdAt": number|string
 *   },
 *   "entries": [
 *     {
 *       "id": "string",
 *       "location": "string",
 *       "original": "string",
 *       "translation": "string",
 *       "sourceHash": "string",
 *       "fileHash": "string",
 *       "context": "string",
 *       "status": "string"
 *     }
 *   ]
 * }
 */

const crypto = require('crypto');

class TranslationPatchSchema {
  /**
   * Valida se um objeto patch adere estritamente ao schema canônico v3.x
   * @param {object} patch
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(patch) {
    const errors = [];

    if (!patch || typeof patch !== 'object') {
      return { valid: false, errors: ['Patch deve ser um objeto JSON não-nulo'] };
    }

    // 1. Validação de Versão
    if (!patch.otPatchVersion || !String(patch.otPatchVersion).startsWith('3.')) {
      errors.push(`Versão inválida: esperado 3.x, recebido [${patch.otPatchVersion || 'ausente'}]`);
    }

    // 2. Validação de Metadata
    if (!patch.metadata || typeof patch.metadata !== 'object') {
      errors.push('Campo obrigatório [metadata] ausente ou inválido');
    } else {
      const meta = patch.metadata;
      if (!meta.patchId || typeof meta.patchId !== 'string') {
        errors.push('metadata.patchId obrigatório');
      }
      if (!meta.gameId || typeof meta.gameId !== 'string') {
        errors.push('metadata.gameId obrigatório');
      }
      if (!meta.targetLanguage || typeof meta.targetLanguage !== 'string') {
        errors.push('metadata.targetLanguage obrigatório');
      }
    }

    // 3. Validação de Entries
    if (!Array.isArray(patch.entries)) {
      errors.push('Campo obrigatório [entries] deve ser um Array');
    } else {
      const seenIds = new Set();
      const seenEntries = new Set();

      for (let i = 0; i < patch.entries.length; i++) {
        const ent = patch.entries[i];
        if (!ent || typeof ent !== 'object') {
          errors.push(`Entrada [${i}] não é um objeto válido`);
          continue;
        }

        // Validação de id
        if (!ent.id || typeof ent.id !== 'string') {
          errors.push(`Entrada [${i}] sem id válido`);
        } else {
          if (seenIds.has(ent.id)) {
            errors.push(`ID duplicado detectado: [${ent.id}] na entrada [${i}]`);
          }
          seenIds.add(ent.id);
        }

        // Validação de location
        if (!ent.location || typeof ent.location !== 'string') {
          errors.push(`Entrada [${i}] sem location válida`);
        }

        // Validação de original & translation
        if (typeof ent.original !== 'string') {
          errors.push(`Entrada [${i}] sem campo original`);
        }
        if (typeof ent.translation !== 'string') {
          errors.push(`Entrada [${i}] sem campo translation`);
        }

        // Validação de duplicatas de texto no mesmo arquivo
        const entryKey = `${ent.location || ''}:::${ent.original || ''}`;
        if (seenEntries.has(entryKey)) {
          errors.push(`Entrada duplicada no mesmo arquivo detectada: [${ent.location}] -> "${ent.original.slice(0, 30)}"`);
        }
        seenEntries.add(entryKey);

        // Validação de formato de sourceHash (se presente)
        if (ent.sourceHash && typeof ent.sourceHash === 'string') {
          if (!/^[0-9a-fA-F]+$/.test(ent.sourceHash)) {
            errors.push(`sourceHash inválido na entrada [${i}]: esperado hexadecimal, recebido [${ent.sourceHash}]`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Normaliza patches legados para o schema canônico 3.1
   */
  static normalize(patch) {
    if (!patch || typeof patch !== 'object') return null;

    const metadata = {
      patchId: patch.metadata?.patchId || patch.patchId || `patch_${Date.now()}`,
      gameId: patch.metadata?.gameId || patch.gameId || 'generic_game',
      gameHash: patch.metadata?.gameHash || patch.gameHash || '',
      gameVersion: patch.metadata?.gameVersion || patch.gameVersion || '1.0.0',
      engine: patch.metadata?.engine || patch.engine || 'generic',
      runtime: patch.metadata?.runtime || patch.runtime || 'unknown',
      targetLanguage: patch.metadata?.targetLanguage || patch.targetLanguage || 'pt-BR',
      provider: patch.metadata?.provider || patch.provider || 'OpenTranslator',
      createdAt: patch.metadata?.createdAt || patch.createdAt || Date.now()
    };

    const entries = (patch.entries || []).map((ent, idx) => ({
      id: ent.id || crypto.createHash('sha256').update(ent.original || `${idx}`).digest('hex').slice(0, 16),
      location: ent.location || ent.file || 'data/System.json',
      original: String(ent.original ?? ''),
      translation: String(ent.translation ?? ''),
      sourceHash: ent.sourceHash || crypto.createHash('sha256').update(ent.original || '').digest('hex').slice(0, 16),
      fileHash: ent.fileHash || '',
      context: ent.context || ent.scene || '',
      status: ent.status || 'VERIFIED'
    }));

    return {
      otPatchVersion: '3.0',
      metadata,
      entries
    };
  }
}

module.exports = TranslationPatchSchema;
