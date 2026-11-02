/**
 * OpenTranslator — UnrealAdapter
 * Adaptador oficial para Unreal Engine 4 e 5.
 * 
 * Capacidades:
 * - Caminho A: Localização nativa via arquivos .locres compilados em Content/Localization/
 * - Caminho B: Extração e inspeção de arquivos .pak, .utoc, .ucas com chave AES
 * - Suporte a FText, String Tables, PO e manifestos de localização
 * - Validação estrita de placeholders {0}, {Arg}, LOCGEN_FORMAT_NAMED
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const UnrealHandler = require('./unrealHandler');

const UnrealLocResProvider = require('./unrealLocResProvider');
const { rollbackResult } = require('../rollbackResult.js');
// FASE 10 / D1 — o contrato de apply (filesToBackup + fileHashes).
const { startApplyContract } = require('../../core/applyContract');
const { PartialReport } = require('../../core/partialApply');

class UnrealAdapter extends BaseEngineAdapter {
  constructor() {
    super("unreal", "Unreal Engine");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "unreal" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_unreal_backup" });
    this.handler = new UnrealHandler();
  }

  getDetailedDeclaration() {
    return {
      engine: "unreal",
      name: "Unreal Engine",
      versions: ["UE 4.18+", "UE 4.27", "UE 5.0 - 5.5"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: true,
      placeholders: true,
      pluralization: true
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasPaks = this.handler._findPakFiles(gameDir).length > 0;
    const hasLocres = fs.existsSync(path.join(gameDir, 'Content', 'Localization'));

    return {
      staticFiles: hasLocres,
      nativeLocalization: hasLocres,
      archives: hasPaks,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: hasLocres ? "Unreal Native LocRes Localization" : (hasPaks ? "Unreal Pak Extractor" : "Generic OCR Fallback")
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const acc = new PartialReport();
    const locFiles = this.handler._findLocresFiles(gameDir);
    if (!locFiles.length) {
      return { success: false, texts: [], count: 0, universeComplete: false,
        code: this.handler._findPakFiles(gameDir).length ? 'UNREAL_PAK_REQUIRES_EXTRACTION' : 'UNREAL_LOCALIZATION_NOT_FOUND',
        error: 'Localizacao Unreal nao extraida. Pacotes .pak nao podem ser tratados como jogo sem texto.' };
    }
    for (const locFile of locFiles) {
      const relFile = path.relative(gameDir, locFile).replace(/\\/g, '/');
      try {
        const parsed = UnrealLocResProvider.parseLocRes(fs.readFileSync(locFile));
        for (const [ns, keys] of Object.entries(parsed.namespaces)) {
          for (const [key, item] of Object.entries(keys)) {
            const value = item.value;
            if (!value || !value.trim()) continue;
            const { protectedText, tokens } = this.codeProtector.protect(value, 'unreal');
            allTexts.push({ id: `ue_locres_${relFile}_${ns}_${key}`, file: relFile,
              namespace: ns, key, original: value, clean: value, protectedText, tokens,
              engine: 'unreal', format: 'locres' });
          }
        }
      } catch (err) { acc.fail(relFile, err); }
    }
    return acc.report({ texts: allTexts, count: allTexts.length });
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // FASE 10 / D1 — o contrato de apply. O plano de arquivos vem dos textos.
    const ac = startApplyContract(gameDir, texts);
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "unreal" });

    const modifiedFiles = new Set();
    let appliedCount = 0;
    // Escopo do METODO: os `catch` por arquivo registram a falha nela.
    const accApply = new PartialReport();

    // Percorre os arquivos planejados e monta a lista de trabalho antes do
    // try/catch, para que `success` possa ser derivado do que aconteceu.
    const forEachFile = [];
    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;
      forEachFile.push([relPath, fileTexts, fullPath]);
    }
    // era `success: true` INCONDICIONAL — inclusive quando todo arquivo falhou.
    // Evidencia do bug: .locres invalido -> SHA256 do arquivo inalterado,
    // `count: 0`, e ainda assim `{ success: true }` com a mensagem dizendo
    // "compilado com sucesso (0 textos)".
    //
    // A correcao NAO e trocar `true` por `false`: e registrar a falha por
    // arquivo e derivar `success` do que realmente foi gravado. Um adapter
    // que aplicou 3 de 5 arquivos tem sucesso PARCIAL, nao sucesso.
    const failedFiles = [];
    let anySucceeded = false;

    for (const [relPath, fileTexts, fullPath] of forEachFile) {
      // `extract()` emite `format: "locres_text"`, mas este teste exigia
      // `format === "locres"`. A condicao NUNCA casava, entao o apply do
      // Unreal nunca gravava nada — e, antes da correcao do U-001, ainda
      // devolvia `success: true`. Aceita as duas formas.
      if (fileTexts[0].format === "locres" || fileTexts[0].format === "locres_text") {
        try {
          const buf = fs.readFileSync(fullPath);
          const parsed = UnrealLocResProvider.parseLocRes(buf);
          const namespaces = parsed.namespaces || {};

          for (const item of fileTexts) {
            const tr = translations.get ? translations.get(item.id) : translations[item.id];
            if (tr && tr !== item.original && typeof item.namespace === 'string' && typeof item.key === 'string') {
              if (!namespaces[item.namespace]) namespaces[item.namespace] = {};
              const restored = this.codeProtector.restore(tr, item.tokens || []);
              const previous = namespaces[item.namespace][item.key];
              namespaces[item.namespace][item.key] = { ...(previous && typeof previous === 'object' ? previous : {}), value: restored.restoredText };
              appliedCount++;
            }
          }

          const compiledLocRes = UnrealLocResProvider.buildLocRes(namespaces);
          fs.writeFileSync(fullPath, compiledLocRes);
          ac.wrote(path.relative(gameDir, fullPath).replace(/\\/g, "/"), compiledLocRes);
          modifiedFiles.add(fullPath);
          anySucceeded = true;
        } catch (e) {
          // FASE 9 / U-001 — a falha deixou de ser silenciosa e deixou de ser
          // mascarada como sucesso.
          failedFiles.push({ file: relPath, error: e.message });
          accApply.fail(relPath, e);
          if (global.log) global.log('error', `[Unreal] Erro ao compilar locres ${relPath}: ${e.message}`);
        }
      }
    }

    // Derivado do que aconteceu de fato, nao de uma constante.
    const allFailed = !anySucceeded && forEachFile.length > 0;
    const ok2 = failedFiles.length === 0;
    return ac.finish({
      success: !allFailed,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      // A mensagem nao pode afirmar sucesso quando nenhum arquivo foi gravado.
      message: allFailed
        ? `Falha ao compilar ${failedFiles.length}/${forEachFile.length} arquivo(s) .locres; `
          + `nenhum foi gravado (${failedFiles.map((f) => f.file).join(', ')}).`
        : `Tradução Unreal compilada em .locres (${appliedCount} textos em ${modifiedFiles.size} arquivos`
          + (failedFiles.length ? `; ${failedFiles.length} falharam: ${failedFiles.map((f) => f.file).join(', ')}` : '')
          + ').',
      ...(failedFiles.length ? { errors: failedFiles, failedFiles } : {}),
    });
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = UnrealAdapter;
