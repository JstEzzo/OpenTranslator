(async function () {
  "use strict";

  async function refreshProviderHealth() {
    try {
      const res = await rpc("getProviderHealth");
      if (!res || !res.ok) return;
      const h = res.health || {};
      const grid = $("provider-health-grid");
      const notice = $("provider-health-notice");
      if (!grid) return;

      const gtx = h["google:gtx"] || { state: "UNKNOWN", inFlight: 0, requestsBlocked: 0, requestsSuccess: 0, requests429: 0 };
      const isLimited = gtx.state === "RATE_LIMITED" || gtx.state === "COOLDOWN";

      if (notice) {
        if (isLimited) {
          notice.style.display = "block";
          notice.style.background = "rgba(220,53,69,0.2)";
          notice.style.border = "1px solid #dc3545";
          notice.style.color = "#ff6b6b";
          notice.innerHTML = `⚠️ Google GTX is temporarily cooling down.<br>New requests to this provider will wait until the cooldown ends.`;
        } else {
          notice.style.display = "none";
        }
      }

      grid.innerHTML = `
        <div style="background:var(--bg2); padding:6px; border-radius:3px; border:1px solid var(--bd); font-size:9px; line-height:1.4">
          <strong style="color:var(--txt)">Google GTX</strong><br>
          STATUS: <span style="color:${isLimited ? '#ff4d4f' : '#52c41a'}; font-weight:bold">${esc(gtx.state)}</span><br>
          COOLDOWN: ${gtx.cooldownUntil ? esc(new Date(gtx.cooldownUntil).toLocaleTimeString()) : 'N/A'}<br>
          IN FLIGHT: ${num(gtx.inFlight)}<br>
          BLOCKED REQUESTS: ${num(gtx.requestsBlocked)}<br>
          SUCCESS: ${num(gtx.requestsSuccess)}<br>
          429: ${num(gtx.requests429)}
        </div>
        <div style="background:var(--bg2); padding:6px; border-radius:3px; border:1px solid var(--bd); font-size:9px; line-height:1.4">
          <strong style="color:var(--txt)">Gemini</strong><br>
          STATUS: <span style="color:var(--txt3)">Configuration not verified</span>
        </div>
        <div style="background:var(--bg2); padding:6px; border-radius:3px; border:1px solid var(--bd); font-size:9px; line-height:1.4">
          <strong style="color:var(--txt)">Google Cloud</strong><br>
          STATUS: <span style="color:var(--txt3)">Configuration not verified</span>
        </div>
        <div style="background:var(--bg2); padding:6px; border-radius:3px; border:1px solid var(--bd); font-size:9px; line-height:1.4">
          <strong style="color:var(--txt)">DeepL</strong><br>
          STATUS: <span style="color:var(--txt3)">Configuration not verified</span>
        </div>
      `;
    } catch (e) {}
  }

  let SESSION_TOKEN = "";

  // Heartbeat para manter o servidor ativo enquanto a UI estiver aberta.
  // Tambem e' o canal de bootstrap do X-OpenTranslator-Token exigido pelo RPC.
  async function pingServer() {
    try {
      const r = await fetch("/api/ping", { method: "GET", cache: "no-store" });
      const j = await r.json();
      if (j && j.token) SESSION_TOKEN = j.token;
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }
  setInterval(pingServer, 2500);
  pingServer();

  /**
   * Transporte RPC.
   *
   * FASE 1 / PASSO 18: o header X-OpenTranslator-Token passou a ser OBRIGATORIO.
   * Antes o servidor gerava um token que nunca era exigido. Agora ele e' exigido,
   * e a UI o obtem por /api/ping (somenteacessivel com Host loopback).
   *
   * Se o token ainda nao chegou (primeira chamada antes do ping resolver),
   * esperamos o ping em vez de enviar uma requisicao que seria rejeitada.
   */
  async function waitForToken(maxWaitMs) {
    const deadline = Date.now() + (maxWaitMs || 5000);
    while (!SESSION_TOKEN && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      if (!SESSION_TOKEN) await pingServer();
    }
    return SESSION_TOKEN;
  }

  async function rpc(method, params) {
    if (!SESSION_TOKEN) await waitForToken(5000);
    const r = await fetch("/api/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OpenTranslator-Token": SESSION_TOKEN || "",
      },
      cache: "no-store",
      body: JSON.stringify({ method, params }),
    });
    const j = await r.json();
    if (!j.ok) {
      const e = new Error(j.error || "RPC failed");
      e.requestId = j.requestId;
      e.rpcStatus = j.status;
      e.reason = j.reason;
      throw e;
    }
    return j.data;
  }
  window.rpc = rpc;

  function basename(p, ext) {
    const s = String(p).replace(/[/\\]/g, "/").split("/").pop() || p;
    return ext && s.endsWith(ext) ? s.slice(0, -ext.length) : s;
  }
  function dirname(p) {
    if (!p) return "";
    const parts = String(p).replace(/[/\\]/g, "/").split("/");
    parts.pop();
    return parts.join("/");
  }

  const S = {
    games: {},
    gameKeys: [],
    launchedKey: null,
    cfg: {},
    ws: null,
    wsReady: false,
    gameState: null,
    telemetryHandlers: new Map(),
  };

  function connectDualHook() {
    if (S.ws && S.ws.readyState === WebSocket.OPEN) return;
    let wsUrl = window.DUAL_HOOK_URL || "ws://127.0.0.1:16005/";
    try { wsUrl = new URL(wsUrl, location.href).href; } catch (e) {}
    S.ws = new WebSocket(wsUrl);
    S.ws.onopen = () => {
      S.wsReady = true;
      log("info", "WebSocket Dual Hook conectado (16005).");
      if (S.launchedKey && S.ws) S.ws.send(JSON.stringify({ cmd: "subscribe", game: S.launchedKey }));
    };
    S.ws.onclose = () => {
      S.wsReady = false;
      log("warn", "WebSocket Dual Hook desconectado. Tentando reconectar...");
      setTimeout(connectDualHook, 3000);
    };
    S.ws.onerror = (e) => {
      log("warn", `Dual Hook WebSocket error: ${e.message}`);
      S.wsReady = false;
    };
    S.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg && typeof msg === "object") {
          if (msg.type === "telemetry" || msg.cmd === "telemetry") {
            S.gameState = msg.data || msg.state || null;
            for (const [k, h] of S.telemetryHandlers) h(S.gameState);
          }
        }
      } catch (e) { console.warn(`app.js WS: ${e.message}`); }
    };
  }

  function subscribeTelemetry(key, handler) {
    S.telemetryHandlers.set(key, handler);
    if (S.ws && S.ws.readyState === WebSocket.OPEN && S.launchedKey) {
      S.ws.send(JSON.stringify({ cmd: "subscribe", game: S.launchedKey }));
    }
  }
  function unsubscribeTelemetry(key) {
    S.telemetryHandlers.delete(key);
  }
  connectDualHook();

  /**
   * Helpers de escape — FASE 1 / PASSO 19.
   *
   * Antes existia apenas esc() (usada inconsistentemente). Agora a cadeia
   * completa vive em xssGuard.js e TODOS os sinks de dados dinamicos passam
   * por ela:
   *   esc(s)        -> texto/HTML escapado
   *   attr(s)       -> valor de atributo entre aspas
   *   num(v, fb)    -> numero finito coercionado
   *   html(s)       -> HTML sanitizado por allowlist de tags
   *   txt(el, s)    -> textContent (preferir sempre que HTML nao for necessario)
   */
  function esc(s) {
    return XSSGuard.escapeHtml(s);
  }
  function attr(s) {
    return XSSGuard.escapeAttr(s);
  }
  function num(v, fb) {
    return XSSGuard.safeNum(v, fb);
  }
  function html(s) {
    return XSSGuard.sanitizeHtml(s);
  }
  function txt(el, s) {
    XSSGuard.setText(el, s);
  }
  function qs(s) {
    return document.querySelector(s);
  }
  function qsa(s) {
    return document.querySelectorAll(s);
  }
  function $(s) {
    return document.getElementById(s);
  }

  function log(lvl, msg) {
    rpc("log", { level: lvl, message: msg }).catch(() => {});
  }

  function showToast(msg, type = "success") {
    let container = $("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.position = "fixed";
      container.style.bottom = "20px";
      container.style.right = "20px";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      container.style.zIndex = "9999";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast-card ${type}`;
    // FASE 1 / PASSO 19: msg pode conter texto de erro devolvido por um
    // handler RPC (que por sua vez pode conter dados de provider/jogo).
    // Antes era innerHTML cru -> XSS. Agora passa pelo sanitizador allowlist.
    toast.innerHTML = html(msg);
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "6px";
    toast.style.fontSize = "10px";
    toast.style.fontWeight = "500";
    toast.style.color = "#fff";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
    toast.style.transition = "all 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.backdropFilter = "blur(10px)";
    toast.style.border = "1px solid rgba(255,255,255,0.08)";

    if (type === "success") {
      toast.style.background = "rgba(46, 204, 113, 0.88)";
    } else if (type === "error") {
      toast.style.background = "rgba(231, 76, 60, 0.88)";
    } else if (type === "info") {
      toast.style.background = "rgba(52, 152, 219, 0.88)";
    } else {
      toast.style.background = "rgba(241, 196, 15, 0.88)";
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 10);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  function adjustColorBrightness(hex, percent) {
    if (!hex || hex[0] !== "#") return hex;
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);
    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;
    R = R > 0 ? R : 0;
    G = G > 0 ? G : 0;
    B = B > 0 ? B : 0;
    return (
      "#" +
      R.toString(16).padStart(2, "0") +
      G.toString(16).padStart(2, "0") +
      B.toString(16).padStart(2, "0")
    );
  }

  function applyTheme() {
    const theme = S.cfg.theme || {};
    const accent = theme.accent || "#3b8ef0";
    const safeAccent = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#3b8ef0";
    document.documentElement.classList.toggle("reduce-motion", S.cfg.reduceMotion === true);
    const fontSize = [14, 16, 18, 20].includes(Number(S.cfg.uiFontSize)) ? Number(S.cfg.uiFontSize) : 16;
    const css = `:root { --ui-size: ${fontSize}px; --accent: ${safeAccent}; --accent2: ${adjustColorBrightness(safeAccent, -15)}; --accent3: ${adjustColorBrightness(safeAccent, -30)}; }`;
    let styleEl = $("custom-theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "custom-theme-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  function updateEngineVisibility() {
    const engine = $("cfgEngine")?.value;
    const llmArea = $("llmConfigArea");
    const deeplArea = $("deeplConfigArea");
    if (llmArea) llmArea.style.display = engine === "llm" ? "flex" : "none";
    if (deeplArea)
      deeplArea.style.display = engine === "deepl" ? "flex" : "none";
  }

  // ==================== CONFIG ====================
  async function loadCfg() {
    try {
      S.cfg = await rpc("loadCfg");
    } catch (e) {
      S.cfg = {};
    }
    S.cfg.lang = "en";
    if ($("cfgSL")) $("cfgSL").value = S.cfg.sl || "auto";
    if ($("cfgTL")) $("cfgTL").value = S.cfg.tl || "pt";
    if ($("cfgAppLang")) $("cfgAppLang").value = _lang;
    if ($("cfgEngine")) $("cfgEngine").value = S.cfg.engine || "google";
    if ($("cfgWordWrapLimit"))
      $("cfgWordWrapLimit").value =
        S.cfg.wordWrapLimit !== undefined ? S.cfg.wordWrapLimit : 50;

    if ($("cfgLlmProvider"))
      $("cfgLlmProvider").value = S.cfg.llmProvider || "openai";
    if ($("cfgLlmApiKey")) $("cfgLlmApiKey").value = S.cfg.llmApiKey || "";
    if ($("cfgLlmModel")) $("cfgLlmModel").value = S.cfg.llmModel || "";
    if ($("cfgLlmBaseUrl")) $("cfgLlmBaseUrl").value = S.cfg.llmBaseUrl || "";
    if ($("cfgLlmPrompt")) $("cfgLlmPrompt").value = S.cfg.llmPrompt || "";
    if ($("cfgDeeplApiKey"))
      $("cfgDeeplApiKey").value = S.cfg.deeplApiKey || "";
    if ($("cfgDeeplUseFree"))
      $("cfgDeeplUseFree").checked = S.cfg.deeplUseFreeApi !== false;

    updateEngineVisibility();

    // Apply custom theme settings if loaded
    applyTheme();
    if ($("cfgUiFontSize")) $("cfgUiFontSize").value = String(S.cfg.uiFontSize || 16);
    if ($("cfgLibrarySort")) $("cfgLibrarySort").value = S.cfg.librarySort || "title";
    if ($("cfgShowPaths")) $("cfgShowPaths").checked = S.cfg.showGamePaths === true;
    if ($("cfgReduceMotion")) $("cfgReduceMotion").checked = S.cfg.reduceMotion === true;
    if ($("themeAccent"))
      $("themeAccent").value = S.cfg.theme?.accent || "#3b8ef0";
    if ($("themeBgImage")) $("themeBgImage").value = S.cfg.theme?.bgImage || "";
    if ($("themeGlass")) {
      const g =
        S.cfg.theme?.glassOpacity !== undefined ? S.cfg.theme.glassOpacity : 45;
      $("themeGlass").value = g;
      $("themeGlassVal").textContent = g + "%";
    }
  }
  async function saveCfg() {
    S.cfg.sl = $("cfgSL").value;
    S.cfg.tl = $("cfgTL").value;
    S.cfg.lang = _lang;
    if ($("cfgEngine")) S.cfg.engine = $("cfgEngine").value;
    if ($("cfgWordWrapLimit"))
      S.cfg.wordWrapLimit = parseInt($("cfgWordWrapLimit").value, 10) || 0;

    if ($("cfgLlmProvider")) S.cfg.llmProvider = $("cfgLlmProvider").value;
    if ($("cfgLlmApiKey")) S.cfg.llmApiKey = $("cfgLlmApiKey").value;
    if ($("cfgLlmModel")) S.cfg.llmModel = $("cfgLlmModel").value;
    if ($("cfgLlmBaseUrl")) S.cfg.llmBaseUrl = $("cfgLlmBaseUrl").value;
    if ($("cfgLlmPrompt")) S.cfg.llmPrompt = $("cfgLlmPrompt").value;
    if ($("cfgDeeplApiKey")) S.cfg.deeplApiKey = $("cfgDeeplApiKey").value;
    if ($("cfgDeeplUseFree"))
      S.cfg.deeplUseFreeApi = $("cfgDeeplUseFree").checked;

    // Save theme settings
    if (!S.cfg.theme) S.cfg.theme = {};
    if ($("themeAccent")) S.cfg.theme.accent = $("themeAccent").value;
    if ($("themeBgImage")) S.cfg.theme.bgImage = $("themeBgImage").value;
    if ($("themeGlass"))
      S.cfg.theme.glassOpacity = parseInt($("themeGlass").value, 10);

    if ($("cfgUiFontSize")) S.cfg.uiFontSize = Number($("cfgUiFontSize").value);
    if ($("cfgLibrarySort")) S.cfg.librarySort = $("cfgLibrarySort").value;
    if ($("cfgShowPaths")) S.cfg.showGamePaths = $("cfgShowPaths").checked;
    if ($("cfgReduceMotion")) S.cfg.reduceMotion = $("cfgReduceMotion").checked;
    const result = await rpc("saveCfg", S.cfg);
    if (result?.ok === false) throw new Error(result.reason || "Could not save settings");
    if ($("settings-save-status")) $("settings-save-status").textContent = "Settings saved";
    renderGames();
    applyTheme();
    log("success", t("configSaved"));
  }

  const LANGS = {
    auto: "Auto Detect",
    af: "Afrikaans",
    sq: "Albanian",
    am: "Amharic",
    ar: "Arabic",
    hy: "Armenian",
    az: "Azerbaijani",
    eu: "Basque",
    be: "Belarusian",
    bn: "Bengali",
    bs: "Bosnian",
    bg: "Bulgarian",
    ca: "Catalan",
    ceb: "Cebuano",
    zh: "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    co: "Corsican",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    nl: "Dutch",
    en: "English",
    eo: "Esperanto",
    et: "Estonian",
    tl: "Filipino / Tagalog",
    fi: "Finnish",
    fr: "French",
    fy: "Frisian",
    gl: "Galician",
    ka: "Georgian",
    de: "German",
    el: "Greek",
    gu: "Gujarati",
    ht: "Haitian Creole",
    ha: "Hausa",
    haw: "Hawaiian",
    he: "Hebrew",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hungarian",
    is: "Icelandic",
    ig: "Igbo",
    id: "Indonesian",
    ga: "Irish",
    it: "Italian",
    ja: "Japanese",
    jv: "Javanese",
    kn: "Kannada",
    kk: "Kazakh",
    km: "Khmer",
    rw: "Kinyarwanda",
    ko: "Korean",
    ku: "Kurdish",
    ky: "Kyrgyz",
    lo: "Lao",
    la: "Latin",
    lv: "Latvian",
    lt: "Lithuanian",
    lb: "Luxembourgish",
    mk: "Macedonian",
    mg: "Malagasy",
    ms: "Malay",
    ml: "Malayalam",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    mn: "Mongolian",
    my: "Myanmar (Burmese)",
    ne: "Nepali",
    no: "Norwegian",
    ny: "Nyanja (Chichewa)",
    or: "Odia (Oriya)",
    ps: "Pashto",
    fa: "Persian",
    pl: "Polish",
    pt: "Portuguese (Brazil)",
    "pt-PT": "Portuguese (Portugal)",
    pa: "Punjabi",
    ro: "Romanian",
    ru: "Russian",
    sm: "Samoan",
    gd: "Scots Gaelic",
    sr: "Serbian",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovak",
    sl: "Slovenian",
    so: "Somali",
    es: "Spanish",
    su: "Sundanese",
    sw: "Swahili",
    sv: "Swedish",
    tg: "Tajik",
    ta: "Tamil",
    tt: "Tatar",
    te: "Telugu",
    th: "Thai",
    tr: "Turkish",
    tk: "Turkmen",
    uk: "Ukrainian",
    ur: "Urdu",
    ug: "Uyghur",
    uz: "Uzbek",
    vi: "Vietnamese",
    cy: "Welsh",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu"
  };

  // ==================== I18N ====================
  const LANG = {
    en: {

    launchPhaseInit: "🧹 Cleaning processes and checking engine...",
    launchPhaseUnpack: "📦 Unpacking .rpa archives and media...",
    launchPhaseTranslating: "🤖 Translating scripts and dialogues...",
    launchPhaseAppData: "📂 Mapping AppData save directory...",
    launchPhaseLaunching: "🚀 Launching game executable...",
    launchPhaseConnected: "✨ Connected to CheatOverlay successfully!",
    launchInProgress: "A game launch is already in progress or running",

    google: "Google",
    bing: "Bing",
    multi: "Multi",


    cheatSaveManager: "Save Manager & AppData (%APPDATA%\RenPy)",
    cheatOpenSaveFolder: "📁 Open Save Folder",
    cheatRefresh: "🔄 Refresh",
    cheatResolvedPath: "Resolved Path:",
    cheatResolutionMethod: "Resolution Method:",
    cheatDetectedSaves: "Detected Save / Persistent Files:",
    cheatNoSavesYet: "No save files detected yet.",
    cheatFolderLocatedNoSaves: "Folder located, but no saves created yet.",
    cheatAwaitingGame: "Awaiting game selection...",
    cheatMemoryScannerTitle: "Live Memory Scanner (renpy.store / Universal)",
    cheatScanVariablesBtn: "Scan Variables",
    cheatFilterPlaceholder: "Filter variables (e.g., points, love, money)...",
    cheatClickScanHint: "Click 'Scan Variables' to read renpy.store",
    cheatLaunchTitle: "Launching Game...",
    cheatLaunchSub: "Preparing environment, translations, and patches",
    cheatAlreadyTranslated: "⚡ Game already translated! Loading executable...",

      tabGames: "Games",
      tabSaves: "Saves",
      tabConfig: "Config",
      tabLog: "Log",
      dropText:
        "Drag & drop Game.exe here, or use the 📁 button above to select the game folder",
      dropOrBrowse: "Drop a Game.exe here or click Browse to add a game",
      searchGames: "Search games...",
      refresh: "Refresh",
      noGames: "No games added yet",
      noSavesYet: "No saves found. Launch a game first to create saves.",
      btnPlay: "Play",
      btnEdit: "Edit",
      btnDelete: "Delete",
      btnSaveCfg: "Save Config",
      btnSave: "Save",
      btnCancel: "Cancel",
      btnBrowse: "Browse...",
      btnCopy: "Copy",
      btnClear: "Clear",
      cfgTrans: "Translation",
      cfgSrc: "Source Lang",
      cfgDst: "Target Lang",
      langLabel: "App Language",
      cfgDiagnostics: "Diagnostics",
      cfgTest: "Test Google Translate",
      cfgTestRes: "Result",
      cfgCache: "History",
      cfgClearHistory: "Clear all translations saved in the global cache",
      btnClearHistory: "Clear History",
      clearHistoryConfirm:
        "Are you sure you want to delete all saved translations history? This cannot be undone.",
      historyCleared: "Translation history deleted successfully!",
      statusGames: "games",
      modalTitle: "Edit Game",
      modalExe: "Executable",
      deleteConfirm: "Delete this game?",
      logCopied: "Log copied",
      configSaved: "Config saved",
      uiTitle: "OpenTranslator v1.0",
      uiGames: "Games",
      uiSaves: "Saves",
      cfgEngine: "Translation service",
      cfgEngineOff: "Google",
      cfgEngineGoogle: "Google 🌐",
      cfgEngineBing: "Bing 🔍",
      cfgEngineMulti: "Multi-Engine (Google+Bing) 🔁",
      cfgEngineLlm: "AI / LLM Translator 🤖",
      cfgEngineDeepl: "DeepL Translator 📄",
      glossary: "Glossary",
      glossaryEditor: "Glossary Editor",
      glossaryTerm: "Term",
      glossaryTrans: "Translation",
      glossaryAdd: "Add",
      glossarySave: "Save Glossary",
      glossarySaved: "Glossary saved ({n} terms)",
      btnExtractRpa: "Extract RPA",
      btnInstallUnity: "Install XUnity + Plugin",
      btnInstallOverlay: "Install RPG Maker Overlay",
      btnExtractWolf: "Extract Wolf Game",
      btnPackWolf: "Pack Wolf Directory",
      btnExportExcel: "Export to Excel (.xlsx) 📊",
      btnImportExcel: "Import from Excel (.xlsx) 📥",
      toolsUnity: "Unity Tools",
      toolsRpgm: "RPG Maker Tools",
      toolsWolf: "Wolf RPG Tools",
      descUnity:
        "Install and configure the XUnity AutoTranslator plugin for real-time translation.",
      descWolf: "Decompress data files (.wolf) or repack modified directories.",
      descRpgm:
        "Install the real-time translator in-game or export/import translations in Excel (.xlsx) format.",
      toolsEvb: "Enigma Virtual Box Tools 📦",
      descEvb:
        "Unpack virtual files from single executables packed with Enigma Virtual Box.",
      btnUnpackEvb: "Extract EVB Executable",
      visualCustomizer: "Visual Theme 🎨",
      accentColor: "Accent Color",
      bgImage: "Background Image",
      glassEffect: "Glass Effect (Opacity)",
      wordWrapLimit: "Word Wrap Limit",
      origName: "Original Title",
      transName: "Translated Title",
      designatedName: "Designated Title",
      gamePath: "Game Path",
      tags: "Tags",
      note: "Note",
      engineLabel: "Engine",
      lastLaunch: "Last launch",
      firstLaunch: "First added",
      keyLabel: "Key",
      deleteCache: "Delete Cache",
      exportTexts: "Export Texts",
      extractImages: "Extract Images 📷",
      extractAudio: "Extract Audio 🎵",
      patchFonts: "Patch Fonts PT-BR 🔤",
      editGame: "Edit Game",
      addGame: "Add Game",
      yes: "Yes",
      no: "No",
      configSavedMsg: "Config saved successfully!",
      mPreTranslate: "Translate Files 🌐",
      mRestoreBackup: "Restore Original 🔄",
      cheatNoGameConnected:
        "No active game connected. Start an RPG Maker MZ/MV game to enable Cheat functions.",
      cheatGeral: "General",
      cheatGrupo: "Party Members / HP",
      cheatInv: "Inventory",
      cheatGeneralMods: "General Modifications",
      cheatTelemetryTitle: "Live Telemetry",
      cheatTelemetryWaiting: "Waiting for connection…",
      engineFullSupport: "Full Support",
      enginePlanned: "Planned (Phase 2)",
      engineUnknown: "Unknown Status",
      cheatGold: "Gold",
      cheatSetBtn: "Set",
      cheatNoClip: "Walk Through Walls (NoClip)",
      cheatDisableEncounters: "Disable Enemy Encounters",
      cheatBattleGodMode: "Battle / God Mode",
      cheatInfiniteHP: "Infinite Health (Max HP) [OFF]",
      cheatInfiniteMP: "Infinite Mana (Max MP) [OFF]",
      cheatInfiniteHPLabel: "Infinite Health (Max HP)",
      cheatInfiniteMPLabel: "Infinite Mana (Max MP)",
      cheatInstaWin: "Instant Victory",
      cheatInstaKill: "Enemies at 1 HP",
      cheatTools: "Tools",
      cheatDevTools: "Developer Console (F12)",
      cheatGroupHP: "Party Status and HP/MP Editing",
      cheatAddInvItem: "Add Item / Weapon / Armor",
      cheatSelectItem: "Select Item/Equipment:",
      cheatWaitingGameData: "Waiting for game data...",
      cheatQty: "Quantity",
      cheatAddBtn: "Add",
      cheatInvItems: "Items in Inventory",
      cheatFilter: "Filter items...",
      preparingGame: "Preparing game...",
      cheatSelectItemPlaceholder: "-- Choose an item --",
      weapon: "Weapon",
      armor: "Armor",
      item: "Item",
      level: "Level",
    },
  };
  const _lang = "en";
  function t(k) {
    return LANG[_lang]?.[k] || LANG.en[k] || k;
  }

  // ==================== TRANSLATION ENGINES ====================
  const ENG = {
    google: async (t, f, to) => rpc("translate", { text: t, sl: f, tl: to }),
    bing: async (t, f, to) =>
      rpc("translateWithEngine", { text: t, sl: f, tl: to, engine: "bing" }),
    multi: async (t, f, to) =>
      rpc("translateWithEngine", { text: t, sl: f, tl: to, engine: "multi" }),
  };
  const ENG_NAMES = {
    google: "Google",
    bing: "Bing",
    multi: "Multi-Engine (Google+Bing)",
  };

  // ==================== PRE-TRANSLATION PIPELINE ====================
  // (handled server-side via RPC)

  async function refreshAppDataCard(gameKey, gameDir, gameTitle) {
    try {
      const res = await rpc("getRenpyAppDataStatus", { gameDir, gameTitle });
      const card = $("renpy-appdata-card");
      if (!card) return;
      if (res && res.appDataDir) {
        card.style.display = "block";
        const pathEl = $("renpy-appdata-full-path") || $("renpy-appdata-path");
        const methodEl = $("renpy-appdata-method");
        const listEl = $("renpy-appdata-file-list");
        if (pathEl) pathEl.textContent = res.appDataDir;
        if (methodEl) methodEl.textContent = res.method || "Automatic";
        if (listEl) {
          const saves = res.saves || [];
          if (saves.length === 0) {
            listEl.innerHTML = "<span style=\"font-size:10px; color:var(--txt3)\">No saves found yet</span>";
          } else {
            listEl.innerHTML = saves.map(s => '<span style="font-size:9px; background:var(--bg3); border:1px solid var(--bd); padding:2px 6px; border-radius:3px">' + esc(s) + '</span>').join("");
          }
        }
      } else {
        const pathEl = $("renpy-appdata-full-path");
        if (pathEl) pathEl.textContent = "Not detected, or no external saves";
      }
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }

  let launchMutex = false;
  let telemetryPollTimer = null;
  function startTelemetryLoop() {
    if (telemetryPollTimer) clearInterval(telemetryPollTimer);
    const tsHandler = (state) => {
      const hs = state;
      if (!hs) return;
      const hpCur = hs.hp_cur ?? hs.hp ?? hs.currentHp ?? hs["hp_cur"];
      const hpMax = hs.hp_max ?? hs.maxHp ?? hs["max_hp"];
      const mpCur = hs.mp_cur ?? hs.mp ?? hs.currentMp ?? hs["mp_cur"];
      const mpMax = hs.mp_max ?? hs.maxMp ?? hs["max_mp"];
      const gold = hs.gold ?? hs.money ?? hs.gil;
      const mapName = hs.map ?? hs.mapName ?? hs.location;
      const stEl = $("cheat-telemetry-status");
      if (stEl) stEl.textContent = (S.wsReady ? "✓ Online" : "Conectando…");
      if (stEl) stEl.style.color = S.wsReady ? "var(--green)" : "var(--orange)";
      if ($("tele-hp-cur")) $("tele-hp-cur").textContent = hpCur != null ? hpCur : "—";
      if ($("tele-hp-max")) $("tele-hp-max").textContent = hpMax != null ? hpMax : "—";
      if ($("tele-mp-cur")) $("tele-mp-cur").textContent = mpCur != null ? mpCur : "—";
      if ($("tele-mp-max")) $("tele-mp-max").textContent = mpMax != null ? mpMax : "—";
      if ($("tele-gold")) $("tele-gold").textContent = gold != null ? gold : "—";
      if ($("tele-map")) $("tele-map").textContent = mapName != null ? mapName : "—";
    };
    subscribeTelemetry("app_telemetry", tsHandler);
    if (S.gameState) tsHandler(S.gameState);
    telemetryPollTimer = setInterval(() => {
      if (!S.wsReady) {
        const stEl = $("cheat-telemetry-status");
        if (stEl) stEl.textContent = "Reconectando…";
      }
    }, 1000);
  }

  async function launchGame(key) {
    const g = S.games[key];
    if (!g) return;
    if (launchMutex || S.launchedKey || S.isLaunching) {
      showToast(t("launchInProgress") || "A game launch is already in progress or running", "warning");
      return;
    }
    launchMutex = true;
    S.isLaunching = true;

    const ld = $("gl-loading");
    const lm = $("gl-loading-msg");
    const lTitle = $("gl-loading-title");
    const lSub = $("gl-loading-sub");
    const lBar = $("gl-loading-bar");
    const lPct = $("gl-loading-pct");
    const lStream = $("gl-loading-stream");

    const title = g.libConf?.title || key;
    if (lTitle) lTitle.textContent = `${t("cheatLaunchTitle") || "Initializing"} "${title}"...`;
    if (lSub) lSub.textContent = t("cheatLaunchSub") || "Preparing environment, translations, and patches";
    
    if (ld) {
      ld.style.display = "flex";
      ld.style.opacity = "1";
    }

    const startTime = Date.now();
    const logBuffer = [];

    const updateLoadingState = (pct, msg, streamLine) => {
      if (lBar) lBar.style.width = pct + "%";
      if (lPct) lPct.textContent = pct + "%";
      if (lm) lm.textContent = msg;
      
      if (lStream && streamLine) {
        logBuffer.push(streamLine);
        if (logBuffer.length > 5) logBuffer.shift();
        lStream.innerHTML = logBuffer.map(line => `
          <div style="color:${line.includes('✓') || line.includes('OK') ? 'var(--green)' : (line.includes("Error") || line.includes("Failed") ? 'var(--red)' : 'var(--txt2)')}">
            ${esc(line)}
          </div>
        `).join("");
        lStream.scrollTop = lStream.scrollHeight;
      }
    };

    updateLoadingState(15, t("launchPhaseInit"), "[OpenTranslator Engine Started]");

    let logPollTimer = setInterval(async () => {
      try {
        const logs = await rpc("getLogs", { afterId: lastLogId });
        if (logs && logs.length > 0) {
          for (const lastLog of logs) {
            if (lastLog.id > lastLogId) lastLogId = lastLog.id;
            const txt = lastLog.message || "";
            if (txt.includes("Descompactando") || txt.includes("Escaneando") || txt.includes("extraindo")) {
              updateLoadingState(35, t("launchPhaseUnpack") || "Scanning files...", txt);
            } else if (txt.includes("Iniciando varredura") || txt.includes("Translation engine") || txt.includes("Translating") || txt.includes("Resultado do cache") || txt.includes("trans_cache")) {
              updateLoadingState(55, t("launchPhaseTranslating") || "Looking up translations...", txt);
            } else if (txt.includes("Patched file") || txt.includes("Patched") || txt.includes("Replaced") || txt.includes("patcheado")) {
              updateLoadingState(75, "Applying translations...", txt);
            } else if (txt.includes("AppData Resolver") || txt.includes("Save folder")) {
              updateLoadingState(80, t("launchPhaseAppData") || "Configuring data...", txt);
            } else if (txt.includes("Disparando o motor") || txt.includes("inicializado com sucesso") || txt.toLowerCase().includes("launched") || txt.includes("Spawning process") || txt.includes("WINDOW VISIBLE")) {
              updateLoadingState(90, t("launchPhaseLaunching") || "Starting executable...", txt);
            } else if (txt.includes("CheatOverlay conectado") || txt.includes("Menu de cheats ativo")) {
              updateLoadingState(100, t("launchPhaseConnected") || "Conectado!", txt);
            } else {
              updateLoadingState(lBar ? parseInt(lBar.style.width) || 40 : 40, txt, txt);
            }
          }
        }
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }, 300);

    try {
      const r = await rpc("launchGame", { key });

      if (r && r.ok === false) {
        const errMsg = r.error || (r.certificate && r.certificate.reason) || "Could not start the game";
        updateLoadingState(100, `Failed: ${errMsg}`, "Error");
        if (ld) ld.style.display = "none";
        showToast("Launch failed: " + errMsg, "error");
        return;
      }

      updateLoadingState(100, t("cheatAlreadyTranslated") || "⚡ Game loaded! Executable running...", "PID " + (r.pid || "Active"));

      const elapsed = Date.now() - startTime;
      const minDisplayMs = 1500;
      const remainingMs = Math.max(0, minDisplayMs - elapsed);

      setTimeout(() => {
        if (ld) ld.style.display = "none";
      }, remainingMs);
      S.launchedKey = key;
      renderGames();
      if (g.engine === "renpy" || (g.constArgs && g.constArgs.engine === "renpy")) { refreshAppDataCard(key, g.constArgs?.gameExe ? dirname(g.constArgs.gameExe) : "", title); } else { const c = $("renpy-appdata-card"); if (c) c.style.display = "none"; }
      if (S.ws && S.ws.readyState === WebSocket.OPEN) {
        S.ws.send(JSON.stringify({ cmd: "subscribe", game: key }));
      }
      startTelemetryLoop();
    } catch (e) {
      if (ld) ld.style.display = "none";
      showToast("Launch failed: " + e.message, "error");
    } finally {
      clearInterval(logPollTimer);
      S.isLaunching = false;
      setTimeout(() => { launchMutex = false; }, 2000);
    }
  }

  async function loadGames() {
    try {
      const d = await rpc("loadGames");
      S.games = d.games;
      S.gameKeys = d.gameKeys;
    } catch (e) {
      S.games = {};
      S.gameKeys = [];
    }
  }
  async function saveGame(key, d) {
    try {
      await rpc("saveGame", { key, data: d });
      S.games[key] = d;
      if (!S.gameKeys.includes(key)) S.gameKeys.push(key);
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }
  async function delGame(key) {
    try {
      await rpc("delGame", { key });
      delete S.games[key];
      S.gameKeys = S.gameKeys.filter((k) => k !== key);
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }

  // Engine definitions
  const ENGINES_DEF = {
    mv: { label: "RPG Maker MV", js: true, icon: "\ud83c\udfae" },
    mz: { label: "RPG Maker MZ", js: true, icon: "\ud83c\udfae" },
    krkr: { label: "Kirikiri 2", js: false, icon: "\u2728" },
    krkrz: { label: "Kirikiri Z", js: false, icon: "\u2728" },
    wolf: { label: "Wolf RPG", js: false, icon: "\ud83d\udc3a" },
    rgss: { label: "RGSS (XP/VX/Ace)", js: false, icon: "\u2699" },
    unity: { label: "Unity", js: false, icon: "\ud83c\udf10" },
    python: { label: "Ren'Py Visual Novel Engine", js: false, icon: "🎭", status: "PARTIAL" },
    renpy: { label: "Ren'Py Visual Novel Engine", js: false, icon: "🎭", status: "PARTIAL" },
    srpg: { label: "SRPG Studio", js: false, icon: "\u2694" },
    agtk: { label: "Action Game Toolkit", js: false, icon: "\ud83c\udff0" },
    kmy: { label: "KMY", js: false, icon: "\ud83d\udd2e" },
    bakin: { label: "Bakin", js: false, icon: "\ud83c\udfad" },
    tyrano: { label: "TyranoScript", js: true, icon: "\ud83d\udcdd" },
    godot: { label: "Godot Engine", js: false, icon: "🤖" },
    unreal: { label: "Unreal Engine", js: false, icon: "⚡" },
  };

  async function detectEngine(exePath, exeDir) {
    try {
      return await rpc("detectEngine", { exePath, exeDir });
    } catch (e) {
      return "unknown";
    }
  }
  function engineInfo(eng) {
    return ENGINES_DEF[eng] || { label: "Not identified", icon: "?", js: false };
  }
  const SUPPORTED_ENGINES = new Set(["mv", "mz", "rgss", "python", "renpy", "wolf", "unity", "godot", "unreal", "gamemaker", "construct", "defold", "gdevelop", "cocos", "cocos_creator", "cocos2dx", "electron", "generic"]);
  const PARTIAL_ENGINES = new Set(["tyrano", "krkr", "krkrz", "srpg", "agtk", "kmy", "bakin"]);
  function engineSupportStatus(eng) {
    if (SUPPORTED_ENGINES.has(eng)) return "partial";
    if (PARTIAL_ENGINES.has(eng)) return "planned";
    return "unknown";
  }
  function engineSupportLabel(eng) {
    const s = engineSupportStatus(eng);
    if (s === "partial") return { s, text: "Partial support — check the compatibility profile", cls: "eng-plan" };
    if (s === "planned") return { s, text: "Integration pending", cls: "eng-plan" };
    return { s, text: "Compatibility not identified", cls: "eng-warn" };
  }
  function engineIsJS(eng) {
    return engineInfo(eng).js;
  }

  // ==================== UI ====================
  async function build() {
    try {
      const c = await rpc("loadCfg");
      S.cfg = c;
      S.cfg = { ...(c || {}), lang: "en" };
    } catch (e) { console.warn(`app.js: ${e.message}`); }
    if (!$("application-styles")) {
      const styles = document.createElement("link");
      styles.id = "application-styles";
      styles.rel = "stylesheet";
      styles.href = "styles/base.css?v=20261101-en2";
      document.head.appendChild(styles);
      const layout = document.createElement("link");
      layout.rel = "stylesheet";
      layout.href = "styles/layout.css?v=20261101-en2";
      document.head.appendChild(layout);
    }
    applyTheme();

    const langOpts = Object.keys(LANGS)
      .map(
        (k) =>
          '<option value="' +
          k +
          '">' +
          k.toUpperCase() +
          " - " +
          LANGS[k] +
          "</option>",
      )
      .join("");

    $("root").innerHTML = `
<div id="app">
  <div id="bar">
    <div id="bar-l"><img src="/resources/OpenTranslator.png" style="height:18px;vertical-align:middle;margin-right:6px;border-radius:3px"> OpenTranslator</div>
    <div id="bar-r"></div>
  </div>
  <div id="ly">
    <div id="sd">
      <button class="on" data-t="gl"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"></rect><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"></rect></svg><span class="sl">${t("uiGames")}</span></button>
      <button data-t="sv"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span class="sl">${t("uiSaves")}</span></button>
      <button data-t="cf"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg><span class="sl">${t("tabConfig")}</span></button>
      <button data-t="ch" id="btn-cheats"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg><span class="sl">Cheats ⚡</span></button>
      <button data-t="lg"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg><span class="sl">${t("tabLog")}</span></button>
      <button data-t="pf" id="btn-performance"><svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg><span class="sl">Compatibility</span></button>
    </div>
    <div id="mc">

      <!-- GAMES -->
      <div id="tb-gl" class="tb on"><div class="library-heading"><div><h1>Library</h1><p>Your games and translations in one place.</p></div><button id="glAdd" class="btn primary">+ Add game</button></div>
        <div id="drop-zone">
          <div class="dz-icon">\ud83d\udcc2</div>
          <div class="dz-txt">Drop the game executable here or click Add game.</div>
        </div>
        <div class="gl-bar">
          <input id="glSearch" placeholder="${t("searchGames")}" class="gl-inp">
          <button id="glRefresh" class="btn sm" title="${t("refresh")}">↻ Refresh</button>
        </div>
        <div id="gl-list"></div>
        <!-- Modern Glassmorphic Launch Progress Modal -->
        <div id="gl-loading" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:rgba(8,8,16,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:999999; align-items:center; justify-content:center">
          <div style="width:480px; max-width:90%; background:var(--bg2); border:1px solid var(--bd); border-radius:12px; padding:24px; box-shadow:0 20px 50px rgba(0,0,0,0.6); display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden">
            <div style="position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, var(--accent), var(--pri), var(--accent)); background-size:200% 100%; animation:gradientMove 2s linear infinite"></div>
            
            <div style="display:flex; align-items:center; gap:14px">
              <div style="width:44px; height:44px; border-radius:50%; background:rgba(99,102,241,0.1); border:2px solid var(--accent); display:flex; align-items:center; justify-content:center; font-size:20px; animation:pulse 1.5s infinite">
                🎮
              </div>
              <div style="display:flex; flex-direction:column; flex:1">
                <span id="gl-loading-title" style="font-size:14px; font-weight:700; color:var(--txt)">Launching game...</span>
                <span id="gl-loading-sub" style="font-size:11px; color:var(--txt2)">Preparing the environment, translations, and patches</span>
              </div>
              <div style="font-size:18px; animation:spin 1s linear infinite; color:var(--accent)">⟳</div>
            </div>

            <!-- Animated Progress Bar -->
            <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); position:relative">
              <div id="gl-loading-bar" style="width:15%; height:100%; background:linear-gradient(90deg, var(--accent), var(--pri)); transition:width 0.4s ease; border-radius:4px"></div>
            </div>

            <!-- Current Real-Time Phase Message -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px">
              <span id="gl-loading-msg" style="color:var(--txt); font-weight:600; display:flex; align-items:center; gap:6px">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--green); display:inline-block; animation:ping 1s infinite"></span>
                <span>Starting pipeline checks...</span>
              </span>
              <span id="gl-loading-pct" style="color:var(--txt2); font-family:monospace; font-size:10px">15%</span>
            </div>

            <!-- Real-Time Log Stream Banner -->
            <div id="gl-loading-stream" style="font-size:10px; color:var(--txt3); font-family:monospace; background:rgba(0,0,0,0.3); padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); max-height:60px; overflow-y:auto; word-break:break-all">
              [OpenTranslator Boot Engine Ready]
            </div>
          </div>
        </div>
      </div>

      <!-- SAVES -->
      <div id="tb-sv" class="tb">
        <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
          <span style="font-size:10px;color:var(--txt2)">${t("uiSaves")}</span>
          <span style="flex:1"></span>
          <button id="svOpenDir" class="btn sm">${t("btnBrowse")}</button>
          <button id="svRef" class="btn sm">${t("refresh")}</button>
        </div>
        <div id="sv-list"></div>
      </div>

      <!-- CONFIG -->
      <div id="tb-cf" class="tb"><header class="page-heading"><div><h1>Settings</h1><p>Translation, reading preferences, and tools grouped by purpose.</p></div><span id="settings-save-status" role="status">Changes are saved automatically</span></header><div class="settings-grid"><section class="cg"><h2>Reading and library</h2><p class="section-description">Adjust the interface for comfortable reading. Changes are saved automatically.</p><div class="settings-fields">
<label for="cfgAppLang">Application language</label><select id="cfgAppLang" disabled aria-label="Application language"><option value="en">English</option></select>
<label for="cfgUiFontSize">Text size</label><select id="cfgUiFontSize"><option value="14">Standard · 14 px</option><option value="16">Comfortable · 16 px</option><option value="18">Large · 18 px</option><option value="20">Extra large · 20 px</option></select>
<label for="themeAccent">Accent color</label><input id="themeAccent" type="color">
<label for="cfgLibrarySort">Sort games by</label><select id="cfgLibrarySort"><option value="title">Name · A–Z</option><option value="recent">Most recent</option></select>
<label for="cfgShowPaths">Show game paths</label><input id="cfgShowPaths" type="checkbox">
<label for="cfgReduceMotion">Reduce animations</label><input id="cfgReduceMotion" type="checkbox">
</div></section><div class="cg">
          <h4>${t("cfgTrans")}</h4>
          <div class="cg-body">
            <div class="ci"><label>${t("cfgSrc")}</label><select id="cfgSL">${langOpts}</select></div>
            <div class="ci"><label>${t("cfgDst")}</label><select id="cfgTL">${langOpts}</select></div>
            <div class="ci"><label>${t("cfgEngine")}</label><select id="cfgEngine">
              <option value="google">${t("cfgEngineGoogle")}</option>
              <option value="bing">${t("cfgEngineBing")}</option>
              <option value="multi">${t("cfgEngineMulti")}</option>
              <option value="llm">${t("cfgEngineLlm")}</option>
              <option value="deepl">${t("cfgEngineDeepl")}</option>
              <option value="local_marian">Local translation · Offline</option>
            </select></div>
            
            <!-- Settings de LLM -->
            <div id="llmConfigArea" style="display:none;flex-direction:column;gap:6px;margin-top:8px;padding:8px;background:var(--bg2);border:1px dashed var(--bd);border-radius:4px">
              <div class="ci"><label>LLM provider</label><select id="cfgLlmProvider" style="font-size:10px">
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="anthropic">Claude/Anthropic</option>
                <option value="local">Ollama/LM Studio (Local)</option>
              </select></div>
              <div class="ci"><label>API Key</label><input id="cfgLlmApiKey" type="password" placeholder="API key" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci"><label>Model</label><input id="cfgLlmModel" type="text" placeholder="Ex: gpt-4o-mini" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci"><label>Base URL</label><input id="cfgLlmBaseUrl" type="text" placeholder="Ex: http://localhost:11434/v1" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci" style="flex-direction:column;align-items:stretch"><label>System prompt</label><textarea id="cfgLlmPrompt" rows="3" placeholder="Translation instructions..." style="padding:4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px;resize:vertical;margin-top:2px"></textarea></div>
            </div>
            
            <!-- Settings de DeepL -->
            <div id="deeplConfigArea" style="display:none;flex-direction:column;gap:6px;margin-top:8px;padding:8px;background:var(--bg2);border:1px dashed var(--bd);border-radius:4px">
              <div class="ci"><label>DeepL API Key</label><input id="cfgDeeplApiKey" type="password" placeholder="API key DeepL" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci" style="justify-content:space-between;align-items:center"><label>Usar API Gratuita</label><input id="cfgDeeplUseFree" type="checkbox" checked style="margin:0"></div>
            </div>
            <div class="ci">
              <label>${t("wordWrapLimit")}</label>
              <input id="cfgWordWrapLimit" type="number" min="0" max="100" style="width:60px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px">
            </div>
          </div>
        </div><div class="cg">
          <h4>${t("glossary")}</h4>
          <div class="cg-body">
            <div class="ci" style="flex-direction:column;align-items:stretch;gap:4px">
              <div id="glossary-list" style="max-height:200px;overflow-y:auto"></div>
              <div style="display:flex;gap:4px">
                <input id="glossary-term" placeholder="${t("glossaryTerm")}" style="flex:1;padding:3px 6px;background:var(--bg);border:1px solid var(--bd);color:var(--txt);border-radius:3px;font-size:10px">
                <input id="glossary-trans" placeholder="${t("glossaryTrans")}" style="flex:1;padding:3px 6px;background:var(--bg);border:1px solid var(--bd);color:var(--txt);border-radius:3px;font-size:10px">
                <button id="glossary-add" class="btn xs">${t("glossaryAdd")}</button>
              </div>
              <div style="display:flex;gap:4px;justify-content:flex-end">
                <button id="glossary-save" class="btn xs pri">${t("glossarySave")}</button>
              </div>
            </div>
          </div>
        </div></div><details class="settings-advanced"><summary>Engine and file tools</summary><p>Choose a game when using a tool. These options do not change games automatically.</p><div class="settings-grid"><div class="cg">
          <h4>${t("toolsUnity")}</h4>
          <span class="help-tip">${t("descUnity")}</span>
          <div class="tools-grid">
            <button class="btn sm unity-install">${t("btnInstallUnity")}</button>
          </div>
        </div><div class="cg">
          <h4>${t("toolsWolf")}</h4>
          <span class="help-tip">${t("descWolf")}</span>
          <div class="tools-grid">
            <button class="btn sm wolf-extract">${t("btnExtractWolf")}</button>
            <button class="btn sm wolf-pack">${t("btnPackWolf")}</button>
          </div>
        </div><div class="cg">
          <h4>${t("toolsRpgm")}</h4>
          <span class="help-tip">${t("descRpgm")}</span>
          <div class="tools-grid">
            <button class="btn sm overlay-install">${t("btnInstallOverlay")}</button>
            <button class="btn sm excel-export">${t("btnExportExcel")}</button>
            <button class="btn sm excel-import">${t("btnImportExcel")}</button>
          </div>
        </div><div class="cg">
          <h4>${t("toolsEvb")}</h4>
          <span class="help-tip">${t("descEvb")}</span>
          <div class="tools-grid">
            <button class="btn sm evb-extract">${t("btnUnpackEvb")}</button>
          </div>
        </div></div></details><details class="settings-advanced"><summary>Connection, diagnostics, and history</summary><div class="settings-grid"><div class="cg">
          <h4>${t("cfgDiagnostics")}</h4>
          <div class="cg-body">
            <div class="ci"><label>${t("cfgTest")}</label><button id="testTr" class="btn sm">${t("cfgTest")}</button></div>
            <div class="ci"><label>${t("cfgTestRes")}</label><span id="testTrRes" style="font-size:10px;color:var(--txt3)">-</span></div>
            <div class="ci" style="border-top:1px dashed var(--bd);padding-top:8px;margin-top:4px">
              <label>Self-test</label>
              <button id="btnSelfTest" class="btn sm pri">Executar Self-Test 🛡️</button>
            </div>
            <div class="ci">
              <label>System diagnostic bundle</label>
              <button id="btnExportDiag" class="btn sm">Export diagnostics 📋</button>
            </div>
            <div class="ci">
              <label>Evidence matrix</label>
              <button id="btnEvidenceMatrix" class="btn sm">View evidence 📊</button>
            </div>
          </div>
        </div><div class="cg" id="provider-health-card" style="border:1px solid var(--bd); background:rgba(15,15,25,0.4)">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-bottom:1px solid var(--bd)">
            <h4 style="margin:0; font-size:11px">🛡️ Provider Health & Circuit Breaker</h4>
            <button id="btnRefreshProviderHealth" class="btn xs" style="font-size:9px">Refresh</button>
          </div>
          <div class="cg-body" style="padding:8px 10px; display:flex; flex-direction:column; gap:6px">
            <div id="provider-health-notice" style="display:none; padding:6px 8px; border-radius:4px; font-size:10px; font-weight:600"></div>
            <div id="provider-health-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:6px">
              <!-- Renderizado via refreshProviderHealth -->
            </div>
          </div>
        </div><div class="cg">
          <h4>${t("cfgCache")}</h4>
          <div class="cg-body">
            <div class="ci">
              <label>${t("cfgClearHistory")}</label>
              <button id="clearGlobalCache" class="btn sm" style="background:#e03131;color:#fff;border-color:#c92a2a">${t("btnClearHistory")}</button>
            </div>
          </div>
        </div></div></details></div>

      <!-- CHEATS -->
      <!-- CHEATS -->
      <div id="tb-ch" class="tb" style="flex-direction:column;gap:12px;padding:12px;overflow-y:auto;height:100%">
        <div id="cheat-no-game" style="text-align:center;padding:40px;color:var(--txt3)">
          ${t("cheatNoGameConnected")}
        </div>
        <div id="cheat-panel" style="display:none;flex-direction:column;gap:12px">
          <!-- Subtabs Navigation -->
          <div style="display:flex;gap:6px;border-bottom:1px solid var(--bd);padding-bottom:6px">
            <button id="cheatSubTabGeral" class="btn sm active" style="flex:1">${t("cheatGeral")}</button>
            <button id="cheatSubTabGrupo" class="btn sm" style="flex:1">${t("cheatGrupo")}</button>
            <button id="cheatSubTabInv" class="btn sm" style="flex:1">${t("cheatInv")}</button>
          </div>
          
           <!-- Tab 1: Geral / Batalha -->
           <div id="cheat-sec-geral" style="display:flex;flex-direction:column;gap:12px">
             <!-- Live Telemetry Panel -->
             <div class="cg" style="margin-bottom:0">
               <h4 style="display:flex;justify-content:space-between;align-items:center">
                 <span>${t("cheatTelemetryTitle") || "Telemetria ao Vivo"}</span>
                 <span id="cheat-telemetry-status" style="font-size:9px;color:var(--txt3)">${t("cheatTelemetryWaiting") || "Waiting for connection…"}</span>
               </h4>
               <div class="cg-body" style="display:flex;flex-wrap:wrap;gap:10px;padding:8px 12px">
                 <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:90px">
                   <label style="font-size:9px;color:var(--txt2)">HP</label>
                   <div style="font-size:13px;font-weight:700;color:var(--red);font-family:var(--fontGame)"><span id="tele-hp-cur">—</span> / <span id="tele-hp-max">—</span></div>
                 </div>
                 <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:90px">
                   <label style="font-size:9px;color:var(--txt2)">MP</label>
                   <div style="font-size:13px;font-weight:700;color:var(--accent2);font-family:var(--fontGame)"><span id="tele-mp-cur">—</span> / <span id="tele-mp-max">—</span></div>
                 </div>
                 <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:90px">
                   <label style="font-size:9px;color:var(--txt2)">Gold</label>
                   <div style="font-size:13px;font-weight:700;color:var(--green);font-family:var(--fontGame)"><span id="tele-gold">—</span></div>
                 </div>
                 <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:90px">
                   <label style="font-size:9px;color:var(--txt2)">Loc.</label>
                   <div style="font-size:11px;color:var(--txt);font-family:var(--fontGame);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span id="tele-map">—</span></div>
                 </div>
               </div>
             </div>

             <div id="cheat-rpg-general" class="cg" style="margin-bottom:0">
               <h4>${t("cheatGeneralMods")}</h4>
              <div class="cg-body" style="display:flex;flex-direction:column;gap:8px">
                <div class="ci" style="display:flex;justify-content:space-between;align-items:center">
                  <label>${t("cheatGold")}</label>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input id="cheatGoldVal" type="number" style="width:100px;padding:3px 6px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px" value="0">
                    <button id="cheatGoldBtn" class="btn sm">${t("cheatSetBtn")}</button>
                  </div>
                </div>
                <div class="ci" style="display:flex;justify-content:space-between;align-items:center">
                  <label>${t("cheatNoClip")}</label>
                  <input id="cheatThrough" type="checkbox">
                </div>
                <div class="ci" style="display:flex;justify-content:space-between;align-items:center">
                  <label>${t("cheatDisableEncounters")}</label>
                  <input id="cheatNoEncounter" type="checkbox">
                </div>
              </div>
            </div>
            
            <div id="cheat-rpg-battle" class="cg" style="margin-bottom:0">
              <h4>${t("cheatBattleGodMode")}</h4>
              <div class="cg-body" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px">
                <button id="cheatGodHP" class="btn sm">${t("cheatInfiniteHPLabel")} [OFF]</button>
                <button id="cheatGodMP" class="btn sm">${t("cheatInfiniteMPLabel")} [OFF]</button>
                <button id="cheatInstaWin" class="btn sm pri">${t("cheatInstaWin")}</button>
                <button id="cheatInstaKill" class="btn sm dgr">${t("cheatInstaKill")}</button>
              </div>
            </div>
            
            <div id="cheat-rpg-tools" class="cg" style="margin-bottom:0">
              <h4>${t("cheatTools")}</h4>
              <div class="cg-body" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px">
                <button id="cheatOpenDevTools" class="btn sm">${t("cheatDevTools")}</button>
              </div>
            </div>

            <div class="cg" style="margin-bottom:0">
              <h4>⚡ Velocidade &amp; Atalhos</h4>
              <div class="cg-body" style="display:flex;flex-direction:column;gap:8px;padding:8px 12px">
                <div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                  <label style="flex:1;min-width:140px">Acelerar jogo (segure a tecla)</label>
                  <div style="display:flex;gap:4px;align-items:center">
                    <select id="cheatSpeedKey" style="width:110px;padding:3px 6px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></select>
                    <input id="cheatSpeedMult" type="number" min="1" max="10" value="3" title="Multiplicador de velocidade" style="width:52px;padding:3px 6px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px">
                  </div>
                </div>
                <div id="cheatHotkeyRows" style="display:flex;flex-direction:column;gap:6px"></div>
                <div style="display:flex;justify-content:flex-end">
                  <button id="cheatApplyHotkeys" class="btn sm pri">Aplicar Atalhos</button>
                </div>
              </div>
            </div>

            <!-- Live Memory Scanner (renpy.store / Universal) -->
            
            <!-- AppData Save Manager Card (Ren'Py / Universal) -->
            <div class="cg" id="renpy-appdata-card" style="margin-bottom:0; background:rgba(15,15,25,0.4); border:1px solid var(--bd)">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--bd)">
                <h4 style="margin:0; font-size:11px; display:flex; align-items:center; gap:6px">
                  <span>📂</span> <span>${t("cheatSaveManager")}</span>
                </h4>
                <div style="display:flex; gap:6px">
                  <button id="cheatOpenAppDataBtn" class="btn sm" style="background:var(--accent); color:#fff; font-size:10px">${t("cheatOpenSaveFolder")}</button>
                  <button id="cheatRefreshAppDataBtn" class="btn sm" style="font-size:10px">${t("cheatRefresh")}</button>
                </div>
              </div>
              <div class="cg-body" style="padding:10px 12px; display:flex; flex-direction:column; gap:8px">
                <div style="font-size:10px; color:var(--txt2); word-break:break-all">
                  <strong>${t("cheatResolvedPath")}</strong> <span id="renpy-appdata-full-path" style="color:var(--txt)">${t("cheatAwaitingGame")}</span>
                </div>
                <div style="font-size:10px; color:var(--txt2)">
                  <strong>${t("cheatResolutionMethod")}</strong> <span id="renpy-appdata-method" style="color:var(--accent2)">-</span>
                </div>
                <div>
                  <div style="font-size:10px; font-weight:600; color:var(--txt2); margin-bottom:4px">${t("cheatDetectedSaves")}</div>
                  <div id="renpy-appdata-file-list" style="display:flex; flex-wrap:wrap; gap:4px; max-height:120px; overflow-y:auto; padding:4px; background:var(--bg2); border:1px solid var(--bd); border-radius:4px">
                    <span style="font-size:10px; color:var(--txt3)">${t("cheatNoSavesYet")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="cg" id="renpy-live-scanner" style="margin-bottom:0">
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0 6px">
                <h4>Live Memory Scanner (renpy.store)</h4>
                <button id="cheatRenpyScanBtn" class="btn sm pri">Scan Variables</button>
              </div>
              
              <div style="padding: 6px;">
                <input id="cheatRenpySearch" type="text" placeholder="Filter variables (e.g., points, love, money)..." style="width:100%; padding:4px; font-size:10px; background:var(--bg); color:var(--txt); border:1px solid var(--bd); border-radius:3px">
              </div>

              <div class="cg-body" id="renpy-var-list" style="display:flex; flex-direction:column; gap:4px; padding:8px 12px; max-height:400px; overflow-y:auto">
                <div style="text-align: center; color: var(--txt3); font-size: 10px;">
                  Click "Scan Variables" to read renpy.store
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tab 2: Membros / HP -->
          <div id="cheat-sec-grupo" style="display:none;flex-direction:column;gap:12px">
            <div class="cg" style="margin-bottom:0">
              <h4>${t("cheatGroupHP")}</h4>
              <div class="cg-body" id="cheat-actors-list" style="display:flex;flex-direction:column;gap:8px;padding:8px 12px">
                <!-- Renderizado dinamicamente -->
              </div>
            </div>
          </div>
          
          <!-- Tab 3: Inventário -->
          <div id="cheat-sec-inv" style="display:none;flex-direction:column;gap:12px">
            <!-- Add Item Section -->
            <div class="cg" style="margin-bottom:0">
              <h4>${t("cheatAddInvItem")}</h4>
              <div class="cg-body" style="display:flex;flex-direction:column;gap:8px;padding:8px 12px">
                <div class="ci" style="display:flex;flex-direction:column;gap:4px;align-items:stretch">
                  <label style="font-size:9px;color:var(--txt3)">${t("cheatSelectItem")}</label>
                  <select id="cheatInvItemSelect" style="width:100%;padding:4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px">
                    <option value="">${t("cheatWaitingGameData")}</option>
                  </select>
                </div>
                <div class="ci" style="display:flex;justify-content:space-between;align-items:center">
                  <label>${t("cheatQty")}</label>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input id="cheatInvItemQty" type="number" style="width:60px;padding:3px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px" value="1" min="1">
                    <button id="cheatInvItemAddBtn" class="btn sm pri">${t("cheatAddBtn")}</button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Inventory List -->
            <div class="cg" style="margin-bottom:0">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0 6px">
                <h4>${t("cheatInvItems")}</h4>
                <input id="cheatInvSearch" type="text" placeholder="${t("cheatFilter")}" style="width:100px;padding:2px 6px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px">
              </div>
              <div class="cg-body" id="cheat-inventory-list" style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;max-height:300px;overflow-y:auto">
                <!-- Renderizado dinamicamente -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LOG -->
      <div id="tb-lg" class="tb">
        <div class="lg-header">
          <span style="font-size:10px;color:var(--txt3)">~ $</span><span style="font-size:10px;color:var(--txt2)">tail -f openT.log</span>
          <span style="flex:1"></span>
          <button id="cpyL" class="btn sm" title="${t("btnCopy")}">${t("btnCopy")}</button>
          <button id="clrL" class="btn sm">${t("btnClear")}</button>
        </div>
        <div id="lb"></div>
      </div>

      <div id="tb-pf" class="tb">
        <header class="page-heading"><div><h1>Compatibility</h1><p>Check engine capabilities, known issues, and remaining work.</p></div><button id="btnRefreshMatrix" class="btn">Refresh</button></header>
        <div class="compat-summary" id="compat-summary">Loading information…</div>
        <label class="search-label" for="compat-search">Search by engine, version, or issue</label>
        <input id="compat-search" type="search" placeholder="Example: Unity, fonts, Python 2, cheats…">
        <div id="pf-matrix-rows" class="compat-grid" aria-live="polite"></div>
        <details class="diagnostic-details"><summary>Translation speed test</summary><p>Sends test requests to the provider. Speed depends on your connection and service limits.</p><button id="btnRunBenchmark" class="btn">Measure speed now</button><div id="pf-bench-details"></div><table><tbody id="pf-bench-rows"></tbody></table></details>
      </div>
    </div>
  </div>
  <div id="statusbar">
    <span id="sbInfo">${t("uiTitle")}</span>
    <span id="sbCenter"></span>
    <span id="sbRight"><span id="sbGames">0</span> ${t("statusGames")}</span>
  </div>
</div>
<div id="modal"></div>`;

    await loadCfg();
  }
  await build();

  // ==================== DRAG & DROP ====================
  const dropZone = $("drop-zone");
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () =>
      dropZone.classList.remove("dragover"),
    );
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      let exePath = "",
        fileSize = 0,
        fileMtime = 0;
      for (const f of e.dataTransfer.files) {
        exePath = f.path || f.name;
        fileSize = f.size || 0;
        fileMtime = f.lastModified || 0;
        break;
      }
      const validExts = [".exe", ".lnk", ".bat", ".cmd", ".html", ".json"];
      if (!exePath.includes("\\") && !exePath.includes("/")) {
        try {
          const uri = e.dataTransfer.getData("text/uri-list");
          if (uri) {
            const m = uri.match(/^file:\/\/\/(.+)/m);
            if (m) exePath = decodeURIComponent(m[1]);
          }
        } catch (er) { console.warn(`app.js: ${er.message}`); }
      }
      if (!exePath.includes("\\") && !exePath.includes("/")) {
        try {
          const txt = e.dataTransfer.getData("text/plain");
          if (txt && validExts.some((ext) => txt.toLowerCase().includes(ext)))
            exePath = txt.trim();
        } catch (er) { console.warn(`app.js: ${er.message}`); }
      }
      const exeLower = exePath.toLowerCase();
      if (validExts.some((ext) => exeLower.endsWith(ext)))
        addGameFromExe(exePath, fileSize, fileMtime);
    });
    dropZone.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".exe,.lnk,.bat,.cmd,.html,.json";
      inp.onchange = () => {
        if (inp.files[0]) {
          const f = inp.files[0];
          addGameFromExe(f.path || f.name, f.size || 0, f.lastModified || 0);
        }
      };
      inp.click();
    });
  }

  async function addGameFromExe(exePath, fileSize, fileMtime) {
    let isFullPath = exePath.includes("\\") || exePath.includes("/");
    if (!isFullPath) {
      try {
        const found = await rpc("findGame", {
          name: exePath,
          size: fileSize || 0,
          mtime: fileMtime || 0,
        });
        if (found && found.exePath) {
          exePath = found.exePath;
          isFullPath = true;
        }
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
    if (isFullPath && exePath.toLowerCase().endsWith(".lnk")) {
      try {
        const resolved = await rpc("resolveShortcut", {
          shortcutPath: exePath,
        });
        if (resolved && resolved !== exePath) {
          exePath = resolved;
        }
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
    const ext = "." + exePath.split(".").pop();
    let name = basename(exePath, ext);
    if (
      name.toLowerCase() === "game" ||
      name.toLowerCase() === "nw" ||
      name.toLowerCase() === "index" ||
      name.toLowerCase() === "launch"
    ) {
      const parts = exePath.replace(/[/\\]/g, "/").split("/");
      if (parts.length >= 2) {
        name = parts[parts.length - 2];
      }
    }
    const key = "g_" + Date.now();
    const eng = await detectEngine(exePath);
    await saveGame(key, {
      constArgs: { gameExe: exePath, engine: eng },
      libConf: { title: name, libConfKey: key, added: Date.now(), tags: [] },
    });
    renderGames();
    updSB();
    if (!isFullPath) {
      log("warn", "Could not find game path - click Edit to type it");
      setTimeout(() => openEdit(key), 100);
    } else {
      log("success", "Added: " + name + " (" + eng + ")");
    }
  }

  let currentTab = "gl";
  // ==================== NAVIGATION ====================
  qs("#sd")?.addEventListener("click", function (e) {
    const b = e.target.closest("button");
    if (!b) return;
    qsa("#sd .on").forEach((x) => x.classList.remove("on"));
    qsa(".tb.on").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    const tb = $("tb-" + b.dataset.t);
    if (tb) tb.classList.add("on");
    currentTab = b.dataset.t;
    if (b.dataset.t === "gl") renderGames();
    if (b.dataset.t === "sv") renderSaves();
    if (b.dataset.t === "pf") renderPerformance();
  });

  function updSB() {
    const g = $("sbGames");
    if (g) g.textContent = S.gameKeys.length || "0";
  }

  // ==================== GAME MODAL ====================
  function customConfirm(msg) {
    return new Promise((resolve) => {
      const m = $("modal");
      if (!m) {
        resolve(window.confirm(msg));
        return;
      }
      m.innerHTML = `
<div id="modal-inner" style="max-width:320px;text-align:center">
  <div class="mh" style="border:none;margin:0;font-size:12px;text-align:center">${esc(msg)}</div>
  <div class="fb" style="justify-content:center;border:none;padding:0;margin-top:16px">
    <button id="confirmYes" class="btn active" style="min-width:70px">${t("yes")}</button>
    <button id="confirmNo" class="btn" style="min-width:70px">${t("no")}</button>
  </div>
</div>`;
      m.classList.add("on");
      const onYes = () => {
        m.classList.remove("on");
        cleanup();
        resolve(true);
      };
      const onNo = () => {
        m.classList.remove("on");
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        $("confirmYes")?.removeEventListener("click", onYes);
        $("confirmNo")?.removeEventListener("click", onNo);
      };
      $("confirmYes")?.addEventListener("click", onYes);
      $("confirmNo")?.addEventListener("click", onNo);
    });
  }

  // ==================== GAMES ====================
  function renderGames() {
    const g = $("gl-list");
    if (!g) return;
    const cnt = S.gameKeys.length;
    if (!cnt) {
      g.innerHTML =
        '<div style="padding:30px;text-align:center;color:#555;font-size:12px">' +
        t("dropOrBrowse") +
        "</div>";
      return;
    }
    let html = "";
    for (const k of [...S.gameKeys].sort((a, b) => S.cfg.librarySort === "recent"
      ? (S.games[b]?.libConf?.lastLaunch || S.games[b]?.libConf?.added || 0) - (S.games[a]?.libConf?.lastLaunch || S.games[a]?.libConf?.added || 0)
      : (S.games[a]?.libConf?.title || a).localeCompare(S.games[b]?.libConf?.title || b, "en", { numeric: true, sensitivity: "base" }))) {
      const d = S.games[k];
      if (!d) {
        html +=
          '<div class="gc" style="color:var(--txt3);font-size:10px">Invalid: ' +
          esc(k) +
          "</div>";
        continue;
      }
      const lc = d.libConf || {};
      const ca = d.constArgs || {};
      const exe = ca.gameExe || "";
      const eng = ca.engine || "unknown";
      const ei = engineInfo(eng);
      const engLabel = ei.label || eng;
      const engIcon = ei.icon || "";
      const engStatus = engineSupportLabel(eng);
      const launched = S.launchedKey === k;
      const playBtn = launched
        ? '<span style="color:var(--green);font-size:10px;padding:0 6px">\u25b6 Running</span>'
        : "<button class=\"btn xs glPlay\" title=\"Launch game\">▶ Play</button>";
      const title = lc.title || (exe ? basename(exe) : "") || k;
      html +=
        '<div class="gc' +
        (launched ? " launched" : "") +
'" data-key="' +
        attr(k) +
        '"><div class="gi"><div class="gt">' +
        esc(title) +
        '</div><div class="gs">' +
        esc(engIcon) +
        " " +
        esc(engLabel) +
        ` <span class="${attr(engStatus.cls)}" title="${attr(engStatus.text)}" style="font-size:9px;padding:1px 4px;border-radius:3px">${engStatus.s === "partial" ? "Partial" : engStatus.s === "planned" ? "Pending" : "?"}</span>` +
        '</div>' + (S.cfg.showGamePaths ? '<div class="game-path">' + esc(exe) + '</div>' : '') + '</div><div class="ga">' +
        playBtn +
        "<button class=\"btn xs glEdit\" title=\"Edit game\">Edit</button><button class=\"btn xs dgr glDel\" title=\"Remove from library\">Remove</button></div></div>";
    }
    g.innerHTML = html;
    // Filter by search
    const sq = ($("glSearch")?.value || "").toLowerCase();
    if (sq) {
      qsa(".gc").forEach((c) => {
        const t = (c.querySelector(".gt")?.textContent || "").toLowerCase();
        c.style.display = t.includes(sq) ? "" : "none";
      });
    }
    const glList = $("gl-list");
    if (glList && !glList.dataset.bound) {
      glList.dataset.bound = "true";
      glList.addEventListener("click", async function (e) {
        const playBtn = e.target.closest(".glPlay");
        if (playBtn) {
          e.stopPropagation();
          const c = playBtn.closest(".gc");
          if (c && c.dataset.key) launchGame(c.dataset.key);
          return;
        }
        const editBtn = e.target.closest(".glEdit");
        if (editBtn) {
          e.stopPropagation();
          const c = editBtn.closest(".gc");
          if (c && c.dataset.key) openEdit(c.dataset.key);
          return;
        }
        const delBtn = e.target.closest(".glDel");
        if (delBtn) {
          e.stopPropagation();
          const c = delBtn.closest(".gc");
          if (c && c.dataset.key && (await customConfirm(t("deleteConfirm")))) {
            await delGame(c.dataset.key);
            renderGames();
          }
          return;
        }
      });
    }
    updSB();
  }

  function openEdit(key) {
    const g = S.games[key];
    const lc = g?.libConf || {};
    const ca = g?.constArgs || {};
    const tags = (lc.tags || []).join(", ");
    const m = $("modal");
    if (!m) return;
    const exePath = ca.gameExe || "";
    const curEng = ca.engine || "unknown";
    const ei = engineInfo(curEng);
    const lastLaunch = lc.lastLaunch
      ? new Date(lc.lastLaunch).toLocaleString()
      : "-";
    const firstLaunch = lc.added ? new Date(lc.added).toLocaleString() : "-";
    m.innerHTML = `
<div id="modal-inner">
  <div class="mh">${key ? t("editGame") : t("addGame")}</div>
  <div class="mg">
    <div class="mc2">
      <div class="f"><label>${t("origName")}</label>
        <div style="display:flex;gap:3px">
          <input id="mTitle" value="${esc(lc.title || "")}" style="flex:1">
          <button id="mTitleTrBtn" class="btn sm" title="Translate Title">🌐 Trad</button>
        </div>
      </div>
      <div class="f"><label>${t("transName")}</label><input id="mTitleTr" value="${esc(lc.titleTr || "")}"></div>
      <div class="f"><label>${t("designatedName")}</label><input id="mTitleDs" value="${esc(lc.titleDs || "")}"></div>
      <div class="f"><label>${t("gamePath")}</label>
        <div style="display:flex;gap:3px">
          <input id="mExe" value="${esc(exePath)}" placeholder="C:\\Games\\Game\\Game.exe" style="flex:1">

        </div>
      </div>
    </div>
    <div class="mc2">
      <div class="f"><label>${t("tags")}</label><input id="mTags" value="${esc(tags)}" placeholder="Separated by comma"></div>
      <div class="f"><label>${t("note")}</label><textarea id="mNote" rows="2" style="resize:vertical;padding:3px 5px;background:var(--bg2);border:1px solid var(--bd);color:var(--txt);border-radius:3px;font-size:10px;font-family:var(--font)">${esc(lc.note || "")}</textarea></div>
      <div class="fi"><label>${t("engineLabel")}:</label><span class="fv">${esc(ei.icon || "")} ${esc(ei.label || curEng)} ${ei.js ? "(JS)" : (curEng === "python" || curEng === "renpy" ? "(Requires testing per game)" : "(Nativo)")}</span></div>
      ${(curEng === "python" || curEng === "renpy") ? `
      <div style="background:rgba(108,92,231,0.12);padding:8px 10px;border-radius:6px;border:1px solid rgba(108,92,231,0.3);margin:5px 0">
        <div style="font-weight:700;color:var(--accent2);display:flex;align-items:center;gap:6px">🎭 Ren'Py Visual Novel Engine <span style="background:rgba(0,184,148,0.2);color:var(--green2);padding:2px 6px;border-radius:4px;font-size:10px">Requires testing per game</span></div>
        <div style="font-size:11px;color:var(--txt);margin-top:3px">
          <div>Engine support: <b>8.x (Python 3) — check compatibility for this game</b></div>
          <div style="color:var(--txt2);font-size:10px;margin-top:2px">Not verified: ⚠️ 6.x / ⚠️ 7.x (Python 2) — testing required</div>
          <div style="margin-top:2px">Method: <b>Official translation layer (additive)</b></div>
        </div>
      </div>` : ''}
      <div class="fi"><label>${t("lastLaunch")}:</label><span class="fv">${esc(lastLaunch)}</span></div>
      <div class="fi"><label>${t("firstLaunch")}:</label><span class="fv">${esc(firstLaunch)}</span></div>
      <div class="fi"><label>${t("keyLabel")}:</label><span class="fv" style="font-size:9px;color:var(--txt3)">${esc(key || "-")}</span></div>
    </div>
  </div>
  <div class="fb" style="display:flex;flex-wrap:wrap;justify-content:space-between;width:100%;gap:10px">
    <details class="game-tools"><summary>Advanced translation and recovery tools</summary><div>
      <button id="mPreTranslate" class="btn sm pri">${t("mPreTranslate") || "Translate Files 🌐"}</button>
      <button id="mTestRenpyCompat" class="btn sm" style="background:#e84393;color:#fff" title="Test sample extraction and validation for Ren'Py">Test Ren'Py compatibility 🎭</button>
      <button id="mDryRun" class="btn sm" style="background:#2b8a3e;color:#fff" title="Preview extraction without running the apply stage; extractors may create staging files">Preview extraction (Dry run) 🧪</button>
      <button id="mDiagGame" class="btn sm" title="Engine, confidence, and capability diagnostics">Diagnostics 🔍</button>
      <button id="mRollbackGame" class="btn sm" title="Restore original files from the available backup and verify SHA-256 hashes">Restore original (Rollback) 🛡️</button>
      <button id="mUntranslatedGame" class="btn sm" style="background:#0984e3;color:#fff" title="Find untranslated texts and pending work by script/language">Untranslated texts 🔎</button>
      <button id="mTranslateJob" class="btn sm pri" style="background:var(--accent);color:#fff" title="Start a translation job with checkpoints on disk">Translate (Job) 🛠️</button>
      <button id="mResumeJob" class="btn sm" style="background:var(--accent2);color:#fff" title="List saved jobs and resume an interrupted job">Resume job ♻️</button>
      <button id="mVisualQAGame" class="btn sm" style="background:#6c5ce7;color:#fff" title="Run the available automated visual QA checks">Visual QA 👁️</button>
      <button id="mRuntimeTextsGame" class="btn sm" style="background:#e17055;color:#fff" title="Manage captured runtime texts and promote them to translation memory">Runtime texts ⚡</button>
      <button id="mRuntimeStart" class="btn sm" style="background:#00b894;color:#fff" title="Start a runtime session with isolated staging to capture texts during play">Start runtime session ▶</button>
      <button id="mRuntimeStop" class="btn sm dgr" style="display:none" title="End the active runtime session and confirm with the server">End session ⏹</button>
      <button id="mRuntimeProbe" class="btn sm" style="background:#636e72;color:#fff" title="Check whether the session process is still running">Check process 🔌</button>
      <button id="mRuntimeShot" class="btn sm" style="background:#636e72;color:#fff" title="Capture the session process window">Capture screen 📷</button>
      <button id="mRuntimeTriad" class="btn sm" style="background:#636e72;color:#fff" title="Inspect the engine, runtime, hook, and staging selected for this game">Runtime details 🧭</button>
      <span id="rtSessaoBadge" style="font-size:10px;color:var(--txt3);align-self:center">No active session</span>
      <span id="rtSessaoInfo" style="font-size:9px;color:var(--txt3);align-self:center"></span>
      <button id="mGlossaryGame" class="btn sm" style="background:#00b894;color:#fff" title="View the hierarchical glossary (Project -> Plugin -> Game -> Engine -> Global)">Hierarchical glossary 📚</button>
      <button id="mDecryptImages" class="btn sm">${t("extractImages") || "Extract Images 📷"}</button>
      <button id="mDecryptAudio" class="btn sm">${t("extractAudio") || "Extract Audio 🎵"}</button>
      <button id="mPatchFonts" class="btn sm">${t("patchFonts") || "Patch Fonts PT-BR 🔤"}</button>
      <button id="mUnpackAll" class="btn sm" style="background:var(--accent);color:#fff" title="Unpack supported archives, media, and scripts into an output folder">Unpack all 📦</button>
      <button id="mDelCache" class="btn sm dgr">${t("deleteCache") || "Delete Cache"}</button>
      <button id="mExportCache" class="btn sm">${t("exportTexts") || "Export Texts"}</button>
    </div></details>
    <div style="display:flex;gap:4px">
      <button id="mCancel" class="btn">${t("btnCancel") || "Cancel"}</button><button id="mSave" class="btn pri">${t("btnSave") || "Save"}</button>
    </div>
  </div>
</div>`;
    m.classList.add("on");
    m.dataset.key = key || "";

    if (!key) {
      const tools = m.querySelector(".game-tools");
      if (tools) tools.hidden = true;
      const engineLabel = m.querySelector(".fi .fv");
      if (engineLabel) engineLabel.textContent = "Identified when the game path is saved";
    }
    $("mDryRun")?.addEventListener("click", async () => {
      const btn = $("mDryRun");
      btn.disabled = true;
      btn.textContent = "Simulando... ⏳";
      log("info", "Starting extraction preview (Dry run)...");
      try {
        const res = await rpc("dryRunGame", { gameKey: key });
        if (res && res.success) {
          const excluded = res.extractionReview?.excluded || 0;
          const review = excluded ? `\nTechnical or empty entries excluded: ${excluded}` : '';
          const msg = `Preview complete!\n\nEngine: ${res.engine} (${res.engineVersion || 'Nativa'})\nConfidence: ${Math.round((res.confidence || 0) * 100)}%\nExtracted strings: ${res.totalStrings}${review}\nArquivos modificados: ${res.filesModified} (100% SEGURO)\nTokens protegidos: ${res.protectedTokensCount || 0}`;
          alert(msg);
          log("success", `Dry Run: ${res.totalStrings} strings detected; the apply stage was not run.`);
        } else {
          alert("Preview failed: " + (res?.error || "Unknown error"));
        }
      } catch (e) {
        alert("Dry-run error: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Preview extraction (Dry run) 🧪";
      }
    });

    $("mTestRenpyCompat")?.addEventListener("click", async () => {
      const btn = $("mTestRenpyCompat");
      btn.disabled = true;
      btn.textContent = "Testando... ⏳";
      log("info", "Starting Ren'Py compatibility test...");
      try {
        const res = await rpc("testRenpyCompatibility", { gameKey: key, exePath });
        if (res && res.ok && res.report) {
          const r = res.report;
          const sampleLines = (r.sampleTexts || []).slice(0, 3).map(s => `• [${s.type}] ${s.original}`).join('\n');
          const m = r.metrics || {};
          const cov = m.TRANSLATION_COVERAGE || {};
          const msg = `REN'PY COMPATIBILITY REPORT:\n\n` +
            `=== ENGINE SUPPORT ===\n` +
            `• Engine: ${r.engine} (${r.version})\n` +
            `• Engine Status: ${r.engine_status || r.status}\n` +
            `• Verified versions: ${(r.verified_versions || ['8.x (Python 3)']).join(', ')}\n` +
            `• Unverified versions: ${(r.unverified_versions || ['6.x', '7.x']).join(', ')}\n` +
            `• Method: ${r.method}\n` +
            `• Detection confidence: ${r.confidence}\n\n` +
            `=== GAME TRANSLATION COVERAGE ===\n` +
            `• Textos Detectados: ${cov.textos_detectados || r.textsFound || 0}\n` +
            `• Translatable texts: ${cov.textos_traduziveis || r.textsFound || 0}\n` +
            `• Translated texts (sample): ${cov.textos_traduzidos || (r.sampleTexts ? r.sampleTexts.length : 0)}\n` +
            `• Cobertura Atual: ${cov.cobertura_pct || '0.0%'}\n` +
            `• Tokens Protegidos: ${r.protectedTokens || 0}\n` +
            `• Original files unchanged: ${r.validation && r.validation.originalFilesUntouched ? "YES (for this test)" : "NO"}\n\n` +
            `Amostras de textos:\n${sampleLines}`;
          alert(msg);
          log("success", `Ren'Py test completed: ${r.textsFound} texts found with status ${r.status}`);
        } else {
          alert("Ren'Py test failed: " + (res?.error || "Unknown error"));
        }
      } catch (e) {
        alert("Error testing Ren'Py compatibility: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Test Ren'Py compatibility 🎭";
      }
    });

    $("mDiagGame")?.addEventListener("click", async () => {
      const btn = $("mDiagGame");
      btn.disabled = true;
      try {
        const res = await rpc("analyzeGame", { gameKey: key });
        if (res && res.ok) {
          const cap = Object.entries(res.capabilities || {}).filter(([k, v]) => v).map(([k]) => k).join(", ");
          const msg = `Engine diagnostics:\n\nEngine: ${res.engine} (${res.engineVersion || 'N/A'})\nArchitecture: ${res.architecture || 'Unknown'}\nConfidence: ${res.confidence}%\nRecommended strategy: ${res.recommendedStrategy}\nCapabilities: ${cap || 'None'}\nEvidence: ${(res.evidence || []).join('; ')}`;
          alert(msg);
          log("info", `Diagnostics: engine ${res.engine}, strategy: ${res.recommendedStrategy}`);
        } else {
          alert("Diagnostics failed: " + (res?.error || "Error"));
        }
      } catch (e) {
        alert("Diagnostic error: " + e.message);
      } finally {
        btn.disabled = false;
      }
    });

    $("mRollbackGame")?.addEventListener("click", async () => {
      if (!confirm("Restore the original files from the available backup? Check the backup and close the game before continuing.")) return;
      const btn = $("mRollbackGame");
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = "Restoring... ⏳";
      try {
        const res = await rpc("rollbackGame", { gameKey: key });
        if (res && (res.success || res.ok !== false)) {
          const count = res.restoredCount || res.restored || 0;
          alert(`Original files restored (${count} files processed).`);
          log("success", `Rollback completed (${count} files).`);
        } else {
          alert("Aviso: " + (res?.error || res?.message || "No pending backup to restore."));
        }
      } catch (e) {
        alert("Could not restore original files: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });

    $("mUntranslatedGame")?.addEventListener("click", async () => {
      const btn = $("mUntranslatedGame");
      btn.disabled = true;
      btn.textContent = "Analisando... ⏳";
      log("info", "Looking for untranslated texts...");
      try {
        const res = await rpc("detectUntranslated", { gameKey: key });
        if (res && res.ok) {
          const s = res.summary || {};
          const msg = `UNTRANSLATED TEXT REPORT\n\n` +
            `Total found: ${s.TOTAL || 0}\n` +
            `Translated: ${s.TRANSLATED || 0}\n` +
            `Untranslated: ${s.UNTRANSLATED || 0}\n` +
            `Protegidos (Tokens/Tags): ${s.PROTECTED || 0}\n` +
            `Technical strings (code/IDs): ${s.TECHNICAL || 0}\n` +
            `Runtime-Only: ${s.RUNTIME_ONLY || 0}\n` +
            `Desconhecidos: ${s.UNKNOWN || 0}\n\n` +
            `Pending languages detected:\n` +
            Object.entries(res.languageStats || {}).map(([l, c]) => `• ${l}: ${c}`).join('\n') +
            (res.remaining && res.remaining.length > 0 ? `\n\nFirst pending texts:\n` + res.remaining.slice(0, 5).map(r => `• [${r.detectedLanguage || 'Desconhecido'}] "${r.original}"`).join('\n') : '');
          alert(msg);
          log("info", `Detection completed: ${s.UNTRANSLATED || 0} untranslated, ${s.PROTECTED || 0} protegidos.`);
        } else {
          alert("Analysis failed: " + (res?.error || "Unknown error"));
        }
      } catch (e) {
        alert("Detection error: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Untranslated texts 🔎";
      }
    });

    $("mVisualQAGame")?.addEventListener("click", async () => {
      const btn = $("mVisualQAGame");
      btn.disabled = true;
      btn.textContent = "Executando QA... ⏳";
      log("info", "Starting automated visual QA checks...");
      try {
        const res = await rpc("runVisualQA", { gameKey: key });
        if (res && res.ok) {
          const r = res.report || {};
          const msg = `AUTOMATED VISUAL QA REPORT\n\n` +
            `OVERALL STATUS: ${r.summary?.status || 'PASS'}\n` +
            `Telas Pretas Detectadas: ${r.summary?.blackScreens || 0}\n` +
            `Text Overflow (Cortes): ${r.summary?.overflowCount || 0}\n` +
            `Empty buttons: ${r.summary?.emptyButtons || 0}\n` +
            `Console/crash errors: ${r.summary?.errorsCount || 0}\n\n` +
            `CENAS AVALIADAS:\n` +
            (r.scenes || []).map(sc => `• ${sc.scene}: ${sc.status}`).join('\n');
          alert(msg);
          log("success", `Visual QA completed: status ${r.summary?.status || 'PASS'}`);
        } else {
          alert("QA failed: " + (res?.error || "Unknown error"));
        }
      } catch (e) {
        alert("Visual QA error: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Visual QA 👁️";
      }
    });

    $("mRuntimeTextsGame")?.addEventListener("click", async () => {
      const btn = $("mRuntimeTextsGame");
      btn.disabled = true;
      btn.textContent = "Consultando... ⏳";
      try {
        const res = await rpc("getRuntimeTexts");
        if (res && res.ok) {
          const texts = res.texts || [];
          if (texts.length === 0) {
            alert("No runtime text captured yet.\n\nTexts appear here when a game runs with a working hook.");
          } else {
            const list = texts.slice(0, 10).map((t, idx) => `${idx + 1}. [${t.engine || 'MZ'}] "${t.original}" -> ${t.translation ? '"' + t.translation + '"' : "(Pending)"}`).join('\n');
            const doPromote = confirm(`Total de Textos em Runtime: ${texts.length}\n\nExemplos Recentes:\n${list}\n\nPromote valid texts to permanent translation memory?`);
            if (doPromote) {
              let promoted = 0;
              for (const t of texts) {
                if (t.translation) {
                  await rpc("promoteRuntimeText", { hashOrId: t.hash || t.id, translation: t.translation });
                  promoted++;
                }
              }
              alert(`${promoted} texts promoted to permanent memory.`);
              log("success", `Promovidos ${promoted} runtime texts to memory.`);
            }
          }
        } else {
          alert("Could not get runtime texts: " + (res?.error || "Error"));
        }
      } catch (e) {
        alert("Runtime query error: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Runtime texts ⚡";
      }
    });

    // ======================================================================
    // FASE 8 / PASSO 34 — CICLO DE VIDA DE SESSÃO RUNTIME
    //
    // O servidor tinha o subsistema inteiro — `runtimeStartSession`,
    // `runtimeStopSession`, `runtimeProbe`, `runtimeCaptureScreen`,
    // `stagingPrepare`, `stagingCleanup`, `routerRecommend`, `getTriadInfo` —
    // e a UI não chamava NENHUM deles. O painel de runtime lia textos
    // capturados, mas não havia como iniciar a sessão que os captura: o
    // usuário via "Nenhum texto runtime capturado" e não havia caminho para
    // desfazê-lo. Capacidade real, inalcançável.
    //
    // Aqui a sessão é iniciada pelo jogo já selecionado, com o estado real
    // da sessão exposto e honesta: o botão de parada só aparece quando há
    // sessão, e o encerramento só é declarado quando o servidor confirma.
    // ======================================================================
    let runtimeSessaoAtual = null;

    async function atualizarSessaoRuntime() {
      const badge = $("rtSessaoBadge");
      const btnStop = $("mRuntimeStop");
      const info = $("rtSessaoInfo");
      if (!runtimeSessaoAtual) {
        if (badge) {
          badge.textContent = "No active session";
          badge.style.color = "var(--txt3)";
        }
        if (btnStop) btnStop.style.display = "none";
        if (info) info.textContent = "";
        return;
      }
      if (badge) {
        badge.textContent = `Session ${runtimeSessaoAtual.sessionId}`;
        badge.style.color = "var(--green2)";
      }
      if (btnStop) btnStop.style.display = "";
      if (info) {
        info.textContent = `PID ${runtimeSessaoAtual.pid || '—'}`
          + ` | strategy=${runtimeSessaoAtual.strategy || 'auto'}`
          + ` | staging=${runtimeSessaoAtual.stagingDir ? "ready" : "no"}`;
      }
    }

    $("mRuntimeStart")?.addEventListener("click", async () => {
      const btn = $("mRuntimeStart");
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = "Starting session... ⏳";
      log("info", `Starting runtime session for ${key}...`);
      try {
        // O roteador recomenda a estratégia; o log mostra a recomendação e a
        // sessão é iniciada com ela, em vez de deixar o servidor decidir
        // sozinho sem o usuário saber.
        let recomendado = null;
        try {
          const rec = await rpc("routerRecommend", { engine: curEng, gameId: key });
          if (rec && rec.ok && rec.recommendation) recomendado = rec.recommendation;
        } catch (e) {
          log("debug", `routerRecommend unavailable: ${e.message}`);
        }

        const res = await rpc("runtimeStartSession", {
          gameId: key,
          gameDir: exePath ? (exePath.replace(/[\\/][^\\/]+$/, "") || exePath) : undefined,
          engine: curEng,
          stagingDir: undefined,
        });

        if (res && res.ok && res.sessionId) {
          runtimeSessaoAtual = {
            sessionId: res.sessionId,
            pid: res.pid,
            strategy: (recomendado && (recomendado.strategy || recomendado.recommended))
              || undefined,
            stagingDir: null,
          };
          log("success", `Runtime session ${res.sessionId} iniciada (PID ${res.pid}).`);
          showToast(`Runtime session started (PID ${res.pid || '?'}).`, "success");

          // Staging: cópia isolada para que o jogo original não seja tocado.
          try {
            const st = await rpc("stagingPrepare", { gameDir: exePath.replace(/[\\/][^\\/]+$/, ""), sessionId: res.sessionId });
            if (st && st.ok && st.res && st.res.success && st.res.stagingDir) {
              runtimeSessaoAtual.stagingDir = st.res.stagingDir;
              log("success", `Staging ready at ${st.res.stagingDir}.`);
            } else {
              log("warn", `Staging was not prepared: ${st?.res?.error || st?.error || 'sem retorno'}`);
            }
          } catch (e) {
            log("warn", "Staging failed: " + e.message);
          }

          await atualizarSessaoRuntime();
        } else {
          // FASE 8 — sem sessionId não há sessão. Dizer isso é obrigatório:
          // o botão voltaria ao normal e o usuário acharia que o jogo abriu.
          const motivo = res?.error || res?.reason || "resposta sem sessionId";
          log("error", "Runtime session NOT started: " + motivo);
          showToast("Runtime session not started: " + motivo, "error");
        }
      } catch (e) {
        log("error", "Could not start runtime session: " + e.message);
        showToast("Could not start runtime session: " + e.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });

    $("mRuntimeStop")?.addEventListener("click", async () => {
      if (!runtimeSessaoAtual) {
        showToast("No active session to end.", "info");
        return;
      }
      const btn = $("mRuntimeStop");
      btn.disabled = true;
      const alvo = runtimeSessaoAtual;
      try {
        const res = await rpc("runtimeStopSession", {
          sessionId: alvo.sessionId,
          reason: "Encerrado pela UI",
        });
        // FASE 8 — só chamamos de encerrado quando o servidor confirma.
        if (res && res.ok && res.res && res.res.success) {
          log("success", `Session ${alvo.sessionId} encerrada.`);
          showToast("Runtime session ended.", "success");
          runtimeSessaoAtual = null;

        // ----------------------------------------------------------------
        // FASE 10 / D3 — O STAGING TEM ROTINA DE LIMPEZA
        // ----------------------------------------------------------------
        //
        // A FASE 8 ligou `stagingPrepare` e deixou `stagingCleanup` sem
        // consumidor. Cada sessao de runtime copia o jogo INTEIRO para um
        // staging isolado, e sem cleanup essa copia acumula: o usuario inicia
        // sessao, fecha o jogo, e o disco enche de copias do jogo inteiro das
        // sessoes passadas.
        //
        // A limpeza e tentada DEPOIS do encerramento confirmado, nunca no
        // `else`: se a sessao nao foi encerrada, o staging pode estar em uso
        // e apaga-lo derrubaria a captura em andamento.
        //
        // E falha de cleanup nao pode virar erro de encerramento: a sessao JA
        // foi encerrada com sucesso pelo servidor. E aviso, nao falha.
        const stagingDir = alvo.stagingDir;
        if (stagingDir) {
          try {
            const st = await rpc("stagingCleanup", {
              gameDir: alvo.gameDir || exePath.replace(/[\\/][^\\/]+$/, ""),
              stagingDir,
              sessionId: alvo.sessionId,
            });
            if (st && st.ok && st.res && st.res.success) {
              log("success", `Staging removido: ${stagingDir}`);
            } else {
              const m = st?.res?.error || st?.error || "sem confirmacao";
              log("warn", `Staging NAO removido (${stagingDir}): ${m}`);
              log("warn", "The isolated game copy remains on disk. It "
                + "can be removed after the game has been closed.");
            }
          } catch (stgErr) {
            log("warn", `Could not clean up staging: ${stgErr.message}`);
          }
        }
        } else {
          const motivo = res?.res?.error || res?.error || "not confirmed";
          log("error", `Shutdown NOT confirmed: ${motivo}`);
          showToast("Shutdown not confirmed: " + motivo, "error");
        }
      } catch (e) {
        log("error", "Could not end session: " + e.message);
        showToast("Could not end session: " + e.message, "error");
      } finally {
        btn.disabled = false;
        await atualizarSessaoRuntime();
      }
    });

    $("mRuntimeProbe")?.addEventListener("click", async () => {
      if (!runtimeSessaoAtual) {
        showToast("Start a session before checking its process.", "info");
        return;
      }
      try {
        const res = await rpc("runtimeProbe", { pid: runtimeSessaoAtual.pid });
        if (res && res.ok) {
          const p = res.probe || {};
          log("info", `Probe PID ${runtimeSessaoAtual.pid}: vivo=${p.alive} `
            + `name=${p.name || '—'} threads=${p.threads ?? '—'}`);
          showToast(`Processo vivo=${p.alive ? 'sim' : "no"}.`, p.alive ? "info" : "warn");
          if (!p.alive) {
            // O processo morreu sozinho: a sessão deixou de existir.
            log("warn", "The session process is no longer running; clearing local state.");
            runtimeSessaoAtual = null;
    // Estado inicial da sessão: sem sessão ativa, botão de parar oculto.
    atualizarSessaoRuntime();
          }
        } else {
          showToast("Process check failed: " + (res?.error || "error"), "error");
        }
      } catch (e) {
        showToast("Process check failed: " + e.message, "error");
      }
    });

    $("mRuntimeShot")?.addEventListener("click", async () => {
      if (!runtimeSessaoAtual || !runtimeSessaoAtual.pid) {
        showToast("No active process to capture.", "info");
        return;
      }
      try {
        const res = await rpc("runtimeCaptureScreen", { pid: runtimeSessaoAtual.pid });
        if (res && res.ok && res.capture && res.capture.success) {
          const c = res.capture;
          log("success", `Capture saved: ${c.outputPath || c.path || 'arquivo'}`);
          showToast("Captura de tela salva.", "success");
        } else {
          const motivo = res?.capture?.error || res?.error || "capture not confirmed";
          log("warn", "Capture failed: " + motivo);
          showToast("Capture failed: " + motivo, "error");
        }
      } catch (e) {
        showToast("Capture failed: " + e.message, "error");
      }
    });

    $("mRuntimeTriad")?.addEventListener("click", async () => {
      try {
        const res = await rpc("getTriadInfo", { gameKey: key });
        if (!res) {
          showToast("Runtime details returned no information.", "warn");
          return;
        }
        const linhas = [
          `engine=${res.engine || '—'}`,
          `runtime=${res.runtime || res.strategy || '—'}`,
          `hook=${res.hookPath ? "available" : 'ausente'}`,
          `staging=${res.stagingDir || '—'}`,
        ];
        log("info", "Triade: " + linhas.join(' | '));
        showToast(linhas.join("\n"), "info");
      } catch (e) {
        showToast("Could not read runtime details: " + e.message, "error");
      }
    });

    // Estado inicial da sessão: sem sessão ativa, botão de parar oculto.
    atualizarSessaoRuntime();

    // ======================================================================
    // FASE 8 / PASSO 35 — JOB DE TRADUÇÃO COM CHECKPOINT
    //
    // O servidor tinha `startTranslationJob`, `getJobStatus`,
    // `listTranslationJobs` e `resumeTranslationJob`, com checkpoint em
    // disco — e a UI não chamava nenhum deles. Um job interrompido no meio
    // (servidor caiu, usuário fechou o app) deixava traduções já feitas sem
    // forma de retomá-las: havia retrabalho, mas não perda.
    //
    // Aqui o job é iniciado pelo jogo selecionado e acompanhado por
    // polling. O progresso só é declarado concluído quando o servidor
    // responde `completed`; qualquer outro estado final é reportado como o
    // que é.
    // ======================================================================
    let jobPollTimer = null;

    async function pollJob(jobId, btn) {
      clearInterval(jobPollTimer);
      return new Promise((resolve) => {
        let tentativas = 0;
        const MAX = 3600; // 1h de polling a 1s
        jobPollTimer = setInterval(async () => {
          tentativas++;
          if (tentativas > MAX) {
            clearInterval(jobPollTimer);
            resolve({ status: 'timeout', jobId });
            return;
          }
          try {
            const res = await rpc("getJobStatus", { jobId });
            const job = res && res.ok ? res.job : null;
            if (!job) {
              if (tentativas > 3) {
                clearInterval(jobPollTimer);
                resolve({ status: 'notfound', jobId });
              }
              return;
            }
            const pct = job.total ? Math.round(((job.current || 0) / job.total) * 100) : 0;
            if (btn) {
              btn.textContent = `${job.stage || 'processando'} ${pct}%`;
            }
            if (job.status === 'completed') {
              clearInterval(jobPollTimer);
              resolve({ status: 'completed', job });
            } else if (job.status === 'failed') {
              clearInterval(jobPollTimer);
              resolve({ status: 'failed', job });
            }
          } catch (e) {
            // Falha de polling não é o job falhando: só para de acompanhar.
            if (tentativas > 5) {
              clearInterval(jobPollTimer);
              resolve({ status: 'pollError', jobId, error: e.message });
            }
          }
        }, 1000);
      });
    }

    $("mTranslateJob")?.addEventListener("click", async () => {
      const btn = $("mTranslateJob");
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Starting job... ⏳";
      log("info", `Starting translation job for ${key}...`);
      try {
        const res = await rpc("startTranslationJob", { gameKey: key });
        // FASE 8 — `ok:true` sem `jobId` não é um job iniciado.
        if (res && res.ok && res.jobId) {
          log("success", `Job ${res.jobId} created; tracking progress.`);
          const fim = await pollJob(res.jobId, btn);

          if (fim.status === 'completed') {
            const j = fim.job;
            log("success", `Job completed: ${j.current ?? '?'} de ${j.total ?? '?'}.`);
            showToast(`Job completed (${j.current ?? '?'}/${j.total ?? '?'}). `
              + "Check the translation certificate for the actual status.", "success");
          } else if (fim.status === 'failed') {
            const motivo = fim.job?.error || fim.job?.state || "no error details";
            log("error", `Job failed: ${motivo}`);
            showToast("Job failed: " + motivo, "error");
          } else if (fim.status === 'timeout') {
            log("warn", `Job ${res.jobId} continua rodando; parei de acompanhar. `
              + 'Use "Resume job" to inspect the saved state.');
            showToast("Tracking timed out. The job remains saved on disk.", "warn");
          } else if (fim.status === 'notfound') {
            log("warn", `Job ${res.jobId} was not found by the server.`);
            showToast("The server could not find the job.", "error");
          } else {
            log("warn", `Acompanhamento interrompido: ${fim.error || fim.status}`);
            showToast("Acompanhamento interrompido: " + (fim.error || fim.status), "warn");
          }
        } else {
          const motivo = res?.error || "resposta sem jobId";
          log("error", "Job NOT started: " + motivo);
          showToast("Job not started: " + motivo, "error");
        }
      } catch (e) {
        log("error", "Could not start job: " + e.message);
        showToast("Could not start job: " + e.message, "error");
      } finally {
        clearInterval(jobPollTimer);
        btn.disabled = false;
        btn.textContent = label;
      }
    });

    $("mResumeJob")?.addEventListener("click", async () => {
      try {
        const res = await rpc("listTranslationJobs");
        const jobs = res && res.ok && Array.isArray(res.jobs) ? res.jobs : [];
        if (jobs.length === 0) {
          showToast("No saved jobs found.", "info");
          return;
        }
        const linhas = jobs.slice(0, 20).map((j, i) => {
          const quando = j.createdAt ? new Date(j.createdAt).toLocaleString() : '?';
          return `${i + 1}. ${j.id || j.jobId} — ${j.state || j.status || '?'} `
            + `(${j.current ?? 0}/${j.total ?? 0}) — ${quando}`;
        });
        const escolha = prompt(
          `Saved jobs (${jobs.length}):\n\n${linhas.join('\n')}\n\n`
          + "Enter the NUMBER of the job to resume (or cancel):",
          '1',
        );
        if (escolha === null) return;
        const idx = parseInt(escolha, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= jobs.length) {
          showToast("Invalid number.", "error");
          return;
        }
        const alvo = jobs[idx];
        const jobId = alvo.id || alvo.jobId;
        const rr = await rpc("resumeTranslationJob", { jobId });
        // FASE 8 — retomar precisa devolver o job; sem isso, nada retomou.
        if (rr && rr.ok && rr.job) {
          log("success", `Job ${jobId} resumed.`);
          showToast(`Job ${jobId} resumed.`, "success");
        } else {
          const motivo = rr?.error || "resposta sem job";
          log("error", `Job ${jobId} NOT resumed: ${motivo}`);
          showToast("Job not resumed: " + motivo, "error");
        }
      } catch (e) {
        showToast("Could not list jobs: " + e.message, "error");
      }
    });

    $("mGlossaryGame")?.addEventListener("click", async () => {
      const btn = $("mGlossaryGame");
      btn.disabled = true;
      try {
        const res = await rpc("getHierarchicalGlossary", { gameKey: key });
        if (res && res.ok) {
          const terms = res.terms || [];
          const msg = `HIERARCHICAL GLOSSARY (PROJECT -> PLUGIN -> GAME -> ENGINE -> GLOBAL)\n\n` +
            `Total de Termos Ativos: ${terms.length}\n\n` +
            terms.slice(0, 15).map(tm => `• [${tm.scope.toUpperCase()}] "${tm.source}" ➔ "${tm.target}"`).join('\n') +
            (terms.length > 15 ? `\n... e mais ${terms.length - 15} termos.` : '');
          alert(msg);
        } else {
          alert("Could not load glossary: " + (res?.error || "Error"));
        }
      } catch (e) {
        alert("Glossary error: " + e.message);
      } finally {
        btn.disabled = false;
      }
    });

    $("mPreTranslate")?.addEventListener("click", async () => {
      const btn = $("mPreTranslate");
      const origText = btn.textContent;

      const progressOverlay = document.createElement("div");
      progressOverlay.id = "translateProgressOverlay";
      progressOverlay.style = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(10, 10, 15, 0.9); z-index: 10000;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 16px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        color: var(--txt); font-family: var(--font);
      `;
      progressOverlay.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; letter-spacing: 0.5px; color: var(--accent);">Pre-translating game files...</div>
        <div style="width: 320px; text-align: center;">
          <progress id="translateProgress" max="100" value="0" style="
            width: 100%; height: 8px; border-radius: 4px; overflow: hidden;
            border: none; background: var(--bg5);
          "></progress>
          <style>
            #translateProgress::-webkit-progress-bar { background: var(--bg5); border-radius: 4px; }
            #translateProgress::-webkit-progress-value { background: linear-gradient(90deg, var(--accent), var(--green)); border-radius: 4px; box-shadow: 0 0 8px var(--accent); }
          </style>
          <div id="translateProgressMsg" style="font-size: 11px; color: var(--txt2); margin-top: 8px;">Starting extractor...</div>
        </div>
      `;
      document.body.appendChild(progressOverlay);

      btn.disabled = true;
      try {
        const rPromise = rpc("translateRpgMaker", {
          gameKey: key,
          overlay: true,
        });

        let active = true;
        const progressPoll = setInterval(async () => {
          if (!active) return;
          try {
            const logs = await rpc("getLogs", { afterId: lastLogId });
            if (logs && logs.length > 0) {
              logs.forEach((l) => {
                if (l.id > lastLogId) lastLogId = l.id;

                const msg = l.message;
                const msgDiv = $("translateProgressMsg");
                if (msgDiv) msgDiv.textContent = msg;

                const match = msg.match(/Progresso:\s*(\d+)\/(\d+)/);
                if (match) {
                  const current = parseInt(match[1], 10);
                  const total = parseInt(match[2], 10);
                  const percent = (current / total) * 100;
                  const prg = $("translateProgress");
                  if (prg) prg.value = percent;
                } else {
                  const pMatch = msg.match(/Progresso:\s*(\d+(?:\.\d+)?)%/);
                  if (pMatch) {
                    const percent = parseFloat(pMatch[1]);
                    const prg = $("translateProgress");
                    if (prg) prg.value = percent;
                  }
                }
              });
            }
          } catch (e) { console.warn(`app.js: ${e.message}`); }
        }, 500);

        const r = await rPromise;
        active = false;
        clearInterval(progressPoll);
        if (document.body.contains(progressOverlay)) {
          document.body.removeChild(progressOverlay);
        }

        if (r && r.ok !== false) {
          log("success", "File translation completed.");
          alert("Game data files translated.");
        } else {
          log(
            "error",
            "Translation failed: " + (r.error || "unknown error"),
          );
          alert("Translation failed: " + (r.error || "unknown error"));
        }
      } catch (e) {
        if (document.body.contains(progressOverlay)) {
          document.body.removeChild(progressOverlay);
        }
        log("error", "Translation error: " + e.message);
        alert("Translation error: " + e.message);
      } finally {
        btn.disabled = false;
      }
    });



    $("mUnpackAll")?.addEventListener("click", async () => {
      const userChoice = prompt(
        "Enter the output folder for unpacking game files:\n(Example: C:\\Games\\Unpacked)",
        "C:\\Users\\Public\\Documents\\Descompactado"
      );
      if (!userChoice || !userChoice.trim()) return;
      const folderPath = userChoice.trim();

      const btn = $("mUnpackAll");
      const origText = btn ? btn.textContent : "Unpack all 📦";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Descompactando... ⏳";
      }

      log("info", "📦 Starting unpack operation at: " + folderPath);
      try {
        const res = await rpc("unpackAll", { key, targetDir: folderPath });
        if (res && res.ok !== false) {
          const sourcesMsg = res.sources && res.sources.length ? `\n\nFontes detectadas:\n• ${res.sources.join("\n• ")}` : "";
          const diag = [
            `Engine: ${res.engine || "detectada"}`,
            `Files found: ${res.found ?? (res.count || 0)}`,
            `Newly extracted: ${res.extracted ?? (res.count || 0)}`,
            `Identical duplicates: ${res.duplicates ?? 0}`,
            `Collisions handled: ${res.collisions ?? 0}`,
            `Files written to disk: ${res.physicalWritten ?? (res.extracted || 0)}`,
            `Ignorados: ${res.ignored ?? 0}`,
            `Erros: ${res.errors ?? 0}`
          ].join("\n") + sourcesMsg + `\n\nOrigem:\n${res.originDir || ""}\n\nDestino:\n${folderPath}`;

          log(
            "success",
            `Unpack operation completed (${res.extracted ?? (res.count || 0)} novos, ${res.duplicates ?? 0} duplicados para ${folderPath}) [Engine: ${res.engine}]`,
          );
          alert(`Unpack operation complete!\n\n${diag}`);
        } else {
          log("error", "Unpacking failed: " + (res?.error || "Unknown error"));
          alert("Unpacking failed: " + (res?.error || "Unknown error"));
        }
      } catch (err) {
        log("error", "Unpack error: " + err.message);
        alert("Unpack error: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = origText;
        }
      }
    });

    $("mDelCache")?.addEventListener("click", async () => {
      if (
        await customConfirm(
          "Delete this game's translation cache? It will need to be translated again on the next launch.",
        )
      ) {
        const r = await rpc("deleteGameCache", { gameKey: key });
        if (r && r.ok !== false) {
          log("success", "Translation cache deleted.");
        } else {
          log(
            "error",
            "Could not delete cache: " + (r.error || "unknown error"),
          );
        }
      }
    });
    $("mExportCache")?.addEventListener("click", async () => {
      const r = await rpc("exportGameTexts", { gameKey: key });
      if (r && r.ok !== false) {
        log(
          "success",
          "Translations exported to the Desktop: " + r.path,
        );
      } else {
        log(
          "error",
          "Export failed: " + (r.error || "sem cache para exportar"),
        );
      }
    });
    $("mDecryptImages")?.addEventListener("click", async () => {
      const destDir = prompt(
        "Digite o caminho completo da pasta para onde deseja exportar as imagens:\n(Exemplo: C:\\MeusJogos\\Imagens)",
      );
      if (!destDir) return;
      const btn = $("mDecryptImages");
      const origText = btn.textContent;
      btn.textContent = "Extraindo... ⏳";
      btn.disabled = true;
      try {
        const r = await rpc("decryptImages", {
          gameKey: key,
          destDir,
          type: "img",
        });
        if (r && r.ok !== false) {
          const sourcesMsg = r.sources && r.sources.length ? `\n\nFontes detectadas:\n• ${r.sources.join("\n• ")}` : "";
          const diag = [
            `Engine: ${r.engine || "detectada"}`,
            `Files found: ${r.found ?? (r.count || 0)}`,
            `Newly extracted: ${r.extracted ?? (r.count || 0)}`,
            `Identical duplicates: ${r.duplicates ?? 0}`,
            `Collisions handled: ${r.collisions ?? 0}`,
            `Files written to disk: ${r.physicalWritten ?? (r.extracted || 0)}`,
            `Ignorados: ${r.ignored ?? 0}`,
            `Erros: ${r.errors ?? 0}`
          ].join("\n") + sourcesMsg + `\n\nOrigem:\n${r.originDir || ""}\n\nDestino:\n${destDir}`;
          log(
            "success",
            `Images extracted (${r.extracted ?? (r.count || 0)} novos, ${r.duplicates ?? 0} duplicados para ${destDir}) [Engine: ${r.engine}]`,
          );
          alert(
            `Image extraction complete!\n\n${diag}`,
          );
        } else {
          log(
            "error",
            "Image extraction failed: " + (r.error || "unknown error"),
          );
          alert("Image extraction error: " + (r.error || "unknown error"));
        }
      } catch (e) {
        log("error", "Image extraction error: " + e.message);
        alert("Image extraction error: " + e.message);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    });

    $("mDecryptAudio")?.addEventListener("click", async () => {
      const destDir = prompt(
        "Enter the output folder for audio files:\n(Example: C:\\Games\\Audio)",
      );
      if (!destDir) return;
      const btn = $("mDecryptAudio");
      const origText = btn.textContent;
      btn.textContent = "Extraindo... ⏳";
      btn.disabled = true;
      try {
        const r = await rpc("decryptImages", {
          gameKey: key,
          destDir,
          type: "audio",
        });
        if (r && r.ok !== false) {
          const sourcesMsg = r.sources && r.sources.length ? `\n\nFontes detectadas:\n• ${r.sources.join("\n• ")}` : "";
          const diag = [
            `Engine: ${r.engine || "detectada"}`,
            `Files found: ${r.found ?? (r.count || 0)}`,
            `Newly extracted: ${r.extracted ?? (r.count || 0)}`,
            `Identical duplicates: ${r.duplicates ?? 0}`,
            `Collisions handled: ${r.collisions ?? 0}`,
            `Files written to disk: ${r.physicalWritten ?? (r.extracted || 0)}`,
            `Ignorados: ${r.ignored ?? 0}`,
            `Erros: ${r.errors ?? 0}`
          ].join("\n") + sourcesMsg + `\n\nOrigem:\n${r.originDir || ""}\n\nDestino:\n${destDir}`;
          log(
            "success",
            `Audio exported (${r.extracted ?? (r.count || 0)} novos, ${r.duplicates ?? 0} duplicados para ${destDir}) [Engine: ${r.engine}]`,
          );
          alert(
            `Audio extraction complete!\n\n${diag}`,
          );
        } else {
          log(
            "error",
            "Audio extraction failed: " + (r.error || "unknown error"),
          );
          alert("Audio extraction error: " + (r.error || "unknown error"));
        }
      } catch (e) {
        log("error", "Audio extraction error: " + e.message);
        alert("Audio extraction error: " + e.message);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    });

    $("mPatchFonts")?.addEventListener("click", async () => {
      if (
        await customConfirm(
          "Apply the Portuguese font patch? This copies a font with accented Latin characters (ç, á, é, ã) and configures the game to use it.",
        )
      ) {
        const btn = $("mPatchFonts");
        const origText = btn.textContent;
        btn.textContent = "Aplicando... ⏳";
        btn.disabled = true;
        try {
          const r = await rpc("patchGameFont", { gameKey: key });
          if (r && r.ok !== false) {
            log("success", "Font patch applied.");
            alert(
              "The Portuguese font patch was applied.",
            );
          } else {
            log(
              "error",
              "Could not apply font patch: " +
                (r.error || "unknown error"),
            );
            alert(
              "Could not apply patch: " + (r.error || "unknown error"),
            );
          }
        } catch (e) {
          log("error", "Font patch error: " + e.message);
          alert("Font patch error: " + e.message);
        } finally {
          btn.textContent = origText;
          btn.disabled = false;
        }
      }
    });
    $("mCancel").addEventListener("click", () => m.classList.remove("on"));
    $("mSave").addEventListener("click", async () => {
      let k = m.dataset.key;
      const exeVal = $("mExe").value.trim();
      if (!exeVal) { showToast("Informe o caminho completo do jogo.", "error"); $("mExe").focus(); return; }
      if (!k) {
        try {
          const added = await rpc("addGameByPath", { exePath: exeVal, title: $("mTitle").value });
          if (!added?.ok) { showToast(added?.error || "Could not add the game.", "error"); return; }
          k = added.key;
        } catch (error) { showToast(error.message || "Could not add the game.", "error"); return; }
      }
      const meng = await detectEngine(exeVal);
      const tagArr = $("mTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const now = Date.now();
      await saveGame(k, {
        constArgs: { gameExe: $("mExe").value, engine: meng },
        libConf: {
          title: $("mTitle").value || basename($("mExe").value || "Game"),
          titleTr: $("mTitleTr").value || "",
          titleDs: $("mTitleDs").value || "",
          note: $("mNote").value || "",
          tags: tagArr,
          libConfKey: k,
          added: lc.added || now,
          lastLaunch: lc.lastLaunch || 0,
        },
      });
      m.classList.remove("on");
      renderGames();
    });
    $("mTitleTrBtn")?.addEventListener("click", async () => {
      const title = $("mTitle")?.value;
      if (!title) return;
      const btn = $("mTitleTrBtn");
      const orig = btn.textContent;
      btn.textContent = "...";
      btn.disabled = true;
      try {
        const sl = S.cfg.sl || "ja",
          tl = S.cfg.tl || "pt";
        const eng = S.cfg.engine || "google";
        const engFn = ENG[eng] || ENG.google;
        const r = await engFn(title, sl, tl);
        if (r !== title) {
          const tr = $("mTitleTr");
          if (tr) tr.value = r;
          log(
            "success",
            "Translated title: \"" +
              title.substring(0, 20) +
              '" -> "' +
              r.substring(0, 20) +
              '"',
          );
        } else
          log(
            "warn",
            "The title was unchanged (translation may not be needed)",
          );
      } catch (e) {
        log("error", "Could not translate title: " + e.message);
      }
      btn.textContent = orig;
      btn.disabled = false;
    });
  }

  // ==================== SAVES ====================
  async function findSaveDir(gameKey) {
    const saves = await rpc("listSaves", { gameKey });
    return saves.length > 0 ? true : null;
  }
  async function renderSaves() {
    const l = $("sv-list");
    if (!l) return;
    const gameSaves = {};
    for (const k of S.gameKeys) {
      try {
        const saves = await rpc("listSaves", { gameKey: k });
        if (saves.length > 0) gameSaves[k] = saves;
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
    const keys = Object.keys(gameSaves);
    if (!keys.length) {
      l.innerHTML = '<div class="empty">' + t("noSavesYet") + "</div>";
      return;
    }
    l.innerHTML = keys
      .map((k) => {
        const d = S.games[k];
        const lc = d.libConf || {};
        const files = gameSaves[k] || [];
        const title = lc.title || k;
        return (
          '<div class="sg"><div class="sg-h" data-key="' +
          esc(k) +
          '"><span class="sg-ico">\ud83d\udcc2</span>' +
          esc(title) +
          ' <span style="color:var(--txt3);font-size:9px">(' +
          files.length +
          ')</span></div><div class="sg-b on">' +
          (files.length
            ? files
                .map((f) => {
                  const sz =
                    f.size < 1024
                      ? f.size + "B"
                      : (f.size / 1024).toFixed(1) + "KB";
                  const dt =
                    new Date(f.mtime).toLocaleDateString() +
                    " " +
                    new Date(f.mtime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  return (
                    '<div class="sf"><span class="sfn" title="' +
                    esc(f.name) +
                    '">' +
                    esc(f.name) +
                    '</span><span class="sfs">' +
                    sz +
                    " &middot; " +
                    dt +
                    '</span><span class="sfa"><button class="btn xs svOpen" data-key="' +
                    esc(k) +
                    '" data-file="' +
                    esc(f.name) +
                    '">\ud83d\udcdd</button><button class="btn xs dgr svDel" data-key="' +
                    esc(k) +
                    '" data-file="' +
                    esc(f.name) +
                    '">\u2715</button></span></div>'
                  );
                })
                .join("")
            : '<div class="sf" style="color:var(--txt3);justify-content:center">No save files</div>') +
          "</div></div>"
        );
      })
      .join("");
    qsa(".sg-h").forEach((el) =>
      el.addEventListener("click", function () {
        const b = this.nextElementSibling;
        if (b) b.classList.toggle("on");
      }),
    );
    qsa(".svOpen").forEach((el) =>
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        rpc("openSave", {
          gameKey: this.dataset.key,
          file: this.dataset.file,
        }).catch(() => {});
      }),
    );
    qsa(".svDel").forEach((el) =>
      el.addEventListener("click", async function (e) {
        e.stopPropagation();
        try {
          await rpc("deleteSave", {
            gameKey: this.dataset.key,
            file: this.dataset.file,
          });
          renderSaves();
        } catch (e) { console.warn(`app.js: ${e.message}`); }
      }),
    );
  }
  // Open saves directory in Explorer for selected game
  $("svOpenDir")?.addEventListener("click", async () => {
    for (const k of S.gameKeys) {
      try {
        await rpc("openSaveFolder", { gameKey: k });
        break;
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
  });
  $("svRef")?.addEventListener("click", renderSaves);
  $("glAdd")?.addEventListener("click", () => openEdit(null));
  $("glSearch")?.addEventListener("input", renderGames);
  $("glRefresh")?.addEventListener("click", async () => {
    await loadGames();
    renderGames();
  });

  // ==================== CONFIG ====================
  $("cfgAppLang")?.addEventListener("change", async function () {
    S.cfg.lang = "en";
    window.isReloading = true;
    try {
      await saveCfg();
      location.reload();
    } catch (e) {
      showToast("Could not change language: " + (e.message || e), "error");
    }
  });
  $("cfgSL")?.addEventListener("change", saveCfg);
  $("cfgTL")?.addEventListener("change", saveCfg);
  $("cfgEngine")?.addEventListener("change", function () {
    S.cfg.engine = this.value;
    updateEngineVisibility();
    saveCfg();
  });
  $("cfgLlmProvider")?.addEventListener("change", saveCfg);
    $("btnRefreshProviderHealth")?.addEventListener("click", refreshProviderHealth);
    setInterval(refreshProviderHealth, 15000);
    refreshProviderHealth();
  $("cfgLlmApiKey")?.addEventListener("change", saveCfg);
  $("cfgLlmModel")?.addEventListener("change", saveCfg);
  $("cfgLlmBaseUrl")?.addEventListener("change", saveCfg);
  $("cfgLlmPrompt")?.addEventListener("change", saveCfg);
  $("cfgDeeplApiKey")?.addEventListener("change", saveCfg);
  $("cfgDeeplUseFree")?.addEventListener("change", saveCfg);
  $("cfgWordWrapLimit")?.addEventListener("change", saveCfg);
  for (const id of ["cfgUiFontSize", "cfgLibrarySort", "cfgShowPaths", "cfgReduceMotion"]) {
    $(id)?.addEventListener("change", () => saveCfg().catch(error => {
      if ($("settings-save-status")) $("settings-save-status").textContent = "Could not save";
      showToast(error.message, "error");
    }));
  }
  $("themeAccent")?.addEventListener("change", saveCfg);
  $("themeBgImage")?.addEventListener("change", saveCfg);
  $("themeGlass")?.addEventListener("input", function () {
    if ($("themeGlassVal")) $("themeGlassVal").textContent = this.value + "%";
    if (!S.cfg.theme) S.cfg.theme = {};
    S.cfg.theme.glassOpacity = parseInt(this.value, 10);
    applyTheme();
  });
  $("themeGlass")?.addEventListener("change", saveCfg);

  // ==================== GLOSSARY ====================
  let glossaryEntries = [];

  async function loadGlossary() {
    try {
      glossaryEntries = await rpc("loadGlossary");
    } catch (e) {
      glossaryEntries = [];
    }
    renderGlossary();
  }
  function renderGlossary() {
    const gl = $("glossary-list");
    if (!gl) return;
    if (!glossaryEntries.length) {
      gl.innerHTML =
        '<div style="color:var(--txt3);font-size:10px;padding:4px 0">No glossary terms</div>';
      return;
    }
    gl.innerHTML = glossaryEntries
      .map(
        (e, i) =>
          '<div style="display:flex;gap:4px;align-items:center;padding:2px 0;font-size:10px"><span style="flex:1;color:var(--txt2)">' +
          esc(e.term || "") +
          '</span><span style="color:var(--txt3)">→</span><span style="flex:1;color:var(--txt)">' +
          esc(e.translation || "") +
          '</span><button class="btn xs dgr glossary-rm" data-idx="' +
          i +
          '">✕</button></div>',
      )
      .join("");
    qsa(".glossary-rm").forEach((b) =>
      b.addEventListener("click", function () {
        const idx = parseInt(this.dataset.idx);
        if (!isNaN(idx)) glossaryEntries.splice(idx, 1);
        renderGlossary();
      }),
    );
  }
  $("glossary-add")?.addEventListener("click", function () {
    const term = $("glossary-term")?.value.trim();
    const trans = $("glossary-trans")?.value.trim();
    if (!term || !trans) return;
    glossaryEntries.push({ term, translation: trans });
    $("glossary-term").value = "";
    $("glossary-trans").value = "";
    renderGlossary();
  });
  $("glossary-save")?.addEventListener("click", async function () {
    try {
      await rpc("saveGlossary", { entries: glossaryEntries });
      log("success", t("glossarySaved").replace("{n}", glossaryEntries.length));
    } catch (e) {
      log("error", "Glossary save failed: " + e.message);
    }
  });

  // ==================== TOOLS ====================
  async function getSelectedGameKey() {
    const keys = S.gameKeys;
    if (keys.length === 0) {
      log("warn", "No games in library");
      return null;
    }
    // Se houver jogo lançado, prioriza ele; senão, pega o primeiro da lista
    if (S.launchedKey && keys.includes(S.launchedKey)) return S.launchedKey;
    return keys[0];
  }

  // RPA Extract
  qsa(".rpa-extract").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) return;
      const g = S.games[key];
      if (!g) return;
      const exe = g.constArgs?.gameExe || "";
      const gameDir = exe ? exe.substring(0, exe.lastIndexOf("\\")) : "";
      const rpaPath = prompt("Path to .rpa file:");
      if (!rpaPath) return;
      log("info", "Extracting RPA...");
      try {
        const r = await rpc("extractRpa", { rpaPath });
        if (r.ok === false)
          log("error", "RPA extract failed: " + (r.error || "unknown"));
        else log("success", "RPA extracted successfully");
      } catch (e) {
        log("error", "RPA extract error: " + e.message);
      }
    }),
  );

  // RPA Pack
  qsa(".rpa-pack").forEach((b) =>
    b.addEventListener("click", async () => {
      const inputDir = prompt("Path to directory to pack:");
      if (!inputDir) return;
      log("info", "Packing RPA...");
      try {
        const r = await rpc("packRpa", { inputDir });
        if (r.ok === false)
          log("error", "RPA pack failed: " + (r.error || "unknown"));
        else log("success", "RPA packed successfully");
      } catch (e) {
        log("error", "RPA pack error: " + e.message);
      }
    }),
  );

  // RPYC Decompile
  qsa(".rpyc-decompile").forEach((b) =>
    b.addEventListener("click", async () => {
      const filePath = prompt("Path to .rpyc file:");
      if (!filePath) return;
      log("info", "Decompiling .rpyc...");
      try {
        const r = await rpc("decompileRpyc", { filePath });
        if (r.ok === false)
          log("error", "Decompile failed: " + (r.error || "unknown"));
        else log("success", "Decompiled successfully");
      } catch (e) {
        log("error", "Decompile error: " + e.message);
      }
    }),
  );

  // Unity Install
  qsa(".unity-install").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) return;
      log("info", "Installing XUnity + batch plugin...");
      try {
        const r = await rpc("installUnity", { gameKey: key });
        if (r.ok === false)
          log("error", "Unity install failed: " + (r.error || "unknown"));
        else log("success", "XUnity + UltraBatch plugin installed");
      } catch (e) {
        log("error", "Unity install error: " + e.message);
      }
    }),
  );

  // Wolf Extract
  qsa(".wolf-extract").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) return;
      const g = S.games[key];
      if (!g) return;
      const exe = g.constArgs?.gameExe || "";
      const gamePath = prompt(
        "Path to the game executable (.exe), data folder, or .wolf file:",
        exe,
      );
      if (!gamePath) return;
      log("info", "Extraindo jogo Wolf com UberWolfCli...");
      try {
        const r = await rpc("extractWolf", { gamePath });
        if (r.ok === false)
          log(
            "error",
            "Wolf extraction failed: " + (r.error || "unknown error"),
          );
        else log("success", "Wolf game extracted.");
      } catch (e) {
        log("error", "Wolf extraction error: " + e.message);
      }
    }),
  );

  // Wolf Pack
  qsa(".wolf-pack").forEach((b) =>
    b.addEventListener("click", async () => {
      const inputDir = prompt(
        "Caminho da pasta que deseja empacotar de volta para .wolf:",
      );
      if (!inputDir) return;
      const verStr = prompt(
        "Select the Wolf RPG version index (0 to 10) [Default: 4 for v3.00]:",
        "4",
      );
      if (verStr === null) return;
      const versionIndex = parseInt(verStr, 10);
      log("info", "Empacotando pasta no formato Wolf...");
      try {
        const r = await rpc("packWolf", { inputDir, versionIndex });
        if (r.ok === false)
          log(
            "error",
            "Wolf packing failed: " + (r.error || "unknown error"),
          );
        else log("success", "Folder packed in Wolf format.");
      } catch (e) {
        log("error", "Wolf packing error: " + e.message);
      }
    }),
  );

  // RPG Maker Overlay Install
  qsa(".overlay-install").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) {
        showToast(
          "Por favor, selecione um jogo na lista lateral antes de instalar o Overlay!",
          "error",
        );
        return;
      }
      log("info", "Installing RPG Maker overlay...");
      showToast("Installing translation overlay...", "info");
      try {
        const r = await rpc("installOverlay", { gameKey: key });
        if (r.ok === false) {
          log("error", "Overlay install failed: " + (r.error || "unknown"));
          showToast(
            "Could not install overlay: " + (r.error || "unknown error"),
            "error",
          );
        } else {
          log("success", "RPG Maker overlay installed");
          showToast(
            "RPG Maker overlay installed. 🎮",
            "success",
          );
        }
      } catch (e) {
        log("error", "Overlay install error: " + e.message);
        showToast("Overlay installation error: " + e.message, "error");
      }
    }),
  );

  // Excel Export
  qsa(".excel-export").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) {
        showToast(
          "Por favor, selecione um jogo na lista lateral antes de exportar!",
          "error",
        );
        return;
      }
      log("info", "Creating the translation Excel workbook...");
      showToast("Exporting translation strings to the workbook...", "info");
      try {
        const r = await rpc("exportExcel", { gameKey: key });
        if (r.ok === false) {
          log(
            "error",
            "Excel export failed: " + (r.error || "unknown error"),
          );
          showToast(
            "Excel export failed: " + (r.error || "unknown error"),
            "error",
          );
        } else {
          log("success", "Excel workbook created on your Desktop.");
          showToast(
            "Excel workbook created on your Desktop. 📊",
            "success",
          );
        }
      } catch (e) {
        log("error", "Excel export error: " + e.message);
        showToast("Excel export error: " + e.message, "error");
      }
    }),
  );

  // Excel Import
  qsa(".excel-import").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      if (!key) {
        showToast(
          "Por favor, selecione um jogo na lista lateral antes de importar!",
          "error",
        );
        return;
      }
      const excelPath = prompt(
        "Absolute path to the translation Excel workbook (.xlsx):",
      );
      if (!excelPath) {
        showToast("Import cancelled. No path was entered.", "info");
        return;
      }
      log("info", "Importing translations from Excel...");
      showToast("Importing and merging translations from Excel...", "info");
      try {
        const r = await rpc("importExcel", { gameKey: key, excelPath });
        if (r.ok === false) {
          log(
            "error",
            "Excel import failed: " + (r.error || "unknown error"),
          );
          showToast(
            "Excel import failed: " + (r.error || "unknown error"),
            "error",
          );
        } else {
          log(
            "success",
            `Import completed! ${r.count} translations merged into the cache.`,
          );
          showToast(
            `Sucesso! ${r.count} translations merged back into the cache. 📥`,
            "success",
          );
        }
      } catch (e) {
        log("error", "Excel import error: " + e.message);
        showToast("Excel import error: " + e.message, "error");
      }
    }),
  );

  // EVB Extract
  qsa(".evb-extract").forEach((b) =>
    b.addEventListener("click", async () => {
      const key = await getSelectedGameKey();
      let defaultPath = "";
      if (key) {
        const g = S.games[key];
        if (g && g.constArgs?.gameExe) {
          defaultPath = g.constArgs.gameExe;
        }
      }
      const exePath = prompt(
        "Caminho completo do executavel (.exe) compactado com Enigma Virtual Box:",
        defaultPath,
      );
      if (!exePath) return;
      const destDir = prompt(
        "Output folder for extracted files:",
        exePath.substring(0, exePath.lastIndexOf(".")) + "_extracted",
      );
      if (destDir === null) return;

      log("info", "Extraindo executavel EVB...");
      showToast("Extracting Enigma Virtual Box files...", "info");
      try {
        const r = await rpc("unpackEvb", { exePath, destDir });
        if (r.ok === false) {
          log(
            "error",
            "EVB unpacking failed: " + (r.error || "unknown error"),
          );
          showToast(
            "EVB extraction failed: " + (r.error || "unknown error"),
            "error",
          );
        } else {
          log("success", "EVB executable extracted to: " + r.path);
          showToast("EVB executable extracted. 📦", "success");
        }
      } catch (e) {
        log("error", "EVB extraction error: " + e.message);
        showToast("EVB extraction error: " + e.message, "error");
      }
    }),
  );

  // Test translation button

  // Test translation button
  $("testTr")?.addEventListener("click", async () => {
    const txt = "\u3053\u3093\u306b\u3061\u306f\u4e16\u754c";
    const sl = S.cfg.sl || "ja",
      tl = S.cfg.tl || "pt";
    const eng = S.cfg.engine || "google";
    const el = $("testTrRes");
    if (el) {
      el.textContent = "Translating (" + ENG_NAMES[eng] + ")...";
      el.style.color = "var(--orange)";
    }
    try {
      const engFn = ENG[eng] || ENG.google;
      const r = await engFn(txt, sl, tl);
      const ok = r !== txt && r !== "[Local] " + txt;
      if (el) {
        el.textContent = ok
          ? 'OK: "' + r.substring(0, 40) + '"'
          : "FAILED: returned original";
        el.style.color = ok ? "var(--green)" : "var(--red)";
      }
    } catch (e) {
      if (el) {
        el.textContent = "ERROR: " + e.message;
        el.style.color = "var(--red)";
      }
    }
  });
  $("btnSelfTest")?.addEventListener("click", async () => {
    const btn = $("btnSelfTest");
    btn.disabled = true;
    btn.textContent = "Verificando... ⏳";
    try {
      const res = await rpc("runSelfTest");
      if (res && res.success) {
        const checkDetails = (res.checks || []).map(c => `[${c.status}] ${c.component}: ${c.details || c.version || 'OK'}`).join("\n");
        alert(`OpenTranslator self-test:\n\nResult: ${res.summary}\n\n${checkDetails}`);
        log("success", "Self-Test: " + res.summary);
      } else {
        alert("Self-test failed: " + (res?.error || "Unknown error"));
      }
    } catch (e) {
      alert("Self-test error: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Executar Self-Test 🛡️";
    }
  });

  $("btnExportDiag")?.addEventListener("click", async () => {
    try {
      const bundle = await rpc("exportDiagnosticBundle");
      const jsonStr = JSON.stringify(bundle, null, 2);
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonStr);
          copied = true;
        }
      } catch (clipErr) {
        // Fallback when clipboard permissions are not granted
      }
      if (copied) {
        showToast("Diagnostic bundle copied to clipboard. 📋", "success");
      } else {
        alert("Diagnostic bundle exported.\n" + (bundle.reportPath ? `File saved at: ${bundle.reportPath}` : `${bundle.evidenceCount || 0} evidence records collected.`));
      }
      log("success", "Diagnostic bundle exported.");
    } catch (e) {
      alert("Could not export diagnostics: " + e.message);
    }
  });

  $("btnEvidenceMatrix")?.addEventListener("click", async () => {
    try {
      const res = await rpc("evidenceList");
      if (res && res.matrix) {
        const keys = Object.keys(res.matrix);
        alert(`Evidence matrix:\n\nEngines reviewed: ${keys.length}\n\n${keys.slice(0, 8).map(k => k + ': ' + (res.matrix[k].verified ? '✓ COMPROVADO' : 'AUDITADO')).join('\n')}`);
        log("info", "Evidence matrix displayed.");
      }
    } catch (e) {
      alert("Could not read evidence matrix: " + e.message);
    }
  });

  $("clearGlobalCache")?.addEventListener("click", async () => {
    if (!confirm(t("clearHistoryConfirm"))) return;
    try {
      const res = await rpc("clearGlobalCache");
      if (res && res.ok !== false) {
        alert(t("historyCleared"));
      } else {
        alert("Error: " + (res.error || "Failed to delete history"));
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  });
  // ==================== LOG ====================
  $("clrL")?.addEventListener("click", () => {
    $("lb").innerHTML = "";
  });
  $("cpyL")?.addEventListener("click", () => {
    const txt = $("lb").innerText || $("lb").textContent || "";
    if (!txt) return;
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      log("info", t("logCopied") + " (" + txt.length + " chars)");
    } catch (e) { console.warn(`app.js: ${e.message}`); }
    document.body.removeChild(ta);
  });

  // ==================== KEYBOARD ====================
  document.addEventListener("keydown", function (e) {
    if (e.key === "F5" || e.keyCode === 116 || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")) {
      e.preventDefault();
      console.log("[OpenTranslator UI] Recarregando interface...");
      window.location.href = window.location.pathname;
    }
    if (e.key === "Escape") {
      const m = $("modal");
      if (m) m.classList.remove("on");
    }
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      if ($("lb")) $("lb").innerHTML = "";
    }
  });

  // ==================== INIT ====================
  // Set window size (browser --app mode) - só funciona em chrome --app
  try {
    if (window && typeof window.resizeTo === "function") {
      window.resizeTo(1000, 660);
      window.moveTo(
        Math.round((screen.width - 1000) / 2),
        Math.round((screen.height - 660) / 2),
      );
    }
  } catch (e) {
    /* chrome --app não suporta em todas versões */
  }

  await loadCfg();
  await loadGames();
  if ($("cfgEngine")) $("cfgEngine").value = S.cfg.engine || "google";
  updateEngineVisibility();
  await loadGlossary();
  renderGames();
  renderSaves();
  log("info", "OpenTranslator ready");

  let lastLogId = 0;
  async function pollLogs() {
    try {
      const logs = await rpc("getLogs", { afterId: lastLogId });
      const b = $("lb");
      if (b && logs && logs.length > 0) {
        for (const l of logs) {
          if (l.id > lastLogId) lastLogId = l.id;
          const lvlText = (l.level || "info").toUpperCase();
          const originText = l.origin ? ` [${l.origin}]` : "";
          const singleLineMsg = (l.message || "").replace(/\r?\n/g, " ");
          const e = document.createElement("div");
          e.className = "le l" + (l.level ? String(l.level)[0] : "i");
          // FASE 1 / PASSO 19: l.ts e l.origin vinham do backend sem escape.
          // l.origin pode carregar texto de provider ou do jogo.
          e.innerHTML =
            '<span class="lt">[' +
            esc(l.ts) +
            ']</span> <span class="ll">[' +
            esc(lvlText) +
            ']</span><span class="lo">' +
            esc(originText) +
            '</span> <span class="lm">' +
            esc(singleLineMsg) +
            "</span>";
          b.appendChild(e);
        }
        b.scrollTop = b.scrollHeight;
      }
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }
  setInterval(pollLogs, 500);

  // Poll for game process status every 3 seconds
  setInterval(async () => {
    try {
      const st = await rpc("checkGame");
      if (!st.running && S.launchedKey) {
        const ec = st.exitCode != null ? " code=" + st.exitCode : "";
        log("info", "Game process exited" + ec);
        S.launchedKey = null;
        renderGames();
      }
    } catch (e) {
      // Silently catch temporary poll errors without polluting UI console logs
    }
  }, 3000);

  let godHPActive = false;
  let godMPActive = false;
  let lastGold = 0;
  let currentSubTab = "geral";
  let lastThroughInteraction = 0;
  let lastNoEncounterInteraction = 0;

  const HOTKEY_ACTIONS = [
    { id: "victory", label: "Instant victory" },
    { id: "defeat", label: "Force defeat" },
    { id: "escape", label: "Fuga" },
    { id: "groupHp1", label: "Party HP = 1" },
    { id: "groupHpMax", label: "Party HP = Max" },
    { id: "groupRecover", label: "Heal party" },
    { id: "enemyHp1", label: "Inimigo HP = 1" },
    { id: "enemyHp0", label: "Inimigo HP = 0" },
    { id: "enemyHpMax", label: "Inimigo HP = Max" },
    { id: "skipMsg", label: "Speed up dialogue (hold)" },
  ];
  const KEY_OPTIONS = [
    "", "ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight",
    "Numpad0","Numpad1","Numpad2","Numpad3","Numpad4","Numpad5","Numpad6","Numpad7","Numpad8","Numpad9",
    "KeyQ","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP",
    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
  ];
  function keyLabel(code) { return code || "(Desativado)"; }
  function renderKeySelect(id, val) {
    return KEY_OPTIONS.map(k => `<option value="${k}" ${k===val?"selected":""}>${keyLabel(k)}</option>`).join("");
  }

  function initHotkeyUI() {
    const cfg = S.cfg || {};
    const hk = cfg.cheatHotkeys || {};
    const speedKey = cfg.cheatSpeedKey || "ControlLeft";
    const speedMult = cfg.cheatSpeedMult || 3;
    const sel = $("cheatSpeedKey");
    if (sel) sel.innerHTML = renderKeySelect("cheatSpeedKey", speedKey);
    const mult = $("cheatSpeedMult");
    if (mult) mult.value = speedMult;
    const rows = $("cheatHotkeyRows");
    if (rows) {
      rows.innerHTML = HOTKEY_ACTIONS.map(a =>
        `<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <label style="flex:1;min-width:130px;font-size:10px">${a.label}</label>
          <select id="hk_${a.id}" style="width:110px;padding:3px 6px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px">
            ${renderKeySelect("hk_"+a.id, hk[a.id] || "")}
          </select>
        </div>`
      ).join("");
    }
  }

  async function applyHotkeys() {
    const cfg = S.cfg || {};
    const sel = $("cheatSpeedKey");
    const mult = $("cheatSpeedMult");
    cfg.cheatSpeedKey = sel ? sel.value : "ControlLeft";
    cfg.cheatSpeedMult = mult ? parseInt(mult.value, 10) || 3 : 3;
    cfg.cheatHotkeys = {};
    HOTKEY_ACTIONS.forEach(a => {
      const el = $("hk_" + a.id);
      if (el && el.value) cfg.cheatHotkeys[a.id] = el.value;
    });
    S.cfg = cfg;
    await saveCfg();
    await rpc("sendCheatCommand", { code: `window.__opentSpeedKey = '${cfg.cheatSpeedKey}'; window.__opentSpeedMult = ${cfg.cheatSpeedMult}; window.__opentHotkeys = ${JSON.stringify(cfg.cheatHotkeys)};` });
    log("success", "Atalhos aplicados: Speed=" + cfg.cheatSpeedKey + " x" + cfg.cheatSpeedMult);
  }

  setTimeout(initHotkeyUI, 500);

  function updateSubTabs() {
    const tabGeral = $("cheatSubTabGeral");
    const tabGrupo = $("cheatSubTabGrupo");
    const tabInv = $("cheatSubTabInv");
    const secGeral = $("cheat-sec-geral");
    const secGrupo = $("cheat-sec-grupo");
    const secInv = $("cheat-sec-inv");

    if (!tabGeral) return;

    tabGeral.classList.remove("active");
    tabGrupo.classList.remove("active");
    tabInv.classList.remove("active");

    secGeral.style.display = "none";
    secGrupo.style.display = "none";
    secInv.style.display = "none";

    if (currentSubTab === "geral") {
      tabGeral.classList.add("active");
      secGeral.style.display = "flex";
    } else if (currentSubTab === "grupo") {
      tabGrupo.classList.add("active");
      secGrupo.style.display = "flex";
    } else if (currentSubTab === "inv") {
      tabInv.classList.add("active");
      secInv.style.display = "flex";
    }
  }

  setInterval(async () => {
    if (currentTab !== "ch") return;
    try {
      const res = await rpc("getGameState");
      const noGame = $("cheat-no-game");
      const panel = $("cheat-panel");
      if (!res || !res.connected || !res.state) {
        if (noGame) noGame.style.display = "block";
        if (panel) panel.style.display = "none";
        return;
      }

      if (noGame) noGame.style.display = "none";
      if (panel) panel.style.display = "flex";

      const state = res.state;
      const isRenPy = (state.engine === 'renpy');

      const tabGrupo = $("cheatSubTabGrupo");
      const tabInv = $("cheatSubTabInv");
      if (tabGrupo) tabGrupo.style.display = isRenPy ? "none" : "inline-block";
      if (tabInv) tabInv.style.display = isRenPy ? "none" : "inline-block";

      const battleGroup = $("cheat-rpg-battle");
      if (battleGroup) battleGroup.style.display = isRenPy ? "none" : "block";

      for (const id of ["cheat-rpg-general", "cheat-rpg-tools"]) {
        if ($(id)) $(id).style.display = isRenPy ? "none" : "block";
      }
      if (typeof state.godHP === "boolean") godHPActive = state.godHP;
      if (typeof state.godMP === "boolean") godMPActive = state.godMP;
      const noclipRow = document.querySelector("#cheatThrough")?.closest(".ci");
      if (noclipRow) noclipRow.style.display = isRenPy ? "none" : "flex";

      const encounterRow = document.querySelector("#cheatNoEncounter")?.closest(".ci");
      if (encounterRow) encounterRow.style.display = isRenPy ? "none" : "flex";

      const goldVal = $("cheatGoldVal");
      if (goldVal && document.activeElement !== goldVal) {
        goldVal.value = state.gold;
        lastGold = state.gold;
      }

      const through = $("cheatThrough");
      if (through && Date.now() - lastThroughInteraction > 2000) {
        through.checked = state.through;
      }

      const noEncounter = $("cheatNoEncounter");
      if (noEncounter && Date.now() - lastNoEncounterInteraction > 2000) {
        noEncounter.checked = state.encounterDisabled;
      }

      const btnHP = $("cheatGodHP");
      if (btnHP)
        btnHP.textContent =
          t("cheatInfiniteHPLabel") + " [" + (godHPActive ? "ON" : "OFF") + "]";

      const btnMP = $("cheatGodMP");
      if (btnMP)
        btnMP.textContent =
          t("cheatInfiniteMPLabel") + " [" + (godMPActive ? "ON" : "OFF") + "]";

      const list = $("cheat-actors-list");
      if (list && state.actors) {
        let html = "";
        state.actors.forEach((a) => {
          // FASE 1 / PASSO 19: hp/mhp/mp/mmp/level/idx eram interpolados crus.
          // idx vinha para dentro de data-idx="..." — um id malicioso
          // (ex.: 1" onmouseover="...) abria um vetor XSS via atributo.
          const aName = esc(a.name);
          const aHp = num(a.hp);
          const aMhp = num(a.mhp);
          const aMp = num(a.mp);
          const aMmp = num(a.mmp);
          const aLevel = num(a.level);
          const aIdx = attr(a.idx);
          const hpPct = Math.round((aHp / aMhp) * 100) || 0;
          const mpPct = Math.round((aMp / aMmp) * 100) || 0;
          html += `
            <div style="background:var(--bg4);border:1px solid var(--bd);padding:10px;border-radius:4px;font-size:10px;margin-bottom:4px">
              <div style="font-weight:600;color:var(--accent);margin-bottom:6px;font-size:11px">${aName} (${t("level")} ${aLevel})</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <!-- HP Row -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <span style="font-weight:bold;color:var(--txt2);flex:1">HP: ${aHp} / ${aMhp} (${hpPct}%)</span>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input class="actor-hp-input" data-idx="${aIdx}" type="number" style="width:60px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${aHp}">
                    <button class="actor-hp-btn btn sm" data-idx="${aIdx}" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
                  </div>
                </div>
                <!-- MP Row -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <span style="font-weight:bold;color:var(--txt2);flex:1">MP: ${aMp} / ${aMmp} (${mpPct}%)</span>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input class="actor-mp-input" data-idx="${aIdx}" type="number" style="width:60px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${aMp}">
                    <button class="actor-mp-btn btn sm" data-idx="${aIdx}" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        list.innerHTML = html;
      }

      const sel = $("cheatInvItemSelect");
      if (sel && state.allDbItems && sel.options.length <= 1) {
        // FASE 1 / PASSO 19: item.type e item.id entravam em value="" crus.
        // Substituido por construcao via DOM (sem innerHTML).
        const opts = [XSSGuard.makeOption(document, "", t("cheatSelectItemPlaceholder"))];
        state.allDbItems.forEach((item) => {
          const typeStr = t(item.type);
          opts.push(XSSGuard.makeOption(
            document,
            `${item.type}:${item.id}`,
            `[${typeStr}] ${item.name}`,
          ));
        });
        XSSGuard.replaceChildren(sel, opts);
      }

      const invList = $("cheat-inventory-list");
      if (invList && state.ownedItems) {
        const query = ($("cheatInvSearch")?.value || "").toLowerCase();
        let html = "";
        state.ownedItems.forEach((item) => {
          if (query && !item.name.toLowerCase().includes(query)) return;
          const typeStr = t(item.type);
          // FASE 1 / PASSO 19: item.type/item.id/item.count interpolados
          // em atributos sem escape.
          const iType = attr(item.type);
          const iId = attr(item.id);
          const iCount = num(item.count);
          html += `
            <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <div>
                <span style="font-weight:600;color:var(--accent)">[${esc(typeStr)}]</span>
                <span style="color:var(--txt2);margin-left:4px">${esc(item.name)}</span>
              </div>
              <div style="display:flex;gap:4px;align-items:center">
                <span style="font-weight:bold;margin-right:6px">Qtd: ${iCount}</span>
                <button class="inv-adjust-btn btn sm" data-type="${iType}" data-id="${iId}" data-amount="-1" style="padding:1px 5px;font-size:9px">-1</button>
                <button class="inv-adjust-btn btn sm" data-type="${iType}" data-id="${iId}" data-amount="1" style="padding:1px 5px;font-size:9px">+1</button>
                <button class="inv-remove-btn btn sm dgr" data-type="${iType}" data-id="${iId}" data-count="${iCount}" style="padding:1px 5px;font-size:9px">X</button>
              </div>
            </div>
          `;
        });
        if (!html) {
          html =
            "<div style=\"text-align:center;padding:12px;color:var(--txt3);font-size:10px\">No items found.</div>";
        }
        invList.innerHTML = html;
      }

      if (state.variables && Array.isArray(state.variables)) {
        latestRenpyVariables = state.variables;
        // Re-apply user frozen overrides
        for (const [fKey, fVal] of Object.entries(pendingUserFrozenVars)) {
          const vItem = latestRenpyVariables.find(v => String(v.name || v.id) === fKey);
          if (vItem) {
            vItem.value = fVal;
          }
        }
      }
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }, 500);

  const pendingUserFrozenVars = {};
  let latestRenpyVariables = [];
  let renpyCategoryFilter = "all";

  function renderRenpyVariables(variables) {
    const container = $("renpy-var-list") || $("cheat-vars-grid");
    if (!container) return;
    const varsToRender = variables || latestRenpyVariables;
    if (!varsToRender || varsToRender.length === 0) {
      container.innerHTML = "<div style=\"text-align: center; color: var(--txt3); font-size: 10px;\">Click \"Scan Variables\" to read renpy.store memory</div>";
      return;
    }

    const query = ($("cheatRenpySearch")?.value || "").toLowerCase();
    let html = "";

    varsToRender.forEach((v) => {
      const vName = String(v.name || v.id || "");
      if (query && !vName.toLowerCase().includes(query)) {
        return;
      }

      const vType = v.type || typeof v.value;
      const vKey = esc(vName);

      if (renpyCategoryFilter === "switches" && vType !== "boolean") return;
      if (renpyCategoryFilter === "stats" && vType !== "number") return;
      if (renpyCategoryFilter === "texts" && vType !== "string") return;

      if (vType === 'boolean' || typeof v.value === 'boolean') {
        const isChecked = Boolean(v.value) ? "checked" : "";
        html += `
          <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <span style="font-weight:600;color:var(--accent)">${vKey} <span style="color:var(--txt3);font-weight:normal">(switch)</span></span>
            <input class="renpy-var-toggle" data-key="${vKey}" type="checkbox" ${isChecked}>
          </div>
        `;
      } else if (vType === 'number' || typeof v.value === 'number') {
        // FASE 1 / PASSO 19: v.value interpolado cru em texto e em value="".
        const vNum = num(v.value);
        html += `
          <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <span style="font-weight:600;color:var(--accent)">${vKey} <span style="color:var(--txt3);font-weight:normal">(stat = ${vNum})</span></span>
            <div style="display:flex;gap:4px;align-items:center">
              <input class="renpy-var-input" data-key="${vKey}" type="number" style="width:80px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${vNum}">
              <button class="renpy-var-btn btn sm" data-key="${vKey}" data-type="number" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <span style="font-weight:600;color:var(--accent)">${vKey} <span style="color:var(--txt3);font-weight:normal">(text)</span></span>
            <div style="display:flex;gap:4px;align-items:center">
              <input class="renpy-var-input" data-key="${vKey}" type="text" style="width:110px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${esc(String(v.value))}">
              <button class="renpy-var-btn btn sm" data-key="${vKey}" data-type="string" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
            </div>
          </div>
        `;
      }
    });

    if (!html) {
      html = "<div style=\"text-align:center;padding:12px;color:var(--txt3);font-size:10px\">No variables match the filter.</div>";
    }
    container.innerHTML = html;
  }

  document.addEventListener("input", (e) => {
    if (e.target.id === "cheatRenpySearch") {
      renderRenpyVariables(latestRenpyVariables);
    }
  });

  document.addEventListener("change", async (e) => {
    const target = e.target;
    if (target.classList.contains("renpy-var-toggle")) {
      const key = target.getAttribute("data-key");
      const val = target.checked;
      await rpc("setGameVar", { id: key, value: val });
      const item = latestRenpyVariables.find(v => String(v.name || v.id) === key);
      if (item) item.value = val;
      log("success", `[Ren'Py Memory] Switch '${key}' set to ${val}`);
    }
  });

  document.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.id === "cheatOpenAppDataBtn") {
      const fullPath = $("renpy-appdata-full-path")?.textContent;
      if (fullPath && fullPath !== "-" && !fullPath.includes("Waiting")) {
        await rpc("openSaveFolder", { path: fullPath });
      } else {
        showToast("No save/AppData folder resolved yet.", "info");
      }
    }

    if (target.id === "cheatRefreshAppDataBtn") {
      if (S.launchedKey && S.games[S.launchedKey]) {
        const g = S.games[S.launchedKey];
        const exe = g.constArgs?.gameExe || "";
        if (g.engine === "renpy") { await refreshAppDataCard(S.launchedKey, dirname(exe), g.libConf?.title || S.launchedKey); }
        showToast("Dados do AppData atualizados!", "success");
      } else {
        showToast("Inicie um jogo para inspecionar os dados de AppData.", "info");
      }
    }

    if (target.id === "cheatApplyHotkeys") {
      await applyHotkeys();
    }

    if (target.id === "cheatRenpyScanBtn") {
      const res = await rpc("scanGameVariables");
      if (res && res.ok && res.variables) {
        latestRenpyVariables = res.variables;
        renderRenpyVariables(latestRenpyVariables);
        log("success", `[Ren'Py Memory Scanner] Mapeadas ${res.variables.length} renpy.store variables.`);
      } else {
        log("warn", "Waiting for Ren'Py memory synchronization...");
      }
    }

    if (target.classList.contains("renpy-cat-btn")) {
      qsa(".renpy-cat-btn").forEach(b => b.classList.remove("active"));
      target.classList.add("active");
      renpyCategoryFilter = target.getAttribute("data-cat") || "all";
      renderRenpyVariables(latestRenpyVariables);
    }

    if (target.classList.contains("renpy-var-btn")) {
      const key = target.getAttribute("data-key");
      const type = target.getAttribute("data-type");
      const parentDiv = target.closest("div");
      const inp = parentDiv ? parentDiv.querySelector(".renpy-var-input") : document.querySelector(`.renpy-var-input[data-key="${CSS.escape(key)}"]`);
      if (inp) {
        let rawVal = inp.value;
        let finalVal = type === 'number' ? Number(rawVal) : String(rawVal);
        if (type === 'number' && isNaN(finalVal)) finalVal = 0;

        pendingUserFrozenVars[key] = finalVal;
        const res = await rpc("setGameVar", { id: key, value: finalVal });
        
        // Update local memory state & re-render item immediately
        const item = latestRenpyVariables.find(v => String(v.name || v.id) === key);
        if (item) {
          item.value = finalVal;
        }
        renderRenpyVariables(latestRenpyVariables);

        showToast(`[Targeted Audit] '${key}' -> ${finalVal}`, "success");
        log("info", `🔍 [Targeted Audit] Monitoring '${key}' (${type}) -> Value requested: ${finalVal}`);
        log("success", `[Ren'Py Memory] Variable '${key}' (${type}) defined as ${finalVal}`);
      }
    }

    if (target.id === "cheatSubTabGeral") {
      currentSubTab = "geral";
      updateSubTabs();
    }
    if (target.id === "cheatSubTabGrupo") {
      currentSubTab = "grupo";
      updateSubTabs();
    }
    if (target.id === "cheatSubTabInv") {
      currentSubTab = "inv";
      updateSubTabs();
    }

    if (target.id === "cheatGoldBtn") {
      const val = parseInt($("cheatGoldVal").value, 10);
      if (!isNaN(val)) {
        await rpc("sendCheatCommand", { 
          code: "if (typeof $gameParty !== 'undefined') { $gameParty._gold = " + val + "; } else if (typeof renpy !== 'undefined' && renpy.store) { renpy.store.gold = " + val + "; renpy.store.money = " + val + "; }" 
        });
        await rpc("setGameVar", { id: "gold", value: val });
        await rpc("setGameVar", { id: "money", value: val });
        log("success", "Gold/currency set to: " + val);
      }
    }

    if (target.id === "cheatGodHP") {
      godHPActive = !godHPActive;
      await rpc("sendCheatCommand", { code: "window.godHP = " + godHPActive });
      log("info", "Infinite health (God HP) set to: " + godHPActive);
    }

    if (target.id === "cheatGodMP") {
      godMPActive = !godMPActive;
      await rpc("sendCheatCommand", { code: "window.godMP = " + godMPActive });
      log("info", "Magia Infinita (God MP) set to: " + godMPActive);
    }

    if (target.id === "cheatInstaWin") {
      await rpc("sendCheatCommand", {
        code: 'if (typeof BattleManager !== "undefined") { BattleManager.processVictory(); }',
      });
      log("success", "Instant victory enabled!");
    }

    if (target.id === "cheatInstaKill") {
      await rpc("sendCheatCommand", {
        code: 'if (typeof $gameTroop !== "undefined") { $gameTroop.members().forEach(e => e.setHp(1)); }',
      });
      log("success", "HP dos inimigos definido para 1!");
    }

    if (target.id === "cheatOpenDevTools") {
      await rpc("sendCheatCommand", {
        code: 'try { require("nw.gui").Window.get().showDevTools(); } catch(e) { console.warn("DevTools fail: " + e.message); }',
      });
      log("success", "Solicitado abertura do console DevTools.");
    }

    if (target.classList.contains("actor-hp-btn")) {
      const idx = parseInt(target.getAttribute("data-idx"), 10);
      const inputs = document.querySelectorAll(".actor-hp-input");
      let val = null;
      inputs.forEach((inp) => {
        if (parseInt(inp.getAttribute("data-idx"), 10) === idx) {
          val = parseInt(inp.value, 10);
        }
      });
      if (val !== null && !isNaN(val)) {
        await rpc("sendCheatCommand", {
          code: `$gameParty.members()[${idx}].setHp(${val})`,
        });
        log("success", `HP do personagem ${idx} definido para ${val}`);
      }
    }

    if (target.classList.contains("actor-mp-btn")) {
      const idx = parseInt(target.getAttribute("data-idx"), 10);
      const inputs = document.querySelectorAll(".actor-mp-input");
      let val = null;
      inputs.forEach((inp) => {
        if (parseInt(inp.getAttribute("data-idx"), 10) === idx) {
          val = parseInt(inp.value, 10);
        }
      });
      if (val !== null && !isNaN(val)) {
        await rpc("sendCheatCommand", {
          code: `$gameParty.members()[${idx}].setMp(${val})`,
        });
        log("success", `MP do personagem ${idx} definido para ${val}`);
      }
    }

    if (target.classList.contains("inv-adjust-btn")) {
      const type = target.getAttribute("data-type");
      const id = parseInt(target.getAttribute("data-id"), 10);
      const amount = parseInt(target.getAttribute("data-amount"), 10);
      let dataVar = "$dataItems";
      if (type === "weapon") dataVar = "$dataWeapons";
      if (type === "armor") dataVar = "$dataArmors";
      await rpc("sendCheatCommand", {
        code: `$gameParty.gainItem(${dataVar}[${id}], ${amount})`,
      });
    }

    if (target.classList.contains("inv-remove-btn")) {
      const type = target.getAttribute("data-type");
      const id = parseInt(target.getAttribute("data-id"), 10);
      const count = parseInt(target.getAttribute("data-count"), 10);
      let dataVar = "$dataItems";
      if (type === "weapon") dataVar = "$dataWeapons";
      if (type === "armor") dataVar = "$dataArmors";
      await rpc("sendCheatCommand", {
        code: `$gameParty.gainItem(${dataVar}[${id}], -${count})`,
      });
    }

    if (target.id === "cheatInvItemAddBtn") {
      const selectVal = $("cheatInvItemSelect").value;
      if (!selectVal) {
        alert("Por favor, selecione um item primeiro!");
        return;
      }
      const parts = selectVal.split(":");
      const type = parts[0];
      const id = parseInt(parts[1], 10);
      const qty = parseInt($("cheatInvItemQty").value, 10);
      if (isNaN(qty) || qty <= 0) return;

      let dataVar = "$dataItems";
      if (type === "weapon") dataVar = "$dataWeapons";
      if (type === "armor") dataVar = "$dataArmors";
      await rpc("sendCheatCommand", {
        code: `$gameParty.gainItem(${dataVar}[${id}], ${qty})`,
      });
      log("success", `Adicionado item ID ${id} (${type}) x${qty}`);
    }
  });

  document.addEventListener("change", async (e) => {
    const target = e.target;
    if (target.id === "cheatThrough") {
      lastThroughInteraction = Date.now();
      await rpc("sendCheatCommand", {
        code: "$gamePlayer.setThrough(" + target.checked + ")",
      });
      log("info", "NoClip (Through) definido: " + target.checked);
    }
    if (target.id === "cheatNoEncounter") {
      lastNoEncounterInteraction = Date.now();
      const code = target.checked
        ? "$gameSystem.disableEncounter()"
        : "$gameSystem.enableEncounter()";
      await rpc("sendCheatCommand", { code });
      log("info", "Encontro com inimigos definido: " + !target.checked);
    }
    if (target.id === "cheatApplyHotkeys") {
      await applyHotkeys();
    }
  });

  window.addEventListener("beforeunload", function () {
    if (!window.isReloading) {
      try {
        fetch('/api/close_app', {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', 'X-OpenTranslator-Token': SESSION_TOKEN },
          body: JSON.stringify({ close: true }),
        }).catch(() => {});
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
  });



  let compatibilityProfiles = [];
  function renderCompatibilityCards() {
    const query = ($("compat-search")?.value || "").toLocaleLowerCase("en");
    const visible = compatibilityProfiles.filter(profile => JSON.stringify(profile).toLocaleLowerCase("en").includes(query));
    const container = $("pf-matrix-rows");
    if (!container) return;
    container.innerHTML = visible.length ? visible.map(profile => `
      <article class="compat-card">
        <header><h2>${esc(profile.name)}</h2><span class="compat-badge">${profile.status === "PARTIAL" ? "Partial support" : "Integration pending"}</span></header>
        <p class="compat-version">${esc(profile.versions)}</p>
        <dl><dt>Available in the application</dt><dd>${esc(profile.coverage)}</dd><dt>Cheats</dt><dd>${esc(profile.cheats)}</dd><dt>Known issues for this game type</dt><dd>${esc(profile.commonIssue)}</dd></dl>
        <details><summary>Remaining work and verification</summary><ul>${profile.missing.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
        <div class="compat-sources">${profile.sources.filter(url => /^https:\/\//.test(url)).map((url, index) => `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">Source ${index + 1} ↗</a>`).join(" ")}</div></details>
      </article>`).join("") : '<p class="empty-state">No engine matches your search.</p>';
    if ($("compat-summary")) $("compat-summary").textContent = `${visible.length} of ${compatibilityProfiles.length} profiles • Reviewed November 1, 2026 • Compatibility depends on the game and version.`;
  }
  async function renderPerformance() {
    try {
      const result = await rpc("getCapabilityMatrix");
      compatibilityProfiles = result?.compatibility?.profiles || [];
      renderCompatibilityCards();
    } catch (error) {
      if ($("compat-summary")) $("compat-summary").textContent = "Could not load profiles. Click Refresh to retry.";
      console.warn("renderPerformance:", error.message);
    }
  }
  $("compat-search")?.addEventListener("input", renderCompatibilityCards);

  $("btnRunBenchmark")?.addEventListener("click", async () => {
    const btn = $("btnRunBenchmark");
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> <span>Medindo Throughput...</span>`;
    showToast("Starting concurrency benchmark...", "info");

    try {
      const res = await rpc("runSpeedBenchmark", { options: { stages: [1, 2, 4, 8, 12, 16], roundsPerStage: 2 } });
      if (res && res.result) {
        const r = res.result;
        // FASE 8 — todos os valores do benchmark passam por `num()`. São
        // medidas, mas vêm do servidor como parte de um objeto que o
        // SpeedBenchmark também usa para_relatar erros; interpolar cru num
        // innerHTML transformaria uma mensagem de falha em HTML.
        if ($("pf-safe-val")) $("pf-safe-val").textContent = `${num(r.safeSpeed.speed)} txt/s`;
        if ($("pf-sustained-val")) $("pf-sustained-val").textContent = `${num(r.maxSustainedSpeed.speed)} txt/s`;
        if ($("pf-peak-val")) $("pf-peak-val").textContent = `${num(r.peakSpeed.speed)} txt/s`;
        if ($("pf-saturation-val")) $("pf-saturation-val").textContent = `${num(r.saturationPoint.concurrency)} Workers`;

        const rows = $("pf-bench-rows");
        if (rows && Array.isArray(r.stages)) {
          rows.innerHTML = r.stages.map(st => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
              <td style="padding:6px">${num(st.concurrency)} worker${Number(st.concurrency) > 1 ? 's' : ''}</td>
              <td style="padding:6px; color:var(--accent)">${num(st.meanThroughputTextsSec)} txt/s</td>
              <td style="padding:6px">${num(st.medianThroughputTextsSec)} txt/s</td>
              <td style="padding:6px">${num(st.minThroughputTextsSec)} txt/s</td>
              <td style="padding:6px">${num(st.maxThroughputTextsSec)} txt/s</td>
              <td style="padding:6px">${num(st.stdDev)}</td>
              <td style="padding:6px">${num(st.avgP95LatencyMs)}ms</td>
              <td style="padding:6px">${num(st.rateLimitErrors)}</td>
            </tr>
          `).join("");
        } else if (rows) {
          // Sem estágios, não se escreve uma tabela vazia que parece medida.
          rows.innerHTML = '<tr><td colspan="8" style="padding:8px;color:var(--txt3)">'
            + "The benchmark returned no stages to display.</td></tr>";
        }
        showToast("Benchmark completed.", "success");
      } else {
        // FASE 8 — a ausência de resultado não é sucesso. Antes, um retorno
        // sem `result` caía fora do `if` e não mostrava NADA: o botão voltava
        // ao normal e o usuário ficava sem saber se rodou.
        showToast("The benchmark returned no results: " + (res?.error || "resposta vazia"), "error");
      }
    } catch (err) {
      showToast("Benchmark failed: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>⚡</span> <span>Executar Benchmark Real</span>`;
    }
  });

  $("btnRefreshMatrix")?.addEventListener("click", () => {
    renderPerformance();
    showToast("Matriz de capacidades atualizada!", "info");
  });
})();

