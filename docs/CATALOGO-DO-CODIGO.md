# File-by-file code catalogue

Editorial descriptions are distinguished from location-based inferences. Symbols and imports are static approximations, not proof of functional completeness.

## `.github/workflows/release.yml`

GitHub workflow for verification or portable package builds.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2104 bytes; lines: 64.
- Reading: Full decoded text.
- SHA-256: `46c52b773e23900264ae81227b1e4211d9588e8b8b98f51041255090b7211227`.

## `.github/workflows/verify.yml`

GitHub workflow for verification or portable package builds.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 392 bytes; lines: 24.
- Reading: Full decoded text.
- SHA-256: `782adca02ae7d8bcdab6a91c45b3f5c6c7dcf5fe2654e11e0e526bea136956a9`.

## `.gitignore`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 2623 bytes; lines: 118.
- Reading: Full decoded text.
- SHA-256: `6299d2cca71e1af851f42a0349ff60bdbc8e2b7a0cd3005a6f0dcd5ee7d764ab`.

## `config/engineCompatibility.json`

Product configuration or compatibility profile; declarations require per-game validation.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13390 bytes; lines: 358.
- Reading: Full decoded text.
- SHA-256: `c353cbfa425f3db4f3ed933bd407eda3f352ac26b41fb0cd16db35f0a00fbbdd`.
- Static incoming references: `src/core/engineCapabilityMatrix.js`, `src/services/rpcHandlers.js`.

## `config/restore_config.json`

Product configuration or compatibility profile; declarations require per-game validation.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 29781 bytes; lines: 785.
- Reading: Full decoded text.
- SHA-256: `5b265b9ea7624fbaa7eaab06c72586089d895527c28e4378fa683119a55d2d98`.

## `config/syntax_rules.json`

Product configuration or compatibility profile; declarations require per-game validation.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 992 bytes; lines: 55.
- Reading: Full decoded text.
- SHA-256: `7e9b00dc878de87b224cac4e1f84d9a88fcefbccfda213ca3626a4e1008c3561`.

## `launcher/OpenTranslatorLauncher.cs`

Native Windows launcher source and startup checks.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 66669 bytes; lines: 1560.
- Reading: Full decoded text.
- SHA-256: `077f90a6caa21aa3347ccf32f55d277637d7946ef30db62d4d697c45a64db027`.
- Symbols (name:line): `foreach:28`, `using:61`, `using:90`, `using:249`, `foreach:305`, `lock:316`, `foreach:376`, `using:608`, `using:615`, `using:658`, `using:665`, `using:718`, `using:746`, `using:763`, `using:784`, `using:860`, `lock:883`, `foreach:913`, `foreach:1081`, `foreach:1379`, `foreach:1535`.
- Literal imports: `ws`, `better-sqlite3`.

## `LICENSE`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 1121 bytes; lines: 26.
- Reading: Full decoded text.
- SHA-256: `26c174355f757b5b65ce0ffd3b427e874b652dce3e2d698d70950c2ffedd862a`.

## `OpenTranslator.exe`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 51712 bytes; lines: not interpreted.
- Reading: Bytes read; content not interpreted.
- SHA-256: `5e91bdf7c7ae650c13c63ac368d8ec60303aab8bc86b46b2f4b1e604de12767a`.

## `package-lock.json`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 56925 bytes; lines: 1273.
- Reading: Full decoded text.
- SHA-256: `bcc1312d55a30a1def029ac978a698c99af9006a9f2d8702730ad1a35329f72a`.
- Literal imports: `node:util`.

## `package.json`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 973 bytes; lines: 30.
- Reading: Full decoded text.
- SHA-256: `a5439f41bd55d91b648bc701f11c468251f32a802c6dc5ea560f63a9279cba1f`.

## `README.md`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 6215 bytes; lines: 98.
- Reading: Full decoded text.
- SHA-256: `0ce2a13ecccb6a0e325f88d1f6838eb09f177c1e82d82e952306f747669099c7`.

## `server.js`

Project file, bundled component, or resource. Presence and hash do not certify behavior.

- Category: Product / development tool.
- Description basis: Metadata and location.
- Size: 3557 bytes; lines: 90.
- Reading: Full decoded text.
- SHA-256: `67bcfb7baa9c64d988d367e4e0b3a86dddf266690b0c77cae932c8fcb9b9644d`.
- Literal imports: `fs`, `path`, `https`, `./src/utils/loggerManager`, `./src/utils/logger`, `./src/core/shutdownCoordinator`, `./src/services/cache`, `./src/services/httpServer`, `./src/services/cheatServer`.

## `src/core/adaptiveConcurrency.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4786 bytes; lines: 129.
- Reading: Full decoded text.
- SHA-256: `f6457d9139c6e62aca8a3153e688411232024c337ff7418c94ea1766609d6ae3`.
- Symbols (name:line): `AdaptiveConcurrencyController:9`, `getConcurrency:30`, `recordSuccess:44`, `recordError:75`, `getAvgLatency:93`, `getP95Latency:98`, `getP50Latency:105`, `getMetrics:112`.
- Static incoming references: `src/core/selfTest.js`, `src/core/translationQueue.js`, `tests/regression/adaptive_concurrency.test.js`.

## `src/core/applyContract.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 14424 bytes; lines: 320.
- Reading: Full decoded text.
- SHA-256: `fdaa54798bfe89a5f07269c5029edee965225f237918c95daadefe54e8a40614`.
- Symbols (name:line): `planFilesFromTexts:81`, `startApplyContract:135`, `wrote:170`, `stats:209`, `finish:226`, `resolveInsideRoot:276`.
- Literal imports: `fs`, `path`, `./applyTransaction`.
- Static incoming references: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `tests/unit/applyContract.test.js`.

## `src/core/applyGate.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1993 bytes; lines: 62.
- Reading: Full decoded text.
- SHA-256: `2f31e37a5c125ca4ecd9666e6a22006edbb58ae62479f33202f5ad06ee94f222`.
- Symbols (name:line): `ApplyGate:3`, `verifyPreApply:8`, `verifyPostApply:43`.
- Literal imports: `fs`, `./placeholderIntegrityValidator`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/core/applyTransaction.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 15788 bytes; lines: 449.
- Reading: Full decoded text.
- SHA-256: `c0da1474da9c1c2629e038f3255acb8720706df953b5ab976c9e8bf4208849bf`.
- Symbols (name:line): `hashFile:55`, `hashText:66`, `verifyBackup:82`, `verifyApplied:110`, `applyTransaction:138`, `rollback:386`.
- Literal imports: `fs`, `path`, `crypto`, `./transactionJournal`.
- Static incoming references: `src/core/applyContract.js`, `src/core/translationPipeline.js`, `tests/unit/applyContract.test.js`.

## `src/core/applyVerifier.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8029 bytes; lines: 231.
- Reading: Full decoded text.
- SHA-256: `c7211e307b95448e81cfd3ce4b59cef306dd8d9105d9e9b10437ac379dd153e8`.
- Symbols (name:line): `normalizeForCompare:44`, `normKey:52`, `visibleText:57`, `extractTextList:75`, `evidenceHash:84`, `verifyApplied:103`.
- Literal imports: `crypto`.
- Static incoming references: `src/core/translationPipeline.js`.

## `src/core/backupManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 14500 bytes; lines: 422.
- Reading: Full decoded text.
- SHA-256: `69822c34bc37eb6868767be7728d458c43b07ee27698c32e87691b56d24714a2`.
- Symbols (name:line): `BackupManager:16`, `getFileHash:25`, `createDirectoryManifest:53`, `compareManifests:129`, `createSessionBackup:204`, `restoreSessionBackup:284`, `createBackup:408`, `restore:411`, `restoreOldestBackup:415`.
- Literal imports: `fs`, `path`, `crypto`, `../core/partialApply`.
- Static incoming references: `src/core/gameEngine.js`, `src/core/gameService.js`, `src/core/jobSystem.js`, `src/core/patchInstaller.js`, `src/core/pluginSafePatcher.js`, `src/core/realGameWorkflow.js`, `src/core/realTranslationWorkflow.js`, `src/core/translationPipeline.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/real_ui_certification_runner.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/baseEngineAdapter.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10215 bytes; lines: 298.
- Reading: Full decoded text.
- SHA-256: `c9647b5409647707c8f79606d56e01cde5deedba12d0a37ae2c30c0fa6b90e8e`.
- Symbols (name:line): `BaseEngineAdapter:8`, `detect:23`, `inspect:69`, `getCapabilities:85`, `getDetailedDeclaration:102`, `extractTexts:125`, `extract:132`, `extractResources:142`, `prepareTranslation:158`, `translate:179`, `restorePlaceholders:189`, `validate:203`, `applyTranslations:210`, `apply:217`, `package:224`, `launch:231`, `rollback:238`, `diagnose:245`, `getDiagnostics:248`.
- Literal imports: `./engineDetector`.
- Static incoming references: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/batchOptimizer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2053 bytes; lines: 61.
- Reading: Full decoded text.
- SHA-256: `b5d71c1db53f12a5f965d9c803c89adab96596907364be0b2eab6d896b71170e`.
- Symbols (name:line): `BatchOptimizer:10`, `buildBatches:18`.
- Static incoming references: `src/core/translationQueue.js`.

## `src/core/cachePolicy.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4851 bytes; lines: 165.
- Reading: Full decoded text.
- SHA-256: `fd734a367fb37b4955752d0de21c605e0aaa6dcf21b72434220efb6f53c14122`.
- Symbols (name:line): `BoundedLRUCache:2`, `buildKey:22`, `_estimateSize:29`, `get:34`, `set:60`, `_evictLRU:95`, `_deleteEntry:105`, `pruneExpired:113`, `invalidateVersion:126`, `clear:138`, `getStats:143`.
- Literal imports: `crypto`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/core/capabilityEvidenceAggregator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2702 bytes; lines: 68.
- Reading: Full decoded text.
- SHA-256: `4bc219ca599e10233e0146e77bc72c0a6223a7a20b10954c67fef0d36ed6589f`.
- Symbols (name:line): `CapabilityEvidenceAggregator:11`, `aggregate:21`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/services/rpcHandlers.js`.

## `src/core/claimAudit.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2797 bytes; lines: 82.
- Reading: Full decoded text.
- SHA-256: `403a65c5f25beb8da4ba0c25200e0822e6ab64e014538d0501fc582094ae8bc8`.
- Symbols (name:line): `ClaimAudit:10`, `auditClaim:15`.
- Literal imports: `fs`.
- Static incoming references: `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/codeProtector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6145 bytes; lines: 165.
- Reading: Full decoded text.
- SHA-256: `6eabf1830350e73af78236e7ddc11485e1a2cda6d67a31e1c369698cd0200ddd`.
- Symbols (name:line): `CodeProtector:5`, `getPatterns:18`, `protect:64`, `restore:89`, `validateTokens:153`.
- Literal imports: `./qaEngine`.
- Static incoming references: `src/core/coverageGuarantor.js`, `src/core/runtimeTextManager.js`, `src/core/translationPipeline.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/renpy/extractor/renpyExtractor.js`, `src/engines/renpy/translator/renpyTranslator.js`, `src/engines/renpy/validator/renpyValidator.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/regression/unity_code_protector.test.js`.

## `src/core/contentLayerManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3998 bytes; lines: 133.
- Reading: Full decoded text.
- SHA-256: `d89d7f947d228385da930c594286e4f6b1f8d12de12275968697e0a8b4409d01`.
- Symbols (name:line): `ContentLayerManager:21`, `classifyPath:29`, `isSafeForTranslation:97`, `separateTextsByLayer:108`.
- Literal imports: `path`.
- Static incoming references: `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/coverageGuarantor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 19989 bytes; lines: 463.
- Reading: Full decoded text.
- SHA-256: `9278809558927e19961af595ae3533c5dcad47385e5c9463abd7f3066fce8011`.
- Symbols (name:line): `CoverageGuarantor:45`, `isDisplayableContent:68`, `auditAndRecover:140`.
- Literal imports: `./qaEngine`, `./translationMemory`, `../services/cache`, `./codeProtector`, `./scriptDetector`, `../translation/translator`.
- Static incoming references: `src/core/translationPipeline.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/test_renpy_coverage_generalization.test.js`.

## `src/core/diagnosticBundle.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2091 bytes; lines: 64.
- Reading: Full decoded text.
- SHA-256: `5c1323cda2fa9ed819f3a9f9189d415d2c2c61941b4cbff4ee97dfdc653a598e`.
- Symbols (name:line): `DiagnosticBundle:11`, `redact:13`, `generateReport:21`, `formatActionableFailure:39`, `formatApplicationFailure:51`.
- Literal imports: `fs`, `path`, `os`, `./selfTest`.
- Static incoming references: `src/core/gameService.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/run-phase2-tests.js`.

## `src/core/displayTextClassifier.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8676 bytes; lines: 204.
- Reading: Full decoded text.
- SHA-256: `c91c57f7bf74a408feffcaa821000d2256927b53e877b53dfeb465b17824f8cb`.
- Symbols (name:line): `classifyDisplayText:117`.
- Static incoming references: `src/engines/renpy/extractor/renpyExtractor.js`.

## `src/core/engineCapabilityMatrix.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2580 bytes; lines: 43.
- Reading: Full decoded text.
- SHA-256: `65e838047990ecf7aadc688f0c71a04fe749a41f24b89a8ecf756323315857ac`.
- Symbols (name:line): `declarations:7`, `EngineCapabilityMatrix:22`, `getAll:23`, `getDeclarations:24`, `getEngine:25`, `getMatrixSummary:26`, `getFormattedTable:31`, `saveMatrixFile:35`.
- Literal imports: `fs`, `path`, `../../config/engineCompatibility.json`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/engine_adapter_contract.test.js`.

## `src/core/engineDetector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 28651 bytes; lines: 688.
- Reading: Full decoded text.
- SHA-256: `be628fde278bdc434f8cf8e1f22e2c7e4bf804674eb8705ec62fa99298860994`.
- Symbols (name:line): `EngineDetector:9`, `getExeArch:14`, `checkBinarySignatures:21`, `detect:49`.
- Literal imports: `fs`, `path`, `./executableInfo`.
- Static incoming references: `src/core/baseEngineAdapter.js`, `src/core/gameEngine.js`, `src/core/gameService.js`, `src/core/libraryDiscovery.js`, `src/core/realGameWorkflow.js`, `src/core/translationPipeline.js`, `src/diagnostics/universalGameIntelligence.js`, `src/discovery/unknownGameTriage.js`, `src/mediaExtractor/index.js`, `src/services/rpcHandlers.js`, `tests/real_ui_certification_runner.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/engine_detection.test.js`, `tests/regression/rgss_real_pipeline.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/unity_comprehensive_suite.js`, `tests/regression/wolf_real_pipeline.test.js`, `tests/run-lab-tests.js`, `tests/test_core_detector.js`, `tests/test_multi_game_pipeline.js`, `tests/unit/executableCompatibility.test.js`.

## `src/core/engineRegistry.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3634 bytes; lines: 94.
- Reading: Full decoded text.
- SHA-256: `f36204cc120210b59b1e8ea69f235ecfb19579fa311ddad5c9781a1c97427b6a`.
- Symbols (name:line): `EngineRegistry:8`, `register:13`, `get:20`, `getAll:24`, `resolveAdapter:28`.
- Literal imports: `../engines/renpy/renpyAdapter`, `../engines/rpgmaker/rpgMakerAdapter`, `../engines/unity/unityAdapter`, `../engines/unreal/unrealAdapter`, `../engines/godot/godotAdapter`, `../engines/gamemaker/gameMakerAdapter`, `../engines/construct/constructAdapter`, `../engines/defold/defoldAdapter`, `../engines/cocos/cocosCreatorAdapter`, `../engines/cocos/cocos2dxAdapter`, `../engines/wolf/wolfAdapter`, `../engines/rpgmaker/rgssAdapter`, `../engines/gdevelop/gdevelopAdapter`, `../engines/electron/electronAdapter`, `../engines/generic/genericAdapter`.
- Static incoming references: `src/core/gameService.js`, `src/core/selfTest.js`, `src/core/translationPipeline.js`, `tests/real_ui_certification_runner.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/engine_adapter_contract.test.js`, `tests/regression/run-all-tests.js`, `tests/run-lab-tests.js`.

## `src/core/engineRoutingGuard.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1454 bytes; lines: 42.
- Reading: Full decoded text.
- SHA-256: `696544f72f3e4829bf461f52d17aac17c4b19d165d520e5b10fc1ba4ccfbe5c5`.
- Symbols (name:line): `EngineRoutingGuard:6`, `check:8`.
- Static incoming references: `src/discovery/renpyAppDataResolver.js`, `src/services/rpcHandlers.js`, `tests/regression/engine_diagnostic_routing.test.js`, `tests/regression/engine_launch_routing.test.js`, `tests/regression/engine_routing_all_engines.test.js`.

## `src/core/engineRuntimeTriad.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10308 bytes; lines: 248.
- Reading: Full decoded text.
- SHA-256: `d7b0ec1afb64981bb96fb3c30e5859e446d8c773ae656bfca7a71f505020bf50`.
- Symbols (name:line): `EngineRuntimeTriad:15`, `resolve:26`, `_evaluateCapabilities:178`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/run-phase6-tests.js`.

## `src/core/evidenceModel.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8981 bytes; lines: 232.
- Reading: Full decoded text.
- SHA-256: `f52ddbcd6017123b6f8ae0e470d96f07d8ec77719aef1b136329af9d51ccbb1f`.
- Symbols (name:line): `EvidenceModel:12`, `recordEvidence:88`, `getGrade:180`, `validateClaim:192`, `toJSON:209`.
- Static incoming references: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/executableInfo.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1073 bytes; lines: 25.
- Reading: Full decoded text.
- SHA-256: `c11569f3bd6edb821dd6cb73f197201284298c9faf13e91fc1d2bd1046c151b5`.
- Symbols (name:line): `readExecutableInfo:4`, `executableBits:20`.
- Literal imports: `fs`.
- Static incoming references: `src/core/engineDetector.js`, `src/core/gameEngine.js`, `tests/unit/executableCompatibility.test.js`.

## `src/core/fastTextPipeline.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12317 bytes; lines: 313.
- Reading: Full decoded text.
- SHA-256: `6cef1f9a2f693a68936e383c5642bc8513617a048e0551b5c7a289b2b8c0faac`.
- Symbols (name:line): `normalizeProviderResult:55`, `FastTextPipeline:79`, `enqueue:108`, `processItem:136`.
- Literal imports: `perf_hooks`, `./translationResult`.
- Static incoming references: `tests/regression/run-phase6-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/fontCompatibilityEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3852 bytes; lines: 108.
- Reading: Full decoded text.
- SHA-256: `71f4424ab865c26d90806ba8683b7f522daa51c7d9e8863358accad8c8c2ba38`.
- Symbols (name:line): `FontCompatibilityEngine:14`, `analyzeGlyphRequirements:21`, `recommendFont:77`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/formatAdapterRegistry.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10640 bytes; lines: 322.
- Reading: Full decoded text.
- SHA-256: `9954aaf232b15a44ee30bd5441e98d4f5b643dbe1b1ceec82bd564e860b40237`.
- Symbols (name:line): `BaseFormatAdapter:13`, `detect:18`, `extract:19`, `preview:20`, `apply:21`, `verify:22`, `rollbackSupport:23`, `capabilities:24`, `JsonAdapter:26`, `detect:29`, `extract:33`, `apply:57`, `PoAdapter:94`, `detect:97`, `apply:101`, `RenpyAdapter:138`, `detect:141`, `apply:145`, `_escape:174`, `CsvAdapter:179`, `detect:182`, `apply:186`, `TextAdapter:235`, `detect:237`, `capabilities:262`, `apply:276`, `FormatAdapterRegistry:289`, `getAdapter:300`.
- Literal imports: `path`.
- Static incoming references: `src/core/patchInstaller.js`, `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase9-tests.js`.

## `src/core/formatAwareOutput.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5790 bytes; lines: 186.
- Reading: Full decoded text.
- SHA-256: `b69671f5681299f438d59397869677edda1702f0cf01c2db420ae94be24452ea`.
- Symbols (name:line): `FormatAwareOutput:14`, `apply:23`, `applyJson:44`, `applyPo:78`, `applyRpy:103`, `applyCsv:136`, `applyText:162`, `_escapeRegExp:179`.
- Static incoming references: `tests/regression/run-phase8b-tests.js`.

## `src/core/gameEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 61265 bytes; lines: 1754.
- Reading: Full decoded text.
- SHA-256: `747ebb2096b4cd994f2fe780bc61c25071d88041c8e823e561719bddd9cdec58`.
- Symbols (name:line): `getUnrealEngineHandler:28`, `getRenpyCommon:53`, `findGameRoot:81`, `detectEngine:87`, `getExeArch:244`, `getHookDll:248`, `autoWrapText:280`, `patchGameData:326`, `patchParam:371`, `patchParamObject:438`, `backupGameData:894`, `restoreGameData:904`, `restoreOldestBackup:908`, `checkProcessRunning:961`, `findGameOnDisk:973`, `scan:986`, `runPythonScript:1090`, `healGameData:1131`, `restoreEngineData:1213`, `injectLatinNameInput:1317`, `healFonts:1383`, `extractAllRenpyRpyTexts:1445`, `scan:1455`, `executeTranslationPipeline:1494`, `getValueAtPath:1722`.
- Literal imports: `fs`, `path`, `os`, `child_process`, `../extractors/extractor`, `../engines/unreal/unrealHandler`, `../services/cache`, `../translation/translator`, `../utils/utils`, `../engines/renpy/renpyCommon`, `./executableInfo`, `./pluginSafePatcher`, `./legacyGameRestore`, `./backupManager`, `./engineDetector`.
- Static incoming references: `src/core/shutdownCoordinator.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/test_engine_detection.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`.

## `src/core/gameRules.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 870 bytes; lines: 27.
- Reading: Full decoded text.
- SHA-256: `154a9d359d09cf270126b36d555a4a995516d3d13273996703b27f4f02fd3e9b`.
- Symbols (name:line): `GameRules:1`, `shouldIgnore:9`, `shouldForce:17`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/gameService.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10650 bytes; lines: 289.
- Reading: Full decoded text.
- SHA-256: `2000784ffb009bc6aa0cf4563b0057358b8e89d0c2757e928cd94c366a9a2471`.
- Symbols (name:line): `GameService:22`, `analyzeGame:32`, `dryRun:65`, `applyTranslation:72`, `startTranslationJob:85`, `getJob:117`, `listJobs:123`, `rollback:152`, `launchGame:253`, `selfTest:277`, `exportDiagnosticBundle:281`.
- Literal imports: `./strategyPlanner`, `./transactionJournal`, `fs`, `path`, `child_process`, `./engineDetector`, `./engineRegistry`, `./translationPipeline`, `./jobSystem`, `./ownedProcess`, `./backupManager`, `./selfTest`, `./diagnosticBundle`, `./translationMemory`, `./shutdownCoordinator`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/real_ui_certification_runner.js`, `tests/regression/lab_phase3_real_apply.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/globalCircuitBreaker.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 11949 bytes; lines: 317.
- Reading: Full decoded text.
- SHA-256: `4af457d95f08bb3921fa619bc5498650698ffb4b1ef64c85c33a3c04c0cbc55d`.
- Symbols (name:line): `ProviderCircuitState:24`, `GlobalCircuitBreaker:48`, `getInstance:58`, `_getProviderState:65`, `canExecute:73`, `recordRequestStart:147`, `recordRequestEnd:152`, `recordSuccess:157`, `recordError:181`, `_applyFailureCooldown:268`, `getProviderHealth:283`, `reset:305`.
- Static incoming references: `src/core/providerGateway.js`, `src/core/translationPipeline.js`, `src/services/rpcHandlers.js`, `src/translation/translator.js`, `tests/regression/circuit_breaker_100_workers.test.js`, `tests/regression/provider_bypass_prevention.test.js`, `tests/regression/provider_circuit_half_open.test.js`, `tests/regression/provider_failover_strict.test.js`, `tests/regression/provider_health.test.js`, `tests/regression/provider_rate_limit_storm.test.js`, `tests/test_text_chunking_and_provider_resilience.test.js`, `tests/unit/explicitProviderChoice.test.js`.

## `src/core/glossaryEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4702 bytes; lines: 147.
- Reading: Full decoded text.
- SHA-256: `7d15c6748f446a70500d416c9247cd93ba5f54ae47ba02eb2f21228144b34a1e`.
- Symbols (name:line): `GlossaryEngine:14`, `addRule:35`, `_getActiveRules:66`, `apply:95`, `validate:117`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/healthMonitor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2861 bytes; lines: 110.
- Reading: Full decoded text.
- SHA-256: `3ad3e0aee58297e1027130d19f459785e5cb832c6b5a8703245ac13291a3385a`.
- Symbols (name:line): `HealthMonitor:10`, `registerProvider:21`, `recordSuccess:40`, `recordFailure:56`, `isUsable:77`, `getStatusSummary:95`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/hierarchicalGlossary.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8990 bytes; lines: 253.
- Reading: Full decoded text.
- SHA-256: `23c8d85acbb10836fc5b8d5b25477cd90e2d59aacc49b5e86c0712048d88ba85`.
- Symbols (name:line): `HierarchicalGlossary:29`, `getInstance:49`, `_loadStandardGlossaries:56`, `addTerm:106`, `loadProjectGlossary:135`, `resolveTerm:160`, `getActiveTerms:205`, `apply:235`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/imageTextLayer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1453 bytes; lines: 42.
- Reading: Full decoded text.
- SHA-256: `ae47fd9937f79d58519e1684ebdbbde6005bab371e430ffbd128b7b4be609169`.
- Symbols (name:line): `ImageTextLayer:12`, `isLikelyTextImage:17`, `getLocalizedAssetPath:35`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/jobPersistence.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1731 bytes; lines: 53.
- Reading: Full decoded text.
- SHA-256: `b690273ecf22908a025ea65e78cc9fd862ee72470438c8886cdbbc9eadea1f7a`.
- Symbols (name:line): `JobPersistence:10`, `getJobFilePath:17`, `saveJob:21`, `loadJob:30`, `deleteJob:40`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/translationPipeline.js`, `src/core/translationQueue.js`, `src/services/rpcHandlers.js`, `tests/regression/job_persistence_117k_realistic.test.js`, `tests/regression/provider_resume.test.js`, `tests/regression/translation_resume.test.js`.

## `src/core/jobSystem.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10777 bytes; lines: 331.
- Reading: Full decoded text.
- SHA-256: `032d5025a9d227a53d91a84d84eb684b5c62fc0265f001b0268d55fc0069d7bc`.
- Symbols (name:line): `JobSystem:36`, `createJob:51`, `getJob:84`, `updateJobState:101`, `updateProgress:129`, `createSnapshot:143`, `saveCheckpoint:169`, `loadCheckpoint:183`, `resumeJob:199`, `rollbackJob:224`, `commitJob:242`, `calculateTranslationDiff:256`, `cancelJob:299`, `persist:303`, `listRecentJobs:309`.
- Literal imports: `fs`, `path`, `crypto`, `./backupManager`.
- Static incoming references: `src/core/gameService.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/unit/backgroundJobLifecycle.test.js`.

## `src/core/layoutAnalyzer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1481 bytes; lines: 46.
- Reading: Full decoded text.
- SHA-256: `a9935b846f4a924756709712fc8ca54145fe3e8536498046890ac30739c25fa6`.
- Symbols (name:line): `LayoutAnalyzer:1`, `analyzeExpansion:5`, `FontCompatibilityAnalyzer:27`, `checkCoverage:29`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/legacyGameRestore.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7979 bytes; lines: 133.
- Reading: Full decoded text.
- SHA-256: `80e94c42121c137d042ddbcc8b5da19b7579a8c4dbf3805a389e97eb8f445505`.
- Symbols (name:line): `hash:6`, `walk:7`, `restoreGameData:17`, `backupGameData:103`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `src/core/gameEngine.js`, `tests/unit/legacyGameRestore.test.js`.

## `src/core/libraryDiscovery.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 15555 bytes; lines: 411.
- Reading: Full decoded text.
- SHA-256: `e809d243c3739dfa7a6cd787623de00054b8fc198eb6f0122f746fef255eb2a2`.
- Symbols (name:line): `LibraryDiscovery:19`, `classifyItem:30`, `scanLibrary:325`.
- Literal imports: `fs`, `path`, `./engineDetector`.
- Static incoming references: `tests/real_ui_certification_runner.js`.

## `src/core/localDictionaryProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6546 bytes; lines: 200.
- Reading: Full decoded text.
- SHA-256: `2704efc8e70fe58d84f2c882b298784cbad7402d7733b74770aeb867f0f3e227`.
- Symbols (name:line): `LocalDictionaryProvider:12`, `translate:79`, `translateBatch:154`, `_matchCase:163`, `_escapeRegExp:172`, `_levenshtein:176`.
- Static incoming references: `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/logDeduplicator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2608 bytes; lines: 87.
- Reading: Full decoded text.
- SHA-256: `b064359880a2aaf84569a2d16f78e3b4441731b4b6ed9472eab6d2d0d2306ee4`.
- Symbols (name:line): `LogDeduplicator:6`, `getInstance:13`, `logRateLimit:20`, `getSummary:46`, `emitSummary:61`, `reset:71`.
- Static incoming references: `src/translation/translator.js`, `tests/regression/log_deduplication.test.js`.

## `src/core/multiLevelCache.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3269 bytes; lines: 90.
- Reading: Full decoded text.
- SHA-256: `d2c1aa1c157bd0e5563c840d8ccc89c6f4bb9216ad1d05f52cac14167ca9d601`.
- Symbols (name:line): `MultiLevelCache:4`, `_hashKey:16`, `setManualOverride:20`, `get:26`, `setL1:56`, `setL3:66`, `getStats:75`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/outputProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 711 bytes; lines: 21.
- Reading: Full decoded text.
- SHA-256: `88b5bc691517de68c921bfab47454bee61871e513a38022abecb0f5c61cded51`.
- Symbols (name:line): `OutputProvider:1`, `deliver:2`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/ownedProcess.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 785 bytes; lines: 18.
- Reading: Full decoded text.
- SHA-256: `c5a174e646bed903fbe589bd27d15666c3419d2d6ddceac206ee932770373efa`.
- Literal imports: `./ownedProcessRegistry`.
- Static incoming references: `src/core/gameService.js`.

## `src/core/ownedProcessRegistry.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 16866 bytes; lines: 481.
- Reading: Full decoded text.
- SHA-256: `6c54af1122730a78d4d14b714769f0de32cb3220ca45fc7629eff0f9860260cf`.
- Symbols (name:line): `registryFile:43`, `normalizeExe:50`, `readProcessStartTime:65`, `readProcessExecutable:90`, `readProcessCommandLine:109`, `probeProcess:128`, `OwnedProcessRegistry:140`, `register:156`, `isOwned:210`, `get:214`, `unregister:220`, `verifyPidIntegrity:231`, `stop:285`, `stopSession:362`, `list:382`, `shutdownAll:395`, `_save:412`, `_load:434`, `_clearPersisted:465`.
- Literal imports: `child_process`, `path`, `fs`.
- Static incoming references: `src/core/ownedProcess.js`, `src/core/runtimeSessionManager.js`, `src/core/shutdownCoordinator.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/partialApply.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5960 bytes; lines: 159.
- Reading: Full decoded text.
- SHA-256: `14ea374833485841387b4d95812409869902b0355cbce0ffdc76196233d40805`.
- Symbols (name:line): `PartialReport:61`, `ok:78`, `fail:84`, `skip:97`, `report:117`, `complete:154`.
- Static incoming references: `src/core/backupManager.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/injector/renpyInjector.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`.

## `src/core/patchInstaller.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12257 bytes; lines: 346.
- Reading: Full decoded text.
- SHA-256: `dc112cb9721e356c30b51299f05dcbf83d77a1b698d3628464fcfc6157d05337`.
- Symbols (name:line): `PatchInstaller:20`, `verifyCompatibility:30`, `preview:73`, `applyPatch:104`, `removePatch:244`, `updatePatch:256`, `_sanitizeAndResolvePath:263`, `_atomicWriteFileSync:309`.
- Literal imports: `fs`, `path`, `crypto`, `./backupManager`, `./translationPatchSchema`, `./transactionJournal`, `./formatAdapterRegistry`.
- Static incoming references: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-phase9-tests.js`.

## `src/core/performanceMonitor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1114 bytes; lines: 35.
- Reading: Full decoded text.
- SHA-256: `bdcb9347dd33c17ef07db7a6058fba0d49784dabe9f3ffc8f8a47717cc6a9ff2`.
- Symbols (name:line): `PerformanceMonitor:1`, `recordTranslation:8`, `getSnapshot:16`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/performanceProfiler.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1348 bytes; lines: 49.
- Reading: Full decoded text.
- SHA-256: `1c70081bc2a4b5474da026f23e3ee8bd5d3321108aebc21bfd7b3f4ad0c7b3e0`.
- Symbols (name:line): `PerformanceProfiler:6`, `startStage:14`, `endStage:21`, `getReport:27`.

## `src/core/placeholderIntegrityValidator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1320 bytes; lines: 49.
- Reading: Full decoded text.
- SHA-256: `ff3f5cd6ab7eb1d8db4a36d34c2ec5989e981ecf58c1f511ccee1d5c2128e28e`.
- Symbols (name:line): `PlaceholderIntegrityValidator:1`, `extractPlaceholders:2`, `validate:27`.
- Static incoming references: `src/core/applyGate.js`, `src/core/realTranslationWorkflow.js`, `src/core/translationEditorCore.js`, `tests/regression/run-phase5-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/pluginSafePatcher.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 14697 bytes; lines: 481.
- Reading: Full decoded text.
- SHA-256: `f5b6692dc57a81538043946aa7654fdca969ece0cb2662b17599f18e6243e1ad`.
- Symbols (name:line): `PluginSafePatcher:22`, `getHash:27`, `validateSyntax:34`, `tokenize:48`, `classifyTokenContext:250`, `extractCandidates:324`, `safePatchPlugin:361`, `rollbackPlugin:460`.
- Literal imports: `fs`, `path`, `vm`, `crypto`, `./backupManager`.
- Static incoming references: `src/core/gameEngine.js`, `tests/regression/plugin_rollback.test.js`, `tests/regression/plugin_runtime_translation.test.js`, `tests/regression/plugin_safe_patch.test.js`, `tests/regression/plugin_safe_patcher_integration.test.js`, `tests/regression/plugin_string_extraction.test.js`, `tests/regression/plugin_syntax_validation.test.js`, `tests/regression/real_game_launch_smoke.test.js`.

## `src/core/pluginSdk.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3158 bytes; lines: 94.
- Reading: Full decoded text.
- SHA-256: `14cc0365b292739aed6ad6d6706e91bac6cd47320a4764ba6483e8554fbff41d`.
- Symbols (name:line): `PluginSDK:17`, `safeExecute:22`, `testEngineAdapterConformance:43`, `testHookProviderConformance:56`, `testArchiveProviderConformance:69`, `testTranslationProviderConformance:82`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/priorityQueue.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2073 bytes; lines: 79.
- Reading: Full decoded text.
- SHA-256: `6a426bfd49fb3b1a1fe7bc2d4e5b508c074b5ebc30e32a3d971f2e3b042c8049`.
- Symbols (name:line): `PriorityQueue:10`, `enqueue:23`, `dequeue:44`, `dequeueBatch:54`, `size:66`, `clear:70`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/providerErrorClassifier.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3813 bytes; lines: 101.
- Reading: Full decoded text.
- SHA-256: `68dfe78d78e9f977be849aabb1d5fd41febad13ad1ba8436c3739031989b21ab`.
- Symbols (name:line): `ProviderErrorClassifier:5`, `classify:7`.
- Static incoming references: `src/core/providerGateway.js`, `src/translation/translator.js`, `tests/regression/provider_error_classifier.test.js`, `tests/test_text_chunking_and_provider_resilience.test.js`.

## `src/core/providerGateway.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1889 bytes; lines: 55.
- Reading: Full decoded text.
- SHA-256: `cf310c1ca3713e7a3044f6b8a1a15f7c85c405d8ff81fe206b25ee949212c718`.
- Symbols (name:line): `ProviderGatewayBlockedError:13`, `ProviderGateway:23`, `executeRequest:25`, `canExecute:47`.
- Literal imports: `./globalCircuitBreaker`, `./providerErrorClassifier`.
- Static incoming references: `src/core/providerHttp.js`, `src/translation/translator.js`, `tests/regression/provider_bypass_prevention.test.js`, `tests/regression/provider_failover_strict.test.js`.

## `src/core/providerHttp.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7934 bytes; lines: 246.
- Reading: Full decoded text.
- SHA-256: `08cb4d6b17e4779f70ee0c201dfc52668023a0da8447848b5cd4d169e5ddd90a`.
- Symbols (name:line): `providerKeyFor:44`, `ProviderHttpError:60`, `isErrorStatus:73`, `request:92`, `get:152`, `post:177`, `fetchGuarded:211`.
- Literal imports: `https`, `http`, `./providerGateway`.
- Static incoming references: `src/translation/translator.js`, `tests/unit/explicitProviderChoice.test.js`.

## `src/core/providerProfiles.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3771 bytes; lines: 141.
- Reading: Full decoded text.
- SHA-256: `659ec9e9673716186bee4d7b4f291ab6bd74590e3f4299ce8436f869104f9275`.
- Symbols (name:line): `ProviderProfiles:128`, `get:130`, `getAll:133`.
- Static incoming references: `src/core/translationQueue.js`.

## `src/core/providerRateLimiter.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2982 bytes; lines: 100.
- Reading: Full decoded text.
- SHA-256: `00c2ff2941a69a01c823228040e04e4b708001849b51d026027713fcc0b2ff18`.
- Symbols (name:line): `ProviderRateLimiter:6`, `_refill:18`, `acquire:33`, `_scheduleProcess:51`, `adjustRate:92`.
- Static incoming references: `src/core/selfTest.js`, `src/core/translationQueue.js`, `tests/regression/rate_limit.test.js`.

## `src/core/qaEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6055 bytes; lines: 148.
- Reading: Full decoded text.
- SHA-256: `5b830af9affea46af71f9fb472dcf366ba4578d094c015a571174e0a97f49b61`.
- Symbols (name:line): `QAEngine:5`, `validate:7`, `validateSession:117`.
- Static incoming references: `src/core/codeProtector.js`, `src/core/coverageGuarantor.js`, `src/core/selfTest.js`, `src/core/translationPipeline.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/test_translation_completeness_and_certificates.test.js`.

## `src/core/queueStarvationManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3007 bytes; lines: 112.
- Reading: Full decoded text.
- SHA-256: `e7fa777ae4a9e85325326857d0ed05235cdb17d01fda8ab91a948292d09967b5`.
- Symbols (name:line): `QueueStarvationManager:12`, `promoteAgedTasks:22`, `CachePolicy:59`, `set:66`, `get:89`, `size:102`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/core/realGameWorkflow.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4306 bytes; lines: 122.
- Reading: Full decoded text.
- SHA-256: `88d040585d6e2cc72d8c3219d128447f1bcdc8d98ef86d1a8d7593c110edac82`.
- Symbols (name:line): `RealGameWorkflow:18`, `createStagingCopy:32`, `runSimulatedMutationTest:59`, `runFullCycle:109`.
- Literal imports: `fs`, `path`, `crypto`, `./backupManager`, `./engineDetector`, `./realTranslationWorkflow`.
- Static incoming references: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8a-tests.js`, `tools/run-phase7-real-lab.js`.

## `src/core/realProviderBenchmark.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13402 bytes; lines: 352.
- Reading: Full decoded text.
- SHA-256: `beee871288fb7f19d621d06ab63bb692196c16034cbdf0b94e0367b6edbad899`.
- Symbols (name:line): `RealProviderBenchmark:45`, `_requestGoogleGtx:50`, `runStage:125`, `runFullBenchmark:249`.
- Literal imports: `https`, `http`, `../services/cache`, `./structuredLogger`.
- Static incoming references: `src/core/speedBenchmark.js`.

## `src/core/realTranslationWorkflow.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12110 bytes; lines: 324.
- Reading: Full decoded text.
- SHA-256: `6829892cacd99d174f6b28467ec8d9235714314bd2a8715128faf61c7296f5e0`.
- Symbols (name:line): `RealTranslationWorkflow:20`, `discoverSource:38`, `extractStrings:71`, `protectStrings:108`, `translate:123`, `validateTranslation:142`, `apply:158`, `executeLabPipeline:188`, `executeRealGameTranslation:195`, `runRealCycle:202`, `_dummy:208`, `_runInternalCycle:214`, `_atomicWriteFileSync:308`.
- Literal imports: `fs`, `path`, `crypto`, `./backupManager`, `./localDictionaryProvider`, `./placeholderIntegrityValidator`, `./visibleTextVerifier`, `./formatAdapterRegistry`.
- Static incoming references: `src/core/realGameWorkflow.js`, `tests/regression/run-phase8a-tests.js`.

## `src/core/runtimeLogCollector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5277 bytes; lines: 137.
- Reading: Full decoded text.
- SHA-256: `3763af9d18386e92976eed9c6eb7f79557ec2e0adc1dc84ecf628ad87b6c55f4`.
- Symbols (name:line): `RuntimeLogCollector:11`, `log:25`, `attachProcess:49`, `_classifyCategory:78`, `_analyzeError:91`, `query:113`, `exportSessionLogs:126`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/runtimeSessionManager.js`, `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`.

## `src/core/runtimeProbe.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5764 bytes; lines: 174.
- Reading: Full decoded text.
- SHA-256: `c7c662d1c9313b6729229684aad3b4c3116e511e45b529c7dd6897fd0a41d379`.
- Symbols (name:line): `RuntimeProbe:13`, `probeProcess:18`, `_analyzeLoadedModules:99`.
- Literal imports: `child_process`, `path`.
- Static incoming references: `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`, `src/services/rpcHandlers.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/runtimeSessionManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12421 bytes; lines: 366.
- Reading: Full decoded text.
- SHA-256: `e5cf4abb8814a5a65e5a70963ea60e53313f857073bba27ea60eb0d73349a813`.
- Symbols (name:line): `RuntimeSession:36`, `transitionTo:82`, `prepare:102`, `launch:117`, `stop:199`, `forceStop:227`, `handleTimeout:234`, `cleanup:243`, `_probeWindow:259`, `_saveSession:280`, `detectIncompleteSessions:315`, `recoverSession:345`.
- Literal imports: `child_process`, `path`, `fs`, `crypto`, `./ownedProcessRegistry`, `./runtimeLogCollector`, `./runtimeWatchdog`.
- Static incoming references: `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`, `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/runtimeTextManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10565 bytes; lines: 271.
- Reading: Full decoded text.
- SHA-256: `35349287dbd0504021adf61a0852e2aca4ac0c59d6f3f7fcabd9e72131417fa5`.
- Symbols (name:line): `RuntimeTextManager:17`, `getInstance:28`, `_hash:35`, `_loadRegistry:39`, `_persistRegistry:64`, `shouldTranslate:79`, `processRuntimeText:117`, `recordRuntimeText:194`, `addToTranslationMemory:222`, `getAllRuntimeTexts:258`.
- Literal imports: `fs`, `path`, `crypto`, `./textClassifier`, `./codeProtector`, `./translationMemory`.
- Static incoming references: `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/runtimeWatchdog.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3493 bytes; lines: 119.
- Reading: Full decoded text.
- SHA-256: `6fed22be298d80e6d96d9f8ca7db7e42416c1b7a62a9c7971badfa8fce5cb39d`.
- Symbols (name:line): `RuntimeWatchdog:10`, `watch:27`, `heartbeat:44`, `unwatch:53`, `_tick:64`, `destroy:106`.
- Literal imports: `events`.
- Static incoming references: `src/core/runtimeSessionManager.js`.

## `src/core/screenCapture.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4114 bytes; lines: 120.
- Reading: Full decoded text.
- SHA-256: `091db9beba049a99ce70a703eb5943d7374aa3eee1594019361a765d46fd91db`.
- Symbols (name:line): `ScreenCapture:13`, `capture:26`.
- Literal imports: `child_process`, `fs`, `path`, `crypto`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/screenDiff.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1842 bytes; lines: 67.
- Reading: Full decoded text.
- SHA-256: `9bb9b4494dd9d5813ab59ee88707b8a256c669b66c8159d60b11241ff5c390e6`.
- Symbols (name:line): `ScreenDiff:12`, `compare:17`.
- Literal imports: `fs`, `crypto`.

## `src/core/scriptDetector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13532 bytes; lines: 362.
- Reading: Full decoded text.
- SHA-256: `6b9762ea86b5984b709064786e26959b785656f087b8273e7d873071f83d9031`.
- Symbols (name:line): `lettersOnly:76`, `detectScripts:84`, `dominantScript:103`, `hasNonLatinScript:133`, `hasLatinScript:138`, `isIdentitySafe:192`, `classifyIdentity:226`, `isTranslated:254`.
- Static incoming references: `src/core/coverageGuarantor.js`, `src/services/cache.js`, `tools/reprocessIdentity.js`.

## `src/core/selfTest.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9741 bytes; lines: 249.
- Reading: Full decoded text.
- SHA-256: `f60763498daa84e6032b1763dbfea226e39856fedb596541893382187ab713ea`.
- Symbols (name:line): `SelfTest:21`, `runAll:23`.
- Literal imports: `fs`, `path`, `child_process`, `./engineRegistry`, `./qaEngine`, `./universalTokenEngine`, `./translationMemory`, `./providerRateLimiter`, `./adaptiveConcurrency`, `better-sqlite3`.
- Static incoming references: `src/core/diagnosticBundle.js`, `src/core/gameService.js`, `tests/regression/run-phase2-tests.js`.

## `src/core/shutdownCoordinator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7391 bytes; lines: 162.
- Reading: Full decoded text.
- SHA-256: `11465466226e54f5c4b898a7c028098632a61452c730138e285cbd74315e9849`.
- Symbols (name:line): `recordStep:14`, `getShutdownReport:22`, `isShuttingDown:25`, `trackOperation:26`, `withTimeout:33`, `clearRestoreTimer:40`, `restorePendingGame:44`, `scheduleGameRestore:62`, `closeHttpServer:76`, `performShutdown:83`, `requestShutdown:144`, `installSignalHandlers:153`.
- Literal imports: `fs`, `path`, `./gameEngine`, `../services/httpServer`, `../services/cheatServer`, `./ownedProcessRegistry`, `../services/cache`, `./translationMemory`.
- Static incoming references: `server.js`, `src/core/gameService.js`, `src/services/cheatServer.js`, `src/services/httpServer.js`, `src/services/rpcHandlers.js`.

## `src/core/speedBenchmark.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1265 bytes; lines: 39.
- Reading: Full decoded text.
- SHA-256: `ff69fddc3fd3aeb6f57eeefa68e6a2d3c661b9c11a708e9dfdf6b05a3d092626`.
- Symbols (name:line): `SpeedBenchmark:8`, `run:13`, `runReal:28`, `runSynthetic:32`.
- Literal imports: `./realProviderBenchmark`, `./syntheticBenchmark`.
- Static incoming references: `src/services/rpcHandlers.js`.

## `src/core/stagingPolicy.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4857 bytes; lines: 144.
- Reading: Full decoded text.
- SHA-256: `4b3f6cf2211898cf472dacd255a0cc9ce812e64cdfcddc8dad31f475f0549749`.
- Symbols (name:line): `StagingPolicy:14`, `generateManifest:26`, `createStaging:52`, `verifyOriginalUntouched:79`, `cleanupStaging:106`, `_copyRecursiveSync:123`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/strategyPlanner.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8606 bytes; lines: 198.
- Reading: Full decoded text.
- SHA-256: `e4e6566de6f479f050191b833205c4aa6637274892089b5e7ee52eb2c8569eab`.
- Symbols (name:line): `StrategyPlanner:9`, `plan:11`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/gameService.js`, `src/diagnostics/universalGameIntelligence.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/structuredLogger.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4722 bytes; lines: 127.
- Reading: Full decoded text.
- SHA-256: `21344de969ce1013eae001929e3bd29701fdb2cdd9506d0a84004941672c48fe`.
- Symbols (name:line): `StructuredLogger:17`, `logStructured:26`, `log:62`, `info:66`, `debug:70`, `trace:74`, `error:78`, `logHttpBenchmarkStage:82`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/realProviderBenchmark.js`, `src/core/syntheticBenchmark.js`, `src/core/translationQueue.js`.

## `src/core/subtitleSystem.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2532 bytes; lines: 82.
- Reading: Full decoded text.
- SHA-256: `7c966ba5455e5194b38b0eaf7d022279d596c6066b541aa6c8bffc1a259d1105`.
- Symbols (name:line): `SubtitleSystem:9`, `calculateDuration:23`, `displaySubtitle:39`, `dismissSubtitle:71`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/syntheticBenchmark.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2400 bytes; lines: 68.
- Reading: Full decoded text.
- SHA-256: `ecbfcae5da1c53b630d1093929c5cc94471f884f4251866db0cbf04c97aa5f90`.
- Symbols (name:line): `SyntheticThroughputBenchmark:9`, `run:11`.
- Literal imports: `./translationQueue`, `./structuredLogger`.
- Static incoming references: `src/core/speedBenchmark.js`.

## `src/core/textCaptureQuality.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1037 bytes; lines: 30.
- Reading: Full decoded text.
- SHA-256: `9241990c6596d1da422ef3077c861aa48e60e8d33dea6a910da64e7ba324a5da`.
- Symbols (name:line): `TextCaptureQuality:1`, `isTranslatable:2`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/core/textChunker.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5582 bytes; lines: 149.
- Reading: Full decoded text.
- SHA-256: `4b8eb1af8f05693b704be023f05ab3d49520e62413d2283c4a578f38ca92fa1a`.
- Symbols (name:line): `TextChunker:13`, `chunk:38`, `recombine:142`.
- Static incoming references: `src/translation/translator.js`, `tests/test_text_chunking_and_provider_resilience.test.js`.

## `src/core/textClassifier.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5021 bytes; lines: 125.
- Reading: Full decoded text.
- SHA-256: `660127fd10dad74f63f052e038378d7ed8270c212c1ce01f31268bebc2d5092d`.
- Symbols (name:line): `TextClassifier:26`, `classify:28`, `filterTranslatable:95`.
- Static incoming references: `src/core/runtimeTextManager.js`, `src/engines/generic/genericAdapter.js`, `tests/regression/run-phase5b-tests.js`.

## `src/core/textObjectIdentity.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2383 bytes; lines: 68.
- Reading: Full decoded text.
- SHA-256: `c8ceb8eeaeea83617bb3cb10e01fa53bd8eb3237eacb806234fa43ebc05bd2ad`.
- Symbols (name:line): `TextObjectIdentity:19`, `getCompositeKey:37`, `getTextKey:45`, `toJSON:52`.
- Literal imports: `crypto`.
- Static incoming references: `src/runtime/hookProvider.js`, `tests/regression/run-phase6-tests.js`.

## `src/core/textProvenance2.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2525 bytes; lines: 80.
- Reading: Full decoded text.
- SHA-256: `72bf999ebb1c53224782b8a640aaf1b2c36f3e73d2d721b4110eb09b8a7670df`.
- Symbols (name:line): `TextFingerprint:12`, `create:14`, `TextProvenance2:30`, `evaluateChain:44`.
- Literal imports: `crypto`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/core/textStabilizer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2004 bytes; lines: 61.
- Reading: Full decoded text.
- SHA-256: `6cbe4306c59fb0475b3b93d91f01d9c8f9afebadf35c1d58e156c26bb7472b1e`.
- Symbols (name:line): `TextStabilizer:9`, `stabilize:21`, `clear:50`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/transactionJournal.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8989 bytes; lines: 267.
- Reading: Full decoded text.
- SHA-256: `31f6f3b0df8a87fc1cf90c2ce729ff2eddcbd4815cdbefb6613368567f2d8822`.
- Symbols (name:line): `TransactionJournalError:40`, `TransactionJournal:48`, `_txFile:62`, `createTransaction:77`, `recordFile:97`, `setCommitting:112`, `setCommitted:116`, `setRolledBack:120`, `setFailed:124`, `_setStatus:133`, `_mustGet:141`, `getTransaction:164`, `listUnfinished:190`, `_save:227`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `src/core/applyTransaction.js`, `src/core/gameService.js`, `src/core/patchInstaller.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/translationAccounting.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8487 bytes; lines: 239.
- Reading: Full decoded text.
- SHA-256: `f04119e508d6e8b5cba21aa796af853b31db0d850944764bdcb42c9d57c3e93a`.
- Symbols (name:line): `TranslationAccounting:31`, `registerCached:73`, `registerUnmatchedCache:99`, `registerTranslated:105`, `registerFailed:113`, `registerSkipped:120`, `registerDuplicate:126`, `registerFiltered:132`, `requeueToPending:138`, `recordPatch:148`, `validateIntegrity:157`, `getCompletionStatus:185`, `getSummary:198`.
- Static incoming references: `src/core/translationPipeline.js`, `tests/regression/completion_state.test.js`, `tests/regression/job_persistence_117k_realistic.test.js`, `tests/regression/translation_accounting.test.js`, `tests/regression/translation_accounting_realistic.test.js`, `tests/regression/unit_of_count_consistency.test.js`.

## `src/core/translationCertificate.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 27055 bytes; lines: 613.
- Reading: Full decoded text.
- SHA-256: `9271b934968eab39bffe5c0b0099bb80d0900736727d7a8ec39d51036a4b3138`.
- Symbols (name:line): `isUnknownToken:85`, `num:91`, `TranslationCertificate:96`, `issue:120`, `assertInvariants:500`, `isCompleted:574`, `fromFailure:587`, `TranslationCertificateInvariantError:603`.
- Static incoming references: `src/core/translationPipeline.js`, `tests/test_translation_completeness_and_certificates.test.js`.

## `src/core/translationContext.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2136 bytes; lines: 61.
- Reading: Full decoded text.
- SHA-256: `2be7e935de208f56442c442744bfb70bdd52fa7b52237ed03c9c4b0fa7c45754`.
- Symbols (name:line): `TranslationContext:17`, `getContextSignature:34`, `toCompactJSON:48`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/translationEditorCore.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6770 bytes; lines: 201.
- Reading: Full decoded text.
- SHA-256: `6328c04dad1383c41b9e227db60557ce3a2225d017ccf1ac17a557fa914ac146`.
- Symbols (name:line): `TranslationEditorCore:16`, `validateEntry:27`, `query:57`, `updateTranslation:93`, `previewBulkReplace:121`, `applyBulkReplace:148`, `exportToOtPatch:168`.
- Literal imports: `crypto`, `./placeholderIntegrityValidator`, `./translationPatchSchema`.
- Static incoming references: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationLayoutValidator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3873 bytes; lines: 116.
- Reading: Full decoded text.
- SHA-256: `11ca0c6317cee9adc0f64f414d8536f801f67331339fc6d24968b5ab1cf47d20`.
- Symbols (name:line): `TranslationLayoutValidator:10`, `validateLayout:15`, `wrapText:58`, `formatRTL:82`, `validatePluralAndVariables:100`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/translationMemory.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7720 bytes; lines: 225.
- Reading: Full decoded text.
- SHA-256: `0ce5f28d6b1eb4d5712b5d344ba68b7e33083813d12996f5decc413ab92651af`.
- Symbols (name:line): `TranslationMemory2:10`, `init:19`, `generateIdentity:59`, `lookup:74`, `store:117`, `setGlossary:152`, `applyGlossary:158`, `computeDelta:171`, `getHitRate:214`.
- Literal imports: `fs`, `path`, `crypto`, `better-sqlite3`.
- Static incoming references: `src/core/coverageGuarantor.js`, `src/core/gameService.js`, `src/core/runtimeTextManager.js`, `src/core/selfTest.js`, `src/core/shutdownCoordinator.js`, `src/core/translationPipeline.js`, `tests/regression/run-phase2-tests.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/hookLifecycle.test.js`.

## `src/core/translationMemory3.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5221 bytes; lines: 179.
- Reading: Full decoded text.
- SHA-256: `6e056a0a0d08e3b92b47b505decf0a5f28311a0bb972dee1a30a37ebd91b5d89`.
- Symbols (name:line): `TranslationMemory3:12`, `set:24`, `lookup:59`, `_normalize:142`, `_similarity:146`, `_levenshtein:155`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/core/translationPatchFormat.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4150 bytes; lines: 124.
- Reading: Full decoded text.
- SHA-256: `b128023f1a29da47f980cb0002901586f38f94cc7265f8279c92f62631c58c60`.
- Symbols (name:line): `TranslationPatchFormat:13`, `createPatch:18`, `computeDiff:50`.
- Literal imports: `crypto`, `./translationPatchSchema`.
- Static incoming references: `tests/regression/run-phase6-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationPatchSchema.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5822 bytes; lines: 168.
- Reading: Full decoded text.
- SHA-256: `370bf555af1c872c857e73bb9a6496d12e45aaa95e8195f8c6d6c7700e38bfd2`.
- Symbols (name:line): `TranslationPatchSchema:36`, `validate:43`, `normalize:133`.
- Literal imports: `crypto`.
- Static incoming references: `src/core/patchInstaller.js`, `src/core/translationEditorCore.js`, `src/core/translationPatchFormat.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationPipeline.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 34784 bytes; lines: 831.
- Reading: Full decoded text.
- SHA-256: `f5cf339faebf02b9839b91dbd205ac778bbc78e7c82c480135605357a3531876`.
- Symbols (name:line): `TranslationPipeline:38`, `dryRun:44`, `run:87`, `getSafeCacheEntry:187`.
- Literal imports: `./translationAccounting`, `./jobPersistence`, `./globalCircuitBreaker`, `fs`, `path`, `./engineDetector`, `./engineRegistry`, `./codeProtector`, `./backupManager`, `./qaEngine`, `./translationMemory`, `../engines/renpy/renpyAdapter`, `../engines/rpgmaker/rpgMakerAdapter`, `../engines/electron/electronAdapter`, `../engines/unity/unityAdapter`, `../engines/generic/genericAdapter`, `../translation/extraction/buildUniverse`, `../services/cache`, `../translation/translator`, `./translationCertificate`, `./coverageGuarantor`, `./applyTransaction`, `./applyVerifier`.
- Static incoming references: `src/core/gameService.js`, `src/services/rpcHandlers.js`, `tests/regression/run-all-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/run-lab-tests.js`.

## `src/core/translationProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4128 bytes; lines: 128.
- Reading: Full decoded text.
- SHA-256: `11b6472775d2211e86a18d46aef88d8b83088d1dff372111832a7af7565ad8f1`.
- Symbols (name:line): `TranslationProvider:37`, `translate:71`, `translateBatch:114`, `supportsBatch:122`, `supportsOffline:124`.
- Literal imports: `./translationResult`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/translationQueue.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6526 bytes; lines: 177.
- Reading: Full decoded text.
- SHA-256: `5f80ca06413f956bbe9814c659656106ed75315edb78e02991e70ff1018b216a`.
- Symbols (name:line): `TranslationQueue:13`, `process:44`, `getCurrentThroughput:143`, `getMetrics:149`.
- Literal imports: `./providerProfiles`, `./providerRateLimiter`, `./adaptiveConcurrency`, `./batchOptimizer`, `./structuredLogger`, `./jobPersistence`.
- Static incoming references: `src/core/syntheticBenchmark.js`, `tests/regression/provider_failover.test.js`, `tests/regression/translation_speed.test.js`.

## `src/core/translationResult.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7595 bytes; lines: 231.
- Reading: Full decoded text.
- SHA-256: `dc840dfd1efc4cd4249c4b705ef2cceb3a9d55af30fd2a9849f83d8ec6471b15`.
- Symbols (name:line): `normalize:67`, `coerceTranslation:144`, `coerceOriginal:152`, `describe:160`, `translated:168`, `failed:173`, `notTranslated:181`, `assertContract:193`.
- Static incoming references: `src/core/fastTextPipeline.js`, `src/core/translationProvider.js`, `src/providers/translationProviderRegistry.js`.

## `src/core/translationRouter.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4450 bytes; lines: 115.
- Reading: Full decoded text.
- SHA-256: `891a62c10e52bd037fee70d03aac8a8220c8c9c95232cec5c154a0d62be7e44c`.
- Symbols (name:line): `TranslationRouter:12`, `route:13`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/translationRuntimeRouter.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4043 bytes; lines: 88.
- Reading: Full decoded text.
- SHA-256: `84e62703309d0d511377dd53876aa14c9b7f8b8face13179ce3959ca04ac7bba`.
- Symbols (name:line): `TranslationRuntimeRouter:8`, `selectStrategy:10`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/translationSession.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2827 bytes; lines: 92.
- Reading: Full decoded text.
- SHA-256: `3ae9ad93078b9100195370760e57f6c4560b1eabf76d1d6d64d2fbd8a4c40dca`.
- Symbols (name:line): `GameProfile:12`, `checkVersionDrift:32`, `TranslationSession:45`, `saveSession:57`, `loadSession:73`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/core/translationStateMachine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1254 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `589716ce7ec20a1ced97fc32706ebf64bb239af1d87e4e713d17843dcbfd305e`.
- Symbols (name:line): `TranslationState:18`, `transition:28`, `isTerminal:34`.
- Static incoming references: `tests/regression/run-phase5b-tests.js`.

## `src/core/translationUnit.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5511 bytes; lines: 152.
- Reading: Full decoded text.
- SHA-256: `a9a7980718f676cd995df491fe64492bc8937e1a1bea3623a632f0699792196c`.
- Symbols (name:line): `PlaceholderMasker:10`, `mask:15`, `unmask:37`, `validate:50`, `TranslationUnit:67`, `applyTranslation:109`, `toJSON:127`.
- Literal imports: `crypto`.
- Static incoming references: `tests/regression/run-phase9-tests.js`.

## `src/core/universalTokenEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6170 bytes; lines: 178.
- Reading: Full decoded text.
- SHA-256: `1b805120f8d2d5aaf1a63d2b26287b82bcd8a262cf324480e8927f622d645074`.
- Symbols (name:line): `UniversalTokenEngine:13`, `getPatterns:22`, `protect:58`, `restore:91`, `validate:146`, `protect:163`, `restore:167`, `validate:171`.
- Static incoming references: `src/core/selfTest.js`, `tests/regression/placeholder_preservation.test.js`.

## `src/core/untranslatedDetector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12718 bytes; lines: 348.
- Reading: Full decoded text.
- SHA-256: `5a993ff591aa19110fa9a3999fd06545fb6ad711037be3189ab2a8bd3b28a140`.
- Symbols (name:line): `UntranslatedDetector:46`, `detectScriptAndLanguage:53`, `isTechnicalOrCode:121`, `classifyText:155`, `analyzeExtraction:243`, `generateSummaryReport:333`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/visualQAEngine.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/visibleTextVerifier.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6177 bytes; lines: 180.
- Reading: Full decoded text.
- SHA-256: `37539b46d019f431a689b91974639f7b3871700d16e13b1d5589324d081f6d85`.
- Symbols (name:line): `VisibleTextVerifier:14`, `verifyFileContent:19`, `recordRuntimeObservation:62`, `recordDOMObservation:82`, `recordScreenObservation:102`, `buildEvidenceArtifact:148`.
- Literal imports: `fs`, `crypto`.
- Static incoming references: `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/visualQAEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10055 bytes; lines: 287.
- Reading: Full decoded text.
- SHA-256: `054106bf1d1aaf274f0dd6618e612efa3d77258738e0584dd5318ec71022e3e8`.
- Symbols (name:line): `VisualQAEngine:23`, `runAutomatedQA:39`, `_connectCDP:87`, `send:106`, `_runCDPQASession:149`, `_runStaticAndRuntimeQA:239`, `isBlackScreen:262`, `generateSummaryReport:272`.
- Literal imports: `fs`, `path`, `http`, `ws`, `./untranslatedDetector`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/diagnostics/errorAnalyzer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3049 bytes; lines: 87.
- Reading: Full decoded text.
- SHA-256: `7366c50358abee2639824a2df04a29fe7596611540086b90f9d1f97881d2268b`.
- Symbols (name:line): `ErrorAnalyzer:10`, `getRegistry:12`, `analyzeError:21`, `analyzeError:23`, `analyze:24`, `analyze:25`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/diagnostics/universalGameIntelligence.js`, `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/errorRegistry.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2144 bytes; lines: 64.
- Reading: Full decoded text.
- SHA-256: `2be48431fa4db8f157ed47bab6d3bc11e59554450930e8f96cc6278cb2ef7b48`.

## `src/diagnostics/executableAnalyzer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3892 bytes; lines: 114.
- Reading: Full decoded text.
- SHA-256: `cfa2e4e28b2d864f0565796f2fcd731bf60ba0eff00a8d8fee264cee215ad202`.
- Symbols (name:line): `ExecutableAnalyzer:9`, `analyzeExecutable:11`, `analyzeExecutable:12`, `analyze:13`, `analyze:14`.
- Literal imports: `fs`.
- Static incoming references: `src/diagnostics/universalGameIntelligence.js`, `src/discovery/universalDiscoveryEngine.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/logIntelligence.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2551 bytes; lines: 77.
- Reading: Full decoded text.
- SHA-256: `1131338b3e87abce2ec96f1949eb54ce276d60f2e752f9e362ec02129eb5cec5`.
- Symbols (name:line): `LogIntelligence:9`, `parseUnityLog:11`, `parseUnityLog:27`, `findGameLogs:32`, `correlate:66`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/diagnostics/universalGameIntelligence.js`, `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/logParsers.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1741 bytes; lines: 76.
- Reading: Full decoded text.
- SHA-256: `ae8dc22819ff2c926308493c78463c181a28153318a6b95c56434bedf9216b13`.
- Symbols (name:line): `ErrorTimeline:1`, `record:6`, `getTimeline:20`, `LogParsers:25`, `parseUnityLog:27`, `parseRenPyLog:42`, `parseElectronLog:56`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/diagnostics/processInspector.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2645 bytes; lines: 71.
- Reading: Full decoded text.
- SHA-256: `014444b3622b5a72d00c69846bb90aa640beaa5d6f8737d3f2589bd4d90b3efb`.
- Symbols (name:line): `ProcessInspector:8`, `inspectProcess:10`, `inspectPid:11`.
- Literal imports: `child_process`.
- Static incoming references: `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/universalGameIntelligence.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4024 bytes; lines: 106.
- Reading: Full decoded text.
- SHA-256: `5e37c42e30b69443ad57cb4a499dfe8fd6b4d060c71e2ebc14474bbd749fa8f3`.
- Symbols (name:line): `UniversalGameIntelligence:14`, `diagnoseGame:16`, `diagnoseGame:17`, `investigate:18`, `investigate:19`, `generateForensics:77`.
- Literal imports: `fs`, `path`, `../core/engineDetector`, `../core/strategyPlanner`, `./executableAnalyzer`, `./logIntelligence`, `./errorAnalyzer`.
- Static incoming references: `tests/regression/run-phase4a-tests.js`.

## `src/discovery/discoveryExperimentEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2096 bytes; lines: 68.
- Reading: Full decoded text.
- SHA-256: `1a702064b29a2b4338ae5f75d5e45cedb8f6318adca823c152f754477d19f6eb`.
- Symbols (name:line): `DiscoveryExperimentEngine:1`, `runSafeExperiment:13`, `getHistory:61`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/discovery/gameCompatibilityPassport.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2280 bytes; lines: 67.
- Reading: Full decoded text.
- SHA-256: `de0be020d1c79a43fe251bd8042f1d44bd88d5f5b415e42c53b08196dd7a87cd`.
- Symbols (name:line): `GameCompatibilityPassport:4`, `generateIdentity:6`, `createPassport:31`, `save:57`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/discovery/renpyAppDataResolver.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7701 bytes; lines: 190.
- Reading: Full decoded text.
- SHA-256: `751115a229cb6a94233dd8f62560ce8301737e627b1ec589be8116903e86b990`.
- Symbols (name:line): `getBaseAppDataPath:27`, `extractSaveDirectoryFromRpy:40`, `findMatchingAppDataFolder:69`, `supportsEngine:109`, `resolveGameAppDataDir:112`, `logAppDataError:164`.
- Literal imports: `fs`, `path`, `../core/engineRoutingGuard`, `../utils/loggerManager`.
- Static incoming references: `src/services/rpcHandlers.js`, `tests/regression/engine_diagnostic_routing.test.js`, `tests/regression/engine_launch_routing.test.js`, `tests/regression/engine_routing_all_engines.test.js`.

## `src/discovery/textProvenanceGraph.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2785 bytes; lines: 93.
- Reading: Full decoded text.
- SHA-256: `f842c7b0f2ce066b0d69b811d4e3ca17d41b2ce0ef3feb8518b9fc7d177a544c`.
- Symbols (name:line): `TextProvenanceGraph:1`, `addNode:6`, `addEdge:12`, `recordProvenance:20`, `correlate:61`, `getSummary:82`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/discovery/universalDiscoveryEngine.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6908 bytes; lines: 196.
- Reading: Full decoded text.
- SHA-256: `654bc3354671292566e1a3573c3830b7324b5b5930110f97a0cdb26d8afe1b94`.
- Symbols (name:line): `UniversalDiscoveryEngine:4`, `_loadJson:15`, `discover:23`, `_scanFiles:169`, `_matchesPattern:182`.
- Literal imports: `fs`, `path`, `../diagnostics/executableAnalyzer`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/discovery/unknownGameTriage.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3635 bytes; lines: 97.
- Reading: Full decoded text.
- SHA-256: `797ff067fb677b9a2d4f4cf16cce9c05fd482253167d32a454489c723248f2ad`.
- Symbols (name:line): `UnknownGameTriage:17`, `triage:24`.
- Literal imports: `fs`, `path`, `../core/engineDetector`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/engines/baseEngineHandler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1954 bytes; lines: 52.
- Reading: Full decoded text.
- SHA-256: `ca02f9393b1422efd783a85706fdc51797152142281e95ed27f41ce9daa6f298`.
- Symbols (name:line): `BaseEngineHandler:5`, `extract:19`, `injectTranslation:28`, `applyFontPatch:37`, `cleanup:46`.
- Static incoming references: `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `src/engines/rpgmaker/rpgMakerMvMzHandler.js`, `src/engines/rpgmaker/rpgMakerRubyHandler.js`, `src/engines/unreal/unrealHandler.js`.

## `src/engines/cocos/cocos2dxAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13494 bytes; lines: 323.
- Reading: Full decoded text.
- SHA-256: `52e29ea0a58b58fceaada6ae89843766a5959fdf8c1ae6cf76c717f736629084`.
- Symbols (name:line): `Cocos2dxAdapter:16`, `getDetailedDeclaration:33`, `getCapabilities:50`, `extract:64`, `validate:191`, `apply:195`, `rollback:315`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/test_adapters_live.js`.

## `src/engines/cocos/cocosCreatorAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8153 bytes; lines: 205.
- Reading: Full decoded text.
- SHA-256: `efb5f94ea8cecd26d1733dd4438e2f7061302b9c0137adc16bb55eb30b242bb1`.
- Symbols (name:line): `CocosCreatorAdapter:19`, `getDetailedDeclaration:36`, `getCapabilities:53`, `extract:69`, `validate:129`, `apply:133`, `rollback:197`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/construct/constructAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6536 bytes; lines: 170.
- Reading: Full decoded text.
- SHA-256: `5bafcdf81aacdc613c7dd5022b297dfdc8c68ebc0c52f14d521b99c494a3f79f`.
- Symbols (name:line): `ConstructAdapter:20`, `getDetailedDeclaration:36`, `getCapabilities:53`, `extract:70`, `validate:120`, `apply:124`, `rollback:162`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Static incoming references: `src/core/engineRegistry.js`.

## `src/engines/defold/defoldAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9226 bytes; lines: 235.
- Reading: Full decoded text.
- SHA-256: `3605c8ede8efc24effacaee9c8412a2cf97763dd8f375176f47e6fcd30c13b61`.
- Symbols (name:line): `DefoldAdapter:20`, `getDetailedDeclaration:37`, `getCapabilities:54`, `extract:88`, `validate:157`, `apply:161`, `rollback:227`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/asarRepacker.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2924 bytes; lines: 92.
- Reading: Full decoded text.
- SHA-256: `193dede2ea05e3122982283bbdb9e2ac6753e57148eb923bfc03923def6acca8`.
- Symbols (name:line): `AsarRepacker:9`, `pack:14`, `walk:18`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/engines/electron/electronAdapter.js`, `tests/regression/run-phase3-tests.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/asarUtil.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3246 bytes; lines: 57.
- Reading: Full decoded text.
- SHA-256: `c80cd2338751a8d1129d9e93b1433b717c5b24eeb81219db567e009ccd63f9da`.
- Symbols (name:line): `AsarUtil:4`, `readHeader:5`, `extractTextFiles:21`, `extractAll:24`, `_extract:25`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/engines/electron/electronAdapter.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/electronAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 11061 bytes; lines: 286.
- Reading: Full decoded text.
- SHA-256: `42fd0e8c928d1c6d3f18d0dcd133ff59ac0889129a1d67c499e8fe891c4531ad`.
- Symbols (name:line): `ElectronAdapter:17`, `findAsarPath:24`, `findUnpackedAppDir:35`, `getCapabilities:46`, `extract:66`, `validate:120`, `apply:127`, `rollback:271`.
- Literal imports: `./asarRepacker`, `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./asarUtil`, `../../core/partialApply`.
- Static incoming references: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/run-lab-tests.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/electronArchiveProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3772 bytes; lines: 130.
- Reading: Full decoded text.
- SHA-256: `45044b2491e8a7bd6c05efa0bf41f12c8af993b67b93ec872ddf5b0333308db0`.
- Symbols (name:line): `ElectronArchiveProvider:13`, `open:26`, `close:56`, `listFiles:68`, `readFile:94`, `readTextFile:123`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/electron/electronBridge.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4415 bytes; lines: 149.
- Reading: Full decoded text.
- SHA-256: `ea0d3322285a1249c27aa84ffe628a92fa59555c7699cb20775a3dfbaf91aa0b`.
- Symbols (name:line): `ElectronBridge:8`, `start:16`, `stop:71`, `getInjectionScript:83`, `scanNode:91`, `sendTexts:112`.
- Literal imports: `http`, `crypto`.
- Static incoming references: `tests/regression/run-phase2-tests.js`.

## `src/engines/electron/electronDOMProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3001 bytes; lines: 79.
- Reading: Full decoded text.
- SHA-256: `ed8fa8e8839bec1f095e8fad8eb7426031439e6813014d022815e03932545fad`.
- Symbols (name:line): `ElectronDOMProvider:10`, `getRendererInjectionScript:15`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/electron/electronRuntimeBridge.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4150 bytes; lines: 133.
- Reading: Full decoded text.
- SHA-256: `5fdbf3708991688beee229db0145b5f714577db7d70b0cb735fd66fd39d9af0e`.
- Symbols (name:line): `ElectronRuntimeBridge:13`, `detectExecutable:19`, `prepareDomObserver:36`, `launch:79`, `observe:105`, `stop:117`.
- Literal imports: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.

## `src/engines/gamemaker/gameMakerAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 11048 bytes; lines: 267.
- Reading: Full decoded text.
- SHA-256: `b0338b1c6fe89424c4a501e534504717cbd698673d7995400b22842807f25297`.
- Symbols (name:line): `GameMakerAdapter:22`, `getDetailedDeclaration:38`, `getCapabilities:55`, `extract:73`, `validate:154`, `apply:158`, `rollback:259`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Static incoming references: `src/core/engineRegistry.js`.

## `src/engines/gdevelop/gdevelopAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8043 bytes; lines: 208.
- Reading: Full decoded text.
- SHA-256: `ba28ca8376efa089776ab2432bb7bdfc454eeb010555e7fa1b5a806a6cb8803a`.
- Symbols (name:line): `GDevelopAdapter:18`, `getDetailedDeclaration:34`, `getCapabilities:51`, `extract:66`, `validate:115`, `apply:119`, `rollback:200`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Static incoming references: `src/core/engineRegistry.js`.

## `src/engines/generic/genericAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13797 bytes; lines: 326.
- Reading: Full decoded text.
- SHA-256: `2dd3ee3b6abc2cc68818d90231e5c8b070e445e63d09650f40eb8943a4c70a6c`.
- Symbols (name:line): `GenericAdapter:18`, `getDetailedDeclaration:38`, `getCapabilities:55`, `extract:69`, `validate:173`, `apply:177`, `rollback:318`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../../core/textClassifier`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Static incoming references: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/run-lab-tests.js`, `tests/unit/applyContract.test.js`.

## `src/engines/generic/universalScanner.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2044 bytes; lines: 59.
- Reading: Full decoded text.
- SHA-256: `c223b50b1cb7bb3f26ff0fbe4a4617f3960011927b3933afed48f18c4a8bb41b`.
- Symbols (name:line): `UniversalScanner:8`, `scoreText:10`, `scoreFileRisk:33`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase3-tests.js`.

## `src/engines/godot/godot_bridge.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12714 bytes; lines: 315.
- Reading: Full decoded text.
- SHA-256: `2602cc75b435ff0bb19b538ca4bfa30107fbb3875aa5cdeadfb53048bdda0881`.
- Symbols (name:line): `parse_pck:15`, `extract_texts:70`, `apply_translations:146`, `rollback_pck:274`.

## `src/engines/godot/godot_pck_parser.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2695 bytes; lines: 77.
- Reading: Full decoded text.
- SHA-256: `f7267e35124ae85eb449b5a1271cc0285c85a560cd7021ba356b2fbcdc97a5be`.
- Symbols (name:line): `parse_pck:14`.

## `src/engines/godot/godotAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 21274 bytes; lines: 553.
- Reading: Full decoded text.
- SHA-256: `5610ebf87f51d44a66bb3826b1f57d41bf150083e6a4258ce01f88c60cb78c29`.
- Symbols (name:line): `GodotAdapter:23`, `_findPython:30`, `getDetailedDeclaration:35`, `getCapabilities:52`, `detect:70`, `inspect:87`, `extract:119`, `extractTexts:123`, `extractResources:251`, `prepareTranslation:255`, `translate:264`, `restorePlaceholders:275`, `validate:279`, `apply:283`, `applyTranslations:287`, `package:458`, `launch:462`, `rollback:485`, `diagnose:538`.
- Literal imports: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./godotLocalizationProvider`, `../../core/partialApply`, `../../utils/pythonResolver`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/regression/cancellation_safety.test.js`, `tests/regression/godot_real_pipeline.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/test_adapters_live.js`.

## `src/engines/godot/godotControlTextProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2708 bytes; lines: 88.
- Reading: Full decoded text.
- SHA-256: `9ec030709da62f53287c082029a71e727b9dabb4c12de621ce4e36a1ef97c070`.
- Symbols (name:line): `GodotControlTextProvider:9`, `protectBBCode:14`, `restoreBBCode:42`, `getNodeTextProperties:68`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/godot/godotLocalizationProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8168 bytes; lines: 271.
- Reading: Full decoded text.
- SHA-256: `4bff1e8c333f7e6dbcc4d18fa754293d95c787d3695bc7a056055d882585e8d0`.
- Symbols (name:line): `GodotLocalizationProvider:14`, `discover:23`, `parseGodotCsv:75`, `serializeGodotCsv:159`, `parsePo:187`, `parsePoString:226`, `serializePo:239`.
- Literal imports: `fs`, `path`, `crypto`.
- Static incoming references: `src/engines/godot/godotAdapter.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/renpy/adapter/renpyAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6663 bytes; lines: 205.
- Reading: Full decoded text.
- SHA-256: `97a4d90a9b6185db91dee89f3879c4348962da61baec69db53b254ee7e3347c5`.
- Symbols (name:line): `RenpyAdapter:23`, `getEmbeddedPython:35`, `getUnpackerScript:42`, `unpackAndDecompile:47`, `getCapabilities:75`, `extract:93`, `validate:105`, `apply:112`, `rollback:198`.
- Literal imports: `fs`, `path`, `child_process`, `../../../core/baseEngineAdapter`, `../../../core/codeProtector`, `../renpyCommon`, `../extractor/renpyExtractor`, `../translator/renpyTranslator`, `../injector/renpyInjector`, `../validator/renpyValidator`, `../runtime/renpyRuntime`.
- Static incoming references: `src/engines/renpy/renpyAdapter.js`, `src/services/rpcHandlers.js`, `tests/renpy_variable_healing.test.js`.

## `src/engines/renpy/extractor/renpyExtractor.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 17017 bytes; lines: 387.
- Reading: Full decoded text.
- SHA-256: `176807dac5b4f4ee835f7ccad82a6fb4cbe08f6d8c8b9ec853476067d26d17bf`.
- Symbols (name:line): `RenpyExtractor:25`, `resolveGameDir:38`, `findRpyFiles:61`, `walk:65`, `isTranslatable:94`, `generateId:132`, `extract:139`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `../renpyCommon`, `../../../core/codeProtector`, `../../../core/displayTextClassifier`.
- Static incoming references: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/test_renpy_summertime_extraction.js`, `tests/unit/renpy/extractor.test.js`.

## `src/engines/renpy/injector/renpyInjector.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13119 bytes; lines: 331.
- Reading: Full decoded text.
- SHA-256: `05245fbcf8f2e562bdc8a2ae637caf4e58cdf2683d97a5f815ea8005ded00e5e`.
- Symbols (name:line): `RenpyInjector:20`, `resolveGameSubDir:29`, `inspectLanguageSystem:51`, `inject:95`, `rollback:272`.
- Literal imports: `fs`, `path`, `../renpyCommon`, `../../../core/partialApply`.
- Static incoming references: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/renpy_variable_healing.test.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/unit/renpy/injector.test.js`.

## `src/engines/renpy/renpyAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 245 bytes; lines: 9.
- Reading: Full decoded text.
- SHA-256: `ba9b529fae049ecfc7662eda4985a1c785b606a654c795f29b6ecf1b53a72173`.
- Literal imports: `./adapter/renpyAdapter`.
- Static incoming references: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/renpy/renpyCommon.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 30846 bytes; lines: 732.
- Reading: Full decoded text.
- SHA-256: `a79047fbf5e2deeb13ee6bbde6e2074360f6b3d81598765d07e6d5dcb0eabf9f`.
- Symbols (name:line): `ensureTlDirectory:14`, `unescapeRenpyString:37`, `formatRenpyStringLiteral:89`, `buildRenpyStringTlContent:183`, `injectRenpyFontConfig:227`, `extractRenpyRpyTexts:262`, `purgeCacheFiles:447`, `patchRpyFiles:477`, `extractRenpyInterpolations:554`, `healRenpyVariables:589`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/core/gameEngine.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/renpy/extractor/renpyExtractor.js`, `src/engines/renpy/injector/renpyInjector.js`, `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `tests/check_e07.js`, `tests/renpy_variable_healing.test.js`, `tests/unit/renpy/heal_variables.test.js`.

## `src/engines/renpy/renpyParser.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3381 bytes; lines: 103.
- Reading: Full decoded text.
- SHA-256: `8c4f15e2a216c8b1b02c3c5a3b7be7634f1122f2e5ac139e3bc7e8600e82fb4c`.
- Symbols (name:line): `RenpyParser:8`, `validateRpy:14`, `generateTlFile:81`.
- Static incoming references: `tests/regression/lab_phase3_real_apply.js`, `tests/regression/run-phase3-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/engines/renpy/renpyProductionProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4734 bytes; lines: 141.
- Reading: Full decoded text.
- SHA-256: `4f3d1691420e8af0d74977e44edcad96c5ceb062370e82cd6ccab15d48a9bcdc`.
- Symbols (name:line): `RenpyStringProvider:14`, `generateStringsBlock:22`, `extractStringsPairs:37`, `RenpyStyleProvider:50`, `generateLanguageStyles:59`, `RenpyAssetLocalization:87`, `generateAssetOverrides:93`, `RenpyTranslationProvider:102`, `ensureTlStructure:111`, `saveIncrementalTranslation:122`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/engines/renpy/renpyWorkflow.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/renpy/renpyRuntimeBridge.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5405 bytes; lines: 173.
- Reading: Full decoded text.
- SHA-256: `90e2f20f357d95a1ce5b470370ee669130c23b21f4cdc998180c4cdd6e310257`.
- Symbols (name:line): `RenpyRuntimeBridge:18`, `detectExecutable:28`, `prepareTranslation:46`, `launch:82`, `observe:119`, `stop:146`.
- Literal imports: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.
- Static incoming references: `tests/regression/run-real-staged-game-test.js`.

## `src/engines/renpy/renpyV7Handler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7065 bytes; lines: 185.
- Reading: Full decoded text.
- SHA-256: `8d7e193c196598db6e0f6540151962b76c0004fc847b7a36b5851cfb2294f8bb`.
- Symbols (name:line): `RenpyV7Handler:6`, `extract:17`, `injectTranslation:87`, `applyFontPatch:129`, `cleanup:167`.
- Literal imports: `fs`, `path`, `child_process`, `../baseEngineHandler`, `./renpyCommon`, `../../utils/loggerManager`.

## `src/engines/renpy/renpyV8Handler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7174 bytes; lines: 186.
- Reading: Full decoded text.
- SHA-256: `d23d2f9f3022699683f8be36c740bb24b46955dc5b053863bffbbbb938f6c8ba`.
- Symbols (name:line): `RenpyV8Handler:6`, `extract:17`, `injectTranslation:88`, `applyFontPatch:130`, `cleanup:168`.
- Literal imports: `fs`, `path`, `child_process`, `../baseEngineHandler`, `./renpyCommon`, `../../utils/loggerManager`.

## `src/engines/renpy/renpyWorkflow.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2765 bytes; lines: 80.
- Reading: Full decoded text.
- SHA-256: `9421d7e6157fd8e18f13e39c125098432ae20c4c16da8bbe14490cd2cbed84dc`.
- Symbols (name:line): `RenpyWorkflow:15`, `getLaunchEnvironment:26`, `initializeNativeTranslation:36`, `syncDiscoveredStrings:70`.
- Literal imports: `fs`, `path`, `./renpyProductionProvider`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/engines/renpy/runtime/renpyRuntime.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 16204 bytes; lines: 428.
- Reading: Full decoded text.
- SHA-256: `0b5bb5f639d1876c4cc7b263c5552c2e8fd18a0f7fbce12b6d93fd6312c3dd47`.
- Symbols (name:line): `sleep:12`, `RenpyRuntime:16`, `resolveGameExe:22`, `resolveGameSubDir:45`, `injectController:65`, `removeController:269`, `killGame:321`, `launch:357`, `sendCommand:378`, `captureScreenshot:407`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`.
- Static incoming references: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/unit/renpy/runtime.test.js`.

## `src/engines/renpy/translator/renpyTranslator.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6301 bytes; lines: 173.
- Reading: Full decoded text.
- SHA-256: `68546daa62552d987c0746d4ad790b4264a57580594fb5c56c7e8cc300673550`.
- Symbols (name:line): `RenpyTranslator:16`, `protectTokens:26`, `restoreTokens:57`, `validateTokens:69`, `translateText:103`, `process:134`.
- Literal imports: `fs`, `path`, `../../../core/codeProtector`.
- Static incoming references: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/unit/renpy/translator.test.js`.

## `src/engines/renpy/validator/renpyValidator.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6941 bytes; lines: 194.
- Reading: Full decoded text.
- SHA-256: `ae4992dcece8d6d451f4d5b83c7a5d1ce4905a40d6dbd92b170539cdc9e0f001`.
- Symbols (name:line): `RenpyValidator:15`, `validateRpyFile:25`, `validateInjection:113`, `validate:164`.
- Literal imports: `fs`, `path`, `../../../core/codeProtector`.
- Static incoming references: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/renpy_variable_healing.test.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/unit/renpy/validator.test.js`.

## `src/engines/rollbackResult.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3615 bytes; lines: 92.
- Reading: Full decoded text.
- SHA-256: `704e8a2cb8a38b9e28d33528d51f9fe2f1f922846232a38efb2bcc3147583c2c`.
- Symbols (name:line): `rollbackResult:48`.
- Static incoming references: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`.

## `src/engines/rpgmaker/rgss3a_bridge.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5940 bytes; lines: 173.
- Reading: Full decoded text.
- SHA-256: `40321cfce13dc7c5ea67fdf7df3b5f675bd1e13f1c71fd8a573bcb4d6b51abc6`.
- Symbols (name:line): `unpack_rgss3a:12`, `pack_rgss3a:75`.

## `src/engines/rpgmaker/rgssAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6416 bytes; lines: 190.
- Reading: Full decoded text.
- SHA-256: `75c7d79e424045ba47182e92528fdb553a9ccbc4dca5989f650ccbd5f78c53b3`.
- Symbols (name:line): `RgssAdapter:16`, `getDetailedDeclaration:24`, `_findRgssArchive:41`, `getCapabilities:53`, `extract:77`, `validate:99`, `apply:103`, `rollback:154`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./rpgMakerRubyHandler`, `../rollbackResult.js`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/regression/generalization.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/rgss_real_pipeline.test.js`.

## `src/engines/rpgmaker/rpgMakerAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9409 bytes; lines: 249.
- Reading: Full decoded text.
- SHA-256: `400281618389d6ba55db48f601a8c10401f53f0f845df32e3e6a9043d1033e55`.
- Symbols (name:line): `RpgMakerAdapter:15`, `getCapabilities:22`, `extract:35`, `validate:92`, `apply:96`, `rollback:186`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../../extractors/extractor`, `../../core/gameEngine`, `../../core/partialApply`, `./rpgMakerRubyHandler`, `../rollbackResult`.
- Static incoming references: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/rpgmaker/rpgMakerMvMzHandler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 11071 bytes; lines: 317.
- Reading: Full decoded text.
- SHA-256: `17dca38541f87fefdda8ea306531a75cb07b4170a0f3ed15bd529af538bbc3a1`.
- Symbols (name:line): `RpgMakerMvMzHandler:4`, `readSystemEncryptionConfig:15`, `_getAllDataFiles:36`, `extract:56`, `_deepTranslateJson:103`, `injectTranslation:169`, `applyFontPatch:266`, `cleanup:311`.
- Literal imports: `fs`, `path`, `../baseEngineHandler`.

## `src/engines/rpgmaker/rpgMakerPluginsFile.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6903 bytes; lines: 213.
- Reading: Full decoded text.
- SHA-256: `b787fe8cc1bcaf08078bd86e523f3cf3fb6df46adc780a277ed7464381a59721`.
- Symbols (name:line): `parsePluginsJs:28`, `serializePluginsJs:76`, `registerPlugin:93`, `unregisterPlugin:158`, `verifyPlugin:190`.
- Literal imports: `fs`.
- Static incoming references: `src/services/rpcHandlers.js`.

## `src/engines/rpgmaker/rpgMakerRubyHandler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9517 bytes; lines: 279.
- Reading: Full decoded text.
- SHA-256: `5821dd3e6588f8ece36ab5a2012d610a1a629c608b3946c93948134a62abeb8c`.
- Symbols (name:line): `RpgMakerRubyHandler:5`, `_runSidecarMarshalBridge:15`, `_findRgssArchive:48`, `_runRgss3aBridge:60`, `extract:80`, `injectTranslation:146`, `applyFontPatch:182`, `Window_Message:207`, `cleanup:269`.
- Literal imports: `fs`, `path`, `child_process`, `../baseEngineHandler`, `../../utils/pythonResolver`.
- Static incoming references: `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`.

## `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4871 bytes; lines: 161.
- Reading: Full decoded text.
- SHA-256: `f1360c48b22e756f89b07589da9962490643682e1ba7c045d25d4f2f3d684460`.
- Symbols (name:line): `RpgMakerRuntimeBridge:18`, `detectSubtype:24`, `detectExecutable:42`, `injectRuntimeHook:55`, `launch:98`, `observe:131`, `stop:143`.
- Literal imports: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.
- Static incoming references: `tests/regression/run-real-staged-game-test.js`.

## `src/engines/unity/cecil_bridge.ps1`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7129 bytes; lines: 187.
- Reading: Full decoded text.
- SHA-256: `1394a0e7434123cfaed75d37d59dcc5bbcac86c55b8702e03706dc1010af7a68`.
- Symbols (name:line): `IsTranslatableText:31`, `foreach:44`, `foreach:56`, `foreach:88`, `foreach:90`, `foreach:91`, `foreach:94`, `foreach:149`, `foreach:156`, `foreach:157`, `foreach:158`, `foreach:161`.

## `src/engines/unity/test_asset_extract.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1615 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `5c3570b4b5141c37485d73269b6714da0af2993bb4bc07a95e1f4a4cd2abad58`.

## `src/engines/unity/unity_asset_bridge.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 22632 bytes; lines: 438.
- Reading: Full decoded text.
- SHA-256: `945643f3567eb16b72ed2a5761c5e0c5d5e17245cd6d83e07a8790499aea5a44`.
- Symbols (name:line): `is_translatable_text:33`, `extract_from_game:57`, `inject_into_game:310`, `scan_root_json:260`, `scan_json:150`.

## `src/engines/unity/unity_inspector.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6010 bytes; lines: 147.
- Reading: Full decoded text.
- SHA-256: `78566f96c60539a3ab209e58ab4ca13881f2a6d4914b609052d97e66a2758532`.
- Symbols (name:line): `inspect_unity_game:18`.

## `src/engines/unity/unityAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13531 bytes; lines: 374.
- Reading: Full decoded text.
- SHA-256: `9773f5fc246b66d552573f7de74b0c8e8a3309112e3e5dd35619eabd4b197076`.
- Symbols (name:line): `UnityAdapter:20`, `getDetailedDeclaration:28`, `getPythonBin:45`, `isIl2cpp:50`, `hasBepInEx:63`, `resolveUnityRoot:69`, `getCapabilities:87`, `_findManagedAssembly:105`, `extract:131`, `validate:216`, `apply:224`, `rollback:349`.
- Literal imports: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../utils/pythonResolver`.
- Static incoming references: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/generalization.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/unity_comprehensive_suite.js`, `tests/regression/unity_real_pipeline.test.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/unity/unityFrameworkMatrix.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4562 bytes; lines: 156.
- Reading: Full decoded text.
- SHA-256: `b0c6b4333b7f5294e9f1d8287e7ce55829c641662b28dd653452b8a93cd58062`.
- Symbols (name:line): `UnityFrameworkMatrix:12`, `evaluate:19`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/engines/unity/unityLocalizationPackageProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3750 bytes; lines: 122.
- Reading: Full decoded text.
- SHA-256: `931a67e7eca38ceae2033dad3ca596d37502c92fb8761f7cd1433c221063e442`.
- Symbols (name:line): `UnityLocalizationPackageProvider:12`, `detectPackage:17`, `parseStringTableCsv:47`, `serializeStringTableCsv:96`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/unity/unityRuntimeCapabilityProbe.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3497 bytes; lines: 100.
- Reading: Full decoded text.
- SHA-256: `fb09482e059204df4411c0ae2e15773129e481345cc724b3304551a0c45ed3cb`.
- Symbols (name:line): `UnityRuntimeCapabilityProbe:13`, `probe:15`.
- Literal imports: `fs`, `path`.

## `src/engines/unity/unityTextMeshProProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2821 bytes; lines: 85.
- Reading: Full decoded text.
- SHA-256: `3f3ca4f59b45c49b801fff48aa84b480cdcac76f33e7f7bba81ff5c25de5244c`.
- Symbols (name:line): `UnityTextMeshProProvider:9`, `protectTags:14`, `restoreTags:42`, `estimateOverflow:68`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/unity/unityUGUIProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1780 bytes; lines: 65.
- Reading: Full decoded text.
- SHA-256: `fdea31578a2273b259c17fe9072231a9dda8c6efc33b0f986b262a5b45c28864`.
- Symbols (name:line): `UnityUGUIProvider:9`, `protectTags:14`, `restoreTags:40`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/unreal/unrealAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9108 bytes; lines: 206.
- Reading: Full decoded text.
- SHA-256: `53b3498ca95395d1501754395ffe266c30fba66278bdec20f75baa3070d8e5f4`.
- Symbols (name:line): `UnrealAdapter:24`, `getDetailedDeclaration:41`, `getCapabilities:58`, `extract:75`, `validate:103`, `apply:107`, `rollback:198`.
- Literal imports: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./unrealHandler`, `./unrealLocResProvider`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/unit/unrealLocResFormat.test.js`.

## `src/engines/unreal/unrealHandler.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 12222 bytes; lines: 315.
- Reading: Full decoded text.
- SHA-256: `40f01dea2a3088172178a5d72fa91cd43960b2283a3c79c30dbc2a36c901eff6`.
- Symbols (name:line): `UnrealEngineHandler:5`, `_findPakFiles:16`, `_findLocresFiles:56`, `extract:81`, `injectTranslation:209`, `applyFontPatch:255`, `cleanup:270`, `detect:301`.
- Literal imports: `fs`, `path`, `child_process`, `../baseEngineHandler`.
- Static incoming references: `src/core/gameEngine.js`, `src/engines/unreal/unrealAdapter.js`.

## `src/engines/unreal/unrealLocalizationProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3716 bytes; lines: 110.
- Reading: Full decoded text.
- SHA-256: `971be58e89facfdae67a54d482c5fdc11b8ab72d71c8da106568c5b72b227c67`.
- Symbols (name:line): `UnrealLocalizationProvider:15`, `discoverLocalizationTargets:24`, `extractFromLocResFile:70`, `compileToCulture:81`.
- Literal imports: `fs`, `path`, `./unrealLocResProvider`, `./unrealStringTableProvider`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/engines/unreal/unrealLocalizationWorkflow.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2249 bytes; lines: 69.
- Reading: Full decoded text.
- SHA-256: `68490ed05fa34cf03113e1a34b4176c62798f87e7f674284752bafd908b10f0a`.
- Symbols (name:line): `UnrealLocalizationWorkflow:16`, `compileSourceToLocRes:27`, `decompileLocResToSource:49`.
- Literal imports: `fs`, `path`, `./unrealLocResProvider`, `./unrealStringTableProvider`.
- Static incoming references: `tests/regression/run-phase7-tests.js`.

## `src/engines/unreal/unrealLocResProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7458 bytes; lines: 116.
- Reading: Full decoded text.
- SHA-256: `91b5e1f7b7918b33c41885d7ee2c54b3890b3093d30b2b79ba96cda243a32417`.
- Symbols (name:line): `Reader:5`, `require:7`, `u32:8`, `i32:9`, `fstring:10`, `count:18`, `uint:20`, `UnrealLocResProvider:21`, `_readFString:22`, `_writeFString:23`, `parseLocRes:32`, `buildLocRes:71`, `patchLocRes:100`.
- Static incoming references: `src/engines/unreal/unrealAdapter.js`, `src/engines/unreal/unrealLocalizationProvider.js`, `src/engines/unreal/unrealLocalizationWorkflow.js`, `tests/regression/run-phase6-tests.js`, `tests/unit/unrealLocResFormat.test.js`, `tools/translate-locres.js`.

## `src/engines/unreal/unrealStringTableProvider.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2142 bytes; lines: 73.
- Reading: Full decoded text.
- SHA-256: `72273c099862cb5913a4c9cc7abb0ef921403d89962450fcff515ff88ad0b3bb`.
- Symbols (name:line): `UnrealStringTableProvider:10`, `parseStringTableCsv:15`, `serializeStringTableCsv:60`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/engines/unreal/unrealLocalizationProvider.js`, `src/engines/unreal/unrealLocalizationWorkflow.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/wolf/wolf_data_bridge.py`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9872 bytes; lines: 257.
- Reading: Full decoded text.
- SHA-256: `3468009b4660d76c2d3d35296fb06b6210869aa15fe680b4ad4327c5cac791f4`.
- Symbols (name:line): `is_translatable_text:15`, `extract_strings_from_dat:35`, `extract_from_game:81`, `inject_into_game:145`.

## `src/engines/wolf/wolfAdapter.js`

Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7335 bytes; lines: 219.
- Reading: Full decoded text.
- SHA-256: `8f96eeb517870c284388f3ab9419954815194c2925cb4d748a19cd1d1f709e83`.
- Symbols (name:line): `WolfAdapter:19`, `getDetailedDeclaration:28`, `getPythonBin:45`, `getCapabilities:50`, `extract:67`, `validate:107`, `apply:111`, `rollback:195`.
- Literal imports: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../utils/pythonResolver`.
- Static incoming references: `src/core/engineRegistry.js`, `tests/regression/cancellation_safety.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/wolf_real_pipeline.test.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/extractors/extractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 29380 bytes; lines: 936.
- Reading: Full decoded text.
- SHA-256: `ec52faf901961f7bec31620f5cf68fdda80ec8bcfee465d62d179a53c8fc3e05`.
- Symbols (name:line): `isShortParamName:156`, `isJsCode:170`, `extractEscapeCodes:197`, `restoreEscapeCodes:217`, `TextExtractor:239`, `buildMediaIndex:248`, `extract:284`, `walk:323`, `checkString:350`, `addTextEntry:489`, `extractTextsFromJsCode:502`, `extractFromPlugins:546`, `extractParam:562`, `extractParamObject:610`, `extractFromPluginScripts:642`, `extractFromTilesetTxt:702`, `extractFromCsv:768`, `extractFromHtml:866`, `extractGameTexts:896`, `addText:900`, `extractTextsFromJsCode:913`.
- Literal imports: `fs`, `path`, `../utils/utils`.
- Static incoming references: `src/core/gameEngine.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tools/cli-compat.js`.

## `src/mediaExtractor/BaseMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5127 bytes; lines: 162.
- Reading: Full decoded text.
- SHA-256: `e0c27d489d3a2cf4b4c188cb5eedc2b58c9bba8b7d0654d1edf0ab12cdabba1e`.
- Symbols (name:line): `BaseMediaExtractor:3`, `isMatchingAsset:16`, `copyFileSafe:24`, `scanLooseFiles:66`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/mediaExtractor/GenericMediaExtractor.js`, `src/mediaExtractor/RPGMakerMediaExtractor.js`, `src/mediaExtractor/RenPyMediaExtractor.js`, `src/mediaExtractor/UnityMediaExtractor.js`, `src/mediaExtractor/UnrealMediaExtractor.js`, `src/mediaExtractor/WolfRPGMediaExtractor.js`.

## `src/mediaExtractor/extract_rpa_helper.py`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6866 bytes; lines: 173.
- Reading: Full decoded text.
- SHA-256: `2031cf86050024178357639873e2c7baf378d641f5f5b6562926e6fc27629ad0`.
- Symbols (name:line): `extract_rpa:28`.

## `src/mediaExtractor/extract_unity_helper.py`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10712 bytes; lines: 248.
- Reading: Full decoded text.
- SHA-256: `60e69348a8ce020956d9c3ac700e5c6b5aa629fe61c9ccdf44d639584b2dd43a`.
- Symbols (name:line): `sanitize_name:14`, `main:19`.

## `src/mediaExtractor/GenericMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1847 bytes; lines: 55.
- Reading: Full decoded text.
- SHA-256: `e57ca080b0108508e768d4f1ee75cd4a5bbd17b762c983046e8796fec505bb93`.
- Symbols (name:line): `GenericMediaExtractor:2`, `extract:7`.
- Literal imports: `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/index.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3173 bytes; lines: 96.
- Reading: Full decoded text.
- SHA-256: `10503d367d787025f3041712c1ed3f331e77ac2bffdec61dd31e7d633c7d6dd8`.
- Symbols (name:line): `ImageExtractorFactory:11`, `getExtractor:13`, `extractMedia:33`.
- Literal imports: `fs`, `path`, `../core/engineDetector`, `./RenPyMediaExtractor`, `./RPGMakerMediaExtractor`, `./UnityMediaExtractor`, `./WolfRPGMediaExtractor`, `./UnrealMediaExtractor`, `./GenericMediaExtractor`.
- Static incoming references: `src/services/rpcHandlers.js`.

## `src/mediaExtractor/RenPyMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7073 bytes; lines: 197.
- Reading: Full decoded text.
- SHA-256: `74f7109a31259954a93e48874e7816c220529099a3fc52fec70d94683f913c27`.
- Symbols (name:line): `RenPyMediaExtractor:5`, `getPythonExecutable:10`, `extract:17`.
- Literal imports: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/RPGMakerMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8453 bytes; lines: 222.
- Reading: Full decoded text.
- SHA-256: `a7dd1f919a43580b1582ddbe445adb3676fc3535ca44d62485bcff0bc987e843`.
- Symbols (name:line): `RPGMakerMediaExtractor:4`, `loadEncryptionKey:9`, `extract:32`.
- Literal imports: `fs`, `path`, `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/UnityMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9046 bytes; lines: 249.
- Reading: Full decoded text.
- SHA-256: `20536746f9ce1fd3779bad6056c7308b083786d69e2701f1bc3477afbcef19c7`.
- Symbols (name:line): `UnityMediaExtractor:5`, `getPythonExecutionConfig:10`, `extract:84`.
- Literal imports: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/UnrealMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4823 bytes; lines: 124.
- Reading: Full decoded text.
- SHA-256: `a0c0ad4bbe6ac46fbd4e7ba5c10c77cb74c04d4ef746fb8020c0f17191088a6b`.
- Symbols (name:line): `UnrealMediaExtractor:5`, `extract:10`.
- Literal imports: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/WolfRPGMediaExtractor.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3433 bytes; lines: 100.
- Reading: Full decoded text.
- SHA-256: `f14472e287cda3afe3f8538b81ab4c708b402b446acd665ed84653989ee03948`.
- Symbols (name:line): `WolfRPGMediaExtractor:5`, `extract:10`.
- Literal imports: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Static incoming references: `src/mediaExtractor/index.js`.

## `src/ocr/ocrProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4651 bytes; lines: 144.
- Reading: Full decoded text.
- SHA-256: `a103ea73375674437c5bc6e3b4a203d5e28c8446a2d541a55b8b9a33d1ade07a`.
- Symbols (name:line): `OCRProvider:11`, `getImageHash:21`, `getPresetBounds:29`, `captureGameWindow:65`, `processFrame:102`, `setCache:137`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`.

## `src/providers/translationProviderRegistry.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10165 bytes; lines: 290.
- Reading: Full decoded text.
- SHA-256: `ca660c796c87c03f376e5c46e8c014e25feb22881f07efd766e2f690bc204c31`.
- Symbols (name:line): `TranslationProviderRegistry:33`, `register:55`, `get:75`, `setActiveProvider:79`, `_finalize:87`, `translate:112`, `_executeCompositeTranslation:146`, `translateBatch:230`, `checkHealth:257`.
- Literal imports: `../core/translationResult`.
- Static incoming references: `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/runtime/hookProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 14348 bytes; lines: 434.
- Reading: Full decoded text.
- SHA-256: `956615ff30b781eb8c586b90a427094c38af9649394aeef46d0459b62be53191`.
- Symbols (name:line): `HookProvider:13`, `getCapabilities:43`, `attach:63`, `optionsTarget:155`, `verify:177`, `_startMonitoring:232`, `onTextCaptured:242`, `replaceText:281`, `restoreText:338`, `detach:387`, `cleanup:406`, `healthcheck:421`.
- Literal imports: `events`, `../core/textObjectIdentity`.
- Static incoming references: `tests/regression/run-phase6-tests.js`.

## `src/runtime/providers/runtimeProviders.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6926 bytes; lines: 211.
- Reading: Full decoded text.
- SHA-256: `67595614edfc7d9f6580da89eb720186b7acae763b1fbe4142a791a764756484`.
- Symbols (name:line): `processoVivo:29`, `BaseRuntimeProvider:50`, `getCapabilities:66`, `observeProcess:75`, `GenericRuntimeProvider:161`, `UnityMonoProvider:168`, `UnityIL2CPPProvider:175`, `V8Provider:182`, `PythonProvider:188`, `RubyProvider:194`.

## `src/runtime/runtimeEventBus.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1469 bytes; lines: 53.
- Reading: Full decoded text.
- SHA-256: `c84f69044be92a956c9892d752a4e3786b6829cfc799b0e82454c218e5ef6d90`.
- Symbols (name:line): `RuntimeEventBus:17`, `emitEvent:23`, `getRecentEvents:38`, `clearHistory:46`.
- Literal imports: `events`.
- Static incoming references: `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/runtime/textFrameworkProvider.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1586 bytes; lines: 58.
- Reading: Full decoded text.
- SHA-256: `f74af373936df3da09e3a15e01ba11b48ddb5adc45b25ede7713fbc2447ebacb`.
- Symbols (name:line): `TextFrameworkProvider:1`, `discover:2`, `DOMTextProvider:29`, `createMutationObserverScript:31`.

## `src/runtime/universalOverlay.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1921 bytes; lines: 64.
- Reading: Full decoded text.
- SHA-256: `6d0836279a552b28111bfbbb410fe0d847a9de240e31d3741b0a3d1299900e69`.
- Symbols (name:line): `UniversalOverlay:1`, `createSession:5`, `addTextRegion:18`, `closeSession:37`.
- Static incoming references: `tests/regression/run-phase5-tests.js`.

## `src/runtime/universalRuntimeHost.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4651 bytes; lines: 138.
- Reading: Full decoded text.
- SHA-256: `1d69489a3d54d120664291b0d352de7519f1f797a79d6a29cd5e04ddec7e0002`.
- Symbols (name:line): `UniversalRuntimeHost:21`, `registerProvider:27`, `getProvider:31`, `startSession:39`, `observeTick:82`, `stopSession:103`, `getStatus:126`.
- Literal imports: `path`, `./runtimeEventBus`, `../diagnostics/processInspector`, `../diagnostics/logIntelligence`, `../diagnostics/errorAnalyzer`.
- Static incoming references: `tests/regression/run-phase4a-tests.js`.

## `src/security/sessionGuard.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6956 bytes; lines: 210.
- Reading: Full decoded text.
- SHA-256: `d4b62074f71c95a4ce0f8192e86c19d7b426e6b8ab1f759bc8f921449afe288d`.
- Symbols (name:line): `mintSessionToken:40`, `timingSafeEqualStrings:45`, `hostnameOf:61`, `validateHost:76`, `validateOrigin:96`, `validateToken:120`, `newRequestId:140`, `guardRequest:153`, `corsHeaders:186`.
- Literal imports: `crypto`.
- Static incoming references: `src/services/httpServer.js`.

## `src/security/staticAssetPolicy.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 7044 bytes; lines: 187.
- Reading: Full decoded text.
- SHA-256: `f7f9c70990febb79451e9c6295349d4cf2b1126be4c24843d941546273a3339d`.
- Symbols (name:line): `isUiAssetServable:70`, `resolveStaticAsset:85`, `isInside:129`, `contentTypeFor:160`, `listServedUrls:167`.
- Literal imports: `path`, `fs`.
- Static incoming references: `src/services/httpServer.js`.

## `src/services/cache.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 25566 bytes; lines: 666.
- Reading: Full decoded text.
- SHA-256: `36f5a1a9f8792e60f86144c6dd0f7676c177af019a64726709703aaa87e1c4de`.
- Symbols (name:line): `ensureDataDir:69`, `getStorageStatus:118`, `closeDb:132`, `migrateJsonCacheToSqlite:169`, `loadGlobalCacheForLang:261`, `saveNewGlobalTranslations:302`, `writeJsonAtomic:433`, `runMigrationIfRequested:500`, `loadCommonTranslations:509`, `getCommonTranslation:536`, `loadGlossary:584`, `saveGlossary:607`, `loadCfg:615`, `saveCfg:637`.
- Literal imports: `fs`, `path`, `../utils/utils`, `../core/scriptDetector`, `better-sqlite3`, `./cache`.
- Static incoming references: `server.js`, `src/core/coverageGuarantor.js`, `src/core/gameEngine.js`, `src/core/realProviderBenchmark.js`, `src/core/shutdownCoordinator.js`, `src/core/translationPipeline.js`, `src/services/cache.js`, `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `src/translation/translator.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/explicitProviderChoice.test.js`, `tests/unit/hookLifecycle.test.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`, `tools/translate-locres.js`.

## `src/services/cheatServer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 17483 bytes; lines: 474.
- Reading: Full decoded text.
- SHA-256: `870037fe5ff2beac8fa989d74f577dc7fe9b951f50ff1fa758d2977afa257011`.
- Symbols (name:line): `safeLog:31`, `isAllowedHookOrigin:47`, `isAllowedWsOrigin:71`, `applyHookCors:82`, `parseTranslationPayload:100`, `processRuntimeText:133`, `startHookServer:141`, `stopHookServer:442`.
- Literal imports: `http`, `ws`, `../translation/translator`, `./cache`, `../core/runtimeTextManager`, `../core/shutdownCoordinator`.
- Static incoming references: `server.js`, `src/core/shutdownCoordinator.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/cheatServerContract.test.js`, `tests/unit/hookLifecycle.test.js`.

## `src/services/httpServer.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 17458 bytes; lines: 456.
- Reading: Full decoded text.
- SHA-256: `bd15df2c5d4c60cc773d5b44a6f15733651190f35e87b1be6ce910acccc49011`.
- Symbols (name:line): `logInternal:56`, `terminateAllProcessesAndExit:70`, `tryListen:374`, `openBrowser:410`.
- Literal imports: `http`, `fs`, `path`, `child_process`, `../security/sessionGuard`, `../security/staticAssetPolicy`, `./rpcHandlers`, `../core/shutdownCoordinator`.
- Static incoming references: `server.js`, `src/core/shutdownCoordinator.js`.

## `src/services/rpcHandlers.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 96670 bytes; lines: 2496.
- Reading: Full decoded text.
- SHA-256: `02dc1091636f435cdff2394d82d3d4da7b320d478b7007754bc9cfcf6d186106`.
- Symbols (name:line): `sanitizePath:25`, `sanitizeKey:32`, `resolveGameDir:38`, `ping:93`, `decryptImages:98`, `extractImages:131`, `extractAudio:134`, `patchGameFont:137`, `clearGlobalCache:250`, `loadCfg:332`, `getLogs:335`, `heartbeat:339`, `saveCfg:344`, `loadGames:347`, `saveGame:363`, `addGameByPath:379`, `delGame:410`, `detectEngine:424`, `testRenpyCompatibility:427`, `launchGame:520`, `checkGame:801`, `listSaves:804`, `openSave:837`, `deleteSave:867`, `openSaveFolder:900`, `deleteGameCache:948`, `rollbackGame:996`, `restoreOriginalData:1006`, `exportGameTexts:1170`, `sendCheatCommand:1205`, `getGameState:1256`, `translate:1262`, `log:1265`, `engineInfo:1284`, `findGame:1306`, `resolveShortcut:1333`, `loadGlossary:1357`, `saveGlossary:1360`, `translateWithEngine:1364`, `installOverlay:1390`, `installUnity:1491`, `extractRpa:1585`, `packRpa:1601`, `decompileRpyc:1620`, `translateRpgMaker:1637`, `extractWolf:1662`, `packWolf:1700`, `unpackEvb:1746`, `exportExcel:1779`, `importExcel:1887`, `analyzeGame:1982`, `dryRunGame:1986`, `startTranslationJob:1990`, `getJobStatus:1994`, `listTranslationJobs:1997`, `runSelfTest:2000`, `exportDiagnosticBundle:2003`, `getTriadInfo:2006`, `runtimeStartSession:2029`, `runtimeStopSession:2045`, `runtimeProbe:2058`, `runtimeCaptureScreen:2064`, `routerRecommend:2070`, `stagingPrepare:2076`, `stagingCleanup:2082`, `evidenceList:2088`, `getProviderHealth:2094`, `getRenpyAppDataStatus:2105`, `unpackAll:2156`, `unpackRenpyFull:2187`, `scanGameVariables:2200`, `setGameVar:2254`, `getCapabilityMatrix:2296`, `runSpeedBenchmark:2306`, `getJobTelemetry:2320`, `resumeTranslationJob:2334`, `detectUntranslated:2341`, `runVisualQA:2365`, `getRuntimeTexts:2379`, `promoteRuntimeText:2385`, `calculateVersionDiff:2391`, `getHierarchicalGlossary:2397`, `verifyAndDiagnoseGame:2413`.
- Literal imports: `../core/gameService`, `../core/engineDetector`, `./rpcResponse`, `fs`, `path`, `child_process`, `../core/gameEngine`, `../extractors/extractor`, `./cache`, `../translation/translator`, `../mediaExtractor/index`, `../engines/renpy/adapter/renpyAdapter`, `../core/shutdownCoordinator`, `../core/translationPipeline`, `../core/ownedProcessRegistry`, `os`, `../engines/rpgmaker/rpgMakerPluginsFile`, `exceljs`, `../core/engineRuntimeTriad`, `../core/runtimeSessionManager`, `../core/runtimeProbe`, `../core/screenCapture`, `../core/translationRuntimeRouter`, `../core/stagingPolicy`, `../core/capabilityEvidenceAggregator`, `../core/globalCircuitBreaker`, `../core/engineRoutingGuard`, `../discovery/renpyAppDataResolver`, `../core/engineCapabilityMatrix`, `../../config/engineCompatibility.json`, `../core/speedBenchmark`, `../core/jobPersistence`, `../core/untranslatedDetector`, `../core/visualQAEngine`, `../core/runtimeTextManager`, `../core/jobSystem`, `../core/hierarchicalGlossary`.
- Static incoming references: `src/services/httpServer.js`, `tests/unit/cheatRoundTrip.test.js`.

## `src/services/rpcResponse.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3931 bytes; lines: 121.
- Reading: Full decoded text.
- SHA-256: `9efe4644d052401d06717d328bdf0e0ddea6d66acf1731e1f33eccd55b72db51`.
- Symbols (name:line): `ok:28`, `unimplemented:35`, `invalidInput:47`, `notFound:52`, `notConnected:57`, `blocked:62`, `failed:67`, `sanitizeLogLevel:76`, `countChanged:91`.
- Static incoming references: `src/services/rpcHandlers.js`.

## `src/signatures/engines/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5842 bytes; lines: 285.
- Reading: Full decoded text.
- SHA-256: `ff40d818f679ab35cbe8abe4b244e26c0639a7ed1c22b0e8a225948321746d8f`.

## `src/signatures/packaging/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1083 bytes; lines: 62.
- Reading: Full decoded text.
- SHA-256: `1e3bdac2b59fd90ed6518deba366d3c6c7765ba27fec386a3c062adaee666360`.

## `src/signatures/renderers/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 815 bytes; lines: 49.
- Reading: Full decoded text.
- SHA-256: `ab683eeb81bacde755716a22b043a4ec8f533d5f5465e240e350d5ebfe2620c7`.

## `src/signatures/runtimes/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1334 bytes; lines: 74.
- Reading: Full decoded text.
- SHA-256: `f3b8373c465bb449b44f294b18b0e0502d8ec2eea5d1c27eedf5d9e1dfbdc64b`.

## `src/signatures/textSystems/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1162 bytes; lines: 58.
- Reading: Full decoded text.
- SHA-256: `fb54a7faf5a910c4b1c3bb4f775c8d8900f9bc8befc8a5fa4960078c7b84cc5a`.

## `src/signatures/uiFrameworks/signatures.json`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 738 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `20ea0037b5b9938ddabd08bcace7e360f6fcb465199f9a121b951093a7d7e12e`.

## `src/translation/extraction/buildUniverse.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3405 bytes; lines: 89.
- Reading: Full decoded text.
- SHA-256: `76c6ee79327c4b57512fe3f58082623b3e2982423637fa9c391957e11880cc26`.
- Symbols (name:line): `buildUniverse:24`.
- Static incoming references: `src/core/translationPipeline.js`.

## `src/translation/translator.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 50499 bytes; lines: 1345.
- Reading: Full decoded text.
- SHA-256: `954fc63bb2a0099c6499f0e15580edf563cb9e9d91f79bb4195031aa6baa5227`.
- Symbols (name:line): `startCaptchaCallbackServer:38`, `setTimeout:62`, `openCaptchaSolver:64`, `getAvailableEngines:112`, `triggerSmartSwitch:121`, `checkRecoveryTimers:126`, `protectProperNames:135`, `restoreProperNames:139`, `fixTranslation:144`, `detectLang:156`, `getRandomUA:163`, `applyGlossaryPost:172`, `limitConcurrency:188`, `getBingToken:205`, `translateBingSingle:247`, `translateBingSingleRaw:256`, `translateBingBatch:327`, `translateLlm:361`, `translateDeepL:464`, `translateLlmBatchUnique:501`, `translateDeepLBatchUnique:531`, `translateMultiBatch:557`, `translateBatch:561`, `translateGoogleMobileSingle:965`, `translateGoogleMobileBatch:1023`, `translateSingle:1055`, `translateSingleWithFallback:1081`, `translateSingleRawGoogle:1124`, `translateMultiSingle:1216`, `translatePapagoSingle:1222`, `translateMyMemoryOne:1262`, `translateYandexSingle:1296`, `clearEngineBans:1323`.
- Literal imports: `../core/globalCircuitBreaker`, `../core/providerGateway`, `../core/providerHttp`, `../core/providerErrorClassifier`, `../core/logDeduplicator`, `../core/textChunker`, `path`, `https`, `child_process`, `../services/cache`, `http`, `querystring`.
- Static incoming references: `src/core/coverageGuarantor.js`, `src/core/gameEngine.js`, `src/core/translationPipeline.js`, `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/unit/explicitProviderChoice.test.js`, `tools/cli-compat.js`, `tools/translate-locres.js`.

## `src/utils/logger.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 352 bytes; lines: 16.
- Reading: Full decoded text.
- SHA-256: `e9bf254f65e47d0df56f6e3bbd0ee2cf2fe9d54a451e2a6200d19536bc159fd6`.
- Literal imports: `./loggerManager`.
- Static incoming references: `server.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`.

## `src/utils/loggerManager.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6897 bytes; lines: 210.
- Reading: Full decoded text.
- SHA-256: `b487d8fb6e05a9594f52570c264123420b67deef55f0101c285942bd781ee0c5`.
- Symbols (name:line): `getLocalTimestamp:22`, `LoggerManager:34`, `setLogPath:50`, `getCallerInfo:65`, `log:117`, `info:200`, `warn:202`, `error:203`, `debug:204`, `success:205`.
- Literal imports: `fs`, `path`, `util`.
- Static incoming references: `server.js`, `src/discovery/renpyAppDataResolver.js`, `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `src/utils/logger.js`, `src/utils/utils.js`.

## `src/utils/pythonResolver.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2108 bytes; lines: 69.
- Reading: Full decoded text.
- SHA-256: `d18df84d7e881275452cea1e37319733e6e59464449126741a8308044555cfad`.
- Symbols (name:line): `resolvePythonBinary:15`.
- Literal imports: `fs`, `path`.
- Static incoming references: `src/engines/godot/godotAdapter.js`, `src/engines/rpgmaker/rpgMakerRubyHandler.js`, `src/engines/unity/unityAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/unit/projectCleanup.test.js`, `tools/maintenance/cleanup_project.js`.

## `src/utils/resourceResolver.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1671 bytes; lines: 58.
- Reading: Full decoded text.
- SHA-256: `0dcc0f8c4ab71156cc7d1ae472c9d8c2484de92571fcdd207cba5aa9fc6c5af8`.
- Symbols (name:line): `ResourceResolver:8`, `getRootDir:16`, `getToolDir:18`, `getDataDir:19`, `getDocsDir:20`, `getLoadersDir:21`, `getDatabaseDir:25`, `getLogsDir:31`, `getStagingDir:37`, `getTransactionsDir:43`, `getProfilesDir:49`.
- Literal imports: `path`, `fs`.
- Static incoming references: `tests/unit/auditContracts.test.js`.

## `src/utils/utils.js`

Application source module. Symbols and imports below are static approximations, not proof of complete functionality.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 6308 bytes; lines: 187.
- Reading: Full decoded text.
- SHA-256: `2da3e6005e5cc157dacd80588d10e412adc619f4237c72899eb4bd0f90059d3b`.
- Symbols (name:line): `logWarn:34`, `findDataDir:42`, `getValueAtPath:64`, `getLastRealKey:76`, `isTranslatableText:84`, `loadSyntaxRules:117`, `isCodeOrFormulaKey:134`, `isAudioParamKey:159`.
- Literal imports: `fs`, `path`, `./loggerManager`.
- Static incoming references: `src/core/gameEngine.js`, `src/extractors/extractor.js`, `src/services/cache.js`.

## `tests/check_damage.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1590 bytes; lines: 39.
- Reading: Full decoded text.
- SHA-256: `42b015c7d239e7418826353ada2c8aedf94f704884a5d8ab7401ff952bb64fe6`.
- Literal imports: `fs`, `path`.

## `tests/check_e07.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1283 bytes; lines: 37.
- Reading: Full decoded text.
- SHA-256: `8b5bf9d5835824cde04754f243daa9a2298b2fda61b8d1c826ee00a92e7f216f`.
- Literal imports: `fs`, `path`, `../src/engines/renpy/renpyCommon`.

## `tests/fixtures/runtime-fixture/fixture.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2319 bytes; lines: 78.
- Reading: Full decoded text.
- SHA-256: `6315223e07869f6e52554b398c5aae0a9189fd02d428a35019a16c12fbd1a4d2`.
- Literal imports: `http`.

## `tests/index.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 12660 bytes; lines: 337.
- Reading: Full decoded text.
- SHA-256: `f43e44b0f21a3258653afbc00e692423d3eac0eb9e9cfac94ca13aace98b0fee`.
- Symbols (name:line): `parseArgs:224`, `runSuite:237`, `Number:257`, `main:262`.
- Literal imports: `fs`, `path`, `child_process`.
- Static incoming references: `tests/unit/auditContracts.test.js`.

## `tests/integration/test_translation_providers.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1202 bytes; lines: 41.
- Reading: Full decoded text.
- SHA-256: `314260bf5479259857b90be88be73096eba7c1a3d317750e83b618a2ef02f8a8`.
- Symbols (name:line): `testEngine:17`.
- Literal imports: `https`.

## `tests/mv_full_regression.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11347 bytes; lines: 299.
- Reading: Full decoded text.
- SHA-256: `36a57c3b2e5d8f1b07edfa33f09334f8cc8c5e6810681a6f1f3b9a9c0ce51dae`.
- Symbols (name:line): `getSha256:28`, `sleep:32`, `killGame:36`, `startControlServer:43`, `stopControlServer:79`, `runTokiRegression:86`, `runRjRegression:176`, `main:273`.
- Literal imports: `fs`, `path`, `http`, `crypto`, `child_process`.

## `tests/real_ui_certification_runner.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 31585 bytes; lines: 714.
- Reading: Full decoded text.
- SHA-256: `6e2177440ae5dc4d9372a5f19ff30cf07d7cacb2344f700fc152766cad0f230f`.
- Symbols (name:line): `sleep:25`, `CdpDriver:29`, `connect:39`, `send:81`, `eval:89`, `captureScreenshot:101`, `close:109`, `RealUiCertificationRunner:116`, `initDriver:125`, `closeDriver:132`, `certifyGame:145`, `saveSessionArtifacts:541`.
- Literal imports: `fs`, `path`, `ws`, `child_process`, `../src/core/backupManager`, `../src/core/engineDetector`, `../src/core/libraryDiscovery`, `../src/core/engineRegistry`, `../src/core/gameService`.
- Static incoming references: `tests/test_game_compatibility.js`.

## `tests/regression/adaptive_concurrency.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1474 bytes; lines: 42.
- Reading: Full decoded text.
- SHA-256: `302219f2c28c4917f126087b35931bca5ce0d6ac772e37b8ab338b176b7a1721`.
- Literal imports: `assert`, `../../src/core/adaptiveConcurrency`.

## `tests/regression/bugs_regression.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11353 bytes; lines: 224.
- Reading: Full decoded text.
- SHA-256: `3a14db95379d49772972acad5e8f8e3b1ecd2d80c645d7c6919f32df6b9023bf`.
- Symbols (name:line): `runBugRegressions:15`.
- Literal imports: `fs`, `path`, `assert`, `../../src/engines/renpy/injector/renpyInjector`, `../../src/engines/renpy/runtime/renpyRuntime`, `../../src/core/backupManager`, `../../src/core/codeProtector`, `../../src/core/engineCapabilityMatrix`.

## `tests/regression/cancellation_safety.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3406 bytes; lines: 84.
- Reading: Full decoded text.
- SHA-256: `9b712e1999257f146ad92cb00cfe91558be4beb674cd25a17334cd089f1f8396`.
- Symbols (name:line): `getSha256:6`, `testCancellationAndFailureSafety:18`.
- Literal imports: `fs`, `path`, `crypto`, `../../src/engines/godot/godotAdapter`, `../../src/engines/wolf/wolfAdapter`.

## `tests/regression/circuit_breaker_100_workers.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2199 bytes; lines: 54.
- Reading: Full decoded text.
- SHA-256: `4cc10bbc1468bd8ef2261f08c0b4b7ee7e2f482e5ec3062a7d3d782aea610dbb`.
- Symbols (name:line): `run:13`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/completion_state.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1582 bytes; lines: 34.
- Reading: Full decoded text.
- SHA-256: `c6c744c7c804926a8eab5186446816a8a22b6c801549c03e11becc7f7b3f6159`.
- Literal imports: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/comprehensive_platform_audit.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 19234 bytes; lines: 425.
- Reading: Full decoded text.
- SHA-256: `1392fad6a119ec6cf41f0ddc2717284f3d458539e082e8a44a7f40be87e23de8`.
- Symbols (name:line): `calculateHash:34`, `runAudit:38`, `test:46`, `testAsync:58`.
- Literal imports: `fs`, `path`, `crypto`, `assert`, `../../src/core/engineDetector`, `../../src/core/engineRegistry`, `../../src/core/baseEngineAdapter`, `../../src/core/untranslatedDetector`, `../../src/core/runtimeTextManager`, `../../src/core/visualQAEngine`, `../../src/core/hierarchicalGlossary`, `../../src/core/jobSystem`, `../../src/core/contentLayerManager`, `../../src/core/diagnosticBundle`, `../../src/engines/generic/genericAdapter`.

## `tests/regression/engine_adapter_contract.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1933 bytes; lines: 35.
- Reading: Full decoded text.
- SHA-256: `b01e6a5c1aa4388deb4466c2961a876867a5eb99264d9b9446148b6c8edbc948`.
- Literal imports: `assert`, `../../src/core/engineRegistry`, `../../src/core/engineCapabilityMatrix`.

## `tests/regression/engine_detection.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2916 bytes; lines: 67.
- Reading: Full decoded text.
- SHA-256: `4d5ff4554d63905cb2c39c8e0dda80f2c66207aefdb3437c1b80ab23fe5bcee3`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/engineDetector`.

## `tests/regression/engine_diagnostic_routing.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1679 bytes; lines: 29.
- Reading: Full decoded text.
- SHA-256: `5d5caaa8a9f8d3e070bdaa8b12fdfa2b341fefe0d6711a3422622e3624a04dca`.
- Literal imports: `assert`, `../../src/core/engineRoutingGuard`, `../../src/discovery/renpyAppDataResolver`.

## `tests/regression/engine_launch_routing.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1661 bytes; lines: 37.
- Reading: Full decoded text.
- SHA-256: `08597f1780f845e2244bef965853fa6d409a933a8b5001e399b30ff2f94f96af`.
- Symbols (name:line): `run:10`.
- Literal imports: `assert`, `../../src/discovery/renpyAppDataResolver`, `../../src/core/engineRoutingGuard`.

## `tests/regression/engine_routing_all_engines.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1627 bytes; lines: 39.
- Reading: Full decoded text.
- SHA-256: `f72cefe4d449c24a8f402ba08f329f7b5d4e2c218ccb3c64af84e11b9b940c1a`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `../../src/discovery/renpyAppDataResolver`, `../../src/core/engineRoutingGuard`.

## `tests/regression/generalization.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5304 bytes; lines: 107.
- Reading: Full decoded text.
- SHA-256: `2d839f7b117bc985873aacdc6cd01c38d5e68000a46de320422644dd80b45227`.
- Symbols (name:line): `sha256:13`, `run:18`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/unity/unityAdapter`, `../../src/engines/rpgmaker/rgssAdapter`.

## `tests/regression/godot_real_pipeline.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5218 bytes; lines: 140.
- Reading: Full decoded text.
- SHA-256: `cb5d77b86063491ed4747374e53770d6f90ace760d5ba70e95022e559bf588dc`.
- Symbols (name:line): `getSha256:6`, `runGodotPipeline:18`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/godot/godotAdapter`.

## `tests/regression/job_persistence_117k_realistic.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4302 bytes; lines: 105.
- Reading: Full decoded text.
- SHA-256: `f6178f5b5394edeea84f8264116eeb4c66c2ce1d5dac40d381ccb7fa6ca81c3c`.
- Symbols (name:line): `run:13`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/translationAccounting`, `../../src/core/jobPersistence`.

## `tests/regression/lab_phase3_real_apply.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6559 bytes; lines: 153.
- Reading: Full decoded text.
- SHA-256: `4bf9b30ed9a78389b7f16345b93b33b6a482e56f73e424874ce023864018293a`.
- Symbols (name:line): `hashFile:12`, `copyDirRecursive:18`, `runRealWorldApplyLab:35`.
- Literal imports: `fs`, `path`, `crypto`, `../../src/core/gameService`, `../../src/engines/renpy/renpyParser`.

## `tests/regression/log_deduplication.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1860 bytes; lines: 43.
- Reading: Full decoded text.
- SHA-256: `bf0a21ac2bff087bfc30b036412fd091bc408f4a56ab685a247d39bba14c8ebc`.
- Literal imports: `assert`, `../../src/core/logDeduplicator`.

## `tests/regression/multi_engine_isolation.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3312 bytes; lines: 70.
- Reading: Full decoded text.
- SHA-256: `c40943613e0aa0ce692b07f744fd6aa9ddabf2ecd15ef687afeed2fa2554baeb`.
- Symbols (name:line): `testMultiEngineIsolation:7`.
- Literal imports: `fs`, `path`, `../../src/engines/unity/unityAdapter`, `../../src/engines/wolf/wolfAdapter`, `../../src/engines/rpgmaker/rgssAdapter`, `../../src/engines/godot/godotAdapter`.

## `tests/regression/placeholder_preservation.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2121 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `cb9ad02fb6b4bea1ace086c8159617c76a1536b15bb608e688445ce3e6dd016e`.
- Literal imports: `assert`, `../../src/core/universalTokenEngine`.

## `tests/regression/plugin_rollback.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1681 bytes; lines: 47.
- Reading: Full decoded text.
- SHA-256: `d41433b0f6bb0fa45a358c6d540eed46db543cb6fb18825eea4d00d1ab3cac41`.
- Symbols (name:line): `run:5`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_runtime_translation.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 8568 bytes; lines: 196.
- Reading: Full decoded text.
- SHA-256: `50f1c8abee119363f89cbb79bf4f48c621662e6aa2566ef2f8ead38b13b36586`.
- Symbols (name:line): `run:6`.
- Literal imports: `assert`, `fs`, `path`, `vm`, `../../src/core/pluginSafePatcher`, `./testPaths`.

## `tests/regression/plugin_safe_patch.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2900 bytes; lines: 67.
- Reading: Full decoded text.
- SHA-256: `abb6105d5deeb6b4cbf080f057af4e3502d002029f352a30d51ec2b7753c3cb8`.
- Symbols (name:line): `run:5`, `Price:13`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_safe_patcher_integration.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7167 bytes; lines: 165.
- Reading: Full decoded text.
- SHA-256: `743bb17f82f7f836327c255d1641499f2e80cc8c912a35c70e334ded720fb246`.
- Symbols (name:line): `run:6`.
- Literal imports: `assert`, `fs`, `path`, `vm`, `../../src/core/pluginSafePatcher`, `./testPaths`.

## `tests/regression/plugin_string_extraction.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1696 bytes; lines: 38.
- Reading: Full decoded text.
- SHA-256: `723238e744720a1b70557494bcb02dff5f0bd91eed7ce9c4abce735635f9b71a`.
- Symbols (name:line): `run:3`, `Price:11`.
- Literal imports: `assert`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_syntax_validation.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1545 bytes; lines: 37.
- Reading: Full decoded text.
- SHA-256: `556899a021656e20d17494e0bb40f6a54b5e53578faa3cff7ce00cf3c739b588`.
- Symbols (name:line): `run:5`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/provider_bypass_prevention.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1457 bytes; lines: 43.
- Reading: Full decoded text.
- SHA-256: `1d4da65f3eb3cb6ead38dab7e813239583ba63de8122d8e942f84144378ea8e1`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerGateway`.

## `tests/regression/provider_circuit_half_open.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2851 bytes; lines: 64.
- Reading: Full decoded text.
- SHA-256: `2728eee1fff866602ce5fa4335c79e4c53ba4c8de9ce21d3cceccb34a06aa19d`.
- Symbols (name:line): `run:8`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_error_classifier.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2052 bytes; lines: 47.
- Reading: Full decoded text.
- SHA-256: `3f5f2b724c7281b647a0ac7876a661a85cf7cc3c718bcc308dbedafe5e48edb9`.
- Literal imports: `assert`, `../../src/core/providerErrorClassifier`.

## `tests/regression/provider_failover.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1089 bytes; lines: 29.
- Reading: Full decoded text.
- SHA-256: `76dc404c36cf6c2f04f970773d978dd90b18cfdae09d09f70ff8fcb52a8e50c3`.
- Literal imports: `assert`, `../../src/core/translationQueue`.

## `tests/regression/provider_failover_strict.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1620 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `6ba25c320e1db24434d636a54cfc0587b90bb9263224d9e349ce05e21856b821`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerGateway`.

## `tests/regression/provider_health.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1367 bytes; lines: 36.
- Reading: Full decoded text.
- SHA-256: `14f1e4579c052dd3785ef302c9cfcfd7315866a739e0c258b04b4089bd3dc9ed`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_rate_limit_storm.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2696 bytes; lines: 71.
- Reading: Full decoded text.
- SHA-256: `2d9a592ce99b884a96b1d3e09767eed035636c4dc8eca62772461fcbf0ae0d39`.
- Literal imports: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_resume.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1977 bytes; lines: 65.
- Reading: Full decoded text.
- SHA-256: `efaea13a01b9e7739a51233357d1369c642f6d0f7d1bed20072151d8c9851f0d`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/jobPersistence`.

## `tests/regression/rate_limit.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 799 bytes; lines: 23.
- Reading: Full decoded text.
- SHA-256: `2a619c2d44de5a0f39afc96b676aeaadb2936d527173db01be25bf223109b5e6`.
- Literal imports: `assert`, `../../src/core/providerRateLimiter`.

## `tests/regression/real_game_launch_smoke.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 8964 bytes; lines: 203.
- Reading: Full decoded text.
- SHA-256: `16aebc3f10db3b553bdbf4f4c9fa0d53a6b343786eac83fc2b868e3e70d79315`.
- Symbols (name:line): `getHash:27`, `sleep:31`, `run:35`.
- Literal imports: `assert`, `fs`, `path`, `crypto`, `child_process`, `../../src/extractors/extractor`, `../../src/core/gameEngine`, `../../src/core/pluginSafePatcher`, `../../src/core/ownedProcessRegistry`, `./testPaths`.

## `tests/regression/rgss_real_pipeline.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4960 bytes; lines: 145.
- Reading: Full decoded text.
- SHA-256: `3c7a33fb8439e22811bfdc0cedcdc0800d5378cc446f5a8dd0597cfd2e8d45fa`.
- Symbols (name:line): `sha256:7`, `testRgssPipeline:13`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/rpgmaker/rgssAdapter`, `../../src/core/engineDetector`.

## `tests/regression/run-all-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6934 bytes; lines: 133.
- Reading: Full decoded text.
- SHA-256: `7146bad1287fe2e556830152e8bbc0bb0f9e522055a43da1a952344e7d592d71`.
- Symbols (name:line): `assert:16`, `runTests:27`.
- Literal imports: `fs`, `path`, `../../src/core/engineDetector`, `../../src/core/codeProtector`, `../../src/core/backupManager`, `../../src/core/engineRegistry`, `../../src/core/translationPipeline`, `./testPaths`.

## `tests/regression/run-phase2-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5905 bytes; lines: 147.
- Reading: Full decoded text.
- SHA-256: `60a93afc43b167fd148a04251fcf610f59b621be9bf31a233e72ee69749cdc02`.
- Symbols (name:line): `check:16`, `run:27`.
- Literal imports: `assert`, `../../src/core/qaEngine`, `../../src/core/codeProtector`, `../../src/core/translationMemory`, `../../src/core/selfTest`, `../../src/core/diagnosticBundle`, `../../src/engines/electron/electronBridge`, `../../src/core/gameService`.

## `tests/regression/run-phase3-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7170 bytes; lines: 162.
- Reading: Full decoded text.
- SHA-256: `0b8e02f4381b1694e210b8c291428873ec3b9738e496233d0dfdf9a9a73ac33d`.
- Symbols (name:line): `check:18`, `run:29`.
- Literal imports: `fs`, `assert`, `path`, `os`, `../../src/core/strategyPlanner`, `../../src/core/transactionJournal`, `../../src/engines/renpy/renpyParser`, `../../src/engines/electron/asarRepacker`, `../../src/engines/generic/universalScanner`, `../../src/core/gameService`.

## `tests/regression/run-phase4a-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7064 bytes; lines: 170.
- Reading: Full decoded text.
- SHA-256: `bbfb39744d04e3b8abf211be76f7e15c466734cbafe0ea47cc220d6db6abf978`.
- Symbols (name:line): `runTest:19`, `runAsyncTest:31`, `main:43`.
- Literal imports: `path`, `fs`, `assert`, `../../src/diagnostics/executableAnalyzer`, `../../src/diagnostics/processInspector`, `../../src/diagnostics/errorAnalyzer`, `../../src/diagnostics/logIntelligence`, `../../src/diagnostics/universalGameIntelligence`, `../../src/runtime/universalRuntimeHost`, `../../src/runtime/runtimeEventBus`, `../../tools/repoLint`, `../tools/repoLint`.

## `tests/regression/run-phase5-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11222 bytes; lines: 269.
- Reading: Full decoded text.
- SHA-256: `0fce6ac08b2c3b08a3262a5969d01578379a8c53826ad18448354193b2d54661`.
- Symbols (name:line): `runTest:18`, `runAsyncTest:30`, `main:42`.
- Literal imports: `path`, `fs`, `assert`, `../../src/discovery/universalDiscoveryEngine`, `../../src/discovery/textProvenanceGraph`, `../../src/discovery/gameCompatibilityPassport`, `../../src/discovery/discoveryExperimentEngine`, `../../src/core/placeholderIntegrityValidator`, `../../src/core/textCaptureQuality`, `../../src/core/applyGate`, `../../src/diagnostics/logParsers`, `../../src/runtime/universalOverlay`.

## `tests/regression/run-phase5b-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 9708 bytes; lines: 227.
- Reading: Full decoded text.
- SHA-256: `61eae537ff77a1f997af438357016a1c0c2a7b80b2f275f3b27d5375be2bade8`.
- Symbols (name:line): `runTest:20`, `runAsyncTest:32`, `main:44`.
- Literal imports: `path`, `fs`, `assert`, `../../src/core/textClassifier`, `../../src/core/textStabilizer`, `../../src/core/priorityQueue`, `../../src/core/multiLevelCache`, `../../src/core/translationRouter`, `../../src/core/translationStateMachine`, `../../src/core/gameRules`, `../../src/core/layoutAnalyzer`, `../../src/core/outputProvider`, `../../src/core/translationProvider`, `../../src/core/performanceMonitor`.

## `tests/regression/run-phase5c-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6776 bytes; lines: 179.
- Reading: Full decoded text.
- SHA-256: `20baf682817e0bd21608b7c79e67bd788a174279e9f5432fcdbaed8028b13ee9`.
- Symbols (name:line): `runTest:17`, `runAsyncTest:29`, `main:41`.
- Literal imports: `path`, `fs`, `assert`, `crypto`, `../../src/core/backupManager`, `../../src/core/placeholderIntegrityValidator`, `../../src/core/textStabilizer`, `../../src/core/multiLevelCache`, `../../src/core/translationRouter`, `../../src/engines/renpy/renpyParser`, `../../src/core/performanceMonitor`, `http`.

## `tests/regression/run-phase6-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 19880 bytes; lines: 428.
- Reading: Full decoded text.
- SHA-256: `28bf7efa029349271347e0e5d7f35ab2853861657a316b7017ec04e0e1bc0272`.
- Symbols (name:line): `runTest:46`, `runAsyncTest:58`, `main:70`.
- Literal imports: `assert`, `path`, `fs`, `../../src/core/engineRuntimeTriad`, `../../src/core/textObjectIdentity`, `../../src/core/translationContext`, `../../src/core/glossaryEngine`, `../../src/core/translationMemory3`, `../../src/core/fastTextPipeline`, `../../src/core/fontCompatibilityEngine`, `../../src/core/translationLayoutValidator`, `../../src/core/translationPatchFormat`, `../../src/core/healthMonitor`, `../../src/core/pluginSdk`, `../../src/core/subtitleSystem`, `../../src/core/imageTextLayer`, `../../src/runtime/hookProvider`, `../../src/engines/godot/godotLocalizationProvider`, `../../src/engines/godot/godotControlTextProvider`, `../../src/engines/unreal/unrealLocResProvider`, `../../src/engines/unreal/unrealStringTableProvider`, `../../src/engines/unreal/unrealLocalizationProvider`, `../../src/engines/unity/unityLocalizationPackageProvider`, `../../src/engines/unity/unityTextMeshProProvider`, `../../src/engines/unity/unityUGUIProvider`, `../../src/engines/renpy/renpyProductionProvider`, `../../src/engines/electron/electronArchiveProvider`, `../../src/engines/electron/electronDOMProvider`.

## `tests/regression/run-phase7-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 16035 bytes; lines: 386.
- Reading: Full decoded text.
- SHA-256: `df152ab32961f834d650e92fa4103e6aa47e6ca1f11677cd748caa4ba6429646`.
- Symbols (name:line): `main:23`, `runTest:32`, `runAsyncTest:44`.
- Literal imports: `assert`, `path`, `fs`, `../../src/core/evidenceModel`, `../../src/core/realGameWorkflow`, `../../src/engines/renpy/renpyWorkflow`, `../../src/engines/unity/unityFrameworkMatrix`, `../../src/engines/unreal/unrealLocalizationWorkflow`, `../../src/discovery/unknownGameTriage`, `../../src/core/textProvenance2`, `../../src/core/translationSession`, `../../src/core/patchInstaller`, `../../src/core/translationEditorCore`, `../../src/core/queueStarvationManager`, `../../src/core/cachePolicy`.

## `tests/regression/run-phase8a-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11599 bytes; lines: 297.
- Reading: Full decoded text.
- SHA-256: `635c0384ca253237589a8daf4c322de315396b3efae5a405ca400764685e3383`.
- Symbols (name:line): `main:17`, `runTest:26`, `runAsyncTest:38`.
- Literal imports: `assert`, `path`, `fs`, `crypto`, `../../src/core/localDictionaryProvider`, `../../src/core/visibleTextVerifier`, `../../src/core/patchInstaller`, `../../src/core/realTranslationWorkflow`, `../../src/core/realGameWorkflow`.

## `tests/regression/run-phase8b-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 10704 bytes; lines: 248.
- Reading: Full decoded text.
- SHA-256: `d0f02bfc961df3492dc9c40c4cbfd5fef912f95df2a9c283724ae8f3bddec037`.
- Symbols (name:line): `main:21`, `runTest:30`, `runAsyncTest:42`.
- Literal imports: `assert`, `path`, `fs`, `crypto`, `../../src/core/translationPatchSchema`, `../../src/core/translationPatchFormat`, `../../src/core/translationEditorCore`, `../../src/core/patchInstaller`, `../../src/core/formatAwareOutput`, `../../src/core/visibleTextVerifier`, `../../src/core/evidenceModel`, `../../src/core/localDictionaryProvider`, `../../src/core/fastTextPipeline`.

## `tests/regression/run-phase9-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 10582 bytes; lines: 256.
- Reading: Full decoded text.
- SHA-256: `e8a960aedb760931f65c4482cada85066bb8acb15b5f3f086d02ea1a56afb2d9`.
- Symbols (name:line): `runTest:31`, `runAsyncTest:43`, `main:55`.
- Literal imports: `assert`, `path`, `fs`, `../../src/core/evidenceModel`, `../../src/core/ownedProcessRegistry`, `../../src/core/runtimeSessionManager`, `../../src/core/patchInstaller`, `../../src/core/formatAdapterRegistry`, `../../src/core/translationUnit`, `../../src/core/translationRuntimeRouter`, `../../src/core/screenCapture`, `../../src/core/claimAudit`.

## `tests/regression/run-product-runtime-test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7703 bytes; lines: 186.
- Reading: Full decoded text.
- SHA-256: `1e0c833c26a0e00468fab12c90d1fd41319c685216113481ba48d7fa4276ac78`.
- Symbols (name:line): `httpRequest:26`, `main:52`.
- Literal imports: `assert`, `path`, `http`, `../../src/core/runtimeSessionManager`, `../../src/core/runtimeProbe`, `../../src/core/screenCapture`, `../../src/core/evidenceModel`, `../../src/core/claimAudit`, `../../src/providers/translationProviderRegistry`, `../../src/core/localDictionaryProvider`, `../../src/core/ownedProcessRegistry`.

## `tests/regression/run-real-staged-game-test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7776 bytes; lines: 178.
- Reading: Full decoded text.
- SHA-256: `d7ffb3fbf7d7732462f59e46e1bc3d6223266e0487d63c0b08df9468f5df5b12`.
- Symbols (name:line): `testRenpyLab:27`, `testRpgMakerMzLab:94`, `main:159`.
- Literal imports: `assert`, `path`, `fs`, `../../src/core/stagingPolicy`, `../../src/engines/renpy/renpyRuntimeBridge`, `../../src/engines/rpgmaker/rpgMakerRuntimeBridge`, `../../src/core/translationRuntimeRouter`, `../../src/core/evidenceModel`, `../../src/core/claimAudit`, `../../src/providers/translationProviderRegistry`, `../../src/core/localDictionaryProvider`.

## `tests/regression/run_master_regression.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4885 bytes; lines: 102.
- Reading: Full decoded text.
- SHA-256: `e3b78a5de3a8e3c5ddd79131b078d57e422aa7664bcb661195f3214d8791b1fc`.
- Literal imports: `child_process`, `path`, `fs`.

## `tests/regression/test_translation_qa_launch_bug.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2899 bytes; lines: 63.
- Reading: Full decoded text.
- SHA-256: `b70f75b3832f3d90a7b2c27221e7994d7c84a42045561a2e0439d360fd4dc078`.
- Literal imports: `assert`, `path`, `fs`, `../../src/core/codeProtector`, `../../src/core/qaEngine`, `../../src/engines/renpy/renpyAdapter`, `../../src/core/translationPipeline`.

## `tests/regression/testPaths.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2735 bytes; lines: 91.
- Reading: Full decoded text.
- SHA-256: `32becae1eb77d5883aed2f77117282b6dc906e9147418e5ac5dd9b5afa100636`.
- Symbols (name:line): `getLabCandidates:14`, `resolveGame:34`, `getTokiPath:50`, `getRenpyPath:54`, `getLabRoot:60`, `requireFixture:67`.
- Literal imports: `path`, `fs`.
- Static incoming references: `tests/regression/plugin_runtime_translation.test.js`, `tests/regression/plugin_safe_patcher_integration.test.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/regression/run-all-tests.js`.

## `tests/regression/translation_accounting.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1963 bytes; lines: 52.
- Reading: Full decoded text.
- SHA-256: `80a00e0af7c4c0834b907a4a1c7c09f18cebbae2728478e6ab7f4525056fccb7`.
- Literal imports: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/translation_accounting_realistic.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2699 bytes; lines: 68.
- Reading: Full decoded text.
- SHA-256: `f72d87e6184a3aa8aaf6c4ee83716910c29c7b0b319a2ddb528d31a8f69a736d`.
- Symbols (name:line): `run:19`.
- Literal imports: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/translation_resume.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1054 bytes; lines: 32.
- Reading: Full decoded text.
- SHA-256: `edec64e20ef0e3f86206c14204167389c1fbfae39335356e28abb79ab50b9b2f`.
- Literal imports: `assert`, `../../src/core/jobPersistence`.

## `tests/regression/translation_speed.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1381 bytes; lines: 35.
- Reading: Full decoded text.
- SHA-256: `589dea3e58800bf4edb11439ba7bbe84d1d609104ef4b68bc3cee3e74fdbb551`.
- Literal imports: `assert`, `../../src/core/translationQueue`.

## `tests/regression/unit_of_count_consistency.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2065 bytes; lines: 49.
- Reading: Full decoded text.
- SHA-256: `33d16255eb4c5e2e3e73474531c572118c38a0fd1ba74b2f64868a5b2f586c13`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/unity_code_protector.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3408 bytes; lines: 77.
- Reading: Full decoded text.
- SHA-256: `672e039adb0c9ce72e521a8a8598f8f4d7dfd7337bb7f37dbfa4b657f589df2c`.
- Symbols (name:line): `runUnityProtectionTests:2`.
- Literal imports: `../../src/core/codeProtector`.

## `tests/regression/unity_comprehensive_suite.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6560 bytes; lines: 174.
- Reading: Full decoded text.
- SHA-256: `4d0c91ddeef8e62f4ec66cb3f154ac483fceaeb25ad4fddc3168cb0346eaecfe`.
- Symbols (name:line): `sha256:6`, `runUnityComprehensiveSuite:22`.
- Literal imports: `fs`, `path`, `crypto`, `../../src/core/engineDetector`, `../../src/engines/unity/unityAdapter`.

## `tests/regression/unity_managed_and_rgss3a.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5372 bytes; lines: 108.
- Reading: Full decoded text.
- SHA-256: `50b6129fd79b19d5a2f09ae98855b0b69ffb2ef3a9540017afa569fe45f48e0e`.
- Symbols (name:line): `sha256:9`.
- Literal imports: `fs`, `path`, `child_process`, `crypto`.

## `tests/regression/unity_real_pipeline.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4405 bytes; lines: 125.
- Reading: Full decoded text.
- SHA-256: `90a80a85955f96ec6adbd014c566d9ab3260d36fd83e29226a1c4d29ab02b9fb`.
- Symbols (name:line): `sha256:5`, `testRealUnityPipeline:11`.
- Literal imports: `fs`, `path`, `crypto`, `../../src/engines/unity/unityAdapter`.

## `tests/regression/wolf_real_pipeline.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4597 bytes; lines: 139.
- Reading: Full decoded text.
- SHA-256: `d0e7acabb7d04e0f42145e8f9795fc6b5095d12b92d30f00ae6c0bf161d06e2b`.
- Symbols (name:line): `sha256:7`, `testWolfPipeline:13`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/wolf/wolfAdapter`, `../../src/core/engineDetector`.

## `tests/renpy_variable_healing.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4349 bytes; lines: 88.
- Reading: Full decoded text.
- SHA-256: `035793cd2ef8f7c84c8df06d9a9e0dec34c4bb540f691120749aa77f1ed47e92`.
- Symbols (name:line): `run:14`.
- Literal imports: `assert`, `fs`, `path`, `../src/engines/renpy/renpyCommon`, `../src/engines/renpy/validator/renpyValidator`, `../src/engines/renpy/adapter/renpyAdapter`, `../src/engines/renpy/injector/renpyInjector`.

## `tests/run-lab-tests.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5177 bytes; lines: 121.
- Reading: Full decoded text.
- SHA-256: `d9c6e3c9e115a786101a8442b7f38dddae2d7e5448492029cfbc502d0f4b174c`.
- Symbols (name:line): `runLab:27`.
- Literal imports: `fs`, `path`, `../src/core/engineDetector`, `../src/core/engineRegistry`, `../src/core/translationPipeline`, `../src/engines/renpy/renpyAdapter`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/electron/electronAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/generic/genericAdapter`.

## `tests/security/http_rpc_security.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 13773 bytes; lines: 333.
- Reading: Full decoded text.
- SHA-256: `524d4937fb04819abeac8ff914a6e566fd82eff3337517654af9106513a4bd8d`.
- Symbols (name:line): `test:40`, `rawRequest:57`, `rpcCall:79`, `main:92`, `finish:318`.
- Literal imports: `http`, `path`, `assert`, `child_process`.

## `tests/security/index.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1616 bytes; lines: 55.
- Reading: Full decoded text.
- SHA-256: `083e4c1243a100990c9fbb0d65071a94bde4983545e91bba6ddc72ea25709095`.
- Literal imports: `child_process`, `path`.

## `tests/security/owned_process_security.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 12876 bytes; lines: 335.
- Reading: Full decoded text.
- SHA-256: `9246a8bf9303a91304baaee5137e3b374c70612a9800a442f05b9dd77d3aefdc`.
- Symbols (name:line): `test:37`, `spawnLiveNode:50`, `sleep:58`, `waitAlive:60`, `main:70`.
- Literal imports: `assert`, `path`, `child_process`, `fs`, `os`.

## `tests/security/xss_ui.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 13784 bytes; lines: 323.
- Reading: Full decoded text.
- SHA-256: `b18f9703766566dfdecbc25eeeb7d4c6e81f2b3c96738cb555a22fa566e22223`.
- Symbols (name:line): `test:29`, `assertInert:47`, `assertInertAsAttribute:65`, `appSource:216`.
- Literal imports: `assert`, `fs`, `path`.

## `tests/test_adapters_live.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3726 bytes; lines: 72.
- Reading: Full decoded text.
- SHA-256: `c0c70ccccf4f3fa62c06466eccc71f96f7a66795c13a91ba2b5228c0e5e4fc98`.
- Symbols (name:line): `runAudit:35`.
- Literal imports: `fs`, `path`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/renpy/renpyAdapter`, `../src/engines/wolf/wolfAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/godot/godotAdapter`, `../src/engines/cocos/cocos2dxAdapter`.

## `tests/test_core_detector.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1098 bytes; lines: 28.
- Reading: Full decoded text.
- SHA-256: `91155e7b38b6b38e2f440b3883107dacbbbb5e696794b62591bcf2a149577781`.
- Symbols (name:line): `run:6`.
- Literal imports: `path`, `fs`, `../src/core/engineDetector`.

## `tests/test_coverage_guarantor_and_cache_integrity.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4923 bytes; lines: 104.
- Reading: Full decoded text.
- SHA-256: `a48118ace42228db64a01f610e42288066ca3fd66f1ed411a1500e069d10a8e4`.
- Symbols (name:line): `runTests:4`.
- Literal imports: `assert`, `../src/core/coverageGuarantor`, `../src/core/translationMemory`, `../src/translation/translator`.

## `tests/test_engine_detection.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1653 bytes; lines: 46.
- Reading: Full decoded text.
- SHA-256: `3224c9174d9baf53d0e6629254b8cf0fc36852c2bd0ea013181d3e2270a08631`.
- Literal imports: `path`, `fs`, `../src/core/gameEngine`.

## `tests/test_game_compatibility.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4168 bytes; lines: 101.
- Reading: Full decoded text.
- SHA-256: `eeb3ea00c0e4e92311dae32fb8bebd386211c308f64031a2f4df819fde2861d5`.
- Symbols (name:line): `runStep25Proof:18`.
- Literal imports: `fs`, `path`, `./real_ui_certification_runner`.

## `tests/test_kimochi_decrypt.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2058 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `d54653c68fba35bf2b217abd81d90f15dabb23ef3c76d0fa28ce9c503f304b62`.
- Literal imports: `fs`, `crypto`, `path`.

## `tests/test_multi_game_pipeline.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6448 bytes; lines: 167.
- Reading: Full decoded text.
- SHA-256: `1b933dea31acc90e29b91510458c0a9f20ae9219ea732c37b7a9b651da36bc9b`.
- Symbols (name:line): `hashFile:12`, `testGameFlow:18`, `run:117`.
- Literal imports: `fs`, `path`, `crypto`, `../src/core/engineDetector`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/renpy/renpyAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/wolf/wolfAdapter`.

## `tests/test_one_game_gameplay.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5776 bytes; lines: 151.
- Reading: Full decoded text.
- SHA-256: `e2b04dd69059a66792e4dc8edc0eaf6185d5b16aabb4adfb536a78713dbe6757`.
- Symbols (name:line): `rpc:10`, `main:19`, `setTimeout:57`, `setTimeout:121`.
- Literal imports: `fs`, `path`, `child_process`.

## `tests/test_real_world_e2e_all_games.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 10649 bytes; lines: 240.
- Reading: Full decoded text.
- SHA-256: `f7ff8f3b1c3bb39636a55500683b1d48dca0bf8fab45219711db227904e8b17e`.
- Symbols (name:line): `rpcCall:24`, `calculateFileSha256:51`, `runRealWorldSuite:58`.
- Literal imports: `http`, `fs`, `path`, `crypto`.

## `tests/test_renpy_coverage_generalization.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 8805 bytes; lines: 165.
- Reading: Full decoded text.
- SHA-256: `989d57f97f154a65c16c749f8a1efd3cf9ed32aaadd8bc64adc7d9db19f0f814`.
- Symbols (name:line): `runTests:21`.
- Literal imports: `fs`, `path`, `../src/engines/renpy/extractor/renpyExtractor`, `../src/engines/renpy/injector/renpyInjector`, `../src/engines/renpy/validator/renpyValidator`, `../src/core/coverageGuarantor`.

## `tests/test_renpy_summertime_extraction.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1599 bytes; lines: 48.
- Reading: Full decoded text.
- SHA-256: `bb5b0245da4a68a01c61524f046db9858cb1e0cbd0f5e7cdcc96c029169a119e`.
- Symbols (name:line): `run:6`.
- Literal imports: `fs`, `../src/engines/renpy/extractor/renpyExtractor`.

## `tests/test_text_chunking_and_provider_resilience.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 9284 bytes; lines: 220.
- Reading: Full decoded text.
- SHA-256: `339d46cdbafe31c7006a8b6c0fd00efe284c8f3437264bc6140a76cb1e19306e`.
- Symbols (name:line): `runTest:21`, `runAsyncTest:32`.
- Literal imports: `assert`, `../src/core/textChunker`, `../src/core/providerErrorClassifier`, `../src/core/globalCircuitBreaker`.

## `tests/test_toki_gameplay.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6322 bytes; lines: 144.
- Reading: Full decoded text.
- SHA-256: `b6048d2596cf0ac6a3ac6c456d2e8af5ae6e757bb27aedb9dac21b5685701588`.
- Symbols (name:line): `rpc:5`, `run:14`, `setTimeout:46`, `setTimeout:108`.
- Literal imports: `child_process`, `fs`, `path`.

## `tests/test_translation_completeness_and_certificates.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 16499 bytes; lines: 403.
- Reading: Full decoded text.
- SHA-256: `b70bcbdc9f020de84de42d650274b7b72cea022c6e798ecfabfc4db9a84b7ba3`.
- Symbols (name:line): `runTests:13`, `runCase:21`, `rpcLaunchGate:365`.
- Literal imports: `assert`, `../src/core/translationCertificate`, `../src/core/qaEngine`.

## `tests/unit/adapterReview.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4327 bytes; lines: 51.
- Reading: Full decoded text.
- SHA-256: `7875ece96b9f1ad67035779ceeb03bb86dfe1bc87f0d9ee01782a92a556d2365`.
- Symbols (name:line): `write:15`, `main:16`, `fixture:40`.
- Literal imports: `assert`, `fs`, `path`, `os`, `../../src/engines/electron/electronAdapter`, `../../src/engines/defold/defoldAdapter`, `../../src/engines/cocos/cocosCreatorAdapter`, `../../src/engines/electron/asarRepacker`, `../../src/engines/electron/asarUtil`.

## `tests/unit/adapterRuntimeContract.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 15263 bytes; lines: 317.
- Reading: Full decoded text.
- SHA-256: `6bd2513ab29d7c52e78867afd162fb172ecb6d0d73370f16de5fa11c8e29dc19`.
- Symbols (name:line): `ok:34`, `bad:35`, `productionFilesUsingPartialReport:57`, `tmpdir:75`, `textsDe:80`.
- Literal imports: `../../core/partialApply`, `fs`, `os`, `path`.

## `tests/unit/applyContract.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 14934 bytes; lines: 357.
- Reading: Full decoded text.
- SHA-256: `557b2a1610dba2b3b8d5edfa51cb9ef7136c4ddc2345ac3319ed702a643f6d54`.
- Symbols (name:line): `teste:37`, `tmpGame:38`, `apply:284`, `rollback:290`, `apply:312`, `rollback:318`.
- Literal imports: `assert`, `fs`, `os`, `path`, `../../src/core/applyContract.js`, `../../src/core/applyTransaction.js`, `../../src/engines/generic/genericAdapter.js`.

## `tests/unit/applyPathContainment.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 6406 bytes; lines: 143.
- Reading: Full decoded text.
- SHA-256: `332a243f27e9118e534dc4dbf3de0a8fbf1c84afa357dd2d6dce4a0573acac60`.
- Symbols (name:line): `ok:22`, `bad:23`, `chk:34`.
- Literal imports: `fs`, `os`, `path`.

## `tests/unit/applyTransaction.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 22410 bytes; lines: 601.
- Reading: Full decoded text.
- SHA-256: `b6239569745b06223dfe2bb26b2934d5dea93125fafa3c021e7a494f03819a3b`.
- Symbols (name:line): `test:32`, `runAll:36`, `makeGame:67`, `cleanupDir:76`, `honestAdapter:84`, `apply:86`, `rollback:97`, `lyingAdapter:104`, `apply:106`, `rollback:114`, `partialAdapter:131`, `apply:133`, `rollback:158`, `mkJournal:161`, `apply:312`, `rollback:313`, `apply:339`, `rollback:341`, `codeOnly:513`.
- Literal imports: `assert`, `path`, `fs`, `os`, `crypto`.

## `tests/unit/applyVerification.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 13440 bytes; lines: 353.
- Reading: Full decoded text.
- SHA-256: `8a290458f7c4d51f1c547961935c7f356b773878002995186e7a883ebfdc692d`.
- Symbols (name:line): `test:23`, `runAll:27`, `txt:56`, `makeAdapter:68`, `apply:73`, `extract:77`, `validate:81`, `rollback:84`, `apply:212`, `extract:213`.
- Literal imports: `assert`, `path`, `os`, `fs`, `./applyVerifier`.

## `tests/unit/auditContracts.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4257 bytes; lines: 90.
- Reading: Full decoded text.
- SHA-256: `ca52a9de61f1354c46f869f674d73f35231c8c2aa3cb2e9cca9ddc16874a1c4f`.
- Symbols (name:line): `test:14`, `fixture:24`, `setTimeout:45`, `require:46`.
- Literal imports: `assert`, `fs`, `path`, `vm`, `../index`, `../../src/utils/resourceResolver`.

## `tests/unit/backgroundJobLifecycle.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2866 bytes; lines: 42.
- Reading: Full decoded text.
- SHA-256: `21529a90c40aa3fd326651b9102334eb1af6203be802a0ac1b3d8883fb3f8d45`.
- Symbols (name:line): `test:11`, `service:12`.
- Literal imports: `assert`, `fs`, `path`, `vm`, `../../src/core/jobSystem`.

## `tests/unit/cacheDurability.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 17884 bytes; lines: 491.
- Reading: Full decoded text.
- SHA-256: `5fede3702f193cbe1d53370a55f28bc3dbc6854831bd79d8cd64b647bd7a12f9`.
- Symbols (name:line): `test:40`, `runAll:44`, `freshCache:73`, `cleanup:91`.
- Literal imports: `assert`, `path`, `fs`, `os`.

## `tests/unit/certificateCoherence.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 10077 bytes; lines: 188.
- Reading: Full decoded text.
- SHA-256: `c62dda95526d939e9a5f80ddfddd65268253ed33243156f3584b7b66b198c0f6`.
- Symbols (name:line): `ok:21`, `bad:22`.
- Literal imports: `path`.

## `tests/unit/cheatRoundTrip.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3880 bytes; lines: 30.
- Reading: Full decoded text.
- SHA-256: `79b7675f346e3b3578c2005eea115428dda86684910fdfff315cce08a904ce8e`.
- Symbols (name:line): `post:7`, `main:8`.
- Literal imports: `assert`, `fs`, `path`, `os`, `vm`, `http`, `../../src/services/cheatServer`, `../../src/services/rpcHandlers`, `../../src/services/cache`, `../../src/core/translationMemory`.

## `tests/unit/cheatServerContract.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 15578 bytes; lines: 430.
- Reading: Full decoded text.
- SHA-256: `acc05bbe73543d8a1702fba00098deb880e4aacad614769478be94b2a33771f6`.
- Symbols (name:line): `test:29`, `rawHttp:41`, `run:64`.
- Literal imports: `http`, `assert`, `ws`, `../../src/services/cheatServer`.

## `tests/unit/coverageTruth.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 17960 bytes; lines: 423.
- Reading: Full decoded text.
- SHA-256: `cc1ff259eed4aad06db4c18b9b38c759cb702b92f9ea0cf37d5dfa717d2a74da`.
- Symbols (name:line): `test:45`, `runAll:49`, `mk:122`, `audit:142`.
- Literal imports: `assert`, `path`.

## `tests/unit/displayTextClassification.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5884 bytes; lines: 148.
- Reading: Full decoded text.
- SHA-256: `e9321fe00722d1cf4c0132408f7d8c5f4ca99968f9eeef4b881ae21d547892ca`.
- Symbols (name:line): `test:8`.
- Literal imports: `path`, `assert`, `fs`.

## `tests/unit/engineAndRollback.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 12200 bytes; lines: 295.
- Reading: Full decoded text.
- SHA-256: `013b6b502eb514bbdf8939303cf3490a242a74ef689e36f2352ef629ba97c744`.
- Symbols (name:line): `test:38`, `runAll:42`, `srcFiles:70`, `stripComments:82`.
- Literal imports: `assert`, `path`, `fs`, `os`.

## `tests/unit/englishStartup.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2318 bytes; lines: 52.
- Reading: Full decoded text.
- SHA-256: `c872123b8875523805a311028dc040a9b8bd9e72471dbc744878cd7eb859a330`.
- Symbols (name:line): `main:8`, `updateEngineVisibility:25`.
- Literal imports: `assert`, `fs`, `path`, `vm`.

## `tests/unit/executableCompatibility.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2696 bytes; lines: 36.
- Reading: Full decoded text.
- SHA-256: `768d5648fb72bd86feeaba548873e1d76a65f8a1883daea6a73169cf5e9afc3b`.
- Symbols (name:line): `main:9`.
- Literal imports: `assert`, `fs`, `os`, `path`, `../../src/core/executableInfo`, `../../src/core/engineDetector`.

## `tests/unit/explicitProviderChoice.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1315 bytes; lines: 14.
- Reading: Full decoded text.
- SHA-256: `59f387f5930ad6d8668f05d33e9140dae1348acd4cc73abfdf3ffd8e50c115e8`.
- Literal imports: `fs`, `path`, `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerHttp`, `../../src/translation/translator`, `../../src/services/cache`.

## `tests/unit/hookLifecycle.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2433 bytes; lines: 58.
- Reading: Full decoded text.
- SHA-256: `0c9fe263d9cf281771e4096740848b2bca38174538ac7bb8fb5f7597c8d3f23b`.
- Symbols (name:line): `test:14`, `main:18`.
- Literal imports: `assert`, `http`, `fs`, `path`, `../../src/services/cheatServer`, `../../src/services/cache`, `../../src/core/translationMemory`.

## `tests/unit/identityReprocessCycle.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5467 bytes; lines: 144.
- Reading: Full decoded text.
- SHA-256: `ebd6343c7a9df132cbec76f9e96da53c9fe1436b049824e85ad611768a2d54a6`.
- Symbols (name:line): `test:10`.
- Literal imports: `path`, `fs`, `os`, `assert`.

## `tests/unit/legacyGameRestore.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4623 bytes; lines: 69.
- Reading: Full decoded text.
- SHA-256: `6dc627c7b446761c151899c097d8ae5ccaa955d087c3cb89dd8e1178844aa94a`.
- Symbols (name:line): `game:9`, `test:19`.
- Literal imports: `assert`, `fs`, `path`, `../../src/core/legacyGameRestore`.

## `tests/unit/pipelineTransaction.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11647 bytes; lines: 265.
- Reading: Full decoded text.
- SHA-256: `8c19752a6a6273e47af321921e908703cac7ef26b0d97d0d689d448f0ffbf399`.
- Symbols (name:line): `ok:47`, `bad:48`, `listarAdapters:107`.
- Literal imports: `assert`, `fs`, `path`.

## `tests/unit/portablePackage.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5411 bytes; lines: 66.
- Reading: Full decoded text.
- SHA-256: `07fd0f217d5f7a1e741b0ade491784d0f8bce136241e010f9eeb69ef6cb5aa7c`.
- Symbols (name:line): `write:10`, `fixture:11`, `build:19`, `test:22`.
- Literal imports: `assert`, `fs`, `path`, `crypto`, `../../tools/package_release`.

## `tests/unit/projectCleanup.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2160 bytes; lines: 17.
- Reading: Full decoded text.
- SHA-256: `9f5c84caf157747432a4ec50402268e4b9e503d864933f9caac27100fcdc6979`.
- Symbols (name:line): `write:6`.
- Literal imports: `fs`, `path`, `assert`, `child_process`, `../../src/utils/pythonResolver`.

## `tests/unit/providerContract.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 13901 bytes; lines: 366.
- Reading: Full decoded text.
- SHA-256: `43103dae0cb94569418bd2a4f3501c1976dcabbb4420cf787e0494b0e69b5474`.
- Symbols (name:line): `test:23`, `runAll:27`, `registryWith:187`.
- Literal imports: `assert`, `path`.

## `tests/unit/providerFalseSuccess.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 11668 bytes; lines: 312.
- Reading: Full decoded text.
- SHA-256: `d1309eb0b153a1a1df0ba9e0bf69d68a1b60175e20404c435b0f2e1ed6e2cebe`.
- Symbols (name:line): `test:28`, `runAll:32`, `makeServices:125`, `runOne:137`.
- Literal imports: `assert`, `path`.

## `tests/unit/providerGatewayEnforcement.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 14415 bytes; lines: 383.
- Reading: Full decoded text.
- SHA-256: `78967dcebb73b7462145e4a54203dba80313b6a0a345f0e3cc3c4b0eda40ed07`.
- Symbols (name:line): `test:30`, `runAll:34`, `stripComments:83`, `findDirectCalls:91`.
- Literal imports: `assert`, `path`, `fs`, `http`.

## `tests/unit/providerRateLimitSemantics.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 7807 bytes; lines: 195.
- Reading: Full decoded text.
- SHA-256: `74b0d6269ef59e385a59cbfb00a602231b38e7d1c494fd8a8a13364481f3e7cb`.
- Symbols (name:line): `test:13`.
- Literal imports: `path`, `fs`, `assert`.

## `tests/unit/renpy/extractor.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4733 bytes; lines: 115.
- Reading: Full decoded text.
- SHA-256: `1ecb11a321969a2f1fff47d93c44bb42e2d5abd0a0022e861ac0213b7fd975ba`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `fs`, `path`, `../../../src/engines/renpy/extractor/renpyExtractor`.
- Static incoming references: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/heal_variables.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2958 bytes; lines: 60.
- Reading: Full decoded text.
- SHA-256: `a88f2fb3abd14782b373ec15372e17beb0888f6e70be9e85dad4998691bfe417`.
- Symbols (name:line): `run:3`.
- Literal imports: `assert`, `../../../src/engines/renpy/renpyCommon`.

## `tests/unit/renpy/injector.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4851 bytes; lines: 117.
- Reading: Full decoded text.
- SHA-256: `0bf4e6a42728aa14605767020125275489e63f2d024256e5063885b83e0ce71f`.
- Symbols (name:line): `sha256:10`, `run:14`.
- Literal imports: `assert`, `fs`, `path`, `crypto`, `../../../src/engines/renpy/injector/renpyInjector`.
- Static incoming references: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/run_all.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 1267 bytes; lines: 34.
- Reading: Full decoded text.
- SHA-256: `ad8251e2696990fd1b4de6999e901a62e4e38151303ea7df4ce87309c8723f68`.
- Symbols (name:line): `main:10`.
- Literal imports: `./extractor.test`, `./translator.test`, `./injector.test`, `./validator.test`, `./runtime.test`.

## `tests/unit/renpy/runtime.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 3734 bytes; lines: 87.
- Reading: Full decoded text.
- SHA-256: `dd69b1428f12221460cf61f7a4c5d08870551eca777d428cff5502c3dea9297c`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `fs`, `path`, `../../../src/engines/renpy/runtime/renpyRuntime`.
- Static incoming references: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/translator.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4114 bytes; lines: 80.
- Reading: Full decoded text.
- SHA-256: `7e935ec0a08c30c06155ee7b0bce0271e086ba56920d8a12f4937ecbbf41081b`.
- Symbols (name:line): `run:7`.
- Literal imports: `assert`, `../../../src/engines/renpy/translator/renpyTranslator`.
- Static incoming references: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/validator.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4384 bytes; lines: 123.
- Reading: Full decoded text.
- SHA-256: `1ec0c2a4bc14628a4da7503f89d3977d3507390fb02fd6e010674ae90fd1ae84`.
- Symbols (name:line): `run:9`.
- Literal imports: `assert`, `fs`, `path`, `../../../src/engines/renpy/validator/renpyValidator`.
- Static incoming references: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpyPercentEscaping.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4889 bytes; lines: 123.
- Reading: Full decoded text.
- SHA-256: `ebdbc08bbd4bc84e07b4c53635f3c7ba23bedea874bb14b34f76f744b65731e1`.
- Symbols (name:line): `test:8`.
- Literal imports: `path`, `fs`, `assert`.

## `tests/unit/rpcHonesty.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 23722 bytes; lines: 574.
- Reading: Full decoded text.
- SHA-256: `804a09280c5a2bfb42fdc1d217051270321f480658901a121390c594df362080`.
- Symbols (name:line): `test:34`, `runAll:37`, `send:118`.
- Literal imports: `assert`, `path`, `fs`, `os`.

## `tests/unit/shutdownHttp.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4779 bytes; lines: 54.
- Reading: Full decoded text.
- SHA-256: `a8ecf27d70b4d58b39eb2545b52b28d04a80d157cb877a0f9ede5402ac8b0abd`.
- Symbols (name:line): `request:11`, `test:18`.
- Literal imports: `assert`, `fs`, `path`, `http`, `child_process`.

## `tests/unit/shutdownLifecycle.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5920 bytes; lines: 80.
- Reading: Full decoded text.
- SHA-256: `c81552cc31a1d6a3ed03404e32a01f0302eaeea1abf0310df64bb4c9f1995184`.
- Symbols (name:line): `test:8`, `setup:11`.
- Literal imports: `assert`, `fs`, `path`, `vm`.

## `tests/unit/successInvariant.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 18357 bytes; lines: 512.
- Reading: Full decoded text.
- SHA-256: `68c4c1814da47237a8c6f5b1cf6d1549b3e424687df7c4f343bff5261723ddeb`.
- Symbols (name:line): `auditarArquivos:42`, `teste:65`, `teste:322`, `teste:401`.
- Literal imports: `assert`, `fs`, `os`, `path`, `../../tools/successAudit.js`.

## `tests/unit/translationCertificate.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 14969 bytes; lines: 386.
- Reading: Full decoded text.
- SHA-256: `790005b4f7b36197e18f45ba2e9e1e6865664019c777d386acdaa1a40db25523`.
- Symbols (name:line): `test:23`, `perfect:37`.
- Literal imports: `assert`, `path`.

## `tests/unit/translationIdentity.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 5513 bytes; lines: 132.
- Reading: Full decoded text.
- SHA-256: `58707e80655b9752223f3bb6799977b3e7f77efd2d9a7ad38b36d09d620080cf`.
- Symbols (name:line): `test:7`.
- Literal imports: `path`, `assert`.

## `tests/unit/uiHealth.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 2448 bytes; lines: 44.
- Reading: Full decoded text.
- SHA-256: `2bc6d86afd52b5e1abb9e00efa8dd2a486bc218761607ecd6651b0dd0cbcafde`.
- Symbols (name:line): `render:9`, `main:22`.
- Literal imports: `assert`, `fs`, `path`, `vm`, `../../ui/xssGuard`.

## `tests/unit/uiWiring.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 14826 bytes; lines: 358.
- Reading: Full decoded text.
- SHA-256: `72c0f5322f344b2eddd8b3ed329c64135b8c9d817b2ad8b189c84c503dd1118e`.
- Symbols (name:line): `test:37`, `runAll:41`, `uiCalls:69`, `serverHandlers:76`, `clickHandler:95`, `clickHandlers:115`, `innerHtmlBlocks:122`.
- Literal imports: `assert`, `path`, `fs`.

## `tests/unit/universeCount.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 12054 bytes; lines: 308.
- Reading: Full decoded text.
- SHA-256: `5c57473c60d43dc307d5714cb578f0a531bea8a65996606d63b25ce4aa702f40`.
- Symbols (name:line): `test:42`, `runAll:46`, `cert:87`, `codeOnly:185`.
- Literal imports: `assert`, `path`, `fs`.

## `tests/unit/unrealApplyHonesty.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4352 bytes; lines: 85.
- Reading: Full decoded text.
- SHA-256: `28f71908290c611a20cc81b31a3b49799e4a4ca7fc86747e833b6f6d04399c32`.
- Symbols (name:line): `inst:23`, `caso:29`.
- Literal imports: `fs`, `os`, `path`, `crypto`.

## `tests/unit/unrealLocResFormat.test.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 4408 bytes; lines: 49.
- Reading: Full decoded text.
- SHA-256: `545b866a36dfa02d0083a640fc48c737122b19c277bf37340eb5996b7209b94c`.
- Symbols (name:line): `test:9`.
- Literal imports: `assert`, `fs`, `path`, `../../src/engines/unreal/unrealLocResProvider`, `../../src/engines/unreal/unrealAdapter`.

## `tests/validate_mz_certification.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 14628 bytes; lines: 338.
- Reading: Full decoded text.
- SHA-256: `6ef20db2b29fef8aca3c8c37a33b222931f53320859e556934350e4c63f979aa`.
- Symbols (name:line): `checkPng:29`, `auditGameMz:38`, `runFullValidation:251`.
- Literal imports: `fs`, `path`, `crypto`.

## `tests/validate_real_ui_certification.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 15460 bytes; lines: 279.
- Reading: Full decoded text.
- SHA-256: `c4423c105b88662749bffe8f86fa9d576f1b703957e34cb611b74c35129d27c3`.
- Symbols (name:line): `validateCertification:34`.
- Literal imports: `fs`, `path`.

## `tests/validate_renpy_certification.js`

Test or fixture. Registration in tests/index.js determines execution in the default suite.

- Category: Test / fixture.
- Description basis: Inferred from location.
- Size: 17031 bytes; lines: 385.
- Reading: Full decoded text.
- SHA-256: `c7e4158fd3e80376208a1b67d944bb0a0b871536941cea4c87fb6849e27b9d39`.
- Symbols (name:line): `checkPng:28`, `auditGameRenpy:37`, `runFullValidation:254`.
- Literal imports: `fs`, `path`, `crypto`.

## `tools/capture_game.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 815 bytes; lines: 24.
- Reading: Full decoded text.
- SHA-256: `60682b3e345656502c7574d0cb35ed5d9b494f280d61f38dffafa5948f82609d`.
- Literal imports: `fs`.

## `tools/check_loading.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1373 bytes; lines: 35.
- Reading: Full decoded text.
- SHA-256: `538159fb7d3ce8124739c0c75445132cf8affea234041edd400a5d7ba71e5e89`.
- Symbols (name:line): `main:2`.
- Literal imports: `fs`.

## `tools/check_map.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1998 bytes; lines: 48.
- Reading: Full decoded text.
- SHA-256: `eb45e4aa0ce2ed37e21bb1e9db9403b469eddc23aa7f27cdaf2fb4268aadc553`.
- Symbols (name:line): `main:2`.
- Literal imports: `fs`.

## `tools/cleanup_project.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 142 bytes; lines: 4.
- Reading: Full decoded text.
- SHA-256: `d22d83337e054ec4878494ecbec6017b2550104cc05da56f9c38ebbdf44a7662`.
- Literal imports: `./maintenance/cleanup_project`.

## `tools/cli-compat.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4235 bytes; lines: 108.
- Reading: Full decoded text.
- SHA-256: `b32feae1f41e741345d4f231414fbb354814f5d879066d5f766125c87da2d79a`.
- Symbols (name:line): `findGameExe:25`.
- Literal imports: `fs`, `path`, `../src/utils/logger`, `../src/services/cache`, `../src/core/gameEngine`, `../src/translation/translator`, `../src/extractors/extractor`.

## `tools/document_project.py`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 13779 bytes; lines: 141.
- Reading: Full decoded text.
- SHA-256: `fe9411e049534f5a93b714f89e0a422075b47759be1648966926d15a527b85e8`.
- Symbols (name:line): `private:9`, `package:11`, `symbols:16`, `guide_html:27`, `category:65`, `describe:75`, `build:88`, `inline:29`, `markdown:119`.

## `tools/interact_game.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 2608 bytes; lines: 63.
- Reading: Full decoded text.
- SHA-256: `c6e744577cf325b89924e4366d7b49f0c86e0bca5a9301924abbb1cc1535eb1c`.
- Symbols (name:line): `main:2`.
- Literal imports: `fs`.

## `tools/inventory.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8792 bytes; lines: 236.
- Reading: Full decoded text.
- SHA-256: `941bde2751d9d98bf6149ba5274f5309ee830f2ba3c33e804b37969cd8f7fc30`.
- Symbols (name:line): `ehTemp:63`, `extensionDe:70`, `varrer:75`, `fmtBytes:148`, `relatorio:155`.
- Literal imports: `fs`, `path`.

## `tools/maintenance/cleanup_project.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 581 bytes; lines: 10.
- Reading: Full decoded text.
- SHA-256: `749ebfc319138d77334e77614893fdc054c27f29fa61ed80192c769117f39cd3`.
- Literal imports: `path`, `child_process`, `../../src/utils/pythonResolver`.
- Static incoming references: `tools/cleanup_project.js`.

## `tools/maintenance/project_cleanup.py`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5505 bytes; lines: 72.
- Reading: Full decoded text.
- SHA-256: `ec0b814f6afa21c962dc62e2404005a40df1c711b32d3e2416af247abed6e960`.
- Symbols (name:line): `sha:7`, `reason:8`, `role:19`, `main:26`.

## `tools/package_release.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 10592 bytes; lines: 134.
- Reading: Full decoded text.
- SHA-256: `173197d08c6c84ebe5a5d73f979ddf922f7e6bb0de2636819a63dc2387f0e4df`.
- Symbols (name:line): `hashFile:6`, `listFiles:15`, `copyTree:24`, `compileLauncher:33`, `probeRuntime:40`, `verifyBundle:49`, `packageDecision:58`, `buildRelease:74`, `skip:91`.
- Literal imports: `fs`, `path`, `crypto`, `child_process`, `better-sqlite3`, `ws`, `exceljs`.
- Static incoming references: `tests/unit/portablePackage.test.js`.

## `tools/patchRollout.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1366 bytes; lines: 33.
- Reading: Full decoded text.
- SHA-256: `b2f621f6b4f35759b2935a1976e018faf62fb89ef4428a5f5dbe9b160b134375`.
- Literal imports: `fs`.

## `tools/patchStaging.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3092 bytes; lines: 69.
- Reading: Full decoded text.
- SHA-256: `85f51058e01c40326194e8e64377a7cc871defa72e648f535bf7fafa2af764d5`.
- Literal imports: `fs`.

## `tools/qa_browser_runner.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8648 bytes; lines: 246.
- Reading: Full decoded text.
- SHA-256: `06d40cb75225f52956b26b4f0d72b75e8cee6749769a6544074f32ddbe94c8a6`.
- Symbols (name:line): `sleep:11`, `run:15`, `send:28`, `screenshot:84`, `evalJS:93`.
- Literal imports: `ws`, `fs`, `path`.

## `tools/repoLint.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9260 bytes; lines: 299.
- Reading: Full decoded text.
- SHA-256: `97cd4e776cc363200c1da3ab4ec8aee3fca865a98fb013d59efe8f15d001e34e`.
- Symbols (name:line): `collectJsFiles:48`, `checkSyntax:68`, `auditarSucesso:124`, `runRepoLint:148`, `findRoot:248`.
- Literal imports: `fs`, `path`, `vm`, `./successAudit.js`.
- Static incoming references: `tests/regression/run-phase4a-tests.js`.

## `tools/reprocessIdentity.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 5035 bytes; lines: 124.
- Reading: Full decoded text.
- SHA-256: `9d6f744e1aef3f2a4548eabff5df2855cc0b0a9a1c11a5d21e90cd22b860ee8f`.
- Symbols (name:line): `parseRpyEntries:25`, `classifyAll:53`, `main:75`.
- Literal imports: `fs`, `path`, `../src/core/scriptDetector`, `os`.

## `tools/restore_rpgmaker.py`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 59326 bytes; lines: 1212.
- Reading: Full decoded text.
- SHA-256: `ebd01ad6e2b2eacd3ce90992ce3a831e3bf605f5f963e62c275ada2008ef878b`.
- Symbols (name:line): `RPGMakerRestorer:35`, `main:1119`, `__init__:43`, `_validate_dirs:60`, `_load_json:73`, `_save_json:86`, `_get_plugin_param_protection:96`, `run:110`, `run_standalone:159`, `_process_file:196`, `_process_plugins_file:210`, `_process_map_file:230`, `_process_common_events:287`, `_restore_event_commands:310`, `_restore_text_command_params:347`, `_restore_filename_command:376`, `_looks_like_filename:411`, `_process_system_file:425`, `_apply_forced_replacements:468`, `_apply_generic_patterns:516`, `_apply_system_json_replacements:662`, `_apply_plugins_js_replacements:687`, `_apply_common_events_replacements:711`, `_apply_map_file_replacements:760`, `_apply_cmd_replacements:789`, `_parse_json_string:846`, `_serialize_json_string:853`, `_get_nested_param_protection:857`, `_restore_plugin_params:863`, `_restore_nested_plugin_params:924`, `_restore_nested_json_params:1010`, `_process_generic_file:1058`, `_deep_restore_filenames:1065`, `_print_summary:1104`, `deep_replace:762`, `apply_ui_rules:619`.

## `tools/run-phase7-real-lab.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 3456 bytes; lines: 92.
- Reading: Full decoded text.
- SHA-256: `e49392f9ef4b4eaafeb978d850b2d2790d26b8b5615a892f0df48e19f0cc07cb`.
- Symbols (name:line): `runLabVerification:17`.
- Literal imports: `fs`, `path`, `../src/core/realGameWorkflow`.

## `tools/run-pipeline-cli.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1713 bytes; lines: 55.
- Reading: Full decoded text.
- SHA-256: `05898a5b423606c9ec368386d6403f4fe7695052b0042d3f862afa6edc6fdcf7`.
- Symbols (name:line): `findGameExe:22`.
- Literal imports: `fs`, `path`, `../src/utils/logger`, `../src/services/cache`, `../src/core/gameEngine`.

## `tools/successAudit.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 27300 bytes; lines: 686.
- Reading: Full decoded text.
- SHA-256: `310671983bc4f8dac5b9cb8979f6c9b12b2419ecc04788b40a101036b4fa0ff4`.
- Symbols (name:line): `__setRootForTest:89`, `ehComentario:100`, `saldoChaves:151`, `assinaturaMultilinha:178`, `pareceAssinatura:199`, `inicioFuncao:243`, `fimFuncao:254`, `mascaraStrings:305`, `indiceCatchEngolido:365`, `sucessoProtegido:403`, `temIO:417`, `temVerificacao:433`, `eParametroDeFuncao:448`, `parametros:457`, `afirmaSucesso:464`, `sucessoVazio:470`, `ecoaArgumento:478`, `listarJs:487`, `carregarAllowlist:496`, `audit:505`, `__debug:667`.
- Literal imports: `fs`, `path`.
- Static incoming references: `tests/unit/successInvariant.test.js`, `tools/repoLint.js`.

## `tools/translate-locres.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 4170 bytes; lines: 62.
- Reading: Full decoded text.
- SHA-256: `cba2b3f3d58d207febc49ee0f17d13e0304974b07c414eb0b8feb5a79c6f313d`.
- Symbols (name:line): `translateLocRes:3`.
- Literal imports: `fs`, `path`, `../src/engines/unreal/unrealLocResProvider`, `../src/translation/translator`, `../src/services/cache`.

## `tools/universal_rpgmaker_gameplay_runner.js`

Development, packaging, or maintenance tool; not a game runtime requirement by itself.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9633 bytes; lines: 219.
- Reading: Full decoded text.
- SHA-256: `2536656038bc2f199c5732c45a1171446705675e10204961bc91fb45cfc44f2f`.
- Symbols (name:line): `rpc:17`, `testGame:26`, `setTimeout:69`, `setTimeout:158`.
- Literal imports: `child_process`, `fs`, `path`.

## `ui/app.js`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 185438 bytes; lines: 4212.
- Reading: Full decoded text.
- SHA-256: `bb82a1fd0b5b16fd642e6280fbd7d45d73afddbeeddc6ce8c86d0952d765e200`.
- Symbols (name:line): `refreshProviderHealth:3`, `pingServer:58`, `waitForToken:78`, `rpc:86`, `basename:109`, `dirname:114`, `connectDualHook:131`, `subscribeTelemetry:163`, `unsubscribeTelemetry:170`, `esc:187`, `attr:190`, `num:193`, `html:196`, `txt:199`, `qs:202`, `qsa:205`, `$:208`, `log:211`, `showToast:215`, `adjustColorBrightness:272`, `applyTheme:294`, `updateEngineVisibility:310`, `loadCfg:321`, `saveCfg:365`, `t:692`, `refreshAppDataCard:712`, `startTelemetryLoop:742`, `launchGame:772`, `loadGames:885`, `saveGame:896`, `delGame:903`, `detectEngine:930`, `engineInfo:938`, `engineSupportStatus:943`, `engineSupportLabel:948`, `engineIsJS:954`, `build:959`, `addGameFromExe:1473`, `qs:1530`, `updSB:1543`, `customConfirm:1550`, `renderGames:1586`, `openEdit:1679`, `atualizarSessaoRuntime:1994`, `pollJob:2241`, `findSaveDir:2786`, `renderSaves:2790`, `$:2905`, `$:2917`, `$:2941`, `loadGlossary:2951`, `renderGlossary:2960`, `$:2988`, `$:2997`, `getSelectedGameKey:3007`, `pollLogs:3477`, `keyLabel:3549`, `renderKeySelect:3550`, `initHotkeyUI:3553`, `applyHotkeys:3575`, `updateSubTabs:3594`, `renderRenpyVariables:3797`, `renderCompatibilityCards:4126`, `renderPerformance:4141`.
- Literal imports: `nw.gui`.

## `ui/favicon.ico`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 653696 bytes; lines: not interpreted.
- Reading: Bytes read; content not interpreted.
- SHA-256: `77e5b325e6e28df22a42cf774362e2d5e4eec760c1cce152cc46e5473ee150d4`.

## `ui/index.html`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 1986 bytes; lines: 43.
- Reading: Full decoded text.
- SHA-256: `8d2bd407deb9b961abc5bc51240dedfd2d55fc8ac6aa0e49e9f6f7d65c546eeb`.

## `ui/NotoSans/cjk/NotoSansCJKsc-Regular.otf`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 9225056 bytes; lines: not interpreted.
- Reading: Bytes read; content not interpreted.
- SHA-256: `ecd1416920dc7a79874c8ec36eb0b22915e344b8bb07827ccb3dccf4304b09ee`.

## `ui/OpenTranslator.png`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 653674 bytes; lines: not interpreted.
- Reading: Bytes read; content not interpreted.
- SHA-256: `e8d8635ac877796ec8339a85d56d4c15cb161d8b0ac46b8db6667a75690c473e`.

## `ui/rawres/notdef.ttf`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 219320 bytes; lines: not interpreted.
- Reading: Bytes read; content not interpreted.
- SHA-256: `dd734d4e2a40b380a1b5ac4adbb5985929ca6b0e2808cce62609343870bef543`.

## `ui/styles/base.css`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 15426 bytes; lines: 334.
- Reading: Full decoded text.
- SHA-256: `7cedd7d41b2a289fb4209d71fd584cdb4feeb11e4281b3b142f19c6a3bdd5abe`.

## `ui/styles/layout.css`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8038 bytes; lines: 25.
- Reading: Full decoded text.
- SHA-256: `ef65d024d25a076c822b3a84dd2c4c3bbb511888febf2d74cf0d5010c3b9504d`.

## `ui/UltraTranslateOverlay.js`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 21247 bytes; lines: 438.
- Reading: Full decoded text.
- SHA-256: `975022bbfe7a168e85d92e2df22b28bc7ba5ba3f2dc3a228519ce496035e3125`.
- Symbols (name:line): `norm:37`, `loadDict:43`, `tr:92`, `autoWrap:144`, `hookLogWindowRefresh:334`, `autoHookLogMethods:362`.

## `ui/xssGuard.js`

Browser interface or presentation resource. Application controls use English.

- Category: Product / development tool.
- Description basis: Inferred from location.
- Size: 8374 bytes; lines: 230.
- Reading: Full decoded text.
- SHA-256: `a5dfa3849068eee47f6deeb13227f08103e02b9bfaf5a1c8268d49897068dbf5`.
- Symbols (name:line): `escapeHtml:62`, `escapeAttr:74`, `safeNum:82`, `safeBool:90`, `sanitizeHtml:105`, `setText:180`, `replaceChildren:186`, `makeOption:195`, `makeEl:203`.
- Static incoming references: `tests/unit/uiHealth.test.js`.
