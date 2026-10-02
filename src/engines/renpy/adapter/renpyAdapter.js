/**
 * renpyAdapter.js — Adaptador Central Modular para o motor Ren'Py (Ren'Py 6, 7 e 8)
 * 
 * Integra:
 * - RenpyExtractor (extração de .rpy/.rpyc com contexto, linhas, tipagem e descompilação)
 * - RenpyTranslator (proteção de variáveis [var], tags {tag} e tradução PT-BR)
 * - RenpyInjector (geração aditiva e limpa em game/tl/pt_BR/)
 * - RenpyValidator (validação de sintaxe, indentação e integridade de tokens)
 * - RenpyRuntime (orquestração de processos, telemetria, screenshots e Save/Load)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const BaseEngineAdapter = require('../../../core/baseEngineAdapter');
const CodeProtector = require('../../../core/codeProtector');
const { healRenpyVariables } = require('../renpyCommon');
const RenpyExtractor = require('../extractor/renpyExtractor');
const RenpyTranslator = require('../translator/renpyTranslator');
const RenpyInjector = require('../injector/renpyInjector');
const RenpyValidator = require('../validator/renpyValidator');
const RenpyRuntime = require('../runtime/renpyRuntime');

class RenpyAdapter extends BaseEngineAdapter {
  constructor(options = {}) {
    super('renpy', "Ren'Py Visual Novel Engine");
    this.options = options;
    this.codeProtector = new CodeProtector({ engine: 'renpy' });
    this.extractor = new RenpyExtractor(options);
    this.translator = new RenpyTranslator(options.dictionary || {});
    this.injector = new RenpyInjector(options);
    this.validator = new RenpyValidator(options);
    this.runtime = new RenpyRuntime(options);
  }

  getEmbeddedPython() {
    const root = global.ROOT || path.resolve(__dirname, '../../..');
    const embeddedPy = path.join(root, 'resources', 'renpy', 'python', 'python.exe');
    if (fs.existsSync(embeddedPy)) return embeddedPy;
    return 'python';
  }

  getUnpackerScript() {
    const root = global.ROOT || path.resolve(__dirname, '../../..');
    return path.join(root, 'resources', 'renpy', 'unpack_renpy_all.py');
  }

  async unpackAndDecompile(gameDir) {
    const root = this.extractor.resolveGameDir(gameDir);
    const gameSubDir = path.join(root, 'game');
    const pythonExe = this.getEmbeddedPython();
    const unpackScript = this.getUnpackerScript();

    if (!fs.existsSync(unpackScript)) {
      return { success: false, error: 'Script unpack_renpy_all.py não encontrado.' };
    }

    try {
      const args = [unpackScript, '-i', gameSubDir, '-o', gameSubDir];
      const res = spawnSync(pythonExe, args, {
        cwd: root,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024
      });

      return {
        success: res.status === 0,
        stdout: res.stdout,
        stderr: res.stderr
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: true,
      compiledScripts: true,
      runtimeHook: true,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true
    };
  }

  /**
   * Extração de textos do jogo
   */
  async extract(gameDir, options = {}) {
    const res = await this.extractor.extract(gameDir, options.outJsonPath);
    return {
      success: true,
      count: res.count,
      texts: res.texts
    };
  }

  /**
   * Validação semântica e de integridade antes da aplicação
   */
  async validate(gameDir, texts, translations) {
    return await this.validator.validate(gameDir, texts, translations);
  }

  /**
   * Aplicação da tradução gerando game/tl/pt_BR/ de forma puramente aditiva
   */
  async apply(gameDir, texts, translations, options = {}) {
    const transList = [];

    const processItem = (t, trVal) => {
      let tr = trVal;
      if (t.tokens && t.tokens.length > 0 && this.codeProtector) {
        const restored = this.codeProtector.restore(tr, t.tokens);
        tr = restored.restoredText;
      }
      tr = healRenpyVariables(t.original || t.clean, tr);
      return tr;
    };

    if (translations instanceof Map) {
      for (const t of texts) {
        const rawTr = translations.get(t.id);
        if (rawTr && rawTr !== t.clean) {
          const tr = processItem(t, rawTr);
          transList.push({
            id: t.id,
            original: t.original || t.clean,
            translated: tr,
            file: t.file,
            line: t.line,
            context: t.context,
            type: t.type
          });
        }
      }
    } else if (Array.isArray(translations)) {
      for (const item of translations) {
        const healedTr = healRenpyVariables(item.original || item.clean, item.translated);
        transList.push({
          ...item,
          original: item.original || item.clean,
          translated: healedTr
        });
      }
    } else if (translations && typeof translations === 'object') {
      for (const t of texts) {
        const rawTr = translations[t.id] || translations[t.clean];
        if (rawTr && rawTr !== t.clean) {
          const tr = processItem(t, rawTr);
          transList.push({
            id: t.id,
            original: t.original || t.clean,
            translated: tr,
            file: t.file,
            line: t.line,
            context: t.context,
            type: t.type
          });
        }
      }
    }

    const injectRes = await this.injector.inject(gameDir, transList, options);
    if (!injectRes.success) {
      return {
        success: false,
        error: injectRes.error || 'Falha ao injetar arquivos de tradução Ren\'Py.',
        tlDir: injectRes.tlDir,
        count: 0,
        filesGenerated: []
      };
    }

    const validRes = this.validator.validateInjection(injectRes.tlDir);
    const errors = [];
    if (!validRes.valid && validRes.errors && validRes.errors.length > 0) {
      errors.push(...validRes.errors);
    }

    return {
      success: injectRes.success && validRes.valid,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      tlDir: injectRes.tlDir,
      count: injectRes.stringsCount,
      filesGenerated: injectRes.filesGenerated,
      validation: validRes
    };
  }

  /**
   * Rollback atômico removendo game/tl/pt_BR/
   */
  async rollback(gameDir, options = {}) {
    this.runtime.removeController(gameDir);
    return await this.injector.rollback(gameDir);
  }
}

module.exports = RenpyAdapter;
