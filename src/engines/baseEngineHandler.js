/**
 * BaseEngineHandler - Abstract base class defining the strict contract
 * for all OpenTranslator game engine modules (Ren'Py, RPG Maker, Unity, Godot, etc.).
 */

class BaseEngineHandler {
  constructor(engineName) {
    if (new.target === BaseEngineHandler) {
      throw new Error("BaseEngineHandler is an abstract class and cannot be instantiated directly.");
    }
    this.engineName = engineName || "UnknownEngine";
  }

  /**
   * Extracts text, dialogues, and game assets into translatable structures.
   * @param {Object} params - { gameDir, gameExe, title, options }
   * @returns {Promise<{ success: boolean, extractedFiles: string[], totalEntries: number }>}
   */
  async extract(params) {
    throw new Error(`[${this.engineName}] Method 'extract()' must be implemented by subclass.`);
  }

  /**
   * Injects translated texts back into game files or runtime structures.
   * @param {Object} params - { gameDir, translationMap, options }
   * @returns {Promise<{ success: boolean, injectedFiles: string[], count: number }>}
   */
  async injectTranslation(params) {
    throw new Error(`[${this.engineName}] Method 'injectTranslation()' must be implemented by subclass.`);
  }

  /**
   * Applies PT-BR font patches and font CSS / font replacement.
   * @param {Object} params - { gameDir, fontFile, options }
   * @returns {Promise<{ success: boolean, patchedFiles: string[] }>}
   */
  async applyFontPatch(params) {
    throw new Error(`[${this.engineName}] Method 'applyFontPatch()' must be implemented by subclass.`);
  }

  /**
   * Performs cleanup of temporary scripts, sidecar caches, or unpack artifacts.
   * @param {Object} params - { gameDir, options }
   * @returns {Promise<{ success: boolean }>}
   */
  async cleanup(params) {
    throw new Error(`[${this.engineName}] Method 'cleanup()' must be implemented by subclass.`);
  }
}

module.exports = BaseEngineHandler;
