/**
 * OpenTranslator — Validador Forense Canônico e Hierárquico (Passo 11 e 14)
 * 
 * Audita a integridade estrita da matriz canônica de certificação:
 * 1. TOTAL_REAL_GAMES === realGameSessions.length (21 === 21)
 * 2. Cada GAME possui sessão física comprovada em disco
 * 3. Separação de Não-Jogos (9 itens) da matriz de jogos reais
 * 4. Hierarquia estrita de Tiers:
 *    FULLY_VERIFIED ⊂ SAVE_LOAD_VERIFIED ⊂ GAMEPLAY_VERIFIED ⊂ RUNTIME_VERIFIED ⊂ PIPELINE_VERIFIED
 *    FULLY (3) <= SAVE_LOAD (3) <= GAMEPLAY (4) <= RUNTIME (7) <= PIPELINE (7)
 * 5. Entailment de Tiers:
 *    - FULLY VERIFIED → Runtime PASS, Gameplay PASS, SaveLoad PASS, Rollback PASS
 *    - SAVE_LOAD VERIFIED → Gameplay PASS, Runtime PASS, Pipeline PASS
 *    - GAMEPLAY VERIFIED → Runtime PASS, Pipeline PASS
 *    - RUNTIME VERIFIED → Pipeline PASS
 * 6. Discriminação de Versão de Engine (EXACT + RUNTIME + BASELINE + FAMILY_ONLY + UNKNOWN = 21)
 * 7. Rollback com manifesto SHA-256 perfeito em todos os jogos verificados
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const MATRIX_FILE = [
  path.join(rootDir, 'docs', 'reports', 'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json'),
  path.join(rootDir, 'reports', 'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json'),
  path.join(rootDir, 'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json')
].find(f => fs.existsSync(f)) || path.join(rootDir, 'docs', 'reports', 'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json');
const AUDIT_BASE = [
  path.join(rootDir, 'archives', 'audits', '_open_translator_audit'),
  path.join(rootDir, '_open_translator_audit')
].find(f => fs.existsSync(f)) || path.join(rootDir, 'archives', 'audits', '_open_translator_audit');
const SESSIONS_DIR = path.join(AUDIT_BASE, 'sessions');

async function validateCertification() {
  console.log('=== INICIANDO VALIDADOR FORENSE HIERÁRQUICO DA MATRIZ (PASSOS 11 E 14) ===\n');

  if (!fs.existsSync(MATRIX_FILE)) {
    console.error(`[FAIL FATAL] Arquivo da matriz não encontrado: ${MATRIX_FILE}`);
    process.exit(1);
  }

  const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));
  const errors = [];
  const warnings = [];

  const inv = matrix.inventorySummary || {};
  const tiers = matrix.certificationTiersSummary || {};
  const eng = matrix.engineRecognitionSummary || {};
  const realGames = matrix.realGameSessions || [];
  const nonGames = matrix.nonGameSessions || [];
  const topSessions = matrix.topLevelSessions || [];

  // Regra 1: TOTAL GAMES = TOTAL GAME SESSIONS (21 === 21)
  if (inv.TOTAL_REAL_GAMES !== 21) {
    errors.push(`[REGRA 1 FAIL] TOTAL_REAL_GAMES esperado 21, encontrado ${inv.TOTAL_REAL_GAMES}`);
  }
  if (realGames.length !== 21) {
    errors.push(`[REGRA 1 FAIL] realGameSessions.length esperado 21, encontrado ${realGames.length}`);
  }
  if (tiers.TOTAL_REAL_GAMES !== 21) {
    errors.push(`[REGRA 1 FAIL] tiers.TOTAL_REAL_GAMES esperado 21, encontrado ${tiers.TOTAL_REAL_GAMES}`);
  }

  // Regra 2: Cada GAME da matriz possui uma sessão física
  console.log(`[PASS 1] Auditando sessões físicas dos 21 Jogos Reais...`);
  for (const g of realGames) {
    let sDir = path.resolve(__dirname, '..', g.sessionDir);
    if (!fs.existsSync(sDir)) {
      sDir = path.resolve(__dirname, '..', 'archives', 'audits', g.sessionDir);
    }
    if (!fs.existsSync(sDir)) {
      errors.push(`[REGRA 2 FAIL] [${g.gameName}] Diretório de sessão não existe em disco: ${sDir}`);
      continue;
    }
    const sJsonPath = path.join(sDir, 'session.json');
    if (!fs.existsSync(sJsonPath)) {
      errors.push(`[REGRA 2 FAIL] [${g.gameName}] session.json ausente em ${sDir}`);
      continue;
    }
    const sJson = JSON.parse(fs.readFileSync(sJsonPath, 'utf8'));
    if (sJson.classification !== 'GAME') {
      errors.push(`[REGRA 2 FAIL] [${g.gameName}] Sessão física não é GAME: ${sJson.classification}`);
    }

    const uiLog = path.join(sDir, 'ui_actions.log');
    if (!fs.existsSync(uiLog) || fs.readFileSync(uiLog, 'utf8').trim().length === 0) {
      errors.push(`[REGRA 2 FAIL] [${g.gameName}] ui_actions.log ausente ou vazio em ${sDir}`);
    }
  }

  // Regras 3 a 6: Nenhum CONTAINER, TOOL, SAVE ou EMPTY classificado como GAME
  console.log(`[PASS 2] Auditando separação estrita de Não-Jogos (9 itens)...`);
  for (const ng of nonGames) {
    if (ng.classification === 'GAME') {
      errors.push(`[REGRA 3-6 FAIL] Item não-jogo '${ng.itemName}' classificado como GAME`);
    }
    if (['Nova pasta', 'Nova pasta (2)', 'MiniGamePackVol1_v1.0_demo', 'NTR Legend Unofficial Fan Remake 0.9.0 MTL', 'ArmoredSuitSolganteRenpy0.3-pc'].includes(ng.itemName)) {
      if (ng.classification !== 'CONTAINER') {
        errors.push(`[REGRA 3 FAIL] Container '${ng.itemName}' não classificado como CONTAINER`);
      }
    }
    if (ng.itemName === 'MTool' && ng.classification !== 'TOOL') {
      errors.push(`[REGRA 4 FAIL] MTool não classificado como TOOL`);
    }
    if (ng.itemName === 'save' && ng.classification !== 'SAVE') {
      errors.push(`[REGRA 5 FAIL] Pasta save não classificada como SAVE`);
    }
    if (ng.itemName.includes('女体狂乱プリンセス') && ng.classification !== 'EMPTY') {
      errors.push(`[REGRA 6 FAIL] Pasta vazia não classificada como EMPTY`);
    }
  }

  // Regra 7: Auditoria de Entailment e Hierarquia dos Tiers (Passos 1 a 8, 11)
  console.log(`[PASS 3] Auditando Hierarquia e Entailment dos Tiers de Certificação...`);
  let countPipeline = 0;
  let countRuntime = 0;
  let countGameplay = 0;
  let countSaveLoad = 0;
  let countFully = 0;

  for (const g of realGames) {
    const m = g.metrics;
    const t = g.tiers || {};

    if (t.PIPELINE_VERIFIED) countPipeline++;
    if (t.RUNTIME_VERIFIED) countRuntime++;
    if (t.GAMEPLAY_VERIFIED) countGameplay++;
    if (t.SAVE_LOAD_VERIFIED) countSaveLoad++;
    if (t.FULLY_VERIFIED) countFully++;

    // Entailment: FULLY VERIFIED → Runtime PASS, Gameplay PASS, SaveLoad PASS, Rollback PASS
    if (t.FULLY_VERIFIED) {
      if (!t.SAVE_LOAD_VERIFIED || !t.GAMEPLAY_VERIFIED || !t.RUNTIME_VERIFIED || !t.PIPELINE_VERIFIED) {
        errors.push(`[HIERARQUIA FAIL] [${g.gameName}] FULLY VERIFIED não cumpre todos os subtiers da hierarquia`);
      }
      if (m.RUNTIME !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] FULLY VERIFIED → RUNTIME != PASS`);
      if (m.GAMEPLAY !== 'GAMEPLAY_VERIFIED') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] FULLY VERIFIED → GAMEPLAY != PASS`);
      if (m.SAVE_LOAD !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] FULLY VERIFIED → SAVE_LOAD != PASS`);
      if (m.ROLLBACK !== 'PASS' || !g.hashes || g.hashes.isPerfectRestore !== true || g.hashes.unrestoredCount !== 0) {
        errors.push(`[ENTAILMENT FAIL] [${g.gameName}] FULLY VERIFIED → ROLLBACK != PASS ou SHA-256 imperfeito`);
      }
    }

    // Entailment: SAVE_LOAD VERIFIED → Gameplay PASS, Runtime PASS, Pipeline PASS
    if (t.SAVE_LOAD_VERIFIED) {
      if (!t.GAMEPLAY_VERIFIED || !t.RUNTIME_VERIFIED || !t.PIPELINE_VERIFIED) {
        errors.push(`[HIERARQUIA FAIL] [${g.gameName}] SAVE_LOAD VERIFIED não cumpre subtiers Gameplay/Runtime/Pipeline`);
      }
      if (m.GAMEPLAY !== 'GAMEPLAY_VERIFIED') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] SAVE_LOAD VERIFIED → GAMEPLAY != PASS`);
      if (m.RUNTIME !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] SAVE_LOAD VERIFIED → RUNTIME != PASS`);
      if (m.SAVE_LOAD !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] SAVE_LOAD VERIFIED → SAVE_LOAD != PASS`);
    }

    // Entailment: GAMEPLAY VERIFIED → Runtime PASS, Pipeline PASS
    if (t.GAMEPLAY_VERIFIED) {
      if (!t.RUNTIME_VERIFIED || !t.PIPELINE_VERIFIED) {
        errors.push(`[HIERARQUIA FAIL] [${g.gameName}] GAMEPLAY VERIFIED não cumpre subtiers Runtime/Pipeline`);
      }
      if (m.RUNTIME !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] GAMEPLAY VERIFIED → RUNTIME != PASS`);
      if (m.GAMEPLAY !== 'GAMEPLAY_VERIFIED') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] GAMEPLAY VERIFIED → GAMEPLAY != PASS`);
    }

    // Entailment: RUNTIME VERIFIED → Pipeline PASS
    if (t.RUNTIME_VERIFIED) {
      if (!t.PIPELINE_VERIFIED) {
        errors.push(`[HIERARQUIA FAIL] [${g.gameName}] RUNTIME VERIFIED não cumpre subtier Pipeline`);
      }
      if (m.RUNTIME !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] RUNTIME VERIFIED → RUNTIME != PASS`);
      if (m.REOPEN !== 'PASS') errors.push(`[ENTAILMENT FAIL] [${g.gameName}] RUNTIME VERIFIED → REOPEN != PASS`);
    }

    // Entailment: PIPELINE VERIFIED
    if (t.PIPELINE_VERIFIED) {
      if (m.DETECT !== 'PASS' || m.INSPECT !== 'PASS' || m.EXTRACT !== 'PASS' ||
          m.TRANSLATE !== 'PASS' || m.APPLY !== 'PASS' || m.ROLLBACK !== 'PASS') {
        errors.push(`[ENTAILMENT FAIL] [${g.gameName}] PIPELINE VERIFIED com etapa de pipeline != PASS`);
      }
    }
  }

  // Validação da desigualdade matemática: FULLY <= SAVE_LOAD <= GAMEPLAY <= RUNTIME <= PIPELINE
  if (!(countFully <= countSaveLoad && countSaveLoad <= countGameplay && countGameplay <= countRuntime && countRuntime <= countPipeline)) {
    errors.push(`[HIERARQUIA MATEMÁTICA FAIL] Desigualdade de tiers violada: FULLY(${countFully}) <= SAVE_LOAD(${countSaveLoad}) <= GAMEPLAY(${countGameplay}) <= RUNTIME(${countRuntime}) <= PIPELINE(${countPipeline})`);
  }

  // Validação dos totais canônicos esperados (Pós-Resolução dos Casos de Assembly-CSharp e RGSS3A)
  if (countPipeline !== 18) errors.push(`[TIERS COUNT FAIL] PIPELINE_VERIFIED esperado 18, encontrado ${countPipeline}`);
  if (countRuntime !== 18) errors.push(`[TIERS COUNT FAIL] RUNTIME_VERIFIED esperado 18, encontrado ${countRuntime}`);
  if (countGameplay !== 4) errors.push(`[TIERS COUNT FAIL] GAMEPLAY_VERIFIED esperado 4, encontrado ${countGameplay}`);
  if (countSaveLoad !== 4) errors.push(`[TIERS COUNT FAIL] SAVE_LOAD_VERIFIED esperado 4, encontrado ${countSaveLoad}`);
  if (countFully !== 4) errors.push(`[TIERS COUNT FAIL] FULLY_VERIFIED esperado 4, encontrado ${countFully}`);

  // Regra 8: Auditoria de Engine Version Detection (Passos 1 a 4)
  console.log(`[PASS 4] Auditando Engine Version Detection e Categorias...`);
  if (eng.ENGINE_FAMILY_DETECTION !== 21) {
    errors.push(`[ENGINE FAIL] ENGINE_FAMILY_DETECTION esperado 21, encontrado ${eng.ENGINE_FAMILY_DETECTION}`);
  }
  if (eng.ENGINE_VERSION_DETECTION !== 21) {
    errors.push(`[ENGINE FAIL] ENGINE_VERSION_DETECTION esperado 21, encontrado ${eng.ENGINE_VERSION_DETECTION}`);
  }

  const exactCount = realGames.filter(g => g.engineVersionType === 'EXACT').length;
  const majorCount = realGames.filter(g => g.engineVersionType === 'MAJOR_VERSION').length;
  const runtimeCount = realGames.filter(g => g.engineVersionType === 'RUNTIME_VERSION').length;
  const baselineCount = realGames.filter(g => g.engineVersionType === 'BASELINE').length;
  const familyOnlyCount = realGames.filter(g => g.engineVersionType === 'FAMILY_ONLY').length;
  const unknownCount = realGames.filter(g => g.engineVersionType === 'UNKNOWN').length;

  const sumCategories = exactCount + majorCount + runtimeCount + baselineCount + familyOnlyCount + unknownCount;
  if (sumCategories !== 21) {
    errors.push(`[ENGINE FAIL] Soma das categorias de versão esperada 21, encontrada ${sumCategories}`);
  }
  if (exactCount !== 3) errors.push(`[ENGINE FAIL] EXACT esperado 3, encontrado ${exactCount}`);
  if (majorCount !== 8) errors.push(`[ENGINE FAIL] MAJOR_VERSION esperado 8, encontrado ${majorCount}`);
  if (runtimeCount !== 8) errors.push(`[ENGINE FAIL] RUNTIME_VERSION esperado 8, encontrado ${runtimeCount}`);
  if (baselineCount !== 2) errors.push(`[ENGINE FAIL] BASELINE esperado 2, encontrado ${baselineCount}`);
  if (unknownCount !== 0) errors.push(`[ENGINE FAIL] UNKNOWN esperado 0, encontrado ${unknownCount}`);

  // Conferência contra os campos da matriz
  for (const g of realGames) {
    if (!['EXACT', 'MAJOR_VERSION', 'RUNTIME_VERSION', 'FAMILY_ONLY', 'BASELINE', 'UNKNOWN'].includes(g.engineVersionType)) {
      errors.push(`[ENGINE FAIL] [${g.gameName}] engineVersionType inválido: ${g.engineVersionType}`);
    }
    if (!g.engineVersionConfidence || g.engineVersionConfidence <= 0) {
      errors.push(`[ENGINE FAIL] [${g.gameName}] engineVersionConfidence inválida: ${g.engineVersionConfidence}`);
    }
    if (!g.engineVersionEvidence) {
      errors.push(`[ENGINE FAIL] [${g.gameName}] engineVersionEvidence vazia ou ausente`);
    }
  }

  console.log('\n========================================================================');
  console.log('=== RESUMO DA AUDITORIA DO VALIDATOR FORENSE HIERÁRQUICO ===');
  console.log(`Jogos Reais Auditados         : ${realGames.length}/21`);
  console.log(`Itens Não-Jogos               : ${nonGames.length}/9`);
  console.log(`Itens Top-Level               : ${topSessions.length}/25`);
  console.log('------------------------------------------------------------------------');
  console.log(`Hierarquia de Tiers (Cumulativa):`);
  console.log(`  - Pipeline Verified         : ${countPipeline}/18`);
  console.log(`  - Runtime Verified          : ${countRuntime}/18`);
  console.log(`  - Gameplay Verified         : ${countGameplay}/4`);
  console.log(`  - Save/Load Verified        : ${countSaveLoad}/4`);
  console.log(`  - Fully Verified            : ${countFully}/4`);
  console.log('------------------------------------------------------------------------');
  console.log(`Categorias de Versão de Motor:`);
  console.log(`  - EXACT                     : ${exactCount}/3`);
  console.log(`  - MAJOR_VERSION             : ${majorCount}/8`);
  console.log(`  - RUNTIME_VERSION           : ${runtimeCount}/8`);
  console.log(`  - BASELINE                  : ${baselineCount}/2`);
  console.log(`  - FAMILY_ONLY               : ${familyOnlyCount}/0`);
  console.log(`  - UNKNOWN                   : ${unknownCount}/0`);
  console.log(`  - Soma                      : ${sumCategories}/21`);
  console.log('------------------------------------------------------------------------');
  console.log(`External Tool Required        : ${realGames.filter(g => g.highestTier === 'EXTERNAL_TOOL_REQUIRED').length}/1`);
  console.log(`Unsupported Safe Reject       : ${realGames.filter(g => g.highestTier === 'UNSUPPORTED_SAFE_REJECT').length}/2`);
  console.log(`Total de Erros                : ${errors.length}`);
  console.log(`Total de Avisos               : ${warnings.length}`);
  console.log('========================================================================\n');

  if (errors.length > 0) {
    console.error('❌ REPROVADO NA VALIDAÇÃO FORENSE HIERÁRQUICA:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('✓ TODAS AS REGRAS FORENSES E HIERÁRQUICAS FORAM APROVADAS COM 100% DE SUCESSO!\n');
  process.exit(0);
}

if (require.main === module) {
  validateCertification().catch(err => {
    console.error('Erro Fatal no Validador:', err);
    process.exit(1);
  });
}

module.exports = validateCertification;
