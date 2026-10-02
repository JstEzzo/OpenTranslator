/**
 * create_backup_before_next_engine.js
 * 
 * Cria o backup formal obrigatório antes de iniciar a expansão para a próxima engine.
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
      if (item === 'node_modules' || item === '.git' || item === 'backup_before_next_engine') continue;
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
  console.log('   CRIANDO BACKUP OBRIGATÓRIO: backup_before_next_engine/              ');
  console.log('========================================================================\n');

  const backupDir = path.resolve('backup_before_next_engine');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const manifest = [];

  const targets = [
    'OPEN_TRANSLATOR_REAL_GAME_MATRIX.json',
    'OPEN_TRANSLATOR_REAL_GAME_AUDIT.md',
    'OPEN_TRANSLATOR_RUNTIME_EVIDENCE.md',
    'OPEN_TRANSLATOR_EVIDENCE_INDEX.md',
    'RPG_MAKER_MZ_COMPARISON.md',
    'validate_audit_consistency.js',
    'validate_mz_certification.js',
    'Tool/src/core',
    'Tool/src/engines/rpgmaker',
    'Tool/src/engines/renpy',
    'Tool/certify_mz_rigorous.js',
    'Tool/scratch_mv_full_regression.js'
  ];

  for (const t of targets) {
    const srcPath = path.resolve(t);
    const destPath = path.join(backupDir, t);
    if (fs.existsSync(srcPath)) {
      copyRecursive(srcPath, destPath, manifest);
      console.log(`  [BACKUP] Copiado: ${t}`);
    } else {
      console.warn(`  [AVISO] Alvo não encontrado: ${t}`);
    }
  }

  // Gera MANIFEST.json
  const manifestJsonPath = path.join(backupDir, 'MANIFEST.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles: manifest.length,
    description: "Backup de segurança e congelamento de baseline antes de iniciar expansão da próxima engine (Ren'Py / Unity / Godot).",
    files: manifest
  }, null, 2), 'utf8');

  // Gera MANIFEST.md
  let md = '# MANIFESTO DE BACKUP — ANTES DA EXPANSÃO DE ENGINES\n\n';
  md += `**Data do Backup:** ${new Date().toISOString()}  \n`;
  md += `**Total de Arquivos:** ${manifest.length}  \n`;
  md += `**Finalidade:** Preservação estrita do estado consolidado de RPG Maker MV e MZ antes da implementação da nova engine.\n\n`;
  md += '| Arquivo | Tamanho (Bytes) | SHA-256 | Data Modificação |\n';
  md += '| :--- | :--- | :--- | :--- |\n';
  for (const f of manifest) {
    md += `| \`${f.relativePath}\` | ${f.sizeBytes} | \`${f.sha256}\` | ${f.mtime} |\n`;
  }

  const manifestMdPath = path.join(backupDir, 'MANIFEST.md');
  fs.writeFileSync(manifestMdPath, md, 'utf8');

  console.log(`\n✅ Backup concluído com sucesso em: ${backupDir}`);
  console.log(`   Arquivos registrados: ${manifest.length}`);
  console.log(`   Manifesto JSON: ${manifestJsonPath}`);
  console.log(`   Manifesto MD:   ${manifestMdPath}\n`);
}

main();
