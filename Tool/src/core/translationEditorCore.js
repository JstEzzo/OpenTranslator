/**
 * OpenTranslator — TranslationEditorCore
 * 
 * Núcleo do Editor de Tradução Profissional:
 * - Modelo virtualizado de dados (Original, Translation, Context, Source, Provider, Status, Scene)
 * - Filtros: untranslated, translated, manual, cache, warning, invalid, obsolete
 * - Busca instantânea e ordenação
 * - Validação rigorosa de regras de qualidade (Quality Gate)
 * - Operações em lote (Bulk Operations) com pré-visualização obrigatória
 */

const PlaceholderValidator = require('./placeholderIntegrityValidator');

class TranslationEditorCore {
  constructor(entries = []) {
    this.entries = entries; // Array de { id, original, translation, context, source, provider, status, scene }
    this.history = [];      // Pilha de undo
    this.redoStack = [];    // Pilha de redo
  }

  /**
   * Valida a integridade de uma tradução individual contra as regras de qualidade
   */
  static validateEntry(original, translation) {
    const issues = [];

    // 1. Placeholder & Variable integrity
    const pv = PlaceholderValidator.validate(original, translation);
    if (!pv.valid) {
      issues.push({ type: 'VARIABLE_MISMATCH', message: 'Variáveis ou códigos de controle foram corrompidos' });
    }

    // 2. Quebras de linha excessivas ou ausentes
    const origLines = (original.match(/\n/g) || []).length;
    const transLines = (translation.match(/\n/g) || []).length;
    if (Math.abs(origLines - transLines) > 2) {
      issues.push({ type: 'LINEBREAK_DISCREPANCY', message: 'Número de quebras de linha difere significativamente do original' });
    }

    // 3. String vazia quando original não era vazio
    if (original.trim().length > 0 && translation.trim().length === 0) {
      issues.push({ type: 'EMPTY_TRANSLATION', message: 'Tradução vazia' });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Filtra e busca na grade de traduções
   */
  query(filter = {}) {
    let result = [...this.entries];

    if (filter.status) {
      result = result.filter(e => e.status === filter.status);
    }

    if (filter.untranslatedOnly) {
      result = result.filter(e => !e.translation || e.translation.trim().length === 0);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(e =>
        (e.original && e.original.toLowerCase().includes(q)) ||
        (e.translation && e.translation.toLowerCase().includes(q)) ||
        (e.scene && e.scene.toLowerCase().includes(q))
      );
    }

    if (filter.sortBy) {
      const field = filter.sortBy;
      const asc = filter.sortAsc !== false ? 1 : -1;
      result.sort((a, b) => {
        const valA = String(a[field] || '');
        const valB = String(b[field] || '');
        return valA.localeCompare(valB) * asc;
      });
    }

    return result;
  }

  /**
   * Atualiza uma tradução individual salvando histórico de Undo
   */
  updateTranslation(id, newTranslation, metadata = {}) {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) return { success: false, error: 'Entrada não encontrada' };

    const old = this.entries[idx];
    this.history.push({ id, previousTranslation: old.translation, previousStatus: old.status });
    this.redoStack = []; // Limpa redo em nova alteração

    const val = TranslationEditorCore.validateEntry(old.original, newTranslation);

    this.entries[idx] = {
      ...old,
      translation: newTranslation,
      status: val.valid ? (metadata.status || 'VERIFIED') : 'INVALID',
      isManualOverride: true,
      updatedAt: Date.now()
    };

    return {
      success: true,
      entry: this.entries[idx],
      validation: val
    };
  }

  /**
   * Operação em lote: Preview de substituição antes de aplicar
   */
  previewBulkReplace(searchTerm, replaceTerm, filter = {}) {
    const candidates = this.query(filter);
    const previewList = [];

    for (const ent of candidates) {
      if (ent.translation && ent.translation.includes(searchTerm)) {
        const hypothetical = ent.translation.split(searchTerm).join(replaceTerm);
        const val = TranslationEditorCore.validateEntry(ent.original, hypothetical);
        previewList.push({
          id: ent.id,
          original: ent.original,
          currentTranslation: ent.translation,
          newTranslation: hypothetical,
          isValid: val.valid
        });
      }
    }

    return {
      affectedCount: previewList.length,
      preview: previewList
    };
  }

  /**
   * Aplica a substituição em lote
   */
  applyBulkReplace(searchTerm, replaceTerm, filter = {}) {
    const { preview } = this.previewBulkReplace(searchTerm, replaceTerm, filter);
    let updatedCount = 0;

    for (const item of preview) {
      if (item.isValid) {
        this.updateTranslation(item.id, item.newTranslation, { status: 'VERIFIED' });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount
    };
  }
}

module.exports = TranslationEditorCore;
