class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.processedTexts = 0;
    this.latencies = [];
    this.maxLatencySamples = 100;
  }

  recordTranslation(latencyMs) {
    this.processedTexts++;
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  getSnapshot() {
    const elapsedSec = Math.max(1, (Date.now() - this.startTime) / 1000);
    const avgLatency = this.latencies.length > 0 ? (this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length).toFixed(1) : 0;
    const throughput = (this.processedTexts / elapsedSec).toFixed(1);

    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor(elapsedSec),
      processedTexts: this.processedTexts,
      textsPerSecond: Number(throughput),
      averageLatencyMs: Number(avgLatency),
      ramRssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
      ramHeapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(1))
    };
  }
}

module.exports = new PerformanceMonitor();
