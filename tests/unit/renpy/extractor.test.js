/**
 * extractor.test.js — Suíte de testes automatizados para RenpyExtractor
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RenpyExtractor = require('../../src/engines/renpy/extractor/renpyExtractor');

async function run() {
  console.log('--- [TEST] RenpyExtractor Unit Tests ---');

  const extractor = new RenpyExtractor();

  // Test 1: isTranslatable
  assert.strictEqual(extractor.isTranslatable('Hello world!'), true, 'Texto comum deve ser traduzível');
  assert.strictEqual(extractor.isTranslatable('True'), false, 'Constante True não deve ser traduzível');
  assert.strictEqual(extractor.isTranslatable('#ffffff'), false, 'Hex color não deve ser traduzível');
  assert.strictEqual(extractor.isTranslatable('window'), false, 'Estilo window não deve ser traduzível');
  assert.strictEqual(extractor.isTranslatable('image.png'), false, 'Nome de arquivo não deve ser traduzível');
  assert.strictEqual(extractor.isTranslatable('[player]'), false, 'Variável isolada não deve ser traduzível');
  console.log('  ✔ isTranslatable filtering passed');

  // Test 2: generateId
  const id1 = extractor.generateId('script.rpy', 10, 'Hello');
  const id2 = extractor.generateId('script.rpy', 10, 'Hello');
  const id3 = extractor.generateId('script.rpy', 11, 'Hello');
  assert.strictEqual(id1, id2, 'IDs para mesmo arquivo, linha e texto devem ser idênticos');
  assert.notStrictEqual(id1, id3, 'IDs para linhas diferentes devem ser distintos');
  console.log('  ✔ generateId determinism passed');

  // Test 3: Mock Script Extraction (Dialogues, Menus, Screens, Strings)
  const tempDir = path.resolve(__dirname, 'temp_extractor_test');
  const gameDir = path.join(tempDir, 'game');
  fs.mkdirSync(gameDir, { recursive: true });

  const sampleScript = `
# Comentário que deve ser ignorado
label start:
    "Era uma vez..."
    e happy "Olá [player]! Bem-vindo à cidade."
    s @ angry "Não faça isso!"
    menu:
        "Ir para a floresta":
            jump forest
        "Ficar em casa" if safe_mode:
            jump home

screen test_ui():
    text "Pontos de Vida: [points]"
    textbutton "Salvar Jogo" action Show("save")
    label "Opções do Sistema"
    tooltip "Clique para abrir ajuda"

translate pt_BR strings:
    old "Settings"
    new "Configurações"
`;

  fs.writeFileSync(path.join(gameDir, 'script.rpy'), sampleScript, 'utf8');

  try {
    const res = await extractor.extract(tempDir);
    assert.strictEqual(res.success, true, 'Extração deve retornar success: true');
    assert(res.count >= 9, `Esperado no mínimo 9 textos extraídos, recebido: ${res.count}`);

    const texts = res.texts;
    const originals = texts.map(t => t.clean);

    // Diálogos
    assert(originals.includes('Era uma vez...'), 'Deve conter fala do narrador');
    assert(originals.includes('Olá [player]! Bem-vindo à cidade.'), 'Deve conter fala com interpolação');
    assert(originals.includes('Não faça isso!'), 'Deve conter fala com atributo @');

    // Menus
    assert(originals.includes('Ir para a floresta'), 'Deve conter escolha de menu simples');
    assert(originals.includes('Ficar em casa'), 'Deve conter escolha de menu condicional if');

    // Screens
    assert(originals.includes('Pontos de Vida: [points]'), 'Deve conter text de tela');
    assert(originals.includes('Salvar Jogo'), 'Deve conter textbutton');
    assert(originals.includes('Opções do Sistema'), 'Deve conter label de tela');
    assert(originals.includes('Clique para abrir ajuda'), 'Deve conter tooltip');

    // Strings de tradução existente
    assert(originals.includes('Settings'), 'Deve conter string de catálogo old');

    // Proteção de tokens no item extraído
    const itemWithVar = texts.find(t => t.clean.includes('[player]'));
    assert(itemWithVar, 'Item com variável deve existir');
    assert(itemWithVar.tokens.length > 0, 'Item com variável deve possuir tokens protegidos');
    assert.strictEqual(itemWithVar.tokens[0].type, 'RENPY_VAR', 'Tipo de token deve ser RENPY_VAR');

    console.log(`  ✔ Extração estruturada aprovada (${res.count} textos capturados com precisão)`);
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(path.join(gameDir, 'script.rpy'));
      fs.rmdirSync(gameDir);
      fs.rmdirSync(tempDir);
    } catch(e) {}
  }

  console.log('✅ extractor.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ Falha no extractor.test.js:', err);
    process.exit(1);
  });
}

module.exports = run;
