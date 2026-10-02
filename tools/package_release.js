/**
 * package_release.js — Mecanismo de Empacotamento de Distribuição Release
 *
 * Responsabilidades:
 * - Compilar uma distribuição limpa, portátil e autônoma em ../OpenTranslator-release
 * - Copiar arquivos físicos canônicos (src/, ui/, tools/, config/, loaders/, resources/, etc.)
 * - Calcular checksums SHA-256 de cada arquivo e gerar RELEASE_MANIFEST.json
 *
 * Localização:
 * Camada de Ferramentas / Release (tools/)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function findProjectRoot(startDir = __dirname) {
  let cur = startDir;
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, 'package.json')) && fs.existsSync(path.join(cur, 'server.js'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return path.resolve(__dirname, '..');
}

const repoRoot = findProjectRoot();
const releaseDir = path.resolve(repoRoot, '../OpenTranslator-release');

console.log('================================================================');
console.log('   OPENTRANSLATOR — RELEASE PACKAGING AUTOMATION');
console.log('================================================================');
console.log(`Source Repo : ${repoRoot}`);
console.log(`Release Dir : ${releaseDir}\n`);

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

function copyRecursive(src, dst, filterFn) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcChild = path.join(src, entry);
      const dstChild = path.join(dst, entry);
      if (!filterFn || filterFn(srcChild)) {
        copyRecursive(srcChild, dstChild, filterFn);
      }
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

// 1. Clean previous release
if (fs.existsSync(releaseDir)) {
  console.log('Cleaning previous release directory...');
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

// 2. Production File Whitelist & Filters
console.log('Packaging production distribution...');

// Root files
const rootFiles = [
  'OpenTranslator.exe',
  'OpenTranslator.png',
  'server.js',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  '.gitignore'
];

for (const rf of rootFiles) {
  const s = path.join(repoRoot, rf);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, path.join(releaseDir, rf));
  }
}

// Docs filter (exclude docs/history)
if (fs.existsSync(path.join(repoRoot, 'docs'))) {
  copyRecursive(
    path.join(repoRoot, 'docs'),
    path.join(releaseDir, 'docs'),
    (p) => !p.includes('docs' + path.sep + 'history')
  );
}

// Third-party licenses
if (fs.existsSync(path.join(repoRoot, 'third-party'))) {
  copyRecursive(
    path.join(repoRoot, 'third-party'),
    path.join(releaseDir, 'third-party')
  );
}

// Canonical physical modules
const canonicalDirs = [
  'src',
  'ui',
  'tools',
  'loaders',
  'resources',
  'templates',
  'unren_tools',
  'xunity_plugin',
  'config'
];

for (const dirName of canonicalDirs) {
  const srcDir = path.join(repoRoot, dirName);
  if (fs.existsSync(srcDir)) {
    copyRecursive(srcDir, path.join(releaseDir, dirName));
  }
}

// Ensure essential empty directories exist in release data/
fs.mkdirSync(path.join(releaseDir, 'data', 'logs'), { recursive: true });
fs.mkdirSync(path.join(releaseDir, 'data', 'transactions'), { recursive: true });
fs.mkdirSync(path.join(releaseDir, 'data', 'sessions'), { recursive: true });
fs.mkdirSync(path.join(releaseDir, 'data', 'staging'), { recursive: true });

// 3. Compute Checksums & Generate RELEASE_MANIFEST.json
console.log('Generating RELEASE_MANIFEST.json with SHA-256 checksums...');
const manifestFiles = [];
let totalBytes = 0;

function walkRelease(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkRelease(full);
    } else if (e.isFile()) {
      const rel = path.relative(releaseDir, full).replace(/\\/g, '/');
      const sz = fs.statSync(full).size;
      const sha = hashFile(full);
      manifestFiles.push({
        path: rel,
        size: sz,
        sha256: sha
      });
      totalBytes += sz;
    }
  }
}

walkRelease(releaseDir);

const manifestData = {
  product: 'OpenTranslator',
  version: '1.0.0',
  buildTimestamp: new Date().toISOString(),
  architecture: 'win-x64',
  totalFiles: manifestFiles.length,
  totalBytes,
  formattedSize: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
  files: manifestFiles
};

fs.writeFileSync(
  path.join(releaseDir, 'RELEASE_MANIFEST.json'),
  JSON.stringify(manifestData, null, 2),
  'utf8'
);

console.log(`\n✓ Release tree assembled successfully!`);
console.log(`  Target Path    : ${releaseDir}`);
console.log(`  Total Files    : ${manifestFiles.length}`);
console.log(`  Total Size     : ${manifestData.formattedSize}`);
console.log(`  Manifest       : ${path.join(releaseDir, 'RELEASE_MANIFEST.json')}\n`);

module.exports = { releaseDir, manifestData };
