/**
 * OpenTranslator — engine_launch_routing.test.js
 * Teste de integração de roteamento durante launchGame:
 * Garante que jogos RPG Maker MZ não acionam RenPyAppDataResolver sob nenhuma circunstância.
 */

const assert = require("assert");
const RenPyAppDataResolver = require("../renpyAppDataResolver");
const EngineRoutingGuard = require("../core/engineRoutingGuard");

async function run() {
  console.log("=== TEST SUITE: Engine Launch Routing Integration ===");

  // Simula tentativa de chamada cruzada para jogo MZ
  const targetEngine = "mz";
  const guard = EngineRoutingGuard.check("launchGame:resolveAppData", targetEngine, "renpy");

  assert.strictEqual(guard.blocked, true, "Guard must block Ren'Py resolver for MZ engine");
  assert.strictEqual(guard.error, "ENGINE_MISMATCH", "Must return ENGINE_MISMATCH error");

  // Tenta invocar diretamente o resolver com engine: 'mz'
  const result = RenPyAppDataResolver.resolveGameAppDataDir("C:/games/toki", "Toki kan Yuusha (gitgud)", { engine: "mz" });
  assert.strictEqual(result.blocked, true, "RenPyAppDataResolver must refuse execution for MZ");

  // Garante que para Ren'Py legítimo a guarda permite
  const renpyGuard = EngineRoutingGuard.check("launchGame:resolveAppData", "renpy", "renpy");
  assert.strictEqual(renpyGuard.allowed, true, "Guard must allow execution for Ren'Py");

  console.log("  ✓ Cross-engine execution strictly prohibited during launch & diagnostics");
  console.log("✓ PASS: Engine Launch Routing Integration Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
