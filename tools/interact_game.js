const fs = require('fs');

async function main() {
  const code = `
try {
  const fs = require('fs');
  let log = [];
  if (typeof SceneManager !== 'undefined' && SceneManager._scene) {
    const scene = SceneManager._scene;
    log.push('Scene before: ' + scene.constructor.name);
    
    // If on Title, let's start a new game or select start
    if (scene.constructor.name === 'Scene_Title') {
      if (typeof scene.commandNewGame === 'function') {
        scene.commandNewGame();
        log.push('Called commandNewGame()');
      }
    }
  }

  setTimeout(() => {
    try {
      const curScene = SceneManager._scene ? SceneManager._scene.constructor.name : 'none';
      log.push('Scene after: ' + curScene);
      
      if (typeof nw !== 'undefined' && nw.Window) {
        const win = nw.Window.get();
        win.capturePage(function(img) {
          try {
            let buf;
            if (Buffer.isBuffer(img)) buf = img;
            else if (typeof img === 'string') buf = Buffer.from(img.replace(/^data:image\\/\\w+;base64,/, ''), 'base64');
            if (buf) {
              fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_screen_ingame.png', buf);
              log.push('Screenshot saved!');
            }
          } catch(e) { log.push('Screenshot err: ' + e.message); }
          fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/newgame_log.json', JSON.stringify(log, null, 2));
        }, { format: 'png', datatype: 'buffer' });
      } else {
        fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/newgame_log.json', JSON.stringify(log, null, 2));
      }
    } catch(e) {
      log.push('Error in timeout: ' + e.message);
      fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/newgame_log.json', JSON.stringify(log, null, 2));
    }
  }, 2000);
} catch(e) {
  const fs = require('fs');
  fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/newgame_log.json', JSON.stringify({ error: e.stack || e.message }, null, 2));
}
`;

  const res = await fetch('http://localhost:8080/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'sendCheatCommand', params: { code } })
  });
  console.log('Result:', await res.json());
}

main().catch(console.error);
