/**
 * tests/security/index.js — Runner da Fase 1 (Segurança)
 *
 * FASE 1: segurança HTTP/RPC, XSS na UI, ownership fail-closed.
 * Este runner NAO aceita sucesso falso:
 *   - exige exit code != 0 de qualquer sub-suite que falhe
 *   - se nenhum sub-suite rodar, ele falha (em vez de "0 testes = ok")
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  { name: 'HTTP/RPC security', file: 'http_rpc_security.test.js' },
  { name: 'XSS UI', file: 'xss_ui.test.js' },
  { name: 'Owned process fail-closed', file: 'owned_process_security.test.js' },
];

const here = __dirname;
let failedSuites = 0;
let ranSuites = 0;
const summary = [];

for (const s of SUITES) {
  console.log('\n' + '='.repeat(72));
  console.log('>> ' + s.name + '  (' + s.file + ')');
  console.log('='.repeat(72));
  const r = spawnSync(process.execPath, [path.join(here, s.file)], {
    stdio: 'inherit',
    cwd: path.resolve(here, '..', '..'),
    timeout: 300000,
  });
  ranSuites++;
  const ok = r.status === 0;
  if (!ok) failedSuites++;
  summary.push({ name: s.name, ok, status: r.status });
}

console.log('\n' + '='.repeat(72));
console.log('RESUMO FASE 1 — SEGURANCA');
console.log('='.repeat(72));
for (const s of summary) {
  console.log(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.name}`);
}
console.log(`\nsuites executadas: ${ranSuites}/${SUITES.length}`);
console.log(`suites falhas: ${failedSuites}`);

if (ranSuites === 0) {
  console.error('\nFALHA: nenhuma suite foi executada. Isso nunca e sucesso.');
  process.exit(1);
}
process.exit(failedSuites ? 1 : 0);
