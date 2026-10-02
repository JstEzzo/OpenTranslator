const assert = require('assert');
const UniversalTokenEngine = require('../core/universalTokenEngine');

console.log('=== TEST SUITE 7: Universal Placeholder & Token Preservation ===');

(() => {
  const ute = new UniversalTokenEngine();

  const tests = [
    { engine: 'renpy', input: 'Hello [player_name], cash $[cash], {i}italic{/i}' },
    { engine: 'unity', input: '<color=#ff0000>Critical!</color> {0} took {1} damage' },
    { engine: 'unreal', input: 'Player {0} acquired {ItemName}' },
    { engine: 'godot', input: 'Score: %d, Player: %s' },
    { engine: 'rpgmaker', input: 'Hero \\N[1] received \\V[10] Gold \\C[2]' },
    { engine: 'gamemaker', input: 'Level %1 completed in %2 seconds\nNext!' },
    { engine: 'construct', input: 'You have {{count}} coins' }
  ];

  for (const t of tests) {
    const { protectedText, tokens } = ute.protect(t.input, t.engine);
    assert.ok(tokens.length > 0, `Engine ${t.engine} should find tokens`);

    const simulated = protectedText;
    const { restoredText, valid, missingTokens } = ute.restore(simulated, tokens);
    assert.strictEqual(valid, true, `Tokens for ${t.engine} must be valid`);
    assert.strictEqual(restoredText, t.input, `Restored text must match original for ${t.engine}`);
    assert.strictEqual(missingTokens.length, 0);
    console.log(`  ✓ Tokens preserved and verified for engine: ${t.engine} (${tokens.length} tokens)`);
  }

  // Auto-healing test for translated Ren'Py variables
  const translatedRenpy = 'Olá [nome_do_jogador], você tem $[dinheiro]!';
  const renpyTokens = [
    { type: 'RENPY_VAR', token: '⟦OT_RENPY_VAR_0⟧', raw: '[player_name]' },
    { type: 'RENPY_VAR', token: '⟦OT_RENPY_VAR_1⟧', raw: '$[cash]' }
  ];
  const healed = ute.restore(translatedRenpy, renpyTokens);
  assert.strictEqual(healed.valid, true);
  assert.strictEqual(healed.restoredText, 'Olá [player_name], você tem $[cash]!');
  console.log('  ✓ Auto-healing of translated bracket variables verified');

  console.log('✓ PASS: Placeholder Preservation Test Suite Complete.\n');
})();
