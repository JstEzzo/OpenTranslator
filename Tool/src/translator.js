const https = require("https");
const { loadGlossary, loadCfg } = require("./cache");

let bingToken = null,
  bingTokenExpiry = 0;

async function limitConcurrency(concurrency, items, asyncFn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => asyncFn(item));
    results.push(p);
    if (concurrency <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function getBingToken() {
  if (bingToken && Date.now() < bingTokenExpiry) return bingToken;
  try {
    const html = await new Promise((res, rej) => {
      https
        .get(
          "https://www.bing.com/translator",
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
          (r) => {
            let d = "";
            r.setEncoding("utf8");
            r.on("data", (c) => (d += c));
            r.on("end", () => res(d));
          },
        )
        .on("error", rej);
    });
    const igMatch =
      html.match(/IG:"([^"]+)"/) ||
      html.match(/ig:"([^"]+)"/) ||
      html.match(/IG=([^&"]+)/);
    const iidMatch = html.match(/IID:"([^"]+)"/) || html.match(/iid:"([^"]+)"/);
    if (igMatch && iidMatch) {
      bingToken = { IG: igMatch[1], IID: iidMatch[1] };
      bingTokenExpiry = Date.now() + 300000;
      return bingToken;
    }
    bingToken = { IG: "", IID: "translator" };
    bingTokenExpiry = Date.now() + 60000;
    return bingToken;
  } catch (e) {
    bingToken = { IG: "", IID: "translator" };
    bingTokenExpiry = Date.now() + 60000;
    return bingToken;
  }
}

async function translateBingSingle(text, sl, tl) {
  if (!text || text.trim().length < 2) return text;
  try {
    const token = await getBingToken();
    const url = "https://www.bing.com/ttranslatev3?isVertical=1";
    const body = new URLSearchParams();
    body.append("fromLang", sl === "auto" ? "auto-detect" : sl);
    body.append("toLang", tl);
    body.append("text", text);
    if (token.IG) body.append("IG", token.IG);
    if (token.IID) body.append("IID", token.IID);
    const raw = await new Promise((res, rej) => {
      const rq = https.request(
        url,
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        },
        (r) => {
          let d = "";
          r.setEncoding("utf8");
          r.on("data", (c) => (d += c));
          r.on("end", () => res(d));
        },
      );
      rq.on("error", rej);
      rq.setTimeout(12000, () => {
        rq.destroy();
        rej(new Error("timeout"));
      });
      rq.write(body.toString());
      rq.end();
    });
    const j = JSON.parse(raw);
    if (Array.isArray(j) && j[0] && j[0].translations && j[0].translations[0])
      return j[0].translations[0].text;
    if (j.errcode) return text;
    return text;
  } catch (e) {
    return text;
  }
}

async function translateBingBatch(texts, sl, tl) {
  const results = new Map();
  if (texts.length === 0) return results;
  const dedup = new Map();
  for (const t of texts) {
    if (!dedup.has(t.clean)) dedup.set(t.clean, []);
    dedup.get(t.clean).push(t);
  }
  const unique = [...dedup.entries()];

  global.log("info", `Traduzindo ${unique.length} textos únicos usando Bing...`);
  let completed = 0;
  const CONCURRENCY_LIMIT = 5;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateBingSingle(clean, sl, tl);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 20 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        global.log("info", `Progresso Bing: ${completed}/${unique.length} (${pct}%)`);
      }
    }
  );
  return results;
}

async function translateLlm(text, sl, tl, config) {
  const provider = config.llmProvider || "openai";
  const apiKey = config.llmApiKey || "";
  const model =
    config.llmModel ||
    (provider === "openai"
      ? "gpt-4o-mini"
      : provider === "deepseek"
        ? "deepseek-chat"
        : "claude-3-5-sonnet-20241022");
  let baseUrl = config.llmBaseUrl || "";
  const promptSystem =
    config.llmPrompt ||
    `Você é um tradutor de jogos profissional. Traduza o texto fornecido pelo usuário de ${sl} para ${tl}.
Regras estritas:
1. Retorne APENAS a tradução direta do texto. Não adicione notas, explicações ou aspas extras.
2. Preserve integralmente todas as tags de sistema, comandos de escape e códigos de controle (como \\V[n], \\C[n], \\N[n], %1, %2, etc.). Nunca os traduza nem altere seu espaçamento.
3. Adapte a linguagem ao contexto de jogos eletrônicos, mantendo-a natural e fluida no idioma destino.`;

  if (
    provider === "openai" ||
    provider === "deepseek" ||
    provider === "local"
  ) {
    if (!baseUrl) {
      if (provider === "openai") baseUrl = "https://api.openai.com/v1";
      else if (provider === "deepseek") baseUrl = "https://api.deepseek.com/v1";
      else baseUrl = "http://localhost:11434/v1";
    }

    const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey && provider !== "local") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const body = JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      const tr = data.choices?.[0]?.message?.content;
      if (tr) return tr.trim();
    } catch (e) {
      global.log("error", `Falha na tradução via LLM (${provider}): ` + e.message);
    }
  } else if (provider === "anthropic" || provider === "claude") {
    const url = "https://api.anthropic.com/v1/messages";
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    const body = JSON.stringify({
      model: model,
      max_tokens: 1024,
      system: promptSystem,
      messages: [{ role: "user", content: text }],
      temperature: 0.3,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      const tr = data.content?.[0]?.text;
      if (tr) return tr.trim();
    } catch (e) {
      global.log("error", `Falha na tradução via Claude: ` + e.message);
    }
  }
  return text;
}

async function translateDeepL(text, sl, tl, config) {
  const apiKey = config.deeplApiKey || "";
  const useFree = config.deeplUseFreeApi !== false;
  const domain = useFree ? "api-free.deepl.com" : "api.deepl.com";
  const url = `https://${domain}/v2/translate`;

  const headers = {
    Authorization: `DeepL-Auth-Key ${apiKey}`,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({
    text: [text],
    target_lang: tl.toUpperCase(),
    source_lang: sl && sl !== "auto" ? sl.toUpperCase() : undefined,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    const tr = data.translations?.[0]?.text;
    if (tr) return tr;
  } catch (e) {
    global.log("error", "Falha na tradução via DeepL API: " + e.message);
  }
  return text;
}

async function translateLlmBatchUnique(unique, sl, tl, config) {
  const results = new Map();
  const provider = config.llmProvider || "openai";
  global.log(
    "info",
    `Traduzindo ${unique.length} textos únicos usando LLM (${provider})...`
  );
  let completed = 0;
  const CONCURRENCY_LIMIT = provider === "local" ? 4 : 8;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateLlm(clean, sl, tl, config);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        global.log("info", `Progresso LLM: ${completed}/${unique.length} (${pct}%)`);
      }
    }
  );
  return results;
}

async function translateDeepLBatchUnique(unique, sl, tl, config) {
  const results = new Map();
  global.log("info", `Traduzindo ${unique.length} textos únicos usando DeepL...`);
  let completed = 0;
  const CONCURRENCY_LIMIT = 5;

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    unique,
    async ([clean, related]) => {
      try {
        const tr = await translateDeepL(clean, sl, tl, config);
        for (const t of related) results.set(t.id, tr);
      } catch (e) {
        for (const t of related) results.set(t.id, clean);
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        const pct = ((completed / unique.length) * 100).toFixed(1);
        global.log("info", `Progresso DeepL: ${completed}/${unique.length} (${pct}%)`);
      }
    }
  );
  return results;
}

async function translateMultiBatch(texts, sl, tl, glossary) {
  const googleResults = await translateBatch(texts, sl, tl, "google", glossary);
  const failed = texts.filter((t) => {
    const tr = googleResults.get(t.id);
    return !tr || tr === t.clean;
  });
  if (failed.length === 0) return googleResults;
  global.log(
    "info",
    "Multi-Engine: " +
      failed.length +
      " textos falharam no Google. Enviando para o Bing..."
  );
  const bingResults = await translateBingBatch(failed, sl, tl);
  for (const [id, tr] of bingResults) {
    const cur = googleResults.get(id);
    if (!cur || cur === id) googleResults.set(id, tr);
  }
  return googleResults;
}

async function translateBatch(texts, sl, tl, engine, glossary) {
  if (!engine || engine === "auto") engine = "google";
  if (engine === "bing") return translateBingBatch(texts, sl, tl);
  if (engine === "multi") return translateMultiBatch(texts, sl, tl, glossary);
  const results = new Map();
  if (texts.length === 0) return results;

  // Pre-apply glossary
  const glos = glossary || loadGlossary();
  const glossaryMap = new Map();
  for (const g of glos) {
    if (g.term && g.translation) {
      glossaryMap.set(g.term.toLowerCase(), g.translation);
    }
  }
  const dedup = new Map();
  for (const t of texts) {
    let clean = t.clean;
    // Apply glossary substitutions before dedup
    if (glossaryMap.size > 0) {
      for (const [term, tr] of glossaryMap) {
        const idx = clean.toLowerCase().indexOf(term);
        if (idx >= 0) {
          const before = clean.slice(0, idx);
          const after = clean.slice(idx + term.length);
          clean = before + tr + after;
        }
      }
    }
    if (!dedup.has(clean)) dedup.set(clean, []);
    dedup.get(clean).push(t);
  }
  const unique = [...dedup.entries()];

  if (engine === "llm") {
    const actualCfg = loadCfg();
    return translateLlmBatchUnique(unique, sl, tl, actualCfg);
  }
  if (engine === "deepl") {
    const actualCfg = loadCfg();
    return translateDeepLBatchUnique(unique, sl, tl, actualCfg);
  }

  const SEP = "\n[|]\n";
  const SEP_LEN = 15;
  const MAX_URL_LEN = 6000;
  const BASE_URL =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
    sl +
    "&tl=" +
    tl +
    "&dt=t&q=";
  const BASE_LEN = BASE_URL.length;

  const batches = [];
  let batchIdx = 0;
  while (batchIdx < unique.length) {
    let batchSize = 0,
      estLen = BASE_LEN;
    for (let j = batchIdx; j < unique.length; j++) {
      const addLen =
        encodeURIComponent(unique[j][0]).length + (j > batchIdx ? SEP_LEN : 0);
      if ((estLen + addLen > MAX_URL_LEN || batchSize >= 15) && batchSize > 0)
        break;
      estLen += addLen;
      batchSize++;
    }
    if (batchSize === 0) batchSize = 1;
    const batch = unique.slice(batchIdx, batchIdx + batchSize);
    batches.push(batch);
    batchIdx += batchSize;
  }

  global.log(
    "info",
    `Dividido em ${unique.length} textos únicos em ${batches.length} lotes para tradução.`
  );

  const CONCURRENCY_LIMIT = 6;
  let completedUniqueTexts = 0;
  let completedBatchesCount = 0;
  const startTime = Date.now();

  const processBatch = async (batch, bIdx) => {
    const joined = batch.map(([clean]) => clean).join(SEP);
    try {
      const q = encodeURIComponent(joined);
      const url = BASE_URL + q;
      const raw = await new Promise((res, rej) => {
        const rq = https.get(
          url,
          {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json",
            },
          },
          (rsp) => {
            let d = "";
            rsp.setEncoding("utf8");
            rsp.on("data", (c) => (d += c));
            rsp.on("end", () => res(d));
          },
        );
        rq.on("error", (e) => rej(e));
        rq.setTimeout(20000, () => {
          rq.destroy();
          rej(new Error("timeout"));
        });
      });
      const j = JSON.parse(raw);
      const translated = j[0]
        .map((x) => x[0])
        .filter(Boolean)
        .join("");
      const parts = translated.split(/\s*\[\s*\|\s*\]\s*/).map((p) => p.trim());
      if (parts.length !== batch.length) {
        throw new Error(
          `Alinhamento de lote incorreto (esperado: ${batch.length}, obtido: ${parts.length})`
        );
      }
      for (let j = 0; j < batch.length; j++) {
        const [clean, related] = batch[j];
        const tr = parts[j] || clean;
        for (const t of related) results.set(t.id, tr);
      }
      completedUniqueTexts += batch.length;
      completedBatchesCount++;
      const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
      global.log(
        "info",
        `Lote ${completedBatchesCount}/${batches.length} (${batch.length} textos) traduzido com sucesso. Progresso: ${completedUniqueTexts}/${unique.length} (${pct}%)`
      );
    } catch (e) {
      global.log(
        "warn",
        `Falha no lote ${bIdx + 1} (${e.message}). Iniciando tradução individual para este lote...`
      );
      await limitConcurrency(3, batch, async ([clean, related]) => {
        try {
          const q = encodeURIComponent(clean);
          const url =
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
            sl +
            "&tl=" +
            tl +
            "&dt=t&q=" +
            q;
          const raw = await new Promise((res, rej) => {
            const rq = https.get(
              url,
              {
                headers: {
                  "User-Agent": "Mozilla/5.0",
                  Accept: "application/json",
                },
              },
              (rsp) => {
                let d = "";
                rsp.setEncoding("utf8");
                rsp.on("data", (c) => (d += c));
                rsp.on("end", () => res(d));
              },
            );
            rq.on("error", (e) => rej(e));
            rq.setTimeout(10000, () => {
              rq.destroy();
              rej(new Error("timeout"));
            });
          });
          const j = JSON.parse(raw);
          const tr =
            j[0]
              .map((x) => x[0])
              .filter(Boolean)
              .join("") || clean;
          for (const t of related) results.set(t.id, tr);
        } catch (e2) {
          global.log(
            "error",
            `Falha na tradução via fallback individual: ${e2.message}`
          );
          for (const t of related) results.set(t.id, clean);
        }
      });
      completedUniqueTexts += batch.length;
      completedBatchesCount++;
      const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
      global.log(
        "info",
        `Concluído lote ${completedBatchesCount}/${batches.length} (via fallback). Progresso: ${completedUniqueTexts}/${unique.length} (${pct}%)`
      );
    }
  };

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    batches.map((b, i) => ({ b, i })),
    ({ b, i }) => processBatch(b, i)
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  global.log(
    "info",
    `Tradução concluída: ${unique.length} textos únicos em ${elapsed}s.`
  );
  return results;
}

async function translateSingle(text, sl, tl, engine) {
  const cfg = loadCfg();
  if (!engine || engine === "auto" || engine === "google") engine = "google";
  if (engine === "bing") return translateBingSingle(text, sl, tl);
  if (engine === "multi") return translateMultiSingle(text, sl, tl);
  if (engine === "llm") return translateLlm(text, sl, tl, cfg);
  if (engine === "deepl") return translateDeepL(text, sl, tl, cfg);
  try {
    const q = encodeURIComponent(text);
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      sl +
      "&tl=" +
      tl +
      "&dt=t&q=" +
      q;
    const raw = await new Promise((res, rej) => {
      const rq = https.get(
        url,
        {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        },
        (rsp) => {
          let d = "";
          rsp.setEncoding("utf8");
          rsp.on("data", (c) => (d += c));
          rsp.on("end", () => res(d));
        },
      );
      rq.on("error", (e) => rej(e));
      rq.setTimeout(8000, () => {
        rq.destroy();
        rej(new Error("timeout"));
      });
    });
    const j = JSON.parse(raw);
    return j && j[0]
      ? j[0]
          .map((x) => x[0])
          .filter(Boolean)
          .join("")
      : text;
  } catch (e) {
    return text;
  }
}

async function translateMultiSingle(text, sl, tl) {
  const googleResult = await translateSingle(text, sl, tl, "google");
  if (googleResult !== text && googleResult.length > 0) return googleResult;
  const bingResult = await translateBingSingle(text, sl, tl);
  return bingResult !== text ? bingResult : googleResult;
}

module.exports = {
  translateBatch,
  translateSingle,
  translateBingBatch,
  translateBingSingle,
  translateMultiBatch,
  translateMultiSingle,
  limitConcurrency
};
