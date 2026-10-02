const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EngineDetector = require('../../src/core/engineDetector');

console.log('=== TEST SUITE 1: Engine Detection Across All Supported Engines ===');

(async () => {
  const tmpBase = path.join(__dirname, 'tmp_detect_test');
  if (fs.existsSync(tmpBase)) fs.rmSync(tmpBase, { recursive: true, force: true });
  fs.mkdirSync(tmpBase, { recursive: true });

  try {
    // 1. Ren'Py
    const renpyDir = path.join(tmpBase, 'renpy_game');
    fs.mkdirSync(path.join(renpyDir, 'game'), { recursive: true });
    fs.writeFileSync(path.join(renpyDir, 'game', 'script.rpy'), 'label start:\n    return\n');
    const renpyRes = await EngineDetector.detect(renpyDir);
    assert.strictEqual(renpyRes.engine, 'renpy');
    console.log('  ✓ Ren\'Py detected successfully');

    // 2. Godot
    const godotDir = path.join(tmpBase, 'godot_game');
    fs.mkdirSync(godotDir, { recursive: true });
    fs.writeFileSync(path.join(godotDir, 'project.godot'), 'config_version=5\n');
    const godotRes = await EngineDetector.detect(godotDir);
    assert.strictEqual(godotRes.engine, 'godot');
    console.log('  ✓ Godot detected successfully');

    // 3. GameMaker
    const gmDir = path.join(tmpBase, 'gm_game');
    fs.mkdirSync(gmDir, { recursive: true });
    fs.writeFileSync(path.join(gmDir, 'data.win'), 'FORM');
    const gmRes = await EngineDetector.detect(gmDir);
    assert.strictEqual(gmRes.engine, 'gamemaker');
    console.log('  ✓ GameMaker detected successfully');

    // 4. Construct 3
    const c3Dir = path.join(tmpBase, 'c3_game');
    fs.mkdirSync(c3Dir, { recursive: true });
    fs.writeFileSync(path.join(c3Dir, 'c3runtime.js'), '// c3 runtime');
    const c3Res = await EngineDetector.detect(c3Dir);
    assert.strictEqual(c3Res.engine, 'construct');
    console.log('  ✓ Construct 3 detected successfully');

    // 5. Defold
    const defoldDir = path.join(tmpBase, 'defold_game');
    fs.mkdirSync(defoldDir, { recursive: true });
    fs.writeFileSync(path.join(defoldDir, 'game.project'), '[project]\ntitle = Defold Game');
    const defoldRes = await EngineDetector.detect(defoldDir);
    assert.strictEqual(defoldRes.engine, 'defold');
    console.log('  ✓ Defold detected successfully');

    // 6. Generic
    const genDir = path.join(tmpBase, 'generic_game');
    fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(path.join(genDir, 'game.unknown'), 'data');
    const genRes = await EngineDetector.detect(genDir);
    assert.strictEqual(genRes.engine, 'generic');
    console.log('  ✓ Generic Engine fallback detected successfully');

    console.log('✓ PASS: Engine Detection Test Suite Complete.\n');
  } finally {
    if (fs.existsSync(tmpBase)) fs.rmSync(tmpBase, { recursive: true, force: true });
  }
})();
