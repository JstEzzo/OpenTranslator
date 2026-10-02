const fs = require("fs");
const path = require("path");
const BaseMediaExtractor = require("./BaseMediaExtractor");

class RPGMakerMediaExtractor extends BaseMediaExtractor {
  constructor(engineVariant = "mz") {
    super(engineVariant);
  }

  loadEncryptionKey(gameDir) {
    const candidateDirs = [
      path.join(gameDir, "www", "data"),
      path.join(gameDir, "data")
    ];
    for (const dir of candidateDirs) {
      const sysPath = path.join(dir, "System.json");
      if (fs.existsSync(sysPath)) {
        try {
          const content = fs.readFileSync(sysPath, "utf-8");
          const json = JSON.parse(content);
          if (json.hasEncryptedImages || json.hasEncryptedAudio) {
            const keyHex = json.encryptionKey;
            if (keyHex && keyHex.length === 32) {
              return Buffer.from(keyHex, "hex");
            }
          }
        } catch (e) {}
      }
    }
    return null;
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const keyBytes = this.loadEncryptionKey(gameDir);
    const isAll = type === "all";
    const isAudio = type === "audio";
    const targetLabel = isAll ? "arquivos" : (isAudio ? "áudios" : "imagens");

    const candidateDirs = [];
    if (isAll) {
      candidateDirs.push({ path: gameDir, source: "estrutura completa do jogo RPG Maker" });
    } else {
      const directMedia = path.join(gameDir, isAudio ? "audio" : "img");
      const wwwMedia = path.join(gameDir, "www", isAudio ? "audio" : "img");
      const wwwDir = path.join(gameDir, "www");

      if (fs.existsSync(directMedia)) {
        candidateDirs.push({ path: directMedia, source: `diretório ${isAudio ? "audio" : "img"}/` });
      }
      if (fs.existsSync(wwwMedia)) {
        candidateDirs.push({ path: wwwMedia, source: `diretório www/${isAudio ? "audio" : "img"}/` });
      }
      if (candidateDirs.length === 0) {
        if (fs.existsSync(wwwDir)) {
          candidateDirs.push({ path: wwwDir, source: "diretório www/" });
        } else {
          candidateDirs.push({ path: gameDir, source: "diretório raiz do jogo" });
        }
      }
    }

    let totalFound = 0;
    let extractedCount = 0;
    let duplicatesCount = 0;
    let collisionsCount = 0;
    let ignoredCount = 0;
    const errors = [];
    const sources = [];

    for (const cand of candidateDirs) {
      let localExtracted = 0;
      let localDuplicates = 0;
      const processDir = (currentDir, currentDestDir) => {
        if (!fs.existsSync(currentDir)) return;
        try {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativeDest = path.join(currentDestDir, entry.name);

            if (entry.isDirectory()) {
              if (["node_modules", ".git", "save", "saves"].includes(entry.name.toLowerCase())) continue;
              processDir(fullPath, relativeDest);
            } else if (entry.isFile()) {
              totalFound++;
              const ext = path.extname(entry.name).toLowerCase();
              const isEncImg = ext === ".rpgmvp" || ext === ".png_";
              const isEncAudioOgg = ext === ".rpgmvo" || ext === ".ogg_";
              const isEncAudioM4a = ext === ".rpgmvm" || ext === ".m4a_";

              const shouldDecrypt = isAll
                ? (isEncImg || isEncAudioOgg || isEncAudioM4a)
                : (isAudio ? (isEncAudioOgg || isEncAudioM4a) : isEncImg);

              if (shouldDecrypt) {
                try {
                  const encryptedData = fs.readFileSync(fullPath);
                  if (encryptedData.length > 32 && keyBytes) {
                    const decryptedData = Buffer.alloc(encryptedData.length - 16);
                    for (let i = 0; i < 16; i++) {
                      decryptedData[i] = encryptedData[16 + i] ^ keyBytes[i];
                    }
                    encryptedData.copy(decryptedData, 16, 32);

                    let destName = path.basename(entry.name, ext);
                    if (isEncImg) destName += ".png";
                    else if (isEncAudioOgg) destName += ".ogg";
                    else if (isEncAudioM4a) destName += ".m4a";

                    const outPath = path.join(path.dirname(relativeDest), destName);
                    if (fs.existsSync(outPath)) {
                      collisionsCount++;
                      const existing = fs.readFileSync(outPath);
                      if (existing.equals(decryptedData)) {
                        duplicatesCount++;
                        localDuplicates++;
                        continue;
                      } else {
                        const base = outPath.slice(0, outPath.length - path.extname(outPath).length);
                        const altPath = `${base}.rpgm${path.extname(outPath)}`;
                        if (fs.existsSync(altPath)) {
                          const existingAlt = fs.readFileSync(altPath);
                          if (existingAlt.equals(decryptedData)) {
                            duplicatesCount++;
                            localDuplicates++;
                            continue;
                          }
                        }
                        fs.mkdirSync(path.dirname(altPath), { recursive: true });
                        fs.writeFileSync(altPath, decryptedData);
                        extractedCount++;
                        localExtracted++;
                        continue;
                      }
                    }

                    fs.mkdirSync(path.dirname(outPath), { recursive: true });
                    fs.writeFileSync(outPath, decryptedData);
                    extractedCount++;
                    localExtracted++;
                  } else {
                    errors.push("Chave de criptografia ausente para " + entry.name);
                  }
                } catch (ex) {
                  errors.push("Falha ao descriptografar " + entry.name + ": " + ex.message);
                }
              } else if (this.isMatchingAsset(entry.name, type)) {
                const copyRes = this.copyFileSafe(fullPath, relativeDest);
                if (copyRes.written) {
                  extractedCount++;
                  localExtracted++;
                }
                if (copyRes.duplicate) {
                  duplicatesCount++;
                  localDuplicates++;
                }
                if (copyRes.collision) {
                  collisionsCount++;
                }
                if (copyRes.error) {
                  errors.push("Falha ao copiar " + entry.name + ": " + copyRes.error);
                }
              } else {
                ignoredCount++;
              }
            }
          }
        } catch (ex) {
          errors.push("Erro ao ler " + currentDir + ": " + ex.message);
        }
      };

      processDir(cand.path, destDir);
      if (localExtracted > 0 || localDuplicates > 0) {
        let detail = `${localExtracted} ${targetLabel} novos`;
        if (localDuplicates > 0) {
          detail += `, ${localDuplicates} já existentes`;
        }
        sources.push(cand.source + " (" + detail + ")");
      }
    }

    if (extractedCount === 0 && duplicatesCount === 0) {
      return {
        ok: false,
        count: 0,
        error: "Nenhum recurso suportado foi encontrado no jogo RPG Maker.",
        engine: this.engineName,
        found: totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: ignoredCount,
        errors: errors.length,
        errorList: errors,
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: this.engineName,
      found: totalFound,
      extracted: extractedCount,
      duplicates: duplicatesCount,
      collisions: collisionsCount,
      physicalWritten: extractedCount,
      ignored: ignoredCount,
      errors: errors.length,
      errorList: errors,
      originDir: gameDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = RPGMakerMediaExtractor;
