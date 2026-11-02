'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const BackupManager = require('../../src/core/backupManager');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'opent-backup-session-'));
let passed = 0;
function fixture(name) {
  const dir = path.join(base, name); fs.mkdirSync(dir);
  const file = path.join(dir, 'original.txt'); fs.writeFileSync(file, 'original bytes');
  const manager = new BackupManager();
  const backup = manager.createSessionBackup(dir, [file], { sessionId: 'one' });
  assert.strictEqual(backup.success, true);
  fs.writeFileSync(file, 'modified bytes');
  return { dir, file, manager, backup, saved: path.join(backup.sessionBackupDir, 'original/original.txt') };
}
try {
  {
    const f = fixture('real-restore'); const r = f.manager.restoreSessionBackup(f.dir, { sessionId: 'one' });
    assert.strictEqual(r.success, true, JSON.stringify(r));
    assert.strictEqual(fs.readFileSync(f.file, 'utf8'), 'original bytes');
    assert.deepStrictEqual(r.restoredFiles, ['original.txt']); assert.strictEqual(r.isPerfectRestore, true); passed++;
  }
  for (const mode of ['missing', 'corrupt']) {
    const f = fixture(mode);
    if (mode === 'missing') fs.unlinkSync(f.saved); else fs.writeFileSync(f.saved, 'corrupt backup');
    const r = f.manager.restoreSessionBackup(f.dir, { sessionId: 'one' });
    assert.strictEqual(r.success, false); assert.strictEqual(fs.readFileSync(f.file, 'utf8'), 'modified bytes');
    assert(fs.existsSync(f.backup.sessionBackupDir)); passed++;
  }
  {
    const f = fixture('wrong-session'); const r = f.manager.restoreSessionBackup(f.dir, { sessionId: 'not-found' });
    assert.strictEqual(r.success, false); assert.strictEqual(fs.readFileSync(f.file, 'utf8'), 'modified bytes');
    assert(fs.existsSync(f.saved)); passed++;
  }
  {
    const f = fixture('metadata-traversal'); const m = path.join(f.backup.sessionBackupDir, 'metadata.json');
    const data = JSON.parse(fs.readFileSync(m, 'utf8')); data.files[0].relPath = '../outside.txt'; fs.writeFileSync(m, JSON.stringify(data));
    const r = f.manager.restoreSessionBackup(f.dir, { sessionId: 'one' });
    assert.strictEqual(r.success, false); assert(fs.existsSync(m)); assert(!fs.existsSync(path.join(base, 'outside.txt'))); passed++;
  }
  {
    const f = fixture('failed-write'); const copy = fs.copyFileSync;
    let r;
    try { fs.copyFileSync = (from, to, ...rest) => { if (to === f.file) throw new Error('controlled write failure'); return copy(from, to, ...rest); };
      r = f.manager.restoreSessionBackup(f.dir, { sessionId: 'one' });
    } finally { fs.copyFileSync = copy; }
    assert.strictEqual(r.success, false); assert(fs.existsSync(f.saved)); assert.deepStrictEqual(r.restoredFiles, []); passed++;
  }
  {
    const dir = path.join(base, 'created-files'); fs.mkdirSync(dir);
    const original = path.join(dir, 'original.txt'); fs.writeFileSync(original, 'original');
    const manager = new BackupManager();
    const backup = manager.createSessionBackup(dir, [original], { sessionId: 'created', createdFiles: ['Data/new.txt'] });
    assert.strictEqual(backup.success, true);
    const duplicate = manager.createSessionBackup(dir, [original], { sessionId: 'created' });
    assert.strictEqual(duplicate.success, false); passed++;
    fs.mkdirSync(path.join(dir, 'Data')); fs.writeFileSync(path.join(dir, 'Data/new.txt'), 'created');
    fs.writeFileSync(path.join(dir, 'Data/personal.txt'), 'personal'); fs.writeFileSync(original, 'changed');
    const restored = manager.restoreSessionBackup(dir, { sessionId: 'created' });
    assert.strictEqual(restored.success, true);
    assert.strictEqual(fs.readFileSync(original, 'utf8'), 'original');
    assert(!fs.existsSync(path.join(dir, 'Data/new.txt')));
    assert.strictEqual(fs.readFileSync(path.join(dir, 'Data/personal.txt'), 'utf8'), 'personal'); passed++;
  }
  console.log(`pass=${passed} fail=0`);
} catch (error) { console.error(error); console.log(`pass=${passed} fail=1`); process.exitCode = 1;
} finally { fs.rmSync(base, { recursive: true, force: true }); }
