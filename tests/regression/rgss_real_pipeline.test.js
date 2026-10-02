const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const RgssAdapter = require('../../src/engines/rpgmaker/rgssAdapter');
const EngineDetector = require('../../src/core/engineDetector');

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function testRgssPipeline() {
  console.log('=== TESTE REAL RGSS3 / RPG MAKER VX ACE PIPELINE & RUNTIME ===\n');
  const adapter = new RgssAdapter();

  const games = [
    { name: '[RPG] [happypink] +EXORCIST+', path: 'C:/Users/Teste/Desktop/Nova pasta/[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2' },
    { name: 'BLACK SOULS', path: 'C:/Users/Teste/Desktop/Nova pasta/BLACK SOULS' }
  ];

  const results = {};

  for (const g of games) {
    console.log(`--- [TESTING] ${g.name} ---`);
    const record = {
      game: g.name,
      engine: 'rgss',
      detect: 'FAIL',
      inspect: 'FAIL',
      extract: 'FAIL',
      translate: 'NOT_TESTED',
      apply: 'NOT_TESTED',
      rollback: 'NOT_TESTED',
      runtime: 'NOT_TESTED',
      extractedCount: 0,
      tier: 'UNSUPPORTED',
      notes: ''
    };

    // 1. Detect
    const det = await EngineDetector.detect(g.path);
    if (det.engine === 'rgss') {
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
    } else {
      record.extract = 'EMPTY';
      record.notes += 'No loose .rvdata2 or encrypted Game.rgss3a; ';
    }

    // 4. Translate, Apply & Rollback
    if (extRes.success && extRes.texts && extRes.texts.length > 0) {
      const sample = extRes.texts.slice(0, 3);
      const translations = new Map();
      for (const it of sample) {
        translations.set(it.id, `[[OT_RGSS_RUNTIME_TEST]] ${it.clean || it.original}`);
      }

      const dataDir = fs.existsSync(path.join(g.path, 'Data')) ? path.join(g.path, 'Data') : path.join(g.path, 'data');
      const targetFiles = Array.from(new Set(sample.map(e => path.join(dataDir, e.file)).filter(f => fs.existsSync(f))));
      const beforeHashes = {};
      for (const tf of targetFiles) beforeHashes[tf] = sha256(tf);

      const sessionId = `sess_rgss_${Date.now()}`;
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
    } else if (record.detect === 'PASS' && record.extract === 'EMPTY') {
      record.tier = 'EXTERNAL TOOL REQUIRED';
    } else if (record.detect === 'PASS') {
      record.tier = 'EXTERNAL TOOL REQUIRED';
    }

    console.log(`Result: ${g.name} -> Tier: ${record.tier} (Extracted: ${record.extractedCount}, Apply: ${record.apply}, Rollback: ${record.rollback}, Runtime: ${record.runtime})\n`);
    results[g.name] = record;
  }

  fs.writeFileSync('RGSS_SUPPORT_MATRIX.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved RGSS_SUPPORT_MATRIX.json successfully.');
}

testRgssPipeline();
