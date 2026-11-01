/**
 * tests/index.js — Runner REAL de testes do OpenTranslator
 *
 * FASE 0 / PASSO 1 — substitui o `npm test` fictício.
 *
 * O script anterior era `node tests/validate_real_ui_certification.js`, que
 * apenas validava arquivos JSON estáticos. Passava com o repositório inteiro
 * quebrado. Nenhuma linha de `src/` era executada.
 *
 * Este runner descobre e executa as suítes reais, reporta o total e
 * SAI COM CÓDIGO DIFFERENTE DE ZERO se qualquer uma falhar. Um `npm test`
 * que não pode falhar não é um teste.
 *
 * Uso:
 *   node tests/index.js              # todas as suítes
 *   node tests/index.js --security   # só um grupo (security|unit|integration)
 *   node tests/index.js --bail       # para na primeira falha
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/**
 * Suítes registradas. Cada entrada é executada em um processo Node próprio:
 * uma suíte que lança em require() ou envenena `global` não pode derrubar
 * as demais, e o output de cada uma fica legível.
 */
const SUITES = [
  { group: "unit", name: "executableCompatibility", file: "tests/unit/executableCompatibility.test.js", desc: "PE validado, ARM64 separado de AMD64 e RenPy sem versao inventada" },
  { group: 'unit', name: 'explicitProviderChoice', file: 'tests/unit/explicitProviderChoice.test.js', desc: 'Traducao com provedor fixo nao envia texto a outro servico em fallback' },
  { group: 'unit', name: 'unrealLocResFormat', file: 'tests/unit/unrealLocResFormat.test.js', desc: 'LocRes real v3, assinatura oficial, preservacao de hashes e deteccao de pacotes nao extraidos' },
  { group: 'unit', name: 'shutdownHttp', file: 'tests/unit/shutdownHttp.test.js', desc: 'Encerramento HTTP real conclui job e restaura backup antes de sair' },
  { group: 'unit', name: 'portablePackage', file: 'tests/unit/portablePackage.test.js', desc: 'Pacote inclui dependencias, preserva destinos existentes e confere runtime' },
  { group: 'unit', name: 'backgroundJobLifecycle', file: 'tests/unit/backgroundJobLifecycle.test.js', desc: 'Jobs em segundo plano persistem estados e participam do encerramento' },
  { group: 'unit', name: 'shutdownLifecycle', file: 'tests/unit/shutdownLifecycle.test.js', desc: 'Encerramento aguarda operacoes e restauracao; preserva backups em falha' },
  { group: 'unit', name: 'legacyGameRestore', file: 'tests/unit/legacyGameRestore.test.js', desc: 'Restauracao em staging, hashes, arquivos extras e retencao de backups' },
  {
    group: 'unit', name: 'uiHealth',
    file: 'tests/unit/uiHealth.test.js',
    desc: 'Painel nao inventa disponibilidade, configuracao ou pausa global',
  },
  {
    group: 'unit', name: 'hookLifecycle',
    file: 'tests/unit/hookLifecycle.test.js',
    desc: 'Falha de bind e URL malformada no servidor de hooks real',
  },
  {
    group: 'unit', name: 'auditContracts',
    file: 'tests/unit/auditContracts.test.js',
    desc: 'Bootstrap nao encerra processos externos; runner rejeita resumo inconsistente',
  },
  {
    group: 'security',
    name: 'http_rpc_security',
    file: 'tests/security/http_rpc_security.test.js',
    desc: 'Segurança HTTP/RPC com servidor real (loopback)',
  },
  {
    group: 'security',
    name: 'xss_ui',
    file: 'tests/security/xss_ui.test.js',
    desc: 'Sanitização XSS da UI',
  },
  {
    group: 'security',
    name: 'owned_process',
    file: 'tests/security/owned_process_security.test.js',
    desc: 'Owned process fail-closed com processos reais',
  },
  {
    group: 'unit',
    name: 'translationCertificate',
    file: 'tests/unit/translationCertificate.test.js',
    desc: 'Invariantes do certificado de tradução',
  },
  {
    group: 'unit',
    name: 'rpcHonesty',
    file: 'tests/unit/rpcHonesty.test.js',
    desc: 'Handlers RPC não devolvem sucesso falso',
  },
  {
    group: 'unit',
    name: 'applyVerification',
    file: 'tests/unit/applyVerification.test.js',
    desc: 'Verificação pós-aplicação relendo o disco',
  },
  {
    group: 'unit',
    name: 'providerContract',
    file: 'tests/unit/providerContract.test.js',
    desc: 'Contrato de TranslationResult e cadeia de provedores',
  },
  {
    group: 'unit',
    name: 'providerFalseSuccess',
    file: 'tests/unit/providerFalseSuccess.test.js',
    desc: 'Returns falsos fora do registry (translationProvider, fastTextPipeline)',
  },
  {
    group: 'unit',
    name: 'gatewayEnforcement',
    file: 'tests/unit/providerGatewayEnforcement.test.js',
    desc: 'Regra do gateway e política de cooldown do breaker',
  },
  {
    group: 'unit',
    name: 'coverageTruth',
    file: 'tests/unit/coverageTruth.test.js',
    desc: 'Cobertura medida por script, não por regex de japonês',
  },
  {
    group: 'unit',
    name: 'universeCount',
    file: 'tests/unit/universeCount.test.js',
    desc: 'Universo de textos e falha de extração',
  },
  {
    group: 'unit',
    name: 'cacheDurability',
    file: 'tests/unit/cacheDurability.test.js',
    desc: 'Cache persiste ou declara que não persiste',
  },
  {
    group: 'unit',
    name: 'applyTransaction',
    file: 'tests/unit/applyTransaction.test.js',
    desc: 'Transação de apply com backup/verify/commit comprovados',
  },
  {
    group: 'unit',
    name: 'engineAndRollback',
    file: 'tests/unit/engineAndRollback.test.js',
    desc: 'Detecção de engine sem default e rollback sem lista fabricada',
  },
  {
    group: 'unit',
    name: 'uiWiring',
    file: 'tests/unit/uiWiring.test.js',
    desc: 'Capacidades reais ligadas na UI e escape de innerHTML',
  },
  {
    group: 'unit',
    name: 'successInvariant',
    file: 'tests/unit/successInvariant.test.js',
    desc: 'Gate anti-teatro: sucesso sem evidencia e os limites do detector',
  },
  {
    group: 'unit',
    name: 'pipelineTransaction',
    file: 'tests/unit/pipelineTransaction.test.js',
    desc: 'D1: a transacao de apply e o caminho do produto, e sua cobertura',
  },
  {
    group: 'unit',
    name: 'applyContract',
    file: 'tests/unit/applyContract.test.js',
    desc: 'D1: contrato filesToBackup + fileHashes, e a prova de nao ser vacuoso',
  },
  {
    group: 'unit',
    name: 'adapterRuntimeContract',
    file: 'tests/unit/adapterRuntimeContract.test.js',
    desc: 'REGRESSAO: extract() dos 5 adapters corrompidos executa e extrai (comportamento, nao grep)',
  },
  {
    group: 'unit',
    name: 'certificateCoherence',
    file: 'tests/unit/certificateCoherence.test.js',
    desc: 'B-10/B-11/B-12: contadores impossiveis nao produzem COMPLETED; applicationPercent em [0,100]',
  },
  {
    group: 'unit',
    name: 'identityReprocessCycle',
    file: 'tests/unit/identityReprocessCycle.test.js',
    desc: 'PASSO 12: sem provider, identidade invalida vira pending (nunca success); ciclo idempotente e nao escreve no jogo',
  },
  {
    group: 'unit',
    name: 'displayTextClassification',
    file: 'tests/unit/displayTextClassification.test.js',
    desc: 'C2: codigo/identificador nao entra no corpus; texto visivel dentro de .py entra (default preservar)',
  },
  {
    group: 'unit',
    name: 'translationIdentity',
    file: 'tests/unit/translationIdentity.test.js',
    desc: 'C1: provider que devolve o original nao e sucesso (TRANSLATION_IDENTITY); nome/identificador permanecem validos',
  },
  {
    group: 'unit',
    name: 'providerRateLimitSemantics',
    file: 'tests/unit/providerRateLimitSemantics.test.js',
    desc: 'P-008: 429 e RATE_LIMITED temporario, nunca banimento; Retry-After e classificador canonico',
  },
  {
    group: 'unit',
    name: 'unrealApplyHonesty',
    file: 'tests/unit/unrealApplyHonesty.test.js',
    desc: 'U-001: excecao no apply NUNCA resulta em success:true; efeito fisico conferido por hash',
  },
  {
    group: 'unit',
    name: 'applyPathContainment',
    file: 'tests/unit/applyPathContainment.test.js',
    desc: 'V-002/H-001: contencao fisica de caminho (traversal, absoluto, UNC, junction) no apply',
  },
  {
    group: 'unit',
    name: 'cheatServerContract',
    file: 'tests/unit/cheatServerContract.test.js',
    desc: 'Contratos do cheatServer: CORS desktop, preflight, parsing de payload e bloqueio de origens remotas',
  },
];

function parseArgs(args = process.argv.slice(2)) {
  const groups = [];
  let bail = false;
  for (const a of args) {
    if (a === '--bail') bail = true;
    else if (['--security', '--unit', '--integration'].includes(a)) groups.push(a.slice(2));
    else throw new Error(`Argumento desconhecido: ${a}`);
  }
  return { groups, bail };
}

/** Executa uma suíte e devolve {pass, fail, output}. */
function runSuite(suite) {
  const abs = path.join(ROOT, suite.file);
  if (!fs.existsSync(abs)) {
    return {
      pass: 0,
      fail: 1,
      output: `ARQUIVO AUSENTE: ${suite.file}`,
      missing: true,
    };
  }
  const res = spawnSync(process.execPath, [abs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
    windowsHide: true,
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  const summaries = [...output.matchAll(/^.*?\bpass=(\d+)\s+fail=(\d+)\s*$/gm)];
  const m = summaries[summaries.length - 1];
  if (res.error || res.status !== 0 || !m ||
      Number(m[1]) + Number(m[2]) === 0 || summaries.some(s => Number(s[2]) > 0)) {
    return { pass: 0, fail: 1, output, crashed: true };
  }
  return { pass: Number(m[1]), fail: Number(m[2]), output };
}

function main() {
  const { groups, bail } = parseArgs();
  const selected = groups.length
    ? SUITES.filter((s) => groups.includes(s.group))
    : SUITES;

  if (groups.length && selected.length === 0) {
    console.error(`Nenhuma suíte no grupo: ${groups.join(', ')}`);
    console.error(`Grupos disponíveis: ${[...new Set(SUITES.map((s) => s.group))].join(', ')}`);
    process.exit(2);
  }

  console.log('================================================================');
  console.log('>> OpenTranslator — suítes de teste REAIS');
  console.log('================================================================');
  console.log(`raiz: ${ROOT}`);
  console.log(`suítes selecionadas: ${selected.length}/${SUITES.length}`);
  console.log(`node: ${process.version}`);
  console.log('');

  const results = [];
  for (const suite of selected) {
    console.log('='.repeat(70));
    console.log(`>> ${suite.name}  (${suite.file})`);
    console.log(`   ${suite.desc}`);
    console.log('='.repeat(70));
    const r = runSuite(suite);
    process.stdout.write(r.output);
    if (r.missing || r.crashed) {
      console.log(`\n  >>> SUITE NAO EXECUTOU CORRETAMENTE (${r.missing ? 'arquivo ausente' : 'crash'})`);
    }
    console.log('');
    results.push({ suite, ...r });
    if (bail && r.fail > 0) {
      console.log('(--bail: parando na primeira falha)');
      break;
    }
  }

  const totalPass = results.reduce((a, r) => a + r.pass, 0);
  const totalFail = results.reduce((a, r) => a + r.fail, 0);
  const broken = results.filter((r) => r.fail > 0 || r.missing || r.crashed);

  console.log('='.repeat(70));
  console.log('>> RESUMO');
  console.log('='.repeat(70));
  for (const r of results) {
    const tag = r.fail > 0 ? 'FAIL' : (r.missing || r.crashed ? 'ERRO' : 'PASS');
    console.log(`  ${tag.padEnd(5)} ${r.suite.name.padEnd(26)} pass=${r.pass} fail=${r.fail}`);
  }
  console.log('');
  console.log(`  TOTAL  pass=${totalPass}  fail=${totalFail}`);
  console.log(`  suítes com falha: ${broken.length}/${results.length}`);
  console.log('');

  if (broken.length > 0) {
    console.log('TESTES FALHARAM — o código está com defeito.');
    process.exit(1);
  }
  if (results.length === 0) {
    console.log('NENHUMA SUÍTE EXECUTOU.');
    process.exit(2);
  }
  console.log('TODAS AS SUÍTES PASSARAM.');
  process.exit(0);
}

if (require.main === module) {
  try { main(); } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}
module.exports = { parseArgs, runSuite, SUITES };
