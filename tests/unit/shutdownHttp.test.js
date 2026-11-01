'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(root, 'scratch', 'shutdown-http-'));
let pass = 0, fail = 0, child;
function request(port, route, method = 'GET', token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers: token ? { 'X-OpenTranslator-Token': token } : {} }, res => {
      let body = ''; res.on('data', c => { body += c; }); res.on('end', () => resolve({ status: res.statusCode, body }));
    }); req.setTimeout(10000, () => req.destroy(new Error('timeout'))); req.on('error', reject); req.end();
  });
}
async function test(name, fn) { try { await fn(); pass++; console.log('ok ' + name); } catch(e) { fail++; console.error('FAIL ' + name, e); } }
(async () => {
  const game = path.join(temp, 'game'); fs.mkdirSync(path.join(game, 'data'), { recursive: true });
  fs.writeFileSync(path.join(game, 'data', 'Actors.json'), 'ORIGINAL');
  const code = `const fs=require('fs'),path=require('path');global.ROOT=${JSON.stringify(root)};global.WWW_DIR=path.join(global.ROOT,'ui');global.DATA_DIR=${JSON.stringify(path.join(temp,'data'))};global.CFG_PATH=path.join(global.DATA_DIR,'openT.json');global.GL_DIR=path.join(global.DATA_DIR,'games');global.log=()=>{};fs.mkdirSync(global.DATA_DIR,{recursive:true});const c=require(path.join(global.ROOT,'src/core/shutdownCoordinator'));global.shutdownAll=c.requestShutdown;c.installSignalHandlers();const {backupGameData}=require(path.join(global.ROOT,'src/core/legacyGameRestore'));const backup=backupGameData(${JSON.stringify(path.join(game,'data'))});fs.writeFileSync(${JSON.stringify(path.join(game,'data','Actors.json'))},'MODIFIED');c.scheduleGameRestore(backup,60000);const {server,tryListen}=require(path.join(global.ROOT,'src/services/httpServer'));server.on('listening',()=>{c.trackOperation(new Promise(r=>setTimeout(()=>{fs.writeFileSync(${JSON.stringify(path.join(temp,'job.done'))},'done');r();},400)));process.send({port:server.address().port,backup});});tryListen(0);`;
  child = spawn(process.execPath, ['-e', code, '--', '--no-browser'], { stdio: ['ignore','pipe','pipe','ipc'], windowsHide: true });
  let output = ''; child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { output += c; });
  const ended = new Promise(resolve => child.once('exit', code => resolve(code)));
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start: ' + output)), 10000);
    child.once('message', m => { clearTimeout(timer); resolve(m); }); child.once('error', reject);
  });
  const ping = JSON.parse((await request(ready.port, '/api/ping')).body);
  await test('shutdown requires POST', async () => assert.strictEqual((await request(ready.port, '/api/shutdown', 'GET', ping.token)).status, 405));
  await test('shutdown rejects missing token', async () => assert.strictEqual((await request(ready.port, '/api/shutdown', 'POST')).status, 403));
  await test('explicit shutdown survives a fresh heartbeat and completes job plus pending restore', async () => {
    await request(ready.port, '/api/ping');
    assert.strictEqual((await request(ready.port, '/api/shutdown', 'POST', ping.token)).status, 200);
    let timer;
    try { assert.strictEqual(await Promise.race([ended, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('shutdown hung: ' + output)), 15000); })]), 0); }
    finally { clearTimeout(timer); }
    assert.strictEqual(fs.readFileSync(path.join(game, 'data', 'Actors.json'), 'utf8'), 'ORIGINAL');
    assert(fs.existsSync(ready.backup + '.restored')); assert(fs.existsSync(path.join(temp, 'job.done')));
    assert(!fs.existsSync(path.join(temp, 'data', 'server.pid')));
  });
})().catch(e => { fail++; console.error(e); }).finally(async () => {
  if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
  fs.rmSync(temp, { recursive: true, force: true }); console.log(`pass=${pass} fail=${fail}`); process.exitCode = fail ? 1 : 0;
});
