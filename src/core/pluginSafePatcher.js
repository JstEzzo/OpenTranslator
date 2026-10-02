/**
 * OpenTranslator — PluginSafePatcher v3
 * Deterministic Lexer and Context-Aware JavaScript Patcher for RPG Maker MV/MZ plugins.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const BackupManager = require("./backupManager");

const UI_KEYWORDS = new Set([
  "cancel", "confirm", "back", "ok", "select", "menu", "equip", "status",
  "item", "skill", "save", "load", "options", "attack", "guard", "escape",
  "buy", "sell", "page", "level", "hp", "mp", "tp", "exp", "gold", "quest",
  "complete", "in progress", "failed", "reward", "inventory", "slot", "close",
  "open", "yes", "no", "on", "off", "continue", "retry", "start", "exit",
  "formation", "order", "sort", "clear", "optimize", "remove", "auto", "manual",
  "price", "cost", "type", "weapon", "armor", "category", "amount", "name",
  "info", "enemy", "party", "member", "effect", "damage", "heal", "bonus"
]);

class PluginSafePatcher {
  constructor(options = {}) {
    this.backupManager = options.backupManager || new BackupManager();
  }

  getHash(filePathOrBuffer) {
    const buf = Buffer.isBuffer(filePathOrBuffer)
      ? filePathOrBuffer
      : fs.readFileSync(filePathOrBuffer);
    return crypto.createHash("sha256").update(buf).digest("hex");
  }

  validateSyntax(jsCode, filename = "plugin.js") {
    try {
      new vm.Script(jsCode, { filename, displayErrors: true });
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err.message,
        line: err.lineNumber || null,
        stack: err.stack
      };
    }
  }

  tokenize(code) {
    const tokens = [];
    let i = 0;
    const len = code.length;
    let line = 1;
    let col = 1;
    let lastSigToken = "";

    while (i < len) {
      const ch = code[i];
      const next = i + 1 < len ? code[i + 1] : "";

      if (ch === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }

      // Line comment
      if (ch === "/" && next === "/") {
        const start = i;
        const startLine = line;
        const startCol = col - 1;
        i += 2;
        while (i < len && code[i] !== "\n") i++;
        tokens.push({
          type: "LINE_COMMENT",
          start,
          end: i,
          raw: code.slice(start, i),
          value: code.slice(start, i),
          line: startLine,
          col: startCol
        });
        continue;
      }

      // Block comment
      if (ch === "/" && next === "*") {
        const start = i;
        const startLine = line;
        const startCol = col - 1;
        i += 2;
        while (i < len && !(code[i] === "*" && i + 1 < len && code[i + 1] === "/")) {
          if (code[i] === "\n") { line++; col = 0; }
          i++;
        }
        i += 2;
        tokens.push({
          type: "BLOCK_COMMENT",
          start,
          end: i,
          raw: code.slice(start, i),
          value: code.slice(start, i),
          line: startLine,
          col: startCol
        });
        continue;
      }

      // Template literal
      if (ch === "`") {
        const start = i;
        const startLine = line;
        const startCol = col - 1;
        i++;
        while (i < len) {
          if (code[i] === "\\") { i += 2; continue; }
          if (code[i] === "\n") { line++; col = 0; }
          if (code[i] === "`") { i++; break; }
          i++;
        }
        tokens.push({
          type: "TEMPLATE_LITERAL",
          start,
          end: i,
          raw: code.slice(start, i),
          value: code.slice(start, i),
          line: startLine,
          col: startCol
        });
        lastSigToken = "TEMPLATE_LITERAL";
        continue;
      }

      // Regex literal vs division
      if (ch === "/") {
        const isRegex = !lastSigToken ||
          /^([(=:!&|?,;~^%<>\+\-\*\/\[\{]|return|case|throw|typeof|void|delete|yield|await)$/.test(lastSigToken);
        if (isRegex) {
          const start = i;
          const startLine = line;
          const startCol = col - 1;
          i++;
          while (i < len) {
            if (code[i] === "\\") { i += 2; continue; }
            if (code[i] === "/") {
              i++;
              while (i < len && /[gimsuy]/.test(code[i])) i++;
              break;
            }
            if (code[i] === "\n") break;
            i++;
          }
          tokens.push({
            type: "REGEX_LITERAL",
            start,
            end: i,
            raw: code.slice(start, i),
            value: code.slice(start, i),
            line: startLine,
            col: startCol
          });
          lastSigToken = "REGEX_LITERAL";
          continue;
        }
      }

      // String literal
      if (ch === "'" || ch === '"') {
        const quote = ch;
        const start = i;
        const startLine = line;
        const startCol = col - 1;
        i++;
        let val = "";
        while (i < len) {
          if (code[i] === "\\") {
            val += code[i] + (code[i + 1] || "");
            i += 2;
            continue;
          }
          if (code[i] === quote) {
            i++;
            break;
          }
          if (code[i] === "\n" || code[i] === "\r") break;
          val += code[i];
          i++;
        }
        tokens.push({
          type: "STRING_LITERAL",
          quote,
          start,
          end: i,
          raw: code.slice(start, i),
          value: val,
          line: startLine,
          col: startCol,
          prevToken: lastSigToken
        });
        lastSigToken = "STRING_LITERAL";
        continue;
      }

      // Whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Operators / punctuation
      if (/[(){}\[\],;:=!&|?+\-*\/<>]/.test(ch)) {
        tokens.push({
          type: "PUNCTUATION",
          start: i,
          end: i + 1,
          value: ch,
          line,
          col
        });
        lastSigToken = ch;
        i++;
        continue;
      }

      // Identifiers / numbers / keywords
      const idStart = i;
      const startLine = line;
      const startCol = col;
      while (i < len && /[a-zA-Z0-9_$\.]/.test(code[i])) i++;
      const idVal = code.slice(idStart, i);
      tokens.push({
        type: "IDENTIFIER",
        start: idStart,
        end: i,
        value: idVal,
        line: startLine,
        col: startCol
      });
      lastSigToken = idVal;
      continue;
    }

    return tokens;
  }

  /**
   * Classifica com precisão contextual uma string extraída.
   */
  classifyTokenContext(tokens, idx) {
    const token = tokens[idx];
    const val = token.value.trim();

    const prev1 = idx > 0 ? tokens[idx - 1] : null;
    const prev2 = idx > 1 ? tokens[idx - 2] : null;
    const next1 = idx + 1 < tokens.length ? tokens[idx + 1] : null;
    const next2 = idx + 2 < tokens.length ? tokens[idx + 2] : null;

    // 1. Asset path ou URL
    if (
      /\.(png|jpg|jpeg|gif|ogg|wav|mp3|m4a|json|js|css|html|ttf|woff|atlas|skel)$/i.test(val) ||
      /^(img|audio|fonts|js|data|locales|movies)[\/\\]/i.test(val) ||
      /^https?:\/\//i.test(val)
    ) {
      return "TECHNICAL_STRING";
    }

    // 2. console.log / console.warn / console.error
    if (prev1 && prev1.value === "(" && prev2 && (/^console\.(log|warn|error|debug|info)$/.test(prev2.value) || /^(log|warn|error|debug|info)$/.test(prev2.value))) {
      return "TECHNICAL_STRING";
    }

    // 3. Switch-case labels (código de branch de comando de plugin)
    if (prev1 && prev1.value === "case") {
      return "PLUGIN_CODE_FRAGMENT";
    }

    // 4. Comparações lógicas e igualdades (e.g. command === 'ItemBook')
    if ((prev1 && /^(===|!==|==|!=)$/.test(prev1.value)) || (next1 && /^(===|!==|==|!=)$/.test(next1.value))) {
      return "PLUGIN_CODE_FRAGMENT";
    }

    // 5. Atribuição de propriedade e indexação de array/objeto: obj["Price"], parameters['key']
    if ((prev1 && prev1.value === "[") || (next1 && next1.value === "]")) {
      return "TECHNICAL_STRING";
    }

    // 6. Registro de eventos, handlers ou métodos de fluxo interno
    if (prev1 && prev1.value === "(" && prev2 && /setHandler|addEventListener|on|emit|indexOf|lastIndexOf|startsWith|endsWith|includes|push|splice|slice|split/i.test(prev2.value)) {
      return "TECHNICAL_STRING";
    }

    // 7. Variável explicitamente nomeada como chave técnica / interna
    if (prev1 && prev1.value === "=" && prev2 && /key|prop|flag|id|tag|name|code/i.test(prev2.value) && prev2.value.toLowerCase().includes("internal")) {
      return "TECHNICAL_STRING";
    }

    // 8. Chamada explícita de renderização de UI: drawText("Price", ...)
    if (prev1 && prev1.value === "(" && prev2 && /drawText|drawTextEx|drawItemName|addCommand/i.test(prev2.value)) {
      return "USER_FACING_CONFIRMED";
    }

    // 9. Fallback de parâmetros na UI: parameters[...] || 'Price'
    if (prev1 && (prev1.value === "||" || prev1.value === "|")) {
      return "USER_FACING_CONFIRMED";
    }

    // 10. Contém caracteres japoneses (textos em japonês são conteúdo de diálogo/jogo)
    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(val)) {
      return "USER_FACING_CANDIDATE";
    }

    // 11. Frases com espaços e palavras humanas
    if (val.includes(" ") && val.length >= 3 && !/[{}<>=;]/.test(val)) {
      return "USER_FACING_CANDIDATE";
    }

    return "UNKNOWN";
  }

  /**
   * Extrai e classifica todos os literais de string em um arquivo ou código JS.
   */
  extractCandidates(codeOrFilePath) {
    const code = fs.existsSync(codeOrFilePath)
      ? fs.readFileSync(codeOrFilePath, "utf8")
      : String(codeOrFilePath);

    const tokens = this.tokenize(code);
    const allStrings = [];
    const candidates = [];

    tokens.forEach((t, idx) => {
      if (t.type === "STRING_LITERAL") {
        const classification = this.classifyTokenContext(tokens, idx);
        const item = {
          token: t,
          original: t.value,
          clean: t.value.trim(),
          line: t.line,
          col: t.col,
          start: t.start,
          end: t.end,
          quote: t.quote,
          prevToken: t.prevToken,
          classification
        };
        allStrings.push(item);
        if (classification === "USER_FACING_CONFIRMED" || classification === "USER_FACING_CANDIDATE") {
          candidates.push(item);
        }
      }
    });

    return { allStrings, candidates };
  }

  /**
   * Aplica patches seguros exclusivamente com base nas candidatas aprovadas.
   */
  safePatchPlugin(pluginFilePath, translationsMap) {
    if (!fs.existsSync(pluginFilePath)) {
      return { success: false, status: "FILE_NOT_FOUND", patchedCount: 0 };
    }

    const originalContent = fs.readFileSync(pluginFilePath, "utf8");
    const originalHash = this.getHash(pluginFilePath);
    const originalSize = Buffer.byteLength(originalContent, "utf8");

    const preCheck = this.validateSyntax(originalContent, path.basename(pluginFilePath));
    if (!preCheck.valid) {
      return {
        success: false,
        status: "PLUGIN_ORIGINAL_INVALID_SYNTAX",
        patchedCount: 0,
        error: preCheck.error,
        originalHash,
        originalSize
      };
    }

    const { candidates } = this.extractCandidates(originalContent);

    const replacements = [];
    for (const c of candidates) {
      const translated = translationsMap.get(c.clean) || translationsMap.get(c.original);
      if (!translated || translated === c.clean || translated === c.original) {
        continue;
      }

      const escaped = translated.replace(new RegExp("\\" + c.quote, "g"), "\\" + c.quote);
      const newRaw = c.quote + escaped + c.quote;

      const lineStart = originalContent.lastIndexOf("\n", c.start) + 1;
      let lineEnd = originalContent.indexOf("\n", c.end);
      if (lineEnd === -1) lineEnd = originalContent.length;
      const lineContext = originalContent.slice(lineStart, lineEnd).trim();

      replacements.push({
        candidate: c,
        original: c.original,
        clean: c.clean,
        translated,
        newRaw,
        line: c.line,
        col: c.col,
        start: c.start,
        end: c.end,
        context: lineContext
      });
    }

    if (replacements.length === 0) {
      return {
        success: true,
        status: "NO_CHANGES_NEEDED",
        patchedCount: 0,
        changes: [],
        originalHash,
        originalSize
      };
    }

    // Aplica as alterações de trás para frente para manter offsets
    replacements.sort((a, b) => b.start - a.start);
    let patchedContent = originalContent;
    for (const r of replacements) {
      patchedContent = patchedContent.slice(0, r.start) + r.newRaw + patchedContent.slice(r.end);
    }

    const syntaxCheck = this.validateSyntax(patchedContent, path.basename(pluginFilePath));
    if (!syntaxCheck.valid) {
      return {
        success: false,
        status: "PATCH_FAILED_SYNTAX",
        patchedCount: 0,
        error: `Sintaxe inválida: ${syntaxCheck.error}`,
        originalHash,
        originalSize,
        changes: []
      };
    }

    fs.writeFileSync(pluginFilePath, patchedContent, "utf8");
    const patchedHash = this.getHash(pluginFilePath);
    const patchedSize = fs.statSync(pluginFilePath).size;

    return {
      success: true,
      status: "PATCHED_PLUGIN_RUNTIME",
      patchedCount: replacements.length,
      changes: replacements.reverse(),
      originalHash,
      originalSize,
      patchedHash,
      patchedSize,
      patchedContent
    };
  }

  rollbackPlugin(pluginFilePath, originalContentOrPath, expectedSha256) {
    if (typeof originalContentOrPath === "string" && !fs.existsSync(originalContentOrPath)) {
      fs.writeFileSync(pluginFilePath, originalContentOrPath, "utf8");
    } else if (fs.existsSync(originalContentOrPath)) {
      fs.copyFileSync(originalContentOrPath, pluginFilePath);
    }

    const currentHash = this.getHash(pluginFilePath);
    const verified = expectedSha256 ? currentHash === expectedSha256 : true;

    return {
      success: verified,
      verified,
      currentHash,
      expectedHash: expectedSha256
    };
  }
}

module.exports = PluginSafePatcher;
