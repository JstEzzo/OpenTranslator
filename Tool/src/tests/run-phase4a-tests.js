const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Phase 4A Intelligence Modules
const ExecutableAnalyzer = require('../diagnostics/executableAnalyzer');
const ProcessInspector = require('../diagnostics/processInspector');
const ErrorAnalyzer = require('../diagnostics/errorAnalyzer');
const LogIntelligence = require('../diagnostics/logIntelligence');
const UniversalGameIntelligence = require('../diagnostics/universalGameIntelligence');
const universalRuntimeHost = require('../runtime/universalRuntimeHost');
const runtimeEventBus = require('../runtime/runtimeEventBus');
const runRepoLint = require('../tools/repoLint');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('   OPENTRANSLATOR — PHASE 4A TEST SUITE');
  console.log('   UNIVERSAL RUNTIME INTELLIGENCE & REPO AUDIT');
  console.log('====================================================\n');

  // Test 1: Executable Analyzer (PE parsing)
  runTest('ExecutableAnalyzer: Parse PE binary architecture & sections', () => {
    const analyzer = new ExecutableAnalyzer();
    const testExe = path.resolve(__dirname, '../../loaders/PIDDLLInject64.exe');
    assert(fs.existsSync(testExe), 'PIDDLLInject64.exe exists');

    const pe = analyzer.analyzeExecutable(testExe);
    assert.strictEqual(pe.isPE, true, 'Should detect PE format');
    assert.strictEqual(pe.arch, 'x64', 'Should detect 64-bit architecture');
    assert(pe.sections && pe.sections.length > 0, 'Should extract PE sections');
    assert(pe.sections.includes('.text'), 'Should have .text section');
  });

  // Test 2: Process Inspector
  runTest('ProcessInspector: Inspect active Node.js process', () => {
    const pInfo = ProcessInspector.inspectProcess(process.pid);
    assert.strictEqual(pInfo.ok, true, 'Inspection succeeded');
    assert.strictEqual(pInfo.pid, process.pid, 'PID matches current process');
    assert(pInfo.architecture === 'x64' || pInfo.architecture === 'x86', 'Architecture detected');
    assert(Array.isArray(pInfo.loadedModules), 'Loaded modules array returned');
  });

  // Test 3: Error Analyzer
  runTest('ErrorAnalyzer: Classify toolchain & syntax errors with structured JSON', () => {
    const analyzer = new ErrorAnalyzer();
    
    // Test known signature: Python ModuleNotFoundError in Ren'Py
    const diag = analyzer.analyzeError({
      stderr: 'ModuleNotFoundError: No module named renpy.compat',
      engine: 'renpy',
      stage: 'renpy-extraction'
    });

    assert.strictEqual(diag.category, 'TOOLCHAIN');
    assert.strictEqual(diag.code, 'OT-TOOLCHAIN-001');
    assert(diag.recommendedActions.length > 0, 'Has recommended actions');
    assert(diag.fallbackStrategies.length > 0, 'Has fallbacks');
  });

  // Test 4: Log Intelligence & Event Correlation
  runTest('LogIntelligence: Parse simulated Unity Player.log and correlate events', () => {
    const logIntel = new LogIntelligence();
    const mockLog = `Initialize engine version: 2021.3.16f1 (40165700f724)
[Subsystems] Discovering subsystems at path
CrashReporter: Initialized
NullReferenceException: Object reference not set to an instance of an object
  at Game.Localization.TextLoader.Awake () [0x00000] in <00000000000000000000000000000000>:0
`;
    const tempLogPath = path.join(__dirname, 'temp_mock_Player.log');
    fs.writeFileSync(tempLogPath, mockLog, 'utf8');

    try {
      const parsed = logIntel.parseUnityLog(tempLogPath);
      assert.strictEqual(parsed.engineVersion, '2021.3.16f1');
      assert.strictEqual(parsed.errors.length, 1);
      assert(parsed.errors[0].includes('NullReferenceException'));
    } finally {
      if (fs.existsSync(tempLogPath)) fs.unlinkSync(tempLogPath);
    }
  });

  // Test 5: Universal Game Intelligence & Forensics
  await runAsyncTest('UniversalGameIntelligence: Generate forensic diagnostic bundle', async () => {
    const ugi = new UniversalGameIntelligence();
    // Test against a mock game folder
    const mockDir = path.join(__dirname, 'mock_unity_game');
    const mockDataDir = path.join(mockDir, 'Game_Data');
    fs.mkdirSync(mockDataDir, { recursive: true });
    fs.writeFileSync(path.join(mockDir, 'Game.exe'), 'MZ' + 'A'.repeat(500));
    fs.writeFileSync(path.join(mockDataDir, 'globalgamemanagers'), '2021.3.16f1');

    try {
      const res = await ugi.diagnoseGame(mockDir);
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.report.engine.type, 'unity');
      assert(res.report.strategies.ocr !== undefined);
      assert(res.report.recommendedStrategy !== undefined);
    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });

  // Test 6: UniversalRuntimeHost & RuntimeEventBus
  runTest('UniversalRuntimeHost: Session tracking and architectural validation', () => {
    const status = universalRuntimeHost.getStatus();
    assert.strictEqual(status.architecture, 'UniversalRuntimeHost + Modular Engine Providers');
    assert(status.superDllViability.includes('REJECTED'));

    // Start session in OBSERVE_ONLY mode
    const session = universalRuntimeHost.startSession(process.pid, process.cwd(), { mode: 'OBSERVE_ONLY' });
    assert.strictEqual(session.mode, 'OBSERVE_ONLY');
    assert.strictEqual(session.pid, process.pid);

    const tick = universalRuntimeHost.observeTick(process.pid);
    assert.strictEqual(tick.ok, true);

    const stop = universalRuntimeHost.stopSession(process.pid);
    assert.strictEqual(stop.ok, true);
  });

  // Test 7: Repository Cleanliness Lint
  runTest('RepoLint: Deterministic repository structure validation', () => {
    const rootPath = path.resolve(__dirname, '../../..');
    const lint = runRepoLint(rootPath);
    assert.strictEqual(lint.ok, true, `Repo should be clean, issues: ${JSON.stringify(lint.issues)}`);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 4A Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
