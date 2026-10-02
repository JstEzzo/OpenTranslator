/**
 * TranslationStateMachine — Rastreia os estados pelos quais um texto passa:
 * DETECTED -> FILTERED -> STABILIZING -> READY -> CACHE_HIT -> TRANSLATING -> TRANSLATED -> VALIDATED -> DISPLAYED -> FAILED -> IGNORED
 */
const STATES = {
  DETECTED: 'DETECTED',
  FILTERED: 'FILTERED',
  STABILIZING: 'STABILIZING',
  READY: 'READY',
  CACHE_HIT: 'CACHE_HIT',
  TRANSLATING: 'TRANSLATING',
  TRANSLATED: 'TRANSLATED',
  VALIDATED: 'VALIDATED',
  DISPLAYED: 'DISPLAYED',
  FAILED: 'FAILED',
  IGNORED: 'IGNORED'
};

class TranslationState {
  constructor(text, metadata = {}) {
    this.id = `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.originalText = text;
    this.translatedText = null;
    this.state = STATES.DETECTED;
    this.history = [{ state: STATES.DETECTED, timestamp: Date.now() }];
    this.metadata = metadata;
  }

  transition(newState, details = {}) {
    this.state = newState;
    this.history.push({ state: newState, timestamp: Date.now(), details });
    return this;
  }

  isTerminal() {
    return this.state === STATES.DISPLAYED || this.state === STATES.FAILED || this.state === STATES.IGNORED;
  }
}

module.exports = {
  STATES,
  TranslationState
};
