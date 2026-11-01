/**
 * OpenTranslator — CocosCreatorAdapter
 * Adaptador oficial para Cocos Creator 2.4+ e 3.x.
 * 
 * Capacidades:
 * - Localização nativa via pacote oficial Localization Editor (resources/i18n)
 * - Suporte a L10nLabel, LocalizedSprite e dicionários de idioma translate-data
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

class CocosCreatorAdapter extends BaseEngineAdapter {
  constructor() {
    super("cocos_creator", "Cocos Creator");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer — e aí o pipeline
    // volta ao fallback com `verifyApplied`.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "cocos" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_cocos_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "cocos_creator",
      name: "Cocos Creator",
      versions: ["Cocos Creator 2.4+", "Cocos Creator 3.x"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasI18n = fs.existsSync(path.join(gameDir, "assets", "resources", "i18n")) ||
                    fs.existsSync(path.join(gameDir, "resources", "i18n"));
    return {
      staticFiles: true,
      nativeLocalization: hasI18n,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "Cocos Creator i18n Localization Editor Tables"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    // FASE 9 / PASSO 52 — o relatório decide o `success`.
    const acc = new PartialReport();
    const candidateDirs = [
      path.join(gameDir, "assets", "resources", "i18n"),
      path.join(gameDir, "resources", "i18n")
    ];

    for (const i18nDir of candidateDirs) {
      if (fs.existsSync(i18nDir)) {
        try {
          const files = fs.readdirSync(i18nDir);
          for (const f of files) {
            if (f.endsWith(".json")) {
              acc.ok();
              try {
                const fullP = path.join(i18nDir, f);
                const data = JSON.parse(fs.readFileSync(fullP, 'utf8'));
                const relP = path.relative(gameDir, fullP).replace(/\\/g, "/");

                for (const [k, v] of Object.entries(data)) {
                  if (typeof v === "string" && v.trim().length > 0) {
                    const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "cocos");
                    allTexts.push({
                      id: `cocos_${f}_${k}`,
                      file: relP,
                      key: k,
                      original: v.trim(),
                      clean: v.trim(),
                      protectedText,
                      tokens,
                      engine: "cocos_creator"
                    });
                  }
                }
              } catch (e) {
                // FASE 9 / PASSO 52 — catch interno: um JSON de i18n
                // malformado. Ver src/core/partialApply.js.
                acc.fail(path.relative(gameDir, fullP).replace(/\\/g, "/"), e);
              }
            }
          }
        } catch (e) {
          // FASE 9 / PASSO 52 — catch externo: a PASTA de i18n não pôde ser
          // lida. Este é o pior dos dois: a pasta inteira some do universo,
          // e o adapter dizia `success: true` como se nada tivesse faltado.
          acc.fail(path.relative(gameDir, i18nDir).replace(/\\/g, "/"), e);
        }
      } else {
        // FASE 9: diretório ausente não é erro, mas também não é "nada a
        // fazer" — é um layout que o adapter não reconheceu. Registrado.
        acc.skip(path.relative(gameDir, i18nDir).replace(/\\/g, "/"), 'diretório i18n ausente');
      }
    }

    // FASE 9 / PASSO 52 — quem decide o `success` é o relatório.
    return acc.report({ texts: allTexts, count: allTexts.length });
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // FASE 10 / D1 — o contrato de apply. O plano de arquivos vem dos textos:
    // um texto traduzível veio de um arquivo, e aplicar escreve nele.
    const ac = startApplyContract(gameDir, texts);
    // Escopo do METODO, e nao do `for` — mesmo bug de cocos2dx.
    const accApply = new PartialReport();
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "cocos_creator" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content);
        let fileModified = false;

        for (const t of fileTexts) {
          const tr = translations.get ? translations.get(t.id) : translations[t.id];
          if (tr && tr !== t.original) {
            const restored = this.codeProtector.restore(tr, t.tokens || []);
            parsed[t.key] = restored.restoredText;
            fileModified = true;
            appliedCount++;
          }
        }

        if (fileModified) {
          // FASE 10 / D1 — o hash declarado vem do CONTEÚDO EM MEMÓRIA.
          // Hashear o arquivo depois de escrever compararia o número com ele
          // mesmo, e a verificação não verificaria nada.
          const saida = JSON.stringify(parsed, null, 2);
          fs.writeFileSync(fullPath, saida, "utf8");
          ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), saida);
          modifiedFiles.add(fullPath);
        }
      } catch (e) {
        // FASE 9 / PASSO 57 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(fullPath, e);
      }
    }

    // FASE 10 / D1 — `PartialReport` decide a partialidade; `ac.finish`
    // acrescenta `transactional`, `filesToBackup` e `fileHashes`. Os campos
    // que o adapter já devolvia são preservados.
    return ac.finish(accApply.report({
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Cocos Creator aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    }));
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = CocosCreatorAdapter;
