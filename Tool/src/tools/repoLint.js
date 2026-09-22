const fs = require('fs');
const path = require('path');

/**
 * Repository Lint
 * Validates deterministic repository organization according to Phase 4A standards.
 */
function runRepoLint(rootPath) {
  const issues = [];
  const allowedRootFiles = new Set([
    'package.json',
    'package-lock.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    '.gitignore',
    'OpenTranslator.bat',
    'OpenTranslator.vbs',
    'PHASE4A_RESULTS.md'
  ]);

  const files = fs.readdirSync(rootPath);
  for (const f of files) {
    const full = path.join(rootPath, f);
    const st = fs.statSync(full);
    if (!st.isDirectory()) {
      if (!allowedRootFiles.has(f) && !f.endsWith('.md') && !f.endsWith('.bat')) {
        issues.push({ type: 'ROOT_CLUTTER', file: f, message: `Unexpected loose file in root: ${f}` });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issuesCount: issues.length,
    issues
  };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../../..');
  const res = runRepoLint(root);
  console.log('=== Repository Lint Results ===');
  console.log(JSON.stringify(res, null, 2));
}

module.exports = runRepoLint;
