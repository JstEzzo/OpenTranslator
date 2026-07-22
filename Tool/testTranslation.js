const path = require("path");
const fs = require("fs");

const toolDir = "C:/Users/Teste/Desktop/Arquivos Switch/OpenTranslator/Tool";
global.ROOT     = toolDir;
global.WWW_DIR  = path.join(toolDir, "www");
global.GL_DIR   = path.join(toolDir, "gameLib");
global.DATA_DIR = path.join(toolDir, "data");
global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
global.LOG_PATH = path.join(global.DATA_DIR, "openT.log");

require(path.join(toolDir, "src", "logger"));
require(path.join(toolDir, "src", "cache"));

const { handlers } = require(path.join(toolDir, "src", "rpcHandlers"));

async function testTranslationExecution() {
  console.log("=== TESTANDO EXTRAÇÃO E TRADUÇÃO DO REN'PY ===");

  const gameFolder = "C:\\Users\\Teste\\Desktop\\Nova pasta\\seeds-of-chaos-0.4.16-pc";
  const exePath = path.join(gameFolder, "seeds-of-chaos.exe");
  const extractedFile = path.join(gameFolder, "game", "opent_extracted.json");

  if (fs.existsSync(extractedFile)) {
      fs.unlinkSync(extractedFile);
      console.log("🧹 Arquivo de extração anterior apagado para iniciar teste limpo.");
  }

  const mockKey = "g_renpy_translation_test";
  handlers.saveGame({
    key: mockKey,
    data: {
      constArgs: { gameExe: exePath, engine: "python" },
      libConf: { title: "seeds-of-chaos", added: Date.now() }
    }
  });

  console.log("🚀 Lançando o jogo Ren'Py e aguardando renderização do Menu Principal...");
  const launchRes = await handlers.launchGame({ key: mockKey });
  console.log("Resultado do lançamento:", launchRes);

  console.log("⏳ Aguardando 10 segundos para o motor processar os textos da interface...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log("\n=== RESULTADO DA EXTRAÇÃO ===");
  if (fs.existsSync(extractedFile)) {
    console.log("✅ SUCESSO: O arquivo 'opent_extracted.json' FOI CRIADO!");
    
    try {
        const content = fs.readFileSync(extractedFile, "utf8");
        const jsonContent = JSON.parse(content);
        const keys = Object.keys(jsonContent);

        if (keys.length > 0) {
            console.log(`🎉 INCRÍVEL! Foram extraídos ${keys.length} textos diferentes da tela!`);
            console.log("Aqui estão os primeiros textos capturados diretamente do jogo:");
            keys.slice(0, 10).forEach(k => console.log(` ➔ "${k}" -> "${jsonContent[k]}"`));
        } else {
            console.warn("⚠️ O arquivo foi criado, mas está vazio. Verifique se o jogo realmente abriu na tela principal.");
        }
    } catch (e) {
        console.error("❌ Erro ao ler o arquivo JSON:", e.message);
    }
  } else {
    console.error("❌ FALHA: O arquivo 'opent_extracted.json' NÃO foi criado. A extração falhou ou o jogo não iniciou corretamente.");
  }

  handlers.delGame({ key: mockKey });
  console.log("\n✨ TESTE COMPLETO CONCLUÍDO!");
  process.exit(0);
}

testTranslationExecution();
