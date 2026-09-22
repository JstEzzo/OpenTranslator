/**
 * OpenTranslator — TranslationPipeline 2.0
 * Orquestrador central de fluxo de tradução com:
 * - Seleção dinâmica de adapters via EngineRegistry
 * - Proteção de tags via CodeProtector 2.0
 * - Validação de integridade via QAEngine
 * - Memória hierárquica via TranslationMemory 2.0
 * - Suporte nativo a Dry-Run
 * - Transacionalidade com BackupManager e Rollback automático
 */

const fs = require('fs');
const path = require('path');
const EngineDetector = require('./engineDetector');
const defaultRegistry = require('./engineRegistry');
const CodeProtector = require('./codeProtector');
const BackupManager = require('./backupManager');
const QAEngine = require('./qaEngine');
const translationMemory = require('./translationMemory');

// Registra adapters
const RenpyAdapter = require('../engines/renpy/renpyAdapter');
const RpgMakerAdapter = require('../engines/rpgmaker/rpgMakerAdapter');
const ElectronAdapter = require('../engines/electron/electronAdapter');
const UnityAdapter = require('../engines/unity/unityAdapter');
const GenericAdapter = require('../engines/generic/genericAdapter');

defaultRegistry.register(new RenpyAdapter());
defaultRegistry.register(new RpgMakerAdapter());
defaultRegistry.register(new ElectronAdapter());
defaultRegistry.register(new UnityAdapter());
defaultRegistry.register(new GenericAdapter());

class TranslationPipeline {
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.backupManager = new BackupManager();
  }

  async dryRun(gameDir, options = {}) {
    const detection = await EngineDetector.detect(gameDir);
    const targetDir = detection.detectedSubdir || gameDir;
    const adapter = this.registry.resolveAdapter(detection);

    if (!adapter) {
      return {
        success: false,
        error: 'Nenhum adapter compatível encontrado.',
        detection
      };
    }

    const extractResult = await adapter.extract(targetDir, options);
    let protectedTokensCount = 0;
    const sampleQA = [];

    for (const t of (extractResult.texts || []).slice(0, 10)) {
      if (t.tokens && t.tokens.length > 0) {
        protectedTokensCount += t.tokens.length;
      }
      // Simula QA no texto extraído
      const qa = QAEngine.validate(t.clean, t.clean, { expectedTokens: t.tokens });
      sampleQA.push({ text: t.clean, qaStatus: qa.qaStatus });
    }

    return {
      success: true,
      dryRun: true,
      engine: detection.engine,
      engineVersion: detection.engineVersion,
      architecture: detection.architecture,
      confidence: detection.confidence,
      evidence: detection.evidence,
      capabilities: adapter.getCapabilities(targetDir),
      totalStrings: extractResult.count || 0,
      protectedTokensCount,
      sampleTexts: (extractResult.texts || []).slice(0, 5),
      sampleQA,
      filesModified: 0
    };
  }

  async run(gameDir, options = {}) {
    if (options.dryRun === true) {
      return this.dryRun(gameDir, options);
    }

    const detection = await EngineDetector.detect(gameDir);
    const targetDir = detection.detectedSubdir || gameDir;
    const adapter = this.registry.resolveAdapter(detection);

    if (!adapter) {
      return { success: false, error: 'Adapter não localizado para engine: ' + detection.engine };
    }

    if (global.log) global.log('info', '[Pipeline] Iniciando tradução para: ' + path.basename(targetDir) + ' (' + detection.engine + ')');

    const extractResult = await adapter.extract(targetDir, options);
    if (!extractResult.success || (extractResult.count || 0) === 0) {
      return {
        success: true,
        count: 0,
        message: 'Nenhum texto traduzível pendente.',
        detection
      };
    }

    const texts = extractResult.texts;
    const translations = new Map();
    const sl = options.sl || 'auto';
    const tl = options.tl || 'pt';

    let cacheHits = 0;
    const pendingTexts = [];

    // Consulta Translation Memory 2.0
    for (const t of texts) {
      const cached = translationMemory.lookup(t.clean, {
        engine: detection.engine,
        gameId: path.basename(targetDir)
      });

      if (cached) {
        translations.set(t.id, cached);
        cacheHits++;
      } else {
        pendingTexts.push(t);
      }
    }

    if (global.log) global.log('info', '[Pipeline] Cache Hit: ' + cacheHits + ' textos. Traduzindo ' + pendingTexts.length + ' inéditos...');

    if (pendingTexts.length > 0) {
      if (options.provider === 'mock' || options.mockTranslations === true) {
        for (const pt of pendingTexts) {
          translations.set(pt.id, "[PT] " + pt.clean);
        }
      } else {
        const translator = require('../translator');
      const cache = require('../cache');
      const glossary = cache.loadGlossary();

      const newTranslations = await translator.translateBatch(
        pendingTexts,
        sl,
        tl,
        options.provider || 'google',
        glossary,
        (chunk) => {
          if (chunk && chunk.length > 0) {
            for (const item of chunk) {
              translationMemory.store(item.clean, item.translated, {
                engine: detection.engine,
                gameId: path.basename(targetDir),
                filePath: item.file
              });
            }
          }
        }
      );

      for (const [id, tr] of newTranslations) {
        translations.set(id, tr);
        const origObj = texts.find(x => x.id === id);
        if (origObj) {
          translationMemory.store(origObj.clean, tr, {
            engine: detection.engine,
            gameId: path.basename(targetDir),
            filePath: origObj.file
          });
        }
      }
      }
    }

    // Validação com QAEngine
    let qaErrorsCount = 0;
    let qaWarningsCount = 0;
    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr) {
        const qaRes = QAEngine.validate(t.clean, tr, { expectedTokens: t.tokens });
        if (qaRes.qaStatus === 'fail') qaErrorsCount++;
        else if (qaRes.qaStatus === 'warn') qaWarningsCount++;
      }
    }

    if (global.log) global.log('info', '[Pipeline QA] Status: ' + qaErrorsCount + ' erros, ' + qaWarningsCount + ' alertas.');

    // Validação estrutural do Adapter
    const valResult = await adapter.validate(targetDir, texts, translations);
    if (!valResult.valid) {
      if (global.log) global.log('error', '[Pipeline] Validação falhou: ' + (valResult.errors || []).join('; '));
      return { success: false, error: 'Validação pré-aplicação falhou.', details: valResult.errors };
    }

    // Aplicação Transacional
    try {
      const applyResult = await adapter.apply(targetDir, texts, translations, options);
      if (!applyResult.success) {
        if (global.log) global.log('warn', '[Pipeline] Falha na aplicação. Executando rollback seguro...');
        await adapter.rollback(targetDir, options);
        return { success: false, error: applyResult.error };
      }

      if (global.log) global.log('success', '[Pipeline] Concluído! ' + (applyResult.count || translations.size) + ' textos aplicados.');

      return {
        success: true,
        engine: detection.engine,
        engineVersion: detection.engineVersion,
        totalStrings: texts.length,
        cacheHits,
        translatedNew: pendingTexts.length,
        qaErrorsCount,
        qaWarningsCount,
        modifiedFiles: applyResult.modifiedFiles || []
      };
    } catch (err) {
      if (global.log) global.log('error', '[Pipeline] Exceção durante aplicação. Executando rollback...');
      await adapter.rollback(targetDir, options);
      return { success: false, error: err.message };
    }
  }
}

module.exports = TranslationPipeline;
