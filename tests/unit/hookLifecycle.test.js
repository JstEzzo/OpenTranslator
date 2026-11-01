'use strict';
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
global.ROOT = path.resolve(__dirname, '../..');
const scratch = path.join(global.ROOT, 'scratch');
fs.mkdirSync(scratch, { recursive: true });
global.DATA_DIR = fs.mkdtempSync(path.join(scratch, 'hook-lifecycle-'));
global.CFG_PATH = path.join(global.DATA_DIR, 'openT.json');
const { startHookServer, stopHookServer } = require('../../src/services/cheatServer');
let pass = 0;
let fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`ok ${name}`); }
  catch (err) { fail++; console.error(`FAIL ${name}: ${err.stack}`); }
}
async function main() {
  const occupied = http.createServer();
  await new Promise((resolve, reject) => {
    occupied.once('error', reject);
    occupied.listen(0, '127.0.0.1', resolve);
  });
  try {
    await test('occupied hook port rejects startup instead of hanging', async () => {
      let timeout;
      try {
        await assert.rejects(Promise.race([
          startHookServer(occupied.address().port),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('startup hung')), 2000); }),
        ]), { code: 'EADDRINUSE' });
      } finally { clearTimeout(timeout); }
    });
    await new Promise(resolve => stopHookServer(resolve));
  } finally { await new Promise(resolve => occupied.close(resolve)); }
  const { server } = await startHookServer(0);
  try {
    await test('malformed absolute request URL returns 400 and server stays alive', async () => {
      const status = await new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: 'http://[' }, res => {
          res.resume(); res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', reject); req.end();
      });
      assert.strictEqual(status, 400);
      assert.strictEqual(server.listening, true);
    });
  } finally { await new Promise(resolve => stopHookServer(resolve)); }
}
main().catch(err => { fail++; console.error(err); }).finally(() => {
  require('../../src/services/cache').closeDb();
  const memory = require('../../src/core/translationMemory');
  if (memory.db) memory.db.close();
  fs.rmSync(global.DATA_DIR, { recursive: true, force: true });
  console.log(`pass=${pass} fail=${fail}`);
  process.exitCode = fail ? 1 : 0;
});
