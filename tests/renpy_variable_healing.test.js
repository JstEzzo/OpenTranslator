/**
 * Test: Ren'Py Variable Interpolation Protection and Auto-Healing
 * Ensures that Python variable interpolations like [who.age] or $[cash]
 * are never corrupted or translated, preventing NameError crashes at runtime.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { healRenpyVariables } = require('../src/engines/renpy/renpyCommon');
const RenpyValidator = require('../src/engines/renpy/validator/renpyValidator');
const RenpyAdapter = require('../src/engines/renpy/adapter/renpyAdapter');
const RenpyInjector = require('../src/engines/renpy/injector/renpyInjector');

async function run() {
  console.log('=== Test: Renpy Variable Protection & Healing ===');

  // 1. Test healRenpyVariables
  const originalText1 = 'Age: [who.age]';
  const badTranslated1 = 'Idade: [quem.idade]';
  const healed1 = healRenpyVariables(originalText1, badTranslated1);
  assert.strictEqual(healed1, 'Idade: [who.age]', 'healRenpyVariables should restore [who.age]');
  console.log('✓ healRenpyVariables correctly restored [who.age]');

  const originalText2 = 'That\'ll be $[cash], please.';
  const badTranslated2 = 'Isso será $[dinheiro], por favor.';
  const healed2 = healRenpyVariables(originalText2, badTranslated2);
  assert.strictEqual(healed2, 'Isso será $[cash], por favor.', 'healRenpyVariables should restore $[cash]');
  console.log('✓ healRenpyVariables correctly restored $[cash]');

  const originalText3 = 'Welcome [player.name]! Level: [player.lvl], HP: [player.hp]/[player.max_hp]';
  const badTranslated3 = 'Bem-vindo [jogador.nome]! Nível: [jogador.nvl], PV: [jogador.pv]/[jogador.max_pv]';
  const healed3 = healRenpyVariables(originalText3, badTranslated3);
  assert.strictEqual(healed3, 'Bem-vindo [player.name]! Nível: [player.lvl], PV: [player.hp]/[player.max_hp]');
  console.log('✓ healRenpyVariables correctly restored multi-variable interpolation');

  // 2. Test RenpyAdapter has codeProtector instantiated
  const adapter = new RenpyAdapter();
  assert(adapter.codeProtector, 'RenpyAdapter must have codeProtector instantiated');
  assert.strictEqual(adapter.codeProtector.defaultEngine, 'renpy');
  console.log('✓ RenpyAdapter.codeProtector is properly instantiated');

  // 3. Test RenpyValidator flags corrupted variable in .rpy
  const scratchDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const badRpy = path.join(scratchDir, 'test_corrupted.rpy');
  const badContent = 'translate pt_BR strings:\n\n    old "Age: [who.age]"\n    new "Idade: [quem.idade]"\n';
  fs.writeFileSync(badRpy, badContent, 'utf8');

  const validator = new RenpyValidator();
  const valRes = validator.validateRpyFile(badRpy);
  assert.strictEqual(valRes.valid, false, 'RenpyValidator must reject file with corrupted variable interpolation');
  assert(valRes.errors.length > 0, 'Must have at least one error');
  assert(valRes.errors[0].includes('[who.age]'), 'Error message must mention missing variable [who.age]');
  console.log('✓ RenpyValidator strictly rejected corrupted variable interpolation in .rpy file');

  fs.unlinkSync(badRpy);

  // 4. Test RenpyInjector automatically heals translations before writing
  const injector = new RenpyInjector();
  const testTlDir = path.join(scratchDir, 'test_tl', 'game', 'tl', 'pt_BR');
  const injectRes = await injector.inject(path.join(scratchDir, 'test_tl'), [
    {
      id: 'test_1',
      original: 'Age: [who.age]',
      translated: 'Idade: [quem.idade]',
      type: 'screen_text'
    }
  ]);

  assert.strictEqual(injectRes.success, true);
  const screensRpy = path.join(testTlDir, 'screens.rpy');
  assert(fs.existsSync(screensRpy));
  const screensContent = fs.readFileSync(screensRpy, 'utf8');
  assert(screensContent.includes('new "Idade: [who.age]"'), 'RenpyInjector must have auto-healed [who.age] before writing');
  console.log('✓ RenpyInjector auto-healed translation during injection');

  // Clean up scratch test_tl
  fs.rmSync(path.join(scratchDir, 'test_tl'), { recursive: true, force: true });

  console.log('=== ALL RENPY VARIABLE PROTECTION TESTS PASSED! ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
