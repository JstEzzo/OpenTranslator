(async function () {
  "use strict";

  let SESSION_TOKEN = "";

  // Heartbeat para manter o servidor ativo enquanto a UI estiver aberta
  async function pingServer() {
    try {
      const r = await fetch("/api/ping", { method: "GET" });
      const j = await r.json();
      if (j && j.token) SESSION_TOKEN = j.token;
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }
  setInterval(pingServer, 2500);
  pingServer();

  async function rpc(method, params) {
    const r = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j.data;
  }

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
  };

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
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
    toast.innerHTML = msg;
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
    const bgImage = theme.bgImage || "";
    const glassOpacity =
      theme.glassOpacity !== undefined ? theme.glassOpacity : 45;

    let css = `:root {
      --accent: ${accent};
      --accent2: ${adjustColorBrightness(accent, -15)};
      --accent3: ${adjustColorBrightness(accent, -30)};
    }`;

    if (bgImage) {
      const sanitizedBg = bgImage.replace(/\\/g, "/");
      css += `
        body {
          background-image: linear-gradient(rgba(10, 10, 15, 0.85), rgba(10, 10, 15, 0.85)), url('${sanitizedBg}') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-repeat: no-repeat !important;
        }
      `;
    } else {
      css += `
        body {
          background-image: none !important;
          background: var(--bg) !important;
        }
      `;
    }

    const glassBg = `rgba(15, 15, 22, ${glassOpacity / 100})`;
    css += `
      .cg, .gc, #sd, #bar, #modal-inner, .tb, #statusbar {
        background: ${glassBg} !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
      }
      /* Prevent blur bleeding onto text elements */
      h1, h2, h3, h4, h5, h6, label, span, button, input, select, textarea {
        transform: translateZ(0);
        -webkit-font-smoothing: antialiased !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      body, button, input, select, textarea {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
    `;

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
    if (S.cfg.lang) _lang = S.cfg.lang;
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

    await rpc("saveCfg", S.cfg);
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
      cfgEngine: "Engine",
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
    pt: {

    launchPhaseInit: "🧹 Limpando processos e checando engine...",
    launchPhaseUnpack: "📦 Descompactando pacotes .rpa e mídias...",
    launchPhaseTranslating: "🤖 Traduzindo scripts e diálogos com AI Engine...",
    launchPhaseAppData: "📂 Mapeando diretório de saves no AppData...",
    launchPhaseLaunching: "🚀 Disparando o executável do jogo...",
    launchPhaseConnected: "✨ Conectado ao CheatOverlay com sucesso!",
    launchInProgress: "Uma inicialização de jogo já está em andamento",

    btnExtractRpa: "Btnextractrpa",


    cheatSaveManager: "Gerenciador de Saves & AppData (%APPDATA%\RenPy)",
    cheatOpenSaveFolder: "📁 Abrir Pasta de Saves",
    cheatRefresh: "🔄 Atualizar",
    cheatResolvedPath: "Caminho Resolvido:",
    cheatResolutionMethod: "Método de Resolução:",
    cheatDetectedSaves: "Arquivos de Save / Persistência Detectados:",
    cheatNoSavesYet: "Nenhum save detectado ainda.",
    cheatFolderLocatedNoSaves: "Pasta localizada, mas sem saves criados ainda.",
    cheatAwaitingGame: "Aguardando seleção do jogo...",
    cheatMemoryScannerTitle: "Scanner de Memória ao Vivo (renpy.store / Universal)",
    cheatScanVariablesBtn: "Escanear Variáveis",
    cheatFilterPlaceholder: "Filtrar variáveis (ex: pontos, amor, ouro)...",
    cheatClickScanHint: "Clique em 'Escanear Variáveis' para ler renpy.store",
    cheatLaunchTitle: "Inicializando Jogo...",
    cheatLaunchSub: "Preparando ambiente, traduções e patches",
    cheatAlreadyTranslated: "⚡ Jogo já traduzido! Carregando executável...",

      tabGames: "Jogos",
      tabSaves: "Salvamentos",
      tabConfig: "Config",
      tabLog: "Log",
      dropText:
        "Arraste e solte ou clique aqui para selecionar um arquivo principal do jogo (Game.exe)",
      dropOrBrowse:
        "Arraste um Game.exe acima ou clique em Procurar para adicionar um jogo",
      searchGames: "Pesquisar jogos...",
      refresh: "Atualizar",
      noGames: "Nenhum jogo adicionado",
      noSavesYet:
        "Nenhum save encontrado. Inicie um jogo primeiro para criar saves.",
      btnPlay: "Iniciar",
      btnEdit: "Editar",
      btnDelete: "Excluir",
      btnSaveCfg: "Salvar Config",
      btnSave: "Salvar",
      btnCancel: "Cancelar",
      btnBrowse: "Procurar...",
      btnCopy: "Copiar",
      btnClear: "Limpar",
      cfgTrans: "Tradução",
      cfgSrc: "Idioma Origem",
      cfgDst: "Idioma Destino",
      langLabel: "Idioma do App",
      cfgDiagnostics: "Diagnóstico",
      cfgTest: "Testar Google Translate",
      cfgTestRes: "Resultado",
      cfgCache: "Histórico",
      cfgClearHistory: "Apagar todas as traduções salvas no cache global",
      btnClearHistory: "Apagar Histórico",
      clearHistoryConfirm:
        "Tem certeza que deseja apagar todo o histórico de traduções salvas? Isso não poderá ser desfeito.",
      historyCleared: "Histórico de traduções excluído com sucesso!",
      statusGames: "jogos",
      modalTitle: "Editar Jogo",
      modalExe: "Executável",
      deleteConfirm: "Deletar este jogo?",
      logCopied: "Log copiado",
      configSaved: "Config salva",
      uiTitle: "OpenTranslator v1.0",
      uiGames: "Jogos",
      uiSaves: "Salvamentos",
      cfgEngine: "Engine",
      cfgEngineOff: "Google",
      cfgEngineGoogle: "Google 🌐",
      cfgEngineBing: "Bing 🔍",
      cfgEngineMulti: "Multi-Engine (Google+Bing) 🔁",
      cfgEngineLlm: "Tradutor IA / LLM 🤖",
      cfgEngineDeepl: "Tradutor DeepL 📄",
      glossary: "Glossário",
      glossaryEditor: "Editor de Glossário",
      glossaryTerm: "Termo",
      glossaryTrans: "Tradução",
      glossaryAdd: "Adicionar",
      glossarySave: "Salvar Glossário",
      glossarySaved: "Glossário salvo ({n} termos)",
      btnInstallUnity: "Instalar XUnity + Plugin",
      btnInstallOverlay: "Instalar Overlay RPG Maker",
      btnExtractWolf: "Extrair Jogo Wolf",
      btnPackWolf: "Empacotar Pasta Wolf",
      btnExportExcel: "Exportar para Excel (.xlsx) 📊",
      btnImportExcel: "Importar do Excel (.xlsx) 📥",
      toolsUnity: "Ferramentas Unity",
      toolsRpgm: "Ferramentas RPG Maker",
      toolsWolf: "Ferramentas Wolf RPG",
      descUnity:
        "Instale e configure o plugin XUnity AutoTranslator para tradução em tempo real.",
      descWolf:
        "Descompacte arquivos de dados (.wolf) ou reempacote diretórios modificados.",
      descRpgm:
        "Instale o tradutor em tempo real no jogo ou exporte/importe traduções no formato Excel (.xlsx).",
      toolsEvb: "Ferramentas Enigma Virtual Box 📦",
      descEvb:
        "Extraia arquivos virtuais de executáveis únicos compactados com Enigma Virtual Box.",
      btnUnpackEvb: "Extrair Executável EVB",
      visualCustomizer: "Personalização Visual 🎨",
      accentColor: "Cor de Destaque",
      bgImage: "Imagem de Fundo",
      glassEffect: "Efeito Vidro (Glass)",
      wordWrapLimit: "Quebra de Linha (Limite)",
      origName: "Nome original",
      transName: "Nome traduzido",
      designatedName: "Nome designado",
      gamePath: "Caminho do jogo",
      tags: "Tags",
      note: "Observação",
      engineLabel: "Engine",
      lastLaunch: "Última inicialização",
      firstLaunch: "Primeira inicialização",
      keyLabel: "Chave",
      deleteCache: "Deletar Cache",
      exportTexts: "Exportar Textos",
      extractImages: "Extrair Imagens 📷",
      extractAudio: "Extrair Áudio 🎵",
      patchFonts: "Corrigir Fontes PT-BR 🔤",
      editGame: "Editar Jogo",
      addGame: "Adicionar Jogo",
      yes: "Sim",
      no: "Não",
      configSavedMsg: "Configuração salva com sucesso!",
      mPreTranslate: "Traduzir Arquivos 🌐",
      mRestoreBackup: "Restaurar Original 🔄",
      cheatNoGameConnected:
        "Nenhum jogo ativo conectado. Inicie um jogo RPG Maker MZ/MV para habilitar as funções de Cheat.",
      cheatGeral: "Geral",
      cheatGrupo: "Membros / HP",
      cheatInv: "Inventário",
      cheatGeneralMods: "Modificações Gerais",
      cheatGold: "Ouro",
      cheatSetBtn: "Definir",
      cheatNoClip: "Atravessar Paredes (NoClip)",
      cheatDisableEncounters: "Desativar Encontros com Inimigos",
      cheatBattleGodMode: "Batalha / Modo Deus",
      cheatInfiniteHP: "Vida Infinita (Max HP) [OFF]",
      cheatInfiniteMP: "Magia Infinita (Max MP) [OFF]",
      cheatInfiniteHPLabel: "Vida Infinita (Max HP)",
      cheatInfiniteMPLabel: "Magia Infinita (Max MP)",
      cheatInstaWin: "Vitória Instantânea",
      cheatInstaKill: "Inimigos com 1 HP",
      cheatTools: "Ferramentas",
      cheatDevTools: "Console do Desenvolvedor (F12)",
      cheatGroupHP: "Status do Grupo e Edição de HP/MP",
      cheatAddInvItem: "Adicionar Item / Arma / Armadura",
      cheatSelectItem: "Selecione o Item/Equipamento:",
      cheatWaitingGameData: "Aguardando dados do jogo...",
      cheatQty: "Quantidade",
      cheatAddBtn: "Adicionar",
      cheatInvItems: "Itens no Inventário",
      cheatFilter: "Filtrar itens...",
      preparingGame: "Preparando jogo...",
      cheatSelectItemPlaceholder: "-- Escolha um item --",
      weapon: "Arma",
      armor: "Armadura",
      item: "Item",
      level: "Nível",
    },
  };
  let _lang = "pt";
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
        const pathEl = $("renpy-appdata-path");
        const countEl = $("renpy-appdata-count");
        if (pathEl) pathEl.textContent = res.appDataDir;
        if (countEl) countEl.textContent = `${(res.saves || []).length} saves`;
      } else {
        card.style.display = "none";
      }
    } catch (e) { console.warn(`app.js: ${e.message}`); }
  }

  let launchMutex = false;
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
          <div style="color:${line.includes('✓') || line.includes('OK') ? 'var(--green)' : (line.includes('Erro') || line.includes('Falha') ? 'var(--red)' : 'var(--txt2)')}">
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
            if (txt.includes("Descompactando")) {
              updateLoadingState(35, t("launchPhaseUnpack"), txt);
            } else if (txt.includes("Iniciando varredura") || txt.includes("Motor de Tradução") || txt.includes("Translating")) {
              updateLoadingState(55, t("launchPhaseTranslating"), txt);
            } else if (txt.includes("AppData Resolver") || txt.includes("Pasta de saves")) {
              updateLoadingState(75, t("launchPhaseAppData"), txt);
            } else if (txt.includes("Disparando o motor") || txt.includes("inicializado com sucesso") || txt.includes("launched")) {
              updateLoadingState(90, t("launchPhaseLaunching"), txt);
            } else if (txt.includes("CheatOverlay conectado")) {
              updateLoadingState(100, t("launchPhaseConnected"), txt);
            } else {
              updateLoadingState(lBar ? parseInt(lBar.style.width) || 40 : 40, txt, txt);
            }
          }
        }
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }, 300);

    try {
      const r = await rpc("launchGame", { key });
      updateLoadingState(100, t("cheatAlreadyTranslated") || "⚡ Game already translated! Loading executable...", "PID " + (r.pid || "Active"));

      const elapsed = Date.now() - startTime;
      const minDisplayMs = 1500;
      const remainingMs = Math.max(0, minDisplayMs - elapsed);

      setTimeout(() => {
        if (ld) ld.style.display = "none";
      }, remainingMs);

      if (r && r.ok === false) {
        showToast("Launch failed: " + (r.error || "Unknown error"), "error");
        return;
      }
      S.launchedKey = key;
      renderGames();
      refreshAppDataCard(key, g.constArgs?.gameExe ? dirname(g.constArgs.gameExe) : "", title);
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
    python: { label: "Ren'Py", js: false, icon: "\ud83d\udc0d" },
    renpy: { label: "Ren'Py", js: false, icon: "\ud83d\udc0d" },
    srpg: { label: "SRPG Studio", js: false, icon: "\u2694" },
    agtk: { label: "Action Game Toolkit", js: false, icon: "\ud83c\udff0" },
    kmy: { label: "KMY", js: false, icon: "\ud83d\udd2e" },
    bakin: { label: "Bakin", js: false, icon: "\ud83c\udfad" },
    tyrano: { label: "TyranoScript", js: true, icon: "\ud83d\udcdd" },
  };

  async function detectEngine(exePath, exeDir) {
    try {
      return await rpc("detectEngine", { exePath, exeDir });
    } catch (e) {
      return "mz";
    }
  }
  function engineInfo(eng) {
    return ENGINES_DEF[eng] || ENGINES_DEF.mz;
  }
  function engineIsJS(eng) {
    return engineInfo(eng).js;
  }

  // ==================== UI ====================
  async function build() {
    try {
      const c = await rpc("loadCfg");
      S.cfg = c;
      if (c && c.lang) _lang = c.lang;
    } catch (e) { console.warn(`app.js: ${e.message}`); }
    const st = document.createElement("style");
    st.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
@font-face{font-family:'NotoSansCJK';src:url('NotoSans/cjk/NotoSansCJKsc-Regular.otf') format('opentype');font-weight:400;font-style:normal}
@font-face{font-family:'Noto Emoji';src:url('NotoSans/emoji/NotoColorEmoji-Regular.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'Unifont Smooth';src:url('unifont-all.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenT PGMMV';src:url('../loaders/opent_PGMMV_font.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'Notdef Fallback';src:url('rawres/notdef.ttf') format('truetype');font-weight:400;font-style:normal}
:root{
  --bg:#08080c;
  --bg2:#0d0d14;
  --bg3:#13131f;
  --bg4:#1a1a2b;
  --bg5:#222238;
  --bd:rgba(255,255,255,0.06);
  --bd2:rgba(255,255,255,0.12);
  --bd3:rgba(255,255,255,0.18);
  --txt:#f2f3f8;
  --txt2:#969ab5;
  --txt3:#60657c;
  --accent:#6c5ce7;
  --accent-grad:linear-gradient(135deg,#6c5ce7,#a29bfe);
  --accent2:#a29bfe;
  --accent3:#5849cf;
  --green:#00b894;
  --green2:#55efc4;
  --red:#d63031;
  --red2:#ff7675;
  --orange:#fdcb6e;
  --purple:#e84393;
  --font:'Outfit','Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --fontGame:'Unifont Smooth','NotoSansCJK','Noto Emoji','OpenT PGMMV',sans-serif;
  --radius:8px;
  --radius-sm:6px;
  --radius-lg:12px;
  --shadow:0 4px 12px rgba(0,0,0,.4);
  --shadow-lg:0 12px 32px rgba(0,0,0,.6);
  --transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
*{margin:0;padding:0;box-sizing:border-box;min-width:0}
body{
  font-family:var(--font);background:var(--bg);color:var(--txt);
  overflow:hidden;height:100vh;font-size:14px;line-height:1.5;
  -webkit-user-select:none;user-select:none;
  width:100%;
}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:var(--bd3)}

/* ===== APP LAYOUT ===== */
#app{display:flex;flex-direction:column;height:100vh}

/* Title bar */
#bar{
  display:flex;align-items:center;height:38px;background:rgba(8,8,12,0.4);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--bd);
  -webkit-app-region:drag;flex-shrink:0
}
#bar-l{
  flex:1;padding:0 14px;display:flex;align-items:center;gap:8px;
  font-size:11px;color:var(--txt2);font-weight:600;letter-spacing:0.3px
}
#bar-r{display:flex}

#ly{display:flex;flex:1;overflow:hidden}

/* Sidebar */
#sd{
  width:68px;background:rgba(13,13,20,0.55);backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);border-right:1px solid var(--bd);
  display:flex;flex-direction:column;gap:4px;padding:12px 6px;flex-shrink:0
}
#sd button{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:10px 4px;border:none;background:transparent;color:var(--txt3);
  cursor:pointer;border-radius:var(--radius);font-size:8px;line-height:1.1;
  transition:var(--transition);position:relative;font-weight:500
}
#sd button:hover{background:rgba(255,255,255,0.03);color:var(--txt)}
#sd button.on{background:rgba(108,92,231,0.08);color:var(--accent)}
#sd button.on::before{
  content:'';position:absolute;left:2px;top:50%;transform:translateY(-50%);
  width:3px;height:20px;background:var(--accent-grad);border-radius:2px
}
#sd button .si{width:20px;height:20px;stroke:currentColor;transition:stroke var(--transition)}
#sd button .sl{font-size:8px;letter-spacing:.2px;margin-top:2px;text-transform:uppercase}

/* Main content */
#mc{flex:1;overflow:hidden;background:var(--bg)}
.tb{display:none;height:100%;overflow-y:auto;padding:0}
.tb.on{display:block;animation:tabIn .25s ease}
@keyframes tabIn{0%{opacity:.6;transform:scale(0.99)}100%{opacity:1;transform:scale(1)}}

/* ===== BUTTONS ===== */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:7px 16px;border:1px solid var(--bd);background:rgba(255,255,255,0.02);
  color:var(--txt);border-radius:var(--radius-sm);cursor:pointer;
  font-size:11px;font-family:var(--font);transition:var(--transition);
  white-space:nowrap;box-shadow:var(--shadow)
}
.btn:hover{background:rgba(255,255,255,0.06);border-color:var(--bd2);transform:translateY(-2px);box-shadow:0 6px 14px rgba(0,0,0,0.25)}
.btn:active{transform:translateY(0);box-shadow:var(--shadow)}
.btn.pri{background:var(--accent-grad);color:#fff;border:none;font-weight:600;box-shadow:0 4px 12px rgba(108,92,231,0.2)}
.btn.pri:hover{filter:brightness(1.1);box-shadow:0 6px 18px rgba(108,92,231,0.35);transform:translateY(-2px)}
.btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.btn.dgr{color:var(--red);border-color:var(--red)}
.btn.dgr:hover{background:rgba(214,48,49,0.08);border-color:var(--red2);transform:translateY(-2px)}
.btn.sm{font-size:10px;padding:5px 12px;border-radius:var(--radius-sm)}
.btn.xs{font-size:9px;padding:3px 8px;border-radius:var(--radius-sm)}
.btn .bi{font-size:13px}
.st{
  border-radius:20px;padding:1px 8px;font-size:8px;letter-spacing:.3px;
  background:rgba(90,91,106,.12);color:var(--txt3);white-space:nowrap;
  border:1px solid rgba(90,91,106,.08);text-transform:uppercase
}
.st.on{background:rgba(78,202,110,.06);color:var(--green);border-color:rgba(78,202,110,.1)}
#cstat{font-size:8px}

/* ===== STATUS BAR ===== */
#statusbar{
  display:flex;align-items:center;height:24px;
  background:var(--bg2);border-top:1px solid var(--bd);
  padding:0 12px;font-size:10px;color:var(--txt3);gap:12px;
  flex-shrink:0;-webkit-app-region:no-drag
}
#sbInfo{color:var(--txt3);font-size:9px}
#sbCenter{flex:1;text-align:center;font-size:9px;color:var(--txt3)}
#sbRight{color:var(--txt2);font-size:9px;display:flex;gap:8px}

/* ===== GAME LIBRARY ===== */
#tb-gl{padding:10px 14px}
#drop-zone{
  border:2px dashed var(--bd);padding:16px 20px 12px;
  text-align:center;color:var(--txt3);font-size:12px;
  margin-bottom:8px;cursor:pointer;border-radius:var(--radius-lg);
  transition:all var(--transition);display:flex;flex-direction:column;
  align-items:center;gap:6px;background:var(--bg2);max-width:100%
}
#drop-zone .dz-txt{word-break:break-word;max-width:100%}
#drop-zone:hover{border-color:var(--txt2);background:var(--bg3)}
#drop-zone.dragover{border-color:var(--accent);background:rgba(59,142,240,.04);box-shadow:0 0 20px rgba(59,142,240,.06)}

@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.dz-icon{font-size:22px;color:var(--txt2)}
.dz-txt{font-size:10px;color:var(--txt2);max-width:400px;line-height:1.4}
.dz-engines{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px}
.dz-el{
  font-size:8px;color:var(--txt3);background:var(--bg4);
  padding:2px 7px;border-radius:20px;border:1px solid var(--bd)
}
.gl-bar{display:flex;gap:5px;margin-bottom:6px;align-items:center;padding:0}
.gl-inp{
  flex:1;padding:5px 10px;background:var(--bg2);border:1px solid var(--bd);
  color:var(--txt);font-size:11px;font-family:var(--font);border-radius:var(--radius-sm);
  transition:border-color var(--transition)
}
.gl-inp:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px rgba(59,142,240,.08)}
#gl-list{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));width:100%;}
.gc{
  background:rgba(255,255,255,0.01);border:1px solid var(--bd);padding:12px 14px;
  cursor:pointer;display:flex;align-items:center;gap:12px;
  border-radius:var(--radius-lg);transition:var(--transition);
  box-shadow:var(--shadow)
}
.gc:hover{border-color:var(--accent2);background:rgba(255,255,255,0.03);transform:translateY(-3px);box-shadow:var(--shadow-lg)}
.gc.launched{border-color:var(--green);background:rgba(0,184,148,0.04);box-shadow:0 0 16px rgba(0,184,148,0.12)}
.gc.launched:hover{transform:translateY(-2px);box-shadow:0 0 20px rgba(0,184,148,0.18)}
.gc .gi{flex:1;min-width:0}
.gc .gt{font-size:12px;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.gc .gs{font-size:9px;color:var(--txt3);margin-top:4px;display:flex;gap:8px;align-items:center}
.gc .ga{display:flex;gap:6px;flex-shrink:0}
.gc .ga .btn{padding:3px 8px;font-size:10px;min-width:24px;justify-content:center}

#tb-sv{padding:8px 14px}
#tb-sv .sg{margin-bottom:10px;border:1px solid var(--bd);border-radius:var(--radius);overflow:hidden}
#tb-sv .sg-h{background:var(--bg2);padding:8px 12px;font-size:11px;font-weight:600;color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:8px;transition:background var(--transition)}
#tb-sv .sg-h:hover{background:var(--bg3)}
#tb-sv .sg-b{padding:0;overflow:hidden;transition:max-height .2s;max-height:0}
#tb-sv .sg-b.on{max-height:2000px}
#tb-sv .sf{display:flex;align-items:center;gap:6px;padding:5px 12px;font-size:10px;border-top:1px solid var(--bd);transition:background var(--transition)}
#tb-sv .sf:hover{background:var(--bg3)}
#tb-sv .sf .sfn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--txt)}
#tb-sv .sf .sfs{color:var(--txt3);font-size:9px;white-space:nowrap}
#tb-sv .sf .sfa{display:flex;gap:3px}
#tb-sv .empty{padding:30px;text-align:center;color:var(--txt3);font-size:11px}
#tb-sv .sg-ico{font-size:12px}

/* ===== CONFIG ===== */
#tb-cf{overflow-y:auto;padding:10px 14px 40px}
.cg{
  background:rgba(255,255,255,0.015);border:1px solid var(--bd);border-radius:var(--radius-lg);
  margin-bottom:12px;overflow:hidden;box-shadow:var(--shadow)
}
.cg h4{
  font-size:10px;color:var(--accent2);padding:10px 14px;
  background:rgba(255,255,255,0.02);border-bottom:1px solid var(--bd);
  text-transform:uppercase;letter-spacing:.5px;font-weight:700
}
.cg-body{padding:4px 0}
.ci{
  display:flex;align-items:center;justify-content:space-between;
  padding:5px 12px;border-bottom:1px solid rgba(30,30,46,.4);
  gap:8px;min-height:30px
}
.ci:last-child{border-bottom:none}
.ci label{
  font-size:10px;color:var(--txt2);white-space:nowrap;
  min-width:80px;flex-shrink:0
}
.ci input,.ci select{
  padding:5px 10px;background:rgba(255,255,255,0.02);border:1px solid var(--bd);
  color:var(--txt);font-size:10px;font-family:var(--font);border-radius:var(--radius-sm);
  transition:var(--transition);width:150px;flex-shrink:0
}
.ci input:focus,.ci select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(108,92,231,0.15);background:rgba(255,255,255,0.04)}
.ci input[type=checkbox]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}
.ci .btn{flex-shrink:0}
.ci .btn+.btn{margin-left:4px}

/* Config tool buttons grid */
#tb-cf .tools-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
  gap:6px;padding:8px 12px
}
#tb-cf .tools-grid .btn{
  width:100%;justify-content:flex-start;padding:6px 12px;font-size:10px;
  background:rgba(255,255,255,0.01);border-color:var(--bd)
}
#tb-cf .tools-grid .btn:hover{background:rgba(255,255,255,0.04);border-color:var(--accent2);transform:translateY(-2px)}
#tb-cf .tools-grid .btn .bi{font-size:12px}

/* Stats values */
.ci .sv{
  font-size:10px;font-weight:600;text-align:right;width:80px;flex-shrink:0
}
.ci .sv.gr{color:var(--green)}
.ci .sv.or{color:var(--orange)}
.ci .sv.pr{color:var(--purple)}

/* ===== CHEATS ===== */
#tb-ch{display:none;flex-direction:column;height:100%;overflow-y:auto;padding:10px 14px 40px}
#tb-ch.on{display:flex}

/* ===== LOG ===== */
#tb-lg{display:none;flex-direction:column;height:100%;padding:0}
#tb-lg.on{display:flex}
#tb-lg .lg-header{
  display:flex;align-items:center;gap:8px;padding:4px 12px;
  background:var(--bg2);border-bottom:1px solid var(--bd);
  font-size:10px;color:var(--txt3);flex-shrink:0
}
#lb{
  flex:1;overflow-y:auto;font-family:var(--font);font-size:12px;
  background:#07070c;padding:2px 0;line-height:1.6
}
.le{display:flex;padding:1px 12px;font-size:12px;word-break:break-word;gap:6px;-webkit-user-select:text;user-select:text;cursor:text}
.lt{color:var(--txt3);width:65px;flex-shrink:0;font-size:10px;text-align:right}
.le .lm{flex:1}
.le.li{color:var(--txt)}
.le.le{color:var(--red)}
.le.ls{color:var(--green)}
.le.lw{color:var(--orange)}

/* ===== GAME EDIT MODAL ===== */
#modal{
  display:none;position:fixed;top:0;left:0;right:0;bottom:0;
  background:rgba(0,0,0,.7);z-index:999;padding:20px;overflow-y:auto;
  backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)
}
#modal.on{display:block;animation:fadeIn .15s ease}
@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
#modal-inner{
  background:var(--bg3);border:1px solid var(--bd2);
  border-radius:var(--radius-lg);max-width:540px;margin:40px auto;
  padding:16px;box-shadow:var(--shadow-lg)
}
.mh{font-size:12px;color:var(--accent);margin-bottom:10px;border-bottom:1px solid var(--bd);padding-bottom:6px;font-weight:600}
.mg{display:flex;gap:12px}
.mc2{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
#modal-inner .f{margin-bottom:2px;display:flex;flex-direction:column;gap:2px}
#modal-inner .f label{font-size:9px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px}
#modal-inner .f input,#modal-inner .f select{
  padding:4px 8px;background:var(--bg2);border:1px solid var(--bd);
  color:var(--txt);border-radius:var(--radius-sm);font-size:10px;font-family:var(--font);
  transition:border-color var(--transition)
}
#modal-inner .f input:focus,#modal-inner .f select:focus{outline:none;border-color:var(--accent)}
#modal-inner .fi{display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:10px}
#modal-inner .fi label{color:var(--txt3)}
#modal-inner .fi .fv{color:var(--txt2)}
#modal-inner .fb{display:flex;gap:6px;justify-content:flex-end;margin-top:10px;border-top:1px solid var(--bd);padding-top:8px}

/* ===== SAVES ===== */
.sv-item{
  padding:5px 10px;background:var(--bg2);border:1px solid var(--bd);
  border-radius:var(--radius-sm);margin-bottom:4px;font-size:10px;
  display:flex;justify-content:space-between;align-items:center;
  transition:background var(--transition)
}
.sv-item:hover{background:var(--bg3)}
#ps{
  width:100%;padding:5px 8px;margin:0 0 6px;background:var(--bg2);
  border:1px solid var(--bd);color:var(--txt);border-radius:var(--radius-sm);
  font-size:10px;font-family:var(--font);transition:border-color var(--transition)
}
#ps:focus{outline:none;border-color:var(--accent)}
.hd{display:none!important}
input{outline:none}
.help-tip {
  display: block;
  font-size: 9px;
  color: var(--txt2);
  margin-bottom: 6px;
  margin-top: -2px;
  padding: 0 12px;
  line-height: 1.3;
  font-weight: 400;
}
.toast-card {
  animation: toastIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}
@keyframes toastIn {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
select option {
  background-color: var(--bg3) !important;
  color: var(--txt) !important;
}
  `;
    document.head.appendChild(st);

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
    </div>
    <div id="mc">

      <!-- GAMES -->
      <div id="tb-gl" class="tb on">
        <div id="drop-zone">
          <div class="dz-icon">\ud83d\udcc2</div>
          <div class="dz-txt">${t("dropText")}</div>
        </div>
        <div class="gl-bar">
          <input id="glSearch" placeholder="${t("searchGames")}" class="gl-inp">
          <button id="glRefresh" class="btn sm" title="${t("refresh")}">\u21bb</button>
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
                <span id="gl-loading-title" style="font-size:14px; font-weight:700; color:var(--txt)">Inicializando Jogo...</span>
                <span id="gl-loading-sub" style="font-size:11px; color:var(--txt2)">Preparando ambiente, traduções e patches</span>
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
                <span>Iniciando verificação do pipeline...</span>
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
      <div id="tb-cf" class="tb">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
          <label style="font-size:10px;color:var(--txt2);white-space:nowrap">${t("langLabel")}:</label>
          <select id="cfgAppLang" style="flex:1">
            <option value="pt" ${_lang === "pt" ? "selected" : ""}>Portugu\u00eas</option>
            <option value="en" ${_lang === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
        <div class="cg">
          <h4>${t("visualCustomizer")}</h4>
          <div class="cg-body">
            <div class="ci">
              <label>${t("accentColor")}</label>
              <input id="themeAccent" type="color" style="width:50px;height:22px;padding:0;cursor:pointer;border:none;background:transparent">
            </div>
            <div class="ci">
              <label>${t("bgImage")}</label>
              <input id="themeBgImage" type="text" placeholder="Ex: C:\Imagens\wallpaper.jpg" style="width:180px">
            </div>
            <div class="ci">
              <label>${t("glassEffect")}</label>
              <div style="display:flex;align-items:center;gap:6px">
                <input id="themeGlass" type="range" min="0" max="100" style="width:80px">
                <span id="themeGlassVal" style="font-size:10px;color:var(--txt2);width:30px;text-align:right">45%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cg">
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
            </select></div>
            
            <!-- Configurações de LLM -->
            <div id="llmConfigArea" style="display:none;flex-direction:column;gap:6px;margin-top:8px;padding:8px;background:var(--bg2);border:1px dashed var(--bd);border-radius:4px">
              <div class="ci"><label>Provedor LLM</label><select id="cfgLlmProvider" style="font-size:10px">
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="anthropic">Claude/Anthropic</option>
                <option value="local">Ollama/LM Studio (Local)</option>
              </select></div>
              <div class="ci"><label>API Key</label><input id="cfgLlmApiKey" type="password" placeholder="Chave da API" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci"><label>Modelo</label><input id="cfgLlmModel" type="text" placeholder="Ex: gpt-4o-mini" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci"><label>Base URL</label><input id="cfgLlmBaseUrl" type="text" placeholder="Ex: http://localhost:11434/v1" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci" style="flex-direction:column;align-items:stretch"><label>Prompt de Sistema</label><textarea id="cfgLlmPrompt" rows="3" placeholder="Instruções de tradução..." style="padding:4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px;resize:vertical;margin-top:2px"></textarea></div>
            </div>
            
            <!-- Configurações de DeepL -->
            <div id="deeplConfigArea" style="display:none;flex-direction:column;gap:6px;margin-top:8px;padding:8px;background:var(--bg2);border:1px dashed var(--bd);border-radius:4px">
              <div class="ci"><label>DeepL API Key</label><input id="cfgDeeplApiKey" type="password" placeholder="Chave da API DeepL" style="width:120px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px"></div>
              <div class="ci" style="justify-content:space-between;align-items:center"><label>Usar API Gratuita</label><input id="cfgDeeplUseFree" type="checkbox" checked style="margin:0"></div>
            </div>
            <div class="ci">
              <label>${t("wordWrapLimit")}</label>
              <input id="cfgWordWrapLimit" type="number" min="0" max="100" style="width:60px;padding:2px 4px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px;font-size:10px">
            </div>
          </div>
        </div>
        <div class="cg">
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
        </div>

        <div class="cg">
          <h4>${t("toolsUnity")}</h4>
          <span class="help-tip">${t("descUnity")}</span>
          <div class="tools-grid">
            <button class="btn sm unity-install">${t("btnInstallUnity")}</button>
          </div>
        </div>
        <div class="cg">
          <h4>${t("toolsWolf")}</h4>
          <span class="help-tip">${t("descWolf")}</span>
          <div class="tools-grid">
            <button class="btn sm wolf-extract">${t("btnExtractWolf")}</button>
            <button class="btn sm wolf-pack">${t("btnPackWolf")}</button>
          </div>
        </div>
        <div class="cg">
          <h4>${t("toolsRpgm")}</h4>
          <span class="help-tip">${t("descRpgm")}</span>
          <div class="tools-grid">
            <button class="btn sm overlay-install">${t("btnInstallOverlay")}</button>
            <button class="btn sm excel-export">${t("btnExportExcel")}</button>
            <button class="btn sm excel-import">${t("btnImportExcel")}</button>
          </div>
        </div>
        <div class="cg">
          <h4>${t("toolsEvb")}</h4>
          <span class="help-tip">${t("descEvb")}</span>
          <div class="tools-grid">
            <button class="btn sm evb-extract">${t("btnUnpackEvb")}</button>
          </div>
        </div>
        <div class="cg">
          <h4>${t("cfgDiagnostics")}</h4>
          <div class="cg-body">
            <div class="ci"><label>${t("cfgTest")}</label><button id="testTr" class="btn sm">${t("cfgTest")}</button></div>
            <div class="ci"><label>${t("cfgTestRes")}</label><span id="testTrRes" style="font-size:10px;color:var(--txt3)">-</span></div>
          </div>
        </div>
        <div class="cg">
          <h4>${t("cfgCache")}</h4>
          <div class="cg-body">
            <div class="ci">
              <label>${t("cfgClearHistory")}</label>
              <button id="clearGlobalCache" class="btn sm" style="background:#e03131;color:#fff;border-color:#c92a2a">${t("btnClearHistory")}</button>
            </div>
          </div>
        </div>
      </div>

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
            <div class="cg" style="margin-bottom:0">
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
            
            <div class="cg" style="margin-bottom:0">
              <h4>${t("cheatBattleGodMode")}</h4>
              <div class="cg-body" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px">
                <button id="cheatGodHP" class="btn sm">${t("cheatInfiniteHPLabel")} [OFF]</button>
                <button id="cheatGodMP" class="btn sm">${t("cheatInfiniteMPLabel")} [OFF]</button>
                <button id="cheatInstaWin" class="btn sm pri">${t("cheatInstaWin")}</button>
                <button id="cheatInstaKill" class="btn sm dgr">${t("cheatInstaKill")}</button>
              </div>
            </div>
            
            <div class="cg" style="margin-bottom:0">
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
    for (const k of S.gameKeys) {
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
      const eng = ca.engine || "mz";
      const ei = engineInfo(eng);
      const engLabel = ei.label || eng;
      const engIcon = ei.icon || "";
      const launched = S.launchedKey === k;
      const playBtn = launched
        ? '<span style="color:var(--green);font-size:10px;padding:0 6px">\u25b6 Running</span>'
        : '<button class="btn xs glPlay">\u25b6</button>';
      const title = lc.title || (exe ? basename(exe) : "") || k;
      html +=
        '<div class="gc' +
        (launched ? " launched" : "") +
        '" data-key="' +
        k +
        '"><div class="gi"><div class="gt">' +
        esc(title) +
        '</div><div class="gs">' +
        engIcon +
        " " +
        engLabel +
        '</div></div><div class="ga">' +
        playBtn +
        '<button class="btn xs glEdit">\u270e</button><button class="btn xs dgr glDel">\u2715</button></div></div>';
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
    const curEng = ca.engine || "mz";
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
          <button id="mBrowse" class="btn sm">...</button>
        </div>
      </div>
    </div>
    <div class="mc2">
      <div class="f"><label>${t("tags")}</label><input id="mTags" value="${esc(tags)}" placeholder="Separated by comma"></div>
      <div class="f"><label>${t("note")}</label><textarea id="mNote" rows="2" style="resize:vertical;padding:3px 5px;background:var(--bg2);border:1px solid var(--bd);color:var(--txt);border-radius:3px;font-size:10px;font-family:var(--font)">${esc(lc.note || "")}</textarea></div>
      <div class="fi"><label>${t("engineLabel")}:</label><span class="fv">${ei.icon || ""} ${ei.label || curEng} ${ei.js ? "(JS)" : (curEng === "python" || curEng === "renpy" ? "(Suportado)" : "(Nativo)")}</span></div>
      <div class="fi"><label>${t("lastLaunch")}:</label><span class="fv">${esc(lastLaunch)}</span></div>
      <div class="fi"><label>${t("firstLaunch")}:</label><span class="fv">${esc(firstLaunch)}</span></div>
      <div class="fi"><label>${t("keyLabel")}:</label><span class="fv" style="font-size:9px;color:var(--txt3)">${esc(key || "-")}</span></div>
    </div>
  </div>
  <div class="fb" style="display:flex;flex-wrap:wrap;justify-content:space-between;width:100%;gap:10px">
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      <button id="mPreTranslate" class="btn sm pri">${t("mPreTranslate") || "Translate Files 🌐"}</button>
      <button id="mRestoreBackup" class="btn sm">${t("mRestoreBackup") || "Restore Original 🔄"}</button>
      <button id="mDecryptImages" class="btn sm">${t("extractImages") || "Extract Images 📷"}</button>
      <button id="mDecryptAudio" class="btn sm">${t("extractAudio") || "Extract Audio 🎵"}</button>
      <button id="mPatchFonts" class="btn sm">${t("patchFonts") || "Patch Fonts PT-BR 🔤"}</button>
      <button id="mUnpackAll" class="btn sm" style="background:var(--accent);color:#fff" title="Descompactar 100% dos arquivos (.rpa, mídias e scripts) para uma pasta">Descompactar Tudo 📦</button>
      <button id="mDelCache" class="btn sm dgr">${t("deleteCache") || "Delete Cache"}</button>
      <button id="mExportCache" class="btn sm">${t("exportTexts") || "Export Texts"}</button>
    </div>
    <div style="display:flex;gap:4px">
      <button id="mCancel" class="btn">${t("btnCancel") || "Cancel"}</button><button id="mSave" class="btn pri">${t("btnSave") || "Save"}</button>
    </div>
  </div>
</div>`;
    m.classList.add("on");
    m.dataset.key = key || "";

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
        <div style="font-size: 16px; font-weight: 600; letter-spacing: 0.5px; color: var(--accent);">Pré-traduzindo arquivos do jogo...</div>
        <div style="width: 320px; text-align: center;">
          <progress id="translateProgress" max="100" value="0" style="
            width: 100%; height: 8px; border-radius: 4px; overflow: hidden;
            border: none; background: var(--bg5);
          "></progress>
          <style>
            #translateProgress::-webkit-progress-bar { background: var(--bg5); border-radius: 4px; }
            #translateProgress::-webkit-progress-value { background: linear-gradient(90deg, var(--accent), var(--green)); border-radius: 4px; box-shadow: 0 0 8px var(--accent); }
          </style>
          <div id="translateProgressMsg" style="font-size: 11px; color: var(--txt2); margin-top: 8px;">Iniciando extrator...</div>
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
          log("success", "Tradução offline concluída com sucesso!");
          alert("Sucesso! Arquivos de dados traduzidos com sucesso.");
        } else {
          log(
            "error",
            "Falha na tradução: " + (r.error || "erro desconhecido"),
          );
          alert("Falha na tradução: " + (r.error || "erro desconhecido"));
        }
      } catch (e) {
        if (document.body.contains(progressOverlay)) {
          document.body.removeChild(progressOverlay);
        }
        log("error", "Erro na tradução: " + e.message);
        alert("Erro na tradução: " + e.message);
      } finally {
        btn.disabled = false;
      }
    });

    $("mRestoreBackup")?.addEventListener("click", async () => {
      if (
        await customConfirm(
          'Tem certeza que deseja restaurar a versão original do jogo? Isso reverterá todos os arquivos traduzidos na pasta "data/" e "plugins.js" para o backup original.',
        )
      ) {
        const btn = $("mRestoreBackup");
        const origText = btn.textContent;
        btn.textContent = "Restaurando... ⏳";
        btn.disabled = true;
        try {
          const r = await rpc("restoreOriginalData", { gameKey: key });
          if (r && r.ok !== false) {
            log("success", "Backup original restaurado com sucesso!");
            alert("Sucesso! Arquivos originais restaurados com sucesso.");
          } else {
            log(
              "error",
              "Falha ao restaurar: " + (r.error || "erro desconhecido"),
            );
            alert("Falha ao restaurar: " + (r.error || "erro desconhecido"));
          }
        } catch (e) {
          log("error", "Erro ao restaurar original: " + e.message);
          alert("Erro ao restaurar: " + e.message);
        } finally {
          btn.textContent = origText;
          btn.disabled = false;
        }
      }
    });

    $("mUnpackAll")?.addEventListener("click", async () => {
      let folderPath = "";
      try {
        const folderRes = await rpc("selectFolder", { title: "Selecione a pasta onde deseja salvar a descompactação total do jogo" });
        if (folderRes && folderRes.ok && folderRes.folderPath) {
          folderPath = folderRes.folderPath;
        }
      } catch (err) { console.warn(`app.js: ${err.message}`); }

      if (!folderPath) {
        const userChoice = prompt("Digite o caminho da pasta onde deseja descompactar 100% dos arquivos:", "C:\\Users\\Public\\Documents\\Descompactado");
        if (userChoice && userChoice.trim()) {
          folderPath = userChoice.trim();
        }
      }

      if (!folderPath) return;

      const btn = $("mUnpackAll");
      const origText = btn ? btn.textContent : "Descompactar Tudo 📦";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Descompactando... ⏳";
      }

      log("info", "📦 Iniciando descompactação total para: " + folderPath);
      try {
        const res = await rpc("unpackRenpyFull", { key, targetDir: folderPath });
        if (res && res.ok) {
          log("success", "✅ Descompactação total concluída! Todos os arquivos salvos em: " + res.outDir);
          alert("Sucesso! Todos os arquivos do jogo foram descompactados em:\n" + res.outDir);
        } else {
          log("error", "Falha na descompactação: " + (res?.error || "Erro desconhecido"));
          alert("Falha na descompactação: " + (res?.error || "Erro desconhecido"));
        }
      } catch (err) {
        log("error", "Erro ao descompactar: " + err.message);
        alert("Erro ao descompactar: " + err.message);
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
          "Tem certeza que deseja deletar o cache de tradução deste jogo? A próxima inicialização irá traduzi-lo do zero.",
        )
      ) {
        const r = await rpc("deleteGameCache", { gameKey: key });
        if (r && r.ok !== false) {
          log("success", "Cache de tradução deletado com sucesso!");
        } else {
          log(
            "error",
            "Falha ao deletar cache: " + (r.error || "erro desconhecido"),
          );
        }
      }
    });
    $("mExportCache")?.addEventListener("click", async () => {
      const r = await rpc("exportGameTexts", { gameKey: key });
      if (r && r.ok !== false) {
        log(
          "success",
          "Traduções exportadas para a Área de Trabalho: " + r.path,
        );
      } else {
        log(
          "error",
          "Falha ao exportar: " + (r.error || "sem cache para exportar"),
        );
      }
    });
    $("mDecryptImages")?.addEventListener("click", async () => {
      const destDir = prompt(
        "Digite o caminho completo da pasta para onde deseja exportar as imagens:\n(Exemplo: C:\\Users\\Teste\\Desktop\\ImagensJogo)",
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
          log(
            "success",
            `Imagens exportadas e descriptografadas com sucesso para: ${destDir} (${r.count} imagens)`,
          );
          alert(
            `Sucesso! ${r.count} imagens extraídas/descriptografadas para:\n${destDir}`,
          );
        } else {
          log(
            "error",
            "Falha ao extrair imagens: " + (r.error || "erro desconhecido"),
          );
          alert("Erro ao extrair imagens: " + (r.error || "erro desconhecido"));
        }
      } catch (e) {
        log("error", "Erro ao extrair imagens: " + e.message);
        alert("Erro ao extrair imagens: " + e.message);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    });

    $("mDecryptAudio")?.addEventListener("click", async () => {
      const destDir = prompt(
        "Digite o caminho completo da pasta para onde deseja exportar os áudios:\n(Exemplo: C:\\Users\\Teste\\Desktop\\AudiosJogo)",
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
          log(
            "success",
            `Áudios exportados e descriptografados com sucesso para: ${destDir} (${r.count} áudios)`,
          );
          alert(
            `Sucesso! ${r.count} áudios extraídos/descriptografados para:\n${destDir}`,
          );
        } else {
          log(
            "error",
            "Falha ao extrair áudios: " + (r.error || "erro desconhecido"),
          );
          alert("Erro ao extrair áudios: " + (r.error || "erro desconhecido"));
        }
      } catch (e) {
        log("error", "Erro ao extrair áudios: " + e.message);
        alert("Erro ao extrair áudios: " + e.message);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    });

    $("mPatchFonts")?.addEventListener("click", async () => {
      if (
        await customConfirm(
          "Deseja aplicar o patch de fontes para português? Isso copiará uma fonte moderna compatível com acentos (ç, á, é, ã) e configurará o jogo para usá-la.",
        )
      ) {
        const btn = $("mPatchFonts");
        const origText = btn.textContent;
        btn.textContent = "Aplicando... ⏳";
        btn.disabled = true;
        try {
          const r = await rpc("patchGameFont", { gameKey: key });
          if (r && r.ok !== false) {
            log("success", "Patch de fontes aplicado com sucesso!");
            alert(
              "Sucesso! O patch de fontes para suporte a PT-BR foi aplicado com sucesso.",
            );
          } else {
            log(
              "error",
              "Falha ao aplicar patch de fontes: " +
                (r.error || "erro desconhecido"),
            );
            alert(
              "Falha ao aplicar patch: " + (r.error || "erro desconhecido"),
            );
          }
        } catch (e) {
          log("error", "Erro no patch de fontes: " + e.message);
          alert("Erro no patch de fontes: " + e.message);
        } finally {
          btn.textContent = origText;
          btn.disabled = false;
        }
      }
    });
    $("mCancel").addEventListener("click", () => m.classList.remove("on"));
    $("mSave").addEventListener("click", async () => {
      const k = m.dataset.key || "g_" + Date.now();
      const exeVal = $("mExe").value;
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
    $("mBrowse").addEventListener("click", () => {
      log(
        "info",
        "Type or paste the full EXE path (e.g. C:\\Games\\Game\\Game.exe)",
      );
      $("mExe").select();
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
            'T\u00edtulo traduzido: "' +
              title.substring(0, 20) +
              '" -> "' +
              r.substring(0, 20) +
              '"',
          );
        } else
          log(
            "warn",
            "T\u00edtulo retornou igual (pode ser que n\u00e3o precise tradu\u00e7\u00e3o)",
          );
      } catch (e) {
        log("error", "Falha ao traduzir t\u00edtulo: " + e.message);
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
  $("glSearch")?.addEventListener("input", renderGames);
  $("glRefresh")?.addEventListener("click", async () => {
    await loadGames();
    renderGames();
  });

  // ==================== CONFIG ====================
  $("cfgAppLang")?.addEventListener("change", async function () {
    _lang = this.value;
    S.cfg.lang = this.value;
    window.isReloading = true;
    try {
      await saveCfg();
      location.reload();
    } catch (e) {
      showToast("Erro ao alterar idioma: " + (e.message || e), "error");
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
  $("cfgLlmApiKey")?.addEventListener("change", saveCfg);
  $("cfgLlmModel")?.addEventListener("change", saveCfg);
  $("cfgLlmBaseUrl")?.addEventListener("change", saveCfg);
  $("cfgLlmPrompt")?.addEventListener("change", saveCfg);
  $("cfgDeeplApiKey")?.addEventListener("change", saveCfg);
  $("cfgDeeplUseFree")?.addEventListener("change", saveCfg);
  $("cfgWordWrapLimit")?.addEventListener("change", saveCfg);
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
        "Caminho para o executável do jogo (.exe), pasta de dados ou arquivo .wolf:",
        exe,
      );
      if (!gamePath) return;
      log("info", "Extraindo jogo Wolf com UberWolfCli...");
      try {
        const r = await rpc("extractWolf", { gamePath });
        if (r.ok === false)
          log(
            "error",
            "Falha ao extrair Wolf: " + (r.error || "erro desconhecido"),
          );
        else log("success", "Jogo Wolf extraído com sucesso!");
      } catch (e) {
        log("error", "Erro ao extrair Wolf: " + e.message);
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
        "Selecione o índice da versão do Wolf RPG (0 a 10) [Padrão: 4 para v3.00]:",
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
            "Falha ao empacotar Wolf: " + (r.error || "erro desconhecido"),
          );
        else log("success", "Pasta empacotada no formato Wolf com sucesso!");
      } catch (e) {
        log("error", "Erro ao empacotar Wolf: " + e.message);
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
      showToast("Instalando overlay de tradução...", "info");
      try {
        const r = await rpc("installOverlay", { gameKey: key });
        if (r.ok === false) {
          log("error", "Overlay install failed: " + (r.error || "unknown"));
          showToast(
            "Falha ao instalar overlay: " + (r.error || "erro desconhecido"),
            "error",
          );
        } else {
          log("success", "RPG Maker overlay installed");
          showToast(
            "Overlay do RPG Maker instalado com sucesso! 🎮",
            "success",
          );
        }
      } catch (e) {
        log("error", "Overlay install error: " + e.message);
        showToast("Erro ao instalar overlay: " + e.message, "error");
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
      log("info", "Gerando planilha Excel de traduções...");
      showToast("Exportando strings de tradução para planilha...", "info");
      try {
        const r = await rpc("exportExcel", { gameKey: key });
        if (r.ok === false) {
          log(
            "error",
            "Falha ao exportar Excel: " + (r.error || "erro desconhecido"),
          );
          showToast(
            "Falha ao exportar Excel: " + (r.error || "erro desconhecido"),
            "error",
          );
        } else {
          log("success", "Planilha Excel criada na sua Área de Trabalho!");
          showToast(
            "Planilha Excel criada com sucesso na Área de Trabalho! 📊",
            "success",
          );
        }
      } catch (e) {
        log("error", "Erro ao exportar Excel: " + e.message);
        showToast("Erro ao exportar Excel: " + e.message, "error");
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
        "Caminho absoluto para o arquivo Excel (.xlsx) de tradução:",
      );
      if (!excelPath) {
        showToast("Importação cancelada. Nenhum caminho foi inserido.", "info");
        return;
      }
      log("info", "Importando traduções do Excel...");
      showToast("Importando e mesclando traduções do Excel...", "info");
      try {
        const r = await rpc("importExcel", { gameKey: key, excelPath });
        if (r.ok === false) {
          log(
            "error",
            "Falha ao importar Excel: " + (r.error || "erro desconhecido"),
          );
          showToast(
            "Falha ao importar Excel: " + (r.error || "erro desconhecido"),
            "error",
          );
        } else {
          log(
            "success",
            `Importação concluída! ${r.count} traduções mescladas no cache.`,
          );
          showToast(
            `Sucesso! ${r.count} traduções mescladas de volta no cache. 📥`,
            "success",
          );
        }
      } catch (e) {
        log("error", "Erro ao importar Excel: " + e.message);
        showToast("Erro ao importar Excel: " + e.message, "error");
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
        "Caminho da pasta para onde deseja extrair os arquivos:",
        exePath.substring(0, exePath.lastIndexOf(".")) + "_extracted",
      );
      if (destDir === null) return;

      log("info", "Extraindo executavel EVB...");
      showToast("Extraindo arquivos do Enigma Virtual Box...", "info");
      try {
        const r = await rpc("unpackEvb", { exePath, destDir });
        if (r.ok === false) {
          log(
            "error",
            "Falha ao descompactar EVB: " + (r.error || "erro desconhecido"),
          );
          showToast(
            "Falha ao extrair EVB: " + (r.error || "erro desconhecido"),
            "error",
          );
        } else {
          log("success", "Executavel EVB extraido com sucesso para: " + r.path);
          showToast("Executável EVB extraído com sucesso! 📦", "success");
        }
      } catch (e) {
        log("error", "Erro ao extrair EVB: " + e.message);
        showToast("Erro ao extrair EVB: " + e.message, "error");
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
          e.className = "le l" + (l.level ? l.level[0] : "i");
          e.innerHTML =
            '<span class="lt">[' +
            l.ts +
            ']</span> <span class="ll">[' +
            lvlText +
            ']</span><span class="lo">' +
            originText +
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
    { id: "victory", label: "Vitória Instantânea" },
    { id: "defeat", label: "Derrota Forçada" },
    { id: "escape", label: "Fuga" },
    { id: "groupHp1", label: "Grupo HP = 1" },
    { id: "groupHpMax", label: "Grupo HP = Max" },
    { id: "groupRecover", label: "Recuperar Grupo" },
    { id: "enemyHp1", label: "Inimigo HP = 1" },
    { id: "enemyHp0", label: "Inimigo HP = 0" },
    { id: "enemyHpMax", label: "Inimigo HP = Max" },
    { id: "skipMsg", label: "Acelerar Diálogo (segurar)" },
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

      const battleGroup = document.querySelector("#cheat-sec-geral .cg:nth-child(2)");
      if (battleGroup) battleGroup.style.display = isRenPy ? "none" : "block";

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
          const hpPct = Math.round((a.hp / a.mhp) * 100) || 0;
          const mpPct = Math.round((a.mp / a.mmp) * 100) || 0;
          html += `
            <div style="background:var(--bg4);border:1px solid var(--bd);padding:10px;border-radius:4px;font-size:10px;margin-bottom:4px">
              <div style="font-weight:600;color:var(--accent);margin-bottom:6px;font-size:11px">${esc(a.name)} (${t("level")} ${a.level})</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <!-- HP Row -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <span style="font-weight:bold;color:var(--txt2);flex:1">HP: ${a.hp} / ${a.mhp} (${hpPct}%)</span>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input class="actor-hp-input" data-idx="${a.idx}" type="number" style="width:60px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${a.hp}">
                    <button class="actor-hp-btn btn sm" data-idx="${a.idx}" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
                  </div>
                </div>
                <!-- MP Row -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <span style="font-weight:bold;color:var(--txt2);flex:1">MP: ${a.mp} / ${a.mmp} (${mpPct}%)</span>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input class="actor-mp-input" data-idx="${a.idx}" type="number" style="width:60px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${a.mp}">
                    <button class="actor-mp-btn btn sm" data-idx="${a.idx}" style="padding:2px 6px;font-size:9px">${t("cheatSetBtn")}</button>
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
        let optionsHtml =
          '<option value="">' + t("cheatSelectItemPlaceholder") + "</option>";
        state.allDbItems.forEach((item) => {
          const typeStr = t(item.type);
          optionsHtml += `<option value="${item.type}:${item.id}">[${typeStr}] ${esc(item.name)}</option>`;
        });
        sel.innerHTML = optionsHtml;
      }

      const invList = $("cheat-inventory-list");
      if (invList && state.ownedItems) {
        const query = ($("cheatInvSearch")?.value || "").toLowerCase();
        let html = "";
        state.ownedItems.forEach((item) => {
          if (query && !item.name.toLowerCase().includes(query)) return;
          const typeStr = t(item.type);
          html += `
            <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <div>
                <span style="font-weight:600;color:var(--accent)">[${typeStr}]</span>
                <span style="color:var(--txt2);margin-left:4px">${esc(item.name)}</span>
              </div>
              <div style="display:flex;gap:4px;align-items:center">
                <span style="font-weight:bold;margin-right:6px">Qtd: ${item.count}</span>
                <button class="inv-adjust-btn btn sm" data-type="${item.type}" data-id="${item.id}" data-amount="-1" style="padding:1px 5px;font-size:9px">-1</button>
                <button class="inv-adjust-btn btn sm" data-type="${item.type}" data-id="${item.id}" data-amount="1" style="padding:1px 5px;font-size:9px">+1</button>
                <button class="inv-remove-btn btn sm dgr" data-type="${item.type}" data-id="${item.id}" data-count="${item.count}" style="padding:1px 5px;font-size:9px">X</button>
              </div>
            </div>
          `;
        });
        if (!html) {
          html =
            '<div style="text-align:center;padding:12px;color:var(--txt3);font-size:10px">Nenhum item encontrado.</div>';
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
      container.innerHTML = '<div style="text-align: center; color: var(--txt3); font-size: 10px;">Clique em "Scan Variables" para ler a memória do renpy.store</div>';
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
        html += `
          <div style="background:var(--bg4);border:1px solid var(--bd);padding:6px 10px;border-radius:4px;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <span style="font-weight:600;color:var(--accent)">${vKey} <span style="color:var(--txt3);font-weight:normal">(stat = ${v.value})</span></span>
            <div style="display:flex;gap:4px;align-items:center">
              <input class="renpy-var-input" data-key="${vKey}" type="number" style="width:80px;padding:2px 4px;font-size:9px;background:var(--bg);color:var(--txt);border:1px solid var(--bd);border-radius:3px" value="${v.value}">
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
      html = '<div style="text-align:center;padding:12px;color:var(--txt3);font-size:10px">Nenhuma variável corresponde ao filtro.</div>';
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

    if (target.id === "cheatRenpyScanBtn") {
      const res = await rpc("scanGameVariables");
      if (res && res.ok && res.variables) {
        latestRenpyVariables = res.variables;
        renderRenpyVariables(latestRenpyVariables);
        log("success", `[Ren'Py Memory Scanner] Mapeadas ${res.variables.length} variáveis do renpy.store com sucesso!`);
      } else {
        log("warn", "Aguardando sincronização com a memória do Ren'Py...");
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
        log("success", "Definido Ouro/Moedas para: " + val);
      }
    }

    if (target.id === "cheatGodHP") {
      godHPActive = !godHPActive;
      await rpc("sendCheatCommand", { code: "window.godHP = " + godHPActive });
      log("info", "Vida Infinita (God HP) set to: " + godHPActive);
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
      log("success", "Vitória Instantânea ativada!");
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
        navigator.sendBeacon("/api/close_app", JSON.stringify({ close: true }));
      } catch (e) { console.warn(`app.js: ${e.message}`); }
    }
  });
})();
