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

/**
 * FASE 9 / PASSO 38 — O FALLBACK PAROU DE REIVINDICAR TUDO
 *
 * A linha anterior era:
 *
 *     detect() { return true; } // Fallback para qualquer formato textual não suportado
 *
 * Isso é o MESMO antipadrão que a FASE 7 removesu de `findGameOnDisk`, que
 * devolvia `mz` para qualquer executável: uma detecção que nunca falha não é
 * detecção, é-default. E aqui o dano é concreto — `getAdapter` usa o
 * primeiro `detect()` verdadeiro, e o fallback é o último:
 *
 *   - um `.rpy` do Ren'Py cuja detecção estruturada falhasse cairia aqui e
 *     receberia substituição por `String.split`/`join`, que atravessa
 *     strings, comentários e blocos;
 *   - um `.json` corrompido receberia o mesmo tratamento;
 *   - e o resultado seria `{ modified: true }` — um arquivo alterado, com
 *     a confiança de uma operação estrutural.
 *
 * O fallback agora só reivindica o que ele de fato sabe fazer: texto puro,
 * legível, sem estrutura. Binários e formatos estruturados passam a ser
 * recusados, e a recusa é explícita.
 */
class TextAdapter extends BaseFormatAdapter {
  constructor() { super('TextAdapter'); }

  detect(filePath, content = '') {
    const ALLOWED_EXT = new Set(['.txt', '.md', '.csv', '.log', '.ini', '.cfg', '.dialog', '.story']);
    const ext = String(filePath || '').toLowerCase();
    const ponto = ext.lastIndexOf('.');
    const extLimpa = ponto >= 0 ? ext.slice(ponto) : '';

    // FASE 9: conteúdo precisa ser realmente texto. Um buffer com byte NUL
    // ou substituição inválida não é "texto não suportado", é um formato que
    // este adapter não entende — e dizer o contrário é o defeito que corrigimos.
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    if (buf.length > 0 && buf.includes(0)) return false;
    if (buf.length > 0 && buf.toString('utf8').includes('�') && buf.length > 512) return false;

    if (!ALLOWED_EXT.has(extLimpa)) return false;

    // Um arquivo que não parece ter texto (proporção de bytes de controle
    // alta) não entra por aqui.
    if (buf.length > 0) {
      let controle = 0;
      for (const b of buf) if (b < 9 || (b > 13 && b < 32)) controle++;
      if (controle / buf.length > 0.05) return false;
    }
    return true;
  }

  capabilities() {
    return {
      structured: false,
      selectorSupport: false,
      status: 'EXPERIMENTAL',
      scope: 'plain-text-only',
      warning: 'GENERIC_TEXT_FALLBACK: aceita apenas texto puro legível '
        + '(.txt/.md/.csv/.log/.ini/.cfg/.dialog/.story). Substituição por '
        + 'substring, sem análise de estrutura. Formatos estruturados e '
        + 'binários são recusados de propósito, para não serem alterados por '
        + 'um método que não os entende.',
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
    // FASE 9: quando nenhum adapter estrutural reivindica o arquivo, o
    // fallback só entra se ele próprio aceitar. Se recusar, devolvemos `null`
    // — e o chamador tem de tratar isso como "formato não suportado", em vez
    // de receber um adapter que vai alterá-lo por substring.
    const fb = this.fallbackAdapter;
    if (fb && typeof fb.detect === 'function' && fb.detect(filePath, content)) {
      return fb;
    }
    return null;
  }
}

const defaultRegistry = new FormatAdapterRegistry();
module.exports = defaultRegistry;
module.exports.FormatAdapterRegistry = FormatAdapterRegistry;
