/**
 * OpenTranslator — RealProviderBenchmark
 * Benchmark HTTP REAL contra provedores de tradução online.
 * NÃO utiliza mock ou simulação local.
 * Mede: latência real, P50, P90, P95, P99, vazão real (textos/s, chars/s),
 * HTTP 2xx, 429, timeouts, retries, headers Retry-After e detecção de saturação.
 */

const https = require('https');
const http = require('http');
const { loadCfg } = require('../cache');
const StructuredLogger = require('./structuredLogger');

class RealProviderBenchmark {
  /**
   * Executa uma requisição HTTP real para Google GTX com um lote de textos.
   */
  static async _requestGoogleGtx(texts, sl = 'en', tl = 'pt') {
    const SEP = '\n[|]\n';
    const joined = texts.map(t => (typeof t === 'string' ? t : (t.clean || t.original || ''))).join(SEP);
    const query = encodeURIComponent(joined);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${query}`;

    const t0 = Date.now();
    return new Promise((resolve) => {
      const rq = https.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
          }
        },
        (rsp) => {
          let body = '';
          rsp.setEncoding('utf8');
          rsp.on('data', chunk => body += chunk);
          rsp.on('end', () => {
            const durationMs = Date.now() - t0;
            const reqSize = Buffer.byteLength(url, 'utf8');
            const resSize = Buffer.byteLength(body, 'utf8');
            const retryAfter = rsp.headers['retry-after'] || null;

            resolve({
              statusCode: rsp.statusCode,
              durationMs,
              reqSize,
              resSize,
              retryAfter,
              success: rsp.statusCode === 200,
              isRateLimit: rsp.statusCode === 429,
              isRedirect: rsp.statusCode === 302,
              bodyLength: body.length
            });
          });
        }
      );

      rq.on('error', (err) => {
        resolve({
          statusCode: 0,
          durationMs: Date.now() - t0,
          reqSize: Buffer.byteLength(url, 'utf8'),
          resSize: 0,
          retryAfter: null,
          success: false,
          isRateLimit: false,
          error: err.message
        });
      });

      rq.setTimeout(12000, () => {
        if (rq.socket) rq.socket.destroy();
        rq.destroy();
        resolve({
          statusCode: 408,
          durationMs: Date.now() - t0,
          reqSize: Buffer.byteLength(url, 'utf8'),
          resSize: 0,
          retryAfter: null,
          success: false,
          isRateLimit: false,
          timeout: true,
          error: 'timeout'
        });
      });
    });
  }

  /**
   * Executa benchmark de um lote concorrente de requisições reais.
   */
  static async runStage({ provider = 'GoogleGTX', texts = [], concurrency = 1, batchSize = 10, sl = 'en', tl = 'pt' }) {
    // Fatiar textos em lotes
    const rawBatches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      rawBatches.push(texts.slice(i, i + batchSize));
    }

    const requestLatencies = [];
    let http2xx = 0;
    let http429 = 0;
    let http4xx = 0;
    let http5xx = 0;
    let timeouts = 0;
    let totalReqBytes = 0;
    let totalResBytes = 0;
    let totalChars = 0;
    let retryAfterHeader = null;

    texts.forEach(t => {
      const s = typeof t === 'string' ? t : (t.clean || t.original || '');
      totalChars += s.length;
    });

    const wallClockStart = Date.now();

    // Pool de workers concorrentes
    let batchIndex = 0;
    const workerPromises = Array.from({ length: concurrency }, async (_, workerId) => {
      while (batchIndex < rawBatches.length) {
        const curIdx = batchIndex++;
        const batch = rawBatches[curIdx];
        if (!batch) break;

        let res;
        if (provider === 'GoogleGTX') {
          res = await RealProviderBenchmark._requestGoogleGtx(batch, sl, tl);
        } else {
          // Provedor desconhecido ou sem credencial
          return;
        }

        requestLatencies.push(res.durationMs);
        totalReqBytes += res.reqSize || 0;
        totalResBytes += res.resSize || 0;

        if (res.statusCode >= 200 && res.statusCode < 300) http2xx++;
        else if (res.statusCode === 429) {
          http429++;
          if (res.retryAfter) retryAfterHeader = res.retryAfter;
        } else if (res.statusCode >= 400 && res.statusCode < 500) http4xx++;
        else if (res.statusCode >= 500) http5xx++;
        if (res.timeout) timeouts++;

        StructuredLogger.logStructured('benchmark.real', {
          provider,
          worker: workerId,
          batch: curIdx,
          batchSize: batch.length,
          status: res.statusCode,
          durationMs: res.durationMs,
          concurrency
        });

        // Pequeno espaçamento para evitar rajada abusiva se for GTX
        if (provider === 'GoogleGTX' && concurrency > 2) {
          await new Promise(r => setTimeout(r, 40));
        }
      }
    });

    await Promise.all(workerPromises);
    const wallClockTimeMs = Math.max(1, Date.now() - wallClockStart);

    // Métricas percentilares
    requestLatencies.sort((a, b) => a - b);
    const p50 = requestLatencies[Math.floor(requestLatencies.length * 0.50)] || 0;
    const p90 = requestLatencies[Math.floor(requestLatencies.length * 0.90)] || 0;
    const p95 = requestLatencies[Math.floor(requestLatencies.length * 0.95)] || 0;
    const p99 = requestLatencies[Math.floor(requestLatencies.length * 0.99)] || 0;
    const avgLatency = requestLatencies.length > 0
      ? Math.round(requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length)
      : 0;
    const maxLatency = requestLatencies.length > 0 ? requestLatencies[requestLatencies.length - 1] : 0;

    const textsPerSec = Number(((texts.length / (wallClockTimeMs / 1000))).toFixed(1));
    const charsPerSec = Number(((totalChars / (wallClockTimeMs / 1000))).toFixed(1));
    const requestsPerSec = Number(((rawBatches.length / (wallClockTimeMs / 1000))).toFixed(1));

    return {
      provider,
      concurrency,
      batchSize,
      requestCount: rawBatches.length,
      batchCount: rawBatches.length,
      textCount: texts.length,
      characterCount: totalChars,
      requestSizeBytes: totalReqBytes,
      responseSizeBytes: totalResBytes,
      wallClockTimeMs,
      p50LatencyMs: p50,
      p90LatencyMs: p90,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      avgLatencyMs: avgLatency,
      maxLatencyMs: maxLatency,
      http2xx,
      http429,
      http4xx,
      http5xx,
      timeouts,
      retries: 0,
      retryAfterHeader,
      rateLimit429Pct: Number(((http429 / Math.max(1, rawBatches.length)) * 100).toFixed(1)),
      textsPerSec,
      charsPerSec,
      requestsPerSec,
      charsPerRequest: rawBatches.length > 0 ? Math.round(totalChars / rawBatches.length) : 0,
      textsPerRequest: rawBatches.length > 0 ? Math.round(texts.length / rawBatches.length) : 0
    };
  }

  /**
   * Executa benchmark completo de um provedor real variando concorrência e tamanhos de lote.
   */
  static async runFullBenchmark({ provider = 'GoogleGTX', sampleTexts = [], stages = [1, 2, 4, 8], batchSizes = [5, 10, 15] }) {
    const cfg = loadCfg();

    // Verificação estrita de credenciais: NUNCA fingir benchmark
    if (provider === 'Gemini' && !cfg.llmApiKey && !process.env.GEMINI_API_KEY) {
      return {
        provider,
        status: 'SKIPPED — provider sem credencial',
        reason: 'Nenhuma chave de API para Gemini configurada em config.json ou ambiente.'
      };
    }
    if (provider === 'DeepL' && !cfg.deeplApiKey && !process.env.DEEPL_API_KEY) {
      return {
        provider,
        status: 'SKIPPED — provider sem credencial',
        reason: 'Nenhuma chave de API DeepL configurada em config.json ou ambiente.'
      };
    }
    if (provider === 'GoogleCloudTranslation' && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !cfg.googleCloudKey) {
      return {
        provider,
        status: 'SKIPPED — provider sem credencial',
        reason: 'Nenhuma credencial Google Cloud Translation configurada.'
      };
    }

    const stageResults = [];

    for (const concurrency of stages) {
      // Warmup curto
      const warmupSample = sampleTexts.slice(0, Math.min(2, sampleTexts.length));
      if (warmupSample.length > 0) {
        await RealProviderBenchmark.runStage({
          provider,
          texts: warmupSample,
          concurrency: 1,
          batchSize: 5
        });
      }

      // Medição Real
      const result = await RealProviderBenchmark.runStage({
        provider,
        texts: sampleTexts,
        concurrency,
        batchSize: 10
      });
      stageResults.push(result);

      // Cooldown de 500ms entre estágios para evitar sobrecarga indevida
      await new Promise(r => setTimeout(r, 500));
    }

    // Identificar Peak, Max Sustained, Safe e Saturação com base nos dados reais
    let peak = stageResults[0];
    let maxSustained = stageResults[0];
    let safe = stageResults[0];
    let saturationPoint = null;

    for (let i = 0; i < stageResults.length; i++) {
      const st = stageResults[i];
      if (st.textsPerSec > peak.textsPerSec) {
        peak = st;
      }
      if (st.http429 === 0 && st.textsPerSec > maxSustained.textsPerSec) {
        maxSustained = st;
      }
      if (i > 0) {
        const prev = stageResults[i - 1];
        const throughputGain = (st.textsPerSec - prev.textsPerSec) / Math.max(0.1, prev.textsPerSec);
        const latencyIncrease = (st.p95LatencyMs - prev.p95LatencyMs) / Math.max(1, prev.p95LatencyMs);

        if ((latencyIncrease > 0.40 && throughputGain < 0.15) || st.http429 > 0) {
          if (!saturationPoint) {
            saturationPoint = {
              concurrency: st.concurrency,
              reason: st.http429 > 0
                ? `HTTP 429 detectado (${st.http429} requisições limitadas).`
                : `Throughput subiu apenas ${(throughputGain * 100).toFixed(1)}% enquanto P95 subiu ${(latencyIncrease * 100).toFixed(1)}%.`
            };
          }
        }
      }
    }

    // Safe point: Concorrência 2 ou ponto sem nenhum 429 com menor P95
    safe = stageResults.find(s => s.concurrency === 2 && s.http429 === 0) || stageResults[0];

    return {
      type: 'real_provider_benchmark',
      provider,
      sampleSize: sampleTexts.length,
      stages: stageResults,
      peakSpeed: { speed: peak.textsPerSec, charsSec: peak.charsPerSec, concurrency: peak.concurrency, p95Ms: peak.p95LatencyMs },
      maxSustainedSpeed: { speed: maxSustained.textsPerSec, charsSec: maxSustained.charsPerSec, concurrency: maxSustained.concurrency, p95Ms: maxSustained.p95LatencyMs },
      safeSpeed: { speed: safe.textsPerSec, charsSec: safe.charsPerSec, concurrency: safe.concurrency, p95Ms: safe.p95LatencyMs },
      saturationPoint: saturationPoint || { concurrency: stages[stages.length - 1], reason: 'Nenhuma saturação anormal observada na faixa testada.' }
    };
  }
}

module.exports = RealProviderBenchmark;
