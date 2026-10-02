const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PluginSafePatcher = require("../../src/core/pluginSafePatcher");

function run() {
  console.log("=== TEST SUITE: Plugin Syntax Validation (V8 vm.Script) ===");
  const patcher = new PluginSafePatcher();

  const fixturePath = path.join(__dirname, "temp_corrupt_test.js");
  const sampleCode = `var text = "Equip";`;
  fs.writeFileSync(fixturePath, sampleCode, "utf8");

  // Tradução que força quebra de aspas se não for tratada ou se injetar sintaxe inválida
  const transMap = new Map([
    ["Equip", 'Equip"; function syntaxCrash() { !!! INVALID JS !!! } "']
  ]);

  const res = patcher.safePatchPlugin(fixturePath, transMap);
  // O patcher escapa aspas adequadamente, mantendo o código como string literal válida
  const content = fs.readFileSync(fixturePath, "utf8");
  const check = patcher.validateSyntax(content);
  assert.strictEqual(check.valid, true, "Código gerado deve ser 100% sintaticamente válido");

  // Teste de rejeição forçada: se o patcher detectasse syntax error
  const invalidResult = patcher.validateSyntax('var broken = { unclosed: ');
  assert.strictEqual(invalidResult.valid, false);
  assert(invalidResult.error.length > 0);

  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);

  console.log("  ✓ V8 syntax verification catches syntax errors and enforces safe compilation");
  console.log("✓ PASS: Plugin Syntax Validation Test Complete.\n");
}

run();
