const fs = require('fs');
/**
 * OpenTranslator — Bateria de Testes da Fase 3 (Real-World Translation & Hardening)
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const StrategyPlanner = require('../core/strategyPlanner');
const transactionJournal = require('../core/transactionJournal');
const RenpyParser = require('../engines/renpy/renpyParser');
const AsarRepacker = require('../engines/electron/asarRepacker');
const UniversalScanner = require('../engines/generic/universalScanner');
const gameService = require('../core/gameService');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log('  ✓ PASS:', name);
    passed++;
  } catch (e) {
    console.error('  ✗ FAIL:', name, '->', e.message);
    failed++;
  }
}

async function run() {
  console.log('==================================================');
  console.log('OPENTRANSLATOR — FASE 3: TESTES DE OPERABILIDADE REAL');
  console.log('==================================================\n');

  // 1. STRATEGY PLANNER
  console.log('[1] TESTANDO STRATEGY PLANNER BASEADO EM CAPACIDADES E RISCOS');
  check('StrategyPlanner: Ren\'Py classifica Native TL como READY e prioritário', () => {
    const fakeDetection = { engine: 'renpy', engineVersion: '8.x', capabilities: { nativeLocalization: true } };
    const plan = StrategyPlanner.plan(fakeDetection, path.join(__dirname, 'mock_renpy'));
    assert.strictEqual(plan.preferredKey, 'native_tl');
    assert.strictEqual(plan.strategies.native_tl.status, 'EXPERIMENTAL'); // Sem pasta game/ real
  });

  check('StrategyPlanner: Unity IL2CPP bloqueia Runtime Hook com motivo explícito', () => {
    const fakeDetection = { engine: 'unity', engineVersion: '2022', capabilities: { runtimeHook: false } };
    const plan = StrategyPlanner.plan(fakeDetection, path.join(__dirname, 'mock_unity'));
    assert.strictEqual(plan.strategies.runtime_hook.status, 'BLOCKED');
    assert(plan.strategies.runtime_hook.reason.includes('IL2CPP') || plan.strategies.runtime_hook.reason.includes('BepInEx'));
  });

  // 2. TRANSACTION JOURNAL
  console.log('\n[2] TESTANDO TRANSACTION JOURNAL PERSISTENTE');
  check('TransactionJournal: Ciclo completo (staged -> committing -> committed)', () => {
    const tx = transactionJournal.createTransaction('C:/Games/TestGame', 'mv');
    assert(tx.id.startsWith('tx_'));
    assert.strictEqual(tx.status, 'staged');

    transactionJournal.recordFile(tx.id, 'data/Actors.json', 'hash123', 'hash456');
    transactionJournal.setCommitting(tx.id);
    assert.strictEqual(transactionJournal.getTransaction(tx.id).status, 'committing');

    transactionJournal.setCommitted(tx.id);
    assert.strictEqual(transactionJournal.getTransaction(tx.id).status, 'committed');
  });

  // 3. REN'PY AST & SYNTAX VALIDATOR
  console.log('\n[3] TESTANDO REN\'PY AST & SYNTAX VALIDATOR');
  check('RenpyParser: Valida sintaxe correta de .rpy', () => {
    const validRpy = [
      'translate pt_BR strings:',
      '    old "Hello"',
      '    new "Olá"',
      '',
      '    old "World"',
      '    new "Mundo"'
    ].join('\n');
    const res = RenpyParser.validateRpy(validRpy);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  check('RenpyParser: Rejeita aspas desbalanceadas e IDs duplicados', () => {
    const brokenRpy = [
      'translate pt_BR intro_1:',
      '    "Texto sem fechar aspas',
      '',
      'translate pt_BR intro_1:',
      '    "Outro texto"'
    ].join('\n');
    const res = RenpyParser.validateRpy(brokenRpy);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('aspas') || e.includes('Aspas')));
    assert(res.errors.some(e => e.includes('duplicado') || e.includes('Duplicado')));
  });

  // 4. ELECTRON ASAR REPACKER COM INTEGRIDADE
  console.log('\n[4] TESTANDO ASAR REPACKER & INTEGRIDADE DE CABEÇALHO');
  check('AsarRepacker: Empacota diretório em .asar com alinhamento 4-byte e magic pickle', () => {
    const tmpDir = path.join(os.tmpdir(), 'ot_asar_test_' + Date.now());
    fs.mkdirSync(path.join(tmpDir, 'locales'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name": "test-app", "version": "1.0.0"}', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'locales', 'en.json'), '{"greeting": "Hello"}', 'utf8');

    const outAsar = path.join(tmpDir, 'app.asar');
    const packRes = AsarRepacker.pack(tmpDir, outAsar);

    assert.strictEqual(packRes.success, true);
    assert(packRes.headerBytes > 16);
    assert(fs.existsSync(outAsar));

    // Limpa
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 5. UNIVERSAL SCANNER HEURÍSTICO
  console.log('\n[5] TESTANDO UNIVERSAL SCANNER (CONFIDENCE & FILE RISK)');
  check('UniversalScanner: Pontua texto humano alto e hex/código baixo', () => {
    const humanScore = UniversalScanner.scoreText("Olá, guerreiro! Deseja salvar o jogo agora?");
    const hexScore = UniversalScanner.scoreText("a1b2c3d4e5f60718293a4b5c6d7e8f90");
    const codeScore = UniversalScanner.scoreText("function_name_only");

    assert(humanScore >= 70, "Texto humano deve ter score alto: " + humanScore);
    assert(hexScore <= 20, "Hash hexadecimal deve ser penalizado: " + hexScore);
    assert(codeScore <= 40, "Identificador de código puro deve ser penalizado: " + codeScore);
  });

  check('UniversalScanner: Classifica risco por tipo de arquivo', () => {
    assert.strictEqual(UniversalScanner.scoreFileRisk("C:/Games/game.exe").risk, "DO_NOT_MODIFY");
    assert.strictEqual(UniversalScanner.scoreFileRisk("C:/Games/locales/pt.json").risk, "SAFE");
    assert.strictEqual(UniversalScanner.scoreFileRisk("C:/Games/main.js").risk, "CAUTION");
  });

  // 6. INTEGRAÇÃO REAL COM GAMESERVICE.ANALYZEGAME
  console.log('\n[6] TESTANDO GAMESERVICE.ANALYZEGAME COM STRATEGY MATRIX');
  await (async () => {
    try {
      const realRenpyGame = 'C:/Users/Teste/Desktop/Nova pasta/ArmoredSuitSolganteRenpy0.2-pc';
      if (fs.existsSync(realRenpyGame)) {
        const analysis = await gameService.analyzeGame(realRenpyGame);
        assert.strictEqual(analysis.ok, true);
        assert.strictEqual(analysis.engine, 'renpy');
        assert(analysis.strategies !== undefined);
        assert(analysis.strategies.native_tl.status === 'READY');
        assert(analysis.recommendedStrategy.includes('Nativa'));
        console.log('  ✓ PASS: GameService gerou matriz de estratégias completa para Ren\'Py');
        passed++;
      }
    } catch (e) {
      console.error('  ✗ FAIL: GameService analyzeGame ->', e.message);
      failed++;
    }
  })();

  console.log('\n==================================================');
  console.log('RESULTADO FASE 3: ' + passed + ' PASSARAM (' + failed + ' FALHAS)');
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

run();
