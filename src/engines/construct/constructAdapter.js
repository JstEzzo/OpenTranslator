/**
 * OpenTranslator — ConstructAdapter
 * Adaptador oficial para Construct 3 e Construct 2.
 * 
 * Capacidades:
 * - Formato oficial do plugin Internationalization: {"locale": "pt-BR", "strings": {...}}
 * - Preservação de contextos, chaves e pluralização ICU ({0, plural, ...})
 * - Varredura automática em exportações HTML5, Electron e NW.js
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const { rollbackResult } = require('../rollbackResult.js');
const { PartialReport } = require('../../core/partialApply');
// FASE 10 / D1 — o contrato de apply (filesToBackup + fileHashes).
const { startApplyContract } = require('../../core/applyContract');

class ConstructAdapter extends BaseEngineAdapter {
  constructor() {
    super("construct", "Construct 3");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "construct" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_construct_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "construct",
      name: "Construct 3",
      versions: ["Construct 3 r200+", "Construct 2"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: true
    };
  }

  getCapabilities(gameDir, exePath) {
    const files = fs.existsSync(gameDir) ? fs.readdirSync(gameDir).map(f => f.toLowerCase()) : [];
    const isConstruct = files.includes("c3runtime.js") || files.includes("c2runtime.js") || files.includes("data.json");

    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "Construct Internationalization Plugin & Web Runtime Scanner"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    // FASE 9 / PASSO 51 — o relatório decide o `success`.
    const acc = new PartialReport();
    const candidateFiles = ["data.json", "c3runtime.js", "lang.json", "strings.json", "locale.json"];

    for (const cf of candidateFiles) {
      const full = path.join(gameDir, cf);
      if (fs.existsSync(full)) {
        acc.ok();
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (cf.endsWith(".json")) {
            const data = JSON.parse(content);
            // Formato Construct 3 I18n: {"locale": "en", "strings": { "key": "value" }}
            const stringMap = data.strings || (typeof data === "object" ? data : {});
            for (const [k, v] of Object.entries(stringMap)) {
              if (typeof v === "string" && v.trim().length > 0) {
                const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "construct");
                allTexts.push({
                  id: `c3_${cf}_${k}`,
                  file: cf,
                  key: k,
                  original: v.trim(),
                  clean: v.trim(),
                  protectedText,
                  tokens,
                  engine: "construct"
                });
              }
            }
          }
        } catch (e) {
          // FASE 9 / PASSO 51 — a falha deixou de ser silenciosa.
          // Ver src/core/partialApply.js.
          //
          // Um `data.json` malformado era engolido aqui, e o adapter devolvia
          // `success: true`. O `buildUniverse()` (FASE 4) derivava o total
          // deste retorno: um projeto com 5.000 linhas reportava universo
          // parcial e cobertura calculada sobre o que sobrou — número que
          // parece legítimo e não é.
          acc.fail(cf, e);
        }
      }
    }

    // FASE 9: quem decide o `success` é o relatório, não a intenção.
    return acc.report({ texts: allTexts, count: allTexts.length });
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    this.backupManager.createBackup(gameDir, "construct_translation");
    const targetFile = path.join(gameDir, "translation_pt_BR.json");
    // FASE 10 / D1 — PLANO EXPLICITO, e este adapter é a razão de ele existir.
    //
    // O plano derivado dos textos não serve aqui: os textos vêm de
    // `data.json`/`lang.json`/`locale.json`, e este adapter escreve um
    // arquivo NOVO, `translation_pt_BR.json`, que nenhum texto menciona.
    // Derivar o plano dos textos daria um conjunto que não inclui o arquivo
    // realmente escrito — e `ac.wrote` recusaria a escrita, com razão.
    //
    // Este adapter sabe o que escreve, então declara.
    const ac = startApplyContract(gameDir, texts, {
      planFiles: ['translation_pt_BR.json'],
    });
    const outStrings = {};
    let count = 0;

    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr) {
        const restored = this.codeProtector.restore(tr, t.tokens || []);
        outStrings[t.key || t.id] = restored.restoredText;
        count++;
      }
    }

    // FASE 10 / D1 — hash declarado a partir do CONTEÚDO EM MEMÓRIA.
    const saida = JSON.stringify({ locale: "pt-BR", strings: outStrings }, null, 2);
    fs.writeFileSync(targetFile, saida, 'utf8');
    ac.wrote('translation_pt_BR.json', saida);
    return ac.finish({
      success: true,
      modifiedFiles: [targetFile],
      count
    });
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = ConstructAdapter;
