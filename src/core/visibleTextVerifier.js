/**
 * OpenTranslator - VisibleTextVerifier 3.0
 * 
 * Verificador factual e conceitualmente rigoroso de texto:
 * - verifyFileContent: Comprova a presença física da string traduzida no arquivo de dados (FILE_VERIFIED).
 * - recordRuntimeObservation: Interceptação em memória do processo via hook (RUNTIME_VERIFIED).
 * - recordDOMObservation: Inspeção direta de nós de texto em Electron / Web (DOM_VERIFIED).
 * - recordScreenObservation: Observação na tela/pixels associada a SCREENSHOT FÍSICO (SCREEN_VERIFIED).
 *   Se não houver OCR disponível para ler o screenshot, registra SCREEN_CAPTURED_ONLY e NÃO SCREEN_VERIFIED!
 */

const fs = require('fs');
const crypto = require('crypto');

class VisibleTextVerifier {
  /**
   * 1. Verifica presença física do texto no arquivo de dados (FILE_VERIFIED)
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
   * 2. Registra observação interceptada em memória (RUNTIME_VERIFIED)
   */
  static recordRuntimeObservation(observedText, expectedText, context = {}) {
    const timestamp = Date.now();
    const verified = (observedText === expectedText || String(observedText).includes(expectedText));

    return {
      type: 'RUNTIME_VERIFIED',
      verified,
      method: context.method || 'RUNTIME_TEXT_HOOK',
      componentId: context.componentId || 'unknown',
      processId: context.processId || context.pid || null,
      sessionId: context.sessionId || null,
      expected: expectedText,
      observed: observedText,
      timestamp
    };
  }

  /**
   * 3. Registra observação no DOM (DOM_VERIFIED)
   */
  static recordDOMObservation(observedText, expectedText, context = {}) {
    const timestamp = Date.now();
    const verified = (observedText === expectedText || String(observedText).includes(expectedText));

    return {
      type: 'DOM_VERIFIED',
      verified,
      method: context.method || 'DOM_MUTATION_OBSERVER',
      selector: context.selector || null,
      processId: context.processId || null,
      expected: expectedText,
      observed: observedText,
      timestamp
    };
  }

  /**
   * 4. Registra observação visual na tela (SCREEN_VERIFIED ou SCREEN_CAPTURED_ONLY)
   * REGRA: NÃO aceita texto manual sem comprovação por screenshot real.
   */
  static recordScreenObservation(screenshotPath, expectedText, context = {}) {
    const timestamp = Date.now();

    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      return {
        type: 'SCREEN_CAPTURE_UNAVAILABLE',
        verified: false,
        method: 'SCREEN_CAPTURE',
        error: 'Screenshot físico não fornecido ou não existe no disco',
        timestamp
      };
    }

    const buf = fs.readFileSync(screenshotPath);
    const artifactHash = crypto.createHash('sha256').update(buf).digest('hex');

    // Se houver OCR confirmado
    if (context.ocrRecognizedText) {
      const match = context.ocrRecognizedText.includes(expectedText);
      return {
        type: 'SCREEN_VERIFIED',
        verified: match,
        method: 'SCREEN_OCR_VERIFICATION',
        artifactPath: screenshotPath,
        artifactHash,
        expected: expectedText,
        observed: context.ocrRecognizedText,
        timestamp
      };
    }

    // Se apenas capturou screenshot sem OCR para ler o texto
    return {
      type: 'SCREEN_CAPTURED_ONLY',
      verified: false,
      method: 'SCREEN_IMAGE_SAVED',
      artifactPath: screenshotPath,
      artifactHash,
      note: 'Screenshot gravado com sucesso, mas ausência de OCR impede validação textual visual automática.',
      timestamp
    };
  }

  /**
   * Constrói artefato de evidência padronizado fora da pasta do jogo
   */
    static buildEvidenceArtifact(params = {}) {
    const fileVer = params.fileVerified !== undefined ? params.fileVerified : (params.file?.verified || false);
    const runtimeVer = params.runtimeVerified !== undefined ? params.runtimeVerified : (params.runtime?.verified || false);
    const screenVer = params.screenVerified !== undefined ? params.screenVerified : (params.visual?.verified || false);
    const rollbackVer = Boolean(params.rollbackVerified);

    return {
      schemaVersion: '3.0',
      timestamp: new Date().toISOString(),
      game: params.game || 'unknown',
      engine: params.engine || 'generic',
      method: params.method || 'unknown',
      sourceText: params.sourceText || '',
      translation: params.translation || '',
      file: { verified: fileVer },
      runtime: { verified: runtimeVer },
      visual: { verified: screenVer },
      rollback: { verified: rollbackVer, sha256Matched: rollbackVer },
      results: {
        fileVerified: fileVer,
        runtimeVerified: runtimeVer,
        domVerified: Boolean(params.domVerified),
        screenVerified: screenVer,
        rollbackVerified: rollbackVer
      },
      fileSamples: params.fileSamples || [],
      evidenceRecords: params.evidenceRecords || []
    };
  }
}

module.exports = VisibleTextVerifier;
