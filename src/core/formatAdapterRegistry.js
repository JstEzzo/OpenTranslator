/**
 * OpenTranslator - FormatAdapterRegistry
 * 
 * Registro e orquestrador de adaptadores de formato de produção:
 * - JsonAdapter
 * - CsvAdapter
 * - PoAdapter
 * - RenpyAdapter
 * - TextAdapter (Fallback com aviso EXPERIMENTAL)
 */

const path = require('path');

class BaseFormatAdapter {
  constructor(name) {
    this.name = name;
  }
  detect(filePath, content) { return false; }
  extract(filePath, content) { return []; }
  preview(filePath, content, units) { return { modified: false }; }
  apply(filePath, content, units) { return { modified: false, content }; }
  verify(originalContent, modifiedContent) { return originalContent !== modifiedContent; }
  rollbackSupport() { return true; }
  capabilities() { return { structured: true, selectorSupport: true }; }
}

class JsonAdapter extends BaseFormatAdapter {
  constructor() { super('JsonAdapter'); }

  detect(filePath) {
    return filePath.toLowerCase().endsWith('.json');
  }

  extract(filePath, content) {
    const units = [];
    try {
      const parsed = JSON.parse(content);
      const walk = (obj, p = '') => {
        if (!obj) return;
        if (typeof obj === 'string' && obj.trim().length > 1 && !obj.startsWith('{') && !obj.startsWith('[')) {
          units.push({
            file: filePath,
            location: p,
            selector: { type: 'jsonPath', value: p },
            original: obj.trim()
          });
        } else if (typeof obj === 'object') {
          for (const k of Object.keys(obj)) {
            walk(obj[k], p ? `${p}.${k}` : k);
          }
        }
      };
      walk(parsed);
    } catch (e) {}
    return units;
  }

  apply(filePath, content, units) {
    try {
      const parsed = JSON.parse(content);
      let changed = false;

      const walkAndReplace = (obj, p = '') => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          const curPath = p ? `${p}.${k}` : k;
          if (typeof obj[k] === 'string') {
            const match = units.find(u => {
              if (u.selector && u.selector.type === 'jsonPath' && u.selector.value === curPath) {
                return true;
              }
              return u.original === obj[k];
            });
            if (match && match.translation && match.translation !== obj[k]) {
              obj[k] = match.translation;
              changed = true;
            }
          } else if (typeof obj[k] === 'object') {
            walkAndReplace(obj[k], curPath);
          }
        }
      };

      walkAndReplace(parsed);
      return {
        modified: changed,
        content: changed ? JSON.stringify(parsed, null, 2) : content
      };
    } catch (e) {
      return { modified: false, content, error: e.message };
    }
  }
}

class PoAdapter extends BaseFormatAdapter {
  constructor() { super('PoAdapter'); }

  detect(filePath) {
    return filePath.toLowerCase().endsWith('.po') || filePath.toLowerCase().endsWith('.pot');
  }

  apply(filePath, content, units) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let currentMsgid = null;
    let inMsgid = false;
    let inMsgstr = false;
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('msgid ')) {
        inMsgid = true;
        inMsgstr = false;
        const match = line.match(/^msgid\s+"(.*)"$/);
        currentMsgid = match ? match[1] : '';
        result.push(line);
      } else if (trimmed.startsWith('msgstr ')) {
        inMsgid = false;
        inMsgstr = true;
        const unit = units.find(u => u.original === currentMsgid || (u.selector?.value === currentMsgid));
        if (unit && unit.translation) {
          result.push(`msgstr "${unit.translation}"`);
          changed = true;
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    return { modified: changed, content: result.join('\n') };
  }
}

class RenpyAdapter extends BaseFormatAdapter {
  constructor() { super('RenpyAdapter'); }

  detect(filePath) {
    return filePath.toLowerCase().endsWith('.rpy');
  }

  apply(filePath, content, units) {
    let result = content;
    let changed = false;

    // 1. Aplica blocos old/new
    for (const u of units) {
      if (!u.translation || u.translation === u.original) continue;
      const oldBlock = `old "${u.original}"`;
      if (result.includes(oldBlock)) {
        const regex = new RegExp(`old\\s+"${this._escape(u.original)}"\\s*\\r?\\n(\\s*)new\\s+"[^"]*"`, 'g');
        const updated = result.replace(regex, `old "${u.original}"\n$1new "${u.translation}"`);
        if (updated !== result) {
          result = updated;
          changed = true;
          continue;
        }
      }

      // 2. Diálogos ou strings diretas
      const rawPattern = `"${u.original}"`;
      if (result.includes(rawPattern)) {
        result = result.split(rawPattern).join(`"${u.translation}"`);
        changed = true;
      }
    }

    return { modified: changed, content: result };
  }

  _escape(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

class CsvAdapter extends BaseFormatAdapter {
  constructor() { super('CsvAdapter'); }

  detect(filePath) {
    return filePath.toLowerCase().endsWith('.csv');
  }

  apply(filePath, content, units) {
    const lines = content.split(/\r?\n/);
    let changed = false;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      for (const u of units) {
        if (u.selector && u.selector.type === 'csvCell' && u.selector.row === i) {
          if (line.includes(u.original) && u.translation) {
            line = line.split(u.original).join(u.translation);
            changed = true;
          }
        } else if (line.includes(u.original) && u.translation) {
          line = line.split(u.original).join(u.translation);
          changed = true;
        }
      }
      result.push(line);
    }

    return { modified: changed, content: result.join('\n') };
  }
}

class TextAdapter extends BaseFormatAdapter {
  constructor() { super('TextAdapter'); }

  detect() { return true; } // Fallback para qualquer formato textual não suportado

  capabilities() {
    return {
      structured: false,
      selectorSupport: false,
      status: 'EXPERIMENTAL',
      warning: 'GENERIC_TEXT_FALLBACK: Formato não possui adapter estruturado. Substituição ingênua utilizada com cautela.'
    };
  }

  apply(filePath, content, units) {
    let result = content;
    let changed = false;
    for (const u of units) {
      if (u.original && u.translation && u.translation !== u.original && result.includes(u.original)) {
        result = result.split(u.original).join(u.translation);
        changed = true;
      }
    }
    return { modified: changed, content: result };
  }
}

class FormatAdapterRegistry {
  constructor() {
    this.adapters = [
      new JsonAdapter(),
      new PoAdapter(),
      new RenpyAdapter(),
      new CsvAdapter()
    ];
    this.fallbackAdapter = new TextAdapter();
  }

  getAdapter(filePath, content = '') {
    for (const adapter of this.adapters) {
      if (adapter.detect(filePath, content)) {
        return adapter;
      }
    }
    return this.fallbackAdapter;
  }
}

const defaultRegistry = new FormatAdapterRegistry();
module.exports = defaultRegistry;
module.exports.FormatAdapterRegistry = FormatAdapterRegistry;
