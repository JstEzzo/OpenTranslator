const fs = require("fs");
const path = require("path");

global.ROOT = __dirname;
global.WWW_DIR = path.join(__dirname, "www");
global.GL_DIR = path.join(__dirname, "gameLib");
global.DATA_DIR = path.join(__dirname, "data");
global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
global.LOG_PATH = path.join(global.DATA_DIR, "openT.log");
global.PORT = 3000;

require("./src/logger");
require("./src/cache");

const { executeTranslationPipeline } = require("./src/gameEngine");

const gameDir = process.argv[2];
if (!gameDir || !fs.existsSync(gameDir)) {
  console.error("Uso: node run-pipeline-cli.js <caminho do jogo>");
  process.exit(1);
}

let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(global.CFG_PATH, "utf8"));
} catch (e) {
  global.log("warn", "run-pipeline-cli: config não lida, usando padrões. " + e.message);
}

(async () => {
  const t0 = Date.now();
  try {
    await executeTranslationPipeline(gameDir, cfg, path.basename(gameDir));
    global.log("success", `run-pipeline-cli: concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  } catch (e) {
    global.log("error", `run-pipeline-cli: FALHOU — ${e.stack || e.message}`);
    process.exitCode = 1;
  }
})();
