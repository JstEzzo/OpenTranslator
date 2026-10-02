/**
 * test_text_chunking_and_provider_resilience.test.js
 *
 * Suíte de testes rigorosa para validação de:
 * 1. TextChunker em múltiplos comprimentos (500, 1000, 1500, 2000, 3000, 5000, 10000 caracteres)
 * 2. Preservação de tags, placeholders e variáveis no chunking
 * 3. Suporte a pontuação CJK (Japonês/Chinês: 。, 、)
 * 4. Recombinação exata sem perda de integridade
 * 5. Classificação formal de erros HTTP (429 Rate Limit vs 302 Captcha vs 414 Payload Too Large)
 * 6. Tratamento de Retry-After e ausência de banimento falso de 10 minutos
 * 7. Recuperação controlada e transição HALF_OPEN do GlobalCircuitBreaker
 */

const assert = require("assert");
const TextChunker = require("../src/core/textChunker");
const ProviderErrorClassifier = require("../src/core/providerErrorClassifier");
const GlobalCircuitBreaker = require("../src/core/globalCircuitBreaker");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

(async () => {
  console.log("=== INICIANDO TESTES DE CHUNKING E RESILIÊNCIA DE PROVEDORES ===");

  // --- GRUPO 1: CHUNKING POR COMPRIMENTO ---
  runTest("Texto curto (<800 chars) não deve ser dividido", () => {
    const text = "Este é um texto curto normal para tradução.";
    const res = TextChunker.chunk(text, { maxChars: 800 });
    assert.strictEqual(res.isChunked, false);
    assert.strictEqual(res.chunks.length, 1);
    assert.strictEqual(res.chunks[0], text);
  });

  runTest("Texto de 1000 caracteres deve ser particionado em chunks <= 800 chars", () => {
    const paragraph = "Esta é uma frase de teste bem estruturada e contextualizada. ";
    const text = paragraph.repeat(16).slice(0, 1000);
    const res = TextChunker.chunk(text, { maxChars: 800 });
    assert.strictEqual(res.isChunked, true);
    assert.ok(res.chunks.length >= 2);
    for (const ch of res.chunks) {
      assert.ok(ch.length <= 800, `Chunk excedeu 800 chars (${ch.length})`);
    }
    const recombined = TextChunker.recombine(res.chunks);
    assert.strictEqual(recombined, text);
  });

  runTest("Texto de 2000 caracteres (obrigatório) deve ser particionado com segurança e integridade", () => {
    const sentence = "A história deste jogo se passa em uma floresta distante e misteriosa. ";
    const text = sentence.repeat(30).slice(0, 2000);
    const res = TextChunker.chunk(text, { maxChars: 800 });
    assert.strictEqual(res.isChunked, true);
    assert.ok(res.chunks.length >= 3);
    for (const ch of res.chunks) {
      assert.ok(ch.length <= 800);
    }
    const recombined = TextChunker.recombine(res.chunks);
    assert.strictEqual(recombined, text);
  });

  runTest("Textos de 3000, 5000 e 10000 caracteres devem ser particionados perfeitamente", () => {
    for (const targetLen of [3000, 5000, 10000]) {
      const line = "Linha de diálogo contendo múltiplos elementos e narrativa estendida.\n";
      const text = line.repeat(Math.ceil(targetLen / line.length)).slice(0, targetLen);
      const res = TextChunker.chunk(text, { maxChars: 800 });
      assert.strictEqual(res.isChunked, true);
      for (const ch of res.chunks) {
        assert.ok(ch.length <= 800, `Chunk excedeu tamanho máximo: ${ch.length}`);
      }
      const recombined = TextChunker.recombine(res.chunks);
      assert.strictEqual(recombined, text, `Recombinação falhou para tamanho ${targetLen}`);
    }
  });

  // --- GRUPO 2: PRESERVAÇÃO DE TAGS E PLACEHOLDERS ---
  runTest("Placeholders Ren'Py, RPG Maker e tokens protegidos não podem ser cortados ao meio", () => {
    const filler = "Texto descritivo de preenchimento que ocupa bastante espaço na frase. ";
    const specialTokens = [
      "⟦OT_9999⟧",
      "[player_name]",
      "{color=#ff0000}",
      "\\c[2]",
      "%s",
      "%(hero_gold)d",
      "<b>Título</b>"
    ];

    // Monta texto com tokens em pontos críticos perto do limite de chunk
    let longWithTokens = filler.repeat(10); // ~700 chars
    for (const tok of specialTokens) {
      longWithTokens += tok + " " + filler;
    }

    const res = TextChunker.chunk(longWithTokens, { maxChars: 800 });
    for (const tok of specialTokens) {
      // Nenhum token deve estar dividido entre chunks
      let foundIntact = false;
      for (const ch of res.chunks) {
        if (ch.includes(tok)) {
          foundIntact = true;
          break;
        }
      }
      assert.ok(foundIntact, `Token especial ${tok} foi quebrado ou corrompido durante chunking`);
    }

    const recombined = TextChunker.recombine(res.chunks);
    assert.strictEqual(recombined, longWithTokens);
  });

  // --- GRUPO 3: TEXTO CJK (JAPONÊS / CHINÊS) ---
  runTest("Texto longo em japonês com pontuação CJK (。 e 、) particiona sem cortar ideogramas", () => {
    const jaSentences = "これはゲームの重要なプロローグです。少年は古い寺院に向かって歩き始めました。彼は秘密の手紙を握りしめていた。";
    const longJa = jaSentences.repeat(20); // ~1400 caracteres japoneses (~4200 bytes)
    const res = TextChunker.chunk(longJa, { maxChars: 800, maxBytes: 1500 });
    assert.strictEqual(res.isChunked, true);
    for (const ch of res.chunks) {
      assert.ok(ch.length <= 800);
      assert.ok(Buffer.byteLength(ch, "utf8") <= 1500, `Bytes excederam teto: ${Buffer.byteLength(ch, "utf8")}`);
    }
    const recombined = TextChunker.recombine(res.chunks);
    assert.strictEqual(recombined, longJa);
  });

  // --- GRUPO 4: CLASSIFICAÇÃO DE ERROS HTTP E RESPEITO A RETRY-AFTER ---
  runTest("HTTP 429 deve ser classificado como RATE_LIMITED e NUNCA como banido de 10 min", () => {
    const resNoHeader = ProviderErrorClassifier.classify(null, { statusCode: 429 });
    assert.strictEqual(resNoHeader.type, "RATE_LIMITED");
    assert.strictEqual(resNoHeader.isRateLimit, true);
    // Deve usar cooldown adaptativo (15s), NÃO 10 minutos (600s)!
    assert.strictEqual(resNoHeader.retryAfterMs, 15000);
    assert.strictEqual(resNoHeader.retryAfterSec, 15);
  });

  runTest("HTTP 429 com Retry-After deve respeitar explicitamente o valor do cabeçalho", () => {
    const resWithHeader = ProviderErrorClassifier.classify(null, {
      statusCode: 429,
      headers: { "retry-after": "45" }
    });
    assert.strictEqual(resWithHeader.type, "RATE_LIMITED");
    assert.strictEqual(resWithHeader.retryAfterProvided, true);
    assert.strictEqual(resWithHeader.retryAfterMs, 45000);
    assert.strictEqual(resWithHeader.retryAfterSec, 45);
  });

  runTest("HTTP 302 deve ser classificado como CAPTCHA_OR_BLOCK e HTTP 414 como PAYLOAD_TOO_LARGE", () => {
    const res302 = ProviderErrorClassifier.classify(null, { statusCode: 302, body: "<title>302 Moved</title>" });
    assert.strictEqual(res302.type, "CAPTCHA_OR_BLOCK");
    assert.strictEqual(res302.isBlock, true);

    const res414 = ProviderErrorClassifier.classify(null, { statusCode: 414 });
    assert.strictEqual(res414.type, "PAYLOAD_TOO_LARGE");
    assert.strictEqual(res414.isPayload, true);
  });

  // --- GRUPO 5: CIRCUIT BREAKER E RECUPERAÇÃO ---
  runTest("GlobalCircuitBreaker recupera provider após cooldown e teste de probe bem-sucedido", () => {
    const breaker = new GlobalCircuitBreaker();
    breaker.baseCooldownMs = 50; // 50ms para teste ágil
    breaker.maxCooldownMs = 500;

    // Registra rate limit
    breaker.recordError("test_prov", { type: "RATE_LIMITED", statusCode: 429, retryAfterMs: 50 });
    const checkBlocked = breaker.canExecute("test_prov");
    assert.strictEqual(checkBlocked.allowed, false);

    // Simula passagem do tempo avançando cooldownUntil
    const state = breaker._getProviderState("test_prov");
    state.cooldownUntil = Date.now() - 10; // Expirou

    // Deve transicionar para HALF_OPEN permitindo exatamente 1 probe
    const probeCheck = breaker.canExecute("test_prov");
    assert.strictEqual(probeCheck.allowed, true);
    assert.strictEqual(probeCheck.isProbe, true);

    // Tentativa concorrente enquanto probe está em voo deve ser barrada
    const concurrentCheck = breaker.canExecute("test_prov");
    assert.strictEqual(concurrentCheck.allowed, false);
    assert.strictEqual(concurrentCheck.reason, "HALF_OPEN_PROBE_IN_PROGRESS");

    // Probe finaliza com sucesso -> circuito fecha e volta para AVAILABLE
    breaker.recordSuccess("test_prov");
    const health = breaker.getProviderHealth("test_prov");
    assert.strictEqual(health.state, "AVAILABLE");
    assert.strictEqual(health.consecutive429, 0);

    const checkNowAllowed = breaker.canExecute("test_prov");
    assert.strictEqual(checkNowAllowed.allowed, true);
  });

  console.log("\n=======================================================");
  console.log(`TOTAL DE TESTES: ${passed + failed} | PASSOU: ${passed} | FALHOU: ${failed}`);
  console.log("=======================================================");

  if (failed > 0) {
    process.exit(1);
  }
})();
