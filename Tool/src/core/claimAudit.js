/**
 * OpenTranslator - ClaimAudit 2.0 (False Claim Detector)
 * 
 * Auditor implacável de alegações de status.
 * Rejeita com CLAIM_BLOCKED qualquer tentativa de reivindicar
 * RUNTIME_VERIFIED, SCREEN_VERIFIED ou ROLLBACK_VERIFIED sem os artefatos comprobatórios.
 */

const fs = require('fs');

class ClaimAudit {
  /**
   * Audita formalmente um EvidenceModel ou conjunto de evidências
   */
  static auditClaim(claimType, evidenceModel) {
    const missing = [];

    switch (claimType) {
      case 'RUNTIME_VERIFIED':
        const runtimeRecs = evidenceModel.evidenceRecords.filter(r => (r.type === 'RUNTIME_VERIFIED' || r.type === 'DOM_VERIFIED') && r.verified && r.valid);
        if (runtimeRecs.length === 0) {
          missing.push('Nenhum registro RUNTIME_VERIFIED ou DOM_VERIFIED válido');
        } else {
          const hasProcess = runtimeRecs.some(r => r.processId || r.sessionId);
          if (!hasProcess) missing.push('processId ou sessionId ausente no registro de runtime');
        }
        break;

      case 'SCREEN_VERIFIED':
        const screenRecs = evidenceModel.evidenceRecords.filter(r => r.type === 'SCREEN_VERIFIED' && r.verified && r.valid);
        if (screenRecs.length === 0) {
          missing.push('Nenhum registro SCREEN_VERIFIED válido');
        } else {
          for (const s of screenRecs) {
            if (!s.artifactPath || !fs.existsSync(s.artifactPath)) {
              missing.push(`Arquivo de screenshot não encontrado no disco: ${s.artifactPath}`);
            }
            if (!s.artifactHash) {
              missing.push('Hash SHA-256 do screenshot ausente');
            }
          }
        }
        break;

      case 'ROLLBACK_VERIFIED':
        const rollbackRecs = evidenceModel.evidenceRecords.filter(r => r.type === 'ROLLBACK_VERIFIED' && r.verified && r.valid);
        if (rollbackRecs.length === 0) {
          missing.push('Nenhum registro ROLLBACK_VERIFIED registrado');
        }
        break;

      case 'FILE_VERIFIED':
        const fileRecs = evidenceModel.evidenceRecords.filter(r => r.type === 'FILE_VERIFIED' && r.verified && r.valid);
        if (fileRecs.length === 0) {
          missing.push('Nenhum registro FILE_VERIFIED com verificação de arquivo de jogo');
        }
        break;

      default:
        missing.push(`Tipo de alegação não suportado para auditoria: ${claimType}`);
        break;
    }

    if (missing.length > 0) {
      return {
        status: 'CLAIM_BLOCKED',
        claimType,
        approved: false,
        missingRequirements: missing
      };
    }

    return {
      status: 'CLAIM_VERIFIED',
      claimType,
      approved: true
    };
  }
}

module.exports = ClaimAudit;
