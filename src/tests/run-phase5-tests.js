const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Phase 5 Modules
const UniversalDiscoveryEngine = require('../discovery/universalDiscoveryEngine');
const TextProvenanceGraph = require('../discovery/textProvenanceGraph');
const GameCompatibilityPassport = require('../discovery/gameCompatibilityPassport');
const DiscoveryExperimentEngine = require('../discovery/discoveryExperimentEngine');
const PlaceholderValidator = require('../core/placeholderIntegrityValidator');
const TextCaptureQuality = require('../core/textCaptureQuality');
const ApplyGate = require('../core/applyGate');
const { ErrorTimeline, LogParsers } = require('../diagnostics/logParsers');
const universalOverlay = require('../runtime/universalOverlay');

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
  console.log('   OPENTRANSLATOR — PHASE 5 TEST SUITE');
  console.log('   UNIVERSAL GAME UNDERSTANDING & AUTONOMOUS DISCOVERY');
  console.log('====================================================\n');

  // Test 1: Multi-hypothesis detection & contradictions
  await runAsyncTest('UniversalDiscoveryEngine: Multi-hypothesis detection & contradiction penalty', async () => {
    const discovery = new UniversalDiscoveryEngine();
    
    // Create a mock game directory with conflicting files
    const mockDir = path.join(__dirname, 'mock_conflicting_game');
    fs.mkdirSync(mockDir, { recursive: true });
    // Positive Unity evidence:
    fs.writeFileSync(path.join(mockDir, 'UnityPlayer.dll'), 'mock');
    fs.writeFileSync(path.join(mockDir, 'globalgamemanagers'), 'mock');
    // Contradiction: Ren'Py script present
    fs.writeFileSync(path.join(mockDir, 'options.rpy'), 'mock');

    try {
      const res = await discovery.discover(mockDir);
      assert.strictEqual(res.ok, true);
      assert(res.report.engineCandidates.length > 0, 'Candidates generated');
      
      const unityCand = res.report.engineCandidates.find(c => c.engineId === 'unity');
      assert(unityCand !== undefined, 'Unity candidate present');
      assert(unityCand.contradictions.length > 0, 'Contradiction was detected');
    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });

  // Test 2: Unknown Engine Profile
  await runAsyncTest('UniversalDiscoveryEngine: Generates UnknownEngineProfile for unidentified games', async () => {
    const discovery = new UniversalDiscoveryEngine();
    const mockDir = path.join(__dirname, 'mock_unknown_game');
    fs.mkdirSync(mockDir, { recursive: true });
    fs.writeFileSync(path.join(mockDir, 'CustomEngine.exe'), 'MZ' + '0'.repeat(100));
    fs.writeFileSync(path.join(mockDir, 'data.custom'), 'bin');

    try {
      const res = await discovery.discover(mockDir);
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.report.isUnknownEngine, true);
      assert.strictEqual(res.report.primaryEngine, 'Unknown Custom Engine');
      assert(res.report.unknownProfile !== null);
      assert(res.report.unknownProfile.availableFallbacks.includes('Screen OCR Adaptativo'));
    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });

  // Test 3: Text Provenance Graph
  runTest('TextProvenanceGraph: Build node-edge relationships & provenance correlation', () => {
    const graph = new TextProvenanceGraph();
    const entry = graph.recordProvenance('Hello Traveler!', {
      sourceFile: 'data/dialogue.json',
      sourceOffset: 104,
      parser: 'json',
      uiComponent: 'Window_Message',
      screenObserved: true,
      ocrMatch: false,
      confidence: 0.94
    });

    assert.strictEqual(entry.text, 'Hello Traveler!');
    assert.strictEqual(entry.source, 'data/dialogue.json');
    assert.strictEqual(entry.uiObject, 'Window_Message');

    const summary = graph.getSummary();
    assert.strictEqual(summary.stringNodes, 1);
    assert(summary.totalEdges >= 3);

    // Test correlation
    const corr = graph.correlate('Hello Traveler!', [{ text: 'Hello Traveler!', file: 'data/dialogue.json', parser: 'json' }]);
    assert.strictEqual(corr.matched, true);
    assert.strictEqual(corr.sourceFile, 'data/dialogue.json');
  });

  // Test 4: Game Compatibility Passport & Stable Identity
  runTest('GameCompatibilityPassport: Generate stable game identity and passport', () => {
    const identity = GameCompatibilityPassport.generateIdentity(__dirname);
    assert(identity !== null);
    assert(identity.gameId.length > 0);

    const mockReport = {
      primaryEngine: "Ren'Py",
      engineCandidates: [{ engine: "Ren'Py", confidence: 0.95 }],
      isUnknownEngine: false,
      detectedRuntimes: ['Python Virtual Machine'],
      detectedRenderers: ['OpenGL'],
      detectedPackaging: ["Ren'Py Archive"],
      detectedTextSystems: ["Ren'Py Text Displayable"]
    };

    const passport = GameCompatibilityPassport.createPassport(mockReport, identity, [
      { id: 'native_tl', name: 'Tradução Nativa .rpy', status: 'READY', confidence: 0.95 }
    ]);

    assert.strictEqual(passport.engine.primary, "Ren'Py");
    assert.strictEqual(passport.readiness, 'READY');
  });

  // Test 5: Discovery Experiment Engine & Failure Budget
  await runAsyncTest('DiscoveryExperimentEngine: Run sandbox experiments and enforce failure budget', async () => {
    const engine = new DiscoveryExperimentEngine();
    
    // Attempt successful experiment
    const exp1 = await engine.runSafeExperiment('DOM_RUNTIME_MOCK');
    assert.strictEqual(exp1.ok, true);
    assert.strictEqual(exp1.experiment.result, 'SUCCESS');

    // Attempt failing experiment repeatedly until budget exhausted
    await engine.runSafeExperiment('STATIC_PARSE_PROBE', { valid: false });
    await engine.runSafeExperiment('STATIC_PARSE_PROBE', { valid: false });
    await engine.runSafeExperiment('STATIC_PARSE_PROBE', { valid: false });
    
    const expExhausted = await engine.runSafeExperiment('STATIC_PARSE_PROBE', { valid: false });
    assert.strictEqual(expExhausted.ok, false);
    assert.strictEqual(expExhausted.exhausted, true);
  });

  // Test 6: Placeholder & Tag Integrity Validator (CodeProtector 3.0)
  runTest('PlaceholderValidator: Detect preserved and corrupted format tokens', () => {
    const orig = 'Hello {player}, you have %d gold! <color=red>Watch out!</color>';
    const goodTrans = 'Olá {player}, você tem %d ouro! <color=red>Cuidado!</color>';
    const badTrans = 'Olá jogador, você tem 10 ouro! Cuidado!';

    const goodRes = PlaceholderValidator.validate(orig, goodTrans);
    assert.strictEqual(goodRes.valid, true);

    const badRes = PlaceholderValidator.validate(orig, badTrans);
    assert.strictEqual(badRes.valid, false);
    assert(badRes.missingTokens.includes('{player}'));
    assert(badRes.missingTokens.includes('%d'));
  });

  // Test 7: Text Capture Quality (Filter Non-Translatables)
  runTest('TextCaptureQuality: Distinguish human dialogue from system tokens and debug info', () => {
    assert.strictEqual(TextCaptureQuality.isTranslatable('Are you ready to begin your journey?'), true);
    assert.strictEqual(TextCaptureQuality.isTranslatable('60 FPS'), false);
    assert.strictEqual(TextCaptureQuality.isTranslatable('1920x1080'), false);
    assert.strictEqual(TextCaptureQuality.isTranslatable('http://example.com/api'), false);
    assert.strictEqual(TextCaptureQuality.isTranslatable('4a9f3b2c1d0e5a8f9c2d1b0a'), false);
    assert.strictEqual(TextCaptureQuality.isTranslatable('GLOBAL_VAR_FLAG'), false);
  });

  // Test 8: Apply Gate 2.0 & Automated Rollback Decision
  runTest('ApplyGate: Pre-apply safety checks and post-apply rollback trigger', async () => {
    // Pre-apply blocked when backup is missing
    const preBlocked = ApplyGate.verifyPreApply({
      backupVerified: false,
      stagingCopyValid: true,
      writePermissionGranted: true,
      strategyValidated: true
    });
    assert.strictEqual(preBlocked.allowed, false);
    assert(preBlocked.failedChecks.includes('backupVerified'));

    // Pre-apply allowed when all invariants met
    const preAllowed = ApplyGate.verifyPreApply({
      backupVerified: true,
      stagingCopyValid: true,
      writePermissionGranted: true,
      strategyValidated: true,
      rollbackAvailable: true
    });
    assert.strictEqual(preAllowed.allowed, true);

    // Post-apply triggers rollback if game crashes
    const postCrash = await ApplyGate.verifyPostApply(__filename, { gameCrashed: true });
    assert.strictEqual(postCrash.ok, false);
    assert.strictEqual(postCrash.shouldRollback, true);
  });

  // Test 9: LogParsers & ErrorTimeline
  runTest('LogParsers & ErrorTimeline: Reconstruct causal timeline and parse logs', () => {
    const timeline = new ErrorTimeline();
    timeline.record('GAME_LAUNCH', { pid: 1234 });
    timeline.record('RUNTIME_INIT', { runtime: 'V8' });
    timeline.record('ERROR_CAUGHT', { error: 'SyntaxError' });

    const events = timeline.getTimeline();
    assert.strictEqual(events.length, 3);
    assert(events[0].marker.startsWith('T+'));

    const unityLog = 'Initialize engine version: 2022.1.0f1\nNullReferenceException: Target not set';
    const parsed = LogParsers.parseUnityLog(unityLog);
    assert.strictEqual(parsed.version, '2022.1.0f1');
    assert.strictEqual(parsed.errors.length, 1);
  });

  // Test 10: Universal Overlay Session
  runTest('UniversalOverlay: Manage non-invasive overlay session and text regions', () => {
    const session = universalOverlay.createSession('Test Game Window');
    assert(session.id.startsWith('ovl_'));

    const reg = universalOverlay.addTextRegion(session.id, {
      x: 100,
      y: 200,
      width: 400,
      height: 60,
      original: 'Attack',
      translated: 'Atacar'
    });

    assert.strictEqual(reg.ok, true);
    assert.strictEqual(session.regions.length, 1);

    const closed = universalOverlay.closeSession(session.id);
    assert.strictEqual(closed.ok, true);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 5 Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
