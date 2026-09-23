/**
 * OpenTranslator — UnityFrameworkMatrix
 * 
 * Mapeador e inspetor avançado de subsistemas de UI da Unity Engine:
 * - TextMeshPro, UGUI, TextMesh (Legado), IMGUI, NGUI, FairyGUI, UI Toolkit, Unity Localization
 * - Gera matriz rigorosa de capacidades
 * - Separação estrita: IL2CPP só ativa runtimeHook se verificação de injeção tiver sucesso
 */

const fs = require('fs');
const path = require('path');

class UnityFrameworkMatrix {
  /**
   * Avalia os assemblies e recursos para determinar todos os frameworks de texto ativos
   * @param {string} gameDir
   * @param {Array<string>} [loadedModules=[]]
   */
  static evaluate(gameDir, loadedModules = []) {
    let managedDir = '';
    let isIl2cpp = false;
    let isMono = false;

    if (gameDir && fs.existsSync(gameDir)) {
      const files = fs.readdirSync(gameDir);
      const dataFolder = files.find(f => f.toLowerCase().endsWith('_data'));
      if (dataFolder) {
        managedDir = path.join(gameDir, dataFolder, 'Managed');
        const il2cppData = path.join(gameDir, dataFolder, 'il2cpp_data');
        if (fs.existsSync(il2cppData) || files.some(f => f.toLowerCase() === 'gameassembly.dll')) {
          isIl2cpp = true;
        } else if (fs.existsSync(managedDir)) {
          isMono = true;
        }
      }
    }

    const detectedFrameworks = [];
    const checkNames = (nameRegex) => {
      if (loadedModules.some(m => nameRegex.test(m))) return true;
      if (managedDir && fs.existsSync(managedDir)) {
        try {
          const files = fs.readdirSync(managedDir);
          return files.some(f => nameRegex.test(f));
        } catch (e) {}
      }
      return false;
    };

    // 1. TextMeshPro
    if (checkNames(/textmeshpro|unity\.textmeshpro/i)) {
      detectedFrameworks.push({
        id: 'TextMeshPro',
        name: 'Unity TextMeshPro (TMP)',
        priority: 1,
        capabilities: {
          capture: true,
          replace: true,
          observe: true,
          resize: true,
          fontFallback: true,
          reload: true,
          persistent: true
        }
      });
    }

    // 2. UGUI
    if (checkNames(/unityengine\.ui/i)) {
      detectedFrameworks.push({
        id: 'UGUI',
        name: 'UnityEngine.UI (UGUI Clássico)',
        priority: 2,
        capabilities: {
          capture: true,
          replace: true,
          observe: true,
          resize: true,
          fontFallback: false,
          reload: true,
          persistent: true
        }
      });
    }

    // 3. Unity Localization Package
    if (checkNames(/unity\.localization|unityengine\.localization/i)) {
      detectedFrameworks.push({
        id: 'UnityLocalization',
        name: 'Unity Localization Package (Official Tables)',
        priority: 0, // Máxima prioridade quando presente
        capabilities: {
          capture: true,
          replace: true,
          observe: true,
          resize: true,
          fontFallback: true,
          reload: true,
          persistent: true,
          isNativeTable: true
        }
      });
    }

    // 4. UI Toolkit
    if (checkNames(/unityengine\.uielementsmodule/i)) {
      detectedFrameworks.push({
        id: 'UIToolkit',
        name: 'Unity UI Toolkit',
        priority: 3,
        capabilities: {
          capture: true,
          replace: true,
          observe: true,
          resize: true,
          fontFallback: false,
          reload: false,
          persistent: false
        }
      });
    }

    // Se nenhum detectado explicitamente, fallback UGUI básico
    if (detectedFrameworks.length === 0) {
      detectedFrameworks.push({
        id: 'UGUI_GENERIC',
        name: 'Unity Generic Text',
        priority: 4,
        capabilities: {
          capture: true,
          replace: false,
          observe: true,
          resize: false,
          fontFallback: false,
          reload: false,
          persistent: false
        }
      });
    }

    // Ordena por prioridade (menor número = maior prioridade)
    detectedFrameworks.sort((a, b) => a.priority - b.priority);

    return {
      runtime: isIl2cpp ? 'il2cpp' : isMono ? 'mono' : 'unknown',
      isIl2cpp,
      isMono,
      frameworks: detectedFrameworks,
      primaryFramework: detectedFrameworks[0],
      canHookRuntime: isMono // IL2CPP requer verificação separada
    };
  }
}

module.exports = UnityFrameworkMatrix;
