# OpenTranslator — Technical Analysis

## 1. Linguagem & Runtime

| Layer | Tecnologia |
|-------|------------|
| **Backend principal** | Node.js ≥ 18 (CommonJS, `require`) |
| **Sidecar Python** | Ren'Py utilities (`unrpyc.py`, `rpatool.py`) |
| **Frontend** | Vanilla JS (ES6, sem framework) servido como SPA embutido |
| **Banco de dados** | SQLite 3 (`better-sqlite3`) — cache global |
| **Dependências Node** | `better-sqlite3`, `exceljs`, `ws` (WebSocket) |
| **Arquitetura** | Desktop-style: `server.js` → HTTP:8080 + WS hook:16005 |

## 2. Estrutura de Pastas

```
OpenTranslator/
├── OpenTranslator.bat              ← Launcher silencioso (auto-download Node portátil)
├── OpenTranslator_debug.bat
├── README.md
├── AGENTS.md                       ← Instruções Multi-IA
├── Tool/                           ← Núcleo da aplicação
│   ├── server.js                   ← Entry-point Node.js (globals, logger, servers)
│   ├── package.json                ← { "name": "OpenTranslator", deps: better-sqlite3, exceljs, ws }
│   ├── open_translator.py          ← Motor agregador paralelo (32 threads) — mencionado no README
│   ├── src/
│   │   ├── logger.js               ← Bridge para loggerManager
│   │   ├── loggerManager.js        ← Sistema de logs (circular buffer + file)
│   │   ├── cache.js                ← SQLite global_cache.db, glossary, config, common_translations
│   │   ├── extractor.js            ← TextExtractor (ES6): extrai textos de JSON, plugins.js, CSV, HTML
│   │   ├── translator.js           ← Engines de tradução (Google GTX, Bing, Papago, MyMemory, Yandex, DeepL, LLM)
│   │   ├── gameEngine.js           ← Detecta engine, backup/restore, pipeline de tradução
│   │   ├── rpcHandlers.js          ← Handlers RPC expostos ao frontend
│   │   ├── httpServer.js           ← HTTP server:8080, static serving, /api/rpc JSON-RPC
│   │   ├── cheatServer.js          ← Hook server WS:16005 (runtime overlay)
│   │   ├── renpyAppDataResolver.js ← Resolve AppData Ren'Py (Windows/macOS/Linux)
│   │   ├── engines/                ← Handlers por engine
│   │   │   ├── baseEngineHandler.js ← Classe abstrata (extract/injectTranslation/applyFontPatch/cleanup)
│   │   │   ├── renpy/
│   │   │   │   ├── renpyCommon.js   ← Utilitários compartilhados Ren'Py v7/v8
│   │   │   │   ├── renpyV7Handler.js
│   │   │   │   └── renpyV8Handler.js
│   │   │   ├── rpgmaker/
│   │   │   │   ├── rpgMakerMvMzHandler.js
│   │   │   │   └── rpgMakerRubyHandler.js
│   │   │   └── unreal/
│   │   │       └── unrealHandler.js ← Extrai/injeta .locres de .pak files
│   │   ├── test_engines.js         ← Testes de detecção de engine
│   │   └── (2 arquivos ocultos: cli-compat.js, check_damage.js, check_e07.js)
│   ├── www/                        ← Interface web (SPA Glassmorphism)
│   │   ├── index.html
│   │   ├── app.js                  ← Frontend RPC client (~3752 linhas)
│   │   ├── UltraTranslateOverlay.js ← Overlay runtime (injetado via CheatOverlay)
│   │   └── OpenTranslator.png
│   ├── loaders/                    ← DLLs de hook + injetores nativos (.exe/.dll)
│   ├── resources/                  ← Sidecars por engine (UberWolfCli.exe, evb_unpack.py, etc.)
│   ├── unren_tools/                ← Python: unrpyc.py, rpatool.py (Ren'Py/Ren'Py Archive)
│   ├── templates/
│   │   ├── 000_anti_crash.rpy      ← Template de anti-crash para Ren'Py
│   │   └── CheatOverlayTemplate.js ← Template do overlay runtime
│   ├── config/
│   │   └── syntax_rules.json       ← Regras de proteção Ren'Py (DANGER_PREFIXES, COMMON_RENPY_UI_KEYS)
│   ├── data/                       ← Estado runtime
│   │   ├── openT.json              ← Config do usuário (sl/tl/engine/llm/deepl/theme)
│   │   ├── openT.log               ← Log principal
│   │   ├── global_cache.db         ← SQLite: cache global de traduções
│   │   ├── glossary.json           ← Array de { term, translation }
│   │   └── server.pid
│   └── graphify-out/               ← Knowledge graph (AST + análise de código)
├── data/
│   └── global_cache.db             ← Cópia/shadow do cache global
├── graphify-out/                   ← Knowledge graph raiz
└── RPG-Maker-MV-MZ-Cheat-UI-Plugin-1.0.3/  ← UI plugin separado
```

## 3. Arquivos de Entrada/Saída de Tradução

### Entrada — Arquivos de Jogo

| Engine | Arquivos de entrada | Localização |
|--------|-------------------|-------------|
| **RPG Maker MV** | `www/data/*.json` (System.json, Map*.json, etc.) | `<game>/www/data/` |
| **RPG Maker MZ** | `data/*.json` | `<game>/data/` |
| **RPG Maker plugins** | `www/js/plugins.js`, `www/js/plugins/*.js` | `<game>/www/js/` |
| **Ren'Py** | `*.rpy` scripts, `game/` e subpastas | `<game>/game/` |
| **Ren'Py archives** | `*.rpa`, `*.rpyc` | via `unrpyc.py` |
| **RPA archives** | `*.rpa` | via `rpatool.py` |
| **Unreal** | `*.pak` (contêm `.locres`) | `<game>/Content/Paks/` |
| **Wolf RPG** | `game.ini`, `*.wolf` | via `UberWolfCli.exe` |
| **CSV** | `*.csv` (coluna "text") | `<game>/data/` |
| **HTML** | `<title>` de `index.html` | `<game>/www/` |

### Saída — Arquivos Gerados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `<game>/trans_cache.json` | JSON | Cache local por jogo: `{ cfgKey, translations: { "file:keys:original": "traducao" } }` |
| `Tool/data/openT.json` | JSON | Config global do usuário |
| `Tool/data/global_cache.db` | SQLite | Cache global: tabela `global_cache(lang_key, original, translated)` |
| `Tool/data/glossary.json` | JSON | Glossário de termos `{ term, translation }` |
| `Tool/data/common_translations.json` | JSON | Traduções comuns pré-definidas |
| `<Desktop>/*_traducoes.json` | JSON | Exportação manual de cache |
| `<Desktop>/*_traducoes.xlsx` | XLSX | Exportação Excel (colunas: key, original, traducao) |
| `<game>/game/tl/pt_BR/` ou `tl/pt/` | `.rpy` | Arquivos de tradução Ren'Py gerados |
| `<game>_bak_<timestamp>/` | Dir | Backup completo antes de patch |
| `<game>/www/js/plugins/CheatOverlay.js` | JS | Overlay injetado runtime |

### Formato `trans_cache.json`

```json
{
  "cfgKey": "auto|pt|google",
  "translations": {
    "Map001.json:101.4.0:こんにちは": "Olá",
    "System.json:terms:basic:1: sim": "Sim"
  }
}
```

Chave = `arquivo:keys.path:original_text` → valor = tradução.

## 4. Fluxo de Tradução (Pipeline)

### 4.1 Entry-point: `Tool/src/server.js`
Inicializa `global.ROOT`, `DATA_DIR`, `CFG_PATH`, logger, cache SQLite. Inicia:
- `httpServer.js` → escuta porta 8080 (API REST + static serving)
- `cheatServer.js` → WebSocket + HTTP hook server porta 16005

### 4.2 Frontend → Backend (JSON-RPC em `/api/rpc`)
- `www/app.js` chama `rpc(method, params)` → POST `/api/rpc` → `handlers[method](params)`
- Handlers expostos em `src/rpcHandlers.js`

### 4.3 Pipeline de Tradução Offline (`gameEngine.js:executeTranslationPipeline`)

```
[launchGame / translateRpgMaker]
        │
        ├─ 1. restoreOldestBackup(gameDir)     ← restaura backup mais antigo se existir
        ├─ 2. healGameData(gameDir)            ← remove artifacts corrompidos
        ├─ 3. restoreEngineData(gameDir)       ← reescreve dados de engine para JP
        ├─ 4. injectLatinNameInput(gameDir)    ← patch de input Latin no nome do jogo
        │
        ├─ 5. backupGameData(gameDir)          ← cópia recursiva → <data>_bak_<timestamp>
        │
        ├─ 6. extractGameTexts(gameDir)        ← TextExtractor percorre JSONs
        │      └─ 7. extractAllRenpyRpyTexts() ← regex-based extraction de .rpy
        │
        ├─ 8. Cache Lookup (3 níveis, prioridade):
        │      a) trans_cache.json (local, gameKey)
        │      b) global_cache.db  (SQLite, engine-scoped)
        │      c) common_translations.json
        │
        ├─ 9. translateBatch()                 ← API engines restantes
        │      └─ Smart Switching: google→papago→mymemory→bing→yandex
        │         (ban 10min em 429/302, retry com exponential backoff)
        │
        ├─ 10. fs.writeFileSync(cacheFile)     ← salva trans_cache.json
        │
        ├─ 11. patchGameData(gameDir, texts, translations)
        │      ├─ RPG Maker: deep-walk JSON, substitui valores por chave
        │      ├─ Ren'Py: patchRpyFiles() — replace raw string literals
        │      └─ (engine-specific)
        │
        ├─ 12. restoreEngineData(gameDir)      ← pós-tradução: reverte UI commands PT→JP
        │
        └─ 13. Injeta CheatOverlay.js + index.html
```

### 4.4 Tradução em Runtime (Hook)
- **RPG Maker MV/MZ**: `CheatOverlay.js` injetado → overlay JS runtime → WS→16005 → `translateSingle()` on-demand
- **Unity**: `BepInEx` + `UltraBatchEndpoint.dll` → POST `/xbatch` → `translateBatch()`
- **Ren'Py**: DLL hook (`PythonHook.dll`) → intercepta textos → envia para API

### 4.5 Engines de Tradução (translator.js)

| Engine | Endpoint | Auth |
|--------|----------|------|
| **google** (default) | `translate.googleapis.com/translate_a/single?client=gtx` | Nenhuma (scraping) |
| **bing** | `www.bing.com/ttranslatev3` | Token IG/IID (extraído do HTML) |
| **papago** | `papago.naver.com/api/text/translation` | Nenhuma |
| **mymemory** | `api.mymemory.translated.net/get` | Nenhuma |
| **yandex** | `translate.yandex.net/api/v1.5/tr.json/translate` | Dummy key |
| **deepl** | `api.deepl.com/v2/translate` ou `api-free.deepl.com` | `DeepL-Auth-Key` |
| **llm** | Configurável: OpenAI/DeepSeek/Claude/Ollama/local | Bearer key / API key |

### 4.6 Cache de Traduções (3 níveis)

```
Level 1: trans_cache.json (per-game, per-file)
   └─ Key: "arquivo:keys:original" → "traducao"
Level 2: global_cache.db (SQLite, cross-game)
   └─ Table: global_cache(lang_key, original, translated)
   └─ lang_key = "sl|tl|engineType"
Level 3: common_translations.json (pré-definidas)
   └─ Key: "en_pt" / "ja_pt" / "ko_pt" → { "original": "traducao" }
```

Glossary é aplicado pré-tradução: substitui termos antes do dedup/batch.

## 5. Arquivos Mais Relevantes para Entender o Fluxo

| Prioridade | Arquivo | Linhas | Motivo |
|-----------|---------|--------|--------|
| **CRÍTICO** | `Tool/src/gameEngine.js` | 1613 | Pipeline orquestrador (`executeTranslationPipeline` L1381), backup/restore/patchGameData, detectEngine, enginhas |
| **CRÍTICO** | `Tool/src/extractor.js` | 843 | TextExtractor class — extração de textos de JSON, plugins.js, CSV, HTML. Filtros anti-corrução (SKIP_KEYS, jsCode regex) |
| **CRÍTICO** | `Tool/src/translator.js` | 1179 | Todos os engines de API (Google/Bing/Papago/MyMemory/Yandex/DeepL/LLM), smart-switch, rate-limit, batch dedup |
| **CRÍTICO** | `Tool/src/rpcHandlers.js` | 1452 | JSON-RPC handlers expostos ao frontend (launchGame, translate, batchTranslate, exportExcel, importExcel, etc.) |
| **CRÍTICO** | `Tool/src/cache.js` | 228 | SQLite global_cache, glossary I/O, config load/save, common translations |
| **CRÍTICO** | `Tool/src/httpServer.js` | 292 | HTTP:8080, routing /api/rpc, /api/ping, static file serving |
| **CRÍTICO** | `Tool/server.js` | 167 | Entry-point: globals, logger bootstrap, server start, shutdown handler |
| **ALTO** | `Tool/src/utils.js` | 132 | Constantes de filtragem, `isTranslatableText`, `findDataDir`, `lastRealKey` |
| **ALTO** | `Tool/src/engines/renpy/renpyCommon.js` | 417 | Extração regex de .rpy (diálogos, screens, menus), patchRpyFiles, formatRenpyStringLiteral |
| **ALTO** | `Tool/src/engines/rpgmaker/rpgMakerMvMzHandler.js` | 299 | Handler ES6 para RPG Maker (extract/inject/patch/font) |
| **ALTO** | `Tool/src/engines/unreal/unrealHandler.js` | 262 | Handler Unreal (.pak → .locres extraction/injection via u4pak/UEExtractor) |
| **MÉDIO** | `Tool/src/engines/baseEngineHandler.js` | 51 | Classe abstrata (contrato: extract/injectTranslation/applyFontPatch/cleanup) |
| **MÉDIO** | `Tool/src/engines/renpy/renpyV7Handler.js` | — | Handler Ren'Py v7 (Python 2) |
| **MÉDIO** | `Tool/src/engines/renpy/renpyV8Handler.js` | — | Handler Ren'Py v8 (Python 3) |
| **MÉDIO** | `Tool/src/cheatServer.js` | 349 | WS hook server:16005, dual-hook, telemetry polling |
| **MÉDIO** | `Tool/config/syntax_rules.json` | 54 | Regras de proteção Ren'Py (prefixos perigosos, UI keys comuns) |
| **MÉDIO** | `Tool/src/loggerManager.js` | — | Sistema de logging com buffer circular + file write |
| **ÚTIL** | `Tool/data/openT.json` | 19 | Config atual do usuário (sl=autodetect, tl=pt, engine=multi) |
| **ÚTIL** | `Tool/data/glossary.json` | 1 | Lista vazia de termos (formato: `[{term, translation}]`) |

## 6. Detecção de Engine (`gameEngine.js:74`)

`detectEngine(exePath, exeDir)` — usa heuristics:
1. Lê primeiros 100KB do executável como UTF-8 → string matching ("UnityPlayer", "renpy", "Kirikiri", "WolfRPG", "TyranoBuilder", "RGSS3", "SRPG Studio", "Bakin", etc.)
2. Fallback: verifica estrutura de diretórios (`www/` → mz, `index.html`+`.rpy` → python, `.xp3` → krkr, `.rvdata2` → rgss, `Content/Paks` → unreal)
3. Default: `mz`

Engine definida em `ENGINES_DEF` (L51) com flags: `js: true` (RPG Maker MV/MZ, TyranoScript — patch estático JSON, sem DLL hook) vs `js: false` (usa DLL hook para runtime).

## 7. Engines Suportadas & Hook Strategy

| Engine | ID | Hook Strategy | Patch Strategy |
|--------|----|---------------|----------------|
| Ren'Py | `python` | DLL hook (`PythonHook.dll`/`PythonHook64.dll`) | `.rpy` files + `tl/` directory |
| RPG Maker MV | `mv` | Nenhum (patch estático) | `www/data/*.json`, `www/js/plugins.js` |
| RPG Maker MZ | `mz` | Nenhum (patch estático) | `data/*.json`, `www/js/plugins.js` |
| TyranoScript | `tyrano` | Nenhum (patch estático) | JSON + JS strings |
| Wolf RPG | `wolf` | DLL hook (`wolfHook.dll`) | UberWolfCli para extract/pack |
| Godot | *(implícito)* | — | JSON extraction |
| Unity | `unity` | BepInEx + XUnity AutoTranslator | `UltraBatchEndpoint.dll` → WS:16005 |
| Kirikiri | `krkr`/`krkrz` | DLL hook (`krkr2Hook.dll`/`krkrzHook*.dll`) | — |
| RGSS | `rgss` | DLL hook (`RGSSHook*.dll`) | Ruby scripts |
| SRPG Studio | `srpg` | DLL hook (`SRPGHook.dll`) | — |
| AGTK | `agtk` | DLL hook (`AgtkHook.dll`) | — |
| KMY | `kmy` | Hook via `kmyHook.exe` | — |
| Bakin | `bakin` | Hook via `BakinLauncher.exe` | — |
| Unreal | `unreal` | — | `.pak` → `.locres` extraction via UEExtractor/u4pak |

## 8. Observações Arquiteturais

- **32 threads**: `open_translator.py` (mencionado no README) — motor paralelo para batches grandes (não incluído no tree, apenas mencionado)
- **Smart Switching**: engines temporariamente banidas por 10min em 429/302, fallback automático google→papago→mymemory→bing→yandex
- **Escape codes**: preservação de `\\V[n]`, `\\C[n]`, `\\N[n]`, `%1`, `%2` etc. via regex `ESC_RE` (utils.js L18)
- **Ren'Py v7/v8**: handlers separados por versão Python (2 vs 3), `renpyCommon.js` contém lógica compartilhada
- **Unreal**: pipeline `u4pak unpack → .locres extract → locres_tool parse → translate → repack`
- **Excel round-trip**: exportExcel/importExcel para revisão humana de traduções (coluna "traducao" editável)
- **Offline-first**: todas as traduções são cacheadas em SQLite (`global_cache.db`) e por jogo (`trans_cache.json`) para reuso offline
