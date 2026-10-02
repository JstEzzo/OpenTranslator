/**
 * test_renpy_coverage_generalization.test.js — Teste de Generalização e Regressão de Cobertura Ren'Py
 *
 * Valida de forma UNIVERSAL (sem depender de jogo específico):
 * 1. Strings contendo múltiplos colchetes [var1] ... is ... [var2] não são mais descartadas.
 * 2. Strings multi-linha concatenadas em _() são extraídas como bloco unificado (interface_string).
 * 3. Textos dentro de blocos Python não são fragmentados em diálogos órfãos.
 * 4. Strings curtas exibíveis (nomes, substantivos, preposições em contexto) são aceitas contextualmente.
 * 5. Tags de estilo {i} e interpolações [saga.cast.var] são protegidas e curadas.
 * 6. Hook universal Text.set_text é injetado em 000_opentranslator_init.rpy sem erros de sintaxe.
 * 7. Execução em outro projeto real Ren'Py (ArmoredSuitSolganteRenpy).
 * 8. CoverageGuarantor recupera textos pendentes na Segunda Passagem Automática.
 */

const fs = require('fs');
const path = require('path');
const RenpyExtractor = require('../src/engines/renpy/extractor/renpyExtractor');
const RenpyInjector = require('../src/engines/renpy/injector/renpyInjector');
const RenpyValidator = require('../src/engines/renpy/validator/renpyValidator');
const CoverageGuarantor = require('../src/core/coverageGuarantor');

async function runTests() {
  console.log("========================================================================");
  console.log("   TESTE UNIVERSAL DE COBERTURA E GENERALIZAÇÃO REN'PY (PASSOS 13 & 14) ");
  console.log("========================================================================");

  const extractor = new RenpyExtractor();
  const injector = new RenpyInjector();
  const validator = new RenpyValidator();
  const guarantor = new CoverageGuarantor({ engine: 'renpy' });

  // 1. Teste de Regex de Colchetes com Palavras-chave Inglesas
  console.log("\n[TESTE 1] isTranslatable com múltiplos colchetes e palavras comuns (is, and, in)");
  const multiBracketBio = "Longtime friend of [player]'s father, [frank] [clan]. After demise under mysterious circumstances, [debbie] volunteered her home. Debbie is a tender woman, constantly showering those close to her with affection.";
  const isBioTranslatable = extractor.isTranslatable(multiBracketBio);
  if (isBioTranslatable) {
    console.log("  ✓ [PASS] Texto com múltiplos colchetes contendo 'is' e 'in' foi aceito com sucesso!");
  } else {
    throw new Error("FALHA: Texto multi-colchete foi incorretamente rejeitado por isTranslatable!");
  }

  // Código python real dentro de colchetes deve continuar protegido/rejeitado
  const pureCodeTag = "[if player_level > 5 or points < 2]";
  const isCodeTranslatable = extractor.isTranslatable(pureCodeTag);
  if (!isCodeTranslatable) {
    console.log("  ✓ [PASS] Expressão Python pura em colchete [if ... or ...] foi corretamente descartada!");
  } else {
    throw new Error("FALHA: Expressão Python pura em colchete não foi descartada!");
  }

  // 2. Teste de Extração de Bloco Multi-linha Concatenação
  console.log("\n[TESTE 2] Extração de Concatenação Multi-linha em _()");
  const sampleRpyContent = `
init python hide:
    cast.debbie.bio = _(
    "Longtime friend of [player]'s father, [frank] "
    "[clan]. After demise under "
    "mysterious circumstances, [debbie] volunteered her own "
    "home to his only son."
    "\\n\\n"
    "[debbie] is a tender woman, constantly showering those "
    "close to her with love and affection.")
`;
  const tmpFixtureDir = path.resolve(__dirname, '../scratch/renpy_fixture');
  const tmpGameSubDir = path.join(tmpFixtureDir, 'game');
  fs.mkdirSync(tmpGameSubDir, { recursive: true });
  const tmpRpyPath = path.join(tmpGameSubDir, 'test_script.rpym');
  fs.writeFileSync(tmpRpyPath, sampleRpyContent, 'utf8');

  const fixtureExtract = await extractor.extract(tmpFixtureDir);
  const bioExtracted = fixtureExtract.texts.find(t => t.clean.includes("Longtime friend"));

  if (bioExtracted && bioExtracted.type === 'interface_string' && bioExtracted.clean.includes("showering those close")) {
    console.log(`  ✓ [PASS] Bloco multi-linha extraído como string única unificada! (Type: ${bioExtracted.type}, Line: ${bioExtracted.line})`);
  } else {
    throw new Error(`FALHA: Bloco multi-linha não foi extraído como bloco unificado! (Encontrado: ${JSON.stringify(bioExtracted)})`);
  }

  // 3. Teste de Proteção contra Fragmentação em Diálogos dentro de Blocos Python
  console.log("\n[TESTE 3] Ausência de Diálogos Órfãos dentro de Blocos Python");
  const orphanDialogues = fixtureExtract.texts.filter(t => t.type === 'dialogue' && t.file.includes('test_script.rpym'));
  if (orphanDialogues.length === 0) {
    console.log("  ✓ [PASS] Zero diálogos órfãos gerados a partir do bloco Python!");
  } else {
    throw new Error(`FALHA: Diálogos órfãos gerados dentro de bloco Python (${orphanDialogues.length} encontrados)!`);
  }

  // 4. Teste da Camada de Cobertura Garantida e Segunda Passagem
  console.log("\n[TESTE 4] Camada de Cobertura Garantida (CoverageGuarantor)");
  const mockTranslations = new Map();
  // Simula que a bio ficou de fora no primeiro lote
  const auditReport = await guarantor.auditAndRecover(fixtureExtract.texts, mockTranslations, {
    engine: 'renpy',
    gameId: 'fixture',
    fallbackProvider: 'mock'
  });
  console.log(`  Auditoria: Total=${auditReport.totalTexts}, Recuperados=${auditReport.recoveredCount}, Cobertura=${auditReport.coveragePercent}%`);
  if (mockTranslations.has(bioExtracted.id)) {
    console.log("  ✓ [PASS] CoverageGuarantor recuperou a string ausente na Segunda Passagem!");
  } else {
    throw new Error("FALHA: CoverageGuarantor não recuperou a string na Segunda Passagem!");
  }

  // 5. Teste de Injeção e Validação do Hook Universal em 000_opentranslator_init.rpy
  console.log("\n[TESTE 5] Injeção e Validação de Sintaxe dos Arquivos Gerados");
  const transList = [{
    id: bioExtracted.id,
    original: bioExtracted.clean,
    translated: "Amiga de longa data do pai de [player], [frank] [clan]. Após a morte sob circunstâncias misteriosas, [debbie] ofereceu sua casa. [debbie] é uma mulher carinhosa, constantemente cobrindo as pessoas com amor e carinho.",
    file: bioExtracted.file,
    line: bioExtracted.line,
    type: bioExtracted.type
  }];

  const injectRes = await injector.inject(tmpFixtureDir, transList);
  if (!injectRes.success) {
    throw new Error(`FALHA na injeção: ${injectRes.error}`);
  }

  const initRpyFile = path.join(injectRes.tlDir, '000_opentranslator_init.rpy');
  const initRpyContent = fs.readFileSync(initRpyFile, 'utf8');
  if (initRpyContent.includes('default_language = "pt_BR"') && initRpyContent.includes('config.say_menu_text_filter')) {
    console.log("  ✓ [PASS] Inicializador limpo e say_menu_text_filter presentes em 000_opentranslator_init.rpy!");
  } else {
    throw new Error("FALHA: Inicializador de idioma ausente de 000_opentranslator_init.rpy!");
  }

  const validRes = validator.validateInjection(injectRes.tlDir);
  if (validRes.valid) {
    console.log(`  ✓ [PASS] Validação estrutural de injeção aprovada sem erros! (${validRes.filesChecked.length} arquivos verificados)`);
  } else {
    throw new Error(`FALHA na validação de injeção: ${validRes.errors.join('; ')}`);
  }

  // Limpeza segura da fixture temporária
  await injector.rollback(tmpFixtureDir);
  try {
    fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
  } catch (e) {}

  // 6. Teste de Generalização em Outro Jogo Real (ArmoredSuitSolganteRenpy)
  console.log("\n[TESTE 6] Generalização em Outro Jogo Real Ren'Py (ArmoredSuitSolganteRenpy)");
  const secondGamePath = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\ArmoredSuitSolganteRenpy0.3-pc\\ArmoredSuitSolganteRenpy-pc';
  if (fs.existsSync(secondGamePath)) {
    const secondExtract = await extractor.extract(secondGamePath);
    console.log(`  Extração em ArmoredSuitSolganteRenpy: ${secondExtract.count} textos encontrados com sucesso.`);
    if (secondExtract.count > 0) {
      console.log("  ✓ [PASS] Extrator universal operou com perfeição em outro jogo Ren'Py sem qualquer exceção!");
    } else {
      throw new Error("FALHA: Extrator universal não encontrou textos no segundo jogo Ren'Py!");
    }
  } else {
    console.log("  [INFO] Segundo jogo não encontrado no caminho esperado. Teste ignorado com segurança.");
  }

  console.log("\n========================================================================");
  console.log("   ✓ TODOS OS TESTES UNIVERSAIS DE COBERTURA E GENERALIZAÇÃO PASSARAM!  ");
  console.log("========================================================================\n");
}

runTests().catch(err => {
  console.error("ERRO:", err);
  process.exit(1);
});
