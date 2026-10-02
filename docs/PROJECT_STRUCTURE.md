# OpenTranslator — Estrutura Arquitetural do Repositório

Este documento define a separação física e lógica entre os quatro domínios do ecossistema **OpenTranslator**: **PRODUTO**, **LABORATÓRIO**, **ARQUIVO** e **DADOS**.

---

## 1. Visão Geral da Topologia

```text
OpenTranslator/                  [DOMÍNIO DE PRODUTO & ARQUITETURA PROFISSIONAL FÍSICA]
├── OpenTranslator.exe           # Launcher executável portátil (C# / WinForms)
├── package.json                 # Manifesto npm unificado do projeto
├── package-lock.json            # Bloqueio de versões exatas de dependências
├── server.js                    # Ponto de entrada oficial do backend HTTP/WebSocket
├── README.md                    # Apresentação oficial e guia de início
├── CHANGELOG.md                 # Histórico de versões
├── LICENSE                      # Licença MIT
├── .agents/                     # Regras e habilidades do agente (rules/ e skills/)
├── .github/                     # Workflows e automações GitHub
├── bin/                         # Runtime Node.js LTS portátil (independência de sistema)
├── config/                      # Configurações e perfis do sistema
├── data/                        # Dados de runtime (SQLite global_cache.db, memórias, logs)
├── docs/                        # Documentação técnica e manuais atualizados
│   ├── architecture/            # Especificações de arquitetura do pipeline
│   ├── engines/                 # Matrizes de compatibilidade e suporte por engine
│   ├── runtime/                 # Guias de Dual Hook e injeção
│   ├── user/                    # Guia do Usuário e Resolução de Problemas
│   └── INDEX.md                 # Catálogo mestre da documentação
├── gameLib/                     # Biblioteca de jogos registrados e metadados
├── launcher/                    # Código-fonte oficial do launcher em C#
├── loaders/                     # Injetores nativos, DLLs Dual Hook e fontes
├── logs/                        # Logs de execução do sistema
├── node_modules/                # Dependências instaladas (better-sqlite3, ws, exceljs)
├── reports/                     # Relatórios de auditoria, certificação e evidências visuais
│   └── evidence/                # Evidências forenses e capturas de tela comprovadas
├── resources/                   # Sidecars por engine (Python 3.12, UnityPy, etc.)
├── scripts/                     # Scripts de automação, auditoria e tarefas de manutenção
├── src/                         # [FÍSICO REAL] Código-fonte canônico do backend
│   ├── core/                    # Pipeline, cache SQLite, circuit breaker, filas
│   ├── engines/                 # Adaptadores isolados por motor (Ren'Py, RPG Maker, Unity, etc.)
│   ├── providers/               # Provedores de tradução com rate limiting
│   └── utils/                   # Utilitários e helpers de baixo nível
├── templates/                   # Modelos de scripts e injeção
├── tests/                       # [FÍSICO REAL] Suíte de testes de certificação e validação
├── tools/                       # [FÍSICO REAL] Utilitários de desenvolvimento e linters
├── ui/                          # [FÍSICO REAL] Interface web frontend (HTML, CSS, JS)
├── unren_tools/                 # Ferramentas Ren'Py portáteis (unrpyc, rpatool)
├── xunity_plugin/               # Plugin e bridge para XUnity Auto Translator
└── archives/                    # [DOMÍNIO DE ARQUIVO HISTÓRICO]
    ├── audits/                  # Inventários forenses e evidências físicas auditadas
    └── backups/                 # Backups históricos pré-migração

OpenTranslator-Lab/              [DOMÍNIO DE LABORATÓRIO] (Externo, ~5.89 GB)
├── fixtures/                    # Jogos e assets completos de teste (Ren'Py, Unity, etc.)
├── staging/                     # Pastas temporárias de descompactação de testes
├── benchmarks/                  # Resultados de testes de performance
├── forensic/                    # Dossiês individuais de análise reversa
├── archive/                     # Artefatos pesados arquivados
└── LAB_README.md                # Catálogo de fixtures e variáveis de ambiente
```

---

## 2. Regras de Governança por Diretório

### 🚀 PRODUTO (`OpenTranslator/Tool/`, `OpenTranslator.exe`)
- **Regra**: Apenas código e binários indispensáveis para o funcionamento autônomo da aplicação final.
- **Proibição**: Nunca comitar jogos completos, arquivos `.rpa` gigantes, `.unity3d` ou dumps temporários dentro da pasta do produto.

### 🧪 LABORATÓRIO (`OpenTranslator-Lab/`)
- **Regra**: Fica localizado externamente ao produto principal.
- **Acesso**: Testes acessam este diretório através do módulo unificado `Tool/src/tests/testPaths.js` e respeitam as variáveis `OPENTRANSLATOR_LAB` ou `LAB_ROOT`.
- **Degradação Elegante**: Se um jogo pesado de laboratório não estiver presente na máquina de teste, o teste reporta `LAB_FIXTURE_NOT_INSTALLED` de forma limpa, sem falhar a suíte do produto.

### 📦 ARQUIVO (`OpenTranslator/archive/`)
- **Regra**: Evidências de auditorias, snapshots de banco de dados antigos e saídas estáticas de ferramentas de análise que não devem poluir a raiz do projeto nem ser distribuídas no pacote final.

### 💾 DADOS (`Tool/data/`)
- **Regra**: Contém o banco de produção `global_cache.db` (66.720 pares), `translation_memory.sqlite` (2.818 entradas), `capability-matrix.json` e o log de execução ativa `openT.log`.
- **Higiene**: Transações commitadas de testes e logs transitórios são arquivados ou limpos automaticamente pelo script de manutenção.
