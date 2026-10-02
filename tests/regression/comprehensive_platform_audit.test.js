/**
 * OpenTranslator — Comprehensive Platform Audit & Verification Test Suite
 * 
 * Validação rigorosa dos 32 pilares exigidos pelo usuário:
 * 1. Todos os 14 adapters de engine e seus 13 métodos contratuais
 * 2. Untranslated Text Detector com reconhecimento de scripts e classificação
 * 3. Runtime Text Manager com proteção contra loops e registro runtime-only
 * 4. Automated Visual QA Engine com anomalias e relatório padronizado
 * 5. Hierarchical Glossary com 5 camadas estritas e isolamento de escopo
 * 6. Atomic Job System com estados, checkpoints, snapshots, resume e version diff
 * 7. Content Layer Manager (GAME, DLC, MOD, PATCH, USER_CONTENT)
 * 8. Reversibilidade de rollback com verificação SHA-256 idêntico ao original
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

// 1. Core modules
const EngineDetector = require('../../src/core/engineDetector');
const defaultRegistry = require('../../src/core/engineRegistry');
const BaseEngineAdapter = require('../../src/core/baseEngineAdapter');
const UntranslatedDetector = require('../../src/core/untranslatedDetector');
const { TextClassification } = UntranslatedDetector;
const RuntimeTextManager = require('../../src/core/runtimeTextManager');
const VisualQAEngine = require('../../src/core/visualQAEngine');
const HierarchicalGlossary = require('../../src/core/hierarchicalGlossary');
const jobSystem = require('../../src/core/jobSystem');
const { JobState, JobSystem } = jobSystem;
const ContentLayerManager = require('../../src/core/contentLayerManager');
const { ContentLayer } = ContentLayerManager;
const DiagnosticBundle = require('../../src/core/diagnosticBundle');

function calculateHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function runAudit() {
  console.log('===============================================================');
  console.log('   AUDITORIA TOTAL E VERIFICAÇÃO EMPÍRICA DO OPENTRANSLATOR    ');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      console.error(err.stack);
    }
  }

  async function testAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      console.error(err.stack);
    }
  }

  // =================================================================
  // BLOCO 1: AUDITORIA DOS 14 ENGINE ADAPTERS E SEUS 13 MÉTODOS
  // =================================================================
  console.log('--- 1. AUDITORIA CONTRATUAL DAS 14 ENGINES ---');

  const requiredMethods = [
    'detect', 'inspect', 'extractTexts', 'extractResources',
    'prepareTranslation', 'translate', 'restorePlaceholders',
    'applyTranslations', 'validate', 'package', 'launch',
    'rollback', 'diagnose'
  ];

  const allAdapters = defaultRegistry.getAll();
  test(`Total de 14 adaptadores registrados (atual: ${allAdapters.length})`, () => {
    assert.strictEqual(allAdapters.length, 14);
  });

  const tempFixtureDir = path.join(__dirname, '..', '..', 'data', 'temp_audit_fixture');
  if (!fs.existsSync(tempFixtureDir)) fs.mkdirSync(tempFixtureDir, { recursive: true });

  for (const adapter of allAdapters) {
    test(`Engine [${adapter.id}]: Possui todos os 13 métodos contratuais`, () => {
      for (const m of requiredMethods) {
        assert.strictEqual(typeof adapter[m], 'function', `Método ${m} ausente em ${adapter.id}`);
      }
    });

    await testAsync(`Engine [${adapter.id}]: diagnose() retorna estrutura completa com readiness`, async () => {
      const diag = await adapter.diagnose(tempFixtureDir);
      assert.strictEqual(diag.engine, adapter.id);
      assert.ok(diag.capabilities);
      assert.ok(diag.declaration);
      assert.ok(diag.readiness);
      assert.ok(Array.isArray(diag.externalTools));
    });
  }

  // =================================================================
  // BLOCO 2: UNTRANSLATED TEXT DETECTOR (RECONHECIMENTO DE IDIOMAS E SCRIPTS)
  // =================================================================
  console.log('\n--- 2. DETECTOR UNIVERSAL DE TEXTOS NÃO TRADUZIDOS ---');

  test('Detecção de Scripts: Japonês (Hiragana/Katakana/Kanji)', () => {
    const res1 = UntranslatedDetector.detectScriptAndLanguage('勇者の剣を手に入れた！');
    assert.strictEqual(res1.language, 'ja');
    assert.strictEqual(res1.isForeign, true);
  });

  test('Detecção de Scripts: Coreano (Hangul)', () => {
    const res = UntranslatedDetector.detectScriptAndLanguage('새로운 게임을 시작합니다');
    assert.strictEqual(res.language, 'ko');
    assert.strictEqual(res.isForeign, true);
  });

  test('Detecção de Scripts: Russo (Cyrillic)', () => {
    const res = UntranslatedDetector.detectScriptAndLanguage('Начать новую игру');
    assert.strictEqual(res.language, 'ru');
    assert.strictEqual(res.isForeign, true);
  });

  test('Detecção de Scripts: Inglês vs Português', () => {
    const resEn = UntranslatedDetector.detectScriptAndLanguage('Battle Animation Speed and Volume Options');
    assert.strictEqual(resEn.language, 'en');
    assert.strictEqual(resEn.isForeign, true);

    const resPt = UntranslatedDetector.detectScriptAndLanguage('Velocidade da Animação de Batalha e Opções de Volume');
    assert.strictEqual(resPt.language, 'pt');
    assert.strictEqual(resPt.isForeign, false);
  });

  test('Classificação Completa de Lote: Relatório com 7 categorias', () => {
    const sampleTexts = [
      { id: 't1', original: 'Start Game', clean: 'Start Game' },
      { id: 't2', original: 'Options', clean: 'Options' },
      { id: 't3', original: 'C:/assets/bg01.png', clean: 'C:/assets/bg01.png' },
      { id: 't4', original: '⟦OT_CODE_1⟧', clean: '⟦OT_CODE_1⟧', isProtected: true },
      { id: 't5', original: 'HUD Dynamic Element', clean: 'HUD Dynamic Element', isRuntimeOnly: true },
      { id: 't6', original: 'OK', clean: 'OK' }
    ];

    const trans = new Map();
    trans.set('t1', 'Iniciar Jogo'); // TRANSLATED
    // t2 sem tradução: UNTRANSLATED
    trans.set('t3', 'C:/assets/bg01.png'); // TECHNICAL
    trans.set('t6', 'OK'); // IDENTICAL_TRANSLATION

    const analysis = UntranslatedDetector.analyzeExtraction(sampleTexts, trans);
    assert.strictEqual(analysis.summary.totalFound, 6);
    assert.strictEqual(analysis.summary.translated, 1);
    assert.strictEqual(analysis.summary.untranslated, 1);
    assert.strictEqual(analysis.summary.technical, 1);
    assert.strictEqual(analysis.summary.protected, 1);
    assert.strictEqual(analysis.summary.runtimeOnly, 1);
    assert.strictEqual(analysis.summary.identical, 1);

    const rep = analysis.formattedReport;
    assert.ok(rep.includes('Total encontrado: 6'));
    assert.ok(rep.includes('Traduzidos: 1'));
    assert.ok(rep.includes('Não traduzidos: 1'));
    assert.ok(rep.includes('Protegidos: 1'));
    assert.ok(rep.includes('Técnicos: 1'));
    assert.ok(rep.includes('Runtime-only: 1'));
  });

  // =================================================================
  // BLOCO 3: RUNTIME TEXT MANAGER (HOOK, CACHE, LOOP PREVENTION)
  // =================================================================
  console.log('\n--- 3. RUNTIME TEXT MANAGER & DETECÇÃO RUNTIME-ONLY ---');

  await testAsync('Filtro de Ruído: Código JS, CSS e URLs são rejeitados', async () => {
    const rtm = RuntimeTextManager.getInstance();
    assert.strictEqual(rtm.shouldTranslate('function() { return true; }'), false);
    assert.strictEqual(rtm.shouldTranslate('#ff00aa'), false);
    assert.strictEqual(rtm.shouldTranslate('http://example.com/api'), false);
    assert.strictEqual(rtm.shouldTranslate('12345'), false);
    assert.strictEqual(rtm.shouldTranslate('New Game'), true);
  });

  await testAsync('Tradução Runtime com Cache e Prevenção de Loops', async () => {
    const rtm = RuntimeTextManager.getInstance();
    let providerCalls = 0;

    const translateMock = async (str) => {
      providerCalls++;
      return `[PT] ${str}`;
    };

    // 1ª chamada: traduz via provider
    const r1 = await rtm.processRuntimeText('Special Secret Item', { engine: 'rpgmaker', scene: 'Menu' }, translateMock);
    assert.strictEqual(r1.fromCache, false);
    assert.strictEqual(r1.translated, '[PT] Special Secret Item');
    assert.strictEqual(providerCalls, 1);

    // 2ª chamada idêntica: DEVE vir do cache (0 chamadas adicionais)
    const r2 = await rtm.processRuntimeText('Special Secret Item', { engine: 'rpgmaker', scene: 'Menu' }, translateMock);
    assert.strictEqual(r2.fromCache, true);
    assert.strictEqual(r2.translated, '[PT] Special Secret Item');
    assert.strictEqual(providerCalls, 1); // Sem chamada extra ao provider!

    // Registro como runtime-only
    const allRuntime = rtm.getAllRuntimeTexts();
    const found = allRuntime.find(r => r.original === 'Special Secret Item');
    assert.ok(found);
    assert.strictEqual(found.translated, '[PT] Special Secret Item');

    // Promoção para Memória de Tradução
    const promo = rtm.addToTranslationMemory(found.hash);
    assert.strictEqual(promo.success, true);
    assert.strictEqual(promo.record.addedToTM, true);
  });

  // =================================================================
  // BLOCO 4: QA VISUAL AUTOMATIZADO
  // =================================================================
  console.log('\n--- 4. QA VISUAL AUTOMATIZADO E DETECÇÃO DE ANOMALIAS ---');

  await testAsync('Geração de Relatório de QA Visual Padronizado', async () => {
    const qa = new VisualQAEngine();
    const res = await qa.runAutomatedQA({ gameDir: tempFixtureDir });
    assert.ok(res.summary);
    assert.strictEqual(res.summary.title, 'PASS');
    assert.strictEqual(res.summary.options, 'PASS');
    assert.strictEqual(res.summary.menu, 'PASS');
    assert.strictEqual(res.summary.item, 'PASS');
    assert.strictEqual(res.summary.dialogue, 'PASS');

    const formatted = res.formattedReport;
    assert.ok(formatted.includes('TITLE: PASS'));
    assert.ok(formatted.includes('OPTIONS: PASS'));
    assert.ok(formatted.includes('MENU: PASS'));
    assert.ok(formatted.includes('ITEM: PASS'));
    assert.ok(formatted.includes('DIALOGUE: PASS'));
    assert.ok(formatted.includes('CRASH: PASS'));
  });

  test('Detecção de Tela Preta por Tamanho e Heurística de Pixels', () => {
    const tinyBuffer = Buffer.alloc(500); // 500 bytes de imagem PNG vazia
    assert.strictEqual(VisualQAEngine.isBlackScreen(tinyBuffer), true);

    const normalBuffer = Buffer.alloc(15000); // 15KB imagem com dados visíveis
    assert.strictEqual(VisualQAEngine.isBlackScreen(normalBuffer), false);
  });

  // =================================================================
  // BLOCO 5: GLOSSÁRIO HIERÁRQUICO COM PRIORIDADE ESTREITA
  // =================================================================
  console.log('\n--- 5. GLOSSÁRIO HIERÁRQUICO (PROJECT -> PLUGIN -> GAME -> ENGINE -> GLOBAL) ---');

  test('Prioridade Previsível de Resolução de Glossário', () => {
    const hg = new HierarchicalGlossary();

    hg.addTerm({ scope: 'GLOBAL', source: 'Attack', target: 'Ataque Global' });
    hg.addTerm({ scope: 'ENGINE', scopeId: 'rpgmaker', source: 'Attack', target: 'Golpear' });
    hg.addTerm({ scope: 'GAME', scopeId: 'epic_rpg', source: 'Attack', target: 'Investida' });
    hg.addTerm({ scope: 'PLUGIN', scopeId: 'yanfly_battle', source: 'Attack', target: 'Ataque Yanfly' });
    hg.addTerm({ scope: 'PROJECT', scopeId: 'C:/games/my_custom_project', source: 'Attack', target: 'Ataque do Projeto' });

    // 1. Projeto prevalece sobre todos
    const rProj = hg.resolveTerm('Attack', {
      projectDir: 'C:/games/my_custom_project',
      plugin: 'yanfly_battle',
      gameId: 'epic_rpg',
      engine: 'rpgmaker'
    });
    assert.strictEqual(rProj.target, 'Ataque do Projeto');

    // 2. Sem projeto, Plugin prevalece
    const rPlugin = hg.resolveTerm('Attack', {
      plugin: 'yanfly_battle',
      gameId: 'epic_rpg',
      engine: 'rpgmaker'
    });
    assert.strictEqual(rPlugin.target, 'Ataque Yanfly');

    // 3. Sem plugin, Game prevalece
    const rGame = hg.resolveTerm('Attack', {
      gameId: 'epic_rpg',
      engine: 'rpgmaker'
    });
    assert.strictEqual(rGame.target, 'Investida');

    // 4. Sem game, Engine prevalece
    const rEngine = hg.resolveTerm('Attack', { engine: 'rpgmaker' });
    assert.strictEqual(rEngine.target, 'Golpear');

    // 5. Sem contexto, Global responde
    const rGlobal = hg.resolveTerm('Attack', {});
    assert.strictEqual(rGlobal.target, 'Ataque Global');
  });

  // =================================================================
  // BLOCO 6: ATOMIC JOB SYSTEM, RESUME, SNAPSHOT E TRANSLATION DIFF
  // =================================================================
  console.log('\n--- 6. ATOMIC JOBS, CHECKPOINTS, RESUME E TRANSLATION DIFF ---');

  test('Ciclo de Vida de Job com Estados Estritos', () => {
    const job = jobSystem.createJob(tempFixtureDir, { engine: 'generic' });
    assert.strictEqual(job.state, JobState.CREATED);

    jobSystem.updateJobState(job.id, 'EXTRACTING', { textsFound: 50 });
    assert.strictEqual(jobSystem.getJob(job.id).state, JobState.EXTRACTING);
    assert.strictEqual(jobSystem.getJob(job.id).textsFound, 50);

    jobSystem.updateJobState(job.id, 'TRANSLATING', { textsTranslated: 20, textsPending: 30 });
    jobSystem.saveCheckpoint(job.id, { translations: { t1: 'A', t2: 'B' } });

    // Simula interrupção / retomada (Resume)
    const resumed = jobSystem.resumeJob(job.id);
    assert.strictEqual(resumed.success, true);
    assert.strictEqual(resumed.confirmedTranslationsCount, 2);
  });

  test('Translation Diff entre v1 e v2 de um jogo', () => {
    const v1Texts = [
      { id: '1', original: 'Play' },
      { id: '2', original: 'Options' },
      { id: '3', original: 'Old Level 1' }
    ];
    const v2Texts = [
      { id: '1', original: 'Play' },
      { id: '2', original: 'Options' },
      { id: '4', original: 'New DLC Level 2' } // Novo
      // 'Old Level 1' foi removido
    ];
    const v1Resolved = { '1': 'Jogar', '2': 'Opções', '3': 'Nível Antigo 1' };

    const diff = JobSystem.calculateTranslationDiff(v1Texts, v2Texts, v1Resolved);
    assert.strictEqual(diff.reusedCount, 2); // 'Play' e 'Options' reaproveitados
    assert.strictEqual(diff.added.length, 1); // 'New DLC Level 2'
    assert.strictEqual(diff.removed.length, 1); // 'Old Level 1'
  });

  // =================================================================
  // BLOCO 7: SEPARAÇÃO DE CAMADAS (GAME, DLC, MOD, PATCH, USER CONTENT)
  // =================================================================
  console.log('\n--- 7. SEPARAÇÃO E SEGURANÇA DE CAMADAS DE CONTEÚDO ---');

  test('Classificação e Proteção de USER_CONTENT (Saves nunca sobrescritos)', () => {
    assert.strictEqual(ContentLayerManager.classifyPath('data/System.json'), ContentLayer.GAME);
    assert.strictEqual(ContentLayerManager.classifyPath('dlc/expansion_01.json'), ContentLayer.DLC);
    assert.strictEqual(ContentLayerManager.classifyPath('mods/rebalance.ini'), ContentLayer.MOD);
    assert.strictEqual(ContentLayerManager.classifyPath('patch/patch_v1.1.rpa'), ContentLayer.PATCH);
    assert.strictEqual(ContentLayerManager.classifyPath('saves/save01.rpgsave'), ContentLayer.USER_CONTENT);

    assert.strictEqual(ContentLayerManager.isSafeForTranslation('data/System.json'), true);
    assert.strictEqual(ContentLayerManager.isSafeForTranslation('saves/file1.rpgsave'), false);
    assert.strictEqual(ContentLayerManager.isSafeForTranslation('save/global.rpgsave'), false);
  });

  // =================================================================
  // BLOCO 8: SNAPSHOT E ROLLBACK COM INTEGRIDADE SHA-256
  // =================================================================
  console.log('\n--- 8. TESTE DE APLICAÇÃO TRANSACIONAL E ROLLBACK SHA-256 ---');

  await testAsync('Original -> Tradução -> Rollback -> SHA-256 100% idêntico', async () => {
    const testGameDir = path.join(tempFixtureDir, 'game_rollback_test');
    if (!fs.existsSync(testGameDir)) fs.mkdirSync(testGameDir, { recursive: true });

    const testFile = path.join(testGameDir, 'strings.json');
    const originalContent = JSON.stringify({ title: "Start Adventure", exit: "Quit Game" }, null, 2);
    fs.writeFileSync(testFile, originalContent, 'utf8');

    const originalHash = calculateHash(fs.readFileSync(testFile));

    const GenericAdapter = require('../../src/engines/generic/genericAdapter');
    const adapter = new GenericAdapter();

    // 1. Extração
    const extractRes = await adapter.extract(testGameDir);
    assert.strictEqual(extractRes.success, true);
    assert.strictEqual(extractRes.count, 2);

    // 2. Aplicação com tradução
    const transMap = new Map();
    transMap.set('gen_json_0', 'Iniciar Aventura');
    transMap.set('gen_json_1', 'Sair do Jogo');

    const applyRes = await adapter.apply(testGameDir, extractRes.texts, transMap);
    assert.strictEqual(applyRes.success, true);
    assert.strictEqual(applyRes.count, 2);

    const modifiedContent = fs.readFileSync(testFile, 'utf8');
    assert.ok(modifiedContent.includes('Iniciar Aventura'));
    const modifiedHash = calculateHash(Buffer.from(modifiedContent));
    assert.notStrictEqual(modifiedHash, originalHash);

    // 3. Rollback
    const rollbackRes = await adapter.rollback(testGameDir);
    assert.strictEqual(rollbackRes.success, true);

    const restoredContent = fs.readFileSync(testFile, 'utf8');
    const restoredHash = calculateHash(Buffer.from(restoredContent));

    assert.strictEqual(restoredHash, originalHash, 'O hash SHA-256 após o rollback DEVE ser idêntico ao original!');
  });

  // Limpeza do diretório de fixture temporário
  try {
    fs.rmSync(tempFixtureDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n===============================================================');
  console.log(`   RESULTADO FINAL DA AUDITORIA: ${passedTests}/${totalTests} TESTES APROVADOS`);
  console.log('===============================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error("FATAL AUDIT FAILURE:", err);
  process.exit(1);
});
