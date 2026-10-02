const assert = require("assert");
const CoverageGuarantor = require("../src/core/coverageGuarantor");
const translationMemory = require("../src/core/translationMemory");

async function runTests() {
  console.log("========================================================================");
  console.log("  TESTES DE INTEGRIDADE DE CACHE, MEMÓRIA E COBERTURA DE TRADUÇÃO");
  console.log("========================================================================");

  let passed = 0;

  // Teste 1: TM store não deve aceitar texto idêntico ao original
  {
    const source = "百瀬愛智_TEST_1";
    translationMemory.store(source, source, { engine: "test", gameId: "test_game" });
    const lookupResult = translationMemory.lookup(source, { engine: "test", gameId: "test_game" });
    assert.strictEqual(lookupResult, null, "TM lookup não pode retornar tradução quando ela é idêntica ao original");
    console.log("  ✓ [PASS] TM store rejeita e lookup ignora textos idênticos ao original");
    passed++;
  }

  // Teste 2: TM lookup com tradução legítima retorna com sucesso
  {
    const source = "百瀬愛智_TEST_2";
    const target = "Aichi Momose";
    translationMemory.store(source, target, { engine: "test", gameId: "test_game" });
    const lookupResult = translationMemory.lookup(source, { engine: "test", gameId: "test_game" });
    assert.strictEqual(lookupResult, target, "TM lookup deve retornar tradução legítima diferente do original");
    console.log("  ✓ [PASS] TM lookup aceita traduções legítimas");
    passed++;
  }

  // Teste 3: CoverageGuarantor não deve 'recuperar' textos idênticos ao original
  {
    const guarantor = new CoverageGuarantor();
    const texts = [
      { id: "1", clean: "百瀬愛智_UNTR", original: "百瀬愛智_UNTR", isJapanese: true },
      { id: "2", clean: "戦う_UNTR", original: "戦う_UNTR", isJapanese: true }
    ];
    const translations = new Map();
    // translations inicialmente vazio ou com entradas idênticas
    translations.set("1", "百瀬愛智_UNTR");

    const report = await guarantor.auditAndRecover(texts, translations, {
      engine: "mz",
      gameId: "test_game",
      mockTranslations: false,
      fallbackProvider: "mock" // use mock provider para ver se o fallback de fato é acionado para o stillPending
    });

    // Como o fallbackProvider é mock, eles devem ser recuperados pelo fallback, NÃO como falsos hits de TM
    assert.strictEqual(report.initialCovered, 0, "Textos idênticos não devem contar no initialCovered");
    assert.strictEqual(report.fallbackAttempted, true, "Fallback deve ser acionado para textos pendentes");
    assert.strictEqual(report.fallbackSucceeded, true, "Fallback mock deve suceder");
    assert.strictEqual(translations.get("1").startsWith("[PT] "), true, "Tradução deve vir do fallback real");
    console.log("  ✓ [PASS] CoverageGuarantor rejeita recuperação falsa de textos idênticos");
    passed++;
  }

  // Teste 4: Se o fallback falhar em traduzir, CoverageGuarantor deve manter como pendente e relatar deficiência
  {
    const guarantor = new CoverageGuarantor();
    const texts = [];
    const nonce = Date.now();
    for (let i = 0; i < 60; i++) {
      const s = `未翻訳テスト_${nonce}_${i}`;
      texts.push({ id: `t_${i}`, clean: s, original: s, isJapanese: true });
    }
    const translations = new Map();

    const translator = require("../src/translator");
    const origTranslateBatch = translator.translateBatch;
    translator.translateBatch = async () => new Map();

    try {
      const report = await guarantor.auditAndRecover(texts, translations, {
        engine: "mz",
        gameId: "test_game_fail",
        mockTranslations: false,
        fallbackProvider: "papago"
      });

      assert.strictEqual(report.initialCovered, 0, "initialCovered deve ser 0");
      assert.strictEqual(report.finalCovered, 0, "finalCovered deve ser 0 quando fallback falha");
      assert.strictEqual(report.isCriticallyDeficient, true, "Deve ser marcado como criticamente deficiente");
      assert.strictEqual(report.fallbackAttempted, true, "Fallback foi tentado");
      assert.strictEqual(report.fallbackSucceeded, false, "Fallback não teve sucesso");
      console.log("  ✓ [PASS] CoverageGuarantor relata falha de fallback e deficiência crítica sem mascarar");
      passed++;
    } finally {
      translator.translateBatch = origTranslateBatch;
    }
  }

  console.log("\n========================================================================");
  console.log(`  RESULTADO: ${passed} PASSOU, 0 FALHOU`);
  console.log("========================================================================\n");
}

runTests().catch(err => {
  console.error("FALHA NOS TESTES:", err);
  process.exit(1);
});
