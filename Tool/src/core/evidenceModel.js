/**
 * OpenTranslator — EvidenceModel
 * 
 * Modelo rigoroso de classificação de evidência empírica:
 * - codeEvidence: Validação unitária de código/parsers/classes
 * - integrationEvidence: Comunicação entre múltiplos subsistemas do OpenTranslator
 * - gameEvidence: Executado sobre cópias reais de arquivos de jogos
 * - runtimeEvidence: Comprovado com processo/executável em execução
 * - visualEvidence: Resultado visualmente observado na tela do usuário
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
    this.notes = params.notes || [];
  }

  /**
   * Calcula o grau oficial máximo de evidência comprovada
   * @returns {'NOT_TESTED'|'UNIT_TESTED'|'INTEGRATION_TESTED'|'LAB_TESTED'|'RUNTIME_VERIFIED'|'VISUALLY_VERIFIED'}
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
   * Valida se uma afirmação de "VERIFIED" é matematicamente e empiricamente legítima
   * @param {'RUNTIME_VERIFIED'|'VISUALLY_VERIFIED'|'ROLLBACK_VERIFIED'} claim
   * @returns {{ legitimate: boolean, missingEvidence: Array<string> }}
   */
  validateClaim(claim) {
    const missing = [];
    if (claim === 'VISUALLY_VERIFIED') {
      if (!this.visualEvidence) missing.push('visualEvidence (nenhuma captura visual de tela confirmada)');
      if (!this.runtimeEvidence) missing.push('runtimeEvidence (processo do jogo não comprovado em execução)');
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
      notes: this.notes
    };
  }
}

module.exports = EvidenceModel;
