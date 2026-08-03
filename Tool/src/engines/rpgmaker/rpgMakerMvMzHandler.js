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

      // Step 2: Read JSON files
      const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      const extractedFiles = jsonFiles.map(f => path.join(dataDir, f));

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
      "url", "icon", "audio", "bgm", "bgs", "me", "se", "note",
      "code", "meta"
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
   * Inject translations into MV/MZ JSON files safely via Deep Walk JSON parsing.
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

      // Process target JSON files (Actors, Items, Skills, Maps, System)
      const targetFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

      for (const file of targetFiles) {
        const filePath = path.join(dataDir, file);
        try {
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const jsonParsed = JSON.parse(rawContent);
          const initialCount = stats.count;
          
          const translatedJson = this._deepTranslateJson(jsonParsed, translationMap || {}, sortedKeys, stats);

          if (stats.count > initialCount) {
            fs.writeFileSync(filePath, JSON.stringify(translatedJson, null, 2), 'utf-8');
            injectedFiles.push(filePath);
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
