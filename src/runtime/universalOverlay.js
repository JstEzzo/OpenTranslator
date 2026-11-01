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
    const entryCount = session.regions.length;
    // FASE 9: capturar ANTES de marcar — ler depois devolveria `false` sempre,
    // que é a forma mais sutil de um campo que parece funcionar.
    const wasActive = session.active === true;
    session.active = false;
    this.sessions.delete(sessionId);
    // FASE 9 / PASSO 48 — sucesso sem payload.
    //
    // `{ ok: true }` aqui não dizia NADA. O chamador não podia saber quantas
    // regiões foram liberadas nem se a sessão estava de fato ativa antes do
    // pedido — e um overlay que "fecha" uma sessão já fechada devolvia a mesma
    // resposta de uma que estava rodando.
    return {
      ok: true,
      status: 'CLOSED',
      sessionId,
      wasActive,
      regionsReleased: entryCount,
    };
  }
}

module.exports = new UniversalOverlay();
