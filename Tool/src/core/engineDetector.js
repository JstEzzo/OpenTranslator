/**
 * OpenTranslator — EngineDetector
 * Detecção multicritério baseada em evidências estruturais, arquivos de configuração,
 * DLLs, executáveis PE (UTF-8 e UTF-16LE) e estrutura de pastas.
 */

const fs = require("fs");
const path = require("path");

class EngineDetector {
  /**
   * Lê a arquitetura PE (32-bit ou 64-bit) de um arquivo executável.
   */
  static getExeArch(exePath) {
    if (!exePath || !fs.existsSync(exePath)) return 32;
    try {
      const fd = fs.openSync(exePath, "r");
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0x3c);
      const peOffset = buf.readUInt32LE(0);
      const machineBuf = Buffer.alloc(2);
      fs.readSync(fd, machineBuf, 0, 2, peOffset + 4);
      fs.closeSync(fd);
      const machine = machineBuf.readUInt16LE(0);
      if (machine === 0x8664) return 64; // AMD64 / x64
      if (machine === 0x014c) return 32; // i386 / x86
    } catch (e) {}
    return 32;
  }

  /**
   * Busca padrões em um binário PE suportando tanto ASCII/UTF-8 quanto UTF-16LE.
   */
  static checkBinarySignatures(exePath, searchTerms = []) {
    if (!exePath || !fs.existsSync(exePath)) return [];
    const found = [];
    try {
      const stats = fs.statSync(exePath);
      const readSize = Math.min(stats.size, 512 * 1024); // Lê até 512KB do header/seções iniciais
      const buf = Buffer.alloc(readSize);
      const fd = fs.openSync(exePath, "r");
      fs.readSync(fd, buf, 0, readSize, 0);
      fs.closeSync(fd);

      const strUtf8 = buf.toString("utf8");
      const strUtf16 = buf.toString("utf16le");

      for (const term of searchTerms) {
        if (strUtf8.includes(term) || strUtf16.includes(term)) {
          found.push(term);
        }
      }
    } catch (e) {}
    return found;
  }

  /**
   * Executa a análise completa de um diretório e executável do jogo.
   * @param {string} targetPath - Caminho do executável ou do diretório do jogo
   * @returns {Promise<object>}
   */
  static async detect(targetPath) {
    let gameDir = "";
    let exePath = "";

    if (!targetPath || !fs.existsSync(targetPath)) {
      return {
        engine: "unknown",
        engineVersion: "unknown",
        architecture: "x86",
        confidence: 0,
        evidence: ["Caminho alvo não existe no sistema de arquivos"],
        warnings: ["Jogo não encontrado no disco"],
        capabilities: {}
      };
    }

    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      gameDir = targetPath;
      // Tenta localizar um .exe principal
      const files = fs.readdirSync(gameDir);
      const exes = files.filter(f => f.toLowerCase().endsWith(".exe"));
      if (exes.length > 0) {
        exePath = path.join(gameDir, exes[0]);
      }
    } else {
      exePath = targetPath;
      gameDir = path.dirname(targetPath);
    }

    const arch = exePath ? EngineDetector.getExeArch(exePath) : 64;
    const evidence = [];
    const warnings = [];

    // Leitura rasa e recursiva de primeiro nível de pastas e arquivos
    let rootFiles = [];
    try {
      rootFiles = fs.readdirSync(gameDir);
    } catch (e) {
      warnings.push(`Falha ao listar diretório do jogo: ${e.message}`);
    }
    const rootFilesLower = rootFiles.map(f => f.toLowerCase());

    // -------------------------------------------------------------
    // 1. DETECÇÃO REN'PY
    // -------------------------------------------------------------
    const gameSubDir = path.join(gameDir, "game");
    const hasGameDir = fs.existsSync(gameSubDir);
    let renpyFiles = [];
    if (hasGameDir) {
      try {
        renpyFiles = fs.readdirSync(gameSubDir).map(f => f.toLowerCase());
      } catch (e) {}
    }

    const hasRpy = renpyFiles.some(f => f.endsWith(".rpy") || f.endsWith(".rpyc") || f.endsWith(".rpa"));
    const hasRenpyDir = rootFilesLower.includes("renpy") || fs.existsSync(path.join(gameDir, "lib", "py3-windows-x86_64")) || fs.existsSync(path.join(gameDir, "lib", "windows-i686"));

    if (hasGameDir && (hasRpy || hasRenpyDir)) {
      evidence.push("Pasta 'game/' encontrada com scripts .rpy/.rpyc/.rpa");
      let version = "8.x";
      let pyVer = "Python 3";

      if (fs.existsSync(path.join(gameDir, "lib", "py3-windows-x86_64")) || fs.existsSync(path.join(gameDir, "lib", "python3.12")) || fs.existsSync(path.join(gameDir, "lib", "python3.9"))) {
        version = "8.x";
        pyVer = "Python 3 (64-bit)";
        evidence.push(`Runtime moderno Ren'Py 8 detectado (${pyVer})`);
      } else if (fs.existsSync(path.join(gameDir, "lib", "windows-i686")) || fs.existsSync(path.join(gameDir, "lib", "python2.7"))) {
        version = "7.x/6.x";
        pyVer = "Python 2.7";
        evidence.push(`Runtime clássico Ren'Py 7 detectado (${pyVer})`);
      } else {
        evidence.push("Arquivos Ren'Py detectados sem runtime lib explícito (usando adapter compatível v8)");
      }

      return {
        engine: "renpy",
        engineVersion: version,
        architecture: `x${arch}`,
        confidence: 0.96,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          nativeLocalization: true,
          archives: renpyFiles.some(f => f.endsWith(".rpa")),
          compiledScripts: renpyFiles.some(f => f.endsWith(".rpyc")),
          runtimeHook: false, // Injeção nativa via game/tl/<lang> é infinitamente mais estável que hook
          dom: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 2. DETECÇÃO RPG MAKER MV / MZ (NW.js / HTML5)
    // -------------------------------------------------------------
    const wwwDir = path.join(gameDir, "www");
    const hasWwwData = fs.existsSync(path.join(wwwDir, "data", "System.json")) || fs.existsSync(path.join(wwwDir, "data"));
    const hasRootData = fs.existsSync(path.join(gameDir, "data", "System.json"));
    const hasRmmzCore = fs.existsSync(path.join(gameDir, "js", "rmmz_core.js")) || fs.existsSync(path.join(wwwDir, "js", "rmmz_core.js"));
    const hasRpgCore = fs.existsSync(path.join(gameDir, "js", "rpg_core.js")) || fs.existsSync(path.join(wwwDir, "js", "rpg_core.js"));

    if (hasWwwData || hasRootData || hasRmmzCore || hasRpgCore) {
      const isMz = hasRmmzCore || (!hasWwwData && hasRootData);
      const subType = isMz ? "RPG Maker MZ" : "RPG Maker MV";
      evidence.push(`Estrutura de dados do ${subType} localizada (System.json / plugins.js)`);

      return {
        engine: isMz ? "mz" : "mv",
        engineVersion: isMz ? "MZ 1.x" : "MV 1.x",
        architecture: `x${arch}`,
        confidence: 0.98,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          nativeLocalization: false,
          archives: false,
          runtimeHook: true,
          dom: true,
          frameworkState: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 3. DETECÇÃO ELECTRON / CHROMIUM PURO (SEM RPG MAKER)
    // -------------------------------------------------------------
    const hasAsar = fs.existsSync(path.join(gameDir, "resources", "app.asar")) || fs.existsSync(path.join(gameDir, "app.asar"));
    const hasElectronSigs = rootFilesLower.some(f => f === "resources.pak" || f === "v8_context_snapshot.bin" || f === "license.electron.txt");
    const hasChromeSigs = rootFilesLower.some(f => f === "chrome_100_percent.pak" || f === "icudtl.dat");

    if (hasAsar || (hasElectronSigs && hasChromeSigs)) {
      if (hasAsar) evidence.push("Pacote Electron 'resources/app.asar' encontrado");
      if (hasElectronSigs) evidence.push("Assinaturas do runtime Electron/Chromium encontradas (v8_context_snapshot, resources.pak)");

      return {
        engine: "electron",
        engineVersion: "Chromium / Electron",
        architecture: `x${arch}`,
        confidence: 0.95,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          nativeLocalization: false,
          archives: hasAsar,
          runtimeHook: false,
          dom: true,
          frameworkState: true,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 4. DETECÇÃO RPG MAKER RGSS (XP / VX / VX ACE)
    // -------------------------------------------------------------
    const hasRgss3a = rootFilesLower.some(f => f.endsWith(".rgss3a") || f === "rgss301.dll" || f === "game.rvproj2");
    const hasRgss2a = rootFilesLower.some(f => f.endsWith(".rgss2a") || f === "rgss202e.dll" || f === "game.rvproj");
    const hasRgssAd = rootFilesLower.some(f => f.endsWith(".rgssad") || f.endsWith(".rxdata") || f === "rgss104e.dll" || f === "game.rxproj");

    if (hasRgss3a || hasRgss2a || hasRgssAd) {
      let subType = "RGSS3 (RPG Maker VX Ace)";
      let ver = "VX Ace";
      if (hasRgss2a) { subType = "RGSS2 (RPG Maker VX)"; ver = "VX"; }
      if (hasRgssAd) { subType = "RGSS1 (RPG Maker XP)"; ver = "XP"; }
      evidence.push(`Arquivos e DLLs do ${subType} identificados`);

      return {
        engine: "rgss",
        engineVersion: ver,
        architecture: `x${arch}`,
        confidence: 0.95,
        evidence,
        warnings,
        capabilities: {
          staticFiles: false,
          nativeLocalization: false,
          archives: true,
          runtimeHook: true,
          dom: false,
          frameworkState: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 5. DETECÇÃO UNITY (MONO VS IL2CPP)
    // -------------------------------------------------------------
    const hasUnityPlayer = rootFilesLower.includes("unityplayer.dll") || rootFilesLower.includes("unitycrashhandler64.exe") || rootFilesLower.includes("unitycrashhandler32.exe");
    const hasDataFolder = rootFilesLower.some(f => f.endsWith("_data"));
    let dataFolderName = rootFiles.find(f => f.toLowerCase().endsWith("_data")) || "";

    if (hasUnityPlayer || hasDataFolder) {
      evidence.push("Binários do motor Unity (UnityPlayer.dll / *_Data) encontrados");
      const dataFolderPath = dataFolderName ? path.join(gameDir, dataFolderName) : "";

      const isIl2cpp = fs.existsSync(path.join(gameDir, "GameAssembly.dll")) || (dataFolderPath && fs.existsSync(path.join(dataFolderPath, "il2cpp_data")));
      const isMono = rootFilesLower.includes("monobleedingedge") || (dataFolderPath && fs.existsSync(path.join(dataFolderPath, "Managed")));

      if (isIl2cpp) {
        evidence.push("Compilação nativa Unity IL2CPP (GameAssembly.dll presente)");
        return {
          engine: "unity",
          engineVersion: "Unity IL2CPP",
          architecture: `x${arch}`,
          confidence: 0.94,
          evidence,
          warnings: ["IL2CPP compila C# diretamente para C++ nativo. Estratégia recomendada: Hook nativo ou OCR."],
          capabilities: {
            staticFiles: false,
            nativeLocalization: false,
            archives: true,
            runtimeHook: false,
            dom: false,
            frameworkState: false,
            ocr: true,
            backupSupported: true
          }
        };
      } else if (isMono) {
        evidence.push("Compilação Unity Mono (.NET Managed Assemblies presentes)");
        return {
          engine: "unity",
          engineVersion: "Unity Mono",
          architecture: `x${arch}`,
          confidence: 0.96,
          evidence,
          warnings: [],
          capabilities: {
            staticFiles: false,
            nativeLocalization: false,
            archives: true,
            runtimeHook: true, // XUnity.AutoTranslator + BepInEx via Doorstop
            dom: false,
            frameworkState: false,
            ocr: true,
            backupSupported: true
          }
        };
      }

      return {
        engine: "unity",
        engineVersion: "Unity Genérico",
        architecture: `x${arch}`,
        confidence: 0.85,
        evidence,
        warnings,
        capabilities: { staticFiles: false, runtimeHook: false, ocr: true, backupSupported: true }
      };
    }

    // -------------------------------------------------------------
    // 6. DETECÇÃO WOLF RPG EDITOR
    // -------------------------------------------------------------
    const hasWolfData = rootFilesLower.includes("data.wolf") || fs.existsSync(path.join(gameDir, "Data", "BasicData")) || rootFilesLower.includes("gurugurusmf4.dll");
    if (hasWolfData) {
      evidence.push("Arquivos e estrutura do Wolf RPG Editor identificados");
      return {
        engine: "wolf",
        engineVersion: "Wolf RPG",
        architecture: `x${arch}`,
        confidence: 0.95,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          archives: true,
          runtimeHook: true,
          dom: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 7. DETECÇÃO TYRANOSCRIPT
    // -------------------------------------------------------------
    const hasTyrano = rootFilesLower.includes("tyranoscript") || rootFilesLower.includes("tyranobuilder.html") || fs.existsSync(path.join(gameDir, "data", "others", "plugin"));
    if (hasTyrano) {
      evidence.push("Estrutura do TyranoScript/TyranoBuilder localizada");
      return {
        engine: "tyrano",
        engineVersion: "TyranoScript",
        architecture: `x${arch}`,
        confidence: 0.92,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          dom: true,
          runtimeHook: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 8. DETECÇÃO KIRIKIRI (KRKR2 / KRKRZ)
    // -------------------------------------------------------------
    const hasXp3 = rootFilesLower.some(f => f.endsWith(".xp3"));
    if (hasXp3) {
      const isZ = exePath && EngineDetector.checkBinarySignatures(exePath, ["BootKirikiriZ", "TVP(Win64)"]).length > 0;
      evidence.push(`Pacotes .xp3 do motor Kirikiri encontrados (${isZ ? "Kirikiri Z" : "Kirikiri 2"})`);
      return {
        engine: isZ ? "krkrz" : "krkr",
        engineVersion: isZ ? "Kirikiri Z" : "Kirikiri 2",
        architecture: `x${arch}`,
        confidence: 0.90,
        evidence,
        warnings,
        capabilities: {
          staticFiles: false,
          archives: true,
          runtimeHook: true,
          dom: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // Se não encontrou na raiz e não tem arquivos de engine na raiz, verifica subpastas imediatas
    const subDirs = fs.readdirSync(gameDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(gameDir, d.name));
    for (const sub of subDirs) {
      const subFiles = fs.readdirSync(sub).map(f => f.toLowerCase());
      if (subFiles.includes("game.exe") || subFiles.some(f => f.endsWith(".rpy")) || subFiles.includes("unityplayer.dll") || subFiles.includes("data.wolf") || subFiles.includes("data") || subFiles.includes("www") || subFiles.includes("resources") || subFiles.includes("resources.pak") || fs.existsSync(path.join(sub, "resources", "app.asar"))) {
        const subRes = await EngineDetector.detect(sub);
        if (subRes.engine !== "generic") {
          subRes.evidence.unshift(`Jogo localizado na subpasta: ${path.basename(sub)}`);
          subRes.detectedSubdir = sub;
          return subRes;
        }
      }
    }

    // -------------------------------------------------------------
    // 8A. DETECÇÃO GODOT ENGINE
    // -------------------------------------------------------------
    const hasGodot = rootFilesLower.includes("project.godot") ||
                     rootFilesLower.some(f => f.endsWith(".pck")) ||
                     rootFilesLower.some(f => f.includes("godot"));
    if (hasGodot) {
      evidence.push("Estrutura da Godot Engine identificada (project.godot / .pck)");
      return {
        engine: "godot",
        engineVersion: "Godot 3.x/4.x",
        architecture: `x${arch}`,
        confidence: 0.95,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          nativeLocalization: true,
          archives: true,
          runtimeHook: false,
          dom: false,
          frameworkState: true,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 8B. DETECÇÃO UNREAL ENGINE
    // -------------------------------------------------------------
    const hasUnreal = rootFilesLower.includes("engine") ||
                      rootFilesLower.some(f => f.endsWith(".uproject")) ||
                      fs.existsSync(path.join(gameDir, "Content", "Paks")) ||
                      fs.existsSync(path.join(gameDir, "Content", "Localization"));
    if (hasUnreal) {
      evidence.push("Estrutura da Unreal Engine identificada (Paks / Localization)");
      return {
        engine: "unreal",
        engineVersion: "Unreal Engine 4/5",
        architecture: `x${arch}`,
        confidence: 0.94,
        evidence,
        warnings,
        capabilities: {
          staticFiles: true,
          nativeLocalization: true,
          archives: true,
          runtimeHook: false,
          dom: false,
          frameworkState: false,
          ocr: true,
          backupSupported: true
        }
      };
    }

    // -------------------------------------------------------------
    // 9. ENGINE DESCONHECIDA / GENÉRICA
    // -------------------------------------------------------------
    evidence.push("Nenhuma assinatura de engine prioritária encontrada.");
    warnings.push("Engine não catalogada. O OpenTranslator ativará o scanner de localização e o fallback OCR.");

    return {
      engine: "generic",
      engineVersion: "Desconhecida",
      architecture: `x${arch}`,
      confidence: 0.20,
      evidence,
      warnings,
      capabilities: {
        staticFiles: true,
        archives: false,
        runtimeHook: false,
        dom: false,
        frameworkState: false,
        ocr: true,
        backupSupported: true
      }
    };
  }
}

module.exports = EngineDetector;



