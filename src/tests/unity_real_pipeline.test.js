const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const UnityAdapter = require('../engines/unity/unityAdapter');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function testRealUnityPipeline() {
  console.log('=== TESTE REAL UNITY PIPELINE (Passo 8, 9 e 13) ===');
  const adapter = new UnityAdapter();

  // Test on real game: NL (Unity Mono)
  const gameDir = 'C:/Users/Teste/Desktop/Nova pasta/NTR Legend Unofficial Fan Remake 0.9.0 MTL/NL';
  if (!fs.existsSync(gameDir)) {
    console.error('Game not found:', gameDir);
    process.exit(1);
  }

  const sessionId = 'sess_unity_real_' + Date.now();
  const transactionId = 'tx_unity_real_' + Date.now();
  const backupId = 'bak_unity_real_' + Date.now();

  console.log('1. Extracting texts from game...');
  const extractRes = await adapter.extract(gameDir);
  console.log('   Extracted texts count:', extractRes.count, 'Success:', extractRes.success);
  if (!extractRes.success || extractRes.texts.length === 0) {
    console.error('Extraction failed!');
    process.exit(1);
  }

  // Pick 3 real entries
  const sampleEntries = extractRes.texts.slice(0, 3);
  console.log('2. Preparing translations with controlled marker [[OT_UNITY_RUNTIME_TEST]]...');
  const translations = new Map();
  const logEntries = [];

  for (const item of sampleEntries) {
    const controlledTranslation = `[[OT_UNITY_RUNTIME_TEST]] ${item.clean || item.original} (PT)`;
    translations.set(item.id, controlledTranslation);
    logEntries.push({
      id: item.id,
      file: item.file,
      asset: item.asset || item.file,
      original: item.original,
      translation: controlledTranslation
    });
  }
  console.log('   Translation map prepared:', JSON.stringify(logEntries, null, 2));

  // Capture BEFORE hashes
  const targetFiles = Array.from(new Set(sampleEntries.map(e => path.join(gameDir, e.file)).filter(f => fs.existsSync(f))));
  const beforeHashes = {};
  for (const f of targetFiles) {
    beforeHashes[f] = sha256(f);
  }
  console.log('3. BEFORE SHA-256 hashes recorded for', Object.keys(beforeHashes).length, 'files.');

  // Apply translations
  console.log('4. Applying translations with transactional backup...');
  const applyRes = await adapter.apply(gameDir, sampleEntries, translations, {
    sessionId,
    transactionId,
    backupId
  });
  console.log('   Apply result:', applyRes);
  if (!applyRes.success) {
    console.error('Apply failed:', applyRes.error);
    process.exit(1);
  }

  // Check AFTER hashes and marker presence
  let markerFound = false;
  for (const f of targetFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('[[OT_UNITY_RUNTIME_TEST]]')) {
      markerFound = true;
      console.log('   Controlled marker verified in modified file:', path.basename(f));
    }
  }

  if (!markerFound) {
    console.error('FAIL: Controlled marker was not found in modified files!');
    process.exit(1);
  }

  // Rollback
  console.log('5. Executing transactional rollback...');
  const rollbackRes = await adapter.rollback(gameDir, {
    sessionId,
    transactionId,
    backupId
  });
  console.log('   Rollback result:', rollbackRes);
  if (!rollbackRes.success) {
    console.error('Rollback failed!');
    process.exit(1);
  }

  // Verify RESTORED hashes == BEFORE hashes
  console.log('6. Verifying SHA-256 hashes: BEFORE == RESTORED...');
  let hashesMatch = true;
  for (const [f, beforeHash] of Object.entries(beforeHashes)) {
    const afterHash = sha256(f);
    if (beforeHash !== afterHash) {
      console.error(`Hash mismatch for ${path.basename(f)}! Before: ${beforeHash}, Restored: ${afterHash}`);
      hashesMatch = false;
    } else {
      console.log(`   Hash match for ${path.basename(f)}: ${afterHash.slice(0, 16)}...`);
    }
  }

  if (!hashesMatch) {
    console.error('FAIL: Rollback did not restore identical SHA-256 hashes!');
    process.exit(1);
  }

  console.log('\nPASSO 8, 9 E 13 VALIDATED: Unity extraction, controlled translation, reversible application and SHA-256 rollback are 100% verified on real game.');
}

testRealUnityPipeline();
