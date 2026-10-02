const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

// List of games to inspect deeply
const games = [
    { id: 'toki', name: 'Toki kan Yuusha (gitgud)', path: path.join(baseDir, 'Toki kan Yuusha (gitgud)') },
    { id: 'rj01058687', name: 'RJ01058687_en', path: path.join(baseDir, 'RJ01058687_en') },
    { id: 'marge', name: 'Marge Mania v0.1', path: path.join(baseDir, 'Marge Mania v0.1') },
    { id: 'rj01618221', name: 'RJ01618221', path: path.join(baseDir, 'RJ01618221') },
    { id: 'blacksouls', name: 'BLACK SOULS', path: path.join(baseDir, 'BLACK SOULS') },
    { id: 'exorcist', name: '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2', path: path.join(baseDir, '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2') },
    { id: 'obedient', name: 'An Obedient Childhood Friend Is Easily Cucked', path: path.join(baseDir, 'An Obedient Childhood Friend Is Easily Cucked') },
    { id: 'rabbithood', name: 'Rabbit Hood English 2026-06-30', path: path.join(baseDir, 'Rabbit Hood English 2026-06-30') },
    { id: 'solgante', name: 'ArmoredSuitSolganteRenpy0.2-pc', path: path.join(baseDir, 'ArmoredSuitSolganteRenpy0.2-pc') },
    { id: 'summertime03', name: 'summertime_saga_realistic_remake-0.3.0-win', path: path.join(baseDir, 'summertime_saga_realistic_remake-0.3.0-win') },
    { id: 'summertime21', name: 'summertime_saga_realistic_remake-21.0.0-RB.1-win', path: path.join(baseDir, 'summertime_saga_realistic_remake-21.0.0-RB.1-win') },
    { id: 'dane', name: 'Dane', path: path.join(baseDir, 'Dane') },
    { id: 'minigame', name: 'MiniGamePackVol1_v1.0_demo', path: path.join(baseDir, 'MiniGamePackVol1_v1.0_demo') },
    { id: 'ntr_mtl', name: 'NTR Legend Unofficial Fan Remake 0.9.0 MTL', path: path.join(baseDir, 'NTR Legend Unofficial Fan Remake 0.9.0 MTL') },
    { id: 'ntr_clean', name: 'NTR伝説 FInal_Ver.1.0.2_64bit', path: path.join(baseDir, 'NTR伝説 FInal_Ver.1.0.2_64bit') },
    { id: 'bunny', name: 'Nova pasta', path: path.join(baseDir, 'Nova pasta') },
    { id: 'starmaker_proj', name: 'Nova pasta (2)', path: path.join(baseDir, 'Nova pasta (2)') },
    { id: 'lori', name: 'ロリっ子健康診断2_1.0', path: path.join(baseDir, 'ロリっ子健康診断2_1.0') },
    { id: 'harem', name: 'harem-heaven-03.5-alpha2-pc-plus', path: path.join(baseDir, 'harem-heaven-03.5-alpha2-pc-plus') },
    { id: 'kimochi', name: '[Kimochi] [RJ01156735] 刻印館からの脱出', path: path.join(baseDir, '[Kimochi] [RJ01156735] 刻印館からの脱出') }
];

function inspectGame(g) {
    const report = {
        id: g.id,
        name: g.name,
        path: g.path,
        exists: fs.existsSync(g.path)
    };
    if (!report.exists) return report;

    // Files overview
    const topFiles = fs.readdirSync(g.path);
    report.topFiles = topFiles;

    // Check specific subdirectories
    report.hasData = topFiles.some(f => f.toLowerCase() === 'data');
    report.hasWww = topFiles.some(f => f.toLowerCase() === 'www');
    report.hasGame = topFiles.some(f => f.toLowerCase() === 'game');

    // Detect details per engine family:
    // 1. RPG Maker MV/MZ
    if (report.hasWww) {
        const wwwPath = path.join(g.path, 'www');
        try {
            report.wwwFiles = fs.readdirSync(wwwPath);
            if (fs.existsSync(path.join(wwwPath, 'data'))) {
                report.dataFiles = fs.readdirSync(path.join(wwwPath, 'data')).filter(f => f.endsWith('.json'));
            }
        } catch(e) {}
    } else if (report.hasData && topFiles.some(f => f.toLowerCase().endsWith('.json') || f.toLowerCase() === 'js')) {
        try {
            report.dataFiles = fs.readdirSync(path.join(g.path, 'data')).filter(f => f.endsWith('.json'));
        } catch(e) {}
    }

    // 2. RGSS / VX Ace
    if (topFiles.some(f => f.toLowerCase().endsWith('.rgss3a') || f.toLowerCase() === 'game.ini')) {
        report.rgssArchives = topFiles.filter(f => f.toLowerCase().endsWith('.rgss3a') || f.toLowerCase().endsWith('.rgss2a') || f.toLowerCase().endsWith('.rgssad'));
        if (report.hasData) {
            try {
                report.rvdataFiles = fs.readdirSync(path.join(g.path, 'Data')).filter(f => f.toLowerCase().endsWith('.rvdata2') || f.toLowerCase().endsWith('.rvdata') || f.toLowerCase().endsWith('.rxdata'));
            } catch(e) {}
        }
    }

    // 3. WOLF
    if (topFiles.some(f => f.toLowerCase().includes('editor') || f.toLowerCase() === 'game.dat') || (report.hasData && fs.existsSync(path.join(g.path, 'Data', 'BasicData')))) {
        report.isWolf = true;
        try {
            report.wolfBasicData = fs.readdirSync(path.join(g.path, 'Data', 'BasicData'));
        } catch(e) {}
        try {
            report.wolfMapData = fs.readdirSync(path.join(g.path, 'Data', 'MapData')).slice(0, 10);
        } catch(e) {}
    }

    // 4. RenPy
    if (report.hasGame) {
        try {
            const gameDir = path.join(g.path, 'game');
            const gFiles = fs.readdirSync(gameDir);
            report.renpyRpa = gFiles.filter(f => f.toLowerCase().endsWith('.rpa'));
            report.renpyRpy = gFiles.filter(f => f.toLowerCase().endsWith('.rpy'));
            report.renpyRpyc = gFiles.filter(f => f.toLowerCase().endsWith('.rpyc'));
            report.hasTlFolder = gFiles.some(f => f.toLowerCase() === 'tl');
        } catch(e) {}
    }

    // 5. Unity
    const unityPlayer = topFiles.find(f => f.toLowerCase() === 'unityplayer.dll');
    const dataFolder = topFiles.find(f => f.toLowerCase().endsWith('_data'));
    if (unityPlayer || dataFolder) {
        report.isUnity = true;
        report.unityDataFolder = dataFolder;
        if (dataFolder) {
            const dfPath = path.join(g.path, dataFolder);
            try {
                const dfFiles = fs.readdirSync(dfPath);
                report.unityDataFiles = dfFiles.slice(0, 20);
                report.hasManaged = dfFiles.some(f => f.toLowerCase() === 'managed');
                report.hasIl2cpp = dfFiles.some(f => f.toLowerCase() === 'il2cpp_data') || topFiles.some(f => f.toLowerCase() === 'gameassembly.dll');
                report.hasAssets = dfFiles.filter(f => f.toLowerCase().endsWith('.assets') || f.toLowerCase().endsWith('.resource') || f.toLowerCase().endsWith('.unity3d'));
            } catch(e) {}
        }
        report.modTools = [];
        if (topFiles.some(f => f.toLowerCase() === 'bepinex')) report.modTools.push('BepInEx');
        if (topFiles.some(f => f.toLowerCase() === 'reipatcher')) report.modTools.push('ReiPatcher');
        if (topFiles.some(f => f.toLowerCase() === 'autotranslator')) report.modTools.push('AutoTranslator');
        if (topFiles.some(f => f.toLowerCase() === 'doorstop_config.ini' || f.toLowerCase() === 'winhttp.dll')) report.modTools.push('Doorstop');
    }

    // 6. Godot
    const pckFiles = topFiles.filter(f => f.toLowerCase().endsWith('.pck'));
    if (pckFiles.length > 0) {
        report.isGodot = true;
        report.godotPck = pckFiles;
    }

    return report;
}

const allReports = games.map(inspectGame);
fs.writeFileSync(path.join(__dirname, 'game_by_game_raw.json'), JSON.stringify(allReports, null, 2), 'utf8');
console.log('Inspected ' + allReports.length + ' games.');
