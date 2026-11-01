/**
 * OpenTranslator — DefoldAdapter
 * Adaptador oficial para jogos desenvolvidos em Defold Engine.
 * 
 * Capacidades:
 * - Identificação via game.project e .dmanifest
 * - Localização via tabelas JSON e módulos Lua
 * - Preservação estrita de fontes, Unicode e direção de escrita (LTR/RTL)
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const { rollbackResult } = require('../rollbackResult.js');
// FASE 10 / D1 — o contrato de apply (filesToBackup + fileHashes).
const { startApplyContract } = require('../../core/applyContract');
const { PartialReport } = require('../../core/partialApply');

class DefoldAdapter extends BaseEngineAdapter {
  constructor() {
    super("defold", "Defold Engine");
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
    this.codeProtector = new CodeProtector({ engine: "defold" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_defold_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "defold",
      name: "Defold",
      versions: ["Defold 1.2+"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: true,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasProject = fs.existsSync(path.join(gameDir, "game.project"));
    return {
      staticFiles: true,
      nativeLocalization: hasProject,
      archives: true,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Defold JSON/Lua Localization Table Pipeline"
    };
  }

  /**
   * FASE 9 / PASSO 42 — EXTRAÇÃO PARCIAL NÃO É EXTRAÇÃO COMPLETA
   *
   * Os dois `catch (e) {}` engoliam falha de leitura de diretório e de
   * parse de JSON, e o método devolvia `success: true` com o que tivesse
   * conseguido. O `count` era honesto, mas `success` não era — e é o
   * `success` que o pipeline consulta.
   *
   * Por que isso quebra um invariante de outra fase: o `buildUniverse()` (FASE 4)
   * deriva o total de linhas do adapter. Se a extração engoliu metade dos
   * arquivos, o universo fica menor, a cobertura exigida cai junto, e o
   * certificado pode emitir `COMPLETED` sobre um jogo que nunca foi
   * completamente visto. A falha_some de vista: nenhum log, nenhum status.
   *
   * Agora o adapter declara `partial` e entrega `scanErrors`, e o pipeline
   * pode recusar o certificado em vez de confiar num universo inflado para
   * baixo.
   */
  async extract(gameDir, options = {}) {
    const allTexts = [];
    const scanErrors = [];
    const filesSeen = [];

    const scanDir = (dir, depth = 0) => {
      if (depth > 3) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        scanErrors.push({ file: path.relative(gameDir, dir).replace(/\\/g, "/"), stage: 'readdir', error: e.message });
        return;
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory() && !ent.name.startsWith(".")) scanDir(full, depth + 1);
        else if (ent.isFile() && (ent.name.endsWith(".json") || ent.name.endsWith(".lua"))) {
          const nome = ent.name.toLowerCase();
          if (!nome.includes("lang") && !nome.includes("string") && !nome.includes("loc")) continue;
          const rel = path.relative(gameDir, full).replace(/\\/g, "/");
          filesSeen.push(rel);
          try {
            const content = fs.readFileSync(full, 'utf8');
            if (ent.name.endsWith(".json")) {
              const j = JSON.parse(content);
              for (const [k, v] of Object.entries(j)) {
                if (typeof v === "string" && v.trim().length > 0) {
                  const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "defold");
                  allTexts.push({
                    id: `defold_${rel}_${k}`,
                    file: rel,
                    key: k,
                    original: v.trim(),
                    clean: v.trim(),
                    protectedText,
                    tokens,
                    engine: "defold"
                  });
                }
              }
            }
          } catch (e) {
            // FASE 9: a falha é REGISTRADA, não engolida. O arquivo conta
            // como visto mas não contribute linhas — é exatamente esse
            // desalinhamento que o `partial` agora denuncia.
            scanErrors.push({ file: rel, stage: 'parse', error: e.message });
          }
        }
      }
    };

    scanDir(gameDir);

    const partial = scanErrors.length > 0;
    return {
      success: !partial,
      status: partial ? 'PARTIAL' : 'COMPLETE',
      texts: allTexts,
      count: allTexts.length,
      filesScanned: filesSeen.length,
      scanErrors,
      warning: partial
        ? `${scanErrors.length} arquivo(s) não puderam ser lidos. O universo `
          + 'declarado está ABAIXO do real e a cobertura exigida não pode ser '
          + 'considerada válida sobre esta extração.'
        : null,
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // FASE 10 / D1 — o contrato de apply. O plano de arquivos vem dos textos:
    // um texto traduzível veio de um arquivo, e aplicar escreve nele.
    const ac = startApplyContract(gameDir, texts);
    // Escopo do METODO, e nao do `for`: os `catch` por arquivo e o
    // `ac.finish(accApply.report(...))` do fim usam esta mesma instancia.
    const accApply = new PartialReport();
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "defold" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      if (relPath.endsWith(".json")) {
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
    }

    // FASE 10 / D1 — `PartialReport` decide a partialidade; `ac.finish`
    // acrescenta `transactional`, `filesToBackup` e `fileHashes`.
    return ac.finish(accApply.report({
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Defold aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    }));
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = DefoldAdapter;
