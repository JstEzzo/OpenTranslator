/**
 * translator.js — Orquestrador de Tradução e Integração de Provedores Externos
 *
 * Responsabilidades:
 * - Orquestrar traduções em lote e individuais através de múltiplos provedores (Google, Bing, Papago, DeepL, LLM)
 * - Preservar identificadores protegidos e tokens imutáveis durante a chamada a APIs externas
 * - Circuit Breaker global, failover automático e controle de concorrência com limite de requisições
 * - Sanitização de termos do glossário e integração com TranslationMemory
 *
 * Camada Arquitetural:
 * Domínio / Provedores de Tradução (Translation Domain & External Gateways)
 */

const GlobalCircuitBreaker = require("./core/globalCircuitBreaker");
const ProviderGateway = require("./core/providerGateway");
const ProviderErrorClassifier = require("./core/providerErrorClassifier");
const LogDeduplicator = require("./core/logDeduplicator");
if (typeof global.log !== "function") global.log = (lvl, msg) => {};
const path = require("path");
const https = require("https");
const { spawn } = require("child_process");
if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..');
const { loadGlossary, loadCfg, saveNewGlobalTranslations } = require("./cache");
const http = require("http");
const querystring = require("querystring");

let bingToken = null,
  bingTokenExpiry = 0;

// ===== CAPTCHA Solver (abre Chrome para resolver manualmente) =====
var captchaCallbacks = new Map();
var captchaServerPort = 0;

function startCaptchaCallbackServer() {
  if (captchaServerPort > 0) return;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "", "http://localhost:" + (captchaServerPort || 9099));
    if (url.pathname === "/captcha-solved") {
      const token = url.searchParams.get("token") || "default";
      const cb = captchaCallbacks.get(token);
      if (cb) {
        cb();
        captchaCallbacks.delete(token);
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("CAPTCHA resolvido! Pode fechar esta aba.");
      server.close();
      captchaServerPort = 0;
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("OpenTranslator CAPTCHA Solver - aguarde...");
    }
  });
  server.listen(0, "127.0.0.1", () => {
    captchaServerPort = server.address().port;
  });
  setTimeout(() => { if (captchaServerPort > 0) { captchaServerPort = 99999; } }, 300000);
}

function openCaptchaSolver(redirectUrl) {
  return new Promise((resolve) => {
    startCaptchaCallbackServer();
    const token = Date.now().toString();
    let resolved = false;
    const safeResolve = () => { if (!resolved) { resolved = true; resolve(); } };
    captchaCallbacks.set(token, safeResolve);
    const callbackUrl = `http://127.0.0.1:${captchaServerPort || 9099}/captcha-solved?token=${token}`;
    const baseRedirect = redirectUrl.split("continue=")[0].replace("?continue=", "?");
    const targetUrl = `${baseRedirect}continue=${encodeURIComponent(callbackUrl)}`;
    setTimeout(safeResolve, 15000);
    const chromePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "chrome"
    ];
    for (const chromePath of chromePaths) {
      try {
        spawn(chromePath, ["--new-window", targetUrl], { stdio: "ignore" });
        global.log("info", "CAPTCHA: Chrome aberto. Auto-timeout 15s.");
        return;
      } catch (e) {
        continue;
      }
    }
    global.log("warn", "CAPTCHA: Chrome nao encontrado. Auto-timeout 15s.");
    safeResolve();
  });
}

// ===== Smart Switching =====
var engineBans = {};
const FALLBACK_ORDER = ["google", "papago", "mymemory", "bing", "yandex"];
const BAN_DURATION_MS = 10 * 60 * 1000;
var papagoExhausted = false;
var mymemoryExhausted = false;
var yandexExhausted = false;
var papagoLastReq = 0;
var mymemoryLastReq = 0;
var yandexLastReq = 0;
const PP_SEP = "\n[|]\n";
const PP_MAX_CHARS = 10000;
const YA_SEP = "\n[|]\n";
const YA_MAX_CHARS = 5000;
const MM_SEP = "\n[|]\n";
const MM_MAX_CHARS = 480;
const NAME_TOKEN_RE = /⟦([^⟧]+)⟧/g;

function getAvailableEngines(userEngine) {
  const now = Date.now();
  var active = [...FALLBACK_ORDER];
  if (userEngine && userEngine !== "auto" && FALLBACK_ORDER.includes(userEngine)) {
    active = [userEngine, ...FALLBACK_ORDER.filter((e) => e !== userEngine)];
  }
  return active.filter((eng) => !engineBans[eng] || engineBans[eng] <= now);
}

function triggerSmartSwitch(blockedEngine, userEngine) {
  engineBans[blockedEngine] = Date.now() + BAN_DURATION_MS;
  global.log("warn", `Aviso: O motor [${blockedEngine}] foi temporariamente bloqueado (Smart Switching).`);
}

function checkRecoveryTimers(userEngine) {
  const now = Date.now();
  for (const eng of Object.keys(engineBans)) {
    if (engineBans[eng] <= now) {
      delete engineBans[eng];
    }
  }
}

function protectProperNames(text) {
  return text;
}

function restoreProperNames(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(NAME_TOKEN_RE, "$1").replace(/[⟦⟧]/g, "");
}

function fixTranslation(orig, tr) {
  if (!tr || typeof tr !== "string") return tr;
  let out = tr;
  out = out.replace(/([.!?])([A-Za-z\u00C0-\u00FF])/g, "$1 $2");
  if (orig && typeof orig === "string") {
    if (orig.startsWith(" ") && !out.startsWith(" ")) out = " " + out;
    if (orig.endsWith(" ") && !out.endsWith(" ")) out = out + " ";
  }
  out = out.replace(/(\\dac)(\S)/g, "$1 $2");
  return out;
}

function detectLang(text) {
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  return "en";
}

function getRandomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

function applyGlossaryPost(tr, glossary) {
  if (!tr || typeof tr !== "string" || !Array.isArray(glossary)) return tr;
  for (const g of glossary) {
    if (g && g.term && g.translation) {
      tr = tr.split(g.term).join(g.translation);
    }
  }
  return tr;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

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
  if (!text || !text.trim()) return text;
  if (Buffer.byteLength(text, "utf8") <= 5000) return translateBingSingleRaw(text, sl, tl);
  const chunks = [];
  for (let i = 0; i < text.length; i += 4500) chunks.push(text.slice(i, i + 4500));
  const parts = await Promise.all(chunks.map((ch, idx) => translateBingSingleRaw(ch, sl, tl)));
  return parts.join("");
}

async function translateBingSingleRaw(text, sl, tl) {
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
      let completed = false;
      const rq = https.request(
        url,
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body.toString(), "utf8"),
            Accept: "application/json",
          },
        },
        (r) => {
          let d = "";
          r.setEncoding("utf8");
          r.on("data", (c) => (d += c));
          r.on("end", () => {
            if (completed) return;
            completed = true;
            if (r.statusCode === 429 || r.statusCode === 302 || r.statusCode === 411) {
              engineBans["bing"] = Date.now() + 10 * 60 * 1000;
              global.log("warn", `[translator] Bing HTTP ${r.statusCode}. Banido por 10min.`);
              return rej(new Error(`HTTP ${r.statusCode}`));
            }
            if (r.statusCode !== 200) {
              return rej(new Error(`HTTP ${r.statusCode}`));
            }
            res(d);
          });
          r.on("error", (e) => {
            if (!completed) {
              completed = true;
              rej(e);
            }
          });
        },
      );
      rq.on("error", (e) => {
        if (!completed) {
          completed = true;
          rej(e);
        }
      });
      rq.setTimeout(12000, () => {
        if (!completed) {
          completed = true;
          if (rq.socket) rq.socket.destroy();
          rq.destroy();
          rej(new Error("timeout"));
        }
      });
      rq.write(body.toString());
      rq.end();
    });
    const j = JSON.parse(raw);
    if (Array.isArray(j) && j[0] && j[0].translations && j[0].translations[0]) {
      const tr = j[0].translations[0].text;
      return typeof tr === "string" ? tr : (tr && typeof tr.toString === "function" ? tr.toString() : text);
    }
    if (j.errcode) throw new Error(`Bing errcode: ${j.errcode}`);
    if (typeof j === "string") return j;
    return text;
  } catch (e) {
    global.log("warn", `[Bing] Erro traduzindo "${text.substring(0, 40)}...": ${e.message}`);
    engineBans["bing"] = Date.now() + 10 * 60 * 1000;
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

async function translateMultiBatch(texts, sl, tl, glossary, onBatchTranslated) {
  if (texts.length === 0) return new Map();
  global.log("info", `Multi-Engine: iniciando traducao paralela para ${texts.length} textos...`);
  const results = new Map();
  texts.forEach(t => results.set(t.id, t.clean));

  const SEP = "\n[|]\n";
  const SEP_ENC = encodeURIComponent(SEP).length;
  const GTX_MAX_URL = 4000;
  const CONCURRENCY = 8;

  function splitIntoGpxBatches(texts) {
    const batches = [];
    let cur = [];
    let curLen = 0;
    for (const t of texts) {
      const tLen = encodeURIComponent(t.clean).length + SEP_ENC;
      if (curLen + tLen > GTX_MAX_URL && cur.length > 0) {
        batches.push(cur);
        cur = [];
        curLen = 0;
      }
      cur.push(t);
      curLen += tLen;
    }
    if (cur.length > 0) batches.push(cur);
    return batches;
  }

  const gpxBatches = splitIntoGpxBatches(texts);
  await limitConcurrency(CONCURRENCY, gpxBatches, async (batch) => {
    const joined = batch.map(t => t.clean).join(SEP);
    let tr;
    try {
      tr = await translateSingle(joined, sl, tl, "google");
    } catch (e) {
      try {
        tr = await translateGoogleMobileSingle(joined, sl, tl);
      } catch (e2) {
        tr = joined;
      }
    }
    if (tr && tr !== joined) {
      const parts = tr.split(SEP);
      const toSave = [];
      for (let i = 0; i < batch.length; i++) {
        const t = batch[i];
        const translated = parts[i] && parts[i].trim().length > 0 ? parts[i].trim() : t.clean;
        if (translated !== t.clean) {
          results.set(t.id, translated);
          toSave.push([t.clean, translated]);
        }
      }
      if (toSave.length > 0) {
        try { saveNewGlobalTranslations(sl, tl, toSave); } catch(e) {}
      }
      if (typeof onBatchTranslated === "function") {
        try { onBatchTranslated(toSave); } catch(e) {}
      }
    }
  });
  return results;
}

async function translateBatch(texts, sl, tl, engine, glossary, onBatchTranslated) {
  if (!engine || engine === "auto") engine = "google";
  if (engine === "bing") return translateBingBatch(texts, sl, tl);
  if (engine === "multi") return translateMultiBatch(texts, sl, tl, glossary, onBatchTranslated);
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
    let clean = (t.tokens && t.tokens.length > 0 && t.protectedText && typeof t.protectedText === "string")
      ? t.protectedText
      : (t.clean || t.original || "");
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
  const MAX_URL_LEN = 1800;
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

  const CONCURRENCY_LIMIT = 5;
  let completedUniqueTexts = 0;
  let completedBatchesCount = 0;
  const startTime = Date.now();

  const fetchGoogleBatchWithRetry = async (url, maxRetries = 3, postBody = null) => {
    const breaker = GlobalCircuitBreaker.getInstance();
    const check = breaker.canExecute("google:gtx");
    if (!check.allowed) {
      LogDeduplicator.getInstance().logRateLimit("google:gtx", check.reason);
      throw new Error(`CIRCUIT_BREAKER_OPEN: Google GTX bloqueado por Rate Limit. Cooldown até ${check.cooldownUntil}`);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Re-verifica o circuit breaker antes de cada tentativa
      const checkLoop = breaker.canExecute("google:gtx");
      if (!checkLoop.allowed) {
        throw new Error(`CIRCUIT_BREAKER_OPEN: Google GTX bloqueado por Rate Limit`);
      }

      try {
        breaker.recordRequestStart("google:gtx");
        const raw = await new Promise((res, rej) => {
          const isPost = !!postBody;
          const reqOptions = {
            method: isPost ? "POST" : "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
            },
          };
          if (isPost) {
            reqOptions.headers["Content-Type"] = "application/x-www-form-urlencoded;charset=utf-8";
            reqOptions.headers["Content-Length"] = Buffer.byteLength(postBody);
          }
          const rq = https.request(
            url,
            reqOptions,
            (rsp) => {
              let d = "";
              rsp.setEncoding("utf8");
              rsp.on("data", (c) => (d += c));
              rsp.on("end", () => {
                breaker.recordRequestEnd("google:gtx");
                if (rsp.statusCode === 429 || rsp.statusCode === 302) {
                  engineBans["google"] = Date.now() + 10 * 60 * 1000;
                  const classified = ProviderErrorClassifier.classify(null, { statusCode: rsp.statusCode, headers: rsp.headers });
                  breaker.recordError("google:gtx", classified);
                  LogDeduplicator.getInstance().logRateLimit("google:gtx", `HTTP ${rsp.statusCode}`);
                  return rej(new Error(`HTTP ${rsp.statusCode} Rate Limit`));
                }
                if (rsp.statusCode !== 200) {
                  const classified = ProviderErrorClassifier.classify(null, { statusCode: rsp.statusCode });
                  breaker.recordError("google:gtx", classified);
                  return rej(new Error(`HTTP ${rsp.statusCode}`));
                }
                breaker.recordSuccess("google:gtx");
                res(d);
              });
            }
          );
          rq.on("error", (e) => {
            breaker.recordRequestEnd("google:gtx");
            rej(e);
          });
          rq.setTimeout(15000, () => {
            breaker.recordRequestEnd("google:gtx");
            if (rq.socket) rq.socket.destroy();
            rq.destroy();
            rej(new Error("timeout"));
          });
          if (isPost) rq.write(postBody);
          rq.end();
        });

        if (raw && raw.trim().startsWith("[")) {
          return JSON.parse(raw);
        }
        throw new Error("Resposta inválida (não JSON)");
      } catch (err) {
        // Se for rate limit ou circuit breaker aberto, NUNCA executa retry
        if (err.message.includes("429") || err.message.includes("Rate Limit") || err.message.includes("CIRCUIT_BREAKER_OPEN")) {
          throw err;
        }
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          throw err;
        }
      }
    }
  };

  const processBatch = async (batch, bIdx) => {
    await new Promise((r) => setTimeout(r, Math.random() * 50 + 20));
    const joined = batch.map(([clean]) => clean).join(SEP);
    try {
      if (engineBans["google"] && engineBans["google"] > Date.now()) {
        throw new Error("Google está banido temporariamente.");
      }
      const postData = querystring.stringify({
        client: "gtx",
        sl: sl,
        tl: tl,
        dt: "t",
        q: joined
      });
      const postUrl = "https://translate.googleapis.com/translate_a/single";
      const j = await fetchGoogleBatchWithRetry(postUrl, 3, postData);
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
      const toSaveBatch = [];
      for (let j = 0; j < batch.length; j++) {
        const [clean, related] = batch[j];
        const tr = parts[j] || clean;
        for (const t of related) results.set(t.id, tr);
        if (tr && tr !== clean && tr.length > 0) {
          toSaveBatch.push([clean, tr]);
        }
      }

      if (toSaveBatch.length > 0 && typeof onBatchTranslated === "function") {
        try {
          onBatchTranslated(toSaveBatch);
        } catch (e) {}
      }

      completedUniqueTexts += batch.length;
      completedBatchesCount++;
      const pct = ((completedUniqueTexts / unique.length) * 100).toFixed(1);
      if (completedBatchesCount % 20 === 0 || completedBatchesCount === batches.length) {
        global.log(
          "info",
          `Lote ${completedBatchesCount}/${batches.length} (${batch.length} textos) traduzido com sucesso. Progresso: ${completedUniqueTexts}/${unique.length} (${pct}%)`
        );
      }
    } catch (e) {
      if (e.message.includes("Rate Limit") || e.message.includes("CIRCUIT_BREAKER_OPEN") || e.message.includes("429")) {
        results.rateLimited = true;
        results.rateLimitError = e.message;
        // Não substitui texto por original; preserva textos como pendentes
        return;
      }
      global.log(
        "warn",
        `Falha no lote ${bIdx + 1} (${e.message}). Falha pontual registrada.`
      );
    }
  };

  const breaker = GlobalCircuitBreaker.getInstance();
  const initCheck = breaker.canExecute("google:gtx");
  if (!initCheck.allowed) {
    LogDeduplicator.getInstance().logRateLimit("google:gtx", initCheck.reason);
    results.rateLimited = true;
    results.rateLimitError = initCheck.reason;
    results.cooldownUntil = initCheck.cooldownUntil;
    return results;
  }

  await limitConcurrency(
    CONCURRENCY_LIMIT,
    batches.map((b, i) => ({ b, i })),
    async ({ b, i }) => {
      if (results.rateLimited) return; // Se circuit abriu, descarta batches subsequentes
      await processBatch(b, i);
    }
  );

  if (results.rateLimited) {
    LogDeduplicator.getInstance().emitSummary("google:gtx", {
      blockedRequests: breaker.getProviderHealth("google:gtx").requestsBlocked,
      cooldownUntil: breaker.getProviderHealth("google:gtx").cooldownUntil
    });
  }
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  global.log(
    "info",
    `Tradução concluída: ${unique.length} textos únicos em ${elapsed}s.`
  );
  return results;
}

// Google Mobile (HTML scraping) - less likely to be rate limited
async function translateGoogleMobileSingle(text, sl, tl) {
  if (!text || !text.trim()) return text;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 500 * attempt));
      const ua = getRandomUA();
      const url = `https://translate.google.com/m?sl=${encodeURIComponent(sl || "auto")}&tl=${encodeURIComponent(tl || "pt")}&q=${encodeURIComponent(text)}`;
      const raw = await new Promise((res, rej) => {
        let completed = false;
        const rq = https.get(
          url,
          {
            headers: {
              "User-Agent": ua,
              "Referer": "https://translate.google.com/",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
          },
          (rsp) => {
            let d = "";
            rsp.setEncoding("utf8");
            rsp.on("data", (c) => (d += c));
            rsp.on("end", () => {
              if (completed) return;
              completed = true;
              if (rsp.statusCode === 429 || rsp.statusCode === 302) {
                if (attempt < 2) { return rej(new Error(`retry ${rsp.statusCode}`)); }
                const redirect = rsp.headers.location || "https://www.google.com/sorry/index";
                global.log("warn", `[translator] Google Mobile HTTP ${rsp.statusCode}. Banindo 10min.`);
                engineBans["google-mobile"] = Date.now() + 10 * 60 * 1000;
                openCaptchaSolver(redirect).then(() => {
                  global.log("info", "CAPTCHA resolvido! Reativando Google Mobile.");
                  delete engineBans["google-mobile"];
                  res("");
                }).catch(() => {
                  rej(new Error(`HTTP ${rsp.statusCode} Rate Limit`));
                });
                return;
              }
              if (rsp.statusCode !== 200) {
                if (attempt < 2) { return rej(new Error(`retry ${rsp.statusCode}`)); }
                return rej(new Error(`HTTP ${rsp.statusCode}`));
              }
              res(d);
            });
            rsp.on("error", (e) => {
              if (!completed) {
                completed = true;
                rej(e);
              }
            });
          }
        );
        rq.on("error", (e) => {
          if (!completed) {
            completed = true;
            rej(e);
          }
        });
        rq.setTimeout(25000, () => {
          if (!completed) {
            completed = true;
            global.log("warn", `[Google Mobile] timeout. Banindo.`);
            engineBans["google-mobile"] = Date.now() + 10 * 60 * 1000;
            if (rq.socket) rq.socket.destroy();
            rq.destroy();
            rej(new Error("timeout"));
          }
        });
      });
      const match = raw.match(/class="result-container">([\s\S]*?)<\/div>/i);
      if (match && match[1]) {
        const tr = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        return tr !== text ? fixTranslation(text, tr) : text;
      }
      return text;
    } catch (e) {
      if (attempt >= 2) {
        global.log("debug", `[Google Mobile] Erro final: ${e.message}`);
        return text;
      }
    }
  }
  return text;
}

async function translateGoogleMobileBatch(texts, sl, tl) {
  const results = new Map();
  const SEP = "\n[|]\n";
  const SEP_ENC = encodeURIComponent(SEP).length;
  const MAX_LEN = 300;
  let subBatch = [];
  let subLen = 0;
  const flush = async (items) => {
    if (items.length === 0) return;
    const joined = items.map(t => t.clean).join(SEP);
    const tr = await translateGoogleMobileSingle(joined, sl, tl);
    if (tr && tr !== joined) {
      const parts = tr.split(SEP);
      items.forEach((t, i) => results.set(t.id, (parts[i] && parts[i].length > 0) ? parts[i].trim() : t.clean));
    } else {
      items.forEach((t) => results.set(t.id, t.clean));
    }
  };
  for (const t of texts) {
    const tLen = encodeURIComponent(t.clean).length + SEP_ENC;
    if (subLen + tLen > MAX_LEN && subBatch.length > 0) {
      await flush(subBatch);
      subBatch = [];
      subLen = 0;
    }
    subBatch.push(t);
    subLen += tLen;
  }
  await flush(subBatch);
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
          headers: { "User-Agent": getRandomUA(), Accept: "application/json" },
        },
        (rsp) => {
          let d = "";
          rsp.setEncoding("utf8");
          rsp.on("data", (c) => (d += c));
          rsp.on("end", () => {
            if (rsp.statusCode === 429 || rsp.statusCode === 302) {
              engineBans["google"] = Date.now() + 10 * 60 * 1000;
              global.log("warn", `translator: Google GTX HTTP ${rsp.statusCode}. Banido por 10min.`);
              return rej(new Error(`HTTP ${rsp.statusCode} Rate Limit`));
            }
            if (rsp.statusCode !== 200) {
              return rej(new Error(`HTTP ${rsp.statusCode}`));
            }
            res(d);
          });
          rsp.on("error", rej);
        },
      );
      rq.on("error", (e) => rej(e));
      rq.setTimeout(15000, () => {
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

// Papago (single) - real implementation
async function translatePapagoSingle(text, sl, tl) {
  if (!text || text.trim().length < 2) return text;
  if (engineBans["papago"] && engineBans["papago"] > Date.now()) return text;
  try {
    const src = sl === "auto" ? detectLang(text) : sl;
    const body = new URLSearchParams({
      source: src, target: tl, text: text,
      dict: "true", useGlossary: "false", honorific: "false", dictDisplay: "30"
    }).toString();
    const raw = await new Promise((res, rej) => {
      let done = false;
      const rq = https.request("https://papago.naver.com/api/text/translation", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": getRandomUA(),
          "Referer": "https://papago.naver.com/",
          "Accept": "application/json"
        },
      }, (rsp) => {
        let d = ""; rsp.setEncoding("utf8");
        rsp.on("data", (c) => d += c);
        rsp.on("end", () => { if (done) return; done = true; res({ status: rsp.statusCode, body: d }); });
        rsp.on("error", (e) => { if (!done) { done = true; rej(e); } });
      });
      rq.on("error", (e) => { if (!done) { done = true; rej(e); } });
      rq.setTimeout(15000, () => { if (!done) { done = true; rq.destroy(); rej(new Error("timeout")); } });
      rq.write(body); rq.end();
    });
    if (raw.status === 429 || raw.status === 302) {
      engineBans["papago"] = Date.now() + 10 * 60 * 1000;
      return text;
    }
    if (raw.status !== 200) return text;
    const j = JSON.parse(raw.body);
    const tr = j && j.translatedText;
    if (tr && tr !== text) return fixTranslation(text, tr);
    return text;
  } catch (e) {
    if (global.log) global.log("debug", "[Papago] Erro: " + e.message);
    return text;
  }
}

// MyMemory (single) - real implementation
async function translateMyMemoryOne(text, sl, tl) {
  if (!text || text.trim().length < 2) return text;
  if (engineBans["mymemory"] && engineBans["mymemory"] > Date.now()) return text;
  try {
    const src = sl === "auto" ? detectLang(text) : sl;
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + encodeURIComponent(src) + "%7C" + encodeURIComponent(tl);
    const raw = await new Promise((res, rej) => {
      let done = false;
      const rq = https.get(url, { headers: { "User-Agent": getRandomUA() } }, (rsp) => {
        let d = ""; rsp.setEncoding("utf8");
        rsp.on("data", (c) => d += c);
        rsp.on("end", () => { if (done) return; done = true; res({ status: rsp.statusCode, body: d }); });
        rsp.on("error", (e) => { if (!done) { done = true; rej(e); } });
      });
      rq.on("error", (e) => { if (!done) { done = true; rej(e); } });
      rq.setTimeout(10000, () => { if (!done) { done = true; rq.destroy(); rej(new Error("timeout")); } });
    });
    if (raw.status === 429) {
      engineBans["mymemory"] = Date.now() + 10 * 60 * 1000;
      return text;
    }
    if (raw.status !== 200) return text;
    const j = JSON.parse(raw.body);
    if (j.responseStatus !== 200) return text;
    const tr = j.responseData && j.responseData.translatedText;
    if (tr && /MYMEMORY WARNING/i.test(tr)) {
      engineBans["mymemory"] = Date.now() + 10 * 60 * 1000;
      return text;
    }
    if (tr && tr !== text && tr.length > 0) return fixTranslation(text, tr);
    return text;
  } catch (e) {
    if (global.log) global.log("debug", "[MyMemory] Erro: " + e.message);
    return text;
  }
}

// Yandex (single) - real implementation
async function translateYandexSingle(text, sl, tl) {
  if (!text || text.trim().length < 2) return text;
  if (engineBans["yandex"] && engineBans["yandex"] > Date.now()) return text;
  try {
    const src = sl === "auto" ? detectLang(text) : sl;
    const qs = new URLSearchParams({ key: "dummy", lang: src + "-" + tl, text: text }).toString();
    const raw = await new Promise((res, rej) => {
      let done = false;
      const rq = https.get("https://translate.yandex.net/api/v1.5/tr.json/translate?" + qs, { headers: { "User-Agent": getRandomUA() } }, (rsp) => {
        let d = ""; rsp.setEncoding("utf8");
        rsp.on("data", (c) => d += c);
        rsp.on("end", () => { if (done) return; done = true; res({ status: rsp.statusCode, body: d }); });
        rsp.on("error", (e) => { if (!done) { done = true; rej(e); } });
      });
      rq.on("error", (e) => { if (!done) { done = true; rej(e); } });
      rq.setTimeout(10000, () => { if (!done) { done = true; rq.destroy(); rej(new Error("timeout")); } });
    });
    if (raw.status === 429 || raw.status === 302) {
      engineBans["yandex"] = Date.now() + 10 * 60 * 1000;
      return text;
    }
    if (raw.status !== 200) return text;
    const j = JSON.parse(raw.body);
    const tr = j.text && j.text[0];
    if (tr && tr !== text) return fixTranslation(text, tr);
    return text;
  } catch (e) {
    if (global.log) global.log("debug", "[Yandex] Erro: " + e.message);
    return text;
  }
}

function clearEngineBans() {
  engineBans = {};
}

module.exports = {
  translateBatch,
  translateSingle,
  translateGoogleMobileSingle,
  translateBingBatch,
  translateBingSingle,
  translatePapagoSingle,
  translateMyMemoryOne,
  translateYandexSingle,
  translateDeepL,
  translateLlm,
  getAvailableEngines,
  triggerSmartSwitch,
  limitConcurrency,
  clearEngineBans
};

