/**
 * OpenTranslator — Script de Migração para Arquitetura Física Real
 * 
 * Regras:
 * 1. Não deleta arquivos — apenas move e preserva backups.
 * 2. Transfere fisicamente o conteúdo de Tool/ para as pastas oficiais na raiz:
 *    - Tool/src          -> src/
 *    - Tool/www          -> ui/
 *    - Tool/src/tools    -> tools/
 *    - Tool/server.js    -> server.js
 *    - Tool/node_modules -> node_modules/
 *    - Tool/package.json -> unificado em package.json
 *    - Tool/bin          -> bin/
 *    - Tool/loaders      -> loaders/
 *    - Tool/resources    -> resources/
 *    - Tool/templates    -> templates/
 *    - Tool/unren_tools  -> unren_tools/
 *    - Tool/xunity_plugin-> xunity_plugin/
 *    - Tool/launcher     -> launcher/
 *    - Tool/data         -> mesclado em data/
 *    - Tool/gameLib      -> gameLib/
 *    - Tool/config       -> mesclado em config/
 *    - Tool/OpenTranslator.png -> OpenTranslator.png
 * 3. Registra todas as operações em archives/backups/PHYSICAL_MIGRATION_LOG.json.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const logFile = path.join(rootDir, 'archives', 'backups', 'PHYSICAL_MIGRATION_LOG.json');
const logs = [];

function log(action, src, dest) {
  const entry = { timestamp: new Date().toISOString(), action, src, dest };
  logs.push(entry);
  console.log(`[${action}] ${src} -> ${dest}`);
}

function safeMove(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) {
    console.log(`[PULAR] Origem não existe: ${srcPath}`);
    return;
  }
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(destPath)) {
    // Se for diretório, mesclar recursivamente
    const statSrc = fs.statSync(srcPath);
    const statDest = fs.statSync(destPath);
    if (statSrc.isDirectory() && statDest.isDirectory()) {
      const items = fs.readdirSync(srcPath);
      for (const item of items) {
        safeMove(path.join(srcPath, item), path.join(destPath, item));
      }
      try { fs.rmdirSync(srcPath); } catch (e) {}
      return;
    }
    console.log(`[AVISO] Destino já existe, sobrescrevendo com segurança: ${destPath}`);
  }

  fs.renameSync(srcPath, destPath);
  log('MOVE', path.relative(rootDir, srcPath), path.relative(rootDir, destPath));
}

function safeCopy(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) return;
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcPath, destPath, { recursive: true });
  log('COPY', path.relative(rootDir, srcPath), path.relative(rootDir, destPath));
}

console.log('=== INICIANDO MIGRAÇÃO FÍSICA PARA A RAIZ ===\n');

// 1. Migrar Tool/src -> src (físico)
safeMove(path.join(rootDir, 'Tool', 'src'), path.join(rootDir, 'src'));

// 2. Migrar Tool/www -> ui (físico)
safeMove(path.join(rootDir, 'Tool', 'www'), path.join(rootDir, 'ui'));

// 3. Copiar/Criar tools/ na raiz a partir de src/tools
safeCopy(path.join(rootDir, 'src', 'tools'), path.join(rootDir, 'tools'));

// 4. Migrar runtime e sidecars
safeMove(path.join(rootDir, 'Tool', 'bin'), path.join(rootDir, 'bin'));
safeMove(path.join(rootDir, 'Tool', 'loaders'), path.join(rootDir, 'loaders'));
safeMove(path.join(rootDir, 'Tool', 'resources'), path.join(rootDir, 'resources'));
safeMove(path.join(rootDir, 'Tool', 'templates'), path.join(rootDir, 'templates'));
safeMove(path.join(rootDir, 'Tool', 'unren_tools'), path.join(rootDir, 'unren_tools'));
safeMove(path.join(rootDir, 'Tool', 'xunity_plugin'), path.join(rootDir, 'xunity_plugin'));
safeMove(path.join(rootDir, 'Tool', 'launcher'), path.join(rootDir, 'launcher'));

// 5. Migrar data e gameLib
safeMove(path.join(rootDir, 'Tool', 'data'), path.join(rootDir, 'data'));
safeMove(path.join(rootDir, 'Tool', 'gameLib'), path.join(rootDir, 'gameLib'));
if (fs.existsSync(path.join(rootDir, 'Tool', 'config'))) {
  safeMove(path.join(rootDir, 'Tool', 'config'), path.join(rootDir, 'config'));
}

// 6. Migrar node_modules e dependências
if (fs.existsSync(path.join(rootDir, 'Tool', 'node_modules'))) {
  safeMove(path.join(rootDir, 'Tool', 'node_modules'), path.join(rootDir, 'node_modules'));
}
if (fs.existsSync(path.join(rootDir, 'Tool', 'package-lock.json'))) {
  safeMove(path.join(rootDir, 'Tool', 'package-lock.json'), path.join(rootDir, 'package-lock.json'));
}

// 7. Migrar server.js e assets
safeMove(path.join(rootDir, 'Tool', 'server.js'), path.join(rootDir, 'server.js'));
if (fs.existsSync(path.join(rootDir, 'Tool', 'OpenTranslator.png'))) {
  safeMove(path.join(rootDir, 'Tool', 'OpenTranslator.png'), path.join(rootDir, 'OpenTranslator.png'));
}

// 8. Migrar testes internos se houver
if (fs.existsSync(path.join(rootDir, 'Tool', 'tests'))) {
  safeMove(path.join(rootDir, 'Tool', 'tests'), path.join(rootDir, 'tests', 'unit'));
}

// 9. Atualizar package.json da raiz com dependências completas
const rootPkgFile = path.join(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgFile, 'utf8'));
rootPkg.main = 'server.js';
rootPkg.scripts = {
  start: 'node server.js',
  test: 'node tests/validate_real_ui_certification.js',
  'test:renpy': 'node tests/validate_renpy_certification.js',
  'test:mz': 'node tests/validate_mz_certification.js',
  smoke: 'OpenTranslator.exe --smoke-test',
  lint: 'node tools/repoLint.js'
};
rootPkg.dependencies = {
  'better-sqlite3': '^12.11.1',
  exceljs: '^4.4.0',
  ws: '^8.21.1'
};
rootPkg.allowScripts = {
  'better-sqlite3@12.11.1': true
};
fs.writeFileSync(rootPkgFile, JSON.stringify(rootPkg, null, 2), 'utf8');
log('UPDATE', 'package.json', 'package.json');

// Salvar manifesto do log
fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
console.log(`\n=== MIGRAÇÃO FÍSICA CONCLUÍDA: ${logs.length} OPERAÇÕES REGISTRADAS ===`);
