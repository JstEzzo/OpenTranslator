const assert = require('assert');
const path = require('path');
const fs = require('fs');
const CodeProtector = require('../../src/core/codeProtector');
const QAEngine = require('../../src/core/qaEngine');
const RenpyAdapter = require('../../src/engines/renpy/renpyAdapter');
const TranslationPipeline = require('../../src/core/translationPipeline');

console.log('=== REGRESSION TEST: Translation -> QA -> Launch Token Integrity ===');

// 1. Verify CodeProtector.restore always returns missingTokens array
const cp = new CodeProtector({ engine: 'renpy' });
const protectedRes = cp.protect("Hello {b}World{/b} [player_name]!", 'renpy');
assert(protectedRes.tokens.length === 3);

// Test complete loss of tokens
const badTrans = "Olá mundo sem tokens";
const restoreBad = cp.restore(badTrans, protectedRes.tokens);
assert(restoreBad.valid === false);
assert(Array.isArray(restoreBad.missingTokens));
assert(restoreBad.missingTokens.length === 3);

// Test preservation of tokens in raw form
const rawPreserved = "Olá {b}Mundo{/b} [player_name]!";
const restoreRaw = cp.restore(rawPreserved, protectedRes.tokens);
assert(restoreRaw.valid === true);
assert(Array.isArray(restoreRaw.missingTokens));
assert(restoreRaw.missingTokens.length === 0);

// Test auto-heal of translated variable names like [nome_do_jogador]
const translatedVar = "Olá {b}Mundo{/b} [nome_do_jogador]!";
const restoreHealed = cp.restore(translatedVar, protectedRes.tokens);
assert(restoreHealed.valid === true);
assert(restoreHealed.restoredText.includes('[player_name]'));
assert(restoreHealed.missingTokens.length === 0);

// 2. Verify QAEngine handles restored raw tokens without false-positive error
const qaRaw = QAEngine.validate("Hello {b}World{/b}", "Olá {b}Mundo{/b}", {
  expectedTokens: [{ id: 0, token: '⟦OT_RENPY_TAG_0⟧', raw: '{b}', type: 'RENPY_TAG' }]
});
assert(qaRaw.qaStatus === 'pass');
assert(qaRaw.qaErrors.length === 0);

// 3. Verify RenpyAdapter.validate never throws Cannot read properties of undefined (reading 'length')
const adapter = new RenpyAdapter();
const texts = [
  { id: 1, clean: 'Text 1 {i}test{/i}', tokens: [{ id: 0, token: '⟦OT_TAG_0⟧', raw: '{i}', type: 'TAG' }] },
  { id: 2, clean: 'Text 2 [var]', tokens: [{ id: 1, token: '⟦OT_VAR_1⟧', raw: '[var]', type: 'VAR' }] },
  { id: 3, clean: 'Normal text', tokens: [] }
];
const trMap = new Map();
trMap.set(1, 'Texto 1 sem tag'); // missing
trMap.set(2, 'Texto 2 [var]'); // raw preserved
trMap.set(3, 'Texto normal');

(async () => {
  const val = await adapter.validate('C:\\dummy', texts, trMap);
  assert(val.valid === true); // warnings shouldn't fail validation
  assert(val.warnings.length === 1);
  assert(val.warnings[0].includes('tags protegidas perdidas'));
  console.log('✓ PASS: Translation -> QA -> Launch Token Integrity verified.');
})();
