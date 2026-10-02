const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PluginSafePatcher = require("../core/pluginSafePatcher");

function run() {
  console.log("=== TEST SUITE: Plugin Safe Patch & Negative Tests (Context Discrimination) ===");
  const patcher = new PluginSafePatcher();

  const fixturePath = path.join(__dirname, "temp_negative_plugin.js");
  const sampleCode = `
// Negativo: não alterar "Price" em comentário
function Price() { return "url: https://example.com"; }
const Equip = 123;
obj.Type = 1;
var candidatePrice = "Price";
var internalKey = "Price";
obj["Price"] = value;
console.log("Price");
window.drawText("Price", 0, 0);
var url = "https://example.com/api";
var asset = "img/icon.png";
var rx = /Price.*/;
var tpl = \`Price \${Equip}\`;
  `;

  fs.writeFileSync(fixturePath, sampleCode, "utf8");

  // Extrai e classifica as strings
  const { allStrings, candidates } = patcher.extractCandidates(fixturePath);

  // Prova que internalKey, obj["Price"], console.log, URLs e assets NÃO são candidatos
  const internalKeyItem = allStrings.find(s => s.original === "Price" && s.line === 7);
  assert.strictEqual(internalKeyItem.classification, "TECHNICAL_STRING", "internalKey must be TECHNICAL_STRING");

  const objPropItem = allStrings.find(s => s.original === "Price" && s.line === 8);
  assert.strictEqual(objPropItem.classification, "TECHNICAL_STRING", "obj['Price'] assignment must be TECHNICAL_STRING");

  const consoleItem = allStrings.find(s => s.original === "Price" && s.line === 9);
  assert.strictEqual(consoleItem.classification, "TECHNICAL_STRING", "console.log must be TECHNICAL_STRING");

  const drawTextItem = allStrings.find(s => s.original === "Price" && s.line === 10);
  assert.strictEqual(drawTextItem.classification, "USER_FACING_CONFIRMED", "drawText must be USER_FACING_CONFIRMED");

  const transMap = new Map([
    ["Price", "Preço [PT]"]
  ]);

  const patchRes = patcher.safePatchPlugin(fixturePath, transMap);
  assert.strictEqual(patchRes.success, true);

  const patched = fs.readFileSync(fixturePath, "utf8");

  // Prova que internalKey, obj["Price"] e console.log NÃO foram alterados
  assert(patched.includes('var internalKey = "Price";'), "internalKey must remain untouched");
  assert(patched.includes('obj["Price"] = value;'), "obj['Price'] must remain untouched");
  assert(patched.includes('console.log("Price");'), "console.log('Price') must remain untouched");
  assert(patched.includes('window.drawText("Preço [PT]", 0, 0);'), "drawText must be translated");

  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);

  console.log("  ✓ Contextual discrimination verified: technical strings preserved, UI drawText translated");
  console.log("✓ PASS: Plugin Safe Patch & Negative Tests Complete.\n");
}

run();
