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
   * Localiza todos os arquivos .rpy em game/ recursivamente
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
          walk(fullPath);
        } else if (item.endsWith('.rpy')) {
          rpyFiles.push(fullPath);
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
    if (/\[.*?\b(or|and|not|in|is|if|else)\b.*?\]/i.test(clean)) return false;

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
      'scene', 'show', 'hide', 'play', 'stop', 'image', 'define', 'default',
      'transform', 'init', 'python', 'jump', 'call', 'return', 'pass', 'window',
      'pause', 'with', 'label', 'menu', 'renpy', 'queue', 'voice', 'sound', '$'
    ]);

    for (const fullPath of rpyFiles) {
      const relFile = path.relative(gameSubDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      let currentContext = 'global';

      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const trimmed = line.trim();

        // Ignora comentários puros
        if (trimmed.startsWith('#')) continue;

        // Atualiza contexto de label ou screen
        const labelMatch = trimmed.match(/^label\s+([a-zA-Z0-9_]+):/);
        if (labelMatch) {
          currentContext = `label:${labelMatch[1]}`;
          continue;
        }
        const screenMatch = trimmed.match(/^screen\s+([a-zA-Z0-9_]+)/);
        if (screenMatch) {
          currentContext = `screen:${screenMatch[1]}`;
          continue;
        }

        const addCandidate = (cleanText, rawText, type, contextSuffix = '') => {
          if (!this.isTranslatable(cleanText)) return;
          const clean = cleanText.trim();
          const id = this.generateId(relFile, lineNum, clean);
          if (!seenTexts.has(id)) {
            seenTexts.add(id);
            const { protectedText, tokens } = this.codeProtector.protect(clean, 'renpy');
            results.push({
              id,
              original: clean,
              clean,
              raw: rawText,
              file: relFile,
              line: lineNum,
              context: contextSuffix ? `${currentContext}#${contextSuffix}` : currentContext,
              type,
              protectedText,
              tokens: tokens || [],
              engine: 'renpy'
            });
          }
        };

        // 1. Strings encapsuladas em _("...") ou __("...")
        const transWrapperMatch = line.matchAll(/_{1,2}\(\s*("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\)/g);
        for (const tm of transWrapperMatch) {
          const raw = tm[2] !== undefined ? tm[2] : tm[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'interface_string');
        }

        // 2. Blocos old "..." de catálogos de tradução já existentes
        const oldStringMatch = trimmed.match(/^old\s+("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')$/);
        if (oldStringMatch) {
          const raw = oldStringMatch[2] !== undefined ? oldStringMatch[2] : oldStringMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'string_catalog');
        }

        // 3. Escolhas de Menu: "Choice text": ou "Choice text" if cond: ou _("Choice"):
        const menuChoiceMatch = trimmed.match(/^("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?:\s+if\s+.*)?\s*:$/);
        if (menuChoiceMatch) {
          const raw = menuChoiceMatch[2] !== undefined ? menuChoiceMatch[2] : menuChoiceMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'menu_choice');
        }

        // 4. Textos de Tela UI: text "...", textbutton "...", label "...", tooltip "..."
        const uiTextMatch = trimmed.match(/^(?:text|textbutton|label|tooltip)\s+("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (uiTextMatch) {
          const raw = uiTextMatch[2] !== undefined ? uiTextMatch[2] : uiTextMatch[3];
          const unescaped = unescapeRenpyString(raw);
          addCandidate(unescaped, raw, 'screen_text');
        }

        // 5. Diálogos com personagem (com ou sem atributos) ou narrador:
        // Ex: e happy "Hello" ou "Narrator text" ou character "Dialogue"
        const dialogueMatch = trimmed.match(/^(?:([a-zA-Z0-9_]+)(?:\s+[@a-zA-Z0-9_]+)*\s+)?("((?:[^"\\]|\\.)*)")$/);
        if (dialogueMatch) {
          const charId = dialogueMatch[1] || 'narrator';
          const raw = dialogueMatch[3];
          if (!ignoredKeywords.has(charId)) {
            const unescaped = unescapeRenpyString(raw);
            addCandidate(unescaped, raw, 'dialogue', charId);
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
