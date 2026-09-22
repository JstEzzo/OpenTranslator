/**
 * OpenTranslator — EngineRuntimeTriad
 * 
 * Implementa o desacoplamento fundamental em três camadas independentes:
 * 1. Engine: Motor de jogo (Unity, Unreal, Godot, Electron, Ren'Py, RPG Maker, Wolf, etc.)
 * 2. Runtime: Ambiente de execução do código (IL2CPP, Mono, Native x86/x64, V8, Python, Ruby)
 * 3. Text Framework: Subsistema de renderização/armazenamento de texto (TextMeshPro, UGUI, UMG/locres, Godot Control, DOM, Ren'Py TL, RPG Maker Message)
 * 
 * Permite que dois jogos da mesma engine (ex: Unity) usem estratégias totalmente diferentes
 * dependendo do runtime (Mono vs IL2CPP) e do text framework (UGUI vs TextMeshPro).
 */

const fs = require('fs');
const path = require('path');

class EngineRuntimeTriad {
  /**
   * Resolve a tríade (Engine -> Runtime -> Text Framework) para um jogo.
   * @param {object} params
   * @param {string} params.gameDir
   * @param {string} [params.exePath]
   * @param {object} [params.detection] - Resultado do EngineDetector se já disponível
   * @param {Array<string>} [params.loadedModules] - DLLs/Módulos carregados em runtime
   * @returns {object} Triad resolution
   */
  static resolve(params = {}) {
    const { gameDir, exePath, detection, loadedModules = [] } = params;

    let engine = 'generic';
    let runtime = 'unknown';
    let textFramework = 'unknown';
    const evidence = [];

    // Se detection já foi fornecido, usa como base inicial
    if (detection) {
      engine = detection.engine || 'generic';
    }

    // Identificação aprofundada baseada em arquivos se gameDir fornecido
    if (gameDir && fs.existsSync(gameDir)) {
      const files = fs.readdirSync(gameDir);
      const filesLower = files.map(f => f.toLowerCase());

      // 1. GODOT DETECTION
      const hasGodot = filesLower.includes('project.godot') ||
                        filesLower.some(f => f.endsWith('.pck')) ||
                        filesLower.some(f => f.includes('godot'));
      if (hasGodot) {
        engine = 'godot';
        runtime = 'native';
        textFramework = 'godot_control';
        evidence.push('Estrutura Godot detectada (project.godot / .pck)');
      }

      // 2. UNREAL ENGINE DETECTION
      const hasUnreal = filesLower.includes('engine') ||
                        filesLower.some(f => f.endsWith('.uproject')) ||
                        fs.existsSync(path.join(gameDir, 'Content', 'Paks')) ||
                        fs.existsSync(path.join(gameDir, 'Content', 'Localization')) ||
                        files.some(f => fs.existsSync(path.join(gameDir, f, 'Content', 'Paks')));
      if (hasUnreal) {
        engine = 'unreal';
        runtime = 'native';
        textFramework = 'umg_locres';
        evidence.push('Estrutura Unreal Engine detectada (Paks / Localization)');
      }

      // 3. UNITY DETECTION & DECOUPLING
      const hasUnity = filesLower.includes('unityplayer.dll') ||
                       filesLower.some(f => f.endsWith('_data'));
      if (hasUnity || engine === 'unity') {
        engine = 'unity';
        const dataFolder = files.find(f => f.toLowerCase().endsWith('_data'));
        const dataPath = dataFolder ? path.join(gameDir, dataFolder) : '';

        const hasIl2cpp = filesLower.includes('gameassembly.dll') ||
                          (dataPath && fs.existsSync(path.join(dataPath, 'il2cpp_data')));
        const hasMono = filesLower.includes('monobleedingedge') ||
                        (dataPath && fs.existsSync(path.join(dataPath, 'managed')));

        if (hasIl2cpp) {
          runtime = 'il2cpp';
          evidence.push('Runtime Unity IL2CPP compilado nativo');
        } else if (hasMono) {
          runtime = 'mono';
          evidence.push('Runtime Unity Mono (.NET Managed)');
        } else {
          runtime = 'unity_generic';
        }

        // Text Framework inspection
        if (dataPath && fs.existsSync(path.join(dataPath, 'managed'))) {
          try {
            const managedFiles = fs.readdirSync(path.join(dataPath, 'managed')).map(f => f.toLowerCase());
            if (managedFiles.some(f => f.includes('textmeshpro') || f.includes('unity.textmeshpro'))) {
              textFramework = 'textmeshpro';
              evidence.push('Text Framework TextMeshPro detectado no Managed assemblies');
            } else if (managedFiles.some(f => f.includes('unityengine.ui'))) {
              textFramework = 'ugui';
              evidence.push('Text Framework UGUI detectado no Managed assemblies');
            }
            if (managedFiles.some(f => f.includes('unity.localization'))) {
              evidence.push('Unity Localization Package oficial presente');
            }
          } catch (e) {}
        }
      }

      // 4. ELECTRON / NW.JS DETECTION & DECOUPLING
      const hasAsar = fs.existsSync(path.join(gameDir, 'resources', 'app.asar')) ||
                      fs.existsSync(path.join(gameDir, 'app.asar'));
      const hasV8 = filesLower.includes('v8_context_snapshot.bin') ||
                    filesLower.includes('resources.pak') ||
                    filesLower.includes('nw.exe');
      if (hasAsar || hasV8 || engine === 'electron') {
        engine = (engine === 'mz' || engine === 'mv') ? engine : 'electron';
        runtime = 'v8';
        textFramework = (engine === 'mz' || engine === 'mv') ? 'rpgmaker_window' : 'dom';
        evidence.push('Runtime V8/Chromium com DOM/JavaScript');
      }

      // 5. REN'PY DETECTION & DECOUPLING
      if (engine === 'renpy' || filesLower.includes('game')) {
        const gameSub = path.join(gameDir, 'game');
        if (fs.existsSync(gameSub)) {
          engine = 'renpy';
          const libDir = path.join(gameDir, 'lib');
          if (fs.existsSync(path.join(libDir, 'py3-windows-x86_64'))) {
            runtime = 'python3';
          } else if (fs.existsSync(path.join(libDir, 'windows-i686'))) {
            runtime = 'python2';
          } else {
            runtime = 'python';
          }
          textFramework = 'renpy_tl';
          evidence.push('Ren\'Py Dialogue and String Localization Framework');
        }
      }

      // 6. RPG MAKER RGSS (RUBY)
      if (engine === 'rgss') {
        runtime = 'ruby';
        textFramework = 'rgss_window';
        evidence.push('Runtime Ruby RGSS com Window_Base/Message');
      }
    }

    // Loaded modules runtime refinement
    if (loadedModules.length > 0) {
      if (loadedModules.some(m => /textmeshpro/i.test(m))) {
        textFramework = 'textmeshpro';
        evidence.push('TextMeshPro carregado no processo ativo');
      } else if (loadedModules.some(m => /unityengine\.ui/i.test(m))) {
        textFramework = 'ugui';
        evidence.push('UGUI carregado no processo ativo');
      }
      if (loadedModules.some(m => /gameassembly\.dll/i.test(m))) {
        runtime = 'il2cpp';
      } else if (loadedModules.some(m => /mono/i.test(m))) {
        runtime = 'mono';
      }
    }

    // Determina capacidades e método preferido com base na tríade
    const { capabilities, preferredMethod, fallbackChain } = EngineRuntimeTriad._evaluateCapabilities(engine, runtime, textFramework);

    return {
      engine,
      runtime,
      textFramework,
      evidence,
      capabilities,
      preferredMethod,
      fallbackChain,
      triadKey: `${engine}::${runtime}::${textFramework}`
    };
  }

  static _evaluateCapabilities(engine, runtime, textFramework) {
    let preferredMethod = 'METHOD_F_OVERLAY';
    const fallbackChain = [];
    const capabilities = {
      staticExtraction: false,
      nativeLocalization: false,
      runtimeHook: false,
      domInjection: false,
      uiReplacement: false,
      overlay: true,
      ocr: true,
      locresBinary: false,
      godotCsvPo: false,
      asarVirtual: false
    };

    if (engine === 'renpy') {
      preferredMethod = 'METHOD_B_NATIVE';
      fallbackChain.push('METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
      capabilities.nativeLocalization = true;
      capabilities.staticExtraction = true;
    } else if (engine === 'mz' || engine === 'mv') {
      preferredMethod = 'METHOD_A_STATIC';
      fallbackChain.push('METHOD_C_RUNTIME', 'METHOD_E_DOM_WEB', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
      capabilities.staticExtraction = true;
      capabilities.domInjection = true;
      capabilities.runtimeHook = true;
    } else if (engine === 'electron') {
      preferredMethod = 'METHOD_A_STATIC';
      fallbackChain.push('METHOD_E_DOM_WEB', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
      capabilities.staticExtraction = true;
      capabilities.asarVirtual = true;
      capabilities.domInjection = true;
    } else if (engine === 'godot') {
      preferredMethod = 'METHOD_B_NATIVE';
      fallbackChain.push('METHOD_A_STATIC', 'METHOD_D_UI_FRAMEWORK', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
      capabilities.nativeLocalization = true;
      capabilities.godotCsvPo = true;
      capabilities.uiReplacement = true;
    } else if (engine === 'unreal') {
      preferredMethod = 'METHOD_B_NATIVE';
      fallbackChain.push('METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
      capabilities.nativeLocalization = true;
      capabilities.locresBinary = true;
      capabilities.staticExtraction = true;
    } else if (engine === 'unity') {
      if (runtime === 'mono') {
        preferredMethod = 'METHOD_C_RUNTIME';
        fallbackChain.push('METHOD_D_UI_FRAMEWORK', 'METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
        capabilities.runtimeHook = true;
        capabilities.uiReplacement = true;
      } else {
        // IL2CPP
        preferredMethod = 'METHOD_D_UI_FRAMEWORK';
        fallbackChain.push('METHOD_A_STATIC', 'METHOD_F_OVERLAY', 'METHOD_G_OCR');
        capabilities.uiReplacement = true;
        capabilities.runtimeHook = false;
      }
    } else {
      // Generic / Unknown
      preferredMethod = 'METHOD_F_OVERLAY';
      fallbackChain.push('METHOD_G_OCR', 'METHOD_A_STATIC');
    }

    return { capabilities, preferredMethod, fallbackChain };
  }
}

module.exports = EngineRuntimeTriad;
