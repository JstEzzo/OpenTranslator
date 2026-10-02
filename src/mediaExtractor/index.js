const fs = require("fs");
const path = require("path");
const engineDetector = require("../core/engineDetector");

const RenPyMediaExtractor = require("./RenPyMediaExtractor");
const RPGMakerMediaExtractor = require("./RPGMakerMediaExtractor");
const UnityMediaExtractor = require("./UnityMediaExtractor");
const WolfRPGMediaExtractor = require("./WolfRPGMediaExtractor");
const UnrealMediaExtractor = require("./UnrealMediaExtractor");
const GenericMediaExtractor = require("./GenericMediaExtractor");

class ImageExtractorFactory {
  static getExtractor(engineName) {
    const eng = (engineName || "").toLowerCase().trim();
    switch (eng) {
      case "renpy":
        return new RenPyMediaExtractor();
      case "mv":
      case "mz":
      case "rpgmaker":
      case "rgss":
        return new RPGMakerMediaExtractor(eng);
      case "unity":
        return new UnityMediaExtractor();
      case "wolf":
        return new WolfRPGMediaExtractor();
      case "unreal":
        return new UnrealMediaExtractor();
      default:
        return new GenericMediaExtractor();
    }
  }

  static async extractMedia({ gameDir, destDir, type = "img", explicitEngine = null }) {
    if (!gameDir || !fs.existsSync(gameDir)) {
      return { ok: false, error: "Diretório do jogo não encontrado: " + gameDir };
    }
    if (!destDir) {
      return { ok: false, error: "Diretório de destino não especificado." };
    }

    // 1. Detect engine if not provided
    let engine = explicitEngine;
    if (!engine) {
      try {
        const detection = await engineDetector.detect(gameDir);
        engine = detection && detection.engine ? detection.engine : "generic";
      } catch (e) {
        engine = "generic";
      }
    }

    // 2. Select extractor
    const extractor = ImageExtractorFactory.getExtractor(engine);

    if (global.log) {
      global.log("info", `[MediaExtractor] Iniciando extração de ${type === "audio" ? "áudios" : "imagens"} para engine [${engine}] em: ${destDir}`);
    }

    // 3. Execute extraction
    try {
      fs.mkdirSync(destDir, { recursive: true });
      const result = await extractor.extract({ gameDir, destDir, type });
      if (global.log) {
        if (result.ok) {
          global.log("success", `[MediaExtractor] Concluído com sucesso: ${result.extracted} novos (${result.duplicates || 0} já existentes) em ${destDir}`);
        } else {
          global.log("warn", `[MediaExtractor] Falha ou nada encontrado: ${result.error}`);
        }
      }
      return result;
    } catch (err) {
      if (global.log) {
        global.log("error", `[MediaExtractor] Erro inesperado: ${err.message}`);
      }
      return {
        ok: false,
        error: "Erro na extração de mídia: " + err.message,
        engine,
        found: 0,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        destDir
      };
    }
  }
}

module.exports = {
  ImageExtractorFactory,
  extractMedia: ImageExtractorFactory.extractMedia,
  getExtractor: ImageExtractorFactory.getExtractor
};
