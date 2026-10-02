const assert = require("assert");
const PluginSafePatcher = require("../core/pluginSafePatcher");

function run() {
  console.log("=== TEST SUITE: Plugin String Extraction & Classification (Lexer-Based) ===");
  const patcher = new PluginSafePatcher();

  const code = `
    // Comentário com "Texto Falso"
    /* Comentário bloco com 'Outro Texto' */
    function Price() {}
    const Equip = 100;
    var unknown = parameters['Price Text'] || 'Price';
    var icon = "img/system/Window.png";
    var api = "https://example.com/api";
    var query = /Price.*/i;
    var template = \`Price is \${Equip}\`;
    drawText("Equip", 0, 0);
  `;

  const { allStrings, candidates } = patcher.extractCandidates(code);

  assert.strictEqual(allStrings.some(s => s.original === "Texto Falso"), false, "Strings in comments must NEVER be extracted");
  assert.strictEqual(allStrings.some(s => s.original === "Outro Texto"), false, "Strings in block comments must NEVER be extracted");
  assert.strictEqual(allStrings.some(s => s.original === "Price is "), false, "Template literals must NEVER be extracted as standard string");

  assert(candidates.some(c => c.clean === "Price"), "Default fallback 'Price' must be candidate");
  assert(candidates.some(c => c.clean === "Equip"), "Call argument 'Equip' must be candidate");

  const assetToken = allStrings.find(s => s.clean.includes(".png"));
  assert.strictEqual(assetToken.classification, "TECHNICAL_STRING");

  console.log("  ✓ Lexer correctly isolates string literals and avoids comments, regexes, templates, and assets");
  console.log("✓ PASS: Plugin String Extraction Test Complete.\n");
}

run();
