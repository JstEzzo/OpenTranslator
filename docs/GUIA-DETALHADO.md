# Detailed project guide

This guide describes the current source layout and its limits. It is not a certification of every engine, provider, or game. Read the generated catalogue for metadata and approximate symbols; automated reading is not a human semantic audit of every line.

## Product model

OpenTranslator is a Windows desktop application composed of a C# launcher, a local Node.js backend, a browser interface, engine adapters, and optional Python/native tools. The interface and launcher always start in English. Game source/target languages remain separate configuration values.

## Startup

The native launcher checks required files and runtime dependencies, tests local services, starts `server.js --no-browser`, and opens the application interface once. A Chromium process may hand its window to an existing process; that exit must not trigger a second browser tab. Debug mode keeps diagnostics accessible; normal startup uses the tray. Safe/software rendering disables GPU acceleration for the browser window.

Default ports are 8080 for HTTP/RPC and 16005 for game integrations. Changing one setting does not automatically rewrite every external game template. Session authentication and local transport checks remain part of the application.

## Source layout

| Location | Responsibility |
|---|---|
| `server.js` | Backend initialization and lifecycle |
| `launcher/` | Native Windows launcher source |
| `ui/` | Browser interface, styles, fonts, and overlays |
| `src/core/` | Detection, orchestration, contracts, memory, jobs, backups |
| `src/engines/` | Engine-specific readers, writers, and bridges |
| `src/services/` | HTTP/RPC, cache, translation, and supporting services |
| `src/providers/` | Translation and format-specific providers |
| `src/security/` | Session and transport controls |
| `src/utils/` | Shared filesystem, process, executable, and runtime utilities |
| `config/` | Product syntax rules and compatibility profiles |
| `resources/`, `loaders/`, `third-party/` | Bundled resources and optional external/native components |
| `tests/` | Tests and fixtures; not all scripts belong to the default suite |
| `tools/` | Maintenance, verification, documentation, and packaging |
| `.github/workflows/` | Verification and portable artifact workflows |
| `data/`, `gameLib/`, `logs/` | Local runtime state; excluded from source distribution tracking |

The older `Tool/` and `www/` descriptions in historical records do not define the current runtime layout. Historical work directories removed during cleanup are stored outside the source tree when available.

## Request and translation flow

The browser calls authenticated operations in `src/services/rpcHandlers.js`. Both `gameService.js` and the older `gameEngine.js` still have callers. The existence of a newer service does not mean every operation has migrated to it.

Detection identifies signatures, subdirectories, available version evidence, and executable architecture. The registry selects an adapter. A detected family is not proof of every format or version being supported. Unknown architecture remains unknown; ARM64 is not AMD64.

The translation pipeline coordinates extraction, text preparation, provider calls, placeholder restoration, QA, application, and recovery. Follow the actual operation and adapter when assessing behavior. Provider fallback depends on configuration; an explicit provider choice must not silently send text to a different provider.

Cached translations are not a general offline translation model. External providers may need credentials, internet access, rate-limit handling, and permission to receive game text.

## Preview and dry-run limits

`TranslationPipeline.dryRun()` calls the adapter's extractor and samples extracted texts. It does not run the main apply stage. Extraction can create staging files or invoke external tools. Its `filesModified: 0` field is not a filesystem-wide write audit. At this revision, that method also needs further work to propagate a failed extraction before returning success. Use isolated copies for testing.

## Applying and restoring files

Backup, transaction, journal, partial-result, accounting, and verification modules cover different parts of the write path. A successful return must correspond to actual writes and verified output; an empty extraction is not evidence that a whole game was translated.

Rollback must account for original files, newly created files, backup integrity, and failure recovery. Do not assume all adapters and external tools have identical guarantees. Keep original game files and test restoration on a copy before relying on a new format integration.

## Engine and runtime coverage

The registry currently contains 15 adapter entries. The interface contains 22 compatibility profiles, including integrations that remain incomplete. These are different counts and do not describe 22 fully supported engines.

Read [the engine matrix](engines/ENGINE_SUPPORT_MATRIX.md) and [the profiles](../config/engineCompatibility.json) for current boundaries. RPG Maker cheats need a working game-side bridge. A simulated API round-trip is not proof of gameplay compatibility with every plugin. RenPy variable editing uses a separate integration.

Mono, IL2CPP, Python 2/3, RGSS generations, Godot imports, ASAR variants, Wolf versions, and GameMaker bytecode/YYC need distinct fixtures. OCR/overlay capability cannot be inferred merely because a class or fallback name exists.

## Interface and editor

The library supports adding a game path, ordering by title/recency, and optional path display. Reading settings include 14/16/18/20 px UI text, reduced animation, and accent color. These settings change the application interface, not every game's font.

`translationEditorCore.js` provides a backend data model for querying, editing, history, validation, and export. It does not by itself prove that the current browser application has a virtualized 300,000-row editor or every shortcut described by older plans.

The compatibility view distinguishes known issues, available integration, and remaining work. Never replace partial support with a global PASS label without evidence for the specific game/version.

## Packaging

Use `npm run package:portable -- --output NEW_DIRECTORY` on Windows x64 with Node 24 and installed dependencies. The output must be new and outside the source tree. `standard` excludes the optional native injector; `complete` includes optional components only when found. Check the generated `RELEASE_MANIFEST.json` for actual tools and hashes.

Source ZIPs are development downloads. Workflow artifacts are portable packages. Tagged releases remain drafts until published. Personal libraries, saves, databases, and histories are not release prerequisites.

## Verification and documentation

`npm run verify` executes lint, success-contract checks, and registered test suites. Test file count, suite count, assertions, and real-game samples are different measurements. Earlier results are dated observations, not permanent counters.

Generate the static inventory with `python tools/document_project.py`. It reads eligible text and hashes files without importing application modules. Local-state content is excluded from descriptions. Symbols/imports are approximate and may miss dynamic paths. Generated output belongs outside the source tree; public catalogues do not list private game state.

For a compatibility claim, record the commit, engine version, architecture, fixture, command, expected behavior, actual output, file hashes, restore result, and whether the translated game was observed. Detection, format parsing, file application, runtime execution, visual display, and gameplay are separate evidence levels.
