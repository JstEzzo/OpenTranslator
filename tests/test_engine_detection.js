const path = require('path');
const fs = require('fs');
const { detectEngine, getExeArch, getHookDll } = require('./src/gameEngine');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

const folders = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

console.log('Testing detectEngine on all folders:');
for (const f of folders) {
    const full = path.join(baseDir, f);
    // Find exe
    let exe = null;
    try {
        const files = fs.readdirSync(full);
        const exes = files.filter(x => x.toLowerCase().endsWith('.exe'));
        if (exes.length > 0) {
            exe = path.join(full, exes[0]);
        } else {
            // Check subfolders
            for (const sub of files) {
                const subP = path.join(full, sub);
                if (fs.statSync(subP).isDirectory()) {
                    const subFiles = fs.readdirSync(subP);
                    const subExes = subFiles.filter(x => x.toLowerCase().endsWith('.exe'));
                    if (subExes.length > 0) {
                        exe = path.join(subP, subExes[0]);
                        break;
                    }
                }
            }
        }
    } catch(e) {}

    if (exe) {
        const detected = detectEngine(exe, path.dirname(exe));
        const arch = getExeArch(exe);
        const hook = getHookDll(detected, exe);
        console.log(`- ${f.padEnd(50)} => Engine: ${detected.padEnd(8)} (Arch: ${arch}-bit, Hook: ${hook || 'None'})`);
    } else {
        console.log(`- ${f.padEnd(50)} => NO EXE FOUND`);
    }
}
