/**
 * OpenTranslator — UntranslatedDetector
 * Sistema universal de detecção e classificação de textos potencialmente não traduzidos.
 * Analisa extrações estáticas, pipeline de tradução, memória e runtime.
 */

const fs = require('fs');
const path = require('path');

const TextClassification = {
  TRANSLATED: "TRANSLATED",
  UNTRANSLATED: "UNTRANSLATED",
  PROTECTED: "PROTECTED",
  TECHNICAL: "TECHNICAL",
  UNKNOWN: "UNKNOWN",
  IDENTICAL_TRANSLATION: "IDENTICAL_TRANSLATION",
  RUNTIME_ONLY: "RUNTIME_ONLY"
};

// Dicionário básico de palavras comuns em inglês para detecção precisa além de ASCII
const COMMON_ENGLISH_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "game", "menu", "options", "attack", "defense", "magic", "item", "skill", "equip", "status",
  "volume", "battle", "animation", "save", "load", "cancel", "confirm", "start", "exit", "quit"
]);

// Palavras comuns em português para confirmar se o texto de fato foi traduzido
const COMMON_PORTUGUESE_WORDS = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
  "em", "no", "na", "nos", "nas", "por", "pelo", "pela", "pelos", "pelas",
  "para", "com", "sem", "sob", "sobre", "que", "se", "não", "sim", "como",
  "mais", "mas", "ou", "quando", "muito", "pouco", "este", "esta", "isto", "esse",
  "essa", "isso", "aquele", "aquela", "aquilo", "jogo", "menu", "opções", "ataque",
  "defesa", "magia", "itens", "item", "habilidade", "equipar", "equipamento", "status",
  "salvar", "carregar", "cancelar", "confirmar", "iniciar", "sair", "voltar", "batalha"
]);

class UntranslatedDetector {
  /**
   * Detecta o script e idioma provável do texto.
   * @param {string} text
   * @returns {{ script: string, language: string, isForeign: boolean, confidence: number }}
   */
  static detectScriptAndLanguage(text) {
    if (!text || typeof text !== 'string') {
      return { script: "none", language: "unknown", isForeign: false, confidence: 0 };
    }

    const clean = text.trim();
    if (clean.length === 0) {
      return { script: "none", language: "unknown", isForeign: false, confidence: 0 };
    }

    // 1. Scripts Orientais
    const hasHiragana = /[\u3040-\u309F]/.test(clean);
    const hasKatakana = /[\u30A0-\u30FF]/.test(clean);
    const hasKanji = /[\u4E00-\u9FFF]/.test(clean);
    const hasHangul = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean);
    const hasCyrillic = /[\u0400-\u04FF]/.test(clean);

    if (hasHiragana || hasKatakana) {
      return { script: "japanese", language: "ja", isForeign: true, confidence: 0.98 };
    }

    if (hasHangul) {
      return { script: "korean", language: "ko", isForeign: true, confidence: 0.98 };
    }

    if (hasKanji && !hasHiragana && !hasKatakana) {
      return { script: "chinese_or_kanji", language: "zh", isForeign: true, confidence: 0.90 };
    }

    if (hasCyrillic) {
      return { script: "cyrillic", language: "ru", isForeign: true, confidence: 0.95 };
    }

    // 2. Análise de palavras em script Latino
    const words = clean.toLowerCase().match(/\b[a-zà-ú]{2,}\b/g) || [];
    if (words.length > 0) {
      let enCount = 0;
      let ptCount = 0;

      for (const w of words) {
        if (COMMON_ENGLISH_WORDS.has(w)) enCount++;
        if (COMMON_PORTUGUESE_WORDS.has(w)) ptCount++;
      }

      // Caracteres acentuados típicos do Português (ã, õ, ç, á, é, í, ó, ú, ê, etc.)
      const hasPtDiacritics = /[ãõçáéíóúâêôà]/i.test(clean);
      if (hasPtDiacritics) ptCount += 2;

      if (ptCount > enCount) {
        return { script: "latin", language: "pt", isForeign: false, confidence: 0.90 };
      }

      if (enCount > 0 && enCount >= ptCount) {
        return { script: "latin", language: "en", isForeign: true, confidence: 0.85 };
      }

      // Mistura
      if (enCount > 0 && ptCount > 0) {
        return { script: "latin", language: "mixed", isForeign: true, confidence: 0.70 };
      }
    }

    return { script: "latin_generic", language: "unknown", isForeign: false, confidence: 0.50 };
  }

  /**
   * Verifica se o texto é técnico ou estrutural (não deve ser considerado texto humano não traduzido).
   */
  static isTechnicalOrCode(text) {
    if (!text || typeof text !== 'string') return true;
    const trimmed = text.trim();

    if (trimmed.length <= 1) return true;

    // GUID / UUID / Hash MD5 / SHA-256
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
    if (/^[0-9a-f]{32}$/i.test(trimmed) || /^[0-9a-f]{40}$/i.test(trimmed) || /^[0-9a-f]{64}$/i.test(trimmed)) return true;

    // Path / URL
    if (/^(https?:\/\/|\/|[a-zA-Z]:\\|\.\/|\.\.\/)/.test(trimmed)) return true;
    if (trimmed.includes('/') && !trimmed.includes(' ')) return true;
    if (trimmed.includes('\\') && !trimmed.includes(' ')) return true;

    // Nome de arquivo com extensão
    if (/^[a-zA-Z0-9_\-\.]+\.(png|jpg|jpeg|ogg|wav|mp3|json|js|ts|dll|exe|ini|txt|rpy|rpyc)$/i.test(trimmed)) return true;

    // Código JS / Sintaxe / CSS / Cores
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return true;
    if (/^(rgba?|hsla?)\(/.test(trimmed)) return true;
    if (/^(function|var|let|const|class|import|export|return|switch|case|default)\b/.test(trimmed)) return true;
    if (trimmed.startsWith("⟦OT_") && trimmed.endsWith("⟧")) return true;

    return false;
  }

  /**
   * Classifica uma entrada de texto individualmente.
   * @param {string} original
   * @param {string} translated
   * @param {object} context
   * @returns {{ classification: string, language: string, isForeign: boolean, reason: string }}
   */
  static classifyText(original, translated, context = {}) {
    if (context.isRuntimeOnly) {
      return {
        classification: TextClassification.RUNTIME_ONLY,
        language: UntranslatedDetector.detectScriptAndLanguage(original).language,
        isForeign: true,
        reason: "Texto interceptado exclusivamente em tempo de execução."
      };
    }

    if (context.isProtected || (context.tokens && context.tokens.length > 0) || (original.startsWith("⟦OT_") && original.endsWith("⟧"))) {
      return {
        classification: TextClassification.PROTECTED,
        language: "code",
        isForeign: false,
        reason: "Conteúdo protegido por tokens de segurança."
      };
    }

    if (this.isTechnicalOrCode(original)) {
      return {
        classification: TextClassification.TECHNICAL,
        language: "tech",
        isForeign: false,
        reason: "Conteúdo técnico, identificador, caminho ou fórmula."
      };
    }

    // Se não há tradução
    if (!translated || translated.trim().length === 0) {
      const det = this.detectScriptAndLanguage(original);
      return {
        classification: TextClassification.UNTRANSLATED,
        language: det.language,
        isForeign: det.isForeign,
        reason: `Texto pendente sem tradução (idioma detectado: ${det.language.toUpperCase()}).`
      };
    }

    const origTrim = original.trim();
    const transTrim = translated.trim();

    // Se tradução é idêntica ao original
    if (origTrim === transTrim) {
      const det = this.detectScriptAndLanguage(origTrim);
      if (det.isForeign) {
        return {
          classification: TextClassification.UNTRANSLATED,
          language: det.language,
          isForeign: true,
          reason: `Tradução idêntica ao texto estrangeiro original (${det.language.toUpperCase()}).`
        };
      } else {
        return {
          classification: TextClassification.IDENTICAL_TRANSLATION,
          language: det.language,
          isForeign: false,
          reason: "Tradução idêntica ao original (termo comum ou cognato)."
        };
      }
    }

    // Tradução diferente do original: verifica se a tradução é válida
    const detTrans = this.detectScriptAndLanguage(transTrim);
    if (detTrans.isForeign && detTrans.language !== "pt") {
      return {
        classification: TextClassification.UNKNOWN,
        language: detTrans.language,
        isForeign: true,
        reason: `Tradução aplicada contém script estrangeiro (${detTrans.language.toUpperCase()}).`
      };
    }

    return {
      classification: TextClassification.TRANSLATED,
      language: detTrans.language,
      isForeign: false,
      reason: "Texto traduzido com sucesso para idioma de destino."
    };
  }

  /**
   * Analisa lista de textos extraídos e mapa de traduções.
   * @param {Array<object>} texts
   * @param {Map<string, string>|object} translations
   * @param {object} options
   * @returns {object} Relatório consolidado
   */
  static analyzeExtraction(texts = [], translations = new Map(), options = {}) {
    const summary = {
      totalFound: texts.length,
      translated: 0,
      untranslated: 0,
      protected: 0,
      technical: 0,
      runtimeOnly: 0,
      identical: 0,
      unknown: 0
    };

    const remaining = [];
    const languageStats = {};

    for (const t of texts) {
      const orig = t.original || t.clean || "";
      const tr = translations.get ? translations.get(t.id) : translations[t.id];

      const res = this.classifyText(orig, tr, {
        isProtected: Boolean(t.isProtected),
        isRuntimeOnly: Boolean(t.isRuntimeOnly),
        tokens: t.tokens || []
      });

      // Contabilização de idiomas
      const langKey = res.language || "unknown";
      languageStats[langKey] = (languageStats[langKey] || 0) + 1;

      switch (res.classification) {
        case TextClassification.TRANSLATED:
          summary.translated++;
          break;
        case TextClassification.UNTRANSLATED:
          summary.untranslated++;
          remaining.push({
            id: t.id,
            file: t.file || "unknown",
            key: t.key || t.keyPath || "",
            original: orig,
            language: res.language,
            reason: res.reason
          });
          break;
        case TextClassification.PROTECTED:
          summary.protected++;
          break;
        case TextClassification.TECHNICAL:
          summary.technical++;
          break;
        case TextClassification.RUNTIME_ONLY:
          summary.runtimeOnly++;
          remaining.push({
            id: t.id,
            file: t.file || "runtime",
            original: orig,
            language: res.language,
            reason: res.reason
          });
          break;
        case TextClassification.IDENTICAL_TRANSLATION:
          summary.identical++;
          break;
        case TextClassification.UNKNOWN:
        default:
          summary.unknown++;
          remaining.push({
            id: t.id,
            file: t.file || "unknown",
            original: orig,
            translated: tr,
            language: res.language,
            reason: res.reason
          });
          break;
      }
    }

    return {
      summary,
      languageStats,
      remainingCount: remaining.length,
      remaining,
      formattedReport: this.generateSummaryReport(summary)
    };
  }

  /**
   * Gera relatório amigável no formato solicitado pelo usuário.
   */
  static generateSummaryReport(summary) {
    return [
      `Total encontrado: ${summary.totalFound}`,
      `Traduzidos: ${summary.translated}`,
      `Não traduzidos: ${summary.untranslated}`,
      `Protegidos: ${summary.protected}`,
      `Técnicos: ${summary.technical}`,
      `Runtime-only: ${summary.runtimeOnly}`,
      `Desconhecidos: ${summary.unknown}`
    ].join('\n');
  }
}

module.exports = UntranslatedDetector;
module.exports.TextClassification = TextClassification;
