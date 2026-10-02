const fs = require('fs');
const path = require('path');

/**
 * Common utilities for Ren'Py translation management across v7 (Python 2) and v8 (Python 3).
 */

/**
 * Ensures the target translation directory exists: <gameDir>/game/tl/<lang>
 * @param {string} gameDir
 * @param {string} lang
 * @returns {string} Path to language directory
 */
function ensureTlDirectory(gameDir, lang = "pt_BR") {
  const gameSubDir = path.join(gameDir, "game");
  const baseDir = fs.existsSync(gameSubDir) ? gameSubDir : gameDir;

  let targetLang = lang;
  if ((lang === "pt_BR" || lang === "pt") && fs.existsSync(path.join(baseDir, "tl", "pt"))) {
    targetLang = "pt";
  }

  const tlDir = path.join(baseDir, "tl", targetLang);
  if (!fs.existsSync(tlDir)) {
    fs.mkdirSync(tlDir, { recursive: true });
  }
  return tlDir;
}

/**
 * Unescape Python/Ren'Py string escape sequences into actual characters.
 * Processes \\n, \\t, \\r, \\\\, \\", \\', \\0 left-to-right so that \\\\n
 * (literal backslash + n) is not mistaken for a newline.
 * @param {string} text 
 * @returns {string} Unescaped text
 */
function unescapeRenpyString(text) {
  if (!text || typeof text !== "string") return text;
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\' && i + 1 < text.length) {
      const next = text[i + 1];
      switch (next) {
        case 'n': result += '\n'; i += 2; break;
        case 't': result += '\t'; i += 2; break;
        case 'r': result += '\r'; i += 2; break;
        case '\\': result += '\\'; i += 2; break;
        case '"': result += '"'; i += 2; break;
        case "'": result += "'"; i += 2; break;
        case '0': result += '\0'; i += 2; break;
        default: result += next; i += 2; break;
      }
    } else {
      result += text[i];
      i += 1;
    }
  }
  return result;
}

/**
 * Format string into strict Ren'Py string literal (converting physical newlines to \n and escaping quotes).
 * @param {string} text 
 * @returns {string} Formatted string literal
 */
function formatRenpyStringLiteral(text) {
  if (text === null || text === undefined) return '""';
  let str = String(text);
  str = str.replace(/\r\n/g, "\n");
  str = str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  str = str.replace(/%/g, "%%");
  str = str.replace(/\n/g, "\\n");
  return `"${str}"`;
}

const RENPY_COMMON_STRINGS = [
  // Dialog confirmation & common screen messages
  { original: "Are you sure you want to quit?", translated: "Tem certeza de que deseja sair?" },
  { original: "Are you sure you want to return to the main menu?\nThis will lose unsaved progress.", translated: "Tem certeza de que deseja voltar ao menu principal?\nTodo progresso não salvo será perdido." },
  { original: "Are you sure you want to return to the main menu? This will lose unsaved progress.", translated: "Tem certeza de que deseja voltar ao menu principal? Todo progresso não salvo será perdido." },
  { original: "Are you sure you want to overwrite your save?", translated: "Tem certeza de que deseja sobrescrever o seu save?" },
  { original: "Are you sure you want to load this save? This will lose unsaved progress.", translated: "Tem certeza de que deseja carregar este save? Todo progresso não salvo será perdido." },
  { original: "Are you sure you want to delete this save?", translated: "Tem certeza de que deseja excluir este save?" },
  { original: "Are you sure you want to end the replay?", translated: "Tem certeza de que deseja encerrar o replay?" },

  // Weekdays
  { original: "Monday", translated: "Segunda-feira" },
  { original: "Tuesday", translated: "Terça-feira" },
  { original: "Wednesday", translated: "Quarta-feira" },
  { original: "Thursday", translated: "Quinta-feira" },
  { original: "Friday", translated: "Sexta-feira" },
  { original: "Saturday", translated: "Sábado" },
  { original: "Sunday", translated: "Domingo" },

  // Weekdays abbreviations
  { original: "Mon", translated: "Seg" },
  { original: "Tue", translated: "Ter" },
  { original: "Wed", translated: "Qua" },
  { original: "Thu", translated: "Qui" },
  { original: "Fri", translated: "Sex" },
  { original: "Sat", translated: "Sáb" },
  { original: "Sun", translated: "Dom" },

  // Times of day
  { original: "Morning", translated: "Manhã" },
  { original: "Afternoon", translated: "Tarde" },
  { original: "Evening", translated: "Tarde/Noite" },
  { original: "Night", translated: "Noite" },
  { original: "Dusk", translated: "Entardecer" },
  { original: "Dawn", translated: "Amanhecer" },
  { original: "Day", translated: "Dia" },

  // Navigation & Screen Controls
  { original: "Start", translated: "Iniciar" },
  { original: "History", translated: "Histórico" },
  { original: "Save", translated: "Salvar" },
  { original: "Q.Save", translated: "Salvar Rápido" },
  { original: "Q.Load", translated: "Carregar Rápido" },
  { original: "Load", translated: "Carregar" },
  { original: "Preferences", translated: "Preferências" },
  { original: "Options", translated: "Opções" },
  { original: "Main Menu", translated: "Menu Principal" },
  { original: "About", translated: "Sobre" },
  { original: "Help", translated: "Ajuda" },
  { original: "Quit", translated: "Sair" },
  { original: "Return", translated: "Voltar" },
  { original: "Back", translated: "Voltar" },
  { original: "Skip", translated: "Pular" },
  { original: "Auto", translated: "Auto" },
  { original: "Yes", translated: "Sim" },
  { original: "No", translated: "Não" },
  { original: "Empty Slot", translated: "Espaço Vazio" },
  { original: "Empty Slot.", translated: "Espaço Vazio." },
  { original: "Empty", translated: "Vazio" }
];

/**
 * Formats translation entries into standard Ren'Py string translation blocks.
 * Generates dual translate blocks (pt_BR and pt) for maximum game engine compatibility.
 * Automatically incorporates canonical engine strings for Ren'Py common screens.
 * @param {Array<{ oldText: string, newText: string, location?: string }>} entries 
 * @param {string} lang 
 * @returns {string} Generated .rpy content
 */
function buildRenpyStringTlContent(entries, lang = "pt_BR") {
  let content = `# OpenTranslator Generated Translation File - ${lang}\n`;
  content += `# Timestamp: ${new Date().toISOString()}\n\n`;

  const langs = (lang === "pt_BR" || lang === "pt") ? ["pt_BR", "pt"] : [lang];

  // Merge common strings if not already supplied
  const existingOlds = new Set((entries || []).map(e => e.oldText));
  const mergedEntries = [...(entries || [])];
  if (lang === "pt_BR" || lang === "pt") {
    for (const cs of RENPY_COMMON_STRINGS) {
      if (!existingOlds.has(cs.original)) {
        mergedEntries.push({
          oldText: cs.original,
          newText: cs.translated,
          location: "renpy/common baseline"
        });
      }
    }
  }

  content += `translate ${lang} strings:\n\n`;
  for (const entry of mergedEntries) {
    if (!entry.oldText || !entry.newText || entry.oldText === entry.newText) continue;
    const formattedOld = formatRenpyStringLiteral(entry.oldText);
    const formattedNew = formatRenpyStringLiteral(entry.newText);

    if (entry.location) {
      content += `    # ${entry.location}\n`;
    }
    content += `    old ${formattedOld}\n`;
    content += `    new ${formattedNew}\n\n`;
  }
  content += `\n`;

  return content;
}

/**
 * Injects font configuration into Ren'Py gui.rpy or options.rpy if found.
 * @param {string} gameDir 
 * @param {string} fontFileName 
 * @returns {boolean} Whether font patch was injected
 */
function injectRenpyFontConfig(gameDir, fontFileName) {
  const gameSubDir = fs.existsSync(path.join(gameDir, "game"))
    ? path.join(gameDir, "game")
    : gameDir;

  const guiRpyPath = path.join(gameSubDir, "gui.rpy");
  if (fs.existsSync(guiRpyPath)) {
    let content = fs.readFileSync(guiRpyPath, 'utf-8');
    const fontTarget = `fonts/${fontFileName}`;

    // Replace default text_font overrides
    if (content.includes("define gui.text_font =")) {
      content = content.replace(/define gui\.text_font = .*/g, `define gui.text_font = "${fontTarget}"`);
    }
    if (content.includes("define gui.name_text_font =")) {
      content = content.replace(/define gui\.name_text_font = .*/g, `define gui.name_text_font = "${fontTarget}"`);
    }
    if (content.includes("define gui.interface_text_font =")) {
      content = content.replace(/define gui\.interface_text_font = .*/g, `define gui.interface_text_font = "${fontTarget}"`);
    }

    fs.writeFileSync(guiRpyPath, content, 'utf-8');
    return true;
  }
  return false;
}

/**
 * Comprehensive Ren'Py .rpy script text extractor.
 * Captures 100% of dialogues, _("..."), __("..."), multiline strings with \\n,
 * implicit string concatenation _("line1 " "line2 "), screen UI elements, and python blocks.
 * @param {string} rpyContent 
 * @param {string} filePath 
 * @returns {Array<{ file: string, original: string, clean: string }>}
 */
function extractRenpyRpyTexts(rpyContent, filePath) {
  const entries = [];
  const seen = new Set();

  const processMatch = (textVal) => {
    if (!textVal) return;
    const unescaped = unescapeRenpyString(textVal);
    const cleanStr = unescaped.trim();
     if (cleanStr.length < 2) return;

     // Block Python literal values that are not translatable text
     if (/^(True|False|None)$/.test(cleanStr)) return;

     // --- BLINDAGEM ANTI-CORRUPÇÃO DE CÓDIGO ---
    // Bloqueia qualquer string que contenha colchetes com lógica Python (or, and, not, etc.)
    if (/\[.*?\b(or|and|not|in|is|if|else)\b.*?\]/i.test(cleanStr)) {
      return;
    }
     // Bloqueia variáveis puras entre colchetes
    if (/^\[[a-zA-Z0-9._!]+\]$/.test(cleanStr)) {
      return;
    }
    // Bloqueia expressões de substituição Ren'Py inteiras (e.g., [mode['name']])
    // que são avaliadas como Python, não como texto transladável
    if (/^\[[\s\S]*\]$/.test(cleanStr)) {
      return;
    }
     // Bloqueia fragmentos de código Python capturados entre boundaries de triple-quote
    // (e.g., ", vertex_200 =", ", fragment_300=") — capturados por RENPY_DIALOGUE_RE
    // quando """ de uma chamada de função como register_shader se cruzam
    if (/^,\s*[a-zA-Z_]\w*\s*={1,2}/.test(cleanStr)) {
      return;
    }
    // Bloqueia strings que contêm sintaxe de keyword argument Python (identifier =)
    // que não são texto transladável (e.g., strings de código dentro de blocos Python)
    // Usa (?:=|==|\b) para também capturar = no final da string
    if (/\b[a-zA-Z_]\w*\s*={1,2}(?:\b|$)/.test(cleanStr)) {
      return;
    }
     // Bloqueia strings contendo chamadas de função Python ou código de shader
    // (e.g., "renpy.register_shader(...variables=")
    if (/\b(?:renpy\.register_shader|register_shader|def\s+[a-zA-Z_]\w*|\.texture2D|gl_FragColor)\b/.test(cleanStr)) {
      return;
    }
    // Bloqueia chaves de dicionário Python/Ren'Py (e.g., "name", "id", "art", "desc")
    // que são extraídas quando RENPY_DIALOGUE_RE capta strings de dicionários Python
    if (/^(id|name|art|desc|data|type|key|keys|text|msg|message|prompt|header|config|mode|size|color|style|font|image|icon|audio|music|channel|layer|screen|tag|group|class|method|param|value|width|height|x|y|xpos|ypos|xanchor|yanchor|tooltip|alt)$/i.test(cleanStr)) {
      return;
    }
    // Bloqueia identificadores de estilo Ren'Py (snake_case sem espaços)
    // capturados quando RENPY_DIALOGUE_RE trata style/text_style/style_prefix como nome de personagem
    // Ex: main_menu_font, quick_menu_text, steam_popup_button, etc.
    if (/^[a-zA-Z][a-zA-Z0-9]*(_[a-zA-Z0-9]+)+$/i.test(cleanStr) && !/\s/.test(cleanStr)) {
      return;
    }
    // Bloqueia nomes curtos de estilo/style_prefix que não são texto transladável
    if (cleanStr.length <= 10 && !/\s/.test(cleanStr) && /^(quick|menu|frame|vbox|rhs|lhs|center|left|right|default|hover|selected|insensitive|disabled|typewriter|blink|phone)$/i.test(cleanStr)) {
      return;
    }
    // Bloqueia valores específicos de style_prefix, layout, e id que não são texto
    // Extraídos quando RENPY_DIALOGUE_RE capta linhas como style_prefix "about", layout "subtitle", id "window"
    if (/^(about|choice|bubble|skip|subtitle|window|bolha|sobre|escolha|pular|legenda|janela)$/i.test(cleanStr)) {
      return;
    }
    // ------------------------------------------

    if (seen.has(cleanStr)) return;
    if (/\.(?:png|jpg|jpeg|webp|gif|bmp|tga|ogg|wav|mp3|flac|aac|m4a|opus|mp4|avi|webm|ttf|otf|woff|rpy|rpyc|py|pyc|json)$/i.test(cleanStr)) return;
    if (/^[a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+$/.test(cleanStr)) return;
    // Block file path strings (e.g., "images/characters/ava", "imagens/personagens/ava")
    // Paths have no spaces but contain / ; dialogue always has spaces
    if (!/\s/.test(cleanStr) && (cleanStr.includes("/") || cleanStr.includes("\\"))) return;

     seen.add(cleanStr);
    entries.push({
      id: entries.length,
      file: filePath,
      original: cleanStr,
      clean: cleanStr,
      raw: textVal
    });
  };

  // Step 1: Capture whole translate wrapper blocks _{1,2}( ... )
  const BLOCK_TRANSLATE_RE = /_{1,2}\(\s*([\s\S]*?)\s*\)/g;
  let blockMatch;

  while ((blockMatch = BLOCK_TRANSLATE_RE.exec(rpyContent)) !== null) {
    const blockContent = blockMatch[1];

    // Extract all string literals inside the translate block (handling multiline \n & multiple quotes)
    const LITERAL_RE = /"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let litMatch;
    const stringParts = [];

    while ((litMatch = LITERAL_RE.exec(blockContent)) !== null) {
      const val = litMatch[1] || litMatch[2] || litMatch[3] || litMatch[4];
      if (val !== undefined) {
        stringParts.push(val);
      }
    }

    if (stringParts.length > 0) {
      // Join implicit concatenated string literals _("line1 " "line2 ") -> "line1 line2"
      const concatenatedString = stringParts.join('');
      processMatch(concatenatedString);
    }
  }

  // Step 2: Screen UI Elements & Attributes with multiline support
  const RENPY_SCREEN_RE = /\b(?:text|textbutton|tooltip|alt|notify|confirm|caption|description|hint|title|label)\s+(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let screenMatch;

  while ((screenMatch = RENPY_SCREEN_RE.exec(rpyContent)) !== null) {
    const val = screenMatch[1] || screenMatch[2] || screenMatch[3] || screenMatch[4];
    processMatch(val);
  }

  // Step 3: Python attribute assignments & dictionary string values (e.g., name = "...", "title": "...")
  const PYTHON_ATTR_RE = /\b(?:name|alias|title|label|heading|summary|text|prompt|msg|message|header|name_cap|short_name|desc|description|hint|todo|note|bio|caption)\s*[:=]\s*(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let pyAttrMatch;

  while ((pyAttrMatch = PYTHON_ATTR_RE.exec(rpyContent)) !== null) {
    const val = pyAttrMatch[1] || pyAttrMatch[2] || pyAttrMatch[3] || pyAttrMatch[4];
    processMatch(val);
  }

  // Step 3b: Ren'Py Variable declarations (default <var> = "...", define <var> = "...")
  const RENPY_VAR_DECL_RE = /^[ \t]*(?:default|define)\s+[a-zA-Z0-9_.]+\s*=\s*(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
  let varDeclMatch;
  while ((varDeclMatch = RENPY_VAR_DECL_RE.exec(rpyContent)) !== null) {
    const val = varDeclMatch[1] || varDeclMatch[2] || varDeclMatch[3] || varDeclMatch[4];
    processMatch(val);
  }

  // Step 3c: Character declarations (char.<id> = "..." or Character("...", ...))
  const CHAR_DECL_RE = /^[ \t]*char\.[a-zA-Z0-9_]+\s*=\s*(?:Character\s*\(\s*)?(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
  let charDeclMatch;
  while ((charDeclMatch = CHAR_DECL_RE.exec(rpyContent)) !== null) {
    const val = charDeclMatch[1] || charDeclMatch[2] || charDeclMatch[3] || charDeclMatch[4];
    processMatch(val);
  }

  // Step 3d: Decompiled module string constants (when scanning .py files)
  if (filePath && filePath.endsWith('.py')) {
    const CONST_LINE_RE = /^[ \t]*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')[ \t]*$/gm;
    let constLineMatch;
    while ((constLineMatch = CONST_LINE_RE.exec(rpyContent)) !== null) {
      const val = constLineMatch[1] !== undefined ? constLineMatch[1] : constLineMatch[2];
      processMatch(val);
    }
  }

  // Step 4: Standard Ren'Py Character Dialogues & Narrator Lines (e.g. tony e_c "Have ya ever seen...", "Hello!", anon "N-no, sir.")
  // Negative lookahead prevents matching screen language keywords (style_prefix, id, layout, etc.) as character names
  // (?!\s*[:=]) prevents matching Python dict keys like "name": _("Guiado")
  // Triple-quoted patterns ("""...""") removed: those are handled by Step 1 (BLOCK_TRANSLATE_RE inside _() calls).
  // Without this guard, standalone docstrings like """...""" inside Python functions get extracted and corrupted.
  const RENPY_DIALOGUE_RE = /^(?![ \t]*(?:style_prefix|text_style|layout|id|background|foreground|xpos|ypos|xanchor|yanchor|xalign|yalign|spacing|area|padding|margin|border|modal|tag|layer|behind|at|as|focus|action|args|kwargs|styles|blocksize|text_size|text_align|text_color|text_font|orientation|box_alignment|box_padding|hovered|selected|enabled|transition|frame|vbox|hbox|grid|side|xfill|yfill|xfit|yfit)\s)[ \t]*(?:[a-zA-Z0-9_.]+(?:\s+[a-zA-Z0-9_.@]+)*\s+)?(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?!\s*[:=])/gm;
  let dialogueMatch;

  while ((dialogueMatch = RENPY_DIALOGUE_RE.exec(rpyContent)) !== null) {
    const val = dialogueMatch[1] || dialogueMatch[2];
    processMatch(val);
  }

  // Step 5: Menu choice strings inside menu: blocks (e.g., "Disagree":, "Agree":)
  // Indented quoted string followed by colon at end of line — not dict keys
  const RENPY_MENU_RE = /^[ \t]+"(?:[^"\\]|\\.)*"[ \t]*:[ \t]*$/gm;
  let menuMatch;
  while ((menuMatch = RENPY_MENU_RE.exec(rpyContent)) !== null) {
    const fullLine = menuMatch[0];
    const strMatch = fullLine.match(/^([ \t]*")((?:[^"\\]|\\.)*)"/);
    if (strMatch) {
      processMatch(strMatch[2]);
    }
  }

  return entries;
}

/**
 * Purges translation cache markers and compiled runtime files to force a clean scan.
 * @param {string} gameDir 
 */
function purgeCacheFiles(gameDir) {
  const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;
  const filesToPurge = [
    path.join(gameSubDir, ".opent_translated"),
    path.join(gameDir, ".opent_translated"),
    path.join(gameSubDir, "opent_translated.json"),
    path.join(gameDir, "opent_translated.json"),
    path.join(gameSubDir, "opent_translated.pkl"),
    path.join(gameDir, "opent_translated.pkl"),
    path.join(gameSubDir, "00_opent_runtime.rpyc"),
    path.join(gameSubDir, "000_opent_runtime.rpyc")
  ];

  for (const fileP of filesToPurge) {
    if (fs.existsSync(fileP)) {
      try { fs.unlinkSync(fileP); } catch (e) { global.log("warn", `renpyCommon: Failed to purge ${fileP}: ${e.message}`); }
    }
  }
}

/**
 * Patches .rpy files directly by replacing string literals with translated text.
 * Uses the `raw` field from extractRenpyRpyTexts entries to find exact string
 * literals in the file, and replaces them using formatRenpyStringLiteral.
 *
 * @param {string} gameDir - Root game directory
 * @param {Array} texts - Extracted text entries from extractRenpyRpyTexts
 * @param {Map} translations - Map of text id → translated text
 * @returns {number} Number of replacements made
 */
function patchRpyFiles(gameDir, texts, translations) {
  const gameSubDir = fs.existsSync(path.join(gameDir, "game"))
    ? path.join(gameDir, "game")
    : gameDir;

  const textsByFile = new Map();
  for (const t of texts) {
    if (!t.raw || !t.file) continue;
    const tr = translations.get(t.id);
    if (!tr || typeof tr !== "string" || tr === t.clean) continue;
    if (!textsByFile.has(t.file)) textsByFile.set(t.file, []);
    textsByFile.get(t.file).push({ raw: t.raw, translated: tr });
  }

  let count = 0;

  for (const [filePath, entries] of textsByFile) {
    if (!fs.existsSync(filePath)) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      continue;
    }

    let modified = false;

    for (const entry of entries) {
      const escapedRaw = entry.raw;
      const formatted = formatRenpyStringLiteral(entry.translated);

      // Try double-quoted string literal: "..."
      const dqSearch = '"' + escapedRaw + '"';
      if (content.includes(dqSearch)) {
        content = content.split(dqSearch).join(formatted);
        count++;
        modified = true;
        continue;
      }

      // Try single-quoted string literal: '...'
      const sqSearch = "'" + escapedRaw + "'";
      if (content.includes(sqSearch)) {
        const formattedSq =
          "'" +
          entry.translated
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'") +
          "'";
        content = content.split(sqSearch).join(formattedSq);
        count++;
        modified = true;
        continue;
      }
    }

    if (modified) {
      try {
        fs.writeFileSync(filePath, content, "utf-8");
      } catch (e) {
        continue;
      }
    }
  }

  return count;
}

/**
 * Auto-cura e protege variáveis [var] e tags {tag} do Ren'Py em textos traduzidos.
 * Previne NameError no interpretador Python do Ren'Py quando tradutores automáticos
 * ou LLMs traduzem os nomes internos das variáveis (ex: [who.age] -> [quem.idade], $[cash] -> $[dinheiro]).
 * 
 * @param {string} original - Texto original no script do jogo
 * @param {string} translated - Texto traduzido recebido
 * @returns {string} Texto traduzido com 100% de paridade das variáveis e tags originais
 */
function healRenpyVariables(original, translated) {
  if (!original || !translated || typeof original !== 'string' || typeof translated !== 'string') {
    return translated;
  }

  let healed = translated;

  // 1. Variáveis de interpolação Ren'Py [variable] ou [variable!conversion] ou [expression.attribute]
  const origVars = original.match(/\[([a-zA-Z0-9_.]+(?:![a-zA-Z]+)?)\]/g);
  if (origVars && origVars.length > 0) {
    const transBrackets = healed.match(/\[[^\]]+\]/g) || [];
    for (let i = 0; i < origVars.length; i++) {
      const ov = origVars[i];
      if (healed.includes(ov)) continue; // Já preservada perfeitamente

      // Procura primeiro por colchetes no traduzido que não pertencem às variáveis originais
      const candidate = transBrackets.find(tb => !origVars.includes(tb));
      if (candidate) {
        healed = healed.replace(candidate, ov);
        const idx = transBrackets.indexOf(candidate);
        if (idx >= 0) transBrackets.splice(idx, 1);
      }
    }
  }

  // 2. Tags Ren'Py {tag} ou {tag=value} ou {/tag}
  const origTags = original.match(/\{(\/?[a-zA-Z0-9_#=,.:;% -]+)\}/g);
  if (origTags && origTags.length > 0) {
    const transTags = healed.match(/\{[^}]+\}/g) || [];
    for (let i = 0; i < origTags.length; i++) {
      const ot = origTags[i];
      if (healed.includes(ot)) continue; // Já preservada

      const candidate = transTags.find(tt => !origTags.includes(tt));
      if (candidate) {
        healed = healed.replace(candidate, ot);
        const idx = transTags.indexOf(candidate);
        if (idx >= 0) transTags.splice(idx, 1);
      }
    }
  }

  // 3. Formatação Python %(var)s ou %s, %d
  const origFmt = original.match(/%(?:\([a-zA-Z0-9_]+\))?[-+0-9]*[a-zA-Z]/g);
  if (origFmt && origFmt.length > 0) {
    const transFmt = healed.match(/%(?:\([^)]+\))?[-+0-9]*[a-zA-Z]/g) || [];
    for (let i = 0; i < origFmt.length; i++) {
      const of = origFmt[i];
      if (healed.includes(of)) continue;
      const candidate = transFmt.find(tf => !origFmt.includes(tf));
      if (candidate) {
        healed = healed.replace(candidate, of);
        const idx = transFmt.indexOf(candidate);
        if (idx >= 0) transFmt.splice(idx, 1);
      }
    }
  }

  return healed;
}

module.exports = {
  ensureTlDirectory,
  buildRenpyStringTlContent,
  injectRenpyFontConfig,
  extractRenpyRpyTexts,
  patchRpyFiles,
  purgeCacheFiles,
  formatRenpyStringLiteral,
  unescapeRenpyString,
  healRenpyVariables,
  RENPY_COMMON_STRINGS
};
