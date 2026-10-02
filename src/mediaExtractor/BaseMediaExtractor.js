const fs = require("fs");
const path = require("path");

class BaseMediaExtractor {
  constructor(engineName) {
    this.engineName = engineName || "generic";
    this.imageExtensions = new Set([
      ".png", ".jpg", ".jpeg", ".webp", ".gif",
      ".bmp", ".tga", ".ico", ".svg", ".tiff"
    ]);
    this.audioExtensions = new Set([
      ".ogg", ".mp3", ".wav", ".m4a", ".flac",
      ".aac", ".opus", ".mid", ".midi"
    ]);
  }

  isMatchingAsset(filename, mediaType = "img") {
    if (mediaType === "all") return true;
    const ext = path.extname(filename).toLowerCase();
    return mediaType === "audio"
      ? this.audioExtensions.has(ext)
      : this.imageExtensions.has(ext);
  }

  copyFileSafe(srcPath, destPath) {
    try {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(destPath)) {
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        if (srcStat.size === destStat.size) {
          const srcBuf = fs.readFileSync(srcPath);
          const destBuf = fs.readFileSync(destPath);
          if (srcBuf.equals(destBuf)) {
            return { written: false, duplicate: true, collision: true };
          }
        }
        // Different content: preserve without silent overwrite
        const ext = path.extname(destPath);
        const base = destPath.slice(0, destPath.length - ext.length);
        const altDest = `${base}.loose${ext}`;
        if (fs.existsSync(altDest)) {
          const altStat = fs.statSync(altDest);
          if (altStat.size === srcStat.size) {
            const altBuf = fs.readFileSync(altDest);
            const srcBuf = fs.readFileSync(srcPath);
            if (altBuf.equals(srcBuf)) {
              return { written: false, duplicate: true, collision: true };
            }
          }
        }
        fs.copyFileSync(srcPath, altDest);
        return { written: true, duplicate: false, collision: true, altDest };
      }

      fs.copyFileSync(srcPath, destPath);
      return { written: true, duplicate: false, collision: false };
    } catch (e) {
      return { written: false, duplicate: false, collision: false, error: e.message };
    }
  }

  scanLooseFiles(rootDir, destDir, mediaType = "img", ignoredDirNames = new Set()) {
    let totalFound = 0;
    let extractedCount = 0;
    let duplicatesCount = 0;
    let collisionsCount = 0;
    let ignoredCount = 0;
    const errors = [];

    const traverse = (currentDir, currentDestDir) => {
      if (!fs.existsSync(currentDir)) return;
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const name = entry.name;
          const fullSrc = path.join(currentDir, name);
          const fullDest = path.join(currentDestDir, name);

          if (entry.isDirectory()) {
            if (ignoredDirNames.has(name.toLowerCase())) continue;
            traverse(fullSrc, fullDest);
          } else if (entry.isFile()) {
            totalFound++;
            if (this.isMatchingAsset(name, mediaType)) {
              const res = this.copyFileSafe(fullSrc, fullDest);
              if (res.written) {
                extractedCount++;
              }
              if (res.duplicate) {
                duplicatesCount++;
              }
              if (res.collision) {
                collisionsCount++;
              }
              if (res.error) {
                errors.push("Falha ao copiar " + name + ": " + res.error);
              }
            } else {
              ignoredCount++;
            }
          }
        }
      } catch (err) {
        errors.push("Erro ao ler diretório " + currentDir + ": " + err.message);
      }
    };

    traverse(rootDir, destDir);
    return {
      totalFound,
      extractedCount,
      duplicatesCount,
      collisionsCount,
      physicalWritten: extractedCount,
      ignoredCount,
      errors
    };
  }

  formatResult({
    ok,
    engine,
    found,
    extracted,
    duplicates,
    collisions,
    physicalWritten,
    ignored,
    errors,
    errorList,
    originDir,
    destDir,
    sources
  }) {
    const extractedNum = extracted || 0;
    const duplicatesNum = duplicates || 0;
    return {
      ok: Boolean(ok && (extractedNum > 0 || duplicatesNum > 0)),
      count: extractedNum,
      engine: engine || this.engineName,
      found: found || 0,
      extracted: extractedNum,
      duplicates: duplicatesNum,
      collisions: collisions || 0,
      physicalWritten: physicalWritten !== undefined ? physicalWritten : extractedNum,
      ignored: ignored || 0,
      errors: errors || 0,
      errorList: errorList || [],
      originDir: originDir || "",
      destDir: destDir || "",
      sources: sources && sources.length > 0 ? sources : ["Nenhum recurso identificado"]
    };
  }
}

module.exports = BaseMediaExtractor;
