'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function hashFile(file) {
  const fd = fs.openSync(file, 'r');
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.alloc(1024 * 1024);
  try { let count; while ((count = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, count)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}
function listFiles(dir, relative = '', out = []) {
  for (const item of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
    const rel = path.join(relative, item.name);
    if (item.isSymbolicLink()) throw new Error('Link nao permitido no pacote: ' + rel);
    if (item.isDirectory()) listFiles(dir, rel, out);
    else if (item.isFile()) out.push(rel);
  }
  return out;
}
function copyTree(src, dst, skip = () => false, relative = '') {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) throw new Error('Link nao permitido na origem: ' + src);
  if (skip(relative)) return;
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const item of fs.readdirSync(src)) copyTree(path.join(src, item), path.join(dst, item), skip, path.join(relative, item));
  } else if (stat.isFile()) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
}
function compileLauncher(root, destination) {
  const compiler = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
  const result = spawnSync(compiler, ['/nologo', '/target:winexe', '/reference:System.Windows.Forms.dll',
    '/reference:System.Drawing.dll', '/out:' + destination, path.join(root, 'launcher', 'OpenTranslatorLauncher.cs')],
  { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  if (result.error || result.status !== 0) throw new Error('Falha ao compilar launcher: ' + (result.error && result.error.message || result.stderr || result.stdout));
}
function probeRuntime(dir) {
  const code = `const Database=require('better-sqlite3');const db=new Database(':memory:');db.exec('CREATE TABLE probe(v TEXT)');db.prepare('INSERT INTO probe VALUES (?)').run('ok');if(db.prepare('SELECT v FROM probe').get().v!=='ok')throw Error('SQLite');db.close();require('ws');new (require('exceljs').Workbook)();if(process.platform!=='win32'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])!==24)throw Error('Runtime deve ser Node 24 Windows x64');console.log(JSON.stringify({node:process.version,abi:process.versions.modules,sqlite:true,ws:true,exceljs:true}));`;
  const result = spawnSync(path.join(dir, 'bin', 'node.exe'), ['-e', code], {
    cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 30000, env: { ...process.env, NODE_PATH: '' },
  });
  if (result.error || result.status !== 0) throw new Error('Runtime do pacote invalido: ' + (result.error && result.error.message || result.stderr));
  return JSON.parse(result.stdout.trim());
}
function verifyBundle(dir) {
  const required = ['OpenTranslator.exe', 'bin/node.exe', 'server.js', 'package.json', 'package-lock.json',
    'src/services/httpServer.js', 'src/core/shutdownCoordinator.js', 'ui/index.html', 'ui/app.js', 'ui/xssGuard.js',
    'node_modules/better-sqlite3/package.json', 'node_modules/ws/package.json', 'node_modules/exceljs/package.json'];
  const missing = required.filter(rel => !fs.existsSync(path.join(dir, rel)) || !fs.statSync(path.join(dir, rel)).isFile() || fs.statSync(path.join(dir, rel)).size === 0);
  if (missing.length) throw new Error('Pacote incompleto: ' + missing.join(', '));
  return required.length;
}
function buildRelease(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const outputDir = path.resolve(options.outputDir || path.join(root, '..', 'OpenTranslator-release'));
  if (outputDir === root || root.startsWith(outputDir + path.sep) || outputDir.startsWith(root + path.sep)) {
    throw new Error('Destino deve ficar fora da arvore de origem');
  }
  // Never recursively delete a previous release or an arbitrary user-selected folder.
  if (fs.existsSync(outputDir)) throw new Error('Destino ja existe; escolha uma pasta nova: ' + outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const rel of ['server.js', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'OpenTranslator.png']) {
    if (fs.existsSync(path.join(root, rel))) copyTree(path.join(root, rel), path.join(outputDir, rel));
  }
  const skip = rel => rel.split(path.sep).some(name => ['.git', '.agents', '__pycache__', '.cache'].includes(name)) || /\.bak(?:_|$)|\.log$|\.py[co]$/.test(rel);
  for (const dir of ['src', 'ui', 'config', 'resources', 'loaders', 'third-party']) {
    if (fs.existsSync(path.join(root, dir))) copyTree(path.join(root, dir), path.join(outputDir, dir), rel => skip(rel) || (dir === 'src' && (rel === 'data' || rel.startsWith('data' + path.sep))));
  }
  // Production dependencies are installed from the lockfile before invoking this builder.
  copyTree(path.join(root, 'node_modules'), path.join(outputDir, 'node_modules'), skip);
  fs.mkdirSync(path.join(outputDir, 'bin'), { recursive: true });
  fs.copyFileSync(options.nodeBinary || process.execPath, path.join(outputDir, 'bin', 'node.exe'));
  if (options.launcherBinary) fs.copyFileSync(options.launcherBinary, path.join(outputDir, 'OpenTranslator.exe'));
  else compileLauncher(root, path.join(outputDir, 'OpenTranslator.exe'));
  for (const rel of ['data/logs', 'data/transactions', 'data/sessions', 'data/staging', 'gameLib']) fs.mkdirSync(path.join(outputDir, rel), { recursive: true });
  verifyBundle(outputDir);
  const runtime = (options.probeRuntime || probeRuntime)(outputDir);
  const files = listFiles(outputDir).sort().map(rel => ({ path: rel.replace(/\\/g, '/'), size: fs.statSync(path.join(outputDir, rel)).size, sha256: hashFile(path.join(outputDir, rel)) }));
  const optionalTools = ['resources/renpy/python/python.exe', 'loaders/inject.exe', 'resources/godot/gdre_tools.exe']
    .map(rel => ({ path: rel, included: fs.existsSync(path.join(outputDir, rel)) }));
  const manifest = { product: 'OpenTranslator', version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
    architecture: 'win-x64', buildTimestamp: new Date().toISOString(), runtime, optionalTools,
    totalFiles: files.length, totalBytes: files.reduce((sum, f) => sum + f.size, 0), files };
  fs.writeFileSync(path.join(outputDir, 'RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2));
  return { outputDir, manifest };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('Uso: node tools/package_release.js [--output pasta-nova]');
    const result = buildRelease({ outputDir: args[1] });
    console.log(JSON.stringify({ outputDir: result.outputDir, files: result.manifest.totalFiles, bytes: result.manifest.totalBytes, runtime: result.manifest.runtime, optionalTools: result.manifest.optionalTools }, null, 2));
  } catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { buildRelease, verifyBundle, probeRuntime };
