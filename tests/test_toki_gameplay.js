const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function rpc(method, params = {}) {
  const res = await fetch('http://localhost:8080/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params })
  });
  return res.json();
}

async function run() {
  const gameDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\Toki kan Yuusha (gitgud)';
  const exePath = path.join(gameDir, 'game.exe');
  const signalFile = path.resolve(__dirname, '../_gameplay_toki.json').replace(/\\/g, '/');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);

  console.log('1. Lançando Toki kan Yuusha...');
  const proc = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log('PID:', proc.pid);
  await sleep(7000);

  console.log('2. Verificando cena inicial...');
  const checkCode = `
    try {
      const fs = require('fs');
      const sc = SceneManager._scene ? SceneManager._scene.constructor.name : 'none';
      fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'INITIAL', scene: sc }));
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: checkCode });
  await sleep(2000);
  if (fs.existsSync(signalFile)) console.log('  Sinal Inicial:', fs.readFileSync(signalFile, 'utf8'));

  console.log('3. Tentando New Game...');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
  const newGameCode = `
    try {
      const fs = require('fs');
      if (SceneManager._scene && typeof SceneManager._scene.commandNewGame === 'function') {
        SceneManager._scene.commandNewGame();
      }
      setTimeout(function() {
        try {
          const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : null;
          const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : null;
          const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : null;
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'GAMEPLAY', scene: SceneManager._scene.constructor.name, mapId, x: px, y: py }));
        } catch(err) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'ERROR', error: err.message }));
        }
      }, 3000);
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: newGameCode });
  await sleep(4500);
  if (fs.existsSync(signalFile)) console.log('  Sinal NewGame:', fs.readFileSync(signalFile, 'utf8'));

  console.log('4. Tentando Save no Slot 1...');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
  const saveCode = `
    try {
      const fs = require('fs');
      if (typeof $gameSystem !== 'undefined' && typeof DataManager !== 'undefined') {
        $gameSystem.onBeforeSave();
        const res = DataManager.saveGame(1);
        if (res && typeof res.then === 'function') {
          res.then(function() {
            fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: true }));
          }).catch(function(e) {
            fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: false, error: e.message }));
          });
        } else if (res) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: true, sync: true }));
        } else {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: false, sync: true }));
        }
      }
    } catch(e) {
      const fs = require('fs');
      fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'SAVE', success: false, error: e.message }));
    }
  `;
  await rpc('sendCheatCommand', { code: saveCode });
  await sleep(2500);
  if (fs.existsSync(signalFile)) console.log('  Sinal Save:', fs.readFileSync(signalFile, 'utf8'));

  console.log('5. Fechando e reabrindo para Load...');
  try { process.kill(proc.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', 'game.exe'], { stdio: 'ignore' });
  await sleep(2000);

  const proc2 = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log('  Novo PID:', proc2.pid);
  await sleep(7000);

  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
  const loadCode = `
    try {
      const fs = require('fs');
      if (typeof DataManager !== 'undefined') {
        const onLoaded = function() {
          if (typeof $gameSystem !== 'undefined') $gameSystem.onAfterLoad();
          if (typeof SceneManager !== 'undefined') SceneManager.goto(Scene_Map);
          setTimeout(function() {
            try {
              const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : null;
              const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : null;
              const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : null;
              fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: true, scene: SceneManager._scene.constructor.name, mapId, x: px, y: py }));
            } catch(e) {}
          }, 2500);
        };
        const res = DataManager.loadGame(1);
        if (res && typeof res.then === 'function') {
          res.then(onLoaded).catch(function(e) {
            fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: false, error: e.message }));
          });
        } else if (res) {
          onLoaded();
        } else {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: false, sync: true }));
        }
      }
    } catch(e) {
      const fs = require('fs');
      fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: false, error: e.message }));
    }
  `;
  await rpc('sendCheatCommand', { code: loadCode });
  await sleep(4000);
  if (fs.existsSync(signalFile)) console.log('  Sinal Load:', fs.readFileSync(signalFile, 'utf8'));

  console.log('6. Finalizando teste...');
  try { process.kill(proc2.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', 'game.exe'], { stdio: 'ignore' });
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
}

run().catch(console.error);
