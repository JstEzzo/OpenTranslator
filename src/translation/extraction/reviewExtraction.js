'use strict';

const technicalCategories = new Set([
  'CODE', 'IDENTIFIER', 'PATH', 'URL', 'HASH', 'GUID', 'VARIABLE',
  'DEBUG', 'LICENSE', 'COMMENT', 'RESOURCE_NAME'
]);

function technicalReason(row, text) {
  if (technicalCategories.has(String(row.category || '').toUpperCase())) return 'TECHNICAL_CATEGORY';
  const parts = typeof row.file === 'string' ? row.file.replace(/\\/g, '/').split('/') : [];
  const filename = (parts.pop() || '').toLowerCase();
  if (/^(readme|license|licence|changelog)(?:[._ -]|$)/.test(filename) ||
      parts.some(part => /^(readmes?|documentation)$/i.test(part))) return 'DOCUMENTATION';
  if (/^(?:const|let|var)\s+[$\w]+\s*=|^#\s*include\s*[<"]|^import\s+.*\s+from\s*['"]/s.test(text)) {
    return 'CODE_STATEMENT';
  }
  if (/^(?:https?:\/\/|file:\/\/|res:\/\/|[a-z]:[\\/])\S+$/i.test(text)) return 'RESOURCE_REFERENCE';
  return null;
}

function reviewExtraction(result) {
  if (result?.success !== true) return result;
  const input = result.texts ?? (result.count === 0 ? [] : null);
  if (!Array.isArray(input) || (result.count > 0 && input.length === 0)) {
    return { success: false, status: 'INVALID_EXTRACTION_RECORDS', error: 'The extractor did not return the expected text list.' };
  }
  const texts = [];
  const ids = new Set();
  const excludedReasons = {};
  for (const row of input) {
    const original = row?.original ?? row?.clean;
    const reason = typeof original !== 'string' || !original.trim()
      ? 'EMPTY_SOURCE' : technicalReason(row, original.trim());
    if (reason) {
      excludedReasons[reason] = (excludedReasons[reason] || 0) + 1;
      continue;
    }
    const validId = typeof row.id === 'string' ? Boolean(row.id.trim()) : Number.isFinite(row.id);
    if (!validId || ids.has(row.id)) {
      return { success: false, status: 'INVALID_EXTRACTION_RECORDS',
        error: 'The extractor returned a missing or duplicate text identifier. Translation cannot be applied safely.' };
    }
    ids.add(row.id);
    texts.push(row);
  }
  const extractionReview = { candidates: input.length, accepted: texts.length,
    excluded: input.length - texts.length, reasons: excludedReasons };
  if (input.length && !texts.length) {
    return { ...result, success: false, status: 'NO_DISPLAY_TEXT_FOUND',
      error: 'The scan found only empty or technical entries. Dialogue may be stored in another resource format.',
      texts, count: 0, extractionReview, universeComplete: false };
  }
  return { ...result, texts, count: texts.length, extractionReview };
}

module.exports = { reviewExtraction };
