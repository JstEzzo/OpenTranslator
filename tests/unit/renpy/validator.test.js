/**
 * validator.test.js — Suíte de testes automatizados para RenpyValidator
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RenpyValidator = require('../../src/engines/renpy/validator/renpyValidator');

async function run() {
  console.log('--- [TEST] RenpyValidator Unit Tests ---');

  const validator = new RenpyValidator();
  const tempDir = path.resolve(__dirname, 'temp_validator_test');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Test 1: Valid .rpy syntax
    const validRpy = path.join(tempDir, 'valid.rpy');
    fs.writeFileSync(validRpy, `
translate pt_BR strings:

    # script.rpy:10
    old "Hello [player]!"
    new "Olá [player]!"

    # screens.rpy:20
    old "Start"
    new "Iniciar"
`, 'utf8');

    const res1 = validator.validateRpyFile(validRpy);
    assert.strictEqual(res1.valid, true, 'Arquivo RPY válido deve passar na validação');
    assert.strictEqual(res1.errors.length, 0, 'Não deve haver erros em arquivo válido');
    console.log('  ✔ Valid RPY syntax verification passed');

    // Test 2: Indentation error
    const badIndentRpy = path.join(tempDir, 'bad_indent.rpy');
    fs.writeFileSync(badIndentRpy, `
translate pt_BR strings:

  old "Hello"
  new "Olá"
`, 'utf8');

    const res2 = validator.validateRpyFile(badIndentRpy);
    assert.strictEqual(res2.valid, false, 'Indentação incorreta deve ser detectada');
    assert(res2.errors.some(e => e.includes('Indentação inválida')), 'Deve reportar erro de indentação');
    console.log('  ✔ Indentation error detection passed');

    // Test 3: Unbalanced brackets
    const badBracketRpy = path.join(tempDir, 'bad_brackets.rpy');
    fs.writeFileSync(badBracketRpy, `
translate pt_BR strings:

    old "Hello [player]!"
    new "Olá [player!"
`, 'utf8');

    const res3 = validator.validateRpyFile(badBracketRpy);
    assert.strictEqual(res3.valid, false, 'Colchetes desbalanceados devem ser detectados');
    assert(res3.errors.some(e => e.includes('Desbalanceamento de colchetes')), 'Deve reportar erro de colchetes');
    console.log('  ✔ Unbalanced brackets detection passed');

    // Test 4: validateInjection on directory
    const tlDir = path.join(tempDir, 'tl_sample');
    fs.mkdirSync(tlDir, { recursive: true });
    fs.writeFileSync(path.join(tlDir, 'strings.rpy'), `
translate pt_BR strings:

    old "Test"
    new "Teste"
`, 'utf8');

    const dirRes = validator.validateInjection(tlDir);
    assert.strictEqual(dirRes.valid, true, 'Validação de pasta de tradução válida deve passar');
    assert.strictEqual(dirRes.filesChecked.length, 1, 'Deve verificar 1 arquivo na pasta');
    console.log('  ✔ Directory injection validation passed');

    // Test 5: Semantic validation
    const texts = [
      { id: '1', clean: 'Points: [points]', tokens: [{ original: '[points]' }] }
    ];
    const transMapValid = new Map([['1', 'Pontos: [points]']]);
    const semRes1 = await validator.validate(tempDir, texts, transMapValid);
    assert.strictEqual(semRes1.valid, true, 'Validação semântica válida deve passar');
    assert.strictEqual(semRes1.warnings.length, 0, 'Não deve emitir avisos para tokens intactos');

    const transMapBroken = new Map([['1', 'Pontos: [pontos]']]);
    const semRes2 = await validator.validate(tempDir, texts, transMapBroken);
    assert(semRes2.warnings.length > 0, 'Deve emitir aviso para token perdido/modificado');
    console.log('  ✔ Semantic token parity validation passed');

  } finally {
    // Cleanup
    try {
      const items = fs.readdirSync(tempDir);
      for (const item of items) {
        const full = path.join(tempDir, item);
        if (fs.statSync(full).isDirectory()) {
          const subItems = fs.readdirSync(full);
          for (const s of subItems) fs.unlinkSync(path.join(full, s));
          fs.rmdirSync(full);
        } else {
          fs.unlinkSync(full);
        }
      }
      fs.rmdirSync(tempDir);
    } catch(e) {}
  }

  console.log('✅ validator.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ Falha no validator.test.js:', err);
    process.exit(1);
  });
}

module.exports = run;
