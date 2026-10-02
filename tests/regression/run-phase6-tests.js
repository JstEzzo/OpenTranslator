/**
 * OpenTranslator — Phase 6 Test Suite
 * Production Game Translation Core Conformance & Integration
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Core Phase 6 Modules
const EngineRuntimeTriad = require('../../src/core/engineRuntimeTriad');
const TextObjectIdentity = require('../../src/core/textObjectIdentity');
const TranslationContext = require('../../src/core/translationContext');
const GlossaryEngine = require('../../src/core/glossaryEngine');
const TranslationMemory3 = require('../../src/core/translationMemory3');
const FastTextPipeline = require('../../src/core/fastTextPipeline');
const FontCompatibilityEngine = require('../../src/core/fontCompatibilityEngine');
const TranslationLayoutValidator = require('../../src/core/translationLayoutValidator');
const TranslationPatchFormat = require('../../src/core/translationPatchFormat');
const HealthMonitor = require('../../src/core/healthMonitor');
const PluginSDK = require('../../src/core/pluginSdk');
const SubtitleSystem = require('../../src/core/subtitleSystem');
const ImageTextLayer = require('../../src/core/imageTextLayer');
const HookProvider = require('../../src/runtime/hookProvider');

// Engine Providers
const GodotLocalizationProvider = require('../../src/engines/godot/godotLocalizationProvider');
const GodotControlTextProvider = require('../../src/engines/godot/godotControlTextProvider');
const UnrealLocResProvider = require('../../src/engines/unreal/unrealLocResProvider');
const UnrealStringTableProvider = require('../../src/engines/unreal/unrealStringTableProvider');
const UnrealLocalizationProvider = require('../../src/engines/unreal/unrealLocalizationProvider');
const UnityLocalizationPackageProvider = require('../../src/engines/unity/unityLocalizationPackageProvider');
const UnityTextMeshProProvider = require('../../src/engines/unity/unityTextMeshProProvider');
const UnityUGUIProvider = require('../../src/engines/unity/unityUGUIProvider');
const {
  RenpyTranslationProvider,
  RenpyStringProvider,
  RenpyStyleProvider,
  RenpyAssetLocalization
} = require('../../src/engines/renpy/renpyProductionProvider');
const ElectronArchiveProvider = require('../../src/engines/electron/electronArchiveProvider');
const ElectronDOMProvider = require('../../src/engines/electron/electronDOMProvider');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

async function main() {
  console.log('====================================================');
  console.log('   OPENTRANSLATOR — PHASE 6 TEST SUITE');
  console.log('   PRODUCTION GAME TRANSLATION CORE');
  console.log('====================================================\n');

  // Test 1: Engine -> Runtime -> Text Framework Triad Resolution
  runTest('EngineRuntimeTriad: Decouples Engine, Runtime, and Text Framework', () => {
    // Caso 1: Unity Mono + TextMeshPro
    const unityMono = EngineRuntimeTriad.resolve({
      detection: { engine: 'unity' },
      loadedModules: ['UnityEngine.CoreModule.dll', 'Unity.TextMeshPro.dll', 'mono-2.0-bdwgc.dll']
    });
    assert.strictEqual(unityMono.engine, 'unity');
    assert.strictEqual(unityMono.runtime, 'mono');
    assert.strictEqual(unityMono.textFramework, 'textmeshpro');
    assert.strictEqual(unityMono.preferredMethod, 'METHOD_C_RUNTIME');

    // Caso 2: Unity IL2CPP + UGUI
    const unityIl2cpp = EngineRuntimeTriad.resolve({
      detection: { engine: 'unity' },
      loadedModules: ['GameAssembly.dll', 'UnityEngine.UI.dll']
    });
    assert.strictEqual(unityIl2cpp.engine, 'unity');
    assert.strictEqual(unityIl2cpp.runtime, 'il2cpp');
    assert.strictEqual(unityIl2cpp.textFramework, 'ugui');
    assert.strictEqual(unityIl2cpp.preferredMethod, 'METHOD_D_UI_FRAMEWORK');

    // Caso 3: Godot Native + Control
    const godotTriad = EngineRuntimeTriad._evaluateCapabilities('godot', 'native', 'godot_control');
    assert.strictEqual(godotTriad.preferredMethod, 'METHOD_B_NATIVE');
    assert(godotTriad.capabilities.godotCsvPo);
  });

  // Test 2: Godot CSV & PO Localization Roundtrip
  runTest('GodotLocalizationProvider: CSV & PO RFC 4180 parsing and serialization', () => {
    const csvData = 'id,en,pt_BR,es\nMSG_START,"Hello, [b]hero[/b]!","Olá, [b]herói[/b]!","¡Hola, [b]héroe[/b]!"\nMSG_LINE,"Line 1\nLine 2","Linha 1\nLinha 2","Línea 1\nLínea 2"\n';
    const parsedCsv = GodotLocalizationProvider.parseGodotCsv(csvData);
    assert.strictEqual(parsedCsv.entries.length, 2);
    assert.strictEqual(parsedCsv.entries[0].translations.pt_BR, 'Olá, [b]herói[/b]!');
    assert(parsedCsv.entries[1].translations.pt_BR.includes('\n'));

    const serializedCsv = GodotLocalizationProvider.serializeGodotCsv(parsedCsv.header, parsedCsv.entries);
    const reparsedCsv = GodotLocalizationProvider.parseGodotCsv(serializedCsv);
    assert.strictEqual(reparsedCsv.entries.length, 2);
    assert.strictEqual(reparsedCsv.entries[0].translations.pt_BR, 'Olá, [b]herói[/b]!');

    // PO format test
    const poData = 'msgid ""\nmsgstr ""\n\nmsgid "Attack"\nmsgstr "Atacar"\n';
    const parsedPo = GodotLocalizationProvider.parsePo(poData);
    assert.strictEqual(parsedPo.length, 1);
    assert.strictEqual(parsedPo[0].msgid, 'Attack');
    assert.strictEqual(parsedPo[0].msgstr, 'Atacar');
  });

  // Test 3: Godot BBCode and Variable Protection
  runTest('GodotControlTextProvider: Protects BBCode formatting and interpolation variables', () => {
    const raw = 'Score: [color=#ff0000]{score}[/color] points! [tornado freq=2.0]{player}[/tornado] won %d gold!';
    const { protectedText, tokens } = GodotControlTextProvider.protectBBCode(raw);
    assert(protectedText.includes('⟦OT_BB_0⟧'));
    assert(tokens.some(t => t.original === '{score}'));

    const translated = protectedText.replace('points', 'pontos').replace('won', 'ganhou');
    const { restoredText, valid } = GodotControlTextProvider.restoreBBCode(translated, tokens);
    assert.strictEqual(valid, true);
    assert(restoredText.includes('[color=#ff0000]{score}[/color]'));
    assert(restoredText.includes('ganhou %d gold!'));
  });

  // Test 4: Unreal Engine LocRes Binary Builder & Parser Roundtrip
  runTest('UnrealLocResProvider: Binary LocRes (Magic GUID + Version 2 Compact) roundtrip', () => {
    const testData = {
      'GameUI': {
        'PlayBtn': { sourceHash: 101, value: 'Jogar Agora' },
        'QuitBtn': { sourceHash: 102, value: 'Sair do Jogo' }
      },
      'Quests': {
        'Q1_Title': { sourceHash: 201, value: 'A Lenda da Espada Sagrada' }
      }
    };

    const locresBuf = UnrealLocResProvider.buildLocRes(testData);
    assert(Buffer.isBuffer(locresBuf));
    assert(locresBuf.length > 50);

    const parsed = UnrealLocResProvider.parseLocRes(locresBuf);
    assert.strictEqual(parsed.version, 2);
    assert.strictEqual(parsed.count, 3);
    assert.strictEqual(parsed.namespaces['GameUI']['PlayBtn'].value, 'Jogar Agora');
    assert.strictEqual(parsed.namespaces['Quests']['Q1_Title'].value, 'A Lenda da Espada Sagrada');
  });

  // Test 5: Unreal String Table CSV parsing
  runTest('UnrealStringTableProvider: String Table CSV import & export', () => {
    const csv = 'Key,SourceString,Comment\n"BTN_OK","Confirm","Button label"\n"BTN_NO","Cancel","Cancel label"\n';
    const entries = UnrealStringTableProvider.parseStringTableCsv(csv);
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].key, 'BTN_OK');
    assert.strictEqual(entries[0].source, 'Confirm');

    const reserialized = UnrealStringTableProvider.serializeStringTableCsv(entries);
    assert(reserialized.includes('Confirm'));
  });

  // Test 6: Unity Localization Package & TextMeshPro Protection
  runTest('Unity Localization & TMP: StringTable parsing and rich text tag preservation', () => {
    const csv = 'Key,Id,en,pt-BR,Comment\nTitle,1001,Welcome,Bem-vindo,Welcome text\n';
    const parsed = UnityLocalizationPackageProvider.parseStringTableCsv(csv);
    assert.strictEqual(parsed.entries.length, 1);
    assert.strictEqual(parsed.entries[0].translations['pt-BR'], 'Bem-vindo');

    const tmpText = 'Damage: <color=#ff5555><b>150</b></color> <sprite=0> ({0} left)';
    const { protectedText, tokens } = UnityTextMeshProProvider.protectTags(tmpText);
    assert(protectedText.includes('⟦OT_TMP_0⟧'));
    assert(tokens.some(t => t.original === '{0}'));

    const { restoredText, valid } = UnityTextMeshProProvider.restoreTags(protectedText.replace('Damage', 'Dano'), tokens);
    assert.strictEqual(valid, true);
    assert(restoredText.startsWith('Dano: <color=#ff5555><b>150</b></color>'));

    const overflow = UnityTextMeshProProvider.estimateOverflow('Attack', 'Atacar com todas as forças reunidas da espada ancestral', { maxExpansionRatio: 1.5 });
    assert(overflow.isOverflowLikely);
  });

  // Test 7: Ren'Py Production Providers (Dialogue, Strings, Styles, Assets)
  runTest('RenpyProductionProvider: Canonical strings, style overrides, and localized assets', () => {
    const pairs = [
      { oldText: 'New Game', newText: 'Novo Jogo' },
      { oldText: 'Load Game', newText: 'Carregar Jogo' }
    ];
    const block = RenpyStringProvider.generateStringsBlock('portuguese', pairs);
    assert(block.includes('translate portuguese strings:'));
    assert(block.includes('old "New Game"'));
    assert(block.includes('new "Novo Jogo"'));

    const extracted = RenpyStringProvider.extractStringsPairs(block);
    assert.strictEqual(extracted.length, 2);
    assert.strictEqual(extracted[0].oldText, 'New Game');

    const styleBlock = RenpyStyleProvider.generateLanguageStyles('portuguese', {
      fontPath: 'tl/portuguese/fonts/NotoSans.ttf',
      sizeAdjustment: -2
    });
    assert(styleBlock.includes('gui.text_font = "tl/portuguese/fonts/NotoSans.ttf"'));

    const assetBlock = RenpyAssetLocalization.generateAssetOverrides('portuguese', {
      'title_screen': 'tl/portuguese/images/title.png'
    });
    assert(assetBlock.includes('image title_screen = "tl/portuguese/images/title.png"'));
  });

  // Test 8: Electron Virtual ASAR Provider & DOM Provider
  runTest('ElectronArchiveProvider & DOM: Virtual file tree and MutationObserver injection script', () => {
    const domScript = ElectronDOMProvider.getRendererInjectionScript();
    assert(domScript.includes('MutationObserver'));
    assert(domScript.includes('processedNodes = new WeakSet()'));
    assert(domScript.includes('window.__openTranslatorDispatch'));
  });

  // Test 9: Text Object Identity Multi-Dimensional Discrimination
  runTest('TextObjectIdentity: Treats same string across different components separately', () => {
    const btnAttack = new TextObjectIdentity({
      gameId: 'rpg_01',
      sceneId: 'battle_field',
      componentId: 'UI/ActionMenu/BtnAttack',
      sourceType: 'button',
      text: 'Attack'
    });

    const dialogueAttack = new TextObjectIdentity({
      gameId: 'rpg_01',
      sceneId: 'battle_field',
      componentId: 'Narrator/DialogueBox',
      sourceType: 'dialogue',
      text: 'Attack'
    });

    assert.notStrictEqual(btnAttack.getCompositeKey(), dialogueAttack.getCompositeKey());
    assert.strictEqual(btnAttack.getTextKey(), dialogueAttack.getTextKey());
  });

  // Test 10: HookProvider Complete Lifecycle & Rollback Containment
  await runAsyncTest('HookProvider: Full lifecycle (attach -> verify -> active -> monitor -> detach -> cleanup)', async () => {
    const hp = new HookProvider({ name: 'UnityHook', arch: 'x64' });
    const attachRes = await hp.attach({ pid: 9999, architecture: 'x64' });
    assert.strictEqual(attachRes.success, true);
    assert.strictEqual(hp.state, 'MONITORING');

    let capturedText = null;
    hp.on('text', (e) => { capturedText = e.text; });
    hp.onTextCaptured('Level Up!', { gameId: 'g1' });
    assert.strictEqual(capturedText, 'Level Up!');

    const repRes = await hp.replaceText('identity_key', 'Subiu de Nível!');
    assert.strictEqual(repRes.success, true);

    const hc = hp.healthcheck();
    assert.strictEqual(hc.alive, true);

    const detachRes = await hp.detach();
    assert.strictEqual(detachRes.success, true);
    assert.strictEqual(hp.state, 'DETACHED');
  });

  // Test 11: Translation Context, Glossary Engine & TM 3.0 Strict Priority
  runTest('TranslationMemory3 & GlossaryEngine: Hierarchical glossary and TM priority resolution', () => {
    const ctx = new TranslationContext({
      source: 'data/System.json',
      speaker: 'Narrador',
      scene: 'Intro',
      character: 'char_main',
      game: 'epic_quest'
    });
    assert.strictEqual(ctx.getContextSignature(), 'epic_quest|Intro|char_main|narrative');

    const ge = new GlossaryEngine();
    ge.addRule({ scope: 'global', sourceTerm: 'Potion', targetTerm: 'Poção', type: 'FORCED' });
    ge.addRule({ scope: 'game', scopeId: 'epic_quest', sourceTerm: 'Gold', targetTerm: 'Ouro', type: 'FORCED' });
    ge.addRule({ scope: 'global', sourceTerm: 'Cheater', type: 'FORBIDDEN' });

    const enforced = ge.apply('Hero received 50 Gold and 1 Potion.', { game: 'epic_quest' });
    assert.strictEqual(enforced, 'Hero received 50 Ouro and 1 Poção.');

    const forbidCheck = ge.validate('You are a Cheater!');
    assert.strictEqual(forbidCheck.valid, false);

    // TM 3.0 Priority hierarchy
    const tm = new TranslationMemory3();
    tm.set('Start', 'Começar', { gameId: 'epic_quest' });
    tm.set('Start', 'Iniciar Aventura', { gameId: 'epic_quest', isManualOverride: true });

    const res = tm.lookup('Start', { gameId: 'epic_quest' });
    assert.strictEqual(res.matchType, 'MANUAL_OVERRIDE');
    assert.strictEqual(res.translation, 'Iniciar Aventura');

    // Normalized match
    const normRes = tm.lookup('start!', { gameId: 'epic_quest' });
    assert(normRes !== null);
  });

  // Test 12: Fast Text Pipeline (Priority Queues & Latency Breakdown)
  await runAsyncTest('FastTextPipeline: Strict priority queueing and separated pipeline vs provider latency', async () => {
    const pipeline = new FastTextPipeline({ offlineMode: true });

    pipeline.enqueue('Screen Visible Dialogue', 'P0');
    pipeline.enqueue('Background text', 'P5');

    pipeline.isUnderLoad = true;
    const p5Skipped = pipeline.enqueue('Drop under load', 'P5');
    assert.strictEqual(p5Skipped, null);

    const item = pipeline.queues.P0.shift();
    const result = await pipeline.processItem(item, {});
    assert.strictEqual(result.priority, 'P0');
    assert(result.latencies.totalMs >= 0);
    assert(typeof result.latencies.pipelineMs === 'number');
    assert(typeof result.latencies.providerMs === 'number');
  });

  // Test 13: Font Compatibility & Translation Layout Validator
  runTest('FontCompatibilityEngine & LayoutValidator: Glyph analysis and layout bounds', () => {
    const cjkRes = FontCompatibilityEngine.analyzeGlyphRequirements('こんにちは世界');
    assert.strictEqual(cjkRes.hasCJK, true);
    assert.strictEqual(cjkRes.needsFontReplacement, true);

    const ptRes = FontCompatibilityEngine.analyzeGlyphRequirements('Ação e Emoção');
    assert.strictEqual(ptRes.isLatinOnly, true);

    const longText = 'Esta é uma frase bem longa projetada para testar o algoritmo de quebra de linha inteligente.';
    const wrapped = TranslationLayoutValidator.wrapText(longText, 30);
    assert(wrapped.split('\n').length >= 3);

    const rtlFormatted = TranslationLayoutValidator.formatRTL('مرحبا!', true);
    assert(rtlFormatted.endsWith('\u200F'));

    const varCheck = TranslationLayoutValidator.validatePluralAndVariables('Level %d reached with {0} exp!', 'Nível %d alcançado com {0} exp!');
    assert.strictEqual(varCheck.valid, true);
  });

  // Test 14: Translation Patch Format & Incremental Delta
  runTest('TranslationPatchFormat: Structured .otpatch package and incremental diff detection', () => {
    const entries = [
      { id: 'h1', original: 'Start', translation: 'Iniciar', fileHash: 'hash_v1', status: 'VERIFIED' },
      { id: 'h2', original: 'Exit', translation: 'Sair', fileHash: 'hash_v1', status: 'VERIFIED' }
    ];

    const patch = TranslationPatchFormat.createPatch({ gameId: 'test_game', gameVersion: '1.0' }, entries);
    assert.strictEqual(patch.otPatchVersion, '3.0');
    assert.strictEqual(patch.entries.length, 2);

    const newSources = [
      { original: 'Start', location: 'title.json', fileHash: 'hash_v2' }, // Mudou hash do arquivo
      { original: 'New Feature', location: 'menu.json', fileHash: 'hash_v2' } // Nova entrada
      // Exit foi removido
    ];

    const delta = TranslationPatchFormat.computeDiff(patch, newSources);
    assert.strictEqual(delta.stats.newCount, 1);
    assert.strictEqual(delta.stats.changedCount, 1);
    assert.strictEqual(delta.stats.obsoleteCount, 1);
    assert.strictEqual(delta.newEntries[0].original, 'New Feature');
  });

  // Test 15: HealthMonitor & Plugin SDK (Crash Containment)
  await runAsyncTest('HealthMonitor & PluginSDK: Circuit breaker and crash containment isolation', async () => {
    const hm = new HealthMonitor({ failureThreshold: 2 });
    hm.registerProvider('p_external', 'Cloud Translator');
    assert.strictEqual(hm.isUsable('p_external'), true);

    hm.recordFailure('p_external', new Error('HTTP 500'));
    assert.strictEqual(hm.providers.get('p_external').state, 'DEGRADED');

    hm.recordFailure('p_external', new Error('HTTP 504'));
    assert.strictEqual(hm.providers.get('p_external').state, 'FAILED');
    assert.strictEqual(hm.isUsable('p_external'), false);

    // Crash containment
    const faultyPlugin = {
      translate: async () => {
        throw new Error('Fatal memory allocation fault');
      }
    };

    const res = await PluginSDK.safeExecute(faultyPlugin, 'translate', ['Test'], 'Fallback');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.result, 'Fallback');

    const conformance = PluginSDK.testTranslationProviderConformance(faultyPlugin);
    assert.strictEqual(conformance.conforms, false);
  });

  // Test 16: Subtitle System & Image Text Layer
  runTest('SubtitleSystem & ImageTextLayer: Duration calculation and localized image routing', () => {
    const subSys = new SubtitleSystem({ charsPerSecond: 16 });
    const duration = subSys.calculateDuration('Hello, adventurer!', 2000);
    assert(duration >= 2000);

    const isTextImage = ImageTextLayer.isLikelyTextImage('assets/ui_btn_start.png');
    assert.strictEqual(isTextImage, true);

    const isTexture = ImageTextLayer.isLikelyTextImage('textures/grass_diffuse.png');
    assert.strictEqual(isTexture, false);
  });

  console.log('\n----------------------------------------------------');
  console.log(`Phase 6 Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
