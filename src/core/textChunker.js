/**
 * textChunker.js — Divisor Universal e Seguro de Textos Longos
 *
 * Responsabilidades:
 * - Evitar envio de requisições excessivamente longas (que causam HTTP 414 / 429).
 * - Dividir textos longos hierarquicamente (parágrafos -> linhas -> sentenças -> cláusulas -> palavras).
 * - Proteger categoricamente placeholders, tags, escapes e variáveis contra quebra no meio.
 * - Recombinar traduções parciais preservando a estrutura original do jogo.
 *
 * Camada Arquitetural:
 * src/core/textChunker.js (Camada de Pré-processamento e Transporte Seguro)
 */

class TextChunker {
  /**
   * Padrões conhecidos de tags e placeholders que NUNCA devem ser cortados ao meio.
   */
  static get PROTECTED_PATTERNS() {
    return [
      /⟦OT_\d+⟧/g,                         // Token padrão CodeProtector
      /\[[a-zA-Z0-9_\. -]+\]/g,            // Ren'Py / Godot [var]
      /\{[a-zA-Z0-9_#=,.:;% -]+\}/g,       // Ren'Py / Unity {tag}
      /%\([a-zA-Z0-9_]+\)[a-zA-Z]/g,       // Python %(var)s
      /%[-+0-9]*[a-zA-Z]/g,                // Formatos C/JS %s, %d
      /<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*)?>/g, // Tags HTML / RichText
      /\\[a-zA-Z]+(?:\[[^\]]+\])?/g,       // RPG Maker \c[2], \v[1]
      /\\[nrtbfav0\\'"\.]/g                // Escapes literais
    ];
  }

  /**
   * Divide um texto potencialmente longo em pedaços (chunks) seguros.
   *
   * @param {string} text Texto original a ser particionado
   * @param {object} options Configurações de limite (maxChars, maxBytes)
   * @returns {object} { chunks: string[], isChunked: boolean, originalLength: number }
   */
  static chunk(text, options = {}) {
    if (!text || typeof text !== "string") {
      return { chunks: [""], isChunked: false, originalLength: 0 };
    }

    const maxChars = options.maxChars || 800; // Limite conservador muito abaixo do teto de URL
    const maxBytes = options.maxBytes || 1800; // Limite de bytes em UTF-8

    const byteLen = Buffer.byteLength(text, "utf8");
    if (text.length <= maxChars && byteLen <= maxBytes) {
      return { chunks: [text], isChunked: false, originalLength: text.length };
    }

    // 1. Identifica regiões protegidas para impedir quebras internas
    const protectedRanges = [];
    for (const pattern of this.PROTECTED_PATTERNS) {
      const rx = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = rx.exec(text)) !== null) {
        protectedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
    }

    const isInsideProtected = (pos) => {
      return protectedRanges.some(r => pos > r.start && pos < r.end);
    };

    // 2. Procura divisores hierárquicos:
    // Nível 1: Parágrafos (\n\n+)
    // Nível 2: Quebra de linha (\n)
    // Nível 3: Pontuação final ocidental e CJK (. ! ? 。 ！ ？)
    // Nível 4: Pontuação intermediária (, ; : 、 ； ：)
    // Nível 5: Espaço em branco (\s)
    const findSafeSplitPoint = (str, targetPos) => {
      // Tenta recuar a partir de targetPos até achar um separador seguro
      const minPos = Math.max(0, targetPos - Math.floor(maxChars * 0.4));

      // Separadores ordenados por preferência semântica
      const splitRegexes = [
        /\r?\n\r?\n/g,                               // Parágrafos
        /\r?\n/g,                                   // Linhas
        /[.!?。！？]\s*/g,                           // Sentenças
        /[,;:、；：]\s*/g,                           // Cláusulas
        /\s+/g                                      // Espaços
      ];

      for (const rx of splitRegexes) {
        let bestCandidate = -1;
        rx.lastIndex = minPos;
        let m;
        while ((m = rx.exec(str)) !== null) {
          const splitAt = m.index + m[0].length;
          if (splitAt > targetPos) break;
          if (!isInsideProtected(splitAt)) {
            bestCandidate = splitAt;
          }
        }
        if (bestCandidate > 0) {
          return bestCandidate;
        }
      }

      // Se nenhum separador seguro for encontrado, busca o ponto mais próximo que não corte tags
      let fallbackPos = targetPos;
      while (fallbackPos > minPos && isInsideProtected(fallbackPos)) {
        fallbackPos--;
      }
      return fallbackPos > minPos ? fallbackPos : targetPos;
    };

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxChars && Buffer.byteLength(remaining, "utf8") <= maxBytes) {
        chunks.push(remaining);
        break;
      }

      let splitLen = Math.min(remaining.length, maxChars);
      // Ajusta se bytes excederem maxBytes (comum em japonês/chinês: 3 bytes por caractere)
      while (splitLen > 20 && Buffer.byteLength(remaining.slice(0, splitLen), "utf8") > maxBytes) {
        splitLen = Math.floor(splitLen * 0.85);
      }

      const safePos = findSafeSplitPoint(remaining, splitLen);
      const chunkStr = remaining.slice(0, safePos);
      chunks.push(chunkStr);
      remaining = remaining.slice(safePos);
    }

    return {
      chunks,
      isChunked: chunks.length > 1,
      originalLength: text.length
    };
  }

  /**
   * Recombina os pedaços traduzidos preservando a integridade original.
   *
   * @param {string[]} translatedChunks Pedaços traduzidos recebidos do provedor
   * @returns {string} Texto recombinado
   */
  static recombine(translatedChunks = []) {
    if (!Array.isArray(translatedChunks) || translatedChunks.length === 0) return "";
    return translatedChunks.join("");
  }
}

module.exports = TextChunker;
