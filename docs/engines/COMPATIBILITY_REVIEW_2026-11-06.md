# Compatibility limits review — 2026-11-06

This review distinguishes implemented corrections from game/runtime validation that remains necessary. Removing a warning does not implement an archive decoder, a compatible runtime loader or a font with the required glyphs.

## Corrections implemented

| Integration | Previous failure | Current behavior | Verification |
| --- | --- | --- | --- |
| Construct localization JSON | Generated an additional `translation_pt_BR.json` without ensuring the game loaded it; could extract project metadata as text | Updates the original recognized localization table, including nested contexts, and preserves keys, locale and unrelated metadata; does not create an unused translation file | Read/write/restore fixtures, exact source checks, nested keys containing dots and placeholder preservation |
| GDevelop project JSON | Extracted only scene objects from `game.json`; application could confuse a global object and scene object with the same name | Reads both `game.json` and `data.json`; supports global and scene TextObject fields, directly on the object or under `content`; selects each field by its exact structural path | Two objects with identical names translated independently; sprite metadata preserved; stale or invalid source paths refused |
| Unreal native localization | Capability discovery inspected only a top-level `Content/Localization` directory | Uses the existing structural LocRes discovery for nested game folders and requires an actual `.locres` file | Nested project fixtures and empty/missing directory checks |
| Unity runtime diagnosis | Presence of `Managed` made runtime translation appear supported | Mono detection reports an unverified bridge; IL2CPP remains a separate runtime requiring a native bridge | Mono/IL2CPP coexistence fixture, framework detection and capability assertions |

Construct and GDevelop prepare all edits before writing, require a successful backup, validate placeholders and repeated model output, verify the original source value and reread the written file. Their tests exercise restoration of the original loaded resource.

These corrections do not add arbitrary JavaScript event translation, binary decoding or automatic registration of every external localization file.

## Review of each table row

| Family | What is available | What still needs a separate implementation or real-game validation |
| --- | --- | --- |
| RPG Maker MV/MZ | Structured database/message/plugin-label paths and runtime bridge; local inventory includes MV 1.6.1 and MZ 1.8.1, 1.9.0, 1.10.0 | Custom plugin message windows, NW.js/runtime combinations and image text require individual tests. No universal version certification is claimed. |
| RPG Maker XP/VX/VX Ace | Marshal/archive bridge; two local games detected as VX Ace | No XP or VX example was identified in the supplied folder. RGSS generation, encoding, RTP and script changes must be checked against those games. |
| Ren'Py | Additive translation workflow and preservation of interpolation; a modern Python game is available | Python 2 games and additional RPA/RPYC generations were not represented in the current inventory. Screens and game-specific GUI strings need runtime checks. |
| Unity | Local Unity Mono game detected as 6000.3.17f1; static resource tools are separate from runtime hooking | IL2CPP example and compatible loader validation are still missing. Presence of Mono assemblies is not evidence of successful injection or font rendering. |
| Unreal | Two local games detected; LocRes parsing and nested-resource discovery | Pak/IoStore versions, available extraction/packing tools, locale registration, package precedence and fonts require actual package/runtime validation. The detector did not identify exact UE versions. |
| Godot/Wolf/Electron | Godot PCK, Wolf archive and Cocos-in-Electron examples are present | Imported/compiled resource layouts and engine versions remain format-specific. Encrypted or unsupported resources are not covered by the new JSON corrections. |
| GameMaker/Construct/Defold/Cocos/GDevelop | GameMaker and Cocos examples are present; Construct/GDevelop fixtures cover the corrections above; Cocos maps, labels and cutscene arrays are supported | No Construct, Defold or GDevelop game was identified locally. GameMaker bytecode/YYC, Defold compiled collections, arbitrary Cocos loaders and dynamically generated text still require their own support and runtime tests. |

## Available-game inspection

On 2026-11-06, read-only detection and capability inspection completed for 15 game folders covering 10 detected engine types: MV, MZ, RGSS, Ren'Py, Unity, Unreal, Godot, Wolf, GameMaker and Cocos Creator. MTool was excluded because it is a tool, not a game fixture. Engine detection and capability inspection are not gameplay tests, successful translations or compatibility certification.

Additional examples needed for the uncovered cases: RPG Maker XP, RPG Maker VX, Ren'Py with Python 2, Unity IL2CPP, Construct, Defold and GDevelop. Exact engine versions and packaging still need verification where the detector returned a range.

## Format references

- [Construct Internationalization](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/internationalization): translation JSON must be loaded by the game. Updating the already-used file avoids relying on a newly generated file being registered automatically.
- [GDevelop TextObjectDataType](https://docs.gdevelop.io/GDJS%20Runtime%20Documentation/types/gdjs.TextObjectDataType.html): exported text objects expose a direct `text` field; older project-shaped content also needs explicit handling.

The remaining limits must stay visible until their implementation and validation exist. This review is not a declaration that all games or all engine versions now work.
