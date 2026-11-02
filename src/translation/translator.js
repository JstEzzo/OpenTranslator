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

const GlobalCircuitBreaker = require("../core/globalCircuitBreaker");
const ProviderGateway = require("../core/providerGateway");
// G1/G2: TODA abertura de socket passa por aqui. O import é obrigatório: sem
// ele o runtime lança "ProviderHttp is not defined" em TODOS os providers e o
// translateBatch devolve Map vazio — falha silenciosa, sem erro visível.
const ProviderHttp = require("../core/providerHttp");
const ProviderErrorClassifier = require("../core/providerErrorClassifier");
const LogDeduplicator = require("../core/logDeduplicator");
const TextChunker = require("../core/textChunker");
if (typeof global.log !== "function") global.log = (lvl, msg) => {};
const path = require("path");
const https = require("https");
const { spawn } = require("child_process");
if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..', '..');
const { loadGlossary, loadCfg, saveNewGlobalTranslations } = require("../services/cache");
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
const BAN_DURATION_MS = 15 * 1000; // 15 segundos adaptativo (NÃO 10 minutos)
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
  global.log("warn", `[SmartSwitch] Provedor [${blockedEngine}] em cooldown temporário (${Math.round(BAN_DURATION_MS / 1000)}s).`);
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
    // G1/G2 ponto 4/10 — Bing. Só o transporte muda: o POST vai pelo
    // ProviderHttp, que passa pelo ProviderGateway.executeRequest. O
    // classificação de status abaixo (P-008) foi reaplicada no corpo.
    const raw = await ProviderHttp.post({
      url,
      providerKey: "bing",
      body: body.toString(),
      timeoutMs: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }).then((r) => {
      if (r.status === 429 || r.status === 302 || r.status === 411) {
        const classified = ProviderErrorClassifier.classify(
          { statusCode: r.status, message: `HTTP ${r.status}` },
          { statusCode: r.status, headers: r.headers, body: r.body },
        );
        const cooldown = classified.type === "RATE_LIMITED"
          ? classified.retryAfterMs
          : BAN_DURATION_MS;
        engineBans["bing"] = Date.now() + (
          classified.type === "RATE_LIMITED" ? classified.retryAfterMs : BAN_DURATION_MS
        );
        global.log("warn",
          `[translator] Bing HTTP ${r.status} classificado como ${classified.type}. `
          + `Cooldown de ${Math.round(cooldown / 1000)}s. `
          + (classified.type === "RATE_LIMITED"
            ? "Rate limit temporário — NÃO é banimento permanente."
            : classified.message));
        throw new Error(`HTTP ${r.status}`);
      }
      if (r.status !== 200) {
        throw new Error(`HTTP ${r.status}`);
      }
      return r.body;
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
    // P-008 — o `catch` NÃO pode banir o Bing por 10 minutos. JSON malformado
    // e erro de socket caem aqui: banir o provedor por 10min por um erro de
    // parsing é untrue. Um status já CLASSIFICADO acima (429/302/411) tem o
    // próprio cooldown; o resto usa o switch adaptativo de 15s.
    global.log("warn", `[Bing] Erro traduzindo "${text.substring(0, 40)}...": ${e.message}`);
    if (!/^HTTP (429|302|411)$/.test(e.message)) {
      triggerSmartSwitch("bing");
    }
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
      // G1/G2 ponto 1/10 — LLM (OpenAI-compatível). `fetchGuarded` devolve
      // {status, headers, body} e passa pelo ProviderGateway.executeRequest.
      const response = await ProviderHttp.fetchGuarded({
        url,
        providerKey: `llm:${provider}`,
        timeoutMs: 15000,
        init: { method: "POST", headers: headers, body: body },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}: ${response.body}`);
      }
      const data = JSON.parse(response.body);
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
      // G1/G2 ponto 2/10 — Anthropic/Claude. Endpoint e headers preservados;
      // só o transporte passa pelo gateway.
      const response = await ProviderHttp.fetchGuarded({
        url,
        providerKey: "llm:anthropic",
        timeoutMs: 15000,
        init: { method: "POST", headers: headers, body: body },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}: ${response.body}`);
      }
      const data = JSON.parse(response.body);
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
    // G1/G2 ponto 3/10 — DeepL. Autenticação no header preservada.
    const response = await ProviderHttp.fetchGuarded({
      url,
      providerKey: "deepl",
      timeoutMs: 10000,
      init: { method: "POST", headers: headers, body: body },
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${response.body}`);
    }
    const data = JSON.parse(response.body);
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
  return translateBatch(texts, sl, tl, "multi", glossary, onBatchTranslated);
}

const TranslationQuality = require('../core/translationQuality');

async function translateBatch(texts, sl, tl, engine, glossary, onBatchTranslated, options = {}) {
  const rejected = new Map();
  const sourceById = new Map(texts.map(item => [item.id, item.clean || item.original || '']));
  const idsBySource = new Map();
  for (const [id, source] of sourceById) {
    if (!idsBySource.has(source)) idsBySource.set(source, []);
    idsBySource.get(source).push(id);
  }
  const check = (source, translation, id) => {
    const quality = TranslationQuality.inspect(source, translation);
    if (!quality.valid) {
      const ids = id !== null && id !== undefined ? [id] : (idsBySource.get(source) || [null]);
      for (const rejectedId of ids) rejected.set(rejectedId ?? source, { id:rejectedId, issues:quality.issues });
    }
    return quality.valid;
  };
  const saveValid = typeof onBatchTranslated === 'function' ? chunk => {
    const valid = chunk.filter(item => Array.isArray(item)
      ? check(item[0], item[1], null)
      : check(item.clean || item.original || sourceById.get(item.id), item.translated, item.id));
    if (valid.length) onBatchTranslated(valid);
  } : undefined;
  const result = await translateBatchUnchecked(texts, sl, tl, engine, glossary, saveValid, options);
  if (result instanceof Map) {
    for (const [id, value] of result) {
      if (!check(sourceById.get(id), value, id)) result.delete(id);
    }
    const combined = [...(result.rejectedTranslations || []), ...rejected.values()];
    result.rejectedTranslations = [...new Map(combined.map(item => [item.id ?? JSON.stringify(item.issues), item])).values()];
  }
  return result;
}

async function translateBatchUnchecked(texts, sl, tl, engine, glossary, onBatchTranslated, options = {}) {
  if (!engine || engine === "auto") engine = "multi";
  if (engine === 'local_marian') return require('./localTranslation').translateBatch(texts,sl,tl,glossary,onBatchTranslated,options);
  options = { ...options, allowProviderFallback: options.allowProviderFallback === true || engine === "multi" };
  if (engine === "bing") return translateBingBatch(texts, sl, tl);
  const results = new Map();
  if (texts.length === 0) return results;

  // Pre-apply glossary
  let glos = glossary || loadGlossary();
  if (!Array.isArray(glos)) {
    if (glos && typeof glos === "object") {
      glos = Object.entries(glos).map(([term, translation]) => ({ term, translation }));
    } else {
      glos = [];
    }
  }
  const glossaryMap = new Map();
  for (const g of glos) {
    if (g && g.term && g.translation) {
      glossaryMap.set(String(g.term).toLowerCase(), String(g.translation));
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
  if (engine === "papago") {
    const PAPAGO_BATCH_SIZE = 5;
    const SEP = "\n---\n";
    const papagoBatches = [];
    for (let i = 0; i < unique.length; i += PAPAGO_BATCH_SIZE) {
      papagoBatches.push(unique.slice(i, i + PAPAGO_BATCH_SIZE));
    }

    let completedTexts = 0;
    const startTime = Date.now();
    if (global.log) {
      global.log("info", `[Papago] Processando ${unique.length} textos únicos em ${papagoBatches.length} lotes rápidos...`);
    }

    await limitConcurrency(3, papagoBatches, async (batch) => {
      const items = batch.map(([clean]) => clean);
      const joined = items.join(SEP);
      let success = false;
      try {
        const rawTr = await translatePapagoSingle(joined, sl, tl);
        if (rawTr && rawTr !== joined) {
          const parts = rawTr.split(/\s*---\s*/);
          if (parts.length === batch.length) {
            const toSave = [];
            for (let j = 0; j < batch.length; j++) {
              const [clean, related] = batch[j];
              const tr = parts[j] ? parts[j].trim() : clean;
              const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean);
              if (tr && (tr !== clean || !hasSource)) {
                for (const t of related) results.set(t.id, tr);
                if (tr !== clean) toSave.push([clean, tr]);
              }
            }
            if (toSave.length > 0 && typeof onBatchTranslated === "function") {
              try { onBatchTranslated(toSave); } catch (e) {}
            }
            success = true;
          }
        }
      } catch (e) {}

      // Fallback individual pontual se a divisão em lote não alinhou
      if (!success) {
        for (const [clean, related] of batch) {
          try {
            const tr = await translatePapagoSingle(clean, sl, tl);
            const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean);
            if (tr && typeof tr === "string" && (tr !== clean || !hasSource)) {
              for (const t of related) results.set(t.id, tr);
            }
          } catch (e) {}
        }
      }

      completedTexts += batch.length;
      if (completedTexts % 50 === 0 || completedTexts === unique.length) {
        const pct = ((completedTexts / unique.length) * 100).toFixed(1);
        if (global.log) {
          global.log("info", `[Papago] Progresso: ${completedTexts}/${unique.length} textos (${pct}%)...`);
        }
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (global.log) {
      global.log("success", `[Papago] Concluído: ${results.size}/${texts.length} textos traduzidos em ${elapsed}s.`);
    }
    return results;
  }
  if (engine === "multi" || engine === "google" || engine === "gtx") {
    const breaker = GlobalCircuitBreaker.getInstance();
    const initCheck = breaker.canExecute("google:gtx", { reserveProbe: false });
    if (!initCheck.allowed) {
      if (options.allowProviderFallback === false) {
        const pending = new Map(); pending.rateLimited = true; return pending;
      }
      if (global.log) global.log("info", `[SmartSwitch] Google GTX em cooldown/limitado (${initCheck.reason}). Ativando fallback automático para Papago...`);
      return translateBatch(texts, sl, tl, "papago", glossary, onBatchTranslated);
    }
  }

  const SEP = "\n[|]\n";
  const batchPlan = require('./googleBatchPlanner').plan(unique);
  const batches = batchPlan.batches;
  if (batchPlan.oversized.length) results.pendingTranslations = batchPlan.oversized.flatMap(([, related]) => related.map(t => ({id:t.id,reason:'INPUT_EXCEEDS_BATCH_LIMIT'})));

  global.log(
    "info",
    `Dividido em ${unique.length} textos únicos em ${batches.length} lotes para tradução.`
  );

  const CONCURRENCY_LIMIT = 2; // Concorrência controlada e segura para Google GTX
  let completedUniqueTexts = 0;
  let completedBatchesCount = 0;
  const startTime = Date.now();

  const fetchGoogleBatchWithRetry = async (url, maxRetries = 3, postBody = null) => {
    const breaker = GlobalCircuitBreaker.getInstance();
    const check = breaker.canExecute("google:gtx", { reserveProbe: false });
    if (!check.allowed) {
      LogDeduplicator.getInstance().logRateLimit("google:gtx", check.reason);
      throw new Error(`CIRCUIT_BREAKER_OPEN: Google GTX bloqueado por Rate Limit. Cooldown até ${check.cooldownUntil}`);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (require("../core/shutdownCoordinator").isShuttingDown()) { const error=new Error("Translation cancelled during shutdown");error.code="TRANSLATION_CANCELLED";throw error; }
      // Re-verifica o circuit breaker antes de cada tentativa
      const checkLoop = breaker.canExecute("google:gtx", { reserveProbe: false });
      if (!checkLoop.allowed) {
        throw new Error(`CIRCUIT_BREAKER_OPEN: Google GTX bloqueado por Rate Limit`);
      }

      try {
        breaker.recordRequestStart("google:gtx");
        // G1/G2 ponto 5/10 — Google GTX. O breaker local (canExecute /
        // recordRequestStart) é mantidO porque carrega a semântica de
        // COOLDOWN/RATE_LIMITED que este provider já tinha; o SOCKET passa
        // pelo ProviderHttp, que executa o ProviderGateway.executeRequest e
        // portanto registra a tentativa também no breaker central.
        const isPost = !!postBody;
        const rawRes = isPost
          ? await ProviderHttp.post({
            url,
            providerKey: "google:gtx",
            body: postBody,
            timeoutMs: 15000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
          })
          : await ProviderHttp.get({
            url,
            providerKey: "google:gtx",
            timeoutMs: 15000,
            options: {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                Accept: "application/json, text/plain, */*",
              },
            },
          });
        const raw = rawRes.body;

        // Classificação preservada do bloco original: 429 é RATE_LIMITED
        // (respeita Retry-After), 302 é CAPTCHA/block, o resto é erro. É o
        // que alimenta o breaker local e decide se há retry.
        breaker.recordRequestEnd("google:gtx");
        const classified = ProviderErrorClassifier.classify(null, {
          statusCode: rawRes.status,
          headers: rawRes.headers,
          body: rawRes.body,
        });

        if (rawRes.status === 429) {
          const retryAfter = (rawRes.headers && rawRes.headers["retry-after"]) || "desconhecido";
          breaker.recordError("google:gtx", classified);
          LogDeduplicator.getInstance().logRateLimit(
            "google:gtx",
            `HTTP 429 | Retry-After: ${retryAfter} | Cooldown: ${classified.retryAfterSec || 15}s`
          );
          throw new Error(`HTTP 429 Rate Limit`);
        }

        if (rawRes.status === 302) {
          breaker.recordError("google:gtx", classified);
          LogDeduplicator.getInstance().logRateLimit(
            "google:gtx",
            `HTTP 302 | CAPTCHA / Unusual Traffic redirect`
          );
          throw new Error(`HTTP 302 Redirect`);
        }

        if (rawRes.status !== 200) {
          breaker.recordError("google:gtx", classified);
          throw new Error(`HTTP ${rawRes.status}`);
        }
        breaker.recordSuccess("google:gtx");

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
    if (require("../core/shutdownCoordinator").isShuttingDown()) { results.cancelled=true; return; }
    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 100)));
    const joined = batch.map(([clean]) => clean).join(SEP);
    try {
      const gCheck = breaker.canExecute("google:gtx", { reserveProbe: false });
      if (!gCheck.allowed) {
        throw new Error(`Google GTX temporariamente limitado (${gCheck.reason}).`);
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
      if (e.code === "TRANSLATION_CANCELLED") { results.cancelled=true; return; }
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
  const initCheck = breaker.canExecute("google:gtx", { reserveProbe: false });
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
      if (results.rateLimited || results.cancelled) return; // Se circuit abriu, descarta batches subsequentes
      await processBatch(b, i);
    }
  );

  if (results.cancelled || require("../core/shutdownCoordinator").isShuttingDown()) { const error=new Error("Translation cancelled during shutdown; completed translations remain in cache");error.code="TRANSLATION_CANCELLED";throw error; }

  if (results.rateLimited) {
    LogDeduplicator.getInstance().emitSummary("google:gtx", {
      blockedRequests: breaker.getProviderHealth("google:gtx").requestsBlocked,
      cooldownUntil: breaker.getProviderHealth("google:gtx").cooldownUntil
    });

    // Fallback transparente: tenta concluir textos pendentes restantes via Papago
    const uncompleted = texts.filter(t => !results.has(t.id));
    if (uncompleted.length > 0 && options.allowProviderFallback !== false) {
      if (global.log) {
        global.log("info", `[SmartSwitch] Ativando fallback automático para Papago (${uncompleted.length} textos restantes)...`);
      }
      try {
        const fallbackResults = await translateBatch(uncompleted, sl, tl, "papago", glossary, onBatchTranslated);
        if (fallbackResults && fallbackResults.size > 0) {
          for (const [id, tr] of fallbackResults.entries()) {
            results.set(id, tr);
          }
          if (texts.every(t => results.has(t.id))) {
            results.rateLimited = false; // Recuperado com sucesso via fallback!
          }
        }
      } catch (fbErr) {
        if (global.log) global.log("warn", `[SmartSwitch] Falha no fallback Papago: ${fbErr.message}`);
      }
    }
  }
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  if (results.rateLimited) {
    global.log(
      "warn",
      `Lote interrompido por Rate Limit: ${results.size}/${texts.length} textos processados em ${elapsed}s.`
    );
  } else {
    global.log(
      "info",
      `Lote de tradução concluído: ${results.size}/${texts.length} textos obtidos em ${elapsed}s.`
    );
  }
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
      // G1/G2 ponto 6/10 — Google Mobile (scraping HTML). Só o transporte muda;
      // o tratamento de 429/302 com openCaptchaSolver é preservado abaixo.
      const gmRes = await ProviderHttp.get({
        url,
        providerKey: "google-mobile",
        timeoutMs: 25000,
        options: {
          headers: {
            "User-Agent": ua,
            "Referer": "https://translate.google.com/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        },
      });
      let raw = gmRes.body;
      if (gmRes.status === 429 || gmRes.status === 302) {
        if (attempt < 2) { throw new Error(`retry ${gmRes.status}`); }
        const redirect = (gmRes.headers && gmRes.headers.location) || "https://www.google.com/sorry/index";
        global.log("warn", `[translator] Google Mobile HTTP ${gmRes.status}. Cooldown temporário ativado.`);
        engineBans["google-mobile"] = Date.now() + 30 * 1000;
        await openCaptchaSolver(redirect)
          .then(() => {
            global.log("info", "CAPTCHA resolvido! Reativando Google Mobile.");
            delete engineBans["google-mobile"];
            raw = "";
          })
          .catch(() => { throw new Error(`HTTP ${gmRes.status} Rate Limit`); });
      } else if (gmRes.status !== 200) {
        if (attempt < 2) { throw new Error(`retry ${gmRes.status}`); }
        throw new Error(`HTTP ${gmRes.status}`);
      }
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
  const result = await translateSingleUnchecked(text, sl, tl, engine);
  if (typeof text === 'string' && text.trim()) {
    const quality = TranslationQuality.inspect(text, result);
    if (!quality.valid) {
      const error = new Error('Translation quality rejected: ' + quality.issues.join(', '));
      error.code = 'INVALID_TRANSLATION_QUALITY'; throw error;
    }
  }
  return result;
}

async function translateSingleUnchecked(text, sl, tl, engine) {
  const cfg = loadCfg();
  if (!engine || engine === "auto") engine = cfg.engine || "multi";
  if (engine === 'local_marian') {
    const result=await require('./localTranslation').translateBatch([{id:'single',clean:text,original:text}],sl,tl,[],null,{});
    if(!result.has('single'))throw new Error('Local translation requires review or the text is already unchanged.');
    return result.get('single');
  }
  if (engine === "bing") return translateBingSingle(text, sl, tl);
  if (engine === "papago") return translatePapagoSingle(text, sl, tl);
  if (engine === "mymemory") return translateMyMemoryOne(text, sl, tl);
  if (engine === "llm") return translateLlm(text, sl, tl, cfg);
  if (engine === "deepl") return translateDeepL(text, sl, tl, cfg);

  if (!text || typeof text !== "string" || !text.trim()) return text;

  if (!['google', 'gtx', 'multi'].includes(engine)) throw new Error('Unknown translation provider: ' + engine);
  const translateSelected = engine === 'multi' ? translateSingleWithFallback :
    (value, source, target) => translateSingleRawGoogle(value, source, target, true);

  // Proteção universal: chunking se exceder tamanho seguro
  const chunkResult = TextChunker.chunk(text, { maxChars: 800, maxBytes: 1500 });
  if (chunkResult.isChunked) {
    global.log("info", `[TextChunker] Texto longo (${text.length} chars) dividido em ${chunkResult.chunks.length} partes seguras.`);
    const translatedParts = [];
    for (const ch of chunkResult.chunks) {
      const partTr = await translateSelected(ch, sl, tl);
      translatedParts.push(partTr);
    }
    return TextChunker.recombine(translatedParts);
  }

  return translateSelected(text, sl, tl);
}

async function translateSingleWithFallback(text, sl, tl) {
  if (!text || typeof text !== "string" || !text.trim()) return text;

  const breaker = GlobalCircuitBreaker.getInstance();
  const googleCheck = breaker.canExecute("google:gtx", { reserveProbe: false });

  // Se Google GTX estiver disponível e não bloqueado por rate limit, tenta Google primeiro
  if (googleCheck.allowed) {
    try {
      const gRes = await translateSingleRawGoogle(text, sl, tl);
      if (gRes && typeof gRes === "string" && gRes.trim() !== text.trim() && gRes.trim().length > 0) {
        return gRes;
      }
    } catch (e) {}
  }

  // Fallback 1: Papago (excelente para CJK e diálogo em tempo real)
  try {
    const papagoRes = await translatePapagoSingle(text, sl, tl);
    if (papagoRes && typeof papagoRes === "string" && papagoRes.trim() !== text.trim() && papagoRes.trim().length > 0) {
      return papagoRes;
    }
  } catch (e) {}

  // Fallback 2: MyMemory (robusto para strings curtas e diálogo)
  try {
    const mmRes = await translateMyMemoryOne(text, sl, tl);
    if (mmRes && typeof mmRes === "string" && mmRes.trim() !== text.trim() && mmRes.trim().length > 0) {
      return mmRes;
    }
  } catch (e) {}

  // Fallback 3: Bing
  try {
    const bingRes = await translateBingSingle(text, sl, tl);
    if (bingRes && typeof bingRes === "string" && bingRes.trim() !== text.trim() && bingRes.trim().length > 0) {
      return bingRes;
    }
  } catch (e) {}

  return text;
}

async function translateSingleRawGoogle(text, sl, tl, strict = false) {
  if (!text || typeof text !== "string" || !text.trim()) return text;
  const breaker = GlobalCircuitBreaker.getInstance();
  const initCheck = breaker.canExecute("google:gtx", { reserveProbe: false });
  if (!initCheck.allowed) {
    if (strict) throw new Error('Google provider is temporarily blocked by its circuit breaker.');
    return text;
  }

  try {
    const q = encodeURIComponent(text);
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      sl +
      "&tl=" +
      tl +
      "&dt=t&q=" +
      q;
    const reqChars = text.length;
    const reqBytes = Buffer.byteLength(text, "utf8");
    const urlLen = url.length;

    breaker.recordRequestStart("google:gtx");
    // G1/G2 ponto 7/10 — Google GTX (caminho único, GET com q na URL).
    // A telemetria por status (429/302/413) abaixo é preservada integralmente:
    // é ela que alimenta o breaker e o log de payload.
    const gtxRes = await ProviderHttp.get({
      url,
      providerKey: "google:gtx",
      timeoutMs: 15000,
      options: {
        headers: { "User-Agent": getRandomUA(), Accept: "application/json" },
      },
    }).catch((e) => {
      breaker.recordRequestEnd("google:gtx");
      throw e;
    });
    const raw = gtxRes.body;
    breaker.recordRequestEnd("google:gtx");
    const classified = ProviderErrorClassifier.classify(null, {
      statusCode: gtxRes.status,
      headers: gtxRes.headers,
      body: gtxRes.body,
    });

    if (gtxRes.status === 429) {
      const retryAfter = (gtxRes.headers && gtxRes.headers["retry-after"]) || "desconhecido";
      breaker.recordError("google:gtx", classified);
      global.log(
        "warn",
        `[PROVIDER RATE LIMIT] Google GTX retornou HTTP 429. Request chars: ${reqChars} | Request bytes: ${reqBytes} | URL length: ${urlLen} | Retry-After: ${retryAfter} | Classificação: RATE_LIMITED | Cooldown: ${classified.retryAfterSec || 15}s`
      );
      throw new Error(`HTTP 429 Rate Limit`);
    }

    if (gtxRes.status === 302) {
      const location = (gtxRes.headers && gtxRes.headers.location) || "";
      breaker.recordError("google:gtx", classified);
      global.log(
        "warn",
        `[PROVIDER REDIRECT] Google GTX retornou HTTP 302 (Location: ${location}). Request chars: ${reqChars} | Request bytes: ${reqBytes} | URL length: ${urlLen} | Classificação: CAPTCHA_OR_BLOCK`
      );
      throw new Error(`HTTP 302 Redirect`);
    }

    if (gtxRes.status === 413 || gtxRes.status === 414) {
      breaker.recordError("google:gtx", classified);
      global.log(
        "warn",
        `[PROVIDER PAYLOAD] Request excedeu o limite seguro (HTTP ${gtxRes.status}). Chars: ${reqChars} | Bytes: ${reqBytes} | URL length: ${urlLen} | Classificação: PAYLOAD_TOO_LARGE`
      );
      throw new Error(`HTTP ${gtxRes.status} Payload Too Large`);
    }

    if (gtxRes.status !== 200) {
      breaker.recordError("google:gtx", classified);
      throw new Error(`HTTP ${gtxRes.status}`);
    }

    breaker.recordSuccess("google:gtx");

    const j = JSON.parse(raw);
    return j && j[0]
      ? j[0]
          .map((x) => x[0])
          .filter(Boolean)
          .join("")
      : text;
  } catch (e) {
    if (strict) throw e;
    return text;
  }
}

async function translateMultiSingle(text, sl, tl) {
  return translateSingleWithFallback(text, sl, tl);
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
    // G1/G2 ponto 8/10 — Papago. Endpoint, headers e body preservados; só o
    // socket passa pelo gateway. O shape {status, body} é o mesmo que o
    // ProviderHttp devolve, então o tratamento abaixo não mudou.
    const raw = await ProviderHttp.post({
      url: "https://papago.naver.com/api/text/translation",
      providerKey: "papago",
      body: body,
      timeoutMs: 15000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": getRandomUA(),
        "Referer": "https://papago.naver.com/",
        "Accept": "application/json"
      },
    });
    if (raw.status === 429 || raw.status === 302) {
      engineBans["papago"] = Date.now() + 30 * 1000;
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
    // G1/G2 ponto 9/10 — MyMemory. GET; shape {status, body} preservado.
    const raw = await ProviderHttp.get({
      url,
      providerKey: "mymemory",
      timeoutMs: 10000,
      options: { headers: { "User-Agent": getRandomUA() } },
    });
    if (raw.status === 429) {
      engineBans["mymemory"] = Date.now() + 30 * 1000;
      return text;
    }
    if (raw.status !== 200) return text;
    const j = JSON.parse(raw.body);
    if (j.responseStatus !== 200) return text;
    const tr = j.responseData && j.responseData.translatedText;
    if (tr && /MYMEMORY WARNING/i.test(tr)) {
      engineBans["mymemory"] = Date.now() + 30 * 1000;
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
    // G1/G2 ponto 10/10 — Yandex. GET; shape {status, body} preservado.
    const raw = await ProviderHttp.get({
      url: "https://translate.yandex.net/api/v1.5/tr.json/translate?" + qs,
      providerKey: "yandex",
      timeoutMs: 10000,
      options: { headers: { "User-Agent": getRandomUA() } },
    });
    if (raw.status === 429 || raw.status === 302) {
      engineBans["yandex"] = Date.now() + 30 * 1000;
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

