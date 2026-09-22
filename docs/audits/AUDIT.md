# AUDIT: OpenTranslator - Auditoria Técnica de Arquitetura e Engenharia

**Data da Auditoria:** 16 de Setembro de 2026  
**Status do Repositório:** Branch universal-translation-upgrade  
**Engenheiro Responsável:** Agente Principal de Engenharia  

---

## 1. Visão Geral da Arquitetura Atual

O **OpenTranslator** é uma aplicação híbrida desktop baseada em:
- **Backend**: Node.js v20+ (`Tool/server.js`) expondo uma API RPC via HTTP na porta `8080`, WebSocket de cheats na porta `16005`, e banco SQLite via `better-sqlite3` (`Tool/data/global_cache.db`).
- **Frontend**: Single Page Application (SPA) Vanilla JS (`Tool/www/app.js`, `index.html`) estilizada com tema escuro e fontes Inter.
- **Componentes Nativos / Ferramentas Auxiliares**:
  - Python 3.12 embedded em `Tool/resources/renpy/python/`
  - Ferramentas de descompilação Ren'Py (`unrpyc_v2`, `unrpyc_legacy`)
  - DLLs e executáveis de injeção em `Tool/loaders/` (`inject.exe`, `PIDDLLInject64.exe`, `mzHook.dll`, `RGSSHook.dll`, `wolfHook.dll`, `PythonHook.dll`, `MonoJunkie.dll`, etc.)
  - Ferramentas de unpack de RPG Maker / Wolf (`UberWolfCli.exe`, `marshal_bridge.py`)

---

## 2. Inventário de Componentes e Estrutura de Código

| Componente | Arquivo | Responsabilidade Atual | Estado / Qualidade |
|---|---|---|---|
| **Entrypoint** | `Tool/server.js` | Inicialização global, portas, interceptação de processos, traps de saída. | Parcialmente funcional; contém traps agressivos de encerramento de processos. |
| **Engine Core** | `Tool/src/gameEngine.js` | Detecção de engine, orquestração de backup, extração, patching e execução. | Monolítico (~1600 linhas). Detecção frágil com falsos positivos. |
| **Extractor** | `Tool/src/extractor.js` | Extração de strings JSON e parâmetros de plugins de RPG Maker. | Estável para RPG Maker MV/MZ; inexistente para outras engines. |
| **Translator** | `Tool/src/translator.js` | Conexão com Google GTX, Bing, Papago, MyMemory, Yandex, LLM, DeepL. | Funcional com Smart Switching; placeholders e tags sofrem corrupção. |
| **Cache / DB** | `Tool/src/cache.js` | Persistência SQLite (`global_cache.db`), glossário e configs. | Funcional para pares simples; carece de contexto e metadados. |
| **RPC Handlers** | `Tool/src/rpcHandlers.js` | Ponte entre o frontend e a lógica de negócio (~1450 linhas). | Monolítico; handlers desconectados de adapters modernos. |
| **Engine Handlers** | `Tool/src/engines/*` | Tentativa inicial de modularização (`renpy`, `rpgmaker`, `unreal`). | Desconectados do pipeline principal; código morto. |
| **Frontend** | `Tool/www/app.js` | UI, listagem de jogos, logs e configuração. | Rico visualmente, mas rotula Unity como "fantasma" e carece de diagnósticos dinâmicos. |

---

## 3. Problemas Críticos e Bugs Encontrados

### 3.1 Ren'Py (Gravidade: ALTA / BLOQUEANTE)
1. **Caminho Quebrado no Python Embedded**:
   - Arquivo: `Tool/resources/renpy/python/python312._pth`
   - Conteúdo: apontava para `..\unrpyc`.
   - Realidade: as pastas no repositório são `unrpyc_v2` e `unrpyc_legacy`.
   - Efeito: qualquer execução de `unrpyc.py` através do Python embutido falhava instantaneamente com `ModuleNotFoundError: No module named 'decompiler'`.
2. **Caminho Quebrado no Unpacker Principal**:
   - Arquivo: `Tool/resources/renpy/unpack_renpy_all.py` (L32)
   - Conteúdo: `UNRPYC_SCRIPT = os.path.join(..., "unrpyc", "unrpyc.py")` (inexistente).
   - Efeito: descompilação de `.rpyc` sempre caía em erro ou no fallback inoperante.
3. **Abordagem Destrutiva Não-Canônica**:
   - Arquivo: `Tool/src/engines/renpy/renpyCommon.js` -> `patchRpyFiles`
   - Problema: executava `split().join()` diretamente sobre os scripts `.rpy` do jogo original.
   - Efeito: corrompe docstrings, variáveis de substituição, parâmetros de tela e quebra o jogo original. Ignorava o padrão nativo oficial do Ren'Py (`game/tl/<idioma>/`).
4. **Handlers Desconectados e Binário Incompatível**:
   - Arquivos: `renpyV8Handler.js` e `renpyV7Handler.js`
   - Problema: nunca eram chamados pelo `launchGame` nem pelo `executeTranslationPipeline`. Além disso, chamavam `execFile('python3', ...)` que não existe nativamente no Windows (onde o executável é `python.exe`).
5. **Injeção de DLL Obsoleta**:
   - Ren'Py 8.x roda em Python 3.9+ (ou Python 3.12 no caso de jogos recentes). O sistema tentava injetar `PythonHook64.dll` (compilada para Python antigo de MTool), causando crash fatal do processo do jogo.

### 3.2 Unity (Gravidade: ALTA)
1. **Status "Fantasma"**:
   - No backend, `getHookDll("unity", ...)` retorna `null`.
   - `installUnity()` em `rpcHandlers.js` apenas criava diretórios vazios em `BepInEx/config` com um `.ini` apontando para `Tool/xunity_plugin/UltraBatchEndpoint.dll` (arquivo excluído do disco).
   - O pipeline estático era ignorado porque `ENGINES_DEF.unity.js` era `false`.
2. **Falta de Diferenciação Mono vs IL2CPP**:
   - Jogos Unity Mono possuem estrutura de assemblies .NET (`*_Data/Managed/Assembly-CSharp.dll`, `MonoBleedingEdge`), enquanto IL2CPP compila C# para C++ nativo (`GameAssembly.dll`). O sistema ignorava essa distinção essencial.

### 3.3 Electron / Chromium / Web Games (Gravidade: ALTA)
1. **Engine Não Registrada**:
   - Electron não constava no `ENGINES_DEF` nem no `detectEngine`. Jogos Electron caíam no fallback indevido de RPG Maker MZ.
2. **Ausência de Módulo ASAR**:
   - Sem manipulador para `resources/app.asar` (desempacotamento, tradução e reempacotamento seguro com backup).
3. **Falta de Ponte DOM / CDP**:
   - Não havia ponte genérica para inspecionar o DOM, elementos HTML e frameworks (React/Vue/Fiber) em tempo real via Chrome DevTools Protocol ou script preload.

### 3.4 Detecção de Engines e Falsos Positivos (Gravidade: MÉDIA)
1. **Leitura UTF-8 Ingênua de PE**:
   - `detectEngine` lia os primeiros 100.000 bytes do executável como string UTF-8, ignorando strings UTF-16LE típicas de binários PE no Windows.
2. **Fallback Arbitrário**:
   - Se um executável tivesse a palavra "game" ou não fosse reconhecido, retornava forçadamente `"mz"` (RPG Maker MZ).

### 3.5 Preservação de Tags e Códigos (Gravidade: ALTA)
1. **Expressão Regular Incompleta (`ESC_RE`)**:
   - Cobria apenas sintaxe de RPG Maker (`\V[...]`, `\C[...]`).
   - Tags de Ren'Py (`{color}`, `{b}`, `[var]`), Unity (`<color>`, `{0}`) e Python (`%s`, `%(name)s`) eram enviadas cruas aos tradutores, gerando corrupção e erros gramaticais.
2. **Reinserção por Offset Frágil**:
   - A reinserção baseava-se em deslocamentos de caracteres da frase original, desalinhando totalmente as tags após a tradução em português.

### 3.6 Ausência de OCR e Fallback (Gravidade: ALTA)
- O projeto não possuía nenhum módulo de OCR, captura de tela ou processamento de imagens, deixando o usuário sem alternativa quando arquivos ou hooks falhavam.

### 3.7 Risco de Fechamento Indesejado de Processos (Gravidade: CRÍTICA)
- Em `Tool/src/rpcHandlers.js` (L369-371), `launchGame` executava `Stop-Process -Force` em qualquer processo dentro da pasta do jogo antes de iniciar, violando a integridade da sessão do usuário.

---

## 4. Plano de Correção e Ações Imediatas

1. **Refatoração da Arquitetura Core**:
   - Criar `Tool/src/core/` contendo:
     - `engineDetector.js`: Detecção multicritério baseada em evidências, com nível de confiança real.
     - `engineRegistry.js`: Registro e resolução de adapters de engine.
     - `baseEngineAdapter.js`: Interface base para ciclo de vida de tradução e capacidades.
     - `codeProtector.js`: Blindagem universal de tags com substituição por tokens e restauração estruturada.
     - `backupManager.js`: Gerenciamento transacional de backups com `metadata.json` e rollback.
     - `translationPipeline.js`: Orquestrador com seleção de estratégias baseadas em capacidades.
2. **Reforma Completa do Ren'Py**:
   - Corrigir `python312._pth` e caminhos em `unpack_renpy_all.py`.
   - Implementar `RenpyAdapter` com extração via `unrpyc_v2`/`legacy` e geração nativa em `game/tl/<lang>/` (preservação 100% dos scripts originais).
3. **Implementação de Adapters Reais**:
   - `ElectronAdapter`: Gerenciamento de `app.asar` e runtime DOM bridge com suporte a React/Vue.
   - `UnityAdapter`: Identificação de Mono vs IL2CPP, configuração automatizada de Doorstop/BepInEx e fallback.
   - `RpgMakerAdapter`: Preservação e encapsulamento de MV/MZ e RGSS (Ruby).
   - `GenericAdapter`: Scanner universal de textos e localização para engines desconhecidas.
4. **Módulo de OCR para Fallback**:
   - Implementar `Tool/src/ocr/ocrProvider.js` com captura de janela, hash cache e overlay.
5. **Segurança de Processos**:
   - Eliminar qualquer terminação forçada de processos (`Stop-Process -Force` / `taskkill` indevido).
