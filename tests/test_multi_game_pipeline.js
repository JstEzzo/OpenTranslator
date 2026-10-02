const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EngineDetector = require('./src/core/engineDetector');
const RpgMakerAdapter = require('./src/engines/rpgmaker/rpgMakerAdapter');
const RenpyAdapter = require('./src/engines/renpy/renpyAdapter');
const UnityAdapter = require('./src/engines/unity/unityAdapter');
const WolfAdapter = require('./src/engines/wolf/wolfAdapter');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

function hashFile(p) {
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

async function testGameFlow(gameFolder, AdapterClass, sampleFilesToHash) {
    const gamePath = path.join(baseDir, gameFolder);
    console.log(`\n==================================================`);
    console.log(`TESTING FULL PIPELINE: ${gameFolder}`);
    console.log(`==================================================`);

    const result = {
        name: gameFolder,
        path: gamePath,
        detect: null,
        extract: null,
        classify: null,
        apply: null,
        validate: null,
        rollback: null,
        integrityOk: false
    };

    // 1. DETECT
    const det = await EngineDetector.detect(gamePath);
    result.detect = { engine: det.engine, version: det.engineVersion, confidence: det.confidence, arch: det.architecture };
    console.log(`1. DETECT: ${det.engine} (${det.engineVersion}) [conf: ${(det.confidence*100).toFixed(0)}%, arch: ${det.architecture}]`);

    // 2. SNAPSHOT / PRE-HASH
    const preHashes = {};
    for (const f of sampleFilesToHash) {
        const full = path.join(gamePath, f);
        if (fs.existsSync(full)) {
            preHashes[f] = hashFile(full);
        }
    }
    console.log(`2. SNAPSHOT: Recorded ${Object.keys(preHashes).length} sample file hashes.`);

    // 3. EXTRACT
    const adapter = new AdapterClass();
    const ext = await adapter.extract(gamePath);
    result.extract = { success: ext.success, count: ext.count || (ext.texts ? ext.texts.length : 0) };
    console.log(`3. EXTRACT: ${ext.success ? 'SUCCESS' : 'FAILED'} — Found ${result.extract.count} texts.`);

    if (!ext.texts || ext.texts.length === 0) {
        console.log(`   (No static texts extracted, skipping apply/rollback test)`);
        return result;
    }

    // 4. CLASSIFY & PREPARE TRANSLATIONS (Sample 20 texts for safe non-destructive test)
    const textsToTranslate = ext.texts.slice(0, 30);
    const mockTranslations = new Map();
    for (const t of textsToTranslate) {
        mockTranslations.set(t.id, `[PT-BR] ${t.clean}`);
    }
    result.classify = { sampledCount: textsToTranslate.length };
    console.log(`4. CLASSIFY: Prepared mock translations for ${textsToTranslate.length} texts.`);

    // 5. VALIDATE PRE-APPLY
    const preVal = await adapter.validate(gamePath, textsToTranslate, mockTranslations);
    console.log(`5. VALIDATE: valid=${preVal.valid}, errors=${preVal.errors.length}`);

    // 6. APPLY
    const appRes = await adapter.apply(gamePath, textsToTranslate, mockTranslations, { lang: 'pt_BR' });
    result.apply = { success: appRes.success, count: appRes.count, modified: appRes.modifiedFiles };
    console.log(`6. APPLY: ${appRes.success ? 'SUCCESS' : 'FAILED'} — Modified ${appRes.count} entries across ${(appRes.modifiedFiles||[]).length} targets.`);

    // Verify files were actually created or modified
    let modifiedDetected = false;
    for (const f of sampleFilesToHash) {
        const full = path.join(gamePath, f);
        if (fs.existsSync(full)) {
            const curHash = hashFile(full);
            if (curHash !== preHashes[f]) {
                modifiedDetected = true;
                break;
            }
        }
    }
    console.log(`   Applied modification detected in target: ${modifiedDetected}`);

    // 7. ROLLBACK
    const rbRes = await adapter.rollback(gamePath);
    result.rollback = { success: rbRes.success };
    console.log(`7. ROLLBACK: ${rbRes.success ? 'SUCCESS' : 'FAILED'}`);

    // 8. VERIFY INTEGRITY (SHA-256 MATCH)
    let allHashesMatched = true;
    for (const f of sampleFilesToHash) {
        const full = path.join(gamePath, f);
        if (fs.existsSync(full)) {
            const postHash = hashFile(full);
            if (postHash !== preHashes[f]) {
                console.log(`   WARNING: Hash mismatch for ${f}: pre=${preHashes[f]}, post=${postHash}`);
                allHashesMatched = false;
            }
        }
    }
    result.integrityOk = allHashesMatched;
    console.log(`8. INTEGRITY CHECK: ${allHashesMatched ? 'PERFECT (SHA-256 matches original)' : 'MISMATCH'}`);

    return result;
}

async function run() {
    const testCases = [
        // MV
        {
            folder: 'RJ01058687_en',
            adapter: RpgMakerAdapter,
            samples: ['www/data/System.json', 'www/data/Actors.json']
        },
        // MZ
        {
            folder: 'Marge Mania v0.1',
            adapter: RpgMakerAdapter,
            samples: ['data/System.json', 'data/Actors.json']
        },
        // RGSS (VX Ace loose)
        {
            folder: '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2',
            adapter: RpgMakerAdapter,
            samples: ['Data/System.rvdata2', 'Data/Actors.rvdata2']
        },
        // RenPy
        {
            folder: 'ArmoredSuitSolganteRenpy0.2-pc',
            adapter: RenpyAdapter,
            samples: ['game/tl/pt_BR/opentranslator_tl.rpy']
        },
        // RenPy 2
        {
            folder: 'summertime_saga_realistic_remake-21.0.0-RB.1-win',
            adapter: RenpyAdapter,
            samples: ['game/tl/pt_BR/opentranslator_tl.rpy']
        }
    ];

    const allResults = [];
    for (const tc of testCases) {
        try {
            const res = await testGameFlow(tc.folder, tc.adapter, tc.samples);
            allResults.push(res);
        } catch(e) {
            console.log(`ERROR testing ${tc.folder}: ${e.message}`);
        }
    }

    fs.writeFileSync(path.join(__dirname, 'pipeline_multi_game_results.json'), JSON.stringify(allResults, null, 2), 'utf8');
    console.log('\n=== MULTI-GAME PIPELINE TEST COMPLETE ===');
}

run();
