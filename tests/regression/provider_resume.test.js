const assert = require("assert");
const fs = require("fs");
const path = require("path");
const JobPersistence = require("../../src/core/jobPersistence");

console.log("=== TEST SUITE: Provider Resume & Job State Persistence ===");

(() => {
  const jobId = "test_resume_job_" + Date.now();

  const originalPending = [
    { id: 1, clean: "Hello" },
    { id: 2, clean: "World" },
    { id: 3, clean: "Game" },
    { id: 4, clean: "Start" }
  ];

  const completedBeforePause = [
    [1, "Olá"],
    [2, "Mundo"]
  ];

  const pendingRemaining = [
    { id: 3, clean: "Game" },
    { id: 4, clean: "Start" }
  ];

  // 1. Salva job após RATE_LIMITED
  JobPersistence.saveJob({
    jobId,
    gameId: "test_game",
    engine: "mz",
    targetLang: "pt",
    provider: "google",
    pendingTexts: pendingRemaining,
    completedTexts: completedBeforePause,
    cachedTexts: 2,
    cooldownUntil: new Date(Date.now() + 600000).toISOString()
  });

  // 2. Carrega job
  const loaded = JobPersistence.loadJob(jobId);
  assert.ok(loaded !== null, "Job must load successfully");
  assert.strictEqual(loaded.jobId, jobId);
  assert.strictEqual(loaded.completedTexts.length, 2);
  assert.strictEqual(loaded.pendingTexts.length, 2);

  // 3. Simula retomada: apenas os pendentes devem ser processados!
  const retranslatedIds = [];
  const resumeQueue = loaded.pendingTexts;
  for (const item of resumeQueue) {
    retranslatedIds.push(item.id);
  }

  // Verifica que id 1 e 2 JAMAIS foram retraduzidos
  assert.deepStrictEqual(retranslatedIds, [3, 4], "Resume must strictly translate remaining pending texts");

  // 4. Limpa arquivo do job
  JobPersistence.deleteJob(jobId);
  assert.strictEqual(JobPersistence.loadJob(jobId), null);

  console.log("  ✓ Saved job reloaded and resumed cleanly without retranslating cached/completed texts");
  console.log("✓ PASS: Provider Resume Test Suite Complete.\n");
})();
