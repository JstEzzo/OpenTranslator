/**
 * OpenTranslator — Cocos2dxAdapter
 * Adaptador oficial para Cocos2d-x (C++ e Lua).
 * Suporte a XML plist, JSON e strings tables.
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

class Cocos2dxAdapter extends BaseEngineAdapter {
  constructor() {
    super("cocos2dx", "Cocos2d-x");

    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup
    // que a transação vai fazer". `ac.finish` verifica a cada apply e
    // devolve `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar
    // `this` antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "cocos" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_cocos2dx_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "cocos2dx",
      name: "Cocos2d-x",
      versions: ["Cocos2d-x 2.x", "3.x", "4.x"],
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
    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: false,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Cocos2d-x .plist & JSON Resource Tables"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    // FASE 9 / PASSO 53 — o relatório decide o `success`.
    const acc = new PartialReport();
    const scanDirs = [
      path.join(gameDir, "Resources"),
      path.join(gameDir, "res"),
      gameDir
    ];

    const visitedFiles = new Set();

    for (const sDir of scanDirs) {
      if (!fs.existsSync(sDir)) continue;
      const walk = (dir, depth = 0) => {
        if (depth > 3) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const fullP = path.join(dir, ent.name);
            if (ent.isDirectory() && !ent.name.startsWith(".")) {
              walk(fullP, depth + 1);
            } else if (ent.isFile()) {
              if (visitedFiles.has(fullP)) continue;
              visitedFiles.add(fullP);
              const ext = path.extname(ent.name).toLowerCase();
              const relP = path.relative(gameDir, fullP).replace(/\\/g, "/");

              if (ext === ".plist" || ext === ".xml") {
                acc.ok();
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const regex = /<key>([^<]+)<\/key>\s*<string>([^<]+)<\/string>/g;
                  let match;
                  while ((match = regex.exec(content)) !== null) {
                    const key = match[1];
                    const val = match[2].trim();
                    if (val.length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(val, "cocos");
                      allTexts.push({
                        id: `c2dx_plist_${relP}_${key}`,
                        file: relP,
                        key,
                        original: val,
                        clean: val,
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "plist"
                      });
                    }
                  }
                } catch (e) {
                  // FASE 9 / PASSO 53 — .plist/.xml ilegível.
                  // Ver src/core/partialApply.js.
                  acc.fail(`${relP} (plist)`, e);
                }
              } else if (ext === ".strings") {
                acc.ok();
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)";/g;
                  let match;
                  while ((match = regex.exec(content)) !== null) {
                    const key = match[1];
                    const val = match[2].trim();
                    if (val.length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(val, "cocos");
                      allTexts.push({
                        id: `c2dx_strings_${relP}_${key}`,
                        file: relP,
                        key,
                        original: val,
                        clean: val,
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "strings"
                      });
                    }
                  }
                } catch (e) {
                  // FASE 9 / PASSO 53 — .strings ilegível.
                  acc.fail(`${relP} (strings)`, e);
                }
              } else if (ext === ".json" && (relP.toLowerCase().includes("lang") || relP.toLowerCase().includes("string") || relP.toLowerCase().includes("i18n"))) {
                acc.ok();
                try {
                  const content = fs.readFileSync(fullP, 'utf8');
                  const parsed = JSON.parse(content);
                  for (const [k, v] of Object.entries(parsed)) {
                    if (typeof v === "string" && v.trim().length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "cocos");
                      allTexts.push({
                        id: `c2dx_json_${relP}_${k}`,
                        file: relP,
                        key: k,
                        original: v.trim(),
                        clean: v.trim(),
                        protectedText,
                        tokens,
                        engine: "cocos2dx",
                        format: "json"
                      });
                    }
                  }
                } catch (e) {
                  // FASE 9 / PASSO 53 — JSON de i18n malformado.
                  acc.fail(`${relP} (json)`, e);
                }
              }
            }
          }
        } catch (e) {
          // FASE 9 / PASSO 53 — a VARREDURA do diretório falhou. Todo o
          // conteúdo abaixo de `dir` some do universo, e o adapter original
          // dizia `success: true` como se a pasta estivesse vazia.
          acc.fail(path.relative(gameDir, dir).replace(/\\/g, "/"), e);
        }
      };
      walk(sDir);
    }

    // FASE 9 / PASSO 53 — quem decide o `success` é o relatório.
    return acc.report({ texts: allTexts, count: allTexts.length });
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
  // FASE 10 / D1 — o contrato de apply. O plano de arquivos vem dos
  // textos: um texto traduzível veio de um arquivo, e aplicar escreve
  // nesse arquivo. Se este adapter passar a escrever fora do plano,
  // `ac.finish` devolve `transactional: false` e o pipeline volta ao
  // fallback com verifyApplied — que é o comportamento correto.
  const ac = startApplyContract(gameDir, texts);
    // Escopo do METODO, e nao do `for`. A declaracao vivia dentro do laco e o
    // `ac.finish(accApply.report(...))` do fim vivia no escopo do metodo:
    // ReferenceError em TODO apply. Coerente com defold/gamemaker/unity.
    const accApply = new PartialReport();
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "cocos2dx" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const fmt = fileTexts[0].format;
      try {
        if (fmt === "json") {
          const content = fs.readFileSync(fullPath, "utf8");
          const parsed = JSON.parse(content);
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              parsed[t.key] = restored.restoredText;
              modified = true;
              appliedCount++;
            }
          }
          if (modified) {
            const _saida_fullPath = JSON.stringify(parsed, null, 2);
            fs.writeFileSync(fullPath, _saida_fullPath, "utf8");
            // FASE 10 / D1 — o hash declarado vem do CONTEÚDO EM MEMÓRIA.
            // Hashear o arquivo depois de escrever compararia o número com ele
            // mesmo, e a verificação não verificaria nada.
            ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), _saida_fullPath);
            modifiedFiles.add(fullPath);
          }
        } else if (fmt === "plist") {
          let content = fs.readFileSync(fullPath, "utf8");
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              const escapedKey = t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp(`(<key>${escapedKey}<\\/key>\\s*<string>)[^<]*(<\\/string>)`, 'g');
              if (pattern.test(content)) {
                content = content.replace(pattern, `$1${restored.restoredText}$2`);
                modified = true;
                appliedCount++;
              }
            }
          }
          if (modified) {
            const _saida_fullPath = content;
            fs.writeFileSync(fullPath, _saida_fullPath, "utf8");
            // FASE 10 / D1 — o hash declarado vem do CONTEÚDO EM MEMÓRIA.
            // Hashear o arquivo depois de escrever compararia o número com ele
            // mesmo, e a verificação não verificaria nada.
            ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), _saida_fullPath);
            modifiedFiles.add(fullPath);
          }
        } else if (fmt === "strings") {
          let content = fs.readFileSync(fullPath, "utf8");
          let modified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              const escapedKey = t.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp(`("${escapedKey}"\\s*=\\s*")[^"]*(";)` , 'g');
              if (pattern.test(content)) {
                content = content.replace(pattern, `$1${restored.restoredText}$2`);
                modified = true;
                appliedCount++;
              }
            }
          }
          if (modified) {
            const _saida_fullPath = content;
            fs.writeFileSync(fullPath, _saida_fullPath, "utf8");
            // FASE 10 / D1 — o hash declarado vem do CONTEÚDO EM MEMÓRIA.
            // Hashear o arquivo depois de escrever compararia o número com ele
            // mesmo, e a verificação não verificaria nada.
            ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), _saida_fullPath);
            modifiedFiles.add(fullPath);
          }
        }
      } catch (e) {
        // FASE 9 / PASSO 57 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(fullPath, e);
      }
    }

    return ac.finish(accApply.report({
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Cocos2d-x aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    }));
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = Cocos2dxAdapter;
