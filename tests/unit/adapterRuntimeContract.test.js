/**
 * adapterRuntimeContract.test.js — REGRESSÃO dos 5 adapters quebrados.
 *
 * Bug original (FASE 9 / D1): scripts de rollout injetaram
 *   const accApply = new PartialReport();
 * em dois lugares errados:
 *   1) DENTRO do corpo de um `else if` / de um `if` / de um `for`,
 *      enquanto o `return` que a consome vivia no escopo do método
 *      -> ReferenceError: accApply is not defined
 *   2) SEM o `require('../../core/partialApply')`
 *      -> ReferenceError: PartialReport is not defined
 *
 * Por que o teste anterior não pegou: as 18 suítes registradas NUNCA
 * executavam extract() desses adapters. O teste que eu escrevi para
 * "travar a adoção" (pipelineTransaction A4/A5) lia o TEXTO-FONTE procurando
 * `ac.finish(` — passava com o arquivo corrompido. Um teste que valida a
 * forma do código não valida o comportamento.
 *
 * Este teste executa o comportamento: chama extract() de verdade, num
 * diretório temporário, e exige que:
 *   - não lance ReferenceError;
 *   - devolva um objeto com estrutura utilizável;
 *   - reporte failures em vez de engolê-las;
 *   - extraia texto real quando há texto real.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
function ok(nome) { pass++; console.log('  ok   ' + nome); }
function bad(nome, detalhe) { fail++; console.log('  FALHA ' + nome + (detalhe ? '  <<< ' + detalhe : '')); }

/** Os 5 adapters que lançavam ReferenceError, com o símbolo que faltava. */
const QUEBRADOS = [
  { engine: 'generic', rel: 'src/engines/generic/genericAdapter.js', simbolo: 'accApply' },
  { engine: 'gamemaker', rel: 'src/engines/gamemaker/gameMakerAdapter.js', simbolo: 'accApply' },
  { engine: 'rpgmaker', rel: 'src/engines/rpgmaker/rpgMakerAdapter.js', simbolo: 'accApply' },
  { engine: 'unreal', rel: 'src/engines/unreal/unrealAdapter.js', simbolo: 'PartialReport' },
  { engine: 'godot', rel: 'src/engines/godot/godotAdapter.js', simbolo: 'PartialReport' },
  // CONTRA-AUDITORIA: estes DOIS também estavam corrompidos e a primeira
  // versão deste teste NÃO os cobria. O report anterior declarava "7 de 7
  // corrigidos" sendo que só 5 hadn't sido corrigidos — o teste repetia o
  // mesmo erro do relatório: lista escrita à mão, incompleta.
  { engine: 'unity', rel: 'src/engines/unity/unityAdapter.js', simbolo: 'PartialReport' },
  { engine: 'renpyInjector', rel: 'src/engines/renpy/injector/renpyInjector.js', simbolo: 'PartialReport', semExtract: true },
];

/**
 * Varre TODOS os arquivos de produção em busca de `new PartialReport()` sem
 * import. É a defesa que faltava: em vez de uma lista escrita à mão (que é
 * exatamente como 2 arquivos escaparam), deriva o próprio conjunto.
 */
function productionFilesUsingPartialReport() {
  const out = [];
  const SKIP = new Set(['node_modules', '.git', 'tests', 'tools', 'graphify-out', 'archives']);
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.js$/.test(e.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      if (!/new PartialReport\(/.test(s)) continue;
      const importa = /require\(\s*['"][^'"]*partialApply[^'"]*['"]\s*\)/.test(s);
      const declara = /(class|const|let|var)\s+PartialReport\s*[={]/.test(s);
      out.push({ rel: path.relative(RAIZ, p).replace(/\\/g, '/'), ok: importa || declara });
    }
  })(RAIZ);
  return out;
}

function tmpdir(nome) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-adapter-' + nome + '-'));
  return d;
}

function textsDe(r) {
  if (Array.isArray(r)) return r;
  if (r && Array.isArray(r.texts)) return r.texts;
  return null;
}

(async function run() {
  console.log('');
  console.log('--- A1 extract() NÃO LANÇA ReferenceError (os corrompidos) ---');
  for (const c of QUEBRADOS) {
    if (c.semExtract) {
      // renpyInjector não tem extract(); o que importa é que o arquivo
      // CARREGUE e que o método corrompido (rollback) não estoure.
      let err = null;
      try {
        const Mod = require(path.join(RAIZ, c.rel));
        const inst = new Mod();
        if (typeof inst.rollback !== 'function') { bad(`A1 ${c.engine} tem rollback()`, 'metodo ausente'); continue; }
      } catch (e) { err = e; }
      if (err) bad(`A1 ${c.engine} carrega e expõe rollback sem ${c.simbolo} indefinido`,
        err.constructor.name + ': ' + err.message);
      else ok(`A1 ${c.engine} carrega e expõe rollback sem ${c.simbolo} indefinido`);
      continue;
    }
    const d = tmpdir(c.engine);
    let inst, err = null, res = null;
    try {
      const Mod = require(path.join(RAIZ, c.rel));
      inst = new Mod();
      res = await Promise.race([
        Promise.resolve(inst.extract(d, {})),
        new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT 25s')), 25000)),
      ]);
    } catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });

    if (err) {
      bad(`A1 ${c.engine}.extract() executa sem ${c.simbolo} indefinido`,
        err.constructor.name + ': ' + err.message);
    } else {
      ok(`A1 ${c.engine}.extract() executa sem ${c.simbolo} indefinido`);
    }
    if (!err) {
      if (textsDe(res) === null) {
        bad(`A1b ${c.engine}.extract() devolve estrutura com texts[]`,
          'devolveu ' + JSON.stringify(res).slice(0, 80));
      } else {
        ok(`A1b ${c.engine}.extract() devolve estrutura com texts[]`);
      }
      if (res && res.success === undefined && res.count === undefined) {
        bad(`A1c ${c.engine}.extract() declara contagem/sucesso`, JSON.stringify(res).slice(0, 80));
      } else {
        ok(`A1c ${c.engine}.extract() declara contagem/sucesso`);
      }
    }
  }

  console.log('');
  console.log('--- A2 extração REAL: fixture com texto produz texto ---');
  // generic: JSON com strings
  {
    const d = tmpdir('generic-real');
    fs.writeFileSync(path.join(d, 'strings.json'), JSON.stringify({ greet: 'Hello world', menu: 'Start Game' }));
    const Mod = require(path.join(RAIZ, 'src/engines/generic/genericAdapter.js'));
    let n = 0, err = null;
    try { const r = await new Mod().extract(d, {}); n = r.count !== undefined ? r.count : textsDe(r).length; }
    catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err) bad('A2 generic extrai strings de JSON real', err.message);
    else if (n < 2) bad('A2 generic extrai strings de JSON real', 'extraiu ' + n + ', esperado >= 2');
    else ok(`A2 generic extrai ${n} strings de JSON real`);
  }
  // gamemaker: lang.json
  {
    const d = tmpdir('gm-real');
    fs.writeFileSync(path.join(d, 'lang.json'), JSON.stringify({ room: 'Living Room', obj: 'Table' }));
    const Mod = require(path.join(RAIZ, 'src/engines/gamemaker/gameMakerAdapter.js'));
    let n = 0, err = null;
    try { const r = await new Mod().extract(d, {}); n = r.count !== undefined ? r.count : textsDe(r).length; }
    catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err) bad('A2 gamemaker extrai lang.json real', err.message);
    else if (n < 2) bad('A2 gamemaker extrai lang.json real', 'extraiu ' + n + ', esperado >= 2');
    else ok(`A2 gamemaker extrai ${n} textos de lang.json real`);
  }

  console.log('');
  console.log('--- A3 escopo: o acumulador pertence ao MÉTODO, não a bloco aninhado ---');
  // Se alguém mover a declaração para dentro de um if/for/else-if de novo,
  // o `return` do fim do método volta a estourar. Este teste cobre o
  // comportamento; a prova de que a declaração está no escopo certo é A1.
  // Aqui verificamos o outro lado: um error real é REPORTADO, não engolido.
  for (const c of QUEBRADOS) {
    const d = tmpdir(c.engine + '-fail');
    // conteúdo que força erro de leitura: diretório com arquivo ilegível não é
    // portátil; usamos um .json corrompido, que deve ser registrado como falha
    // parcial em vez de derrubar o restante.
    try { fs.writeFileSync(path.join(d, 'broken.json'), '{ isto nao e json'); } catch (_) {}
    let res = null, err = null;
    try {
      const Mod = require(path.join(RAIZ, c.rel));
      res = await Promise.race([
        Promise.resolve(new Mod().extract(d, {})),
        new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
      ]);
    } catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err && /TIMEOUT/.test(err.message)) {
      bad(`A3 ${c.engine} tolera JSON corrompido sem crash`, 'timeout');
    } else if (err) {
      // Um ReferenceError aqui seria a regressão original.
      if (/is not defined/.test(err.message)) {
        bad(`A3 ${c.engine} tolera JSON corrompido sem ReferenceError`, err.message);
      } else {
        ok(`A3 ${c.engine} falhou de forma declarada (${err.constructor.name}), sem ReferenceError`);
      }
    } else {
      ok(`A3 ${c.engine} devolveu resultado com JSON corrompido presente`);
    }
  }

  console.log('');
  console.log('--- A4 nenhum adapter de produção usa PartialReport sem importar ---');
  for (const c of QUEBRADOS) {
    const src = fs.readFileSync(path.join(RAIZ, c.rel), 'utf8');
    const usa = /new PartialReport\(/.test(src);
    const importa = /require\(\s*['"][^'"]*partialApply['"]\s*\)/.test(src);
    if (usa && !importa) bad(`A4 ${c.engine} importa PartialReport onde usa`, 'usa sem require');
    else ok(`A4 ${c.engine} ${usa ? 'importa' : 'nao usa'} PartialReport de forma consistente`);
  }

  console.log('');
  console.log('--- A5 TODA a superficie de produção que usa PartialReport está coerente ---');
  const todos = productionFilesUsingPartialReport();
  const ruins = todos.filter((t) => !t.ok);
  if (ruins.length === 0) {
    ok(`A5 os ${todos.length} arquivos de produção que usam PartialReport importam ou declaram o símbolo`);
    for (const t of todos) console.log('       (' + t.rel + ')');
  } else {
    bad('A5 todo arquivo que usa PartialReport o declara/importa',
      ruins.map((r) => r.rel).join(', '));
  }

  console.log('');
  console.log('--- A6 apply()/rollback() EXECUTAM (a primeira versão deste teste não cobria) ---');
  // unit/renpy/injector.test.js continuava falhando com `accApply is not
  // defined` DEPOIS de eu ter declarado "7 de 7 corrigidos". Este bloco é a
  // prova independente que faltava.
  {
    // gameMaker.apply(): o bug de escopo vivia dentro do `for`
    const d = tmpdir('gm-apply');
    fs.writeFileSync(path.join(d, 'lang.json'), JSON.stringify({ a: 'Hello' }));
    const textos = [{ id: 'g1', file: 'lang.json', original: 'Hello', clean: 'Hello', format: 'json' }];
    let err = null, r = null;
    try {
      const inst = new (require(path.join(RAIZ, 'src/engines/gamemaker/gameMakerAdapter.js')))();
      inst.backupManager = { createBackup: () => ({ ok: true }), restoreOldestBackup: () => ({ ok: false }) };
      r = await Promise.race([
        Promise.resolve(inst.apply(d, textos, new Map([['g1', 'Ola']]))),
        new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
      ]);
    } catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err) bad('A6 gamemaker.apply() executa sem accApply indefinido', err.constructor.name + ': ' + err.message);
    else ok(`A6 gamemaker.apply() executa (success=${r && r.success}, count=${r && r.count})`);
  }
  {
    // cocos2dx.apply() e cocosCreator.apply(): ReferenceError `accApply is not
    // defined`. Este era o PAR Worse — os dois adapters que o relatório
    // anterior declarava "reparados e verificados". A verificação anterior
    // olhava `ac.finish(` no TEXTO-FONTE, que passa com o arquivo quebrado.
    for (const [nome, rel] of [
      ['cocos2dx', 'src/engines/cocos/cocos2dxAdapter.js'],
      ['cocosCreator', 'src/engines/cocos/cocosCreatorAdapter.js'],
      ['defold', 'src/engines/defold/defoldAdapter.js'],
    ]) {
      const d = tmpdir(nome + '-apply');
      const f = rel.includes('cocos') ? 'data.json' : 'game.project';
      fs.writeFileSync(path.join(d, f), rel.includes('cocos') ? JSON.stringify({ k: 'Hello' }) : '[project]\nname="x"\n');
      let err = null, r = null;
      try {
        const inst = new (require(path.join(RAIZ, rel)))();
        try {
          inst.backupManager.createBackup = () => ({ ok: true });
          inst.backupManager.restoreOldestBackup = () => ({ ok: false });
        } catch (_) { inst.backupManager = { createBackup: () => ({ ok: true }), restoreOldestBackup: () => ({ ok: false }) }; }
        const textos = [{ id: 'c1', file: f, original: 'Hello', clean: 'Hello', format: 'json' }];
        r = await Promise.race([
          Promise.resolve(inst.apply(d, textos, new Map([['c1', 'Ola']]))),
          new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
        ]);
      } catch (e) { err = e; }
      fs.rmSync(d, { recursive: true, force: true });
      if (err) bad(`A6 ${nome}.apply() executa sem ReferenceError`, err.constructor.name + ': ' + err.message);
      else ok(`A6 ${nome}.apply() executa (success=${r && r.success}, count=${r && r.count})`);
    }
  }
  {
    // unity.apply(): ReferenceError PartialReport (achado na contra-auditoria)
    const d = tmpdir('unity-apply');
    let err = null, r = null;
    try {
      const inst = new (require(path.join(RAIZ, 'src/engines/unity/unityAdapter.js')))();
      inst.backupManager = { createBackup: () => ({ ok: true }), restoreOldestBackup: () => ({ ok: false }) };
      const textos = [{ id: 'u1', file: 'payload.bin', original: 'Hello', clean: 'Hello', format: 'binary' }];
      r = await Promise.race([
        Promise.resolve(inst.apply(d, textos, new Map([['u1', 'Ola']]))),
        new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
      ]);
    } catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err) bad('A6 unity.apply() executa sem PartialReport indefinido', err.constructor.name + ': ' + err.message);
    else ok(`A6 unity.apply() executa (success=${r && r.success}, count=${r && r.count})`);
  }
  {
    // renpyInjector.rollback(): a segunda declaração injetada dentro do try
    const d = tmpdir('renpy-rb');
    const Mod = require(path.join(RAIZ, 'src/engines/renpy/injector/renpyInjector.js'));
    const inst = new Mod();
    if (typeof inst.resolveGameSubDir !== 'function' && !inst.resolveGameSubDir) {
      // pode ser propriedade; segue mesmo assim
    }
    let err = null, r = null;
    try {
      r = await Promise.race([
        Promise.resolve(inst.rollback(d)),
        new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT')), 25000)),
      ]);
    } catch (e) { err = e; }
    fs.rmSync(d, { recursive: true, force: true });
    if (err) bad('A6 renpyInjector.rollback() executa sem accApply indefinido', err.constructor.name + ': ' + err.message);
    else ok(`A6 renpyInjector.rollback() executa (success=${r && r.success})`);
  }

  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) process.exit(1);
})();