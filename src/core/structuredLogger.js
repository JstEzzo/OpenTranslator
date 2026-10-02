/**
 * OpenTranslator — StructuredLogger
 * Sistema de logging estruturado em formato JSON Lines (.jsonl).
 * Distingue eventos:
 * - benchmark.synthetic
 * - benchmark.real
 * - translation.live
 * - translation.cached
 * - translation.retry
 * - translation.rate_limit
 * Níveis: NORMAL, DEBUG, TRACE.
 * Preserva privacidade por padrão (logFullText: false).
 */

const fs = require('fs');
const path = require('path');

class StructuredLogger {
  constructor(options = {}) {
    this.level = options.level || "NORMAL"; // NORMAL, DEBUG, TRACE
    this.logFullText = options.logFullText || false;
    this.logDir = options.logDir || path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'Tool', 'data', 'logs');
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    this.currentLogFile = path.join(this.logDir, `opentranslator_${new Date().toISOString().slice(0, 10)}.log.jsonl`);
  }

  logStructured(eventType, entry = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      eventType: eventType || 'general',
      level: entry.level || 'INFO',
      traceId: entry.traceId || null,
      jobId: entry.jobId || null,
      gameId: entry.gameId || null,
      engine: entry.engine || null,
      stage: entry.stage || eventType,
      provider: entry.provider || null,
      model: entry.model || null,
      worker: entry.worker !== undefined ? entry.worker : null,
      batch: entry.batch !== undefined ? entry.batch : null,
      batchSize: entry.batchSize || null,
      characters: entry.characters || null,
      status: entry.status || 200,
      durationMs: entry.durationMs || entry.latencyMs || null,
      concurrency: entry.concurrency || null,
      retry: entry.retry || false,
      retryAfter: entry.retryAfter || null,
      cacheHit: entry.cacheHit || false,
      throughputTextsSec: entry.throughputTextsSec || null,
      throughputCharsSec: entry.throughputCharsSec || null,
      message: entry.message || null
    };

    if (this.logFullText && entry.sampleText) {
      payload.sampleText = entry.sampleText;
    }

    try {
      fs.appendFileSync(this.currentLogFile, JSON.stringify(payload) + "\n", 'utf8');
    } catch (e) {}
  }

  log(level, entry = {}) {
    this.logStructured(entry.stage || 'general', { ...entry, level });
  }

  info(msg, entry = {}) {
    this.logStructured('info', { ...entry, level: 'NORMAL', message: msg });
  }

  debug(msg, entry = {}) {
    this.logStructured('debug', { ...entry, level: 'DEBUG', message: msg });
  }

  trace(msg, entry = {}) {
    this.logStructured('trace', { ...entry, level: 'TRACE', message: msg });
  }

  error(msg, entry = {}) {
    this.logStructured('error', { ...entry, level: 'NORMAL', message: msg, status: entry.status || 500 });
  }

  logHttpBenchmarkStage(data = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      eventType: 'benchmark.real.stage',
      provider: data.provider || 'GoogleGTX',
      endpoint: data.endpoint || 'https://translate.googleapis.com/translate_a/single',
      dataset: data.dataset || 'standard_dataset',
      workers: data.workers || 1,
      batchSize: data.batchSize || 10,
      requestCount: data.requestCount || 0,
      textCount: data.textCount || 0,
      charCount: data.charCount || 0,
      durationMs: data.durationMs || 0,
      textsPerSecond: data.textsPerSecond || 0,
      charsPerSecond: data.charsPerSecond || 0,
      p50: data.p50 || 0,
      p95: data.p95 || 0,
      p99: data.p99 || 0,
      status2xx: data.status2xx || 0,
      status3xx: data.status3xx || 0,
      status429: data.status429 || 0,
      status4xx: data.status4xx || 0,
      status5xx: data.status5xx || 0,
      timeouts: data.timeouts || 0,
      retries: data.retries || 0,
      retryAfterObserved: data.retryAfterObserved || null,
      cacheHits: data.cacheHits || 0,
      cacheMisses: data.cacheMisses || 0,
      traceId: data.traceId || `bench_${Date.now()}`
    };

    try {
      fs.appendFileSync(this.currentLogFile, JSON.stringify(payload) + "\n", 'utf8');
    } catch (e) {}
  }
}

const defaultStructuredLogger = new StructuredLogger();
defaultStructuredLogger.logStructured = defaultStructuredLogger.logStructured.bind(defaultStructuredLogger);
StructuredLogger.logStructured = (eventType, entry) => defaultStructuredLogger.logStructured(eventType, entry);
StructuredLogger.logHttpBenchmarkStage = (data) => defaultStructuredLogger.logHttpBenchmarkStage(data);

module.exports = defaultStructuredLogger;
module.exports.StructuredLogger = StructuredLogger;
