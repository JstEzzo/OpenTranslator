/**
 * OpenTranslator — job_persistence_117k_realistic.test.js
 * Teste rigoroso de persistência de job com duas suítes independentes:
 * 1. SCENARIO A: Volume do Log Histórico (60.169 + 9.223 + 47.722 = 117.114)
 * 2. SCENARIO B: Dataset Real de Toki kan Yuusha em Disco (54.387 + 15.002 + 3 + 47.722 = 117.114)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const TranslationAccounting = require("../core/translationAccounting");
const jobPersistence = require("../core/jobPersistence");

async function run() {
  console.log("=== TEST SUITE: Job Persistence 117k (Historical Log & Real Dataset) ===");

  const total = 117114;

  // --------------------------------------------------------------------
  // CENÁRIO A: Volume do Log Histórico Original
  // --------------------------------------------------------------------
  console.log("  >>> Scenario A: Historical Log Volume (60.169 + 9.223 + 47.722)...");
  const localLogCount = 60169;
  const globalLogCount = 9223;
  const pendingLogCount = 47722;

  const accA = new TranslationAccounting(total);
  for (let i = 0; i < localLogCount; i++) accA.registerCached(`loc_${i}`, true, true);
  for (let i = 0; i < globalLogCount; i++) accA.registerCached(`glob_${i}`, false, true);

  assert.strictEqual(accA.pending, pendingLogCount, "Pending must be 47.722");
  assert.strictEqual(accA.validateIntegrity().valid, true);

  const jobStateA = {
    jobId: "toki_scenario_a_test",
    gameId: "toki_gitgud",
    engine: "mz",
    targetLang: "pt_BR",
    provider: "google:gtx",
    totalExtracted: total,
    cachedTexts: localLogCount + globalLogCount,
    completedTexts: 0,
    pendingCount: accA.pending,
    cooldownUntil: new Date(Date.now() + 600000).toISOString()
  };

  jobPersistence.saveJob(jobStateA);
  const loadedA = jobPersistence.loadJob("toki_scenario_a_test");
  assert.ok(loadedA);
  assert.strictEqual(loadedA.totalExtracted, total);
  assert.strictEqual(loadedA.cachedTexts, 69392);
  assert.strictEqual(loadedA.pendingCount, 47722);
  jobPersistence.deleteJob("toki_scenario_a_test");
  console.log("  ✓ Scenario A passed: Historical log volume persisted and resumed with 0 leaks.");

  // --------------------------------------------------------------------
  // CENÁRIO B: Dataset Real Auditado em Disco
  // --------------------------------------------------------------------
  console.log("  >>> Scenario B: Real Disk Dataset (54.387 applied + 15.002 script + 3 unmatched + 47.722 pending)...");
  const appliedCount = 54387;
  const scriptCount = 15002;
  const unmatchedCount = 3;
  const pendingRealCount = 47722;

  const accB = new TranslationAccounting(total);
  for (let i = 0; i < appliedCount; i++) accB.registerCached(`app_${i}`, true, true);
  for (let i = 0; i < scriptCount; i++) accB.registerCached(`scr_${i}`, true, false, "NOT_PATCHABLE_SCRIPT");
  for (let i = 0; i < unmatchedCount; i++) accB.registerUnmatchedCache(`unm_${i}`);

  assert.strictEqual(accB.pending, pendingRealCount);
  assert.strictEqual(accB.validateIntegrity().valid, true);

  const jobStateB = {
    jobId: "toki_scenario_b_test",
    gameId: "toki_gitgud",
    engine: "mz",
    targetLang: "pt_BR",
    provider: "google:gtx",
    totalExtracted: total,
    cachedApplied: appliedCount,
    cachedNotPatchable: scriptCount,
    cachedUnmatched: unmatchedCount,
    pendingCount: accB.pending,
    cooldownUntil: new Date(Date.now() + 600000).toISOString()
  };

  jobPersistence.saveJob(jobStateB);
  const loadedB = jobPersistence.loadJob("toki_scenario_b_test");
  assert.ok(loadedB);
  assert.strictEqual(loadedB.totalExtracted, total);
  assert.strictEqual(loadedB.pendingCount, 47722);
  assert.strictEqual(loadedB.cachedApplied, 54387);
  assert.strictEqual(loadedB.cachedNotPatchable, 15002);
  assert.strictEqual(loadedB.cachedUnmatched, 3);
  jobPersistence.deleteJob("toki_scenario_b_test");
  console.log("  ✓ Scenario B passed: Real dataset volume persisted and resumed cleanly.");

  console.log("✓ PASS: Job Persistence 117k Realistic (Scenarios A & B) Complete.\n");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
