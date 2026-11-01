'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { parseArgs, runSuite } = require('../index');
const root = path.resolve(__dirname, '../..');
const scratch = path.join(root, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
const temp = fs.mkdtempSync(path.join(scratch, 'audit-contracts-'));
let pass = 0;
let fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`ok ${name}`); }
  catch (err) { fail++; console.error(`FAIL ${name}: ${err.stack}`); }
}

try {
  test('unknown arguments fail even alongside a valid group', () => {
    assert.throws(() => parseArgs(['--unit', '--securty']), /desconhecido/);
    assert.deepStrictEqual(parseArgs(['--unit', '--bail']), { groups: ['unit'], bail: true });
  });
  function fixture(output) {
    const file = path.join(temp, 'suite.js');
    fs.writeFileSync(file, `console.log(${JSON.stringify(output)});`);
    return runSuite({ file: path.relative(root, file) });
  }
  test('runner rejects an empty successful summary', () => {
    assert.strictEqual(fixture('pass=0 fail=0').fail, 1);
  });
  test('runner rejects failures hidden by a later successful summary', () => {
    assert.strictEqual(fixture('pass=3 fail=1\npass=4 fail=0').fail, 1);
  });
  test('runner uses final totals, not incidental log contents', () => {
    assert.strictEqual(fixture('example pass=99 fail=0\npass=2 fail=0').pass, 2);
  });
  test('bootstrap never kills port owners or a stale PID; shutdown keeps another instance PID', () => {
    const signals = {};
    const kills = [];
    let deleted = false;
    const context = {
      __dirname: root, console: { log() {} },
      process: { pid: 123, platform: 'win32', env: {}, on: (name, fn) => { signals[name] = fn; } },
      setTimeout() {},
      require(name) {
        if (name === 'fs') return {
          existsSync: () => true, mkdirSync() {}, createWriteStream: () => ({}),
          readFileSync: () => '456', unlinkSync() { deleted = true; },
        };
        if (name === 'path') return path;
        if (name === 'child_process') return { spawnSync: (...args) => kills.push(args) };
        if (name === 'https') return { Agent: class {} };
        if (name.endsWith('loggerManager')) return { setLogPath() {} };
        if (name.endsWith('/logger')) { context.global.log = () => {}; return {}; }
        if (name.endsWith('/httpServer')) return { tryListen() {}, server: null };
        if (name.endsWith('/cheatServer')) return { startHookServer: () => Promise.resolve(), stopHookServer() {} };
        if (name.endsWith('/cache')) return {};
        throw new Error(`unexpected import ${name}`);
      },
    };
    context.global = context;
    vm.runInNewContext(fs.readFileSync(path.join(root, 'server.js'), 'utf8'), context);
    assert.deepStrictEqual(kills, []);
    context.shutdownAll();
    assert.strictEqual(deleted, false);
    assert.deepStrictEqual(kills, []);
  });
  test('resource resolver keeps data and loaders within the product directory', () => {
    const resolver = require('../../src/utils/resourceResolver');
    assert.strictEqual(resolver.getRootDir(), root);
    assert.strictEqual(resolver.getDataDir(), path.join(root, 'data'));
    assert.strictEqual(resolver.getLoadersDir(), path.join(root, 'loaders'));
  });
  test('relocated modules bootstrap ROOT at product root', () => {
    for (const file of ['src/services/cache.js', 'src/services/httpServer.js', 'src/translation/translator.js', 'src/utils/utils.js']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const init = source.split(/\r?\n/).find(line => line.startsWith('if (!global.ROOT)'));
      const context = { global: {}, path, __dirname: path.dirname(path.join(root, file)) };
      vm.runInNewContext(init, context);
      assert.strictEqual(context.global.ROOT, root, file);
    }
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`pass=${pass} fail=${fail}`);
process.exitCode = fail ? 1 : 0;
