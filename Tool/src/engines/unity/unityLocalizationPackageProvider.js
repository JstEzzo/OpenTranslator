/**
 * OpenTranslator — UnityLocalizationPackageProvider
 * 
 * Suporte ao pacote oficial Unity Localization (com.unity.localization):
 * - Identifica StringTableCollection, StringTable, LocalizedString
 * - Mapeamento de chaves, TableEntryId, e coleções de tabelas de strings
 * - Suporte a importação e exportação de tabelas de localização em CSV e JSON
 */

const fs = require('fs');
const path = require('path');

class UnityLocalizationPackageProvider {
  /**
   * Detecta se o jogo Unity possui o pacote oficial de localização instalado
   */
  static detectPackage(gameDir) {
    if (!gameDir || !fs.existsSync(gameDir)) return { hasPackage: false };

    let managedDir = '';
    try {
      const files = fs.readdirSync(gameDir);
      const dataFolder = files.find(f => f.toLowerCase().endsWith('_data'));
      if (dataFolder) {
        managedDir = path.join(gameDir, dataFolder, 'Managed');
      }
    } catch (e) {}

    let hasLocalizationDll = false;
    if (managedDir && fs.existsSync(managedDir)) {
      try {
        const assemblies = fs.readdirSync(managedDir).map(a => a.toLowerCase());
        hasLocalizationDll = assemblies.some(a => a.includes('unity.localization') || a.includes('unityengine.localization'));
      } catch (e) {}
    }

    return {
      hasPackage: hasLocalizationDll,
      managedDir
    };
  }

  /**
   * Faz o parse de tabela de strings exportada do Unity Localization (CSV canônico)
   * Formato: Key,Id,en,pt-BR,Comment
   */
  static parseStringTableCsv(csvContent) {
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { header: [], entries: [] };

    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const entries = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parsing simples de CSV
      const fields = [];
      let cur = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          fields.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur);

      const cleanFields = fields.map(f => f.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      const key = cleanFields[0] || '';
      const id = cleanFields[1] || '';

      const translations = {};
      for (let c = 2; c < header.length; c++) {
        const colName = header[c];
        translations[colName] = cleanFields[c] || '';
      }

      entries.push({ key, id, translations });
    }

    return { header, entries };
  }

  /**
   * Serializa tabela de volta para o formato CSV aceito pelo Unity Localization
   */
  static serializeStringTableCsv(header, entries) {
    const escapeField = (f) => {
      const s = String(f || '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const outLines = [];
    outLines.push(header.map(escapeField).join(','));

    for (const ent of entries) {
      const row = [escapeField(ent.key), escapeField(ent.id)];
      for (let c = 2; c < header.length; c++) {
        const col = header[c];
        row.push(escapeField(ent.translations[col] || ''));
      }
      outLines.push(row.join(','));
    }

    return outLines.join('\n') + '\n';
  }
}

module.exports = UnityLocalizationPackageProvider;
