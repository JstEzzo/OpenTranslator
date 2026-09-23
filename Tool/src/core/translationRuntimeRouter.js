/**
 * OpenTranslator - TranslationRuntimeRouter 2.0
 * 
 * Roteador inteligente de estratégias de tradução com explicabilidade completa.
 * Avalia a tríade (Engine, Runtime, Framework), integridade de arquivos e capacidades
 * para selecionar a estratégia ótima e registrar suas limitações.
 */

class TranslationRuntimeRouter {
  static selectStrategy(gameContext = {}) {
    const engine = (gameContext.engine || 'unknown').toLowerCase();
    const runtime = (gameContext.runtime || 'unknown').toLowerCase();
    const framework = (gameContext.framework || 'unknown').toLowerCase();
    const hasBridge = Boolean(gameContext.hasBridge);

    const result = {
      strategy: 'STATIC_PATCH',
      confidence: 0.5,
      reasons: [],
      alternatives: [],
      limitations: []
    };

    // 1. Ren'Py
    if (engine.includes('renpy') || engine.includes('ren')) {
      result.strategy = 'NATIVE_TRANSLATION';
      result.confidence = 0.95;
      result.reasons.push('Ren\'Py possui subsistema nativo de localização (game/tl/)');
      result.reasons.push('Preserva sintaxe do script de diálogo e variáveis de jogo');
      result.alternatives = ['STATIC_PATCH', 'OVERLAY'];
      result.limitations.push('Requer compilação rpyc ou script rpy acessível');
      return result;
    }

    // 2. RPG Maker MV / MZ (NW.js / Chromium)
    if (engine.includes('mv') || engine.includes('mz') || runtime.includes('nw.js') || runtime.includes('pixi')) {
      result.strategy = 'RUNTIME_JS';
      result.confidence = 0.92;
      result.reasons.push('Runtime JavaScript (NW.js) permite instrumentação via WebSocket Hook 16005');
      result.reasons.push('Capaz de interceptar Window_Message, Scene_Message e Bitmap.drawText em tempo real');
      result.alternatives = ['STATIC_PATCH', 'DOM_RUNTIME'];
      result.limitations.push('Exige que a janela do jogo inicie e carregue index.html no staging');
      return result;
    }

    // 3. Electron / HTML5
    if (engine.includes('electron') || runtime.includes('electron')) {
      result.strategy = 'DOM_RUNTIME';
      result.confidence = 0.88;
      result.reasons.push('Electron expõe árvore DOM manipulável via preload bridge ou MutationObserver');
      result.alternatives = ['STATIC_PATCH', 'OVERLAY'];
      result.limitations.push('Textos desenhados em WebGL Canvas exigem OCR ou hook de API gráfico');
      return result;
    }

    // 4. Unity Mono com TextMeshPro
    if (engine.includes('unity') && (runtime.includes('mono') || hasBridge)) {
      result.strategy = 'TMP_RUNTIME';
      result.confidence = 0.82;
      result.reasons.push('Unity Mono permite inspeção de assemblies gerenciados e hooking de TextMeshPro');
      result.alternatives = ['STATIC_PATCH', 'OVERLAY'];
      result.limitations.push('Requer presença de assemblies Managed na pasta _Data');
      return result;
    }

    // 5. Unity IL2CPP
    if (engine.includes('unity') && runtime.includes('il2cpp')) {
      result.strategy = 'STATIC_PATCH';
      result.confidence = 0.65;
      result.reasons.push('GameAssembly.dll detectada (Unity IL2CPP)');
      result.reasons.push('Patch estático em bundles de assets (.assets/.bundle) recomendado na ausência de bridge nativa compilada');
      result.alternatives = ['OVERLAY', 'OCR', 'EXPERIMENTAL_IL2CPP_BRIDGE'];
      result.limitations.push('Hook de runtime IL2CPP requer ponte binária nativa compilada (CLASSIFICADO COMO EXPERIMENTAL)');
      return result;
    }

    // 6. Generic / Unknown
    result.strategy = 'STATIC_PATCH';
    result.confidence = 0.60;
    result.reasons.push('Engine genérica ou desconhecida: prioriza descoberta forense de arquivos de texto (JSON, CSV, PO, RPY)');
    result.alternatives = ['OVERLAY', 'OCR', 'MANUAL_REVIEW'];
    result.limitations.push('Substituições devem ser validadas estritamente via manifesto e rollback');
    return result;
  }
}

module.exports = TranslationRuntimeRouter;
