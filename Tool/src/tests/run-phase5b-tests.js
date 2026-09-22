const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Phase 5B Modules
const TextClassifier = require('../core/textClassifier');
const TextStabilizer = require('../core/textStabilizer');
const PriorityQueue = require('../core/priorityQueue');
const MultiLevelCache = require('../core/multiLevelCache');
const TranslationRouter = require('../core/translationRouter');
const { STATES, TranslationState } = require('../core/translationStateMachine');
const GameRules = require('../core/gameRules');
const { LayoutAnalyzer, FontCompatibilityAnalyzer } = require('../core/layoutAnalyzer');
const OutputProvider = require('../core/outputProvider');
const TranslationProvider = require('../core/translationProvider');
const performanceMonitor = require('../core/performanceMonitor');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('   OPENTRANSLATOR — PHASE 5B TEST SUITE');
  console.log('   UNIVERSAL TRANSLATION ENGINE & PERFORMANCE');
  console.log('====================================================\n');

  // Test 1: TextClassifier (Filtro de Lixo e Dados Técnicos)
  runTest('TextClassifier: Distinguishes human text from technical junk', () => {
    assert.strictEqual(TextClassifier.classify('Hello, how can I help you?').translatable, true);
    assert.strictEqual(TextClassifier.classify('こんにちは、冒険者！').translatable, true);
    assert.strictEqual(TextClassifier.classify('1920x1080').translatable, false);
    assert.strictEqual(TextClassifier.classify('60 fps').translatable, false);
    assert.strictEqual(TextClassifier.classify('16.6ms').translatable, false);
    assert.strictEqual(TextClassifier.classify('https://api.github.com/v1').translatable, false);
    assert.strictEqual(TextClassifier.classify('d41d8cd98f00b204e9800998ecf8427e').translatable, false);
    assert.strictEqual(TextClassifier.classify('FLAG_GAME_EVENT_001').translatable, false);
  });

  // Test 2: TextStabilizer (Debounce & Anti-Spam)
  await runAsyncTest('TextStabilizer: Debounce rapid changing text on UI components', async () => {
    const stabilizer = new TextStabilizer({ debounceMs: 50 });
    const p1 = stabilizer.stabilize('loading_label', 'Loading');
    const p2 = stabilizer.stabilize('loading_label', 'Loading.');
    const p3 = stabilizer.stabilize('loading_label', 'Loading..');
    const p4 = stabilizer.stabilize('loading_label', 'Ready!');

    const res = await p4;
    assert.strictEqual(res.stabilized, true);
    assert.strictEqual(res.text, 'Ready!');
  });

  // Test 3: PriorityQueue (P0 a P5)
  runTest('PriorityQueue: Strict prioritization and batch dequeue', () => {
    const queue = new PriorityQueue();
    queue.enqueue({ text: 'Background text' }, 'P5');
    queue.enqueue({ text: 'Screen dialogue now' }, 'P0');
    queue.enqueue({ text: 'Menu item' }, 'P2');

    const first = queue.dequeue();
    assert.strictEqual(first.priority, 'P0');
    assert.strictEqual(first.text, 'Screen dialogue now');

    const second = queue.dequeue();
    assert.strictEqual(second.priority, 'P2');

    const third = queue.dequeue();
    assert.strictEqual(third.priority, 'P5');
  });

  // Test 4: MultiLevelCache (L1 -> L3 -> L4)
  runTest('MultiLevelCache: Multi-tier caching with manual override priority', () => {
    const tempDir = path.join(__dirname, 'temp_cache');
    const cache = new MultiLevelCache({ diskCacheDir: tempDir });

    try {
      // 1. Set L3 Disk
      cache.setL3('Sword', 'Espada', 'weapons');
      const hitL1 = cache.get('Sword', 'weapons');
      assert.strictEqual(hitL1.found, true);
      assert.strictEqual(hitL1.translation, 'Espada');

      // 2. Set L4 Manual Override
      cache.setManualOverride('Sword', 'Lâmina Lendária', 'weapons');
      const hitL4 = cache.get('Sword', 'weapons');
      assert.strictEqual(hitL4.found, true);
      assert.strictEqual(hitL4.translation, 'Lâmina Lendária');
      assert.strictEqual(hitL4.level, 'L4_MANUAL');

      const stats = cache.getStats();
      assert.strictEqual(stats.l4Hits >= 1, true);
    } finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 5: TranslationRouter (Decisão por Capabilities)
  runTest('TranslationRouter: Capability and engine-based method selection', () => {
    const renpyRoute = TranslationRouter.route({ engine: "Ren'Py" });
    assert.strictEqual(renpyRoute.selectedMethod, 'METHOD_B_NATIVE');

    const electronRoute = TranslationRouter.route({ engine: 'Electron', packaging: 'asar' });
    assert.strictEqual(electronRoute.selectedMethod, 'METHOD_E_DOM_WEB');

    const unityMonoRoute = TranslationRouter.route({ engine: 'Unity', textSystem: 'textmeshpro', runtime: 'mono' });
    assert.strictEqual(unityMonoRoute.selectedMethod, 'METHOD_D_UI_FRAMEWORK');

    const unknownRoute = TranslationRouter.route({ engine: 'Unknown' });
    assert.strictEqual(unknownRoute.selectedMethod, 'METHOD_F_OVERLAY');
    assert(unknownRoute.fallbackChain.includes('METHOD_G_OCR'));
  });

  // Test 6: TranslationStateMachine (Ciclo de Vida)
  runTest('TranslationStateMachine: Transition states from DETECTED to DISPLAYED', () => {
    const item = new TranslationState('Start Game');
    assert.strictEqual(item.state, STATES.DETECTED);

    item.transition(STATES.STABILIZING);
    item.transition(STATES.READY);
    item.transition(STATES.TRANSLATING);
    item.transition(STATES.TRANSLATED, { result: 'Iniciar Jogo' });
    item.transition(STATES.VALIDATED);
    item.transition(STATES.DISPLAYED);

    assert.strictEqual(item.isTerminal(), true);
    assert.strictEqual(item.history.length, 7);
  });

  // Test 7: GameRules (Customização por Jogo)
  runTest('GameRules: Ignore components, regex filters and forced overrides', () => {
    const rules = new GameRules({
      ignoreComponents: ['FPSCounter'],
      ignoreRegexes: ['^v\\d+\\.\\d+$']
    });

    assert.strictEqual(rules.shouldIgnore('60', 'FPSCounter'), true);
    assert.strictEqual(rules.shouldIgnore('v1.04', 'VersionText'), true);
    assert.strictEqual(rules.shouldIgnore('Press Start', 'MenuText'), false);
  });

  // Test 8: LayoutAnalyzer & FontCompatibilityAnalyzer
  runTest('LayoutAnalyzer: Detect severe text expansion & check font accents', () => {
    const normal = LayoutAnalyzer.analyzeExpansion('Attack', 'Atacar');
    assert.strictEqual(normal.ok, true);
    assert.strictEqual(normal.needsResize, false);

    const severe = LayoutAnalyzer.analyzeExpansion('OK', 'Definitivamente confirmado com sucesso absoluto e sem restrições');
    assert.strictEqual(severe.ok, false);
    assert.strictEqual(severe.needsResize, true);

    const fontCheck = FontCompatibilityAnalyzer.checkCoverage('Ação, Emoção, Configurações');
    assert.strictEqual(fontCheck.compatible, true);
    assert.strictEqual(fontCheck.hasAccents, true);
  });

  // Test 9: OutputProvider (PATCH, RUNTIME, OVERLAY)
  await runAsyncTest('OutputProvider: Multi-mode delivery adapter', async () => {
    const patch = await OutputProvider.deliver('PATCH', { file: 'data.json', data: '{"ok":1}' });
    assert.strictEqual(patch.delivered, true);
    assert.strictEqual(patch.mode, 'PATCH');

    const overlay = await OutputProvider.deliver('OVERLAY', { region: { x: 0, y: 0 }, translated: 'Atacar' });
    assert.strictEqual(overlay.delivered, true);
    assert.strictEqual(overlay.mode, 'OVERLAY');
  });

  // Test 10: TranslationProvider (Offline-First Dictionary)
  await runAsyncTest('TranslationProvider: Instant offline translation of common gaming lexicon', async () => {
    const provider = new TranslationProvider();
    const resStart = await provider.translate('New Game');
    assert.strictEqual(resStart.ok, true);
    assert.strictEqual(resStart.translated, 'novo jogo');
    assert.strictEqual(resStart.source, 'offline_dict');

    const resAttack = await provider.translate('Attack');
    assert.strictEqual(resAttack.translated, 'atacar');
  });

  // Test 11: PerformanceMonitor (Métricas em Tempo Real)
  runTest('PerformanceMonitor: Latency tracking and RAM throughput snapshot', () => {
    performanceMonitor.recordTranslation(12);
    performanceMonitor.recordTranslation(18);
    performanceMonitor.recordTranslation(15);

    const snap = performanceMonitor.getSnapshot();
    assert(snap.processedTexts >= 3);
    assert(snap.averageLatencyMs > 0);
    assert(snap.ramRssMb > 0);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 5B Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
