/**
 * translator.test.js — Suíte de testes automatizados para RenpyTranslator
 */

const assert = require('assert');
const RenpyTranslator = require('../../src/engines/renpy/translator/renpyTranslator');

async function run() {
  console.log('--- [TEST] RenpyTranslator Unit Tests ---');

  const dict = {
    'Hello [player]! {b}Welcome{/b}': 'Olá [player]! {b}Bem-vindo{/b}',
    'Your points: [points]': 'Seus pontos: [points]',
    'Hello __OT_VAR_0__! __OT_TAG_1__Welcome__OT_TAG_2__': 'Olá __OT_VAR_0__! __OT_TAG_1__Bem-vindo__OT_TAG_2__',
    'Click {a=help}here{/a}': 'Clique {a=help}aqui{/a}',
    'Status: {color=#00ff00}OK{/color}': 'Status: {color=#00ff00}OK{/color}'
  };

  const translator = new RenpyTranslator(dict);

  // Test 1: Token Protection
  const orig1 = 'Hello [player]! {b}Welcome{/b}';
  const { protectedText, tokens } = translator.protectTokens(orig1);
  assert(protectedText.includes('__OT_VAR_0__'), 'Variável deve ser substituída por token imutável');
  assert(protectedText.includes('__OT_TAG_1__'), 'Tag {b} deve ser substituída por token imutável');
  assert(protectedText.includes('__OT_TAG_2__'), 'Tag {/b} deve ser substituída por token imutável');
  assert.strictEqual(tokens.length, 3, 'Devem ser detectados 3 tokens');
  console.log('  ✔ Token and Tag protection passed');

  // Test 2: Token Restoration
  const restored = translator.restoreTokens(protectedText, tokens);
  assert.strictEqual(restored, orig1, 'Restauração de tokens deve recompor exatamente a string original');
  console.log('  ✔ Token restoration parity passed');

  // Test 3: Token Validation
  const validCheck = translator.validateTokens(orig1, 'Olá [player]! {b}Bem-vindo{/b}');
  assert.strictEqual(validCheck.valid, true, 'Tradução com variáveis e tags idênticas deve ser válida');

  const brokenVarCheck = translator.validateTokens(orig1, 'Olá [jogador]! {b}Bem-vindo{/b}');
  assert.strictEqual(brokenVarCheck.valid, false, 'Tradução com variável traduzida/alterada deve falhar');

  const brokenTagCheck = translator.validateTokens(orig1, 'Olá [player]! Bem-vindo');
  assert.strictEqual(brokenTagCheck.valid, false, 'Tradução sem tags deve falhar');
  console.log('  ✔ Parity validation (missing/altered tokens) passed');

  // Test 4: End-to-end Translation
  const trans1 = translator.translateText('Hello [player]! {b}Welcome{/b}');
  assert.strictEqual(trans1, 'Olá [player]! {b}Bem-vindo{/b}', 'Tradução com tokens deve preservar variáveis e tags');

  const trans2 = translator.translateText('Click {a=help}here{/a}');
  assert.strictEqual(trans2, 'Clique {a=help}aqui{/a}', 'Tags de ação Ren\'Py devem ser preservadas');

  const trans3 = translator.translateText('Status: {color=#00ff00}OK{/color}');
  assert.strictEqual(trans3, 'Status: {color=#00ff00}OK{/color}', 'Tags de cor hexadecimal devem ser preservadas');
  console.log('  ✔ End-to-end translation with token preservation passed');

  // Test 5: Batch processing
  const extractedBatch = [
    { id: '1', clean: 'Hello [player]! {b}Welcome{/b}', file: 'script.rpy', line: 10, context: 'global', type: 'dialogue' },
    { id: '2', clean: 'Your points: [points]', file: 'screens.rpy', line: 20, context: 'screen:ui', type: 'screen_text' },
    { id: '3', clean: 'Unchanged Text', file: 'script.rpy', line: 30, context: 'global', type: 'dialogue' }
  ];
  const batchRes = translator.process(extractedBatch);
  assert.strictEqual(batchRes.count, 2, 'Apenas textos com tradução no dicionário devem ser incluídos');
  assert.strictEqual(batchRes.translationMap.get('1'), 'Olá [player]! {b}Bem-vindo{/b}');
  assert.strictEqual(batchRes.translationMap.get('2'), 'Seus pontos: [points]');
  console.log('  ✔ Batch translation process passed');

  console.log('✅ translator.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ Falha no translator.test.js:', err);
    process.exit(1);
  });
}

module.exports = run;
