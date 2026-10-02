const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (!entry.isDirectory()) {
            continue;
        }

        // Calculate size recursively (up to 3 levels deep or count files)
        let totalSize = 0;
        let fileCount = 0;
        let exeFiles = [];
        let rpyFiles = [];
        let jsonFiles = [];
        let rgssFiles = [];
        let unityFiles = [];
        let unrealFiles = [];
        let godotFiles = [];
        let topEntries = [];

        try {
            topEntries = fs.readdirSync(fullPath);
        } catch (e) {
            topEntries = ['[ACCESS_ERROR: ' + e.message + ']'];
        }

        function walk(currentDir, depth) {
            if (depth > 6) return;
            let list = [];
            try {
                list = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch (e) {
                return;
            }
            for (const item of list) {
                const itemPath = path.join(currentDir, item.name);
                if (item.isDirectory()) {
                    walk(itemPath, depth + 1);
                } else if (item.isFile()) {
                    fileCount++;
                    try {
                        const stat = fs.statSync(itemPath);
                        totalSize += stat.size;
                    } catch (e) {}

                    const lower = item.name.toLowerCase();
                    if (lower.endsWith('.exe')) exeFiles.push(path.relative(fullPath, itemPath));
                    if (lower.endsWith('.rpy') || lower.endsWith('.rpyc')) rpyFiles.push(path.relative(fullPath, itemPath));
                    if (lower.endsWith('.json')) jsonFiles.push(path.relative(fullPath, itemPath));
                    if (lower.endsWith('.rgss3a') || lower.endsWith('.rgss2a') || lower.endsWith('.rgssad') || lower.endsWith('.rvdata2') || lower.endsWith('.rxdata')) {
                        rgssFiles.push(path.relative(fullPath, itemPath));
                    }
                    if (lower.endsWith('.assets') || lower === 'unityplayer.dll' || lower.includes('managed') || lower.endsWith('.unity3d')) {
                        unityFiles.push(path.relative(fullPath, itemPath));
                    }
                    if (lower.endsWith('.pak') || lower.endsWith('.locres') || lower.endsWith('.uproject')) {
                        unrealFiles.push(path.relative(fullPath, itemPath));
                    }
                    if (lower.endsWith('.pck')) {
                        godotFiles.push(path.relative(fullPath, itemPath));
                    }
                }
            }
        }

        walk(fullPath, 0);

        results.push({
            name: entry.name,
            fullPath: fullPath,
            sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            fileCount,
            topEntries: topEntries.slice(0, 15),
            exeFiles,
            rpyFilesCount: rpyFiles.length,
            rpySample: rpyFiles.slice(0, 5),
            jsonFilesCount: jsonFiles.length,
            jsonSample: jsonFiles.slice(0, 5),
            rgssFiles,
            unityFiles: unityFiles.slice(0, 8),
            unrealFiles: unrealFiles.slice(0, 8),
            godotFiles: godotFiles.slice(0, 8)
        });
    }

    return results;
}

const inventory = scanDir(baseDir);
fs.writeFileSync(path.join(__dirname, 'inventory_result.json'), JSON.stringify(inventory, null, 2), 'utf8');
console.log('Inventoried ' + inventory.length + ' folders.');
for (const item of inventory) {
    console.log(`- ${item.name} (${item.sizeMB} MB, ${item.fileCount} files, exes: [${item.exeFiles.join(', ')}])`);
}
