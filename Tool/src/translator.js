const https = require("https");
const { loadGlossary, loadCfg } = require("./cache");

let bingToken = null,
  bingTokenExpiry = 0;
let mobileBatchRateLimited = false;

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
        if (rq.socket) rq.socket.destroy();
        rq.destroy();
        rej(new Error("timeout"));
      });
      rq.write(body.toString());
      rq.end();
    });
    const j = JSON.parse(raw);
    if (Array.isArray(j) && j[0] && j[0].translations && j[0].translations[0]) {
      const tr = j[0].translations[0].text;
      return tr !== text ? fixTranslation(text, tr) : text;
    }
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
  const CONCURRENCY_LIMIT = 6;

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
  const CONCURRENCY_LIMIT = 6;

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

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Android; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function translateGoogleMobileSingle(text, sl, tl) {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://translate.google.com/m?sl=${encodeURIComponent(sl || "auto")}&tl=${encodeURIComponent(tl || "pt")}&q=${encodeURIComponent(text)}`;
    const html = await new Promise((res, rej) => {
      const rq = https.get(
        url,
        {
          headers: {
            "User-Agent": getRandomUA()
          }
        },
        (rsp) => {
          let d = "";
          rsp.setEncoding("utf8");
          rsp.on("data", (c) => (d += c));
          rsp.on("end", () => res(d));
        }
      );
      rq.on("error", rej);
      rq.setTimeout(6000, () => {
        if (rq.socket) rq.socket.destroy();
        rq.destroy();
        rej(new Error("timeout"));
      });
    });
    const match = html.match(/class="result-container">(.*?)<\/div>/s);
    if (match && match[1]) {
      const unescaped = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
      if (unescaped && unescaped !== text) return unescaped;
    }
  } catch (e) { /* erro de rede: tratado pelo lote (reportFailure) */ }
  return null;
}

async function translateGoogleMobileBatch(joinedText, sl, tl) {
  if (!joinedText || !joinedText.trim()) return null;
  const path = `/m?sl=${encodeURIComponent(sl || "auto")}&tl=${encodeURIComponent(tl || "pt")}&q=${encodeURIComponent(joinedText)}`;
  try {
    const html = await new Promise((res, rej) => {
      const rq = https.get(
        "https://translate.google.com" + path,
        {
          headers: {
            "User-Agent": getRandomUA(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        },
        (rsp) => {
          let d = "";
          rsp.setEncoding("utf8");
          rsp.on("data", (c) => (d += c));
          rsp.on("end", () => res({ status: rsp.statusCode, html: d }));
        }
      );
      rq.on("error", rej);
      rq.setTimeout(6000, () => {
        if (rq.socket) rq.socket.destroy();
        rq.destroy();
        rej(new Error("timeout"));
      });
    });

    if (html.status !== 200) {
      global.log("warn", `translator: MobileBatch HTTP ${html.status} (usa GET, não POST).`);
      return null;
    }
    const match = html.html.match(/class="result-container">(.*?)<\/div>/s);
    if (match && match[1]) {
      const unescaped = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
      if (unescaped) return unescaped;
    }
    const blocked = /sorry\/index|unusual traffic|not a robot|recaptcha|captcha/i.test(
      html.html
    );
    global.log(
      "warn",
      `translator: Google Mobile não retornou resultado (${blocked ? "bloqueio anti-bot/429" : "HTML inesperado"}), len=${html.html.length}.`
    );
    return null;
  } catch (e) {
    global.log("warn", `translator: MobileBatch request falhou: ${e.message}`);
  }
  return null;
}

function detectLang(text) {
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  return "en";
}

let mymemoryLastReq = 0;
let mymemoryExhausted = false;

const MM_SEP = "\n[|]\n";
const MM_MAX_CHARS = 480;

async function translateMyMemoryOne(q, src, dst) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(src)}%7C${encodeURIComponent(dst)}`;
  const raw = await new Promise((res, rej) => {
    const rq = https.get(url, { headers: { "User-Agent": getRandomUA() } }, (rsp) => {
      let d = "";
      rsp.setEncoding("utf8");
      rsp.on("data", (c) => (d += c));
      rsp.on("end", () => res({ status: rsp.statusCode, body: d }));
    });
    rq.on("error", rej);
    rq.setTimeout(10000, () => {
      if (rq.socket) rq.socket.destroy();
      rq.destroy();
      rej(new Error("timeout"));
    });
  });
  if (raw.status !== 200) return null;
  const j = JSON.parse(raw.body);
  if (j.responseStatus === 429) return null;
  const tr = j.responseData && j.responseData.translatedText;
  if (tr && /MYMEMORY WARNING: YOU USED ALL/i.test(tr)) {
    mymemoryExhausted = true;
    global.log("error", "translator: MyMemory quota diária esgotada.");
    return null;
  }
  if (tr && tr !== q && tr.length > 0 && !/MYMEMORY WARNING/i.test(tr)) {
    return tr;
  }
  return null;
}

async function translateMyMemoryBatch(joinedText, sl, tl) {
  if (!joinedText || !joinedText.trim() || mymemoryExhausted) return null;
  const src = sl && sl !== "auto" ? sl : detectLang(joinedText);
  const dst = (tl || "pt").toUpperCase();

  const items = joinedText.split(MM_SEP);
  const chunks = [];
  let cur = [];
  let curLen = 0;
  for (const it of items) {
    const addLen = it.length + (cur.length > 0 ? MM_SEP.length : 0);
    if (cur.length > 0 && curLen + addLen > MM_MAX_CHARS) {
      chunks.push(cur);
      cur = [it];
      curLen = it.length;
    } else {
      cur.push(it);
      curLen += addLen;
    }
  }
  if (cur.length > 0) chunks.push(cur);

  const results = [];
  for (const chunk of chunks) {
    const wait = mymemoryLastReq + 900 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const chunkText = chunk.join(MM_SEP);
    let tr = await translateMyMemoryOne(chunkText, src, dst);
    if (tr === null) {
      await new Promise((r) => setTimeout(r, 2500));
      const wait2 = mymemoryLastReq + 900 - Date.now();
      if (wait2 > 0) await new Promise((r) => setTimeout(r, wait2));
      tr = await translateMyMemoryOne(chunkText, src, dst);
    }
    if (tr === null) return null;
    results.push(tr);
  }
  return results.join(MM_SEP);
}

let _cachedGlossary = null;
let _cachedGlossaryMap = null;
function getGlossaryMap(glossary) {
  if (glossary === _cachedGlossary && _cachedGlossaryMap) return _cachedGlossaryMap;
  _cachedGlossary = glossary;
  _cachedGlossaryMap = new Map();
  if (Array.isArray(glossary)) {
    for (const g of glossary) {
      if (g && g.term && g.translation) {
        _cachedGlossaryMap.set(g.term, g.translation);
      }
    }
  }
  return _cachedGlossaryMap;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyGlossaryPost(tr, glossary) {
  if (!tr || typeof tr !== "string") return tr;
  const gm = getGlossaryMap(glossary);
  if (gm.size === 0) return tr;
  let out = tr;
  for (const [term, trans] of gm) {
    if (out.includes(term)) {
      out = out.split(term).join(trans);
    } else if (out.toLowerCase().includes(term.toLowerCase())) {
      const re = new RegExp(escapeRegExp(term), "gi");
      out = out.replace(re, (m) => trans);
    }
  }
  return out;
}

// Palavras inglesas comuns que começam com maiúscula mas NÃO são nomes próprios
// (evita proteger "Then", "What", "This"... de serem reescritas)
const EN_CAPITALIZED_STOP = new Set([
  "The", "Then", "This", "That", "These", "Those", "What", "When", "Where",
  "Which", "Who", "Whom", "Whose", "Why", "How", "But", "And", "Or", "Nor",
  "Yes", "No", "Oh", "Ah", "Eh", "Hm", "Um", "Uh", "Hey", "Hello", "Hi",
  "Well", "Yeah", "Yep", "Okay", "Ok", "Please", "Sorry", "Wait", "Look",
  "Listen", "Come", "Go", "Get", "Let", "One", "Two", "Three", "They",
  "Their", "There", "I", "You", "We", "He", "She", "It", "They", "Do",
  "Don", "Can", "Could", "Will", "Would", "Should", "Shall", "May", "Might",
  "Must", "Not", "All", "Just", "Very", "Really", "Sure", "Right", "After",
  "Before", "Later", "Today", "Tomorrow", "Now", "So", "Man", "Girl", "Boy",
  "Lady", "Sir", "Mom", "Dad", "Baby", "God", "Alright", "Anyway", "Also",
  "First", "Last", "Next", "Another", "Someone", "Something", "Somewhere",
  "Everyone", "Everything", "Nobody", "Nothing", "No one", "Everyone",
  "Because", "Though", "Although", "Until", "Since", "While", "Both",
  "Each", "Every", "Either", "Neither", "Anyway", "Some", "Many", "Much",
  "Few", "Whole", "That's", "It's", "He's", "She's", "I'm", "You're", "We're",
  "They're", "There's", "What's", "Who's", "Here", "There", "Here's",
  "Yeah", "Nah", "Yup", "Oops", "Huh", "Pff", "Gah", "Ugh", "Argh", "Hmm",
]);

// Detecta se uma palavra em maiúscula no original é nome próprio provável:
// começa com maiúscula e não é palavra inglesa comum (funciona p/ qualquer
// idioma DESTINO — só analisa o idioma FONTE).
function isLikelyProperNoun(word) {
  if (!/^[A-Z][a-z]{1,20}$/.test(word)) return false;
  if (EN_CAPITALIZED_STOP.has(word)) return false;
  return true;
}

// Protege nomes próprios envolvendo-os em tokens antes de enviar ao tradutor.
// Se o motor preservar o token, o nome volta intacto; se não, remove os
// colchetes e mantém o que veio (nunca piora).
const NAME_TOKEN_RE = /⟦([^⟧]+)⟧/g;
function protectProperNames(text) {
  let out = text;
  const names = text.match(/[A-Z][a-z]{1,20}/g) || [];
  for (const n of names) {
    if (isLikelyProperNoun(n)) {
      out = out.split(n).join("⟦" + n + "⟧");
    }
  }
  return out;
}
function restoreProperNames(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(NAME_TOKEN_RE, "$1");
}

// Corrige a tradução: conserta pontuação e espaços (independente de idioma).
function fixTranslation(orig, tr) {
  if (!tr || typeof tr !== "string" || tr === orig) return tr;
  let out = tr;
  // Espaço antes de pontuação: " ," -> "," (erro comum de tradutores)
  out = out.replace(/\s+([,.;:!?…])/g, "$1");
  // Espaço após \dac e outros códigos de voz (visual)
  out = out.replace(/(\\dac)(\S)/g, "$1 $2");
  return out;
}

async function translateBatch(texts, sl, tl, engine, glossary, onBatchTranslated) {
  const startTime = Date.now();
  if (!engine || engine === "auto") engine = "google";
  if (engine === "bing") return translateBingBatch(texts, sl, tl);
  if (engine === "multi") return translateMultiBatch(texts, sl, tl, glossary);
  const results = new Map();
  if (texts.length === 0) return results;

  const dedup = new Map();
  for (const t of texts) {
    let clean = t.clean;
    if (glossary && Array.isArray(glossary)) {
      for (const g of glossary) {
        if (g && g.term && g.translation && clean.includes(g.term)) {
          clean = clean.split(g.term).join(g.translation);
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
  const SEP_LEN = 5;
  const MAX_POST_LEN = 700;
  const MAX_ITEMS_PER_BATCH = 100;

  const batches = [];
  let batchIdx = 0;
  while (batchIdx < unique.length) {
    let batchSize = 0,
      estLen = 0;
    for (let j = batchIdx; j < unique.length; j++) {
      const addLen = unique[j][0].length + (j > batchIdx ? SEP_LEN : 0);
      if (
        (estLen + addLen > MAX_POST_LEN || batchSize >= MAX_ITEMS_PER_BATCH) &&
        batchSize > 0
      )
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
    `Dividido em ${unique.length} textos únicos em ${batches.length} lotes para tradução em alta velocidade.`
  );

  const CONCURRENCY_LIMIT = 10;
  const BATCH_DELAY_MS = 250;
  let completedUniqueTexts = 0;
  let completedBatchesCount = 0;
  let totalTranslatedCount = 0;
  let failedBatchCount = 0;

  const reportFailure = (msg) => {
    failedBatchCount++;
    if (failedBatchCount <= 10 || failedBatchCount % 100 === 0) {
      global.log(
        "warn",
        `translator: ${msg} (falhas acumuladas: ${failedBatchCount})`
      );
    }
  };

  const fetchGoogleBatchPostWithRetry = async (joinedText, maxRetries = 3) => {
    if (useMobileDirect) {
      throw new Error("HTTP 429 Rate Limit (Direct Mode)");
    }
    const postBody = "q=" + encodeURIComponent(joinedText);
    const postData = Buffer.from(postBody, "utf8");
    const targetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const raw = await new Promise((res, rej) => {
          const rq = https.request(
            targetUrl,
            {
              method: "POST",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": postData.length,
                Accept: "application/json, text/plain, */*",
              },
            },
            (rsp) => {
              let d = "";
              rsp.setEncoding("utf8");
              rsp.on("data", (c) => (d += c));
              rsp.on("end", () => {
                if (rsp.statusCode === 429) {
                  return rej(new Error("HTTP 429 Rate Limit"));
                }
                if (rsp.statusCode !== 200) {
                  return rej(new Error(`HTTP ${rsp.statusCode}`));
                }
                res(d);
              });
            }
          );
          rq.on("error", (e) => rej(e));
          rq.setTimeout(3500, () => {
            if (rq.socket) rq.socket.destroy();
            rq.destroy();
            rej(new Error("timeout"));
          });
          rq.write(postData);
          rq.end();
        });

        if (raw && raw.trim().startsWith("[")) {
          return JSON.parse(raw);
        }
        const preview = raw ? raw.slice(0, 200).replace(/\n/g, " ") : "(vazio)";
        throw new Error(`Resposta inválida (não JSON): ${preview}`);
      } catch (err) {
        if (attempt < maxRetries) {
          const backoff = 600 * (attempt + 1) + Math.floor(Math.random() * 300);
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          throw err;
        }
      }
    }
  };

  let useMobileDirect = false;

  const processBatch = async (batch, bIdx) => {
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    const joined = batch.map(([clean]) => protectProperNames(clean)).join(SEP);
    const toSaveBatch = [];
    const finalize = (clean, tr) => applyGlossaryPost(fixTranslation(clean, tr), glossary);
    let translatedJoined = null;
    let usedEngine = "google-mobile";

    // Attempt 1: Google Mobile Batch
    try {
      translatedJoined = await translateGoogleMobileBatch(joined, sl, tl);
    } catch (eMb) {
      reportFailure(`MobileBatch request: ${eMb.message}`);
    }

    if (!translatedJoined) {
      // Attempt 2: Google GTX batch (joined com \n, segmentos alinhados)
      try {
        const j = await fetchGoogleBatchPostWithRetry(
          batch.map(([clean]) => clean).join("\n"),
          sl,
          tl
        );
        const segs = Array.isArray(j) && Array.isArray(j[0]) ? j[0] : null;
        if (segs && segs.length === batch.length) {
          for (let jj = 0; jj < batch.length; jj++) {
            const [clean, related] = batch[jj];
            const tr = finalize(clean, restoreProperNames((segs[jj] && segs[jj][0]) || clean));
            for (const t of related) results.set(t.id, tr);
            if (tr && tr !== clean && tr.length > 0) {
              toSaveBatch.push([clean, tr]);
              totalTranslatedCount++;
            }
          }
          usedEngine = "google-gtx";
        } else {
          reportFailure(
            `GTX devolveu ${segs ? segs.length : 0} segmentos p/ ${batch.length} itens (fora de sincronia).`
          );
        }
      } catch (eGtx) {
        reportFailure(`GTX batch falhou: ${eGtx.message}`);
      }
    } else {
      const parts = translatedJoined
        .split(/\s*\[\s*\|\s*\]\s*/)
        .map((p) => p.trim());
      if (parts.length === batch.length) {
        for (let j = 0; j < batch.length; j++) {
          const [clean, related] = batch[j];
          const tr = finalize(clean, restoreProperNames(parts[j] || clean));
          for (const t of related) results.set(t.id, tr);
          if (tr && tr !== clean && tr.length > 0) {
            toSaveBatch.push([clean, tr]);
            totalTranslatedCount++;
          }
        }
      } else {
        reportFailure(
          `${usedEngine} devolveu ${parts.length} partes p/ ${batch.length} itens (fora de sincronia).`
        );
      }
    }

    // Attempt 3: MyMemory Batch (falha do Google 302/rate-limit)
    if (toSaveBatch.length === 0) {
      try {
        const myTr = await translateMyMemoryBatch(joined, sl, tl);
        if (myTr) {
          const parts = myTr
            .split(/\s*\[\s*\|\s*\]\s*/)
            .map((p) => p.trim());
          if (parts.length === batch.length) {
            for (let j = 0; j < batch.length; j++) {
              const [clean, related] = batch[j];
              const tr = parts[j] || clean;
              for (const t of related) results.set(t.id, tr);
              if (tr && tr !== clean && tr.length > 0) {
                toSaveBatch.push([clean, tr]);
                totalTranslatedCount++;
              }
            }
          } else {
            reportFailure(
              `MyMemory devolveu ${parts.length} partes p/ ${batch.length} itens (fora de sincronia).`
            );
          }
        }
      } catch (eMM) {
        reportFailure(`MyMemory batch falhou: ${eMM.message}`);
      }
    }

    // Attempt 4: Individual Mobile Translation
    if (toSaveBatch.length === 0) {
      if (mobileBatchRateLimited) {
        for (const [, related] of batch) {
          for (const t of related) results.set(t.id, t.clean);
        }
        reportFailure(
          `lote ${completedBatchesCount + 1} sem tradução (Google Mobile rate-limited; fallback individual desligado para não piorar o bloqueio).`
        );
      } else {
        await limitConcurrency(15, batch, async ([clean, related]) => {
          try {
            const tr = finalize(clean, await translateGoogleMobileSingle(clean, sl, tl));
            for (const t of related) results.set(t.id, tr || clean);
            if (tr && tr !== clean && tr.length > 0) {
              toSaveBatch.push([clean, tr]);
              totalTranslatedCount++;
            }
          } catch (e2) {
            for (const t of related) results.set(t.id, clean);
          }
        });
        if (toSaveBatch.length === 0) {
          reportFailure(
            `lote ${completedBatchesCount + 1} sem nenhuma tradução (motores bloqueados/rate-limited).`
          );
        }
      }
    }

    if (toSaveBatch.length > 0 && typeof onBatchTranslated === "function") {
      try { onBatchTranslated(toSaveBatch); } catch (e) { global.log("warn", `translator: ${e.message}`); }
    }
    completedUniqueTexts += batch.length;
    completedBatchesCount++;
    const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
    if (completedBatchesCount % 20 === 0 || completedBatchesCount === batches.length) {
      global.log(
        "info",
        `Progresso da tradução em lote: ${completedBatchesCount}/${batches.length} lotes (${pct}%), ${totalTranslatedCount} textos traduzidos de verdade.`
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
    `Tradução concluída: ${unique.length} textos únicos em ${elapsed}s (${totalTranslatedCount} realmente traduzidos).`
  );
  if (totalTranslatedCount === 0) {
    global.log(
      "error",
      `translator: NENHUMA tradução nova obtida em ${batches.length} lotes (${failedBatchCount} lotes falharam). ` +
        `Google Mobile e GTX estão bloqueados/rate-limited. Textos permaneceram originais; traduções aplicadas vieram só do cache local. ` +
        `Aguarde o reset do rate limit, use proxy/IP diferente, ou configure LLM/DeepL nas configurações.`
    );
  }
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
    const translated = j && j[0]
      ? j[0]
          .map((x) => x[0])
          .filter(Boolean)
          .join("")
      : text;
    return translated !== text ? fixTranslation(text, translated) : text;
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
