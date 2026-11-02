# Static RPC reference

Operations found in src/services/rpcHandlers.js. Signatures describe source parameters, not complete implementation or verified runtime results. Check each operation body and the session/transport policies in httpServer.js and sessionGuard.js.

| Method | Source parameters | Line | Async |
| --- | --- | --- | --- |
| `addGameByPath` | `{ exePath, title }` | 379 | yes |
| `analyzeGame` | `params = {}` | 1982 | yes |
| `calculateVersionDiff` | `params = {}` | 2392 | no |
| `checkGame` | `` | 801 | no |
| `clearGlobalCache` | `` | 250 | no |
| `decompileRpyc` | `{ filePath, outputDir }` | 1620 | yes |
| `decryptImages` | `{ gameKey, gamePath, gameDir, destDir, type }` | 98 | yes |
| `delGame` | `{ key }` | 410 | no |
| `deleteGameCache` | `{ gameKey }` | 948 | no |
| `deleteSave` | `{ gameKey, file }` | 867 | no |
| `detectEngine` | `{ exePath, exeDir }` | 424 | no |
| `detectUntranslated` | `params = {}` | 2342 | yes |
| `dryRunGame` | `params = {}` | 1986 | yes |
| `engineInfo` | `{ eng } = {}` | 1284 | no |
| `evidenceList` | `` | 2089 | yes |
| `exportDiagnosticBundle` | `` | 2003 | no |
| `exportExcel` | `{ gameKey }` | 1779 | yes |
| `exportGameTexts` | `{ gameKey }` | 1170 | no |
| `extractAudio` | `params` | 134 | yes |
| `extractImages` | `params` | 131 | yes |
| `extractRpa` | `{ rpaPath, outputDir }` | 1585 | yes |
| `extractWolf` | `{ gamePath }` | 1662 | yes |
| `getCapabilityMatrix` | `` | 2297 | no |
| `getGameState` | `` | 1256 | no |
| `getHierarchicalGlossary` | `params = {}` | 2398 | no |
| `getJobStatus` | `{ jobId }` | 1994 | no |
| `getJobTelemetry` | `params = {}` | 2320 | no |
| `getLogs` | `{ afterId }` | 335 | no |
| `getProviderHealth` | `{ provider } = {}` | 2095 | yes |
| `getRenpyAppDataStatus` | `{ gameDir, gameTitle, engine }` | 2106 | yes |
| `getRuntimeTexts` | `params = {}` | 2380 | no |
| `getTriadInfo` | `params = {}` | 2006 | no |
| `heartbeat` | `` | 339 | no |
| `importExcel` | `{ gameKey, excelPath }` | 1887 | yes |
| `installOverlay` | `{ gameKey }` | 1390 | no |
| `installUnity` | `{ gameKey }` | 1491 | no |
| `launchGame` | `{ key }` | 520 | yes |
| `listSaves` | `{ gameKey }` | 804 | no |
| `listTranslationJobs` | `` | 1997 | no |
| `loadCfg` | `` | 332 | no |
| `loadGames` | `` | 347 | no |
| `loadGlossary` | `` | 1357 | no |
| `log` | `{ level, message }` | 1265 | no |
| `openSave` | `{ gameKey, file }` | 837 | no |
| `openSaveFolder` | `{ gameKey }` | 900 | no |
| `packRpa` | `{ inputDir, outputPath }` | 1601 | yes |
| `packWolf` | `{ inputDir, versionIndex }` | 1700 | yes |
| `patchGameFont` | `{ gameKey }` | 137 | no |
| `ping` | `` | 93 | no |
| `promoteRuntimeText` | `params = {}` | 2386 | no |
| `resolveShortcut` | `{ shortcutPath }` | 1333 | no |
| `restoreOriginalData` | `{ gameKey }` | 1006 | yes |
| `resumeTranslationJob` | `params = {}` | 2335 | no |
| `rollbackGame` | `params = {}` | 996 | yes |
| `routerRecommend` | `params = {}` | 2071 | yes |
| `runSelfTest` | `` | 2000 | no |
| `runSpeedBenchmark` | `params = {}` | 2307 | yes |
| `runVisualQA` | `params = {}` | 2366 | yes |
| `runtimeCaptureScreen` | `params = {}` | 2065 | yes |
| `runtimeProbe` | `params = {}` | 2059 | yes |
| `runtimeStartSession` | `params = {}` | 2030 | yes |
| `runtimeStopSession` | `params = {}` | 2046 | yes |
| `saveCfg` | `cfg` | 344 | no |
| `saveGame` | `{ key, data }` | 363 | no |
| `saveGlossary` | `params = {}` | 1360 | no |
| `scanGameVariables` | `params = {}` | 2200 | yes |
| `sendCheatCommand` | `params = {}` | 1205 | no |
| `setGameVar` | `{ id, value } = {}` | 2254 | yes |
| `stagingCleanup` | `params = {}` | 2083 | yes |
| `stagingPrepare` | `params = {}` | 2077 | yes |
| `startTranslationJob` | `params = {}` | 1990 | yes |
| `testRenpyCompatibility` | `{ exePath, gameDir, gameKey }` | 427 | yes |
| `translate` | `{ text, sl, tl }` | 1262 | yes |
| `translateRpgMaker` | `{ gameKey, overlay }` | 1637 | yes |
| `translateWithEngine` | `{ text, sl, tl, engine }` | 1364 | yes |
| `unpackAll` | `{ key, gameKey, gameDir, gamePath, targetDir, destDir }` | 2157 | yes |
| `unpackEvb` | `{ exePath, destDir }` | 1746 | yes |
| `unpackRenpyFull` | `params` | 2187 | yes |

Located operations: 78. Computed methods, assigned functions, and later source changes may require extraction again. This reference does not certify runtime behavior.
