const path = require('path');
const fs = require('fs');
const EngineDetector = require('./src/core/engineDetector');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

async function run() {
    const folders = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    console.log('Testing EngineDetector.detect on all folders:');
    const results = [];
    for (const f of folders) {
        const full = path.join(baseDir, f);
        try {
            const res = await EngineDetector.detect(full);
            results.push({ folder: f, ...res });
            console.log(`- ${f.padEnd(55)} => Engine: ${(res.engine || 'unknown').padEnd(12)} (v: ${(res.engineVersion || 'N/A').padEnd(10)}, Conf: ${(res.confidence*100).toFixed(0)}%, Arch: ${res.architecture})`);
        } catch(e) {
            console.log(`- ${f.padEnd(55)} => ERROR: ${e.message}`);
        }
    }
    fs.writeFileSync(path.join(__dirname, 'engine_detector_results.json'), JSON.stringify(results, null, 2), 'utf8');
}

run();
