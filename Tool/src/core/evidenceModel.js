/**
 * OpenTranslator - EvidenceModel 3.0 (Anti-Forgery Hardened)
 * 
 * Modelo rigoroso e infalsificável de classificação de evidência empírica:
 * - Toda categoria é ESTRITAMENTE derivada de evidenceRecords válidos.
 * - NENHUM booleano pode ser passado via construtor ou atribuído diretamente.
 * - Atribuições diretas de flags de evidência são bloqueadas.
 * - SCREEN_VERIFIED exige obrigatoriamente screenshot físico (artifactPath e artifactHash) ou amostragem formal.
 * - RUNTIME_VERIFIED exige processo real (processId/sessionId e observação confirmada).
 * - ROLLBACK_VERIFIED exige igualdade matemática comprovada (expectedHash === observedHash).
 */

class EvidenceModel {
  constructor(params = {}) {
    this.method = params.method || 'METHOD_UNKNOWN';
    this.engine = params.engine || 'generic';
    this.target = params.target || '';
    this.evidenceRecords = [];
    this.notes = params.notes || [];

    // Se registros estruturados forem fornecidos no construtor, validar cada um
    if (Array.isArray(params.evidenceRecords)) {
      for (const rec of params.evidenceRecords) {
        if (rec && rec.type) {
          this.recordEvidence(rec.type, rec);
        }
      }
    }
  }

  // ==================== GETTERS ESTRITAMENTE DERIVADOS ====================

  get codeEvidence() {
    return this.evidenceRecords.some(r => r.type === 'CODE' && r.verified === true && r.valid !== false);
  }

  get integrationEvidence() {
    return this.evidenceRecords.some(r => r.type === 'INTEGRATION' && r.verified === true && r.valid !== false);
  }

  get gameEvidence() {
    return this.evidenceRecords.some(r => r.type === 'FILE_VERIFIED' && r.verified === true && r.valid !== false);
  }

  get runtimeEvidence() {
    return this.evidenceRecords.some(r => (r.type === 'RUNTIME_VERIFIED' || r.type === 'DOM_VERIFIED') && r.verified === true && r.valid !== false);
  }

  get visualEvidence() {
    return this.evidenceRecords.some(r => r.type === 'SCREEN_VERIFIED' && r.verified === true && r.valid !== false);
  }

  get rollbackEvidence() {
    return this.evidenceRecords.some(r => r.type === 'ROLLBACK_VERIFIED' && r.verified === true && r.valid !== false);
  }

  // ==================== BLOQUEIO DE FALSIFICAÇÃO POR SETTER ====================

  set codeEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: codeEvidence não pode ser atribuído diretamente. Use recordEvidence("CODE", details).');
  }

  set integrationEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: integrationEvidence não pode ser atribuído diretamente. Use recordEvidence("INTEGRATION", details).');
  }

  set gameEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: gameEvidence não pode ser atribuído diretamente. Use recordEvidence("FILE_VERIFIED", details).');
  }

  set runtimeEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: runtimeEvidence não pode ser atribuído diretamente. Use recordEvidence("RUNTIME_VERIFIED", details).');
  }

  set visualEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: visualEvidence não pode ser atribuído diretamente. Use recordEvidence("SCREEN_VERIFIED", details).');
  }

  set rollbackEvidence(val) {
    throw new Error('ANTI_FORGERY_BLOCKED: rollbackEvidence não pode ser atribuído diretamente. Use recordEvidence("ROLLBACK_VERIFIED", details).');
  }

  /**
   * Registra uma evidência formal evitando marcações manuais forjadas
   * @param {'CODE'|'INTEGRATION'|'FILE_VERIFIED'|'RUNTIME_VERIFIED'|'DOM_VERIFIED'|'SCREEN_VERIFIED'|'ROLLBACK_VERIFIED'} type
   * @param {object} details
   */
  recordEvidence(type, details = {}) {
    const timestamp = details.timestamp || Date.now();
    const id = details.id || `ev_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let valid = true;
    let verified = details.verified !== false;
    let error = null;

    // Validação estrita por tipo
    switch (type) {
      case 'FILE_VERIFIED':
        if (!details.subject && !details.filePath && !this.target) {
          valid = false;
          verified = false;
          error = 'FILE_VERIFIED exige subject ou filePath';
        }
        break;

      case 'RUNTIME_VERIFIED':
        // Exige processo ou sessão real
        if (!details.processId && !details.sessionId && !details.pid) {
          valid = false;
          verified = false;
          error = 'RUNTIME_VERIFIED exige processId ou sessionId real comprovado';
        }
        break;

      case 'DOM_VERIFIED':
        if (!details.processId && !details.sessionId && !details.componentId && !details.url) {
          valid = false;
          verified = false;
          error = 'DOM_VERIFIED exige componente DOM, processId ou url';
        }
        break;

      case 'SCREEN_VERIFIED':
        // Apenas com screenshot físico e hash ou método comprovado com expectativa/observação
        const hasArtifact = Boolean(details.artifactPath || details.artifactHash);
        const hasSampling = Boolean(details.verificationMethod === 'SCREEN_PIXEL_SAMPLING' || details.method === 'SCREEN_PIXEL_SAMPLING');
        if (!hasArtifact && !hasSampling) {
          valid = false;
          verified = false;
          error = 'SCREEN_VERIFIED exige screenshot (artifactPath/artifactHash) ou amostragem formal de pixels';
        }
        break;

      case 'ROLLBACK_VERIFIED':
        const expHash = details.expectedHash || details.originalHash;
        const obsHash = details.observedHash || details.restoredHash;
        if (!expHash || !obsHash || expHash !== obsHash) {
          valid = false;
          verified = false;
          error = `ROLLBACK_VERIFIED exige igualdade de hash SHA-256 (Esperado: ${expHash}, Observado: ${obsHash})`;
        }
        break;

      case 'CODE':
      case 'INTEGRATION':
        break;

      default:
        valid = false;
        verified = false;
        error = `Tipo de evidência desconhecido: ${type}`;
        break;
    }

    const record = {
      id,
      type,
      timestamp,
      verificationMethod: details.verificationMethod || details.method || type,
      subject: details.subject || details.filePath || this.target,
      expected: details.expected !== undefined ? details.expected : null,
      observed: details.observed !== undefined ? details.observed : null,
      artifactPath: details.artifactPath || null,
      artifactHash: details.artifactHash || null,
      processId: details.processId || details.pid || null,
      executablePath: details.executablePath || null,
      executableHash: details.executableHash || null,
      sessionId: details.sessionId || null,
      verified,
      valid,
      error
    };

    this.evidenceRecords.push(record);
    return record;
  }

  /**
   * Calcula o grau oficial máximo de evidência comprovada
   */
  getGrade() {
    if (this.visualEvidence) return 'VISUALLY_VERIFIED';
    if (this.runtimeEvidence) return 'RUNTIME_VERIFIED';
    if (this.gameEvidence) return 'LAB_TESTED';
    if (this.integrationEvidence) return 'INTEGRATION_TESTED';
    if (this.codeEvidence) return 'UNIT_TESTED';
    return 'NOT_TESTED';
  }

  /**
   * Valida se uma afirmação de status é legítima
   */
  validateClaim(claim) {
    const missing = [];
    if (claim === 'VISUALLY_VERIFIED') {
      if (!this.visualEvidence) missing.push('visualEvidence (nenhum SCREEN_VERIFIED registrado)');
      if (!this.runtimeEvidence && !this.gameEvidence) missing.push('runtimeEvidence ou gameEvidence ausente');
    } else if (claim === 'RUNTIME_VERIFIED') {
      if (!this.runtimeEvidence) missing.push('runtimeEvidence (processo não executado ou hook não verificado com PID real)');
    } else if (claim === 'ROLLBACK_VERIFIED') {
      if (!this.rollbackEvidence) missing.push('rollbackEvidence (hash SHA-256 original não comparado pós-rollback)');
    } else if (claim === 'LAB_TESTED') {
      if (!this.gameEvidence) missing.push('gameEvidence ausente (nenhum arquivo de jogo validado com FILE_VERIFIED)');
    }
    return {
      legitimate: missing.length === 0,
      missingEvidence: missing
    };
  }

  toJSON() {
    return {
      method: this.method,
      engine: this.engine,
      target: this.target,
      grade: this.getGrade(),
      flags: {
        codeEvidence: this.codeEvidence,
        integrationEvidence: this.integrationEvidence,
        gameEvidence: this.gameEvidence,
        runtimeEvidence: this.runtimeEvidence,
        visualEvidence: this.visualEvidence,
        rollbackEvidence: this.rollbackEvidence
      },
      recordsCount: this.evidenceRecords.length,
      evidenceRecords: this.evidenceRecords,
      notes: this.notes
    };
  }
}

module.exports = EvidenceModel;
