class TextCaptureQuality {
  static isTranslatable(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim();
    if (clean.length < 2) return false;

    // Pure numbers / coords: '123', '12.4', '1920x1080'
    if (/^\d+(\.\d+)?(\s*x\s*\d+)?$/.test(clean)) return false;

    // FPS / Debug counters: '60 FPS', '120fps', '0.016ms'
    if (/^\d+\s*(fps|ms|hz|kb|mb|gb)$/i.test(clean)) return false;

    // URLs / Paths: 'http://...', 'C:\\...', 'res://...'
    if (/^(https?:\/\/|file:\/\/|[a-zA-Z]:\\|res:\/\/)/i.test(clean)) return false;

    // Hex / Hashes / GUIDs
    if (/^[0-9a-fA-F]{16,64}$/.test(clean)) return false;

    // Variable identifiers: 'PLAYER_HEALTH_VAR', '__init__'
    if (/^[A-Z0-9_]{4,}$/.test(clean) && !clean.includes(' ')) return false;

    // Must have at least one word character / letter
    if (!/[a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(clean)) return false;

    return true;
  }
}

module.exports = TextCaptureQuality;
