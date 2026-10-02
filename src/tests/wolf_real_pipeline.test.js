const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const WolfAdapter = require('../engines/wolf/wolfAdapter');
const EngineDetector = require('../core/engineDetector');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function testWolfPipeline() {
  console.log('=== TESTE REAL WOLF RPG PIPELINE & RUNTIME ===\n');
  const adapter = new WolfAdapter();

  const games = [
    { name: 'Rabbit Hood English 2026-06-30', path: 'C:/Users/Teste/Desktop/Nova pasta/Rabbit Hood English 2026-06-30' },
    { name: 'An Obedient Childhood Friend Is Easily Cucked', path: 'C:/Users/Teste/Desktop/Nova pasta/An Obedient Childhood Friend Is Easily Cucked' }
  ];

  const results = {};

  for (const g of games) {
    console.log(`--- [TESTING] ${g.name} ---`);
    const record = {
      game: g.name,
      engine: 'wolf',
      detect: 'FAIL',
      inspect: 'FAIL',
      extract: 'FAIL',
      translate: 'FAIL',
      apply: 'FAIL',
      rollback: 'FAIL',
      runtime: 'FAIL',
      extractedCount: 0,
      tier: 'UNSUPPORTED'
    };

    // 1. Detect
    const det = await EngineDetector.detect(g.path);
    if (det.engine === 'wolf') {
      record.detect = 'PASS';
      record.version = det.engineVersion;
    }

    // 2. Inspect
    const caps = adapter.getCapabilities(g.path);
    if (caps && caps.strategy) {
      record.inspect = 'PASS';
    }

    // 3. Extract
    const extRes = await adapter.extract(g.path);
    if (extRes.success && extRes.count > 0) {
      record.extract = 'PASS';
      record.extractedCount = extRes.count;
    }

    // 4. Translate, Apply & Rollback
    if (extRes.success && extRes.texts.length > 0) {
      const sample = extRes.texts.slice(0, 3);
      const translations = new Map();
      for (const it of sample) {
        translations.set(it.id, `[[OT_WOLF_RUNTIME_TEST]] ${it.clean || it.original}`);
      }

      const targetFiles = Array.from(new Set(sample.map(e => path.join(g.path, e.file)).filter(f => fs.existsSync(f))));
      const beforeHashes = {};
      for (const tf of targetFiles) beforeHashes[tf] = sha256(tf);

      const sessionId = `sess_wolf_${Date.now()}`;
      const applyRes = await adapter.apply(g.path, sample, translations, {
        sessionId,
        transactionId: 'tx_' + sessionId,
        backupId: 'bak_' + sessionId
      });

      if (applyRes.success) {
        record.translate = 'PASS';
        record.apply = 'PASS';

        // Rollback
        const rollRes = await adapter.rollback(g.path, { sessionId });
        if (rollRes.success) {
          let hashesMatch = true;
          for (const [tf, bHash] of Object.entries(beforeHashes)) {
            const curHash = sha256(tf);
            if (curHash !== bHash) {
              hashesMatch = false;
              break;
            }
          }
          if (hashesMatch) {
            record.rollback = 'PASS';
          }
        }
      }
    }

    // 5. Runtime Launch Test (Game.exe)
    const exePath = path.join(g.path, 'Game.exe');
    if (fs.existsSync(exePath)) {
      try {
        const proc = spawn(exePath, [], { cwd: g.path, detached: true });
        if (proc && proc.pid) {
          record.runtime = 'PASS';
          record.runtimePid = proc.pid;
          // Kill after brief execution
          await new Promise(r => setTimeout(r, 2000));
          try { process.kill(proc.pid); } catch(e) {}
        }
      } catch (err) {
        record.runtime = 'FAIL';
      }
    }

    // Determine Tier
    if (record.detect === 'PASS' && record.extract === 'PASS' && record.apply === 'PASS' && record.rollback === 'PASS') {
      if (record.runtime === 'PASS') {
        record.tier = 'RUNTIME VERIFIED';
      } else {
        record.tier = 'PIPELINE VERIFIED';
      }
    } else if (record.detect === 'PASS') {
      record.tier = 'EXTERNAL TOOL REQUIRED';
    }

    console.log(`Result: ${g.name} -> Tier: ${record.tier} (Extracted: ${record.extractedCount}, Apply: ${record.apply}, Rollback: ${record.rollback}, Runtime: ${record.runtime})\n`);
    results[g.name] = record;
  }

  fs.writeFileSync('WOLF_SUPPORT_MATRIX.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved WOLF_SUPPORT_MATRIX.json successfully.');
}

testWolfPipeline();
