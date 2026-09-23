/**
 * OpenTranslator - Phase 7 Test Suite
 * Real-World Translation, Product Hardening, UX & Compatibility
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Phase 7 Modules
const EvidenceModel = require('../core/evidenceModel');
const RealGameWorkflow = require('../core/realGameWorkflow');
const RenpyWorkflow = require('../engines/renpy/renpyWorkflow');
const UnityFrameworkMatrix = require('../engines/unity/unityFrameworkMatrix');
const UnrealLocalizationWorkflow = require('../engines/unreal/unrealLocalizationWorkflow');
const UnknownGameTriage = require('../discovery/unknownGameTriage');
const { TextProvenance2, TextFingerprint } = require('../core/textProvenance2');
const { TranslationSession, GameProfile } = require('../core/translationSession');
const PatchInstaller = require('../core/patchInstaller');
const TranslationEditorCore = require('../core/translationEditorCore');
const { QueueStarvationManager } = require('../core/queueStarvationManager');
const { BoundedLRUCache } = require('../core/cachePolicy');

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR PHASE 7 TEST SUITE');
  console.log('  Real-World Translation & Product Hardening');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name, testFn) {
    try {
      testFn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function runAsyncTest(name, testFn) {
    try {
      await testFn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // Test 1: EvidenceModel classification & anti-fabrication
  runTest('EvidenceModel: Multi-dimensional evidence grading and strict verification', () => {
    const evidence = new EvidenceModel({
      method: 'METHOD_B_HOOK_RUNTIME',
      engine: 'unity',
      target: 'TextMeshPro'
    });
    evidence.recordEvidence('CODE', { subject: 'Unit' });
    evidence.recordEvidence('INTEGRATION', { subject: 'Inter' });
    evidence.recordEvidence('FILE_VERIFIED', { subject: 'TextMeshPro', expected: 'A', observed: 'A' });
    evidence.recordEvidence('RUNTIME_VERIFIED', { subject: 'Hook', expected: 'A', observed: 'A', processId: 100 });
    evidence.recordEvidence('ROLLBACK_VERIFIED', { subject: 'Bk', expectedHash: 'abc', observedHash: 'abc' });

    assert.strictEqual(evidence.getGrade(), 'RUNTIME_VERIFIED');

    // Claiming VISUALLY_VERIFIED without visualEvidence must be rejected
    const auditResult = evidence.validateClaim('VISUALLY_VERIFIED');
    assert.strictEqual(auditResult.legitimate, false);
    assert(auditResult.missingEvidence.some(m => m.includes('visualEvidence')));

    // Legitimate runtime claim passes
    const runtimeClaim = evidence.validateClaim('RUNTIME_VERIFIED');
    assert.strictEqual(runtimeClaim.legitimate, true);

    // After actual visual observation is recorded
    evidence.recordEvidence('SCREEN_VERIFIED', { subject: 'Screen', expected: 'A', observed: 'A', artifactPath: 'screen.png', artifactHash: '123' });
    assert.strictEqual(evidence.getGrade(), 'VISUALLY_VERIFIED');
    assert.strictEqual(evidence.validateClaim('VISUALLY_VERIFIED').legitimate, true);
  });

  // Test 2: RealGameWorkflow non-destructive staging and rollback
  await runAsyncTest('RealGameWorkflow: Safe staging, backup, simulated apply and rollback', async () => {
    const stagingBase = path.resolve(__dirname, '../../data/test_staging_env');
    if (!fs.existsSync(stagingBase)) fs.mkdirSync(stagingBase, { recursive: true });

    const gameSubDir = path.join(stagingBase, 'game_unit_test');
    if (!fs.existsSync(gameSubDir)) fs.mkdirSync(gameSubDir, { recursive: true });

    const gameFile = path.join(gameSubDir, 'Map001.json');
    const originalContent = JSON.stringify({ title: 'Castle Throne Room', events: [1, 2, 3] }, null, 2);
    fs.writeFileSync(gameFile, originalContent, 'utf8');

    const workflow = new RealGameWorkflow({ stagingBase });
    const fullCycleResult = await workflow.runFullCycle(gameSubDir);

    assert.strictEqual(fullCycleResult.success, true);
    assert.strictEqual(fullCycleResult.rollbackVerified, true);
    assert.strictEqual(fs.readFileSync(gameFile, 'utf8'), originalContent);

    // Cleanup
    fs.rmSync(stagingBase, { recursive: true, force: true });
  });

  // Test 3: Ren'Py official translation workflow & runtime discovery
  runTest('RenpyWorkflow: Canonical tl directory, RENPY_LANGUAGE and RENPY_UPDATE_STRINGS', () => {
    const tempGameDir = path.resolve(__dirname, '../../data/test_renpy_wf');
    const renpy = new RenpyWorkflow(tempGameDir, 'portuguese');

    // Environment for runtime discovery
    const env = renpy.getLaunchEnvironment();
    assert.strictEqual(env.RENPY_LANGUAGE, 'portuguese');
    assert.strictEqual(env.RENPY_UPDATE_STRINGS, '1');

    // Canonical translation setup
    const initRes = renpy.initializeNativeTranslation({
      initialStrings: [{ original: 'Start Game', translation: 'Começar Jogo' }]
    });
    assert.strictEqual(initRes.success, true);
    assert(fs.existsSync(path.join(tempGameDir, 'game', 'tl', 'portuguese', '00_opentranslator_styles.rpy')));
    assert(fs.existsSync(path.join(tempGameDir, 'game', 'tl', 'portuguese', 'strings.rpy')));

    const discovered = renpy.syncDiscoveredStrings();
    assert(Array.isArray(discovered));

    // Cleanup
    fs.rmSync(tempGameDir, { recursive: true, force: true });
  });

  // Test 4: Unity Framework Matrix & strict IL2CPP isolation
  runTest('UnityFrameworkMatrix: Multi-framework capability matrix & Mono/IL2CPP separation', () => {
    // Evaluation with simulated Mono modules
    const monoResult = UnityFrameworkMatrix.evaluate(null, ['UnityEngine.UI.dll', 'Unity.TextMeshPro.dll']);
    assert.strictEqual(monoResult.frameworks.length >= 2, true);
    assert.strictEqual(monoResult.frameworks[0].id, 'TextMeshPro');
    assert.strictEqual(monoResult.frameworks[0].capabilities.fontFallback, true);

    // Evaluation with simulated Unity Localization package
    const locResult = UnityFrameworkMatrix.evaluate(null, ['Unity.Localization.dll', 'UnityEngine.UI.dll']);
    assert.strictEqual(locResult.frameworks[0].id, 'UnityLocalization');
    assert.strictEqual(locResult.frameworks[0].capabilities.isNativeTable, true);
  });

  // Test 5: Unreal Localization Workflow (Source PO vs Compiled LocRes)
  runTest('UnrealLocalizationWorkflow: Source to LocRes compilation and decompilation', () => {
    const tempLocres = path.resolve(__dirname, '../../data/test_output.locres');

    const sourceData = {
      'GameUI': {
        'BTN_PLAY': 'Iniciar Aventura',
        'BTN_QUIT': 'Sair do Jogo'
      }
    };

    // 1. Compile Source to LocRes
    const compileResult = UnrealLocalizationWorkflow.compileSourceToLocRes(sourceData, tempLocres);
    assert.strictEqual(compileResult.success, true);
    assert.strictEqual(compileResult.stage, 'COMPILED_DATA');
    assert.strictEqual(compileResult.stringCount, 2);
    assert(fs.existsSync(tempLocres));

    // 2. Decompile LocRes back to Source
    const decompileResult = UnrealLocalizationWorkflow.decompileLocResToSource(tempLocres);
    assert.strictEqual(decompileResult.success, true);
    assert.strictEqual(decompileResult.stage, 'SOURCE_DATA');
    assert.strictEqual(decompileResult.namespaces['GameUI']['BTN_PLAY'].value, 'Iniciar Aventura');

    // Cleanup
    if (fs.existsSync(tempLocres)) fs.unlinkSync(tempLocres);
  });

  // Test 6: Unknown Game Triage & Forensic Scan
  await runAsyncTest('UnknownGameTriage: Forensic scan, triage report and safe strategy selection', async () => {
    const tempDir = path.resolve(__dirname, '../../data/test_unknown_game');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const triageReport = await UnknownGameTriage.triage(tempDir);
    assert.strictEqual(triageReport.status, 'UNKNOWN_CUSTOM_ENGINE');
    assert(triageReport.whyUnknown.length > 0);
    assert(triageReport.whatWasNotFound.length > 0);
    assert.strictEqual(triageReport.nextSafeStrategy, 'METHOD_F_OVERLAY');
    assert.strictEqual(triageReport.isNonDestructive, true);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test 7: Text Provenance 2.0 & Fingerprinting
  runTest('TextProvenance2: 6-stage provenance graph & multi-hash fingerprint', () => {
    const completeProvenance = new TextProvenance2({
      file: 'data/Map001.json',
      resource: 'event_04',
      parser: 'RpgMakerMVParser',
      runtimeObject: 'Game_Message',
      uiComponent: 'Window_Message',
      screen: 'TitleScene'
    });

    const chain = completeProvenance.evaluateChain();
    assert.strictEqual(chain.complete, true);
    assert.strictEqual(chain.unbrokenDepth, 6);
    assert.strictEqual(chain.brokenAt, null);

    const brokenProvenance = new TextProvenance2({
      file: 'data/Map001.json',
      resource: 'event_04',
      parser: null // Broken chain!
    });
    const brokenChain = brokenProvenance.evaluateChain();
    assert.strictEqual(brokenChain.complete, false);
    assert.strictEqual(brokenChain.brokenAt, 'PARSER');

    const fp = TextFingerprint.create({
      text: 'Welcome, brave adventurer!',
      context: 'intro_cutscene',
      game: 'FantasyQuest_v1',
      component: 'Window_Message'
    });
    assert(fp.sourceHash);
    assert(fp.normalizedHash);
    assert(fp.contextHash);
    assert(fp.gameHash);
  });

  // Test 8: Translation Session & GameProfile with Version Drift
  runTest('TranslationSession & GameProfile: State persistence and version drift', () => {
    const sessionDir = path.resolve(__dirname, '../../data/test_sessions');
    const sessionManager = new TranslationSession({ sessionsDir: sessionDir });

    const sessionData = {
      gameId: 'FantasyGame',
      gameHash: 'abc123hash',
      version: '1.0.0',
      translations: { 'msg_01': { original: 'Hello', translation: 'Olá' } }
    };

    const saveResult = sessionManager.saveSession(sessionData);
    assert.strictEqual(saveResult.success, true);

    const reloaded = sessionManager.loadSession('abc123hash');
    assert.strictEqual(reloaded.translations['msg_01'].translation, 'Olá');

    // GameProfile version drift
    const profile = new GameProfile({
      gameId: 'FantasyGame',
      gameHash: 'abc123hash',
      version: '1.0.0'
    });

    const drift = profile.checkVersionDrift('1.1.0', 'def456newhash');
    assert.strictEqual(drift.hasDrift, true);
    assert.strictEqual(drift.action, 'MIGRATE_AND_REVALIDATE');

    // Cleanup
    fs.rmSync(sessionDir, { recursive: true, force: true });
  });

  // Test 9: Patch Installer with Pre-flight and Version Blocking
  runTest('PatchInstaller: Pre-flight compatibility, version blocking, and preview', () => {
    const installer = new PatchInstaller();

    const patch = {
      otPatchVersion: '3.0',
      gameId: 'SuperRPG',
      gameVersion: '1.0.0',
      targetLanguage: 'pt-BR',
      entries: [
        { original: 'Start', translation: 'Iniciar', location: 'data/System.json' }
      ]
    };

    // Incompatible version must be strictly blocked
    const incompatibleCheck = installer.verifyCompatibility(patch, {
      gameId: 'SuperRPG',
      gameVersion: '1.1.0'
    });
    assert.strictEqual(incompatibleCheck.blocked, true);
    assert(incompatibleCheck.reason.includes('PATCH BUILT FOR DIFFERENT GAME VERSION'));

    // Compatible version passes
    const compatibleCheck = installer.verifyCompatibility(patch, {
      gameId: 'SuperRPG',
      gameVersion: '1.0.0'
    });
    assert.strictEqual(compatibleCheck.blocked, false);

    // Preview
    const preview = installer.preview(patch, '/mock/game');
    assert.strictEqual(preview.success, true);
    assert.strictEqual(preview.totalTranslations, 1);
  });

  // Test 10: Translation Editor Core & Quality Gate
  runTest('TranslationEditorCore: Virtualized pagination, search, bulk ops and quality rules', () => {
    const rows = [
      { id: '1', original: 'HP: {0}/{1}', translation: 'PV: {0}/{1}', context: 'battle', status: 'VERIFIED', scene: 'Battle' },
      { id: '2', original: 'Item: \\I[5] Potion', translation: 'Item: \\I[5] Poção', context: 'menu', status: 'VERIFIED', scene: 'Menu' },
      { id: '3', original: 'Score: %d points', translation: '', context: 'hud', status: 'UNTRANSLATED', scene: 'HUD' }
    ];

    const editor = new TranslationEditorCore(rows);

    // Search
    const searchResults = editor.query({ search: 'Poção' });
    assert.strictEqual(searchResults.length, 1);
    assert.strictEqual(searchResults[0].id, '2');

    // Quality gate validation for placeholders
    const valGood = TranslationEditorCore.validateEntry('HP: {0}/{1}', 'PV: {0}/{1}');
    assert.strictEqual(valGood.valid, true);

    const valBad = TranslationEditorCore.validateEntry('HP: {0}/{1}', 'PV: {0}'); // Missing {1}
    assert.strictEqual(valBad.valid, false);

    // Bulk replace with preview
    const preview = editor.previewBulkReplace('PV:', 'Pontos de Vida:');
    assert.strictEqual(preview.affectedCount, 1);
    assert.strictEqual(preview.preview[0].newTranslation, 'Pontos de Vida: {0}/{1}');

    // Apply bulk replace
    const applyRes = editor.applyBulkReplace('PV:', 'Pontos de Vida:');
    assert.strictEqual(applyRes.success, true);
    assert.strictEqual(applyRes.updatedCount, 1);
  });

  // Test 11: Queue Starvation Manager (Aging P5 -> P4 -> P3)
  runTest('QueueStarvationManager: Priority aging promotes starved tasks', () => {
    const qsm = new QueueStarvationManager({ starvationThresholdMs: 100 });

    const queues = {
      P3: [],
      P4: [],
      P5: [
        { id: 'task_p5_aged', enqueuedAt: Date.now() - 200 } // Aged 200ms (> 100ms)
      ]
    };

    const promo1 = qsm.promoteAgedTasks(queues);
    assert.strictEqual(promo1.promotedCount, 1);
    assert.strictEqual(queues.P5.length, 0);
    assert.strictEqual(queues.P4.length, 1);
    assert.strictEqual(queues.P4[0].priority, 'P4');
  });

  // Test 12: Bounded LRU Cache Policy
  runTest('BoundedLRUCache: LRU eviction, capacity limit, and TTL expiration', () => {
    const cache = new BoundedLRUCache({ maxEntries: 3, defaultTTL: 200 });

    cache.set('k1', 'val1');
    cache.set('k2', 'val2');
    cache.set('k3', 'val3');

    // Access k1 to make it most recently used
    assert.strictEqual(cache.get('k1'), 'val1');

    // Adding k4 should evict k2 (the oldest unaccessed)
    cache.set('k4', 'val4');
    assert.strictEqual(cache.get('k2'), null); // Evicted!
    assert.strictEqual(cache.get('k1'), 'val1'); // Preserved!
    assert.strictEqual(cache.get('k3'), 'val3'); // Preserved!
    assert.strictEqual(cache.get('k4'), 'val4'); // Preserved!

    const stats = cache.getStats();
    assert.strictEqual(stats.evictions, 1);
    assert.strictEqual(stats.entries, 3);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 7 Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in Phase 7 test runner:', err);
  process.exit(1);
});
