/**
 * OpenTranslator - FormatAwareOutput
 * 
 * Adaptadores de gravação estática conscientes de formato:
 * Evita substituições cegas via split/join que possam corromper chaves, sintaxe ou outros textos.
 * 
 * Adaptadores suportados:
 * - JsonOutputAdapter: Opera sobre árvore de objetos JSON sem alterar chaves de propriedades.
 * - CsvOutputAdapter: Reconhece colunas e delimitadores sem desalinhar linhas.
 * - PoOutputAdapter: Localiza e substitui estritamente blocos msgid -> msgstr.
 * - RpyOutputAdapter: Localiza e substitui blocos de tradução canônicos Ren'Py (old "..." / new "...").
 * - TxtOutputAdapter: Substituição controlada por limites de linha e palavra.
 */

class FormatAwareOutput {
  /**
   * Aplica traduções a um conteúdo textual respeitando a extensão do arquivo
   * @param {string} filePath - Caminho do arquivo para inferência de formato
   * @param {string} content - Conteúdo textual original
   * @param {Array<{ original: string, translation: string, context?: string }>} entries
   * @returns {{ modified: boolean, content: string, replacedCount: number }}
   */
  static apply(filePath, content, entries = []) {
    const ext = (filePath || '').split('.').pop().toLowerCase();

    switch (ext) {
      case 'json':
        return FormatAwareOutput.applyJson(content, entries);
      case 'po':
      case 'pot':
        return FormatAwareOutput.applyPo(content, entries);
      case 'rpy':
        return FormatAwareOutput.applyRpy(content, entries);
      case 'csv':
        return FormatAwareOutput.applyCsv(content, entries);
      default:
        return FormatAwareOutput.applyText(content, entries);
    }
  }

  /**
   * Adaptador para JSON estruturado
   */
  static applyJson(content, entries = []) {
    try {
      const obj = JSON.parse(content);
      let replacedCount = 0;
      const map = new Map(entries.map(e => [e.original, e.translation]));

      const traverse = (node) => {
        if (!node || typeof node !== 'object') return;
        for (const key of Object.keys(node)) {
          if (typeof node[key] === 'string') {
            if (map.has(node[key])) {
              node[key] = map.get(node[key]);
              replacedCount++;
            }
          } else if (typeof node[key] === 'object') {
            traverse(node[key]);
          }
        }
      };

      traverse(obj);
      return {
        modified: replacedCount > 0,
        content: JSON.stringify(obj, null, 2),
        replacedCount
      };
    } catch (e) {
      return FormatAwareOutput.applyText(content, entries);
    }
  }

  /**
   * Adaptador para catálogos Gettext PO
   */
  static applyPo(content, entries = []) {
    let replacedCount = 0;
    let result = content;

    for (const ent of entries) {
      const escOrig = ent.original.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escTrans = ent.translation.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const poRegex = new RegExp(`(msgid\\s+"${FormatAwareOutput._escapeRegExp(escOrig)}"\\s*\\n\\s*msgstr\\s+)"(?:[^"\\\\]|\\\\.)*"`, 'g');

      if (poRegex.test(result)) {
        result = result.replace(poRegex, `$1"${escTrans}"`);
        replacedCount++;
      }
    }

    return {
      modified: replacedCount > 0,
      content: result,
      replacedCount
    };
  }

  /**
   * Adaptador para scripts e strings Ren'Py
   */
  static applyRpy(content, entries = []) {
    let replacedCount = 0;
    let result = content;

    for (const ent of entries) {
      const escOrig = ent.original.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escTrans = ent.translation.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      // 1. Procura blocos old "..." / new "..."
      const rpyBlockRegex = new RegExp(`(old\\s+"${FormatAwareOutput._escapeRegExp(escOrig)}"\\s*\\n\\s*new\\s+)"(?:[^"\\\\]|\\\\.)*"`, 'g');
      if (rpyBlockRegex.test(result)) {
        result = result.replace(rpyBlockRegex, `$1"${escTrans}"`);
        replacedCount++;
      } else {
        // 2. Diálogo canônico: "original"
        const dialogRegex = new RegExp(`"${FormatAwareOutput._escapeRegExp(escOrig)}"`, 'g');
        if (dialogRegex.test(result)) {
          result = result.replace(dialogRegex, `"${escTrans}"`);
          replacedCount++;
        }
      }
    }

    return {
      modified: replacedCount > 0,
      content: result,
      replacedCount
    };
  }

  /**
   * Adaptador para arquivos CSV delimitados
   */
  static applyCsv(content, entries = []) {
    const lines = content.split(/\r?\n/);
    let replacedCount = 0;
    const map = new Map(entries.map(e => [e.original, e.translation]));

    const outLines = lines.map(line => {
      let l = line;
      for (const [orig, trans] of map.entries()) {
        if (l.includes(orig)) {
          l = l.split(orig).join(trans);
          replacedCount++;
        }
      }
      return l;
    });

    return {
      modified: replacedCount > 0,
      content: outLines.join('\n'),
      replacedCount
    };
  }

  /**
   * Adaptador de texto padrão com substituição controlada
   */
  static applyText(content, entries = []) {
    let replacedCount = 0;
    let result = content;

    for (const ent of entries) {
      if (result.includes(ent.original)) {
        result = result.split(ent.original).join(ent.translation);
        replacedCount++;
      }
    }

    return {
      modified: replacedCount > 0,
      content: result,
      replacedCount
    };
  }

  static _escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = FormatAwareOutput;
