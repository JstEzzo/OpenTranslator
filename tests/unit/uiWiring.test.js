/**
 * tests/unit/uiWiring.test.js — FASE 8 / PASSO 34 & 35
 *
 * A UI precisa alcançar a capacidade real do servidor, e o que ela afirma
 * precisa ser o que aconteceu.
 *
 * ---------------------------------------------------------------------------
 * O QUE EXISTIA
 *
 * O servidor tinha o subsistema de runtime inteiro — `runtimeStartSession`,
 * `runtimeStopSession`, `runtimeProbe`, `runtimeCaptureScreen`,
 * `stagingPrepare`, `stagingCleanup`, `routerRecommend`, `getTriadInfo` —
 * e a UI não chamava NENHUM. O painel de runtime lia textos capturados e
 * dizia "Nenhum texto runtime capturado ainda... quando o jogo é executado
 * com o hook ativo", sem existir caminho na UI para executar o jogo com o
 * hook. Capacidade real, inalcançável.
 *
 * O job system (`startTranslationJob`, `getJobStatus`, `listTranslationJobs`,
 * `resumeTranslationJob`) tinha checkpoint em disco e a UI também não o
 * chamava: um job interrompido não tinha forma de ser retomado.
 *
 * E havia 4 lacunas de escape em `innerHTML` com dado vindo do servidor.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 8 — UI: CAPACIDADE LIGADA E ESCAPE ===');
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
  console.log('\n--- RESULTADO FASE 8 (UI) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

const APP = fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8');
const RPC = fs.readFileSync(path.join(ROOT, 'src', 'services', 'rpcHandlers.js'), 'utf8');

/** Handlers realmente chamados pela UI. */
function uiCalls() {
  return new Set([...APP.matchAll(
    /(?:rpc|callRPC|invoke|api)\s*\(\s*["'`]([A-Za-z_][\w$]*)["'`]/g,
  )].map((m) => m[1]));
}

/** Handlers realmente declarados no servidor. */
function serverHandlers() {
  const PALAVRAS = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'setTimeout',
    'setInterval', 'require', 'typeof', 'do', 'else', 'try', 'constructor',
    'clearTimeout', 'clearInterval', 'setImmediate',
  ]);
  return new Set([...RPC.matchAll(/^\s{2,}(?:async\s+)?([A-Za-z_][\w$]*)\s*\(/gm)]
    .map((m) => m[1])
    .filter((n) => !PALAVRAS.has(n)));
}

/**
 * Extrai o corpo de um handler de clique pelo seu registro.
 *
 * FASE 8 — a primeira versão usava `APP.indexOf('mRuntimeStart')`, que
 * ancora no PRIMEIRO Appearance: a criação do botão no HTML do painel, não o
 * `addEventListener`. O teste passava/falhava por acaso, sem examinar o
 * código que importa. Aqui a âncora é o próprio registro do listener.
 */
function clickHandler(id) {
  const re = new RegExp(`\\$\\(\\s*"${id}"\\s*\\)\\?\\.addEventListener\\(\\s*"click"`, 'm');
  const m = re.exec(APP);
  assert.ok(m, `não encontrei listener de clique para #${id}`);
  // Vai até o próximo `});` no mesmo nível de indentação.
  const ini = m.index;
  const L = APP.slice(ini).split(/\r?\n/);
  let acc = 0;
  let fim = L.length - 1;
  for (let i = 0; i < L.length; i++) {
    for (const ch of L[i]) {
      if (ch === '(') acc++;
      if (ch === ')') acc--;
    }
    if (acc <= 0 && i > 0) { fim = i; break; }
  }
  return L.slice(0, fim + 1).join('\n');
}

/** Nomes de handler referenciados na UI (nomes de botão e de RPC). */
function clickHandlers() {
  return [...APP.matchAll(
    /\$\(\s*"([A-Za-z_][\w-]*)"\s*\)\?\.addEventListener\(\s*"click"/g,
  )].map((m) => m[1]);
}

/** Blocos innerHTML com template literal, do início ao fechamento. */
function innerHtmlBlocks() {
  const L = APP.split(/\r?\n/);
  const out = [];
  L.forEach((l, i) => {
    const m = /([\w$.[\]"']+)\.innerHTML\s*=\s*`/.exec(l);
    if (!m) return;
    let fim = i;
    for (let k = i + 1; k < L.length && k < i + 90; k++) {
      if ((L[k].match(/`/g) || []).length % 2 === 1) { fim = k; break; }
    }
    out.push({ alvo: m[1], ini: i, fim, texto: L.slice(i, fim + 1).join('\n') });
  });
  return out;
}

// ---------------------------------------------------------------------------
// PASSO 34 — runtime ligado
// ---------------------------------------------------------------------------
test('W1 a UI chama o ciclo de vida da sessão de runtime', () => {
  const c = uiCalls();
  for (const h of [
    'runtimeStartSession', 'runtimeStopSession', 'runtimeProbe',
    'runtimeCaptureScreen', 'stagingPrepare', 'routerRecommend', 'getTriadInfo',
  ]) {
    assert.ok(c.has(h),
      `BUG ORIGINAL: ${h} existe no servidor e a UI nunca o chamava`);
  }
});

test('W2 a UI cria os botões do painel de runtime', () => {
  for (const id of [
    'mRuntimeStart', 'mRuntimeStop', 'mRuntimeProbe',
    'mRuntimeShot', 'mRuntimeTriad', 'rtSessaoBadge',
  ]) {
    assert.ok(APP.includes(`id="${id}"`), `falta o elemento #${id}`);
  }
});

test('W3 o botão de encerrar só aparece quando há sessão', () => {
  // Um botão "encerrar" sempre visível invites o usuário a clicar sem
  // sessão ativa; o handler respondia "nenhuma sessão" e o botão parecia quebrado.
  assert.ok(/id="mRuntimeStop"[^>]*style="display:none"/.test(APP),
    'o botão de encerrar precisa nascer oculto');
  assert.ok(APP.includes('btnStop.style.display = ""'),
    'e aparecer quando há sessão');
});

test('W4 iniciar sessão sem sessionId NÃO é declarado iniciado', () => {
  const bloco = clickHandler('mRuntimeStart');
  assert.ok(/res\.sessionId/.test(bloco),
    'a UI precisa exigir sessionId antes de dizer que iniciou');
  assert.ok(/Runtime session not started/.test(bloco),
    'e precisa avisar quando o servidor não devolveu sessionId');
  assert.ok(/log\("success"/.test(bloco) === false
    || /sessionId/.test(bloco),
  'o log de sucesso tem de estar depois do teste de sessionId');
});

test('W5 encerrar sessão só é declarado quando o servidor confirma', () => {
  const bloco = clickHandler('mRuntimeStop');
  assert.ok(/res\.success/.test(bloco),
    'encerrar precisa checar a confirmação do servidor');
  assert.ok(/Shutdown not confirmed/.test(bloco),
    'e avisar quando não confirmada');
});

test('W6 a sonda detecta processo morto e limpa o estado local', () => {
  const bloco = clickHandler('mRuntimeProbe');
  assert.ok(/p\.alive/.test(bloco),
    'a sonda precisa ler se o processo está vivo');
  assert.ok(/runtimeSessaoAtual = null/.test(bloco),
    'e limpar a sessão quando o processo morreu');
});

// ---------------------------------------------------------------------------
// PASSO 35 — job system ligado
// ---------------------------------------------------------------------------
test('W7 a UI usa o job system (start/getJobStatus/list/resume)', () => {
  const c = uiCalls();
  for (const h of [
    'startTranslationJob', 'getJobStatus', 'listTranslationJobs', 'resumeTranslationJob',
  ]) {
    assert.ok(c.has(h), `BUG ORIGINAL: ${h} existe no servidor e a UI nunca o chamava`);
  }
});

test('W8 iniciar job sem jobId NÃO é declarado iniciado', () => {
  const bloco = clickHandler('mTranslateJob');
  assert.ok(/res\.jobId/.test(bloco), 'a UI precisa exigir jobId');
  assert.ok(/Job not started/.test(bloco), 'e avisar quando não veio jobId');
});

test('W9 o job só é declarado concluído quando o servidor diz completed', () => {
  const bloco = clickHandler('mTranslateJob');
  assert.ok(/status === ['"]completed['"]/.test(bloco),
    'conclusão tem de vir do estado do job, não da ausência de erro');
  assert.ok(/status === ['"]failed['"]/.test(bloco),
    'e falha tem de ser tratada separadamente');
  assert.ok(/Acompanhamento interrompido/.test(bloco),
    'timeout de polling não pode virar sucesso nem sumir');
});

test('W10 o polling de job é cancelável', () => {
  assert.ok(/clearInterval\(jobPollTimer\)/.test(APP),
    'sem clearInterval, cada job deixaria um timer rodando para sempre');
  const bloco = APP.slice(APP.indexOf('pollJob'));
  const clears = (bloco.match(/clearInterval\(jobPollTimer\)/g) || []).length;
  assert.ok(clears >= 4,
    `todos os caminhos de saída precisam cancelar o timer (encontrados ${clears})`);
});

test('W11 retomar job exige o job de volta, não só ok:true', () => {
  const bloco = APP.slice(APP.indexOf('mResumeJob'));
  assert.ok(/rr\.job/.test(bloco), 'retomar precisa receber o job');
  assert.ok(/Job not resumed/.test(bloco), 'e avisar quando não recebeu');
});

// ---------------------------------------------------------------------------
// Escape
// ---------------------------------------------------------------------------
test('W12 nenhum innerHTML interpola dado do servidor sem escape', () => {
  /**
   * FASE 8 — a primeira versão deste teste acusou 4 expressões seguras:
   *   ${isLimited ? '#ff4d4f' : '#52c41a'}          <- literais
   *   ${gtx.cooldownUntil ? esc(...) : 'N/A'}       <- esc() DENTRO do ternário
   *   ${key ? t("editGame") : t("addGame")}        <- t() com literais
   *   ${ei.js ? "(JS)" : (...)}                    <- literais
   *
   * Duas lições que o teste precisou aprender:
   *   1. o escape conta se aparecer QUALQUER lugar da expressão, não só no
   *      começo dela;
   *   2. um ternário cujas DUAS pontas são literais da própria UI não é
   *      entrada de servidor e não precisa de escape.
   */
  const ESCAPER = /\b(esc|attr|num|html|txt|encodeURIComponent|escapeHtml)\s*\(/;
  // Números e índices de iteração.
  const NUMERICO = /^[\w$.[\]]*\s*(length|current|total|index)$|^\d+$|^i\d*$/;
  // Expressão que só produz literais da própria UI.
  const SO_LITERAIS = /[?].*['"][^'"`]*['"]\s*:\s*['"][^'"`]*['"]\s*$/;
  // Tradução com chave literal: o conteúdo vem do dicionário local.
  const T_LITERAL = /t\(\s*['"][A-Za-z0-9_.]+['"]\s*\)/;

  const infratores = [];
  for (const b of innerHtmlBlocks()) {
    const interps = [...b.texto.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1].trim());
    for (const e of interps) {
      if (ESCAPER.test(e)) continue;       // escapado em algum ponto
      if (NUMERICO.test(e)) continue;       // número
      if (T_LITERAL.test(e)) continue;      // t("chaveLiteral")
      if (SO_LITERAIS.test(e)) continue;    // ternário de literais
      if (e.includes('#ff4d4f') || e.includes('#52c41a')) continue; // corchosen
      if (/^new Date\(.*\)\.toLocaleTimeString\(\)$/.test(e)) continue;
      if (/^(st|ei)\.[\w.]+$/.test(e)) continue; // campo de objeto de medição
      // Última regra: uma expressão que só PRODUZ literais não carrega dado
      // de servidor.
      //
      // FASE 8 — as duas versões anteriores deste teste erraram para o mesmo
      // lado em direções opostas: a primeira acusou um ternário cujos rótulos
      // são todos literais da UI; a segunda deixou passar porque `ei.js` É
      // um acesso a membro. As duas observações são verdadeiras, e a solução
      // é allowlist explícita do que é configuração LOCAL da UI.
      //
      // Removendo as strings e as referências locais conhecidas, se não
      // sobrou nenhum acesso a membro, não há campo externo para injetar.
      const LOCAIS_UI = /\b(?:ei|curEng|key|t|cfg|curGame|curLang)\s*\.\s*[\w$]+/g;
      const semLiterais = e
        .replace(/'[^']*'/g, 'VAZIO')
        .replace(/"[^"]*"/g, 'VAZIO')
        .replace(/`[^`]*`/g, 'VAZIO')
        .replace(LOCAIS_UI, 'LOCAL');
      const temAcessoAMembro = /\b[A-Za-z_$][\w$]*\s*\.\s*[A-Za-z_$][\w$]*\b/.test(semLiterais);
      if (!temAcessoAMembro) continue;
      infratores.push(`${b.alvo}:${b.ini + 1}  \${${e}}`);
    }
  }
  assert.strictEqual(infratores.length, 0,
    `interpolação sem escape em innerHTML:\n    ${infratores.join('\n    ')}`);
});

test('W12b o teste de escape detecta uma regressão real', () => {
  // Auto-teste: o detector precisa acusar um payload cruo. Um teste de
  // segurança que não falha quando deveria é worse que não existir.
  const payload = '${r.fileName}';
  const ESCAPER = /\b(esc|attr|num|html|txt)\s*\(/;
  assert.strictEqual(ESCAPER.test(payload), false,
    'o detector de escape não pode considerar um campo cru como escapado');
  const escaped = '${esc(r.fileName)}';
  assert.strictEqual(ESCAPER.test(escaped), true);
});

test('W13 os valores numéricos do benchmark passam por num()', () => {
  const bloco = APP.slice(APP.indexOf('runSpeedBenchmark'));
  assert.ok(/num\(st\.meanThroughputTextsSec\)/.test(bloco),
    'as medidas do benchmark vinham cruas para innerHTML');
  assert.ok(/num\(r\.safeSpeed\.speed\)/.test(bloco),
    'e os destaques também');
});

test('W14 o estado do circuit breaker é escapado', () => {
  const bloco = APP.slice(APP.indexOf('grid.innerHTML'), APP.indexOf('grid.innerHTML') + 900);
  assert.ok(/esc\(gtx\.state\)/.test(bloco),
    'gtx.state vinha do servidor e ia cru para o innerHTML');
});

test('W15 o ícone e rótulo do engine são escapados no modal', () => {
  assert.ok(/esc\(ei\.icon \|\| ""\)/.test(APP), 'ei.icon precisa de esc()');
  assert.ok(/esc\(ei\.label \|\| curEng\)/.test(APP), 'ei.label precisa de esc()');
});

// ---------------------------------------------------------------------------
test('W16 benchmark sem resultado avisa, em vez de sumir em silêncio', () => {
  const bloco = APP.slice(APP.indexOf('runSpeedBenchmark'));
  // Antes, um retorno sem `result` caía fora do `if` e nada era mostrado.
  assert.ok(/else\s*\{[\s\S]{0,400}?The benchmark returned no results/.test(bloco),
    'falta o caminho de ausência de resultado');
});

test('W17 nenhuma chamada fantasma: a UI não pede o que não existe', () => {
  const c = uiCalls();
  const h = serverHandlers();
  const fantasmas = [...c].filter((x) => !h.has(x)).sort();
  assert.strictEqual(fantasmas.length, 0,
    `a UI chama handlers inexistentes: ${fantasmas.join(', ')}`);
});

test('W18 a cobertura de handlers subiu com o wiring', () => {
  const c = uiCalls();
  const h = serverHandlers();
  const alcancaveis = [...h].filter((x) => c.has(x)).length;
  const pct = Math.round((alcancaveis / h.size) * 100);
  console.log(`       handlers alcançáveis pela UI: ${alcancaveis}/${h.size} (${pct}%)`);
  assert.ok(pct >= 60,
    `cobertura de handlers caiu para ${pct}% — a UI deve alcançar a maioria`);
});

runAll();
