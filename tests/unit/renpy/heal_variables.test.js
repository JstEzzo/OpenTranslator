const assert = require('assert');
const { healRenpyVariables, extractRenpyInterpolations } = require('../../../src/engines/renpy/renpyCommon');

function run() {
  console.log('--- [TEST] Ren\'Py Variables & Tags Healing Tests ---');

  // Test 1: Complex Ren'Py expressions with operators and spaces
  const t1Orig = 'Come back on [saga.time.dow + when] afternoon, alright?';
  const t1Bad = 'Volte na [saga.time.dow + quando] tarde, certo?';
  const t1Healed = healRenpyVariables(t1Orig, t1Bad);
  assert.strictEqual(t1Healed, 'Volte na [saga.time.dow + when] tarde, certo?');
  console.log('  ✔ Interpolação com operadores e espaços restaurada');

  // Test 2: Nested brackets and conversion flags [when[1]!l]
  const t2Orig = 'Someone will be out to service the car tomorrow [when[1]!l].';
  const t2Bad = 'Alguém sairá para consertar o carro amanhã [quando[1]!l].';
  const t2Healed = healRenpyVariables(t2Orig, t2Bad);
  assert.strictEqual(t2Healed, 'Alguém sairá para consertar o carro amanhã [when[1]!l].');
  console.log('  ✔ Interpolação aninhada [when[1]!l] restaurada');

  // Test 3: Formatting flags and attributes [what.cost:,]
  const t3Orig = 'Add to [what.cart!lt]. [[{usd=$[what.cost:,]}]';
  const t3Bad = 'Adicione a [what.cart!lt]. [[{usd=$[qual.custo:,]}]';
  const t3Healed = healRenpyVariables(t3Orig, t3Bad);
  assert.strictEqual(t3Healed, 'Adicione a [what.cart!lt]. [[{usd=$[what.cost:,]}]');
  console.log('  ✔ Interpolação com formatação monetária restaurada');

  // Test 4: Strip [PT] prefix when original does not have [PT]
  const t4Orig = 'Open';
  const t4Bad = '[PT] Open';
  const t4Healed = healRenpyVariables(t4Orig, t4Bad);
  assert.strictEqual(t4Healed, 'Open');
  console.log('  ✔ Prefixo [PT] removido com segurança');

  // Test 5: Paired text tag healing (missing opening {i})
  const t5Orig = 'Yeah, and it only took him for-{i}ever!{/i}';
  const t5Bad = 'Sim, e isso levou apenas uma eternidade!{/i}';
  const t5Healed = healRenpyVariables(t5Orig, t5Bad);
  assert.strictEqual(t5Healed, 'Sim, e isso levou apenas uma {i}eternidade!{/i}');
  console.log('  ✔ Tag {i} ausente restaurada antes da palavra enfatizada');

  // Test 6: Paired text tag healing (missing opening {s})
  const t6Orig = 'Coming {s}soon{/s} later!';
  const t6Bad = 'Em breve{/s} mais tarde!';
  const t6Healed = healRenpyVariables(t6Orig, t6Bad);
  assert.strictEqual(t6Healed, 'Em {s}breve{/s} mais tarde!');
  console.log('  ✔ Tag {s} ausente restaurada');

  // Test 7: Unescaped literal brackets in translated text when original has none
  const t7Orig = 'Select item';
  const t7Bad = 'Selecionar [item]';
  const t7Healed = healRenpyVariables(t7Orig, t7Bad);
  assert.strictEqual(t7Healed, 'Selecionar [[item]');
  console.log('  ✔ Colchetes não originais escapados como [[ para prevenir NameError');

  console.log('✅ heal_variables.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

run();
