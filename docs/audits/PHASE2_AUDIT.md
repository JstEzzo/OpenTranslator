# PHASE 2 AUDIT — OpenTranslator Integration & Real Hardening

**Data:** 16 de Setembro de 2026  
**Auditor:** Agente Principal de Engenharia  
**Branch:** universal-translation-upgrade  
**Escopo:** Auditoria de integração das novas classes e componentes do OpenTranslator (Fase 1 -> Fase 2).

---

## 1. Visão Geral da Auditoria de Integração

A Fase 1 estabeleceu uma arquitetura modular (`EngineDetector`, `EngineRegistry`, `BaseEngineAdapter`, `CodeProtector`, `BackupManager`, `TranslationPipeline`, adapters para Ren'Py, RPG Maker, Electron, Unity, Generic, e OCR).

Esta auditoria de integração da **Fase 2** analisou a conexão real entre esses módulos e a aplicação final (RPC, Web Server, GUI, runtime e laboratório real).

---

## 2. Inconsistências e Gaps Identificados

| Módulo / Camada | Estado Encontrado | Diagnóstico Crítico | Ação Corretiva na Fase 2 |
| :--- | :--- | :--- | :--- |
| **`rpcHandlers.js`** | Chamando pipeline legado | `rpcHandlers.js` mantinha `detectEngine` da `gameEngine.js` legado e chamada de `executeTranslationPipeline` para RPG Maker, chamando o novo pipeline apenas para Ren'Py. `GameService` não estava conectado aos endpoints do RPC. | Refatorar `rpcHandlers.js` para delegar para `GameService`, adicionando endpoints para `analyzeGame`, `dryRun`, `startJob`, `getJobStatus`, `rollbackGame` e `selfTest`. |
| **`gameEngine.js`** | Código legado competindo | Existência de dois pipelines paralelos com lógicas de backup e heurísticas duplicadas. | Encapsular `gameEngine.js` como legacy fallback; redirecionar fluxos principais para `TranslationPipeline` e `GameService`. |
| **`CodeProtector`** | Proteção regex básica | Protegia tags, mas não validava a integridade estrutural após tradução (ex.: `{color=#fff}` transformado em `{color}` ou atributos corrompidos). | Implementar **CodeProtector 2.0** com validação de tokens (`validateTokens(original, translated)`) e detecção de nesting/atributos. |
| **`TranslationPipeline`** | Validação simplificada | O estágio `validate()` checava apenas se o texto traduzido não era vazio. Não checava tokens perdidos, placeholders desbalanceados ou anomalias de formatação. | Criar **QAEngine** (`Tool/src/core/qaEngine.js`) com regras rigorosas: tags de escape, URLs, placeholders numéricos, ICU formats, comprimento e encoding. |
| **`TranslationMemory`** | Sem identidade estável de string | Chaveamento dependia estritamente de hash do texto original, sem identificador estável de arquivo/label/speaker (`StringIdentity`), dificultando delta updates entre versões de jogos. | Implementar `StringIdentity` (`engine|file|label|speaker|hash`), Glossário Inteligente com prioridades e Delta Translation (`UNCHANGED`, `NEW`, `CHANGED`, `REMOVED`). |
| **`UnityAdapter`** | Possível arquivo de config órfão | Podia escrever configuração de BepInEx mesmo se os binários do BepInEx não estivessem presentes no diretório do jogo. Suporte a IL2CPP não estava demarcado formalmente como Read-Only / OCR. | Validar presença de DLLs e executáveis antes de gerar qualquer arquivo de configuração. Demarcar IL2CPP estritamente como *Read-Only / Runtime Bridge / OCR*. |
| **`ElectronAdapter`** | Extração estática básica | Extraía JSONs via `asarUtil`, mas não possuía camada de bridge para runtime com DOM MutationObserver ou captura de texto dinâmico. | Criar `Tool/src/engines/electron/electronBridge.js` com script injetável de MutationObserver e servidor local seguro (token único, localhost only). |
| **`OCRProvider`** | Captura de tela cheia sem presets | Não possuía presets de regiões adaptativas (diálogos, menus, legendas) nem debounce para texto em animação/digitação frame-a-frame. | Implementar detecção de regiões pré-definidas (`dialogue`, `subtitle`, `menu`), filtro de estabilidade de texto (aguardar estabilização de frames) e escala/pré-processamento. |
| **Process Management** | `checkProcessRunning` genérico | Embora `ownedProcess.js` tenha sido criado, alguns pontos de `rpcHandlers` ainda consultavam processos globais por nome. | Padronizar todas as verificações de processo através do `ownedProcessManager`. |
| **GUI (`www/`)** | Interface não refletia o Core | A UI não exibia diagnósticos detalhados de engine (evidências, estratégia recomendada, status de jobs em background, cache hit rate). | Criar endpoints RPC e funções no frontend para exibir diagnósticos completos, barra de jobs assíncronos e botão de Dry Run. |

---

## 3. Plano de Ação Imediato

1. **Implementar `QAEngine` (`Tool/src/core/qaEngine.js`)** e conectar ao `TranslationPipeline`.
2. **Evoluir `CodeProtector` para 2.0** com validação de integridade token a token.
3. **Evoluir `TranslationMemory` para 2.0** com `StringIdentity`, glossário inteligente e delta translation.
4. **Endurecer `UnityAdapter`** para evitar configurações inválidas e classificar Mono vs IL2CPP.
5. **Criar `ElectronBridge`** para observação de DOM e suporte a frameworks web.
6. **Evoluir `OCRProvider`** com regiões adaptativas e estabilização de frames.
7. **Implementar `SelfTest`** de ambiente (Node, Python, ferramentas de engine).
8. **Integrar `GameService` totalmente ao `rpcHandlers.js`** e fornecer APIs para a GUI.
9. **Executar testes automatizados e de regressão no laboratório real**.
