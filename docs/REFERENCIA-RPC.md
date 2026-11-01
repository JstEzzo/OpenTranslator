# Referência estática das operações RPC

Métodos localizados no objeto `handlers` de `src/services/rpcHandlers.js`. A assinatura mostra parâmetros, não confirma que a implementação seja completa. Respostas e validações precisam ser consultadas no corpo do método. Token de sessão e políticas de transporte ficam em `httpServer.js`/`sessionGuard.js`.

| Método | Parâmetros na fonte | Linha | Assíncrono |
| --- | --- | --- | --- |
| `addGameByPath` | `{ exePath, title }` | 379 | sim |
| `analyzeGame` | `params = {}` | 1982 | sim |
| `calculateVersionDiff` | `params = {}` | 2392 | não |
| `checkGame` | `` | 801 | não |
| `clearGlobalCache` | `` | 250 | não |
| `decompileRpyc` | `{ filePath, outputDir }` | 1620 | sim |
| `decryptImages` | `{ gameKey, gamePath, gameDir, destDir, type }` | 98 | sim |
| `delGame` | `{ key }` | 410 | não |
| `deleteGameCache` | `{ gameKey }` | 948 | não |
| `deleteSave` | `{ gameKey, file }` | 867 | não |
| `detectEngine` | `{ exePath, exeDir }` | 424 | não |
| `detectUntranslated` | `params = {}` | 2342 | sim |
| `dryRunGame` | `params = {}` | 1986 | sim |
| `engineInfo` | `{ eng } = {}` | 1284 | não |
| `evidenceList` | `` | 2089 | sim |
| `exportDiagnosticBundle` | `` | 2003 | não |
| `exportExcel` | `{ gameKey }` | 1779 | sim |
| `exportGameTexts` | `{ gameKey }` | 1170 | não |
| `extractAudio` | `params` | 134 | sim |
| `extractImages` | `params` | 131 | sim |
| `extractRpa` | `{ rpaPath, outputDir }` | 1585 | sim |
| `extractWolf` | `{ gamePath }` | 1662 | sim |
| `getCapabilityMatrix` | `` | 2297 | não |
| `getGameState` | `` | 1256 | não |
| `getHierarchicalGlossary` | `params = {}` | 2398 | não |
| `getJobStatus` | `{ jobId }` | 1994 | não |
| `getJobTelemetry` | `params = {}` | 2320 | não |
| `getLogs` | `{ afterId }` | 335 | não |
| `getProviderHealth` | `{ provider } = {}` | 2095 | sim |
| `getRenpyAppDataStatus` | `{ gameDir, gameTitle, engine }` | 2106 | sim |
| `getRuntimeTexts` | `params = {}` | 2380 | não |
| `getTriadInfo` | `params = {}` | 2006 | não |
| `heartbeat` | `` | 339 | não |
| `importExcel` | `{ gameKey, excelPath }` | 1887 | sim |
| `installOverlay` | `{ gameKey }` | 1390 | não |
| `installUnity` | `{ gameKey }` | 1491 | não |
| `launchGame` | `{ key }` | 520 | sim |
| `listSaves` | `{ gameKey }` | 804 | não |
| `listTranslationJobs` | `` | 1997 | não |
| `loadCfg` | `` | 332 | não |
| `loadGames` | `` | 347 | não |
| `loadGlossary` | `` | 1357 | não |
| `log` | `{ level, message }` | 1265 | não |
| `openSave` | `{ gameKey, file }` | 837 | não |
| `openSaveFolder` | `{ gameKey }` | 900 | não |
| `packRpa` | `{ inputDir, outputPath }` | 1601 | sim |
| `packWolf` | `{ inputDir, versionIndex }` | 1700 | sim |
| `patchGameFont` | `{ gameKey }` | 137 | não |
| `ping` | `` | 93 | não |
| `promoteRuntimeText` | `params = {}` | 2386 | não |
| `resolveShortcut` | `{ shortcutPath }` | 1333 | não |
| `restoreOriginalData` | `{ gameKey }` | 1006 | sim |
| `resumeTranslationJob` | `params = {}` | 2335 | não |
| `rollbackGame` | `params = {}` | 996 | sim |
| `routerRecommend` | `params = {}` | 2071 | sim |
| `runSelfTest` | `` | 2000 | não |
| `runSpeedBenchmark` | `params = {}` | 2307 | sim |
| `runVisualQA` | `params = {}` | 2366 | sim |
| `runtimeCaptureScreen` | `params = {}` | 2065 | sim |
| `runtimeProbe` | `params = {}` | 2059 | sim |
| `runtimeStartSession` | `params = {}` | 2030 | sim |
| `runtimeStopSession` | `params = {}` | 2046 | sim |
| `saveCfg` | `cfg` | 344 | não |
| `saveGame` | `{ key, data }` | 363 | não |
| `saveGlossary` | `params = {}` | 1360 | não |
| `scanGameVariables` | `params = {}` | 2200 | sim |
| `sendCheatCommand` | `params = {}` | 1205 | não |
| `setGameVar` | `{ id, value } = {}` | 2254 | sim |
| `stagingCleanup` | `params = {}` | 2083 | sim |
| `stagingPrepare` | `params = {}` | 2077 | sim |
| `startTranslationJob` | `params = {}` | 1990 | sim |
| `testRenpyCompatibility` | `{ exePath, gameDir, gameKey }` | 427 | sim |
| `translate` | `{ text, sl, tl }` | 1262 | sim |
| `translateRpgMaker` | `{ gameKey, overlay }` | 1637 | sim |
| `translateWithEngine` | `{ text, sl, tl, engine }` | 1364 | sim |
| `unpackAll` | `{ key, gameKey, gameDir, gamePath, targetDir, destDir }` | 2157 | sim |
| `unpackEvb` | `{ exePath, destDir }` | 1746 | sim |
| `unpackRenpyFull` | `params` | 2187 | sim |

Total localizado: 78. Métodos calculados, funções atribuídas e alterações posteriores podem exigir nova extração. Esta referência não deve ser usada para ignorar validações de entrada ou o status retornado.
