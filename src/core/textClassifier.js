/**
 * OpenTranslator — TextClassifier
 * Identifica e filtra textos que não devem ser traduzidos.
 * Combina detecção semântica estrita de lixo técnico com categorização avançada:
 * PLAYER_TEXT, UI_TEXT, DIALOGUE vs CODE, PATH, URL, HASH, GUID, etc.
 */

const CATEGORIES = {
  TEXT: "TEXT",
  CODE: "CODE",
  IDENTIFIER: "IDENTIFIER",
  PATH: "PATH",
  URL: "URL",
  HASH: "HASH",
  GUID: "GUID",
  VARIABLE: "VARIABLE",
  ENUM: "ENUM",
  DEBUG: "DEBUG",
  LICENSE: "LICENSE",
  COMMENT: "COMMENT",
  RESOURCE_NAME: "RESOURCE_NAME",
  PLAYER_TEXT: "PLAYER_TEXT",
  UI_TEXT: "UI_TEXT",
  DIALOGUE: "DIALOGUE"
};

class TextClassifier {
  static classify(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return { translatable: false, reason: 'EMPTY_OR_NON_STRING', category: CATEGORIES.CODE, confidence: 1.0 };
    }
    const clean = text.trim();
    if (clean.length === 0) {
      return { translatable: false, reason: 'EMPTY', category: CATEGORIES.CODE, confidence: 1.0 };
    }
    if (clean.length === 1 && !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(clean)) {
      return { translatable: false, reason: 'SINGLE_ASCII_CHAR', category: CATEGORIES.CODE, confidence: 1.0 };
    }

    // Apenas números / cálculos / dimensões
    if (/^[\d\s\.,\+\-\*/%#:=]+$/.test(clean)) {
      return { translatable: false, reason: 'NUMERIC_OR_MATH', category: CATEGORIES.CODE, confidence: 1.0 };
    }

    // Resoluções de tela: 1920x1080, 800x600
    if (/^\d+\s*[xX*]\s*\d+$/.test(clean)) {
      return { translatable: false, reason: 'SCREEN_RESOLUTION', category: CATEGORIES.CODE, confidence: 1.0 };
    }

    // Indicadores de desempenho: 60 FPS, 144hz, 16.6ms, 120MB, 2.5GB
    if (/^\d+(\.\d+)?\s*(fps|hz|ms|kb|mb|gb|tb|kbps|mbps)$/i.test(clean)) {
      return { translatable: false, reason: 'TELEMETRY_COUNTER', category: CATEGORIES.CODE, confidence: 1.0 };
    }

    // URLs, caminhos de arquivo, URIs
    if (/^(https?:\/\/|file:\/\/|res:\/\/|[a-zA-Z]:[\\/])/i.test(clean)) {
      return { translatable: false, reason: 'URL_OR_FILEPATH', category: CATEGORIES.PATH, confidence: 1.0 };
    }

    // Hashes hexadecimais, UUIDs, GUIDs
    if (/^[0-9a-fA-F]{16,64}$/.test(clean) || /^[0-9a-fA-F-]{36}$/.test(clean)) {
      return { translatable: false, reason: 'HASH_OR_UUID', category: clean.length === 36 ? CATEGORIES.GUID : CATEGORIES.HASH, confidence: 1.0 };
    }

    // Identificadores de código técnico em ALL_CAPS sem espaços (ex: EV_GLOBAL_FLAG_01, FLAG_GAME_EVENT_001)
    if (/^[A-Z0-9_]{3,}$/.test(clean) && !clean.includes(' ')) {
      return { translatable: false, reason: 'CODE_IDENTIFIER', category: CATEGORIES.IDENTIFIER, confidence: 1.0 };
    }

    // Nomes de recursos multimídia (ex: bg_room.png)
    if (/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif|wav|mp3|ogg|flac|asset|bundle|pak|rpa|pck|dat|bin|dll|exe)$/i.test(clean)) {
      return { translatable: false, reason: 'RESOURCE_NAME', category: CATEGORIES.RESOURCE_NAME, confidence: 0.95 };
    }

    // Não contém nenhuma letra humana (alfabético latino ou CJK)
    if (!/[a-zA-Z\u00C0-\u017F\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(clean)) {
      return { translatable: false, reason: 'NO_HUMAN_CHARACTERS', category: CATEGORIES.CODE, confidence: 1.0 };
    }

    // Determina categoria linguística refinada
    let category = CATEGORIES.PLAYER_TEXT;
    const isUi = /^(play|start|continue|load|save|options|settings|exit|quit|back|next|cancel|ok|yes|no|new game|inventory|status|menu|audio|video|display|language|help|credits|confirm|apply|retry)$/i.test(clean);
    const isDialogue = /["'“”«»「」『』]|^[A-ZÀ-Ú][a-zà-ú]+:|[.!?…]$/.test(clean) || (clean.includes(' ') && clean.length > 20);

    if (isDialogue) category = CATEGORIES.DIALOGUE;
    else if (isUi) category = CATEGORIES.UI_TEXT;

    return {
      translatable: true,
      cleanText: clean,
      category,
      confidence: 0.95
    };
  }

  static filterTranslatable(items = [], minConfidence = 0.60) {
    const translatable = [];
    const filteredOut = [];

    for (const item of items) {
      const text = item.clean || item.original || item.text || "";
      const classification = TextClassifier.classify(text, { file: item.file, engine: item.engine });

      if (classification.translatable && (classification.confidence || 1.0) >= minConfidence) {
        translatable.push({
          ...item,
          category: classification.category,
          classificationConfidence: classification.confidence
        });
      } else {
        filteredOut.push({
          ...item,
          category: classification.category || CATEGORIES.CODE,
          classificationReason: classification.reason
        });
      }
    }

    return { translatable, filteredOut };
  }
}

module.exports = TextClassifier;
module.exports.CATEGORIES = CATEGORIES;
