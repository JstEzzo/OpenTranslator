const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const BaseMediaExtractor = require("./BaseMediaExtractor");

class UnrealMediaExtractor extends BaseMediaExtractor {
  constructor() {
    super("unreal");
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const ignoredDirs = new Set(["binaries", "engine", ".git", ".vs"]);
    
    // 1. Scan loose files (Movies, Splash, Config, Localization locres)
    const loose = this.scanLooseFiles(gameDir, destDir, type, ignoredDirs);
    let totalFound = loose.totalFound;
    let extractedCount = loose.extractedCount;
    let duplicatesCount = loose.duplicatesCount || 0;
    let collisionsCount = loose.collisionsCount || 0;
    let ignoredCount = loose.ignoredCount;
    let allErrors = [...loose.errors];
    const sources = [];

    if (loose.extractedCount > 0 || loose.duplicatesCount > 0) {
      const label = type === "all" ? "recursos e arquivos soltos Unreal Engine" : "mídia solta Unreal Engine";
      sources.push(`${label} (${loose.extractedCount} novos${loose.duplicatesCount > 0 ? `, ${loose.duplicatesCount} já existentes` : ""})`);
    }

    // 2. Check for Unreal containers (.utoc / .ucas or legacy .pak)
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    const retocExe = [
      path.resolve(__dirname, "../../resources/unreal/retoc.exe"),
      path.resolve(__dirname, "../../../resources/unreal/retoc.exe"),
      path.join(root, "resources", "unreal", "retoc.exe")
    ].find(p => fs.existsSync(p));

    const utocFiles = [];
    const pakFiles = [];

    const findContainers = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (!ignoredDirs.has(item.name.toLowerCase())) findContainers(full);
        } else if (item.isFile()) {
          const low = item.name.toLowerCase();
          if (low.endsWith(".utoc")) utocFiles.push(full);
          else if (low.endsWith(".pak") && !low.includes("locales") && !low.startsWith("nw_")) pakFiles.push(full);
        }
      }
    };
    findContainers(gameDir);

    // 3. Process IoStore Zen containers (.utoc) with retoc if present
    if (utocFiles.length > 0 && retocExe) {
      for (const utoc of utocFiles) {
        try {
          const outZenDir = path.join(destDir, "Unreal_Zen", path.basename(utoc, ".utoc"));
          fs.mkdirSync(outZenDir, { recursive: true });
          const res = spawnSync(retocExe, ["unpack", utoc, outZenDir], {
            cwd: path.dirname(utoc),
            encoding: "utf-8",
            timeout: 120000
          });
          if (res.status === 0) {
            sources.push(`descompactação IoStore Zen via retoc: ${path.basename(utoc)}`);
          } else {
            allErrors.push(`Falha no retoc ao descompactar ${path.basename(utoc)}: ${(res.stderr || "").slice(0, 200)}`);
          }
        } catch (e) {
          allErrors.push(`Exceção no retoc para ${path.basename(utoc)}: ${e.message}`);
        }
      }
    }

    // 4. Report real limitation on legacy .pak archives
    if (pakFiles.length > 0) {
      sources.push(`Limitação: Recursos Unreal empacotados detectados (${pakFiles.length} pacote(s) .pak). Descompactação de pacotes monolíticos UE requer chave AES ou extrator dedicado (u4pak/UnrealPak). Apenas recursos soltos foram espelhados.`);
    }

    if (extractedCount === 0 && duplicatesCount === 0) {
      const pakMsg = pakFiles.length > 0 
        ? "Recursos Unreal empacotados (.pak) detectados, mas requerem chave AES / extrator dedicado."
        : "Nenhum arquivo de mídia ou recurso suportado encontrado para Unreal Engine.";
      return {
        ok: false,
        count: 0,
        error: pakMsg,
        engine: "unreal",
        found: totalFound + pakFiles.length,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: ignoredCount,
        errors: allErrors.length,
        errorList: allErrors,
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: "unreal",
      found: totalFound + pakFiles.length,
      extracted: extractedCount,
      duplicates: duplicatesCount,
      collisions: collisionsCount,
      physicalWritten: extractedCount,
      ignored: ignoredCount,
      errors: allErrors.length,
      errorList: allErrors,
      originDir: gameDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = UnrealMediaExtractor;
