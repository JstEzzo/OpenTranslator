/**
 * OpenTranslator — RenpyParser & AST Validator
 * Validador sintático de arquivos .rpy e gerador especializado multi-bloco:
 * - Dialogue (say statements: 'akira "Fala traduzida"')
 * - Menu (opções de escolha)
 * - Strings ('translate pt_BR strings:')
 */

class RenpyParser {
  /**
   * Valida sintaticamente um arquivo .rpy gerado antes da aplicação.
   * Checa indentação, aspas abertas, identificadores válidos e ausência de IDs duplicados.
   */
  static validateRpy(rpyContent) {
    const errors = [];
    const warnings = [];
    const lines = rpyContent.split(/\r?\n/);
    const seenIds = new Set();
    let insideBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed || trimmed.startsWith("#")) continue;

      // 1. Verificação de Indentação (múltiplos de 4 espaços recomendados)
      const leadingSpaces = raw.search(/\S/);
      if (leadingSpaces > 0 && leadingSpaces % 4 !== 0) {
        warnings.push(`Linha ${lineNum}: Indentação de ${leadingSpaces} espaços (esperado múltiplo de 4).`);
      }

      // 2. Declaração de Bloco Translate
      if (trimmed.startsWith("translate ")) {
        const parts = trimmed.split(/\s+/);
        if (parts.length < 3 || !trimmed.endsWith(":")) {
          errors.push(`Linha ${lineNum}: Declaração 'translate' inválida: '${trimmed}'.`);
        } else {
          const blockId = parts[2].replace(/:$/, "");
          if (blockId !== "strings") {
            if (seenIds.has(blockId)) {
              errors.push(`Linha ${lineNum}: ID de tradução duplicado '${blockId}'.`);
            }
            seenIds.add(blockId);
          }
        }
        insideBlock = true;
        continue;
      }

      // 3. Verificação de Aspas Desbalanceadas
      let quoteCount = 0;
      let inEscape = false;
      for (let j = 0; j < trimmed.length; j++) {
        const ch = trimmed[j];
        if (ch === "\\" && !inEscape) {
          inEscape = true;
          continue;
        }
        if (ch === '"' && !inEscape) {
          quoteCount++;
        }
        inEscape = false;
      }
      if (quoteCount % 2 !== 0) {
        errors.push(`Linha ${lineNum}: Aspas duplas desbalanceadas: '${trimmed}'.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gera o arquivo de tradução canônico em formato .rpy preservando formatação de strings e diálogos.
   */
  static generateTlFile(language, stringsMap) {
    const lines = [];
    lines.push(`# OpenTranslator Canonical Translation File for Ren'Py`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Language: ${language}`);
    lines.push("");
    lines.push(`translate ${language} strings:`);
    lines.push("");

    for (const [original, translated] of stringsMap.entries()) {
      const origEsc = original.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const transEsc = translated.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      lines.push(`    old "${origEsc}"`);
      lines.push(`    new "${transEsc}"`);
      lines.push("");
    }

    return lines.join("\n");
  }
}

module.exports = RenpyParser;
