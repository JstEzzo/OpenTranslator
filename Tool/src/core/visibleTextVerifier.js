/**
 * OpenTranslator - VisibleTextVerifier
 * 
 * Verificador factual e conceitualmente rigoroso de texto:
 * Categorias suportadas:
 * - FILE_VERIFIED: Comprova a presença física da string traduzida no arquivo de dados do jogo.
 * - RUNTIME_VERIFIED: Interceptação em memória do processo via hook.
 * - DOM_VERIFIED: Inspeção direta de nós de texto em jogos Electron / Web.
 * - SCREEN_VERIFIED: Observação visual comprovada na tela / pixels / HUD Overlay.
 * 
 * Regra obrigatória: FILE_VERIFIED NUNCA é classificado como visual. Apenas SCREEN_VERIFIED.
 */

const fs = require('fs');

class VisibleTextVerifier {
  /**
   * Verifica presença física do texto no arquivo de dados (FILE_VERIFIED)
   */
  static verifyFileContent(filePath, expectedTranslation) {
    const timestamp = Date.now();
    if (!fs.existsSync(filePath)) {
      return {
        type: 'FILE_VERIFIED',
        verified: false,
        method: 'FILE_CONTENT_VERIFICATION',
        expected: expectedTranslation,
        observed: null,
        error: `Arquivo não encontrado: ${filePath}`,
        timestamp
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const found = content.includes(expectedTranslation);

      return {
        type: 'FILE_VERIFIED',
        verified: found,
        method: 'FILE_CONTENT_VERIFICATION',
        filePath,
        expected: expectedTranslation,
        observed: found ? expectedTranslation : '[NOT_FOUND_IN_FILE]',
        timestamp
      };
    } catch (e) {
      return {
        type: 'FILE_VERIFIED',
        verified: false,
        method: 'FILE_CONTENT_VERIFICATION',
        expected: expectedTranslation,
        observed: null,
        error: e.message,
        timestamp
      };
    }
  }

  /**
   * Registra observação interceptada em memória (RUNTIME_VERIFIED)
   */
  static recordRuntimeObservation(observedText, expectedText, componentId = 'unknown') {
    const timestamp = Date.now();
    const verified = (observedText === expectedText || observedText.includes(expectedText));

    return {
      type: 'RUNTIME_VERIFIED',
      verified,
      method: 'RUNTIME_TEXT_HOOK',
      componentId,
      expected: expectedText,
      observed: observedText,
      timestamp
    };
  }

  /**
   * Registra observação visual na tela (SCREEN_VERIFIED)
   */
  static recordScreenObservation(observedScreenText, expectedText, context = {}) {
    const timestamp = Date.now();
    const verified = (observedScreenText === expectedText || observedScreenText.includes(expectedText));

    return {
      type: 'SCREEN_VERIFIED',
      verified,
      method: context.method || 'SCREEN_SAMPLING',
      expected: expectedText,
      observed: observedScreenText,
      timestamp
    };
  }

  /**
   * Gera o artefato formal de evidência e2e-result.json
   */
  static buildEvidenceArtifact(params = {}) {
    const fileVer = params.fileVerified !== undefined ? params.fileVerified : (params.file?.verified || false);
    const runtimeVer = params.runtimeVerified !== undefined ? params.runtimeVerified : (params.runtime?.verified || false);
    const screenVer = params.screenVerified || params.visual?.verified || false;
    const rollVer = params.rollbackVerified !== undefined ? Boolean(params.rollbackVerified) : Boolean(params.rollback?.verified);

    return {
      game: params.game || 'unknown_game',
      gameHash: params.gameHash || '',
      engine: params.engine || 'generic',
      method: params.method || 'METHOD_A_STATIC',
      sourceText: params.sourceText || '',
      translation: params.translation || '',
      fileEvidence: { verified: fileVer, samples: params.fileSamples || [] },
      runtimeEvidence: { verified: runtimeVer, samples: params.runtimeSamples || [] },
      visualEvidence: { verified: screenVer, samples: params.screenSamples || [] },
      rollbackEvidence: { verified: rollVer, sha256Matched: rollVer },
      // Aliases de compatibilidade
      file: { verified: fileVer },
      runtime: { verified: runtimeVer },
      visual: { verified: screenVer },
      rollback: { verified: rollVer, sha256Matched: rollVer },
      timestamp: Date.now()
    };
  }
}

module.exports = VisibleTextVerifier;
