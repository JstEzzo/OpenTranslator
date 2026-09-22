/**
 * OpenTranslator — PluginSDK
 * 
 * Especificações oficiais de interface e testes de conformidade para plugins:
 * 1. EngineAdapter: detect, extract, apply, rollback, getCapabilities
 * 2. TextProvider: parse, serialize, protect, restore
 * 3. RuntimeProvider: observeProcess, getCapabilities
 * 4. HookProvider: attach, verify, replaceText, restoreText, detach, cleanup
 * 5. ArchiveProvider: open, listFiles, readFile, close
 * 6. OCRProvider: recognize, isReady
 * 7. TranslationProvider: translate, translateBatch, healthCheck, supportsLanguagePair
 * 8. OutputProvider: deliver
 * 
 * Crash Containment: safeExecute isola exceções de plugins de terceiros garantindo que
 * o core, o servidor HTTP e a interface gráfica permaneçam 100% online.
 */

class PluginSDK {
  /**
   * Executa um método de plugin com isolamento estrito de falhas (Crash Containment)
   */
  static async safeExecute(plugin, methodName, args = [], fallback = null) {
    if (!plugin || typeof plugin[methodName] !== 'function') {
      return { success: false, error: `Método ${methodName} não implementado no plugin`, result: fallback };
    }

    try {
      const result = await plugin[methodName](...args);
      return { success: true, result, error: null };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        stack: err.stack,
        result: fallback
      };
    }
  }

  /**
   * Teste de conformidade para EngineAdapter
   */
  static testEngineAdapterConformance(adapter) {
    const required = ['detect', 'extract', 'apply', 'rollback', 'getCapabilities'];
    const missing = required.filter(m => typeof adapter[m] !== 'function');
    return {
      conforms: missing.length === 0,
      type: 'EngineAdapter',
      missingMethods: missing
    };
  }

  /**
   * Teste de conformidade para HookProvider
   */
  static testHookProviderConformance(provider) {
    const required = ['attach', 'verify', 'replaceText', 'restoreText', 'detach', 'cleanup', 'getCapabilities'];
    const missing = required.filter(m => typeof provider[m] !== 'function');
    return {
      conforms: missing.length === 0,
      type: 'HookProvider',
      missingMethods: missing
    };
  }

  /**
   * Teste de conformidade para ArchiveProvider
   */
  static testArchiveProviderConformance(provider) {
    const required = ['open', 'listFiles', 'readFile', 'close'];
    const missing = required.filter(m => typeof provider[m] !== 'function');
    return {
      conforms: missing.length === 0,
      type: 'ArchiveProvider',
      missingMethods: missing
    };
  }

  /**
   * Teste de conformidade para TranslationProvider
   */
  static testTranslationProviderConformance(provider) {
    const required = ['translate', 'translateBatch', 'healthCheck', 'supportsLanguagePair'];
    const missing = required.filter(m => typeof provider[m] !== 'function');
    return {
      conforms: missing.length === 0,
      type: 'TranslationProvider',
      missingMethods: missing
    };
  }
}

module.exports = PluginSDK;
