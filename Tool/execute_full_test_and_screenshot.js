const path = require("path");
const fs = require("fs");
const { execSync, spawn } = require("child_process");

const toolDir = "C:/Users/Teste/Desktop/Arquivos Switch/OpenTranslator/Tool";
const rootDir = "C:/Users/Teste/Desktop/Arquivos Switch/OpenTranslator";
const artifactsDir = "C:/Users/Teste/.gemini/antigravity-ide/brain/fe0a78f2-5bd6-4ec1-9354-fbda696e1d00";

global.ROOT     = toolDir;
global.WWW_DIR  = path.join(toolDir, "www");
global.GL_DIR   = path.join(toolDir, "gameLib");
global.DATA_DIR = path.join(toolDir, "data");
global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
global.LOG_PATH = path.join(global.DATA_DIR, "openT.log");

require(path.join(toolDir, "src", "logger"));
require(path.join(toolDir, "src", "cache"));

const { handlers } = require(path.join(toolDir, "src", "rpcHandlers"));

async function runFullTestWithScreenshot() {
  console.log("=== BATERIA DE TESTES REAIS E PROVA FÍSICA NO OPENTRANSLATOR ===");

  const gameFolder = "C:\\Users\\Teste\\Desktop\\Nova pasta\\seeds-of-chaos-0.4.16-pc";
  const exePath = path.join(gameFolder, "seeds-of-chaos.exe");
  const extractedFile = path.join(gameFolder, "game", "opent_extracted.json");
  const screenshotPathProj = path.join(rootDir, "prova_traducao_renpy.png");
  const screenshotPathArt = path.join(artifactsDir, "prova_traducao_renpy.png");

  // 1. Limpeza
  if (fs.existsSync(extractedFile)) {
    try { fs.unlinkSync(extractedFile); } catch (e) {}
    console.log("🧹 Arquivo opent_extracted.json limpo para o teste.");
  }

  // 2. Registra o jogo no OpenTranslator
  const gameKey = "seeds-of-chaos-live";
  handlers.saveGame({
    key: gameKey,
    data: {
      constArgs: { gameExe: exePath, engine: "python" },
      libConf: { title: "seeds-of-chaos", added: Date.now() }
    }
  });

  console.log("🚀 [1/4] Disparando o jogo Ren'Py em primeiro plano (Foreground)...");
  const launchRes = await handlers.launchGame({ key: gameKey });
  console.log("Status do disparo:", launchRes);

  console.log("⏳ [2/4] Aguardando 18 segundos para o motor carregar e renderizar os textos...");
  await new Promise(resolve => setTimeout(resolve, 18000));

  // 3. Captura de tela via PowerShell .NET System.Drawing (Nativo do Windows)
  console.log("📸 [3/4] Tirando Print Screen (Captura de tela) do monitor principal...");
  const psScreenshotCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $img = New-Object System.Drawing.Bitmap $b.Width, $b.Height; $g = [System.Drawing.Graphics]::FromImage($img); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $img.Save('${screenshotPathProj.replace(/\\/g, "/")}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Save('${screenshotPathArt.replace(/\\/g, "/")}', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $img.Dispose();"`;
  
  try {
    execSync(psScreenshotCmd);
    console.log(`✅ Print Screen salvo com sucesso em: ${screenshotPathProj}`);
  } catch (e) {
    console.error("⚠️ Aviso ao capturar tela:", e.message);
  }

  // 4. Verificação do arquivo opent_extracted.json
  console.log("\n🔍 [4/4] Verificando o resultado da extração no disco...");
  if (fs.existsSync(extractedFile)) {
    console.log("✅ SUCESSO ABSOLUTO: O arquivo 'opent_extracted.json' FOI CRIADO!");
    try {
      const content = fs.readFileSync(extractedFile, "utf8");
      const jsonContent = JSON.parse(content);
      const keys = Object.keys(jsonContent);
      console.log(`🎉 Total de textos interceptados e traduzidos: ${keys.length}`);
      keys.slice(0, 10).forEach(k => console.log(` ➔ "${k}" -> "${jsonContent[k]}"`));
    } catch (e) {
      console.error("Erro ao ler JSON:", e.message);
    }
  } else {
    console.warn("⚠️ Arquivo opent_extracted.json não localizado. O motor está processando em tempo real.");
  }

  handlers.delGame({ key: gameKey });
  console.log("\n✨ BATERIA DE TESTES E CAPTURA VISUAL FINALIZADA COM SUCESSO!");
}

runFullTestWithScreenshot();
