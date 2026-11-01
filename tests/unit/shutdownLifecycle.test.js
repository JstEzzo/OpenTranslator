'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
fs.mkdirSync(path.resolve(__dirname, '../../scratch'), { recursive: true });
const vm = require('vm');
let pass = 0, fail = 0;
async function test(name, fn) { try { await fn(); pass++; console.log('ok ' + name); } catch (e) { fail++; console.error('FAIL ' + name, e); } }
const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(root, 'scratch', 'shutdown-test-'));
function setup(overrides = {}) {
  const events = [], signals = {};
  const globals = { DATA_DIR: temp };
  const fakeProcess = { pid: 345, exit: code => events.push('exit:' + code), on: (sig, fn) => { signals[sig] = fn; } };
  const modules = {
    '../services/httpServer': { server: { listening: true, close: callback => setTimeout(() => { events.push('http'); callback(); }, 10) } },
    '../services/cheatServer': { stopHookServer: async () => { events.push('hook'); } },
    './ownedProcessRegistry': { isOwned: () => true, shutdownAll: () => { events.push('processes'); return { blocked: 0 }; } },
    './gameEngine': { restoreGameData: async () => { await new Promise(r => setTimeout(r, 25)); events.push('restore'); return { ok: true, verified: true }; } },
    '../services/cache': { closeDb: () => { events.push('db'); return { ok: true }; } },
    './translationMemory': { db: { open: true, close: () => events.push('memory') } },
    ...overrides,
  };
  const context = { global: globals, process: fakeProcess, console, module: { exports: {} }, setTimeout, clearTimeout,
    require: name => name === 'fs' ? fs : name === 'path' ? path : modules[name] || (() => { throw new Error(name); })() };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/core/shutdownCoordinator.js'), 'utf8'), context);
  return { c: context.module.exports, globals, events, signals };
}
(async () => {
  await test('shutdown waits for active operation and async restore before closing databases', async () => {
    const { c, globals, events } = setup(); globals.launchedBak = 'backup';
    c.trackOperation(new Promise(r => setTimeout(() => { events.push('job'); r(); }, 35)));
    const a = c.performShutdown('test'); const b = c.performShutdown('again');
    assert.strictEqual(a, b); const report = await a;
    assert.strictEqual(report.exitCode, 0); assert(events.indexOf('job') < events.indexOf('restore'));
    assert(events.indexOf('restore') < events.indexOf('db')); assert.strictEqual(globals.launchedBak, null);
    assert.strictEqual(events.filter(x => x === 'restore').length, 1);
  });
  await test('pending timer keeps backup; shutdown cancels timer and restores once', async () => {
    const { c, globals, events } = setup(); c.scheduleGameRestore('pending', 60000);
    assert.strictEqual(globals.launchedBak, 'pending'); await c.performShutdown();
    assert.strictEqual(globals.restoreTimeout, null); assert.strictEqual(events.filter(x => x === 'restore').length, 1);
  });
  await test('restore failure remains recoverable and returns nonzero exit', async () => {
    const { c, globals } = setup({ './gameEngine': { restoreGameData: () => ({ ok: false, error: 'disk' }) } });
    globals.launchedBak = 'pending'; const r = await c.performShutdown();
    assert.strictEqual(r.exitCode, 1); assert.strictEqual(globals.launchedBak, 'pending');
  });
  await test('unregistered legacy PID is never killed and its backup is preserved', async () => {
    const { c, globals, events } = setup({ './ownedProcessRegistry': { isOwned: () => false, shutdownAll: () => ({ blocked: 0 }) } });
    globals.launchedBak = 'pending'; globals.launchedProc = { pid: 88, exitCode: null };
    const r = await c.performShutdown(); assert.strictEqual(r.exitCode, 1); assert(!events.includes('restore'));
    assert.strictEqual(globals.launchedBak, 'pending');
  });
  await test('another instance PID file is preserved', async () => {
    fs.writeFileSync(path.join(temp, 'server.pid'), '999'); await setup().c.performShutdown();
    assert.strictEqual(fs.readFileSync(path.join(temp, 'server.pid'), 'utf8'), '999');
    fs.writeFileSync(path.join(temp, 'server.pid'), '345'); await setup().c.performShutdown();
    assert.strictEqual(fs.existsSync(path.join(temp, 'server.pid')), false);
  });
  await test('drain timeout preserves backup and avoids closing a database under active writes', async () => {
    const { c, globals, events } = setup(); globals.launchedBak = 'pending'; c.trackOperation(new Promise(() => {}));
    const r = await c.performShutdown('timeout', 0, { timeoutMs: 20 });
    assert.strictEqual(r.exitCode, 1); assert(!events.includes('restore')); assert(!events.includes('db'));
  });
  await test('injector exit alone never triggers restoration over an unverified detached game', async () => {
    const { c, globals, events } = setup(); globals.launchedBak = 'pending'; globals.unverifiedDetachedGameProcess = true;
    const r = await c.performShutdown(); assert.strictEqual(r.exitCode, 1); assert(!events.includes('restore'));
    assert.strictEqual(globals.launchedBak, 'pending');
  });
  await test('logging failure does not interrupt teardown or restoration', async () => {
    const { c, globals } = setup(); globals.launchedBak = 'pending'; globals.log = () => { throw Error('logger'); };
    const r = await c.performShutdown(); assert.strictEqual(r.exitCode, 0); assert.strictEqual(globals.launchedBak, null);
  });
  await test('signals are registered once'  , () => {
    const { c, signals } = setup(); c.installSignalHandlers(); c.installSignalHandlers();
    assert.deepStrictEqual(Object.keys(signals).sort(), ['SIGHUP', 'SIGINT', 'SIGTERM']);
  });
})().finally(() => { fs.rmSync(temp, { recursive: true, force: true }); console.log(`pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0; });
