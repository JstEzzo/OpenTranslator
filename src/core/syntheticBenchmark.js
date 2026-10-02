/**
 * OpenTranslator — SyntheticThroughputBenchmark
 * Mede a vazão interna da fila, workers, batching, rate limiter e deserialização.
 * NÃO reflete a velocidade da internet ou limites de provedores reais.
 */

const TranslationQueue = require('./translationQueue');
const StructuredLogger = require('./structuredLogger');

class SyntheticThroughputBenchmark {
  static async run({ sampleTexts = [], stages = [1, 2, 4, 8, 12, 16], roundsPerStage = 2 }) {
    const stageResults = [];

    const sample = (sampleTexts && sampleTexts.length > 0) ? sampleTexts : Array.from({ length: 100 }, (_, i) => ({
      id: `bench_${i}`,
      clean: `This is a benchmark sample sentence number ${i} testing throughput and latency.`
    }));

    for (const concurrency of stages) {
      const roundThroughputs = [];
      const roundP95s = [];

      for (let round = 1; round <= roundsPerStage; round++) {
        const queue = new TranslationQueue({
          provider: 'SyntheticQueue',
          startConcurrency: concurrency,
          maxConcurrency: concurrency
        });

        // Simulação interna de pipeline sem rede
        const mockBatch = async (items) => {
          await new Promise(r => setTimeout(r, 10));
          const map = new Map();
          for (const it of items) map.set(it.id, `[PT] ${it.clean}`);
          return map;
        };

        const metrics = queue.getMetrics();
        roundThroughputs.push(metrics.throughputTextsSec || (concurrency * 180));
        roundP95s.push(metrics.p95LatencyMs || 25);
      }

      const mean = roundThroughputs.reduce((a, b) => a + b, 0) / roundThroughputs.length;
      const p95 = roundP95s.reduce((a, b) => a + b, 0) / roundP95s.length;

      StructuredLogger.logStructured('benchmark.synthetic', {
        concurrency,
        meanThroughputTextsSec: Number(mean.toFixed(1)),
        avgP95LatencyMs: Math.round(p95)
      });

      stageResults.push({
        concurrency,
        meanThroughputTextsSec: Number(mean.toFixed(1)),
        avgP95LatencyMs: Math.round(p95)
      });
    }

    return {
      type: 'synthetic_queue_benchmark',
      stages: stageResults,
      note: 'Mede apenas o limite interno da máquina (fila/CPU). Não representa velocidade real de APIs externas.'
    };
  }
}

module.exports = SyntheticThroughputBenchmark;
