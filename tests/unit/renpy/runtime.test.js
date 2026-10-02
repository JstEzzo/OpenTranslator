/**
 * runtime.test.js — Suíte de testes automatizados para RenpyRuntime
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RenpyRuntime = require('../../src/engines/renpy/runtime/renpyRuntime');

async function run() {
  console.log('--- [TEST] RenpyRuntime Unit Tests ---');

  const runtime = new RenpyRuntime();
  const tempDir = path.resolve(__dirname, 'temp_runtime_test');
  const gameDir = path.join(tempDir, 'game');
  fs.mkdirSync(gameDir, { recursive: true });

  // Cria um falso executável para testar resolução
  const fakeExe = path.join(tempDir, 'MyGame.exe');
  fs.writeFileSync(fakeExe, 'MZ_FAKE_HEADER', 'utf8');

  try {
    // Test 1: resolveGameExe
    const resolvedExe = runtime.resolveGameExe(tempDir);
    assert.strictEqual(resolvedExe, fakeExe, 'Deve resolver o executável principal do jogo');
    console.log('  ✔ resolveGameExe passed');

    // Test 2: resolveGameSubDir
    const resolvedSub = runtime.resolveGameSubDir(tempDir);
    assert.strictEqual(resolvedSub, gameDir, 'Deve resolver a pasta game/ existente');
    console.log('  ✔ resolveGameSubDir passed');

    // Test 3: injectController
    const ctrlRes = runtime.injectController(tempDir, { language: 'pt_BR' });
    assert.strictEqual(ctrlRes.success, true, 'Injeção de controlador deve ser bem sucedida');
    assert(fs.existsSync(ctrlRes.controllerPath), '000_opentranslator_controller.rpy deve existir');

    const ctrlContent = fs.readFileSync(ctrlRes.controllerPath, 'utf8');
    assert(ctrlContent.includes('config.language = "pt_BR"'), 'Controlador deve conter configuração de idioma');
    assert(ctrlContent.includes('_ot_runtime_tick'), 'Controlador deve conter rotina de tick periódico');
    assert(ctrlContent.includes('_ot_cmd.json'), 'Controlador deve suportar protocolo de comandos IPC');
    console.log('  ✔ injectController passed');

    // Test 4: IPC protocol files
    const cmdFile = path.join(gameDir, '_ot_cmd.json');
    const respFile = path.join(gameDir, '_ot_resp.json');
    const statusFile = path.join(gameDir, '_ot_status.json');

    fs.writeFileSync(cmdFile, JSON.stringify({ action: 'test', id: 1 }));
    fs.writeFileSync(respFile, JSON.stringify({ ok: true, id: 1 }));
    fs.writeFileSync(statusFile, JSON.stringify({ online: true }));

    assert(fs.existsSync(cmdFile) && fs.existsSync(respFile) && fs.existsSync(statusFile), 'Arquivos IPC devem existir');
    console.log('  ✔ IPC protocol simulation passed');

    // Test 5: removeController (Rollback do Runtime)
    const removeRes = runtime.removeController(tempDir);
    assert.strictEqual(removeRes.success, true, 'Remoção de controlador deve ser bem sucedida');
    assert(!fs.existsSync(ctrlRes.controllerPath), 'Controlador deve ser completamente removido');
    assert(!fs.existsSync(cmdFile), 'Comando IPC deve ser limpo');
    assert(!fs.existsSync(respFile), 'Resposta IPC deve ser limpa');
    assert(!fs.existsSync(statusFile), 'Status IPC deve ser limpo');
    console.log('  ✔ removeController and IPC cleanup passed');

  } finally {
    // Cleanup
    try {
      if (fs.existsSync(fakeExe)) fs.unlinkSync(fakeExe);
      const items = fs.readdirSync(gameDir);
      for (const item of items) fs.unlinkSync(path.join(gameDir, item));
      fs.rmdirSync(gameDir);
      fs.rmdirSync(tempDir);
    } catch(e) {}
  }

  console.log('✅ runtime.test.js: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ Falha no runtime.test.js:', err);
    process.exit(1);
  });
}

module.exports = run;
