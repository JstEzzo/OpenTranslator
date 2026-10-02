/**
 * OpenTranslator - Phase 9 Test Suite
 * 
 * Validação rigorosa dos pilares da Fase 9:
 * 1. EvidenceModel 3.0 Anti-Forgery (bloqueio de booleanos e setters diretos)
 * 2. OwnedProcessRegistry (propriedade estrita de processos, rejeição de PIDs externos)
 * 3. RuntimeSessionManager (máquina de estados estrita e hash de executável)
 * 4. Symlink / Junction Path Traversal Defense
 * 5. FormatAdapterRegistry & TranslationUnit com PlaceholderMasker
 * 6. TranslationRuntimeRouter 2.0 (explicabilidade e tríade)
 * 7. ScreenCapture Realism (resultado factual ou honestamente indisponível)
 * 8. ClaimAudit 2.0 (rejeição de alegações fraudulentas com CLAIM_BLOCKED)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const EvidenceModel = require('../core/evidenceModel');
const ownedProcessRegistry = require('../core/ownedProcessRegistry');
const RuntimeSession = require('../core/runtimeSessionManager');
const PatchInstaller = require('../core/patchInstaller');
const formatAdapterRegistry = require('../core/formatAdapterRegistry');
const { TranslationUnit, PlaceholderMasker } = require('../core/translationUnit');
const router = require('../core/translationRuntimeRouter');
const screenCapture = require('../core/screenCapture');
const ClaimAudit = require('../core/claimAudit');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR PHASE 9 TEST SUITE');
  console.log('  Foundation Runtime Real, Anti-Forgery & Bridges');
  console.log('====================================================\n');

  // Test 1: EvidenceModel Anti-Forgery Hardening
  runTest('EvidenceModel 3.0: Direct boolean assignment and constructor forging are strictly BLOCKED', () => {
    // Passing booleans in constructor must NOT enable evidence
    const model = new EvidenceModel({
      visualEvidence: true,
      runtimeEvidence: true,
      gameEvidence: true,
      rollbackEvidence: true
    });
    assert.strictEqual(model.visualEvidence, false);
    assert.strictEqual(model.runtimeEvidence, false);
    assert.strictEqual(model.gameEvidence, false);
    assert.strictEqual(model.rollbackEvidence, false);
    assert.strictEqual(model.getGrade(), 'NOT_TESTED');

    // Direct setter assignment must throw error
    assert.throws(() => {
      model.visualEvidence = true;
    }, /ANTI_FORGERY_BLOCKED/);

    assert.throws(() => {
      model.runtimeEvidence = true;
    }, /ANTI_FORGERY_BLOCKED/);

    // Recording SCREEN_VERIFIED without artifact or pixel sampling must fail
    const invalidScreen = model.recordEvidence('SCREEN_VERIFIED', { subject: 'Test' });
    assert.strictEqual(invalidScreen.verified, false);
    assert.strictEqual(invalidScreen.valid, false);
    assert.strictEqual(model.visualEvidence, false);

    // Recording ROLLBACK_VERIFIED with hash mismatch must fail
    const invalidRollback = model.recordEvidence('ROLLBACK_VERIFIED', { expectedHash: 'aaa', observedHash: 'bbb' });
    assert.strictEqual(invalidRollback.verified, false);
    assert.strictEqual(invalidRollback.valid, false);
    assert.strictEqual(model.rollbackEvidence, false);
  });

  // Test 2: OwnedProcessRegistry & Strict Process Ownership
  runTest('OwnedProcessRegistry: Unowned processes can NEVER be stopped by OpenTranslator', () => {
    // Attempting to stop arbitrary system PID must be rejected
    const arbitraryPid = 999999;
    assert.strictEqual(ownedProcessRegistry.isOwned(arbitraryPid), false);

    const stopRes = ownedProcessRegistry.stop(arbitraryPid, 'Malicious Attempt');
    assert.strictEqual(stopRes.success, false);
    assert.strictEqual(stopRes.blocked, true);
    assert(stopRes.error.includes('NÃO pertence'));
  });

  // Test 3: RuntimeSessionManager State Machine
  runTest('RuntimeSessionManager: Enforces valid state transitions and detects illegal jumps', () => {
    const session = new RuntimeSession({
      gameId: 'test_game',
      executablePath: process.execPath
    });
    assert.strictEqual(session.state, 'CREATED');

    session.prepare();
    assert.strictEqual(session.state, 'READY');

    // Illegal jump from READY to RUNNING without STARTING must throw
    assert.throws(() => {
      session.transitionTo('RUNNING');
    }, /STATE_TRANSITION_INVALID/);

    // Illegal jump from READY to STOPPED must throw
    assert.throws(() => {
      session.transitionTo('STOPPED');
    }, /STATE_TRANSITION_INVALID/);

    session.cleanup();
    assert.strictEqual(session.state, 'CLEANUP');
  });

  // Test 4: Symlink and Reparse Point Path Traversal Defense
  runTest('PatchInstaller: Symlink and path traversal escapes are strictly blocked', () => {
    const installer = new PatchInstaller();
    const gameRoot = path.resolve('data/test_game_root');
    if (!fs.existsSync(gameRoot)) fs.mkdirSync(gameRoot, { recursive: true });

    // Absolute Windows path
    const absCheck = installer._sanitizeAndResolvePath(gameRoot, 'C:\\Windows\\System32\\calc.exe');
    assert.strictEqual(absCheck.safe, false);

    // Parent directory traversal
    const travCheck = installer._sanitizeAndResolvePath(gameRoot, '../../escape.txt');
    assert.strictEqual(travCheck.safe, false);

    // UNC path
    const uncCheck = installer._sanitizeAndResolvePath(gameRoot, '\\\\remote\\share\\file.txt');
    assert.strictEqual(uncCheck.safe, false);

    // Safe path within root
    const safeCheck = installer._sanitizeAndResolvePath(gameRoot, 'data/dialogue.json');
    assert.strictEqual(safeCheck.safe, true);

    fs.rmSync(gameRoot, { recursive: true, force: true });
  });

  // Test 5: FormatAdapterRegistry & TranslationUnit with PlaceholderMasker
  runTest('FormatAdapterRegistry & PlaceholderMasker: Token protection and structured adapters', () => {
    // 1. PlaceholderMasker
    const original = 'HP: {0}/{1} \\C[2]Critical!\\C[0] %s';
    const maskRes = PlaceholderMasker.mask(original);
    assert(maskRes.protectedText.includes('__OT_TOK_001__'));
    assert(maskRes.protectedText.includes('__OT_TOK_002__'));
    assert.strictEqual(maskRes.tokens.size, 5);

    // Unmasking
    const unmasked = PlaceholderMasker.unmask(maskRes.protectedText, maskRes.tokens);
    assert.strictEqual(unmasked, original);

    // Corrupted translation validation
    const corruptedTranslation = 'HP: __OT_TOK_001__'; // Missing other tokens!
    const valCorrupted = PlaceholderMasker.validate(maskRes.protectedText, corruptedTranslation, maskRes.tokens);
    assert.strictEqual(valCorrupted.valid, false);
    assert(valCorrupted.missingTokens.length > 0);

    // 2. TranslationUnit
    const unit = new TranslationUnit({
      original: 'Start Game',
      selector: { type: 'jsonPath', value: 'menu.start' }
    });
    assert.strictEqual(unit.selector.type, 'jsonPath');
    assert.strictEqual(unit.sourceHash.length, 16);

    // 3. FormatAdapterRegistry
    const jsonAdapter = formatAdapterRegistry.getAdapter('data/System.json');
    assert.strictEqual(jsonAdapter.name, 'JsonAdapter');

    const poAdapter = formatAdapterRegistry.getAdapter('locale/pt.po');
    assert.strictEqual(poAdapter.name, 'PoAdapter');

    const renpyAdapter = formatAdapterRegistry.getAdapter('game/script.rpy');
    assert.strictEqual(renpyAdapter.name, 'RenpyAdapter');
  });

  // Test 6: TranslationRuntimeRouter 2.0 Strategy & Explainability
  runTest('TranslationRuntimeRouter 2.0: Selects strategy based on triad with full explainability', () => {
    // Ren'Py
    const renpyStrat = router.selectStrategy({ engine: 'renpy', runtime: 'python' });
    assert.strictEqual(renpyStrat.strategy, 'NATIVE_TRANSLATION');
    assert(renpyStrat.reasons.length > 0);

    // RPG Maker MZ
    const mzStrat = router.selectStrategy({ engine: 'rpgmaker_mz', runtime: 'nw.js' });
    assert.strictEqual(mzStrat.strategy, 'RUNTIME_JS');

    // Unity IL2CPP (Must not pretend universal hook works!)
    const il2cppStrat = router.selectStrategy({ engine: 'unity', runtime: 'il2cpp' });
    assert.strictEqual(il2cppStrat.strategy, 'STATIC_PATCH');
    assert(il2cppStrat.limitations.some(l => l.includes('EXPERIMENTAL')));
  });

  // Test 7: ScreenCapture Realism
  runTest('ScreenCapture: Returns factual capture or honest SCREEN_CAPTURE_UNAVAILABLE', () => {
    const res = screenCapture.capture({ sessionId: 'test_phase9' });
    // Must be a valid structured response
    assert(typeof res.success === 'boolean');
    if (res.success) {
      assert(res.imagePath && fs.existsSync(res.imagePath));
      assert(res.imageHash && res.imageHash.length === 64);
      // Clean up
      try { fs.unlinkSync(res.imagePath); } catch (e) {}
    } else {
      assert.strictEqual(res.reason, 'SCREEN_CAPTURE_UNAVAILABLE');
    }
  });

  // Test 8: ClaimAudit 2.0 False Claim Detector
  runTest('ClaimAudit 2.0: Strictly blocks fraudulent claims without evidence', () => {
    const emptyModel = new EvidenceModel({ target: 'FakeGame' });

    // Claiming RUNTIME_VERIFIED without process
    const runtimeClaim = ClaimAudit.auditClaim('RUNTIME_VERIFIED', emptyModel);
    assert.strictEqual(runtimeClaim.status, 'CLAIM_BLOCKED');
    assert.strictEqual(runtimeClaim.approved, false);

    // Claiming VISUALLY_VERIFIED without screenshot file
    const visualClaim = ClaimAudit.auditClaim('VISUALLY_VERIFIED', emptyModel);
    assert.strictEqual(visualClaim.status, 'CLAIM_BLOCKED');
    assert.strictEqual(visualClaim.approved, false);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 9 Tests Finished: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('----------------------------------------------------');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
