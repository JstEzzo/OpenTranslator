const fs = require('fs');

async function main() {
  const code = `
try {
  const fs = require('fs');
  const info = {
    isLoading: typeof Graphics !== 'undefined' && Graphics._loadingCount,
    hasError: typeof Graphics !== 'undefined' && Graphics._errorPrinter && Graphics._errorPrinter.innerHTML,
    scene: SceneManager._scene ? SceneManager._scene.constructor.name : null,
    isSceneReady: SceneManager._scene ? SceneManager._scene.isReady() : false,
    imageErrors: []
  };

  if (typeof ImageManager !== 'undefined' && ImageManager._cache) {
    info.cacheKeys = Object.keys(ImageManager._cache).slice(0, 10);
  }

  fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_loading_diagnostics.json', JSON.stringify(info, null, 2));
} catch(e) {
  const fs = require('fs');
  fs.writeFileSync('C:/Users/Teste/.gemini/antigravity-ide/brain/393a86f2-278a-4805-bf29-a5e9dc23a597/scratch/game_loading_diagnostics.json', JSON.stringify({ error: e.stack || e.message }, null, 2));
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
