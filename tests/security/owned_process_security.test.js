/**
 * tests/security/owned_process_security.test.js
 *
 * FASE 1 / PASSO 20 — OWNERSHIP FAIL-CLOSED (processos reais)
 *
 * Cobre as 8 vulnerabilidades do audit:
 *  V1  PowerShell falha => safe:false (nunca fail-open)
 *  V2  Sem excecao para 'node' (dois node.exe diferentes sao PIDs distintos)
 *  V3  register() sem executable => recusado
 *  V4  POSIX usa /proc para startTime (nao ha verificacao vazia)
 *  V5  taskkill falha => success:false (verificado com o codigo de saida)
 *  V6  Falha de integridade NAO remove o registro (processo nao vira orfao)
 *  V7  Nunca taskkill /F /IM (por nome)
 *  V8  Registro persiste em disco e reidrata
 *
 * Os testes usam processos REAIS (node -e) porque a correcao depende de
 * ler startTime/executable do SO.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const {
  OwnedProcessRegistry,
  __normalizeExe,
} = require(path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry'));

let passed = 0;
let failed = 0;
const failures = [];
const spawned = [];

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log(`  ok   ${name}`); })
    .catch((e) => {
      failed++;
      failures.push({ name, error: e });
      console.log(`  FAIL ${name}: ${e.message}`);
    });
}

/** Sobe um processo node real que fica vivo. */
function spawnLiveNode() {
  const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 60000)'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  spawned.push(child);
  return child;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitAlive(pid, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const { __probeProcess } = require(path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry'));
    const p = __probeProcess(pid);
    if (p.alive) return p;
    await sleep(100);
  }
  return null;
}

async function main() {
  console.log('=== FASE 1 — OWNED PROCESS FAIL-CLOSED (processos reais) ===');

  const reg = new OwnedProcessRegistry();

  // -------------------------------------------------------------- V3
  await test('V3 register() sem executable e RECUSADO', () => {
    const c = spawnLiveNode();
    const r = reg.register(c, { command: 'no-exe' });
    assert.strictEqual(r.ok, false, 'deve recusar');
    assert.strictEqual(r.reason, 'EXECUTABLE_REQUIRED');
    assert.strictEqual(reg.isOwned(c.pid), false, 'nao pode registrar');
    c.kill('SIGKILL');
  });

  // -------------------------------------------------------------- V2/V8
  await test('V2 register() com executable real + startTime ancora', async () => {
    const c = spawnLiveNode();
    await sleep(250);
    const r = reg.register(c, { executable: process.execPath, command: 'live-node' });
    assert.strictEqual(r.ok, true, `deve aceitar: ${JSON.stringify(r)}`);
    assert.strictEqual(r.startTimeReadable, true, 'startTime deve ser lido');
    assert.strictEqual(reg.isOwned(c.pid), true);
    c.kill('SIGKILL');
    await sleep(300);
  });

  // -------------------------------------------------------------- V1
  await test('V1 PID nao registrado => safe:false (FAIL-CLOSED)', () => {
    const r = reg.verifyPidIntegrity(999999);
    assert.strictEqual(r.safe, false);
    assert.strictEqual(r.reason, 'PROCESS_NOT_OWNED');
  });

  await test('V1b registro com startTime NAO ancorado => safe:false', async () => {
    // Simula um SO que nao permite ler startTime.
    const c = spawnLiveNode();
    const r = reg.register(c, { executable: process.execPath });
    assert.strictEqual(r.ok, true);
    // Sabota o registro para simular falha de leitura do SO.
    const rec = reg.get(c.pid);
    rec.startTimeReadable = false;
    const v = reg.verifyPidIntegrity(c.pid);
    assert.strictEqual(v.safe, false, 'NUNCA fail-open');
    assert.strictEqual(v.reason, 'NO_START_TIME_ANCHOR');
    reg.unregister(c.pid);
    c.kill('SIGKILL');
    await sleep(200);
  });

  // -------------------------------------------------------------- V6
  await test('V6 falha de integridade NAO remove o registro', async () => {
    const c = spawnLiveNode();
    await sleep(250);
    reg.register(c, { executable: process.execPath });
    const rec = reg.get(c.pid);
    rec.startTimeReadable = false; // sabota

    const res = reg.stop(c.pid, 'test');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.blocked, true);
    assert.strictEqual(res.reason, 'NO_START_TIME_ANCHOR');
    // O ponto central: o PID continua rastreavel.
    assert.strictEqual(reg.isOwned(c.pid), true,
      'processo real NAO pode virar orfao por falha de verificacao');

    reg.unregister(c.pid);
    c.kill('SIGKILL');
    await sleep(200);
  });

  // -------------------------------------------------------------- V5
  await test('V5 stop() encerra processo de posse COMPROVADA', async () => {
    const c = spawnLiveNode();
    await sleep(250);
    const r = reg.register(c, { executable: process.execPath });
    assert.strictEqual(r.ok, true);

    const res = reg.stop(c.pid, 'test-owned');
    assert.strictEqual(res.success, true, `deve encerrar: ${JSON.stringify(res)}`);
    assert(!res.alreadyExited, 'nao estava morto antes');

    await sleep(400);
    const alive = await waitAlive(c.pid, 3);
    assert(alive === null || !alive.alive, 'processo deve estar morto de fato');
  });

  await test('V5b stop() de PID nao-possuido e BLOQUEADO', () => {
    const res = reg.stop(999999, 'test');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.blocked, true);
    assert.strictEqual(res.reason, 'PROCESS_NOT_OWNED');
  });

  // -------------------------------------------------------------- V2 real
  await test('V2b node.exe de path DIFERENTE => PID_REUSE detectado', async () => {
    const c = spawnLiveNode();
    await sleep(250);
    reg.register(c, { executable: process.execPath });
    const rec = reg.get(c.pid);
    // Simula PID-reuse: o SO reporta um executavel diferente.
    const v = reg.verifyPidIntegrity(c.pid);
    assert.strictEqual(v.safe, true, 'com o proprio path deve ser seguro');

    // Agora verifica que um path diferente e' detectado.
    rec.executable = __normalizeExe('C:\\Windows\\System32\\cmd.exe');
    const v2 = reg.verifyPidIntegrity(c.pid);
    if (process.platform === 'win32') {
      assert.strictEqual(v2.safe, false, 'path diferente deve ser detectado');
      assert.strictEqual(v2.reason, 'PID_REUSE_DETECTED_EXECUTABLE');
    }
    reg.unregister(c.pid);
    c.kill('SIGKILL');
    await sleep(200);
  });

  // -------------------------------------------------------------- V7
  await test('V7 codigo jamais usa taskkill /IM (nome global)', () => {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry.js'),
      'utf8',
    );
    // Remove comentarios de bloco e de linha: a invariante e' sobre CODIGO
    // executavel, nao sobre prosa que descreve a invariante.
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    assert(!/taskkill[^\]]*\/IM/.test(code),
      'nao pode conter taskkill com /IM (kill por nome de imagem)');
    assert(!/['"]\/IM['"]/.test(code),
      'nao pode passar /IM como argumento isolado');

    // Toda invocacao de taskkill deve ser por PID.
    const invocations = code.match(/spawnSync\(\s*['"]taskkill['"][\s\S]{0,220}?\)/g) || [];
    assert(invocations.length > 0, 'deve haver ao menos uma invocacao de taskkill');
    for (const inv of invocations) {
      assert(inv.includes("'/PID'") || inv.includes('"/PID"'),
        `taskkill deve usar /PID, encontrado: ${inv.slice(0, 160)}`);
      assert(!/\/IM\b/.test(inv), `taskkill nao pode usar /IM: ${inv.slice(0, 160)}`);
    }
  });

  await test('V7b nenhum outro arquivo de src/ mata por nome de imagem', () => {
    const srcRoot = path.join(__dirname, '..', '..', 'src');
    const offenders = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '__pycache__') continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.js$/.test(e.name)) continue;
        const raw = fs.readFileSync(p, 'utf8');
        const code = raw
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/(^|[^:])\/\/.*$/gm, '$1');
        if (/taskkill[^\]]*\/IM/.test(code) || /['"]\/IM['"]/.test(code)) {
          offenders.push(path.relative(srcRoot, p).replace(/\\/g, '/'));
        }
      }
    })(srcRoot);
    assert.strictEqual(offenders.length, 0,
      `arquivos que matam por nome de imagem: ${offenders.join(', ')}`);
  });

  // -------------------------------------------------------------- V8
  await test('V8 registro e persistido em disco', async () => {
    const { __registryFile } = require(path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry'));
    const file = __registryFile();
    const c = spawnLiveNode();
    await sleep(250);
    reg.register(c, { executable: process.execPath, command: 'persist-test' });
    assert(fs.existsSync(file), 'arquivo de registro deve existir');
    const raw = fs.readFileSync(file, 'utf8');
    const j = JSON.parse(raw);
    assert(Array.isArray(j.processes), 'deve ter array de processos');
    assert(j.processes.some((p) => p.pid === c.pid), 'PID deve estar no registro');
    reg.unregister(c.pid);
    c.kill('SIGKILL');
    await sleep(200);
  });

  await test('V8b registro reidratado numa nova instancia', async () => {
    const { __registryFile } = require(path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry'));
    const file = __registryFile();
    const c = spawnLiveNode();
    await sleep(250);
    reg.register(c, { executable: process.execPath, command: 'orphan-test' });

    // Nova instância = "restart do app".
    const reg2 = new OwnedProcessRegistry();
    assert(reg2.isOwned(c.pid), 'processo orfao deve ser reidratado e continuar matavel');

    // E o registry novo consegue matar.
    const res = reg2.stop(c.pid, 'orphan-cleanup');
    assert.strictEqual(res.success, true, `deve conseguir matar orfao: ${JSON.stringify(res)}`);
    await sleep(300);

    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
  });

  // -------------------------------------------------------------- extras
  await test('X1 shutdownAll() reporta contagem real', async () => {
    const r2 = new OwnedProcessRegistry();
    const a = spawnLiveNode();
    const b = spawnLiveNode();
    await sleep(300);
    r2.register(a, { executable: process.execPath });
    r2.register(b, { executable: process.execPath });
    const rep = r2.shutdownAll('test');
    assert.strictEqual(rep.attempted, 2, `tentou ${rep.attempted}`);
    assert.strictEqual(rep.stopped, 2, `parou ${rep.stopped}`);
    assert.strictEqual(rep.blocked, 0);
    await sleep(300);
  });

  await test('X2 stopSession() so toca processos da sessao', async () => {
    const r3 = new OwnedProcessRegistry();
    const a = spawnLiveNode();
    const b = spawnLiveNode();
    await sleep(300);
    r3.register(a, { executable: process.execPath, sessionId: 'S1' });
    r3.register(b, { executable: process.execPath, sessionId: 'S2' });
    const rep = r3.stopSession('S1');
    assert.strictEqual(rep.stoppedCount, 1);
    assert.strictEqual(r3.isOwned(a.pid), false, 'S1 deve estar parado');
    assert.strictEqual(r3.isOwned(b.pid), true, 'S2 deve continuar vivo');
    r3.shutdownAll('cleanup');
    await sleep(300);
  });

  await test('X3 registro NAO e serializado com handle childProcess', async () => {
    const { __registryFile } = require(path.join(__dirname, '..', '..', 'src', 'core', 'ownedProcessRegistry'));
    const file = __registryFile();
    const c = spawnLiveNode();
    await sleep(200);
    const r4 = new OwnedProcessRegistry();
    r4.register(c, { executable: process.execPath });
    const raw = fs.readFileSync(file, 'utf8');
    assert(!raw.includes('childProcess'), 'handle nao pode ser serializado em JSON');
    c.kill('SIGKILL');
    await sleep(200);
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
  });

  // cleanup
  for (const c of spawned) {
    try { c.kill('SIGKILL'); } catch (_) {}
  }
  await sleep(400);

  console.log('\n--- RESULTADO FASE 1 (owned process) ---');
  console.log(`pass=${passed} fail=${failed}`);
  if (failed) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}: ${f.error.message}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('ERRO NO RUNNER:', e);
  process.exit(1);
});
