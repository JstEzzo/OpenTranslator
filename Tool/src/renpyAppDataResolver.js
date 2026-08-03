const fs = require('fs');
const path = require('path');

/**
 * Resolves the base AppData directory for Ren'Py across operating systems.
 * Windows: %APPDATA%/RenPy
 * macOS: ~/Library/RenPy
 * Linux/Steam Deck: ~/.renpy
 */
function getBaseAppDataPath() {
    if (process.platform === 'win32') {
        return process.env.APPDATA ? path.join(process.env.APPDATA, 'RenPy') : '';
    } else if (process.platform === 'darwin') {
        return process.env.HOME ? path.join(process.env.HOME, 'Library', 'RenPy') : '';
    } else {
        return process.env.HOME ? path.join(process.env.HOME, '.renpy') : '';
    }
}

/**
 * Scans .rpy text files in game directory for config.save_directory definition.
 */
function extractSaveDirectoryFromRpy(gameSubDir) {
    try {
        const gameDir = path.join(gameSubDir, 'game');
        if (!fs.existsSync(gameDir)) return null;

        const files = fs.readdirSync(gameDir);
        const rpyFiles = files.filter(f => f.endsWith('.rpy'));

        const regex = /(?:define\s+)?config\.save_directory\s*=\s*["']([^"']+)["']/i;

        for (const file of rpyFiles) {
            const filePath = path.join(gameDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const match = regex.exec(content);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    } catch (e) {
        if (typeof global.log === 'function') {
            global.log('error', `[RenPyAppDataResolver] Error scanning .rpy files: ${e.message}`);
        }
    }
    return null;
}

/**
 * Searches physical folders in AppData matching game folder basename or title.
 */
function findMatchingAppDataFolder(gameFolderBasename, gameTitle) {
    try {
        const baseAppData = getBaseAppDataPath();
        if (!baseAppData || !fs.existsSync(baseAppData)) return null;

        const appDataFolders = fs.readdirSync(baseAppData);
        
        // Exclude generic terms that lead to false positive matching (e.g., 'game', 'pc', 'build')
        const genericTerms = new Set(['game', 'pc', 'renpy', 'build', 'release', 'v0', 'v1', 'v2', 'mac', 'win']);

        // Clean search terms
        const searchTerms = [gameTitle, gameFolderBasename]
            .filter(Boolean)
            .flatMap(s => {
                const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const parts = s.split(/[-_\s.]+/).map(p => p.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(p => p.length >= 3 && !genericTerms.has(p));
                return [cleaned, ...parts];
            })
            .filter(term => term && term.length >= 3 && !genericTerms.has(term));

        // First pass: Exact match or term-start match with non-generic terms
        for (const term of searchTerms) {
            for (const folder of appDataFolders) {
                const folderClean = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (folderClean.startsWith(term) || term.startsWith(folderClean)) {
                    return folder;
                }
            }
        }
    } catch (e) {
        if (typeof global.log === 'function') {
            global.log('error', `[RenPyAppDataResolver] Error searching physical AppData folders: ${e.message}`);
        }
    }
    return null;
}

/**
 * Resolves the full AppData directory path for a given Ren'Py game.
 */
function resolveGameAppDataDir(gameSubDir, gameTitle) {
    const baseAppData = getBaseAppDataPath();
    const gameFolderBasename = path.basename(gameSubDir || '');

    if (!baseAppData || !fs.existsSync(baseAppData)) {
        const reason = `Base Ren'Py AppData directory does not exist at: ${baseAppData}`;
        logAppDataError(gameTitle, [baseAppData], reason);
        return { success: false, appDataDir: null, saveDirectoryName: null, method: 'none', error: reason };
    }

    // Strategy 1: Read config.save_directory from .rpy text files
    const saveDirFromRpy = extractSaveDirectoryFromRpy(gameSubDir);
    if (saveDirFromRpy) {
        const fullPath = path.join(baseAppData, saveDirFromRpy);
        if (fs.existsSync(fullPath)) {
            if (typeof global.log === 'function') {
                global.log('info', `[RenPyAppDataResolver] Resolved AppData via .rpy config.save_directory: ${fullPath}`);
            }
            return { success: true, appDataDir: fullPath, saveDirectoryName: saveDirFromRpy, method: 'rpy_regex', error: null };
        }
    }

    // Strategy 2: Physical matching by folder name / title
    const matchedFolder = findMatchingAppDataFolder(gameFolderBasename, gameTitle);
    if (matchedFolder) {
        const fullPath = path.join(baseAppData, matchedFolder);
        if (typeof global.log === 'function') {
            global.log('info', `[RenPyAppDataResolver] Resolved AppData via physical folder matching: ${fullPath}`);
        }
        return { success: true, appDataDir: fullPath, saveDirectoryName: matchedFolder, method: 'physical_match', error: null };
    }

    const searchedPaths = [
        saveDirFromRpy ? path.join(baseAppData, saveDirFromRpy) : null,
        path.join(baseAppData, gameFolderBasename)
    ].filter(Boolean);

    const errorMsg = `Failed to resolve AppData directory for game '${gameTitle}' (Folder: '${gameFolderBasename}'). Searched in: ${baseAppData}`;
    logAppDataError(gameTitle, searchedPaths, errorMsg);
    return { success: false, appDataDir: null, saveDirectoryName: null, method: 'none', error: errorMsg };
}

/**
 * Logs a detailed diagnostic error report when AppData directory resolution fails.
 */
const loggerManager = require("./loggerManager");

function logAppDataError(gameTitle, searchedPaths, reason) {
    const report = [
        `=== Ren'Py AppData Resolution Diagnostic Report ===`,
        `Game Title: ${gameTitle || 'Unknown'}`,
        `Base AppData Path: ${getBaseAppDataPath()}`,
        `Searched Paths: ${searchedPaths.join(', ')}`,
        `Diagnostic Detail: ${reason}`,
        `====================================================`
    ].join('\n');

    if (typeof global.log === 'function') {
        global.log('error', report);
    } else {
        loggerManager.error(report);
    }
}

module.exports = {
    getBaseAppDataPath,
    extractSaveDirectoryFromRpy,
    findMatchingAppDataFolder,
    resolveGameAppDataDir,
    logAppDataError
};
