const fs = require('fs');

const code = `
try {
  const win = nw.Window.get();
  win.capturePage(function(buffer) {
    const fs = require('fs');
    fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_screen.png', buffer);
  }, { format: 'png' });
} catch(e) {
  const fs = require('fs');
  fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_screen_err.txt', e.stack || e.message);
}
`;

(async () => {
  const res = await fetch('http://localhost:8080/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'sendCheatCommand', params: { code } })
  });
  console.log('Result:', await res.json());
})();
