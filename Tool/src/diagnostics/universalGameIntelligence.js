/**
 * OpenTranslator — UniversalGameIntelligence
 * Camada unificada de inteligência profunda e forense de jogos.
 * Constrói diagnóstico profundo de executáveis, arquitetura, runtime e estratégias.
 */

const fs = require("fs");
const path = require("path");
const EngineDetector = require("../core/engineDetector");
const StrategyPlanner = require("../core/strategyPlanner");
const ExecutableAnalyzer = require("./executableAnalyzer");
const LogIntelligence = require("./logIntelligence");
const ErrorAnalyzer = require("./errorAnalyzer");

class UniversalGameIntelligence {
  static async diagnoseGame(p) { return this.investigate(p); }
  async diagnoseGame(p) { return UniversalGameIntelligence.investigate(p); }
  async investigate(p) { return UniversalGameIntelligence.investigate(p); }
  static async investigate(gamePath) {
    if (!gamePath || !fs.existsSync(gamePath)) {
      return { ok: false, error: "Caminho inexistente" };
    }

    const isDir = fs.statSync(gamePath).isDirectory();
    const targetDir = isDir ? gamePath : path.dirname(gamePath);

    // 1. Detecção da Engine
    const detection = await EngineDetector.detect(gamePath);

    // 2. Análise PE do Executável Principal se houver
    let exeAnalysis = null;
    let mainExe = isDir ? null : gamePath;

    if (!mainExe) {
      const files = fs.readdirSync(targetDir);
      const exeFile = files.find(f => f.toLowerCase().endsWith(".exe") && !f.startsWith("UnityCrash"));
      if (exeFile) mainExe = path.join(targetDir, exeFile);
    }

    if (mainExe && fs.existsSync(mainExe)) {
      exeAnalysis = ExecutableAnalyzer.analyze(mainExe);
    }

    // 3. Planejamento Estratégico de Tradução
    const strategyPlan = StrategyPlanner.plan(detection, gamePath);

    // 4. Mapeamento de Logs Disponíveis
    const availableLogs = LogIntelligence.findGameLogs(targetDir, detection.engine);

    const report = {
      timestamp: new Date().toISOString(),
      gamePath,
      targetDir,
      engine: {
        type: detection.engine,
        version: detection.engineVersion,
        confidence: Math.round(detection.confidence * 100) + "%",
        evidence: detection.evidence,
        warnings: detection.warnings
      },
      executable: exeAnalysis ? {
        path: path.basename(mainExe),
        arch: exeAnalysis.arch,
        subsystem: exeAnalysis.subsystem,
        isDotNet: exeAnalysis.isNet,
        sectionCount: exeAnalysis.numSections
      } : { status: "Executável direto não selecionado" },
      strategies: strategyPlan.strategies,
      recommendedStrategy: strategyPlan.preferred,
      fallbacks: strategyPlan.fallbacks,
      blockedStrategies: strategyPlan.blocked,
      logsDetected: availableLogs
    };

    return { ok: true, report };
  }

  static async generateForensics(gamePath, outputDir) {
    const res = await this.investigate(gamePath);
    if (!res.ok) return res;

    const out = outputDir || (fs.statSync(gamePath).isDirectory() ? gamePath : path.dirname(gamePath));
    const jsonPath = path.join(out, "GAME_FORENSICS.json");
    const mdPath = path.join(out, "GAME_FORENSICS.md");

    fs.writeFileSync(jsonPath, JSON.stringify(res.report, null, 2), "utf8");

    const md = `# GAME FORENSICS REPORT

- **Data:** ${res.report.timestamp}
- **Jogo:** ${path.basename(gamePath)}
- **Engine Identificada:** ${res.report.engine.type} (${res.report.engine.version}) [${res.report.engine.confidence}]
- **Arquitetura:** ${res.report.executable.arch || "N/A"} (${res.report.executable.subsystem || "N/A"})
- **Estratégia Recomendada:** ${res.report.recommendedStrategy}

## Estratégias Avaliadas
${Object.entries(res.report.strategies).map(([k, v]) => `- **${v.name}**: ${v.status} (${v.reason})`).join("\n")}
`;
    fs.writeFileSync(mdPath, md, "utf8");

    return { ok: true, jsonPath, mdPath, report: res.report };
  }
}

module.exports = UniversalGameIntelligence;
