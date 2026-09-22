/**
 * OpenTranslator — StrategyPlanner
 * Avalia capacidades, evidências e riscos do jogo para planejar a estratégia técnica ótima.
 * Classifica cada estratégia como: READY, AVAILABLE, EXPERIMENTAL, BLOCKED, UNSUPPORTED.
 */

const fs = require("fs");
const path = require("path");

class StrategyPlanner {
  static plan(detection, gamePath) {
    let targetDir = detection.detectedSubdir || gamePath;
try { if (fs.existsSync(gamePath) && !fs.statSync(gamePath).isDirectory()) targetDir = path.dirname(gamePath); } catch (e) {}
    const eng = (detection.engine || "generic").toLowerCase();
    const strategies = {};
    const fallbacks = [];
    let preferred = "ocr";

    // 1. Avaliação: Tradução Nativa (Ren'Py / Godot / Localization Files)
    if (eng === "renpy") {
      const hasGameDir = fs.existsSync(path.join(targetDir, "game"));
      strategies.native_tl = {
        name: "Tradução Nativa (.rpy / tl)",
        status: hasGameDir ? "READY" : "EXPERIMENTAL",
        risk: "LOW",
        reason: hasGameDir ? "Pasta game/ detectada; geração canônica em game/tl/ recomendada." : "Estrutura Ren'Py atípica."
      };
      preferred = "native_tl";
    } else {
      strategies.native_tl = {
        name: "Tradução Nativa (.rpy / tl)",
        status: "UNSUPPORTED",
        risk: "HIGH",
        reason: "Engine não suporta pastas de tradução Ren'Py."
      };
    }

    // 2. Avaliação: Modificação Segura de Arquivos Estáticos (RPG Maker / JSON / Electron)
    if (eng.startsWith("rpgmaker") || eng === "mv" || eng === "mz") {
      const hasData = fs.existsSync(path.join(targetDir, "data")) || fs.existsSync(path.join(targetDir, "www", "data"));
      strategies.static_patch = {
        name: "Modificação Segura de Arquivos Estáticos",
        status: hasData ? "READY" : "EXPERIMENTAL",
        risk: "LOW",
        reason: hasData ? "Estrutura JSON em data/ íntegra para injeção transacional." : "Pasta data/ não localizada."
      };
      if (preferred === "ocr") preferred = "static_patch";
    } else if (eng === "electron") {
      const hasAsar = fs.existsSync(path.join(targetDir, "resources", "app.asar")) || fs.existsSync(path.join(targetDir, "app.asar"));
      strategies.static_patch = {
        name: "Patch Estático via ASAR",
        status: hasAsar ? "AVAILABLE" : "BLOCKED",
        risk: "MEDIUM",
        reason: hasAsar ? "Arquivo app.asar presente para repack." : "app.asar não encontrado."
      };
    } else {
      strategies.static_patch = {
        name: "Modificação Segura de Arquivos Estáticos",
        status: "UNSUPPORTED",
        risk: "HIGH",
        reason: "Modificação direta de arquivos não recomendada para esta engine."
      };
    }

    // 3. Avaliação: Runtime Hook (Unity Mono / BepInEx / XUnity)
    if (eng === "unity") {
      const isIl2cpp = fs.existsSync(path.join(targetDir, "GameAssembly.dll"));
      const hasBepInEx = fs.existsSync(path.join(targetDir, "BepInEx", "core")) || fs.existsSync(path.join(targetDir, "winhttp.dll"));

      if (isIl2cpp) {
        strategies.runtime_hook = {
          name: "Runtime Hook (BepInEx / XUnity)",
          status: "BLOCKED",
          risk: "HIGH",
          reason: "Unity IL2CPP compilado nativamente. Hooks gerenciados não suportados sem injeção C++ avançada."
        };
      } else if (hasBepInEx) {
        strategies.runtime_hook = {
          name: "Runtime Hook (BepInEx / XUnity)",
          status: "READY",
          risk: "LOW",
          reason: "Binários do BepInEx detectados e prontos para carregamento."
        };
        preferred = "runtime_hook";
      } else {
        strategies.runtime_hook = {
          name: "Runtime Hook (BepInEx / XUnity)",
          status: "BLOCKED",
          risk: "HIGH",
          reason: "Pacote BepInEx não instalado na pasta do jogo. Hook bloqueado para prevenir crash."
        };
      }
    } else {
      strategies.runtime_hook = {
        name: "Runtime Hook",
        status: "UNSUPPORTED",
        risk: "HIGH",
        reason: "Engine não suporta hook Unity."
      };
    }

    // 4. Avaliação: DOM Observer Bridge (Electron / Web)
    if (eng === "electron") {
      strategies.dom_bridge = {
        name: "Live DOM Observer Bridge",
        status: "READY",
        risk: "LOW",
        reason: "Renderer Chromium detectado; injeção via MutationObserver suportada."
      };
      preferred = "dom_bridge";
    } else {
      strategies.dom_bridge = {
        name: "Live DOM Observer Bridge",
        status: "UNSUPPORTED",
        risk: "HIGH",
        reason: "Aplicação não utiliza renderizador Web/DOM."
      };
    }

    // 5. Avaliação: OCR de Tela em Tempo Real (Fallback Universal)
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
      .filter(([_, s]) => s.status === "BLOCKED")
      .map(([k, s]) => ({ strategy: k, name: s.name, reason: s.reason }));

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
