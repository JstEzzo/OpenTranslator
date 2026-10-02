const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const PluginSafePatcher = require("../../src/core/pluginSafePatcher");

function run() {
  console.log("=== INTEGRATION TEST: Full Pipeline (Extract -> Classify -> Patch -> Syntax -> Runtime -> Rollback) ===");
  const patcher = new PluginSafePatcher();

  const { getTokiPath } = require('./testPaths');
  const gameDir = getTokiPath();
  if (!gameDir || !fs.existsSync(gameDir)) {
    console.log("  [PULADO - LAB_FIXTURE_NOT_INSTALLED] Diretório do jogo Toki kan Yuusha não encontrado.");
    return;
  }
  const pluginFile = path.join(gameDir, "www", "js", "plugins", "ItemBook.js");

  // ETAPA 1: ARQUIVO REAL & HASH INICIAL
  assert(fs.existsSync(pluginFile), "ItemBook.js must exist");
  const originalBuf = fs.readFileSync(pluginFile);
  const originalContent = originalBuf.toString("utf8");
  const size_original = originalBuf.length;
  const SHA256_ORIGINAL = patcher.getHash(pluginFile);

  assert(size_original > 0, "size_original must be > 0");
  assert.strictEqual(SHA256_ORIGINAL, "b9508138eea70dfa0a8d517581d6c8dc2c604b3718c43815180317a230da8887", "Factory hash must match");
  console.log("  [ETAPA 1] Arquivo real conferido: 12.546 bytes, SHA-256 = " + SHA256_ORIGINAL);

  try {
    // ETAPA 2: EXTRAÇÃO E CLASSIFICAÇÃO PELO PLUGINSAFEPATCHER
    const { allStrings, candidates } = patcher.extractCandidates(pluginFile);
    console.log(`  [ETAPA 2] Extração pelo PluginSafePatcher: ${allStrings.length} literais totais, ${candidates.length} candidatas`);

    const priceCandidate = candidates.find(c => c.clean === "Price");
    const equipCandidate = candidates.find(c => c.clean === "Equip");
    const typeCandidate = candidates.find(c => c.clean === "Type");

    assert(priceCandidate, "Price must be identified as candidate");
    assert(equipCandidate, "Equip must be identified as candidate");
    assert(typeCandidate, "Type must be identified as candidate");

    // ETAPA 3: APLICAÇÃO EXCLUSIVA VIA PLUGINSAFEPATCHER (SEM CODE.REPLACE MANUAL)
    const transMap = new Map([
      ["Price", "Preço [PT]"],
      ["Equip", "Equipar [PT]"],
      ["Type", "Tipo [PT]"]
    ]);

    const patchResult = patcher.safePatchPlugin(pluginFile, transMap);
    assert.strictEqual(patchResult.success, true);
    assert.strictEqual(patchResult.status, "PATCHED_PLUGIN_RUNTIME");
    assert.strictEqual(patchResult.patchedCount, 3, "Exatamente 3 strings devem ser patcheadas pelo patcher");

    console.log("  [ETAPA 3] Patch aplicado pelo PluginSafePatcher com sucesso:");
    patchResult.changes.forEach((ch, idx) => {
      console.log(`    #${idx + 1} Linha ${ch.line}: "${ch.original}" -> "${ch.translated}" (Status: ${ch.candidate.classification})`);
    });

    const SHA256_PATCHED = patcher.getHash(pluginFile);
    assert.notStrictEqual(SHA256_ORIGINAL, SHA256_PATCHED, "SHA-256 must change after patch");
    console.log("  [ETAPA 4] SHA256_PATCHED verificado: " + SHA256_PATCHED);

    // ETAPA 5: VALIDAÇÃO DE SINTAXE DO CÓDIGO NO DISCO
    const diskContent = fs.readFileSync(pluginFile, "utf8");
    const syntaxCheck = patcher.validateSyntax(diskContent, "ItemBook.js");
    assert.strictEqual(syntaxCheck.valid, true, "Syntax must be 100% valid JS");
    console.log("  [ETAPA 5] Sintaxe validada via V8: VÁLIDA");

    // ETAPA 6: EXECUÇÃO EM RUNTIME (INTERCEPTANDO DRAWTEXT)
    let capturedSceneClass = null;
    const renderedTexts = [];

    const sandbox = {
      window: {},
      console,
      PluginManager: { parameters: () => ({}) },
      Game_Interpreter: { prototype: { pluginCommand: function() {} } },
      Game_System: { prototype: { itemBookTypeToIndex: () => 0, addToItemBook: () => {} } },
      Game_Party: { prototype: {} },
      SceneManager: { push: (cls) => { capturedSceneClass = cls; } },
      Scene_MenuBase: function() {},
      Graphics: { boxWidth: 816, boxHeight: 624 },
      Window_Selectable: function() {},
      Window_Base: function() {},
      DataManager: { isWeapon: () => true, isArmor: () => false },
      $gameSystem: { isInItemBook: () => true },
      $dataSystem: {
        equipTypes: ["", "Weapon"],
        weaponTypes: ["", "Sword"],
        armorTypes: ["", "Shield"]
      },
      $dataItems: [],
      $dataWeapons: [],
      $dataArmors: [],
      TextManager: { param: () => "ATK" }
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
      drawText: (text, x, y, maxW, align) => {
        renderedTexts.push({ text: String(text), x, y });
      },
      drawTextEx: () => {},
      createContents: () => {},
      drawAllItems: () => {},
      contents: { clear: () => {} }
    };

    const script = new vm.Script(diskContent, { filename: "ItemBook.patched.js" });
    const vmContext = vm.createContext(sandbox);
    script.runInContext(vmContext);

    sandbox.Game_Interpreter.prototype.pluginCommand.call({}, "ItemBook", ["open"]);
    const scene = new capturedSceneClass();
    scene.initialize();
    scene.create();

    scene._statusWindow.setItem({
      id: 1,
      name: "Iron Sword",
      price: 500,
      etypeId: 1,
      wtypeId: 1,
      params: [0, 0, 10, 5, 0, 0, 0, 0],
      description: "Uma espada de ferro."
    });

    assert(renderedTexts.some(t => t.text === "Preço [PT]"), "Preço [PT] must appear in drawText");
    assert(renderedTexts.some(t => t.text === "Equipar [PT]"), "Equipar [PT] must appear in drawText");
    assert(renderedTexts.some(t => t.text === "Tipo [PT]"), "Tipo [PT] must appear in drawText");
    console.log("  [ETAPA 6] Runtime verificado: Preço [PT], Equipar [PT] e Tipo [PT] renderizados no drawText()");
  } finally {
    // ETAPA 7: ROLLBACK GARANTIDO E CONFERÊNCIA DE SHA-256
    const rollbackRes = patcher.rollbackPlugin(pluginFile, originalContent, SHA256_ORIGINAL);
    assert.strictEqual(rollbackRes.verified, true, "Rollback must restore original SHA-256 exactly");
    const finalHash = patcher.getHash(pluginFile);
    assert.strictEqual(finalHash, SHA256_ORIGINAL, "Final hash must equal original factory hash");
    console.log("  [ETAPA 7] Rollback final verificado: SHA-256 = " + finalHash);
  }

  console.log("✓ PASS: plugin_safe_patcher_integration.test.js concluído com sucesso!\n");
}

run();
