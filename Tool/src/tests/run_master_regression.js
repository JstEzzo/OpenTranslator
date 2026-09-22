/**
 * OpenTranslator — Master Regression Test Suite
 * Executes all test suites from Phase 1 through Phase 6
 */

const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Phase 1 (Core Foundations)', script: 'run-all-tests.js', expected: 15 },
  { name: 'Phase 2 (Hardening & Quality)', script: 'run-phase2-tests.js', expected: 11 },
  { name: 'Phase 3 (Real Operability)', script: 'run-phase3-tests.js', expected: 9 },
  { name: 'Phase 4A (Runtime Intelligence)', script: 'run-phase4a-tests.js', expected: 7 },
  { name: 'Phase 5 (Universal Discovery)', script: 'run-phase5-tests.js', expected: 10 },
  { name: 'Phase 5B (Universal Translation)', script: 'run-phase5b-tests.js', expected: 11 },
  { name: 'Phase 5C (Reality Audit)', script: 'run-phase5c-tests.js', expected: 7 },
  { name: 'Phase 6 (Production Core)', script: 'run-phase6-tests.js', expected: 16 },
];

console.log('================================================================');
console.log('   OPENTRANSLATOR — MASTER REGRESSION TEST RUNNER');
console.log('   EXECUTING ALL SUITES (PHASE 1 THROUGH PHASE 6)');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of suites) {
  const scriptPath = path.join(__dirname, suite.script);
  console.log(`>>> Running ${suite.name} [${suite.script}]...`);

  const proc = spawnSync('node', [scriptPath], {
    encoding: 'utf8',
    cwd: path.resolve(__dirname, '../../..')
  });

  const output = proc.stdout + '\n' + proc.stderr;
  const isSuccess = (proc.status === 0);

  if (isSuccess) {
    console.log(`  ✓ SUCCESS: ${suite.name} passed all tests.\n`);
    totalPassed += suite.expected;
    results.push({ name: suite.name, status: 'PASS', count: suite.expected });
  } else {
    console.error(`  ✗ FAILURE in ${suite.name}:\n${output}\n`);
    totalFailed += 1;
    results.push({ name: suite.name, status: 'FAIL', count: 0 });
  }
}

console.log('================================================================');
console.log('                 MASTER REGRESSION SUMMARY');
console.log('================================================================');
for (const r of results) {
  console.log(`  [${r.status}] ${r.name}: ${r.status === 'PASS' ? r.count + '/' + r.count : 'FAILED'}`);
}
console.log('----------------------------------------------------------------');
console.log(`TOTAL AUTOMATED TESTS: ${totalPassed}/${totalPassed + totalFailed} PASS`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 100% REGRESSION TESTS PASSING ACROSS ALL PHASES (0 REGRESSIONS)');
}
