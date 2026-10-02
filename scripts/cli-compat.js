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

const { executeTranslationPipeline, detectEngine } = require("./src/gameEngine");
const { clearEngineBans } = require("./src/translator");
const { extractGameTexts } = require("./src/extractor");

const gameDir = process.argv[2];
if (!gameDir || !fs.existsSync(gameDir)) {
  console.error("Uso: node cli-compat.js <caminho do jogo> [sl] [tl] [engine]");
  console.error("Exemplo: node cli-compat.js \"C:\\Games\\MyRPGMZ\" en pt");
  process.exit(1);
}

function findGameExe(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const exe = entries.find(
      (e) => e.isFile() && e.name.toLowerCase().endsWith(".exe")
    );
    if (exe) return path.join(dir, exe.name);
  } catch (e) {}
  return null;
}
const exePath = findGameExe(gameDir);
const gameEngineType = exePath ? detectEngine(exePath, gameDir) : "generic";

let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(global.CFG_PATH, "utf8"));
} catch (e) {
  global.log("warn", "cli-compat: config não lida, usando padrões. " + e.message);
}

// Auto-detect source language if not specified
if (!process.argv[3]) {
  try {
    const texts = extractGameTexts(gameDir);
    const counts = { ja: 0, ko: 0, zh: 0, en: 0 };
    for (const t of texts) {
      const c = t.clean;
      for (const ch of c) {
        const code = ch.charCodeAt(0);
        if (code >= 0x3040 && code <= 0x30FF) counts.ja++;
        else if (code >= 0xAC00 && code <= 0xD7A3) counts.ko++;
        else if (code >= 0x4E00 && code <= 0x9FFF) counts.zh++;
        else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) counts.en++;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const totalCJK = counts.ja + counts.ko + counts.zh;
    const primary = sorted[0][0];
    const primaryCount = sorted[0][1];
    if (totalCJK > 0) {
      cfg.sl = primary === "zh" ? "zh" : primary === "ko" ? "ko" : "ja";
      const secondary = sorted[1][0];
      const secondaryCount = sorted[1][1];
      if (secondaryCount > 0 && (secondary === "ja" || secondary === "ko" || secondary === "zh")) {
        global.log("info", `cli-compat: idioma fonte detectado como ${cfg.sl} (${primaryCount} chars CJK). Idioma secundário detectado: ${secondary} (${secondaryCount} chars).`);
      } else {
        global.log("info", `cli-compat: idioma fonte detectado como ${cfg.sl} (${primaryCount} chars CJK).`);
      }
    } else {
      cfg.sl = "auto";
      global.log("info", "cli-compat: idioma fonte auto-detectado (auto).");
    }
  } catch (e) {
    cfg.sl = "auto";
    global.log("warn", "cli-compat: falha na detecção de idioma, usando auto. " + e.message);
  }
}

if (process.argv[3]) cfg.sl = process.argv[3];
if (process.argv[4]) cfg.tl = process.argv[4];
if (process.argv[5]) cfg.engine = process.argv[5];

clearEngineBans();

(async () => {
  const t0 = Date.now();
  try {
    await executeTranslationPipeline(gameDir, cfg, path.basename(gameDir), gameEngineType);
    global.log("success", `cli-compat: concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  } catch (e) {
    global.log("error", `cli-compat: FALHOU — ${e.stack || e.message}`);
    global.log("warn", "Tentando forçar engine de fallback...");
    cfg.engine = "bing";
    clearEngineBans();
    try {
      await executeTranslationPipeline(gameDir, cfg, path.basename(gameDir), gameEngineType);
      global.log("success", `cli-compat (fallback): concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
    } catch (e2) {
      global.log("error", `cli-compat: fallback também FALHOU — ${e2.stack || e2.message}`);
      process.exitCode = 1;
    }
  }
})();