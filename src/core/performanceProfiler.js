/**
 * OpenTranslator — PerformanceProfiler
 * Diagnóstico de gargalos e medição detalhada de tempo por etapa do pipeline.
 * Mapeia Extraction, Deduplication, Translation (Network vs Queue vs Provider), QA, Application, Launch.
 */

class PerformanceProfiler {
  constructor(gameName = "Game", engine = "generic") {
    this.gameName = gameName;
    this.engine = engine;
    this.stages = {};
    this.startTime = Date.now();
  }

  startStage(stageName) {
    this.stages[stageName] = {
      start: Date.now(),
      durationMs: 0
    };
  }

  endStage(stageName) {
    if (this.stages[stageName]) {
      this.stages[stageName].durationMs = Date.now() - this.stages[stageName].start;
    }
  }

  getReport() {
    const totalMs = Date.now() - this.startTime;
    const stageDetails = {};
    for (const [name, st] of Object.entries(this.stages)) {
      const dur = st.durationMs || (Date.now() - st.start);
      stageDetails[name] = {
        durationSeconds: (dur / 1000).toFixed(2),
        percentage: totalMs > 0 ? ((dur / totalMs) * 100).toFixed(1) + "%" : "0%"
      };
    }

    return {
      game: this.gameName,
      engine: this.engine,
      totalDurationSeconds: (totalMs / 1000).toFixed(2),
      stages: stageDetails
    };
  }
}

module.exports = PerformanceProfiler;
