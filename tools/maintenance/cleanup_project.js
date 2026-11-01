'use strict';
// The explicit, hash-verified archive policy never selects user databases, saves, jobs or sessions.
const path = require('path');
const { spawnSync } = require('child_process');
const { resolvePythonBinary } = require('../../src/utils/pythonResolver');
const result = spawnSync(resolvePythonBinary(), [path.join(__dirname, 'project_cleanup.py'), ...process.argv.slice(2)],
  { stdio: 'inherit', windowsHide: true });
if (result.error) { console.error(result.error.message); process.exitCode = 1; }
else process.exitCode = result.status === null ? 1 : result.status;
