/**
 * OpenTranslator — TextProvenance2
 * 
 * Rastreamento avançado de proveniência de texto e impressão digital (Fingerprint):
 * Cadeia canônica:
 * FILE -> RESOURCE -> PARSER -> RUNTIME OBJECT -> UI COMPONENT -> SCREEN
 * 
 * Se a cadeia quebrar em qualquer estágio, indica com precisão o elo rompido.
 */

const crypto = require('crypto');

class TextFingerprint {
  static create(params = {}) {
    const text = String(params.text || '');
    const normalized = text.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
    const context = String(params.context || '');
    const game = String(params.game || '');
    const component = String(params.component || '');

    return {
      sourceHash: crypto.createHash('sha256').update(text).digest('hex').slice(0, 16),
      normalizedHash: crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16),
      contextHash: crypto.createHash('sha256').update(context).digest('hex').slice(0, 16),
      gameHash: crypto.createHash('sha256').update(game).digest('hex').slice(0, 16),
      componentHash: crypto.createHash('sha256').update(component).digest('hex').slice(0, 16)
    };
  }
}

class TextProvenance2 {
  constructor(stages = {}) {
    this.file = stages.file || null;
    this.resource = stages.resource || null;
    this.parser = stages.parser || null;
    this.runtimeObject = stages.runtimeObject || null;
    this.uiComponent = stages.uiComponent || null;
    this.screen = stages.screen || null;
  }

  /**
   * Avalia a integridade da cadeia de proveniência
   */
  evaluateChain() {
    const chain = [
      { stage: 'FILE', value: this.file },
      { stage: 'RESOURCE', value: this.resource },
      { stage: 'PARSER', value: this.parser },
      { stage: 'RUNTIME_OBJECT', value: this.runtimeObject },
      { stage: 'UI_COMPONENT', value: this.uiComponent },
      { stage: 'SCREEN', value: this.screen }
    ];

    let isBroken = false;
    let brokenAt = null;
    let unbrokenDepth = 0;

    for (let i = 0; i < chain.length; i++) {
      if (!chain[i].value) {
        isBroken = true;
        brokenAt = chain[i].stage;
        break;
      }
      unbrokenDepth++;
    }

    return {
      complete: !isBroken,
      unbrokenDepth,
      brokenAt: isBroken ? brokenAt : null,
      chainSummary: chain.map(c => `${c.stage}:${c.value ? 'OK' : 'MISSING'}`).join(' -> ')
    };
  }
}

module.exports = {
  TextProvenance2,
  TextFingerprint
};
