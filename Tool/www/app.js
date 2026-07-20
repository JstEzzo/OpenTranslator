(async function () {
  "use strict";

  window.addEventListener("beforeunload", () => {
    try {
      navigator.sendBeacon("/api/shutdown");
    } catch (e) {}
  });

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
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border-color: rgba(255, 255, 255, 0.06) !important;
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

  // ==================== LANGUAGE CODES ====================
  const LANGS = {
    auto: "Auto Detect",
    ja: "Japanese",
    en: "English",
    zh: "Chinese",
    ko: "Korean",
    pt: "Portuguese",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    ru: "Russian",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    tl: "Filipino",
  };

  // ==================== I18N ====================
  const LANG = {
    en: {
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
      btnPackRpa: "Pack RPA",
      btnDecompileRpyc: "Decompile .rpyc",
      btnInstallUnity: "Install XUnity + Plugin",
      btnInstallOverlay: "Install RPG Maker Overlay",
      btnExtractWolf: "Extract Wolf Game",
      btnPackWolf: "Pack Wolf Directory",
      btnExportExcel: "Export to Excel (.xlsx) 📊",
      btnImportExcel: "Import from Excel (.xlsx) 📥",
      toolsRenpy: "Ren'Py Tools",
      toolsUnity: "Unity Tools",
      toolsRpgm: "RPG Maker Tools",
      toolsWolf: "Wolf RPG Tools",
      descRenpy:
        "Extract assets (.rpa) and decompile scripts of games made on the Ren'Py engine.",
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
      tabGames: "Jogos",
      tabSaves: "Saves",
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
      uiSaves: "Saves",
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
      btnExtractRpa: "Extrair RPA",
      btnPackRpa: "Empacotar RPA",
      btnDecompileRpyc: "Descompilar .rpyc",
      btnInstallUnity: "Instalar XUnity + Plugin",
      btnInstallOverlay: "Instalar Overlay RPG Maker",
      btnExtractWolf: "Extrair Jogo Wolf",
      btnPackWolf: "Empacotar Pasta Wolf",
      btnExportExcel: "Exportar para Excel (.xlsx) 📊",
      btnImportExcel: "Importar do Excel (.xlsx) 📥",
      toolsRenpy: "Ferramentas Ren'Py",
      toolsUnity: "Ferramentas Unity",
      toolsRpgm: "Ferramentas RPG Maker",
      toolsWolf: "Ferramentas Wolf RPG",
      descRenpy:
        "Extraia assets (.rpa) e descompile scripts de jogos feitos na engine Ren'Py.",
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

  async function launchGame(key) {
    const g = S.games[key];
    if (!g) return;
    if (S.launchedKey || S.isLaunching) {
      log("warn", "A game is already running or launch is in progress");
      return;
    }
    S.isLaunching = true;
    const ld = $("gl-loading"),
      lm = $("gl-loading-msg");
    if (ld) ld.style.display = "block";
    let loadingVisible = true;
    const engName = ENG_NAMES[S.cfg.engine || "google"] || "Google";
    const steps = [
      [0, "Backing up data..."],
      [5000, "Reading game texts..."],
      [12000, "Translating via " + engName + "..."],
      [25000, "Still translating (" + engName + ")..."],
      [45000, "Applying translations..."],
      [60000, "Launching game..."],
    ];
    steps.forEach(([d, m]) =>
      setTimeout(() => {
        if (loadingVisible && lm) lm.textContent = m;
      }, d),
    );
    const title = g.libConf?.title || key;
    log("info", "Launching game: " + title);
    try {
      const r = await rpc("launchGame", { key });
      loadingVisible = false;
      if (ld) ld.style.display = "none";
      if (r && r.ok === false) {
        log("error", "Launch failed: " + (r.error || "unknown"));
        return;
      }
      S.launchedKey = key;
      renderGames();
      log("info", "Game launched PID: " + r.pid);
    } catch (e) {
      loadingVisible = false;
      if (ld) ld.style.display = "none";
      log("error", "Launch failed: " + e.message);
    } finally {
      S.isLaunching = false;
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
    } catch (e) {}
  }
  async function delGame(key) {
    try {
      await rpc("delGame", { key });
      delete S.games[key];
      S.gameKeys = S.gameKeys.filter((k) => k !== key);
    } catch (e) {}
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
    srpg: { label: "SRPG Studio", js: false, icon: "\u2694" },
    agtk: { label: "Action Game Toolkit", js: false, icon: "\ud83c\udff0" },
    kmy: { label: "KMY", js: false, icon: "\ud83d\udd2e" },
    bakin: { label: "Bakin", js: false, icon: "\ud83c\udfad" },
    tyrano: { label: "TyranoScript", js: true, icon: "\ud83d\udcdd" },
    renpy: { label: "Ren'Py (JS)", js: true, icon: "\ud83d\udc0d" },
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
    } catch (e) {}
    const st = document.createElement("style");
    st.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
@font-face{font-family:'NotoSansCJK';src:url('NotoSans/cjk/NotoSansCJKsc-Regular.otf') format('opentype');font-weight:400;font-style:normal}
@font-face{font-family:'Noto Emoji';src:url('NotoSans/emoji/NotoColorEmoji-Regular.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'Unifont Smooth';src:url('unifont-all.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenT PGMMV';src:url('../loaders/opent_PGMMV_font.ttf') format('truetype');font-weight:400;font-style:normal}
@font-face{font-family:'OpenT RenPy';src:url('../loaders/opent_renpy_font.ttf') format('truetype');font-weight:400;font-style:normal}
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
  --fontGame:'Unifont Smooth','NotoSansCJK','Noto Emoji','OpenT PGMMV','OpenT RenPy',sans-serif;
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
        <div id="gl-loading" style="display:none;text-align:center;padding:20px;color:var(--txt2)">
          <div style="font-size:24px;margin-bottom:8px;animation:spin 1s linear infinite">\u27f3</div>
          <div id="gl-loading-msg" style="font-size:11px">Preparing game...</div>
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
          <h4>${t("toolsRenpy")}</h4>
          <span class="help-tip">${t("descRenpy")}</span>
          <div class="tools-grid">
            <button class="btn sm rpa-extract">${t("btnExtractRpa")}</button>
            <button class="btn sm rpa-pack">${t("btnPackRpa")}</button>
            <button class="btn sm rpyc-decompile">${t("btnDecompileRpyc")}</button>
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
        } catch (er) {}
      }
      if (!exePath.includes("\\") && !exePath.includes("/")) {
        try {
          const txt = e.dataTransfer.getData("text/plain");
          if (txt && validExts.some((ext) => txt.toLowerCase().includes(ext)))
            exePath = txt.trim();
        } catch (er) {}
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
      } catch (e) {}
    }
    if (isFullPath && exePath.toLowerCase().endsWith(".lnk")) {
      try {
        const resolved = await rpc("resolveShortcut", {
          shortcutPath: exePath,
        });
        if (resolved && resolved !== exePath) {
          exePath = resolved;
        }
      } catch (e) {}
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
    const eng = isFullPath ? await rpc("detectEngine", { exePath }) : "mz";
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
    qsa(".glPlay").forEach((b) => {
      b.onclick = function (e) {
        e.stopPropagation();
        const c = this.closest(".gc");
        if (c) launchGame(c.dataset.key);
      };
    });
    qsa(".glEdit").forEach((b) => {
      b.onclick = function (e) {
        e.stopPropagation();
        const c = this.closest(".gc");
        if (c) openEdit(c.dataset.key);
      };
    });
    qsa(".glDel").forEach((b) => {
      b.onclick = async function (e) {
        e.stopPropagation();
        const c = this.closest(".gc");
        if (c && (await customConfirm(t("deleteConfirm")))) {
          await delGame(c.dataset.key);
          renderGames();
        }
      };
    });
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
      <div class="fi"><label>${t("engineLabel")}:</label><span class="fv">${ei.icon || ""} ${ei.label || curEng} ${ei.js ? "(JS)" : "(unsupported)"}</span></div>
      <div class="fi"><label>${t("lastLaunch")}:</label><span class="fv">${esc(lastLaunch)}</span></div>
      <div class="fi"><label>${t("firstLaunch")}:</label><span class="fv">${esc(firstLaunch)}</span></div>
      <div class="fi"><label>${t("keyLabel")}:</label><span class="fv" style="font-size:9px;color:var(--txt3)">${esc(key || "-")}</span></div>
    </div>
  </div>
  <div class="fb" style="display:flex;flex-wrap:wrap;justify-content:space-between;width:100%;gap:10px">
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      <button id="mPreTranslate" class="btn sm pri">${t("mPreTranslate")}</button>
      <button id="mRestoreBackup" class="btn sm">${t("mRestoreBackup")}</button>
      <button id="mDecryptImages" class="btn sm">${t("extractImages")}</button>
      <button id="mDecryptAudio" class="btn sm">${t("extractAudio")}</button>
      <button id="mPatchFonts" class="btn sm">${t("patchFonts")}</button>
      <button id="mDelCache" class="btn sm dgr">${t("deleteCache")}</button>
      <button id="mExportCache" class="btn sm">${t("exportTexts")}</button>
    </div>
    <div style="display:flex;gap:4px">
      <button id="mCancel" class="btn">${t("btnCancel")}</button><button id="mSave" class="btn pri">${t("btnSave")}</button>
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
          } catch (e) {}
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
      const meng = exeVal
        ? await rpc("detectEngine", { exePath: exeVal })
        : "mz";
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
      } catch (e) {}
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
        } catch (e) {}
      }),
    );
  }
  // Open saves directory in Explorer for selected game
  $("svOpenDir")?.addEventListener("click", async () => {
    for (const k of S.gameKeys) {
      try {
        await rpc("openSaveFolder", { gameKey: k });
        break;
      } catch (e) {}
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
    await saveCfg();
    location.reload();
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
    } catch (e) {}
    document.body.removeChild(ta);
  });

  // ==================== KEYBOARD ====================
  document.addEventListener("keydown", function (e) {
    if (e.key === "F12") {
      /* browser handles devtools natively */
    }
    if (e.key === "Escape") {
      const m = $("modal");
      if (m) m.classList.remove("on");
    }
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      if ($("lb")) $("lb").innerHTML = "";
    }
    if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      location.reload();
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
          const e = document.createElement("div");
          e.className = "le l" + l.level[0];
          e.innerHTML =
            '<span class="lt">[' +
            l.ts +
            ']</span><span class="lm">' +
            esc(l.message) +
            "</span>";
          b.appendChild(e);
        }
        b.scrollTop = b.scrollHeight;
      }
    } catch (e) {}
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
      log("warn", "Poll error: " + e.message);
    }
  }, 3000);

  let godHPActive = false;
  let godMPActive = false;
  let lastGold = 0;
  let currentSubTab = "geral";
  let lastThroughInteraction = 0;
  let lastNoEncounterInteraction = 0;

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
    } catch (e) {}
  }, 500);

  document.addEventListener("click", async (e) => {
    const target = e.target;

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
        await rpc("sendCheatCommand", { code: "$gameParty._gold = " + val });
        log("success", "Definido ouro do grupo para: " + val);
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
  });
})();
