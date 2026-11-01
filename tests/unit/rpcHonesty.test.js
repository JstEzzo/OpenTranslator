/**
 * tests/unit/rpcHonesty.test.js — FASE 2 / PASSO 21 & 36
 *
 * Testa COMPORTAMENTO dos handlers que mentiam, não apenas sua existência.
 * Cada teste reproduz o bug original da auditoria e exige que ele não volte.
 *
 * Bugs cobertos:
 *   - sendCheatCommand devolvia {ok:true} sem socket e sem jogo
 *   - scanGameVariables devolvia {ok:true, variables:[]} sem escanear nada
 *   - setGameVar mutava o espelho local e devolvia {ok:true} (escrita fantasma)
 *   - log() com level não-string causava TypeError -> HTTP 500
 *   - engineInfo devolvia a definição de MZ para qualquer motor desconhecido
 *   - installOverlay lia 'www/' inexistente e registrava em 'plugins.json'
 *     inexistente (RPG Maker usa js/plugins.js)
 *   - installOverlay devolvia `true` em vez de {ok:true}
 *   - handlers sem implementação escreviam em global e devolviam {ok:true}
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

/** Enfileira um teste. Aceita função sync ou async. */
function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 2 — HONESTIDADE DOS HANDLERS RPC ===');
  for (const { name, fn } of queue) {
    try {
      await fn();
      pass++;
      console.log(`  ok   ${name}`);
    } catch (e) {
      fail++;
      failures.push({ name, message: e.message });
      console.log(`  FAIL ${name}`);
      console.log(`       ${e.message.split('\n').join('\n       ')}`);
    }
  }

  console.log('\n--- RESULTADO FASE 2 (honestidade RPC) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Setup: registramos globals mínimos e carregamos os handlers.
// ---------------------------------------------------------------------------
global.ROOT = ROOT;
global.log = () => {};
global.pendingCheatCommands = [];
global.activeCheatSocket = null;
global.lastGameState = null;
global.lastCheatPollTime = 0;
global.serverLogs = [];
global.hasHadClient = false;
global.lastClientHeartbeat = 0;
global.GL_DIR = path.join(os.tmpdir(), 'ot_gl_test');
global.DATA_DIR = path.join(os.tmpdir(), 'ot_data_test');
global.activeTranslationQueue = undefined;

const handlers = require(path.join(ROOT, 'src', 'services', 'rpcHandlers.js')).handlers;
const R = require(path.join(ROOT, 'src', 'services', 'rpcResponse.js'));

// ---------------------------------------------------------------------------
// BUG-1: sendCheatCommand com ok:true incondicional
// ---------------------------------------------------------------------------
test('BUG-1 sendCheatCommand sem socket declara transporte em vez de fingir entrega', () => {
  global.pendingCheatCommands = [];
  global.activeCheatSocket = null;

  const r = handlers.sendCheatCommand({ code: 'renpy.store["hp"] = 1' });

  assert.ok(r.delivery, 'resposta deve declarar o método de entrega');
  assert.strictEqual(r.delivery, 'queued',
    'sem socket o único transporte possível é a fila');
  assert.strictEqual(r.transport, 'queue');
  assert.strictEqual(global.pendingCheatCommands.length, 1,
    'o comando DEVE estar realmente na fila');
});

test('BUG-1b sendCheatCommand com socket aberto reporta delivery=sent', () => {
  const sent = [];
  global.pendingCheatCommands = [];
  global.activeCheatSocket = { readyState: 1, send: (d) => sent.push(d) };

  const r = handlers.sendCheatCommand({ code: 'x = 1' });

  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.delivery, 'sent');
  assert.strictEqual(r.transport, 'websocket');
  assert.strictEqual(sent.length, 1, 'o socket deve ter recebido 1 mensagem');
  assert.strictEqual(global.pendingCheatCommands.length, 0,
    'com socket aberto NÃO deve enfileirar (evita entrega duplicada)');
  global.activeCheatSocket = null;
});

test('BUG-1c sendCheatCommand com socket que LANÇA cai para a fila sem perder o comando', () => {
  global.pendingCheatCommands = [];
  global.activeCheatSocket = {
    readyState: 1,
    send() { throw new Error('socket morto'); },
  };

  const r = handlers.sendCheatCommand({ code: 'y = 2' });

  assert.strictEqual(r.ok, true, 'a queda para a fila é uma entrega bem-sucedida');
  assert.strictEqual(r.delivery, 'queued');
  assert.match(r.detail, /socket morto/);
  assert.strictEqual(global.pendingCheatCommands.length, 1,
    'o comando não pode ser perdido quando o socket cai');
  global.activeCheatSocket = null;
});

test('BUG-1d sendCheatCommand sem código é erro de input, não enfileiramento', () => {
  global.pendingCheatCommands = [];
  const r = handlers.sendCheatCommand({});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, R.RPC_STATUS.INVALID_INPUT);
  assert.strictEqual(global.pendingCheatCommands.length, 0,
    'comando vazio não deve ser enfileirado');
});

test('BUG-1e a fila de comandos tem TETO definido (o original crescia sem limite)', () => {
  global.pendingCheatCommands = [];
  global.activeCheatSocket = null;
  for (let i = 0; i < 1000; i++) handlers.sendCheatCommand({ code: `x=${i}` });
  assert.ok(global.pendingCheatCommands.length <= 200,
    `a fila precisa ter teto, encheu ${global.pendingCheatCommands.length}`);
});

test('BUG-1f fila cheia devolve ok:false (a UI precisa saber que não entregou)', () => {
  global.pendingCheatCommands = new Array(200).fill({ code: 'old' });
  global.activeCheatSocket = null;
  const r = handlers.sendCheatCommand({ code: 'overflow' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, R.RPC_STATUS.BLOCKED);
  assert.strictEqual(global.pendingCheatCommands.length, 200,
    'nada deve ser enfileirado quando a fila está cheia');
  global.pendingCheatCommands = [];
});

// ---------------------------------------------------------------------------
// BUG-2: scanGameVariables devolvia ok:true sem escanear
// ---------------------------------------------------------------------------
test('BUG-2 scanGameVariables sem jogo conectado => NOT_CONNECTED', async () => {
  global.activeCheatSocket = null;
  global.lastCheatPollTime = 0;
  global.lastGameState = null;

  const r = await handlers.scanGameVariables();
  assert.strictEqual(r.ok, false, 'BUG ORIGINAL: devolvia {ok:true, variables:[]}');
  assert.strictEqual(r.status, R.RPC_STATUS.NOT_CONNECTED);
});

test('BUG-2b scanGameVariables nunca inventa variáveis a partir de escrita local', async () => {
  global.activeCheatSocket = { readyState: 1, send() {} };
  global.lastCheatPollTime = Date.now();
  // Estado espelhado LOCAL (o que setGameVar usava para fabricar dados).
  global.lastGameState = { renpyVars: [{ id: 'hp', name: 'hp', value: 999 }] };

  const r = await handlers.scanGameVariables();
  assert.ok(!r.ok || r.source !== 'hook',
    'não pode declarar origem "hook" para um espelho local');
});

test('BUG-2c scanGameVariables com snapshot do hook devolve as variáveis REAIS', async () => {
  global.activeCheatSocket = { readyState: 1, send() {} };
  global.lastCheatPollTime = Date.now();
  global.lastGameState = {
    renpyVarsSource: 'hook',
    renpyVars: [{ id: 'hp', name: 'hp', value: 42 }],
  };

  const r = await handlers.scanGameVariables();
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.source, 'hook');
  assert.strictEqual(r.count, 1);
  assert.strictEqual(r.variables[0].value, 42);
  global.activeCheatSocket = null;
  global.lastCheatPollTime = 0;
  global.lastGameState = null;
});

test('BUG-2d scanGameVariables converte objeto de variáveis em lista', async () => {
  global.activeCheatSocket = { readyState: 1, send() {} };
  global.lastCheatPollTime = Date.now();
  global.lastGameState = {
    renpyVarsSource: 'hook',
    variables: { hp: 7, gold: 100 },
  };

  const r = await handlers.scanGameVariables();
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.count, 2);
  const names = r.variables.map((v) => v.name).sort();
  assert.deepStrictEqual(names, ['gold', 'hp']);
  global.activeCheatSocket = null;
  global.lastCheatPollTime = 0;
  global.lastGameState = null;
});

// ---------------------------------------------------------------------------
// BUG-3: setGameVar fabricava a escrita
// ---------------------------------------------------------------------------
test('BUG-3 setGameVar sem canal devolve falha e NAO toca no espelho local', async () => {
  global.pendingCheatCommands = [];
  global.activeCheatSocket = null;
  global.lastGameState = { renpyVars: [{ id: 'hp', name: 'hp', value: 10 }] };

  const r = await handlers.setGameVar({ id: 'hp', value: 999 });

  assert.strictEqual(r.ok, false,
    'BUG ORIGINAL: devolvia {ok:true, id, value} mesmo sem entrega');
  assert.strictEqual(r.status, R.RPC_STATUS.NOT_CONNECTED);
  assert.deepStrictEqual(global.lastGameState.renpyVars,
    [{ id: 'hp', name: 'hp', value: 10 }],
    'BUG ORIGINAL: mutava o espelho local como se o jogo tivesse mudado');
});

test('BUG-3b setGameVar sem jogo NÃO enfileira (evita aplicar no jogo errado)', async () => {
  global.pendingCheatCommands = [];
  global.activeCheatSocket = null;
  global.lastGameState = { renpyVars: [] };

  const r = await handlers.setGameVar({ id: 'gold', value: 500 });

  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, R.RPC_STATUS.NOT_CONNECTED);
  assert.strictEqual(global.pendingCheatCommands.length, 0,
    'CRÍTICO: uma escrita enfileirada seria entregue ao PRÓXIMO jogo aberto, '
    + 'aplicando gold=500 no jogo errado');
  assert.match(r.detail, /NÃO foi enfileirada/);
});

test('BUG-3c setGameVar valida o id antes de gerar código', async () => {
  global.pendingCheatCommands = [];
  const r = await handlers.setGameVar({ value: 1 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, R.RPC_STATUS.INVALID_INPUT);
  assert.strictEqual(global.pendingCheatCommands.length, 0,
    'id ausente não pode gerar comando');
});

test('BUG-3d setGameVar com id numérico é aceito (ids do RenPy são numéricos)', async () => {
  global.pendingCheatCommands = [];
  const sent = [];
  global.activeCheatSocket = { readyState: 1, send: (d) => sent.push(d) };
  const r = await handlers.setGameVar({ id: 42, value: 'olá' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.id, '42');
  assert.strictEqual(r.value, 'olá');
  assert.strictEqual(r.delivery, 'sent');
  // O payload vai como JSON; o id precisa estar serializado no código.
  const payload = JSON.parse(sent[0]);
  assert.ok(payload.code.includes('"42"'),
    `o id numérico deveria estar serializado no código, veio: ${payload.code}`);
  assert.ok(payload.code.includes('olá'), 'o valor também deve estar no código');
  global.activeCheatSocket = null;
});

test('BUG-3e setGameVar com socket envia e NÃO enfileira', async () => {
  const sent = [];
  global.pendingCheatCommands = [];
  global.activeCheatSocket = { readyState: 1, send: (d) => sent.push(d) };
  const r = await handlers.setGameVar({ id: 'hp', value: 1 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.delivery, 'sent');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(global.pendingCheatCommands.length, 0);
  global.activeCheatSocket = null;
});

// ---------------------------------------------------------------------------
// BUG-4: log() com level não-string causava HTTP 500 (DoS)
// ---------------------------------------------------------------------------
test('BUG-4 log() com level não-string não pode lançar TypeError', () => {
  for (const bad of [123, null, undefined, {}, [], true]) {
    const r = handlers.log({ level: bad, message: 'teste' });
    assert.strictEqual(r, true, `level=${JSON.stringify(bad)} deveria ser tratado, não quebrar`);
  }
});

test('BUG-4b log() com level objeto malicioso é normalizado para string válida', () => {
  const seen = [];
  global.log = (lvl) => seen.push(lvl);
  for (const bad of [{ toUpperCase: null }, { toString: null }, []]) {
    handlers.log({ level: bad, message: 'x' });
  }
  assert.ok(seen.length >= 3);
  for (const lvl of seen) {
    assert.strictEqual(typeof lvl, 'string');
    assert.ok(['info', 'debug', 'warn', 'error', 'success'].includes(lvl),
      `nível normalizado inválido: ${lvl}`);
  }
  global.log = () => {};
});

test('BUG-4c log() com message não-string não lança', () => {
  for (const m of [123, null, undefined, {}, []]) {
    const r = handlers.log({ level: 'info', message: m });
    assert.strictEqual(typeof r, 'boolean');
  }
});

test('BUG-4d sanitizeLogLevel mapeia "warning" -> "warn" e rejeita inventos', () => {
  assert.strictEqual(R.sanitizeLogLevel('warning', 'info'), 'warn');
  assert.strictEqual(R.sanitizeLogLevel('ERROR', 'info'), 'error');
  assert.strictEqual(R.sanitizeLogLevel('debug', 'info'), 'debug');
  assert.strictEqual(R.sanitizeLogLevel('nivel-que-nao-existe', 'info'), 'info');
  assert.strictEqual(R.sanitizeLogLevel(123, 'info'), 'info');
});

// ---------------------------------------------------------------------------
// BUG-5: engineInfo devolvia MZ para qualquer motor
// ---------------------------------------------------------------------------
test('BUG-5 engineInfo com motor desconhecido NÃO pode devolver MZ', () => {
  const r = handlers.engineInfo({ eng: 'motorQueNaoExiste' });
  assert.strictEqual(r.ok, false,
    'BUG ORIGINAL: devolvia ENGINES_DEF.mz como se fosse a resposta');
  assert.strictEqual(r.status, R.RPC_STATUS.NOT_FOUND);
});

test('BUG-5b engineInfo sem argumento é erro de input (não default)', () => {
  const r = handlers.engineInfo({});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.status, R.RPC_STATUS.INVALID_INPUT);
  const r2 = handlers.engineInfo();
  assert.strictEqual(r2.ok, false);
});

test('BUG-5c engineInfo com motor VÁLIDO devolve a definição correta', () => {
  const r = handlers.engineInfo({ eng: 'renpy' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.engine, 'renpy');
  assert.ok(r.definition, 'a definição do motor deve vir junto');
});

// ---------------------------------------------------------------------------
// BUG-6/7: installOverlay lia caminhos inexistentes
// ---------------------------------------------------------------------------
test('BUG-6 o template do overlay EXISTE (o original apontava para www/ inexistente)', () => {
  // Reproduz a causa raiz: installOverlay procurava
  // <ROOT>/www/UltraTranslateOverlay.js e essa pasta nunca existiu.
  const wrong = path.join(ROOT, 'www', 'UltraTranslateOverlay.js');
  assert.ok(!fs.existsSync(wrong),
    'premissa do teste: www/ realmente não existe (por isso o handler era beco sem saída)');

  const right = path.join(ROOT, 'ui', 'UltraTranslateOverlay.js');
  assert.ok(fs.existsSync(right),
    'o overlay real deve estar em ui/UltraTranslateOverlay.js');
});

test('BUG-6b installOverlay com jogo inexistente devolve falha declarada', () => {
  const r = handlers.installOverlay({ gameKey: 'jogo-que-nao-existe' });
  assert.strictEqual(r.ok, false);
  assert.ok([R.RPC_STATUS.NOT_FOUND, R.RPC_STATUS.FAILED].includes(r.status));
});

test('BUG-7 o registro de plugins do RPG Maker é js/plugins.js, NÃO plugins.json', () => {
  const wrong = path.join(ROOT, 'js', 'plugins.json');
  assert.ok(!fs.existsSync(wrong),
    'premissa: plugins.json não é o registro de plugins do RPG Maker');
});

// ---------------------------------------------------------------------------
// BUG-8: handlers removidos não podem voltar
// ---------------------------------------------------------------------------
test('BUG-8 os 9 handlers falsos foram removidos', () => {
  const removed = [
    'selfTest', 'selectFolder', 'batchTranslate', 'batchTranslateWithEngine',
    'getHealthStatus', 'getGlossaryRules', 'saveGlossaryRule',
    'saveManualOverride', 'getLiveMonitorEntries',
  ];
  const still = removed.filter((n) => typeof handlers[n] === 'function');
  assert.strictEqual(still.length, 0,
    `handlers removidos ainda presentes: ${still.join(', ')}`);
});

test('BUG-8b rpcResponse expõe status consistentes', () => {
  assert.ok(R.RPC_STATUS.OK);
  assert.ok(R.RPC_STATUS.UNIMPLEMENTED);
  assert.ok(R.RPC_STATUS.NOT_CONNECTED);
  assert.strictEqual(R.ok({ a: 1 }).ok, true);
  assert.strictEqual(R.ok({ a: 1 }).a, 1);
  assert.strictEqual(R.unimplemented('x').ok, false);
  assert.strictEqual(R.unimplemented('x').status, R.RPC_STATUS.UNIMPLEMENTED);
  assert.strictEqual(R.notConnected('x').ok, false);
  assert.strictEqual(R.blocked('x').ok, false);
  assert.strictEqual(R.invalidInput('x').ok, false);
  assert.strictEqual(R.notFound('x').ok, false);
  assert.strictEqual(R.failed('x').ok, false);
});

test('BUG-8c remover handler dá TypeError natural (não stub silencioso)', () => {
  assert.strictEqual(typeof handlers.selectFolder, 'undefined');
  assert.strictEqual(typeof handlers.saveGlossaryRule, 'undefined');
  assert.strictEqual(typeof handlers.getHealthStatus, 'undefined');
});

// ---------------------------------------------------------------------------
// Cobertura: rpgMakerPluginsFile
// ---------------------------------------------------------------------------
const {
  parsePluginsJs, serializePluginsJs, registerPlugin, unregisterPlugin, verifyPlugin,
} = require(path.join(ROOT, 'src', 'engines', 'rpgmaker', 'rpgMakerPluginsFile.js'));

test('PLUG-1 faz parse do formato real do RPG Maker (array em comentário)', () => {
  const real = '//$plugins=[\n'
    + '//{"name":"ItemAlchemy","status":true,"description":"x","parameters":{}},\n'
    + '//{"name":"UltraTranslateOverlay","status":false,"description":"y","parameters":{}}\n'
    + '//]\n';
  const parsed = parsePluginsJs(real);
  assert.ok(parsed, 'deve interpretar o formato real');
  assert.strictEqual(parsed.arr.length, 2);
  assert.strictEqual(parsed.arr[0].name, 'ItemAlchemy');
  assert.strictEqual(parsed.arr[1].status, false);
});

test('PLUG-2 serializa de volta para o formato que o RPG Maker aceita', () => {
  const plugins = [
    { name: 'A', status: true, description: 'a', parameters: {} },
    { name: 'B', status: false, description: 'b', parameters: { x: '1' } },
  ];
  const out = serializePluginsJs(plugins);
  assert.ok(out.startsWith('//$plugins=['));
  assert.ok(out.trimEnd().endsWith('//]'));
  const round = parsePluginsJs(out);
  assert.ok(round, 'round-trip deve continuar parseável');
  assert.strictEqual(round.arr.length, 2);
  assert.strictEqual(round.arr[1].parameters.x, '1');
});

test('PLUG-3 registra e ATIVA um plugin, e o registro é verificável', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj,
    '//$plugins=[\n//{"name":"Core","status":true,"description":"c","parameters":{}}\n//]\n',
    'utf8');

  const reg = registerPlugin(pj, { name: 'UltraTranslateOverlay' });
  assert.strictEqual(reg.registered, true, reg.reason || '');
  assert.strictEqual(reg.enabled, true);

  const v = verifyPlugin(pj, 'UltraTranslateOverlay');
  assert.strictEqual(v.present, true);
  assert.strictEqual(v.enabled, true, 'o jogo só carrega status===true');
  assert.strictEqual(v.totalPlugins, 2);

  const onDisk = fs.readFileSync(pj, 'utf8');
  assert.ok(onDisk.includes('UltraTranslateOverlay'), 'prova de escrita real');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PLUG-4 reativa um plugin que estava desabilitado', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj,
    '//$plugins=[\n//{"name":"UltraTranslateOverlay","status":false,"description":"y","parameters":{}}\n//]\n',
    'utf8');

  assert.strictEqual(verifyPlugin(pj, 'UltraTranslateOverlay').enabled, false);
  const reg = registerPlugin(pj, { name: 'UltraTranslateOverlay' });
  assert.strictEqual(reg.changed, true);
  assert.strictEqual(verifyPlugin(pj, 'UltraTranslateOverlay').enabled, true,
    'deve ter reagivado');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PLUG-5 registerPlugin é idempotente (não duplica)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj,
    '//$plugins=[\n//{"name":"Core","status":true,"description":"c","parameters":{}}\n//]\n',
    'utf8');

  registerPlugin(pj, { name: 'X' });
  registerPlugin(pj, { name: 'X' });
  registerPlugin(pj, { name: 'X' });
  assert.strictEqual(verifyPlugin(pj, 'X').totalPlugins, 2,
    'registrar 3 vezes deve resultar em 1 entrada');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PLUG-6 unregisterPlugin remove de verdade (rollback)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj,
    '//$plugins=[\n'
    + '//{"name":"X","status":true,"description":"x","parameters":{}},\n'
    + '//{"name":"Y","status":true,"description":"y","parameters":{}}\n//]\n',
    'utf8');

  const u = unregisterPlugin(pj, 'X');
  assert.strictEqual(u.removed, true, u.reason || '');
  assert.strictEqual(verifyPlugin(pj, 'X').present, false);
  assert.strictEqual(verifyPlugin(pj, 'Y').present, true, 'não pode remover os demais');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PLUG-7 plugins.js ausente é falha declarada, não sucesso silencioso', () => {
  const reg = registerPlugin(path.join(os.tmpdir(), 'nao-existe', 'plugins.js'),
    { name: 'X' });
  assert.strictEqual(reg.registered, false);
  assert.ok(reg.reason, 'a ausência do arquivo precisa ser explicada');
});

test('PLUG-8 plugins.js corrompido é falha declarada', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj, 'isto nao e um plugins.js valido {{{', 'utf8');
  const reg = registerPlugin(pj, { name: 'X' });
  assert.strictEqual(reg.registered, false);
  assert.ok(reg.reason);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PLUG-9 parser tolera plugins com aspas simples e parameters complexos', () => {
  const content = '//$plugins=[\n'
    + `//${JSON.stringify({ name: "Com'Aspas", status: true, description: "d", parameters: { a: '1', b: "2" } })}\n`
    + '//]\n';
  const parsed = parsePluginsJs(content);
  assert.ok(parsed, 'deve parsear mesmo com aspas dentro dos valores');
  assert.strictEqual(parsed.arr[0].name, "Com'Aspas");
  assert.strictEqual(parsed.arr[0].parameters.b, '2');
});

test('PLUG-10 verifyPlugin distingue ausente, presente-desligado e presente-ligado', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-plug-'));
  const pj = path.join(tmp, 'plugins.js');
  fs.writeFileSync(pj,
    '//$plugins=[\n'
    + '//{"name":"Off","status":false,"description":"o","parameters":{}},\n'
    + '//{"name":"On","status":true,"description":"n","parameters":{}}\n//]\n',
    'utf8');

  const off = verifyPlugin(pj, 'Off');
  assert.strictEqual(off.present, true);
  assert.strictEqual(off.enabled, false);

  const on = verifyPlugin(pj, 'On');
  assert.strictEqual(on.present, true);
  assert.strictEqual(on.enabled, true);

  const missing = verifyPlugin(pj, 'NaoExiste');
  assert.strictEqual(missing.present, false);
  assert.strictEqual(missing.enabled, false);
  assert.ok(missing.reason);

  fs.rmSync(tmp, { recursive: true, force: true });
});

runAll();
