/**
 * renpyInjector.js — Injetor Canônico e Puramente Aditivo para Ren'Py
 * 
 * Estrutura gerada em game/tl/pt_BR/:
 * - 000_opentranslator_init.rpy (config.language = "pt_BR" e ativação automática)
 * - strings.rpy (tradução de strings de interface e escolhas de menu)
 * - dialogues.rpy (tradução de diálogos e falas de personagens)
 * - screens.rpy (tradução de elementos de telas, textbuttons e rótulos)
 * 
 * Regra Absoluta:
 * NUNCA editar arquivos originais (script.rpy, screens.rpy, options.rpy, gui.rpy).
 * Somente arquivos novos são criados.
 * Rollback remove 100% dos arquivos injetados garantindo BEFORE == RESTORED.
 */

const fs = require('fs');
const path = require('path');
const { formatRenpyStringLiteral, healRenpyVariables, RENPY_COMMON_STRINGS } = require('../renpyCommon');

class RenpyInjector {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Resolve o subdiretório game/
   */
  resolveGameSubDir(gameDir) {
    if (!gameDir) return gameDir;
    if (fs.existsSync(path.join(gameDir, 'game'))) {
      return path.join(gameDir, 'game');
    }
    try {
      const items = fs.readdirSync(gameDir);
      for (const item of items) {
        const sub = path.join(gameDir, item);
        if (fs.statSync(sub).isDirectory()) {
          if (fs.existsSync(path.join(sub, 'game')) || fs.existsSync(path.join(sub, 'renpy'))) {
            return path.join(sub, 'game');
          }
        }
      }
    } catch (e) {}
    return path.join(gameDir, 'game');
  }

  /**
   * Analisa se o jogo já possui sistema de idioma, seletor ou preferências pré-existentes
   */
  inspectLanguageSystem(gameSubDir) {
    const sys = {
      hasLanguageSystem: false,
      hasLanguageChoices: false,
      existingLanguages: [],
      hasPreferencesLanguage: false
    };

    const tlBase = path.join(gameSubDir, 'tl');
    if (fs.existsSync(tlBase)) {
      try {
        const dirs = fs.readdirSync(tlBase);
        for (const d of dirs) {
          if (d !== 'pt_BR' && fs.statSync(path.join(tlBase, d)).isDirectory()) {
            sys.existingLanguages.push(d);
            sys.hasLanguageSystem = true;
          }
        }
      } catch (e) {}
    }

    try {
      const files = fs.readdirSync(gameSubDir);
      for (const f of files) {
        if (f.endsWith('.rpy')) {
          const content = fs.readFileSync(path.join(gameSubDir, f), 'utf8');
          if (content.includes('LANGUAGE_CHOICES')) {
            sys.hasLanguageChoices = true;
            sys.hasLanguageSystem = true;
          }
          if (content.includes('_preferences.language') || content.includes('renpy.change_language') || content.includes('Language(')) {
            sys.hasPreferencesLanguage = true;
            sys.hasLanguageSystem = true;
          }
        }
      }
    } catch (e) {}

    return sys;
  }

  /**
   * Cria os arquivos canônicos em game/tl/pt_BR/ de forma puramente aditiva
   */
  async inject(gameDir, translations, options = {}) {
    const gameSubDir = this.resolveGameSubDir(gameDir);
    const tlDir = path.join(gameSubDir, 'tl', 'pt_BR');

    if (!fs.existsSync(tlDir)) {
      fs.mkdirSync(tlDir, { recursive: true });
    }

    const modifiedFiles = [];

    // 1. Gera 000_opentranslator_init.rpy (Ativação segura condicionada ao sistema do jogo)
    const langSys = this.inspectLanguageSystem(gameSubDir);
    const initRpyPath = path.join(tlDir, '000_opentranslator_init.rpy');
    let initContent = `# OpenTranslator — Ren'Py Language Automatic Initialization\n`;
    initContent += `# Arquivo gerado de forma puramente aditiva em game/tl/pt_BR/\n`;
    initContent += `# Preserva 100% dos scripts originais sem modificar script.rpy, screens.rpy ou gui.rpy.\n\n`;
    initContent += `init -999 python:\n`;
    initContent += `    config.default_language = "pt_BR"\n\n`;
    initContent += `init python:\n`;
    initContent += `    def _ot_ensure_language():\n`;
    initContent += `        if getattr(_preferences, "language", None) not in ("pt_BR",):\n`;
    initContent += `            try:\n`;
    initContent += `                renpy.change_language("pt_BR", force=True)\n`;
    initContent += `            except Exception:\n`;
    initContent += `                pass\n\n`;
    initContent += `    if _ot_ensure_language not in config.interact_callbacks:\n`;
    initContent += `        config.interact_callbacks.append(_ot_ensure_language)\n\n`;

    if (langSys.hasLanguageSystem && langSys.hasLanguageChoices) {
      initContent += `    # Integração segura com lista de escolhas de idioma\n`;
      initContent += `    if "LANGUAGE_CHOICES" in globals() and isinstance(LANGUAGE_CHOICES, list):\n`;
      initContent += `        if not any(c[0] in ("pt_BR", "portuguese", "pt") for c in LANGUAGE_CHOICES if isinstance(c, (list, tuple))):\n`;
      initContent += `            try:\n`;
      initContent += `                LANGUAGE_CHOICES.append(("pt_BR", "Português (Brasil)", None))\n`;
      initContent += `            except Exception:\n`;
      initContent += `                pass\n\n`;
    }

    initContent += `    if getattr(renpy, "translation", None) and hasattr(renpy.translation, "translate_string"):\n`;
    initContent += `        config.say_menu_text_filter = renpy.translation.translate_string\n\n`;

    fs.writeFileSync(initRpyPath, initContent, 'utf8');
    modifiedFiles.push(initRpyPath);

    // 2. Classifica traduções por categoria
    const stringsList = [];
    const dialoguesList = [];
    const screensList = [];

    for (const t of translations) {
      if (!t.original || !t.translated || t.original === t.translated) continue;

      if (t.type === 'dialogue') {
        dialoguesList.push(t);
      } else if (t.type === 'screen_text') {
        screensList.push(t);
      } else {
        // menu_choice, interface_string, string_catalog ou outros
        stringsList.push(t);
      }
    }

    // Incorpora strings comuns canônicas de engine Ren'Py (telas comuns, botões, confirmações)
    const existingOriginals = new Set(translations.map(t => t.original));
    if (RENPY_COMMON_STRINGS) {
      for (const cs of RENPY_COMMON_STRINGS) {
        if (!existingOriginals.has(cs.original)) {
          stringsList.push({
            original: cs.original,
            translated: cs.translated,
            type: 'interface_string',
            file: 'renpy/common',
            line: 1
          });
        }
      }
    }

    const globalSeen = new Set();
    const buildRpyBlock = (title, entries) => {
      let content = `# OpenTranslator — ${title}\n`;
      content += `# Gerado automaticamente em ${new Date().toISOString()}\n\n`;

      let entriesContent = '';
      let blockCount = 0;
      for (const entry of entries) {
        if (!entry.original || globalSeen.has(entry.original)) continue;
        globalSeen.add(entry.original);
        blockCount++;

        const fOld = formatRenpyStringLiteral(entry.original);
        const healedTrans = healRenpyVariables(entry.original, entry.translated);
        const fNew = formatRenpyStringLiteral(healedTrans);
        entriesContent += `    # ${entry.file || 'source'}:${entry.line || 0}\n`;
        entriesContent += `    old ${fOld}\n`;
        entriesContent += `    new ${fNew}\n\n`;
      }

      if (blockCount > 0) {
        content += `translate pt_BR strings:\n\n` + entriesContent;
      } else {
        content += `# Nenhuma entrada nesta categoria para injeção.\n`;
      }
      return { content, count: blockCount };
    };

    // 3. Gera strings.rpy
    const stringsPath = path.join(tlDir, 'strings.rpy');
    const stringsData = buildRpyBlock('Strings & Menu Translations', stringsList);
    fs.writeFileSync(stringsPath, stringsData.content, 'utf8');
    modifiedFiles.push(stringsPath);

    // 4. Gera dialogues.rpy
    const dialoguesPath = path.join(tlDir, 'dialogues.rpy');
    const dialoguesData = buildRpyBlock('Dialogue Translations', dialoguesList);
    fs.writeFileSync(dialoguesPath, dialoguesData.content, 'utf8');
    modifiedFiles.push(dialoguesPath);

    // 5. Gera screens.rpy
    const screensPath = path.join(tlDir, 'screens.rpy');
    const screensData = buildRpyBlock('Screen & UI Translations', screensList);
    fs.writeFileSync(screensPath, screensData.content, 'utf8');
    modifiedFiles.push(screensPath);

    // Remove eventuais arquivos .rpyc antigos da tradução para forçar compilação limpa
    for (const baseName of ['000_opentranslator_init', 'strings', 'dialogues', 'screens', '000_opentranslator']) {
      const rpyc = path.join(tlDir, `${baseName}.rpyc`);
      if (fs.existsSync(rpyc)) {
        try { fs.unlinkSync(rpyc); } catch (e) {}
      }
    }

    const totalStrings = stringsData.count + dialoguesData.count + screensData.count;

    return {
      success: true,
      tlDir,
      filesGenerated: modifiedFiles,
      stringsCount: totalStrings
    };
  }

  /**
   * Executa rollback atômico removendo 100% dos arquivos injetados em tl/pt_BR/
   */
  async rollback(gameDir) {
    const gameSubDir = this.resolveGameSubDir(gameDir);
    const tlDir = path.join(gameSubDir, 'tl', 'pt_BR');

    let removedCount = 0;
    if (fs.existsSync(tlDir)) {
      const items = fs.readdirSync(tlDir);
      for (const item of items) {
        const full = path.join(tlDir, item);
        try {
          fs.unlinkSync(full);
          removedCount++;
        } catch (e) {}
      }
      try {
        fs.rmdirSync(tlDir);
      } catch (e) {}
    }

    // Limpa eventuais controladores ou .rpyc de teste temporários na raiz de game/
    const tempFiles = [
      path.join(gameSubDir, '000_opentranslator.rpy'),
      path.join(gameSubDir, '000_opentranslator.rpyc'),
      path.join(gameSubDir, '000_opentranslator_init.rpy'),
      path.join(gameSubDir, '000_opentranslator_init.rpyc'),
      path.join(gameSubDir, '000_opentranslator_controller.rpy'),
      path.join(gameSubDir, '000_opentranslator_controller.rpyc'),
      path.join(gameSubDir, '_ot_cmd.json'),
      path.join(gameSubDir, '_ot_resp.json'),
      path.join(gameSubDir, '_ot_status.json')
    ];

    for (const f of tempFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
          removedCount++;
        } catch (e) {}
      }
    }

    return {
      success: true,
      removedFiles: removedCount,
      tlDirCleaned: !fs.existsSync(tlDir)
    };
  }
}

module.exports = RenpyInjector;
