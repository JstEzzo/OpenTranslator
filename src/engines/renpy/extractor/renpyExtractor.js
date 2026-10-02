/**
 * renpyExtractor.js — Extrator oficial e canônico de textos do motor Ren'Py
 * 
 * Suporta:
 * - Diálogos (personagem e narrador com ou sem atributos)
 * - Menus de escolha (com ou sem condicionais if)
 * - Telas Ren'Py (text, textbutton, label, tooltip)
 * - Strings de interface (_("..."), __("...")) e blocos old "..."
 * - Proteção de variáveis [player], [name], [points] e tags {b}, {i}, {color}, {size}
 * - Descompilação segura automática de arquivos .rpyc quando necessário
 * - Geração de IDs estáveis baseados em hash determinístico SHA-256
 * - Gravação estruturada em extraction/extracted_strings.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { unescapeRenpyString } = require('../renpyCommon');
const CodeProtector = require('../../../core/codeProtector');

class RenpyExtractor {
  constructor(options = {}) {
    this.options = options;
    this.codeProtector = new CodeProtector({ engine: 'renpy' });
  }

  /**
   * Resolve a pasta raiz do jogo (detecta se há pasta game/ direta ou subpasta aninhada)
   */
  resolveGameDir(gameDir) {
    if (!gameDir) return gameDir;
    if (fs.existsSync(path.join(gameDir, 'game'))) {
      return gameDir;
    }
    // Verifica subpastas de primeiro nível
    try {
      const items = fs.readdirSync(gameDir);
      for (const item of items) {
        const sub = path.join(gameDir, item);
        if (fs.statSync(sub).isDirectory()) {
          if (fs.existsSync(path.join(sub, 'game')) || fs.existsSync(path.join(sub, 'renpy'))) {
            return sub;
          }
        }
      }
    } catch (e) {}
    return gameDir;
  }

  /**
   * Localiza todos os arquivos .rpy, .rpym e .py em game/ recursivamente
   */
  findRpyFiles(gameDir) {
    const root = this.resolveGameDir(gameDir);
    const gameSubDir = path.join(root, 'game');
    const rpyFiles = [];

    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const st = fs.statSync(fullPath);
        if (st.isDirectory()) {
          // Ignora pasta tl/ (traduções já existentes) e cache/saves
          if (item === 'tl' || item === 'cache' || item === 'saves') continue;
          // Ignora diretório de runtime interno do Ren'Py na raiz do game
          const relToSub = path.relative(gameSubDir, fullPath).replace(/\\/g, '/');
          if (relToSub === 'renpy' || relToSub.startsWith('renpy/')) continue;
          walk(fullPath);
        } else if (item.endsWith('.rpy') || item.endsWith('.rpym') || item.endsWith('.py')) {
          if (!item.startsWith('00_opent_') && !item.startsWith('000_anti_')) {
            rpyFiles.push(fullPath);
          }
        }
      }
    }

    walk(gameSubDir);
    return rpyFiles;
  }

  /**
   * Filtro anti-corrupção: descarta strings que são código Python, shaders, nomes de variáveis ou arquivos
   */
  isTranslatable(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim();
    if (clean.length < 2) return false;

    // Constantes literais de Python
    if (/^(True|False|None)$/.test(clean)) return false;

    // Cores hexadecimais (#ffffff, #00000000)
    if (/^#([0-9a-fA-F]{3,8})$/.test(clean)) return false;

    // Identificadores de estilo de tela Ren'Py
    if (/^(window|namebox|input|choice|quick|navigation|main_menu|game_menu|slot|history|notify|confirm|skip|nvl|bubble)$/i.test(clean)) return false;

    // Nomes de arquivos / caminhos
    if (/\.(?:png|jpg|jpeg|webp|gif|bmp|ogg|wav|mp3|flac|mp4|webm|ttf|otf|rpy|rpyc|py|pyc|json)$/i.test(clean)) return false;
    if (!/\s/.test(clean) && (clean.includes('/') || clean.includes('\\'))) return false;

    // Variáveis puras entre colchetes ou expressões python
    if (/^\[[a-zA-Z0-9._!]+\]$/.test(clean)) return false;
    if (/\[[^\]]*\b(or|and|not|in|is|if|else)\b[^\]]*\]/i.test(clean)) return false;

    // Chamadas de shader / python
    if (/\b(?:renpy\.register_shader|register_shader|def\s+[a-zA-Z_]\w*|\.texture2D|gl_FragColor)\b/.test(clean)) return false;

    // Chaves de dicionário ou kwargs (ex: "color", "xpos =", "style")
    if (/^(id|name|art|desc|data|type|key|text|msg|message|prompt|header|config|mode|size|color|style|font|image|icon|audio|music|channel|layer|screen|tag|group|width|height|x|y|xpos|ypos|tooltip|alt)$/i.test(clean)) return false;
    if (/\b[a-zA-Z_]\w*\s*={1,2}(?:\b|$)/.test(clean)) return false;

    // Snake_case puro sem espaços (geralmente identificadores de estilo ou áudio)
    if (/^[a-zA-Z][a-zA-Z0-9]*(_[a-zA-Z0-9]+)+$/.test(clean) && !/\s/.test(clean)) return false;

    return true;
  }

  /**
   * Gera hash determinístico SHA-256 para cada texto
   */
  generateId(relFile, line, cleanText) {
    return crypto.createHash('sha256').update(`${relFile}:${line}:${cleanText}`).digest('hex').slice(0, 16);
  }

  /**
   * Executa extração completa de todos os textos
   */
  async extract(gameDir, outJsonPath = null) {
    const root = this.resolveGameDir(gameDir);
    const gameSubDir = path.join(root, 'game');
    let rpyFiles = this.findRpyFiles(root);

    // Se nenhum .rpy for encontrado mas existirem .rpyc ou .rpa, tenta descompilar
    if (rpyFiles.length === 0 && fs.existsSync(gameSubDir)) {
      try {
        const rootResources = global.ROOT || path.resolve(__dirname, '../../../..');
        const unpackScript = path.join(rootResources, 'resources', 'renpy', 'unpack_renpy_all.py');
        if (fs.existsSync(unpackScript)) {
          spawnSync('python', [unpackScript, '-i', gameSubDir, '-o', gameSubDir], {
            cwd: root,
            encoding: 'utf-8',
            timeout: 60000
          });
          rpyFiles = this.findRpyFiles(root);
        }
      } catch (e) {}
    }

    const results = [];
    const seenTexts = new Set();

    const ignoredKeywords = new Set([
      'scene', 'show', 'hide', 'play', 'stop', 'image',
      'transform', 'init', 'python', 'jump', 'call', 'return', 'pass', 'window',
      'pause', 'with', 'label', 'menu', 'renpy', 'queue', 'voice', 'sound', '$'
    ]);

    for (const fullPath of rpyFiles) {
      const relFile = path.relative(gameSubDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');

      let currentContext = 'global';

      const addCandidate = (cleanText, rawText, type, contextSuffix = '', customLineNum = 1) => {
        if (!this.isTranslatable(cleanText)) return;
        const clean = cleanText.trim();
        const targetLine = customLineNum || 1;
        const id = this.generateId(relFile, targetLine, clean);
        if (!seenTexts.has(id)) {
          seenTexts.add(id);
          const { protectedText, tokens } = this.codeProtector.protect(clean, 'renpy');
          results.push({
            id,
            original: clean,
            clean,
            raw: rawText,
            file: relFile,
            line: targetLine,
            context: contextSuffix ? `${currentContext}#${contextSuffix}` : currentContext,
            type,
            protectedText,
            tokens: tokens || [],
            engine: 'renpy'
          });
        }
      };

      // 1. Multi-line _(...) e __( ... ) com concatenação implícita de literais
      const BLOCK_TRANSLATE_RE = /_{1,2}\(\s*([\s\S]*?)\s*\)/g;
      let blockMatch;
      while ((blockMatch = BLOCK_TRANSLATE_RE.exec(content)) !== null) {
        const blockContent = blockMatch[1];
        const blockStartIndex = blockMatch.index;
        const bLineNum = content.substring(0, blockStartIndex).split('\n').length;

        const LITERAL_RE = /"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
        let litMatch;
        const stringParts = [];
        let rawJoined = '';

        while ((litMatch = LITERAL_RE.exec(blockContent)) !== null) {
          const val = litMatch[1] || litMatch[2] || litMatch[3] || litMatch[4];
          if (val !== undefined) {
            stringParts.push(val);
            rawJoined += val;
          }
        }

        if (stringParts.length > 0) {
          const concatenatedString = stringParts.join('');
          const unescaped = unescapeRenpyString(concatenatedString);
          addCandidate(unescaped, rawJoined, 'interface_string', '', bLineNum);
        }
      }

      // 2. Declarações de variáveis Ren'Py (default <var> = "...", define <var> = "...")
      const VAR_DECL_RE = /^[ \t]*(?:default|define)\s+[a-zA-Z0-9_.]+\s*=\s*(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
      let varMatch;
      while ((varMatch = VAR_DECL_RE.exec(content)) !== null) {
        const raw = varMatch[1] || varMatch[2] || varMatch[3] || varMatch[4];
        const vLineNum = content.substring(0, varMatch.index).split('\n').length;
        const unescaped = unescapeRenpyString(raw);
        addCandidate(unescaped, raw, 'variable_string', '', vLineNum);
      }

      // 3. Atribuições de propriedades e metadados (<objeto>.<propriedade> = "..." ou '...')
      const ATTR_ASSIGN_RE = /^[ \t]*[a-zA-Z0-9_.]+\.(?:name|alias|title|label|caption|bio|desc|description|hint|todo|note|text|prompt|msg|message|summary)\s*=\s*(?:_{1,2}\s*\(\s*)?(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
      let attrMatch;
      while ((attrMatch = ATTR_ASSIGN_RE.exec(content)) !== null) {
        const raw = attrMatch[1] || attrMatch[2] || attrMatch[3] || attrMatch[4];
        const aLineNum = content.substring(0, attrMatch.index).split('\n').length;
        const unescaped = unescapeRenpyString(raw);
        addCandidate(unescaped, raw, 'attribute_string', '', aLineNum);
      }

      // 4. Declarações diretas de personagens (char.<id> = "..." ou Character("...", ...))
      const CHAR_DECL_RE = /^[ \t]*char\.[a-zA-Z0-9_]+\s*=\s*(?:Character\s*\(\s*)?(?:_{1,2}\s*\(\s*)?(?:"{3}([\s\S]*?)"{3}|'{3}([\s\S]*?)'{3}|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/gm;
      let charDeclMatch;
      while ((charDeclMatch = CHAR_DECL_RE.exec(content)) !== null) {
        const raw = charDeclMatch[1] || charDeclMatch[2] || charDeclMatch[3] || charDeclMatch[4];
        const cLineNum = content.substring(0, charDeclMatch.index).split('\n').length;
        const unescaped = unescapeRenpyString(raw);
        addCandidate(unescaped, raw, 'character_name', '', cLineNum);
      }

      // 5. Constantes de módulos Python descompilados (.py)
      if (relFile.endsWith('.py')) {
        const CONST_LINE_RE = /^[ \t]*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')[ \t]*$/gm;
        let constLineMatch;
        while ((constLineMatch = CONST_LINE_RE.exec(content)) !== null) {
          const raw = constLineMatch[1] !== undefined ? constLineMatch[1] : constLineMatch[2];
          const mLineNum = content.substring(0, constLineMatch.index).split('\n').length;
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'module_constant', '', mLineNum);
        }
      }

      // 6. Varredura linha a linha para diálogos, escolhas de menu, telas e blocos old
      const lines = content.split(/\r?\n/);
      let inPythonBlock = false;
      let pythonBlockIndent = -1;

      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const trimmed = line.trim();

        // Ignora comentários puros
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Detecta início e término de blocos Python (init python, python:, init -... python, etc.)
        const currentIndent = line.search(/\S/);
        if (/^(?:init\s+(?:-\d+\s+)?python(?:\s+hide)?|python(?:\s+early)?):/i.test(trimmed)) {
          inPythonBlock = true;
          pythonBlockIndent = currentIndent >= 0 ? currentIndent : 0;
          continue;
        }

        if (inPythonBlock) {
          if (currentIndent >= 0 && currentIndent <= pythonBlockIndent && !trimmed.startsWith('#')) {
            inPythonBlock = false;
            pythonBlockIndent = -1;
          }
        }

        // Atualiza contexto de label ou screen
        const labelMatch = trimmed.match(/^label\s+([a-zA-Z0-9_]+):/);
        if (labelMatch) {
          currentContext = `label:${labelMatch[1]}`;
          inPythonBlock = false;
          continue;
        }
        const screenMatch = trimmed.match(/^screen\s+([a-zA-Z0-9_]+)/);
        if (screenMatch) {
          currentContext = `screen:${screenMatch[1]}`;
          inPythonBlock = false;
          continue;
        }

        // Blocos old "..." de catálogos de tradução já existentes
        const oldStringMatch = trimmed.match(/^old\s+("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')$/);
        if (oldStringMatch) {
          const raw = oldStringMatch[2] !== undefined ? oldStringMatch[2] : oldStringMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'string_catalog', '', lineNum);
        }

        // Escolhas de Menu: "Choice text": ou "Choice text" if cond: ou _("Choice"):
        const menuChoiceMatch = trimmed.match(/^("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?:\s+if\s+.*)?\s*:$/);
        if (menuChoiceMatch) {
          const raw = menuChoiceMatch[2] !== undefined ? menuChoiceMatch[2] : menuChoiceMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'menu_choice', '', lineNum);
        }

        // Textos de Tela UI: text "...", textbutton "...", label "...", tooltip "..."
        const uiTextMatch = trimmed.match(/^(?:text|textbutton|label|tooltip)\s+("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (uiTextMatch) {
          const raw = uiTextMatch[2] !== undefined ? uiTextMatch[2] : uiTextMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'screen_text', '', lineNum);
        }

        // Diálogos com personagem (com ou sem atributos) ou narrador (somente fora de blocos Python):
        if (!inPythonBlock) {
          const dialogueMatch = trimmed.match(/^(?:([a-zA-Z0-9_]+)(?:\s+[@a-zA-Z0-9_]+)*\s+)?("((?:[^"\\]|\\.)*)")$/);
          if (dialogueMatch) {
            const charId = dialogueMatch[1] || 'narrator';
            const raw = dialogueMatch[3];
            if (!ignoredKeywords.has(charId)) {
              const unescaped = unescapeRenpyString(raw);
              addCandidate(unescaped, raw, 'dialogue', charId, lineNum);
            }
          }
        }
      }
    }

    if (outJsonPath) {
      const parentDir = path.dirname(outJsonPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(outJsonPath, JSON.stringify({
        total: results.length,
        gameDir: root,
        extractedAt: new Date().toISOString(),
        texts: results
      }, null, 2), 'utf8');
    }

    return {
      success: true,
      count: results.length,
      texts: results
    };
  }
}

module.exports = RenpyExtractor;
