/**
 * OpenTranslator — SpeedBenchmark (Unified Dispatcher)
 * Orquestra tanto o RealProviderBenchmark (HTTP Real) quanto o SyntheticThroughputBenchmark (Fila Interna).
 */

const RealProviderBenchmark = require('./realProviderBenchmark');
const SyntheticThroughputBenchmark = require('./syntheticBenchmark');

class SpeedBenchmark {
  /**
   * Mantém compatibilidade com testes unitários anteriores e permite benchmark sintético.
   */
  static async run(sampleTexts = [], options = {}) {
    if (options.type === 'real' || options.realHttp === true) {
      return RealProviderBenchmark.runFullBenchmark({
        provider: options.provider || 'GoogleGTX',
        sampleTexts,
        stages: options.stages || [1, 2, 4, 8],
        batchSizes: options.batchSizes || [5, 10, 15]
      });
    }
    return SyntheticThroughputBenchmark.run({
      sampleTexts,
      stages: options.stages || [1, 2, 4, 8, 12, 16],
      roundsPerStage: options.roundsPerStage || 2
    });
  }

  static async runReal(options = {}) {
    return RealProviderBenchmark.runFullBenchmark(options);
  }

  static async runSynthetic(options = {}) {
    return SyntheticThroughputBenchmark.run(options);
  }
}

module.exports = SpeedBenchmark;
