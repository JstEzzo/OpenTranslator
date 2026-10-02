const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const novaPasta = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

// 1. Certification Artifacts
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

const certificationArtifacts = certFiles.map(rel => {
  const full = path.resolve(rootDir, rel);
  const exists = fs.existsSync(full);
  return {
    file: rel,
    fullPath: full,
    exists,
    size: exists ? fs.statSync(full).size : 0,
    type: 'CERTIFICATION_ARTIFACT'
  };
});

// 2. Audit Directory
const auditDir = path.resolve(rootDir, '_open_translator_audit');
const auditSummary = {
  path: '_open_translator_audit',
  fullPath: auditDir,
  exists: fs.existsSync(auditDir),
  gamesCount: 0,
  games: []
};

if (fs.existsSync(auditDir)) {
  const gDir = path.join(auditDir, 'games');
  if (fs.existsSync(gDir)) {
    const items = fs.readdirSync(gDir);
    auditSummary.gamesCount = items.length;
    auditSummary.games = items.map(name => {
      const gPath = path.join(gDir, name);
      let subdirs = [];
      try { subdirs = fs.readdirSync(gPath); } catch(e) {}
      return {
        name,
        hasRealUiTest: subdirs.includes('real_ui_test'),
        subdirs
      };
    });
  }
}

// 3. Scan and Classify all JS files
function classifyJs(normPath) {
  // Certification specific
  if (normPath === 'Tool/execute_real_ui_certification_suite.js') {
    return 'CERTIFICATION_SPECIFIC';
  }
  if (normPath.startsWith('validate_')) {
    return 'VALIDATOR';
  }
  
  // Game specific
  const gameKeywords = ['toki', 'rj01058687', 'solgante', 'summertime', 'marge', 'rj_mz', 'kimochi'];
  const baseName = path.basename(normPath).toLowerCase();
  
  if (normPath.startsWith('Tool/certify_') || normPath.startsWith('Tool/audit_game_')) {
    return 'GAME_SPECIFIC';
  }
  
  if (gameKeywords.some(kw => baseName.includes(kw)) && !baseName.includes('testpaths')) {
    return 'GAME_SPECIFIC';
  }
  
  // Engine
  if (normPath.startsWith('Tool/src/engines/') || normPath.startsWith('Tool/src/mediaExtractor/')) {
    return 'ENGINE';
  }
  
  // Core
  if (normPath.startsWith('Tool/src/core/') ||
      normPath.startsWith('Tool/src/diagnostics/') ||
      normPath.startsWith('Tool/src/discovery/') ||
      normPath.startsWith('Tool/src/ocr/') ||
      normPath.startsWith('Tool/src/providers/') ||
      normPath.startsWith('Tool/src/runtime/') ||
      normPath.startsWith('Tool/src/utils/') ||
      normPath.startsWith('Tool/src/tools/') && !normPath.includes('run-') ||
      normPath === 'Tool/server.js' ||
      normPath === 'Tool/run-pipeline-cli.js' ||
      normPath === 'Tool/src/gameEngine.js' ||
      normPath === 'Tool/src/extractor.js' ||
      normPath === 'Tool/src/translator.js' ||
      normPath === 'Tool/src/cache.js' ||
      normPath === 'Tool/src/logger.js' ||
      normPath === 'Tool/src/loggerManager.js' ||
      normPath === 'Tool/src/utils.js' ||
      normPath === 'Tool/src/renpyAppDataResolver.js' ||
      normPath === 'Tool/src/rpcHandlers.js' ||
      normPath === 'Tool/src/cheatServer.js' ||
      normPath === 'Tool/src/CheatOverlay.js' ||
      normPath === 'Tool/src/httpServer.js' ||
      normPath === 'Tool/src/mediaExtractor.js' ||
      normPath.startsWith('Tool/templates/') ||
      normPath.startsWith('Tool/www/') ||
      normPath.startsWith('Tool/resources/')) {
    return 'CORE';
  }
  
  // Test Runner / Tests
  if (normPath.startsWith('Tool/tests/') ||
      normPath.startsWith('Tool/src/tests/') ||
      normPath.startsWith('Tool/src/fixtures/') ||
      normPath === 'Tool/run-lab-tests.js' ||
      normPath === 'Tool/src/tools/run-phase7-real-lab.js') {
    return 'TEST_RUNNER';
  }
  
  // Temporary / Scratch
  if (baseName.startsWith('scratch_') ||
      baseName.startsWith('test_') ||
      baseName.startsWith('check_') ||
      baseName.startsWith('inspect_') ||
      baseName.startsWith('deep_') ||
      baseName.startsWith('cli-') ||
      baseName.startsWith('read_') ||
      baseName.startsWith('create_backup') ||
      baseName.startsWith('restore_') ||
      baseName.startsWith('generate_') ||
      baseName.startsWith('init_') ||
      baseName.startsWith('survey_') ||
      baseName.startsWith('build_step01_')) {
    return 'TEMPORARY';
  }
  
  return 'UNKNOWN';
}

const jsInventory = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', '.git', 'third-party', 'archive', 'backup_before_renpy_full_integration', 'backup_before_next_engine', 'temp_chrome_profile'].includes(e.name)) {
      continue;
    }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.name.endsWith('.js')) {
      const rel = path.relative(rootDir, full).split(path.sep).join('/');
      const classification = classifyJs(rel);
      jsInventory.push({
        path: rel,
        size: fs.statSync(full).size,
        classification
      });
    }
  }
}

walk(rootDir);

// 4. Scan Nova pasta for OpenTranslator artifacts
const novaPastaArtifacts = [];
if (fs.existsSync(novaPasta)) {
  const games = fs.readdirSync(novaPasta, { withFileTypes: true });
  for (const g of games) {
    if (!g.isDirectory()) continue;
    const gPath = path.join(novaPasta, g.name);
    const found = [];

    function scanG(dir, depth = 0) {
      if (depth > 6) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const it of items) {
          const full = path.join(dir, it.name);
          const rel = path.relative(gPath, full).split(path.sep).join('/');

          if (it.name === 'trans_cache.json' ||
              it.name === 'CheatOverlay.js' ||
              it.name.startsWith('000_opentranslator') ||
              it.name.includes('_bak') ||
              it.name === 'tl' ||
              it.name === 'pt_BR' ||
              it.name.endsWith('.rpgsave') ||
              it.name.includes('opentranslator') ||
              it.name.includes('OT_') ||
              (it.name.endsWith('.bak') && !it.name.includes('Managed'))) {
            found.push({
              relPath: rel,
              fullPath: full,
              isDirectory: it.isDirectory(),
              size: it.isDirectory() ? 0 : fs.statSync(full).size,
              origin: 'OpenTranslator Test / Runtime'
            });
          }
          if (it.isDirectory() && it.name !== 'node_modules' && it.name !== '.git') {
            scanG(full, depth + 1);
          }
        }
      } catch(e) {}
    }

    scanG(gPath);
    if (found.length > 0) {
      novaPastaArtifacts.push({
        game: g.name,
        artifacts: found
      });
    }
  }
}

// 5. Counts
const countsByClass = {};
jsInventory.forEach(item => {
  countsByClass[item.classification] = (countsByClass[item.classification] || 0) + 1;
});

const fullInventory = {
  timestamp: new Date().toISOString(),
  step: 'PASSO 1 — INVENTARIAR TUDO ANTES DE APAGAR',
  summary: {
    totalCertificationArtifacts: certificationArtifacts.length,
    auditGamesTracked: auditSummary.gamesCount,
    totalJsFiles: jsInventory.length,
    jsClassificationCounts: countsByClass,
    gamesWithResidualArtifacts: novaPastaArtifacts.length
  },
  certificationArtifacts,
  auditDirectory: auditSummary,
  jsFiles: jsInventory,
  gameLibraryResidualArtifacts: novaPastaArtifacts
};

const outPath = path.resolve(rootDir, 'AUDIT_STEP_01_INVENTORY.json');
fs.writeFileSync(outPath, JSON.stringify(fullInventory, null, 2), 'utf8');

console.log('AUDIT_STEP_01_INVENTORY.json generated successfully!');
console.log('Summary:', JSON.stringify(fullInventory.summary, null, 2));
