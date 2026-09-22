# OpenTranslator — Arquitetura de Sistema (Versão 2.0)

Este documento detalha o design arquitetural, o ciclo de vida de tradução e as garantias de segurança do OpenTranslator.

---

## 1. Visão Geral em Camadas

```text
+-----------------------------------------------------------------------+
|                           CAMADA DE APRESENTAÇÃO                      |
|                  GUI Web (HTML5 / Vanilla CSS / ES2022)               |
+-----------------------------------------------------------------------+
                                  |
                        POST /api/rpc (JSON)
                                  ↓
+-----------------------------------------------------------------------+
|                             CAMADA DE RPC                             |
|              rpcHandlers.js  <--->  httpServer.js (Auth Token)        |
+-----------------------------------------------------------------------+
                                  |
                                  ↓
+-----------------------------------------------------------------------+
|                           CAMADA DE SERVIÇO                           |
|                    GameService (gameService.js)                       |
|        - Detecção & Análise Técnica       - Orquestração de Jobs      |
|        - Gestão de Processos (OwnedProcess) - SelfTest & Diagnósticos  |
+-----------------------------------------------------------------------+
                                  |
        +-------------------------+-------------------------+
        |                                                   |
        ↓                                                   ↓
+-----------------------+                         +---------------------+
|    EngineDetector     |                         | TranslationPipeline |
| - Heurística Ponderada|                         | - Dry-Run Nativo    |
| - Inspeção de PE / ASAR|                         | - BackupManager     |
| - Subdiretórios       |                         | - Rollback Automático|
+-----------------------+                         +---------------------+
        |                                                   |
        ↓                                                   ↓
+-----------------------+                         +---------------------+
|    EngineRegistry     |                         | CodeProtector 2.0   |
| - RenpyAdapter        |                         | + QAEngine          |
| - RpgMakerAdapter     |                         | - Tokens Estruturados|
| - ElectronAdapter     |                         | - Validação Sintaxe |
| - UnityAdapter        |                         +---------------------+
| - GenericAdapter      |                                   |
+-----------------------+                                   ↓
                                                  +---------------------+
                                                  | TranslationMemory   |
                                                  | - SQLite WAL        |
                                                  | - StringIdentity    |
                                                  | - Glossário Priorit.|
                                                  +---------------------+
```

---

## 2. Ciclo de Vida da Tradução (Pipeline)

1. **Análise & Detecção**: `EngineDetector` avalia arquivos marcadores, executáveis PE e subpastas para identificar a engine e versão com evidências ponderadas.
2. **Resolução de Adapter**: O `EngineRegistry` seleciona o adapter especializado mais adequado.
3. **Extração & Proteção de Código**: O adapter extrai textos traduzíveis e o `CodeProtector` substitui expressões de código (tags Ren'Py, escape RPG Maker, rich text Unity) por tokens estáveis (`⟦OT_...``).
4. **Consulta à Memória Hierárquica**: O `TranslationMemory` busca traduções prévias por prioridade (`Game -> Project -> Engine -> Global`).
5. **Tradução em Batch**: Apenas strings inéditas são enviadas ao provedor de tradução configurado.
6. **Validação de QA (QAEngine)**: Valida que nenhum token foi removido ou corrompido, e verifica balanço de tags, chaves, URLs e encoding.
7. **Transação Segura & Commit**:
   - Criação de backup verificado por hash SHA-256.
   - Aplicação dos arquivos traduzidos na pasta do jogo.
   - Se ocorrer qualquer erro durante a aplicação, o `rollback` é disparado automaticamente.

---

## 3. Garantias de Segurança de Processos

- **OwnedProcess**: O OpenTranslator mantém um registro estrito de PIDs gerados durante a sessão (`ownedProcesses`).
- **Zero Process Killing de Terceiros**: Comandos destrutivos globais como `taskkill /F /IM exeName` foram eliminados do encerramento da aplicação. Somente os processos iniciados pelo próprio OpenTranslator são fechados.
