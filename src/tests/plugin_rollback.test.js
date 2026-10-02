const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PluginSafePatcher = require("../core/pluginSafePatcher");

function run() {
  console.log("=== TEST SUITE: Plugin Rollback & SHA-256 Byte-Level Integrity ===");
  const patcher = new PluginSafePatcher();

  const fixturePath = path.join(__dirname, "temp_rollback_fixture.js");
  const originalCode = `
    var menuText = "Menu";
    var cancelText = "Cancel";
  `;
  fs.writeFileSync(fixturePath, originalCode, "utf8");

  const originalHash = patcher.getHash(fixturePath);
  const originalSize = fs.statSync(fixturePath).size;
  assert(originalSize > 0, "size_original must be > 0");

  const transMap = new Map([
    ["Menu", "Cardápio [PT]"],
    ["Cancel", "Cancelar [PT]"]
  ]);

  const patchRes = patcher.safePatchPlugin(fixturePath, transMap);
  assert.strictEqual(patchRes.success, true);
  const patchedHash = patcher.getHash(fixturePath);

  assert.notStrictEqual(originalHash, patchedHash, "SHA256_ORIGINAL !== SHA256_PATCHED");

  // Executa Rollback
  const rollbackRes = patcher.rollbackPlugin(fixturePath, originalCode, originalHash);
  assert.strictEqual(rollbackRes.verified, true, "SHA256_ROLLBACK === SHA256_ORIGINAL");

  const restoredHash = patcher.getHash(fixturePath);
  assert.strictEqual(restoredHash, originalHash);

  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);

  console.log("  ✓ SHA256_ORIGINAL !== SHA256_PATCHED confirmed");
  console.log("  ✓ SHA256_ROLLBACK === SHA256_ORIGINAL confirmed byte-by-byte");
  console.log("✓ PASS: Plugin Rollback Test Complete.\n");
}

run();
