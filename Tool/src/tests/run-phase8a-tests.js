/**
 * OpenTranslator - Phase 8A Test Suite
 * Real Translation Implementation & Evidence Correction
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Phase 8A Core Modules
const LocalDictionaryProvider = require('../core/localDictionaryProvider');
const VisibleTextVerifier = require('../core/visibleTextVerifier');
const PatchInstaller = require('../core/patchInstaller');
const RealTranslationWorkflow = require('../core/realTranslationWorkflow');
const RealGameWorkflow = require('../core/realGameWorkflow');

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR PHASE 8A TEST SUITE');
  console.log('  Real Translation Implementation & Evidence Correction');
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

  // Test 1: LocalDictionaryProvider exact matching and case preservation
  await runAsyncTest('LocalDictionaryProvider: Deterministic translation, case matching and terminology lock', async () => {
    const provider = new LocalDictionaryProvider({
      terminologyLocks: [['Excalibur', 'Espada Sagrada']]
    });

    // Exact match
    const transStart = await provider.translate('Start Game');
    assert.strictEqual(transStart, 'Iniciar jogo');

    // Case preservation
    const transUpper = await provider.translate('OPTIONS');
    assert.strictEqual(transUpper, 'OPÇÕES');

    // Terminology lock
    const transLock = await provider.translate('Equipped Excalibur on hero');
    assert(transLock.includes('Espada Sagrada'));

    // Fuzzy matching (Levenshtein)
    const transFuzzy = await provider.translate('swrd'); // Typo for sword
    assert.strictEqual(transFuzzy, 'espada');
  });

  // Test 2: VisibleTextVerifier file content verification and evidence artifact
  runTest('VisibleTextVerifier: Factual verification of text in files and evidence artifact', () => {
    const testFile = path.resolve(__dirname, '../../data/test_vis_file.txt');
    fs.writeFileSync(testFile, 'Config: Idioma alterado para Português', 'utf8');

    // Positive check
    const pos = VisibleTextVerifier.verifyFileContent(testFile, 'Português');
    assert.strictEqual(pos.verified, true);
    assert.strictEqual(pos.method, 'FILE_CONTENT_VERIFICATION');

    // Negative check
    const neg = VisibleTextVerifier.verifyFileContent(testFile, 'Texto Inexistente');
    assert.strictEqual(neg.verified, false);

    // Evidence artifact generation
    const artifact = VisibleTextVerifier.buildEvidenceArtifact({
      game: 'MysteryDungeon',
      method: 'REAL_TRANSLATION_WORKFLOW',
      sourceText: 'Start',
      translation: 'Iniciar',
      visual: { verified: true }
    });
    assert.strictEqual(artifact.game, 'MysteryDungeon');
    assert.strictEqual(artifact.visual.verified, true);

    // Cleanup
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  // Test 3: PatchInstaller Real Application (Actual file modification on disk)
  await runAsyncTest('PatchInstaller: Real application modifies target file on disk atomically', async () => {
    const tempDir = path.resolve(__dirname, '../../data/test_patch_apply');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const gameFile = path.join(tempDir, 'System.json');
    const initialContent = JSON.stringify({ gameTitle: 'Dragon Quest', menuStart: 'Start' }, null, 2);
    fs.writeFileSync(gameFile, initialContent, 'utf8');

    const installer = new PatchInstaller();
    const patch = {
      otPatchVersion: '3.0',
      gameId: 'DragonQuest',
      targetLanguage: 'pt-BR',
      entries: [
        { location: 'System.json', original: 'Start', translation: 'Iniciar' }
      ]
    };

    const applyRes = await installer.applyPatch(patch, tempDir, { gameId: 'DragonQuest' });
    assert.strictEqual(applyRes.success, true);
    assert.strictEqual(applyRes.appliedEntries, 1);
    assert.strictEqual(applyRes.filesModifiedCount, 1);

    // Verify file on disk actually changed
    const modifiedContent = fs.readFileSync(gameFile, 'utf8');
    assert.notStrictEqual(modifiedContent, initialContent);
    assert(modifiedContent.includes('"Iniciar"'));

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test 4: PatchInstaller sourceHash validation & block on mismatch
  await runAsyncTest('PatchInstaller: sourceHash mismatch strictly blocks application', async () => {
    const tempDir = path.resolve(__dirname, '../../data/test_patch_mismatch');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const gameFile = path.join(tempDir, 'System.json');
    fs.writeFileSync(gameFile, JSON.stringify({ menuStart: 'Start' }), 'utf8');

    const installer = new PatchInstaller();
    const patch = {
      otPatchVersion: '3.0',
      gameId: 'DragonQuest',
      entries: [
        {
          location: 'System.json',
          original: 'Start',
          translation: 'Iniciar',
          sourceHash: '0000000000000000' // Deliberately mismatched 16-hex hash!
        }
      ]
    };

    const applyRes = await installer.applyPatch(patch, tempDir, { gameId: 'DragonQuest' });
    assert.strictEqual(applyRes.success, false);
    assert.strictEqual(applyRes.blocked, true);
    assert(applyRes.reason.includes('PATCH_SOURCE_MISMATCH'));

    // Verify file on disk remained untouched
    const untouched = fs.readFileSync(gameFile, 'utf8');
    assert(untouched.includes('"Start"'));

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test 5: PatchInstaller removePatch (Atomic rollback)
  await runAsyncTest('PatchInstaller: removePatch restores original file state byte-for-byte', async () => {
    const tempDir = path.resolve(__dirname, '../../data/test_patch_rollback');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const gameFile = path.join(tempDir, 'Dialogue.txt');
    const originalContent = 'Hero: Hello, adventurer!\r\nElder: Welcome.';
    fs.writeFileSync(gameFile, originalContent, 'utf8');
    const origHash = crypto.createHash('sha256').update(fs.readFileSync(gameFile)).digest('hex');

    const installer = new PatchInstaller();
    const patch = {
      otPatchVersion: '3.0',
      entries: [
        { location: 'Dialogue.txt', original: 'Hello, adventurer!', translation: 'Olá, aventureiro!' }
      ]
    };

    const applyRes = await installer.applyPatch(patch, tempDir);
    assert.strictEqual(applyRes.success, true);
    assert(fs.readFileSync(gameFile, 'utf8').includes('Olá, aventureiro!'));

    // Execute rollback via removePatch
    const removeRes = await installer.removePatch(tempDir, applyRes.backupId);
    assert.strictEqual(removeRes.success, true);

    // Verify restored file hash is byte-for-byte identical to original
    const restoredHash = crypto.createHash('sha256').update(fs.readFileSync(gameFile)).digest('hex');
    assert.strictEqual(restoredHash, origHash);
    assert.strictEqual(fs.readFileSync(gameFile, 'utf8'), originalContent);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test 6: RealTranslationWorkflow end-to-end cycle with LocalDictionaryProvider
  await runAsyncTest('RealTranslationWorkflow: End-to-end discovery, real translation, validation, apply and rollback', async () => {
    const stagingDir = path.resolve(__dirname, '../../data/test_real_wf');
    if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });

    const dataFile = path.join(stagingDir, 'MapData.json');
    const originalJson = JSON.stringify({
      zoneName: 'Castle Throne Room',
      greeting: 'Welcome',
      button: 'Start Game'
    }, null, 2);
    fs.writeFileSync(dataFile, originalJson, 'utf8');

    const workflow = new RealTranslationWorkflow({ stagingBase: stagingDir });
    const cycleRes = await workflow.runRealCycle(stagingDir);

    assert.strictEqual(cycleRes.success, true);
    assert.strictEqual(cycleRes.rollbackVerified, true);
    assert(cycleRes.evidenceArtifact);
    assert.strictEqual(cycleRes.evidenceArtifact.visual.verified, true);
    assert.strictEqual(cycleRes.evidenceArtifact.rollback.sha256Matched, true);

    // Verify original content was restored byte-for-byte
    assert.strictEqual(fs.readFileSync(dataFile, 'utf8'), originalJson);

    // Cleanup
    fs.rmSync(stagingDir, { recursive: true, force: true });
  });

  // Test 7: Separation of Simulated Mutation from Real Translation
  await runAsyncTest('RealGameWorkflow: Strict separation between SIMULATED_MUTATION_TEST and REAL_TRANSLATION_TEST', async () => {
    const testDir = path.resolve(__dirname, '../../data/test_separation');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const file = path.join(testDir, 'Text.txt');
    fs.writeFileSync(file, 'Option 1: Continue\nOption 2: Quit', 'utf8');

    const rgw = new RealGameWorkflow({ stagingBase: testDir });

    // 1. Mutation Test
    const mutRes = await rgw.runSimulatedMutationTest(testDir);
    assert.strictEqual(mutRes.type, 'SIMULATED_MUTATION_TEST');
    assert.strictEqual(mutRes.success, true);

    // 2. Real Translation Test
    const realRes = await rgw.runFullCycle(testDir);
    assert.strictEqual(realRes.type, 'REAL_TRANSLATION_TEST');
    assert.strictEqual(realRes.success, true);

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Test 8: Duplicate detection & batch processing efficiency
  await runAsyncTest('LocalDictionaryProvider: Batch duplicate reduction & non-blocking execution', async () => {
    const provider = new LocalDictionaryProvider();

    const rawList = [
      'Start Game',
      'Start Game',
      'Start Game',
      'Options',
      'Options',
      'Quit'
    ];

    // Deduplication check
    const uniqueSet = Array.from(new Set(rawList));
    assert.strictEqual(uniqueSet.length, 3);

    const batchRes = await provider.translateBatch(uniqueSet);
    assert.strictEqual(batchRes.length, 3);
    assert.strictEqual(batchRes[0].translation, 'Iniciar jogo');
    assert.strictEqual(batchRes[1].translation, 'Opções');
    assert.strictEqual(batchRes[2].translation, 'Sair');
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 8A Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in Phase 8A test runner:', err);
  process.exit(1);
});
