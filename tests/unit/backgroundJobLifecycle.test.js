'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
fs.mkdirSync(path.resolve(__dirname, '../../scratch'), { recursive: true });
const vm = require('vm');
const temp = fs.mkdtempSync(path.resolve(__dirname, '../../scratch/job-test-'));
global.ROOT = temp;
const jobs = require('../../src/core/jobSystem');
let pass = 0, fail = 0;
async function test(name, fn) { try { await fn(); pass++; console.log('ok ' + name); } catch (e) { fail++; console.error('FAIL ' + name, e); } }
function service(result, shuttingDown = false) {
  const tracked = [];
  const pipeline = { run: async () => result };
  const mocks = {
    './strategyPlanner': {}, './transactionJournal': {}, './engineDetector': { detect: async () => ({ engine: 'fixture' }) },
    './engineRegistry': {}, './translationPipeline': class { constructor() { return pipeline; } }, './jobSystem': jobs,
    './ownedProcess': {}, './backupManager': class {}, './selfTest': {}, './diagnosticBundle': {}, './translationMemory': {},
    './shutdownCoordinator': { isShuttingDown: () => shuttingDown, trackOperation: p => { tracked.push(p); return p; } },
  };
  const context = { module: { exports: {} }, require: name => name === 'fs' ? fs : name === 'path' ? path : name === 'child_process' ? {} : mocks[name] };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../src/core/gameService.js'), 'utf8'), context);
  return { instance: context.module.exports, tracked };
}
(async () => {
  await test('background translation job completes and persists its real state', async () => {
    const { instance, tracked } = service({ success: true, totalStrings: 3 });
    const result = await instance.startTranslationJob(temp); assert(result.ok); assert.strictEqual(tracked.length, 1); await tracked[0];
    const job = jobs.getJob(result.jobId); assert.strictEqual(job.state, 'COMPLETED'); assert.strictEqual(job.progress, 100);
    assert(jobs.loadCheckpoint(result.jobId).result.success);
  });
  await test('background translation failure persists FAILED instead of rejecting unobserved', async () => {
    const { instance, tracked } = service({ success: false, error: 'provider down' });
    const result = await instance.startTranslationJob(temp); await tracked[0];
    const job = jobs.getJob(result.jobId); assert.strictEqual(job.state, 'FAILED'); assert(job.errors.includes('provider down'));
  });
  await test('shutdown refuses new jobs', async () => {
    const { instance, tracked } = service({}, true); const result = await instance.startTranslationJob(temp);
    assert.strictEqual(result.ok, false); assert.strictEqual(tracked.length, 0);
  });
})().finally(() => { fs.rmSync(temp, { recursive: true, force: true }); console.log(`pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0; });
