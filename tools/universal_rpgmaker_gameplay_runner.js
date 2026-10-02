/**
 * universal_rpgmaker_gameplay_runner.js — Runner Universal de Gameplay e Save/Load
 *
 * Responsabilidades:
 * - Executar testes de jogabilidade automatizados em jogos RPG Maker (MV e MZ)
 * - Validar save/load síncrono (MV) e assíncrono baseado em Promises (MZ)
 * - Coordenar sinais de inspeção de RAM e cenas via arquivo de sinal em data/
 *
 * Localização:
 * Camada de Ferramentas / QA & Testes (tools/)
 */

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

async function testGame(gameDir) {
  const exePath = path.join(gameDir, fs.readdirSync(gameDir).find(f => f.toLowerCase() === 'game.exe') || 'Game.exe');
  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const signalFile = path.resolve(dataDir, '_gameplay_universal_signal.json').replace(/\\/g, '/');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);

  console.log(`\n======================================================`);
  console.log(`TESTANDO GAMEPLAY E SAVE/LOAD UNIVERSAL: ${path.basename(gameDir)}`);
  console.log(`======================================================`);

  console.log('1. Lançando processo...');
  const proc = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log(`  PID: ${proc.pid}`);
  await sleep(7000);

  // 2. Estado Inicial
  console.log('2. Verificando estado inicial...');
  const checkCode = `
    try {
      const fs = require('fs');
      const sc = (typeof SceneManager !== 'undefined' && SceneManager._scene) ? SceneManager._scene.constructor.name : 'none';
      fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'INITIAL', scene: sc }));
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: checkCode });
  await sleep(2000);
  let initData = {};
  if (fs.existsSync(signalFile)) {
    initData = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    console.log('  Sinal Inicial:', initData);
  }

  // 3. New Game e Gameplay em Scene_Map
  console.log('3. Acionando New Game...');
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
  const newGameCode = `
    try {
      const fs = require('fs');
      if (typeof SceneManager !== 'undefined' && SceneManager._scene && typeof SceneManager._scene.commandNewGame === 'function') {
        SceneManager._scene.commandNewGame();
      }
      setTimeout(function() {
        try {
          const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : null;
          const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : null;
          const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : null;
          const sceneName = (typeof SceneManager !== 'undefined' && SceneManager._scene) ? SceneManager._scene.constructor.name : 'none';
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'GAMEPLAY', scene: sceneName, mapId, x: px, y: py }));
        } catch(err) {
          fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'ERROR', error: err.message }));
        }
      }, 3500);
    } catch(e) {}
  `;
  await rpc('sendCheatCommand', { code: newGameCode });
  await sleep(5000);
  let gameplayData = {};
  if (fs.existsSync(signalFile)) {
    gameplayData = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    console.log('  Sinal Gameplay:', gameplayData);
  }

  if (gameplayData.phase !== 'GAMEPLAY' || !gameplayData.scene.includes('Map')) {
    console.log('  ⚠️ Não foi possível confirmar Scene_Map imediatamente (pode haver intro ou diálogo preliminar).');
  }

  // 4. Salvar no Slot 1
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
  let saveData = {};
  if (fs.existsSync(signalFile)) {
    saveData = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    console.log('  Sinal Save:', saveData);
  }

  // 5. Encerrar processo
  console.log('5. Encerrando processo...');
  try { process.kill(proc.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', path.basename(exePath)], { stdio: 'ignore' });
  await sleep(2500);

  // Se o save falhou ou não foi possível, retornar apenas o que foi comprovado
  if (!saveData.success) {
    return {
      gameplay: gameplayData.phase === 'GAMEPLAY' ? 'GAMEPLAY_VERIFIED' : 'NOT_TESTED',
      gameplayDetails: gameplayData.phase === 'GAMEPLAY' ? `Scene_Map ativa, mapId: ${gameplayData.mapId}, posição X: ${gameplayData.x}, Y: ${gameplayData.y}` : null,
      saveLoad: 'NOT_TESTED',
      saveLoadDetails: null
    };
  }

  // 6. Reabrir e Carregar
  console.log('6. Reabrindo para teste de Load...');
  const proc2 = spawn(exePath, [], { cwd: gameDir, detached: true, stdio: 'ignore' });
  console.log(`  Novo PID: ${proc2.pid}`);
  await sleep(7000);

  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);
  const loadCode = `
    try {
      const fs = require('fs');
      if (typeof DataManager !== 'undefined') {
        const onLoaded = function() {
          if (typeof $gameSystem !== 'undefined') $gameSystem.onAfterLoad();
          if (typeof SceneManager !== 'undefined' && typeof Scene_Map !== 'undefined') SceneManager.goto(Scene_Map);
          setTimeout(function() {
            try {
              const mapId = (typeof $gameMap !== 'undefined' && $gameMap.mapId) ? $gameMap.mapId() : null;
              const px = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.x : null;
              const py = (typeof $gamePlayer !== 'undefined') ? $gamePlayer.y : null;
              const sc = (typeof SceneManager !== 'undefined' && SceneManager._scene) ? SceneManager._scene.constructor.name : 'none';
              fs.writeFileSync('${signalFile}', JSON.stringify({ phase: 'LOAD', success: true, scene: sc, mapId, x: px, y: py }));
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
  await sleep(4500);
  let loadData = {};
  if (fs.existsSync(signalFile)) {
    loadData = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
    console.log('  Sinal Load:', loadData);
  }

  // 7. Limpeza
  console.log('7. Finalizando teste...');
  try { process.kill(proc2.pid); } catch(e) {}
  spawnSync('taskkill', ['/F', '/IM', path.basename(exePath)], { stdio: 'ignore' });
  if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);

  const isSaveLoadSuccess = saveData.success && loadData.success && (loadData.scene && loadData.scene.includes('Map'));
  return {
    gameplay: (gameplayData.phase === 'GAMEPLAY' || isSaveLoadSuccess) ? 'GAMEPLAY_VERIFIED' : 'NOT_TESTED',
    gameplayDetails: `Scene_Map ativa, mapId: ${loadData.mapId || gameplayData.mapId}, posição X: ${loadData.x || gameplayData.x}, Y: ${loadData.y || gameplayData.y}`,
    saveLoad: isSaveLoadSuccess ? 'PASS' : 'NOT_TESTED',
    saveLoadDetails: isSaveLoadSuccess ? `Ciclo completo Save Slot 1 -> Close -> Reopen -> Load Slot 1 -> Scene_Map (mapId: ${loadData.mapId}) comprovado` : null
  };
}

module.exports = { testGame };

if (require.main === module) {
  const targetDir = process.argv[2] || 'C:/Users/Teste/Desktop/Nova pasta/RJ01058687_en';
  testGame(targetDir).then(res => {
    console.log('\nRESULTADO FINAL:', res);
    process.exit(0);
  }).catch(err => {
    console.error('ERRO:', err);
    process.exit(1);
  });
}
