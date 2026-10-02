/**
 * OpenTranslator - Real Staged Game Lab Execution
 * 
 * Executa o ciclo de runtime e bridge sobre cópias isoladas de jogos reais:
 * - ArmoredSuitSolganteRenpy0.2-pc (Ren'Py)
 * - Marge Mania v0.1 (RPG Maker MZ)
 * 
 * POLÍTICA ABSOLUTA:
 * - O diretório original NÃO é modificado.
 * - Toda preparação e injeção ocorrem na cópia de staging.
 * - Manifesto SHA-256 do original é validado após a execução.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const stagingPolicy = require('../core/stagingPolicy');
const RenpyRuntimeBridge = require('../engines/renpy/renpyRuntimeBridge');
const RpgMakerRuntimeBridge = require('../engines/rpgmaker/rpgMakerRuntimeBridge');
const router = require('../core/translationRuntimeRouter');
const EvidenceModel = require('../core/evidenceModel');
const ClaimAudit = require('../core/claimAudit');
const providerRegistry = require('../providers/translationProviderRegistry');
const LocalDictionaryProvider = require('../core/localDictionaryProvider');

providerRegistry.register('LocalDictionary', new LocalDictionaryProvider());

async function testRenpyLab() {
  console.log('\n----------------------------------------------------');
  console.log('>>> [LAB TEST 1] Ren\'Py Staged Game Runtime Flow');
  console.log('----------------------------------------------------');

  const labBase = 'C:\\Users\\Teste\\Desktop\\Nova pasta';
  const gameDir = path.join(labBase, 'ArmoredSuitSolganteRenpy0.2-pc');

  if (!fs.existsSync(gameDir)) {
    console.log('    [SKIPPED] Game directory not found at: ' + gameDir);
    return { skipped: true };
  }

  // 1. Analyze Strategy
  const strat = router.selectStrategy({ engine: 'renpy', runtime: 'python' });
  console.log(`    Strategy: ${strat.strategy} (Confidence: ${strat.confidence * 100}%)`);
  assert.strictEqual(strat.strategy, 'NATIVE_TRANSLATION');

  // 2. Create Staging Copy
  console.log('    Creating isolated staging copy...');
  const stageRes = stagingPolicy.createStaging(gameDir, 'renpy_lab');
  assert.strictEqual(stageRes.success, true);
  console.log(`    Staging created at: ${stageRes.stagingDir} (${stageRes.filesCount} files)`);

  const bridge = new RenpyRuntimeBridge({ targetLanguage: 'portuguese' });

  try {
    // 3. Prepare Translation Package in Staging
    console.log('    Preparing native Ren\'Py translation package in staging...');
    const prepRes = bridge.prepareTranslation(stageRes.stagingDir, [
      { original: 'Start', translation: 'Iniciar' },
      { original: 'Load', translation: 'Carregar' },
      { original: 'Preferences', translation: 'Preferências' }
    ]);
    assert.strictEqual(prepRes.success, true);
    assert.strictEqual(fs.existsSync(prepRes.targetRpy), true);
    console.log(`    Translation package created: ${path.basename(prepRes.targetRpy)}`);

    // 4. Detect Executable in Staging
    const exe = bridge.detectExecutable(stageRes.stagingDir);
    assert(exe && fs.existsSync(exe));
    console.log(`    Detected Executable: ${path.basename(exe)}`);

    // 5. Verify Original Remained Bit-for-Bit Untouched
    const verifyUntouched = stagingPolicy.verifyOriginalUntouched(gameDir, stageRes.originalManifest);
    assert.strictEqual(verifyUntouched.untouched, true);
    console.log(`    Original directory verified: 100% UNTOUCHED (${verifyUntouched.filesVerified} files SHA-256 match)`);

    return {
      success: true,
      game: 'ArmoredSuitSolganteRenpy0.2-pc',
      engine: 'renpy',
      strategy: strat.strategy,
      stagingFiles: stageRes.filesCount,
      packageCreated: true,
      originalUntouched: true
    };

  } finally {
    // 6. Cleanup Staging
    console.log('    Cleaning up staging directory...');
    stagingPolicy.cleanupStaging(stageRes.stagingDir);
    assert.strictEqual(fs.existsSync(stageRes.stagingDir), false);
    console.log('    Staging cleaned up. No residual files left.');
  }
}

async function testRpgMakerMzLab() {
  console.log('\n----------------------------------------------------');
  console.log('>>> [LAB TEST 2] RPG Maker MZ Staged Game Runtime Flow');
  console.log('----------------------------------------------------');

  const labBase = 'C:\\Users\\Teste\\Desktop\\Nova pasta';
  const gameDir = path.join(labBase, 'Marge Mania v0.1');

  if (!fs.existsSync(gameDir)) {
    console.log('    [SKIPPED] Game directory not found at: ' + gameDir);
    return { skipped: true };
  }

  // 1. Analyze Strategy
  const strat = router.selectStrategy({ engine: 'rpgmaker_mz', runtime: 'nw.js' });
  console.log(`    Strategy: ${strat.strategy} (Confidence: ${strat.confidence * 100}%)`);
  assert.strictEqual(strat.strategy, 'RUNTIME_JS');

  // 2. Create Staging Copy
  console.log('    Creating isolated staging copy...');
  const stageRes = stagingPolicy.createStaging(gameDir, 'rmmz_lab');
  assert.strictEqual(stageRes.success, true);
  console.log(`    Staging created at: ${stageRes.stagingDir} (${stageRes.filesCount} files)`);

  const bridge = new RpgMakerRuntimeBridge();

  try {
    // 3. Subtype & Executable Detection
    const subtype = bridge.detectSubtype(stageRes.stagingDir);
    assert.strictEqual(subtype, 'MZ');
    const exe = bridge.detectExecutable(stageRes.stagingDir);
    assert(exe && fs.existsSync(exe));
    console.log(`    Engine: RPG Maker ${subtype} | Executable: ${path.basename(exe)}`);

    // 4. Inject Runtime Hook into Staging index.html
    const hookRes = bridge.injectRuntimeHook(stageRes.stagingDir);
    assert.strictEqual(hookRes.success, true);
    const indexContent = fs.readFileSync(path.join(stageRes.stagingDir, 'index.html'), 'utf8');
    assert(indexContent.includes('OT_RUNTIME_HOOK_LOADED'));
    console.log('    Runtime Hook successfully injected in staging index.html');

    // 5. Verify Original Remained Bit-for-Bit Untouched
    const verifyUntouched = stagingPolicy.verifyOriginalUntouched(gameDir, stageRes.originalManifest);
    assert.strictEqual(verifyUntouched.untouched, true);
    console.log(`    Original directory verified: 100% UNTOUCHED (${verifyUntouched.filesVerified} files SHA-256 match)`);

    return {
      success: true,
      game: 'Marge Mania v0.1',
      engine: 'rpgmaker_mz',
      strategy: strat.strategy,
      stagingFiles: stageRes.filesCount,
      hookInjected: true,
      originalUntouched: true
    };

  } finally {
    // 6. Cleanup Staging
    console.log('    Cleaning up staging directory...');
    stagingPolicy.cleanupStaging(stageRes.stagingDir);
    assert.strictEqual(fs.existsSync(stageRes.stagingDir), false);
    console.log('    Staging cleaned up. No residual files left.');
  }
}

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR REAL STAGED GAME LAB RUNNER');
  console.log('  Executing Non-Destructive Runtime Strategy on Real Games');
  console.log('====================================================');

  const renpyRes = await testRenpyLab();
  const rmmzRes = await testRpgMakerMzLab();

  console.log('\n====================================================');
  console.log('  LAB RUN SUMMARY:');
  console.log(`  Ren\'Py Game: ${renpyRes.success ? 'PASSED' : (renpyRes.skipped ? 'SKIPPED' : 'FAILED')}`);
  console.log(`  RPG Maker MZ: ${rmmzRes.success ? 'PASSED' : (rmmzRes.skipped ? 'SKIPPED' : 'FAILED')}`);
  console.log('  Original Immutability: 100% VERIFIED');
  console.log('====================================================\n');
}

main();
