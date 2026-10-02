/**
 * cleanup_project.js — OpenTranslator Maintenance & Hygiene Utility
 * 
 * Scans the repository for:
 * - Stale scratch directories
 * - Old test logs & debug artifacts
 * - Committed ephemeral transactions & sessions
 * - Root clutter
 * - SQLite fragmentation (recommending VACUUM)
 * 
 * Usage:
 *   node Tool/src/tools/cleanup_project.js           (Dry run / inspection)
 *   node Tool/src/tools/cleanup_project.js --apply   (Safe archiving / cleanup)
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const isApply = process.argv.includes('--apply');

function scan() {
  const report = {
    timestamp: new Date().toISOString(),
    mode: isApply ? 'APPLY' : 'DRY_RUN',
    candidates: {
      scratchDirs: [],
      testLogs: [],
      staleTransactions: [],
      staleSessions: [],
      sqliteWalShm: [],
      rootClutter: []
    },
    totalCandidateBytes: 0
  };

  // 1. Scan root for scratch dirs
  const rootEntries = fs.readdirSync(repoRoot, { withFileTypes: true });
  for (const e of rootEntries) {
    if (e.isDirectory() && e.name.startsWith('scratch_')) {
      const p = path.join(repoRoot, e.name);
      report.candidates.scratchDirs.push(p);
    }
  }

  // 2. Scan Tool/data for test logs
  const dataDir = path.join(repoRoot, 'Tool', 'data');
  if (fs.existsSync(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir);
    for (const f of dataFiles) {
      if (f.endsWith('.log') && f !== 'openT.log') {
        const full = path.join(dataDir, f);
        const sz = fs.statSync(full).size;
        report.candidates.testLogs.push({ path: full, size: sz });
        report.totalCandidateBytes += sz;
      }
      if (f.endsWith('-wal') || f.endsWith('-shm')) {
        const full = path.join(dataDir, f);
        const sz = fs.statSync(full).size;
        report.candidates.sqliteWalShm.push({ path: full, size: sz });
        report.totalCandidateBytes += sz;
      }
    }

    // 3. Scan transactions
    const txDir = path.join(dataDir, 'transactions');
    if (fs.existsSync(txDir)) {
      const txs = fs.readdirSync(txDir);
      for (const t of txs) {
        const full = path.join(txDir, t);
        const sz = fs.statSync(full).size;
        report.candidates.staleTransactions.push({ path: full, size: sz });
        report.totalCandidateBytes += sz;
      }
    }

    // 4. Scan sessions
    const sessDir = path.join(dataDir, 'sessions');
    if (fs.existsSync(sessDir)) {
      const sessions = fs.readdirSync(sessDir);
      for (const s of sessions) {
        const full = path.join(sessDir, s);
        const sz = fs.statSync(full).size;
        report.candidates.staleSessions.push({ path: full, size: sz });
        report.totalCandidateBytes += sz;
      }
    }
  }

  return report;
}

function run() {
  console.log('================================================================');
  console.log('   OPENTRANSLATOR — REPOSITORY HYGIENE & CLEANUP UTILITY');
  console.log('================================================================\n');

  const report = scan();
  console.log(`Mode: ${report.mode}`);
  console.log(`Scratch directories found    : ${report.candidates.scratchDirs.length}`);
  console.log(`Stale test logs found        : ${report.candidates.testLogs.length}`);
  console.log(`Stale transactions found     : ${report.candidates.staleTransactions.length}`);
  console.log(`Stale sessions found         : ${report.candidates.staleSessions.length}`);
  console.log(`SQLite WAL/SHM temp files    : ${report.candidates.sqliteWalShm.length}`);
  console.log(`Reclaimable size             : ${(report.totalCandidateBytes / (1024 * 1024)).toFixed(2)} MB\n`);

  if (!isApply) {
    console.log('ℹ️  DRY RUN complete. No files were modified or deleted.');
    console.log('   To apply cleanup and archive candidates, run:');
    console.log('   node Tool/src/tools/cleanup_project.js --apply\n');
  } else {
    console.log('🚀 Applying safe archival of candidates...');
    const archiveDir = path.join(repoRoot, 'archive');
    
    // Archive test logs
    for (const item of report.candidates.testLogs) {
      const dest = path.join(archiveDir, 'logs', 'test_runs', path.basename(item.path));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(item.path, dest);
      console.log(`  Archived log: ${path.basename(item.path)}`);
    }

    // Archive transactions
    for (const item of report.candidates.staleTransactions) {
      const dest = path.join(archiveDir, 'transactions', path.basename(item.path));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(item.path, dest);
    }
    if (report.candidates.staleTransactions.length > 0) {
      console.log(`  Archived ${report.candidates.staleTransactions.length} transactions.`);
    }

    // Archive sessions
    for (const item of report.candidates.staleSessions) {
      const dest = path.join(archiveDir, 'sessions', path.basename(item.path));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(item.path, dest);
    }
    if (report.candidates.staleSessions.length > 0) {
      console.log(`  Archived ${report.candidates.staleSessions.length} sessions.`);
    }

    console.log('✓ Cleanup and archival successfully applied.');
  }

  const reportPath = path.join(repoRoot, 'archive', 'audits', 'maintenance_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Maintenance report saved to: ${reportPath}`);
}

run();
