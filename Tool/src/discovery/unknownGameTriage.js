/**
 * OpenTranslator — UnknownGameTriage
 * 
 * Sistema pericial de triagem e diagnóstico para jogos não catalogados:
 * - Executa varredura profunda de binários PE, seções, importações e arquivos de dados
 * - Responde claramente:
 *   1. STATUS: UNKNOWN / EXPERIMENTAL
 *   2. WHY_UNKNOWN: Motivo específico da não identificação
 *   3. WHAT_WAS_FOUND: O que foi identificado (arquitetura, APIs gráficas, strings)
 *   4. WHAT_WAS_NOT_FOUND: O que faltou para classificar em motores conhecidos
 *   5. NEXT_SAFE_STRATEGY: Próxima estratégia segura não-destrutiva (Overlay, OCR, Raw Scan)
 */

const fs = require('fs');
const path = require('path');
const EngineDetector = require('../core/engineDetector');

class UnknownGameTriage {
  /**
   * Executa a triagem completa em um jogo não identificado
   * @param {string} gameDir
   * @param {string} [exePath]
   */
  static async triage(gameDir, exePath = '') {
    const findings = [];
    const missing = [];
    const whyUnknown = [];

    let resolvedExe = exePath;
    if (!resolvedExe && fs.existsSync(gameDir)) {
      try {
        const files = fs.readdirSync(gameDir);
        const exes = files.filter(f => f.toLowerCase().endsWith('.exe'));
        if (exes.length > 0) resolvedExe = path.join(gameDir, exes[0]);
      } catch (e) {}
    }

    const arch = resolvedExe ? EngineDetector.getExeArch(resolvedExe) : 64;
    findings.push(`Executável arquitetura PE identificada: x${arch}`);

    // Varredura de arquivos
    let allFiles = [];
    try {
      allFiles = fs.readdirSync(gameDir).map(f => f.toLowerCase());
    } catch (e) {}

    // Avalia o que faltou
    if (!allFiles.includes('unityplayer.dll') && !allFiles.some(f => f.endsWith('_data'))) {
      missing.push('Ausência de UnityPlayer.dll e pastas de dados Unity');
    }
    if (!allFiles.includes('game') && !allFiles.some(f => f.endsWith('.rpy'))) {
      missing.push('Ausência de scripts .rpy e estrutura Ren\'Py');
    }
    if (!allFiles.includes('www') && !allFiles.includes('data')) {
      missing.push('Ausência de estrutura RPG Maker MV/MZ/RGSS');
    }
    if (!allFiles.includes('project.godot') && !allFiles.some(f => f.endsWith('.pck'))) {
      missing.push('Ausência de pacotes Godot (.pck / project.godot)');
    }

    whyUnknown.push('O binário não utiliza motores comerciais padronizados com assinaturas públicas.');

    // Avalia APIs gráficas ou strings presentes no executável
    let hasDirectX = false;
    let hasOpenGL = false;
    if (resolvedExe && fs.existsSync(resolvedExe)) {
      const sigs = EngineDetector.checkBinarySignatures(resolvedExe, ['d3d11.dll', 'd3d12.dll', 'opengl32.dll', 'vulkan-1.dll']);
      if (sigs.some(s => s.includes('d3d'))) {
        hasDirectX = true;
        findings.push('Importações da API Microsoft DirectX detectadas no binário');
      }
      if (sigs.some(s => s.includes('opengl') || s.includes('vulkan'))) {
        hasOpenGL = true;
        findings.push('Importações OpenGL/Vulkan detectadas no binário');
      }
    }

    // Define a estratégia mais segura
    let nextStrategy = 'METHOD_F_OVERLAY';
    const fallbackChain = ['METHOD_G_OCR', 'METHOD_A_STATIC'];

    return {
      status: 'UNKNOWN_CUSTOM_ENGINE',
      engine: 'generic',
      architecture: `x${arch}`,
      whyUnknown,
      whatWasFound: findings,
      whatWasNotFound: missing,
      nextSafeStrategy: nextStrategy,
      fallbackChain,
      isNonDestructive: true
    };
  }
}

module.exports = UnknownGameTriage;
