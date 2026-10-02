/**
 * OpenTranslator — EngineRoutingGuard
 * Proteção arquitetural estrita contra resolvers e diagnósticos cross-engine.
 * Impede que diagnósticos específicos de Ren'Py rodem em RPG Maker MZ, Unity, etc.
 */

class EngineRoutingGuard {
  static check(operationName, detectedEngine, supportedEngines = []) {
    const allowed = Array.isArray(supportedEngines) ? supportedEngines : [supportedEngines];
    const normalizedDetected = (detectedEngine || "").toLowerCase().trim();

    const match = allowed.some(a => {
      const normA = a.toLowerCase().trim();
      if (normA === normalizedDetected) return true;
      if ((normA === "rpgmaker" || normA === "mz" || normA === "mv") && (normalizedDetected === "mz" || normalizedDetected === "mv" || normalizedDetected === "rpgmaker")) {
        return true;
      }
      return false;
    });

    if (!match) {
      const err = `[ROUTING_GUARD_BLOCKED] Operação '${operationName}' permitida apenas para [${allowed.join(", ")}], mas a engine do jogo é '${detectedEngine}'.`;
      if (global.log) {
        global.log("warn", err);
      }
      return {
        ok: false,
        allowed: false,
        blocked: true,
        error: "ENGINE_MISMATCH",
        message: err,
        detectedEngine,
        supportedEngines: allowed
      };
    }

    return { ok: true, allowed: true, blocked: false };
  }
}

module.exports = EngineRoutingGuard;
