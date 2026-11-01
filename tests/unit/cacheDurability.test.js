/**
 * tests/unit/cacheDurability.test.js — FASE 5 / PASSO 30
 *
 * O cache precisa persistir OU DECLARAR QUE NÃO PERSISTE. Este teste roda
 * contra o `src/services/cache.js` real, num DATA_DIR temporário, e confere o
 * comportamento no disco — não a forma do código.
 *
 * ---------------------------------------------------------------------------
 * OS DEFEITOS
 *
 * 1. `new Database(path.join(DATA_DIR, ...))` sem garantir que DATA_DIR
 *    existia. Ausente, o SQLite lançava, o catch registrava um aviso e `db`
 *    ficava null: TODO o sistema caía no fallback JSON sem informar ninguém.
 *
 * 2. A migração JSON→SQLite rodava no IMPORT, declarava sucesso
 *    incondicionalmente e renomeava o JSON. Cache vazio ou transação
 *    incompleta produziam "sucesso" e perda de dados.
 *
 * 3. `getCommonTranslation` escolhia o par de idioma por dois regex
 *    (CJK → ja, ASCII → en). Coreano, russo, árabe, tailandês e grego não
 *    casavam com nenhum: o dicionário nunca era consultado.
 *
 * 4. `saveGlossary`/`saveCfg` faziam `writeFileSync` direto e devolviam
 *    `true` incondicional.
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

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 5 — CACHE PERSISTENTE ===');
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
  console.log('\n--- RESULTADO FASE 5 (cache) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

/**
 * Carrega src/services/cache.js com um DATA_DIR TEMPORÁRIO e recém-criado.
 * O módulo usa singletons (global.DATA_DIR), então cada cenário precisa de um
 * diretório próprio e de um cache de require limpo.
 */
function freshCache(dataDirName) {
  const dir = path.join(os.tmpdir(), `ot-cache-${dataDirName}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  // NÃO criamos o diretório de propósito quando o teste quer testar ausência.

  // Limpa o cache de módulos para que cache.js reavalie os globals.
  for (const k of Object.keys(require.cache)) {
    if (k.includes(path.join('src', 'services', 'cache.js'))) delete require.cache[k];
  }
  global.ROOT = ROOT;
  global.DATA_DIR = dir;
  global.CFG_PATH = path.join(dir, 'openT.json');
  const logs = [];
  global.log = (lvl, msg) => logs.push(`${lvl}:${msg}`);
  const cache = require(path.join(ROOT, 'src', 'services', 'cache.js'));
  cache.__logs = logs;
  cache.__dir = dir;
  return cache;
}

function cleanup(cache) {
  try { cache.closeDb(); } catch (e) { /* ignore */ }
  try {
    if (cache.__dir && fs.existsSync(cache.__dir)) {
      fs.rmSync(cache.__dir, { recursive: true, force: true });
    }
  } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------------------
test('K1 DATA_DIR ausente é criado e o SQLite abre (o bug do fallback silencioso)', () => {
  const cache = freshCache('criar');
  try {
    assert.ok(fs.existsSync(cache.__dir),
      'FASE 5: o diretório de dados precisa ser criado antes de abrir o banco');
    const st = cache.getStorageStatus();
    assert.strictEqual(st.sqliteActive, true,
      `SQLite deveria ter aberto; status=${JSON.stringify(st)}`);
    assert.strictEqual(st.fallbackInUse, false);
  } finally {
    cleanup(cache);
  }
});

test('K2 getStorageStatus declara o backend, não o assume', () => {
  const cache = freshCache('status');
  try {
    const st = cache.getStorageStatus();
    for (const f of ['sqliteActive', 'dataDir', 'fallbackInUse', 'error', 'note']) {
      assert.ok(f in st, `getStorageStatus precisa expor ${f}`);
    }
    assert.strictEqual(typeof st.sqliteActive, 'boolean');
  } finally {
    cleanup(cache);
  }
});

test('K3 grava e relê: o que foi salvo volta na leitura', () => {
  const cache = freshCache('roundtrip');
  try {
    const items = [
      ['こんにちは', 'Olá'],
      ['안녕하세요', 'Bom dia'],
      ['Good morning', 'Bom dia'],
    ];
    const w = cache.saveNewGlobalTranslations('ja', 'pt', items, 'renpy');
    assert.strictEqual(w.persisted, true, `gravação falhou: ${JSON.stringify(w)}`);
    assert.ok(w.accepted > 0);
    assert.strictEqual(w.backend, 'SQLite');

    const r = cache.loadGlobalCacheForLang('ja', 'pt', 'renpy');
    assert.strictEqual(r['こんにちは'], 'Olá');
    assert.strictEqual(r['안녕하세요'], 'Bom dia');
    assert.strictEqual(r['Good morning'], 'Bom dia');
  } finally {
    cleanup(cache);
  }
});

test('K4 a gravação RELÊ do banco e confirma (não confia na própria escrita)', () => {
  const cache = freshCache('verificar');
  try {
    const w = cache.saveNewGlobalTranslations('ja', 'pt', [['こんにちは', 'Olá']], 'renpy');
    assert.ok(w.verified !== undefined, 'o relatório deve informar a verificação');
    if (w.backend === 'SQLite') {
      assert.strictEqual(w.verified, w.accepted,
        `persistência parcial não declarada: aceitos=${w.accepted} verificados=${w.verified}`);
    }
  } finally {
    cleanup(cache);
  }
});

test('K5 entradas rejeitadas pelo filtro são CONTADAS, não sumidas', () => {
  const cache = freshCache('rejeicao');
  try {
    const w = cache.saveNewGlobalTranslations('ja', 'pt', [
      ['こんにちは', 'Olá'],
      ['', ''],
      ['   ', '   '],
    ], 'renpy');
    assert.ok(w.rejected > 0,
      'entradas vazias deveriam ser rejeitadas e contadas');
    assert.strictEqual(w.accepted, 1, 'só a entrada válida deveria entrar');
    assert.ok(cache.__logs.some((l) => l.startsWith('warn') && l.includes('REJEITADAS')),
      'a rejeição precisa aparecer no log');
  } finally {
    cleanup(cache);
  }
});

test('K6 todas rejeitadas = persistência FALHA declarada (não sucesso vazio)', () => {
  const cache = freshCache('tudo-rejeitado');
  try {
    const w = cache.saveNewGlobalTranslations('ja', 'pt', [['', '']], 'renpy');
    assert.strictEqual(w.persisted, false);
    assert.ok(w.reason, 'a falha precisa de motivo');
    assert.strictEqual(w.accepted, 0);
  } finally {
    cleanup(cache);
  }
});

test('K7 entrada vazia devolve relatório, não undefined', () => {
  const cache = freshCache('vazio');
  try {
    const w = cache.saveNewGlobalTranslations('ja', 'pt', [], 'renpy');
    assert.ok(w && typeof w === 'object', 'precisa devolver um relatório');
    assert.strictEqual(w.persisted, false);
    const w2 = cache.saveNewGlobalTranslations('ja', 'pt', null, 'renpy');
    assert.ok(w2 && typeof w2 === 'object', 'null também precisa de relatório');
  } finally {
    cleanup(cache);
  }
});

// ---------------------------------------------------------------------------
// Migração
// ---------------------------------------------------------------------------
test('K8 a migração NÃO roda no import (efeito destrutivo antes do consumidor)', () => {
  // Prepara um JSON com conteúdo antes de carregar o módulo.
  const dir = path.join(os.tmpdir(), `ot-cache-mig-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'global_trans_cache.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    'ja|pt|renpy': { 'こんにちは': 'Olá' },
  }), 'utf8');

  for (const k of Object.keys(require.cache)) {
    if (k.includes(path.join('src', 'services', 'cache.js'))) delete require.cache[k];
  }
  global.ROOT = ROOT;
  global.DATA_DIR = dir;
  global.CFG_PATH = path.join(dir, 'openT.json');
  global.log = () => {};
  const cache = require(path.join(ROOT, 'src', 'services', 'cache.js'));

  try {
    assert.ok(fs.existsSync(jsonPath),
      'BUG ORIGINAL: o import já renomeava o JSON, antes de qualquer '
      + 'tratamento de erro do consumidor');
    assert.ok(!fs.existsSync(`${jsonPath}.bak`),
      'BUG ORIGINAL: o import já movia o cache de cena');
  } finally {
    try { cache.closeDb(); } catch (e) { /* ignore */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('K9 migração executada explicitamentemove os dados e VERIFICA', () => {
  const dir = path.join(os.tmpdir(), `ot-cache-mig2-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'global_trans_cache.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    'ja|pt|renpy': { 'こんにちは': 'Olá', 'せかい': 'Mundo' },
  }), 'utf8');

  for (const k of Object.keys(require.cache)) {
    if (k.includes(path.join('src', 'services', 'cache.js'))) delete require.cache[k];
  }
  global.ROOT = ROOT;
  global.DATA_DIR = dir;
  global.CFG_PATH = path.join(dir, 'openT.json');
  global.log = () => {};
  const cache = require(path.join(ROOT, 'src', 'services', 'cache.js'));

  try {
    const r = cache.migrateJsonCacheToSqlite();
    assert.strictEqual(r.migrated, true, `migração falhou: ${JSON.stringify(r)}`);
    assert.strictEqual(r.rowsIn, 2);
    assert.ok(r.rowsVerified >= r.rowsIn,
      `a verificação deve confirmar as linhas: in=${r.rowsIn} verified=${r.rowsVerified}`);
    assert.strictEqual(r.jsonPreserved, false,
      'com tudo verificado, o JSON pode sair de cena');
    assert.ok(fs.existsSync(`${jsonPath}.bak`));

    // E os dados estão de fato no banco.
    const d = cache.loadGlobalCacheForLang('ja', 'pt', 'renpy');
    assert.strictEqual(d['こんにちは'], 'Olá');
    assert.strictEqual(d['せかい'], 'Mundo');
  } finally {
    try { cache.closeDb(); } catch (e) { /* ignore */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('K10 migração com JSON CORROMPIDO preserva o arquivo e não diz sucesso', () => {
  const dir = path.join(os.tmpdir(), `ot-cache-mig3-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'global_trans_cache.json');
  const CORROMPIDO = '{ isto nao e json {{{';
  fs.writeFileSync(jsonPath, CORROMPIDO, 'utf8');

  for (const k of Object.keys(require.cache)) {
    if (k.includes(path.join('src', 'services', 'cache.js'))) delete require.cache[k];
  }
  global.ROOT = ROOT;
  global.DATA_DIR = dir;
  global.CFG_PATH = path.join(dir, 'openT.json');
  const logs = [];
  global.log = (l, m) => logs.push(`${l}:${m}`);
  const cache = require(path.join(ROOT, 'src', 'services', 'cache.js'));

  try {
    const r = cache.migrateJsonCacheToSqlite();
    assert.strictEqual(r.migrated, false);
    assert.strictEqual(r.jsonPreserved, true, 'JSON corrompido deve ser preservado');
    assert.ok(r.reason, 'a falha precisa de motivo');
    assert.strictEqual(fs.readFileSync(jsonPath, 'utf8'), CORROMPIDO,
      'o arquivo corrompido não pode ser tocado');
    assert.ok(!logs.some((l) => l.startsWith('success')),
      'não pode haver mensagem de sucesso numa migração que falhou');
  } finally {
    try { cache.closeDb(); } catch (e) { /* ignore */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('K11 migração de cache VAZIO não declara sucesso de migração', () => {
  const dir = path.join(os.tmpdir(), `ot-cache-mig4-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'global_trans_cache.json'), '{}', 'utf8');

  for (const k of Object.keys(require.cache)) {
    if (k.includes(path.join('src', 'services', 'cache.js'))) delete require.cache[k];
  }
  global.ROOT = ROOT;
  global.DATA_DIR = dir;
  global.CFG_PATH = path.join(dir, 'openT.json');
  const logs = [];
  global.log = (l, m) => logs.push(`${l}:${m}`);
  const cache = require(path.join(ROOT, 'src', 'services', 'cache.js'));

  try {
    const r = cache.migrateJsonCacheToSqlite();
    assert.strictEqual(r.rowsIn, 0);
    assert.ok(!logs.some((l) => l.startsWith('success')),
      'migrar zero linhas não é sucesso');
    // E o arquivo não foi destruído.
    assert.ok(fs.existsSync(path.join(dir, 'global_trans_cache.json')));
  } finally {
    try { cache.closeDb(); } catch (e) { /* ignore */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// getCommonTranslation — o bug de classe da FASE 4
// ---------------------------------------------------------------------------
test('K12 getCommonTranslation consulta o dicionário para QUALQUER script', () => {
  const cache = freshCache('dicionario');
  try {
    // Um dicionário com um par para cada idioma.
    const common = {
      ja_pt: { 'こんにちは': 'Olá' },
      ko_pt: { '안녕하세요': 'Olá' },
      ru_pt: { 'Привет': 'Olá' },
      ar_pt: { 'مرحبا': 'Olá' },
      th_pt: { 'สวัสดี': 'Olá' },
      en_pt: { 'Hello': 'Olá' },
    };
    const CASES = [
      ['こんにちは', 'ja'],
      ['안녕하세요', 'ko'],
      ['Привет', 'ru'],
      ['مرحبا', 'ar'],
      ['สวัสดี', 'th'],
      ['Hello', 'en'],
    ];
    for (const [text] of CASES) {
      const r = cache.getCommonTranslation(text, 'auto', 'pt', common);
      assert.strictEqual(r, 'Olá',
        `BUG ORIGINAL: "${text}" nunca consultava o dicionário (nenhum regex casa)`);
    }
  } finally {
    cleanup(cache);
  }
});

test('K13 o idioma DECLARADO tem prioridade sobre o detectado', () => {
  const cache = freshCache('prioridade');
  try {
    const common = {
      en_pt: { 'word': 'Do dicionário EN' },
      ja_pt: { 'word': 'Do dicionário JA' },
    };
    assert.strictEqual(
      cache.getCommonTranslation('word', 'ja', 'pt', common), 'Do dicionário JA',
      'sl declarado deve vencer a detecção',
    );
  } finally {
    cleanup(cache);
  }
});

test('K14 texto ausente devolve null (não exception, não palpite)', () => {
  const cache = freshCache('ausente');
  try {
    const common = { ja_pt: { 'こんにちは': 'Olá' } };
    for (const t of ['inexistente', '', '   ', null, undefined]) {
      assert.strictEqual(cache.getCommonTranslation(t, 'ja', 'pt', common), null,
        `texto ${JSON.stringify(t)} deveria devolver null`);
    }
    assert.strictEqual(cache.getCommonTranslation('x', 'ja', 'pt', null), null);
  } finally {
    cleanup(cache);
  }
});

test('K15 um dicionário existente é consultado mesmo sem script reconhecido', () => {
  const cache = freshCache('fallback-pares');
  try {
    // Emoji apenas: nenhum script conhecido. Mas existe ko_pt no arquivo.
    const common = { ko_pt: { '\u{1F600}teste': 'Traduzido' } };
    const r = cache.getCommonTranslation('\u{1F600}teste', 'auto', 'pt', common);
    assert.strictEqual(r, 'Traduzido',
      'melhor achar a tradução do que declarar que não existe');
  } finally {
    cleanup(cache);
  }
});

// ---------------------------------------------------------------------------
// Config e glossário
// ---------------------------------------------------------------------------
test('K16 saveCfg devolve resultado e o dado realmente está no disco', () => {
  const cache = freshCache('cfg');
  try {
    const r = cache.saveCfg({ foo: 'bar', n: 42 });
    assert.ok(r && typeof r === 'object', 'saveCfg precisa devolver um relatório');
    assert.strictEqual(r.ok, true, `falhou: ${JSON.stringify(r)}`);
    const back = cache.loadCfg();
    assert.strictEqual(back.foo, 'bar');
    assert.strictEqual(back.n, 42);
  } finally {
    cleanup(cache);
  }
});

test('K17 saveGlossary devolve resultado e persiste', () => {
  const cache = freshCache('glossario');
  try {
    const entries = [{ term: 'sword', translation: 'espada' }];
    const r = cache.saveGlossary(entries);
    assert.ok(r && typeof r === 'object');
    assert.strictEqual(r.ok, true, `falhou: ${JSON.stringify(r)}`);
    const back = cache.loadGlossary();
    assert.strictEqual(back.length, 1);
    assert.strictEqual(back[0].term, 'sword');
  } finally {
    cleanup(cache);
  }
});

test('K18 nenhuma escrita deixa arquivo .tmp órfão', () => {
  const cache = freshCache('tmp');
  try {
    cache.saveCfg({ a: 1 });
    cache.saveGlossary([{ term: 'a', translation: 'b' }]);
    cache.saveNewGlobalTranslations('ja', 'pt', [['こんにちは', 'Olá']], 'renpy');
    const leftovers = fs.readdirSync(cache.__dir).filter((f) => f.includes('.tmp'));
    assert.strictEqual(leftovers.length, 0,
      `arquivos temporários órfãos: ${leftovers.join(', ')}`);
  } finally {
    cleanup(cache);
  }
});

test('K19 o JSON gravado é VÁLIDO e não truncado', () => {
  const cache = freshCache('valido');
  try {
    const big = {};
    for (let i = 0; i < 500; i++) big[`termo${i}`] = `traducao${i}`.repeat(20);
    const r = cache.saveCfg(big);
    assert.strictEqual(r.ok, true);
    const back = JSON.parse(fs.readFileSync(global.CFG_PATH, 'utf8'));
    assert.strictEqual(Object.keys(back).length, 500);
    assert.strictEqual(back.termo499, 'traducao499'.repeat(20));
  } finally {
    cleanup(cache);
  }
});

test('K20 a escrita é ATÓMICA: nunca deixa JSON pela metade', () => {
  const cache = freshCache('atomico');
  try {
    // Preenche com um conteúdo grande e válido.
    const big = { big: 'x'.repeat(200000) };
    const r = cache.saveCfg(big);
    assert.strictEqual(r.ok, true);
    // Após a escrita, o que está no disco tem que ser o objeto inteiro.
    const back = JSON.parse(fs.readFileSync(global.CFG_PATH, 'utf8'));
    assert.strictEqual(back.big.length, 200000);
  } finally {
    cleanup(cache);
  }
});

runAll();
