/**
 * OpenTranslator — StrategyPlanner
 * Avalia capacidades, evidências e riscos do jogo para planejar a estratégia técnica ótima.
 * Classifica cada estratégia como: READY, AVAILABLE, EXPERIMENTAL, BLOCKED, EXTERNAL_TOOL_REQUIRED, UNSUPPORTED.
 */

const fs = require("fs");
const path = require("path");

class StrategyPlanner {
  static plan(detection, gamePath) {
    let targetDir = detection.detectedSubdir || gamePath;
    try {
      if (fs.existsSync(gamePath) && !fs.statSync(gamePath).isDirectory()) {
        targetDir = path.dirname(gamePath);
      }
    } catch (e) {}

    const eng = (detection.engine || "generic").toLowerCase();
    const strategies = {};
    const fallbacks = [];
    let preferred = "ocr";

    // 1. Ren'Py
    if (eng === "renpy") {
      const hasGameDir = fs.existsSync(path.join(targetDir, "game"));
      strategies.native_tl = {
        name: "Tradução Nativa (.rpy / tl)",
        status: hasGameDir ? "READY" : "EXPERIMENTAL",
        risk: "LOW",
        reason: hasGameDir ? "Pasta game/ detectada; geração canônica em game/tl/ recomendada." : "Estrutura Ren'Py atípica."
      };
      preferred = "native_tl";
    }

    // 2. RPG Maker MV / MZ
    if (eng.startsWith("rpgmaker") || eng === "mv" || eng === "mz") {
      const hasData = fs.existsSync(path.join(targetDir, "data")) || fs.existsSync(path.join(targetDir, "www", "data"));
      strategies.static_patch = {
        name: "Modificação Segura de Arquivos Estáticos (JSON)",
        status: hasData ? "READY" : "EXPERIMENTAL",
        risk: "LOW",
        reason: hasData ? "Estrutura JSON em data/ íntegra para injeção transacional." : "Pasta data/ não localizada."
      };
      preferred = "static_patch";
    }

    // 3. RGSS3 / RPG Maker VX Ace
    if (eng === "rgss" || eng === "rgss3" || eng === "vxace") {
      const hasRvdata = (fs.existsSync(path.join(targetDir, "Data")) || fs.existsSync(path.join(targetDir, "data"))) &&
        (fs.readdirSync(fs.existsSync(path.join(targetDir, "Data")) ? path.join(targetDir, "Data") : path.join(targetDir, "data")).some(f => f.toLowerCase().endsWith(".rvdata2")));
      const hasRgssArchive = fs.existsSync(targetDir) && fs.readdirSync(targetDir).some(f => f.toLowerCase().endsWith(".rgss3a") || f.toLowerCase().endsWith(".rgss2a") || f.toLowerCase().endsWith(".rgssad"));

      if (hasRvdata) {
        strategies.rgss_marshal = {
          name: "Tradução Nativa Ruby Marshal (.rvdata2)",
          status: "READY",
          risk: "LOW",
          reason: "Arquivos .rvdata2 descompactados detectados; tradução e injeção transacional prontas."
        };
        preferred = "rgss_marshal";
      } else if (hasRgssArchive) {
        strategies.rgss_marshal = {
          name: "Tradução de Arquivo Encriptado RGSS (.rgss3a)",
          status: "EXTERNAL_TOOL_REQUIRED",
          risk: "HIGH",
          reason: "Arquivo de dados encriptado em container RGSS (.rgss3a). Requer ferramenta de desempacotamento ou hook DLL."
        };
      }
    }

    // 4. Wolf RPG Editor
    if (eng === "wolf") {
      const basicData = path.join(targetDir, "Data", "BasicData");
      const hasBasicData = fs.existsSync(basicData) && fs.readdirSync(basicData).some(f => f.toLowerCase().endsWith(".dat"));
      const hasWolfArchive = fs.existsSync(path.join(targetDir, "Data")) && fs.readdirSync(path.join(targetDir, "Data")).some(f => f.toLowerCase().endsWith(".wolf"));

      if (hasBasicData) {
        strategies.wolf_binary = {
          name: "Tradução Binária Wolf RPG (BasicData & MapData)",
          status: "READY",
          risk: "LOW",
          reason: "Arquivos .dat e .mps descompactados detectados; substituição transacional com ponteiros decrescentes pronta."
        };
        preferred = "wolf_binary";
      } else if (hasWolfArchive) {
        strategies.wolf_binary = {
          name: "Extração de Pacote .wolf (UberWolfCli)",
          status: "EXTERNAL_TOOL_REQUIRED",
          risk: "MEDIUM",
          reason: "Dados empacotados em arquivos .wolf. Requer extração prévia via UberWolfCli."
        };
      }
    }

    // 5. Godot Engine
    if (eng === "godot") {
      const hasPck = fs.existsSync(targetDir) && fs.readdirSync(targetDir).some(f => f.toLowerCase().endsWith(".pck"));
      const hasCsvPo = fs.existsSync(targetDir) && fs.readdirSync(targetDir).some(f => f.toLowerCase().endsWith(".csv") || f.toLowerCase().endsWith(".po"));

      strategies.godot_pck = {
        name: "Injeção e Tradução de Pacote Godot PCK / Localização Nativa",
        status: (hasPck || hasCsvPo) ? "READY" : "AVAILABLE",
        risk: "LOW",
        reason: hasPck ? "Arquivo .pck detectado; extração de diálogos JSON e rebuild seguro de tabela de arquivos suportados." : "Arquivos de localização nativos detectados."
      };
      preferred = "godot_pck";
    }

    // 6. Unity Engine (Mono / IL2CPP)
    if (eng === "unity") {
      const isIl2cpp = fs.existsSync(path.join(targetDir, "GameAssembly.dll"));
      const hasAssets = fs.existsSync(targetDir) && fs.readdirSync(targetDir).some(f => f.toLowerCase().endsWith("_data"));

      strategies.unity_asset = {
        name: "Extração e Reinserção de TextAsset/Localization Tables (UnityPy)",
        status: hasAssets ? "READY" : "AVAILABLE",
        risk: "LOW",
        reason: "Varredura profunda de serializados .assets, TextAsset e tabelas de localização suportada via UnityPy portátil."
      };
      preferred = "unity_asset";

      const canRuntimeHook = detection.capabilities?.runtimeHook !== false && !isIl2cpp;
      strategies.runtime_hook = {
        name: "Injeção Dinâmica em Memória (BepInEx / XUnity.AutoTranslator)",
        status: canRuntimeHook ? "AVAILABLE" : "BLOCKED",
        risk: canRuntimeHook ? "MEDIUM" : "HIGH",
        reason: canRuntimeHook
          ? "Suporte a BepInEx / XUnity disponível para Unity Mono."
          : "Unity IL2CPP bloqueia Runtime Hook (BepInEx requer configuração específica e Cpp2IL/MelonLoader)."
      };

      if (isIl2cpp) {
        strategies.unity_il2cpp = {
          name: "IL2CPP Assembly Strings",
          status: "EXTERNAL_TOOL_REQUIRED",
          risk: "HIGH",
          reason: "Diálogos embutidos diretamente no código binário compilado GameAssembly.dll. Requer ferramenta Il2CppDumper/Cpp2IL."
        };
      } else {
        strategies.unity_mono = {
          name: "Mono Assembly C# Strings",
          status: "EXTERNAL_TOOL_REQUIRED",
          risk: "HIGH",
          reason: "Diálogos embutidos diretamente no código compilado de Assembly-CSharp.dll. Requer ferramenta de descompilação IL (dnSpy/MelonLoader)."
        };
      }
    }

    // 7. Electron / Web
    if (eng === "electron") {
      const hasAsar = fs.existsSync(path.join(targetDir, "resources", "app.asar")) || fs.existsSync(path.join(targetDir, "app.asar"));
      strategies.static_patch = {
        name: "Patch Estático via ASAR",
        status: hasAsar ? "AVAILABLE" : "BLOCKED",
        risk: "MEDIUM",
        reason: hasAsar ? "Arquivo app.asar presente para repack." : "app.asar não encontrado."
      };
      strategies.dom_bridge = {
        name: "Live DOM Observer Bridge",
        status: "READY",
        risk: "LOW",
        reason: "Renderer Chromium detectado; injeção via MutationObserver suportada."
      };
      preferred = "dom_bridge";
    }

    // 8. OCR Universal
    strategies.ocr = {
      name: "OCR de Tela Adaptativo",
      status: "READY",
      risk: "LOW",
      reason: "Fallback universal via captura de janela e OCR de texto visível."
    };

    // Monta lista de fallbacks viáveis
    for (const [key, strat] of Object.entries(strategies)) {
      if (key !== preferred && (strat.status === "READY" || strat.status === "AVAILABLE" || strat.status === "EXPERIMENTAL")) {
        fallbacks.push(strat.name);
      }
    }

    const blocked = Object.entries(strategies)
      .filter(([_, s]) => s.status === "BLOCKED" || s.status === "EXTERNAL_TOOL_REQUIRED")
      .map(([k, s]) => ({ strategy: k, name: s.name, status: s.status, reason: s.reason }));

    return {
      preferred: strategies[preferred] ? strategies[preferred].name : "OCR de Tela Adaptativo",
      preferredKey: preferred,
      strategies,
      fallbacks,
      blocked
    };
  }
}

module.exports = StrategyPlanner;
