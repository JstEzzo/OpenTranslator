/**
 * OpenTranslator - UnityRuntimeCapabilityProbe
 * 
 * Sondador estrito de capacidades do motor Unity.
 * Distingue formalmente Unity Mono de Unity IL2CPP:
 * - IL2CPP é classificado rigorosamente como EXPERIMENTAL / BRIDGE_REQUIRED.
 * - NUNCA afirma que o runtime hook funciona antes de existir ponte nativa compilada
 *   e observação factual em processo real.
 */

const fs = require('fs');
const path = require('path');

class UnityRuntimeCapabilityProbe {
  static probe(gameDir) {
    const absDir = path.resolve(gameDir);
    const result = {
      isUnity: false,
      runtimeType: 'UNKNOWN', // 'MONO', 'IL2CPP', 'UNKNOWN'
      unityVersion: null,
      hasGameAssembly: false,
      hasManagedAssemblies: false,
      frameworks: {
        textMeshPro: false,
        ugui: false,
        localizationPackage: false,
        uiToolkit: false
      },
      capabilities: {
        staticPatch: 'PARTIAL',
        runtimeHook: 'UNAVAILABLE',
        bridgeStatus: 'BRIDGE_REQUIRED'
      },
      clues: []
    };

    if (!fs.existsSync(absDir)) return result;

    // 1. Detecção do executável e pasta _Data
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    let dataDir = null;

    for (const ent of entries) {
      if (ent.isDirectory() && ent.name.toLowerCase().endsWith('_data')) {
        dataDir = path.join(absDir, ent.name);
        result.isUnity = true;
        result.clues.push(`Pasta de dados Unity encontrada: ${ent.name}`);
        break;
      }
    }

    // 2. Detecção de GameAssembly.dll (IL2CPP)
    const gameAssembly = path.join(absDir, 'GameAssembly.dll');
    if (fs.existsSync(gameAssembly)) {
      result.isUnity = true;
      result.hasGameAssembly = true;
      result.runtimeType = 'IL2CPP';
      result.clues.push('GameAssembly.dll encontrada -> Arquitetura IL2CPP confirmada');
      result.capabilities.runtimeHook = 'EXPERIMENTAL';
      result.capabilities.bridgeStatus = 'NATIVE_COMPILED_BRIDGE_REQUIRED';
    }

    // 3. Detecção de Managed / MonoBleedingEdge
    if (dataDir) {
      const managedDir = path.join(dataDir, 'Managed');
      if (fs.existsSync(managedDir)) {
        result.isUnity = true;
        result.hasManagedAssemblies = true;
        if (result.runtimeType !== 'IL2CPP') {
          result.runtimeType = 'MONO';
          result.clues.push('Pasta Managed encontrada -> Runtime Mono detectado');
          result.capabilities.runtimeHook = 'SUPPORTED';
          result.capabilities.bridgeStatus = 'MONO_INSPECTOR_AVAILABLE';
        }

        // Checagem de frameworks específicos
        try {
          const files = fs.readdirSync(managedDir).map(f => f.toLowerCase());
          if (files.some(f => f.includes('textmeshpro') || f.includes('tmp'))) {
            result.frameworks.textMeshPro = true;
            result.clues.push('TextMeshPro assembly detectado');
          }
          if (files.some(f => f.includes('unityengine.ui'))) {
            result.frameworks.ugui = true;
            result.clues.push('Unity UGUI assembly detectado');
          }
          if (files.some(f => f.includes('unity.localization'))) {
            result.frameworks.localizationPackage = true;
            result.clues.push('Unity Localization Package detectado');
          }
        } catch (e) {}
      }
    }

    return result;
  }
}

module.exports = UnityRuntimeCapabilityProbe;
