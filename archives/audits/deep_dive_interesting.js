const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

function inspectTarget(targetName) {
    const fullTarget = path.join(baseDir, targetName);
    const info = { name: targetName, fullPath: fullTarget, exists: fs.existsSync(fullTarget), files: [] };
    if (!info.exists) return info;

    try {
        const list = fs.readdirSync(fullTarget);
        for (const item of list) {
            const itemPath = path.join(fullTarget, item);
            try {
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    let sub = [];
                    try { sub = fs.readdirSync(itemPath).slice(0, 15); } catch(e){}
                    info.files.push({ name: item, isDir: true, children: sub });
                } else {
                    info.files.push({ name: item, isDir: false, sizeKB: (stat.size/1024).toFixed(1) });
                }
            } catch(e) {}
        }
    } catch(e) {
        info.error = e.message;
    }
    return info;
}

const interestingTargets = [
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
    'Rabbit Hood English 2026-06-30'
];

const results = interestingTargets.map(inspectTarget);
fs.writeFileSync(path.join(__dirname, 'targets_deep_dive.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Saved targets deep dive.');
