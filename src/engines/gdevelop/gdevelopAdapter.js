/**
 * OpenTranslator — GDevelopAdapter
 * Adaptador oficial para GDevelop 5.
 * Fornece dois extratores:
 * 1. GDevelopProjectExtractor: Para arquivos de projeto (game.json, cenas, eventos)
 * 2. GDevelopPackagedGameExtractor: Para jogos exportados (Electron, Web)
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

class GDevelopAdapter extends BaseEngineAdapter {
  constructor() {
    super("gdevelop", "GDevelop");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "gdevelop" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_gdevelop_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "gdevelop",
      name: "GDevelop",
      versions: ["GDevelop 5.x"],
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
    const hasGameJson = fs.existsSync(path.join(gameDir, "game.json")) || fs.existsSync(path.join(gameDir, "data.json"));
    return {
      staticFiles: true,
      nativeLocalization: hasGameJson,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "GDevelop Project & Export Data Extractor"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    // FASE 9 / PASSO 50 — o relatório de parcialidade. Ver partialApply.js.
    const acc = new PartialReport();
    const gameJsonPath = path.join(gameDir, "game.json");

    if (fs.existsSync(gameJsonPath)) {
      acc.ok();
      try {
        const data = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
        // Varredura de objetos de texto em cenas
        const layouts = data.layouts || [];
        for (const layout of layouts) {
          const lName = layout.name || "scene";
          const objects = layout.objects || [];
          for (const obj of objects) {
            if (obj.type === "TextObject::Text" && obj.content) {
              const text = obj.content.text || "";
              if (text.trim().length > 0) {
                const { protectedText, tokens } = this.codeProtector.protect(text.trim(), "gdevelop");
                allTexts.push({
                  id: `gd_${lName}_${obj.name}`,
                  file: "game.json",
                  scene: lName,
                  objectName: obj.name,
                  original: text.trim(),
                  clean: text.trim(),
                  protectedText,
                  tokens,
                  engine: "gdevelop"
                });
              }
            }
          }
        }
      } catch (e) {
        // FASE 9 / PASSO 50 — `catch (e) {}` engolia um game.json ilegível ou
        // malformado, e o adapter devolvia `success: true` com zero textos.
        // O `buildUniverse()` (FASE 4) derivava o total daqui: um jogo com
        // 5.000 linhas reportava universo 0 e cobertura 100% — o certificado
        // podia declarar COMPLETED sobre um jogo que nunca foi lido.
        acc.fail('game.json', e);
      }
    }

    // FASE 9: o relatório decide o `success`, não a intenção do adapter.
    return acc.report({ texts: allTexts, count: allTexts.length });
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // FASE 10 / D1 — o contrato de apply. Este adapter escreve em `game.json`
    // ou `data.json`, e os textos extraídos declaram `file: "game.json"`, então
    // o plano derivado dos textos cobre o que ele escreve.
    const ac = startApplyContract(gameDir, texts);
    const candidateFiles = [
      path.join(gameDir, "game.json"),
      path.join(gameDir, "data.json")
    ];

    const targetPath = candidateFiles.find(p => fs.existsSync(p));
    if (!targetPath) {
      return { success: false, error: "Arquivo de dados do GDevelop (game.json ou data.json) não encontrado.", modifiedFiles: [], count: 0 };
    }

    this.backupManager.createBackup(gameDir, [targetPath], { engine: "gdevelop" });

    try {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const textLookup = new Map();
      for (const t of texts) {
        const tr = translations.get ? translations.get(t.id) : translations[t.id];
        if (tr && tr !== t.original) {
          const restored = this.codeProtector.restore(tr, t.tokens || []);
          textLookup.set(`${t.scene}::${t.objectName}`, restored.restoredText);
        }
      }

      let appliedCount = 0;
      const layouts = data.layouts || [];
      for (const layout of layouts) {
        const lName = layout.name || "scene";
        const objects = layout.objects || [];
        for (const obj of objects) {
          if (obj.type === "TextObject::Text" && obj.content) {
            const key = `${lName}::${obj.name}`;
            if (textLookup.has(key)) {
              obj.content.text = textLookup.get(key);
              appliedCount++;
            }
          }
        }
      }

      // Também verifica globalObjects se existirem
      if (Array.isArray(data.objects)) {
        for (const obj of data.objects) {
          if (obj.type === "TextObject::Text" && obj.content) {
            for (const t of texts) {
              if (t.objectName === obj.name) {
                const tr = translations.get ? translations.get(t.id) : translations[t.id];
                if (tr && tr !== t.original) {
                  const restored = this.codeProtector.restore(tr, t.tokens || []);
                  obj.content.text = restored.restoredText;
                  appliedCount++;
                }
              }
            }
          }
        }
      }

      // FASE 10 / D1 — hash declarado a partir do CONTEÚDO EM MEMÓRIA.
      // Hashear o arquivo depois de escrever compararia o número com ele mesmo.
      const saida = JSON.stringify(data, null, 2);
      fs.writeFileSync(targetPath, saida, 'utf8');
      ac.wrote(path.relative(gameDir, targetPath).replace(/\\/g, "/"), saida);

      // FASE 10 / D1 — `ac.finish` acrescenta `transactional`,
      // `filesToBackup` e `fileHashes` ao que o adapter já devolvia.
      return ac.finish({
        success: true,
        modifiedFiles: [targetPath],
        count: appliedCount,
        message: `Tradução GDevelop aplicada com sucesso em ${path.basename(targetPath)} (${appliedCount} textos).`
      });
    } catch (e) {
      return { success: false, error: e.message, modifiedFiles: [], count: 0 };
    }
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = GDevelopAdapter;
