/**
 * OpenTranslator — UniversalScanner
 * Varredura heurística com cálculo de humanTextConfidence e fileRiskScore.
 */

const fs = require("fs");
const path = require("path");

class UniversalScanner {
  static scoreText(text) {
    if (!text || typeof text !== "string") return 0;
    const trimmed = text.trim();
    if (trimmed.length < 2) return 0;

    let score = 50;

    // Comprimento saudável para diálogo/menu (5 a 200 caracteres)
    if (trimmed.length >= 5 && trimmed.length <= 200) score += 20;

    // Presença de espaços (indica linguagem natural)
    if (trimmed.includes(" ")) score += 15;

    // Contém pontuação comum
    if (/[.!?,;:~]/.test(trimmed)) score += 10;

    // Penalidade para identificadores de código (camelCase, snake_case_only, hex strings)
    if (/^[a-zA-Z0-9_]+$/.test(trimmed) && !trimmed.includes(" ")) score -= 30;
    if (/^[0-9a-fA-F]{16,}$/.test(trimmed)) score -= 50;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) score -= 40;

    return Math.max(0, Math.min(100, score));
  }

  static scoreFileRisk(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath).toLowerCase();
    const dir = path.dirname(filePath).toLowerCase();

    // DO_NOT_MODIFY: Binários executáveis
    if ([".exe", ".dll", ".so", ".bin", ".dat", ".sys"].includes(ext)) {
      return { risk: "DO_NOT_MODIFY", safe: false };
    }

    // SAFE: Arquivos explícitos de localização ou texto
    if ([".po", ".csv", ".json", ".txt"].includes(ext) && (dir.includes("locale") || dir.includes("lang") || dir.includes("trans") || base.includes("translation"))) {
      return { risk: "SAFE", safe: true };
    }

    // CAUTION: Arquivos de script ou configurações
    if ([".js", ".ts", ".xml", ".yaml", ".yml", ".ini"].includes(ext)) {
      return { risk: "CAUTION", safe: true };
    }

    return { risk: "SAFE", safe: true };
  }
}

module.exports = UniversalScanner;
