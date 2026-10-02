/**
 * Teste em tempo real de Gameplay e Save/Load no Marge Mania v0.1
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function rpc(method, params = {}) {
  const res = await fetch('http://localhost:8080/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params })
  });
  return res.json();
}

async function main() {
  const gameDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\Marge Mania v0.1';
  const exePath = path.join(gameDir, 'Game.exe');
  const signalFile = path.resolve(__dirname, '../_gameplay_test_signal.json').replace(/\\/g, '/');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);

  console.log('1. Lançando Game.exe...');
  const proc = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log(`  PID: ${proc.pid}`);

  await sleep(6000);

  console.log('2. Verificando estado inicial do jogo...');
  const checkCode = `
    try {
      const fs = require('fs');
      const sc = SceneManager._scene ? SceneManager._scene.constructor.name : 'none';
      fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'INITIAL', scene: sc }));
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: checkCode });
  await sleep(1500);

  if (fs.existsSync(signalFile)) {
    console.log('  Sinal recebido:', fs.readFileSync(signalFile, 'utf8'));
  } else {
    console.log('  Nenhum sinal recebido.');
  }

  console.log('3. Acionando New Game e movimentação...');
  fs.unlinkSync(signalFile);
  const newGameCode = `
    try {
      const fs = require('fs');
      if (SceneManager._scene && typeof SceneManager._scene.commandNewGame === 'function') {
        SceneManager._scene.commandNewGame();
      }
      setTimeout(function() {
        try {
          const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : 0;
          if (typeof $gamePlayer !== 'undefined' && typeof $gamePlayer.moveStraight === 'function') {
            $gamePlayer.moveStraight(2);
          }
          const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : 0;
          const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : 0;
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'GAMEPLAY', scene: SceneManager._scene.constructor.name, mapId, x: px, y: py }));
        } catch(err) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'ERROR', error: err.message }));
        }
      }, 2500);
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: newGameCode });
  await sleep(4000);

  if (fs.existsSync(signalFile)) {
    console.log('  Sinal Gameplay:', fs.readFileSync(signalFile, 'utf8'));
  } else {
    console.log('  Nenhum sinal de Gameplay.');
  }

  console.log('4. Acionando Save no Slot 1...');
  fs.unlinkSync(signalFile);
  const saveCode = `
    try {
      const fs = require('fs');
      if (typeof $gameSystem !== 'undefined' && typeof DataManager !== 'undefined') {
        $gameSystem.onBeforeSave();
        DataManager.saveGame(1).then(function() {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: true }));
        }).catch(function(e) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: false, error: e.message }));
        });
      }
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: saveCode });
  await sleep(2500);

  if (fs.existsSync(signalFile)) {
    console.log('  Sinal Save:', fs.readFileSync(signalFile, 'utf8'));
  }

  console.log('5. Fechando jogo...');
  try { process.kill(proc.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', 'Game.exe'], { stdio: 'ignore' });
  await sleep(2000);

  console.log('6. Reabrindo jogo para Load...');
  const proc2 = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log(`  Novo PID: ${proc2.pid}`);
  await sleep(6000);

  fs.unlinkSync(signalFile);
  const loadCode = `
    try {
      const fs = require('fs');
      if (typeof DataManager !== 'undefined') {
        DataManager.loadGame(1).then(function() {
          if (typeof $gameSystem !== 'undefined') $gameSystem.onAfterLoad();
          if (typeof SceneManager !== 'undefined') SceneManager.goto(Scene_Map);
          setTimeout(function() {
            try {
              const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : 0;
              const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : 0;
              const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : 0;
              fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: true, scene: SceneManager._scene.constructor.name, mapId, x: px, y: py }));
            } catch(e) {}
          }, 2000);
        }).catch(function(e) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: false, error: e.message }));
        });
      }
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: loadCode });
  await sleep(4000);

  if (fs.existsSync(signalFile)) {
    console.log('  Sinal Load:', fs.readFileSync(signalFile, 'utf8'));
  } else {
    console.log('  Nenhum sinal de Load.');
  }

  console.log('7. Finalizando teste...');
  try { process.kill(proc2.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', 'Game.exe'], { stdio: 'ignore' });
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
}

main().catch(console.error);
