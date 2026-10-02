/**
 * scripts/reorganize_project.js
 * 
 * Reorganiza o OpenTranslator estritamente de acordo com as regras de .agents/rules/opentranslator.md:
 * - Raiz limpa contendo apenas arquivos essenciais (README.md, LICENSE, CHANGELOG.md, package.json, OpenTranslator.exe)
 * - Relatórios em reports/
 * - Backups em archives/backups/
 * - Auditorias em archives/audits/
 * - Matrizes em docs/engines/
 * - Testes em tests/
 * - Scripts de manutenção em scripts/
 * - Eliminação de lixo (=, lastError)
 * - 100% de preservação de compatibilidade com Tool/ e OpenTranslator.exe
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const toolDir = path.join(rootDir, 'Tool');

console.log('=== Iniciando Reorganização Arquitetural do OpenTranslator ===');
console.log('Root:', rootDir);

function safeMove(src, dest) {
  if (fs.existsSync(src)) {
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent)) fs.mkdirSync(destParent, { recursive: true });
    // Se destino já existe e é pasta, copia conteúdo
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        safeMove(path.join(src, item), path.join(dest, item));
      }
      try { fs.rmdirSync(src); } catch (e) {}
    } else {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    }
    console.log(`[MOVIDO] ${path.relative(rootDir, src)} -> ${path.relative(rootDir, dest)}`);
    return true;
  }
  return false;
}

// 1. Limpeza de arquivos corrompidos / temporários da raiz
if (fs.existsSync(path.join(rootDir, '='))) {
  fs.unlinkSync(path.join(rootDir, '='));
  console.log('[REMOVIDO] Arquivo lixo "="');
}
if (fs.existsSync(path.join(rootDir, 'lastError'))) {
  safeMove(path.join(rootDir, 'lastError'), path.join(rootDir, 'logs', 'last_error.log'));
}

// 2. Relatórios (.md) da raiz -> reports/
const mdReports = [
  'OPEN_TRANSLATOR_EVIDENCE_INDEX.md',
  'OPEN_TRANSLATOR_HARDENING_FINAL_REPORT.md',
  'OPEN_TRANSLATOR_HARDENING_REPORT.md',
  'OPEN_TRANSLATOR_REAL_GAME_AUDIT.md',
  'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.md',
  'OPEN_TRANSLATOR_REAL_WORLD_TEST_REPORT.md',
  'OPEN_TRANSLATOR_RUNTIME_EVIDENCE.md',
  'OPEN_TRANSLATOR_UNEXPECTED_BEHAVIOR_REPORT.md',
  'OPEN_TRANSLATOR_UNTRANSLATED_REPORT.md',
  'REN_PY_INTEGRATION_REPORT.md',
  'RPG_MAKER_MV_COMPARISON.md',
  'RPG_MAKER_MZ_COMPARISON.md'
];

for (const report of mdReports) {
  safeMove(path.join(rootDir, report), path.join(rootDir, 'reports', report));
}

// 3. Matrizes de Suporte das Engines (JSON) -> docs/engines/
const engineMatrices = [
  'GODOT_SUPPORT_MATRIX.json',
  'RGSS_SUPPORT_MATRIX.json',
  'UNITY_SUPPORT_MATRIX.json',
  'WOLF_SUPPORT_MATRIX.json',
  'ENGINE_EXPANSION_BASELINE.json'
];

for (const em of engineMatrices) {
  safeMove(path.join(rootDir, em), path.join(rootDir, 'docs', 'engines', em));
}

// 4. Auditorias e Relatórios de Dados (JSON) da raiz -> archives/audits/ ou reports/
const auditJsons = [
  { file: 'AUDIT_STEP_01_INVENTORY.json', dest: 'archives/audits/AUDIT_STEP_01_INVENTORY.json' },
  { file: 'AUDIT_STEP_02_CLEANUP.json', dest: 'archives/audits/AUDIT_STEP_02_CLEANUP.json' },
  { file: 'FINAL_AUDIT_STEP_01.json', dest: 'archives/audits/FINAL_AUDIT_STEP_01.json' },
  { file: 'FINAL_DISCOVERED_LIBRARY.json', dest: 'reports/FINAL_DISCOVERED_LIBRARY.json' },
  { file: 'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json', dest: 'reports/OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json' },
  { file: 'OPEN_TRANSLATOR_REAL_WORLD_TEST_MATRIX.json', dest: 'reports/OPEN_TRANSLATOR_REAL_WORLD_TEST_MATRIX.json' },
  { file: 'STEP_25_NEW_GAME_PROOF.json', dest: 'reports/STEP_25_NEW_GAME_PROOF.json' },
  { file: 'discovered_games.json', dest: 'reports/discovered_games.json' },
  { file: 'test_extracted_minigame.json', dest: 'reports/test_extracted_minigame.json' },
  { file: 'unity_inspection_report.json', dest: 'reports/unity_inspection_report.json' },
  { file: 'UNITY_GAME_ANALYSIS.json', dest: 'reports/UNITY_GAME_ANALYSIS.json' }
];

for (const item of auditJsons) {
  safeMove(path.join(rootDir, item.file), path.join(rootDir, item.dest));
}

// 5. Backups soltos na raiz -> archives/backups/
safeMove(path.join(rootDir, 'backup_before_next_engine'), path.join(rootDir, 'archives', 'backups', 'backup_before_next_engine'));
safeMove(path.join(rootDir, 'backup_before_renpy_full_integration'), path.join(rootDir, 'archives', 'backups', 'backup_before_renpy_full_integration'));

// 6. Evidências visuais de gameplay na raiz -> reports/evidence/unity/
safeMove(path.join(rootDir, 'UNITY_GAMEPLAY_EVIDENCE'), path.join(rootDir, 'reports', 'evidence', 'unity'));

// 7. Scripts de teste da raiz -> tests/
safeMove(path.join(rootDir, 'validate_mz_certification.js'), path.join(rootDir, 'tests', 'validate_mz_certification.js'));
safeMove(path.join(rootDir, 'validate_renpy_certification.js'), path.join(rootDir, 'tests', 'validate_renpy_certification.js'));

// 8. Organização de arquivos soltos dentro de Tool/
const toolLooseScriptsToScripts = [
  'build_canonical_certification_matrix.js',
  'build_step01_inventory.js',
  'create_backup_before_next_engine.js',
  'create_backup_before_renpy_full_integration.js',
  'deep_game_analyzer.js',
  'deep_dive_interesting.js',
  'generate_audit_evidence.js',
  'init_audit_dir.js',
  'inspect_all_games.js',
  'inspect_games_inventory.js',
  'inspect_specific_folders.js',
  'inspect_trsdata.js',
  'inspect_ui_structure.js',
  'read_bat.js',
  'run_step02_cleanup.js',
  'run_step05_discovery.js',
  'survey_engine_adapters.js',
  'restore_rpgmaker.py',
  'restore_keys.js',
  'run-pipeline-cli.js',
  'cli-compat.js'
];

for (const s of toolLooseScriptsToScripts) {
  safeMove(path.join(toolDir, s), path.join(rootDir, 'scripts', s));
}

const toolLooseTestsToTests = [
  'check_damage.js',
  'check_e07.js',
  'test_adapters_live.js',
  'test_core_detector.js',
  'test_engine_detection.js',
  'test_kimochi_decrypt.js',
  'test_multi_game_pipeline.js',
  'test_one_game_gameplay.js',
  'test_real_world_e2e_all_games.js',
  'test_step25_new_game_proof.js',
  'test_toki_gameplay.js',
  'validate_real_ui_certification.js',
  'real_ui_certification_runner.js',
  'run-lab-tests.js',
  'scratch_mv_full_regression.js'
];

for (const t of toolLooseTestsToTests) {
  safeMove(path.join(toolDir, t), path.join(rootDir, 'tests', t));
}

const toolLooseJsonsToReports = [
  { file: 'adapters_live_audit.json', dest: 'archives/audits/adapters_live_audit.json' },
  { file: 'detailed_game_profiles.json', dest: 'reports/detailed_game_profiles.json' },
  { file: 'engine_detector_results.json', dest: 'reports/engine_detector_results.json' },
  { file: 'game_by_game_raw.json', dest: 'reports/game_by_game_raw.json' },
  { file: 'inventory_result.json', dest: 'reports/inventory_result.json' },
  { file: 'pipeline_multi_game_results.json', dest: 'reports/pipeline_multi_game_results.json' },
  { file: 'real_world_e2e_results.json', dest: 'reports/real_world_e2e_results.json' },
  { file: 'restore_config.json', dest: 'config/restore_config.json' },
  { file: 'targets_deep_dive.json', dest: 'reports/targets_deep_dive.json' }
];

for (const j of toolLooseJsonsToReports) {
  safeMove(path.join(toolDir, j.file), path.join(rootDir, j.dest));
}

const toolLooseImagesToEvidence = [
  'opentranslator_live_ui.png',
  'opentranslator_ui_chrome.png',
  'real_ui_user_session_screenshot.png',
  'screenshot_test.png',
  'test_capture_explicit.png',
  'test_screen_capture.png',
  'test_shot.png',
  'dumped_ui_dom.html'
];

for (const img of toolLooseImagesToEvidence) {
  safeMove(path.join(toolDir, img), path.join(rootDir, 'reports', 'evidence', img));
}

// 9. Criação do package.json na raiz do repositório
const rootPackageJsonPath = path.join(rootDir, 'package.json');
if (!fs.existsSync(rootPackageJsonPath)) {
  const rootPackageJson = {
    name: "opentranslator",
    version: "1.0.0",
    description: "Universal AI-Powered Game Translation Suite",
    main: "server.js",
    scripts: {
      "start": "node server.js",
      "test": "node tests/validate_real_ui_certification.js"
    },
    private: true
  };
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2), 'utf8');
  console.log('[CRIADO] package.json na raiz');
}

console.log('=== Reorganização concluída com sucesso! ===');
