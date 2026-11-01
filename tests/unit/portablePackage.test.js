'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
fs.mkdirSync(path.resolve(__dirname, '../../scratch'), { recursive: true });
const crypto = require('crypto');
const { buildRelease } = require('../../tools/package_release');
const temp = fs.mkdtempSync(path.resolve(__dirname, '../../scratch/package-test-'));
let pass = 0, fail = 0;
function write(root, rel, content = 'fixture') { const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function fixture() {
  const root = fs.mkdtempSync(path.join(temp, 'source-'));
  for (const rel of ['server.js','package-lock.json','README.md','src/services/httpServer.js','src/core/shutdownCoordinator.js',
    'ui/index.html','ui/app.js','ui/xssGuard.js','node_modules/better-sqlite3/package.json','node_modules/ws/package.json','node_modules/exceljs/package.json',
    'data/private.json','src/data/private.json','src/services/cache.js.bak_old','tools/patch.js']) write(root, rel);
  write(root, 'package.json', JSON.stringify({ version: '9.8.7' })); write(root, 'launcher.exe', 'MZfixture'); write(root, 'node.exe', 'MZnode');
  return root;
}
function build(root, outputDir, probeRuntime = () => ({ sqlite: true })) {
  return buildRelease({ root, outputDir, nodeBinary: path.join(root, 'node.exe'), launcherBinary: path.join(root, 'launcher.exe'), probeRuntime });
}
function test(name, fn) { try { fn(); pass++; console.log('ok ' + name); } catch(e) { fail++; console.error('FAIL ' + name, e); } }
try {
  test('portable package includes dependencies, runtime, source and matching checksums; excludes private data', () => {
    const root = fixture(); const { outputDir, manifest } = build(root, path.join(temp, 'bundle'));
    for (const rel of ['data/private.json','src/data/private.json','src/services/cache.js.bak_old','tools/patch.js']) assert(!fs.existsSync(path.join(outputDir, rel)), rel);
    assert(fs.existsSync(path.join(outputDir, 'bin/node.exe'))); assert.strictEqual(manifest.version, '9.8.7');
    for (const entry of manifest.files) {
      const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(outputDir, entry.path))).digest('hex');
      assert.strictEqual(actual, entry.sha256);
    }
  });
  test('standard strips verified development inputs but preserves licenses and the native addon', () => {
    const root = fixture();
    for (const rel of ['loaders/inject.exe', 'loaders/MToolWolfCache', 'node_modules/exceljs/dist/exceljs.min.js',
      'node_modules/better-sqlite3/deps/sqlite3/sqlite3.c', 'node_modules/@types/node/index.d.ts', 'src/Tool/private.json',
      'node_modules/better-sqlite3/build/Release/better_sqlite3.node', 'node_modules/better-sqlite3/LICENSE', 'resources/game.map']) write(root, rel);
    const { outputDir, manifest } = build(root, path.join(temp, 'lean'));
    for (const rel of ['loaders/inject.exe', 'loaders/MToolWolfCache', 'node_modules/exceljs/dist', 'node_modules/better-sqlite3/deps', 'node_modules/@types', 'src/Tool']) assert(!fs.existsSync(path.join(outputDir, rel)), rel);
    for (const rel of ['node_modules/better-sqlite3/build/Release/better_sqlite3.node', 'node_modules/better-sqlite3/LICENSE', 'resources/game.map']) assert(fs.existsSync(path.join(outputDir, rel)), rel);
    assert.strictEqual(manifest.profile, 'standard'); assert(manifest.excluded.some(row => row.reason === 'optional-native-injector'));
  });
  test('complete profile retains optional injector and rejects unknown profiles', () => {
    const root = fixture(); write(root, 'loaders/inject.exe');
    const result = buildRelease({ root, outputDir: path.join(temp, 'complete'), profile: 'complete', nodeBinary: path.join(root, 'node.exe'), launcherBinary: path.join(root, 'launcher.exe'), probeRuntime: () => ({ sqlite: true }) });
    assert(fs.existsSync(path.join(result.outputDir, 'loaders/inject.exe')));
    assert.throws(() => buildRelease({ root, outputDir: path.join(temp, 'invalid'), profile: 'invalid' }), /Perfil invalido/);
  });
  test('existing destination and source ancestors are refused without deletion', () => {
    const root = fixture(); const existing = path.join(temp, 'existing'); write(existing, 'keep.txt', 'KEEP');
    assert.throws(() => build(root, existing), /ja existe/); assert.strictEqual(fs.readFileSync(path.join(existing, 'keep.txt'), 'utf8'), 'KEEP');
    assert.throws(() => build(root, temp), /fora da arvore/);
  });
  test('missing dependency prevents release manifest', () => {
    const root = fixture(); fs.unlinkSync(path.join(root, 'node_modules/ws/package.json')); const out = path.join(temp, 'incomplete');
    assert.throws(() => build(root, out), /incompleto/); assert(!fs.existsSync(path.join(out, 'RELEASE_MANIFEST.json')));
  });
  test('failed native runtime probe prevents release manifest', () => {
    const root = fixture(); const out = path.join(temp, 'bad-native');
    assert.throws(() => build(root, out, () => { throw Error('ABI incorreta'); }), /ABI/);
    assert(!fs.existsSync(path.join(out, 'RELEASE_MANIFEST.json')));
  });
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log(`pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0;
