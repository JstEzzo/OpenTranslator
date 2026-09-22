/**
 * TextClassifier — Identifica e filtra textos que não devem ser traduzidos.
 * Evita desperdício de requisições e corrupção de dados numéricos/técnicos.
 */
class TextClassifier {
  static classify(text) {
    if (!text || typeof text !== 'string') {
      return { translatable: false, reason: 'EMPTY_OR_NON_STRING' };
    }
    const clean = text.trim();
    if (clean.length === 0) {
      return { translatable: false, reason: 'EMPTY' };
    }
    if (clean.length === 1 && !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(clean)) {
      return { translatable: false, reason: 'SINGLE_ASCII_CHAR' };
    }

    // Apenas números / cálculos / dimensões
    if (/^[\d\s\.,\+\-\*/%#:=]+$/.test(clean)) {
      return { translatable: false, reason: 'NUMERIC_OR_MATH' };
    }

    // Resoluções de tela: 1920x1080, 800x600
    if (/^\d+\s*[xX*]\s*\d+$/.test(clean)) {
      return { translatable: false, reason: 'SCREEN_RESOLUTION' };
    }

    // Indicadores de desempenho: 60 FPS, 144hz, 16.6ms, 120MB, 2.5GB
    if (/^\d+(\.\d+)?\s*(fps|hz|ms|kb|mb|gb|tb|kbps|mbps)$/i.test(clean)) {
      return { translatable: false, reason: 'TELEMETRY_COUNTER' };
    }

    // URLs, caminhos de arquivo, URIs
    if (/^(https?:\/\/|file:\/\/|res:\/\/|[a-zA-Z]:[\\/])/i.test(clean)) {
      return { translatable: false, reason: 'URL_OR_FILEPATH' };
    }

    // Hashes hexadecimais, UUIDs, GUIDs
    if (/^[0-9a-fA-F]{16,64}$/.test(clean) || /^[0-9a-fA-F-]{36}$/.test(clean)) {
      return { translatable: false, reason: 'HASH_OR_UUID' };
    }

    // Identificadores de código técnico em ALL_CAPS sem espaços (ex: EV_GLOBAL_FLAG_01)
    if (/^[A-Z0-9_]{4,}$/.test(clean) && !clean.includes(' ')) {
      return { translatable: false, reason: 'CODE_IDENTIFIER' };
    }

    // Não contém nenhuma letra humana (alfabético latino ou CJK)
    if (!/[a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(clean)) {
      return { translatable: false, reason: 'NO_HUMAN_CHARACTERS' };
    }

    return { translatable: true, cleanText: clean };
  }
}

module.exports = TextClassifier;
