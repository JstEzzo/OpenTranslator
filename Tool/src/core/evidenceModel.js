/**
 * OpenTranslator - EvidenceModel 2.0
 * 
 * Modelo rigoroso de classificação de evidência empírica:
 * - codeEvidence: Validação unitária de código/parsers/classes
 * - integrationEvidence: Comunicação entre múltiplos subsistemas do OpenTranslator
 * - gameEvidence: Executado sobre arquivos de jogos (FILE_VERIFIED)
 * - runtimeEvidence: Interceptação em memória com processo em execução (RUNTIME_VERIFIED / DOM_VERIFIED)
 * - visualEvidence: Observação na tela/pixels/HUD (SCREEN_VERIFIED exclusivamente)
 * - rollbackEvidence: Restauração do estado original matematicamente comprovada por SHA-256
 */

class EvidenceModel {
  constructor(params = {}) {
    this.method = params.method || 'METHOD_UNKNOWN';
    this.engine = params.engine || 'generic';
    this.target = params.target || '';
    this.codeEvidence = Boolean(params.codeEvidence);
    this.integrationEvidence = Boolean(params.integrationEvidence);
    this.gameEvidence = Boolean(params.gameEvidence);
    this.runtimeEvidence = Boolean(params.runtimeEvidence);
    this.visualEvidence = Boolean(params.visualEvidence);
    this.rollbackEvidence = Boolean(params.rollbackEvidence);
    this.evidenceRecords = [];
    this.notes = params.notes || [];

    if (Array.isArray(params.evidenceRecords)) {
      this.evidenceRecords = [...params.evidenceRecords];
    }
  }

  /**
   * Registra uma evidência formal evitando marcações manuais forjadas
   * @param {'CODE'|'INTEGRATION'|'FILE_VERIFIED'|'RUNTIME_VERIFIED'|'DOM_VERIFIED'|'SCREEN_VERIFIED'|'ROLLBACK_VERIFIED'} type
   * @param {object} details - { verificationMethod, artifactPath, timestamp, subject, expected, observed }
   */
  recordEvidence(type, details = {}) {
    const record = {
      type,
      verificationMethod: details.verificationMethod || type,
      artifactPath: details.artifactPath || null,
      timestamp: details.timestamp || Date.now(),
      subject: details.subject || this.target,
      expected: details.expected !== undefined ? details.expected : null,
      observed: details.observed !== undefined ? details.observed : null,
      verified: details.verified !== false
    };

    this.evidenceRecords.push(record);

    switch (type) {
      case 'CODE':
        this.codeEvidence = true;
        break;
      case 'INTEGRATION':
        this.integrationEvidence = true;
        break;
      case 'FILE_VERIFIED':
        this.gameEvidence = true;
        break;
      case 'RUNTIME_VERIFIED':
      case 'DOM_VERIFIED':
        this.runtimeEvidence = true;
        break;
      case 'SCREEN_VERIFIED':
        // Apenas SCREEN_VERIFIED habilita visualEvidence!
        this.visualEvidence = true;
        break;
      case 'ROLLBACK_VERIFIED':
        this.rollbackEvidence = true;
        break;
    }

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
      if (!this.visualEvidence) missing.push('visualEvidence (nenhuma verificação SCREEN_VERIFIED registrada)');
      if (!this.runtimeEvidence && !this.gameEvidence) missing.push('runtimeEvidence ou gameEvidence ausente');
    } else if (claim === 'RUNTIME_VERIFIED') {
      if (!this.runtimeEvidence) missing.push('runtimeEvidence (processo não executado ou hook não verificado)');
    } else if (claim === 'ROLLBACK_VERIFIED') {
      if (!this.rollbackEvidence) missing.push('rollbackEvidence (hash SHA-256 original não comparado pós-rollback)');
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
      codeEvidence: this.codeEvidence,
      integrationEvidence: this.integrationEvidence,
      gameEvidence: this.gameEvidence,
      runtimeEvidence: this.runtimeEvidence,
      visualEvidence: this.visualEvidence,
      rollbackEvidence: this.rollbackEvidence,
      evidenceRecords: this.evidenceRecords,
      notes: this.notes
    };
  }
}

module.exports = EvidenceModel;
