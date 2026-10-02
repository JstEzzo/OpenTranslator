const assert = require("assert");
const EngineRoutingGuard = require("../core/engineRoutingGuard");
const RenPyAppDataResolver = require("../renpyAppDataResolver");

console.log("=== TEST SUITE: Engine Diagnostic Routing & Cross-Engine Protection ===");

(() => {
  // 1. Resolver declara suporte a Ren'Py
  assert.strictEqual(RenPyAppDataResolver.supportsEngine("renpy"), true, "RenPyAppDataResolver must support renpy");
  assert.strictEqual(RenPyAppDataResolver.supportsEngine("mz"), false, "RenPyAppDataResolver must NOT support mz");
  assert.strictEqual(RenPyAppDataResolver.supportsEngine("unity"), false, "RenPyAppDataResolver must NOT support unity");

  // 2. Proteção atômica no resolveGameAppDataDir
  const blockedMz = RenPyAppDataResolver.resolveGameAppDataDir("C:/games/toki", "Toki kan Yuusha (gitgud)", { engine: "mz" });
  assert.strictEqual(blockedMz.blocked, true, "Must block MZ game from running RenPyAppDataResolver");
  assert.strictEqual(blockedMz.error, "ENGINE_MISMATCH", "Must return ENGINE_MISMATCH");

  // 3. EngineRoutingGuard
  const guardOk = EngineRoutingGuard.check("rpgMakerDiagnostic", "mz", ["mz", "mv", "rpgmaker"]);
  assert.strictEqual(guardOk.ok, true, "Valid engine match must pass");

  const guardBlock = EngineRoutingGuard.check("renpyDiagnostic", "mz", ["renpy"]);
  assert.strictEqual(guardBlock.ok, false, "Cross-engine mismatch must be blocked");
  assert.strictEqual(guardBlock.blocked, true);

  console.log("  ✓ Cross-engine execution prevented (MZ -> Ren'Py blocked cleanly)");
  console.log("✓ PASS: Engine Diagnostic Routing Guard Test Suite Complete.\n");
})();
