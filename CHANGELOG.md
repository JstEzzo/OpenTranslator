# CHANGELOG — OpenTranslator

## [2.1.0] - 2026-09-16 (Fase 2 — Hardening & Core Integration)

### Adicionado
- **QAEngine Dedicado** (`Tool/src/core/qaEngine.js`): Validação rigorosa de tokens de código, tags de formatação, números, URLs, balanço de chaves e detecção de corrupção de encoding.
- **CodeProtector 2.0**: Validação de integridade token-a-token comparando o texto traduzido antes de aplicar.
- **TranslationMemory 2.0**: Memória de tradução hierárquica (Game -> Project -> Engine -> Global), StringIdentity estável, Delta Translation e Glossário Inteligente ordenado por prioridade de comprimento.
- **Electron Runtime Bridge 2.0** (`Tool/src/engines/electron/electronBridge.js`): Servidor local seguro (localhost, random crypto token) e script de injeção de DOM com MutationObserver e suporte a Shadow DOM.
- **OCRProvider 2.0**: Regiões adaptativas pré-configuradas (dialogue, subtitle, menu) e filtro de estabilidade de frames (anti-flicker e debounce de typewriter).
- **SelfTest & DiagnosticBundle** (`Tool/src/core/selfTest.js`, `Tool/src/core/diagnosticBundle.js`): Diagnóstico automatizado de ambiente e mascaramento estrito de segredos/tokens de API.
- **GameService Integrado ao RPC**: Endpoints `analyzeGame`, `dryRunGame`, `startTranslationJob`, `getJobStatus`, `rollbackGame`, `runSelfTest`.

### Corrigido
- **Eliminação de Competição Silenciosa de Pipelines**: Chamadas de tradução da UI e RPC roteadas diretamente para o novo `TranslationPipeline` e `GameService`.
- **Prevenção de Configurações Órfãs no UnityAdapter**: Bloqueada a geração de arquivos `AutoTranslatorConfig.ini` se o ambiente BepInEx não estiver instalado no jogo.
- **OwnedProcess no Shutdown**: Substituído o comando destrutivo `taskkill /F /IM` em `httpServer.js` por encerramento estrito de processos criados pelo OpenTranslator.
- **Correção no CodeProtector**: Suporte a opções em objeto ou string no construtor e regex universal para tokens compostos (`⟦OT_[A-Z0-9_]+⟧`).

### Verificado
- **26 Testes Automatizados Aprovados**: 15 testes na suíte geral e 11 testes na suíte de hardening da Fase 2.
- **22 Jogos Reais Escaneados no Laboratório**: Extração validada em Ren'Py (2.8k strings), RPG Maker MV/MZ (até 164k strings), RGSS, Wolf RPG e Electron.

---

## [2.0.0] - 2026-09-16 (Fase 1 — Modular Engine Upgrade)
- Criação do EngineDetector com heurística de PE, diretórios e subpastas.
- Criação do EngineRegistry e BaseEngineAdapter.
- Implementação inicial de TranslationPipeline, BackupManager e JobSystem.
- Resolução do carregamento canônico de Ren'Py via `game/tl/`.
