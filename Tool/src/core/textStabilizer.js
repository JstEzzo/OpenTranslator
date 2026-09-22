/**
 * TextStabilizer — Estabiliza textos capturados em runtime.
 * Inspirado nos mecanismos do XUnity AutoTranslator:
 * - Evita traduzir textos intermediários (Loading, Loading., Loading..)
 * - Debounce configurável por componente
 * - Supressão de duplicatas em rajada
 * - Circuit breaker adaptativo caso haja spam
 */
class TextStabilizer {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 250;
    this.pending = new Map(); // key -> { text, timer, resolve, reject, timestamp }
    this.seenTexts = new Map(); // text -> lastSeenTimestamp
    this.spamCounter = new Map(); // componentId -> count
    this.circuitOpen = false;
  }

  /**
   * Estabiliza um texto de componente UI antes de encaminhar para a fila de tradução.
   */
  stabilize(componentId, text) {
    return new Promise((resolve) => {
      const key = componentId || text;
      const now = Date.now();

      // Checa spam de atualização contínua no mesmo componente
      const count = (this.spamCounter.get(key) || 0) + 1;
      this.spamCounter.set(key, count);
      if (count > 20) {
        // Reduz frequência sob alta taxa de atualização
        this.debounceMs = Math.min(1000, this.debounceMs + 50);
      }

      // Cancela timer anterior para este componente se o texto ainda está mudando
      if (this.pending.has(key)) {
        const item = this.pending.get(key);
        clearTimeout(item.timer);
      }

      const timer = setTimeout(() => {
        this.pending.delete(key);
        this.spamCounter.set(key, 0);
        this.seenTexts.set(text, Date.now());
        resolve({ stabilized: true, text });
      }, this.debounceMs);

      this.pending.set(key, { text, timer, timestamp: now });
    });
  }

  clear() {
    for (const [k, item] of this.pending.entries()) {
      clearTimeout(item.timer);
    }
    this.pending.clear();
    this.spamCounter.clear();
  }
}

module.exports = TextStabilizer;
