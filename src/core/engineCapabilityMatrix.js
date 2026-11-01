"use strict";
const fs = require("fs");
const path = require("path");
const catalogue = require("../../config/engineCompatibility.json");
const adapters = new Set(["rpgmaker", "renpy", "unity", "wolf", "rgss", "godot", "electron", "unreal", "gamemaker", "construct", "defold", "gdevelop", "cocos", "generic"]);
// Implementation is scoped separately from evidence. Unknown is not a passed test.
function declarations() {
  return catalogue.profiles.map(profile => ({
    engine: profile.id, name: profile.name, versions: [profile.versions], status: profile.status,
    staticTranslation: adapters.has(profile.id), runtimeTranslation: profile.id === "rpgmaker" ? true : null,
    packagedResources: null, fonts: null, images: null, audio: null, binaryFormats: null,
    placeholders: adapters.has(profile.id) ? true : null, pluralization: null,
    detection: "NOT_CERTIFIED", inspection: "NOT_CERTIFIED", extraction: "NOT_CERTIFIED",
    translation: "NOT_CERTIFIED", application: "NOT_CERTIFIED", launch: "NOT_CERTIFIED",
    runtime: "NOT_CERTIFIED", gameplay: "NOT_CERTIFIED", saveLoad: "NOT_CERTIFIED", rollback: "NOT_CERTIFIED",
    realGamesTested: "Consulte evidências por jogo", notes: profile.coverage,
    evidenceScope: "Implementação parcial; testes de um jogo não certificam uma engine inteira.",
    limitations: [...profile.missing], commonIssue: profile.commonIssue, cheats: profile.cheats,
    sources: [...profile.sources], reviewedAt: catalogue.reviewedAt
  }));
}
class EngineCapabilityMatrix {
  static getAll() { return declarations(); }
  static getDeclarations() { return declarations(); }
  static getEngine(id) { return declarations().find(row => row.engine === id) || null; }
  static getMatrixSummary() {
    const rows = declarations();
    return { total: rows.length, validated: 0, partial: rows.filter(row => row.status === "PARTIAL").length,
      experimental: 0, externalTool: 0, pending: rows.filter(row => row.status === "INCOMPLETE").length };
  }
  static getFormattedTable() {
    return declarations().map(row => ({ ENGINE: row.name, VERSIONS: row.versions.join(", "),
      STATUS: row.status, SCOPE: row.notes, EVIDENCE: row.evidenceScope }));
  }
  static saveMatrixFile(targetDir) {
    const file = path.join(targetDir || path.resolve(__dirname, "../../data"), "capability-matrix.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(declarations(), null, 2), "utf8");
    return file;
  }
}
module.exports = EngineCapabilityMatrix;
