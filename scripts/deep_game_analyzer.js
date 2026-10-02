const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

function readPeHeader(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(1024);
        fs.readSync(fd, buf, 0, 1024, 0);
        fs.closeSync(fd);

        // Check MZ header
        if (buf.readUInt16LE(0) !== 0x5A4D) {
            return { error: 'Not an MZ executable' };
        }
        const peOffset = buf.readUInt32LE(0x3C);
        if (peOffset + 24 > 1024) {
            const buf2 = Buffer.alloc(peOffset + 300);
            const fd2 = fs.openSync(filePath, 'r');
            fs.readSync(fd2, buf2, 0, peOffset + 300, 0);
            fs.closeSync(fd2);
            if (buf2.readUInt32LE(peOffset) !== 0x00004550) { // 'PE\0\0'
                return { error: 'Not a valid PE' };
            }
            const machine = buf2.readUInt16LE(peOffset + 4);
            return {
                arch: machine === 0x8664 ? '64-bit (x64)' : (machine === 0x014c ? '32-bit (x86)' : 'Unknown (' + machine.toString(16) + ')')
            };
        } else {
            if (buf.readUInt32LE(peOffset) !== 0x00004550) {
                return { error: 'Not a valid PE' };
            }
            const machine = buf.readUInt16LE(peOffset + 4);
            return {
                arch: machine === 0x8664 ? '64-bit (x64)' : (machine === 0x014c ? '32-bit (x86)' : 'Unknown (' + machine.toString(16) + ')')
            };
        }
    } catch (e) {
        return { error: e.message };
    }
}

function analyzeFolder(folderPath) {
    const name = path.basename(folderPath);
    const files = [];

    function collectFiles(dir, depth) {
        if (depth > 5) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
                const p = path.join(dir, ent.name);
                const rel = path.relative(folderPath, p);
                if (ent.isDirectory()) {
                    files.push({ rel, isDir: true });
                    collectFiles(p, depth + 1);
                } else if (ent.isFile()) {
                    try {
                        const stat = fs.statSync(p);
                        files.push({ rel, isDir: false, size: stat.size });
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    collectFiles(folderPath, 0);

    const relList = files.map(f => f.rel);
    const relLower = files.map(f => f.rel.toLowerCase());

    // Check engines
    const analysis = {
        name,
        path: folderPath,
        fileCount: files.filter(f => !f.isDir).length,
        dirCount: files.filter(f => f.isDir).length,
        totalBytes: files.filter(f => !f.isDir).reduce((a, b) => a + (b.size || 0), 0),
        engineDetected: 'Unknown',
        engineVersion: 'Unknown',
        arch: 'Unknown',
        mainExe: null,
        textFiles: [],
        textFormat: 'Unknown',
        encryption: 'None detected',
        packaging: 'Loose files',
        pluginsDetected: [],
        modFrameworks: [],
        notes: []
    };

    // Find exes
    const exes = files.filter(f => !f.isDir && f.rel.toLowerCase().endsWith('.exe'));
    if (exes.length > 0) {
        // Pick primary exe
        const rootExes = exes.filter(e => !e.rel.includes('\\') && !e.rel.includes('/'));
        if (rootExes.length > 0) {
            const nonConfig = rootExes.find(e => !e.rel.toLowerCase().includes('config') && !e.rel.toLowerCase().includes('crash') && !e.rel.toLowerCase().includes('patch'));
            analysis.mainExe = nonConfig ? nonConfig.rel : rootExes[0].rel;
        } else {
            analysis.mainExe = exes[0].rel;
        }

        if (analysis.mainExe) {
            const pe = readPeHeader(path.join(folderPath, analysis.mainExe));
            if (pe.arch) analysis.arch = pe.arch;
        }
    }

    // 1. RPG Maker MV / MZ
    const hasPackageJson = relLower.includes('package.json');
    const hasWwwData = relLower.some(r => r.startsWith('www\\data\\') || r.startsWith('www/data/'));
    const hasData = relLower.some(r => r.startsWith('data\\') || r.startsWith('data/'));
    const hasRpgCore = relLower.some(r => r.includes('rpg_core.js'));
    const hasRmmzCore = relLower.some(r => r.includes('rmmz_core.js'));

    if (hasRpgCore || (hasPackageJson && hasWwwData)) {
        analysis.engineDetected = 'RPG Maker MV';
        analysis.engineVersion = 'MV';
        // Try reading package.json or rpg_core version
        const pkg = relList.find(r => r.toLowerCase() === 'package.json');
        if (pkg) {
            try {
                const pkgData = JSON.parse(fs.readFileSync(path.join(folderPath, pkg), 'utf8'));
                analysis.notes.push('package.json name: ' + pkgData.name);
            } catch (e) {}
        }
        const rpgCoreFile = relList.find(r => r.toLowerCase().endsWith('rpg_core.js'));
        if (rpgCoreFile) {
            try {
                const content = fs.readFileSync(path.join(folderPath, rpgCoreFile), 'utf8').slice(0, 1000);
                const m = content.match(/Utils\.RPGMAKER_VERSION\s*=\s*['"]([^'"]+)['"]/);
                if (m) analysis.engineVersion = 'MV ' + m[1];
            } catch (e) {}
        }
        analysis.textFormat = 'JSON (www/data/*.json, plugins.js)';
        analysis.packaging = 'Loose JSON/JS web directory';
    } else if (hasRmmzCore) {
        analysis.engineDetected = 'RPG Maker MZ';
        analysis.engineVersion = 'MZ';
        analysis.textFormat = 'JSON (data/*.json, plugins.js)';
    }

    // Check for RPG Maker encryption (.rpgmvp, .rpgmvo, .rpgmvm, or System.json encrypted)
    if (analysis.engineDetected.startsWith('RPG Maker MV')) {
        const hasEncryptedAssets = relLower.some(r => r.endsWith('.rpgmvp') || r.endsWith('.rpgmvo') || r.endsWith('.rpgmvm') || r.endsWith('.png_') || r.endsWith('.ogg_'));
        if (hasEncryptedAssets) {
            analysis.encryption = 'RPG Maker MV/MZ Asset Encryption (images/audio)';
        }
    }

    // 2. RPG Maker XP / VX / VX Ace
    const hasGameIni = relLower.includes('game.ini');
    const hasScriptsRxdata = relLower.includes('data\\scripts.rxdata');
    const hasScriptsRvdata = relLower.includes('data\\scripts.rvdata');
    const hasScriptsRvdata2 = relLower.includes('data\\scripts.rvdata2');
    const hasRgss3a = relLower.some(r => r.endsWith('.rgss3a'));
    const hasRgss2a = relLower.some(r => r.endsWith('.rgss2a'));
    const hasRgssad = relLower.some(r => r.endsWith('.rgssad'));

    if (hasScriptsRvdata2 || hasRgss3a || relLower.some(r => r.includes('rgss30'))) {
        analysis.engineDetected = 'RPG Maker VX Ace';
        analysis.engineVersion = 'RGSS3';
        analysis.textFormat = 'Ruby Marshal binary (.rvdata2)';
        if (hasRgss3a) {
            analysis.packaging = 'RGSS3A Encrypted Archive';
            analysis.encryption = 'RGSS3A XOR Key';
        }
    } else if (hasScriptsRvdata || hasRgss2a || relLower.some(r => r.includes('rgss20'))) {
        analysis.engineDetected = 'RPG Maker VX';
        analysis.engineVersion = 'RGSS2';
        analysis.textFormat = 'Ruby Marshal binary (.rvdata)';
        if (hasRgss2a) {
            analysis.packaging = 'RGSS2A Encrypted Archive';
            analysis.encryption = 'RGSS2A';
        }
    } else if (hasScriptsRxdata || hasRgssad || relLower.some(r => r.includes('rgss10'))) {
        analysis.engineDetected = 'RPG Maker XP';
        analysis.engineVersion = 'RGSS1';
        analysis.textFormat = 'Ruby Marshal binary (.rxdata)';
        if (hasRgssad) {
            analysis.packaging = 'RGSSAD Encrypted Archive';
            analysis.encryption = 'RGSSAD';
        }
    }

    // 3. WOLF RPG Editor
    const hasDataWolf = relLower.some(r => r.endsWith('.wolf'));
    const hasWolfDat = relLower.includes('data\\basicdata\\sysdatabase.project') || relLower.includes('data\\basicdata\\gamemasking.dat') || relLower.some(r => r.includes('basicdata') && r.endsWith('.dat'));
    const hasGameDat = relLower.includes('game.dat');

    if (hasDataWolf || hasWolfDat || (hasGameDat && relLower.some(r => r.includes('editor')))) {
        analysis.engineDetected = 'WOLF RPG Editor';
        if (hasDataWolf) {
            analysis.packaging = '.wolf Archive (DX Archive variant or Wolf package)';
            analysis.encryption = 'Wolf Key / DXA';
        }
        analysis.textFormat = 'WOLF binary dat / MPS maps / Common events / Wolf archives';
    }

    // 4. Ren'Py
    const hasRenpyFolder = relLower.some(r => r.startsWith('renpy\\') || r.startsWith('renpy/'));
    const hasRpyOrRpyc = relLower.some(r => r.endsWith('.rpy') || r.endsWith('.rpyc') || r.endsWith('.rpa'));
    if (hasRenpyFolder || hasRpyOrRpyc) {
        analysis.engineDetected = "Ren'Py";
        const rpaFiles = files.filter(f => !f.isDir && f.rel.toLowerCase().endsWith('.rpa'));
        const rpyFiles = files.filter(f => !f.isDir && f.rel.toLowerCase().endsWith('.rpy'));
        const rpycFiles = files.filter(f => !f.isDir && f.rel.toLowerCase().endsWith('.rpyc'));

        analysis.notes.push(`RPY files: ${rpyFiles.length}, RPYC files: ${rpycFiles.length}, RPA archives: ${rpaFiles.length}`);
        if (rpaFiles.length > 0) {
            analysis.packaging = 'RPA archive (' + rpaFiles.map(r => path.basename(r.rel)).join(', ') + ')';
        } else {
            analysis.packaging = 'Loose .rpy / .rpyc files';
        }
        analysis.textFormat = 'Python / RenPy Script (.rpy / AST bytecode .rpyc)';
    }

    // 5. Unity
    const hasUnityPlayer = relLower.some(r => r.endsWith('unityplayer.dll'));
    const hasDataFolder = relLower.some(r => r.endsWith('_data\\managed') || r.endsWith('_data/managed') || r.includes('globalgamemanagers') || r.includes('resources.assets'));
    if (hasUnityPlayer || hasDataFolder) {
        analysis.engineDetected = 'Unity';
        // Check Mono vs IL2CPP
        const hasManaged = relLower.some(r => r.includes('managed\\assembly-csharp.dll') || r.includes('managed/assembly-csharp.dll'));
        const hasIl2cpp = relLower.some(r => r.includes('il2cpp') || r.includes('gameassembly.dll'));
        if (hasManaged) {
            analysis.engineVersion = 'Unity (Mono scripting backend)';
        } else if (hasIl2cpp) {
            analysis.engineVersion = 'Unity (IL2CPP scripting backend)';
        }

        // Check mod frameworks: BepInEx, ReiPatcher, MelonLoader
        if (relLower.some(r => r.includes('bepinex'))) analysis.modFrameworks.push('BepInEx');
        if (relLower.some(r => r.includes('reipatcher'))) analysis.modFrameworks.push('ReiPatcher');
        if (relLower.some(r => r.includes('melonloader'))) analysis.modFrameworks.push('MelonLoader');
        if (relLower.some(r => r.includes('xunity.autotranslator'))) analysis.modFrameworks.push('XUnity.AutoTranslator');

        analysis.packaging = 'Unity AssetBundles / serialized assets (*.assets, *.bundle, resources.assets)';
        analysis.textFormat = 'Binary Assets / TextMeshPro / MonoBehaviour serialized data';
    }

    // 6. TyranoBuilder / HTML5 / NWJS / Electron
    if (analysis.engineDetected === 'Unknown') {
        if (relLower.some(r => r.includes('tyrano') || r.includes('kag.tag.js'))) {
            analysis.engineDetected = 'TyranoBuilder (HTML5 / KAG Script)';
            analysis.textFormat = 'KAG / KS script (.ks) + HTML/JS';
        } else if (relLower.some(r => r.endsWith('nw.exe') || r.includes('package.json'))) {
            analysis.engineDetected = 'HTML5 / NW.js / Electron';
        }
    }

    // Scan for plugins in RPG Maker
    if (analysis.engineDetected.includes('RPG Maker MV') || analysis.engineDetected.includes('RPG Maker MZ')) {
        const pluginsJs = files.find(f => f.rel.toLowerCase().endsWith('plugins.js'));
        if (pluginsJs) {
            try {
                const code = fs.readFileSync(path.join(folderPath, pluginsJs.rel), 'utf8');
                const m = code.match(/name\s*:\s*["']([^"']+)["']/g);
                if (m) {
                    analysis.pluginsDetected = m.slice(0, 15).map(s => s.replace(/name\s*:\s*["']/, '').replace(/["']/, ''));
                }
            } catch (e) {}
        }
    }

    return analysis;
}

const folders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(baseDir, d.name));

const report = folders.map(f => analyzeFolder(f));
fs.writeFileSync(path.join(__dirname, 'detailed_game_profiles.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('Saved ' + report.length + ' game profiles.');
