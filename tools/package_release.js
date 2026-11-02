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
  const code = `(async()=>{const Database=require('better-sqlite3');const db=new Database(':memory:');db.exec('CREATE TABLE probe(v TEXT)');db.prepare('INSERT INTO probe VALUES (?)').run('ok');if(db.prepare('SELECT v FROM probe').get().v!=='ok')throw Error('SQLite');db.close();require('ws');const Excel=require('exceljs');const book=new Excel.Workbook();book.addWorksheet('Probe').getCell('A1').value='ok';const bytes=await book.xlsx.writeBuffer();const readBack=new Excel.Workbook();await readBack.xlsx.load(bytes);if(readBack.getWorksheet('Probe').getCell('A1').value!=='ok')throw Error('Excel round trip');if(process.platform!=='win32'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])!==24)throw Error('Runtime deve ser Node 24 Windows x64');console.log(JSON.stringify({node:process.version,abi:process.versions.modules,sqlite:true,ws:true,exceljs:true,xlsxRoundTrip:true}));})().catch(e=>{console.error(e.message);process.exitCode=1;});`;

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
// Explicit distribution rules: absence of a static import is not proof that an engine file is disposable.
function packageDecision(relative, profile = 'standard') {
  const rel = relative.replace(/\\/g, '/');
  const parts = rel.split('/');
  const directories = ['src','ui','config','resources','loaders','third-party','node_modules'];
  const rootFiles = ['server.js','package.json','package-lock.json','README.md','LICENSE','CHANGELOG.md','OpenTranslator.png','OpenTranslator.exe','bin/node.exe'];
  if (!directories.includes(parts[0]) && !rootFiles.includes(rel)) return { include: false, reason: 'development-user-data-or-unselected-root' };
  if (parts.some(name => ['.git', '.agents', '__pycache__', '.cache'].includes(name))) return { include: false, reason: 'development-or-generated-cache' };
  if (/\.bak(?:_|$)|\.orig$|\.log$|\.py[co]$|\.(?:js|css)\.map$/i.test(rel)) return { include: false, reason: 'backup-log-or-debug-output' };
  if (/^src\/(?:data|Tool)(?:\/|$)/.test(rel)) return { include: false, reason: 'legacy-user-state' };
  if (rel === 'loaders/MToolWolfCache') return { include: false, reason: 'local-tool-cache' };
  if (profile === 'standard' && rel === 'loaders/inject.exe') return { include: false, reason: 'optional-native-injector' };
  if (/^node_modules\/exceljs\/dist(?:\/|$)/.test(rel)) return { include: false, reason: 'exceljs-browser-build-not-used-by-node-entry' };
  if (/^node_modules\/better-sqlite3\/(?:deps|src)(?:\/|$)/.test(rel)) return { include: false, reason: 'native-build-sources-runtime-addon-retained' };
  if (/^node_modules\/@types(?:\/|$)/.test(rel) || (rel.startsWith('node_modules/') && /\.d\.ts$/.test(rel))) return { include: false, reason: 'typescript-development-definitions' };
  return { include: true, reason: 'runtime-or-preserved-component' };
}
function buildRelease(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const profile = options.profile || 'standard';
  if (!['standard', 'complete'].includes(profile)) throw new Error('Perfil invalido: ' + profile);
  const excluded = [];
  const outputDir = path.resolve(options.outputDir || path.join(root, '..', 'OpenTranslator-release'));
  const comparable = value => process.platform === 'win32' ? value.toLowerCase() : value;
  const sourceKey = comparable(root), outputKey = comparable(outputDir);
  if (outputKey === sourceKey || sourceKey.startsWith(outputKey + path.sep) || outputKey.startsWith(sourceKey + path.sep)) {
    throw new Error('Destino deve ficar fora da arvore de origem');
  }
  // Never recursively delete a previous release or an arbitrary user-selected folder.
  if (fs.existsSync(outputDir)) throw new Error('Destino ja existe; escolha uma pasta nova: ' + outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const rel of ['server.js', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'OpenTranslator.png']) {
    if (fs.existsSync(path.join(root, rel))) copyTree(path.join(root, rel), path.join(outputDir, rel));
  }
  function skip(relative) {
    const decision = packageDecision(relative, profile);
    if (!decision.include) excluded.push({ path: relative.replace(/\\/g, '/'), reason: decision.reason });
    return !decision.include;
  }
  for (const dir of ['src', 'ui', 'config', 'resources', 'loaders', 'third-party', 'node_modules']) {
    if (fs.existsSync(path.join(root, dir))) copyTree(path.join(root, dir), path.join(outputDir, dir), skip, dir);
  }
  fs.mkdirSync(path.join(outputDir, 'bin'), { recursive: true });
  fs.copyFileSync(options.nodeBinary || process.execPath, path.join(outputDir, 'bin', 'node.exe'));
  if (options.launcherBinary) fs.copyFileSync(options.launcherBinary, path.join(outputDir, 'OpenTranslator.exe'));
  else compileLauncher(root, path.join(outputDir, 'OpenTranslator.exe'));
  for (const rel of ['data/logs', 'data/transactions', 'data/sessions', 'data/staging', 'gameLib']) fs.mkdirSync(path.join(outputDir, rel), { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'READ-ME.txt'),
    'OpenTranslator — Windows x64\n\nOpen OpenTranslator.exe. Keep the subdirectories beside the executable.\n' +
    'The application and launcher start in English. Game translation languages are configured separately.\n' +
    'This package excludes games, saves, personal settings, translation history, and development files.\n' +
    (profile === 'standard' ? 'The optional native injector is not included. Features requiring it need the corresponding native add-on.\n' : 'Complete profile: includes optional components found in the build source.\n') +
    'Check RELEASE_MANIFEST.json for the components actually present.\n', 'utf8');
  verifyBundle(outputDir);
  const runtime = (options.probeRuntime || probeRuntime)(outputDir);
  const files = listFiles(outputDir).sort().map(rel => ({ path: rel.replace(/\\/g, '/'), size: fs.statSync(path.join(outputDir, rel)).size, sha256: hashFile(path.join(outputDir, rel)) }));
  const optionalTools = ['resources/renpy/python/python.exe', 'loaders/inject.exe', 'resources/godot/gdre_tools.exe']
    .map(rel => ({ path: rel, included: fs.existsSync(path.join(outputDir, rel)) }));
  const manifest = { product: 'OpenTranslator', version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
    profile, excluded, architecture: 'win-x64', buildTimestamp: new Date().toISOString(), runtime, optionalTools,
    totalFiles: files.length, totalBytes: files.reduce((sum, f) => sum + f.size, 0), files };
  fs.writeFileSync(path.join(outputDir, 'RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2));
  return { outputDir, manifest };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!args[i + 1] || !['--output', '--profile'].includes(args[i])) throw new Error('Uso: node tools/package_release.js [--output pasta-nova] [--profile standard|complete]');
      options[args[i] === '--output' ? 'outputDir' : 'profile'] = args[i + 1];
    }
    const result = buildRelease(options);
    console.log(JSON.stringify({ outputDir: result.outputDir, files: result.manifest.totalFiles, bytes: result.manifest.totalBytes, runtime: result.manifest.runtime, optionalTools: result.manifest.optionalTools }, null, 2));
  } catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { buildRelease, verifyBundle, probeRuntime, packageDecision };
