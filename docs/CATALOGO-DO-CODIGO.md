# Catálogo arquivo por arquivo

As funções descritas editorialmente são distinguidas das inferências e dos cabeçalhos declarados. Nomes de símbolos e imports são aproximações estáticas.

## `.github/workflows/release.yml`

Workflow de empacotamento/release: monta e verifica o portable e publica artefatos conforme o gatilho configurado.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2104 bytes; linhas: 64.
- Leitura: texto completo decodificado.
- SHA-256: `46c52b773e23900264ae81227b1e4211d9588e8b8b98f51041255090b7211227`.

## `.github/workflows/verify.yml`

Workflow de validação no Windows/Node 24: checkout, npm ci e npm run verify em pushes main, pull requests e execução manual.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 392 bytes; linhas: 24.
- Leitura: texto completo decodificado.
- SHA-256: `782adca02ae7d8bcdab6a91c45b3f5c6c7dcf5fe2654e11e0e526bea136956a9`.

## `.gitignore`

Lista padrões de arquivos que o Git normalmente não deve versionar; não é um inventário de dependências de execução.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2503 bytes; linhas: 113.
- Leitura: texto completo decodificado.
- SHA-256: `2d01355fc9bd2de3e0d17b54249946f6c5ecc37c5c8feeb73a03ef1c9ade0496`.

## `config/engineCompatibility.json`

Catálogo de 22 perfis com escopo, versões/variantes, cheats, problemas, pendências e fontes.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 14062 bytes; linhas: 358.
- Leitura: texto completo decodificado.
- SHA-256: `1f7288d803250329e1cebda4dd634a63cca402e775aaf28ca727c39a9f13c456`.
- Referenciado estaticamente por: `src/core/engineCapabilityMatrix.js`, `src/services/rpcHandlers.js`.

## `config/restore_config.json`

Configuração distribuída com o produto. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 29781 bytes; linhas: 785.
- Leitura: texto completo decodificado.
- SHA-256: `5b265b9ea7624fbaa7eaab06c72586089d895527c28e4378fa683119a55d2d98`.

## `config/syntax_rules.json`

Configuração distribuída com o produto. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 992 bytes; linhas: 55.
- Leitura: texto completo decodificado.
- SHA-256: `7e9b00dc878de87b224cac4e1f84d9a88fcefbccfda213ca3626a4e1008c3561`.

## `launcher/OpenTranslatorLauncher.cs`

Fonte C# do launcher: instância única, diagnóstico, abertura do navegador, bandeja, modo sem GPU e encerramento do backend.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 67434 bytes; linhas: 1560.
- Leitura: texto completo decodificado.
- SHA-256: `416161cc9113a392a869f45d53adff1af16c6a78c8db060d6ef43d39cfa442e5`.
- Assinaturas localizadas (nome:linha): `foreach:28`, `using:61`, `using:90`, `using:249`, `foreach:305`, `lock:316`, `foreach:376`, `using:608`, `using:615`, `using:658`, `using:665`, `using:718`, `using:746`, `using:763`, `using:784`, `using:860`, `lock:883`, `foreach:913`, `foreach:1081`, `foreach:1379`, `foreach:1535`.
- Imports literais: `ws`, `better-sqlite3`.

## `LICENSE`

Arquivo de raiz ou auxiliar; consultar metadados e referências estáticas. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1121 bytes; linhas: 26.
- Leitura: texto completo decodificado.
- SHA-256: `26c174355f757b5b65ce0ffd3b427e874b652dce3e2d698d70950c2ffedd862a`.

## `OpenTranslator.exe`

Launcher Windows compilado; inicia e verifica o backend e abre a interface. A fonte correspondente fica em launcher/OpenTranslatorLauncher.cs.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 53248 bytes; linhas: não interpretadas.
- Leitura: bytes lidos; conteúdo não interpretado.
- SHA-256: `40ec28aef2248dc6348bbb6c200eed06bd23d6a6498e38ffcf13e7e950f35f2a`.

## `package-lock.json`

Fixa versões e integridade da árvore de dependências usada por npm ci.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 56925 bytes; linhas: 1273.
- Leitura: texto completo decodificado.
- SHA-256: `bcc1312d55a30a1def029ac978a698c99af9006a9f2d8702730ad1a35329f72a`.
- Imports literais: `node:util`.

## `package.json`

Identifica o pacote e define comandos de execução, teste e empacotamento e dependências diretas.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 973 bytes; linhas: 30.
- Leitura: texto completo decodificado.
- SHA-256: `a5439f41bd55d91b648bc701f11c468251f32a802c6dc5ea560f63a9279cba1f`.

## `README.md`

Documento: OpenTranslator. Registro textual; verificar data e evidência antes de tratar afirmações históricas como atuais.

- Categoria: Produto / ferramenta.
- Base da descrição: Título do documento.
- Tamanho: 9629 bytes; linhas: 173.
- Leitura: texto completo decodificado.
- SHA-256: `f7422516b3bc8b4cfa29fa35dafc519d6df56caa511b839505522651a1cc7e2e`.

## `server.js`

Ponto de entrada Node: define diretórios e estado global, inicializa cache, servidor HTTP, hooks e encerramento coordenado.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 3557 bytes; linhas: 90.
- Leitura: texto completo decodificado.
- SHA-256: `67bcfb7baa9c64d988d367e4e0b3a86dddf266690b0c77cae932c8fcb9b9644d`.
- Imports literais: `fs`, `path`, `https`, `./src/utils/loggerManager`, `./src/utils/logger`, `./src/core/shutdownCoordinator`, `./src/services/cache`, `./src/services/httpServer`, `./src/services/cheatServer`.

## `src/core/adaptiveConcurrency.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — AdaptiveConcurrencyController Controlador inteligente de concorrência com algoritmo AIMD (Additive Increase, Multiplicative Decrease). - Aumenta gradualmente a concorrência (+1 worker) em períodos de estabilidade sustentada.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4786 bytes; linhas: 129.
- Leitura: texto completo decodificado.
- SHA-256: `f6457d9139c6e62aca8a3153e688411232024c337ff7418c94ea1766609d6ae3`.
- Assinaturas localizadas (nome:linha): `AdaptiveConcurrencyController:9`, `getConcurrency:30`, `recordSuccess:44`, `recordError:75`, `getAvgLatency:93`, `getP95Latency:98`, `getP50Latency:105`, `getMetrics:112`.
- Referenciado estaticamente por: `src/core/selfTest.js`, `src/core/translationQueue.js`, `tests/regression/adaptive_concurrency.test.js`.

## `src/core/applyContract.js`

Registra o plano de arquivos e hashes declarados por uma aplicação de tradução.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 14424 bytes; linhas: 320.
- Leitura: texto completo decodificado.
- SHA-256: `fdaa54798bfe89a5f07269c5029edee965225f237918c95daadefe54e8a40614`.
- Assinaturas localizadas (nome:linha): `planFilesFromTexts:81`, `startApplyContract:135`, `wrote:170`, `stats:209`, `finish:226`, `resolveInsideRoot:276`.
- Imports literais: `fs`, `path`, `./applyTransaction`.
- Referenciado estaticamente por: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `tests/unit/applyContract.test.js`.

## `src/core/applyGate.js`

Verifica condições de integridade antes de permitir gravação de traduções.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 1993 bytes; linhas: 62.
- Leitura: texto completo decodificado.
- SHA-256: `2f31e37a5c125ca4ecd9666e6a22006edbb58ae62479f33202f5ad06ee94f222`.
- Assinaturas localizadas (nome:linha): `ApplyGate:3`, `verifyPreApply:8`, `verifyPostApply:43`.
- Imports literais: `fs`, `./placeholderIntegrityValidator`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/core/applyTransaction.js`

Coordena preparação, backup, escrita, verificação, commit e recuperação da aplicação.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 15788 bytes; linhas: 449.
- Leitura: texto completo decodificado.
- SHA-256: `c0da1474da9c1c2629e038f3255acb8720706df953b5ab976c9e8bf4208849bf`.
- Assinaturas localizadas (nome:linha): `hashFile:55`, `hashText:66`, `verifyBackup:82`, `verifyApplied:110`, `applyTransaction:138`, `rollback:386`.
- Imports literais: `fs`, `path`, `crypto`, `./transactionJournal`.
- Referenciado estaticamente por: `src/core/applyContract.js`, `src/core/translationPipeline.js`, `tests/unit/applyContract.test.js`.

## `src/core/applyVerifier.js`

Relê o resultado no disco para verificar o que foi efetivamente aplicado.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 8029 bytes; linhas: 231.
- Leitura: texto completo decodificado.
- SHA-256: `c7211e307b95448e81cfd3ce4b59cef306dd8d9105d9e9b10437ac379dd153e8`.
- Assinaturas localizadas (nome:linha): `normalizeForCompare:44`, `normKey:52`, `visibleText:57`, `extractTextList:75`, `evidenceHash:84`, `verifyApplied:103`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`.

## `src/core/backupManager.js`

Cria e restaura backups com sessões, manifesto e hashes dos arquivos envolvidos.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 14500 bytes; linhas: 422.
- Leitura: texto completo decodificado.
- SHA-256: `69822c34bc37eb6868767be7728d458c43b07ee27698c32e87691b56d24714a2`.
- Assinaturas localizadas (nome:linha): `BackupManager:16`, `getFileHash:25`, `createDirectoryManifest:53`, `compareManifests:129`, `createSessionBackup:204`, `restoreSessionBackup:284`, `createBackup:408`, `restore:411`, `restoreOldestBackup:415`.
- Imports literais: `fs`, `path`, `crypto`, `../core/partialApply`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `src/core/gameService.js`, `src/core/jobSystem.js`, `src/core/patchInstaller.js`, `src/core/pluginSafePatcher.js`, `src/core/realGameWorkflow.js`, `src/core/realTranslationWorkflow.js`, `src/core/translationPipeline.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/real_ui_certification_runner.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/baseEngineAdapter.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — BaseEngineAdapter / EngineAdapter Contrato universal e interface base para todos os adaptadores de motores de jogo. Suporta o ciclo completo:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 10215 bytes; linhas: 298.
- Leitura: texto completo decodificado.
- SHA-256: `c9647b5409647707c8f79606d56e01cde5deedba12d0a37ae2c30c0fa6b90e8e`.
- Assinaturas localizadas (nome:linha): `BaseEngineAdapter:8`, `detect:23`, `inspect:69`, `getCapabilities:85`, `getDetailedDeclaration:102`, `extractTexts:125`, `extract:132`, `extractResources:142`, `prepareTranslation:158`, `translate:179`, `restorePlaceholders:189`, `validate:203`, `applyTranslations:210`, `apply:217`, `package:224`, `launch:231`, `rollback:238`, `diagnose:245`, `getDiagnostics:248`.
- Imports literais: `./engineDetector`.
- Referenciado estaticamente por: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/batchOptimizer.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — BatchOptimizer Agrupador multidimensional de lotes de tradução. Otimiza simultaneamente:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2053 bytes; linhas: 61.
- Leitura: texto completo decodificado.
- SHA-256: `b5d71c1db53f12a5f965d9c803c89adab96596907364be0b2eab6d896b71170e`.
- Assinaturas localizadas (nome:linha): `BatchOptimizer:10`, `buildBatches:18`.
- Referenciado estaticamente por: `src/core/translationQueue.js`.

## `src/core/cachePolicy.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 4851 bytes; linhas: 165.
- Leitura: texto completo decodificado.
- SHA-256: `fd734a367fb37b4955752d0de21c605e0aaa6dcf21b72434220efb6f53c14122`.
- Assinaturas localizadas (nome:linha): `BoundedLRUCache:2`, `buildKey:22`, `_estimateSize:29`, `get:34`, `set:60`, `_evictLRU:95`, `_deleteEntry:105`, `pruneExpired:113`, `invalidateVersion:126`, `clear:138`, `getStats:143`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/core/capabilityEvidenceAggregator.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - CapabilityEvidenceAggregator Compilador automático de matriz de capacidades baseada em evidências factuais. Varre a pasta de evidências e deriva o capability-matrix.json estritamente

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2702 bytes; linhas: 68.
- Leitura: texto completo decodificado.
- SHA-256: `4bc219ca599e10233e0146e77bc72c0a6223a7a20b10954c67fef0d36ed6589f`.
- Assinaturas localizadas (nome:linha): `CapabilityEvidenceAggregator:11`, `aggregate:21`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`.

## `src/core/claimAudit.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - ClaimAudit 2.0 (False Claim Detector) Auditor implacável de alegações de status. Rejeita com CLAIM_BLOCKED qualquer tentativa de reivindicar

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2797 bytes; linhas: 82.
- Leitura: texto completo decodificado.
- SHA-256: `403a65c5f25beb8da4ba0c25200e0822e6ab64e014538d0501fc582094ae8bc8`.
- Assinaturas localizadas (nome:linha): `ClaimAudit:10`, `auditClaim:15`.
- Imports literais: `fs`.
- Referenciado estaticamente por: `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/codeProtector.js`

Protege e restaura marcadores, códigos e placeholders antes/depois de traduzir.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 6145 bytes; linhas: 165.
- Leitura: texto completo decodificado.
- SHA-256: `6eabf1830350e73af78236e7ddc11485e1a2cda6d67a31e1c369698cd0200ddd`.
- Assinaturas localizadas (nome:linha): `CodeProtector:5`, `getPatterns:18`, `protect:64`, `restore:89`, `validateTokens:153`.
- Imports literais: `./qaEngine`.
- Referenciado estaticamente por: `src/core/coverageGuarantor.js`, `src/core/runtimeTextManager.js`, `src/core/translationPipeline.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/renpy/extractor/renpyExtractor.js`, `src/engines/renpy/translator/renpyTranslator.js`, `src/engines/renpy/validator/renpyValidator.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/regression/unity_code_protector.test.js`.

## `src/core/contentLayerManager.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — ContentLayerManager Gerenciador e classificador de camadas de conteúdo: - GAME: Dados base do jogo original

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3998 bytes; linhas: 133.
- Leitura: texto completo decodificado.
- SHA-256: `d89d7f947d228385da930c594286e4f6b1f8d12de12275968697e0a8b4409d01`.
- Assinaturas localizadas (nome:linha): `ContentLayerManager:21`, `classifyPath:29`, `isSafeForTranslation:97`, `separateTextsByLayer:108`.
- Imports literais: `path`.
- Referenciado estaticamente por: `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/coverageGuarantor.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: coverageGuarantor.js — Camada Universal de Garantia de Cobertura e Segunda Passagem Automática Responsabilidades: - Auditar a cobertura de tradução contra todos os textos extraídos de qualquer motor.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 19989 bytes; linhas: 463.
- Leitura: texto completo decodificado.
- SHA-256: `9278809558927e19961af595ae3533c5dcad47385e5c9463abd7f3066fce8011`.
- Assinaturas localizadas (nome:linha): `CoverageGuarantor:45`, `isDisplayableContent:68`, `auditAndRecover:140`.
- Imports literais: `./qaEngine`, `./translationMemory`, `../services/cache`, `./codeProtector`, `./scriptDetector`, `../translation/translator`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/test_renpy_coverage_generalization.test.js`.

## `src/core/diagnosticBundle.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — DiagnosticBundle Generator Gera resumo diagnóstico completo do sistema para suporte e depuração. Mascara estritamente senhas, tokens e chaves de API.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2091 bytes; linhas: 64.
- Leitura: texto completo decodificado.
- SHA-256: `5c1323cda2fa9ed819f3a9f9189d415d2c2c61941b4cbff4ee97dfdc653a598e`.
- Assinaturas localizadas (nome:linha): `DiagnosticBundle:11`, `redact:13`, `generateReport:21`, `formatActionableFailure:39`, `formatApplicationFailure:51`.
- Imports literais: `fs`, `path`, `os`, `./selfTest`.
- Referenciado estaticamente por: `src/core/gameService.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/run-phase2-tests.js`.

## `src/core/displayTextClassifier.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: src/core/displayTextClassifier.js CONTEXTO REAL (medido, não suposto): Um jogo Ren'Py distribui scripts `.py` DESCOMPILADOS de módulos Python. Nesse

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8676 bytes; linhas: 204.
- Leitura: texto completo decodificado.
- SHA-256: `c91c57f7bf74a408feffcaa821000d2256927b53e877b53dfeb465b17824f8cb`.
- Assinaturas localizadas (nome:linha): `classifyDisplayText:117`.
- Referenciado estaticamente por: `src/engines/renpy/extractor/renpyExtractor.js`.

## `src/core/engineCapabilityMatrix.js`

Deriva os perfis de compatibilidade do catálogo; separa implementação parcial de certificação por jogo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2580 bytes; linhas: 43.
- Leitura: texto completo decodificado.
- SHA-256: `65e838047990ecf7aadc688f0c71a04fe749a41f24b89a8ecf756323315857ac`.
- Assinaturas localizadas (nome:linha): `declarations:7`, `EngineCapabilityMatrix:22`, `getAll:23`, `getDeclarations:24`, `getEngine:25`, `getMatrixSummary:26`, `getFormattedTable:31`, `saveMatrixFile:35`.
- Imports literais: `fs`, `path`, `../../config/engineCompatibility.json`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/bugs_regression.test.js`, `tests/regression/engine_adapter_contract.test.js`.

## `src/core/engineDetector.js`

Detecta família, versão e arquitetura por evidências no executável e na estrutura do jogo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 28651 bytes; linhas: 688.
- Leitura: texto completo decodificado.
- SHA-256: `be628fde278bdc434f8cf8e1f22e2c7e4bf804674eb8705ec62fa99298860994`.
- Assinaturas localizadas (nome:linha): `EngineDetector:9`, `getExeArch:14`, `checkBinarySignatures:21`, `detect:49`.
- Imports literais: `fs`, `path`, `./executableInfo`.
- Referenciado estaticamente por: `src/core/baseEngineAdapter.js`, `src/core/gameEngine.js`, `src/core/gameService.js`, `src/core/libraryDiscovery.js`, `src/core/realGameWorkflow.js`, `src/core/translationPipeline.js`, `src/diagnostics/universalGameIntelligence.js`, `src/discovery/unknownGameTriage.js`, `src/mediaExtractor/index.js`, `src/services/rpcHandlers.js`, `tests/real_ui_certification_runner.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/engine_detection.test.js`, `tests/regression/rgss_real_pipeline.test.js`, `tests/regression/run-all-tests.js`, `tests/regression/unity_comprehensive_suite.js`, `tests/regression/wolf_real_pipeline.test.js`, `tests/run-lab-tests.js`, `tests/test_core_detector.js`, `tests/test_multi_game_pipeline.js`, `tests/unit/executableCompatibility.test.js`.

## `src/core/engineRegistry.js`

Instancia e registra adapters; resolve qual implementação atende o resultado de detecção.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 3634 bytes; linhas: 94.
- Leitura: texto completo decodificado.
- SHA-256: `f36204cc120210b59b1e8ea69f235ecfb19579fa311ddad5c9781a1c97427b6a`.
- Assinaturas localizadas (nome:linha): `EngineRegistry:8`, `register:13`, `get:20`, `getAll:24`, `resolveAdapter:28`.
- Imports literais: `../engines/renpy/renpyAdapter`, `../engines/rpgmaker/rpgMakerAdapter`, `../engines/unity/unityAdapter`, `../engines/unreal/unrealAdapter`, `../engines/godot/godotAdapter`, `../engines/gamemaker/gameMakerAdapter`, `../engines/construct/constructAdapter`, `../engines/defold/defoldAdapter`, `../engines/cocos/cocosCreatorAdapter`, `../engines/cocos/cocos2dxAdapter`, `../engines/wolf/wolfAdapter`, `../engines/rpgmaker/rgssAdapter`, `../engines/gdevelop/gdevelopAdapter`, `../engines/electron/electronAdapter`, `../engines/generic/genericAdapter`.
- Referenciado estaticamente por: `src/core/gameService.js`, `src/core/selfTest.js`, `src/core/translationPipeline.js`, `tests/real_ui_certification_runner.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/regression/engine_adapter_contract.test.js`, `tests/regression/run-all-tests.js`, `tests/run-lab-tests.js`.

## `src/core/engineRoutingGuard.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — EngineRoutingGuard Proteção arquitetural estrita contra resolvers e diagnósticos cross-engine. Impede que diagnósticos específicos de Ren'Py rodem em RPG Maker MZ, Unity, etc.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1454 bytes; linhas: 42.
- Leitura: texto completo decodificado.
- SHA-256: `696544f72f3e4829bf461f52d17aac17c4b19d165d520e5b10fc1ba4ccfbe5c5`.
- Assinaturas localizadas (nome:linha): `EngineRoutingGuard:6`, `check:8`.
- Referenciado estaticamente por: `src/discovery/renpyAppDataResolver.js`, `src/services/rpcHandlers.js`, `tests/regression/engine_diagnostic_routing.test.js`, `tests/regression/engine_launch_routing.test.js`, `tests/regression/engine_routing_all_engines.test.js`.

## `src/core/engineRuntimeTriad.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — EngineRuntimeTriad Implementa o desacoplamento fundamental em três camadas independentes: 1. Engine: Motor de jogo (Unity, Unreal, Godot, Electron, Ren'Py, RPG Maker, Wolf, etc.)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 10308 bytes; linhas: 248.
- Leitura: texto completo decodificado.
- SHA-256: `d7b0ec1afb64981bb96fb3c30e5859e446d8c773ae656bfca7a71f505020bf50`.
- Assinaturas localizadas (nome:linha): `EngineRuntimeTriad:15`, `resolve:26`, `_evaluateCapabilities:178`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/run-phase6-tests.js`.

## `src/core/evidenceModel.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - EvidenceModel 3.0 (Anti-Forgery Hardened) Modelo rigoroso e infalsificável de classificação de evidência empírica: - Toda categoria é ESTRITAMENTE derivada de evidenceRecords válidos.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8981 bytes; linhas: 232.
- Leitura: texto completo decodificado.
- SHA-256: `f52ddbcd6017123b6f8ae0e470d96f07d8ec77719aef1b136329af9d51ccbb1f`.
- Assinaturas localizadas (nome:linha): `EvidenceModel:12`, `recordEvidence:88`, `getGrade:180`, `validateClaim:192`, `toJSON:209`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/executableInfo.js`

Lê cabeçalhos DOS/PE e distingue x86, x64, ARM64 e executáveis desconhecidos.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 1073 bytes; linhas: 25.
- Leitura: texto completo decodificado.
- SHA-256: `c11569f3bd6edb821dd6cb73f197201284298c9faf13e91fc1d2bd1046c151b5`.
- Assinaturas localizadas (nome:linha): `readExecutableInfo:4`, `executableBits:20`.
- Imports literais: `fs`.
- Referenciado estaticamente por: `src/core/engineDetector.js`, `src/core/gameEngine.js`, `tests/unit/executableCompatibility.test.js`.

## `src/core/fastTextPipeline.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — FastTextPipeline Pipeline de tradução rápida com granularidade de prioridades P0 a P5, controle de carga, deduplicação em trânsito e medição detalhada de latência:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 12317 bytes; linhas: 313.
- Leitura: texto completo decodificado.
- SHA-256: `6cef1f9a2f693a68936e383c5642bc8513617a048e0551b5c7a289b2b8c0faac`.
- Assinaturas localizadas (nome:linha): `normalizeProviderResult:55`, `FastTextPipeline:79`, `enqueue:108`, `processItem:136`.
- Imports literais: `perf_hooks`, `./translationResult`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/fontCompatibilityEngine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — FontCompatibilityEngine Analisa a cobertura de glifos e caracteres necessários para o idioma de destino: - CJK (Kanji, Hiragana, Katakana, Hanzi, Hangul)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3852 bytes; linhas: 108.
- Leitura: texto completo decodificado.
- SHA-256: `71f4424ab865c26d90806ba8683b7f522daa51c7d9e8863358accad8c8c2ba38`.
- Assinaturas localizadas (nome:linha): `FontCompatibilityEngine:14`, `analyzeGlyphRequirements:21`, `recommendFont:77`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/formatAdapterRegistry.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - FormatAdapterRegistry Registro e orquestrador de adaptadores de formato de produção: - JsonAdapter

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 10640 bytes; linhas: 322.
- Leitura: texto completo decodificado.
- SHA-256: `9954aaf232b15a44ee30bd5441e98d4f5b643dbe1b1ceec82bd564e860b40237`.
- Assinaturas localizadas (nome:linha): `BaseFormatAdapter:13`, `detect:18`, `extract:19`, `preview:20`, `apply:21`, `verify:22`, `rollbackSupport:23`, `capabilities:24`, `JsonAdapter:26`, `detect:29`, `extract:33`, `apply:57`, `PoAdapter:94`, `detect:97`, `apply:101`, `RenpyAdapter:138`, `detect:141`, `apply:145`, `_escape:174`, `CsvAdapter:179`, `detect:182`, `apply:186`, `TextAdapter:235`, `detect:237`, `capabilities:262`, `apply:276`, `FormatAdapterRegistry:289`, `getAdapter:300`.
- Imports literais: `path`.
- Referenciado estaticamente por: `src/core/patchInstaller.js`, `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase9-tests.js`.

## `src/core/formatAwareOutput.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - FormatAwareOutput Adaptadores de gravação estática conscientes de formato: Evita substituições cegas via split/join que possam corromper chaves, sintaxe ou outros textos.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5790 bytes; linhas: 186.
- Leitura: texto completo decodificado.
- SHA-256: `b69671f5681299f438d59397869677edda1702f0cf01c2db420ae94be24452ea`.
- Assinaturas localizadas (nome:linha): `FormatAwareOutput:14`, `apply:23`, `applyJson:44`, `applyPo:78`, `applyRpy:103`, `applyCsv:136`, `applyText:162`, `_escapeRegExp:179`.
- Referenciado estaticamente por: `tests/regression/run-phase8b-tests.js`.

## `src/core/gameEngine.js`

Rotinas de integração legadas e compartilhadas: descoberta, preparação, instalação de hooks e tratamento de jogos e recursos.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 61265 bytes; linhas: 1754.
- Leitura: texto completo decodificado.
- SHA-256: `747ebb2096b4cd994f2fe780bc61c25071d88041c8e823e561719bddd9cdec58`.
- Assinaturas localizadas (nome:linha): `getUnrealEngineHandler:28`, `getRenpyCommon:53`, `findGameRoot:81`, `detectEngine:87`, `getExeArch:244`, `getHookDll:248`, `autoWrapText:280`, `patchGameData:326`, `patchParam:371`, `patchParamObject:438`, `backupGameData:894`, `restoreGameData:904`, `restoreOldestBackup:908`, `checkProcessRunning:961`, `findGameOnDisk:973`, `scan:986`, `runPythonScript:1090`, `healGameData:1131`, `restoreEngineData:1213`, `injectLatinNameInput:1317`, `healFonts:1383`, `extractAllRenpyRpyTexts:1445`, `scan:1455`, `executeTranslationPipeline:1494`, `getValueAtPath:1722`.
- Imports literais: `fs`, `path`, `os`, `child_process`, `../extractors/extractor`, `../engines/unreal/unrealHandler`, `../services/cache`, `../translation/translator`, `../utils/utils`, `../engines/renpy/renpyCommon`, `./executableInfo`, `./pluginSafePatcher`, `./legacyGameRestore`, `./backupManager`, `./engineDetector`.
- Referenciado estaticamente por: `src/core/shutdownCoordinator.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/test_engine_detection.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`.

## `src/core/gameRules.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 870 bytes; linhas: 27.
- Leitura: texto completo decodificado.
- SHA-256: `154a9d359d09cf270126b36d555a4a995516d3d13273996703b27f4f02fd3e9b`.
- Assinaturas localizadas (nome:linha): `GameRules:1`, `shouldIgnore:9`, `shouldForce:17`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/gameService.js`

Serviço de alto nível que combina análise do jogo, planejamento, pipeline, jobs, execução e diagnóstico.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 10650 bytes; linhas: 289.
- Leitura: texto completo decodificado.
- SHA-256: `2000784ffb009bc6aa0cf4563b0057358b8e89d0c2757e928cd94c366a9a2471`.
- Assinaturas localizadas (nome:linha): `GameService:22`, `analyzeGame:32`, `dryRun:65`, `applyTranslation:72`, `startTranslationJob:85`, `getJob:117`, `listJobs:123`, `rollback:152`, `launchGame:253`, `selfTest:277`, `exportDiagnosticBundle:281`.
- Imports literais: `./strategyPlanner`, `./transactionJournal`, `fs`, `path`, `child_process`, `./engineDetector`, `./engineRegistry`, `./translationPipeline`, `./jobSystem`, `./ownedProcess`, `./backupManager`, `./selfTest`, `./diagnosticBundle`, `./translationMemory`, `./shutdownCoordinator`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/real_ui_certification_runner.js`, `tests/regression/lab_phase3_real_apply.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/globalCircuitBreaker.js`

Interrompe ou retarda solicitações após falhas e limites recorrentes.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 11949 bytes; linhas: 317.
- Leitura: texto completo decodificado.
- SHA-256: `4af457d95f08bb3921fa619bc5498650698ffb4b1ef64c85c33a3c04c0cbc55d`.
- Assinaturas localizadas (nome:linha): `ProviderCircuitState:24`, `GlobalCircuitBreaker:48`, `getInstance:58`, `_getProviderState:65`, `canExecute:73`, `recordRequestStart:147`, `recordRequestEnd:152`, `recordSuccess:157`, `recordError:181`, `_applyFailureCooldown:268`, `getProviderHealth:283`, `reset:305`.
- Referenciado estaticamente por: `src/core/providerGateway.js`, `src/core/translationPipeline.js`, `src/services/rpcHandlers.js`, `src/translation/translator.js`, `tests/regression/circuit_breaker_100_workers.test.js`, `tests/regression/provider_bypass_prevention.test.js`, `tests/regression/provider_circuit_half_open.test.js`, `tests/regression/provider_failover_strict.test.js`, `tests/regression/provider_health.test.js`, `tests/regression/provider_rate_limit_storm.test.js`, `tests/test_text_chunking_and_provider_resilience.test.js`, `tests/unit/explicitProviderChoice.test.js`.

## `src/core/glossaryEngine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — GlossaryEngine Gerenciador hierárquico de glossários e terminologias de tradução: - Escopos: global -> game -> character -> scene

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4702 bytes; linhas: 147.
- Leitura: texto completo decodificado.
- SHA-256: `7d15c6748f446a70500d416c9247cd93ba5f54ae47ba02eb2f21228144b34a1e`.
- Assinaturas localizadas (nome:linha): `GlossaryEngine:14`, `addRule:35`, `_getActiveRules:66`, `apply:95`, `validate:117`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/healthMonitor.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — HealthMonitor Monitor central de integridade para todos os provedores e subsistemas: - Estados: HEALTHY -> DEGRADED -> FAILED

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2861 bytes; linhas: 110.
- Leitura: texto completo decodificado.
- SHA-256: `3ad3e0aee58297e1027130d19f459785e5cb832c6b5a8703245ac13291a3385a`.
- Assinaturas localizadas (nome:linha): `HealthMonitor:10`, `registerProvider:21`, `recordSuccess:40`, `recordFailure:56`, `isUsable:77`, `getStatusSummary:95`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/hierarchicalGlossary.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — HierarchicalGlossary Arquitetura de glossários hierárquicos com prioridade estrita e previsível: GLOBAL (Camada universal mais genérica)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8990 bytes; linhas: 253.
- Leitura: texto completo decodificado.
- SHA-256: `23c8d85acbb10836fc5b8d5b25477cd90e2d59aacc49b5e86c0712048d88ba85`.
- Assinaturas localizadas (nome:linha): `HierarchicalGlossary:29`, `getInstance:49`, `_loadStandardGlossaries:56`, `addTerm:106`, `loadProjectGlossary:135`, `resolveTerm:160`, `getActiveTerms:205`, `apply:235`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/imageTextLayer.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — ImageTextLayer Camada de detecção e localização de imagens com texto: - Filtra nomes de imagens com alta probabilidade de conter texto (title, gameover, ui_, logo, sign, tutorial)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1453 bytes; linhas: 42.
- Leitura: texto completo decodificado.
- SHA-256: `ae47fd9937f79d58519e1684ebdbbde6005bab371e430ffbd128b7b4be609169`.
- Assinaturas localizadas (nome:linha): `ImageTextLayer:12`, `isLikelyTextImage:17`, `getLocalizedAssetPath:35`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/jobPersistence.js`

Persiste checkpoints e estados de trabalhos para retomada e diagnóstico.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 1731 bytes; linhas: 53.
- Leitura: texto completo decodificado.
- SHA-256: `b690273ecf22908a025ea65e78cc9fd862ee72470438c8886cdbbc9eadea1f7a`.
- Assinaturas localizadas (nome:linha): `JobPersistence:10`, `getJobFilePath:17`, `saveJob:21`, `loadJob:30`, `deleteJob:40`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`, `src/core/translationQueue.js`, `src/services/rpcHandlers.js`, `tests/regression/job_persistence_117k_realistic.test.js`, `tests/regression/provider_resume.test.js`, `tests/regression/translation_resume.test.js`.

## `src/core/jobSystem.js`

Cria e executa trabalhos em segundo plano e expõe seus estados/progresso.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 10777 bytes; linhas: 331.
- Leitura: texto completo decodificado.
- SHA-256: `032d5025a9d227a53d91a84d84eb684b5c62fc0265f001b0268d55fc0069d7bc`.
- Assinaturas localizadas (nome:linha): `JobSystem:36`, `createJob:51`, `getJob:84`, `updateJobState:101`, `updateProgress:129`, `createSnapshot:143`, `saveCheckpoint:169`, `loadCheckpoint:183`, `resumeJob:199`, `rollbackJob:224`, `commitJob:242`, `calculateTranslationDiff:256`, `cancelJob:299`, `persist:303`, `listRecentJobs:309`.
- Imports literais: `fs`, `path`, `crypto`, `./backupManager`.
- Referenciado estaticamente por: `src/core/gameService.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/unit/backgroundJobLifecycle.test.js`.

## `src/core/layoutAnalyzer.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: Avalia se a tradução expandiu excessivamente o texto e pode causar overflow.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1481 bytes; linhas: 46.
- Leitura: texto completo decodificado.
- SHA-256: `a9935b846f4a924756709712fc8ca54145fe3e8536498046890ac30739c25fa6`.
- Assinaturas localizadas (nome:linha): `LayoutAnalyzer:1`, `analyzeExpansion:5`, `FontCompatibilityAnalyzer:27`, `checkCoverage:29`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/legacyGameRestore.js`

Restaura backups do fluxo legado com staging e verificação, preservando material de recuperação.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7979 bytes; linhas: 133.
- Leitura: texto completo decodificado.
- SHA-256: `80e94c42121c137d042ddbcc8b5da19b7579a8c4dbf3805a389e97eb8f445505`.
- Assinaturas localizadas (nome:linha): `hash:6`, `walk:7`, `restoreGameData:17`, `backupGameData:103`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `tests/unit/legacyGameRestore.test.js`.

## `src/core/libraryDiscovery.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — LibraryDiscovery Descoberta e classificação automática da biblioteca de jogos com base puramente em evidências estruturais em disco (sem nomes de jogos ou listas manuais).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 15555 bytes; linhas: 411.
- Leitura: texto completo decodificado.
- SHA-256: `e809d243c3739dfa7a6cd787623de00054b8fc198eb6f0122f746fef255eb2a2`.
- Assinaturas localizadas (nome:linha): `LibraryDiscovery:19`, `classifyItem:30`, `scanLibrary:325`.
- Imports literais: `fs`, `path`, `./engineDetector`.
- Referenciado estaticamente por: `tests/real_ui_certification_runner.js`.

## `src/core/localDictionaryProvider.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - LocalDictionaryProvider Provedor de tradução determinístico, 100% offline e local para laboratório e testes E2E. Classificação oficial: LAB_TRANSLATION_PROVIDER

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6546 bytes; linhas: 200.
- Leitura: texto completo decodificado.
- SHA-256: `2704efc8e70fe58d84f2c882b298784cbad7402d7733b74770aeb867f0f3e227`.
- Assinaturas localizadas (nome:linha): `LocalDictionaryProvider:12`, `translate:79`, `translateBatch:154`, `_matchCase:163`, `_escapeRegExp:172`, `_levenshtein:176`.
- Referenciado estaticamente por: `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/logDeduplicator.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — LogDeduplicator Evita tempestades de logs (storms) suprimindo mensagens de erro repetitivas e consolidando sumários periódicos.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2608 bytes; linhas: 87.
- Leitura: texto completo decodificado.
- SHA-256: `b064359880a2aaf84569a2d16f78e3b4441731b4b6ed9472eab6d2d0d2306ee4`.
- Assinaturas localizadas (nome:linha): `LogDeduplicator:6`, `getInstance:13`, `logRateLimit:20`, `getSummary:46`, `emitSummary:61`, `reset:71`.
- Referenciado estaticamente por: `src/translation/translator.js`, `tests/regression/log_deduplication.test.js`.

## `src/core/multiLevelCache.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 3269 bytes; linhas: 90.
- Leitura: texto completo decodificado.
- SHA-256: `d2c1aa1c157bd0e5563c840d8ccc89c6f4bb9216ad1d05f52cac14167ca9d601`.
- Assinaturas localizadas (nome:linha): `MultiLevelCache:4`, `_hashKey:16`, `setManualOverride:20`, `get:26`, `setL1:56`, `setL3:66`, `getStats:75`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/outputProvider.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 711 bytes; linhas: 21.
- Leitura: texto completo decodificado.
- SHA-256: `88b5bc691517de68c921bfab47454bee61871e513a38022abecb0f5c61cded51`.
- Assinaturas localizadas (nome:linha): `OutputProvider:1`, `deliver:2`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/ownedProcess.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - OwnedProcess (Compatibility Wrapper) Redireciona para o OwnedProcessRegistry canônico da Fase 9.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 785 bytes; linhas: 18.
- Leitura: texto completo decodificado.
- SHA-256: `c5a174e646bed903fbe589bd27d15666c3419d2d6ddceac206ee932770373efa`.
- Imports literais: `./ownedProcessRegistry`.
- Referenciado estaticamente por: `src/core/gameService.js`.

## `src/core/ownedProcessRegistry.js`

Registra propriedade de processos e valida evidências antes de controlar ou encerrar um processo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 16866 bytes; linhas: 481.
- Leitura: texto completo decodificado.
- SHA-256: `6c54af1122730a78d4d14b714769f0de32cb3220ca45fc7629eff0f9860260cf`.
- Assinaturas localizadas (nome:linha): `registryFile:43`, `normalizeExe:50`, `readProcessStartTime:65`, `readProcessExecutable:90`, `readProcessCommandLine:109`, `probeProcess:128`, `OwnedProcessRegistry:140`, `register:156`, `isOwned:210`, `get:214`, `unregister:220`, `verifyPidIntegrity:231`, `stop:285`, `stopSession:362`, `list:382`, `shutdownAll:395`, `_save:412`, `_load:434`, `_clearPersisted:465`.
- Imports literais: `child_process`, `path`, `fs`.
- Referenciado estaticamente por: `src/core/ownedProcess.js`, `src/core/runtimeSessionManager.js`, `src/core/shutdownCoordinator.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/partialApply.js`

Representa falhas parciais e impede reportar aplicação/extração completa quando parte falhou.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 5960 bytes; linhas: 159.
- Leitura: texto completo decodificado.
- SHA-256: `14ea374833485841387b4d95812409869902b0355cbce0ffdc76196233d40805`.
- Assinaturas localizadas (nome:linha): `PartialReport:61`, `ok:78`, `fail:84`, `skip:97`, `report:117`, `complete:154`.
- Referenciado estaticamente por: `src/core/backupManager.js`, `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/electron/electronAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/godot/godotAdapter.js`, `src/engines/renpy/injector/renpyInjector.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`.

## `src/core/patchInstaller.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - PatchInstaller Instalador industrial e seguro de patches de tradução (.otpatch v3.x): - Validação prévia via TranslationPatchSchema e extração canônica de metadata

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 12257 bytes; linhas: 346.
- Leitura: texto completo decodificado.
- SHA-256: `dc112cb9721e356c30b51299f05dcbf83d77a1b698d3628464fcfc6157d05337`.
- Assinaturas localizadas (nome:linha): `PatchInstaller:20`, `verifyCompatibility:30`, `preview:73`, `applyPatch:104`, `removePatch:244`, `updatePatch:256`, `_sanitizeAndResolvePath:263`, `_atomicWriteFileSync:309`.
- Imports literais: `fs`, `path`, `crypto`, `./backupManager`, `./translationPatchSchema`, `./transactionJournal`, `./formatAdapterRegistry`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`, `tests/regression/run-phase9-tests.js`.

## `src/core/performanceMonitor.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1114 bytes; linhas: 35.
- Leitura: texto completo decodificado.
- SHA-256: `bdcb9347dd33c17ef07db7a6058fba0d49784dabe9f3ffc8f8a47717cc6a9ff2`.
- Assinaturas localizadas (nome:linha): `PerformanceMonitor:1`, `recordTranslation:8`, `getSnapshot:16`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/performanceProfiler.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — PerformanceProfiler Diagnóstico de gargalos e medição detalhada de tempo por etapa do pipeline. Mapeia Extraction, Deduplication, Translation (Network vs Queue vs Provider), QA, Application, Launch.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1348 bytes; linhas: 49.
- Leitura: texto completo decodificado.
- SHA-256: `1c70081bc2a4b5474da026f23e3ee8bd5d3321108aebc21bfd7b3f4ad0c7b3e0`.
- Assinaturas localizadas (nome:linha): `PerformanceProfiler:6`, `startStage:14`, `endStage:21`, `getReport:27`.

## `src/core/placeholderIntegrityValidator.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1320 bytes; linhas: 49.
- Leitura: texto completo decodificado.
- SHA-256: `ff3f5cd6ab7eb1d8db4a36d34c2ec5989e981ecf58c1f511ccee1d5c2128e28e`.
- Assinaturas localizadas (nome:linha): `PlaceholderIntegrityValidator:1`, `extractPlaceholders:2`, `validate:27`.
- Referenciado estaticamente por: `src/core/applyGate.js`, `src/core/realTranslationWorkflow.js`, `src/core/translationEditorCore.js`, `tests/regression/run-phase5-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/pluginSafePatcher.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — PluginSafePatcher v3 Deterministic Lexer and Context-Aware JavaScript Patcher for RPG Maker MV/MZ plugins.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 14697 bytes; linhas: 481.
- Leitura: texto completo decodificado.
- SHA-256: `f5b6692dc57a81538043946aa7654fdca969ece0cb2662b17599f18e6243e1ad`.
- Assinaturas localizadas (nome:linha): `PluginSafePatcher:22`, `getHash:27`, `validateSyntax:34`, `tokenize:48`, `classifyTokenContext:250`, `extractCandidates:324`, `safePatchPlugin:361`, `rollbackPlugin:460`.
- Imports literais: `fs`, `path`, `vm`, `crypto`, `./backupManager`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `tests/regression/plugin_rollback.test.js`, `tests/regression/plugin_runtime_translation.test.js`, `tests/regression/plugin_safe_patch.test.js`, `tests/regression/plugin_safe_patcher_integration.test.js`, `tests/regression/plugin_string_extraction.test.js`, `tests/regression/plugin_syntax_validation.test.js`, `tests/regression/real_game_launch_smoke.test.js`.

## `src/core/pluginSdk.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — PluginSDK Especificações oficiais de interface e testes de conformidade para plugins: 1. EngineAdapter: detect, extract, apply, rollback, getCapabilities

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3158 bytes; linhas: 94.
- Leitura: texto completo decodificado.
- SHA-256: `14cc0365b292739aed6ad6d6706e91bac6cd47320a4764ba6483e8554fbff41d`.
- Assinaturas localizadas (nome:linha): `PluginSDK:17`, `safeExecute:22`, `testEngineAdapterConformance:43`, `testHookProviderConformance:56`, `testArchiveProviderConformance:69`, `testTranslationProviderConformance:82`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/priorityQueue.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: PriorityQueue — Fila de tradução ordenada por prioridade visual. P0 = Visível na tela agora (Overlay/HUD) P1 = Diálogo principal ativo

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2073 bytes; linhas: 79.
- Leitura: texto completo decodificado.
- SHA-256: `6a426bfd49fb3b1a1fe7bc2d4e5b508c074b5ebc30e32a3d971f2e3b042c8049`.
- Assinaturas localizadas (nome:linha): `PriorityQueue:10`, `enqueue:23`, `dequeue:44`, `dequeueBatch:54`, `size:66`, `clear:70`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/providerErrorClassifier.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — ProviderErrorClassifier Classificador central de erros de provedores HTTP/API.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3813 bytes; linhas: 101.
- Leitura: texto completo decodificado.
- SHA-256: `68dfe78d78e9f977be849aabb1d5fd41febad13ad1ba8436c3739031989b21ab`.
- Assinaturas localizadas (nome:linha): `ProviderErrorClassifier:5`, `classify:7`.
- Referenciado estaticamente por: `src/core/providerGateway.js`, `src/translation/translator.js`, `tests/regression/provider_error_classifier.test.js`, `tests/test_text_chunking_and_provider_resilience.test.js`.

## `src/core/providerGateway.js`

Porta de entrada para controle de chamadas a provedores.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 1889 bytes; linhas: 55.
- Leitura: texto completo decodificado.
- SHA-256: `cf310c1ca3713e7a3044f6b8a1a15f7c85c405d8ff81fe206b25ee949212c718`.
- Assinaturas localizadas (nome:linha): `ProviderGatewayBlockedError:13`, `ProviderGateway:23`, `executeRequest:25`, `canExecute:47`.
- Imports literais: `./globalCircuitBreaker`, `./providerErrorClassifier`.
- Referenciado estaticamente por: `src/core/providerHttp.js`, `src/translation/translator.js`, `tests/regression/provider_bypass_prevention.test.js`, `tests/regression/provider_failover_strict.test.js`.

## `src/core/providerHttp.js`

Camada de requisições HTTP usada pelos provedores de tradução.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7934 bytes; linhas: 246.
- Leitura: texto completo decodificado.
- SHA-256: `08cb4d6b17e4779f70ee0c201dfc52668023a0da8447848b5cd4d169e5ddd90a`.
- Assinaturas localizadas (nome:linha): `providerKeyFor:44`, `ProviderHttpError:60`, `isErrorStatus:73`, `request:92`, `get:152`, `post:177`, `fetchGuarded:211`.
- Imports literais: `https`, `http`, `./providerGateway`.
- Referenciado estaticamente por: `src/translation/translator.js`, `tests/unit/explicitProviderChoice.test.js`.

## `src/core/providerProfiles.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — ProviderProfiles Perfis técnicos, quotas documentadas, limites observados e políticas de retry para provedores. Não inventa limites: separa limites oficiais documentados de limites conservadores recomendados.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3771 bytes; linhas: 141.
- Leitura: texto completo decodificado.
- SHA-256: `659ec9e9673716186bee4d7b4f291ab6bd74590e3f4299ce8436f869104f9275`.
- Assinaturas localizadas (nome:linha): `ProviderProfiles:128`, `get:130`, `getAll:133`.
- Referenciado estaticamente por: `src/core/translationQueue.js`.

## `src/core/providerRateLimiter.js`

Controla limites, espera e disponibilidade de chamadas por provedor.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2982 bytes; linhas: 100.
- Leitura: texto completo decodificado.
- SHA-256: `00c2ff2941a69a01c823228040e04e4b708001849b51d026027713fcc0b2ff18`.
- Assinaturas localizadas (nome:linha): `ProviderRateLimiter:6`, `_refill:18`, `acquire:33`, `_scheduleProcess:51`, `adjustRate:92`.
- Referenciado estaticamente por: `src/core/selfTest.js`, `src/core/translationQueue.js`, `tests/regression/rate_limit.test.js`.

## `src/core/qaEngine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — Translation QA Engine Validador dedicado de integridade técnica, sintática e de proteção.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6055 bytes; linhas: 148.
- Leitura: texto completo decodificado.
- SHA-256: `5b830af9affea46af71f9fb472dcf366ba4578d094c015a571174e0a97f49b61`.
- Assinaturas localizadas (nome:linha): `QAEngine:5`, `validate:7`, `validateSession:117`.
- Referenciado estaticamente por: `src/core/codeProtector.js`, `src/core/coverageGuarantor.js`, `src/core/selfTest.js`, `src/core/translationPipeline.js`, `tests/regression/run-phase2-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/test_translation_completeness_and_certificates.test.js`.

## `src/core/queueStarvationManager.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - QueueStarvationManager & CachePolicy 1. QueueStarvationManager: Evita inanição (starvation) de tarefas de baixa prioridade (P5/P4) sob carga contínua

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3007 bytes; linhas: 112.
- Leitura: texto completo decodificado.
- SHA-256: `e7fa777ae4a9e85325326857d0ed05235cdb17d01fda8ab91a948292d09967b5`.
- Assinaturas localizadas (nome:linha): `QueueStarvationManager:12`, `promoteAgedTasks:22`, `CachePolicy:59`, `set:66`, `get:89`, `size:102`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/core/realGameWorkflow.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - RealGameWorkflow Orquestrador do fluxo de testes em jogos reais do laboratório. Em conformidade com as diretrizes da Fase 8A:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4306 bytes; linhas: 122.
- Leitura: texto completo decodificado.
- SHA-256: `88d040585d6e2cc72d8c3219d128447f1bcdc8d98ef86d1a8d7593c110edac82`.
- Assinaturas localizadas (nome:linha): `RealGameWorkflow:18`, `createStagingCopy:32`, `runSimulatedMutationTest:59`, `runFullCycle:109`.
- Imports literais: `fs`, `path`, `crypto`, `./backupManager`, `./engineDetector`, `./realTranslationWorkflow`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8a-tests.js`, `tools/run-phase7-real-lab.js`.

## `src/core/realProviderBenchmark.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — RealProviderBenchmark Benchmark HTTP REAL contra provedores de tradução online. NÃO utiliza mock ou simulação local.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 13402 bytes; linhas: 352.
- Leitura: texto completo decodificado.
- SHA-256: `beee871288fb7f19d621d06ab63bb692196c16034cbdf0b94e0367b6edbad899`.
- Assinaturas localizadas (nome:linha): `RealProviderBenchmark:45`, `_requestGoogleGtx:50`, `runStage:125`, `runFullBenchmark:249`.
- Imports literais: `https`, `http`, `../services/cache`, `./structuredLogger`.
- Referenciado estaticamente por: `src/core/speedBenchmark.js`.

## `src/core/realTranslationWorkflow.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - RealTranslationWorkflow Orquestrador formal de tradução: - LAB_PIPELINE: Execução em laboratório com LocalDictionaryProvider determinístico.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 12110 bytes; linhas: 324.
- Leitura: texto completo decodificado.
- SHA-256: `6829892cacd99d174f6b28467ec8d9235714314bd2a8715128faf61c7296f5e0`.
- Assinaturas localizadas (nome:linha): `RealTranslationWorkflow:20`, `discoverSource:38`, `extractStrings:71`, `protectStrings:108`, `translate:123`, `validateTranslation:142`, `apply:158`, `executeLabPipeline:188`, `executeRealGameTranslation:195`, `runRealCycle:202`, `_dummy:208`, `_runInternalCycle:214`, `_atomicWriteFileSync:308`.
- Imports literais: `fs`, `path`, `crypto`, `./backupManager`, `./localDictionaryProvider`, `./placeholderIntegrityValidator`, `./visibleTextVerifier`, `./formatAdapterRegistry`.
- Referenciado estaticamente por: `src/core/realGameWorkflow.js`, `tests/regression/run-phase8a-tests.js`.

## `src/core/runtimeLogCollector.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - RuntimeLogCollector Coletor central e estruturado de telemetria e logs de sessões de runtime. Normaliza e classifica automaticamente saídas de stdout/stderr, eventos de hook

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5277 bytes; linhas: 137.
- Leitura: texto completo decodificado.
- SHA-256: `3763af9d18386e92976eed9c6eb7f79557ec2e0adc1dc84ecf628ad87b6c55f4`.
- Assinaturas localizadas (nome:linha): `RuntimeLogCollector:11`, `log:25`, `attachProcess:49`, `_classifyCategory:78`, `_analyzeError:91`, `query:113`, `exportSessionLogs:126`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/runtimeSessionManager.js`, `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`.

## `src/core/runtimeProbe.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - RuntimeProbe Sondador de processos em execução. Observa: processo, PID, módulos carregados, janela, arquitetura, runtime e canais de texto.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5764 bytes; linhas: 174.
- Leitura: texto completo decodificado.
- SHA-256: `c7c662d1c9313b6729229684aad3b4c3116e511e45b529c7dd6897fd0a41d379`.
- Assinaturas localizadas (nome:linha): `RuntimeProbe:13`, `probeProcess:18`, `_analyzeLoadedModules:99`.
- Imports literais: `child_process`, `path`.
- Referenciado estaticamente por: `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`, `src/services/rpcHandlers.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/runtimeSessionManager.js`

Controla o ciclo de vida de sessões de runtime e o diretório preparado para o jogo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 12421 bytes; linhas: 366.
- Leitura: texto completo decodificado.
- SHA-256: `e5cf4abb8814a5a65e5a70963ea60e53313f857073bba27ea60eb0d73349a813`.
- Assinaturas localizadas (nome:linha): `RuntimeSession:36`, `transitionTo:82`, `prepare:102`, `launch:117`, `stop:199`, `forceStop:227`, `handleTimeout:234`, `cleanup:243`, `_probeWindow:259`, `_saveSession:280`, `detectIncompleteSessions:315`, `recoverSession:345`.
- Imports literais: `child_process`, `path`, `fs`, `crypto`, `./ownedProcessRegistry`, `./runtimeLogCollector`, `./runtimeWatchdog`.
- Referenciado estaticamente por: `src/engines/electron/electronRuntimeBridge.js`, `src/engines/renpy/renpyRuntimeBridge.js`, `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`, `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/runtimeTextManager.js`

Recebe, classifica, protege, traduz e registra textos capturados durante o jogo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 10565 bytes; linhas: 271.
- Leitura: texto completo decodificado.
- SHA-256: `35349287dbd0504021adf61a0852e2aca4ac0c59d6f3f7fcabd9e72131417fa5`.
- Assinaturas localizadas (nome:linha): `RuntimeTextManager:17`, `getInstance:28`, `_hash:35`, `_loadRegistry:39`, `_persistRegistry:64`, `shouldTranslate:79`, `processRuntimeText:117`, `recordRuntimeText:194`, `addToTranslationMemory:222`, `getAllRuntimeTexts:258`.
- Imports literais: `fs`, `path`, `crypto`, `./textClassifier`, `./codeProtector`, `./translationMemory`.
- Referenciado estaticamente por: `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/runtimeWatchdog.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - RuntimeWatchdog Monitor de saúde e cão de guarda para sessões de execução de jogos. Garante que travamentos, deadlocks ou ausência de resposta não congelem a GUI

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3493 bytes; linhas: 119.
- Leitura: texto completo decodificado.
- SHA-256: `6fed22be298d80e6d96d9f8ca7db7e42416c1b7a62a9c7971badfa8fce5cb39d`.
- Assinaturas localizadas (nome:linha): `RuntimeWatchdog:10`, `watch:27`, `heartbeat:44`, `unwatch:53`, `_tick:64`, `destroy:106`.
- Imports literais: `events`.
- Referenciado estaticamente por: `src/core/runtimeSessionManager.js`.

## `src/core/screenCapture.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - ScreenCapture (Windows Real Screen Capture) Captura factual da tela do jogo ou do desktop no Windows via .NET System.Drawing. Se o ambiente for headless, background service ou não possuir handle de desktop interativo,

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4114 bytes; linhas: 120.
- Leitura: texto completo decodificado.
- SHA-256: `091db9beba049a99ce70a703eb5943d7374aa3eee1594019361a765d46fd91db`.
- Assinaturas localizadas (nome:linha): `ScreenCapture:13`, `capture:26`.
- Imports literais: `child_process`, `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-product-runtime-test.js`.

## `src/core/screenDiff.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - ScreenDiff Comparador factual de telas (before.png vs after.png). Calcula diferença bruta, regiões alteradas e porcentagem de modificação.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1842 bytes; linhas: 67.
- Leitura: texto completo decodificado.
- SHA-256: `9bb9b4494dd9d5813ab59ee88707b8a256c669b66c8159d60b11241ff5c390e6`.
- Assinaturas localizadas (nome:linha): `ScreenDiff:12`, `compare:17`.
- Imports literais: `fs`, `crypto`.

## `src/core/scriptDetector.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: scriptDetector.js — Detecção real de script e de "isto foi traduzido?" O BUG `coverageGuarantor` decidia se um texto estava traduzido com:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 13532 bytes; linhas: 362.
- Leitura: texto completo decodificado.
- SHA-256: `6b9762ea86b5984b709064786e26959b785656f087b8273e7d873071f83d9031`.
- Assinaturas localizadas (nome:linha): `lettersOnly:76`, `detectScripts:84`, `dominantScript:103`, `hasNonLatinScript:133`, `hasLatinScript:138`, `isIdentitySafe:192`, `classifyIdentity:226`, `isTranslated:254`.
- Referenciado estaticamente por: `src/core/coverageGuarantor.js`, `src/services/cache.js`, `tools/reprocessIdentity.js`.

## `src/core/selfTest.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — SelfTest System Executa testes automatizados de sanidade no ambiente de execução do OpenTranslator. Verifica:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 9741 bytes; linhas: 249.
- Leitura: texto completo decodificado.
- SHA-256: `f60763498daa84e6032b1763dbfea226e39856fedb596541893382187ab713ea`.
- Assinaturas localizadas (nome:linha): `SelfTest:21`, `runAll:23`.
- Imports literais: `fs`, `path`, `child_process`, `./engineRegistry`, `./qaEngine`, `./universalTokenEngine`, `./translationMemory`, `./providerRateLimiter`, `./adaptiveConcurrency`, `better-sqlite3`.
- Referenciado estaticamente por: `src/core/diagnosticBundle.js`, `src/core/gameService.js`, `tests/regression/run-phase2-tests.js`.

## `src/core/shutdownCoordinator.js`

Aguarda operações em curso, restaura backups pendentes e fecha serviços no encerramento.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7391 bytes; linhas: 162.
- Leitura: texto completo decodificado.
- SHA-256: `11465466226e54f5c4b898a7c028098632a61452c730138e285cbd74315e9849`.
- Assinaturas localizadas (nome:linha): `recordStep:14`, `getShutdownReport:22`, `isShuttingDown:25`, `trackOperation:26`, `withTimeout:33`, `clearRestoreTimer:40`, `restorePendingGame:44`, `scheduleGameRestore:62`, `closeHttpServer:76`, `performShutdown:83`, `requestShutdown:144`, `installSignalHandlers:153`.
- Imports literais: `fs`, `path`, `./gameEngine`, `../services/httpServer`, `../services/cheatServer`, `./ownedProcessRegistry`, `../services/cache`, `./translationMemory`.
- Referenciado estaticamente por: `server.js`, `src/core/gameService.js`, `src/services/cheatServer.js`, `src/services/httpServer.js`, `src/services/rpcHandlers.js`.

## `src/core/speedBenchmark.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — SpeedBenchmark (Unified Dispatcher) Orquestra tanto o RealProviderBenchmark (HTTP Real) quanto o SyntheticThroughputBenchmark (Fila Interna).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1265 bytes; linhas: 39.
- Leitura: texto completo decodificado.
- SHA-256: `ff69fddc3fd3aeb6f57eeefa68e6a2d3c661b9c11a708e9dfdf6b05a3d092626`.
- Assinaturas localizadas (nome:linha): `SpeedBenchmark:8`, `run:13`, `runReal:28`, `runSynthetic:32`.
- Imports literais: `./realProviderBenchmark`, `./syntheticBenchmark`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`.

## `src/core/stagingPolicy.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - StagingPolicy Política inegociável de isolamento de jogos: - O diretório original do jogo em 'C:\Users\...\Nova pasta' é estritamente IMUTÁVEL.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4857 bytes; linhas: 144.
- Leitura: texto completo decodificado.
- SHA-256: `4b3f6cf2211898cf472dacd255a0cc9ce812e64cdfcddc8dad31f475f0549749`.
- Assinaturas localizadas (nome:linha): `StagingPolicy:14`, `generateManifest:26`, `createStaging:52`, `verifyOriginalUntouched:79`, `cleanupStaging:106`, `_copyRecursiveSync:123`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/strategyPlanner.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — StrategyPlanner Avalia capacidades, evidências e riscos do jogo para planejar a estratégia técnica ótima. Classifica cada estratégia como: READY, AVAILABLE, EXPERIMENTAL, BLOCKED, EXTERNAL_TOOL_REQUIRED, UNSUPPORTED.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8606 bytes; linhas: 198.
- Leitura: texto completo decodificado.
- SHA-256: `e4e6566de6f479f050191b833205c4aa6637274892089b5e7ee52eb2c8569eab`.
- Assinaturas localizadas (nome:linha): `StrategyPlanner:9`, `plan:11`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/gameService.js`, `src/diagnostics/universalGameIntelligence.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/structuredLogger.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — StructuredLogger Sistema de logging estruturado em formato JSON Lines (.jsonl). Distingue eventos:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4722 bytes; linhas: 127.
- Leitura: texto completo decodificado.
- SHA-256: `21344de969ce1013eae001929e3bd29701fdb2cdd9506d0a84004941672c48fe`.
- Assinaturas localizadas (nome:linha): `StructuredLogger:17`, `logStructured:26`, `log:62`, `info:66`, `debug:70`, `trace:74`, `error:78`, `logHttpBenchmarkStage:82`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/realProviderBenchmark.js`, `src/core/syntheticBenchmark.js`, `src/core/translationQueue.js`.

## `src/core/subtitleSystem.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — SubtitleSystem Gerenciador de sincronização temporal de legendas e cutscenes: - Estima duração de leitura baseada em taxa de caracteres por segundo (CPS)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2532 bytes; linhas: 82.
- Leitura: texto completo decodificado.
- SHA-256: `7c966ba5455e5194b38b0eaf7d022279d596c6066b541aa6c8bffc1a259d1105`.
- Assinaturas localizadas (nome:linha): `SubtitleSystem:9`, `calculateDuration:23`, `displaySubtitle:39`, `dismissSubtitle:71`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/syntheticBenchmark.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — SyntheticThroughputBenchmark Mede a vazão interna da fila, workers, batching, rate limiter e deserialização. NÃO reflete a velocidade da internet ou limites de provedores reais.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2400 bytes; linhas: 68.
- Leitura: texto completo decodificado.
- SHA-256: `ecbfcae5da1c53b630d1093929c5cc94471f884f4251866db0cbf04c97aa5f90`.
- Assinaturas localizadas (nome:linha): `SyntheticThroughputBenchmark:9`, `run:11`.
- Imports literais: `./translationQueue`, `./structuredLogger`.
- Referenciado estaticamente por: `src/core/speedBenchmark.js`.

## `src/core/textCaptureQuality.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1037 bytes; linhas: 30.
- Leitura: texto completo decodificado.
- SHA-256: `9241990c6596d1da422ef3077c861aa48e60e8d33dea6a910da64e7ba324a5da`.
- Assinaturas localizadas (nome:linha): `TextCaptureQuality:1`, `isTranslatable:2`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/core/textChunker.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: textChunker.js — Divisor Universal e Seguro de Textos Longos Responsabilidades: - Evitar envio de requisições excessivamente longas (que causam HTTP 414 / 429).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5582 bytes; linhas: 149.
- Leitura: texto completo decodificado.
- SHA-256: `4b8eb1af8f05693b704be023f05ab3d49520e62413d2283c4a578f38ca92fa1a`.
- Assinaturas localizadas (nome:linha): `TextChunker:13`, `chunk:38`, `recombine:142`.
- Referenciado estaticamente por: `src/translation/translator.js`, `tests/test_text_chunking_and_provider_resilience.test.js`.

## `src/core/textClassifier.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TextClassifier Identifica e filtra textos que não devem ser traduzidos. Combina detecção semântica estrita de lixo técnico com categorização avançada:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5021 bytes; linhas: 125.
- Leitura: texto completo decodificado.
- SHA-256: `660127fd10dad74f63f052e038378d7ed8270c212c1ce01f31268bebc2d5092d`.
- Assinaturas localizadas (nome:linha): `TextClassifier:26`, `classify:28`, `filterTranslatable:95`.
- Referenciado estaticamente por: `src/core/runtimeTextManager.js`, `src/engines/generic/genericAdapter.js`, `tests/regression/run-phase5b-tests.js`.

## `src/core/textObjectIdentity.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TextObjectIdentity Cria uma identidade multi-dimensional para qualquer string encontrada em runtime ou estaticamente: - gameId: Hash único do jogo

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2383 bytes; linhas: 68.
- Leitura: texto completo decodificado.
- SHA-256: `c8ceb8eeaeea83617bb3cb10e01fa53bd8eb3237eacb806234fa43ebc05bd2ad`.
- Assinaturas localizadas (nome:linha): `TextObjectIdentity:19`, `getCompositeKey:37`, `getTextKey:45`, `toJSON:52`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `src/runtime/hookProvider.js`, `tests/regression/run-phase6-tests.js`.

## `src/core/textProvenance2.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TextProvenance2 Rastreamento avançado de proveniência de texto e impressão digital (Fingerprint): Cadeia canônica:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2525 bytes; linhas: 80.
- Leitura: texto completo decodificado.
- SHA-256: `72bf999ebb1c53224782b8a640aaf1b2c36f3e73d2d721b4110eb09b8a7670df`.
- Assinaturas localizadas (nome:linha): `TextFingerprint:12`, `create:14`, `TextProvenance2:30`, `evaluateChain:44`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/core/textStabilizer.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: TextStabilizer — Estabiliza textos capturados em runtime. Inspirado nos mecanismos do XUnity AutoTranslator: - Evita traduzir textos intermediários (Loading, Loading., Loading..)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2004 bytes; linhas: 61.
- Leitura: texto completo decodificado.
- SHA-256: `6cbe4306c59fb0475b3b93d91f01d9c8f9afebadf35c1d58e156c26bb7472b1e`.
- Assinaturas localizadas (nome:linha): `TextStabilizer:9`, `stabilize:21`, `clear:50`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/transactionJournal.js`

Registra o ciclo de transações e oferece informações para recuperação.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 8989 bytes; linhas: 267.
- Leitura: texto completo decodificado.
- SHA-256: `31f6f3b0df8a87fc1cf90c2ce729ff2eddcbd4815cdbefb6613368567f2d8822`.
- Assinaturas localizadas (nome:linha): `TransactionJournalError:40`, `TransactionJournal:48`, `_txFile:62`, `createTransaction:77`, `recordFile:97`, `setCommitting:112`, `setCommitted:116`, `setRolledBack:120`, `setFailed:124`, `_setStatus:133`, `_mustGet:141`, `getTransaction:164`, `listUnfinished:190`, `_save:227`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `src/core/applyTransaction.js`, `src/core/gameService.js`, `src/core/patchInstaller.js`, `tests/regression/run-phase3-tests.js`.

## `src/core/translationAccounting.js`

Contabiliza estados e transições dos textos usados nos relatórios de cobertura.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 8487 bytes; linhas: 239.
- Leitura: texto completo decodificado.
- SHA-256: `f04119e508d6e8b5cba21aa796af853b31db0d850944764bdcb42c9d57c3e93a`.
- Assinaturas localizadas (nome:linha): `TranslationAccounting:31`, `registerCached:73`, `registerUnmatchedCache:99`, `registerTranslated:105`, `registerFailed:113`, `registerSkipped:120`, `registerDuplicate:126`, `registerFiltered:132`, `requeueToPending:138`, `recordPatch:148`, `validateIntegrity:157`, `getCompletionStatus:185`, `getSummary:198`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`, `tests/regression/completion_state.test.js`, `tests/regression/job_persistence_117k_realistic.test.js`, `tests/regression/translation_accounting.test.js`, `tests/regression/translation_accounting_realistic.test.js`, `tests/regression/unit_of_count_consistency.test.js`.

## `src/core/translationCertificate.js`

Avalia evidências e contagens para declarar o resultado de uma tradução; não certifica uma engine inteira.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 27055 bytes; linhas: 613.
- Leitura: texto completo decodificado.
- SHA-256: `9271b934968eab39bffe5c0b0099bb80d0900736727d7a8ec39d51036a4b3138`.
- Assinaturas localizadas (nome:linha): `isUnknownToken:85`, `num:91`, `TranslationCertificate:96`, `issue:120`, `assertInvariants:500`, `isCompleted:574`, `fromFailure:587`, `TranslationCertificateInvariantError:603`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`, `tests/test_translation_completeness_and_certificates.test.js`.

## `src/core/translationContext.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TranslationContext Modela o contexto semântico compacto para uma unidade de texto: - source: Arquivo de origem ou fonte de runtime (ex: "data/Map001.json", "DialogueHook")

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2136 bytes; linhas: 61.
- Leitura: texto completo decodificado.
- SHA-256: `2be7e935de208f56442c442744bfb70bdd52fa7b52237ed03c9c4b0fa7c45754`.
- Assinaturas localizadas (nome:linha): `TranslationContext:17`, `getContextSignature:34`, `toCompactJSON:48`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/translationEditorCore.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - TranslationEditorCore Núcleo do Editor de Tradução Profissional: - Modelo virtualizado de dados (Original, Translation, Context, Source, Provider, Status, Scene)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6770 bytes; linhas: 201.
- Leitura: texto completo decodificado.
- SHA-256: `6328c04dad1383c41b9e227db60557ce3a2225d017ccf1ac17a557fa914ac146`.
- Assinaturas localizadas (nome:linha): `TranslationEditorCore:16`, `validateEntry:27`, `query:57`, `updateTranslation:93`, `previewBulkReplace:121`, `applyBulkReplace:148`, `exportToOtPatch:168`.
- Imports literais: `crypto`, `./placeholderIntegrityValidator`, `./translationPatchSchema`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationLayoutValidator.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TranslationLayoutValidator Validador e ajustador de layout de tradução para jogos: - Detecta overflow, clipping e quebras de linha excessivas

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3873 bytes; linhas: 116.
- Leitura: texto completo decodificado.
- SHA-256: `11ca0c6317cee9adc0f64f414d8536f801f67331339fc6d24968b5ab1cf47d20`.
- Assinaturas localizadas (nome:linha): `TranslationLayoutValidator:10`, `validateLayout:15`, `wrapText:58`, `formatRTL:82`, `validatePluralAndVariables:100`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/translationMemory.js`

Memória hierárquica de tradução com armazenamento SQLite e busca contextual.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7720 bytes; linhas: 225.
- Leitura: texto completo decodificado.
- SHA-256: `0ce5f28d6b1eb4d5712b5d344ba68b7e33083813d12996f5decc413ab92651af`.
- Assinaturas localizadas (nome:linha): `TranslationMemory2:10`, `init:19`, `generateIdentity:59`, `lookup:74`, `store:117`, `setGlossary:152`, `applyGlossary:158`, `computeDelta:171`, `getHitRate:214`.
- Imports literais: `fs`, `path`, `crypto`, `better-sqlite3`.
- Referenciado estaticamente por: `src/core/coverageGuarantor.js`, `src/core/gameService.js`, `src/core/runtimeTextManager.js`, `src/core/selfTest.js`, `src/core/shutdownCoordinator.js`, `src/core/translationPipeline.js`, `tests/regression/run-phase2-tests.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/hookLifecycle.test.js`.

## `src/core/translationMemory3.js`

Implementação adicional de memória/priorização. O sufixo 3 não significa que substitua todos os consumidores da implementação anterior.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 5221 bytes; linhas: 179.
- Leitura: texto completo decodificado.
- SHA-256: `6e056a0a0d08e3b92b47b505decf0a5f28311a0bb972dee1a30a37ebd91b5d89`.
- Assinaturas localizadas (nome:linha): `TranslationMemory3:12`, `set:24`, `lookup:59`, `_normalize:142`, `_similarity:146`, `_levenshtein:155`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/core/translationPatchFormat.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - TranslationPatchFormat Formato canônico unificado de patch de tradução (.otpatch / JSON v3.1): - Metadata unificado: patchId, gameId, gameHash, gameVersion, engine, runtime, targetLanguage, provider, createdAt

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4150 bytes; linhas: 124.
- Leitura: texto completo decodificado.
- SHA-256: `b128023f1a29da47f980cb0002901586f38f94cc7265f8279c92f62631c58c60`.
- Assinaturas localizadas (nome:linha): `TranslationPatchFormat:13`, `createPatch:18`, `computeDiff:50`.
- Imports literais: `crypto`, `./translationPatchSchema`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationPatchSchema.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - TranslationPatchSchema Validador e normalizador oficial do schema canônico .otpatch (v3.x): Contrato Canônico Unificado:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5822 bytes; linhas: 168.
- Leitura: texto completo decodificado.
- SHA-256: `370bf555af1c872c857e73bb9a6496d12e45aaa95e8195f8c6d6c7700e38bfd2`.
- Assinaturas localizadas (nome:linha): `TranslationPatchSchema:36`, `validate:43`, `normalize:133`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `src/core/patchInstaller.js`, `src/core/translationEditorCore.js`, `src/core/translationPatchFormat.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/translationPipeline.js`

Orquestra detecção, extração, tradução, QA e aplicação por adapter; também oferece dry-run.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 34784 bytes; linhas: 831.
- Leitura: texto completo decodificado.
- SHA-256: `f5cf339faebf02b9839b91dbd205ac778bbc78e7c82c480135605357a3531876`.
- Assinaturas localizadas (nome:linha): `TranslationPipeline:38`, `dryRun:44`, `run:87`, `getSafeCacheEntry:187`.
- Imports literais: `./translationAccounting`, `./jobPersistence`, `./globalCircuitBreaker`, `fs`, `path`, `./engineDetector`, `./engineRegistry`, `./codeProtector`, `./backupManager`, `./qaEngine`, `./translationMemory`, `../engines/renpy/renpyAdapter`, `../engines/rpgmaker/rpgMakerAdapter`, `../engines/electron/electronAdapter`, `../engines/unity/unityAdapter`, `../engines/generic/genericAdapter`, `../translation/extraction/buildUniverse`, `../services/cache`, `../translation/translator`, `./translationCertificate`, `./coverageGuarantor`, `./applyTransaction`, `./applyVerifier`.
- Referenciado estaticamente por: `src/core/gameService.js`, `src/services/rpcHandlers.js`, `tests/regression/run-all-tests.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/run-lab-tests.js`.

## `src/core/translationProvider.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: TranslationProvider — Provedor de tradução desacoplado. Implementa suporte Offline-First através de dicionário local integrado, eliminando dependência obrigatória de serviços em nuvem para execução básica.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4128 bytes; linhas: 128.
- Leitura: texto completo decodificado.
- SHA-256: `11b6472775d2211e86a18d46aef88d8b83088d1dff372111832a7af7565ad8f1`.
- Assinaturas localizadas (nome:linha): `TranslationProvider:37`, `translate:71`, `translateBatch:114`, `supportsBatch:122`, `supportsOffline:124`.
- Imports literais: `./translationResult`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/translationQueue.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TranslationQueue Fila paralela de tradução com concorrência adaptativa, rate limiter compartilhado, cache hierárquico, failover automático e métricas de throughput em tempo real.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6526 bytes; linhas: 177.
- Leitura: texto completo decodificado.
- SHA-256: `5f80ca06413f956bbe9814c659656106ed75315edb78e02991e70ff1018b216a`.
- Assinaturas localizadas (nome:linha): `TranslationQueue:13`, `process:44`, `getCurrentThroughput:143`, `getMetrics:149`.
- Imports literais: `./providerProfiles`, `./providerRateLimiter`, `./adaptiveConcurrency`, `./batchOptimizer`, `./structuredLogger`, `./jobPersistence`.
- Referenciado estaticamente por: `src/core/syntheticBenchmark.js`, `tests/regression/provider_failover.test.js`, `tests/regression/translation_speed.test.js`.

## `src/core/translationResult.js`

Contrato de resultados que distingue tradução obtida, origem, falha e demais estados.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7595 bytes; linhas: 231.
- Leitura: texto completo decodificado.
- SHA-256: `dc840dfd1efc4cd4249c4b705ef2cceb3a9d55af30fd2a9849f83d8ec6471b15`.
- Assinaturas localizadas (nome:linha): `normalize:67`, `coerceTranslation:144`, `coerceOriginal:152`, `describe:160`, `translated:168`, `failed:173`, `notTranslated:181`, `assertContract:193`.
- Referenciado estaticamente por: `src/core/fastTextPipeline.js`, `src/core/translationProvider.js`, `src/providers/translationProviderRegistry.js`.

## `src/core/translationRouter.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: TranslationRouter — Decide deterministicamente o melhor método de tradução. Métodos suportados: - METHOD_A_STATIC: Modificação de arquivos estáticos (JSON, CSV, PO, etc.)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4450 bytes; linhas: 115.
- Leitura: texto completo decodificado.
- SHA-256: `891a62c10e52bd037fee70d03aac8a8220c8c9c95232cec5c154a0d62be7e44c`.
- Assinaturas localizadas (nome:linha): `TranslationRouter:12`, `route:13`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/core/translationRuntimeRouter.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - TranslationRuntimeRouter 2.0 Roteador inteligente de estratégias de tradução com explicabilidade completa. Avalia a tríade (Engine, Runtime, Framework), integridade de arquivos e capacidades

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4043 bytes; linhas: 88.
- Leitura: texto completo decodificado.
- SHA-256: `84e62703309d0d511377dd53876aa14c9b7f8b8face13179ce3959ca04ac7bba`.
- Assinaturas localizadas (nome:linha): `TranslationRuntimeRouter:8`, `selectStrategy:10`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/run-phase9-tests.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/core/translationSession.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — TranslationSession & GameProfile Gerenciador de sessão persistente e perfil de jogo: - Salva e restaura o estado de trabalho entre reinicializações do OpenTranslator

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2827 bytes; linhas: 92.
- Leitura: texto completo decodificado.
- SHA-256: `3ae9ad93078b9100195370760e57f6c4560b1eabf76d1d6d64d2fbd8a4c40dca`.
- Assinaturas localizadas (nome:linha): `GameProfile:12`, `checkVersionDrift:32`, `TranslationSession:45`, `saveSession:57`, `loadSession:73`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/core/translationStateMachine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: TranslationStateMachine — Rastreia os estados pelos quais um texto passa: DETECTED -> FILTERED -> STABILIZING -> READY -> CACHE_HIT -> TRANSLATING -> TRANSLATED -> VALIDATED -> DISPLAYED -> FAILED -> IGNORED

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1254 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `589716ce7ec20a1ced97fc32706ebf64bb239af1d87e4e713d17843dcbfd305e`.
- Assinaturas localizadas (nome:linha): `TranslationState:18`, `transition:28`, `isTerminal:34`.
- Referenciado estaticamente por: `tests/regression/run-phase5b-tests.js`.

## `src/core/translationUnit.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - TranslationUnit & PlaceholderMasker Unidade atômica e estruturada de tradução de produção (TranslationUnit 2.0). Integra proteção real de placeholders (PlaceholderMasker) e seletores estruturados

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5511 bytes; linhas: 152.
- Leitura: texto completo decodificado.
- SHA-256: `a9a7980718f676cd995df491fe64492bc8937e1a1bea3623a632f0699792196c`.
- Assinaturas localizadas (nome:linha): `PlaceholderMasker:10`, `mask:15`, `unmask:37`, `validate:50`, `TranslationUnit:67`, `applyTranslation:109`, `toJSON:127`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase9-tests.js`.

## `src/core/universalTokenEngine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — UniversalTokenEngine Sistema universal de proteção, restauração e validação de placeholders e tokens. Suporta todas as principais engines e formatos:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6170 bytes; linhas: 178.
- Leitura: texto completo decodificado.
- SHA-256: `1b805120f8d2d5aaf1a63d2b26287b82bcd8a262cf324480e8927f622d645074`.
- Assinaturas localizadas (nome:linha): `UniversalTokenEngine:13`, `getPatterns:22`, `protect:58`, `restore:91`, `validate:146`, `protect:163`, `restore:167`, `validate:171`.
- Referenciado estaticamente por: `src/core/selfTest.js`, `tests/regression/placeholder_preservation.test.js`.

## `src/core/untranslatedDetector.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — UntranslatedDetector Sistema universal de detecção e classificação de textos potencialmente não traduzidos. Analisa extrações estáticas, pipeline de tradução, memória e runtime.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 12718 bytes; linhas: 348.
- Leitura: texto completo decodificado.
- SHA-256: `5a993ff591aa19110fa9a3999fd06545fb6ad711037be3189ab2a8bd3b28a140`.
- Assinaturas localizadas (nome:linha): `UntranslatedDetector:46`, `detectScriptAndLanguage:53`, `isTechnicalOrCode:121`, `classifyText:155`, `analyzeExtraction:243`, `generateSummaryReport:333`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/visualQAEngine.js`, `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/core/visibleTextVerifier.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator - VisibleTextVerifier 3.0 Verificador factual e conceitualmente rigoroso de texto: - verifyFileContent: Comprova a presença física da string traduzida no arquivo de dados (FILE_VERIFIED).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6177 bytes; linhas: 180.
- Leitura: texto completo decodificado.
- SHA-256: `37539b46d019f431a689b91974639f7b3871700d16e13b1d5589324d081f6d85`.
- Assinaturas localizadas (nome:linha): `VisibleTextVerifier:14`, `verifyFileContent:19`, `recordRuntimeObservation:62`, `recordDOMObservation:82`, `recordScreenObservation:102`, `buildEvidenceArtifact:148`.
- Imports literais: `fs`, `crypto`.
- Referenciado estaticamente por: `src/core/realTranslationWorkflow.js`, `tests/regression/run-phase8a-tests.js`, `tests/regression/run-phase8b-tests.js`.

## `src/core/visualQAEngine.js`

Regras centrais: detecção, tradução, execução, integridade e recuperação. Descrição declarada no cabeçalho: OpenTranslator — VisualQAEngine Sistema automatizado de QA Visual e Detecção Multimodal de Texto: - Navegação automatizada por cenas (TITLE, OPTIONS, MENU, ITEM, DIALOGUE)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 10055 bytes; linhas: 287.
- Leitura: texto completo decodificado.
- SHA-256: `054106bf1d1aaf274f0dd6618e612efa3d77258738e0584dd5318ec71022e3e8`.
- Assinaturas localizadas (nome:linha): `VisualQAEngine:23`, `runAutomatedQA:39`, `_connectCDP:87`, `send:106`, `_runCDPQASession:149`, `_runStaticAndRuntimeQA:239`, `isBlackScreen:262`, `generateSummaryReport:272`.
- Imports literais: `fs`, `path`, `http`, `ws`, `./untranslatedDetector`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/comprehensive_platform_audit.test.js`.

## `src/diagnostics/errorAnalyzer.js`

Inspeção de executáveis, ambiente e evidências. Descrição declarada no cabeçalho: OpenTranslator — ErrorAnalyzer & RootCauseAnalyzer Analisa e classifica falhas técnicas em categorias determinísticas, fornecendo código padronizado (OT-XXXX), diagnóstico de causa raiz,

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3049 bytes; linhas: 87.
- Leitura: texto completo decodificado.
- SHA-256: `7366c50358abee2639824a2df04a29fe7596611540086b90f9d1f97881d2268b`.
- Assinaturas localizadas (nome:linha): `ErrorAnalyzer:10`, `getRegistry:12`, `analyzeError:21`, `analyzeError:23`, `analyze:24`, `analyze:25`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/diagnostics/universalGameIntelligence.js`, `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/errorRegistry.json`

Inspeção de executáveis, ambiente e evidências. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 2144 bytes; linhas: 64.
- Leitura: texto completo decodificado.
- SHA-256: `2be48431fa4db8f157ed47bab6d3bc11e59554450930e8f96cc6278cb2ef7b48`.

## `src/diagnostics/executableAnalyzer.js`

Inspeção de executáveis, ambiente e evidências. Descrição declarada no cabeçalho: OpenTranslator — ExecutableAnalyzer Analisador estático de arquivos PE (Portable Executable - Windows EXE/DLL). Extrai arquitetura (x86/x64/ARM64), subsistema (GUI/Console), seções,

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3892 bytes; linhas: 114.
- Leitura: texto completo decodificado.
- SHA-256: `cfa2e4e28b2d864f0565796f2fcd731bf60ba0eff00a8d8fee264cee215ad202`.
- Assinaturas localizadas (nome:linha): `ExecutableAnalyzer:9`, `analyzeExecutable:11`, `analyzeExecutable:12`, `analyze:13`, `analyze:14`.
- Imports literais: `fs`.
- Referenciado estaticamente por: `src/diagnostics/universalGameIntelligence.js`, `src/discovery/universalDiscoveryEngine.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/logIntelligence.js`

Inspeção de executáveis, ambiente e evidências. Descrição declarada no cabeçalho: OpenTranslator — LogIntelligence & LogCorrelation Correlaciona logs do OpenTranslator com logs nativos do jogo (Unity Player.log, Ren'Py log.txt, BepInEx LogOutput.log) usando JobId, PID e timestamp.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2551 bytes; linhas: 77.
- Leitura: texto completo decodificado.
- SHA-256: `1131338b3e87abce2ec96f1949eb54ce276d60f2e752f9e362ec02129eb5cec5`.
- Assinaturas localizadas (nome:linha): `LogIntelligence:9`, `parseUnityLog:11`, `parseUnityLog:27`, `findGameLogs:32`, `correlate:66`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/diagnostics/universalGameIntelligence.js`, `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/logParsers.js`

Inspeção de executáveis, ambiente e evidências. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1741 bytes; linhas: 76.
- Leitura: texto completo decodificado.
- SHA-256: `ae8dc22819ff2c926308493c78463c181a28153318a6b95c56434bedf9216b13`.
- Assinaturas localizadas (nome:linha): `ErrorTimeline:1`, `record:6`, `getTimeline:20`, `LogParsers:25`, `parseUnityLog:27`, `parseRenPyLog:42`, `parseElectronLog:56`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/diagnostics/processInspector.js`

Inspeção de executáveis, ambiente e evidências. Descrição declarada no cabeçalho: OpenTranslator — ProcessInspector Inspeciona processos em execução no Windows: módulos carregados, linha de comando, título de janela e portas locais ativas, sem interferir no processo inspecionado.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2645 bytes; linhas: 71.
- Leitura: texto completo decodificado.
- SHA-256: `014444b3622b5a72d00c69846bb90aa640beaa5d6f8737d3f2589bd4d90b3efb`.
- Assinaturas localizadas (nome:linha): `ProcessInspector:8`, `inspectProcess:10`, `inspectPid:11`.
- Imports literais: `child_process`.
- Referenciado estaticamente por: `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/diagnostics/universalGameIntelligence.js`

Inspeção de executáveis, ambiente e evidências. Descrição declarada no cabeçalho: OpenTranslator — UniversalGameIntelligence Camada unificada de inteligência profunda e forense de jogos. Constrói diagnóstico profundo de executáveis, arquitetura, runtime e estratégias.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4024 bytes; linhas: 106.
- Leitura: texto completo decodificado.
- SHA-256: `5e37c42e30b69443ad57cb4a499dfe8fd6b4d060c71e2ebc14474bbd749fa8f3`.
- Assinaturas localizadas (nome:linha): `UniversalGameIntelligence:14`, `diagnoseGame:16`, `diagnoseGame:17`, `investigate:18`, `investigate:19`, `generateForensics:77`.
- Imports literais: `fs`, `path`, `../core/engineDetector`, `../core/strategyPlanner`, `./executableAnalyzer`, `./logIntelligence`, `./errorAnalyzer`.
- Referenciado estaticamente por: `tests/regression/run-phase4a-tests.js`.

## `src/discovery/discoveryExperimentEngine.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Descrição declarada no cabeçalho: Run a low-risk non-destructive strategy experiment in sandbox mode.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2096 bytes; linhas: 68.
- Leitura: texto completo decodificado.
- SHA-256: `1a702064b29a2b4338ae5f75d5e45cedb8f6318adca823c152f754477d19f6eb`.
- Assinaturas localizadas (nome:linha): `DiscoveryExperimentEngine:1`, `runSafeExperiment:13`, `getHistory:61`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/discovery/gameCompatibilityPassport.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 2280 bytes; linhas: 67.
- Leitura: texto completo decodificado.
- SHA-256: `de0be020d1c79a43fe251bd8042f1d44bd88d5f5b415e42c53b08196dd7a87cd`.
- Assinaturas localizadas (nome:linha): `GameCompatibilityPassport:4`, `generateIdentity:6`, `createPassport:31`, `save:57`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/discovery/renpyAppDataResolver.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Descrição declarada no cabeçalho: renpyAppDataResolver.js — Localizador de Diretórios de Saves e Configurações de Jogos Ren'Py Responsabilidades: - Localização e resolução multiplataforma dos caminhos de AppData do Ren'Py (Windows, Linux, macOS)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 7701 bytes; linhas: 190.
- Leitura: texto completo decodificado.
- SHA-256: `751115a229cb6a94233dd8f62560ce8301737e627b1ec589be8116903e86b990`.
- Assinaturas localizadas (nome:linha): `getBaseAppDataPath:27`, `extractSaveDirectoryFromRpy:40`, `findMatchingAppDataFolder:69`, `supportsEngine:109`, `resolveGameAppDataDir:112`, `logAppDataError:164`.
- Imports literais: `fs`, `path`, `../core/engineRoutingGuard`, `../utils/loggerManager`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`, `tests/regression/engine_diagnostic_routing.test.js`, `tests/regression/engine_launch_routing.test.js`, `tests/regression/engine_routing_all_engines.test.js`.

## `src/discovery/textProvenanceGraph.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Descrição declarada no cabeçalho: Register string provenance tracing from physical file to visible screen.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2785 bytes; linhas: 93.
- Leitura: texto completo decodificado.
- SHA-256: `f842c7b0f2ce066b0d69b811d4e3ca17d41b2ce0ef3feb8518b9fc7d177a544c`.
- Assinaturas localizadas (nome:linha): `TextProvenanceGraph:1`, `addNode:6`, `addEdge:12`, `recordProvenance:20`, `correlate:61`, `getSummary:82`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/discovery/universalDiscoveryEngine.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 6908 bytes; linhas: 196.
- Leitura: texto completo decodificado.
- SHA-256: `654bc3354671292566e1a3573c3830b7324b5b5930110f97a0cdb26d8afe1b94`.
- Assinaturas localizadas (nome:linha): `UniversalDiscoveryEngine:4`, `_loadJson:15`, `discover:23`, `_scanFiles:169`, `_matchesPattern:182`.
- Imports literais: `fs`, `path`, `../diagnostics/executableAnalyzer`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/discovery/unknownGameTriage.js`

Descoberta de jogos, origem de textos e triagem de motores desconhecidos. Descrição declarada no cabeçalho: OpenTranslator — UnknownGameTriage Sistema pericial de triagem e diagnóstico para jogos não catalogados: - Executa varredura profunda de binários PE, seções, importações e arquivos de dados

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3635 bytes; linhas: 97.
- Leitura: texto completo decodificado.
- SHA-256: `797ff067fb677b9a2d4f4cf16cce9c05fd482253167d32a454489c723248f2ad`.
- Assinaturas localizadas (nome:linha): `UnknownGameTriage:17`, `triage:24`.
- Imports literais: `fs`, `path`, `../core/engineDetector`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/engines/baseEngineHandler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: BaseEngineHandler - Abstract base class defining the strict contract for all OpenTranslator game engine modules (Ren'Py, RPG Maker, Unity, Godot, etc.).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1954 bytes; linhas: 52.
- Leitura: texto completo decodificado.
- SHA-256: `ca02f9393b1422efd783a85706fdc51797152142281e95ed27f41ce9daa6f298`.
- Assinaturas localizadas (nome:linha): `BaseEngineHandler:5`, `extract:19`, `injectTranslation:28`, `applyFontPatch:37`, `cleanup:46`.
- Referenciado estaticamente por: `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `src/engines/rpgmaker/rpgMakerMvMzHandler.js`, `src/engines/rpgmaker/rpgMakerRubyHandler.js`, `src/engines/unreal/unrealHandler.js`.

## `src/engines/cocos/cocos2dxAdapter.js`

Adapter da família cocos: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 13494 bytes; linhas: 323.
- Leitura: texto completo decodificado.
- SHA-256: `52e29ea0a58b58fceaada6ae89843766a5959fdf8c1ae6cf76c717f736629084`.
- Assinaturas localizadas (nome:linha): `Cocos2dxAdapter:16`, `getDetailedDeclaration:33`, `getCapabilities:50`, `extract:64`, `validate:191`, `apply:195`, `rollback:315`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/test_adapters_live.js`.

## `src/engines/cocos/cocosCreatorAdapter.js`

Adapter da família cocos: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 8153 bytes; linhas: 205.
- Leitura: texto completo decodificado.
- SHA-256: `efb5f94ea8cecd26d1733dd4438e2f7061302b9c0137adc16bb55eb30b242bb1`.
- Assinaturas localizadas (nome:linha): `CocosCreatorAdapter:19`, `getDetailedDeclaration:36`, `getCapabilities:53`, `extract:69`, `validate:129`, `apply:133`, `rollback:197`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/construct/constructAdapter.js`

Adapter da família construct: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 6536 bytes; linhas: 170.
- Leitura: texto completo decodificado.
- SHA-256: `5bafcdf81aacdc613c7dd5022b297dfdc8c68ebc0c52f14d521b99c494a3f79f`.
- Assinaturas localizadas (nome:linha): `ConstructAdapter:20`, `getDetailedDeclaration:36`, `getCapabilities:53`, `extract:70`, `validate:120`, `apply:124`, `rollback:162`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`.

## `src/engines/defold/defoldAdapter.js`

Adapter da família defold: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 9226 bytes; linhas: 235.
- Leitura: texto completo decodificado.
- SHA-256: `3605c8ede8efc24effacaee9c8412a2cf97763dd8f375176f47e6fcd30c13b61`.
- Assinaturas localizadas (nome:linha): `DefoldAdapter:20`, `getDetailedDeclaration:37`, `getCapabilities:54`, `extract:88`, `validate:157`, `apply:161`, `rollback:227`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/asarRepacker.js`

Empacota arquivos em ASAR básico e calcula offsets do conteúdo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2924 bytes; linhas: 92.
- Leitura: texto completo decodificado.
- SHA-256: `193dede2ea05e3122982283bbdb9e2ac6753e57148eb923bfc03923def6acca8`.
- Assinaturas localizadas (nome:linha): `AsarRepacker:9`, `pack:14`, `walk:18`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/engines/electron/electronAdapter.js`, `tests/regression/run-phase3-tests.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/asarUtil.js`

Leitor/extrator ASAR com validação do cabeçalho, limites e caminhos. Recusa variantes não preservadas pelo fluxo atual.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 3246 bytes; linhas: 57.
- Leitura: texto completo decodificado.
- SHA-256: `c80cd2338751a8d1129d9e93b1433b717c5b24eeb81219db567e009ccd63f9da`.
- Assinaturas localizadas (nome:linha): `AsarUtil:4`, `readHeader:5`, `extractTextFiles:21`, `extractAll:24`, `_extract:25`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/engines/electron/electronAdapter.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/electronAdapter.js`

Adapter da família electron: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 11061 bytes; linhas: 286.
- Leitura: texto completo decodificado.
- SHA-256: `42fd0e8c928d1c6d3f18d0dcd133ff59ac0889129a1d67c499e8fe891c4531ad`.
- Assinaturas localizadas (nome:linha): `ElectronAdapter:17`, `findAsarPath:24`, `findUnpackedAppDir:35`, `getCapabilities:46`, `extract:66`, `validate:120`, `apply:127`, `rollback:271`.
- Imports literais: `./asarRepacker`, `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./asarUtil`, `../../core/partialApply`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/run-lab-tests.js`, `tests/unit/adapterReview.test.js`.

## `src/engines/electron/electronArchiveProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — ElectronArchiveProvider Sistema de Arquivo Virtual para pacotes ASAR do Electron: - Lê cabeçalho JSON do ASAR sem extrair o arquivo inteiro para o disco

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3772 bytes; linhas: 130.
- Leitura: texto completo decodificado.
- SHA-256: `45044b2491e8a7bd6c05efa0bf41f12c8af993b67b93ec872ddf5b0333308db0`.
- Assinaturas localizadas (nome:linha): `ElectronArchiveProvider:13`, `open:26`, `close:56`, `listFiles:68`, `readFile:94`, `readTextFile:123`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/electron/electronBridge.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — Electron Runtime Bridge 2.0 Bridge local seguro (localhost, random token) e script de injeção para observação de DOM e frameworks web.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4415 bytes; linhas: 149.
- Leitura: texto completo decodificado.
- SHA-256: `ea0d3322285a1249c27aa84ffe628a92fa59555c7699cb20775a3dfbaf91aa0b`.
- Assinaturas localizadas (nome:linha): `ElectronBridge:8`, `start:16`, `stop:71`, `getInjectionScript:83`, `scanNode:91`, `sendTexts:112`.
- Imports literais: `http`, `crypto`.
- Referenciado estaticamente por: `tests/regression/run-phase2-tests.js`.

## `src/engines/electron/electronDOMProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — ElectronDOMProvider Especializado em interceptação e tradução de texto no DOM de jogos Electron / HTML5: - Filtra nós visíveis (ignora scripts, styles, meta, noscript)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3001 bytes; linhas: 79.
- Leitura: texto completo decodificado.
- SHA-256: `ed8fa8e8839bec1f095e8fad8eb7426031439e6813014d022815e03932545fad`.
- Assinaturas localizadas (nome:linha): `ElectronDOMProvider:10`, `getRendererInjectionScript:15`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/electron/electronRuntimeBridge.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator - ElectronRuntimeBridge Ponte de runtime para aplicações e jogos Electron / HTML5. Observa texto em runtime através do DOM / innerText no staging.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4150 bytes; linhas: 133.
- Leitura: texto completo decodificado.
- SHA-256: `5fdbf3708991688beee229db0145b5f714577db7d70b0cb735fd66fd39d9af0e`.
- Assinaturas localizadas (nome:linha): `ElectronRuntimeBridge:13`, `detectExecutable:19`, `prepareDomObserver:36`, `launch:79`, `observe:105`, `stop:117`.
- Imports literais: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.

## `src/engines/gamemaker/gameMakerAdapter.js`

Adapter da família gamemaker: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 11048 bytes; linhas: 267.
- Leitura: texto completo decodificado.
- SHA-256: `b0338b1c6fe89424c4a501e534504717cbd698673d7995400b22842807f25297`.
- Assinaturas localizadas (nome:linha): `GameMakerAdapter:22`, `getDetailedDeclaration:38`, `getCapabilities:55`, `extract:73`, `validate:154`, `apply:158`, `rollback:259`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`.

## `src/engines/gdevelop/gdevelopAdapter.js`

Adapter da família gdevelop: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 8043 bytes; linhas: 208.
- Leitura: texto completo decodificado.
- SHA-256: `ba28ca8376efa089776ab2432bb7bdfc454eeb010555e7fa1b5a806a6cb8803a`.
- Assinaturas localizadas (nome:linha): `GDevelopAdapter:18`, `getDetailedDeclaration:34`, `getCapabilities:51`, `extract:66`, `validate:115`, `apply:119`, `rollback:200`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`.

## `src/engines/generic/genericAdapter.js`

Adapter da família generic: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 13797 bytes; linhas: 326.
- Leitura: texto completo decodificado.
- SHA-256: `2dd3ee3b6abc2cc68818d90231e5c8b070e445e63d09650f40eb8943a4c70a6c`.
- Assinaturas localizadas (nome:linha): `GenericAdapter:18`, `getDetailedDeclaration:38`, `getCapabilities:55`, `extract:69`, `validate:173`, `apply:177`, `rollback:318`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../../core/textClassifier`, `../rollbackResult.js`, `../../core/partialApply`, `../../core/applyContract`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/comprehensive_platform_audit.test.js`, `tests/run-lab-tests.js`, `tests/unit/applyContract.test.js`.

## `src/engines/generic/universalScanner.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UniversalScanner Varredura heurística com cálculo de humanTextConfidence e fileRiskScore.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2044 bytes; linhas: 59.
- Leitura: texto completo decodificado.
- SHA-256: `c223b50b1cb7bb3f26ff0fbe4a4617f3960011927b3933afed48f18c4a8bb41b`.
- Assinaturas localizadas (nome:linha): `UniversalScanner:8`, `scoreText:10`, `scoreFileRisk:33`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase3-tests.js`.

## `src/engines/godot/godot_bridge.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 12714 bytes; linhas: 315.
- Leitura: texto completo decodificado.
- SHA-256: `2602cc75b435ff0bb19b538ca4bfa30107fbb3875aa5cdeadfb53048bdda0881`.
- Assinaturas localizadas (nome:linha): `parse_pck:15`, `extract_texts:70`, `apply_translations:146`, `rollback_pck:274`.

## `src/engines/godot/godot_pck_parser.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 2695 bytes; linhas: 77.
- Leitura: texto completo decodificado.
- SHA-256: `f7267e35124ae85eb449b5a1271cc0285c85a560cd7021ba356b2fbcdc97a5be`.
- Assinaturas localizadas (nome:linha): `parse_pck:14`.

## `src/engines/godot/godotAdapter.js`

Adapter da família godot: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 21274 bytes; linhas: 553.
- Leitura: texto completo decodificado.
- SHA-256: `5610ebf87f51d44a66bb3826b1f57d41bf150083e6a4258ce01f88c60cb78c29`.
- Assinaturas localizadas (nome:linha): `GodotAdapter:23`, `_findPython:30`, `getDetailedDeclaration:35`, `getCapabilities:52`, `detect:70`, `inspect:87`, `extract:119`, `extractTexts:123`, `extractResources:251`, `prepareTranslation:255`, `translate:264`, `restorePlaceholders:275`, `validate:279`, `apply:283`, `applyTranslations:287`, `package:458`, `launch:462`, `rollback:485`, `diagnose:538`.
- Imports literais: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./godotLocalizationProvider`, `../../core/partialApply`, `../../utils/pythonResolver`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/regression/cancellation_safety.test.js`, `tests/regression/godot_real_pipeline.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/test_adapters_live.js`.

## `src/engines/godot/godotControlTextProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — GodotControlTextProvider Suporte a nós de interface gráfica da Godot Engine (Control / Label / RichTextLabel) Protege formatação BBCode e tokens de interpolação:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2708 bytes; linhas: 88.
- Leitura: texto completo decodificado.
- SHA-256: `9ec030709da62f53287c082029a71e727b9dabb4c12de621ce4e36a1ef97c070`.
- Assinaturas localizadas (nome:linha): `GodotControlTextProvider:9`, `protectBBCode:14`, `restoreBBCode:42`, `getNodeTextProperties:68`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/godot/godotLocalizationProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — GodotLocalizationProvider Suporte completo à localização nativa da Godot Engine: - Parsing e geração de tabelas CSV de tradução (keys,en,pt_BR,ja...)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8168 bytes; linhas: 271.
- Leitura: texto completo decodificado.
- SHA-256: `4bff1e8c333f7e6dbcc4d18fa754293d95c787d3695bc7a056055d882585e8d0`.
- Assinaturas localizadas (nome:linha): `GodotLocalizationProvider:14`, `discover:23`, `parseGodotCsv:75`, `serializeGodotCsv:159`, `parsePo:187`, `parsePoString:226`, `serializePo:239`.
- Imports literais: `fs`, `path`, `crypto`.
- Referenciado estaticamente por: `src/engines/godot/godotAdapter.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/renpy/adapter/renpyAdapter.js`

Adapter da família renpy: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 6663 bytes; linhas: 205.
- Leitura: texto completo decodificado.
- SHA-256: `97a4d90a9b6185db91dee89f3879c4348962da61baec69db53b254ee7e3347c5`.
- Assinaturas localizadas (nome:linha): `RenpyAdapter:23`, `getEmbeddedPython:35`, `getUnpackerScript:42`, `unpackAndDecompile:47`, `getCapabilities:75`, `extract:93`, `validate:105`, `apply:112`, `rollback:198`.
- Imports literais: `fs`, `path`, `child_process`, `../../../core/baseEngineAdapter`, `../../../core/codeProtector`, `../renpyCommon`, `../extractor/renpyExtractor`, `../translator/renpyTranslator`, `../injector/renpyInjector`, `../validator/renpyValidator`, `../runtime/renpyRuntime`.
- Referenciado estaticamente por: `src/engines/renpy/renpyAdapter.js`, `src/services/rpcHandlers.js`, `tests/renpy_variable_healing.test.js`.

## `src/engines/renpy/extractor/renpyExtractor.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: renpyExtractor.js — Extrator oficial e canônico de textos do motor Ren'Py Suporta: - Diálogos (personagem e narrador com ou sem atributos)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 17017 bytes; linhas: 387.
- Leitura: texto completo decodificado.
- SHA-256: `176807dac5b4f4ee835f7ccad82a6fb4cbe08f6d8c8b9ec853476067d26d17bf`.
- Assinaturas localizadas (nome:linha): `RenpyExtractor:25`, `resolveGameDir:38`, `findRpyFiles:61`, `walk:65`, `isTranslatable:94`, `generateId:132`, `extract:139`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `../renpyCommon`, `../../../core/codeProtector`, `../../../core/displayTextClassifier`.
- Referenciado estaticamente por: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/test_renpy_summertime_extraction.js`, `tests/unit/renpy/extractor.test.js`.

## `src/engines/renpy/injector/renpyInjector.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: renpyInjector.js — Injetor Canônico e Puramente Aditivo para Ren'Py Estrutura gerada em game/tl/pt_BR/: - 000_opentranslator_init.rpy (config.language = "pt_BR" e ativação automática)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 13119 bytes; linhas: 331.
- Leitura: texto completo decodificado.
- SHA-256: `05245fbcf8f2e562bdc8a2ae637caf4e58cdf2683d97a5f815ea8005ded00e5e`.
- Assinaturas localizadas (nome:linha): `RenpyInjector:20`, `resolveGameSubDir:29`, `inspectLanguageSystem:51`, `inject:95`, `rollback:272`.
- Imports literais: `fs`, `path`, `../renpyCommon`, `../../../core/partialApply`.
- Referenciado estaticamente por: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/renpy_variable_healing.test.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/unit/renpy/injector.test.js`.

## `src/engines/renpy/renpyAdapter.js`

Adapter da família renpy: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 245 bytes; linhas: 9.
- Leitura: texto completo decodificado.
- SHA-256: `ba9b529fae049ecfc7662eda4985a1c785b606a654c795f29b6ecf1b53a72173`.
- Imports literais: `./adapter/renpyAdapter`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/test_translation_qa_launch_bug.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/renpy/renpyCommon.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: Common utilities for Ren'Py translation management across v7 (Python 2) and v8 (Python 3).

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 30846 bytes; linhas: 732.
- Leitura: texto completo decodificado.
- SHA-256: `a79047fbf5e2deeb13ee6bbde6e2074360f6b3d81598765d07e6d5dcb0eabf9f`.
- Assinaturas localizadas (nome:linha): `ensureTlDirectory:14`, `unescapeRenpyString:37`, `formatRenpyStringLiteral:89`, `buildRenpyStringTlContent:183`, `injectRenpyFontConfig:227`, `extractRenpyRpyTexts:262`, `purgeCacheFiles:447`, `patchRpyFiles:477`, `extractRenpyInterpolations:554`, `healRenpyVariables:589`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `src/engines/renpy/adapter/renpyAdapter.js`, `src/engines/renpy/extractor/renpyExtractor.js`, `src/engines/renpy/injector/renpyInjector.js`, `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `tests/check_e07.js`, `tests/renpy_variable_healing.test.js`, `tests/unit/renpy/heal_variables.test.js`.

## `src/engines/renpy/renpyParser.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — RenpyParser & AST Validator Validador sintático de arquivos .rpy e gerador especializado multi-bloco: - Dialogue (say statements: 'akira "Fala traduzida"')

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3381 bytes; linhas: 103.
- Leitura: texto completo decodificado.
- SHA-256: `8c4f15e2a216c8b1b02c3c5a3b7be7634f1122f2e5ac139e3bc7e8600e82fb4c`.
- Assinaturas localizadas (nome:linha): `RenpyParser:8`, `validateRpy:14`, `generateTlFile:81`.
- Referenciado estaticamente por: `tests/regression/lab_phase3_real_apply.js`, `tests/regression/run-phase3-tests.js`, `tests/regression/run-phase5c-tests.js`.

## `src/engines/renpy/renpyProductionProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — RenpyProductionProvider Expansão completa para tradução nativa de Ren'Py em produção: - RenpyTranslationProvider: diálogo, labels e blocos translate <lang> <label>:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4734 bytes; linhas: 141.
- Leitura: texto completo decodificado.
- SHA-256: `4f3d1691420e8af0d74977e44edcad96c5ceb062370e82cd6ccab15d48a9bcdc`.
- Assinaturas localizadas (nome:linha): `RenpyStringProvider:14`, `generateStringsBlock:22`, `extractStringsPairs:37`, `RenpyStyleProvider:50`, `generateLanguageStyles:59`, `RenpyAssetLocalization:87`, `generateAssetOverrides:93`, `RenpyTranslationProvider:102`, `ensureTlStructure:111`, `saveIncrementalTranslation:122`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/engines/renpy/renpyWorkflow.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/renpy/renpyRuntimeBridge.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator - RenpyRuntimeBridge Ponte de runtime para jogos Ren'Py. Opera exclusivamente na cópia isolada de staging:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5405 bytes; linhas: 173.
- Leitura: texto completo decodificado.
- SHA-256: `90e2f20f357d95a1ce5b470370ee669130c23b21f4cdc998180c4cdd6e310257`.
- Assinaturas localizadas (nome:linha): `RenpyRuntimeBridge:18`, `detectExecutable:28`, `prepareTranslation:46`, `launch:82`, `observe:119`, `stop:146`.
- Imports literais: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.
- Referenciado estaticamente por: `tests/regression/run-real-staged-game-test.js`.

## `src/engines/renpy/renpyV7Handler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: Extract Ren'Py 7.x text using Python 2 environment and legacy unrpyc.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 7065 bytes; linhas: 185.
- Leitura: texto completo decodificado.
- SHA-256: `8d7e193c196598db6e0f6540151962b76c0004fc847b7a36b5851cfb2294f8bb`.
- Assinaturas localizadas (nome:linha): `RenpyV7Handler:6`, `extract:17`, `injectTranslation:87`, `applyFontPatch:129`, `cleanup:167`.
- Imports literais: `fs`, `path`, `child_process`, `../baseEngineHandler`, `./renpyCommon`, `../../utils/loggerManager`.

## `src/engines/renpy/renpyV8Handler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: Extract Ren'Py 8.x text using Python 3 environment and unrpyc_v2.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 7174 bytes; linhas: 186.
- Leitura: texto completo decodificado.
- SHA-256: `d23d2f9f3022699683f8be36c740bb24b46955dc5b053863bffbbbb938f6c8ba`.
- Assinaturas localizadas (nome:linha): `RenpyV8Handler:6`, `extract:17`, `injectTranslation:88`, `applyFontPatch:130`, `cleanup:168`.
- Imports literais: `fs`, `path`, `child_process`, `../baseEngineHandler`, `./renpyCommon`, `../../utils/loggerManager`.

## `src/engines/renpy/renpyWorkflow.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator - RenpyWorkflow Implementa o suporte avançado a Ren'Py em produção: - Estrutura oficial game/tl/<language>/

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2765 bytes; linhas: 80.
- Leitura: texto completo decodificado.
- SHA-256: `9421d7e6157fd8e18f13e39c125098432ae20c4c16da8bbe14490cd2cbed84dc`.
- Assinaturas localizadas (nome:linha): `RenpyWorkflow:15`, `getLaunchEnvironment:26`, `initializeNativeTranslation:36`, `syncDiscoveredStrings:70`.
- Imports literais: `fs`, `path`, `./renpyProductionProvider`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/engines/renpy/runtime/renpyRuntime.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: renpyRuntime.js — Controlador de Execução, Telemetria e Captura para Ren'Py Comunica com o motor Ren'Py em tempo real através do hook periódico oficial config.periodic_callbacks, garantindo execução no thread principal de renderização.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 16204 bytes; linhas: 428.
- Leitura: texto completo decodificado.
- SHA-256: `0b5bb5f639d1876c4cc7b263c5552c2e8fd18a0f7fbce12b6d93fd6312c3dd47`.
- Assinaturas localizadas (nome:linha): `sleep:12`, `RenpyRuntime:16`, `resolveGameExe:22`, `resolveGameSubDir:45`, `injectController:65`, `removeController:269`, `killGame:321`, `launch:357`, `sendCommand:378`, `captureScreenshot:407`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`.
- Referenciado estaticamente por: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/regression/bugs_regression.test.js`, `tests/unit/renpy/runtime.test.js`.

## `src/engines/renpy/translator/renpyTranslator.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: renpyTranslator.js — Pipeline de Tradução PT-BR e Proteção de Variáveis para Ren'Py Garante que: - Variáveis entre colchetes [player], [name], [points] sejam 100% preservadas

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6301 bytes; linhas: 173.
- Leitura: texto completo decodificado.
- SHA-256: `68546daa62552d987c0746d4ad790b4264a57580594fb5c56c7e8cc300673550`.
- Assinaturas localizadas (nome:linha): `RenpyTranslator:16`, `protectTokens:26`, `restoreTokens:57`, `validateTokens:69`, `translateText:103`, `process:134`.
- Imports literais: `fs`, `path`, `../../../core/codeProtector`.
- Referenciado estaticamente por: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/unit/renpy/translator.test.js`.

## `src/engines/renpy/validator/renpyValidator.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: renpyValidator.js — Validador de Sintaxe e Integridade Forense de Ren'Py Checa: - Validade da sintaxe dos blocos gerados em game/tl/pt_BR/

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6941 bytes; linhas: 194.
- Leitura: texto completo decodificado.
- SHA-256: `ae4992dcece8d6d451f4d5b83c7a5d1ce4905a40d6dbd92b170539cdc9e0f001`.
- Assinaturas localizadas (nome:linha): `RenpyValidator:15`, `validateRpyFile:25`, `validateInjection:113`, `validate:164`.
- Imports literais: `fs`, `path`, `../../../core/codeProtector`.
- Referenciado estaticamente por: `src/engines/renpy/adapter/renpyAdapter.js`, `tests/renpy_variable_healing.test.js`, `tests/test_renpy_coverage_generalization.test.js`, `tests/unit/renpy/validator.test.js`.

## `src/engines/rollbackResult.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: rollbackResult.js — Relatório honesto de rollback para os adapters O PADRÃO QUE SE REPETIA EM 11 ADAPTERS async rollback(gameDir, options = {}) {

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3615 bytes; linhas: 92.
- Leitura: texto completo decodificado.
- SHA-256: `704e8a2cb8a38b9e28d33528d51f9fe2f1f922846232a38efb2bcc3147583c2c`.
- Assinaturas localizadas (nome:linha): `rollbackResult:48`.
- Referenciado estaticamente por: `src/engines/cocos/cocos2dxAdapter.js`, `src/engines/cocos/cocosCreatorAdapter.js`, `src/engines/construct/constructAdapter.js`, `src/engines/defold/defoldAdapter.js`, `src/engines/gamemaker/gameMakerAdapter.js`, `src/engines/gdevelop/gdevelopAdapter.js`, `src/engines/generic/genericAdapter.js`, `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/engines/unity/unityAdapter.js`, `src/engines/unreal/unrealAdapter.js`, `src/engines/wolf/wolfAdapter.js`.

## `src/engines/rpgmaker/rgss3a_bridge.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 5940 bytes; linhas: 173.
- Leitura: texto completo decodificado.
- SHA-256: `40321cfce13dc7c5ea67fdf7df3b5f675bd1e13f1c71fd8a573bcb4d6b51abc6`.
- Assinaturas localizadas (nome:linha): `unpack_rgss3a:12`, `pack_rgss3a:75`.

## `src/engines/rpgmaker/rgssAdapter.js`

Adapter da família rpgmaker: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 6416 bytes; linhas: 190.
- Leitura: texto completo decodificado.
- SHA-256: `75c7d79e424045ba47182e92528fdb553a9ccbc4dca5989f650ccbd5f78c53b3`.
- Assinaturas localizadas (nome:linha): `RgssAdapter:16`, `getDetailedDeclaration:24`, `_findRgssArchive:41`, `getCapabilities:53`, `extract:77`, `validate:99`, `apply:103`, `rollback:154`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./rpgMakerRubyHandler`, `../rollbackResult.js`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/regression/generalization.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/rgss_real_pipeline.test.js`.

## `src/engines/rpgmaker/rpgMakerAdapter.js`

Adapter da família rpgmaker: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 9409 bytes; linhas: 249.
- Leitura: texto completo decodificado.
- SHA-256: `400281618389d6ba55db48f601a8c10401f53f0f845df32e3e6a9043d1033e55`.
- Assinaturas localizadas (nome:linha): `RpgMakerAdapter:15`, `getCapabilities:22`, `extract:35`, `validate:92`, `apply:96`, `rollback:186`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../../extractors/extractor`, `../../core/gameEngine`, `../../core/partialApply`, `./rpgMakerRubyHandler`, `../rollbackResult`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/rpgmaker/rpgMakerMvMzHandler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: Bootstrapper: Reads System.json FIRST to extract encryption metadata & key

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 11071 bytes; linhas: 317.
- Leitura: texto completo decodificado.
- SHA-256: `17dca38541f87fefdda8ea306531a75cb07b4170a0f3ed15bd529af538bbc3a1`.
- Assinaturas localizadas (nome:linha): `RpgMakerMvMzHandler:4`, `readSystemEncryptionConfig:15`, `_getAllDataFiles:36`, `extract:56`, `_deepTranslateJson:103`, `injectTranslation:169`, `applyFontPatch:266`, `cleanup:311`.
- Imports literais: `fs`, `path`, `../baseEngineHandler`.

## `src/engines/rpgmaker/rpgMakerPluginsFile.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: rpgMakerPluginsFile.js — Leitor/Escritor do registro de plugins RPG Maker O bug original de `installOverlay` usava `js/plugins.json` e `JSON.parse`.Esse arquivo NÃO EXISTE em RPG Maker MV/MZ.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6903 bytes; linhas: 213.
- Leitura: texto completo decodificado.
- SHA-256: `b787fe8cc1bcaf08078bd86e523f3cf3fb6df46adc780a277ed7464381a59721`.
- Assinaturas localizadas (nome:linha): `parsePluginsJs:28`, `serializePluginsJs:76`, `registerPlugin:93`, `unregisterPlugin:158`, `verifyPlugin:190`.
- Imports literais: `fs`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`.

## `src/engines/rpgmaker/rpgMakerRubyHandler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: Sidecar Bridge Execution: Ruby Marshal <-> JSON conversion. Invokes sidecar script to deserialize binary .rxdata / .rvdata / .rvdata2 safely.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 9517 bytes; linhas: 279.
- Leitura: texto completo decodificado.
- SHA-256: `5821dd3e6588f8ece36ab5a2012d610a1a629c608b3946c93948134a62abeb8c`.
- Assinaturas localizadas (nome:linha): `RpgMakerRubyHandler:5`, `_runSidecarMarshalBridge:15`, `_findRgssArchive:48`, `_runRgss3aBridge:60`, `extract:80`, `injectTranslation:146`, `applyFontPatch:182`, `Window_Message:207`, `cleanup:269`.
- Imports literais: `fs`, `path`, `child_process`, `../baseEngineHandler`, `../../utils/pythonResolver`.
- Referenciado estaticamente por: `src/engines/rpgmaker/rgssAdapter.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`.

## `src/engines/rpgmaker/rpgMakerRuntimeBridge.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator - RpgMakerRuntimeBridge Ponte de runtime para RPG Maker MV e MZ (NW.js / Chromium). Opera exclusivamente na cópia de staging:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4871 bytes; linhas: 161.
- Leitura: texto completo decodificado.
- SHA-256: `f1360c48b22e756f89b07589da9962490643682e1ba7c045d25d4f2f3d684460`.
- Assinaturas localizadas (nome:linha): `RpgMakerRuntimeBridge:18`, `detectSubtype:24`, `detectExecutable:42`, `injectRuntimeHook:55`, `launch:98`, `observe:131`, `stop:143`.
- Imports literais: `fs`, `path`, `../../core/runtimeSessionManager`, `../../core/runtimeProbe`, `../../core/runtimeLogCollector`.
- Referenciado estaticamente por: `tests/regression/run-real-staged-game-test.js`.

## `src/engines/unity/cecil_bridge.ps1`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 7129 bytes; linhas: 187.
- Leitura: texto completo decodificado.
- SHA-256: `1394a0e7434123cfaed75d37d59dcc5bbcac86c55b8702e03706dc1010af7a68`.
- Assinaturas localizadas (nome:linha): `IsTranslatableText:31`, `foreach:44`, `foreach:56`, `foreach:88`, `foreach:90`, `foreach:91`, `foreach:94`, `foreach:149`, `foreach:156`, `foreach:157`, `foreach:158`, `foreach:161`.

## `src/engines/unity/test_asset_extract.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1615 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `5c3570b4b5141c37485d73269b6714da0af2993bb4bc07a95e1f4a4cd2abad58`.

## `src/engines/unity/unity_asset_bridge.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 22632 bytes; linhas: 438.
- Leitura: texto completo decodificado.
- SHA-256: `945643f3567eb16b72ed2a5761c5e0c5d5e17245cd6d83e07a8790499aea5a44`.
- Assinaturas localizadas (nome:linha): `is_translatable_text:33`, `extract_from_game:57`, `inject_into_game:310`, `scan_root_json:260`, `scan_json:150`.

## `src/engines/unity/unity_inspector.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 6010 bytes; linhas: 147.
- Leitura: texto completo decodificado.
- SHA-256: `78566f96c60539a3ab209e58ab4ca13881f2a6d4914b609052d97e66a2758532`.
- Assinaturas localizadas (nome:linha): `inspect_unity_game:18`.

## `src/engines/unity/unityAdapter.js`

Adapter da família unity: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 13531 bytes; linhas: 374.
- Leitura: texto completo decodificado.
- SHA-256: `9773f5fc246b66d552573f7de74b0c8e8a3309112e3e5dd35619eabd4b197076`.
- Assinaturas localizadas (nome:linha): `UnityAdapter:20`, `getDetailedDeclaration:28`, `getPythonBin:45`, `isIl2cpp:50`, `hasBepInEx:63`, `resolveUnityRoot:69`, `getCapabilities:87`, `_findManagedAssembly:105`, `extract:131`, `validate:216`, `apply:224`, `rollback:349`.
- Imports literais: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../core/partialApply`, `../../utils/pythonResolver`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `src/core/translationPipeline.js`, `tests/regression/generalization.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/unity_comprehensive_suite.js`, `tests/regression/unity_real_pipeline.test.js`, `tests/run-lab-tests.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/engines/unity/unityFrameworkMatrix.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnityFrameworkMatrix Mapeador e inspetor avançado de subsistemas de UI da Unity Engine: - TextMeshPro, UGUI, TextMesh (Legado), IMGUI, NGUI, FairyGUI, UI Toolkit, Unity Localization

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4562 bytes; linhas: 156.
- Leitura: texto completo decodificado.
- SHA-256: `b0c6b4333b7f5294e9f1d8287e7ce55829c641662b28dd653452b8a93cd58062`.
- Assinaturas localizadas (nome:linha): `UnityFrameworkMatrix:12`, `evaluate:19`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/engines/unity/unityLocalizationPackageProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnityLocalizationPackageProvider Suporte ao pacote oficial Unity Localization (com.unity.localization): - Identifica StringTableCollection, StringTable, LocalizedString

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3750 bytes; linhas: 122.
- Leitura: texto completo decodificado.
- SHA-256: `931a67e7eca38ceae2033dad3ca596d37502c92fb8761f7cd1433c221063e442`.
- Assinaturas localizadas (nome:linha): `UnityLocalizationPackageProvider:12`, `detectPackage:17`, `parseStringTableCsv:47`, `serializeStringTableCsv:96`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/unity/unityRuntimeCapabilityProbe.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator - UnityRuntimeCapabilityProbe Sondador estrito de capacidades do motor Unity. Distingue formalmente Unity Mono de Unity IL2CPP:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3497 bytes; linhas: 100.
- Leitura: texto completo decodificado.
- SHA-256: `fb09482e059204df4411c0ae2e15773129e481345cc724b3304551a0c45ed3cb`.
- Assinaturas localizadas (nome:linha): `UnityRuntimeCapabilityProbe:13`, `probe:15`.
- Imports literais: `fs`, `path`.

## `src/engines/unity/unityTextMeshProProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnityTextMeshProProvider Especializado em renderização e proteção de rich text do TextMeshPro: - Tags ricas: <color=#hex>, <size=XX>, <b>, <i>, <sprite=X>, <align=...>, <alpha=#XX>, <font=...>

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2821 bytes; linhas: 85.
- Leitura: texto completo decodificado.
- SHA-256: `3f3ca4f59b45c49b801fff48aa84b480cdcac76f33e7f7bba81ff5c25de5244c`.
- Assinaturas localizadas (nome:linha): `UnityTextMeshProProvider:9`, `protectTags:14`, `restoreTags:42`, `estimateOverflow:68`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/unity/unityUGUIProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnityUGUIProvider Especializado no subsistema UGUI (UnityEngine.UI) clássico: - Text, TextMesh, InputField, Text Generator

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1780 bytes; linhas: 65.
- Leitura: texto completo decodificado.
- SHA-256: `fdea31578a2273b259c17fe9072231a9dda8c6efc33b0f986b262a5b45c28864`.
- Assinaturas localizadas (nome:linha): `UnityUGUIProvider:9`, `protectTags:14`, `restoreTags:40`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/unreal/unrealAdapter.js`

Adapter da família unreal: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 9108 bytes; linhas: 206.
- Leitura: texto completo decodificado.
- SHA-256: `53b3498ca95395d1501754395ffe266c30fba66278bdec20f75baa3070d8e5f4`.
- Assinaturas localizadas (nome:linha): `UnrealAdapter:24`, `getDetailedDeclaration:41`, `getCapabilities:58`, `extract:75`, `validate:103`, `apply:107`, `rollback:198`.
- Imports literais: `fs`, `path`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `./unrealHandler`, `./unrealLocResProvider`, `../rollbackResult.js`, `../../core/applyContract`, `../../core/partialApply`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/unit/unrealLocResFormat.test.js`.

## `src/engines/unreal/unrealHandler.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: `fs.rmSync` sem `try` podia lançar e derrubar o cleanup inteiro; com o `success: true` sem payload original, um `_unreal_extract` remanescente passava invisível. O diretório de extração órfão é grande e é

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 12222 bytes; linhas: 315.
- Leitura: texto completo decodificado.
- SHA-256: `40f01dea2a3088172178a5d72fa91cd43960b2283a3c79c30dbc2a36c901eff6`.
- Assinaturas localizadas (nome:linha): `UnrealEngineHandler:5`, `_findPakFiles:16`, `_findLocresFiles:56`, `extract:81`, `injectTranslation:209`, `applyFontPatch:255`, `cleanup:270`, `detect:301`.
- Imports literais: `fs`, `path`, `child_process`, `../baseEngineHandler`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `src/engines/unreal/unrealAdapter.js`.

## `src/engines/unreal/unrealLocalizationProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnrealLocalizationProvider Orquestrador integrado de localização para Unreal Engine: - Detecta Content/Localization/<Target>/<Culture>/<Target>.locres

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3716 bytes; linhas: 110.
- Leitura: texto completo decodificado.
- SHA-256: `971be58e89facfdae67a54d482c5fdc11b8ab72d71c8da106568c5b72b227c67`.
- Assinaturas localizadas (nome:linha): `UnrealLocalizationProvider:15`, `discoverLocalizationTargets:24`, `extractFromLocResFile:70`, `compileToCulture:81`.
- Imports literais: `fs`, `path`, `./unrealLocResProvider`, `./unrealStringTableProvider`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/engines/unreal/unrealLocalizationWorkflow.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnrealLocalizationWorkflow Orquestrador do fluxo oficial de localização da Unreal Engine: Diferencia rigorosamente:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2249 bytes; linhas: 69.
- Leitura: texto completo decodificado.
- SHA-256: `68490ed05fa34cf03113e1a34b4176c62798f87e7f674284752bafd908b10f0a`.
- Assinaturas localizadas (nome:linha): `UnrealLocalizationWorkflow:16`, `compileSourceToLocRes:27`, `decompileLocResToSource:49`.
- Imports literais: `fs`, `path`, `./unrealLocResProvider`, `./unrealStringTableProvider`.
- Referenciado estaticamente por: `tests/regression/run-phase7-tests.js`.

## `src/engines/unreal/unrealLocResProvider.js`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 7458 bytes; linhas: 116.
- Leitura: texto completo decodificado.
- SHA-256: `91b5e1f7b7918b33c41885d7ee2c54b3890b3093d30b2b79ba96cda243a32417`.
- Assinaturas localizadas (nome:linha): `Reader:5`, `require:7`, `u32:8`, `i32:9`, `fstring:10`, `count:18`, `uint:20`, `UnrealLocResProvider:21`, `_readFString:22`, `_writeFString:23`, `parseLocRes:32`, `buildLocRes:71`, `patchLocRes:100`.
- Referenciado estaticamente por: `src/engines/unreal/unrealAdapter.js`, `src/engines/unreal/unrealLocalizationProvider.js`, `src/engines/unreal/unrealLocalizationWorkflow.js`, `tests/regression/run-phase6-tests.js`, `tests/unit/unrealLocResFormat.test.js`, `tools/translate-locres.js`.

## `src/engines/unreal/unrealStringTableProvider.js`

Integração específica de formatos e runtimes de jogos. Descrição declarada no cabeçalho: OpenTranslator — UnrealStringTableProvider Suporte a String Tables da Unreal Engine (CSV e JSON). Formato padrão CSV Unreal: Key,SourceString,Comment

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2142 bytes; linhas: 73.
- Leitura: texto completo decodificado.
- SHA-256: `72273c099862cb5913a4c9cc7abb0ef921403d89962450fcff515ff88ad0b3bb`.
- Assinaturas localizadas (nome:linha): `UnrealStringTableProvider:10`, `parseStringTableCsv:15`, `serializeStringTableCsv:60`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/engines/unreal/unrealLocalizationProvider.js`, `src/engines/unreal/unrealLocalizationWorkflow.js`, `tests/regression/run-phase6-tests.js`.

## `src/engines/wolf/wolf_data_bridge.py`

Integração específica de formatos e runtimes de jogos. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 9872 bytes; linhas: 257.
- Leitura: texto completo decodificado.
- SHA-256: `3468009b4660d76c2d3d35296fb06b6210869aa15fe680b4ad4327c5cac791f4`.
- Assinaturas localizadas (nome:linha): `is_translatable_text:15`, `extract_strings_from_dat:35`, `extract_from_game:81`, `inject_into_game:145`.

## `src/engines/wolf/wolfAdapter.js`

Adapter da família wolf: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.

- Categoria: Produto / ferramenta.
- Base da descrição: Inferência estrutural do adapter.
- Tamanho: 7335 bytes; linhas: 219.
- Leitura: texto completo decodificado.
- SHA-256: `8f96eeb517870c284388f3ab9419954815194c2925cb4d748a19cd1d1f709e83`.
- Assinaturas localizadas (nome:linha): `WolfAdapter:19`, `getDetailedDeclaration:28`, `getPythonBin:45`, `getCapabilities:50`, `extract:67`, `validate:107`, `apply:111`, `rollback:195`.
- Imports literais: `fs`, `path`, `child_process`, `../../core/baseEngineAdapter`, `../../core/codeProtector`, `../../core/backupManager`, `../rollbackResult.js`, `../../utils/pythonResolver`.
- Referenciado estaticamente por: `src/core/engineRegistry.js`, `tests/regression/cancellation_safety.test.js`, `tests/regression/multi_engine_isolation.test.js`, `tests/regression/wolf_real_pipeline.test.js`, `tests/test_adapters_live.js`, `tests/test_multi_game_pipeline.js`.

## `src/extractors/extractor.js`

Leitura e extração de texto e dados de formatos de jogos. Descrição declarada no cabeçalho: extractor.js — Módulo de Extração de Textos e Processamento Estrutural Responsabilidades: - Extração de texto de múltiplos formatos de jogos (JSON RPG Maker, scripts, diálogos)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 29380 bytes; linhas: 936.
- Leitura: texto completo decodificado.
- SHA-256: `ec52faf901961f7bec31620f5cf68fdda80ec8bcfee465d62d179a53c8fc3e05`.
- Assinaturas localizadas (nome:linha): `isShortParamName:156`, `isJsCode:170`, `extractEscapeCodes:197`, `restoreEscapeCodes:217`, `TextExtractor:239`, `buildMediaIndex:248`, `extract:284`, `walk:323`, `checkString:350`, `addTextEntry:489`, `extractTextsFromJsCode:502`, `extractFromPlugins:546`, `extractParam:562`, `extractParamObject:610`, `extractFromPluginScripts:642`, `extractFromTilesetTxt:702`, `extractFromCsv:768`, `extractFromHtml:866`, `extractGameTexts:896`, `addText:900`, `extractTextsFromJsCode:913`.
- Imports literais: `fs`, `path`, `../utils/utils`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `src/engines/rpgmaker/rpgMakerAdapter.js`, `src/services/rpcHandlers.js`, `tests/regression/real_game_launch_smoke.test.js`, `tools/cli-compat.js`.

## `src/mediaExtractor/BaseMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 5127 bytes; linhas: 162.
- Leitura: texto completo decodificado.
- SHA-256: `e0c27d489d3a2cf4b4c188cb5eedc2b58c9bba8b7d0654d1edf0ab12cdabba1e`.
- Assinaturas localizadas (nome:linha): `BaseMediaExtractor:3`, `isMatchingAsset:16`, `copyFileSafe:24`, `scanLooseFiles:66`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/mediaExtractor/GenericMediaExtractor.js`, `src/mediaExtractor/RPGMakerMediaExtractor.js`, `src/mediaExtractor/RenPyMediaExtractor.js`, `src/mediaExtractor/UnityMediaExtractor.js`, `src/mediaExtractor/UnrealMediaExtractor.js`, `src/mediaExtractor/WolfRPGMediaExtractor.js`.

## `src/mediaExtractor/extract_rpa_helper.py`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 6866 bytes; linhas: 173.
- Leitura: texto completo decodificado.
- SHA-256: `2031cf86050024178357639873e2c7baf378d641f5f5b6562926e6fc27629ad0`.
- Assinaturas localizadas (nome:linha): `extract_rpa:28`.

## `src/mediaExtractor/extract_unity_helper.py`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 10712 bytes; linhas: 248.
- Leitura: texto completo decodificado.
- SHA-256: `60e69348a8ce020956d9c3ac700e5c6b5aa629fe61c9ccdf44d639584b2dd43a`.
- Assinaturas localizadas (nome:linha): `sanitize_name:14`, `main:19`.

## `src/mediaExtractor/GenericMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1847 bytes; linhas: 55.
- Leitura: texto completo decodificado.
- SHA-256: `e57ca080b0108508e768d4f1ee75cd4a5bbd17b762c983046e8796fec505bb93`.
- Assinaturas localizadas (nome:linha): `GenericMediaExtractor:2`, `extract:7`.
- Imports literais: `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/index.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 3173 bytes; linhas: 96.
- Leitura: texto completo decodificado.
- SHA-256: `10503d367d787025f3041712c1ed3f331e77ac2bffdec61dd31e7d633c7d6dd8`.
- Assinaturas localizadas (nome:linha): `ImageExtractorFactory:11`, `getExtractor:13`, `extractMedia:33`.
- Imports literais: `fs`, `path`, `../core/engineDetector`, `./RenPyMediaExtractor`, `./RPGMakerMediaExtractor`, `./UnityMediaExtractor`, `./WolfRPGMediaExtractor`, `./UnrealMediaExtractor`, `./GenericMediaExtractor`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`.

## `src/mediaExtractor/RenPyMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 7073 bytes; linhas: 197.
- Leitura: texto completo decodificado.
- SHA-256: `74f7109a31259954a93e48874e7816c220529099a3fc52fec70d94683f913c27`.
- Assinaturas localizadas (nome:linha): `RenPyMediaExtractor:5`, `getPythonExecutable:10`, `extract:17`.
- Imports literais: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/RPGMakerMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 8453 bytes; linhas: 222.
- Leitura: texto completo decodificado.
- SHA-256: `a7dd1f919a43580b1582ddbe445adb3676fc3535ca44d62485bcff0bc987e843`.
- Assinaturas localizadas (nome:linha): `RPGMakerMediaExtractor:4`, `loadEncryptionKey:9`, `extract:32`.
- Imports literais: `fs`, `path`, `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/UnityMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 9046 bytes; linhas: 249.
- Leitura: texto completo decodificado.
- SHA-256: `20536746f9ce1fd3779bad6056c7308b083786d69e2701f1bc3477afbcef19c7`.
- Assinaturas localizadas (nome:linha): `UnityMediaExtractor:5`, `getPythonExecutionConfig:10`, `extract:84`.
- Imports literais: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/UnrealMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 4823 bytes; linhas: 124.
- Leitura: texto completo decodificado.
- SHA-256: `a0c0ad4bbe6ac46fbd4e7ba5c10c77cb74c04d4ef746fb8020c0f17191088a6b`.
- Assinaturas localizadas (nome:linha): `UnrealMediaExtractor:5`, `extract:10`.
- Imports literais: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/mediaExtractor/WolfRPGMediaExtractor.js`

Extração de recursos multimídia; não equivale à tradução de texto em imagens. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 3433 bytes; linhas: 100.
- Leitura: texto completo decodificado.
- SHA-256: `f14472e287cda3afe3f8538b81ab4c708b402b446acd665ed84653989ee03948`.
- Assinaturas localizadas (nome:linha): `WolfRPGMediaExtractor:5`, `extract:10`.
- Imports literais: `fs`, `path`, `child_process`, `./BaseMediaExtractor`.
- Referenciado estaticamente por: `src/mediaExtractor/index.js`.

## `src/ocr/ocrProvider.js`

Reconhecimento óptico de texto e integração de captura. Descrição declarada no cabeçalho: OpenTranslator — OCRProvider 2.0 Módulo de OCR com regiões adaptativas (dialogue, subtitle, menu), filtro de estabilidade de frames (debounce para digitação) e cache por hash de região.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4651 bytes; linhas: 144.
- Leitura: texto completo decodificado.
- SHA-256: `a103ea73375674437c5bc6e3b4a203d5e28c8446a2d541a55b8b9a33d1ade07a`.
- Assinaturas localizadas (nome:linha): `OCRProvider:11`, `getImageHash:21`, `getPresetBounds:29`, `captureGameWindow:65`, `processFrame:102`, `setCache:137`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`.

## `src/providers/translationProviderRegistry.js`

Provedores especializados e integrações de tradução por formato/engine. Descrição declarada no cabeçalho: OpenTranslator - TranslationProviderRegistry Registro formal e unificado de provedores de tradução: - LocalDictionaryProvider (LAB_TRANSLATION_PROVIDER determinístico)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 10165 bytes; linhas: 290.
- Leitura: texto completo decodificado.
- SHA-256: `ca660c796c87c03f376e5c46e8c014e25feb22881f07efd766e2f690bc204c31`.
- Assinaturas localizadas (nome:linha): `TranslationProviderRegistry:33`, `register:55`, `get:75`, `setActiveProvider:79`, `_finalize:87`, `translate:112`, `_executeCompositeTranslation:146`, `translateBatch:230`, `checkHealth:257`.
- Imports literais: `../core/translationResult`.
- Referenciado estaticamente por: `tests/regression/run-product-runtime-test.js`, `tests/regression/run-real-staged-game-test.js`.

## `src/runtime/hookProvider.js`

Contratos, resolução e integração de componentes de tempo de execução. Descrição declarada no cabeçalho: OpenTranslator — HookProvider Camada profissional de Hook em Runtime para processos nativos (x86 e x64): - Capabilities: capture, replace, restore, observe, detach, healthcheck

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 14348 bytes; linhas: 434.
- Leitura: texto completo decodificado.
- SHA-256: `956615ff30b781eb8c586b90a427094c38af9649394aeef46d0459b62be53191`.
- Assinaturas localizadas (nome:linha): `HookProvider:13`, `getCapabilities:43`, `attach:63`, `optionsTarget:155`, `verify:177`, `_startMonitoring:232`, `onTextCaptured:242`, `replaceText:281`, `restoreText:338`, `detach:387`, `cleanup:406`, `healthcheck:421`.
- Imports literais: `events`, `../core/textObjectIdentity`.
- Referenciado estaticamente por: `tests/regression/run-phase6-tests.js`.

## `src/runtime/providers/runtimeProviders.js`

Contratos, resolução e integração de componentes de tempo de execução. Descrição declarada no cabeçalho: A implementação anterior era: async observeProcess(pid) { return { ok: true, provider: this.name, pid, observed: true };

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6926 bytes; linhas: 211.
- Leitura: texto completo decodificado.
- SHA-256: `67595614edfc7d9f6580da89eb720186b7acae763b1fbe4142a791a764756484`.
- Assinaturas localizadas (nome:linha): `processoVivo:29`, `BaseRuntimeProvider:50`, `getCapabilities:66`, `observeProcess:75`, `GenericRuntimeProvider:161`, `UnityMonoProvider:168`, `UnityIL2CPPProvider:175`, `V8Provider:182`, `PythonProvider:188`, `RubyProvider:194`.

## `src/runtime/runtimeEventBus.js`

Contratos, resolução e integração de componentes de tempo de execução. Descrição declarada no cabeçalho: RuntimeEventBus: Centralized event broker for all runtime and diagnostic events. Events: - PROCESS_STARTED: { pid, name, path, arch }

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1469 bytes; linhas: 53.
- Leitura: texto completo decodificado.
- SHA-256: `c84f69044be92a956c9892d752a4e3786b6829cfc799b0e82454c218e5ef6d90`.
- Assinaturas localizadas (nome:linha): `RuntimeEventBus:17`, `emitEvent:23`, `getRecentEvents:38`, `clearHistory:46`.
- Imports literais: `events`.
- Referenciado estaticamente por: `src/runtime/universalRuntimeHost.js`, `tests/regression/run-phase4a-tests.js`.

## `src/runtime/textFrameworkProvider.js`

Contratos, resolução e integração de componentes de tempo de execução. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1586 bytes; linhas: 58.
- Leitura: texto completo decodificado.
- SHA-256: `f74af373936df3da09e3a15e01ba11b48ddb5adc45b25ede7713fbc2447ebacb`.
- Assinaturas localizadas (nome:linha): `TextFrameworkProvider:1`, `discover:2`, `DOMTextProvider:29`, `createMutationObserverScript:31`.

## `src/runtime/universalOverlay.js`

Contratos, resolução e integração de componentes de tempo de execução. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1921 bytes; linhas: 64.
- Leitura: texto completo decodificado.
- SHA-256: `6d0836279a552b28111bfbbb410fe0d847a9de240e31d3741b0a3d1299900e69`.
- Assinaturas localizadas (nome:linha): `UniversalOverlay:1`, `createSession:5`, `addTextRegion:18`, `closeSession:37`.
- Referenciado estaticamente por: `tests/regression/run-phase5-tests.js`.

## `src/runtime/universalRuntimeHost.js`

Contratos, resolução e integração de componentes de tempo de execução. Descrição declarada no cabeçalho: UniversalRuntimeHost Central coordinator for runtime observation, telemetry, and per-engine providers. ARCHITECTURAL DECISION (Phase 4A Audit):

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 4651 bytes; linhas: 138.
- Leitura: texto completo decodificado.
- SHA-256: `1d69489a3d54d120664291b0d352de7519f1f797a79d6a29cd5e04ddec7e0002`.
- Assinaturas localizadas (nome:linha): `UniversalRuntimeHost:21`, `registerProvider:27`, `getProvider:31`, `startSession:39`, `observeTick:82`, `stopSession:103`, `getStatus:126`.
- Imports literais: `path`, `./runtimeEventBus`, `../diagnostics/processInspector`, `../diagnostics/logIntelligence`, `../diagnostics/errorAnalyzer`.
- Referenciado estaticamente por: `tests/regression/run-phase4a-tests.js`.

## `src/security/sessionGuard.js`

Emite/valida token e restringe a sessão HTTP local por origem e host.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 6956 bytes; linhas: 210.
- Leitura: texto completo decodificado.
- SHA-256: `d4b62074f71c95a4ce0f8192e86c19d7b426e6b8ab1f759bc8f921449afe288d`.
- Assinaturas localizadas (nome:linha): `mintSessionToken:40`, `timingSafeEqualStrings:45`, `hostnameOf:61`, `validateHost:76`, `validateOrigin:96`, `validateToken:120`, `newRequestId:140`, `guardRequest:153`, `corsHeaders:186`.
- Imports literais: `crypto`.
- Referenciado estaticamente por: `src/services/httpServer.js`.

## `src/security/staticAssetPolicy.js`

Resolve caminhos de arquivos HTTP e restringe os recursos que podem ser expostos.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 7044 bytes; linhas: 187.
- Leitura: texto completo decodificado.
- SHA-256: `f7f9c70990febb79451e9c6295349d4cf2b1126be4c24843d941546273a3339d`.
- Assinaturas localizadas (nome:linha): `isUiAssetServable:70`, `resolveStaticAsset:85`, `isInside:129`, `contentTypeFor:160`, `listServedUrls:167`.
- Imports literais: `path`, `fs`.
- Referenciado estaticamente por: `src/services/httpServer.js`.

## `src/services/cache.js`

Persistência de preferências e glossário, banco de cache de tradução e operações de migração/fechamento.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 25566 bytes; linhas: 666.
- Leitura: texto completo decodificado.
- SHA-256: `36f5a1a9f8792e60f86144c6dd0f7676c177af019a64726709703aaa87e1c4de`.
- Assinaturas localizadas (nome:linha): `ensureDataDir:69`, `getStorageStatus:118`, `closeDb:132`, `migrateJsonCacheToSqlite:169`, `loadGlobalCacheForLang:261`, `saveNewGlobalTranslations:302`, `writeJsonAtomic:433`, `runMigrationIfRequested:500`, `loadCommonTranslations:509`, `getCommonTranslation:536`, `loadGlossary:584`, `saveGlossary:607`, `loadCfg:615`, `saveCfg:637`.
- Imports literais: `fs`, `path`, `../utils/utils`, `../core/scriptDetector`, `better-sqlite3`, `./cache`.
- Referenciado estaticamente por: `server.js`, `src/core/coverageGuarantor.js`, `src/core/gameEngine.js`, `src/core/realProviderBenchmark.js`, `src/core/shutdownCoordinator.js`, `src/core/translationPipeline.js`, `src/services/cache.js`, `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `src/translation/translator.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/explicitProviderChoice.test.js`, `tests/unit/hookLifecycle.test.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`, `tools/translate-locres.js`.

## `src/services/cheatServer.js`

Servidor de hooks HTTP/WebSocket: recebe estado de runtime, entrega comandos e atende tradução em tempo de execução.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 17483 bytes; linhas: 474.
- Leitura: texto completo decodificado.
- SHA-256: `870037fe5ff2beac8fa989d74f577dc7fe9b951f50ff1fa758d2977afa257011`.
- Assinaturas localizadas (nome:linha): `safeLog:31`, `isAllowedHookOrigin:47`, `isAllowedWsOrigin:71`, `applyHookCors:82`, `parseTranslationPayload:100`, `processRuntimeText:133`, `startHookServer:141`, `stopHookServer:442`.
- Imports literais: `http`, `ws`, `../translation/translator`, `./cache`, `../core/runtimeTextManager`, `../core/shutdownCoordinator`.
- Referenciado estaticamente por: `server.js`, `src/core/shutdownCoordinator.js`, `tests/unit/cheatRoundTrip.test.js`, `tests/unit/cheatServerContract.test.js`, `tests/unit/hookLifecycle.test.js`.

## `src/services/httpServer.js`

Transporte HTTP local: bootstrap da sessão, RPC, heartbeat, encerramento e entrega controlada de arquivos da interface.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 17458 bytes; linhas: 456.
- Leitura: texto completo decodificado.
- SHA-256: `bd15df2c5d4c60cc773d5b44a6f15733651190f35e87b1be6ce910acccc49011`.
- Assinaturas localizadas (nome:linha): `logInternal:56`, `terminateAllProcessesAndExit:70`, `tryListen:374`, `openBrowser:410`.
- Imports literais: `http`, `fs`, `path`, `child_process`, `../security/sessionGuard`, `../security/staticAssetPolicy`, `./rpcHandlers`, `../core/shutdownCoordinator`.
- Referenciado estaticamente por: `server.js`, `src/core/shutdownCoordinator.js`.

## `src/services/rpcHandlers.js`

Catálogo de operações chamadas pela interface: jogos, tradução, backups, diagnóstico, memória, variáveis e cheats.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 96670 bytes; linhas: 2496.
- Leitura: texto completo decodificado.
- SHA-256: `02dc1091636f435cdff2394d82d3d4da7b320d478b7007754bc9cfcf6d186106`.
- Assinaturas localizadas (nome:linha): `sanitizePath:25`, `sanitizeKey:32`, `resolveGameDir:38`, `ping:93`, `decryptImages:98`, `extractImages:131`, `extractAudio:134`, `patchGameFont:137`, `clearGlobalCache:250`, `loadCfg:332`, `getLogs:335`, `heartbeat:339`, `saveCfg:344`, `loadGames:347`, `saveGame:363`, `addGameByPath:379`, `delGame:410`, `detectEngine:424`, `testRenpyCompatibility:427`, `launchGame:520`, `checkGame:801`, `listSaves:804`, `openSave:837`, `deleteSave:867`, `openSaveFolder:900`, `deleteGameCache:948`, `rollbackGame:996`, `restoreOriginalData:1006`, `exportGameTexts:1170`, `sendCheatCommand:1205`, `getGameState:1256`, `translate:1262`, `log:1265`, `engineInfo:1284`, `findGame:1306`, `resolveShortcut:1333`, `loadGlossary:1357`, `saveGlossary:1360`, `translateWithEngine:1364`, `installOverlay:1390`, `installUnity:1491`, `extractRpa:1585`, `packRpa:1601`, `decompileRpyc:1620`, `translateRpgMaker:1637`, `extractWolf:1662`, `packWolf:1700`, `unpackEvb:1746`, `exportExcel:1779`, `importExcel:1887`, `analyzeGame:1982`, `dryRunGame:1986`, `startTranslationJob:1990`, `getJobStatus:1994`, `listTranslationJobs:1997`, `runSelfTest:2000`, `exportDiagnosticBundle:2003`, `getTriadInfo:2006`, `runtimeStartSession:2029`, `runtimeStopSession:2045`, `runtimeProbe:2058`, `runtimeCaptureScreen:2064`, `routerRecommend:2070`, `stagingPrepare:2076`, `stagingCleanup:2082`, `evidenceList:2088`, `getProviderHealth:2094`, `getRenpyAppDataStatus:2105`, `unpackAll:2156`, `unpackRenpyFull:2187`, `scanGameVariables:2200`, `setGameVar:2254`, `getCapabilityMatrix:2296`, `runSpeedBenchmark:2306`, `getJobTelemetry:2320`, `resumeTranslationJob:2334`, `detectUntranslated:2341`, `runVisualQA:2365`, `getRuntimeTexts:2379`, `promoteRuntimeText:2385`, `calculateVersionDiff:2391`, `getHierarchicalGlossary:2397`, `verifyAndDiagnoseGame:2413`.
- Imports literais: `../core/gameService`, `../core/engineDetector`, `./rpcResponse`, `fs`, `path`, `child_process`, `../core/gameEngine`, `../extractors/extractor`, `./cache`, `../translation/translator`, `../mediaExtractor/index`, `../engines/renpy/adapter/renpyAdapter`, `../core/shutdownCoordinator`, `../core/translationPipeline`, `../core/ownedProcessRegistry`, `os`, `../engines/rpgmaker/rpgMakerPluginsFile`, `exceljs`, `../core/engineRuntimeTriad`, `../core/runtimeSessionManager`, `../core/runtimeProbe`, `../core/screenCapture`, `../core/translationRuntimeRouter`, `../core/stagingPolicy`, `../core/capabilityEvidenceAggregator`, `../core/globalCircuitBreaker`, `../core/engineRoutingGuard`, `../discovery/renpyAppDataResolver`, `../core/engineCapabilityMatrix`, `../../config/engineCompatibility.json`, `../core/speedBenchmark`, `../core/jobPersistence`, `../core/untranslatedDetector`, `../core/visualQAEngine`, `../core/runtimeTextManager`, `../core/jobSystem`, `../core/hierarchicalGlossary`.
- Referenciado estaticamente por: `src/services/httpServer.js`, `tests/unit/cheatRoundTrip.test.js`.

## `src/services/rpcResponse.js`

Padroniza respostas de sucesso, bloqueio, falha e entrada inválida do RPC.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 3931 bytes; linhas: 121.
- Leitura: texto completo decodificado.
- SHA-256: `9efe4644d052401d06717d328bdf0e0ddea6d66acf1731e1f33eccd55b72db51`.
- Assinaturas localizadas (nome:linha): `ok:28`, `unimplemented:35`, `invalidInput:47`, `notFound:52`, `notConnected:57`, `blocked:62`, `failed:67`, `sanitizeLogLevel:76`, `countChanged:91`.
- Referenciado estaticamente por: `src/services/rpcHandlers.js`.

## `src/signatures/engines/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 5842 bytes; linhas: 285.
- Leitura: texto completo decodificado.
- SHA-256: `ff40d818f679ab35cbe8abe4b244e26c0639a7ed1c22b0e8a225948321746d8f`.

## `src/signatures/packaging/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1083 bytes; linhas: 62.
- Leitura: texto completo decodificado.
- SHA-256: `1e3bdac2b59fd90ed6518deba366d3c6c7765ba27fec386a3c062adaee666360`.

## `src/signatures/renderers/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 815 bytes; linhas: 49.
- Leitura: texto completo decodificado.
- SHA-256: `ab683eeb81bacde755716a22b043a4ec8f533d5f5465e240e350d5ebfe2620c7`.

## `src/signatures/runtimes/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1334 bytes; linhas: 74.
- Leitura: texto completo decodificado.
- SHA-256: `f3b8373c465bb449b44f294b18b0e0502d8ec2eea5d1c27eedf5d9e1dfbdc64b`.

## `src/signatures/textSystems/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1162 bytes; linhas: 58.
- Leitura: texto completo decodificado.
- SHA-256: `fb54a7faf5a910c4b1c3bb4f775c8d8900f9bc8befc8a5fa4960078c7b84cc5a`.

## `src/signatures/uiFrameworks/signatures.json`

Assinaturas para identificação de executáveis e tecnologias. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 738 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `20ea0037b5b9938ddabd08bcace7e360f6fcb465199f9a121b951093a7d7e12e`.

## `src/translation/extraction/buildUniverse.js`

Constrói o universo extraído/classificado usado para contabilizar cobertura sem confundir lista parcial com jogo completo.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 3405 bytes; linhas: 89.
- Leitura: texto completo decodificado.
- SHA-256: `76c6ee79327c4b57512fe3f58082623b3e2982423637fa9c391957e11880cc26`.
- Assinaturas localizadas (nome:linha): `buildUniverse:24`.
- Referenciado estaticamente por: `src/core/translationPipeline.js`.

## `src/translation/translator.js`

Executa tradução individual/em lote por provedores, controlando limites, cache, glossário e proteção de tokens.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 50499 bytes; linhas: 1345.
- Leitura: texto completo decodificado.
- SHA-256: `954fc63bb2a0099c6499f0e15580edf563cb9e9d91f79bb4195031aa6baa5227`.
- Assinaturas localizadas (nome:linha): `startCaptchaCallbackServer:38`, `setTimeout:62`, `openCaptchaSolver:64`, `getAvailableEngines:112`, `triggerSmartSwitch:121`, `checkRecoveryTimers:126`, `protectProperNames:135`, `restoreProperNames:139`, `fixTranslation:144`, `detectLang:156`, `getRandomUA:163`, `applyGlossaryPost:172`, `limitConcurrency:188`, `getBingToken:205`, `translateBingSingle:247`, `translateBingSingleRaw:256`, `translateBingBatch:327`, `translateLlm:361`, `translateDeepL:464`, `translateLlmBatchUnique:501`, `translateDeepLBatchUnique:531`, `translateMultiBatch:557`, `translateBatch:561`, `translateGoogleMobileSingle:965`, `translateGoogleMobileBatch:1023`, `translateSingle:1055`, `translateSingleWithFallback:1081`, `translateSingleRawGoogle:1124`, `translateMultiSingle:1216`, `translatePapagoSingle:1222`, `translateMyMemoryOne:1262`, `translateYandexSingle:1296`, `clearEngineBans:1323`.
- Imports literais: `../core/globalCircuitBreaker`, `../core/providerGateway`, `../core/providerHttp`, `../core/providerErrorClassifier`, `../core/logDeduplicator`, `../core/textChunker`, `path`, `https`, `child_process`, `../services/cache`, `http`, `querystring`.
- Referenciado estaticamente por: `src/core/coverageGuarantor.js`, `src/core/gameEngine.js`, `src/core/translationPipeline.js`, `src/services/cheatServer.js`, `src/services/rpcHandlers.js`, `tests/test_coverage_guarantor_and_cache_integrity.test.js`, `tests/unit/explicitProviderChoice.test.js`, `tools/cli-compat.js`, `tools/translate-locres.js`.

## `src/utils/logger.js`

Resolução de caminhos, Python, logs e utilidades compartilhadas. Descrição declarada no cabeçalho: OpenTranslator — Bridge Logger Legacy to LoggerManager

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 352 bytes; linhas: 16.
- Leitura: texto completo decodificado.
- SHA-256: `e9bf254f65e47d0df56f6e3bbd0ee2cf2fe9d54a451e2a6200d19536bc159fd6`.
- Imports literais: `./loggerManager`.
- Referenciado estaticamente por: `server.js`, `tools/cli-compat.js`, `tools/run-pipeline-cli.js`.

## `src/utils/loggerManager.js`

Resolução de caminhos, Python, logs e utilidades compartilhadas. Descrição declarada no cabeçalho: loggerManager.js — Gerenciador Centralizado de Logging e Telemetria Responsabilidades: - Captura e formatação de logs com timestamp em fuso horário local

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6897 bytes; linhas: 210.
- Leitura: texto completo decodificado.
- SHA-256: `b487d8fb6e05a9594f52570c264123420b67deef55f0101c285942bd781ee0c5`.
- Assinaturas localizadas (nome:linha): `getLocalTimestamp:22`, `LoggerManager:34`, `setLogPath:50`, `getCallerInfo:65`, `log:117`, `info:200`, `warn:202`, `error:203`, `debug:204`, `success:205`.
- Imports literais: `fs`, `path`, `util`.
- Referenciado estaticamente por: `server.js`, `src/discovery/renpyAppDataResolver.js`, `src/engines/renpy/renpyV7Handler.js`, `src/engines/renpy/renpyV8Handler.js`, `src/utils/logger.js`, `src/utils/utils.js`.

## `src/utils/pythonResolver.js`

Resolução de caminhos, Python, logs e utilidades compartilhadas. Descrição declarada no cabeçalho: pythonResolver.js — Resolução Dinâmica e Universal do Ambiente Python Responsabilidades: - Localizar executáveis Python válidos no sistema operacional de forma dinâmica e portável

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 2108 bytes; linhas: 69.
- Leitura: texto completo decodificado.
- SHA-256: `d18df84d7e881275452cea1e37319733e6e59464449126741a8308044555cfad`.
- Assinaturas localizadas (nome:linha): `resolvePythonBinary:15`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `src/engines/godot/godotAdapter.js`, `src/engines/rpgmaker/rpgMakerRubyHandler.js`, `src/engines/unity/unityAdapter.js`, `src/engines/wolf/wolfAdapter.js`, `tests/unit/projectCleanup.test.js`, `tools/maintenance/cleanup_project.js`.

## `src/utils/resourceResolver.js`

Resolução de caminhos, Python, logs e utilidades compartilhadas. Descrição declarada no cabeçalho: ResourceResolver: Central deterministic path resolver for OpenTranslator. Eliminates all brittle hardcoded paths across the application.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 1671 bytes; linhas: 58.
- Leitura: texto completo decodificado.
- SHA-256: `0dcc0f8c4ab71156cc7d1ae472c9d8c2484de92571fcdd207cba5aa9fc6c5af8`.
- Assinaturas localizadas (nome:linha): `ResourceResolver:8`, `getRootDir:16`, `getToolDir:18`, `getDataDir:19`, `getDocsDir:20`, `getLoadersDir:21`, `getDatabaseDir:25`, `getLogsDir:31`, `getStagingDir:37`, `getTransactionsDir:43`, `getProfilesDir:49`.
- Imports literais: `path`, `fs`.
- Referenciado estaticamente por: `tests/unit/auditContracts.test.js`.

## `src/utils/utils.js`

Resolução de caminhos, Python, logs e utilidades compartilhadas. Descrição declarada no cabeçalho: utils.js — Módulo de Utilidades Compartilhadas e Constantes Estruturais Responsabilidades: - Centralização de regexes de filtragem de mídias, recursos e escape codes

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 6308 bytes; linhas: 187.
- Leitura: texto completo decodificado.
- SHA-256: `2da3e6005e5cc157dacd80588d10e412adc619f4237c72899eb4bd0f90059d3b`.
- Assinaturas localizadas (nome:linha): `logWarn:34`, `findDataDir:42`, `getValueAtPath:64`, `getLastRealKey:76`, `isTranslatableText:84`, `loadSyntaxRules:117`, `isCodeOrFormulaKey:134`, `isAudioParamKey:159`.
- Imports literais: `fs`, `path`, `./loggerManager`.
- Referenciado estaticamente por: `src/core/gameEngine.js`, `src/extractors/extractor.js`, `src/services/cache.js`.

## `tests/check_damage.js`

Teste ou roteiro check_damage.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1590 bytes; linhas: 39.
- Leitura: texto completo decodificado.
- SHA-256: `42b015c7d239e7418826353ada2c8aedf94f704884a5d8ab7401ff952bb64fe6`.
- Imports literais: `fs`, `path`.

## `tests/check_e07.js`

Teste ou roteiro check_e07.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1283 bytes; linhas: 37.
- Leitura: texto completo decodificado.
- SHA-256: `8b5bf9d5835824cde04754f243daa9a2298b2fda61b8d1c826ee00a92e7f216f`.
- Imports literais: `fs`, `path`, `../src/engines/renpy/renpyCommon`.

## `tests/fixtures/runtime-fixture/fixture.js`

Teste ou roteiro fixture.js: OpenTranslator - ProductRuntimeFixture Processo real e independente utilizado exclusivamente para validação factual do ciclo de vida de runtime do OpenTranslator (RuntimeSessionManager, RuntimeProbe,

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2319 bytes; linhas: 78.
- Leitura: texto completo decodificado.
- SHA-256: `6315223e07869f6e52554b398c5aae0a9189fd02d428a35019a16c12fbd1a4d2`.
- Imports literais: `http`.

## `tests/index.js`

Runner registrado de testes: separa suítes em processos, seleciona grupos e verifica os resumos.

- Categoria: Teste / laboratório.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 12482 bytes; linhas: 336.
- Leitura: texto completo decodificado.
- SHA-256: `74af50c16cc051771e3736b5b07bfdd6389bdb7d2401856429c9eea9a8045016`.
- Assinaturas localizadas (nome:linha): `parseArgs:223`, `runSuite:236`, `Number:256`, `main:261`.
- Imports literais: `fs`, `path`, `child_process`.
- Referenciado estaticamente por: `tests/unit/auditContracts.test.js`.

## `tests/integration/test_translation_providers.js`

Teste ou roteiro test_translation_providers.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1202 bytes; linhas: 41.
- Leitura: texto completo decodificado.
- SHA-256: `314260bf5479259857b90be88be73096eba7c1a3d317750e83b618a2ef02f8a8`.
- Assinaturas localizadas (nome:linha): `testEngine:17`.
- Imports literais: `https`.

## `tests/mv_full_regression.test.js`

Teste ou roteiro mv_full_regression.test.js: scratch_mv_full_regression.js — Suíte de Regressão Obrigatória da Família RPG Maker MV Executa testes forenses em ambos os jogos consolidados: 1. Toki kan Yuusha (gitgud)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11347 bytes; linhas: 299.
- Leitura: texto completo decodificado.
- SHA-256: `36a57c3b2e5d8f1b07edfa33f09334f8cc8c5e6810681a6f1f3b9a9c0ce51dae`.
- Assinaturas localizadas (nome:linha): `getSha256:28`, `sleep:32`, `killGame:36`, `startControlServer:43`, `stopControlServer:79`, `runTokiRegression:86`, `runRjRegression:176`, `main:273`.
- Imports literais: `fs`, `path`, `http`, `crypto`, `child_process`.

## `tests/real_ui_certification_runner.js`

Teste ou roteiro real_ui_certification_runner.js: OpenTranslator — Real UI Certification Runner (CDP) Executor genérico e universal para certificação forense real via Chrome DevTools Protocol. Interage diretamente com a interface web real (http://localhost:8080) através de eventos DOM

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 31585 bytes; linhas: 714.
- Leitura: texto completo decodificado.
- SHA-256: `6e2177440ae5dc4d9372a5f19ff30cf07d7cacb2344f700fc152766cad0f230f`.
- Assinaturas localizadas (nome:linha): `sleep:25`, `CdpDriver:29`, `connect:39`, `send:81`, `eval:89`, `captureScreenshot:101`, `close:109`, `RealUiCertificationRunner:116`, `initDriver:125`, `closeDriver:132`, `certifyGame:145`, `saveSessionArtifacts:541`.
- Imports literais: `fs`, `path`, `ws`, `child_process`, `../src/core/backupManager`, `../src/core/engineDetector`, `../src/core/libraryDiscovery`, `../src/core/engineRegistry`, `../src/core/gameService`.
- Referenciado estaticamente por: `tests/test_game_compatibility.js`.

## `tests/regression/adaptive_concurrency.test.js`

Teste ou roteiro adaptive_concurrency.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1474 bytes; linhas: 42.
- Leitura: texto completo decodificado.
- SHA-256: `302219f2c28c4917f126087b35931bca5ce0d6ac772e37b8ab338b176b7a1721`.
- Imports literais: `assert`, `../../src/core/adaptiveConcurrency`.

## `tests/regression/bugs_regression.test.js`

Teste ou roteiro bugs_regression.test.js: OpenTranslator — Passo 19: Regressão dos Bugs Anteriores (BUG-01 a BUG-06) Cada teste contém: reproduction, before, fix, after, assertion, result.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11353 bytes; linhas: 224.
- Leitura: texto completo decodificado.
- SHA-256: `3a14db95379d49772972acad5e8f8e3b1ecd2d80c645d7c6919f32df6b9023bf`.
- Assinaturas localizadas (nome:linha): `runBugRegressions:15`.
- Imports literais: `fs`, `path`, `assert`, `../../src/engines/renpy/injector/renpyInjector`, `../../src/engines/renpy/runtime/renpyRuntime`, `../../src/core/backupManager`, `../../src/core/codeProtector`, `../../src/core/engineCapabilityMatrix`.

## `tests/regression/cancellation_safety.test.js`

Teste ou roteiro cancellation_safety.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3406 bytes; linhas: 84.
- Leitura: texto completo decodificado.
- SHA-256: `9b712e1999257f146ad92cb00cfe91558be4beb674cd25a17334cd089f1f8396`.
- Assinaturas localizadas (nome:linha): `getSha256:6`, `testCancellationAndFailureSafety:18`.
- Imports literais: `fs`, `path`, `crypto`, `../../src/engines/godot/godotAdapter`, `../../src/engines/wolf/wolfAdapter`.

## `tests/regression/circuit_breaker_100_workers.test.js`

Teste ou roteiro circuit_breaker_100_workers.test.js: OpenTranslator — circuit_breaker_100_workers.test.js Testa contenção extrema com 100 workers simultâneos durante HALF_OPEN. Garante:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2199 bytes; linhas: 54.
- Leitura: texto completo decodificado.
- SHA-256: `4cc10bbc1468bd8ef2261f08c0b4b7ee7e2f482e5ec3062a7d3d782aea610dbb`.
- Assinaturas localizadas (nome:linha): `run:13`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/completion_state.test.js`

Teste ou roteiro completion_state.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1582 bytes; linhas: 34.
- Leitura: texto completo decodificado.
- SHA-256: `c6c744c7c804926a8eab5186446816a8a22b6c801549c03e11becc7f7b3f6159`.
- Imports literais: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/comprehensive_platform_audit.test.js`

Teste ou roteiro comprehensive_platform_audit.test.js: OpenTranslator — Comprehensive Platform Audit & Verification Test Suite Validação rigorosa dos 32 pilares exigidos pelo usuário: 1. Todos os 14 adapters de engine e seus 13 métodos contratuais

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 19234 bytes; linhas: 425.
- Leitura: texto completo decodificado.
- SHA-256: `1392fad6a119ec6cf41f0ddc2717284f3d458539e082e8a44a7f40be87e23de8`.
- Assinaturas localizadas (nome:linha): `calculateHash:34`, `runAudit:38`, `test:46`, `testAsync:58`.
- Imports literais: `fs`, `path`, `crypto`, `assert`, `../../src/core/engineDetector`, `../../src/core/engineRegistry`, `../../src/core/baseEngineAdapter`, `../../src/core/untranslatedDetector`, `../../src/core/runtimeTextManager`, `../../src/core/visualQAEngine`, `../../src/core/hierarchicalGlossary`, `../../src/core/jobSystem`, `../../src/core/contentLayerManager`, `../../src/core/diagnosticBundle`, `../../src/engines/generic/genericAdapter`.

## `tests/regression/engine_adapter_contract.test.js`

Teste ou roteiro engine_adapter_contract.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1933 bytes; linhas: 35.
- Leitura: texto completo decodificado.
- SHA-256: `b01e6a5c1aa4388deb4466c2961a876867a5eb99264d9b9446148b6c8edbc948`.
- Imports literais: `assert`, `../../src/core/engineRegistry`, `../../src/core/engineCapabilityMatrix`.

## `tests/regression/engine_detection.test.js`

Teste ou roteiro engine_detection.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2916 bytes; linhas: 67.
- Leitura: texto completo decodificado.
- SHA-256: `4d5ff4554d63905cb2c39c8e0dda80f2c66207aefdb3437c1b80ab23fe5bcee3`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/engineDetector`.

## `tests/regression/engine_diagnostic_routing.test.js`

Teste ou roteiro engine_diagnostic_routing.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1679 bytes; linhas: 29.
- Leitura: texto completo decodificado.
- SHA-256: `5d5caaa8a9f8d3e070bdaa8b12fdfa2b341fefe0d6711a3422622e3624a04dca`.
- Imports literais: `assert`, `../../src/core/engineRoutingGuard`, `../../src/discovery/renpyAppDataResolver`.

## `tests/regression/engine_launch_routing.test.js`

Teste ou roteiro engine_launch_routing.test.js: OpenTranslator — engine_launch_routing.test.js Teste de integração de roteamento durante launchGame: Garante que jogos RPG Maker MZ não acionam RenPyAppDataResolver sob nenhuma circunstância.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1661 bytes; linhas: 37.
- Leitura: texto completo decodificado.
- SHA-256: `08597f1780f845e2244bef965853fa6d409a933a8b5001e399b30ff2f94f96af`.
- Assinaturas localizadas (nome:linha): `run:10`.
- Imports literais: `assert`, `../../src/discovery/renpyAppDataResolver`, `../../src/core/engineRoutingGuard`.

## `tests/regression/engine_routing_all_engines.test.js`

Teste ou roteiro engine_routing_all_engines.test.js: OpenTranslator — engine_routing_all_engines.test.js Testa o roteamento de diagnóstico e launch em todas as 4 engines: MZ, Ren'Py, Unity e Generic.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1627 bytes; linhas: 39.
- Leitura: texto completo decodificado.
- SHA-256: `f72cefe4d449c24a8f402ba08f329f7b5d4e2c218ccb3c64af84e11b9b940c1a`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `../../src/discovery/renpyAppDataResolver`, `../../src/core/engineRoutingGuard`.

## `tests/regression/generalization.test.js`

Teste ou roteiro generalization.test.js: Generalization Test Suite for OpenTranslator Universal Engines Proves that Cecil Managed Assembly Bridge and RGSS3A Container Bridge work universally across arbitrary files/directories without title-specific code.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5304 bytes; linhas: 107.
- Leitura: texto completo decodificado.
- SHA-256: `2d839f7b117bc985873aacdc6cd01c38d5e68000a46de320422644dd80b45227`.
- Assinaturas localizadas (nome:linha): `sha256:13`, `run:18`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/unity/unityAdapter`, `../../src/engines/rpgmaker/rgssAdapter`.

## `tests/regression/godot_real_pipeline.test.js`

Teste ou roteiro godot_real_pipeline.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5218 bytes; linhas: 140.
- Leitura: texto completo decodificado.
- SHA-256: `cb5d77b86063491ed4747374e53770d6f90ace760d5ba70e95022e559bf588dc`.
- Assinaturas localizadas (nome:linha): `getSha256:6`, `runGodotPipeline:18`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/godot/godotAdapter`.

## `tests/regression/job_persistence_117k_realistic.test.js`

Teste ou roteiro job_persistence_117k_realistic.test.js: OpenTranslator — job_persistence_117k_realistic.test.js Teste rigoroso de persistência de job com duas suítes independentes: 1. SCENARIO A: Volume do Log Histórico (60.169 + 9.223 + 47.722 = 117.114)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4302 bytes; linhas: 105.
- Leitura: texto completo decodificado.
- SHA-256: `f6178f5b5394edeea84f8264116eeb4c66c2ce1d5dac40d381ccb7fa6ca81c3c`.
- Assinaturas localizadas (nome:linha): `run:13`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/translationAccounting`, `../../src/core/jobPersistence`.

## `tests/regression/lab_phase3_real_apply.js`

Teste ou roteiro lab_phase3_real_apply.js: OpenTranslator — Phase 3 Real-World Apply & Rollback Verification on Sandboxed Copies Testa a cadeia completa em cópias seguras dos jogos do laboratório real: DETECT -> ANALYZE -> STRATEGY -> EXTRACT -> PROTECT -> TRANSLATE -> QA VALIDATE -> APPLY -> POST-PARSE -> ROLLBACK -> HASH RECOVERY

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6559 bytes; linhas: 153.
- Leitura: texto completo decodificado.
- SHA-256: `4bf9b30ed9a78389b7f16345b93b33b6a482e56f73e424874ce023864018293a`.
- Assinaturas localizadas (nome:linha): `hashFile:12`, `copyDirRecursive:18`, `runRealWorldApplyLab:35`.
- Imports literais: `fs`, `path`, `crypto`, `../../src/core/gameService`, `../../src/engines/renpy/renpyParser`.

## `tests/regression/log_deduplication.test.js`

Teste ou roteiro log_deduplication.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1860 bytes; linhas: 43.
- Leitura: texto completo decodificado.
- SHA-256: `bf0a21ac2bff087bfc30b036412fd091bc408f4a56ab685a247d39bba14c8ebc`.
- Imports literais: `assert`, `../../src/core/logDeduplicator`.

## `tests/regression/multi_engine_isolation.test.js`

Teste ou roteiro multi_engine_isolation.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3312 bytes; linhas: 70.
- Leitura: texto completo decodificado.
- SHA-256: `c40943613e0aa0ce692b07f744fd6aa9ddabf2ecd15ef687afeed2fa2554baeb`.
- Assinaturas localizadas (nome:linha): `testMultiEngineIsolation:7`.
- Imports literais: `fs`, `path`, `../../src/engines/unity/unityAdapter`, `../../src/engines/wolf/wolfAdapter`, `../../src/engines/rpgmaker/rgssAdapter`, `../../src/engines/godot/godotAdapter`.

## `tests/regression/placeholder_preservation.test.js`

Teste ou roteiro placeholder_preservation.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2121 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `cb9ad02fb6b4bea1ace086c8159617c76a1536b15bb608e688445ce3e6dd016e`.
- Imports literais: `assert`, `../../src/core/universalTokenEngine`.

## `tests/regression/plugin_rollback.test.js`

Teste ou roteiro plugin_rollback.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1681 bytes; linhas: 47.
- Leitura: texto completo decodificado.
- SHA-256: `d41433b0f6bb0fa45a358c6d540eed46db543cb6fb18825eea4d00d1ab3cac41`.
- Assinaturas localizadas (nome:linha): `run:5`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_runtime_translation.test.js`

Teste ou roteiro plugin_runtime_translation.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 8568 bytes; linhas: 196.
- Leitura: texto completo decodificado.
- SHA-256: `50f1c8abee119363f89cbb79bf4f48c621662e6aa2566ef2f8ead38b13b36586`.
- Assinaturas localizadas (nome:linha): `run:6`.
- Imports literais: `assert`, `fs`, `path`, `vm`, `../../src/core/pluginSafePatcher`, `./testPaths`.

## `tests/regression/plugin_safe_patch.test.js`

Teste ou roteiro plugin_safe_patch.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2900 bytes; linhas: 67.
- Leitura: texto completo decodificado.
- SHA-256: `abb6105d5deeb6b4cbf080f057af4e3502d002029f352a30d51ec2b7753c3cb8`.
- Assinaturas localizadas (nome:linha): `run:5`, `Price:13`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_safe_patcher_integration.test.js`

Teste ou roteiro plugin_safe_patcher_integration.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7167 bytes; linhas: 165.
- Leitura: texto completo decodificado.
- SHA-256: `743bb17f82f7f836327c255d1641499f2e80cc8c912a35c70e334ded720fb246`.
- Assinaturas localizadas (nome:linha): `run:6`.
- Imports literais: `assert`, `fs`, `path`, `vm`, `../../src/core/pluginSafePatcher`, `./testPaths`.

## `tests/regression/plugin_string_extraction.test.js`

Teste ou roteiro plugin_string_extraction.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1696 bytes; linhas: 38.
- Leitura: texto completo decodificado.
- SHA-256: `723238e744720a1b70557494bcb02dff5f0bd91eed7ce9c4abce735635f9b71a`.
- Assinaturas localizadas (nome:linha): `run:3`, `Price:11`.
- Imports literais: `assert`, `../../src/core/pluginSafePatcher`.

## `tests/regression/plugin_syntax_validation.test.js`

Teste ou roteiro plugin_syntax_validation.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1545 bytes; linhas: 37.
- Leitura: texto completo decodificado.
- SHA-256: `556899a021656e20d17494e0bb40f6a54b5e53578faa3cff7ce00cf3c739b588`.
- Assinaturas localizadas (nome:linha): `run:5`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/pluginSafePatcher`.

## `tests/regression/provider_bypass_prevention.test.js`

Teste ou roteiro provider_bypass_prevention.test.js: OpenTranslator — provider_bypass_prevention.test.js Garante que nenhuma chamada a provedor consiga abrir socket sem passar pelo ProviderGateway e Circuit Breaker.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1457 bytes; linhas: 43.
- Leitura: texto completo decodificado.
- SHA-256: `1d4da65f3eb3cb6ead38dab7e813239583ba63de8122d8e942f84144378ea8e1`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerGateway`.

## `tests/regression/provider_circuit_half_open.test.js`

Teste ou roteiro provider_circuit_half_open.test.js: OpenTranslator — provider_circuit_half_open.test.js Testa o protocolo HALF_OPEN com probe de saúde único e backoff exponencial.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2851 bytes; linhas: 64.
- Leitura: texto completo decodificado.
- SHA-256: `2728eee1fff866602ce5fa4335c79e4c53ba4c8de9ce21d3cceccb34a06aa19d`.
- Assinaturas localizadas (nome:linha): `run:8`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_error_classifier.test.js`

Teste ou roteiro provider_error_classifier.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2052 bytes; linhas: 47.
- Leitura: texto completo decodificado.
- SHA-256: `3f5f2b724c7281b647a0ac7876a661a85cf7cc3c718bcc308dbedafe5e48edb9`.
- Imports literais: `assert`, `../../src/core/providerErrorClassifier`.

## `tests/regression/provider_failover.test.js`

Teste ou roteiro provider_failover.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1089 bytes; linhas: 29.
- Leitura: texto completo decodificado.
- SHA-256: `76dc404c36cf6c2f04f970773d978dd90b18cfdae09d09f70ff8fcb52a8e50c3`.
- Imports literais: `assert`, `../../src/core/translationQueue`.

## `tests/regression/provider_failover_strict.test.js`

Teste ou roteiro provider_failover_strict.test.js: OpenTranslator — provider_failover_strict.test.js Testa failover estrito: Provider A -> 429; Provider B assume se configurado; se não, pausa.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1620 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `6ba25c320e1db24434d636a54cfc0587b90bb9263224d9e349ce05e21856b821`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerGateway`.

## `tests/regression/provider_health.test.js`

Teste ou roteiro provider_health.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1367 bytes; linhas: 36.
- Leitura: texto completo decodificado.
- SHA-256: `14f1e4579c052dd3785ef302c9cfcfd7315866a739e0c258b04b4089bd3dc9ed`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_rate_limit_storm.test.js`

Teste ou roteiro provider_rate_limit_storm.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2696 bytes; linhas: 71.
- Leitura: texto completo decodificado.
- SHA-256: `2d9a592ce99b884a96b1d3e09767eed035636c4dc8eca62772461fcbf0ae0d39`.
- Imports literais: `assert`, `../../src/core/globalCircuitBreaker`.

## `tests/regression/provider_resume.test.js`

Teste ou roteiro provider_resume.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1977 bytes; linhas: 65.
- Leitura: texto completo decodificado.
- SHA-256: `efaea13a01b9e7739a51233357d1369c642f6d0f7d1bed20072151d8c9851f0d`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/jobPersistence`.

## `tests/regression/rate_limit.test.js`

Teste ou roteiro rate_limit.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 799 bytes; linhas: 23.
- Leitura: texto completo decodificado.
- SHA-256: `2a619c2d44de5a0f39afc96b676aeaadb2936d527173db01be25bf223109b5e6`.
- Imports literais: `assert`, `../../src/core/providerRateLimiter`.

## `tests/regression/real_game_launch_smoke.test.js`

Teste ou roteiro real_game_launch_smoke.test.js: OpenTranslator — real_game_launch_smoke.test.js Teste final de smoke test com o jogo real Toki kan Yuusha (RPG Maker MZ). Fluxo oficial:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 8964 bytes; linhas: 203.
- Leitura: texto completo decodificado.
- SHA-256: `16aebc3f10db3b553bdbf4f4c9fa0d53a6b343786eac83fc2b868e3e70d79315`.
- Assinaturas localizadas (nome:linha): `getHash:27`, `sleep:31`, `run:35`.
- Imports literais: `assert`, `fs`, `path`, `crypto`, `child_process`, `../../src/extractors/extractor`, `../../src/core/gameEngine`, `../../src/core/pluginSafePatcher`, `../../src/core/ownedProcessRegistry`, `./testPaths`.

## `tests/regression/rgss_real_pipeline.test.js`

Teste ou roteiro rgss_real_pipeline.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4960 bytes; linhas: 145.
- Leitura: texto completo decodificado.
- SHA-256: `3c7a33fb8439e22811bfdc0cedcdc0800d5378cc446f5a8dd0597cfd2e8d45fa`.
- Assinaturas localizadas (nome:linha): `sha256:7`, `testRgssPipeline:13`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/rpgmaker/rgssAdapter`, `../../src/core/engineDetector`.

## `tests/regression/run-all-tests.js`

Teste ou roteiro run-all-tests.js: OpenTranslator — Suíte de Testes Automatizados

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6934 bytes; linhas: 133.
- Leitura: texto completo decodificado.
- SHA-256: `7146bad1287fe2e556830152e8bbc0bb0f9e522055a43da1a952344e7d592d71`.
- Assinaturas localizadas (nome:linha): `assert:16`, `runTests:27`.
- Imports literais: `fs`, `path`, `../../src/core/engineDetector`, `../../src/core/codeProtector`, `../../src/core/backupManager`, `../../src/core/engineRegistry`, `../../src/core/translationPipeline`, `./testPaths`.

## `tests/regression/run-phase2-tests.js`

Teste ou roteiro run-phase2-tests.js: OpenTranslator — Bateria de Testes da Fase 2 (Hardening & Integration)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5905 bytes; linhas: 147.
- Leitura: texto completo decodificado.
- SHA-256: `60a93afc43b167fd148a04251fcf610f59b621be9bf31a233e72ee69749cdc02`.
- Assinaturas localizadas (nome:linha): `check:16`, `run:27`.
- Imports literais: `assert`, `../../src/core/qaEngine`, `../../src/core/codeProtector`, `../../src/core/translationMemory`, `../../src/core/selfTest`, `../../src/core/diagnosticBundle`, `../../src/engines/electron/electronBridge`, `../../src/core/gameService`.

## `tests/regression/run-phase3-tests.js`

Teste ou roteiro run-phase3-tests.js: OpenTranslator — Bateria de Testes da Fase 3 (Real-World Translation & Hardening)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7170 bytes; linhas: 162.
- Leitura: texto completo decodificado.
- SHA-256: `0b8e02f4381b1694e210b8c291428873ec3b9738e496233d0dfdf9a9a73ac33d`.
- Assinaturas localizadas (nome:linha): `check:18`, `run:29`.
- Imports literais: `fs`, `assert`, `path`, `os`, `../../src/core/strategyPlanner`, `../../src/core/transactionJournal`, `../../src/engines/renpy/renpyParser`, `../../src/engines/electron/asarRepacker`, `../../src/engines/generic/universalScanner`, `../../src/core/gameService`.

## `tests/regression/run-phase4a-tests.js`

Teste ou roteiro run-phase4a-tests.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7064 bytes; linhas: 170.
- Leitura: texto completo decodificado.
- SHA-256: `bbfb39744d04e3b8abf211be76f7e15c466734cbafe0ea47cc220d6db6abf978`.
- Assinaturas localizadas (nome:linha): `runTest:19`, `runAsyncTest:31`, `main:43`.
- Imports literais: `path`, `fs`, `assert`, `../../src/diagnostics/executableAnalyzer`, `../../src/diagnostics/processInspector`, `../../src/diagnostics/errorAnalyzer`, `../../src/diagnostics/logIntelligence`, `../../src/diagnostics/universalGameIntelligence`, `../../src/runtime/universalRuntimeHost`, `../../src/runtime/runtimeEventBus`, `../../tools/repoLint`, `../tools/repoLint`.

## `tests/regression/run-phase5-tests.js`

Teste ou roteiro run-phase5-tests.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11222 bytes; linhas: 269.
- Leitura: texto completo decodificado.
- SHA-256: `0fce6ac08b2c3b08a3262a5969d01578379a8c53826ad18448354193b2d54661`.
- Assinaturas localizadas (nome:linha): `runTest:18`, `runAsyncTest:30`, `main:42`.
- Imports literais: `path`, `fs`, `assert`, `../../src/discovery/universalDiscoveryEngine`, `../../src/discovery/textProvenanceGraph`, `../../src/discovery/gameCompatibilityPassport`, `../../src/discovery/discoveryExperimentEngine`, `../../src/core/placeholderIntegrityValidator`, `../../src/core/textCaptureQuality`, `../../src/core/applyGate`, `../../src/diagnostics/logParsers`, `../../src/runtime/universalOverlay`.

## `tests/regression/run-phase5b-tests.js`

Teste ou roteiro run-phase5b-tests.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 9708 bytes; linhas: 227.
- Leitura: texto completo decodificado.
- SHA-256: `61eae537ff77a1f997af438357016a1c0c2a7b80b2f275f3b27d5375be2bade8`.
- Assinaturas localizadas (nome:linha): `runTest:20`, `runAsyncTest:32`, `main:44`.
- Imports literais: `path`, `fs`, `assert`, `../../src/core/textClassifier`, `../../src/core/textStabilizer`, `../../src/core/priorityQueue`, `../../src/core/multiLevelCache`, `../../src/core/translationRouter`, `../../src/core/translationStateMachine`, `../../src/core/gameRules`, `../../src/core/layoutAnalyzer`, `../../src/core/outputProvider`, `../../src/core/translationProvider`, `../../src/core/performanceMonitor`.

## `tests/regression/run-phase5c-tests.js`

Teste ou roteiro run-phase5c-tests.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6776 bytes; linhas: 179.
- Leitura: texto completo decodificado.
- SHA-256: `20baf682817e0bd21608b7c79e67bd788a174279e9f5432fcdbaed8028b13ee9`.
- Assinaturas localizadas (nome:linha): `runTest:17`, `runAsyncTest:29`, `main:41`.
- Imports literais: `path`, `fs`, `assert`, `crypto`, `../../src/core/backupManager`, `../../src/core/placeholderIntegrityValidator`, `../../src/core/textStabilizer`, `../../src/core/multiLevelCache`, `../../src/core/translationRouter`, `../../src/engines/renpy/renpyParser`, `../../src/core/performanceMonitor`, `http`.

## `tests/regression/run-phase6-tests.js`

Teste ou roteiro run-phase6-tests.js: OpenTranslator — Phase 6 Test Suite Production Game Translation Core Conformance & Integration

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 19880 bytes; linhas: 428.
- Leitura: texto completo decodificado.
- SHA-256: `28bf7efa029349271347e0e5d7f35ab2853861657a316b7017ec04e0e1bc0272`.
- Assinaturas localizadas (nome:linha): `runTest:46`, `runAsyncTest:58`, `main:70`.
- Imports literais: `assert`, `path`, `fs`, `../../src/core/engineRuntimeTriad`, `../../src/core/textObjectIdentity`, `../../src/core/translationContext`, `../../src/core/glossaryEngine`, `../../src/core/translationMemory3`, `../../src/core/fastTextPipeline`, `../../src/core/fontCompatibilityEngine`, `../../src/core/translationLayoutValidator`, `../../src/core/translationPatchFormat`, `../../src/core/healthMonitor`, `../../src/core/pluginSdk`, `../../src/core/subtitleSystem`, `../../src/core/imageTextLayer`, `../../src/runtime/hookProvider`, `../../src/engines/godot/godotLocalizationProvider`, `../../src/engines/godot/godotControlTextProvider`, `../../src/engines/unreal/unrealLocResProvider`, `../../src/engines/unreal/unrealStringTableProvider`, `../../src/engines/unreal/unrealLocalizationProvider`, `../../src/engines/unity/unityLocalizationPackageProvider`, `../../src/engines/unity/unityTextMeshProProvider`, `../../src/engines/unity/unityUGUIProvider`, `../../src/engines/renpy/renpyProductionProvider`, `../../src/engines/electron/electronArchiveProvider`, `../../src/engines/electron/electronDOMProvider`.

## `tests/regression/run-phase7-tests.js`

Teste ou roteiro run-phase7-tests.js: OpenTranslator - Phase 7 Test Suite Real-World Translation, Product Hardening, UX & Compatibility

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 16035 bytes; linhas: 386.
- Leitura: texto completo decodificado.
- SHA-256: `df152ab32961f834d650e92fa4103e6aa47e6ca1f11677cd748caa4ba6429646`.
- Assinaturas localizadas (nome:linha): `main:23`, `runTest:32`, `runAsyncTest:44`.
- Imports literais: `assert`, `path`, `fs`, `../../src/core/evidenceModel`, `../../src/core/realGameWorkflow`, `../../src/engines/renpy/renpyWorkflow`, `../../src/engines/unity/unityFrameworkMatrix`, `../../src/engines/unreal/unrealLocalizationWorkflow`, `../../src/discovery/unknownGameTriage`, `../../src/core/textProvenance2`, `../../src/core/translationSession`, `../../src/core/patchInstaller`, `../../src/core/translationEditorCore`, `../../src/core/queueStarvationManager`, `../../src/core/cachePolicy`.

## `tests/regression/run-phase8a-tests.js`

Teste ou roteiro run-phase8a-tests.js: OpenTranslator - Phase 8A Test Suite Real Translation Implementation & Evidence Correction

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11599 bytes; linhas: 297.
- Leitura: texto completo decodificado.
- SHA-256: `635c0384ca253237589a8daf4c322de315396b3efae5a405ca400764685e3383`.
- Assinaturas localizadas (nome:linha): `main:17`, `runTest:26`, `runAsyncTest:38`.
- Imports literais: `assert`, `path`, `fs`, `crypto`, `../../src/core/localDictionaryProvider`, `../../src/core/visibleTextVerifier`, `../../src/core/patchInstaller`, `../../src/core/realTranslationWorkflow`, `../../src/core/realGameWorkflow`.

## `tests/regression/run-phase8b-tests.js`

Teste ou roteiro run-phase8b-tests.js: OpenTranslator - Phase 8B Test Suite Translation Core Hardening, Real Output & Schema Unification

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 10704 bytes; linhas: 248.
- Leitura: texto completo decodificado.
- SHA-256: `d0f02bfc961df3492dc9c40c4cbfd5fef912f95df2a9c283724ae8f3bddec037`.
- Assinaturas localizadas (nome:linha): `main:21`, `runTest:30`, `runAsyncTest:42`.
- Imports literais: `assert`, `path`, `fs`, `crypto`, `../../src/core/translationPatchSchema`, `../../src/core/translationPatchFormat`, `../../src/core/translationEditorCore`, `../../src/core/patchInstaller`, `../../src/core/formatAwareOutput`, `../../src/core/visibleTextVerifier`, `../../src/core/evidenceModel`, `../../src/core/localDictionaryProvider`, `../../src/core/fastTextPipeline`.

## `tests/regression/run-phase9-tests.js`

Teste ou roteiro run-phase9-tests.js: OpenTranslator - Phase 9 Test Suite Validação rigorosa dos pilares da Fase 9: 1. EvidenceModel 3.0 Anti-Forgery (bloqueio de booleanos e setters diretos)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 10582 bytes; linhas: 256.
- Leitura: texto completo decodificado.
- SHA-256: `e8a960aedb760931f65c4482cada85066bb8acb15b5f3f086d02ea1a56afb2d9`.
- Assinaturas localizadas (nome:linha): `runTest:31`, `runAsyncTest:43`, `main:55`.
- Imports literais: `assert`, `path`, `fs`, `../../src/core/evidenceModel`, `../../src/core/ownedProcessRegistry`, `../../src/core/runtimeSessionManager`, `../../src/core/patchInstaller`, `../../src/core/formatAdapterRegistry`, `../../src/core/translationUnit`, `../../src/core/translationRuntimeRouter`, `../../src/core/screenCapture`, `../../src/core/claimAudit`.

## `tests/regression/run-product-runtime-test.js`

Teste ou roteiro run-product-runtime-test.js: OpenTranslator - Real Product Runtime Self-Test Executa o ciclo completo sobre o ProductRuntimeFixture real: START FIXTURE -> PROBE -> CONNECT -> OBSERVE INITIAL -> TRANSLATE ->

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7703 bytes; linhas: 186.
- Leitura: texto completo decodificado.
- SHA-256: `1e0c833c26a0e00468fab12c90d1fd41319c685216113481ba48d7fa4276ac78`.
- Assinaturas localizadas (nome:linha): `httpRequest:26`, `main:52`.
- Imports literais: `assert`, `path`, `http`, `../../src/core/runtimeSessionManager`, `../../src/core/runtimeProbe`, `../../src/core/screenCapture`, `../../src/core/evidenceModel`, `../../src/core/claimAudit`, `../../src/providers/translationProviderRegistry`, `../../src/core/localDictionaryProvider`, `../../src/core/ownedProcessRegistry`.

## `tests/regression/run-real-staged-game-test.js`

Teste ou roteiro run-real-staged-game-test.js: OpenTranslator - Real Staged Game Lab Execution Executa o ciclo de runtime e bridge sobre cópias isoladas de jogos reais: - ArmoredSuitSolganteRenpy0.2-pc (Ren'Py)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7776 bytes; linhas: 178.
- Leitura: texto completo decodificado.
- SHA-256: `d7ffb3fbf7d7732462f59e46e1bc3d6223266e0487d63c0b08df9468f5df5b12`.
- Assinaturas localizadas (nome:linha): `testRenpyLab:27`, `testRpgMakerMzLab:94`, `main:159`.
- Imports literais: `assert`, `path`, `fs`, `../../src/core/stagingPolicy`, `../../src/engines/renpy/renpyRuntimeBridge`, `../../src/engines/rpgmaker/rpgMakerRuntimeBridge`, `../../src/core/translationRuntimeRouter`, `../../src/core/evidenceModel`, `../../src/core/claimAudit`, `../../src/providers/translationProviderRegistry`, `../../src/core/localDictionaryProvider`.

## `tests/regression/run_master_regression.js`

Teste ou roteiro run_master_regression.js: OpenTranslator - Master Regression Test Suite Executes all automated test suites from Phase 1 through Phase 8B Formally separates AUTOMATED REGRESSION from REAL GAME VALIDATION (REAL_GAME_FILE_E2E).

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4885 bytes; linhas: 102.
- Leitura: texto completo decodificado.
- SHA-256: `e3b78a5de3a8e3c5ddd79131b078d57e422aa7664bcb661195f3214d8791b1fc`.
- Imports literais: `child_process`, `path`, `fs`.

## `tests/regression/test_translation_qa_launch_bug.js`

Teste ou roteiro test_translation_qa_launch_bug.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2899 bytes; linhas: 63.
- Leitura: texto completo decodificado.
- SHA-256: `b70f75b3832f3d90a7b2c27221e7994d7c84a42045561a2e0439d360fd4dc078`.
- Imports literais: `assert`, `path`, `fs`, `../../src/core/codeProtector`, `../../src/core/qaEngine`, `../../src/engines/renpy/renpyAdapter`, `../../src/core/translationPipeline`.

## `tests/regression/testPaths.js`

Teste ou roteiro testPaths.js: testPaths.js - Centralized Test Fixture Path Resolver Provides portable discovery of lab fixtures and test games. Supports:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2735 bytes; linhas: 91.
- Leitura: texto completo decodificado.
- SHA-256: `32becae1eb77d5883aed2f77117282b6dc906e9147418e5ac5dd9b5afa100636`.
- Assinaturas localizadas (nome:linha): `getLabCandidates:14`, `resolveGame:34`, `getTokiPath:50`, `getRenpyPath:54`, `getLabRoot:60`, `requireFixture:67`.
- Imports literais: `path`, `fs`.
- Referenciado estaticamente por: `tests/regression/plugin_runtime_translation.test.js`, `tests/regression/plugin_safe_patcher_integration.test.js`, `tests/regression/real_game_launch_smoke.test.js`, `tests/regression/run-all-tests.js`.

## `tests/regression/translation_accounting.test.js`

Teste ou roteiro translation_accounting.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1963 bytes; linhas: 52.
- Leitura: texto completo decodificado.
- SHA-256: `80a00e0af7c4c0834b907a4a1c7c09f18cebbae2728478e6ab7f4525056fccb7`.
- Imports literais: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/translation_accounting_realistic.test.js`

Teste ou roteiro translation_accounting_realistic.test.js: OpenTranslator — translation_accounting_realistic.test.js Simula a contabilidade realista com deduplicação, filtros de código MZ e cache. Cenário:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2699 bytes; linhas: 68.
- Leitura: texto completo decodificado.
- SHA-256: `f72d87e6184a3aa8aaf6c4ee83716910c29c7b0b319a2ddb528d31a8f69a736d`.
- Assinaturas localizadas (nome:linha): `run:19`.
- Imports literais: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/translation_resume.test.js`

Teste ou roteiro translation_resume.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1054 bytes; linhas: 32.
- Leitura: texto completo decodificado.
- SHA-256: `edec64e20ef0e3f86206c14204167389c1fbfae39335356e28abb79ab50b9b2f`.
- Imports literais: `assert`, `../../src/core/jobPersistence`.

## `tests/regression/translation_speed.test.js`

Teste ou roteiro translation_speed.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1381 bytes; linhas: 35.
- Leitura: texto completo decodificado.
- SHA-256: `589dea3e58800bf4edb11439ba7bbe84d1d609104ef4b68bc3cee3e74fdbb551`.
- Imports literais: `assert`, `../../src/core/translationQueue`.

## `tests/regression/unit_of_count_consistency.test.js`

Teste ou roteiro unit_of_count_consistency.test.js: OpenTranslator — unit_of_count_consistency.test.js Garante que todo o pipeline utilize a MESMA unidade de contagem (Raw Occurrences). Proíbe estritamente a mistura de "raw occurrences" com "unique strings" na contabilidade.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2065 bytes; linhas: 49.
- Leitura: texto completo decodificado.
- SHA-256: `33d16255eb4c5e2e3e73474531c572118c38a0fd1ba74b2f64868a5b2f586c13`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `../../src/core/translationAccounting`.

## `tests/regression/unity_code_protector.test.js`

Teste ou roteiro unity_code_protector.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3408 bytes; linhas: 77.
- Leitura: texto completo decodificado.
- SHA-256: `672e039adb0c9ce72e521a8a8598f8f4d7dfd7337bb7f37dbfa4b657f589df2c`.
- Assinaturas localizadas (nome:linha): `runUnityProtectionTests:2`.
- Imports literais: `../../src/core/codeProtector`.

## `tests/regression/unity_comprehensive_suite.js`

Teste ou roteiro unity_comprehensive_suite.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6560 bytes; linhas: 174.
- Leitura: texto completo decodificado.
- SHA-256: `4d0c91ddeef8e62f4ec66cb3f154ac483fceaeb25ad4fddc3168cb0346eaecfe`.
- Assinaturas localizadas (nome:linha): `sha256:6`, `runUnityComprehensiveSuite:22`.
- Imports literais: `fs`, `path`, `crypto`, `../../src/core/engineDetector`, `../../src/engines/unity/unityAdapter`.

## `tests/regression/unity_managed_and_rgss3a.test.js`

Teste ou roteiro unity_managed_and_rgss3a.test.js: OpenTranslator — Teste de Verificação Universal: Unity Managed Assembly (Cecil) e RGSS3A Container Bridge

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5372 bytes; linhas: 108.
- Leitura: texto completo decodificado.
- SHA-256: `50b6129fd79b19d5a2f09ae98855b0b69ffb2ef3a9540017afa569fe45f48e0e`.
- Assinaturas localizadas (nome:linha): `sha256:9`.
- Imports literais: `fs`, `path`, `child_process`, `crypto`.

## `tests/regression/unity_real_pipeline.test.js`

Teste ou roteiro unity_real_pipeline.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4405 bytes; linhas: 125.
- Leitura: texto completo decodificado.
- SHA-256: `90a80a85955f96ec6adbd014c566d9ab3260d36fd83e29226a1c4d29ab02b9fb`.
- Assinaturas localizadas (nome:linha): `sha256:5`, `testRealUnityPipeline:11`.
- Imports literais: `fs`, `path`, `crypto`, `../../src/engines/unity/unityAdapter`.

## `tests/regression/wolf_real_pipeline.test.js`

Teste ou roteiro wolf_real_pipeline.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4597 bytes; linhas: 139.
- Leitura: texto completo decodificado.
- SHA-256: `d0e7acabb7d04e0f42145e8f9795fc6b5095d12b92d30f00ae6c0bf161d06e2b`.
- Assinaturas localizadas (nome:linha): `sha256:7`, `testWolfPipeline:13`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `../../src/engines/wolf/wolfAdapter`, `../../src/core/engineDetector`.

## `tests/renpy_variable_healing.test.js`

Teste ou roteiro renpy_variable_healing.test.js: Test: Ren'Py Variable Interpolation Protection and Auto-Healing Ensures that Python variable interpolations like [who.age] or $[cash] are never corrupted or translated, preventing NameError crashes at runtime.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4349 bytes; linhas: 88.
- Leitura: texto completo decodificado.
- SHA-256: `035793cd2ef8f7c84c8df06d9a9e0dec34c4bb540f691120749aa77f1ed47e92`.
- Assinaturas localizadas (nome:linha): `run:14`.
- Imports literais: `assert`, `fs`, `path`, `../src/engines/renpy/renpyCommon`, `../src/engines/renpy/validator/renpyValidator`, `../src/engines/renpy/adapter/renpyAdapter`, `../src/engines/renpy/injector/renpyInjector`.

## `tests/run-lab-tests.js`

Teste ou roteiro run-lab-tests.js: OpenTranslator — Laboratório Automático de Testes em Jogos Reais Analisa cada pasta de jogo em C:\Users\Teste\Desktop\Nova pasta\* de forma 100% não-destrutiva, gerando LAB_REPORT.md e LAB_REPORT.json.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5177 bytes; linhas: 121.
- Leitura: texto completo decodificado.
- SHA-256: `d9c6e3c9e115a786101a8442b7f38dddae2d7e5448492029cfbc502d0f4b174c`.
- Assinaturas localizadas (nome:linha): `runLab:27`.
- Imports literais: `fs`, `path`, `../src/core/engineDetector`, `../src/core/engineRegistry`, `../src/core/translationPipeline`, `../src/engines/renpy/renpyAdapter`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/electron/electronAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/generic/genericAdapter`.

## `tests/security/http_rpc_security.test.js`

Teste ou roteiro http_rpc_security.test.js: tests/security/http_rpc_security.test.js Cobre: S1  RPC sem token é rejeitado (403)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 13773 bytes; linhas: 333.
- Leitura: texto completo decodificado.
- SHA-256: `524d4937fb04819abeac8ff914a6e566fd82eff3337517654af9106513a4bd8d`.
- Assinaturas localizadas (nome:linha): `test:40`, `rawRequest:57`, `rpcCall:79`, `main:92`, `finish:318`.
- Imports literais: `http`, `path`, `assert`, `child_process`.

## `tests/security/index.js`

Teste ou roteiro index.js: tests/security/index.js — Runner da Fase 1 (Segurança) Este runner NAO aceita sucesso falso: - exige exit code != 0 de qualquer sub-suite que falhe

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1616 bytes; linhas: 55.
- Leitura: texto completo decodificado.
- SHA-256: `083e4c1243a100990c9fbb0d65071a94bde4983545e91bba6ddc72ea25709095`.
- Imports literais: `child_process`, `path`.

## `tests/security/owned_process_security.test.js`

Teste ou roteiro owned_process_security.test.js: tests/security/owned_process_security.test.js Cobre as 8 vulnerabilidades do audit: V1  PowerShell falha => safe:false (nunca fail-open)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 12876 bytes; linhas: 335.
- Leitura: texto completo decodificado.
- SHA-256: `9246a8bf9303a91304baaee5137e3b374c70612a9800a442f05b9dd77d3aefdc`.
- Assinaturas localizadas (nome:linha): `test:37`, `spawnLiveNode:50`, `sleep:58`, `waitAlive:60`, `main:70`.
- Imports literais: `assert`, `path`, `child_process`, `fs`, `os`.

## `tests/security/xss_ui.test.js`

Teste ou roteiro xss_ui.test.js: tests/security/xss_ui.test.js Nao basta "verificar que esc() existe". Este teste executa o sanitizador contra payloads que funcionariam se o sink fosse innerHTML cru, e exige que:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 13784 bytes; linhas: 323.
- Leitura: texto completo decodificado.
- SHA-256: `b18f9703766566dfdecbc25eeeb7d4c6e81f2b3c96738cb555a22fa566e22223`.
- Assinaturas localizadas (nome:linha): `test:29`, `assertInert:47`, `assertInertAsAttribute:65`, `appSource:216`.
- Imports literais: `assert`, `fs`, `path`.

## `tests/test_adapters_live.js`

Teste ou roteiro test_adapters_live.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3726 bytes; linhas: 72.
- Leitura: texto completo decodificado.
- SHA-256: `c0c70ccccf4f3fa62c06466eccc71f96f7a66795c13a91ba2b5228c0e5e4fc98`.
- Assinaturas localizadas (nome:linha): `runAudit:35`.
- Imports literais: `fs`, `path`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/renpy/renpyAdapter`, `../src/engines/wolf/wolfAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/godot/godotAdapter`, `../src/engines/cocos/cocos2dxAdapter`.

## `tests/test_core_detector.js`

Teste ou roteiro test_core_detector.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1098 bytes; linhas: 28.
- Leitura: texto completo decodificado.
- SHA-256: `91155e7b38b6b38e2f440b3883107dacbbbb5e696794b62591bcf2a149577781`.
- Assinaturas localizadas (nome:linha): `run:6`.
- Imports literais: `path`, `fs`, `../src/core/engineDetector`.

## `tests/test_coverage_guarantor_and_cache_integrity.test.js`

Teste ou roteiro test_coverage_guarantor_and_cache_integrity.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4923 bytes; linhas: 104.
- Leitura: texto completo decodificado.
- SHA-256: `a48118ace42228db64a01f610e42288066ca3fd66f1ed411a1500e069d10a8e4`.
- Assinaturas localizadas (nome:linha): `runTests:4`.
- Imports literais: `assert`, `../src/core/coverageGuarantor`, `../src/core/translationMemory`, `../src/translation/translator`.

## `tests/test_engine_detection.js`

Teste ou roteiro test_engine_detection.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1653 bytes; linhas: 46.
- Leitura: texto completo decodificado.
- SHA-256: `3224c9174d9baf53d0e6629254b8cf0fc36852c2bd0ea013181d3e2270a08631`.
- Imports literais: `path`, `fs`, `../src/core/gameEngine`.

## `tests/test_game_compatibility.js`

Teste ou roteiro test_game_compatibility.js: OpenTranslator — Passo 25: Teste Final de Jogo Novo Sem Preparação Manual Prova conclusiva: Um jogo novo é colocado em Nova pasta sem nenhum cadastro prévio,

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4168 bytes; linhas: 101.
- Leitura: texto completo decodificado.
- SHA-256: `eeb3ea00c0e4e92311dae32fb8bebd386211c308f64031a2f4df819fde2861d5`.
- Assinaturas localizadas (nome:linha): `runStep25Proof:18`.
- Imports literais: `fs`, `path`, `./real_ui_certification_runner`.

## `tests/test_kimochi_decrypt.js`

Teste ou roteiro test_kimochi_decrypt.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2058 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `d54653c68fba35bf2b217abd81d90f15dabb23ef3c76d0fa28ce9c503f304b62`.
- Imports literais: `fs`, `crypto`, `path`.

## `tests/test_multi_game_pipeline.js`

Teste ou roteiro test_multi_game_pipeline.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6448 bytes; linhas: 167.
- Leitura: texto completo decodificado.
- SHA-256: `1b933dea31acc90e29b91510458c0a9f20ae9219ea732c37b7a9b651da36bc9b`.
- Assinaturas localizadas (nome:linha): `hashFile:12`, `testGameFlow:18`, `run:117`.
- Imports literais: `fs`, `path`, `crypto`, `../src/core/engineDetector`, `../src/engines/rpgmaker/rpgMakerAdapter`, `../src/engines/renpy/renpyAdapter`, `../src/engines/unity/unityAdapter`, `../src/engines/wolf/wolfAdapter`.

## `tests/test_one_game_gameplay.js`

Teste ou roteiro test_one_game_gameplay.js: Teste em tempo real de Gameplay e Save/Load no Marge Mania v0.1

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5776 bytes; linhas: 151.
- Leitura: texto completo decodificado.
- SHA-256: `e2b04dd69059a66792e4dc8edc0eaf6185d5b16aabb4adfb536a78713dbe6757`.
- Assinaturas localizadas (nome:linha): `rpc:10`, `main:19`, `setTimeout:57`, `setTimeout:121`.
- Imports literais: `fs`, `path`, `child_process`.

## `tests/test_real_world_e2e_all_games.js`

Teste ou roteiro test_real_world_e2e_all_games.js: test_real_world_e2e_all_games.js Bateria de Teste Real de Ponta a Ponta via Interface/HTTP RPC do OpenTranslator Testa todos os 20 jogos reais e itens de C:\Users\Teste\Desktop\Nova pasta.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 10649 bytes; linhas: 240.
- Leitura: texto completo decodificado.
- SHA-256: `f7ff8f3b1c3bb39636a55500683b1d48dca0bf8fab45219711db227904e8b17e`.
- Assinaturas localizadas (nome:linha): `rpcCall:24`, `calculateFileSha256:51`, `runRealWorldSuite:58`.
- Imports literais: `http`, `fs`, `path`, `crypto`.

## `tests/test_renpy_coverage_generalization.test.js`

Teste ou roteiro test_renpy_coverage_generalization.test.js: test_renpy_coverage_generalization.test.js — Teste de Generalização e Regressão de Cobertura Ren'Py Valida de forma UNIVERSAL (sem depender de jogo específico): 1. Strings contendo múltiplos colchetes [var1] ... is ... [var2] não são mais descartadas.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 8805 bytes; linhas: 165.
- Leitura: texto completo decodificado.
- SHA-256: `989d57f97f154a65c16c749f8a1efd3cf9ed32aaadd8bc64adc7d9db19f0f814`.
- Assinaturas localizadas (nome:linha): `runTests:21`.
- Imports literais: `fs`, `path`, `../src/engines/renpy/extractor/renpyExtractor`, `../src/engines/renpy/injector/renpyInjector`, `../src/engines/renpy/validator/renpyValidator`, `../src/core/coverageGuarantor`.

## `tests/test_renpy_summertime_extraction.js`

Teste ou roteiro test_renpy_summertime_extraction.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1599 bytes; linhas: 48.
- Leitura: texto completo decodificado.
- SHA-256: `bb5b0245da4a68a01c61524f046db9858cb1e0cbd0f5e7cdcc96c029169a119e`.
- Assinaturas localizadas (nome:linha): `run:6`.
- Imports literais: `fs`, `../src/engines/renpy/extractor/renpyExtractor`.

## `tests/test_text_chunking_and_provider_resilience.test.js`

Teste ou roteiro test_text_chunking_and_provider_resilience.test.js: test_text_chunking_and_provider_resilience.test.js Suíte de testes rigorosa para validação de: 1. TextChunker em múltiplos comprimentos (500, 1000, 1500, 2000, 3000, 5000, 10000 caracteres)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 9284 bytes; linhas: 220.
- Leitura: texto completo decodificado.
- SHA-256: `339d46cdbafe31c7006a8b6c0fd00efe284c8f3437264bc6140a76cb1e19306e`.
- Assinaturas localizadas (nome:linha): `runTest:21`, `runAsyncTest:32`.
- Imports literais: `assert`, `../src/core/textChunker`, `../src/core/providerErrorClassifier`, `../src/core/globalCircuitBreaker`.

## `tests/test_toki_gameplay.js`

Teste ou roteiro test_toki_gameplay.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6322 bytes; linhas: 144.
- Leitura: texto completo decodificado.
- SHA-256: `b6048d2596cf0ac6a3ac6c456d2e8af5ae6e757bb27aedb9dac21b5685701588`.
- Assinaturas localizadas (nome:linha): `rpc:5`, `run:14`, `setTimeout:46`, `setTimeout:108`.
- Imports literais: `child_process`, `fs`, `path`.

## `tests/test_translation_completeness_and_certificates.test.js`

Teste ou roteiro test_translation_completeness_and_certificates.test.js: test_translation_completeness_and_certificates.test.js Suíte de Testes Automatizados contra Falso Sucesso de Tradução. Valida os Requisitos dos Passos 16 e 17 da Auditoria Crítica:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 16499 bytes; linhas: 403.
- Leitura: texto completo decodificado.
- SHA-256: `b70bcbdc9f020de84de42d650274b7b72cea022c6e798ecfabfc4db9a84b7ba3`.
- Assinaturas localizadas (nome:linha): `runTests:13`, `runCase:21`, `rpcLaunchGate:365`.
- Imports literais: `assert`, `../src/core/translationCertificate`, `../src/core/qaEngine`.

## `tests/unit/adapterReview.test.js`

Teste ou roteiro adapterReview.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4327 bytes; linhas: 51.
- Leitura: texto completo decodificado.
- SHA-256: `7875ece96b9f1ad67035779ceeb03bb86dfe1bc87f0d9ee01782a92a556d2365`.
- Assinaturas localizadas (nome:linha): `write:15`, `main:16`, `fixture:40`.
- Imports literais: `assert`, `fs`, `path`, `os`, `../../src/engines/electron/electronAdapter`, `../../src/engines/defold/defoldAdapter`, `../../src/engines/cocos/cocosCreatorAdapter`, `../../src/engines/electron/asarRepacker`, `../../src/engines/electron/asarUtil`.

## `tests/unit/adapterRuntimeContract.test.js`

Teste ou roteiro adapterRuntimeContract.test.js: adapterRuntimeContract.test.js — REGRESSÃO dos 5 adapters quebrados. const accApply = new PartialReport(); em dois lugares errados:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 15263 bytes; linhas: 317.
- Leitura: texto completo decodificado.
- SHA-256: `6bd2513ab29d7c52e78867afd162fb172ecb6d0d73370f16de5fa11c8e29dc19`.
- Assinaturas localizadas (nome:linha): `ok:34`, `bad:35`, `productionFilesUsingPartialReport:57`, `tmpdir:75`, `textsDe:80`.
- Imports literais: `../../core/partialApply`, `fs`, `os`, `path`.

## `tests/unit/applyContract.test.js`

Teste ou roteiro applyContract.test.js: tests/unit/applyContract.test.js — o contrato de apply é verificável? A PERGUNTA QUE DECIDE SE ESTE MÓDULO VALE ALGO `fileHashes` é verificacao apenas se os dois lados da comparação forem

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 14934 bytes; linhas: 357.
- Leitura: texto completo decodificado.
- SHA-256: `557b2a1610dba2b3b8d5edfa51cb9ef7136c4ddc2345ac3319ed702a643f6d54`.
- Assinaturas localizadas (nome:linha): `teste:37`, `tmpGame:38`, `apply:284`, `rollback:290`, `apply:312`, `rollback:318`.
- Imports literais: `assert`, `fs`, `os`, `path`, `../../src/core/applyContract.js`, `../../src/core/applyTransaction.js`, `../../src/engines/generic/genericAdapter.js`.

## `tests/unit/applyPathContainment.test.js`

Teste ou roteiro applyPathContainment.test.js: applyPathContainment.test.js — REGRESSÃO de V-002 / H-001. A checagem textual de caminho (`..`, `/`, `C:/`) não vê symlink nem junction: um diretório `jogo/link` apontando para fora tem um caminho que

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 6406 bytes; linhas: 143.
- Leitura: texto completo decodificado.
- SHA-256: `332a243f27e9118e534dc4dbf3de0a8fbf1c84afa357dd2d6dce4a0573acac60`.
- Assinaturas localizadas (nome:linha): `ok:22`, `bad:23`, `chk:34`.
- Imports literais: `fs`, `os`, `path`.

## `tests/unit/applyTransaction.test.js`

Teste ou roteiro applyTransaction.test.js: tests/unit/applyTransaction.test.js — FASE 6 / PASSO 31 A aplicação de tradução passa por uma transação verificável. Este teste usa um jogo de FAKE no disco — arquivos reais num diretório temporário — e

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 22410 bytes; linhas: 601.
- Leitura: texto completo decodificado.
- SHA-256: `b6239569745b06223dfe2bb26b2934d5dea93125fafa3c021e7a494f03819a3b`.
- Assinaturas localizadas (nome:linha): `test:32`, `runAll:36`, `makeGame:67`, `cleanupDir:76`, `honestAdapter:84`, `apply:86`, `rollback:97`, `lyingAdapter:104`, `apply:106`, `rollback:114`, `partialAdapter:131`, `apply:133`, `rollback:158`, `mkJournal:161`, `apply:312`, `rollback:313`, `apply:339`, `rollback:341`, `codeOnly:513`.
- Imports literais: `assert`, `path`, `fs`, `os`, `crypto`.

## `tests/unit/applyVerification.test.js`

Teste ou roteiro applyVerification.test.js: tests/unit/applyVerification.test.js — FASE 2 / PASSO 22 & 23 Prova que a verificação pós-aplicação realmente detecta o que o adapter omitiu. O teste central usa um adapter que MENTE: diz que gravou tudo, mas

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 13440 bytes; linhas: 353.
- Leitura: texto completo decodificado.
- SHA-256: `8a290458f7c4d51f1c547961935c7f356b773878002995186e7a883ebfdc692d`.
- Assinaturas localizadas (nome:linha): `test:23`, `runAll:27`, `txt:56`, `makeAdapter:68`, `apply:73`, `extract:77`, `validate:81`, `rollback:84`, `apply:212`, `extract:213`.
- Imports literais: `assert`, `path`, `os`, `fs`, `./applyVerifier`.

## `tests/unit/auditContracts.test.js`

Teste ou roteiro auditContracts.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4257 bytes; linhas: 90.
- Leitura: texto completo decodificado.
- SHA-256: `ca52a9de61f1354c46f869f674d73f35231c8c2aa3cb2e9cca9ddc16874a1c4f`.
- Assinaturas localizadas (nome:linha): `test:14`, `fixture:24`, `setTimeout:45`, `require:46`.
- Imports literais: `assert`, `fs`, `path`, `vm`, `../index`, `../../src/utils/resourceResolver`.

## `tests/unit/backgroundJobLifecycle.test.js`

Teste ou roteiro backgroundJobLifecycle.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2866 bytes; linhas: 42.
- Leitura: texto completo decodificado.
- SHA-256: `21529a90c40aa3fd326651b9102334eb1af6203be802a0ac1b3d8883fb3f8d45`.
- Assinaturas localizadas (nome:linha): `test:11`, `service:12`.
- Imports literais: `assert`, `fs`, `path`, `vm`, `../../src/core/jobSystem`.

## `tests/unit/cacheDurability.test.js`

Teste ou roteiro cacheDurability.test.js: tests/unit/cacheDurability.test.js — FASE 5 / PASSO 30 O cache precisa persistir OU DECLARAR QUE NÃO PERSISTE. Este teste roda contra o `src/services/cache.js` real, num DATA_DIR temporário, e confere o

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 17884 bytes; linhas: 491.
- Leitura: texto completo decodificado.
- SHA-256: `5fede3702f193cbe1d53370a55f28bc3dbc6854831bd79d8cd64b647bd7a12f9`.
- Assinaturas localizadas (nome:linha): `test:40`, `runAll:44`, `freshCache:73`, `cleanup:91`.
- Imports literais: `assert`, `path`, `fs`, `os`.

## `tests/unit/certificateCoherence.test.js`

Teste ou roteiro certificateCoherence.test.js: certificateCoherence.test.js — REGRESSÃO de B-10, B-11, B-12. Antes, contadores aritmeticamente impossíveis produziam um certificado COMPLETED. A causa era dupla:

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 10077 bytes; linhas: 188.
- Leitura: texto completo decodificado.
- SHA-256: `c62dda95526d939e9a5f80ddfddd65268253ed33243156f3584b7b66b198c0f6`.
- Assinaturas localizadas (nome:linha): `ok:21`, `bad:22`.
- Imports literais: `path`.

## `tests/unit/cheatRoundTrip.test.js`

Teste ou roteiro cheatRoundTrip.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3880 bytes; linhas: 30.
- Leitura: texto completo decodificado.
- SHA-256: `79b7675f346e3b3578c2005eea115428dda86684910fdfff315cce08a904ce8e`.
- Assinaturas localizadas (nome:linha): `post:7`, `main:8`.
- Imports literais: `assert`, `fs`, `path`, `os`, `vm`, `http`, `../../src/services/cheatServer`, `../../src/services/rpcHandlers`, `../../src/services/cache`, `../../src/core/translationMemory`.

## `tests/unit/cheatServerContract.test.js`

Teste ou roteiro cheatServerContract.test.js: tests/unit/cheatServerContract.test.js Teste rigoroso de contrato e integridade do cheatServer: 1. Validação de origens HTTP (loopback, nativos, app://, bloqueio de sites remotos e proteção de null cross-site)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 15578 bytes; linhas: 430.
- Leitura: texto completo decodificado.
- SHA-256: `acc05bbe73543d8a1702fba00098deb880e4aacad614769478be94b2a33771f6`.
- Assinaturas localizadas (nome:linha): `test:29`, `rawHttp:41`, `run:64`.
- Imports literais: `http`, `assert`, `ws`, `../../src/services/cheatServer`.

## `tests/unit/coverageTruth.test.js`

Teste ou roteiro coverageTruth.test.js: tests/unit/coverageTruth.test.js — FASE 4 / PASSO 28 Cobertura de tradução precisa ser MEDIDA, não DECLARADA. O BUG REPRODUZIDO

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 17960 bytes; linhas: 423.
- Leitura: texto completo decodificado.
- SHA-256: `cc1ff259eed4aad06db4c18b9b38c759cb702b92f9ea0cf37d5dfa717d2a74da`.
- Assinaturas localizadas (nome:linha): `test:45`, `runAll:49`, `mk:122`, `audit:142`.
- Imports literais: `assert`, `path`.

## `tests/unit/displayTextClassification.test.js`

Teste ou roteiro displayTextClassification.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5884 bytes; linhas: 148.
- Leitura: texto completo decodificado.
- SHA-256: `e9321fe00722d1cf4c0132408f7d8c5f4ca99968f9eeef4b881ae21d547892ca`.
- Assinaturas localizadas (nome:linha): `test:8`.
- Imports literais: `path`, `assert`, `fs`.

## `tests/unit/engineAndRollback.test.js`

Teste ou roteiro engineAndRollback.test.js: tests/unit/engineAndRollback.test.js — FASE 7 / PASSO 32 & 33 Dois defeitos com a mesma natureza: um valor inventado que decide o fluxo. results.push({ name: e.name, exePath: target, engine: "mz", ... });

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 12200 bytes; linhas: 295.
- Leitura: texto completo decodificado.
- SHA-256: `013b6b502eb514bbdf8939303cf3490a242a74ef689e36f2352ef629ba97c744`.
- Assinaturas localizadas (nome:linha): `test:38`, `runAll:42`, `srcFiles:70`, `stripComments:82`.
- Imports literais: `assert`, `path`, `fs`, `os`.

## `tests/unit/executableCompatibility.test.js`

Teste ou roteiro executableCompatibility.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2696 bytes; linhas: 36.
- Leitura: texto completo decodificado.
- SHA-256: `768d5648fb72bd86feeaba548873e1d76a65f8a1883daea6a73169cf5e9afc3b`.
- Assinaturas localizadas (nome:linha): `main:9`.
- Imports literais: `assert`, `fs`, `os`, `path`, `../../src/core/executableInfo`, `../../src/core/engineDetector`.

## `tests/unit/explicitProviderChoice.test.js`

Teste ou roteiro explicitProviderChoice.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1315 bytes; linhas: 14.
- Leitura: texto completo decodificado.
- SHA-256: `59f387f5930ad6d8668f05d33e9140dae1348acd4cc73abfdf3ffd8e50c115e8`.
- Imports literais: `fs`, `path`, `assert`, `../../src/core/globalCircuitBreaker`, `../../src/core/providerHttp`, `../../src/translation/translator`, `../../src/services/cache`.

## `tests/unit/hookLifecycle.test.js`

Teste ou roteiro hookLifecycle.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2433 bytes; linhas: 58.
- Leitura: texto completo decodificado.
- SHA-256: `0c9fe263d9cf281771e4096740848b2bca38174538ac7bb8fb5f7597c8d3f23b`.
- Assinaturas localizadas (nome:linha): `test:14`, `main:18`.
- Imports literais: `assert`, `http`, `fs`, `path`, `../../src/services/cheatServer`, `../../src/services/cache`, `../../src/core/translationMemory`.

## `tests/unit/identityReprocessCycle.test.js`

Teste ou roteiro identityReprocessCycle.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5467 bytes; linhas: 144.
- Leitura: texto completo decodificado.
- SHA-256: `ebd6343c7a9df132cbec76f9e96da53c9fe1436b049824e85ad611768a2d54a6`.
- Assinaturas localizadas (nome:linha): `test:10`.
- Imports literais: `path`, `fs`, `os`, `assert`.

## `tests/unit/legacyGameRestore.test.js`

Teste ou roteiro legacyGameRestore.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4623 bytes; linhas: 69.
- Leitura: texto completo decodificado.
- SHA-256: `6dc627c7b446761c151899c097d8ae5ccaa955d087c3cb89dd8e1178844aa94a`.
- Assinaturas localizadas (nome:linha): `game:9`, `test:19`.
- Imports literais: `assert`, `fs`, `path`, `../../src/core/legacyGameRestore`.

## `tests/unit/pipelineTransaction.test.js`

Teste ou roteiro pipelineTransaction.test.js: tests/unit/pipelineTransaction.test.js — D1: a transação é o caminho do produto? POR QUE ESTE TESTE EXISTE `src/core/applyTransaction.js` foi escrito na FASE 6 com 18 asserts, e até a

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11647 bytes; linhas: 265.
- Leitura: texto completo decodificado.
- SHA-256: `8c19752a6a6273e47af321921e908703cac7ef26b0d97d0d689d448f0ffbf399`.
- Assinaturas localizadas (nome:linha): `ok:47`, `bad:48`, `listarAdapters:107`.
- Imports literais: `assert`, `fs`, `path`.

## `tests/unit/portablePackage.test.js`

Teste ou roteiro portablePackage.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5411 bytes; linhas: 66.
- Leitura: texto completo decodificado.
- SHA-256: `07fd0f217d5f7a1e741b0ade491784d0f8bce136241e010f9eeb69ef6cb5aa7c`.
- Assinaturas localizadas (nome:linha): `write:10`, `fixture:11`, `build:19`, `test:22`.
- Imports literais: `assert`, `fs`, `path`, `crypto`, `../../tools/package_release`.

## `tests/unit/projectCleanup.test.js`

Teste ou roteiro projectCleanup.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2160 bytes; linhas: 17.
- Leitura: texto completo decodificado.
- SHA-256: `9f5c84caf157747432a4ec50402268e4b9e503d864933f9caac27100fcdc6979`.
- Assinaturas localizadas (nome:linha): `write:6`.
- Imports literais: `fs`, `path`, `assert`, `child_process`, `../../src/utils/pythonResolver`.

## `tests/unit/providerContract.test.js`

Teste ou roteiro providerContract.test.js: tests/unit/providerContract.test.js — FASE 3 / PASSO 24 Testa o contrato de TranslationResult e o registry que o obedece. O teste central usa provedores DEFECTUOSOS de propósito — valores de

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 13901 bytes; linhas: 366.
- Leitura: texto completo decodificado.
- SHA-256: `43103dae0cb94569418bd2a4f3501c1976dcabbb4420cf787e0494b0e69b5474`.
- Assinaturas localizadas (nome:linha): `test:23`, `runAll:27`, `registryWith:187`.
- Imports literais: `assert`, `path`.

## `tests/unit/providerFalseSuccess.test.js`

Teste ou roteiro providerFalseSuccess.test.js: tests/unit/providerFalseSuccess.test.js — FASE 3 / PASSO 25 Cobre os "returns falsos" que existiam FORA do registry, em `translationProvider.js` e `fastTextPipeline.js`.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 11668 bytes; linhas: 312.
- Leitura: texto completo decodificado.
- SHA-256: `d1309eb0b153a1a1df0ba9e0bf69d68a1b60175e20404c435b0f2e1ed6e2cebe`.
- Assinaturas localizadas (nome:linha): `test:28`, `runAll:32`, `makeServices:125`, `runOne:137`.
- Imports literais: `assert`, `path`.

## `tests/unit/providerGatewayEnforcement.test.js`

Teste ou roteiro providerGatewayEnforcement.test.js: tests/unit/providerGatewayEnforcement.test.js — FASE 3 / PASSO 26 Garante que a regra declarada pelo próprio `providerGateway.js` — "nenhuma função pode abrir socket HTTP para um provedor sem passar por

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 14415 bytes; linhas: 383.
- Leitura: texto completo decodificado.
- SHA-256: `78967dcebb73b7462145e4a54203dba80313b6a0a345f0e3cc3c4b0eda40ed07`.
- Assinaturas localizadas (nome:linha): `test:30`, `runAll:34`, `stripComments:83`, `findDirectCalls:91`.
- Imports literais: `assert`, `path`, `fs`, `http`.

## `tests/unit/providerRateLimitSemantics.test.js`

Teste ou roteiro providerRateLimitSemantics.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 7807 bytes; linhas: 195.
- Leitura: texto completo decodificado.
- SHA-256: `74b0d6269ef59e385a59cbfb00a602231b38e7d1c494fd8a8a13364481f3e7cb`.
- Assinaturas localizadas (nome:linha): `test:13`.
- Imports literais: `path`, `fs`, `assert`.

## `tests/unit/renpy/extractor.test.js`

Teste ou roteiro extractor.test.js: extractor.test.js — Suíte de testes automatizados para RenpyExtractor

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4733 bytes; linhas: 115.
- Leitura: texto completo decodificado.
- SHA-256: `1ecb11a321969a2f1fff47d93c44bb42e2d5abd0a0022e861ac0213b7fd975ba`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `fs`, `path`, `../../../src/engines/renpy/extractor/renpyExtractor`.
- Referenciado estaticamente por: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/heal_variables.test.js`

Teste ou roteiro heal_variables.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2958 bytes; linhas: 60.
- Leitura: texto completo decodificado.
- SHA-256: `a88f2fb3abd14782b373ec15372e17beb0888f6e70be9e85dad4998691bfe417`.
- Assinaturas localizadas (nome:linha): `run:3`.
- Imports literais: `assert`, `../../../src/engines/renpy/renpyCommon`.

## `tests/unit/renpy/injector.test.js`

Teste ou roteiro injector.test.js: injector.test.js — Suíte de testes automatizados para RenpyInjector

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4851 bytes; linhas: 117.
- Leitura: texto completo decodificado.
- SHA-256: `0bf4e6a42728aa14605767020125275489e63f2d024256e5063885b83e0ce71f`.
- Assinaturas localizadas (nome:linha): `sha256:10`, `run:14`.
- Imports literais: `assert`, `fs`, `path`, `crypto`, `../../../src/engines/renpy/injector/renpyInjector`.
- Referenciado estaticamente por: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/run_all.js`

Teste ou roteiro run_all.js: run_all.js — Executor mestre de todas as suítes de testes unitários de Ren'Py

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 1267 bytes; linhas: 34.
- Leitura: texto completo decodificado.
- SHA-256: `ad8251e2696990fd1b4de6999e901a62e4e38151303ea7df4ce87309c8723f68`.
- Assinaturas localizadas (nome:linha): `main:10`.
- Imports literais: `./extractor.test`, `./translator.test`, `./injector.test`, `./validator.test`, `./runtime.test`.

## `tests/unit/renpy/runtime.test.js`

Teste ou roteiro runtime.test.js: runtime.test.js — Suíte de testes automatizados para RenpyRuntime

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 3734 bytes; linhas: 87.
- Leitura: texto completo decodificado.
- SHA-256: `dd69b1428f12221460cf61f7a4c5d08870551eca777d428cff5502c3dea9297c`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `fs`, `path`, `../../../src/engines/renpy/runtime/renpyRuntime`.
- Referenciado estaticamente por: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/translator.test.js`

Teste ou roteiro translator.test.js: translator.test.js — Suíte de testes automatizados para RenpyTranslator

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4114 bytes; linhas: 80.
- Leitura: texto completo decodificado.
- SHA-256: `7e935ec0a08c30c06155ee7b0bce0271e086ba56920d8a12f4937ecbbf41081b`.
- Assinaturas localizadas (nome:linha): `run:7`.
- Imports literais: `assert`, `../../../src/engines/renpy/translator/renpyTranslator`.
- Referenciado estaticamente por: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpy/validator.test.js`

Teste ou roteiro validator.test.js: validator.test.js — Suíte de testes automatizados para RenpyValidator

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4384 bytes; linhas: 123.
- Leitura: texto completo decodificado.
- SHA-256: `1ec0c2a4bc14628a4da7503f89d3977d3507390fb02fd6e010674ae90fd1ae84`.
- Assinaturas localizadas (nome:linha): `run:9`.
- Imports literais: `assert`, `fs`, `path`, `../../../src/engines/renpy/validator/renpyValidator`.
- Referenciado estaticamente por: `tests/unit/renpy/run_all.js`.

## `tests/unit/renpyPercentEscaping.test.js`

Teste ou roteiro renpyPercentEscaping.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4889 bytes; linhas: 123.
- Leitura: texto completo decodificado.
- SHA-256: `ebdbc08bbd4bc84e07b4c53635f3c7ba23bedea874bb14b34f76f744b65731e1`.
- Assinaturas localizadas (nome:linha): `test:8`.
- Imports literais: `path`, `fs`, `assert`.

## `tests/unit/rpcHonesty.test.js`

Teste ou roteiro rpcHonesty.test.js: tests/unit/rpcHonesty.test.js — FASE 2 / PASSO 21 & 36 Testa COMPORTAMENTO dos handlers que mentiam, não apenas sua existência. Cada teste reproduz o bug original da auditoria e exige que ele não volte.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 23722 bytes; linhas: 574.
- Leitura: texto completo decodificado.
- SHA-256: `804a09280c5a2bfb42fdc1d217051270321f480658901a121390c594df362080`.
- Assinaturas localizadas (nome:linha): `test:34`, `runAll:37`, `send:118`.
- Imports literais: `assert`, `path`, `fs`, `os`.

## `tests/unit/shutdownHttp.test.js`

Teste ou roteiro shutdownHttp.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4779 bytes; linhas: 54.
- Leitura: texto completo decodificado.
- SHA-256: `a8ecf27d70b4d58b39eb2545b52b28d04a80d157cb877a0f9ede5402ac8b0abd`.
- Assinaturas localizadas (nome:linha): `request:11`, `test:18`.
- Imports literais: `assert`, `fs`, `path`, `http`, `child_process`.

## `tests/unit/shutdownLifecycle.test.js`

Teste ou roteiro shutdownLifecycle.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5920 bytes; linhas: 80.
- Leitura: texto completo decodificado.
- SHA-256: `c81552cc31a1d6a3ed03404e32a01f0302eaeea1abf0310df64bb4c9f1995184`.
- Assinaturas localizadas (nome:linha): `test:8`, `setup:11`.
- Imports literais: `assert`, `fs`, `path`, `vm`.

## `tests/unit/successInvariant.test.js`

Teste ou roteiro successInvariant.test.js: tests/unit/successInvariant.test.js — PROVA QUE O GATE FECHA POR QUE ESTE TESTE EXISTE A FASE 9 corrigiu 10 defeitos reais de sucesso sem evidência. Depois disso

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 18357 bytes; linhas: 512.
- Leitura: texto completo decodificado.
- SHA-256: `68c4c1814da47237a8c6f5b1cf6d1549b3e424687df7c4f343bff5261723ddeb`.
- Assinaturas localizadas (nome:linha): `auditarArquivos:42`, `teste:65`, `teste:322`, `teste:401`.
- Imports literais: `assert`, `fs`, `os`, `path`, `../../tools/successAudit.js`.

## `tests/unit/translationCertificate.test.js`

Teste ou roteiro translationCertificate.test.js: tests/unit/translationCertificate.test.js O teste que a auditoria exigia: entrada vazia NUNCA pode virar COMPLETED. Aqui isso e' provado com casos concretos, incluindo tentativas de contorno.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 14969 bytes; linhas: 386.
- Leitura: texto completo decodificado.
- SHA-256: `790005b4f7b36197e18f45ba2e9e1e6865664019c777d386acdaa1a40db25523`.
- Assinaturas localizadas (nome:linha): `test:23`, `perfect:37`.
- Imports literais: `assert`, `path`.

## `tests/unit/translationIdentity.test.js`

Teste ou roteiro translationIdentity.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 5513 bytes; linhas: 132.
- Leitura: texto completo decodificado.
- SHA-256: `58707e80655b9752223f3bb6799977b3e7f77efd2d9a7ad38b36d09d620080cf`.
- Assinaturas localizadas (nome:linha): `test:7`.
- Imports literais: `path`, `assert`.

## `tests/unit/uiHealth.test.js`

Teste ou roteiro uiHealth.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 2448 bytes; linhas: 44.
- Leitura: texto completo decodificado.
- SHA-256: `2bc6d86afd52b5e1abb9e00efa8dd2a486bc218761607ecd6651b0dd0cbcafde`.
- Assinaturas localizadas (nome:linha): `render:9`, `main:22`.
- Imports literais: `assert`, `fs`, `path`, `vm`, `../../ui/xssGuard`.

## `tests/unit/uiWiring.test.js`

Teste ou roteiro uiWiring.test.js: tests/unit/uiWiring.test.js — FASE 8 / PASSO 34 & 35 A UI precisa alcançar a capacidade real do servidor, e o que ela afirma precisa ser o que aconteceu.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 14841 bytes; linhas: 358.
- Leitura: texto completo decodificado.
- SHA-256: `3e852f3205f37b130a4f3764db960e778349ac5d6f76fb3e160355ff001f1436`.
- Assinaturas localizadas (nome:linha): `test:37`, `runAll:41`, `uiCalls:69`, `serverHandlers:76`, `clickHandler:95`, `clickHandlers:115`, `innerHtmlBlocks:122`.
- Imports literais: `assert`, `path`, `fs`.

## `tests/unit/universeCount.test.js`

Teste ou roteiro universeCount.test.js: tests/unit/universeCount.test.js — FASE 4 / PASSO 29 A cobertura precisa de um DENOMINADOR. Este teste cobre a segunda metade da FASE 4: não apenas "a tradução existe", mas "quanto havia para traduzir".

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 12054 bytes; linhas: 308.
- Leitura: texto completo decodificado.
- SHA-256: `5c57473c60d43dc307d5714cb578f0a531bea8a65996606d63b25ce4aa702f40`.
- Assinaturas localizadas (nome:linha): `test:42`, `runAll:46`, `cert:87`, `codeOnly:185`.
- Imports literais: `assert`, `path`, `fs`.

## `tests/unit/unrealApplyHonesty.test.js`

Teste ou roteiro unrealApplyHonesty.test.js: unrealApplyHonesty.test.js — REGRESSAO do U-001. success:true INCONDICIONAL. Evidencia do bug: .locres invalido -> SHA256 do arquivo INALTERADO, count 0, e ainda assim success:true com a

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4352 bytes; linhas: 85.
- Leitura: texto completo decodificado.
- SHA-256: `28f71908290c611a20cc81b31a3b49799e4a4ca7fc86747e833b6f6d04399c32`.
- Assinaturas localizadas (nome:linha): `inst:23`, `caso:29`.
- Imports literais: `fs`, `os`, `path`, `crypto`.

## `tests/unit/unrealLocResFormat.test.js`

Teste ou roteiro unrealLocResFormat.test.js: Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 4408 bytes; linhas: 49.
- Leitura: texto completo decodificado.
- SHA-256: `545b866a36dfa02d0083a640fc48c737122b19c277bf37340eb5996b7209b94c`.
- Assinaturas localizadas (nome:linha): `test:9`.
- Imports literais: `assert`, `fs`, `path`, `../../src/engines/unreal/unrealLocResProvider`, `../../src/engines/unreal/unrealAdapter`.

## `tests/validate_mz_certification.js`

Teste ou roteiro validate_mz_certification.js: validate_mz_certification.js — Validador Independente de Certificação Forense para RPG Maker MZ Avalia evidências em disco para: 1. Marge Mania v0.1

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 14628 bytes; linhas: 338.
- Leitura: texto completo decodificado.
- SHA-256: `6ef20db2b29fef8aca3c8c37a33b222931f53320859e556934350e4c63f979aa`.
- Assinaturas localizadas (nome:linha): `checkPng:29`, `auditGameMz:38`, `runFullValidation:251`.
- Imports literais: `fs`, `path`, `crypto`.

## `tests/validate_real_ui_certification.js`

Teste ou roteiro validate_real_ui_certification.js: OpenTranslator — Validador Forense Canônico e Hierárquico (Passo 11 e 14) Audita a integridade estrita da matriz canônica de certificação: 1. TOTAL_REAL_GAMES === realGameSessions.length (21 === 21)

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 15460 bytes; linhas: 279.
- Leitura: texto completo decodificado.
- SHA-256: `c4423c105b88662749bffe8f86fa9d576f1b703957e34cb611b74c35129d27c3`.
- Assinaturas localizadas (nome:linha): `validateCertification:34`.
- Imports literais: `fs`, `path`.

## `tests/validate_renpy_certification.js`

Teste ou roteiro validate_renpy_certification.js: validate_renpy_certification.js — Validador Independente de Certificação Forense para Ren'Py Avalia evidências em disco para: 1. summertime_saga_realistic_remake-21.0.0-RB.1-win

- Categoria: Teste / laboratório.
- Base da descrição: Cabeçalho de teste / estrutura.
- Tamanho: 17031 bytes; linhas: 385.
- Leitura: texto completo decodificado.
- SHA-256: `c7e4158fd3e80376208a1b67d944bb0a0b871536941cea4c87fb6849e27b9d39`.
- Assinaturas localizadas (nome:linha): `checkPng:28`, `auditGameRenpy:37`, `runFullValidation:254`.
- Imports literais: `fs`, `path`, `crypto`.

## `tools/capture_game.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 815 bytes; linhas: 24.
- Leitura: texto completo decodificado.
- SHA-256: `60682b3e345656502c7574d0cb35ed5d9b494f280d61f38dffafa5948f82609d`.
- Imports literais: `fs`.

## `tools/check_loading.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1373 bytes; linhas: 35.
- Leitura: texto completo decodificado.
- SHA-256: `538159fb7d3ce8124739c0c75445132cf8affea234041edd400a5d7ba71e5e89`.
- Assinaturas localizadas (nome:linha): `main:2`.
- Imports literais: `fs`.

## `tools/check_map.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1998 bytes; linhas: 48.
- Leitura: texto completo decodificado.
- SHA-256: `eb45e4aa0ce2ed37e21bb1e9db9403b469eddc23aa7f27cdaf2fb4268aadc553`.
- Assinaturas localizadas (nome:linha): `main:2`.
- Imports literais: `fs`.

## `tools/cleanup_project.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 142 bytes; linhas: 4.
- Leitura: texto completo decodificado.
- SHA-256: `d22d83337e054ec4878494ecbec6017b2550104cc05da56f9c38ebbdf44a7662`.
- Imports literais: `./maintenance/cleanup_project`.

## `tools/cli-compat.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 4235 bytes; linhas: 108.
- Leitura: texto completo decodificado.
- SHA-256: `b32feae1f41e741345d4f231414fbb354814f5d879066d5f766125c87da2d79a`.
- Assinaturas localizadas (nome:linha): `findGameExe:25`.
- Imports literais: `fs`, `path`, `../src/utils/logger`, `../src/services/cache`, `../src/core/gameEngine`, `../src/translation/translator`, `../src/extractors/extractor`.

## `tools/document_project.py`

Lê a árvore do projeto e gera inventário, relações estáticas, catálogos e uma consulta HTML local sem executar módulos.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 28754 bytes; linhas: 218.
- Leitura: texto completo decodificado.
- SHA-256: `b86266919b7c4842aff963149f8ac3e66b00ba973ced51080ab5dc6aeb25f1b1`.
- Assinaturas localizadas (nome:linha): `private:73`, `category:76`, `area:88`, `package:90`, `symbols:95`, `header:106`, `describe:112`, `guide_html:129`, `build:165`, `inline:131`, `markdown:196`.

## `tools/interact_game.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 2608 bytes; linhas: 63.
- Leitura: texto completo decodificado.
- SHA-256: `c6e744577cf325b89924e4366d7b49f0c86e0bca5a9301924abbb1cc1535eb1c`.
- Assinaturas localizadas (nome:linha): `main:2`.
- Imports literais: `fs`.

## `tools/inventory.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Descrição declarada no cabeçalho: tools/inventory.js — FASE 10: remedir o repositorio com categorias REAIS POR QUE ISTO EXISTE A FASE 0 mediu um baseline: 865 pastas, 5.462 arquivos, 751.921.199 bytes.

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8792 bytes; linhas: 236.
- Leitura: texto completo decodificado.
- SHA-256: `941bde2751d9d98bf6149ba5274f5309ee830f2ba3c33e804b37969cd8f7fc30`.
- Assinaturas localizadas (nome:linha): `ehTemp:63`, `extensionDe:70`, `varrer:75`, `fmtBytes:148`, `relatorio:155`.
- Imports literais: `fs`, `path`.

## `tools/maintenance/cleanup_project.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 581 bytes; linhas: 10.
- Leitura: texto completo decodificado.
- SHA-256: `749ebfc319138d77334e77614893fdc054c27f29fa61ed80192c769117f39cd3`.
- Imports literais: `path`, `child_process`, `../../src/utils/pythonResolver`.
- Referenciado estaticamente por: `tools/cleanup_project.js`.

## `tools/maintenance/project_cleanup.py`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 5505 bytes; linhas: 72.
- Leitura: texto completo decodificado.
- SHA-256: `ec0b814f6afa21c962dc62e2404005a40df1c711b32d3e2416af247abed6e960`.
- Assinaturas localizadas (nome:linha): `sha:7`, `reason:8`, `role:19`, `main:26`.

## `tools/package_release.js`

Monta o portable Windows com runtime, launcher, dependências e manifesto; verifica arquivos e runtime.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 10516 bytes; linhas: 133.
- Leitura: texto completo decodificado.
- SHA-256: `982d9c742166d3a63689652532bbc6ee9584f2b45f86a238a89ce9603a368031`.
- Assinaturas localizadas (nome:linha): `hashFile:6`, `listFiles:15`, `copyTree:24`, `compileLauncher:33`, `probeRuntime:40`, `verifyBundle:49`, `packageDecision:58`, `buildRelease:74`, `skip:89`.
- Imports literais: `fs`, `path`, `crypto`, `child_process`, `better-sqlite3`, `ws`, `exceljs`.
- Referenciado estaticamente por: `tests/unit/portablePackage.test.js`.

## `tools/patchRollout.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1366 bytes; linhas: 33.
- Leitura: texto completo decodificado.
- SHA-256: `b2f621f6b4f35759b2935a1976e018faf62fb89ef4428a5f5dbe9b160b134375`.
- Imports literais: `fs`.

## `tools/patchStaging.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 3092 bytes; linhas: 69.
- Leitura: texto completo decodificado.
- SHA-256: `85f51058e01c40326194e8e64377a7cc871defa72e648f535bf7fafa2af764d5`.
- Imports literais: `fs`.

## `tools/qa_browser_runner.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Descrição declarada no cabeçalho: OpenTranslator — QA Browser Automation Runner (CDP)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 8648 bytes; linhas: 246.
- Leitura: texto completo decodificado.
- SHA-256: `06d40cb75225f52956b26b4f0d72b75e8cee6749769a6544074f32ddbe94c8a6`.
- Assinaturas localizadas (nome:linha): `sleep:11`, `run:15`, `send:28`, `screenshot:84`, `evalJS:93`.
- Imports literais: `ws`, `fs`, `path`.

## `tools/repoLint.js`

Analisa sintaxe e regras estruturais do repositório, saindo com erro em problemas detectados.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 9260 bytes; linhas: 299.
- Leitura: texto completo decodificado.
- SHA-256: `97cd4e776cc363200c1da3ab4ec8aee3fca865a98fb013d59efe8f15d001e34e`.
- Assinaturas localizadas (nome:linha): `collectJsFiles:48`, `checkSyntax:68`, `auditarSucesso:124`, `runRepoLint:148`, `findRoot:248`.
- Imports literais: `fs`, `path`, `vm`, `./successAudit.js`.
- Referenciado estaticamente por: `tests/regression/run-phase4a-tests.js`.

## `tools/reprocessIdentity.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Descrição declarada no cabeçalho: reprocessIdentity.js — PASSO 9/11/13 Lê o game/tl/<lang>/*.rpy já gravado pelo OpenTranslator, classifica CADA entrada com o guard C1 (classifyIdentity) e separa em dois destinos:

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 5035 bytes; linhas: 124.
- Leitura: texto completo decodificado.
- SHA-256: `9d6f744e1aef3f2a4548eabff5df2855cc0b0a9a1c11a5d21e90cd22b860ee8f`.
- Assinaturas localizadas (nome:linha): `parseRpyEntries:25`, `classifyAll:53`, `main:75`.
- Imports literais: `fs`, `path`, `../src/core/scriptDetector`, `os`.

## `tools/restore_rpgmaker.py`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 59326 bytes; linhas: 1212.
- Leitura: texto completo decodificado.
- SHA-256: `ebd01ad6e2b2eacd3ce90992ce3a831e3bf605f5f963e62c275ada2008ef878b`.
- Assinaturas localizadas (nome:linha): `RPGMakerRestorer:35`, `main:1119`, `__init__:43`, `_validate_dirs:60`, `_load_json:73`, `_save_json:86`, `_get_plugin_param_protection:96`, `run:110`, `run_standalone:159`, `_process_file:196`, `_process_plugins_file:210`, `_process_map_file:230`, `_process_common_events:287`, `_restore_event_commands:310`, `_restore_text_command_params:347`, `_restore_filename_command:376`, `_looks_like_filename:411`, `_process_system_file:425`, `_apply_forced_replacements:468`, `_apply_generic_patterns:516`, `_apply_system_json_replacements:662`, `_apply_plugins_js_replacements:687`, `_apply_common_events_replacements:711`, `_apply_map_file_replacements:760`, `_apply_cmd_replacements:789`, `_parse_json_string:846`, `_serialize_json_string:853`, `_get_nested_param_protection:857`, `_restore_plugin_params:863`, `_restore_nested_plugin_params:924`, `_restore_nested_json_params:1010`, `_process_generic_file:1058`, `_deep_restore_filenames:1065`, `_print_summary:1104`, `deep_replace:762`, `apply_ui_rules:619`.

## `tools/run-phase7-real-lab.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Descrição declarada no cabeçalho: run-phase7-real-lab.js — Verificador de Fluxo de Trabalho Real em Laboratório (E2E) Responsabilidades: - Executar staging seguro, análise, backup, modificação, rollback e conferência SHA-256

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 3456 bytes; linhas: 92.
- Leitura: texto completo decodificado.
- SHA-256: `e49392f9ef4b4eaafeb978d850b2d2790d26b8b5615a892f0df48e19f0cc07cb`.
- Assinaturas localizadas (nome:linha): `runLabVerification:17`.
- Imports literais: `fs`, `path`, `../src/core/realGameWorkflow`.

## `tools/run-pipeline-cli.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 1713 bytes; linhas: 55.
- Leitura: texto completo decodificado.
- SHA-256: `05898a5b423606c9ec368386d6403f4fe7695052b0042d3f862afa6edc6fdcf7`.
- Assinaturas localizadas (nome:linha): `findGameExe:22`.
- Imports literais: `fs`, `path`, `../src/utils/logger`, `../src/services/cache`, `../src/core/gameEngine`.

## `tools/successAudit.js`

Procura padrões e contratos de resultado que poderiam anunciar sucesso sem evidência.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 27300 bytes; linhas: 686.
- Leitura: texto completo decodificado.
- SHA-256: `310671983bc4f8dac5b9cb8979f6c9b12b2419ecc04788b40a101036b4fa0ff4`.
- Assinaturas localizadas (nome:linha): `__setRootForTest:89`, `ehComentario:100`, `saldoChaves:151`, `assinaturaMultilinha:178`, `pareceAssinatura:199`, `inicioFuncao:243`, `fimFuncao:254`, `mascaraStrings:305`, `indiceCatchEngolido:365`, `sucessoProtegido:403`, `temIO:417`, `temVerificacao:433`, `eParametroDeFuncao:448`, `parametros:457`, `afirmaSucesso:464`, `sucessoVazio:470`, `ecoaArgumento:478`, `listarJs:487`, `carregarAllowlist:496`, `audit:505`, `__debug:667`.
- Imports literais: `fs`, `path`.
- Referenciado estaticamente por: `tests/unit/successInvariant.test.js`, `tools/repoLint.js`.

## `tools/translate-locres.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 4170 bytes; linhas: 62.
- Leitura: texto completo decodificado.
- SHA-256: `cba2b3f3d58d207febc49ee0f17d13e0304974b07c414eb0b8feb5a79c6f313d`.
- Assinaturas localizadas (nome:linha): `translateLocRes:3`.
- Imports literais: `fs`, `path`, `../src/engines/unreal/unrealLocResProvider`, `../src/translation/translator`, `../src/services/cache`.

## `tools/universal_rpgmaker_gameplay_runner.js`

Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário. Descrição declarada no cabeçalho: universal_rpgmaker_gameplay_runner.js — Runner Universal de Gameplay e Save/Load Responsabilidades: - Executar testes de jogabilidade automatizados em jogos RPG Maker (MV e MZ)

- Categoria: Produto / ferramenta.
- Base da descrição: Cabeçalho declarado; não certificação.
- Tamanho: 9633 bytes; linhas: 219.
- Leitura: texto completo decodificado.
- SHA-256: `2536656038bc2f199c5732c45a1171446705675e10204961bc91fb45cfc44f2f`.
- Assinaturas localizadas (nome:linha): `rpc:17`, `testGame:26`, `setTimeout:69`, `setTimeout:158`.
- Imports literais: `child_process`, `fs`, `path`.

## `ui/app.js`

Interface principal: biblioteca, preferências, compatibilidade, cheats, modais e chamadas RPC. Reúne apresentação e controle de estado.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 199352 bytes; linhas: 4386.
- Leitura: texto completo decodificado.
- SHA-256: `46350411a69bbcff76db23b3454346103c2f86e0993d0ebb795241a537329962`.
- Assinaturas localizadas (nome:linha): `refreshProviderHealth:3`, `pingServer:58`, `waitForToken:78`, `rpc:86`, `basename:109`, `dirname:114`, `connectDualHook:131`, `subscribeTelemetry:163`, `unsubscribeTelemetry:170`, `esc:187`, `attr:190`, `num:193`, `html:196`, `txt:199`, `qs:202`, `qsa:205`, `$:208`, `log:211`, `showToast:215`, `adjustColorBrightness:272`, `applyTheme:294`, `updateEngineVisibility:310`, `loadCfg:321`, `saveCfg:365`, `t:865`, `refreshAppDataCard:885`, `startTelemetryLoop:915`, `launchGame:945`, `loadGames:1058`, `saveGame:1069`, `delGame:1076`, `detectEngine:1103`, `engineInfo:1111`, `engineSupportStatus:1116`, `engineSupportLabel:1121`, `engineIsJS:1127`, `build:1132`, `addGameFromExe:1646`, `qs:1703`, `updSB:1716`, `customConfirm:1723`, `renderGames:1759`, `openEdit:1852`, `atualizarSessaoRuntime:2167`, `pollJob:2414`, `findSaveDir:2959`, `renderSaves:2963`, `$:3078`, `$:3091`, `$:3115`, `loadGlossary:3125`, `renderGlossary:3134`, `$:3162`, `$:3171`, `getSelectedGameKey:3181`, `pollLogs:3651`, `keyLabel:3723`, `renderKeySelect:3724`, `initHotkeyUI:3727`, `applyHotkeys:3749`, `updateSubTabs:3768`, `renderRenpyVariables:3971`, `renderCompatibilityCards:4300`, `renderPerformance:4315`.
- Imports literais: `nw.gui`.

## `ui/favicon.ico`

Recurso visual: imagem, ícone, captura ou ilustração. A finalidade exata no produto exige referência de uso; nenhuma imagem foi interpretada apenas pelo nome.

- Categoria: Produto / ferramenta.
- Base da descrição: Metadados de recurso.
- Tamanho: 653696 bytes; linhas: não interpretadas.
- Leitura: bytes lidos; conteúdo não interpretado.
- SHA-256: `77e5b325e6e28df22a42cf774362e2d5e4eec760c1cce152cc46e5473ee150d4`.

## `ui/index.html`

Documento HTML de entrada; carrega a proteção de HTML e o aplicativo da interface.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 2033 bytes; linhas: 43.
- Leitura: texto completo decodificado.
- SHA-256: `1717424bbe45c84a356e4e1861690f850b80fcd34ad79be115802bfba71def90`.

## `ui/NotoSans/cjk/NotoSansCJKsc-Regular.otf`

Arquivo de fonte tipográfica. Usado na interface ou em integrações conforme referências de carregamento; cobertura de glifos não certificada por inventário.

- Categoria: Produto / ferramenta.
- Base da descrição: Metadados de fonte.
- Tamanho: 9225056 bytes; linhas: não interpretadas.
- Leitura: bytes lidos; conteúdo não interpretado.
- SHA-256: `ecd1416920dc7a79874c8ec36eb0b22915e344b8bb07827ccb3dccf4304b09ee`.

## `ui/OpenTranslator.png`

Recurso visual: imagem, ícone, captura ou ilustração. A finalidade exata no produto exige referência de uso; nenhuma imagem foi interpretada apenas pelo nome.

- Categoria: Produto / ferramenta.
- Base da descrição: Metadados de recurso.
- Tamanho: 653674 bytes; linhas: não interpretadas.
- Leitura: bytes lidos; conteúdo não interpretado.
- SHA-256: `e8d8635ac877796ec8339a85d56d4c15cb161d8b0ac46b8db6667a75690c473e`.

## `ui/rawres/notdef.ttf`

Arquivo de fonte tipográfica. Usado na interface ou em integrações conforme referências de carregamento; cobertura de glifos não certificada por inventário.

- Categoria: Produto / ferramenta.
- Base da descrição: Metadados de fonte.
- Tamanho: 219320 bytes; linhas: não interpretadas.
- Leitura: bytes lidos; conteúdo não interpretado.
- SHA-256: `dd734d4e2a40b380a1b5ac4adbb5985929ca6b0e2808cce62609343870bef543`.

## `ui/styles/base.css`

Estilos de base extraídos da interface anterior, incluindo fontes e componentes.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 15426 bytes; linhas: 334.
- Leitura: texto completo decodificado.
- SHA-256: `7cedd7d41b2a289fb4209d71fd584cdb4feeb11e4281b3b142f19c6a3bdd5abe`.

## `ui/styles/layout.css`

Layout atual, cartões de compatibilidade, preferências, acessibilidade e pontos de adaptação da janela.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 8038 bytes; linhas: 25.
- Leitura: texto completo decodificado.
- SHA-256: `ef65d024d25a076c822b3a84dd2c4c3bbb511888febf2d74cf0d5010c3b9504d`.

## `ui/UltraTranslateOverlay.js`

Apresentação no navegador local e tratamento das ações do usuário. Não há descrição suficientemente específica extraída; consultar assinaturas e referências.

- Categoria: Produto / ferramenta.
- Base da descrição: Localização / descrição limitada.
- Tamanho: 21247 bytes; linhas: 438.
- Leitura: texto completo decodificado.
- SHA-256: `975022bbfe7a168e85d92e2df22b28bc7ba5ba3f2dc3a228519ce496035e3125`.
- Assinaturas localizadas (nome:linha): `norm:37`, `loadDict:43`, `tr:92`, `autoWrap:144`, `hookLogWindowRefresh:334`, `autoHookLogMethods:362`.

## `ui/xssGuard.js`

Funções de escape e normalização de valores exibidos na interface.

- Categoria: Produto / ferramenta.
- Base da descrição: Explicação editorial do módulo.
- Tamanho: 8374 bytes; linhas: 230.
- Leitura: texto completo decodificado.
- SHA-256: `a5dfa3849068eee47f6deeb13227f08103e02b9bfaf5a1c8268d49897068dbf5`.
- Assinaturas localizadas (nome:linha): `escapeHtml:62`, `escapeAttr:74`, `safeNum:82`, `safeBool:90`, `sanitizeHtml:105`, `setText:180`, `replaceChildren:186`, `makeOption:195`, `makeEl:203`.
- Referenciado estaticamente por: `tests/unit/uiHealth.test.js`.
