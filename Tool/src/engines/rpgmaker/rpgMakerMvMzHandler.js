const fs = require('fs');
const path = require('path');
const BaseEngineHandler = require('../baseEngineHandler');

class RpgMakerMvMzHandler extends BaseEngineHandler {
  constructor() {
    super('RpgMakerMvMzHandler');
  }

  /**
   * Bootstrapper: Reads System.json FIRST to extract encryption metadata & key
   * @param {string} dataDir 
   * @returns {{ hasEncryptedImages: boolean, hasEncryptedAudio: boolean, encryptionKey: string | null }}
   */
  readSystemEncryptionConfig(dataDir) {
    const systemPath = path.join(dataDir, 'System.json');
    if (!fs.existsSync(systemPath)) {
      return { hasEncryptedImages: false, hasEncryptedAudio: false, encryptionKey: null, isMz: false };
    }

    try {
      const systemData = JSON.parse(fs.readFileSync(systemPath, 'utf-8'));
      const isMz = !fs.existsSync(path.join(path.dirname(dataDir), 'www'));
      return {
        hasEncryptedImages: !!systemData.hasEncryptedImages,
        hasEncryptedAudio: !!systemData.hasEncryptedAudio,
        encryptionKey: systemData.encryptionKey || null,
        isMz,
        imageExt: isMz ? '.png_' : '.rpgmvp',
        audioExt: isMz ? '.ogg_' : '.rpgmvo'
      };
    } catch (e) {
      return { hasEncryptedImages: false, hasEncryptedAudio: false, encryptionKey: null, isMz: false };
    }
  }

  _getAllDataFiles(dir, extensions = ['.json', '.txt']) {
    let results = [];
    try {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of list) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(this._getAllDataFiles(fullPath, extensions));
        } else if (extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
          results.push(fullPath);
        }
      }
    } catch (e) {}
    return results;
  }

  /**
   * Extract translatable dialogue and text from RPG Maker MV/MZ JSON files.
   */
  async extract({ gameDir, gameExe, title, options = {} }) {
    try {
      const dataDir = fs.existsSync(path.join(gameDir, 'www', 'data'))
        ? path.join(gameDir, 'www', 'data')
        : path.join(gameDir, 'data');

      if (!fs.existsSync(dataDir)) {
        return {
          success: false,
          engine: 'RPG_MAKER_MV_MZ',
          extractedFiles: [],
          totalEntries: 0,
          error: `Data directory not found in ${gameDir}`
        };
      }

      // Step 1: Mandatory System.json bootstrapper check
      const encConfig = this.readSystemEncryptionConfig(dataDir);
      if (global.log) {
        global.log('info', `🔑 [RPG Maker MV/MZ] Encryption config: key=${encConfig.encryptionKey}, images=${encConfig.hasEncryptedImages}, audio=${encConfig.hasEncryptedAudio}`);
      }

      // Step 2: Read JSON and TXT files recursively (including subfolders like data/scenarios/)
      const extractedFiles = this._getAllDataFiles(dataDir, ['.json', '.txt']);

      return {
        success: true,
        engine: 'RPG_MAKER_MV_MZ',
        encryptionConfig: encConfig,
        extractedFiles,
        totalEntries: extractedFiles.length
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_MV_MZ',
        extractedFiles: [],
        totalEntries: 0,
        error: err.message
      };
    }
  }

  /**
   * Helper: Deep Walk recursive replacement for JSON values without touching JSON keys or syntax.
   * Sorts translation keys by descending length to prevent partial substring collision.
   */
  _deepTranslateJson(obj, translationMap, sortedKeys = null, stats = { count: 0 }, keyName = null) {
    const SKIP_KEYS = new Set([
      "characterName", "battlerName", "faceName", "parallaxName",
      "battleback1Name", "battleback2Name", "pictureName", "title1Name",
      "title2Name", "bgName", "seName", "bgmName", "fontFace",
      "fontFileName", "file", "fileName", "graphic", "src", "path",
      "url", "icon", "audio", "bgm", "bgs", "me", "se",
      // "note", // REMOVED
      "code", "hasEncryptedImages", "hasEncryptedAudio", "encryptionKey",
      "gameId", "tileSize", "faceSize", "iconSize",
      // "meta", // REMOVED
    ]);

    if (keyName && SKIP_KEYS.has(keyName)) {
      return obj;
    }

    if (typeof obj === 'string') {
      const clean = obj.trim();
      if (!clean) return obj;
      if (translationMap[obj]) {
        stats.count++;
        return translationMap[obj];
      }
      if (translationMap[clean]) {
        stats.count++;
        return obj.replace(clean, translationMap[clean]);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._deepTranslateJson(item, translationMap, sortedKeys, stats, keyName));
    }

    if (typeof obj === 'object' && obj !== null) {
      // Se for um Event Command técnico (355/655 Script, 356/357 Plugin, 108/408 Comment, etc.), não alterar parâmetros
      if (typeof obj.code === 'number') {
        const NON_DIALOGUE_CODES = new Set([355, 655, 356, 357, 108, 408, 111, 122, 123, 231, 232, 281, 241, 245, 249, 250, 132, 133, 139, 322, 323]);
        if (NON_DIALOGUE_CODES.has(obj.code)) {
          // Exceção: diálogos prefixados com テキスト-
          if ((obj.code === 355 || obj.code === 655) && Array.isArray(obj.parameters) && typeof obj.parameters[0] === 'string' && obj.parameters[0].startsWith('テキスト-')) {
            // Permite processar a mensagem
          } else {
            return obj;
          }
        }
      }

      const newObj = {};
      for (const key of Object.keys(obj)) {
        if (SKIP_KEYS.has(key)) {
          newObj[key] = obj[key];
          continue;
        }
        newObj[key] = this._deepTranslateJson(obj[key], translationMap, sortedKeys, stats, key);
      }
      return newObj;
    }

    return obj;
  }

  /**
   * Inject translations into MV/MZ JSON and TXT files safely.
   */
  async injectTranslation({ gameDir, translationMap, options = {} }) {
    try {
      const dataDir = fs.existsSync(path.join(gameDir, 'www', 'data'))
        ? path.join(gameDir, 'www', 'data')
        : path.join(gameDir, 'data');

      if (!fs.existsSync(dataDir)) {
        throw new Error(`Data directory not found in ${gameDir}`);
      }

      let stats = { count: 0 };
      let injectedFiles = [];
      const sortedKeys = Object.keys(translationMap || {}).sort((a, b) => b.length - a.length);

      // Process target JSON and TXT files recursively (including subfolders like data/scenarios/)
      const targetFiles = this._getAllDataFiles(dataDir, ['.json', '.txt']);

      for (const filePath of targetFiles) {
        try {
          const isJson = filePath.toLowerCase().endsWith('.json');
          const rawContent = fs.readFileSync(filePath, 'utf-8');

          if (isJson) {
            const jsonParsed = JSON.parse(rawContent);
            const initialCount = stats.count;
            const translatedJson = this._deepTranslateJson(jsonParsed, translationMap || {}, sortedKeys, stats);

            if (stats.count > initialCount) {
              fs.writeFileSync(filePath, JSON.stringify(translatedJson, null, 2), 'utf-8');
              injectedFiles.push(filePath);
            }
          } else {
            // Process TXT files line by line
            let lines = rawContent.split(/\r?\n/);
            let fileModified = false;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const clean = line.trim();
              if (translationMap[line]) {
                lines[i] = translationMap[line];
                stats.count++;
                fileModified = true;
              } else if (clean && translationMap[clean]) {
                lines[i] = line.replace(clean, translationMap[clean]);
                stats.count++;
                fileModified = true;
              }
            }

            if (fileModified) {
              fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
              injectedFiles.push(filePath);
            }
          }
        } catch (fileErr) {
          // Continue processing remaining files cleanly
        }
      }

      return {
        success: true,
        engine: 'RPG_MAKER_MV_MZ',
        injectedFiles,
        count: stats.count
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_MV_MZ',
        injectedFiles: [],
        count: 0,
        error: err.message
      };
    }
  }

  /**
   * Apply PT-BR font patch via fonts/gamefont.css for MV/MZ.
   */
  async applyFontPatch({ gameDir, fontFile, options = {} }) {
    try {
      const fontsDir = fs.existsSync(path.join(gameDir, 'www', 'fonts'))
        ? path.join(gameDir, 'www', 'fonts')
        : path.join(gameDir, 'fonts');

      if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
      }

      let patchedFiles = [];
      const cssPath = path.join(fontsDir, 'gamefont.css');

      if (fontFile && fs.existsSync(fontFile)) {
        const destFont = path.join(fontsDir, path.basename(fontFile));
        fs.copyFileSync(fontFile, destFont);
        patchedFiles.push(destFont);

        const cssContent = `@font-face {
  font-family: GameFont;
  src: url("${path.basename(fontFile)}");
}
`;
        fs.writeFileSync(cssPath, cssContent, 'utf-8');
        patchedFiles.push(cssPath);
      }

      return {
        success: true,
        engine: 'RPG_MAKER_MV_MZ',
        patchedFiles
      };
    } catch (err) {
      return {
        success: false,
        engine: 'RPG_MAKER_MV_MZ',
        patchedFiles: [],
        error: err.message
      };
    }
  }

  /**
   * Cleanup temporary extract artifacts.
   */
  async cleanup({ gameDir, options = {} }) {
    return { success: true, engine: 'RPG_MAKER_MV_MZ' };
  }
}

module.exports = RpgMakerMvMzHandler;
