'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const metadata = new Set(['index.html', 'plugins.js_bak', 'js_plugins_bak', 'cheat_overlay.js_bak', '.ot_backup_manifest.json']);
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function walk(root, relative = '', files = [], dirs = []) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const rel = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Backup contem link simbolico: ' + rel);
    if (entry.isDirectory()) { dirs.push(rel); walk(root, rel, files, dirs); }
    else if (entry.isFile()) files.push(rel);
    else throw new Error('Tipo de arquivo nao suportado: ' + rel);
  }
  return files;
}
function restoreGameData(backupDir) {
  let stage = null;
  let previous = null;
  let original = null;
  let swapped = false;
  try {
    if (!backupDir || !/_bak_\d+$/.test(path.basename(backupDir))) throw new Error('Nome de backup invalido');
    const backup = path.resolve(backupDir);
    if (!fs.lstatSync(backup).isDirectory() || fs.lstatSync(backup).isSymbolicLink()) throw new Error('Backup deve ser diretorio fisico');
    // Resolve the parent once so all temporary paths remain siblings of the actual backup.
    const parent = fs.realpathSync(path.dirname(backup));
    const source = path.join(parent, path.basename(backup));
    original = path.join(parent, path.basename(backup).replace(/_bak_\d+$/, ''));
    if (fs.existsSync(original) && fs.lstatSync(original).isSymbolicLink()) throw new Error('Destino de restauracao e um link');
    const dirs = [];
    const files = walk(source, '', [], dirs).filter(rel => rel !== '.ot_backup_manifest.json');
    const manifestPath = path.join(source, '.ot_backup_manifest.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
    const expected = new Map(files.map(rel => [rel, hash(path.join(source, rel))]));
    if (manifest && (Object.keys(manifest.files).length !== files.length ||
        files.some(rel => manifest.files[rel] !== expected.get(rel)))) throw new Error('Backup diverge do manifesto original');
    stage = fs.mkdtempSync(path.join(parent, '.ot_restore_'));
    for (const rel of dirs.filter(rel => !metadata.has(rel.split(path.sep)[0]))) fs.mkdirSync(path.join(stage, rel), { recursive: true });
    const dataFiles = files.filter(rel => !metadata.has(rel.split(path.sep)[0]));
    for (const rel of dataFiles) {
      const dst = path.join(stage, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(source, rel), dst);
      if (hash(dst) !== expected.get(rel)) throw new Error('Copia de restauracao divergente: ' + rel);
    }
    // Preserve the existing game data until the replacement has been copied and verified.
    if (fs.existsSync(original)) {
      previous = path.join(parent, '.ot_previous_' + crypto.randomBytes(12).toString('hex'));
      fs.renameSync(original, previous);
    }
    try { fs.renameSync(stage, original); stage = null; swapped = true; }
    catch (err) {
      if (previous && !fs.existsSync(original)) { fs.renameSync(previous, original); previous = null; }
      throw err;
    }
    const restored = [...dataFiles];
    const extraFiles = [];
    if (expected.has('cheat_overlay.js_bak')) extraFiles.push(['cheat_overlay.js_bak', path.join(parent, 'CheatOverlay.js')]);
    if (expected.has('index.html')) extraFiles.push(['index.html', path.join(parent, 'index.html')]);
    if (expected.has('plugins.js_bak')) extraFiles.push(['plugins.js_bak', path.join(parent, 'js', 'plugins.js')]);
    for (const rel of files.filter(rel => rel.startsWith('js_plugins_bak' + path.sep))) {
      extraFiles.push([rel, path.join(parent, 'js', 'plugins', rel.slice('js_plugins_bak'.length + 1))]);
    }
    for (const [rel, dst] of extraFiles) {
      // Do not follow a junction or symlink outside this game's directory.
      let dir = path.dirname(dst);
      while (dir !== parent) {
        if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error('Destino extra e um link: ' + dir);
        dir = path.dirname(dir);
      }
      if (fs.existsSync(dst) && fs.lstatSync(dst).isSymbolicLink()) throw new Error('Arquivo extra e um link: ' + dst);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      const temp = dst + '.ot_restore_' + crypto.randomBytes(8).toString('hex');
      fs.copyFileSync(path.join(source, rel), temp);
      if (hash(temp) !== expected.get(rel)) throw new Error('Arquivo extra divergente: ' + rel);
      fs.renameSync(temp, dst);
      if (hash(dst) !== expected.get(rel)) throw new Error('Verificacao final divergente: ' + rel);
      restored.push(path.relative(parent, dst));
    }
    for (const rel of dataFiles) {
      if (hash(path.join(original, rel)) !== expected.get(rel)) throw new Error('Dados restaurados divergentes: ' + rel);
    }
    const overlay = path.join(parent, 'CheatOverlay.js');
    if (!expected.has('cheat_overlay.js_bak') && fs.existsSync(overlay)) fs.unlinkSync(overlay);
    // Keep the verified original backup. Mark it outside the auto-recovery naming convention.
    const retained = source + '.restored';
    if (fs.existsSync(retained)) throw new Error('Destino de retencao ja existe: ' + retained);
    fs.renameSync(source, retained);
    let cleanupWarning = null;
    if (previous) {
      try { fs.rmSync(previous, { recursive: true, force: true }); previous = null; }
      catch (err) { cleanupWarning = err.message; }
    }
    return { ok: true, success: true, status: 'RESTORED', verified: true, restored,
      backupPreservedAt: retained, previousDataPreservedAt: previous, cleanupWarning };
  } catch (err) {
    // A failed stage has not replaced the live data; after a partial restore keep every recovery source.
    return { ok: false, success: false, status: swapped ? 'PARTIALLY_RESTORED' : 'RESTORE_FAILED',
      error: err.message, backupPreservedAt: backupDir, previousDataPreservedAt: previous, stagedDataAt: stage };
  }
}
function backupGameData(dataDir) {
  const source = fs.realpathSync(dataDir);
  const files = walk(source);
  if (fs.readdirSync(source).some(name => metadata.has(name))) throw new Error('Dados usam nome reservado do backup legado');
  const backup = source + '_bak_' + Date.now() + crypto.randomInt(1000, 10000);
  fs.mkdirSync(backup);
  fs.cpSync(source, backup, { recursive: true });
  const expected = Object.create(null);
  for (const rel of files) {
    expected[rel] = hash(path.join(source, rel));
    if (hash(path.join(backup, rel)) !== expected[rel]) throw new Error('Backup divergente: ' + rel);
  }
  const parent = path.dirname(source);
  const extras = [ ['cheat_overlay.js_bak', path.join(parent, 'CheatOverlay.js')], ['index.html', path.join(parent, 'index.html')], ['plugins.js_bak', path.join(parent, 'js', 'plugins.js')] ];
  const plugins = path.join(parent, 'js', 'plugins');
  if (fs.existsSync(plugins)) {
    for (const rel of walk(plugins)) extras.push([path.join('js_plugins_bak', rel), path.join(plugins, rel)]);
  }
  for (const [rel, src] of extras) {
    if (!fs.existsSync(src)) continue;
    if (fs.lstatSync(src).isSymbolicLink()) throw new Error('Backup extra e um link');
    const dst = path.join(backup, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
    expected[rel] = hash(src);
    if (hash(dst) !== expected[rel]) throw new Error('Backup extra divergente: ' + rel);
  }
  fs.writeFileSync(path.join(backup, '.ot_backup_manifest.json'), JSON.stringify({ files: expected }, null, 2));
  return backup;
}
module.exports = { restoreGameData, backupGameData };
