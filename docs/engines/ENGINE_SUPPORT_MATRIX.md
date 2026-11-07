# Engine support and limits

Current profile descriptions are maintained in [config/engineCompatibility.json](../../config/engineCompatibility.json). Status describes partial implementation, not proof for every game/version. Detection, extraction, application, runtime, visual display, cheats, and rollback are different evidence levels.

| Engine | Versions / scope | Status | Current integration |
|---|---|---|---|
| Generic files | Coverage depends on the file format | PARTIAL | Recognized structured text |
| ChoiceScript | No dedicated parser implemented | INCOMPLETE | Scene text must preserve commands |
| Cocos Creator / Cocos2d-x | Separate Creator 2/3 and Cocos2d-x profiles | PARTIAL | Readable JSON/JS/Lua resources |
| Construct | Versions 2 and 3; projects and exports differ | PARTIAL | Extracts readable data; writes an additional translation file |
| Defold | Loose files and compiled exports differ | PARTIAL | Accessible localization JSON/Lua |
| Electron / HTML5 | Application version and configuration matter | PARTIAL | Accessible files and runtime bridge |
| GameMaker | Studio and recent versions need compatible tools | PARTIAL | External text; data.win needs specific integration |
| GDevelop | Project and export structures vary | PARTIAL | TextObject entries in JSON |
| Godot | Versions 3 and 4; import formats vary | PARTIAL | Resource bridge, CSV/PO, and compatible packages |
| Kirikiri 2 / Z | Separate Kirikiri 2, Z, x86, and x64 profiles | INCOMPLETE | Native hook selection; dedicated parser incomplete |
| Pixel Game Maker MV | No verified version matrix | INCOMPLETE | Specific hook; incomplete integration |
| Ren’Py | 6/7 use Python 2; 8 uses Python 3 | PARTIAL | Scripts and translation layer |
| RPG Developer Bakin | No dedicated adapter implemented | INCOMPLETE | MTool reference; no verified dedicated coverage |
| RPG Maker MV / MZ | MV and MZ; runtime and plugin versions differ | PARTIAL | JSON data and JavaScript runtime bridge |
| RPG Maker XP / VX / VX Ace | Separate RGSS1, RGSS2, and RGSS3 | PARTIAL | Ruby Marshal bridge and RGSS archives |
| SMILE GAME BUILDER | No dedicated adapter implemented | INCOMPLETE | No verified dedicated coverage |
| SRPG Studio | No verified version matrix | INCOMPLETE | Specific native hook; no complete dedicated pipeline |
| TyranoBuilder / TyranoScript | Identify the engine version and export type | INCOMPLETE | Detection available; dedicated flow incomplete |
| Unity | Mono and IL2CPP are different profiles | PARTIAL | Resources and loader-dependent XUnity integration |
| Unreal Engine | LocRes 0–3; Pak/IoStore are separate formats | PARTIAL | LocRes with preserved hashes; packages need external tooling |
| Visual Novel Maker | No dedicated adapter implemented | INCOMPLETE | No verified dedicated coverage |
| Wolf RPG Editor | Versions 1, 2, and 3 need separate profiles | PARTIAL | Python bridge and archive tools |

## Known issues and remaining work

### Generic files

Proprietary engine logic is not detected automatically.

**Cheats:** Not implemented.

- Add a parser for each required format.
- Verify round trips and exclude code and machine configuration.

### ChoiceScript

Commands and indentation control choices and flow.

**Cheats:** Not implemented.

- Implement a scene parser that preserves commands and variables.
- Test choices after translation.

Sources: [Reference 1](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/).

### Cocos Creator / Cocos2d-x

Scripts may be compiled or distributed as .jsc.

**Cheats:** Not implemented.

- Validate versions and resource references.
- Do not claim encrypted script coverage without verified extraction.

Sources: [Reference 1](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/native-options).

### Construct

Creating a JSON file does not ensure the game loads it.

**Cheats:** Not implemented.

- Integrate loading of the generated translation file.
- Validate exports and the internationalization plugin.

Sources: [Reference 1](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/internationalization).

### Defold

Fonts need the required glyphs; compiled data needs specific handling.

**Cheats:** Not implemented.

- Support compiled files and collections.
- Validate placeholders and fonts in runtime.

Sources: [Reference 1](https://defold.com/examples/gui/localization/), [Reference 2](https://forum.defold.com/t/how-does-one-use-non-latin-characters-in-text-solved/70987).

### Electron / HTML5

Context isolation and missing Node integration prevent older hooks.

**Cheats:** Depends on the game bridge; no universal editor.

- Test ASAR, preload, and DOM without disabling global isolation.
- Validate current versions as well as legacy versions.

Sources: [Reference 1](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

### GameMaker

Bytecode and YYC are not interchangeable formats.

**Cheats:** No universal editor implemented.

- Integrate and verify a data.win tool for each supported version.
- Test format round trips and YYC runtime.

Sources: [Reference 1](https://github.com/UnderminersTeam/UndertaleModTool/issues), [Reference 2](https://underminersteam.github.io/usage/getting-started/).

### GDevelop

Texts in events and extensions may be outside scene objects.

**Cheats:** Not implemented.

- Cover events, global objects, and external resources.
- Test exports without game.json.

Sources: [Reference 1](https://forum.gdevelop.io/t/translate-extension/72249).

### Godot

The adapter detects embedded PCKs by their footer and header. It can extract and apply recognized CSV and TSV localization tables in unencrypted PCK v2 and v3 packages, whether stored separately or embedded in an executable. The selected source language identifies the column to replace. In automatic mode, the adapter prefers English, then Japanese, when available.

Translations must be loaded or registered; fonts and locale affect display.

**Cheats:** No generic cheats implemented.

- Compiled resources, encrypted packs and games that use custom text formats still require separate support. The packed-table workflow applies to one package per operation.
- Verify PO/plural loading and font fallback.

Sources: [Reference 1](https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html).

### Kirikiri 2 / Z

UTF-8/Shift-JIS and script variants need correct decoding.

**Cheats:** Requires a compatible hook; not verified in this review.

- Implement KAG/TJS and XP3 parsing by variant.
- Test fonts and variables in a real game.

Sources: [Reference 1](https://wamsoft.github.io/krkrz_dev/en/guide/CommandLine/).

### Pixel Game Maker MV

The name MV does not mean the RPG Maker MV pipeline is compatible.

**Cheats:** Not verified.

- Implement a dedicated data and runtime adapter.
- Validate component version and architecture.

### Ren’Py

Updates may change identifiers, compilation, GUI, and Python APIs.

**Cheats:** Variables require the RenPy bridge; RPG Maker commands do not apply.

- Validate RPYC/RPA extraction by version.
- Test interpolation, tags, fonts, and variable persistence.

Sources: [Reference 1](https://www.renpy.org/doc/html/translation.html), [Reference 2](https://www.renpy.org/doc/html/incompatible.html).

### RPG Developer Bakin

A feature listed by MTool is not evidence of OpenTranslator support.

**Cheats:** Not implemented.

- Implement a dedicated detector and resource parser.
- Validate translation loading, fonts, and save/load.

Sources: [Reference 1](https://mtool.app/).

### RPG Maker MV / MZ

Plugins, escape codes, and NW.js versions can change runtime behavior.

**Cheats:** Gold, variables, HP/MP, and inventory depend on the active bridge.

- Test MV/MZ versions and plugin combinations separately.
- Validate escape codes, fonts, save/load, and gameplay cheats.

Sources: [Reference 1](https://rpgmakerofficial.com/product/MZ_help-en/01_10_01.html), [Reference 2](https://www.caspergaming.com/cgmz/).

### RPG Maker XP / VX / VX Ace

RTP, DLLs, and encoding must match the game engine.

**Cheats:** Native hooks depend on architecture; separate from the MV/MZ overlay.

- Validate Marshal and archives by generation.
- Check RTP and fonts without replacing arbitrary DLLs.

Sources: [Reference 1](https://rpgmakerofficial.com/support/rtp/).

### SMILE GAME BUILDER

A feature listed by MTool is not evidence of OpenTranslator support.

**Cheats:** Not implemented.

- Implement a dedicated detector and parser.
- Validate resources, translations, and saves.

Sources: [Reference 1](https://mtool.app/).

### SRPG Studio

Engine detection does not prove translation or attribute editing.

**Cheats:** Not verified.

- Add a dedicated adapter and authorized fixtures.
- Validate fonts, save/load, and hooks by architecture.

### TyranoBuilder / TyranoScript

Scenario tags and fonts must not be treated as plain text.

**Cheats:** Not verified.

- Implement a scenario parser that preserves tags.
- Test exports and multilingual display.

Sources: [Reference 1](https://tyranobuilder.com/faq/).

### Unity

IL2CPP, TMP, and fonts require a compatible loader/plugin combination.

**Cheats:** No verified universal attribute editor.

- Check BepInEx/IL2CPP and architecture before installation.
- Test TMP, rich text, and text created after scene loading.

Sources: [Reference 1](https://github.com/bbepis/XUnity.AutoTranslator/blob/master/README.md), [Reference 2](https://github.com/bbepis/XUnity.AutoTranslator/issues/856).

### Unreal Engine

Loaded locale, hashes, and package priority affect translations.

**Cheats:** No universal gameplay cheats.

- Test IoStore and newer package versions.
- Validate fonts, text in images, and strings outside LocRes.

Sources: [Reference 1](https://dev.epicgames.com/documentation/en-us/unreal-engine/localization-overview?application_version=4.27).

### Visual Novel Maker

No dedicated integration; do not confuse with RenPy or Tyrano.

**Cheats:** Not implemented.

- Map formats and versions.
- Create extraction/application fixtures and runtime tests.

Sources: [Reference 1](https://mtool.app/).

### Wolf RPG Editor

Legacy encodings and different archive formats can corrupt text.

**Cheats:** Automatic hook disabled without a reliable version signature.

- Detect the actual archive version and encoding.
- Test repacking and fonts without selecting DLLs by executable size.

Sources: [Reference 1](https://dreamsavior.net/translator-ver-5-10-31-automatic-character-encoding-for-wolf-rpg-engine/).
