/**
 * OpenTranslator — UnrealStringTableProvider
 * 
 * Suporte a String Tables da Unreal Engine (CSV e JSON).
 * Formato padrão CSV Unreal: Key,SourceString,Comment
 */

const fs = require('fs');
const path = require('path');

class UnrealStringTableProvider {
  /**
   * Faz o parse de uma String Table em formato CSV da Unreal Engine
   */
  static parseStringTableCsv(csvContent) {
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const lines = csvContent.split(/\r?\n/);
    const entries = [];
    if (lines.length === 0) return entries;

    // Header esperado: Key,SourceString,Comment
    let headerIdx = 0;
    while (headerIdx < lines.length && !lines[headerIdx].toLowerCase().includes('sourcestring')) {
      headerIdx++;
    }

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parsing simples de CSV com aspas
      const match = line.match(/^"([^"]+)"\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?/);
      if (match) {
        entries.push({
          key: match[1],
          source: match[2],
          comment: match[3] || ''
        });
      } else {
        const parts = line.split(',');
        if (parts.length >= 2) {
          entries.push({
            key: parts[0].trim().replace(/^"|"$/g, ''),
            source: parts[1].trim().replace(/^"|"$/g, ''),
            comment: parts[2] ? parts[2].trim().replace(/^"|"$/g, '') : ''
          });
        }
      }
    }

    return entries;
  }

  /**
   * Serializa entradas para formato String Table CSV da Unreal
   */
  static serializeStringTableCsv(entries = []) {
    const lines = ['Key,SourceString,Comment'];
    for (const ent of entries) {
      const k = `"${(ent.key || '').replace(/"/g, '""')}"`;
      const s = `"${(ent.source || '').replace(/"/g, '""')}"`;
      const c = `"${(ent.comment || '').replace(/"/g, '""')}"`;
      lines.push(`${k},${s},${c}`);
    }
    return lines.join('\n') + '\n';
  }
}

module.exports = UnrealStringTableProvider;
