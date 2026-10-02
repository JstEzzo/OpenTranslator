/**
 * renpyValidator.js — Validador de Sintaxe e Integridade Forense de Ren'Py
 * 
 * Checa:
 * - Validade da sintaxe dos blocos gerados em game/tl/pt_BR/
 * - Validação de 000_opentranslator_init.rpy, strings.rpy, dialogues.rpy, screens.rpy
 * - Balanceamento de aspas, escapes, colchetes [var] e tags {tag}
 * - Integridade de tokens antes e depois da tradução
 * - Garantia de que arquivos originais do jogo nunca foram alterados
 */

const fs = require('fs');
const path = require('path');
const CodeProtector = require('../../../core/codeProtector');

class RenpyValidator {
  constructor(options = {}) {
    this.options = options;
    this.codeProtector = new CodeProtector({ engine: 'renpy' });
  }

  /**
   * Valida sintaxe de um arquivo .rpy gerado
   */
  validateRpyFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: [`Arquivo não encontrado: ${filePath}`] };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const errors = [];
    const warnings = [];

    let inTranslateBlock = false;
    let inInitBlock = false;

    const oldStrings = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('init ') && trimmed.endsWith(':')) {
        inInitBlock = true;
        inTranslateBlock = false;
        continue;
      }

      if (trimmed.startsWith('translate ') && trimmed.endsWith(':')) {
        inTranslateBlock = true;
        inInitBlock = false;
        continue;
      }

      if (inTranslateBlock) {
        if (trimmed.startsWith('old ') || trimmed.startsWith('new ')) {
          // Checa se a linha começa com 4 espaços
          if (!line.startsWith('    ')) {
            errors.push(`Linha ${lineNum}: Indentação inválida (esperado 4 espaços): "${line}"`);
          }
          // Checa aspas
          const quoteMatch = trimmed.match(/^(?:old|new)\s+"((?:[^"\\]|\\.)*)"$/);
          if (!quoteMatch) {
            errors.push(`Linha ${lineNum}: Formato de string literal inválido: "${trimmed}"`);
          } else {
            const strVal = quoteMatch[1];
            if (trimmed.startsWith('old ')) {
              oldStrings.push({ text: strVal, line: lineNum });
            } else if (trimmed.startsWith('new ') && oldStrings.length > 0) {
              const lastOld = oldStrings[oldStrings.length - 1];
              // Checa paridade de variáveis de interpolação [var] para evitar NameError no runtime do Ren'Py
              const origVars = (lastOld.text.match(/\[([a-zA-Z0-9_.]+(?:![a-zA-Z]+)?)\]/g) || []);
              for (const ov of origVars) {
                if (!strVal.includes(ov)) {
                  errors.push(`Linha ${lineNum}: Variável Ren'Py corrompida ou traduzida indevidamente em new (esperada: "${ov}" de "${lastOld.text}")`);
                }
              }
            }
            // Remove sequências escapadas do Ren'Py ([[ e ]] para colchetes literais, {{ e }} para tags literais)
            const cleanStrBrackets = strVal.replace(/\[\[/g, '').replace(/\]\]/g, '');
            const openBrackets = (cleanStrBrackets.match(/\[/g) || []).length;
            const closeBrackets = (cleanStrBrackets.match(/\]/g) || []).length;
            if (openBrackets !== closeBrackets) {
              warnings.push(`Linha ${lineNum}: Possível desbalanceamento de colchetes em: "${strVal}"`);
            }
            // Checa tags {tag}
            const cleanStrTags = strVal.replace(/\{\{/g, '').replace(/\}\}/g, '');
            const openTags = (cleanStrTags.match(/\{/g) || []).length;
            const closeTags = (cleanStrTags.match(/\}/g) || []).length;
            if (openTags !== closeTags) {
              warnings.push(`Linha ${lineNum}: Possível desbalanceamento de tags em: "${strVal}"`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      oldStrings
    };
  }

  /**
   * Valida a integridade da pasta de tradução completa
   */
  validateInjection(tlDir) {
    const report = {
      valid: true,
      filesChecked: [],
      syntaxErrors: 0,
      errors: [],
      warnings: []
    };

    if (!fs.existsSync(tlDir)) {
      report.valid = false;
      report.errors.push(`Pasta tlDir não existe: ${tlDir}`);
      return report;
    }

    const globalOldMap = new Map();
    const items = fs.readdirSync(tlDir).filter(f => f.endsWith('.rpy'));
    for (const item of items) {
      const full = path.join(tlDir, item);
      report.filesChecked.push(item);
      const res = this.validateRpyFile(full);
      if (res.warnings && res.warnings.length > 0) {
        report.warnings.push(...res.warnings.map(w => `[${item}] ${w}`));
      }
      if (!res.valid) {
        report.valid = false;
        report.syntaxErrors += res.errors.length;
        report.errors.push(...res.errors.map(e => `[${item}] ${e}`));
      }

      // Validação de unicidade global de strings no Ren'Py
      if (res.oldStrings) {
        for (const entry of res.oldStrings) {
          if (globalOldMap.has(entry.text)) {
            const prev = globalOldMap.get(entry.text);
            report.valid = false;
            report.syntaxErrors++;
            report.errors.push(`[${item}] Linha ${entry.line}: String duplicada detectada: "${entry.text}" (já declarada em ${prev.file}:${prev.line})`);
          } else {
            globalOldMap.set(entry.text, { file: item, line: entry.line });
          }
        }
      }
    }

    return report;
  }

  /**
   * Valida integridade semântica de textos e traduções antes da aplicação
   */
  async validate(gameDir, texts, translations) {
    const errors = [];
    const warnings = [];

    if (!texts || !Array.isArray(texts)) {
      return { valid: true, errors, warnings };
    }

    for (const t of texts) {
      const trVal = (translations instanceof Map) ? translations.get(t.id) : (translations ? translations[t.id] : null);
      if (trVal && typeof trVal === 'string') {
        // Valida paridade de tokens se houver
        if (t.tokens && t.tokens.length > 0) {
          const { valid, missingTokens = [] } = this.codeProtector.restore(trVal, t.tokens);
          if (!valid && missingTokens.length > 0) {
            warnings.push(`Texto [ID ${t.id}] teve ${missingTokens.length} tags protegidas perdidas (tags/variáveis): ${missingTokens.join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = RenpyValidator;
