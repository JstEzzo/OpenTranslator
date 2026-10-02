/**
 * OpenTranslator — real_game_launch_smoke.test.js
 * Teste final de smoke test com o jogo real Toki kan Yuusha (RPG Maker MZ).
 *
 * Fluxo oficial:
 * 1. Hashes originais
 * 2. Backup transacional
 * 3. Aplicação controlada
 * 4. Validação de sintaxe
 * 5. Launch do executável real (game.exe)
 * 6. Aguardar boot e checar processo ativo no SO
 * 7. Encerramento seguro do processo (OwnedProcess)
 * 8. Rollback transacional
 * 9. Comparação byte a byte dos hashes SHA-256
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const { extractGameTexts } = require("../extractor");
const { patchGameData, backupGameData, restoreGameData } = require("../../src/gameEngine");
const PluginSafePatcher = require("../../src/core/pluginSafePatcher");
const ownedProcessRegistry = require("../../src/core/ownedProcessRegistry");

function getHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("========================================================================");
  console.log("   OPENTRANSLATOR — SMOKE TEST FINAL: JOGO REAL & LIFECYCLE");
  console.log("========================================================================\n");

  const { getTokiPath } = require('./testPaths');
  const gameDir = getTokiPath();
  if (!gameDir || !fs.existsSync(gameDir)) {
    console.log("  [PULADO - LAB_FIXTURE_NOT_INSTALLED] Diretório do jogo Toki kan Yuusha não encontrado.");
    return;
  }

  const exePath = path.join(gameDir, "game.exe");
  assert(fs.existsSync(exePath), "game.exe must exist in game folder");

  const systemJsonPath = path.join(gameDir, "www", "data", "System.json");
  const pluginsJsPath = path.join(gameDir, "www", "js", "plugins.js");
  const itemBookPath = path.join(gameDir, "www", "js", "plugins", "ItemBook.js");

  // 1. CAPTURA DOS HASHES ORIGINAIS
  console.log(">>> ETAPA 1: CAPTURA DOS HASHES ORIGINAIS (PRE-TESTE) <<<");
  const SHA256_SYSTEM_ORIG = getHash(systemJsonPath);
  const SHA256_PLUGINS_ORIG = getHash(pluginsJsPath);
  const SHA256_ITEMBOOK_ORIG = getHash(itemBookPath);

  console.log("  System.json  : " + SHA256_SYSTEM_ORIG);
  console.log("  plugins.js   : " + SHA256_PLUGINS_ORIG);
  console.log("  ItemBook.js  : " + SHA256_ITEMBOOK_ORIG);

  // 2. CRIAÇÃO DE BACKUP TRANSACIONAL
  console.log("\n>>> ETAPA 2: CRIAÇÃO DO BACKUP TRANSACIONAL (backupGameData) <<<");
  const bakDir = backupGameData(gameDir);
  assert(bakDir && fs.existsSync(bakDir), "Backup directory must be created");
  console.log("  Backup criado em: " + bakDir);

  let launchSuccess = false;
  let childPid = null;

  try {
    // 3. APLICAÇÃO CONTROLADA
    console.log("\n>>> ETAPA 3: APLICAÇÃO CONTROLADA DE TRADUÇÃO (patchGameData) <<<");
    const allTexts = extractGameTexts(gameDir);
    const cacheFile = path.join(gameDir, "trans_cache.json");
    const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const cacheTranslations = cd.translations || {};

    const translationsMap = new Map();
    for (const t of allTexts) {
      const k = t.file + ":" + t.keys.join(".") + ":" + t.original;
      if (cacheTranslations[k]) {
        translationsMap.set(t.id, cacheTranslations[k]);
      }
    }

    // Tradução controlada da UI do ItemBook
    const itemBookTexts = allTexts.filter(t => t.file === "js/plugins/ItemBook.js");
    for (const ib of itemBookTexts) {
      if (ib.clean === "Price") translationsMap.set(ib.id, "Preço [PT]");
      if (ib.clean === "Equip") translationsMap.set(ib.id, "Equipar [PT]");
      if (ib.clean === "Type") translationsMap.set(ib.id, "Tipo [PT]");
    }

    const patchedCount = patchGameData(gameDir, allTexts, translationsMap);
    console.log("  Textos patcheados no jogo: " + patchedCount);
    assert(patchedCount > 25000, "Must patch over 25,000 texts (got " + patchedCount + ")");

    // 4. VALIDAÇÃO DE SINTAXE DOS PLUGINS MODIFICADOS
    console.log("\n>>> ETAPA 4: VALIDAÇÃO DE SINTAXE (VALIDATION) <<<");
    const patcher = new PluginSafePatcher();
    const patchedContent = fs.readFileSync(itemBookPath, "utf8");
    const syntax = patcher.validateSyntax(patchedContent, "ItemBook.js");
    assert.strictEqual(syntax.valid, true, "ItemBook.js must be syntactically valid");
    console.log("  Sintaxe V8 validada com sucesso (Zero erros).");

    // 5. LAUNCH REAL DO EXECUTÁVEL
    console.log("\n>>> ETAPA 5: INICIALIZAÇÃO DO EXECUTÁVEL REAL (game.exe) <<<");
    // Mata processos anteriores zumbis se houver
    try { spawnSync("taskkill", ["/F", "/IM", "game.exe"], { stdio: "ignore" }); } catch (e) {}

    const child = spawn(exePath, [], {
      cwd: gameDir,
      stdio: "ignore",
      detached: false
    });

    childPid = child.pid;
    assert(childPid > 0, "Child process must have valid PID");
    console.log(`  Processo game.exe spawnado com PID: ${childPid}`);

    ownedProcessRegistry.register(child, {
      exePath,
      command: exePath
    });

    // 6. AGUARDAR BOOT E CONFIRMAR EXECUÇÃO ATIVA NO SO
    console.log("\n>>> ETAPA 6: AGUARDANDO BOOT E VERIFICANDO ATIVIDADE DO PROCESSO <<<");
    await sleep(2500);

    // Consulta se o processo ainda está ativo no SO
    let isAlive = false;
    try {
      const psCheck = spawnSync("powershell", [
        "-NoProfile", "-NonInteractive", "-Command",
        `Get-Process -Id ${childPid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id`
      ], { encoding: "utf8", timeout: 4000 });

      const stdoutId = (psCheck.stdout || "").trim();
      isAlive = (stdoutId === String(childPid));
      if (!isAlive) {
        const nameCheck = spawnSync("powershell", [
          "-NoProfile", "-NonInteractive", "-Command",
          `Get-Process -Name game -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id`
        ], { encoding: "utf8", timeout: 4000 });
        if ((nameCheck.stdout || "").trim().length > 0) isAlive = true;
      }
    } catch (e) {
      isAlive = false;
    }

    console.log(`  Verificação no SO: PID ${childPid} ativo = ${isAlive}`);
    assert.strictEqual(isAlive, true, "game.exe must be running and healthy after boot");
    launchSuccess = true;
    console.log("  ✓ REAL GAME LAUNCH: PROVADO (game.exe inicializou e permaneceu ativo em execução)");

    // 7. AVALIAÇÃO DA INTERFACE VISUAL
    console.log("\n>>> ETAPA 7: AVALIAÇÃO DE INTERFACE VISUAL REAL <<<");
    console.log("  REAL GAME VISUAL VALIDATION: NÃO COMPROVADO NESTE AMBIENTE");
    console.log("  (O executável NW.js renderiza em superfície GPU privada; inspeção de pixels de tela depende de hardware display/OCR externo)");

  } finally {
    // 8. ENCERRAMENTO SEGURO DO PROCESSO DO JOGO
    if (childPid) {
      console.log(`\n>>> ETAPA 8: ENCERRAMENTO SEGURO DO PROCESSO (PID ${childPid}) <<<`);
      try {
        spawnSync("taskkill", ["/F", "/T", "/PID", String(childPid)], { stdio: "ignore" });
        console.log("  Processo encerrado com sucesso.");
      } catch (e) {}
    }

    // 9. ROLLBACK TRANSACIONAL E CONFERÊNCIA DE SHA-256
    console.log("\n>>> ETAPA 9: ROLLBACK TRANSACIONAL E CONFERÊNCIA DE FÁBRICA <<<");
    const restored = restoreGameData(bakDir);
    assert.strictEqual(restored, true, "restoreGameData must succeed");

    const SHA256_SYSTEM_AFTER = getHash(systemJsonPath);
    const SHA256_PLUGINS_AFTER = getHash(pluginsJsPath);
    const SHA256_ITEMBOOK_AFTER = getHash(itemBookPath);

    assert.strictEqual(SHA256_SYSTEM_AFTER, SHA256_SYSTEM_ORIG, "System.json hash must match original");
    assert.strictEqual(SHA256_PLUGINS_AFTER, SHA256_PLUGINS_ORIG, "plugins.js hash must match original");
    assert.strictEqual(SHA256_ITEMBOOK_AFTER, SHA256_ITEMBOOK_ORIG, "ItemBook.js hash must match original");

    console.log("  System.json  SHA-256: " + SHA256_SYSTEM_AFTER + " (IDÊNTICO)");
    console.log("  plugins.js   SHA-256: " + SHA256_PLUGINS_AFTER + " (IDÊNTICO)");
    console.log("  ItemBook.js  SHA-256: " + SHA256_ITEMBOOK_AFTER + " (IDÊNTICO)");
    console.log("  ✓ ROLLBACK COMPROVADO: Restauração byte a byte confirmada.");
  }

  console.log("\n========================================================================");
  console.log("   ✓ SMOKE TEST DO JOGO REAL CONCLUÍDO COM SUCESSO TOTAL!");
  console.log("========================================================================\n");
}

run().catch(err => {
  console.error("FATAL ERROR IN REAL GAME LAUNCH SMOKE TEST:", err);
  process.exit(1);
});
