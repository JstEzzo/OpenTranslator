const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const PluginSafePatcher = require("../../src/core/pluginSafePatcher");

function run() {
  console.log("=== TEST SUITE: Real Toki kan Yuusha Plugin Test (Patch, Syntax, Rollback & Runtime UI Proof) ===");
  const patcher = new PluginSafePatcher();

  const { getTokiPath } = require('./testPaths');
  const gameDir = getTokiPath();
  if (!gameDir || !fs.existsSync(gameDir)) {
    console.log("  [PULADO - LAB_FIXTURE_NOT_INSTALLED] Diretório do jogo Toki kan Yuusha não encontrado.");
    return;
  }
  const pluginFile = path.join(gameDir, "www", "js", "plugins", "ItemBook.js");

  // 1. VERIFICAÇÃO DO ARQUIVO REAL
  console.log(">>> ETAPA 1: VERIFICAÇÃO DO ARQUIVO REAL <<<");
  assert(fs.existsSync(pluginFile), "ItemBook.js must exist in game directory");
  const originalBuf = fs.readFileSync(pluginFile);
  const originalContent = originalBuf.toString("utf8");
  const size_original = originalBuf.length;
  const lines_original = originalContent.split("\n").length;
  const SHA256_ORIGINAL = patcher.getHash(pluginFile);

  console.log(`  fs.existsSync()    : ${fs.existsSync(pluginFile)}`);
  console.log(`  tamanho em bytes   : ${size_original}`);
  console.log(`  quantidade de linhas: ${lines_original}`);
  console.log(`  SHA256_ORIGINAL    : ${SHA256_ORIGINAL}`);
  console.log(`  primeiros 200 bytes: ${JSON.stringify(originalBuf.slice(0, 200).toString("utf8"))}`);

  assert(size_original > 0, "size_original must be > 0");
  assert.notStrictEqual(SHA256_ORIGINAL, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "SHA256 cannot be empty hash");
  assert.strictEqual(SHA256_ORIGINAL, "b9508138eea70dfa0a8d517581d6c8dc2c604b3718c43815180317a230da8887", "SHA256 must match known factory hash of ItemBook.js");

  try {
    // 2. TESTE REAL DO PATCH
    console.log("\n>>> ETAPA 2: TESTE REAL DO PATCH (PLUGIN_PATCH_TEST) <<<");
    const transMap = new Map([
      ["Price", "Preço [PT]"],
      ["Equip", "Equipar [PT]"],
      ["Type", "Tipo [PT]"]
    ]);

    const patchRes = patcher.safePatchPlugin(pluginFile, transMap);
    assert.strictEqual(patchRes.success, true);
    assert.strictEqual(patchRes.status, "PATCHED_PLUGIN_RUNTIME");

    const SHA256_PATCHED = patcher.getHash(pluginFile);
    console.log(`  SHA256_PATCHED     : ${SHA256_PATCHED}`);
    console.log(`  Quantidade de alterações: ${patchRes.patchedCount}`);

    console.log("  Detalhe de TODAS as alterações aplicadas:");
    patchRes.changes.forEach((ch, idx) => {
      console.log(`    [Alteração ${idx + 1}] Linha ${ch.line}, Coluna ${ch.col}:`);
      console.log(`      Original:   "${ch.original}"`);
      console.log(`      Tradução:   "${ch.translated}"`);
      console.log(`      Contexto:   ${ch.context}`);
    });

    // 3. PROVA DE HASH
    console.log("\n>>> ETAPA 3: PROVA DE HASH (HASH COMPILATION PROOF) <<<");
    assert.notStrictEqual(SHA256_ORIGINAL, SHA256_PATCHED, "PROVADO: SHA256_ORIGINAL !== SHA256_PATCHED");
    console.log("  ✓ PROVADO: SHA256_ORIGINAL !== SHA256_PATCHED");

    // 4. TESTE DE SINTAXE DO PATCHED
    console.log("\n>>> ETAPA 4: TESTE DE SINTAXE (PLUGIN_SYNTAX_TEST) <<<");
    const patchedContent = fs.readFileSync(pluginFile, "utf8");
    const syntaxCheck = patcher.validateSyntax(patchedContent, "ItemBook.js");
    assert.strictEqual(syntaxCheck.valid, true, "PROVADO: Patched ItemBook.js has 100% valid JS syntax");
    console.log("  ✓ PROVADO: Sintaxe JavaScript 100% válida verificada pelo motor V8");

    // 5. TESTE DE RUNTIME: EXECUÇÃO REAL COM CAPTURA DE UI (PLUGIN_RUNTIME_TEST)
    console.log("\n>>> ETAPA 5: TESTE DE RUNTIME REAL COM INSTRUMENTAÇÃO DE UI (PLUGIN_RUNTIME_TEST) <<<");
    let capturedSceneClass = null;
    const renderedTexts = [];

    const sandbox = {
      window: {},
      console,
      PluginManager: {
        parameters: function(name) {
          return {}; // Sem override -> usa as strings default traduzidas!
        }
      },
      Game_Interpreter: { prototype: { pluginCommand: function() {} } },
      Game_System: { prototype: { itemBookTypeToIndex: () => 0, addToItemBook: () => {} } },
      Game_Party: { prototype: {} },
      SceneManager: { push: function(cls) { capturedSceneClass = cls; } },
      Scene_MenuBase: function() {},
      Graphics: { boxWidth: 816, boxHeight: 624 },
      Window_Selectable: function() {},
      Window_Base: function() {},
      DataManager: {
        isWeapon: function(item) { return true; },
        isArmor: function(item) { return false; }
      },
      $gameSystem: {
        isInItemBook: function(item) { return true; }
      },
      $dataSystem: {
        equipTypes: ["", "Weapon"],
        weaponTypes: ["", "Sword"],
        armorTypes: ["", "Shield"]
      },
      $dataItems: [],
      $dataWeapons: [],
      $dataArmors: [],
      TextManager: { param: function(i) { return "ATK"; } }
    };
    sandbox.Scene_MenuBase.prototype = { initialize: () => {}, create: () => {}, addWindow: () => {}, popScene: () => {} };
    sandbox.Window_Selectable.prototype = {
      initialize: () => {},
      fittingHeight: () => 100,
      setTopRow: () => {},
      select: () => {},
      activate: () => {},
      refresh: () => {},
      setHandler: () => {},
      setStatusWindow: () => {},
      createContents: () => {},
      drawAllItems: () => {},
      index: () => 0
    };
    sandbox.Window_Base.prototype = {
      initialize: () => {},
      textPadding: () => 6,
      lineHeight: () => 36,
      systemColor: () => "#ffffff",
      changeTextColor: () => {},
      resetTextColor: () => {},
      drawItemName: () => {},
      drawText: function(text, x, y, maxWidth, align) {
        renderedTexts.push({ text: String(text), x, y, maxWidth, align });
      },
      drawTextEx: () => {},
      createContents: () => {},
      drawAllItems: () => {},
      contents: { clear: () => {} }
    };

    const script = new vm.Script(patchedContent, { filename: "ItemBook.patched.js" });
    const vmContext = vm.createContext(sandbox);
    script.runInContext(vmContext);

    // Aciona o comando de plugin para abrir a Scene_ItemBook
    sandbox.Game_Interpreter.prototype.pluginCommand.call({}, "ItemBook", ["open"]);
    assert(capturedSceneClass, "Scene_ItemBook class must be captured by SceneManager.push");

    const scene = new capturedSceneClass();
    scene.initialize();
    scene.create();

    // Renderiza um item na UI do statusWindow
    scene._statusWindow.setItem({
      id: 1,
      name: "Iron Sword",
      price: 500,
      etypeId: 1,
      wtypeId: 1,
      params: [0, 0, 10, 5, 0, 0, 0, 0],
      description: "Uma espada de ferro."
    });

    console.log("  Textos capturados pelo pipeline de renderização da UI (drawText):");
    renderedTexts.forEach(rt => {
      console.log(`    -> drawText("${rt.text}", x=${rt.x}, y=${rt.y})`);
    });

    const hasPreco = renderedTexts.some(rt => rt.text === "Preço [PT]");
    const hasEquipar = renderedTexts.some(rt => rt.text === "Equipar [PT]");
    const hasTipo = renderedTexts.some(rt => rt.text === "Tipo [PT]");

    assert(hasPreco, "PROVADO EM RUNTIME: 'Preço [PT]' foi efetivamente renderizado na UI");
    assert(hasEquipar, "PROVADO EM RUNTIME: 'Equipar [PT]' foi efetivamente renderizado na UI");
    assert(hasTipo, "PROVADO EM RUNTIME: 'Tipo [PT]' foi efetivamente renderizado na UI");
    console.log("  ✓ PROVADO EM RUNTIME: Todas as 3 strings traduzidas foram recebidas e desenhadas na interface!");
  } finally {
    // 6. ROLLBACK E VERIFICAÇÃO FINAL DE SHA-256 (GARANTIDO VIA FINALLY)
    console.log("\n>>> ETAPA 6: ROLLBACK E VERIFICAÇÃO DE INTEGRIDADE (PLUGIN_ROLLBACK_TEST) <<<");
    const rollbackRes = patcher.rollbackPlugin(pluginFile, originalContent, SHA256_ORIGINAL);
    assert.strictEqual(rollbackRes.verified, true, "PROVADO: SHA256_ROLLBACK === SHA256_ORIGINAL");

    const finalHash = patcher.getHash(pluginFile);
    assert.strictEqual(finalHash, SHA256_ORIGINAL);
    console.log(`  SHA256_ROLLBACK    : ${finalHash}`);
    console.log("  ✓ PROVADO: Arquivo restaurado byte a byte ao estado de fábrica (SHA-256 verificado)");
  }

  console.log("\n✓ PASS: Real Toki kan Yuusha Plugin Test Suite 100% Concluído.\n");
}

run();
