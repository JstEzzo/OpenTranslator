/**
 * OpenTranslator — ErrorAnalyzer & RootCauseAnalyzer
 * Analisa e classifica falhas técnicas em categorias determinísticas,
 * fornecendo código padronizado (OT-XXXX), diagnóstico de causa raiz,
 * ações recomendadas e estratégias de fallback.
 */

const fs = require("fs");
const path = require("path");

class ErrorAnalyzer {
  static getRegistry() {
    try {
      const regPath = path.join(__dirname, "errorRegistry.json");
      if (fs.existsSync(regPath)) {
        return JSON.parse(fs.readFileSync(regPath, "utf8")).signatures || [];
      }
    } catch (e) {}
    return [];
  }

  static analyzeError(err, ctx) { return this.analyze(err, ctx); }
  analyzeError(err, ctx) { return ErrorAnalyzer.analyze(err, ctx); }
  analyze(err, ctx) { return ErrorAnalyzer.analyze(err, ctx); }
  static analyze(rawError, context = {}) {
    let text = "";
    if (typeof rawError === "string") {
      text = rawError;
    } else if (rawError && typeof rawError === "object") {
      text = rawError.stderr || rawError.stdout || rawError.message || rawError.stack || JSON.stringify(rawError);
      if (!context.engine && rawError.engine) context.engine = rawError.engine;
      if (!context.stage && rawError.stage) context.stage = rawError.stage;
    }
    const signatures = this.getRegistry();

    for (const sig of signatures) {
      const reg = new RegExp(sig.pattern, "i");
      if (reg.test(text)) {
        return {
          errorId: sig.id,
          code: sig.id,
          category: sig.category,
          severity: sig.severity,
          stage: context.stage || "unknown",
          engine: context.engine || "generic",
          rootCause: sig.rootCause,
          evidence: [text.slice(0, 300)],
          recommendedActions: sig.recommendedActions,
          fallbackStrategies: sig.fallbackStrategies
        };
      }
    }

    // Classificação heurística genérica caso nenhuma assinatura bata
    let category = "GENERIC";
    let severity = "MEDIUM";
    let fallbacks = ["OCR de Tela"];

    if (/permission|access denied|EACCES/i.test(text)) {
      category = "PERMISSION";
      severity = "HIGH";
    } else if (/syntax|unexpected token|JSON.parse/i.test(text)) {
      category = "SYNTAX";
      severity = "CRITICAL";
    } else if (/network|ETIMEDOUT|ECONNREFUSED|timeout/i.test(text)) {
      category = "NETWORK";
      severity = "MEDIUM";
      fallbacks = ["Cache Local", "Provider Secundário"];
    }

    return {
      errorId: "OT-" + category + "-999",
      code: "OT-" + category + "-999",
      category,
      severity,
      stage: context.stage || "unknown",
      engine: context.engine || "generic",
      rootCause: text.slice(0, 200) || "Falha não categorizada.",
      evidence: [text.slice(0, 300)],
      recommendedActions: ["Verificar logs detalhados em data/openT.log", "Executar SelfTest do sistema"],
      fallbackStrategies: fallbacks
    };
  }
}

module.exports = ErrorAnalyzer;
