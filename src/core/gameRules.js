class GameRules {
  constructor(rules = {}) {
    this.ignoreComponents = new Set(rules.ignoreComponents || ['FPSCounter', 'DebugLog', 'VersionLabel']);
    this.ignoreRegexes = (rules.ignoreRegexes || []).map(r => new RegExp(r, 'i'));
    this.forceTranslationRegexes = (rules.forceTranslationRegexes || []).map(r => new RegExp(r, 'i'));
    this.preferredFont = rules.preferredFont || null;
    this.maxTextLength = rules.maxTextLength || 1000;
  }

  shouldIgnore(text, componentName = '') {
    if (this.ignoreComponents.has(componentName)) return true;
    for (const reg of this.ignoreRegexes) {
      if (reg.test(text)) return true;
    }
    return false;
  }

  shouldForce(text) {
    for (const reg of this.forceTranslationRegexes) {
      if (reg.test(text)) return true;
    }
    return false;
  }
}

module.exports = GameRules;
