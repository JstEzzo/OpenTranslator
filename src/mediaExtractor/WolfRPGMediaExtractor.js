const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const BaseMediaExtractor = require("./BaseMediaExtractor");

class WolfRPGMediaExtractor extends BaseMediaExtractor {
  constructor() {
    super("wolf");
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const ignoredDirs = new Set([".git", ".vs", "save", "saves"]);
    const uberWolfExe = [
      path.resolve(__dirname, "../../resources/UberWolfCli.exe"),
      path.resolve(__dirname, "../../../resources/UberWolfCli.exe")
    ].find(p => fs.existsSync(p));

    const sources = [];
    const allErrors = [];
    let wolfExtractedCount = 0;

    // If type === 'all' and .wolf files exist, unpack with UberWolf if available
    if (type === "all" && uberWolfExe) {
      try {
        const wolfFiles = [];
        const findWolf = (dir) => {
          if (!fs.existsSync(dir)) return;
          for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name);
            if (item.isDirectory()) {
              if (!ignoredDirs.has(item.name.toLowerCase())) findWolf(full);
            } else if (item.isFile() && item.name.toLowerCase().endsWith(".wolf")) {
              wolfFiles.push(full);
            }
          }
        };
        findWolf(gameDir);

        if (wolfFiles.length > 0) {
          for (const wf of wolfFiles) {
            const res = spawnSync(uberWolfExe, ["-o", wf], {
              cwd: gameDir,
              encoding: "utf-8",
              timeout: 60000
            });
            if (res.status === 0) {
              sources.push(`descompactação UberWolf: ${path.basename(wf)}`);
            }
          }
        }
      } catch (e) {
        allErrors.push("Erro ao descompactar arquivos .wolf: " + e.message);
      }
    }

    const loose = this.scanLooseFiles(gameDir, destDir, type, ignoredDirs);
    if (loose.extractedCount > 0 || loose.duplicatesCount > 0) {
      sources.push("diretório Data/ e recursos de Wolf RPG (" + loose.extractedCount + " novos" + (loose.duplicatesCount > 0 ? ", " + loose.duplicatesCount + " já existentes" : "") + ")");
    }

    if (loose.extractedCount === 0 && loose.duplicatesCount === 0) {
      return {
        ok: false,
        count: 0,
        error: "Nenhum recurso de mídia ou arquivo suportado foi encontrado para Wolf RPG.",
        engine: "wolf",
        found: loose.totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: loose.ignoredCount,
        errors: loose.errors.length + allErrors.length,
        errorList: [...loose.errors, ...allErrors],
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: "wolf",
      found: loose.totalFound,
      extracted: loose.extractedCount,
      duplicates: loose.duplicatesCount || 0,
      collisions: loose.collisionsCount || 0,
      physicalWritten: loose.extractedCount,
      ignored: loose.ignoredCount,
      errors: loose.errors.length + allErrors.length,
      errorList: [...loose.errors, ...allErrors],
      originDir: gameDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = WolfRPGMediaExtractor;
