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
 * Format string into strict Ren'Py string literal (converting physical newlines to \n and escaping quotes).
 * @param {string} text 
 * @returns {string} Formatted string literal
 */
function formatRenpyStringLiteral(text) {
  if (text === null || text === undefined) return '""';
  let str = String(text);
  str = str.replace(/\r\n/g, "\n");
  str = str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  str = str.replace(/\n/g, "\\n");
  return `"${str}"`;
}

/**
 * Formats translation entries into standard Ren'Py string translation blocks.
 * Generates dual translate blocks (pt_BR and pt) for maximum game engine compatibility.
 * @param {Array<{ oldText: string, newText: string, location?: string }>} entries 
 * @param {string} lang 
 * @returns {string} Generated .rpy content
 */
function buildRenpyStringTlContent(entries, lang = "pt_BR") {
  let content = `# OpenTranslator Generated Translation File - ${lang}\n`;
  content += `# Timestamp: ${new Date().toISOString()}\n\n`;

  const langs = (lang === "pt_BR" || lang === "pt") ? ["pt_BR", "pt"] : [lang];

  for (const currentLang of langs) {
    content += `translate ${currentLang} strings:\n\n`;
    for (const entry of entries) {
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
  }

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
    const cleanStr = textVal.trim();
    if (cleanStr.length < 2) return;

    // --- BLINDAGEM ANTI-CORRUPÇÃO DE CÓDIGO ---
    // Bloqueia qualquer string que contenha colchetes com lógica Python (or, and, not, etc.)
    if (/\[.*?\b(or|and|not|in|is|if|else)\b.*?\]/i.test(cleanStr)) {
      return;
    }
    // Bloqueia variáveis puras entre colchetes
    if (/^\[[a-zA-Z0-9._!]+\]$/.test(cleanStr)) {
      return;
    }
    // ------------------------------------------

    if (seen.has(cleanStr)) return;
    if (/\.(?:png|jpg|jpeg|webp|gif|bmp|tga|ogg|wav|mp3|flac|aac|m4a|opus|mp4|avi|webm|ttf|otf|woff|rpy|rpyc|py|pyc|json)$/i.test(cleanStr)) return;
    if (/^[a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+$/.test(cleanStr)) return;

    seen.add(cleanStr);
    entries.push({
      file: filePath,
      original: cleanStr,
      clean: cleanStr
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
  const PYTHON_ATTR_RE = /\b(?:name|desc|description|title|label|heading|summary|text|prompt|msg|message|header|name_cap|short_name)\s*[:=]\s*(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let pyAttrMatch;

  while ((pyAttrMatch = PYTHON_ATTR_RE.exec(rpyContent)) !== null) {
    const val = pyAttrMatch[1] || pyAttrMatch[2] || pyAttrMatch[3] || pyAttrMatch[4];
    processMatch(val);
  }

  // Step 4: Standard Ren'Py Character Dialogues & Narrator Lines (e.g. tony e_c "Have ya ever seen...", "Hello!", anon "N-no, sir.")
  const RENPY_DIALOGUE_RE = /^[ \t]*(?:[a-zA-Z0-9_.]+(?:\s+[a-zA-Z0-9_.]+)*\s+)?(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
  let dialogueMatch;

  while ((dialogueMatch = RENPY_DIALOGUE_RE.exec(rpyContent)) !== null) {
    const val = dialogueMatch[1] || dialogueMatch[2] || dialogueMatch[3] || dialogueMatch[4];
    processMatch(val);
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

module.exports = {
  ensureTlDirectory,
  buildRenpyStringTlContent,
  injectRenpyFontConfig,
  extractRenpyRpyTexts,
  purgeCacheFiles
};
