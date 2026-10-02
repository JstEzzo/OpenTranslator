# OpenTranslator — Manifesto de Produção & Distribuição

Este documento define de forma precisa e auditada todos os arquivos, diretórios e subsistemas estritamente necessários para a execução autônoma do **OpenTranslator** em uma máquina limpa Windows x64.

---

## 1. Visão Geral de Componentes (454.8 MB Total)

| Categoria | Diretório / Arquivo | Tamanho | Descrição |
| :--- | :--- | :--- | :--- |
| **LAUNCHER** | `OpenTranslator.exe` | 684 KB | Executável C# compilado (orquestrador e inicializador) |
| **CORE BACKEND** | `Tool/server.js`, `Tool/src/` | 1.2 MB | Servidor HTTP/WebSocket, roteamento RPC e engines |
| **PORTABLE NODE** | `Tool/bin/node-v20.18.3-win-x64/` | 66.8 MB | Binário portátil oficial Node.js v20 LTS |
| **HOOK RUNTIME** | `Tool/loaders/` | 225.0 MB | Injetor (`inject.exe`), DLLs de interceptação e fonte |
| **SIDECARS & PYTHON** | `Tool/resources/` | 80.4 MB | Python 3.12 embutido, UnityPy, Retoc, UberWolfCli |
| **DEPENDENCIES** | `Tool/node_modules/` | 44.3 MB | better-sqlite3 (nativo ABI 115), ws, exceljs |
| **FRONTEND UI** | `Tool/www/` | 10.5 MB | Interface web moderna, assets NotoSans e overlay HUD |
| **CACHE & PERSISTÊNCIA** | `Tool/data/` | 14.8 MB | Banco `global_cache.db` (66k traduções) e TM |
| **ENGINES & TEMPLATES** | `Tool/templates/`, `Tool/xunity_plugin/` | 80 KB | Plugins XUnity e templates de injeção |
| **UNREN TOOLS** | `Tool/unren_tools/` | 467 KB | Descompiladores e extratores Ren'Py (`unrpyc`) |

---

## 2. Detalhamento por Categoria

### A. CORE & LAUNCHER (Obrigatório)
- `OpenTranslator.exe`: Ponto de entrada nativo do Windows. Detecta portas, inicializa o Node embarcado e abre a interface.
- `Tool/server.js`: Servidor de backend. Gerencia WebSockets, sessões, RPC e orquestração.
- `Tool/src/core/`:
  - `pipeline.js`: Pipeline universal de 6 estágios.
  - `engineDetector.js`: Detecção heurística de 14 engines.
  - `providerGateway.js`: Gateway resiliente de provedores de tradução com failover e circuit breaker.
  - `pluginSafePatcher.js`: Patcher atômico com validação sintática V8 e rollback criptográfico.
  - `translationAccounting.js`: Contabilidade rigorosa de tokens e caracteres.
  - `jobPersistence.js`: Persistência transacional SQLite com suporte a checkpoint e resume.
- `Tool/src/engines/`: Adaptadores oficiais (Ren'Py, RPG Maker, Unity, Unreal, Godot, Wolf, Electron, Generic).

### B. RUNTIMES & CARREGADORES (Obrigatório para Execução)
- `Tool/bin/node-v20.18.3-win-x64/node.exe`: Node.js portátil para execução sem dependência de instalação prévia no Windows do usuário.
- `Tool/loaders/inject.exe`: Orquestrador de injeção de processos nativos Windows.
- `Tool/loaders/*.dll`: DLLs de Dual Hook para interceptação de textos em runtime (`mzHook.dll`, `krkr2Hook.dll`, `wolfHook.dll`, `MonoJunkiex64.dll`, etc.).
- `Tool/loaders/opent_PGMMV_font.ttf`: Fonte universal para renderização CJK/Unicode.

### C. RECURSOS & SIDECARS DE ENGINE (Obrigatório para Extração)
- `Tool/resources/sidecar-manifest.json`: Manifesto de integridade criptográfica SHA-256 de todas as ferramentas.
- `Tool/resources/renpy/python/`: Python 3.12 embutido para processamento de bytecode Ren'Py.
- `Tool/resources/unity/python/`: Python embarcado com biblioteca `UnityPy` para extração de `.assets` e `AssetBundle`.
- `Tool/resources/unreal/retoc.exe`: Utilitário para manipulação de arquivos `.pak` e `Zen Store`.
- `Tool/resources/wolf/UberWolfCli.exe`: Utilitário de descompactação de pacotes Wolf RPG.

### D. DEPENDÊNCIAS DE RUNTIME (Obrigatório)
- `Tool/node_modules/better-sqlite3`: Driver nativo compilado C++ para alta performance SQLite.
- `Tool/node_modules/ws`: Servidor de WebSockets de alta velocidade.
- `Tool/node_modules/exceljs`: Importação e exportação de planilhas de localização.

### E. BANCO DE DADOS & CACHE (Obrigatório)
- `Tool/data/global_cache.db`: Banco de dados SQLite de cache global de tradução com 66.720 pares traduzidos.
- `Tool/data/translation_memory.sqlite`: Memória de tradução contextual com 2.818 segmentos.
- `Tool/data/capability-matrix.json`: Matriz de capacidade de motores validada.
- `Tool/data/openT.json`: Configuração de preferências e portas do launcher.

---

## 3. O QUE NÃO PERTENCE À DISTRIBUIÇÃO FINAL (EXCLUÍDOS DO RELEASE)

| Item | Localização Atual | Motivo da Exclusão |
| :--- | :--- | :--- |
| **Jogos de Fixture** | `OpenTranslator-Lab/fixtures/` | Builds inteiras de jogos comerciais (5.8 GB) usadas apenas em testes |
| **Staging Temporário** | `OpenTranslator-Lab/staging/` | Descompactações temporárias de testes passados |
| **Histórico de Fases** | `archive/audits/`, `docs/history/` | Relatórios de fases de desenvolvimento arquivados |
| **Code Graph AST** | `archive/analysis/graphify-out/` | Saídas do Graphify geradas em auditoria |
| **Logs de Testes** | `archive/logs/test_runs/` | Logs efêmeros de testes anteriores |
| **Transações Antigas** | `archive/transactions/` | Arquivos JSON de transações de testes já commitadas |
