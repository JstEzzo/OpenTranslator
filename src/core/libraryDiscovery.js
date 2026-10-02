/**
 * OpenTranslator — LibraryDiscovery
 * Descoberta e classificação automática da biblioteca de jogos com base puramente
 * em evidências estruturais em disco (sem nomes de jogos ou listas manuais).
 * 
 * Classificações:
 * - GAME: Jogo executável completo com engine identificada ou estrutura de aplicação.
 * - CONTAINER: Pasta contêiner que agrupa jogos independentes, projetos ou pacotes aninhados.
 * - TOOL: Utilitários de tradução, modding, runtimes de ferramentas ou instaladores.
 * - SAVE: Diretório composto exclusivamente de arquivos de progresso / save slots.
 * - AUXILIARY: Dados parciais, manuais, documentos, APKs isolados ou assets sem executável.
 * - EMPTY: Diretório sem nenhum arquivo ou subdiretório (0 itens).
 * - UNKNOWN: Diretório ou arquivo sem evidências conclusivas.
 */

const fs = require("fs");
const path = require("path");
const EngineDetector = require("./engineDetector");

class LibraryDiscovery {
  constructor(options = {}) {
    this.engineDetector = EngineDetector;
  }

  /**
   * Analisa um item específico (pasta ou arquivo) e o classifica estruturalmente.
   * @param {string} itemPath Caminho absoluto
   * @returns {Promise<object>}
   */
  async classifyItem(itemPath) {
    const itemName = path.basename(itemPath);

    if (!fs.existsSync(itemPath)) {
      return {
        path: itemPath,
        name: itemName,
        classification: "UNKNOWN",
        reason: "Item não existe no disco",
        evidence: ["Caminho inacessível"],
        confidence: 0
      };
    }

    const stat = fs.statSync(itemPath);

    // Se for arquivo solto na raiz da biblioteca
    if (!stat.isDirectory()) {
      const ext = path.extname(itemPath).toLowerCase();
      if (ext === ".rpgsave" || ext === ".save" || ext === ".sav") {
        return {
          path: itemPath,
          name: itemName,
          classification: "SAVE",
          reason: "Arquivo de save isolado",
          evidence: [`Extensão de arquivo de progresso: ${ext}`],
          confidence: 0.99
        };
      }
      if (ext === ".exe" || ext === ".bat" || ext === ".cmd") {
        return {
          path: itemPath,
          name: itemName,
          classification: "AUXILIARY",
          reason: "Executável ou script avulso sem estrutura de jogo associada",
          evidence: [`Arquivo executável avulso: ${ext}`],
          confidence: 0.70
        };
      }
      return {
        path: itemPath,
        name: itemName,
        classification: "AUXILIARY",
        reason: "Arquivo avulso",
        evidence: [`Extensão ${ext}`],
        confidence: 0.80
      };
    }

    // Diretório: listar entradas
    let entries = [];
    try {
      entries = fs.readdirSync(itemPath);
    } catch (e) {
      return {
        path: itemPath,
        name: itemName,
        classification: "UNKNOWN",
        reason: `Falha ao ler diretório: ${e.message}`,
        evidence: ["Erro de I/O"],
        confidence: 0
      };
    }

    // 1. EMPTY
    if (entries.length === 0) {
      return {
        path: itemPath,
        name: itemName,
        classification: "EMPTY",
        reason: "Diretório não contém nenhum arquivo ou pasta",
        evidence: ["Diretório vazio (0 itens)"],
        confidence: 1.0
      };
    }

    const entriesLower = entries.map(e => e.toLowerCase());
    const subdirs = entries.filter(e => {
      try { return fs.statSync(path.join(itemPath, e)).isDirectory(); } catch (err) { return false; }
    });
    const rootFiles = entries.filter(e => {
      try { return fs.statSync(path.join(itemPath, e)).isFile(); } catch (err) { return false; }
    });
    const rootExes = rootFiles.filter(f => f.toLowerCase().endsWith(".exe"));

    // 2. SAVE
    const saveExts = [".rpgsave", ".save", ".sav", ".dat"];
    const isSaveDirOnly = entries.every(e => {
      const ext = path.extname(e).toLowerCase();
      return saveExts.includes(ext) || e.toLowerCase() === "config.rpgsave" || e.toLowerCase() === "global.rpgsave";
    });
    if (isSaveDirOnly && entries.length > 0) {
      return {
        path: itemPath,
        name: itemName,
        classification: "SAVE",
        reason: "Diretório composto exclusivamente de arquivos de progresso / save slots",
        evidence: entries.map(e => `Arquivo de save: ${e}`),
        confidence: 0.98
      };
    }

    // 3. TOOL / UTILITY
    const hasToolBat = entriesLower.some(e => e.endsWith(".bat") && (e.includes("tool") || e.includes("打开") || e.includes("patch") || e.includes("fix")));
    const hasToolSubdir = entries.some(e => {
      const sub = path.join(itemPath, e);
      try {
        if (fs.statSync(sub).isDirectory()) {
          const subFiles = fs.readdirSync(sub).map(f => f.toLowerCase());
          return subFiles.includes("mtool-runtime") || subFiles.includes("mtool.exe") || subFiles.includes("vfs-runtime");
        }
      } catch (err) {}
      return false;
    });

    const toolKeywords = ["tool", "cheat", "patcher", "injector", "decompiler", "unpacker", "utility", "fix"];
    const hasToolKeywords = toolKeywords.some(kw => itemName.toLowerCase().includes(kw));
    const hasOnlyExecutablesNoGameData = entriesLower.every(e => e.endsWith(".exe") || e.endsWith(".dll") || e.endsWith(".txt") || e.endsWith(".ini")) &&
      !entriesLower.some(e => e.includes("data") || e.includes("game") || e.includes("www") || e.includes("rpa") || e.includes("pck"));

    if (hasToolSubdir || hasToolBat || (hasToolKeywords && hasOnlyExecutablesNoGameData)) {
      return {
        path: itemPath,
        name: itemName,
        classification: "TOOL",
        reason: "Estrutura condizente com utilitário, toolkit ou ferramenta de tradução/modding",
        evidence: [
          hasToolBat ? "Scripts de inicialização de utilitário (.bat)" : null,
          hasToolSubdir ? "Runtime de ferramenta identificado (mtool-runtime / vfs-runtime)" : null,
          hasOnlyExecutablesNoGameData ? "Ausência de pacotes de dados de jogo" : null
        ].filter(Boolean),
        confidence: 0.95
      };
    }

    // 4. CONTAINER
    // Uma pasta é um CONTAINER se:
    // A) Contém subdiretórios que são jogos e não possui executável de jogo na raiz
    // B) É uma pasta contêiner genérica (ex: "Nova pasta", "Nova pasta (2)") agrupando jogos ou projetos
    const isGenericFolderName = /^(nova pasta|new folder)( \(\d+\))?$/i.test(itemName);
    const containedGames = [];

    for (const sub of subdirs) {
      const subPath = path.join(itemPath, sub);
      try {
        const subDetection = await this.engineDetector.detect(subPath);
        if (subDetection && subDetection.engine !== "unknown" && subDetection.engine !== "generic" && subDetection.confidence >= 0.85) {
          containedGames.push({
            name: sub,
            path: subPath,
            engine: subDetection.engine,
            engineVersion: subDetection.engineVersion,
            confidence: subDetection.confidence
          });
        }
      } catch (err) {}
    }

    // Se o diretório atual contém jogos em subpastas e não tem executável próprio de jogo na raiz
    if (containedGames.length > 0 && rootExes.length === 0) {
      return {
        path: itemPath,
        name: itemName,
        classification: "CONTAINER",
        reason: `Pasta contêiner agrupando ${containedGames.length} jogo(s) em subdiretórios`,
        evidence: containedGames.map(cg => `Jogo interno: ${cg.name} (${cg.engine} ${cg.engineVersion})`),
        confidence: 0.98,
        containedGames
      };
    }

    // Se o diretório tem nome genérico de contêiner ("Nova pasta", "Nova pasta (2)")
    if (isGenericFolderName) {
      // Se não possui executável na raiz e tem subpastas
      if (rootExes.length === 0 && subdirs.length > 0) {
        return {
          path: itemPath,
          name: itemName,
          classification: "CONTAINER",
          reason: "Diretório de agrupamento genérico sem executável raiz",
          evidence: [`Nome de contêiner genérico: ${itemName}`, `Subdiretórios: ${subdirs.join(", ")}`],
          confidence: 0.95,
          containedGames
        };
      }
      // Se possui executável de jogo na raiz, é um contêiner que encapsula um jogo não nomeado na pasta
      const primaryExe = rootExes.find(e => !e.toLowerCase().includes("crashhandler") && !e.toLowerCase().includes("reipatcher") && !e.toLowerCase().includes("setup"));
      if (primaryExe) {
        const internalGameName = path.basename(primaryExe, path.extname(primaryExe));
        const engineRes = await this.engineDetector.detect(itemPath);
        return {
          path: itemPath,
          name: itemName,
          classification: "CONTAINER",
          reason: `Contêiner genérico contendo jogo descompactado: ${internalGameName}`,
          evidence: [
            `Nome de contêiner genérico: ${itemName}`,
            `Executável principal do jogo: ${primaryExe}`,
            `Motor identificado: ${engineRes.engine} (${engineRes.engineVersion})`
          ],
          confidence: 0.95,
          containedGames: [
            {
              name: internalGameName,
              path: itemPath,
              engine: engineRes.engine,
              engineVersion: engineRes.engineVersion,
              confidence: engineRes.confidence
            }
          ]
        };
      }
    }

    // 5. AUXILIARY / INCOMPLETE
    // Se possui subpasta de dados (ex: *_Data) mas NÃO possui nenhum executável na raiz nem DLLs da engine
    const hasDataFolderOnly = entriesLower.some(e => e.endsWith("_data")) && rootExes.length === 0 && !entriesLower.includes("unityplayer.dll");
    if (hasDataFolderOnly) {
      return {
        path: itemPath,
        name: itemName,
        classification: "AUXILIARY",
        reason: "Dados ou assets parciais de jogo sem executável ou binários de runtime",
        evidence: entries.map(e => `Entrada parcial: ${e}`),
        confidence: 0.95
      };
    }

    // 6. GAME (Análise estrutural e EngineDetector)
    const engineRes = await this.engineDetector.detect(itemPath);

    // Se detectou uma engine estrutural conhecida com alta confiança
    if (engineRes && engineRes.engine !== "unknown" && engineRes.engine !== "generic" && engineRes.confidence >= 0.85) {
      // Garante que para Unity/outros motores haja executável ou binário na raiz
      return {
        path: itemPath,
        name: itemName,
        classification: "GAME",
        reason: `Estrutura de jogo completa identificada com motor ${engineRes.engineName || engineRes.engine}`,
        evidence: engineRes.evidence,
        confidence: engineRes.confidence,
        engine: engineRes.engine,
        engineVersion: engineRes.engineVersion,
        supportStatus: engineRes.supportStatus || (["mv", "mz", "renpy"].includes(engineRes.engine) ? "SUPPORTED" : "EXTERNAL_TOOL_REQUIRED"),
        capabilities: engineRes.capabilities
      };
    }

    // Se possui executáveis e subpastas de dados, mas engine genérica
    const hasData = entriesLower.some(e => e.includes("data") || e.includes("res") || e.includes("assets") || e.includes("content"));
    if (rootExes.length > 0 && hasData) {
      return {
        path: itemPath,
        name: itemName,
        classification: "GAME",
        reason: "Contém executável e pastas de recursos/dados de jogo (engine não catalogada)",
        evidence: [`Executáveis: ${rootExes.join(", ")}`, "Diretório de dados presente"],
        confidence: 0.75,
        engine: "unknown",
        engineVersion: "unknown",
        supportStatus: "UNSUPPORTED_SAFE_REJECT"
      };
    }

    // 7. AUXILIARY (Apenas documentos/imagens)
    const isDocOnly = entriesLower.every(e => e.endsWith(".txt") || e.endsWith(".pdf") || e.endsWith(".url") || e.endsWith(".md") || e.endsWith(".png") || e.endsWith(".jpg"));
    if (isDocOnly) {
      return {
        path: itemPath,
        name: itemName,
        classification: "AUXILIARY",
        reason: "Contém apenas documentos, manuais ou imagens promocionais",
        evidence: entries.map(e => `Arquivo auxiliar: ${e}`),
        confidence: 0.95
      };
    }

    // 8. UNKNOWN
    return {
      path: itemPath,
      name: itemName,
      classification: "UNKNOWN",
      reason: "Não foi possível classificar por evidências estruturais conclusivas",
      evidence: [`Entradas encontradas: ${entries.slice(0, 10).join(", ")}`],
      confidence: 0.30,
      engine: "unknown"
    };
  }

  /**
   * Varre a biblioteca completa e gera a lista classificada estruturalmente.
   * Separa claramente itens de primeiro nível e descobre jogos contidos em contêineres.
   * @param {string} libraryPath Caminho da biblioteca
   * @returns {Promise<object>}
   */
  async scanLibrary(libraryPath) {
    if (!fs.existsSync(libraryPath)) {
      throw new Error(`Biblioteca não encontrada no caminho: ${libraryPath}`);
    }

    const items = fs.readdirSync(libraryPath);
    const discoveredItems = [];
    const allRealGames = [];

    const stats = {
      TOTAL_ITEMS: items.length,
      TOTAL_CONTAINERS: 0,
      TOTAL_GAMES_DIRECT: 0,
      TOTAL_GAMES_CONTAINED: 0,
      TOTAL_REAL_GAMES: 0,
      TOTAL_TOOLS: 0,
      TOTAL_SAVES: 0,
      TOTAL_AUXILIARY: 0,
      TOTAL_EMPTY: 0,
      TOTAL_UNKNOWN: 0
    };

    for (const item of items) {
      const fullPath = path.join(libraryPath, item);
      const classified = await this.classifyItem(fullPath);
      discoveredItems.push(classified);

      switch (classified.classification) {
        case "CONTAINER":
          stats.TOTAL_CONTAINERS++;
          if (classified.containedGames && classified.containedGames.length > 0) {
            for (const cg of classified.containedGames) {
              stats.TOTAL_GAMES_CONTAINED++;
              allRealGames.push({
                name: cg.name,
                path: cg.path,
                parentContainer: item,
                engine: cg.engine,
                engineVersion: cg.engineVersion,
                confidence: cg.confidence
              });
            }
          }
          break;
        case "GAME":
          stats.TOTAL_GAMES_DIRECT++;
          allRealGames.push({
            name: classified.name,
            path: classified.path,
            parentContainer: null,
            engine: classified.engine,
            engineVersion: classified.engineVersion,
            confidence: classified.confidence
          });
          break;
        case "TOOL":
          stats.TOTAL_TOOLS++;
          break;
        case "SAVE":
          stats.TOTAL_SAVES++;
          break;
        case "AUXILIARY":
          stats.TOTAL_AUXILIARY++;
          break;
        case "EMPTY":
          stats.TOTAL_EMPTY++;
          break;
        default:
          stats.TOTAL_UNKNOWN++;
          break;
      }
    }

    stats.TOTAL_REAL_GAMES = allRealGames.length;

    return {
      timestamp: new Date().toISOString(),
      libraryPath,
      stats,
      topLevelItems: discoveredItems,
      allRealGames
    };
  }
}

module.exports = LibraryDiscovery;
