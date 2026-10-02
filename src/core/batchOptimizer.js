/**
 * OpenTranslator — BatchOptimizer
 * Agrupador multidimensional de lotes de tradução.
 * Otimiza simultaneamente:
 * - MAX_ITEMS (número de textos por lote)
 * - MAX_CHARACTERS (tamanho total de caracteres)
 * - MAX_URL_LEN (tamanho seguro codificado da URL)
 * - MAX_TOKENS (estimativa de tokens de sistema)
 */

class BatchOptimizer {
  /**
   * Divide uma lista de textos em lotes ideais segundo as regras do provedor.
   * @param {Array<object>} items - [{ id, clean, ... }]
   * @param {object} limits - { maxItems, maxCharacters, maxUrlLen, separator }
   * @returns {Array<Array<object>>}
   */
  static buildBatches(items = [], limits = {}) {
    const maxItems = limits.maxItems || 15;
    const maxChars = limits.maxCharacters || 4500;
    const maxUrlLen = limits.maxUrlLen || 6000;
    const sep = limits.separator || "\n[|]\n";
    const sepEncLen = encodeURIComponent(sep).length;

    const batches = [];
    let currentBatch = [];
    let currentChars = 0;
    let currentUrlLen = 100; // Base URL budget

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const text = item.clean || item.original || "";
      const textChars = text.length;
      const textEncLen = encodeURIComponent(text).length + (currentBatch.length > 0 ? sepEncLen : 0);

      const wouldExceedItems = currentBatch.length >= maxItems;
      const wouldExceedChars = currentChars + textChars > maxChars && currentBatch.length > 0;
      const wouldExceedUrl = currentUrlLen + textEncLen > maxUrlLen && currentBatch.length > 0;

      if (wouldExceedItems || wouldExceedChars || wouldExceedUrl) {
        batches.push(currentBatch);
        currentBatch = [];
        currentChars = 0;
        currentUrlLen = 100;
      }

      currentBatch.push(item);
      currentChars += textChars;
      currentUrlLen += textEncLen;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}

module.exports = BatchOptimizer;
