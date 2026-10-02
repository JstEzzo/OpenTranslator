const BaseMediaExtractor = require("./BaseMediaExtractor");

class GenericMediaExtractor extends BaseMediaExtractor {
  constructor() {
    super("generic");
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const ignoredDirs = new Set(["node_modules", ".git", ".vs", ".venv", "cache"]);
    const loose = this.scanLooseFiles(gameDir, destDir, type, ignoredDirs);
    const label = type === "all" ? "arquivos do jogo" : "itens de mídia";
    const sources = (loose.extractedCount > 0 || loose.duplicatesCount > 0)
      ? ["varredura recursiva de diretórios (" + loose.extractedCount + " novos " + label + (loose.duplicatesCount > 0 ? ", " + loose.duplicatesCount + " já existentes" : "") + ")"]
      : [];

    if (loose.extractedCount === 0 && loose.duplicatesCount === 0) {
      return {
        ok: false,
        count: 0,
        error: "Nenhum arquivo suportado foi encontrado no diretório do jogo.",
        engine: "generic",
        found: loose.totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: loose.ignoredCount,
        errors: loose.errors.length,
        errorList: loose.errors,
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: "generic",
      found: loose.totalFound,
      extracted: loose.extractedCount,
      duplicates: loose.duplicatesCount || 0,
      collisions: loose.collisionsCount || 0,
      physicalWritten: loose.extractedCount,
      ignored: loose.ignoredCount,
      errors: loose.errors.length,
      errorList: loose.errors,
      originDir: gameDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = GenericMediaExtractor;
