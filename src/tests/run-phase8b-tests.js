/**
 * OpenTranslator - Phase 8B Test Suite
 * Translation Core Hardening, Real Output & Schema Unification
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Phase 8B Core Modules
const TranslationPatchSchema = require('../core/translationPatchSchema');
const TranslationPatchFormat = require('../core/translationPatchFormat');
const TranslationEditorCore = require('../core/translationEditorCore');
const PatchInstaller = require('../core/patchInstaller');
const FormatAwareOutput = require('../core/formatAwareOutput');
const VisibleTextVerifier = require('../core/visibleTextVerifier');
const EvidenceModel = require('../core/evidenceModel');
const LocalDictionaryProvider = require('../core/localDictionaryProvider');
const FastTextPipeline = require('../core/fastTextPipeline');

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR PHASE 8B TEST SUITE');
  console.log('  Core Hardening, Real Output & Schema Unification');
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

  // Test 1: TranslationPatchSchema validation (valid, missing metadata, duplicate id)
  runTest('TranslationPatchSchema: Strict canonical validation and error detection', () => {
    const validPatch = {
      otPatchVersion: '3.1',
      metadata: {
        patchId: 'p_001',
        gameId: 'zelda_remake',
        targetLanguage: 'pt-BR'
      },
      entries: [
        { id: 'e1', location: 'data/System.json', original: 'Start', translation: 'Iniciar' },
        { id: 'e2', location: 'data/System.json', original: 'Options', translation: 'Opções' }
      ]
    };
    const resValid = TranslationPatchSchema.validate(validPatch);
    assert.strictEqual(resValid.valid, true);

    // Invalid version
    const resBadVer = TranslationPatchSchema.validate({ ...validPatch, otPatchVersion: '2.0' });
    assert.strictEqual(resBadVer.valid, false);
    assert(resBadVer.errors.some(e => e.includes('Versão')));

    // Missing metadata
    const resNoMeta = TranslationPatchSchema.validate({ otPatchVersion: '3.1', entries: [] });
    assert.strictEqual(resNoMeta.valid, false);

    // Duplicate ID
    const resDupId = TranslationPatchSchema.validate({
      ...validPatch,
      entries: [
        { id: 'same_id', location: 'file1.json', original: 'A', translation: 'B' },
        { id: 'same_id', location: 'file2.json', original: 'C', translation: 'D' }
      ]
    });
    assert.strictEqual(resDupId.valid, false);
    assert(resDupId.errors.some(e => e.includes('ID duplicado')));
  });

  // Test 2: Contract consistency between TranslationEditorCore, TranslationPatchFormat and PatchInstaller
  await runAsyncTest('Patch Contract Unification: Editor export -> Format -> Installer execution', async () => {
    const editor = new TranslationEditorCore([
      { id: 'str_1', original: 'Start', translation: 'Iniciar', location: 'System.json' },
      { id: 'str_2', original: 'Quit', translation: 'Sair', location: 'System.json' }
    ]);

    // 1. Export from TranslationEditorCore
    const exportedPatch = editor.exportToOtPatch({ gameId: 'UnifiedGame' });
    const schemaValidation = TranslationPatchSchema.validate(exportedPatch);
    assert.strictEqual(schemaValidation.valid, true, 'Patch exported from editor must adhere strictly to schema');

    // 2. Process through TranslationPatchFormat
    const formatPatch = TranslationPatchFormat.createPatch({ gameId: 'UnifiedGame' }, [
      { id: 'str_1', original: 'Start', translation: 'Iniciar', location: 'System.json' }
    ]);
    const formatValidation = TranslationPatchSchema.validate(formatPatch);
    assert.strictEqual(formatValidation.valid, true, 'Patch created by TranslationPatchFormat must adhere strictly to schema');

    // 3. Apply via PatchInstaller
    const stagingDir = path.resolve(__dirname, '../../data/test_contract_unify');
    if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });

    const targetFile = path.join(stagingDir, 'System.json');
    fs.writeFileSync(targetFile, JSON.stringify({ title: 'Game', startBtn: 'Start', quitBtn: 'Quit' }), 'utf8');

    const installer = new PatchInstaller();
    const applyRes = await installer.applyPatch(exportedPatch, stagingDir, { gameId: 'UnifiedGame' });
    assert.strictEqual(applyRes.success, true);
    assert(fs.readFileSync(targetFile, 'utf8').includes('Iniciar'));

    // Cleanup
    fs.rmSync(stagingDir, { recursive: true, force: true });
  });

  // Test 3: Path Traversal Security Defense
  await runAsyncTest('PatchInstaller: Path traversal attempts are strictly detected and blocked', async () => {
    const stagingDir = path.resolve(__dirname, '../../data/test_traversal_sec');
    if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });

    const installer = new PatchInstaller();

    // Directory traversal attempt
    const maliciousPatch = {
      otPatchVersion: '3.1',
      metadata: { patchId: 'hack', gameId: 'sec_test', targetLanguage: 'pt-BR' },
      entries: [
        { id: 'evil1', location: '../../evil_escape.json', original: 'A', translation: 'B' }
      ]
    };

    const applyRes = await installer.applyPatch(maliciousPatch, stagingDir);
    assert.strictEqual(applyRes.success, false);
    assert.strictEqual(applyRes.blocked, true);
    assert(applyRes.error.includes('PATH_TRAVERSAL_DETECTED'));

    // Cleanup
    fs.rmSync(stagingDir, { recursive: true, force: true });
  });

  // Test 4: FormatAwareOutput for JSON, PO and Ren'Py RPY
  runTest('FormatAwareOutput: Format-aware replacement for JSON, PO and RenPy', () => {
    // 1. JSON (Key preservation)
    const rawJson = JSON.stringify({ "key_Start": "Start", "description": "Start your journey" }, null, 2);
    const jsonRes = FormatAwareOutput.apply('data.json', rawJson, [
      { original: 'Start', translation: 'Iniciar' }
    ]);
    assert.strictEqual(jsonRes.modified, true);
    assert(jsonRes.content.includes('"key_Start": "Iniciar"')); // Value replaced
    assert(jsonRes.content.includes('"key_Start"')); // Key not corrupted!

    // 2. Gettext PO (msgid -> msgstr)
    const rawPo = 'msgid "Start Game"\nmsgstr ""\n\nmsgid "Options"\nmsgstr "Settings"';
    const poRes = FormatAwareOutput.apply('messages.po', rawPo, [
      { original: 'Start Game', translation: 'Iniciar Jogo' }
    ]);
    assert.strictEqual(poRes.modified, true);
    assert(poRes.content.includes('msgstr "Iniciar Jogo"'));

    // 3. Ren\'Py RPY (old/new block)
    const rawRpy = 'translate portuguese strings:\n    old "Options"\n    new ""';
    const rpyRes = FormatAwareOutput.apply('strings.rpy', rawRpy, [
      { original: 'Options', translation: 'Opções' }
    ]);
    assert.strictEqual(rpyRes.modified, true);
    assert(rpyRes.content.includes('new "Opções"'));
  });

  // Test 5: VisibleTextVerifier and EvidenceModel 2.0 (FILE_VERIFIED vs SCREEN_VERIFIED)
  runTest('EvidenceModel 2.0: FILE_VERIFIED does NOT grant visual status; only SCREEN_VERIFIED does', () => {
    const model = new EvidenceModel({ target: 'DialogueUI' });

    // Recording FILE_VERIFIED
    model.recordEvidence('FILE_VERIFIED', { expected: 'Olá', observed: 'Olá', verificationMethod: 'FILE_CONTENT_VERIFICATION' });
    assert.strictEqual(model.gameEvidence, true);
    assert.strictEqual(model.visualEvidence, false); // Strict separation!
    assert.strictEqual(model.getGrade(), 'LAB_TESTED');

    // Claiming VISUALLY_VERIFIED without screen evidence must fail
    const claimAudit = model.validateClaim('VISUALLY_VERIFIED');
    assert.strictEqual(claimAudit.legitimate, false);

    // Recording SCREEN_VERIFIED
    model.recordEvidence('SCREEN_VERIFIED', { expected: 'Olá', observed: 'Olá', verificationMethod: 'SCREEN_PIXEL_SAMPLING' });
    assert.strictEqual(model.visualEvidence, true);
    assert.strictEqual(model.getGrade(), 'VISUALLY_VERIFIED');
  });

  // Test 6: LocalDictionaryProvider Punctuation & Confidence Threshold
  await runAsyncTest('LocalDictionaryProvider: Punctuation preservation and fuzzy confidence threshold', async () => {
    const provider = new LocalDictionaryProvider({ fuzzyConfidenceThreshold: 0.85 });

    // Punctuation preservation
    const transExcl = await provider.translate('Start Game!');
    assert.strictEqual(transExcl, 'Iniciar jogo!');

    const transQuotes = await provider.translate('"Options"');
    assert.strictEqual(transQuotes, '"Opções"');

    // Word with low confidence (below 0.85) should NOT be translated
    // 'sw' compared to 'sword' has distance 3 out of 5 => similarity 0.40 (< 0.85)
    const rejectedFuzzy = await provider.translate('sw');
    assert.strictEqual(rejectedFuzzy, 'sw'); // Kept intact!
  });

  // Test 7: FastTextPipeline Latency Metrics (queueWait, processing, provider, output)
  await runAsyncTest('FastTextPipeline: Granular latency metrics recorded', async () => {
    const pipeline = new FastTextPipeline();
    const item = {
      text: 'Start',
      priority: 'P0',
      enqueuedAt: Date.now() - 5 // 5ms simulated wait
    };

    const res = await pipeline.processItem(item);
    assert(res.latencies);
    assert(typeof res.latencies.queueWaitMs === 'number');
    assert(typeof res.latencies.processingMs === 'number');
    assert(typeof res.latencies.providerMs === 'number');
    assert(typeof res.latencies.outputMs === 'number');
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 8B Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in Phase 8B test runner:', err);
  process.exit(1);
});
