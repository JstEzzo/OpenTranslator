const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const BaseMediaExtractor = require("./BaseMediaExtractor");

class RenPyMediaExtractor extends BaseMediaExtractor {
  constructor() {
    super("renpy");
  }

  getPythonExecutable() {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    const embeddedPy = path.join(root, "resources", "renpy", "python", "python.exe");
    if (fs.existsSync(embeddedPy)) return embeddedPy;
    return "python";
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const gameSubDir = fs.existsSync(path.join(gameDir, "game"))
      ? path.join(gameDir, "game")
      : gameDir;

    const sources = [];
    const ignoredDirs = new Set(["renpy", "lib", "saves", "cache", "tl", ".git", ".venv"]);

    // 1. Scan for loose files in game/ and all subfolders
    const loose = this.scanLooseFiles(gameSubDir, destDir, type, ignoredDirs);
    let totalFound = loose.totalFound;
    let extractedCount = loose.extractedCount;
    let duplicatesCount = loose.duplicatesCount || 0;
    let collisionsCount = loose.collisionsCount || 0;
    let ignoredCount = loose.ignoredCount;
    let allErrors = [...loose.errors];

    if (loose.extractedCount > 0 || loose.duplicatesCount > 0) {
      const label = type === "all" ? "arquivos soltos" : (type === "audio" ? "áudios soltos" : "imagens soltas");
      let detail = `${loose.extractedCount} ${label} novos`;
      if (loose.duplicatesCount > 0) {
        detail += `, ${loose.duplicatesCount} já existentes`;
      }
      sources.push("diretórios e subdiretórios (" + detail + ")");
    }

    // 2. Scan for RPA archives
    const rpaHelperPath = path.join(__dirname, "extract_rpa_helper.py");
    if (fs.existsSync(rpaHelperPath)) {
      try {
        const pythonExe = this.getPythonExecutable();
        const args = [
          rpaHelperPath,
          "--game", gameDir,
          "--dest", destDir,
          "--type", type
        ];
        const res = spawnSync(pythonExe, args, {
          cwd: gameDir,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
          timeout: 120000
        });

        if (res.status === 0 && res.stdout) {
          try {
            const rpaData = JSON.parse(res.stdout.trim());
            totalFound += (rpaData.found || 0);
            extractedCount += (rpaData.extracted || 0);
            duplicatesCount += (rpaData.duplicates || 0);
            collisionsCount += (rpaData.collisions || 0);
            ignoredCount += (rpaData.ignored || 0);
            if (rpaData.sources && rpaData.sources.length > 0) {
              sources.push(...rpaData.sources);
            }
            if (rpaData.errorList && rpaData.errorList.length > 0) {
              allErrors.push(...rpaData.errorList);
            }
          } catch (pe) {
            allErrors.push("Erro ao interpretar saída do helper RPA: " + pe.message);
          }
        } else if (res.stderr) {
          allErrors.push("Erro na execução do helper RPA: " + res.stderr.slice(0, 300));
        }
      } catch (ex) {
        allErrors.push("Exceção ao disparar extração de pacotes RPA: " + ex.message);
      }
    }

    // 3. If type === "all", decompile .rpyc scripts to .rpy using unrpyc
    if (type === "all") {
      const unrpycScript = [
        path.resolve(__dirname, "../../resources/renpy/unrpyc_v2/unrpyc.py"),
        path.resolve(__dirname, "../../../resources/renpy/unrpyc_v2/unrpyc.py")
      ].find(p => fs.existsSync(p));

      if (unrpycScript) {
        try {
          const pythonExe = this.getPythonExecutable();
          const rpycFiles = [];
          const findRpyc = (dir) => {
            if (!fs.existsSync(dir)) return;
            const list = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of list) {
              const full = path.join(dir, item.name);
              if (item.isDirectory()) findRpyc(full);
              else if (item.isFile() && item.name.toLowerCase().endsWith(".rpyc")) {
                rpycFiles.push(full);
              }
            }
          };
          findRpyc(destDir);

          if (rpycFiles.length > 0) {
            let decompiledCount = 0;
            let existingDecompiled = 0;
            const toDecompile = [];

            for (const rpyc of rpycFiles) {
              const rpyPath = rpyc.slice(0, -1);
              if (fs.existsSync(rpyPath)) {
                existingDecompiled++;
                duplicatesCount++;
                totalFound++;
              } else {
                toDecompile.push(rpyc);
              }
            }

            if (toDecompile.length > 0) {
              for (let i = 0; i < toDecompile.length; i += 40) {
                const batch = toDecompile.slice(i, i + 40);
                spawnSync(pythonExe, [unrpycScript, ...batch], {
                  cwd: destDir,
                  encoding: "utf-8",
                  maxBuffer: 50 * 1024 * 1024,
                  timeout: 120000
                });
              }

              for (const rpyc of toDecompile) {
                const rpyPath = rpyc.slice(0, -1);
                if (fs.existsSync(rpyPath)) {
                  decompiledCount++;
                  extractedCount++;
                  totalFound++;
                }
              }
            }
            if (decompiledCount > 0 || existingDecompiled > 0) {
              sources.push(`descompilação unrpyc (${decompiledCount} scripts novos gerados${existingDecompiled > 0 ? `, ${existingDecompiled} já existentes` : ""})`);
            }
          }
        } catch (ex) {
          allErrors.push("Aviso na descompilação de scripts: " + ex.message);
        }
      }
    }

    if (extractedCount === 0 && duplicatesCount === 0) {
      const mediaLabel = type === "all" ? "conteúdo suportado" : (type === "audio" ? "áudio suportado" : "imagem suportada");
      return {
        ok: false,
        count: 0,
        error: "Nenhum " + mediaLabel + " foi encontrado no jogo Ren'Py.",
        engine: "renpy",
        found: totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: ignoredCount,
        errors: allErrors.length,
        errorList: allErrors,
        originDir: gameSubDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: "renpy",
      found: totalFound,
      extracted: extractedCount,
      duplicates: duplicatesCount,
      collisions: collisionsCount,
      physicalWritten: extractedCount,
      ignored: ignoredCount,
      errors: allErrors.length,
      errorList: allErrors,
      originDir: gameSubDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = RenPyMediaExtractor;
