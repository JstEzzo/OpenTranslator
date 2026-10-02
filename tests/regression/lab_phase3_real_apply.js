/**
 * OpenTranslator — Phase 3 Real-World Apply & Rollback Verification on Sandboxed Copies
 * Testa a cadeia completa em cópias seguras dos jogos do laboratório real:
 * DETECT -> ANALYZE -> STRATEGY -> EXTRACT -> PROTECT -> TRANSLATE -> QA VALIDATE -> APPLY -> POST-PARSE -> ROLLBACK -> HASH RECOVERY
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const gameService = require("../../src/core/gameService");
const RenpyParser = require("../../src/engines/renpy/renpyParser");

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Ignora pastas gigantes desnecessárias para o teste de apply de texto
      if (entry.name !== "audio" && entry.name !== "img" && entry.name !== "pictures") {
        copyDirRecursive(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function runRealWorldApplyLab() {
  console.log("==================================================");
  console.log("OPENTRANSLATOR — FASE 3: LABORATÓRIO DE APPLY REAL EM CÓPIAS");
  console.log("==================================================\n");

  const labSourceDir = "C:/Users/Teste/Desktop/Nova pasta";
  const scratchRoot = path.join(global.ROOT || path.join(__dirname, "../.."), "scratch", "phase3_lab");
  if (fs.existsSync(scratchRoot)) fs.rmSync(scratchRoot, { recursive: true, force: true });
  fs.mkdirSync(scratchRoot, { recursive: true });

  const testTargets = [
    { name: "ArmoredSuitSolganteRenpy0.2-pc", engine: "renpy" },
    { name: "Marie's Adventure", engine: "mv" }
  ];

  let passed = 0;
  let total = testTargets.length;

  for (const target of testTargets) {
    const origGamePath = path.join(labSourceDir, target.name);
    if (!fs.existsSync(origGamePath)) {
      console.log(`[PULANDO] ${target.name}: pasta original não encontrada.`);
      continue;
    }

    console.log(`\n--- [TESTE REAL] ${target.name} (${target.engine.toUpperCase()}) ---`);

    // 1. Cria cópia segura em scratch
    const sandboxedGame = path.join(scratchRoot, target.name);
    console.log("1. Criando cópia segura em sandbox...");
    copyDirRecursive(origGamePath, sandboxedGame);

    // 2. Análise & Strategy Planning
    console.log("2. Executando análise técnica e Strategy Planner...");
    const analysis = await gameService.analyzeGame(sandboxedGame);
    console.log(`   -> Engine: ${analysis.engine} (${analysis.engineVersion}), Confiança: ${analysis.confidence}%`);
    console.log(`   -> Estratégia Recomendada: ${analysis.recommendedStrategy}`);

    // 3. Dry-Run
    console.log("3. Executando Dry-Run...");
    const dryRes = await gameService.dryRun(sandboxedGame);
    console.log(`   -> Total de Strings: ${dryRes.totalStrings}, Tokens Protegidos: ${dryRes.protectedTokensCount}`);

    // 4. Gravação de Baseline de Hashes
    const gameSubDir = analysis.targetDir;
    let testCheckFile = "";
    if (target.engine === "renpy") {
      testCheckFile = path.join(gameSubDir, "tl", "pt_BR", "opentranslator_tl.rpy");
    } else if (target.engine === "mv") {
      testCheckFile = path.join(gameSubDir, "data", "System.json");
    }
    const preApplyHash = hashFile(testCheckFile);

    // 5. Execução do Apply Real via Pipeline com Mock Translations
    console.log("4. Executando Apply Real com validação transacional...");
    const applyRes = await gameService.pipeline.run(sandboxedGame, {
      lang: "pt_BR",
      dryRun: false,
      provider: "mock"
    });
    console.log(`   -> Sucesso: ${applyRes.success}, Textos Processados: ${applyRes.totalStrings || 0}`);

    // 6. Post-Parse Validation
    if (target.engine === "renpy") {
      console.log("5. Validando sintaxe AST do arquivo .rpy gerado...");
      if (fs.existsSync(testCheckFile)) {
        const rpyText = fs.readFileSync(testCheckFile, "utf8");
        const parseCheck = RenpyParser.validateRpy(rpyText);
        console.log(`   -> AST Validation: ${parseCheck.valid ? "PASS" : "FAIL (Erros: " + parseCheck.errors.join("; ") + ")"}`);
        if (!parseCheck.valid) throw new Error("RenpyParser rejeitou o arquivo gerado.");
      } else {
        throw new Error("Arquivo opentranslator_tl.rpy não foi gerado.");
      }
    } else if (target.engine === "mv") {
      console.log("5. Validando integridade JSON pós-aplicação...");
      const sysRaw = fs.readFileSync(testCheckFile, "utf8");
      JSON.parse(sysRaw); // Checa se parseia sem erro de sintaxe
      console.log("   -> Integridade JSON: PASS");
    }

    // 7. Rollback Real
    console.log("6. Testando Rollback seguro...");
    const rollbackRes = await gameService.rollback(sandboxedGame);
    console.log(`   -> Rollback executado: ${rollbackRes.ok}`);

    // 8. Verificação de Hashes Pós-Rollback
    console.log("7. Verificando retorno ao estado original de fábrica...");
    if (target.engine === "renpy") {
      const existsAfter = fs.existsSync(testCheckFile);
      if (!existsAfter) {
        console.log("   ✓ SUCESSO: Arquivo de tradução removido no rollback, jogo intacto.");
        passed++;
      } else {
        console.error("   ✗ FALHA: Arquivo de tradução ainda persiste após rollback.");
      }
    } else if (target.engine === "mv") {
      const postRollbackHash = hashFile(testCheckFile);
      if (postRollbackHash === preApplyHash) {
        console.log("   ✓ SUCESSO: Hash SHA-256 pós-rollback 100% idêntico ao original.");
        passed++;
      } else {
        console.error(`   ✗ FALHA: Hash divergente (${postRollbackHash} vs ${preApplyHash})`);
      }
    }
  }

  // Limpeza
  fs.rmSync(scratchRoot, { recursive: true, force: true });

  console.log(`\n==================================================`);
  console.log(`RESULTADO DO LABORATÓRIO REAL: ${passed}/${total} SUCESSOS`);
  console.log(`==================================================`);

  if (passed !== total) process.exit(1);
}

runRealWorldApplyLab();
