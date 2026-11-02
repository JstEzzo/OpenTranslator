<div align="center">

<img src="resources/OpenTranslator.ico" width="100" alt="OpenTranslator logo"/>

# OpenTranslator

**Desktop tools for game translation, engine integrations, and supported runtime cheats.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)](package.json)
[![Status](https://img.shields.io/badge/Status-In%20validation-yellow)](docs/engines/ENGINE_SUPPORT_MATRIX.md)

</div>

## Download and run

Download **OpenTranslator-Win64-Portable.zip** from [GitHub Releases](https://github.com/JstEzzo/OpenTranslator/releases). The first public download is [1.0.0 Preview 1](https://github.com/JstEzzo/OpenTranslator/releases/tag/1.0.0-preview.1). Extract the entire archive and open `OpenTranslator.exe`. Keep its subdirectories beside the executable. `SHA256SUMS.txt` is included on the release page to verify the ZIP.

**Code → Download ZIP** downloads the development source, including tests and documentation. It is not the portable application. Development builds are also available from successful **Build portable OpenTranslator** runs on the [Actions page](https://github.com/JstEzzo/OpenTranslator/actions/workflows/release.yml); these artifacts have limited retention and may require GitHub sign-in. The automatic `v*` tag workflow creates draft releases. The published preview is not a stable compatibility certification; read its known limitations before testing game modifications.

The application and native launcher use **English**, including when an older configuration contains `lang: "pt"`. The interface language is separate from the source and target languages selected for game translation. Changing the application language does not translate a game or change its target language.

The standard portable profile includes Node 24, runtime dependencies, and the resources available during the build. Personal settings, games, caches, saves, and development history are excluded. The native injector `loaders/inject.exe` is optional and excluded from the standard profile. Features that need an absent component remain unavailable. Check `RELEASE_MANIFEST.json` for the actual contents.

## What is supported?

Support is **partial and dependent on the engine version, game format, architecture, plugins, and installed tools**. Detecting an engine is not proof that translation, runtime hooks, cheats, or restoration work in every game.

| Engine family | Current integration | Important limits |
|---|---|---|
| RPG Maker MV / MZ | JSON extraction/application; JavaScript runtime bridge | Plugin combinations and NW.js versions need individual testing |
| RPG Maker XP / VX / VX Ace | Ruby Marshal / RGSS archive bridge | Validate each RGSS generation, RTP, and encoding |
| Ren’Py | Scripts and additive translation layer | Python 2/3, RPA/RPYC versions, interpolation, and GUI differences matter |
| Unity | Asset/resource tools and loader-dependent XUnity integration | Mono and IL2CPP require different validation; no universal runtime guarantee |
| Unreal Engine | LocRes handling and package-related tooling | Pak/IoStore extraction, locale loading, fonts, and package priority matter |
| Godot, Wolf RPG, Electron/HTML5 | Dedicated adapters or bridges | Imported/compiled resources, archives, fonts, and runtime configurations vary |
| GameMaker, Construct, Defold, Cocos, GDevelop | Format-specific partial integrations | External text or generated files may require additional game-side loading |

See the [current compatibility profiles](config/engineCompatibility.json) and [engine support guide](docs/engines/ENGINE_SUPPORT_MATRIX.md). A provider's presence or a historical PASS label is not a game compatibility certificate. Cheats require a working game bridge; OpenTranslator is not a universal memory editor.

New automatic translations generally require the selected online provider or a separately configured local provider. Cached translations can be reused offline; that does not make every translation workflow offline.

## Startup and shutdown

1. Open `OpenTranslator.exe` in the extracted portable directory.
2. The launcher checks required files, the runtime, native dependencies, writable directories, local ports, HTTP, frontend assets, and RPC.
3. It opens one application interface and normally moves its diagnostic panel to the Windows tray.
4. Use **Exit OpenTranslator** in the launcher or tray to shut down through the application's recovery-aware lifecycle.

Default local ports are **8080** for the application and **16005** for the game bridge. A port conflict is reported; unrelated processes must not be terminated merely because they use a port.

## Development and verification

Use **Node 24 on Windows x64** for the portable build and native dependencies.

```powershell
npm ci
npm run verify
```

`verify` runs repository checks, the success-contract audit, and the registered test suites. Passing these checks does not certify every engine version or replace visual tests in real games. Historical lab scripts are available as `npm run legacy:renpy` and `npm run legacy:mz`; their fixture requirements differ from the default suite.

## Build a portable package

The destination must be a new directory outside the source tree:

```powershell
npm run package:portable -- --output ..\OpenTranslator-portable
```

To include optional components available in the local source:

```powershell
npm run package:portable -- --profile complete --output ..\OpenTranslator-complete
```

The builder compiles the C# launcher, includes `bin/node.exe`, checks SQLite/WS/ExcelJS using the bundled runtime, and writes a manifest with hashes. It refuses an existing destination. A complete profile cannot supply tools that were absent from the build source.

Launcher diagnostics:

```powershell
.\OpenTranslator.exe --smoke-test
.\OpenTranslator.exe --debug
.\OpenTranslator.exe --safe
```

## Documentation

- [Documentation index](docs/INDEX.md)
- [Detailed architecture and file guide](docs/GUIA-DETALHADO.md)
- [File-by-file code catalogue](docs/CATALOGO-DO-CODIGO.md)
- [Static RPC reference](docs/REFERENCIA-RPC.md)
- [Packaging and distribution](docs/PRODUCTION_MANIFEST.md)
- [Organization and historical records](docs/ORGANIZACAO-E-DISTRIBUICAO.md)
- [Troubleshooting](docs/user/TROUBLESHOOTING.md)

Documentation describes implementation and evidence separately. Historical records are retained as historical material, not current promises of universal compatibility.
