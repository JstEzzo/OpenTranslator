/**
 * run-phase7-real-lab.js — Verificador de Fluxo de Trabalho Real em Laboratório (E2E)
 *
 * Responsabilidades:
 * - Executar staging seguro, análise, backup, modificação, rollback e conferência SHA-256
 * - Garantir invariabilidade dos arquivos originais em jogos reais do laboratório
 *
 * Localização:
 * Camada de Ferramentas / QA & Verificação (tools/)
 */

const fs = require('fs');
const path = require('path');
const RealGameWorkflow = require('../src/core/realGameWorkflow');

const LAB_DIR = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

async function runLabVerification() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR - PHASE 7 REAL LAB E2E VERIFICATION');
  console.log('  Safe Staging -> Analyze -> Backup -> Modify -> Rollback -> SHA-256');
  console.log('====================================================\n');

  if (!fs.existsSync(LAB_DIR)) {
    console.error(`Lab directory not found: ${LAB_DIR}`);
    process.exit(1);
  }

  const workflow = new RealGameWorkflow({
    stagingBase: path.resolve(__dirname, '../data/staging/phase7_lab_test')
  });

  const candidates = [
    'ArmoredSuitSolganteRenpy0.2-pc',
    '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2',
    'Marge Mania v0.1'
  ];

  const results = [];

  for (const name of candidates) {
    const gameDir = path.join(LAB_DIR, name);
    if (!fs.existsSync(gameDir)) {
      console.log(`[SKIP] ${name} not found in lab.`);
      continue;
    }

    console.log(`>>> Staging game: ${name}...`);
    const stagingDir = workflow.createStagingCopy(gameDir, name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20));
    console.log(`    Staging created at: ${stagingDir}`);

    console.log(`>>> Executing full workflow cycle on staging...`);
    const cycleRes = await workflow.runFullCycle(stagingDir);

    console.log(`    Result: Engine=${cycleRes.engine}, Success=${cycleRes.success}, RollbackVerified=${cycleRes.rollbackVerified}, Time=${cycleRes.durationMs}ms`);
    results.push({
      game: name,
      engine: cycleRes.engine,
      success: cycleRes.success,
      rollbackVerified: cycleRes.rollbackVerified,
      steps: cycleRes.steps,
      durationMs: cycleRes.durationMs
    });

    // Cleanup staging after verified test
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.log(`    Staging cleaned.\n`);
  }

  // Cleanup base staging directory
  if (fs.existsSync(workflow.stagingBase)) {
    fs.rmSync(workflow.stagingBase, { recursive: true, force: true });
  }

  console.log('====================================================');
  console.log('  PHASE 7 REAL LAB RESULTS:');
  for (const r of results) {
    console.log(`  [${r.rollbackVerified ? 'PASS' : 'FAIL'}] ${r.game} (${r.engine}) - Rollback SHA-256: ${r.rollbackVerified ? 'VERIFIED' : 'FAILED'}`);
  }
  console.log('====================================================\n');

  // Save report to docs/reports/PHASE7_REAL_LAB.json
  const reportPath = path.resolve(__dirname, '../docs/reports/PHASE7_REAL_LAB.json');
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: Date.now(), results }, null, 2), 'utf8');
  console.log(`Saved report to ${reportPath}`);
}

runLabVerification().catch(err => {
  console.error('Fatal error in real lab verification:', err);
  process.exit(1);
});
