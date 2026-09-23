/**
 * OpenTranslator - VisibleTextVerifier
 * 
 * Verificador factual de texto visível ou em arquivo de saída:
 * Métodos suportados:
 * - FILE_CONTENT_VERIFICATION: Comprova a presença física da string traduzida no arquivo de dados do jogo.
 * - RUNTIME_TEXT_OBSERVATION: Observação direta em memória de processo interceptada por hook.
 * - DOM_QUERY: Inspeção de nós de texto em jogos Electron / Web.
 * - KNOWN_UI_STATE: Verificação de catálogo oficial de tradução nativo (ex: game/tl/<lang>/).
 */

const fs = require('fs');

class VisibleTextVerifier {
  /**
   * Verifica se o texto traduzido esperado está comprovadamente presente no arquivo de saída
   */
  static verifyFileContent(filePath, expectedTranslation) {
    const timestamp = Date.now();
    if (!fs.existsSync(filePath)) {
      return {
        verified: false,
        method: 'FILE_CONTENT_VERIFICATION',
        expected: expectedTranslation,
        observed: null,
        error: `Arquivo de destino não encontrado: ${filePath}`,
        timestamp
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const found = content.includes(expectedTranslation);

      return {
        verified: found,
        method: 'FILE_CONTENT_VERIFICATION',
        filePath,
        expected: expectedTranslation,
        observed: found ? expectedTranslation : '[NOT_FOUND_IN_DESTINATION]',
        timestamp
      };
    } catch (e) {
      return {
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
   * Registra observação de runtime
   */
  static recordRuntimeObservation(observedText, expectedText, componentId = 'unknown') {
    const timestamp = Date.now();
    const verified = (observedText === expectedText || observedText.includes(expectedText));

    return {
      verified,
      method: 'RUNTIME_TEXT_OBSERVATION',
      componentId,
      expected: expectedText,
      observed: observedText,
      timestamp
    };
  }

  /**
   * Gera o artefato formal de evidência e2e-result.json
   */
  static buildEvidenceArtifact(params = {}) {
    return {
      game: params.game || 'unknown_game',
      gameHash: params.gameHash || '',
      engine: params.engine || 'generic',
      method: params.method || 'METHOD_A_STATIC',
      sourceText: params.sourceText || '',
      translation: params.translation || '',
      capture: params.capture || { success: false },
      output: params.output || { success: false },
      runtime: params.runtime || { verified: false },
      visual: params.visual || { verified: false },
      rollback: params.rollback || { verified: false, sha256Matched: false },
      timestamp: Date.now()
    };
  }
}

module.exports = VisibleTextVerifier;
