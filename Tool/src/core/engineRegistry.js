/**
 * OpenTranslator — EngineRegistry
 * Registro e resolução de adaptadores de engine.
 */

class EngineRegistry {
  constructor() {
    this.adapters = new Map();
  }

  /**
   * Registra um adapter no sistema.
   * @param {BaseEngineAdapter} adapter
   */
  register(adapter) {
    if (!adapter || !adapter.id) {
      throw new Error("Adapter inválido ou sem propriedade 'id'.");
    }
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Obtém um adapter registrado pelo ID.
   * @param {string} engineId
   * @returns {BaseEngineAdapter|null}
   */
  get(engineId) {
    return this.adapters.get(engineId) || null;
  }

  /**
   * Retorna todos os adapters registrados.
   */
  getAll() {
    return Array.from(this.adapters.values());
  }

  /**
   * Resolve o adapter mais apropriado com base no resultado da detecção.
   * @param {object} detectionResult
   * @returns {BaseEngineAdapter}
   */
  resolveAdapter(detectionResult) {
    const engineId = detectionResult.engine;
    if (this.adapters.has(engineId)) {
      return this.adapters.get(engineId);
    }

    // Fallbacks para variantes
    if (engineId === "mz" || engineId === "mv") {
      if (this.adapters.has("rpgmaker")) return this.adapters.get("rpgmaker");
      if (this.adapters.has("mv")) return this.adapters.get("mv");
      if (this.adapters.has("mz")) return this.adapters.get("mz");
    }

    if (engineId === "krkrz" && this.adapters.has("krkr")) {
      return this.adapters.get("krkr");
    }

    // Retorna generic como último recurso
    return this.adapters.get("generic") || null;
  }
}

// Instância singleton global
const defaultRegistry = new EngineRegistry();
module.exports = defaultRegistry;
