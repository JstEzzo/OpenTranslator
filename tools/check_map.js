const fs = require('fs');

async function main() {
  const code = `
try {
  const fs = require('fs');
  let status = {
    scene: SceneManager._scene ? SceneManager._scene.constructor.name : 'none',
    mapId: $gameMap ? $gameMap.mapId() : null,
    brightness: $gameScreen ? $gameScreen.brightness() : null,
    isMsgBusy: $gameMessage ? $gameMessage.isBusy() : false,
    msgText: $gameMessage ? $gameMessage.allText() : '',
    playerX: $gamePlayer ? $gamePlayer.x : null,
    playerY: $gamePlayer ? $gamePlayer.y : null
  };

  if (typeof nw !== 'undefined' && nw.Window) {
    const win = nw.Window.get();
    win.capturePage(function(img) {
      try {
        let buf;
        if (Buffer.isBuffer(img)) buf = img;
        else if (typeof img === 'string') buf = Buffer.from(img.replace(/^data:image\\/\\w+;base64,/, ''), 'base64');
        if (buf) {
          fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_screen_map.png', buf);
        }
      } catch(e) {}
      fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/map_status.json', JSON.stringify(status, null, 2));
    }, { format: 'png', datatype: 'buffer' });
  } else {
    fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/map_status.json', JSON.stringify(status, null, 2));
  }
} catch(e) {
  const fs = require('fs');
  fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/map_status.json', JSON.stringify({ error: e.stack || e.message }, null, 2));
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
