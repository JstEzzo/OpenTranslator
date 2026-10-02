const assert = require('assert');
const jobPersistence = require('../../src/core/jobPersistence');

console.log('=== TEST SUITE 6: Translation Job State & Resume Persistence ===');

(() => {
  const jobId = 'test_resume_job_' + Date.now();
  const state = {
    jobId,
    gameId: 'TestGame',
    engine: 'renpy',
    totalTexts: 100,
    completedBatches: 3,
    translatedMap: { '1': 'Texto um', '2': 'Texto dois' }
  };

  const savedPath = jobPersistence.saveJob(state);
  assert.ok(savedPath, 'Path should be returned');

  const loaded = jobPersistence.loadJob(jobId);
  assert.strictEqual(loaded.jobId, jobId);
  assert.strictEqual(loaded.completedBatches, 3);
  assert.strictEqual(loaded.translatedMap['1'], 'Texto um');

  const deleted = jobPersistence.deleteJob(jobId);
  assert.strictEqual(deleted, true);
  assert.strictEqual(jobPersistence.loadJob(jobId), null);

  console.log('  ✓ Job state save, reload, and cleanup verified');
  console.log('✓ PASS: Translation Resume Test Suite Complete.\n');
})();
