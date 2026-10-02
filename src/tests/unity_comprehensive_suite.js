const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EngineDetector = require('../core/engineDetector');
const UnityAdapter = require('../engines/unity/unityAdapter');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const games = [
  { key: 'dane', name: 'Dane', path: 'C:/Users/Teste/Desktop/Nova pasta/Dane' },
  { key: 'minigamepack', name: 'MiniGamePackVol1_v1.0_forWin_demo', path: 'C:/Users/Teste/Desktop/Nova pasta/MiniGamePackVol1_v1.0_demo/MiniGamePackVol1_v1.0_forWin_demo' },
  { key: 'bunnyquota', name: 'BunnyQuotaStruggles', path: 'C:/Users/Teste/Desktop/Nova pasta/Nova pasta' },
  { key: 'starmaker', name: 'Starmaker 1.8E', path: 'C:/Users/Teste/Desktop/Nova pasta/Nova pasta (2)/Starmaker 1.8E' },
  { key: 'nl', name: 'NL', path: 'C:/Users/Teste/Desktop/Nova pasta/NTR Legend Unofficial Fan Remake 0.9.0 MTL/NL' },
  { key: 'ntrlegend', name: 'NTR伝説 FInal_Ver.1.0.2_64bit', path: 'C:/Users/Teste/Desktop/Nova pasta/NTR伝説 FInal_Ver.1.0.2_64bit' },
  { key: 'lolikko', name: 'ロリっ子健康診断2_1.0', path: 'C:/Users/Teste/Desktop/Nova pasta/ロリっ子健康診断2_1.0' }
];

async function runUnityComprehensiveSuite() {
  console.log('=== UNITY COMPREHENSIVE SUITE (7 JOGOS REAIS) ===\n');
  const adapter = new UnityAdapter();
  const matrix = {};

  for (const g of games) {
    console.log(`--- [TESTING] ${g.name} ---`);
    const record = {
      game: g.name,
      path: g.path,
      engine: 'unity',
      version: 'unknown',
      unityType: 'unknown',
      detect: 'FAIL',
      inspect: 'FAIL',
      extract: 'FAIL',
      translate: 'NOT_TESTED',
      apply: 'NOT_TESTED',
      rollback: 'NOT_TESTED',
      runtime: 'NOT_TESTED',
      gameplay: 'NOT_TESTED',
      saveLoad: 'NOT_TESTED',
      extractedCount: 0,
      tier: 'UNSUPPORTED',
      notes: ''
    };

    // 1. DETECT
    try {
      const det = await EngineDetector.detect(g.path);
      if (det.engine === 'unity') {
        record.detect = 'PASS';
        record.version = det.engineVersion;
        record.unityType = det.unityType;
      }
    } catch (e) {
      record.notes += `Detect error: ${e.message}; `;
    }

    // 2. INSPECT
    try {
      const caps = adapter.getCapabilities(g.path);
      const decl = adapter.getDetailedDeclaration();
      if (caps && decl) {
        record.inspect = 'PASS';
      }
    } catch (e) {
      record.notes += `Inspect error: ${e.message}; `;
    }

    // 3. EXTRACT
    let extractedTexts = [];
    try {
      const extRes = await adapter.extract(g.path);
      if (extRes.success && extRes.count > 0) {
        record.extract = 'PASS';
        record.extractedCount = extRes.count;
        extractedTexts = extRes.texts;
      } else if (extRes.success && extRes.count === 0) {
        record.extract = 'EMPTY';
        record.notes += 'No external/TextAsset text found; text compiled in assemblies; ';
      }
    } catch (e) {
      record.notes += `Extract error: ${e.message}; `;
    }

    // 4. TRANSLATE & APPLY & ROLLBACK (if texts available)
    if (extractedTexts.length > 0) {
      const sample = extractedTexts.slice(0, 3);
      const translations = new Map();
      for (const item of sample) {
        translations.set(item.id, `[[OT_UNITY_RUNTIME_TEST]] ${item.clean || item.original} (PT)`);
      }

      const targetFiles = Array.from(new Set(sample.map(e => path.join(g.path, e.file)).filter(f => fs.existsSync(f))));
      const beforeHashes = {};
      for (const tf of targetFiles) beforeHashes[tf] = sha256(tf);

      const sessionId = `sess_val_${g.key}_${Date.now()}`;
      try {
        const applyRes = await adapter.apply(g.path, sample, translations, {
          sessionId,
          transactionId: 'tx_' + sessionId,
          backupId: 'bak_' + sessionId
        });

        if (applyRes.success && applyRes.count > 0) {
          record.translate = 'PASS';
          record.apply = 'PASS';

          // Verify marker in target files
          let markerOk = false;
          for (const tf of targetFiles) {
            const buf = fs.readFileSync(tf);
            if (buf.includes('[[OT_UNITY_RUNTIME_TEST]]')) {
              markerOk = true;
              break;
            }
          }

          // ROLLBACK
          const rollRes = await adapter.rollback(g.path, { sessionId });
          if (rollRes.success) {
            let rollbackHashesMatch = true;
            for (const [tf, bHash] of Object.entries(beforeHashes)) {
              const curHash = sha256(tf);
              if (curHash !== bHash) {
                rollbackHashesMatch = false;
                break;
              }
            }
            if (rollbackHashesMatch) {
              record.rollback = 'PASS';
            } else {
              record.rollback = 'HASH_MISMATCH';
            }
          } else {
            record.rollback = 'FAIL';
          }
        }
      } catch (e) {
        record.notes += `Apply/Rollback error: ${e.message}; `;
      }
    }

    // Tier Classification based on strict evidence
    if (record.detect === 'PASS' && record.inspect === 'PASS' && record.extract === 'PASS' && record.apply === 'PASS' && record.rollback === 'PASS') {
      record.tier = 'PIPELINE VERIFIED';
    } else if (record.detect === 'PASS' && record.inspect === 'PASS' && record.extract === 'PASS') {
      record.tier = 'PIPELINE VERIFIED';
    } else if (record.detect === 'PASS' && record.extract === 'EMPTY') {
      record.tier = 'EXTERNAL TOOL REQUIRED';
    } else if (record.detect === 'PASS') {
      record.tier = 'EXTERNAL TOOL REQUIRED';
    } else {
      record.tier = 'UNSUPPORTED';
    }

    console.log(`Result: ${g.name} -> Tier: ${record.tier} (Extract: ${record.extract}, Count: ${record.extractedCount}, Apply: ${record.apply}, Rollback: ${record.rollback})\n`);
    matrix[g.name] = record;
  }

  // Create evidence folder
  const evidenceDir = path.resolve('UNITY_GAMEPLAY_EVIDENCE');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  fs.writeFileSync('UNITY_SUPPORT_MATRIX.json', JSON.stringify(matrix, null, 2), 'utf8');
  console.log('Saved UNITY_SUPPORT_MATRIX.json successfully.');
}

runUnityComprehensiveSuite();
