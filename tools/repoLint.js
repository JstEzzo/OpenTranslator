/**
 * tools/repoLint.js — Lint determinístico do repositório
 *
 * FASE 0 / PASSO 1 — CORREÇÃO DO LINT QUE NÃO FALHAVA
 *
 * O bug original: `runRepoLint` calculava `ok: issues.length === 0`,
 * imprimia o resultado... e NÃO setava o exit code. O `npm run lint`
 * reportava 16 problemas e saía com 0, exatamente como o `npm test`
 * fictício. Um lint que não pode falhar não é lint: ele só documenta
 * que ninguém olhou.
 *
 * Agora:
 *   - sai com código 1 quando há Issues (falha de verdade)
 *   - valida sintaxe de TODO arquivo .js em src/ e ui/ (parse real)
 *   - opcionalmente reporta padrões de sucesso hardcoded (--strict)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/** Arquivos legítimos na raiz do repositório. */
const ALLOWED_ROOT_FILES = new Set([
  'package.json',
  'package-lock.json',
  'skills-lock.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  '.gitignore',
  '.editorconfig',
  '.npmrc',
  'OpenTranslator.exe',
  'OpenTranslator.png',
  'server.js',
  'PHASE4A_RESULTS.md',
  'RELEASE_MANIFEST.json',
]);

/** Diretórios que nunca são varridos. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'data', '.autopsy', 'graphify-out', 'dist', 'build',
]);

/** Extensões em que `require`/import pulled para o escopo do teste de sintaxe. */
function collectJsFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectJsFiles(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/**
 * Verifica sintaxe sem executar o módulo.
 * `new vm.Script(source)` faz o parse completo; um erro de sintaxe lança.
 */
function checkSyntax(rootPath) {
  const issues = [];
  const targets = [];
  for (const d of ['src', 'ui', 'tools', 'tests', 'server.js']) {
    const p = path.join(rootPath, d);
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isDirectory()) collectJsFiles(p, targets);
    else if (p.endsWith('.js')) targets.push(p);
  }
  for (const file of targets) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch (e) {
      issues.push({
        type: 'READ_ERROR',
        file: path.relative(rootPath, file),
        message: `não pôde ser lido: ${e.message}`,
      });
      continue;
    }
    try {
      // eslint-disable-next-line no-new
      new vm.Script(src, { filename: file });
    } catch (e) {
      issues.push({
        type: 'SYNTAX_ERROR',
        file: path.relative(rootPath, file),
        message: e.message,
      });
    }
  }
  return { issues, checked: targets.length };
}

/**
 * FASE 9 / PASSO 66 — ESTE CONTADOR FOI REMOVIDO DE PROPÓSITO
 *
 * Ele reportava `hardcodedSuccessCount` contando toda linha de src/ que
 * tivesse `ok: true` ou `success: true` — inclusive COMENTÁRIOS, código morto
 * dentro de template literal, e sucesso legítimo depois de operação conferida.
 *
 * O número que ele produzia (186) era alto, alto o bastante para parecer
 * útil, einhuma utilidade: nenhuma das 186 era um defeito. Um contador que
 * nunca chega a zero treina o time a ignorar o número — e foi exatamente isso
 * que aconteceu durante a FASE 9, quando "186 -> 0" virou o alvo da fase e o
 * alvo era inalcançável pelo motivo errado.
 *
 * O problema é de categoria, não de regex. "Esta afirmação de sucesso é
 * verdadeira?" é uma propriedade SEMÂNTICA: só a execução responde. O
 * detector que responde é `tools/successAudit.js`, que classifica três
 * anti-patterns específicos e tem 19 testes provando que ainda falha quando
 * deve.
 *
 *Então este arquivo não conta mais. Ele delega.
 */
function auditarSucesso(rootPath) {
  try {
    // eslint-disable-next-line global-require
    const { audit } = require('./successAudit.js');
    const r = audit();
    return {
      gate: 'tools/successAudit.js',
      afirmacoes: r.afirmacoes,
      defeitos: r.defeitos.length,
      allowlisted: r.allowlisted,
      staleAllowlist: r.staleAllowlist.length,
      detalhe: r.defeitos,
    };
  } catch (e) {
    return {
      gate: 'tools/successAudit.js',
      erro: `nao foi possivel rodar o gate: ${e.message}`,
      defeitos: -1,
      detalhe: [],
    };
  }
}

const scanHardcodedSuccess = auditarSucesso;

function runRepoLint(rootPath, opts = {}) {
  const issues = [];

  // --- 1.organization da raiz ---
  let files = [];
  try {
    files = fs.readdirSync(rootPath);
  } catch (e) {
    return {
      ok: false, issuesCount: 1, issues: [{
        type: 'ROOT_UNREADABLE', file: rootPath, message: e.message,
      }], hardcodedSuccess: [],
    };
  }
  for (const f of files) {
    const full = path.join(rootPath, f);
    let st;
    try {
      st = fs.statSync(full);
    } catch (e) {
      continue;
    }
    if (st.isDirectory()) continue;
    if (!ALLOWED_ROOT_FILES.has(f) && !f.endsWith('.md') && !f.endsWith('.bat')) {
      issues.push({
        type: 'ROOT_CLUTTER',
        file: f,
        message: `Unexpected loose file in root: ${f}`,
      });
    }
  }

  // --- 2. sintaxe real de todo o código ---
  const syntax = checkSyntax(rootPath);
  issues.push(...syntax.issues);

  // --- 3. suítes de teste referenciadas pelo runner existem ---
  const runnerPath = path.join(rootPath, 'tests', 'index.js');
  if (fs.existsSync(runnerPath)) {
    const runnerSrc = fs.readFileSync(runnerPath, 'utf8');
    const declared = [...runnerSrc.matchAll(/file:\s*'([^']+)'/g)].map((m) => m[1]);
    for (const rel of declared) {
      if (!fs.existsSync(path.join(rootPath, rel))) {
        issues.push({
          type: 'MISSING_SUITE',
          file: rel,
          message: `declarada em tests/index.js mas o arquivo não existe`,
        });
      }
    }
  } else {
    issues.push({
      type: 'NO_TEST_RUNNER',
      file: 'tests/index.js',
      message: 'runner de testes real ausente',
    });
  }

  // FASE 9 / PASSO 66 — o gate de sucesso entra como ISSU do lint.
  //
  // Antes, `hardcodedSuccess` alimentava apenas uma contagem exibida, e o
  // `--strict` transformava 186 falsos positivos em 186 issues — o que
  // tornava `--strict` inutilizável e portanto nunca usado. Agora o gate
  // participa do resultado: com 0 defeitos, `ok` continua true; com qualquer
  // defeito, o lint falha e aponta arquivo:linha.
  const sucesso = auditarSucesso(rootPath);
  if (sucesso.defeitos > 0) {
    for (const d of sucesso.detalhe) {
      issues.push({
        type: 'SUCCESS_SEM_EVIDENCIA',
        file: `${d.rel}:${d.line}`,
        message: `[${d.tipo}] ${d.text} — ${d.detalhe}`,
      });
    }
  }
  if (sucesso.erro) {
    issues.push({
      type: 'SUCCESS_GATE_INDISPONIVEL',
      file: 'tools/successAudit.js',
      message: sucesso.erro,
    });
  }
  if (sucesso.staleAllowlist > 0) {
    issues.push({
      type: 'ALLOWLIST_ORFA',
      file: 'tools/successAllowlist.json',
      message: `${sucesso.staleAllowlist} justificativa(s) nao casam mais: o codigo `
        + 'mudou sem reavaliacao',
    });
  }

  return {
    ok: issues.length === 0,
    issuesCount: issues.length,
    issues,
    jsFilesChecked: syntax.checked,
    sucesso,
  };
}

function findRoot() {
  let root = __dirname;
  while (root !== path.dirname(root)) {
    if (fs.existsSync(path.join(root, 'package.json'))
      && fs.existsSync(path.join(root, 'server.js'))) {
      break;
    }
    root = path.dirname(root);
  }
  return root;
}

if (require.main === module) {
  const strict = process.argv.includes('--strict');
  const root = findRoot();
  const res = runRepoLint(root, { strict });

  console.log('=== Repository Lint Results ===');
  console.log(`root: ${root}`);
  console.log(`arquivos .js analisados: ${res.jsFilesChecked}`);
  console.log('');

  // FASE 9 / PASSO 66 — o resumo do gate, com o numero que REALMENTE importa.
  const s = res.sucesso;
  if (s && s.defeitos >= 0) {
    console.log(`gate de sucesso (${s.gate}):`);
    console.log(`  afirmacoes de sucesso varridas : ${s.afirmacoes}`);
    console.log(`  defeitos                       : ${s.defeitos}`);
    console.log(`  allowlisted com justificativa   : ${s.allowlisted}`);
    console.log(`  justificativas orfas           : ${s.staleAllowlist}`);
    console.log('');
  }

  console.log(JSON.stringify(
    { ok: res.ok, issuesCount: res.issuesCount, issues: res.issues, jsFilesChecked: res.jsFilesChecked },
    null, 2,
  ));
  console.log('');

  if (!res.ok) {
    console.log(`LINT FALHOU: ${res.issuesCount} problema(s).`);
    // >>> A correção central: o lint precisa poder falhar. <<<
    process.exit(1);
  }
  console.log('LINT OK.');
  process.exit(0);
}

module.exports = runRepoLint;
module.exports.scanHardcodedSuccess = scanHardcodedSuccess;
