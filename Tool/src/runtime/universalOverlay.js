class UniversalOverlay {
  constructor() {
    this.sessions = new Map();
  }

  createSession(gameTitle, windowHandle = 0) {
    const session = {
      id: `ovl_${Date.now()}`,
      gameTitle,
      windowHandle,
      active: true,
      regions: [],
      renderedTexts: []
    };
    this.sessions.set(session.id, session);
    return session;
  }

  addTextRegion(sessionId, region = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return { ok: false, error: 'Session not found' };

    const entry = {
      id: `reg_${session.regions.length + 1}`,
      x: region.x || 0,
      y: region.y || 0,
      width: region.width || 200,
      height: region.height || 50,
      originalText: region.original || '',
      translatedText: region.translated || '',
      confidence: region.confidence || 0.90
    };

    session.regions.push(entry);
    return { ok: true, entry };
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { ok: false };
    session.active = false;
    this.sessions.delete(sessionId);
    return { ok: true };
  }
}

module.exports = new UniversalOverlay();
