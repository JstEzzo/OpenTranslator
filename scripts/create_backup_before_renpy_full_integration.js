/**
 * create_backup_before_renpy_full_integration.js
 * 
 * Cria o backup formal obrigatório antes de iniciar a integração completa de Ren'Py ao OpenTranslator.
 * Copia os arquivos essenciais de OpenTranslator, audit e motores consolidados,
 * gravando hashes SHA-256, tamanhos em bytes e timestamps em MANIFEST.json e MANIFEST.md.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyRecursive(src, dest, manifest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item.startsWith('backup_')) continue;
      copyRecursive(path.join(src, item), path.join(dest, item), manifest);
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
    const hash = getSha256(src);
    manifest.push({
      relativePath: path.relative(path.resolve('.'), src).replace(/\\/g, '/'),
      backupPath: path.relative(path.resolve('.'), dest).replace(/\\/g, '/'),
      sizeBytes: stat.size,
      sha256: hash,
      mtime: stat.mtime.toISOString()
    });
  }
}

function main() {
  console.log('========================================================================');
  console.log('   CRIANDO BACKUP OBRIGATÓRIO: backup_before_renpy_full_integration/     ');
  console.log('========================================================================\n');

  const backupDir = path.resolve('backup_before_renpy_full_integration');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const manifest = [];

  const targets = [
    'OPEN_TRANSLATOR_REAL_GAME_MATRIX.json',
    'OPEN_TRANSLATOR_REAL_GAME_AUDIT.md',
    'OPEN_TRANSLATOR_RUNTIME_EVIDENCE.md',
    'OPEN_TRANSLATOR_EVIDENCE_INDEX.md',
    'validate_audit_consistency.js',
    'validate_mz_certification.js',
    'validate_renpy_certification.js',
    'Tool/src/gameEngine.js',
    'Tool/src/rpcHandlers.js',
    'Tool/src/extractor.js',
    'Tool/src/core',
    'Tool/src/engines/rpgmaker',
    'Tool/src/engines/renpy',
    'Tool/www'
  ];

  for (const t of targets) {
    const full = path.resolve(t);
    if (fs.existsSync(full)) {
      const dest = path.join(backupDir, t);
      copyRecursive(full, dest, manifest);
      console.log(`  ✓ Copiado para backup: ${t}`);
    } else {
      console.log(`  - Alvo não encontrado (ignorado): ${t}`);
    }
  }

  // Grava MANIFEST.json
  const manifestJsonPath = path.join(backupDir, 'MANIFEST.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles: manifest.length,
    files: manifest
  }, null, 2), 'utf8');

  // Grava MANIFEST.md
  const manifestMdPath = path.join(backupDir, 'MANIFEST.md');
  const mdLines = [
    '# MANIFESTO FORENSE DE BACKUP PRÉ-INTEGRAÇÃO REN\'PY',
    `**Data:** ${new Date().toISOString()}`,
    `**Total de Arquivos Preservados:** ${manifest.length}`,
    '',
    '| Arquivo Relativo | Tamanho (Bytes) | Hash SHA-256 |',
    '| :--- | :--- | :--- |'
  ];
  for (const item of manifest) {
    mdLines.push(`| \`${item.relativePath}\` | ${item.sizeBytes} | \`${item.sha256}\` |`);
  }
  fs.writeFileSync(manifestMdPath, mdLines.join('\n'), 'utf8');

  console.log(`\n✅ Backup concluído com sucesso em: ${backupDir}`);
  console.log(`   Total de arquivos preservados: ${manifest.length}`);
  console.log(`   Manifestos gerados: MANIFEST.json e MANIFEST.md`);
}

main();
