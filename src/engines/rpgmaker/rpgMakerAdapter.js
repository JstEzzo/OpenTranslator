/**
 * OpenTranslator — RpgMakerAdapter
 * Adaptador oficial para RPG Maker MV, MZ e RGSS (XP/VX/VX Ace).
 * Preserva 100% da estabilidade existente, sem qualquer regressão.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const { extractGameTexts } = require('../../extractors/extractor');
const { patchGameData, backupGameData, restoreOldestBackup } = require('../../core/gameEngine');
const { PartialReport } = require('../../core/partialApply');
const TextWrap = require('./installTextWrap');
const NativeTextData = require('./nativeTextData');

class RpgMakerAdapter extends BaseEngineAdapter {
  constructor() {
    super("rpgmaker", "RPG Maker Engine (MV / MZ / RGSS)");
    this.codeProtector = new CodeProtector({ engine: "rpgmaker" });
    this.backupManager = new BackupManager();
  }

  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: false,
      runtimeHook: true,
      dom: true,
      frameworkState: false,
      ocr: true,
      backupSupported: true
    };
  }

  async extract(gameDir, options = {}) {
    const dataDir = path.join(gameDir, "Data");
    let isRuby = false;
    // FASE 9 / PASSO 59 — escopo do METODO: o `catch` do `if` e o `return`
    // do fim do metodo precisam da MESMA instancia.
    const accApply = new PartialReport();
    if (fs.existsSync(dataDir)) {
      try {
        const dFiles = fs.readdirSync(dataDir).map(f => f.toLowerCase());
        isRuby = dFiles.some(f => f.endsWith(".rvdata2") || f.endsWith(".rvdata") || f.endsWith(".rxdata"));
      } catch (e) {
        // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(gameDir, e);
      }
    }

    if (isRuby) {
      const RpgMakerRubyHandler = require("./rpgMakerRubyHandler");
      const rubyHandler = new RpgMakerRubyHandler();
      const res = await rubyHandler.extract({ gameDir, options });
      const rawRubyTexts = res.texts || [];
      const allTexts = [];
      for (const t of rawRubyTexts) {
        const { protectedText, tokens } = this.codeProtector.protect(t.clean, "rpgmaker");
        allTexts.push({
          ...t,
          protectedText,
          tokens,
          engine: "rgss"
        });
      }
      return accApply.report({
        texts: allTexts,
        count: allTexts.length
});
    }

    const nativeData = NativeTextData.extract(gameDir);
    const rawTexts = nativeData ? nativeData.texts : extractGameTexts(gameDir);
    const allTexts = [];

    for (const t of rawTexts) {
      const { protectedText, tokens } = this.codeProtector.protect(t.clean, "rpgmaker");
      allTexts.push({
        ...t,
        protectedText,
        tokens,
        engine: "rpgmaker"
      });
    }

    return accApply.report({
      texts: allTexts,
      count: allTexts.length,
      ...(nativeData ? {preservedNames:nativeData.preservedNames,coverageScope:nativeData.coverageScope,universeComplete:false} : {})
});
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const dataDir = path.join(gameDir, "Data");
    let isRuby = false;
    if (fs.existsSync(dataDir)) {
      try {
        const dFiles = fs.readdirSync(dataDir).map(f => f.toLowerCase());
        isRuby = dFiles.some(f => f.endsWith(".rvdata2") || f.endsWith(".rvdata") || f.endsWith(".rxdata"));
      } catch (e) {}
    }

    if (isRuby) {
      if (options.skipBackup !== true) {
        backupGameData(gameDir);
      }
      const RpgMakerRubyHandler = require("./rpgMakerRubyHandler");
      const rubyHandler = new RpgMakerRubyHandler();
      const transMap = {};
      for (const t of texts) {
        const tr = (translations instanceof Map) ? translations.get(t.id) : (translations ? translations[t.id] : null);
        if (tr && tr !== t.clean) {
          if (t.tokens && t.tokens.length > 0) {
            const restored = this.codeProtector.restore(tr, t.tokens);
            transMap[t.original] = restored.restoredText;
          } else {
            transMap[t.original] = tr;
          }
        }
      }
      const res = await rubyHandler.injectTranslation({ gameDir, translationMap: transMap, options });
      return {
        success: res.success !== false,
        modifiedFiles: res.injectedFiles || [dataDir],
        count: res.count || Object.keys(transMap).length
      };
    }

    const wrapRoot = fs.existsSync(path.join(gameDir, 'www', 'js', 'plugins.js')) ? path.join(gameDir, 'www') : gameDir;
    const enableWrap = options.wrapDialogue === true || (options.wrapDialogue !== false && options.skipBackup !== true);
    const wrapPlan = enableWrap ? TextWrap.plan(wrapRoot) : null;

    // Garante criação de backup transacional dos dados e plugins para a sessão
    if (options.skipBackup !== true) {
      const filesToBackup = [];
      const actualDataDir = path.join(gameDir, "www", "data");
      const rootDataDir = path.join(gameDir, "data");
      const targetDataDir = fs.existsSync(actualDataDir) ? actualDataDir : (fs.existsSync(rootDataDir) ? rootDataDir : null);

      if (targetDataDir && fs.existsSync(targetDataDir)) {
        try {
          const dFiles = fs.readdirSync(targetDataDir);
          for (const f of dFiles) {
            const file = path.join(targetDataDir, f);
            if (fs.statSync(file).isFile()) filesToBackup.push(file);
          }
        } catch (e) {}
      }

      const wwwDir = targetDataDir ? path.dirname(targetDataDir) : gameDir;
      const pluginsJs = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(pluginsJs)) filesToBackup.push(pluginsJs);
      const indexHtml = path.join(wwwDir, "index.html");
      if (fs.existsSync(indexHtml)) filesToBackup.push(indexHtml);
      const cheatScript = path.join(wwwDir, "CheatOverlay.js");
      if (fs.existsSync(cheatScript)) filesToBackup.push(cheatScript);

      if (wrapPlan && !wrapPlan.created) filesToBackup.push(wrapPlan.file);
      const backup = this.backupManager.createSessionBackup(gameDir, filesToBackup, {
        sessionId: options.sessionId,
        transactionId: options.transactionId,
        backupId: options.backupId,
        engine: "rpgmaker",
        createdFiles: wrapPlan && wrapPlan.created ? [path.relative(gameDir, wrapPlan.file)] : []
      });
      if (!backup.success) return { success:false, error:backup.error || 'Could not create a verified game backup', count:0, modifiedFiles:[] };
    }

    // Restaura códigos protegidos antes de passar para o patchGameData nativo
    const restoredMap = new Map();
    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr) {
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(tr, t.tokens);
          restoredMap.set(t.id, restored.restoredText);
        } else {
          restoredMap.set(t.id, tr);
        }
      }
    }

    const native = texts.some(text=>text.nativeKind);
    if(native && texts.some(text=>!text.nativeKind)) throw new Error('Mixed database translation formats are not supported');
    const nativeResult = native ? NativeTextData.apply(gameDir,texts,restoredMap) : null;
    const patchedCount = nativeResult ? nativeResult.count : patchGameData(gameDir, texts, restoredMap);
    let textWrap = null;
    try { if (wrapPlan) textWrap = TextWrap.install(wrapRoot, wrapPlan); }
    catch (error) { return { success:false, error:error.message, count:patchedCount, modifiedFiles:[path.join(wrapRoot, 'data')] }; }
    return {
      success: true,
      modifiedFiles: [...(nativeResult?.modifiedFiles || [path.join(gameDir, "data")]), ...(textWrap?.files || [])],
      fileHashes: nativeResult?.fileHashes,
      textWrap,
      count: patchedCount
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreSessionBackup(gameDir, options);

    // BackupManager restores only verified files and removes session-owned additions.
    // FASE 7 / PASSO 33 — dois defeitos na mesma linha:
    //
    //   success: res.success !== false,      // undefined !== false => TRUE
    //   restoredFiles: [gameDir],            // diretório como "arquivo"
    //
    // `res.success !== false` trata AUSÊNCIA de informação como sucesso: se
    // o BackupManager não disse nada (`undefined`), a comparação dava `true`
    // e o rollback era reportado como concluído sem ter confirmado nada. É a
    // mesma classe do `{ok:true, ...res}`: o valor padrão do sucesso morando
    // no lado errado da comparação.
    return rollbackResult(res, this.id || this.engineId || "rpgmaker", {
      details: res,
      cleanupPerformed: res?.success === true,
    });
  }
}

const { rollbackResult } = require('../rollbackResult');

module.exports = RpgMakerAdapter;
