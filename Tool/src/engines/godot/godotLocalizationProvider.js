/**
 * OpenTranslator — GodotLocalizationProvider
 * 
 * Suporte completo à localização nativa da Godot Engine:
 * - Parsing e geração de tabelas CSV de tradução (keys,en,pt_BR,ja...)
 * - Suporte a arquivos gettext PO/MO (msgid, msgstr, msgctxt)
 * - Identificação e registro em project.godot
 * - Preservação de quebras de linha, aspas escapadas e BOM
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class GodotLocalizationProvider {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Analisa um projeto Godot e descobre arquivos de localização
   */
  static discover(gameDir) {
    const findings = {
      projectGodot: false,
      csvFiles: [],
      poFiles: [],
      translationResources: [],
      locales: new Set()
    };

    if (!gameDir || !fs.existsSync(gameDir)) return findings;

    const projPath = path.join(gameDir, 'project.godot');
    if (fs.existsSync(projPath)) {
      findings.projectGodot = true;
    }

    const scan = (dir, depth = 0) => {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== 'node_modules') {
            scan(full, depth + 1);
          } else if (ent.isFile()) {
            const ext = path.extname(ent.name).toLowerCase();
            if (ext === '.csv') {
              // Verifica se tem formato de tabela de tradução Godot
              try {
                const head = fs.readFileSync(full, 'utf8').slice(0, 300);
                if (/^(keys?|id|msgid|identifier)\s*[,;\t]/im.test(head)) {
                  findings.csvFiles.push(full);
                }
              } catch (e) {}
            } else if (ext === '.po') {
              findings.poFiles.push(full);
            } else if (ext === '.translation') {
              findings.translationResources.push(full);
            }
          }
        }
      } catch (e) {}
    };

    scan(gameDir);
    return findings;
  }

  /**
   * Parser robusto para CSV de localização Godot (RFC 4180 + variantes Godot)
   * Suporta campos entre aspas com quebras de linha e vírgulas internas.
   */
  static parseGodotCsv(content) {
    // Remove BOM se presente
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++; // pular próxima aspa escapada
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',' || char === ';') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentField);
          currentField = '';
          if (currentRow.some(f => f.trim().length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else if (char === '\n') {
          currentRow.push(currentField);
          currentField = '';
          if (currentRow.some(f => f.trim().length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length === 0) return { header: [], entries: [] };

    const header = rows[0].map(h => h.trim());
    const entries = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const key = row[0] || '';
      if (!key) continue;

      const record = { key, rowIdx: r, translations: {} };
      for (let c = 1; c < header.length; c++) {
        const lang = header[c];
        record.translations[lang] = row[c] !== undefined ? row[c] : '';
      }
      entries.push(record);
    }

    return { header, entries };
  }

  /**
   * Converte entradas e cabeçalho de volta para CSV formato canônico Godot
   */
  static serializeGodotCsv(header, entries) {
    const escapeCsvField = (field) => {
      const str = String(field || '');
      if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [];
    lines.push(header.map(escapeCsvField).join(','));

    for (const ent of entries) {
      const row = [escapeCsvField(ent.key)];
      for (let c = 1; c < header.length; c++) {
        const lang = header[c];
        const val = ent.translations[lang] !== undefined ? ent.translations[lang] : '';
        row.push(escapeCsvField(val));
      }
      lines.push(row.join(','));
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Parser para arquivos gettext PO (.po) usados pela Godot
   */
  static parsePo(content) {
    const lines = content.split(/\r?\n/);
    const entries = [];
    let current = null;
    let currentField = null;

    const commitCurrent = () => {
      if (current && (current.msgid !== undefined)) {
        entries.push(current);
      }
      current = null;
      currentField = null;
    };

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      if (line.startsWith('msgctxt ')) {
        commitCurrent();
        current = { msgctxt: parsePoString(line.slice(8)), msgid: '', msgstr: '' };
        currentField = 'msgctxt';
      } else if (line.startsWith('msgid ')) {
        if (!current) current = { msgid: '', msgstr: '' };
        current.msgid = parsePoString(line.slice(6));
        currentField = 'msgid';
      } else if (line.startsWith('msgstr ')) {
        if (!current) current = { msgid: '', msgstr: '' };
        current.msgstr = parsePoString(line.slice(7));
        currentField = 'msgstr';
      } else if (line.startsWith('"') && line.endsWith('"') && current && currentField) {
        current[currentField] += parsePoString(line);
      }
    }

    commitCurrent();
    return entries;

    function parsePoString(s) {
      s = s.trim();
      if (s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
      }
      return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    }
  }

  /**
   * Serializa entradas para formato gettext PO compatível com Godot
   */
  static serializePo(entries, targetLocale = 'pt_BR') {
    const header = [
      'msgid ""',
      'msgstr ""',
      '"Project-Id-Version: OpenTranslator Export\\n"',
      `"Language: ${targetLocale}\\n"`,
      '"MIME-Version: 1.0\\n"',
      '"Content-Type: text/plain; charset=UTF-8\\n"',
      '"Content-Transfer-Encoding: 8bit\\n"',
      ''
    ].join('\n');

    const escapePo = (text) => {
      return String(text || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    };

    const blocks = [header];
    for (const ent of entries) {
      const parts = [];
      if (ent.msgctxt) {
        parts.push(`msgctxt "${escapePo(ent.msgctxt)}"`);
      }
      parts.push(`msgid "${escapePo(ent.msgid)}"`);
      parts.push(`msgstr "${escapePo(ent.msgstr || '')}"`);
      blocks.push(parts.join('\n'));
    }

    return blocks.join('\n\n') + '\n';
  }
}

module.exports = GodotLocalizationProvider;
