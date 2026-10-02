/**
 * OpenTranslator — ProviderProfiles
 * Perfis técnicos, quotas documentadas, limites observados e políticas de retry para provedores.
 * Não inventa limites: separa limites oficiais documentados de limites conservadores recomendados.
 */

const PROVIDER_PROFILES = {
  GoogleGTX: {
    id: "GoogleGTX",
    name: "Google Translate (GTX / Unofficial)",
    type: "web_endpoint",
    authenticated: false,
    documentedLimits: {
      rpm: "Não documentado (endpoint web público)",
      tpm: "Não documentado",
      maxCharsPerRequest: 5000,
      quotaReset: "Variável / IP ban temporário em 429 ou 302"
    },
    recommendedLimits: {
      concurrency: 4,
      maxBatchSize: 15,
      maxCharsPerBatch: 4200,
      minIntervalMs: 80,
      safeThroughputTextsSec: 25
    },
    circuitBreaker: {
      consecutiveErrorsThreshold: 3,
      banDurationMs: 10 * 60 * 1000 // 10 minutos de cooldown
    },
    retryPolicy: {
      maxRetries: 3,
      baseBackoffMs: 1500,
      maxBackoffMs: 15000,
      jitter: true
    }
  },

  GoogleCloudTranslation: {
    id: "GoogleCloudTranslation",
    name: "Google Cloud Translation API (Official)",
    type: "official_api",
    authenticated: true,
    documentedLimits: {
      rpm: 600, // 600 requisições por minuto padrão por projeto
      tpm: "Não aplicável",
      maxCharsPerMinute: 6000000, // 6M caracteres/min
      maxCharsPerRequest: 30000, // Limite para requisições síncronas v3
      recommendedBatchChars: 5000 // Recomendação oficial de latência
    },
    recommendedLimits: {
      concurrency: 12,
      maxBatchSize: 50,
      maxCharsPerBatch: 5000,
      minIntervalMs: 50,
      safeThroughputTextsSec: 150
    },
    circuitBreaker: {
      consecutiveErrorsThreshold: 5,
      banDurationMs: 60 * 1000
    },
    retryPolicy: {
      maxRetries: 4,
      baseBackoffMs: 1000,
      maxBackoffMs: 30000,
      jitter: true
    }
  },

  Gemini: {
    id: "Gemini",
    name: "Google Gemini API (1.5 Flash / 2.0)",
    type: "llm_api",
    authenticated: true,
    documentedLimits: {
      rpm: 15, // Free tier: 15 RPM; Pay-as-you-go: até 1000 RPM
      tpm: 1000000, // 1M tokens/min
      rpd: 1500, // 1500 requisições/dia no free tier
      maxCharsPerRequest: 100000
    },
    recommendedLimits: {
      concurrency: 5,
      maxBatchSize: 30,
      maxCharsPerBatch: 8000,
      minIntervalMs: 200,
      safeThroughputTextsSec: 40
    },
    circuitBreaker: {
      consecutiveErrorsThreshold: 3,
      banDurationMs: 60 * 1000
    },
    retryPolicy: {
      maxRetries: 3,
      baseBackoffMs: 2000,
      maxBackoffMs: 30000,
      jitter: true
    }
  },

  DeepL: {
    id: "DeepL",
    name: "DeepL API (Free / Pro)",
    type: "official_api",
    authenticated: true,
    documentedLimits: {
      rpm: "Até 10000 req/min dependendo do tier",
      maxCharsPerRequest: 128000,
      monthlyQuota: "500.000 chars (Free)"
    },
    recommendedLimits: {
      concurrency: 8,
      maxBatchSize: 50,
      maxCharsPerBatch: 10000,
      minIntervalMs: 100,
      safeThroughputTextsSec: 80
    },
    circuitBreaker: {
      consecutiveErrorsThreshold: 3,
      banDurationMs: 30 * 1000
    },
    retryPolicy: {
      maxRetries: 3,
      baseBackoffMs: 1000,
      maxBackoffMs: 20000,
      jitter: true
    }
  }
};

class ProviderProfiles {
  static get(providerId) {
    return PROVIDER_PROFILES[providerId] || PROVIDER_PROFILES.GoogleGTX;
  }

  static getAll() {
    return Object.values(PROVIDER_PROFILES);
  }
}

module.exports = ProviderProfiles;
module.exports.PROVIDER_PROFILES = PROVIDER_PROFILES;
