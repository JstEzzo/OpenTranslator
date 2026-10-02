const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const novaPasta = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

const cleanupLog = {
  timestamp: new Date().toISOString(),
  step: 'PASSO 2 — LIMPAR A CERTIFICAÇÃO ANTIGA',
  deletedCertificationArtifacts: [],
  deletedGameSpecificScripts: [],
  deletedTemporaryScripts: [],
  deletedGameResidualArtifacts: [],
  preservedLegitimateFiles: []
};

// 1. Remove Old Certification Artifacts
const certFiles = [
  'Tool/execute_real_ui_certification_suite.js',
  'validate_real_ui_certification.js',
  'OPEN_TRANSLATOR_REAL_GAME_MATRIX.json',
  'OPEN_TRANSLATOR_REAL_WORLD_UI_CERTIFICATION.json',
  'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.json',
  'OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.md',
  'OPEN_TRANSLATOR_UNEXPECTED_BEHAVIOR_REPORT.md',
  'OPEN_TRANSLATOR_HARDENING_FINAL_REPORT.md'
];

certFiles.forEach(rel => {
  const full = path.resolve(rootDir, rel);
  if (fs.existsSync(full)) {
    const size = fs.statSync(full).size;
    fs.unlinkSync(full);
    cleanupLog.deletedCertificationArtifacts.push({ file: rel, size });
  }
});

// 2. Remove Game-Specific and Certification-Specific Scripts
const gameSpecificScripts = [
  'Tool/certify_mz_rigorous.js',
  'Tool/certify_renpy_rigorous.js',
  'Tool/certify_solgante_rigorous.js',
  'Tool/certify_summertime03_rigorous.js',
  'Tool/audit_game_rj01058687.js',
  'Tool/scratch_toki_regression.js',
  'Tool/scratch_marge_full_cycle.js',
  'Tool/scratch_rj_full_cycle.js',
  'Tool/scratch_rj_mz_full_cycle.js',
  'Tool/scratch_test_solgante_saveload.js',
  'Tool/inspect_kimochi.js',
  'Tool/scratch_test_kimochi_decrypt.js',
  'Tool/src/tests/toki_15k_real_audit.test.js'
];

gameSpecificScripts.forEach(rel => {
  const full = path.resolve(rootDir, rel);
  if (fs.existsSync(full)) {
    const size = fs.statSync(full).size;
    fs.unlinkSync(full);
    cleanupLog.deletedGameSpecificScripts.push({ file: rel, size });
  }
});

// 3. Remove old temporary test scratch scripts
const tempScripts = [
  'Tool/scratch_apply_patches.js',
  'Tool/scratch_capture_9_screens.js',
  'Tool/scratch_capture_full_dialogue.js',
  'Tool/scratch_capture_options.js',
  'Tool/scratch_capture_title.js',
  'Tool/scratch_check_dialogue_state.js',
  'Tool/scratch_check_extmsg.js',
  'Tool/scratch_check_menu.js',
  'Tool/scratch_check_save.js',
  'Tool/scratch_check_scenes.js',
  'Tool/scratch_check_volumes.js',
  'Tool/scratch_clean_capture.js',
  'Tool/scratch_compare_mv.js',
  'Tool/scratch_get_options.js',
  'Tool/scratch_qa_verify_all.js',
  'Tool/scratch_query_options.js',
  'Tool/scratch_query_windows.js',
  'Tool/scratch_release_validation.js',
  'Tool/scratch_render_dialogue.js',
  'Tool/scratch_test_boot.js',
  'Tool/scratch_test_csv.js',
  'Tool/scratch_test_csv_patch.js',
  'Tool/scratch_test_dialogue.js',
  'Tool/scratch_test_renpy_runtime.js',
  'Tool/scratch_verify_dialogue.js',
  'Tool/prompt_real_ui.txt'
];

tempScripts.forEach(rel => {
  const full = path.resolve(rootDir, rel);
  if (fs.existsSync(full)) {
    const size = fs.statSync(full).size;
    fs.unlinkSync(full);
    cleanupLog.deletedTemporaryScripts.push({ file: rel, size });
  }
});

// 4. Clean verified residual test artifacts from Nova pasta
// (ONLY OpenTranslator generated test artifacts, never legitimate game files!)
const residualArtifacts = [
  { game: 'ArmoredSuitSolganteRenpy0.3-pc', rel: 'ArmoredSuitSolganteRenpy-pc/game/tl', isDir: true },
  { game: 'Marge Mania v0.1', rel: 'data/js_plugins_bak', isDir: true },
  { game: 'Marge Mania v0.1', rel: 'data/plugins.js_bak', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/CheatOverlay.js', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/data/js_plugins_bak', isDir: true },
  { game: 'RJ01058687_en', rel: 'www/data/plugins.js_bak', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/save/common.rpgsave', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/save/config.rpgsave', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/save/file1.rpgsave', isDir: false },
  { game: 'RJ01058687_en', rel: 'www/save/global.rpgsave', isDir: false },
  { game: 'RJ01618221', rel: 'data/js_plugins_bak', isDir: true },
  { game: 'RJ01618221', rel: 'data/plugins.js_bak', isDir: false },
  { game: 'summertime_saga_realistic_remake-0.3.0-win', rel: 'game/fonts/opentranslator_font.ttf', isDir: false },
  { game: 'summertime_saga_realistic_remake-0.3.0-win', rel: 'game/tl', isDir: true },
  { game: 'summertime_saga_realistic_remake-21.0.0-RB.1-win', rel: 'game/fonts/opentranslator_font.ttf', isDir: false },
  { game: 'summertime_saga_realistic_remake-21.0.0-RB.1-win', rel: 'game/tl', isDir: true },
  { game: 'Toki kan Yuusha (gitgud)', rel: 'trans_cache.json', isDir: false },
  { game: 'Toki kan Yuusha (gitgud)', rel: 'www/CheatOverlay.js', isDir: false },
  { game: 'Toki kan Yuusha (gitgud)', rel: 'www/data/js_plugins_bak', isDir: true },
  { game: 'Toki kan Yuusha (gitgud)', rel: 'www/data/plugins.js_bak', isDir: false },
  { game: 'Toki kan Yuusha (gitgud)', rel: 'www/save/config.rpgsave', isDir: false }
];

residualArtifacts.forEach(art => {
  const full = path.join(novaPasta, art.game, art.rel);
  if (fs.existsSync(full)) {
    if (art.isDir) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
    cleanupLog.deletedGameResidualArtifacts.push({ game: art.game, path: art.rel });
  }
});

// Specifically record preserved non-OpenTranslator files
cleanupLog.preservedLegitimateFiles.push({
  game: 'NTR Legend Unofficial Fan Remake 0.9.0 MTL',
  path: 'NL/NTR_Data/Managed/UnityEngine.CoreModule.dll.2026-09-15_02-53-20.bak',
  reason: 'Pre-existing modding file from 2026-09-15, NOT created by OpenTranslator'
});

// 5. Clean _open_translator_audit/games/*/real_ui_test/ so all new sessions are 100% fresh
const auditGamesDir = path.resolve(rootDir, '_open_translator_audit', 'games');
if (fs.existsSync(auditGamesDir)) {
  const items = fs.readdirSync(auditGamesDir);
  items.forEach(gameFolder => {
    const rUiDir = path.join(auditGamesDir, gameFolder, 'real_ui_test');
    if (fs.existsSync(rUiDir)) {
      fs.rmSync(rUiDir, { recursive: true, force: true });
    }
  });
}

// Write Step 2 Cleanup record
const outPath = path.resolve(rootDir, 'AUDIT_STEP_02_CLEANUP.json');
fs.writeFileSync(outPath, JSON.stringify(cleanupLog, null, 2), 'utf8');

console.log('AUDIT_STEP_02_CLEANUP.json generated successfully!');
console.log('Cleanup Summary:');
console.log('  Deleted Certification Artifacts :', cleanupLog.deletedCertificationArtifacts.length);
console.log('  Deleted Game-Specific Scripts    :', cleanupLog.deletedGameSpecificScripts.length);
console.log('  Deleted Temporary Scripts        :', cleanupLog.deletedTemporaryScripts.length);
console.log('  Deleted Game Residual Artifacts  :', cleanupLog.deletedGameResidualArtifacts.length);
console.log('  Preserved Legitimate Files       :', cleanupLog.preservedLegitimateFiles.length);
