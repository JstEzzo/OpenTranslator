/**
 * OpenTranslator — engine_routing_all_engines.test.js
 * Testa o roteamento de diagnóstico e launch em todas as 4 engines: MZ, Ren'Py, Unity e Generic.
 */

const assert = require("assert");
const RenPyAppDataResolver = require("../renpyAppDataResolver");
const EngineRoutingGuard = require("../../src/core/engineRoutingGuard");

async function run() {
  console.log("=== TEST SUITE: Engine Routing Full Matrix (MZ, Ren'Py, Unity, Generic) ===");

  const engines = ["mz", "unity", "generic", "renpy"];

  for (const eng of engines) {
    const isRenpy = eng === "renpy";
    const guard = EngineRoutingGuard.check("launchGame:resolveAppData", eng, "renpy");

    if (isRenpy) {
      assert.strictEqual(guard.allowed, true, `Ren'Py resolver MUST be allowed for engine '${eng}'`);
      assert.strictEqual(RenPyAppDataResolver.supportsEngine(eng), true);
    } else {
      assert.strictEqual(guard.blocked, true, `Ren'Py resolver MUST be blocked for engine '${eng}'`);
      assert.strictEqual(guard.error, "ENGINE_MISMATCH");
      assert.strictEqual(RenPyAppDataResolver.supportsEngine(eng), false);
      const res = RenPyAppDataResolver.resolveGameAppDataDir("C:/dummy", "TestGame", { engine: eng });
      assert.strictEqual(res.blocked, true, `Direct call to RenPyAppDataResolver must be blocked for '${eng}'`);
    }
  }

  console.log("  ✓ Complete engine matrix tested: only Ren'Py accesses RenPyAppDataResolver");
  console.log("✓ PASS: Engine Routing All Engines Test Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
