/**
 * injector.test.js — Suíte de testes automatizados para RenpyInjector
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RenpyInjector = require('../../src/engines/renpy/injector/renpyInjector');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function run() {
  console.log('--- [TEST] RenpyInjector Unit Tests ---');

  const injector = new RenpyInjector();

  const tempDir = path.resolve(__dirname, 'temp_injector_test');
  const gameDir = path.join(tempDir, 'game');
  fs.mkdirSync(gameDir, { recursive: true });

  // Cria scripts originais de teste simulando um jogo real
  const origFiles = ['script.rpy', 'screens.rpy', 'options.rpy', 'gui.rpy'];
  const hashesBefore = {};

  for (const f of origFiles) {
    const p = path.join(gameDir, f);
    fs.writeFileSync(p, `# Original content of ${f}\nlabel start_${f.replace('.rpy','')}:\n    return\n`, 'utf8');
    hashesBefore[f] = sha256(p);
  }

  const sampleTranslations = [
    { id: '1', type: 'menu_choice', original: 'Start Game', translated: 'Iniciar Jogo', file: 'screens.rpy', line: 10 },
    { id: '2', type: 'dialogue', original: 'Hello [player]!', translated: 'Olá [player]!', file: 'script.rpy', line: 20 },
    { id: '3', type: 'screen_text', original: 'Save Game', translated: 'Salvar Jogo', file: 'screens.rpy', line: 30 }
  ];

  try {
    // Test 1: Injection
    const res = await injector.inject(tempDir, sampleTranslations);
    assert.strictEqual(res.success, true, 'Injeção deve ser bem sucedida');
    assert.strictEqual(res.stringsCount, 3, 'Deve conter 3 strings injetadas');

    const tlDir = path.join(gameDir, 'tl', 'pt_BR');
    assert(fs.existsSync(tlDir), 'Diretório game/tl/pt_BR/ deve existir');

    // Test 2: Arquivos obrigatórios gerados
    const initFile = path.join(tlDir, '000_opentranslator_init.rpy');
    const stringsFile = path.join(tlDir, 'strings.rpy');
    const dialoguesFile = path.join(tlDir, 'dialogues.rpy');
    const screensFile = path.join(tlDir, 'screens.rpy');

    assert(fs.existsSync(initFile), '000_opentranslator_init.rpy deve existir');
    assert(fs.existsSync(stringsFile), 'strings.rpy deve existir');
    assert(fs.existsSync(dialoguesFile), 'dialogues.rpy deve existir');
    assert(fs.existsSync(screensFile), 'screens.rpy deve existir');

    const initContent = fs.readFileSync(initFile, 'utf8');
    assert(initContent.includes('config.language = "pt_BR"'), 'Ativação automática de pt_BR deve estar presente');

    const strContent = fs.readFileSync(stringsFile, 'utf8');
    assert(strContent.includes('Iniciar Jogo'), 'strings.rpy deve conter menu choices');

    const diaContent = fs.readFileSync(dialoguesFile, 'utf8');
    assert(diaContent.includes('Olá [player]!'), 'dialogues.rpy deve conter diálogos');

    const scrContent = fs.readFileSync(screensFile, 'utf8');
    assert(scrContent.includes('Salvar Jogo'), 'screens.rpy deve conter screen texts');

    console.log('  ✔ Estrutura aditiva game/tl/pt_BR/ gerada com 100% de conformidade');

    // Test 3: Verificação de Não-Modificação dos arquivos originais
    for (const f of origFiles) {
      const p = path.join(gameDir, f);
      const hashAfter = sha256(p);
      assert.strictEqual(hashesBefore[f], hashAfter, `Arquivo original ${f} foi modificado! Invariância violada.`);
    }
    console.log('  ✔ Invariância estrita: script.rpy, screens.rpy, options.rpy, gui.rpy 100% intactos');

    // Test 4: Rollback Atômico
    const rollbackRes = await injector.rollback(tempDir);
    assert.strictEqual(rollbackRes.success, true, 'Rollback deve retornar success: true');
    assert(!fs.existsSync(tlDir), 'Diretório game/tl/pt_BR/ deve ter sido completamente removido');

    for (const f of origFiles) {
      const p = path.join(gameDir, f);
      const hashAfterRollback = sha256(p);
      assert.strictEqual(hashesBefore[f], hashAfterRollback, `Hash pós-rollback de ${f} difere do original!`);
    }
    console.log('  ✔ Rollback atômico aprovado com paridade SHA-256 BEFORE == RESTORED');

  } finally {
    // Cleanup final
    try {
      for (const f of origFiles) {
        const p = path.join(gameDir, f);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      fs.rmdirSync(gameDir);
      fs.rmdirSync(tempDir);
    } catch(e) {}
  }

  console.log('✅ injector.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ Falha no injector.test.js:', err);
    process.exit(1);
  });
}

module.exports = run;
