# Graph Report - Tool  (2026-09-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1904 nodes · 3792 edges · 105 communities (92 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ae7b8cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SourceGenerator
- unrpyc_legacy/unrpyc.py
- RPGMakerRestorer
- Decompiler
- AstDumper
- Decompiler
- unrpyc_legacy/decompiler/renpycompat.py
- unrpyc_v2/decompiler/renpycompat.py
- Decompiler
- app.js
- translator.js
- extractor.js
- gameEngine.js
- SLDecompiler
- unrpyc_legacy/decompiler/__init__.py
- DecompilerBase
- DecompilerBase
- DecompilerBase
- unrpyc_v2/decompiler/__init__.py
- loggerManager.js
- RenPyArchive
- rpcHandlers.js
- unrpyc_legacy/deobfuscate.py
- server.js
- unren_tools/decompiler/__init__.py
- unren_tools/decompiler/magic.py
- SL2Decompiler
- TestcaseDecompiler
- RenPyArchive
- unpack_renpy_all.py
- unrpyc_v2/unrpyc.py
- SL2Decompiler
- AstDumper
- TestcaseDecompiler
- tr
- ATLDecompiler
- ATLDecompiler
- unrpyc_v2/deobfuscate.py
- FakeClassFactory
- SL2Decompiler
- TestcaseDecompiler
- unren_tools/deobfuscate.py
- renpyV8Handler.js
- unrpyc_v2/decompiler/magic.py
- FakeClassFactory
- renpyCommon.js
- package.json
- unrpyc_legacy/decompiler/magic.py
- Lexer
- FakeIgnore
- renpy_save.py
- FakePackageLoader
- FakeClassType
- FakePackageLoader
- FakeClassType
- Lexer
- FakeClassType
- Lexer
- FakeModule
- unrpyc_legacy/testcases/test_un_rpyc.py
- FakeModule
- unrpyc_v2/testcases/test_un_rpyc.py
- FakePackageLoader
- FakeModule
- _header.js
- Pool
- rpgMakerRubyHandler.js
- CheatOverlayTemplate.js
- FakeClassFactory
- RpgMakerMvMzHandler
- check_e07.js
- SafePickler
- RpgMakerRubyHandler
- SafePickler
- unrpyc_legacy/testcases/validate_expected.py
- pickle_safe_loads
- Translator
- unrpyc_v2/testcases/validate_expected.py
- Context
- marshal_bridge.py
- BaseEngineHandler
- FakeStrict
- rowFor
- LatinNameInput.js
- restore_keys.js
- test_engines.js
- check_damage.js
- rm.switches.js
- evb_unpack.py

## God Nodes (most connected - your core abstractions)
1. `SourceGenerator` - 83 edges
2. `Decompiler` - 64 edges
3. `Decompiler` - 58 edges
4. `Decompiler` - 58 edges
5. `SLDecompiler` - 39 edges
6. `RPGMakerRestorer` - 35 edges
7. `DecompilerBase` - 29 edges
8. `DecompilerBase` - 28 edges
9. `DecompilerBase` - 28 edges
10. `SL2Decompiler` - 24 edges

## Surprising Connections (you probably didn't know these)
- `SLDecompiler` --uses--> `DecompilerBase`  [INFERRED]
  unren_tools/decompiler/screendecompiler.py → unren_tools/decompiler/util.py
- `SLDecompiler` --uses--> `Dispatcher`  [INFERRED]
  unren_tools/decompiler/screendecompiler.py → unren_tools/decompiler/util.py
- `SLDecompiler` --uses--> `WordConcatenator`  [INFERRED]
  unren_tools/decompiler/screendecompiler.py → unren_tools/decompiler/util.py
- `ATLDecompiler` --uses--> `Dispatcher`  [INFERRED]
  resources/renpy/unrpyc_legacy/decompiler/atldecompiler.py → resources/renpy/unrpyc_legacy/decompiler/util.py
- `Decompiler` --uses--> `Dispatcher`  [INFERRED]
  resources/renpy/unrpyc_legacy/decompiler/__init__.py → resources/renpy/unrpyc_legacy/decompiler/util.py

## Import Cycles
- None detected.

## Communities (105 total, 13 thin omitted)

### Community 0 - "SourceGenerator"
Cohesion: 0.08
Nodes (7): NodeVisitor, object, This function can convert a node tree back into python sourcecode. This is…, This visitor is able to transform a well formed syntax tree into python…, Sep, SourceGenerator, to_source()

### Community 1 - "unrpyc_legacy/unrpyc.py"
Cohesion: 0.06
Nodes (32): AstDumper, pprint(), object, An object which handles the walking of a tree of python objects it will create…, loads(), Similar to :func:`load`, but takes an 8-bit string (bytes in Python 3, str in…, safe_dumps(), pickle_detect_python2() (+24 more)

### Community 2 - "RPGMakerRestorer"
Cohesion: 0.06
Nodes (32): Any, main(), Recursively restores keys/values within a parsed JSON structure (from a string…, Process other JSON files (actors, classes, items, etc.). Reverts any string…, Recursively walk two data nodes, reverting filename-like strings., Process all matching JSON files in translated directory., Print restoration summary., Apply only generic forced string replacements, no backup diff. (+24 more)

### Community 3 - "Decompiler"
Cohesion: 0.08
Nodes (5): Decompiler, DecompilerBase, dispatch, An object which hanldes the decompilation of renpy asts to a given stream, WordConcatenator

### Community 4 - "AstDumper"
Cohesion: 0.05
Nodes (29): AstDumper, pprint(), object, An object which handles the walking of a tree of python objects it will create…, loads(), Simjilar to :func:`load`, but takes an 8-bit string (bytes in Python 3, str in…, object, Translator (+21 more)

### Community 5 - "Decompiler"
Cohesion: 0.08
Nodes (6): Decompiler, DecompilerBase, dispatch, An object which handles the decompilation of renpy asts to a given stream, object, WordConcatenator

### Community 6 - "unrpyc_legacy/decompiler/renpycompat.py"
Cohesion: 0.06
Nodes (44): Call, Camera, Default, Define, EarlyPython, EndTranslate, GroupedLine, Hide (+36 more)

### Community 7 - "unrpyc_v2/decompiler/renpycompat.py"
Cohesion: 0.06
Nodes (44): Call, Camera, Default, Define, EarlyPython, EndTranslate, GroupedLine, Hide (+36 more)

### Community 8 - "Decompiler"
Cohesion: 0.09
Nodes (5): Decompiler, pprint(), DecompilerBase, dispatch, An object which handles the decompilation of renpy asts to a given stream

### Community 9 - "app.js"
Cohesion: 0.11
Nodes (43): addGameFromExe(), adjustColorBrightness(), applyHotkeys(), applyTheme(), basename(), build(), connectDualHook(), customConfirm() (+35 more)

### Community 10 - "translator.js"
Cohesion: 0.09
Nodes (38): loadCfg(), loadGlossary(), activeWsClients, { loadGlossary, loadCfg }, startHookServer(), { translateBatch, translateSingle }, WebSocket, whttp (+30 more)

### Community 11 - "extractor.js"
Cohesion: 0.09
Nodes (32): saveNewGlobalTranslations(), addText(), ARRAY_LABELS, extractEscapeCodes(), extractGameTexts(), extractTextsFromJsCode(), fs, isJsCode() (+24 more)

### Community 12 - "gameEngine.js"
Cohesion: 0.08
Nodes (36): cfg, { clearEngineBans }, { executeTranslationPipeline, detectEngine }, exePath, { extractGameTexts }, fs, path, cfg (+28 more)

### Community 13 - "SLDecompiler"
Cohesion: 0.18
Nodes (7): BadHasBlockException, DecompilerBase, dispatch, Exception, an object which handles the decompilation of renpy screen language 1 screens to…, SLDecompiler, simple_expression_guard()

### Community 14 - "unrpyc_legacy/decompiler/__init__.py"
Cohesion: 0.12
Nodes (15): pprint(), Options, OptionBase, # TODO: double check that any atl is after any "at" keyword?, Dispatcher, encode_say_string(), First, OptionBase (+7 more)

### Community 15 - "DecompilerBase"
Cohesion: 0.10
Nodes (10): DecompilerBase, object, Shorthand method for pushing a newline and indenting to the proper indent level…, Write the decompiled representation of `ast` into the opened file given in the…, Shorthand method for writing `string` to the file, Write each line in lines to the file without writing whitespace-only lines, Save our current state., Commit changes since a saved state. (+2 more)

### Community 16 - "DecompilerBase"
Cohesion: 0.10
Nodes (9): DecompilerBase, Save our current state., Commit changes since a saved state., Roll back to a saved state., Do something the next time we find a blank line. m should be a method that…, Shorthand method for pushing a newline and indenting to the proper indent level…, Write the decompiled representation of `ast` into the opened file given in the…, Shorthand method for writing `string` to the file (+1 more)

### Community 17 - "DecompilerBase"
Cohesion: 0.10
Nodes (9): DecompilerBase, Save our current state., Commit changes since a saved state., Roll back to a saved state., Do something the next time we find a blank line. m should be a method that…, Shorthand method for pushing a newline and indenting to the proper indent level…, Write the decompiled representation of `ast` into the opened file given in the…, Shorthand method for writing `string` to the file (+1 more)

### Community 18 - "unrpyc_v2/decompiler/__init__.py"
Cohesion: 0.14
Nodes (17): Options, pprint(), OptionBase, pprint(), # TODO: double check that any atl is after any "at" keyword?, pprint(), Dispatcher, encode_say_string() (+9 more)

### Community 19 - "loggerManager.js"
Cohesion: 0.11
Nodes (15): loggerManager, fs, getLocalTimestamp(), instance, LoggerManager, path, util, extractSaveDirectoryFromRpy() (+7 more)

### Community 20 - "RenPyArchive"
Cohesion: 0.17
Nodes (5): _printable(), RenPyArchive, _unicode(), _unmangle(), _unpickle()

### Community 21 - "rpcHandlers.js"
Cohesion: 0.09
Nodes (22): COMMON_TRANS_PATH, fs, getCommonTranslation(), GLOSSARY_PATH, { isTranslatableText, logWarn }, loadCommonTranslations(), loadGlobalCacheForLang(), path (+14 more)

### Community 22 - "unrpyc_legacy/deobfuscate.py"
Cohesion: 0.14
Nodes (23): pickle_safe_loads(), assert_is_normal_rpyc(), decrypt_base64(), decrypt_hex(), decrypt_string_escape(), decrypt_zlib(), decryptor(), extract_slot_headerscan() (+15 more)

### Community 23 - "server.js"
Cohesion: 0.10
Nodes (22): fs, https, loggerManager, path, PID_FILE, shutdownAll(), { spawnSync }, { startHookServer } (+14 more)

### Community 24 - "unren_tools/decompiler/__init__.py"
Cohesion: 0.17
Nodes (13): pprint(), # HACK: This fixes the two statements on a line Error e.g., pprint(), Dispatcher, encode_say_string(), First, _param_name_default(), dict (+5 more)

### Community 25 - "unren_tools/decompiler/magic.py"
Cohesion: 0.12
Nodes (17): FakeUnpickler, __init__(), load(), A forgiving unpickler. On uncountering references to class definitions in the…, A safe unpickler. It will create fake classes for any references to class…, A pickler which can repickle object hierarchies containing objects created by…, Read a pickled object representation from the open binary :term:`file object`…, Similar to :func:`safe_load`, but takes an 8-bit string (bytes in Python 3, str… (+9 more)

### Community 26 - "SL2Decompiler"
Cohesion: 0.18
Nodes (5): pprint(), DecompilerBase, dispatch, An object which handles the decompilation of renpy screen language 2 screens to…, SL2Decompiler

### Community 27 - "TestcaseDecompiler"
Cohesion: 0.18
Nodes (6): pprint(), DecompilerBase, dispatch, An object which handles the decompilation of renpy testcase statements, TestcaseDecompiler, string_escape()

### Community 28 - "RenPyArchive"
Cohesion: 0.20
Nodes (5): _printable(), RenPyArchive, _unicode(), _unmangle(), _unpickle()

### Community 29 - "unpack_renpy_all.py"
Cohesion: 0.14
Nodes (20): copy_loose_files(), decompile_python_pyc(), extract_code_consts(), extract_fallback_strings(), extract_gz_archive(), generate_txt_files_from_rpy(), purge_rogue_renpy_dirs(), Decompresses a .gz archive (e.g., manifest.gz) (+12 more)

### Community 30 - "unrpyc_v2/unrpyc.py"
Cohesion: 0.18
Nodes (19): pickle_detect_python2(), pickle_loads(), pickle_safe_dumps(), BadRpycException, cpu_count(), decompile_rpyc(), get_ast(), main() (+11 more)

### Community 31 - "SL2Decompiler"
Cohesion: 0.19
Nodes (4): DecompilerBase, dispatch, An object which handles the decompilation of renpy screen language 2 screens to…, SL2Decompiler

### Community 32 - "AstDumper"
Cohesion: 0.26
Nodes (4): AstDumper, pprint(), object, An object which handles the walking of a tree of python objects it will create…

### Community 33 - "TestcaseDecompiler"
Cohesion: 0.19
Nodes (5): DecompilerBase, dispatch, An object which handles the decompilation of renpy testcase statements, TestcaseDecompiler, string_escape()

### Community 34 - "tr"
Cohesion: 0.13
Nodes (6): autoHookLogMethods(), autoWrap(), hookLogWindowRefresh(), loadDict(), norm(), tr()

### Community 35 - "ATLDecompiler"
Cohesion: 0.23
Nodes (4): ATLDecompiler, DecompilerBase, dispatch, An object that handles decompilation of atl blocks from the ren'py AST

### Community 36 - "ATLDecompiler"
Cohesion: 0.22
Nodes (5): ATLDecompiler, pprint(), DecompilerBase, dispatch, An object that handles decompilation of atl blocks from the ren'py AST

### Community 37 - "unrpyc_v2/deobfuscate.py"
Cohesion: 0.17
Nodes (18): assert_is_normal_rpyc(), decrypt_base64(), decrypt_hex(), decrypt_string_escape(), decrypt_zlib(), decryptor(), extract_slot_headerscan(), extract_slot_legacy() (+10 more)

### Community 38 - "FakeClassFactory"
Cohesion: 0.12
Nodes (11): FakeClassFactory, FakeIgnore, FakeStrict, FakeUnpicklingError, FakeWarning, FakeClass, object, Factory of fake classses. It will create fake class definitions on demand based… (+3 more)

### Community 39 - "SL2Decompiler"
Cohesion: 0.20
Nodes (5): pprint(), DecompilerBase, dispatch, An object which handles the decompilation of renpy screen language 2 screens to…, SL2Decompiler

### Community 40 - "TestcaseDecompiler"
Cohesion: 0.19
Nodes (6): pprint(), DecompilerBase, dispatch, An object which handles the decompilation of renpy testcase statements, TestcaseDecompiler, string_escape()

### Community 41 - "unren_tools/deobfuscate.py"
Cohesion: 0.17
Nodes (18): assert_is_normal_rpyc(), decrypt_base64(), decrypt_hex(), decrypt_string_escape(), decrypt_zlib(), decryptor(), extract_slot_headerscan(), extract_slot_legacy() (+10 more)

### Community 42 - "renpyV8Handler.js"
Cohesion: 0.14
Nodes (9): injectRenpyFontConfig(), purgeCacheFiles(), RenpyV7Handler, BaseEngineHandler, { ensureTlDirectory, buildRenpyStringTlContent, injectRenpyFontConfig, extractRenpyRpyTexts, purgeCacheFiles }, { execFile }, fs, path (+1 more)

### Community 43 - "unrpyc_v2/decompiler/magic.py"
Cohesion: 0.16
Nodes (13): FakeUnpickler, load(), loads(), A forgiving unpickler. On encountering references to class definitions in the…, A safe unpickler. It will create fake classes for any references to class…, Read a pickled object representation from the open binary :term:`file object`…, Similar to :func:`load`, but takes an 8-bit string (bytes in Python 3, str in…, Similar to :func:`safe_load`, but takes an 8-bit string (bytes in Python 3, str… (+5 more)

### Community 44 - "FakeClassFactory"
Cohesion: 0.12
Nodes (9): FakeClassFactory, FakeIgnore, FakeWarning, __init__(), FakeClass, object, Factory of fake classes. It will create fake class definitions on demand based…, *special_cases* should be an iterable containing fake classes which should be… (+1 more)

### Community 45 - "renpyCommon.js"
Cohesion: 0.16
Nodes (13): buildRenpyStringTlContent(), ensureTlDirectory(), extractRenpyRpyTexts(), formatRenpyStringLiteral(), fs, patchRpyFiles(), path, unescapeRenpyString() (+5 more)

### Community 46 - "package.json"
Cohesion: 0.12
Nodes (15): better-sqlite3, exceljs, allowScripts, better-sqlite3@12.11.1, dependencies, better-sqlite3, exceljs, ws (+7 more)

### Community 47 - "unrpyc_legacy/decompiler/magic.py"
Cohesion: 0.18
Nodes (11): FakeUnpickler, load(), A forgiving unpickler. On encountering references to class definitions in the…, A safe unpickler. It will create fake classes for any references to class…, Read a pickled object representation from the open binary :term:`file object`…, Similar to :func:`safe_load`, but takes an 8-bit string (bytes in Python 3, str…, Removes the fake package tree mounted at *name*. This works by first looking…, remove_fake_package() (+3 more)

### Community 48 - "Lexer"
Cohesion: 0.33
Nodes (3): Lexer, simple_expression_guard(), split_logical_lines()

### Community 49 - "FakeIgnore"
Cohesion: 0.19
Nodes (7): FakeIgnore, FakeStrict, FakeUnpicklingError, FakeWarning, FakeClass, object, Error raised when there is not enough information to perform the fake…

### Community 50 - "renpy_save.py"
Cohesion: 0.36
Nodes (10): cmd_apply(), cmd_dump(), ensure_module(), fake_class(), get_roots(), main(), _maybe_inflate(), read_log_bytes() (+2 more)

### Community 51 - "FakePackageLoader"
Cohesion: 0.17
Nodes (6): fake_package(), FakePackage, FakePackageLoader, A :class:`FakeModule` subclass which lazily creates :class:`FakePackage`…, A :term:`loader` of :class:`FakePackage` modules. When added to…, Mounts a fake package tree with the name *name*. This causes any attempt to…

### Community 52 - "FakeClassType"
Cohesion: 0.18
Nodes (3): FakeClassType, type, The metaclass used to create fake classes. To support comparisons between fake…

### Community 53 - "FakePackageLoader"
Cohesion: 0.17
Nodes (6): fake_package(), FakePackage, FakePackageLoader, A :class:`FakeModule` subclass which lazily creates :class:`FakePackage`…, A :term:`loader` of :class:`FakePackage` modules. When added to…, Mounts a fake package tree with the name *name*. This causes any attempt to…

### Community 54 - "FakeClassType"
Cohesion: 0.18
Nodes (3): FakeClassType, type, The metaclass used to create fake classes. To support comparisons between fake…

### Community 56 - "FakeClassType"
Cohesion: 0.18
Nodes (3): FakeClassType, type, The metaclass used to create fake classes. To support comparisons between fake…

### Community 58 - "FakeModule"
Cohesion: 0.20
Nodes (3): FakeModule, An object which pretends to be a module. *name* is the name of the module and…, Removes this module from :data:`sys.modules` and calls :meth:`_remove` on any…

### Community 59 - "unrpyc_legacy/testcases/test_un_rpyc.py"
Cohesion: 0.33
Nodes (8): build_module(), build_renpy_environment(), loads(), main(), RenpyLoader, test_unrpy(), test_unrpyb(), test_unrpyc()

### Community 60 - "FakeModule"
Cohesion: 0.20
Nodes (3): FakeModule, An object which pretends to be a module. *name* is the name of the module and…, Removes this module from :data:`sys.modules` and calls :meth:`_remove` on any…

### Community 61 - "unrpyc_v2/testcases/test_un_rpyc.py"
Cohesion: 0.33
Nodes (8): build_module(), build_renpy_environment(), loads(), main(), RenpyLoader, test_unrpy(), test_unrpyb(), test_unrpyc()

### Community 62 - "FakePackageLoader"
Cohesion: 0.18
Nodes (6): fake_package(), FakePackage, FakePackageLoader, A :class:`FakeModule` subclass which lazily creates :class:`FakePackage`…, A :term:`loader` of :class:`FakePackage` modules. When added to…, Mounts a fake package tree with the name *name*. This causes any attempt to…

### Community 63 - "FakeModule"
Cohesion: 0.20
Nodes (3): FakeModule, An object which pretends to be a module. *name* is the name of the module and…, Removes this module from :data:`sys.modules` and calls :meth:`_remove` on any…

### Community 64 - "_header.js"
Cohesion: 0.40
Nodes (8): allTabs(), build(), renderActiveTab(), renderCheatsTab(), renderTabBar(), selectTab(), styleButton(), togglePanel()

### Community 65 - "Pool"
Cohesion: 0.20
Nodes (4): Pool, Runs worker in parallel using multiprocessing, with a max of `parallelism`…, A minimal single-threaded mock of the multiprocessing.Pool class., run_workers()

### Community 66 - "rpgMakerRubyHandler.js"
Cohesion: 0.20
Nodes (7): BaseEngineHandler, fs, path, BaseEngineHandler, { execFile }, fs, path

### Community 67 - "CheatOverlayTemplate.js"
Cohesion: 0.27
Nodes (5): logToFile(), opentSetupSpeedHack(), opentSpeedActive(), pollCheat(), scanVariablesAndSwitches()

### Community 68 - "FakeClassFactory"
Cohesion: 0.22
Nodes (5): FakeClassFactory, __init__(), Factory of fake classes. It will create fake class definitions on demand based…, *special_cases* should be an iterable containing fake classes which should be…, Return the right class for the specified *module* and *name*. This class will…

### Community 70 - "check_e07.js"
Cohesion: 0.25
Nodes (7): currContent, currTexts, fs, origContent, origTexts, path, rc

### Community 71 - "SafePickler"
Cohesion: 0.33
Nodes (6): A pickler which can repickle object hierarchies containing objects created by…, A convenience function wrapping SafePickler. It functions similarly to…, safe_dump(), safe_dumps(), SafePickler, pickle_safe_dump()

### Community 73 - "SafePickler"
Cohesion: 0.33
Nodes (5): A pickler which can repickle object hierarchies containing objects created by…, A convenience function wrapping SafePickler. It functions similarly to…, safe_dump(), SafePickler, pickle_safe_dump()

### Community 74 - "unrpyc_legacy/testcases/validate_expected.py"
Cohesion: 0.60
Nodes (5): copy_rpy(), main(), normalize(), process_recursively(), Path

### Community 75 - "pickle_safe_loads"
Cohesion: 0.67
Nodes (5): pickle_safe_loads(), decompile_game(), decompile_rpyc(), ensure_dir(), read_ast_from_file()

### Community 77 - "unrpyc_v2/testcases/validate_expected.py"
Cohesion: 0.60
Nodes (5): copy_rpy(), main(), normalize(), process_recursively(), Path

### Community 79 - "marshal_bridge.py"
Cohesion: 0.60
Nodes (5): inject_rgss_runtime_script(), is_translatable(), marshal_encode_int(), process_ruby_marshal(), replace_marshal_string()

### Community 81 - "FakeStrict"
Cohesion: 0.50
Nodes (3): FakeStrict, FakeUnpicklingError, Error raised when there is not enough information to perform the fake…

### Community 84 - "restore_keys.js"
Cohesion: 0.50
Nodes (3): content, fs, keyMap

## Knowledge Gaps
- **119 isolated node(s):** `activeWsClients`, `{ loadGlossary, loadCfg }`, `{ translateBatch, translateSingle }`, `WebSocket`, `whttp` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SourceGenerator` connect `SourceGenerator` to `unren_tools/decompiler/__init__.py`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Decompiler` connect `Decompiler` to `unren_tools/decompiler/__init__.py`, `DecompilerBase`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `DecompilerBase` connect `DecompilerBase` to `Decompiler`, `SL2Decompiler`, `TestcaseDecompiler`, `SLDecompiler`, `unren_tools/decompiler/__init__.py`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Decompiler` (e.g. with `DecompilerBase` and `Dispatcher`) actually correct?**
  _`Decompiler` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Decompiler` (e.g. with `DecompilerBase` and `Dispatcher`) actually correct?**
  _`Decompiler` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Decompiler` (e.g. with `DecompilerBase` and `Dispatcher`) actually correct?**
  _`Decompiler` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `SLDecompiler` (e.g. with `DecompilerBase` and `Dispatcher`) actually correct?**
  _`SLDecompiler` has 3 INFERRED edges - model-reasoned connections that need verification._