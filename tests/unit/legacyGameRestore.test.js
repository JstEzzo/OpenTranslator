'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { backupGameData, restoreGameData } = require('../../src/core/legacyGameRestore');
let pass = 0, fail = 0;
const root = fs.mkdtempSync(path.resolve(__dirname, '../../scratch/restore-test-'));
function game() {
  const dir = fs.mkdtempSync(path.join(root, 'game-'));
  fs.mkdirSync(path.join(dir, 'data', 'empty'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'js', 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'Actors.json'), 'ORIGINAL');
  fs.writeFileSync(path.join(dir, 'index.html'), '<head></head>');
  fs.writeFileSync(path.join(dir, 'js', 'plugins.js'), 'PLUGINS');
  fs.writeFileSync(path.join(dir, 'js', 'plugins', 'existing.js'), 'PLUGIN');
  return dir;
}
function test(name, fn) { try { fn(); pass++; console.log('ok ' + name); } catch (e) { fail++; console.error('FAIL ' + name, e); } }
try {
  test('round trip restores data, HTML, plugins and empty directories; retains original backup', () => {
    const dir = game(); fs.writeFileSync(path.join(dir, 'CheatOverlay.js'), 'USER OVERLAY');
    const bak = backupGameData(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'data', 'Actors.json'), 'TRANSLATED');
    fs.writeFileSync(path.join(dir, 'index.html'), 'INJECTED'); fs.writeFileSync(path.join(dir, 'CheatOverlay.js'), 'NEW');
    const r = restoreGameData(bak); assert.strictEqual(r.ok, true); assert.strictEqual(r.verified, true);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'data', 'Actors.json'), 'utf8'), 'ORIGINAL');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), '<head></head>');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'CheatOverlay.js'), 'utf8'), 'USER OVERLAY');
    assert(fs.existsSync(path.join(dir, 'data', 'empty'))); assert(fs.existsSync(r.backupPreservedAt));
    assert(!fs.existsSync(path.join(dir, 'data', 'plugins.js_bak')));
    assert(!fs.existsSync(path.join(dir, 'data', '.ot_backup_manifest.json')));
  });
  test('corrupt original backup is rejected before replacing live data', () => {
    const dir = game(); const bak = backupGameData(path.join(dir, 'data'));
    fs.writeFileSync(path.join(bak, 'Actors.json'), 'CORRUPT');
    fs.writeFileSync(path.join(dir, 'data', 'Actors.json'), 'CURRENT');
    const r = restoreGameData(bak); assert.strictEqual(r.ok, false);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'data', 'Actors.json'), 'utf8'), 'CURRENT'); assert(fs.existsSync(bak));
  });
  test('corruption during restore copy leaves live data untouched', () => {
    const dir = game(); const bak = backupGameData(path.join(dir, 'data')); const copy = fs.copyFileSync;
    fs.writeFileSync(path.join(dir, 'data', 'Actors.json'), 'CURRENT');
    try {
      fs.copyFileSync = (src, dst) => { copy(src, dst); if (String(dst).includes('.ot_restore_')) fs.writeFileSync(dst, 'CORRUPT'); };
      assert.strictEqual(restoreGameData(bak).ok, false);
      assert.strictEqual(fs.readFileSync(path.join(dir, 'data', 'Actors.json'), 'utf8'), 'CURRENT');
    } finally { fs.copyFileSync = copy; }
  });
  test('invalid backup name does not delete the target directory', () => {
    const dir = game(); assert.strictEqual(restoreGameData(path.join(dir, 'data')).ok, false);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'data', 'Actors.json'), 'utf8'), 'ORIGINAL');
  });
  test('new injected overlay removed when no previous overlay existed', () => {
    const dir = game(); const bak = backupGameData(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'CheatOverlay.js'), 'INJECTED');
    assert.strictEqual(restoreGameData(bak).ok, true); assert(!fs.existsSync(path.join(dir, 'CheatOverlay.js')));
  });
  test('partial HTML copy failure preserves recovery data and does not claim success', () => {
    const dir = game(); const bak = backupGameData(path.join(dir, 'data')); const copy = fs.copyFileSync;
    try {
      fs.copyFileSync = (src, dst) => { if (path.basename(src) === 'index.html') throw new Error('disk failure'); copy(src, dst); };
      const r = restoreGameData(bak); assert.strictEqual(r.ok, false); assert(fs.existsSync(bak));
      assert(fs.existsSync(r.previousDataPreservedAt));
    } finally { fs.copyFileSync = copy; }
  });
} finally { fs.rmSync(root, { recursive: true, force: true }); }
console.log(`pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0;
