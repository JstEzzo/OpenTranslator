const fs = require('fs');
const path = require('path');

function inspectFolder(target) {
    console.log(`=== INSPECTING: ${target} ===`);
    try {
        const entries = fs.readdirSync(target, { withFileTypes: true });
        for (const e of entries) {
            const full = path.join(target, e.name);
            if (e.isDirectory()) {
                console.log(`  [DIR]  ${e.name}`);
                try {
                    const sub = fs.readdirSync(full).slice(0, 10);
                    console.log(`         -> ${sub.join(', ')}`);
                } catch(err) {}
            } else {
                const stat = fs.statSync(full);
                console.log(`  [FILE] ${e.name} (${(stat.size / 1024).toFixed(1)} KB)`);
            }
        }
    } catch (e) {
        console.log(`  Error: ${e.message}`);
    }
}

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';
const targets = [
    'harem-heaven-03.5-alpha2-pc-plus',
    '[Kimochi] [RJ01156735] 刻印館からの脱出',
    'Nova pasta',
    'Nova pasta (2)',
    'Starmaker 1.8E',
    'Dane',
    'MiniGamePackVol1_v1.0_demo',
    'NTR Legend Unofficial Fan Remake 0.9.0 MTL',
    'NTR伝説 FInal_Ver.1.0.2_64bit',
    'ロリっ子健康診断2_1.0',
    'BLACK SOULS',
    '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2',
    'An Obedient Childhood Friend Is Easily Cucked',
    'Rabbit Hood English 2026-06-30',
    'Marge Mania v0.1',
    'RJ01618221',
    'RJ01058687_en',
    'ArmoredSuitSolganteRenpy0.2-pc',
    'summertime_saga_realistic_remake-0.3.0-win',
    'summertime_saga_realistic_remake-21.0.0-RB.1-win'
];

for (const t of targets) {
    inspectFolder(path.join(baseDir, t));
}
