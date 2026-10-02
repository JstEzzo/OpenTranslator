const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const BaseEngineHandler = require('../baseEngineHandler');
const { ensureTlDirectory, buildRenpyStringTlContent, injectRenpyFontConfig, extractRenpyRpyTexts, purgeCacheFiles } = require('./renpyCommon');

class RenpyV8Handler extends BaseEngineHandler {
  constructor() {
    super('RenpyV8Handler');
    this.pythonVersion = '3.9+';
    this.unrpycPath = path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'renpy', 'unrpyc_v2', 'unrpyc.py');
  }

  /**
   * Extract Ren'Py 8.x text using Python 3 environment and unrpyc_v2.
   */
  async extract({ gameDir, gameExe, title, options = {} }) {
    purgeCacheFiles(gameDir);
    return new Promise((resolve, reject) => {
      try {
        const gameSubDir = fs.existsSync(path.join(gameDir, "game")) 
          ? path.join(gameDir, "game") 
          : gameDir;

        const unpackScript = path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'renpy', 'unpack_renpy_all.py');
        const pythonBin = options.python3Path || options.pythonPath || 'python3';

        const args = [unpackScript, '-i', gameSubDir, '-o', gameSubDir, '--mode', 'extract', '--py-version', '3'];

        const loggerManager = require('../../loggerManager.js');
        execFile(pythonBin, args, { cwd: gameDir }, (error, stdout, stderr) => {
          if (error) {
            const errDetails = (stderr && stderr.trim().length > 0) ? stderr.trim() : (stdout && stdout.trim().length > 0) ? stdout.trim() : error.message;
            loggerManager.error(`[RenpyV8 Unpack Stderr Failure]:\n${errDetails}`);
            return resolve({
              success: false,
              engine: 'RENPY_8',
              extractedFiles: [],
              totalEntries: 0,
              error: errDetails
            });
          }

          const extractedFiles = [];
          const tlDir = path.join(gameSubDir, 'tl');
          if (fs.existsSync(tlDir)) {
            extractedFiles.push(tlDir);
          }

          // Deep Scan all decompiled .rpy files for UI, tooltips, and screen texts
          let totalEntries = 0;
          try {
            const scanRpyFiles = (dir) => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== 'tl' && entry.name !== 'renpy') {
                  scanRpyFiles(fullPath);
                } else if (entry.isFile() && (entry.name.endsWith('.rpy') || entry.name.endsWith('.py')) && !entry.name.startsWith('00_opent_') && !entry.name.startsWith('000_anti_')) {
                  extractedFiles.push(fullPath);
                  const content = fs.readFileSync(fullPath, 'utf-8');
                  const rpyTexts = extractRenpyRpyTexts(content, fullPath);
                  totalEntries += rpyTexts.length;
                }
              }
            };
            scanRpyFiles(gameSubDir);
} catch (e) { global.log("warn", `renpyV8Handler: Error during extraction: ${e.message}`); }

          resolve({
            success: true,
            engine: 'RENPY_8',
            extractedFiles: Array.from(new Set(extractedFiles)),
            totalEntries
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Inject UTF-8 translations into game/tl/pt_BR/ script files.
   */
  async injectTranslation({ gameDir, translationMap, lang = 'pt_BR', options = {} }) {
    try {
      const gameSubDir = fs.existsSync(path.join(gameDir, 'game')) ? path.join(gameDir, 'game') : gameDir;
      const entries = Object.entries(translationMap || {}).map(([oldText, newText]) => ({
        oldText,
        newText
      }));

      const rpyContent = buildRenpyStringTlContent(entries, lang);
      const injectedFiles = [];
      const targetLangs = (lang === 'pt_BR' || lang === 'pt') ? ['pt_BR', 'pt'] : [lang];

      for (const lName of targetLangs) {
        const lDir = path.join(gameSubDir, 'tl', lName);
        if (!fs.existsSync(lDir)) fs.mkdirSync(lDir, { recursive: true });
        const outFile = path.join(lDir, 'opentranslator_tl.rpy');
        const outFileC = path.join(lDir, 'opentranslator_tl.rpyc');
        if (fs.existsSync(outFileC)) try { fs.unlinkSync(outFileC); } catch (e) { global.log("warn", `renpyV8Handler: Failed to unlink ${outFileC}: ${e.message}`); }
        fs.writeFileSync(outFile, rpyContent, 'utf-8');
        injectedFiles.push(outFile);
      }

      return {
        success: true,
        engine: 'RENPY_8',
        injectedFiles,
        count: entries.length
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RENPY_8',
        injectedFiles: [],
        count: 0,
        error: err.message
      };
    }
  }

  /**
   * Apply PT-BR font patch to gui.rpy with UTF-8 support.
   */
  async applyFontPatch({ gameDir, fontFile, options = {} }) {
    try {
      const gameSubDir = fs.existsSync(path.join(gameDir, 'game')) ? path.join(gameDir, 'game') : gameDir;
      const fontsDir = path.join(gameSubDir, 'fonts');
      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }

      let patchedFiles = [];
      if (fontFile && fs.existsSync(fontFile)) {
        const destFont = path.join(fontsDir, path.basename(fontFile));
        fs.copyFileSync(fontFile, destFont);
        patchedFiles.push(destFont);
      }

      const fontPatched = injectRenpyFontConfig(gameDir, fontFile ? path.basename(fontFile) : 'default.ttf');
      if (fontPatched) {
        patchedFiles.push(path.join(gameSubDir, 'gui.rpy'));
      }

      return {
        success: true,
        engine: 'RENPY_8',
        patchedFiles
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RENPY_8',
        patchedFiles: [],
        error: err.message
      };
    }
  }

  /**
   * Cleanup temporary .rpyc files generated during extraction.
   */
  async cleanup({ gameDir, options = {} }) {
    try {
      purgeCacheFiles(gameDir);
      const gameSubDir = fs.existsSync(path.join(gameDir, 'game')) ? path.join(gameDir, 'game') : gameDir;
      const runtimeFile = path.join(gameSubDir, '00_opent_runtime.rpy');
      const runtimeCompiled = path.join(gameSubDir, '00_opent_runtime.rpyc');

      if (fs.existsSync(runtimeFile)) fs.unlinkSync(runtimeFile);
      if (fs.existsSync(runtimeCompiled)) fs.unlinkSync(runtimeCompiled);

      return { success: true, engine: 'RENPY_8' };
    } catch (err) {
      return { success: false, engine: 'RENPY_8', error: err.message };
    }
  }
}

module.exports = RenpyV8Handler;
