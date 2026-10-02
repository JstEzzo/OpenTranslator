/**
 * OpenTranslator — Suíte de Testes Automatizados
 */

const fs = require("fs");
const path = require("path");
const EngineDetector = require("../../src/core/engineDetector");
const CodeProtector = require("../../src/core/codeProtector");
const BackupManager = require("../../src/core/backupManager");
const defaultRegistry = require("../../src/core/engineRegistry");
const TranslationPipeline = require("../../src/core/translationPipeline");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("OPENTRANSLATOR — SUÍTE DE TESTES AUTOMATIZADOS");
  console.log("==================================================\n");

  // TESTE 1: CodeProtector
  console.log("[1] TESTANDO CODE PROTECTOR UNIVERSAL");
  const cp = new CodeProtector();
  const sampleRenpy = "Hello, {color=#fff}hero{/color}! Your HP is [player_hp].";
  const { protectedText: prot1, tokens: tok1 } = cp.protect(sampleRenpy, "renpy");
  assert(prot1.includes("⟦OT_RENPY_TAG_0⟧") && prot1.includes("⟦OT_RENPY_VAR_2⟧"), "Tags e variáveis Ren'Py tokenizadas corretamente");
  const { restoredText: rest1, valid: val1 } = cp.restore(prot1.replace("hero", "herói"), tok1);
  assert(val1 && rest1 === "Hello, {color=#fff}herói{/color}! Your HP is [player_hp].", "Restauração de tokens Ren'Py preservou tags originais");

  const sampleUnity = "Status: <color=#00ff00><b>Online</b></color> (Lv. %d, {0})";
  const { protectedText: prot2, tokens: tok2 } = cp.protect(sampleUnity, "unity");
  const { restoredText: rest2, valid: val2 } = cp.restore(prot2.replace("Online", "Conectado"), tok2);
  assert(val2 && rest2 === "Status: <color=#00ff00><b>Conectado</b></color> (Lv. %d, {0})", "Tags e format strings Unity restauradas sem corrupção");

  const sampleRpgMaker = "Recebeu \\V[1] moedas e \\C[3]chave\\C[0]!\\.";
  const { protectedText: prot3, tokens: tok3 } = cp.protect(sampleRpgMaker, "rpgmaker");
  const { restoredText: rest3, valid: val3 } = cp.restore(prot3.replace("moedas", "coins"), tok3);
  assert(val3 && rest3 === "Recebeu \\V[1] coins e \\C[3]chave\\C[0]!\\.", "Códigos de RPG Maker restaurados perfeitamente");

  // TESTE 2: BackupManager & SHA-256
  console.log("\n[2] TESTANDO BACKUP MANAGER COM INTEGRIDADE SHA-256");
  const bm = new BackupManager({ backupDirName: ".test_backup" });
  const testDir = path.join(__dirname, "scratch_backup_test");
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const dummyFile = path.join(testDir, "data.json");
  fs.writeFileSync(dummyFile, '{"test": "original_content"}', "utf8");

  const backupRes = bm.createBackup(testDir, [dummyFile], { engine: "test" });
  assert(backupRes.success && backupRes.count === 1, "Backup inicial criado com sucesso");

  // Modifica o arquivo
  fs.writeFileSync(dummyFile, '{"test": "modified_content"}', "utf8");
  assert(fs.readFileSync(dummyFile, "utf8").includes("modified_content"), "Arquivo modificado para teste de rollback");

  // Restaura
  const restoreRes = bm.restore(testDir);
  assert(restoreRes.success && restoreRes.restoredCount === 1, "Restauração executada com sucesso");
  assert(fs.readFileSync(dummyFile, "utf8").includes("original_content"), "Conteúdo original de fábrica recuperado 100%");

  // Limpeza
  fs.rmSync(testDir, { recursive: true, force: true });

  // TESTE 3: EngineDetector
  console.log("\n[3] TESTANDO ENGINE DETECTOR COM CASOS REAIS");
  const renpyTarget = require("./testPaths").getRenpyPath() || "C:\\Users\\Teste\\Desktop\\Nova pasta\\ArmoredSuitSolganteRenpy0.3-pc";
  const renpyRes = await EngineDetector.detect(renpyTarget);
  assert(renpyRes.engine === "renpy" && renpyRes.confidence > 0.9, "Ren'Py detectado com confiança > 90%");

  let mvTarget = "C:\\Users\\Teste\\Desktop\\Nova pasta\\Aunt don't be sad - English version";
  let tempMvFixture = false;
  if (!fs.existsSync(mvTarget)) {
    mvTarget = path.join(__dirname, "temp_mv_fixture");
    fs.mkdirSync(path.join(mvTarget, "www", "data"), { recursive: true });
    fs.writeFileSync(path.join(mvTarget, "www", "data", "System.json"), '{"gameTitle":"Mock MV"}');
    fs.writeFileSync(path.join(mvTarget, "Game.exe"), "mock_exe");
    tempMvFixture = true;
  }
  const mvRes = await EngineDetector.detect(mvTarget);
  assert(mvRes.engine === "mv" && mvRes.confidence > 0.9, "RPG Maker MV detectado com confiança > 90%");
  if (tempMvFixture) {
    fs.rmSync(mvTarget, { recursive: true, force: true });
  }

  let electronTarget = "C:\\Users\\Teste\\Desktop\\Nova pasta\\DokiDoki-Massage-v2.1.5";
  let tempFixture = false;
  if (!fs.existsSync(electronTarget)) {
    electronTarget = path.join(__dirname, "temp_electron_fixture");
    fs.mkdirSync(path.join(electronTarget, "resources"), { recursive: true });
    fs.writeFileSync(path.join(electronTarget, "resources", "app.asar"), "mock_asar");
    tempFixture = true;
  }
  const electronRes = await EngineDetector.detect(electronTarget);
  assert(electronRes.engine === "electron" && electronRes.confidence > 0.9, "Electron detectado em subpasta com confiança > 90%");
  if (tempFixture) {
    fs.rmSync(electronTarget, { recursive: true, force: true });
  }

  const unityRes = await EngineDetector.detect("C:\\Users\\Teste\\Desktop\\Nova pasta\\MiniGamePackVol1_v1.0_demo\\MiniGamePackVol1_v1.0_forWin_demo");
  assert(unityRes.engine === "unity" && unityRes.engineVersion.includes("Mono"), "Unity Mono detectado e diferenciado de IL2CPP");

  const wolfRes = await EngineDetector.detect("C:\\Users\\Teste\\Desktop\\Nova pasta\\Rabbit Hood English 2026-06-30");
  assert(wolfRes.engine === "wolf" && wolfRes.confidence > 0.9, "Wolf RPG detectado com confiança > 90%");

  // TESTE 4: Round-Trip Mock Translation (Ponto 40 e 41)
  console.log("\n[4] TESTANDO ROUND-TRIP COM MOCK TRANSLATOR");
  const pipeline = new TranslationPipeline();
  const dryRes = await pipeline.dryRun(renpyTarget);
  assert(dryRes.success && dryRes.dryRun === true && dryRes.filesModified === 0, "Dry-run executado com 0 arquivos alterados");
  assert(dryRes.totalStrings > 0, `Dry-run extraiu com sucesso ${dryRes.totalStrings} strings`);

  console.log("\n==================================================");
  console.log(`RESULTADO FINAL DOS TESTES: ${passedTests}/${totalTests} PASSARAM (${failedTests} FALHAS)`);
  console.log("==================================================");

  if (failedTests > 0) process.exit(1);
}

runTests();
