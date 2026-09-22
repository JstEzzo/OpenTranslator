/**
 * OpenTranslator — SubtitleSystem
 * 
 * Gerenciador de sincronização temporal de legendas e cutscenes:
 * - Estima duração de leitura baseada em taxa de caracteres por segundo (CPS)
 * - Evita persistência fantasma de legendas após o áudio ter finalizado
 * - Gerencia sincronização de cutscenes com timestamps precisos
 */

class SubtitleSystem {
  constructor(options = {}) {
    this.charsPerSecond = options.charsPerSecond || 16; // 16 cps (~200 wpm)
    this.minDurationMs = options.minDurationMs || 1500;
    this.maxDurationMs = options.maxDurationMs || 8000;
    this.activeSubtitles = new Map();
  }

  /**
   * Calcula a duração ideal de exibição para uma legenda traduzida
   * @param {string} text
   * @param {number} [voiceDurationMs] - Duração do áudio original se conhecida
   */
  calculateDuration(text, voiceDurationMs = 0) {
    if (voiceDurationMs > 0) {
      // Se a duração do áudio for conhecida, respeita o áudio com pequena margem
      return Math.max(this.minDurationMs, Math.min(voiceDurationMs + 200, this.maxDurationMs));
    }

    const charCount = (text && text.length) || 0;
    const estimatedSec = charCount / this.charsPerSecond;
    const estimatedMs = Math.round(estimatedSec * 1000);

    return Math.max(this.minDurationMs, Math.min(estimatedMs, this.maxDurationMs));
  }

  /**
   * Registra e agenda a exibição de uma legenda ativa
   */
  displaySubtitle(id, text, voiceDurationMs = 0, onExpire = null) {
    // Cancela legenda anterior com o mesmo ID se houver
    if (this.activeSubtitles.has(id)) {
      clearTimeout(this.activeSubtitles.get(id).timer);
    }

    const durationMs = this.calculateDuration(text, voiceDurationMs);
    const displayedAt = Date.now();

    const timer = setTimeout(() => {
      this.activeSubtitles.delete(id);
      if (typeof onExpire === 'function') onExpire(id);
    }, durationMs);

    this.activeSubtitles.set(id, {
      id,
      text,
      durationMs,
      displayedAt,
      timer
    });

    return {
      id,
      durationMs,
      expiresAt: displayedAt + durationMs
    };
  }

  /**
   * Força o encerramento imediato de uma legenda (ex: diálogo pulado pelo jogador)
   */
  dismissSubtitle(id) {
    if (this.activeSubtitles.has(id)) {
      clearTimeout(this.activeSubtitles.get(id).timer);
      this.activeSubtitles.delete(id);
      return true;
    }
    return false;
  }
}

module.exports = SubtitleSystem;
