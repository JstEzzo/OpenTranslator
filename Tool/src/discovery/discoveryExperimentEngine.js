class DiscoveryExperimentEngine {
  constructor() {
    this.history = [];
    this.failureBudget = {
      maxAttemptsPerStrategy: 3,
      currentAttempts: new Map()
    };
  }

  /**
   * Run a low-risk non-destructive strategy experiment in sandbox mode.
   */
  async runSafeExperiment(strategyId, testPayload = {}, options = {}) {
    const attempts = this.failureBudget.currentAttempts.get(strategyId) || 0;
    if (attempts >= this.failureBudget.maxAttemptsPerStrategy) {
      return {
        ok: false,
        exhausted: true,
        reason: `Failure budget exhausted for strategy ${strategyId} (${attempts} attempts)`
      };
    }

    const experiment = {
      id: `exp_${strategyId}_${Date.now()}`,
      strategyId,
      timestamp: new Date().toISOString(),
      mode: 'SANDBOX_NON_DESTRUCTIVE',
      cost: options.cost || 'LOW',
      risk: options.risk || 'NONE',
      result: 'PENDING'
    };

    try {
      // Execute mock non-destructive experiment
      if (strategyId === 'DOM_RUNTIME_MOCK') {
        experiment.result = 'SUCCESS';
        experiment.infoGain = 0.85;
      } else if (strategyId === 'OCR_PROBE') {
        experiment.result = 'SUCCESS';
        experiment.infoGain = 0.90;
      } else if (strategyId === 'STATIC_PARSE_PROBE') {
        experiment.result = testPayload.valid !== false ? 'SUCCESS' : 'FAILURE';
        experiment.infoGain = testPayload.valid !== false ? 0.95 : 0.20;
      } else {
        experiment.result = 'SUCCESS';
        experiment.infoGain = 0.70;
      }

      if (experiment.result === 'FAILURE') {
        this.failureBudget.currentAttempts.set(strategyId, attempts + 1);
      }
    } catch (err) {
      experiment.result = 'ERROR';
      experiment.error = err.message;
      this.failureBudget.currentAttempts.set(strategyId, attempts + 1);
    }

    this.history.push(experiment);
    return { ok: experiment.result === 'SUCCESS', experiment };
  }

  getHistory() {
    return this.history;
  }
}

module.exports = DiscoveryExperimentEngine;
