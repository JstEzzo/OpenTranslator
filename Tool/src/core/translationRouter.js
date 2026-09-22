/**
 * TranslationRouter — Decide deterministicamente o melhor método de tradução.
 * Métodos suportados:
 * - METHOD_A_STATIC: Modificação de arquivos estáticos (JSON, CSV, PO, etc.)
 * - METHOD_B_NATIVE: Tradução nativa da engine (Ren'Py tl/<lang>, etc.)
 * - METHOD_C_RUNTIME_HOOK: Injeção de hooks nativos em runtime
 * - METHOD_D_UI_FRAMEWORK: Frameworks de texto (TextMeshPro, UGUI, etc.)
 * - METHOD_E_DOM_WEB: DOM Observer para Electron/NW.js
 * - METHOD_F_OVERLAY: Tradução em overlay visual sem alterar arquivos
 * - METHOD_G_OCR: Fallback visual universal
 */
class TranslationRouter {
  static route(gameProfile = {}, options = {}) {
    const engine = (gameProfile.engine || '').toLowerCase();
    const runtime = (gameProfile.runtime || '').toLowerCase();
    const packaging = (gameProfile.packaging || '').toLowerCase();
    const textSystem = (gameProfile.textSystem || '').toLowerCase();

    // 1. Forçado por preferência de usuário
    if (options.forceMode) {
      return {
        selectedMethod: options.forceMode,
        reason: 'FORCED_BY_USER_CONFIGURATION',
        confidence: 1.0,
        risk: 'USER_CONTROLLED',
        fallbackChain: ['METHOD_F_OVERLAY', 'METHOD_G_OCR']
      };
    }

    // 2. Ren'Py -> Método B Nativo
    if (engine.includes('renpy') || engine.includes("ren'py")) {
      return {
        selectedMethod: 'METHOD_B_NATIVE',
        provider: 'RenpyNativeProvider',
        reason: "Engine possui suporte oficial a tradução nativa em game/tl/<lang>.",
        confidence: 0.98,
        risk: 'LOW',
        fallbackChain: ['METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR']
      };
    }

    // 3. Electron / NW.js / Web -> Método E DOM
    if (engine.includes('electron') || engine.includes('nwjs') || runtime.includes('v8') || packaging.includes('asar')) {
      return {
        selectedMethod: 'METHOD_E_DOM_WEB',
        provider: 'DOMTextProvider',
        reason: 'Aplicação baseada em Chromium/V8 com árvore DOM interceptável.',
        confidence: 0.95,
        risk: 'LOW',
        fallbackChain: ['METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR']
      };
    }

    // 4. RPG Maker MV / MZ -> Método A Estático JSON
    if (engine.includes('mv') || engine.includes('mz') || packaging.includes('loose_json')) {
      return {
        selectedMethod: 'METHOD_A_STATIC',
        provider: 'RpgMakerStaticProvider',
        reason: 'Estrutura de dados em JSON estático descompactado.',
        confidence: 0.95,
        risk: 'LOW',
        fallbackChain: ['METHOD_E_DOM_WEB', 'METHOD_F_OVERLAY', 'METHOD_G_OCR']
      };
    }

    // 5. Unity Mono / TextMeshPro -> Método D UI Framework
    if (engine.includes('unity') && (textSystem.includes('textmeshpro') || runtime.includes('mono'))) {
      return {
        selectedMethod: 'METHOD_D_UI_FRAMEWORK',
        provider: 'UnityTextMeshProProvider',
        reason: 'Engine Unity Mono com TextMeshPro/UGUI identificado.',
        confidence: 0.88,
        risk: 'MEDIUM',
        fallbackChain: ['METHOD_F_OVERLAY', 'METHOD_G_OCR']
      };
    }

    // 6. Unity IL2CPP -> Fallback Overlay / OCR (Sem hook perigoso)
    if (engine.includes('unity') && runtime.includes('il2cpp')) {
      return {
        selectedMethod: 'METHOD_F_OVERLAY',
        provider: 'UniversalOverlayProvider',
        reason: 'Unity IL2CPP nativo compilado sem suporte a hook gerenciado seguro.',
        confidence: 0.80,
        risk: 'LOW',
        fallbackChain: ['METHOD_G_OCR']
      };
    }

    // 7. RPG Maker RGSS ou Wolf -> Método F Overlay ou OCR
    if (engine.includes('rgss') || engine.includes('wolf')) {
      return {
        selectedMethod: 'METHOD_F_OVERLAY',
        provider: 'UniversalOverlayProvider',
        reason: 'Engine nativa com binários proprietários; overlay não invasivo recomendado.',
        confidence: 0.80,
        risk: 'LOW',
        fallbackChain: ['METHOD_G_OCR']
      };
    }

    // 8. Desconhecido -> Overlay com Fallback OCR
    return {
      selectedMethod: 'METHOD_F_OVERLAY',
      provider: 'UniversalOverlayProvider',
      reason: 'Engine desconhecida ou customizada; utilizando visualização segura.',
      confidence: 0.70,
      risk: 'MINIMAL',
      fallbackChain: ['METHOD_G_OCR']
    };
  }
}

module.exports = TranslationRouter;
