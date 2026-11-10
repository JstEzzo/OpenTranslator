/**
 * OpenTranslator — GenericAdapter
 * Adaptador para engines desconhecidas ou não catalogadas.
 * Realiza varredura universal de arquivos de texto/localização e fornece fallback completo para OCR.
 * Integrado estritamente com TextClassifier para nunca modificar código, identificadores ou binários.
 */

const fs = require("fs");
const path = require("path");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const TextClassifier = require("../../core/textClassifier");
const { rollbackResult } = require('../rollbackResult.js');
const { PartialReport } = require('../../core/partialApply');
// FASE 10 / D1 — o contrato de apply (filesToBackup + fileHashes).
const { startApplyContract } = require('../../core/applyContract');

class GenericAdapter extends BaseEngineAdapter {
  constructor() {
    super("generic", "Engine Genérica / Scanner Universal");

    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "meu conjunto de escrita está coberto
    // pelo backup que a transação vai fazer". O genericAdapter escreve
    // apenas nos arquivos de onde os textos vieram, e `ac.finish` reprova
    // a transação se isso deixar de ser verdade.
    //
    // FASE 10 — `this` NÃO pode ser tocado antes de `super()`: numa classe
    // derivada o objeto ainda não existe, e o acesso lança em tempo de
    // construção. A primeira versão deste bloco estava antes do super e
    // quebrava o módulo inteiro.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "generic" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_generic_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "generic",
      name: "Generic Engine / Scanner Universal",
      versions: ["Qualquer engine não catalogada"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: false,
      fonts: false,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: true,
      nativeLocalization: false,
      archives: false,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Universal Structured String Scanner & Classifier"
    };
  }

  async extract(gameDir, options = {}) {
    // Scripts need a parser that identifies display text. Scanning code line
    // by line confuses commands and literals with dialogue.
    const textExts = new Set([".json", ".txt", ".csv", ".po", ".xml", ".ini", ".yaml", ".yml"]);
    const ignoredDirectories = new Set(["node_modules", "readme", "readmes", "doc", "docs", "documentation"]);
    const rawExtracted = [];
    // FASE 9 / PASSO 59 — o relatorio decide o `success`.
    // Precisa viver no escopo do METODO: um `catch` de dentro de `scanDir`
    // (que e uma funcao aninhada) precisa registrar a falha nela, e o
    // `return` do fim do metodo precisa leia-la.
    const accApply = new PartialReport();

    const scanDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && !ignoredDirectories.has(entry.name.toLowerCase())) {
              scanDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const stem = path.basename(entry.name, ext).toLowerCase();
            if (textExts.has(ext) && !/^(readme|license|licence|changelog|credits)(?:[._ -]|$)/.test(stem)) {
              try {
                const stat = fs.statSync(fullPath);
                if (stat.size < 5 * 1024 * 1024) {
                  const content = fs.readFileSync(fullPath, "utf8");
                  const relPath = path.relative(gameDir, fullPath).replace(/\\/g, "/");

                  if (ext === ".json") {
                    try {
                      const parsed = JSON.parse(content);
                      const parseJson = (obj, pathKey = "") => {
                        if (typeof obj === "string") {
                          rawExtracted.push({
                            id: `gen_json_${rawExtracted.length}`,
                            file: relPath,
                            key: pathKey,
                            original: obj.trim(),
                            clean: obj.trim(),
                            engine: "generic"
                          });
                        } else if (typeof obj === "object" && obj !== null) {
                          for (const [k, v] of Object.entries(obj)) parseJson(v, pathKey ? `${pathKey}.${k}` : k);
                        }
                      };
                      parseJson(parsed);
                    } catch (e) {
                      // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
                      // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
                      accApply.fail(fullPath, e);
                    }
                  } else {
                    const lines = content.split("\n");
                    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
                      const l = lines[lIdx].trim();
                      if (l.length > 2 && !l.startsWith("#") && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith(";")) {
                        rawExtracted.push({
                          id: `gen_txt_${relPath}_${lIdx}`,
                          file: relPath,
                          line: lIdx + 1,
                          original: l,
                          clean: l,
                          engine: "generic"
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
                // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
                accApply.fail(fullPath, e);
              }
            }
          }
        }
      } catch (e) {
        // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(dir, e);
      }
    };

    scanDir(gameDir);

    const { translatable, filteredOut } = TextClassifier.filterTranslatable(rawExtracted, 0.65);
    const finalTexts = [];

    for (const t of translatable) {
      const { protectedText, tokens } = this.codeProtector.protect(t.clean, "generic");
      finalTexts.push({
        ...t,
        protectedText,
        tokens
      });
    }

    return accApply.report({
      texts: finalTexts,
      count: finalTexts.length,
      filteredOutCount: filteredOut.length
});
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // FASE 10 / D1 — o contrato de apply. O plano de arquivos vem dos textos:
    // um texto traduzível veio de um arquivo, e aplicar escreve nesse arquivo.
    const ac = startApplyContract(gameDir, texts);
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "generic" });

    const modifiedFiles = new Set();
    const applyErrors = [];
    let appliedCount = 0;

    try {
      for (const [relPath, fileTexts] of byFile.entries()) {
        const fullPath = path.join(gameDir, relPath);
        if (!fs.existsSync(fullPath)) continue;

        const ext = path.extname(relPath).toLowerCase();
        if (ext === ".json") {
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            const parsed = JSON.parse(content);

            const setNestedKey = (obj, keyPath, val) => {
              if (!keyPath) return;
              const parts = keyPath.split(".");
              let cur = obj;
              for (let i = 0; i < parts.length - 1; i++) {
                if (cur[parts[i]] === undefined || cur[parts[i]] === null) return;
                cur = cur[parts[i]];
              }
              cur[parts[parts.length - 1]] = val;
            };

            let fileModified = false;
            for (const t of fileTexts) {
              const tr = translations.get ? translations.get(t.id) : translations[t.id];
              if (tr && tr !== t.original) {
                const restored = this.codeProtector.restore(tr, t.tokens || []);
                setNestedKey(parsed, t.key, restored.restoredText);
                fileModified = true;
                appliedCount++;
              }
            }

            if (fileModified) {
              // FASE 10 / D1 — ADOÇÃO DO CONTRATO DE APPLY
              //
              // O conteúdo é içado para uma variável antes de escrever. Não é
              // estilo: `fs.writeFileSync(p, JSON.stringify(...))` não deixa
              // nada para hashear, e o hash do que o adapter DECLARA ter
              // escrito tem de vir do conteúdo em memória — hashear o arquivo
              // depois de escrever compararia o número com ele mesmo.
              const saida = JSON.stringify(parsed, null, 2);
              fs.writeFileSync(fullPath, saida, "utf8");
              ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), saida);
              modifiedFiles.add(fullPath);
            }
          } catch (e) {}
        } else {
          try {
            const rawContent = fs.readFileSync(fullPath, "utf8");
            const lines = rawContent.split("\n");
            let fileModified = false;

            for (const t of fileTexts) {
              const tr = translations.get ? translations.get(t.id) : translations[t.id];
              if (tr && tr !== t.original && t.line && t.line <= lines.length) {
                const restored = this.codeProtector.restore(tr, t.tokens || []);
                const lIdx = t.line - 1;
                if (lines[lIdx].includes(t.original)) {
                  lines[lIdx] = lines[lIdx].replace(t.original, restored.restoredText);
                } else {
                  lines[lIdx] = restored.restoredText;
                }
                fileModified = true;
                appliedCount++;
              }
            }

            if (fileModified) {
              // FASE 10 / D1 — conteúdo içado pelo mesmo motivo do sítio JSON:
              // o hash declarado precisa vir da memória, não de uma releitura.
              const saida = lines.join("\n");
              fs.writeFileSync(fullPath, saida, "utf8");
              ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), saida);
              modifiedFiles.add(fullPath);
            }
          } catch (e) {
            // FASE 9 / PASSO 43 — patch parcial não é patch completo.
            //
            // Este `catch (e) {}` engolia falha de leitura/escrita por arquivo,
            // e o método devolvia `success: true` no fim. O `count` contava
            // apenas os arquivos que deram certo — honesto —, mas `success`
            // afirmava que o jogo inteiro estava traduzido. A UI recebia
            // "Traduções estáticas aplicadas com sucesso" e o `applyVerifier`
            // (FASE 2) era quem teria de pegar isso no pós-apply, relendo o
            // jogo inteiro para descobrir que faltavam linhas.
            //
            // É melhor o adapter saber agora, e dizer qual arquivo falhou.
            applyErrors.push({ file: path.relative(gameDir, fullPath).replace(/\\/g, "/"), error: e.message });
          }
        }
      }

      const partial = applyErrors.length > 0;
      // FASE 10 / D1 — `ac.finish` envelopa o retorno e acrescenta
      // `transactional`, `filesToBackup` e `fileHashes`. Os campos que o
      // adapter já devolvia são preservados; `success` continua decidindo a
      // partialidade, porque o contrato não é dono desse julgamento.
      return ac.finish({
        success: !partial,
        status: partial ? 'PARTIAL' : 'COMPLETE',
        modifiedFiles: Array.from(modifiedFiles),
        count: appliedCount,
        applyErrors,
        message: partial
          ? `Trad aplicadas PARCIALMENTE: ${appliedCount} textos em ${modifiedFiles.size} `
            + `arquivo(s), com ${applyErrors.length} arquivo(s) falhando.`
          : `Traduções estáticas aplicadas com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`,
        warning: partial
          ? 'Alguns arquivos não puderam ser escritos. O jogo está traduzido '
            + 'apenas em parte, e a tradução será reprocessada no próximo uso.'
          : null,
      });
    } catch (err) {
      await this.rollback(gameDir);
      return {
        success: false,
        error: `Falha ao aplicar traduções genéricas: ${err.message}`,
        modifiedFiles: []
      };
    }
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = GenericAdapter;
