# OpenTranslator — Estrutura Arquitetural do Repositório

Este documento define a separação física e lógica entre os quatro domínios do ecossistema **OpenTranslator**: **PRODUTO**, **LABORATÓRIO**, **ARQUIVO** e **DADOS**.

---

## 1. Visão Geral da Topologia Canônica

A raiz do repositório foi compactada e consolidada para eliminar fragmentação, agrupando responsabilidades relacionadas sob domínios claros:

```text
OpenTranslator/                  [DOMÍNIO DE PRODUTO & ARQUITETURA CONSOLIDADA]
├── OpenTranslator.exe           # Launcher executável portátil (C# / WinForms)
├── package.json                 # Manifesto npm unificado do projeto
├── server.js                    # Ponto de entrada oficial do backend HTTP/WebSocket
├── README.md                    # Apresentação oficial e guia de início
├── CHANGELOG.md                 # Histórico de versões
├── LICENSE                      # Licença MIT
├── .agents/                     # Regras e habilidades do agente (rules/ e skills/)
├── .github/                     # Workflows e automações GitHub
├── bin/                         # Runtime Node.js LTS portátil (independência de sistema, gitignored)
├── config/                      # Configurações e perfis de regras de sintaxe
├── data/                        # Dados de persistência (SQLite, memórias de tradução, glossários)
├── docs/                        # Documentação técnica e relatórios consolidados
│   ├── architecture/            # Especificações de arquitetura do pipeline e memória
│   ├── engines/                 # Matrizes de compatibilidade e suporte por engine
│   ├── reports/                 # Relatórios consolidados de certificação e auditoria
│   ├── user/                    # Guia do Usuário e Resolução de Problemas
│   └── INDEX.md                 # Catálogo mestre da documentação
├── launcher/                    # Código-fonte oficial do launcher em C#
├── loaders/                     # Injetores nativos, DLLs Dual Hook e fontes (endpoint /loaders/)
├── resources/                   # Recursos consolidados de engines, plugins e templates
│   ├── bakin/                   # Recursos de engine Bakin
│   ├── cheats/                  # Scripts e overlays de cheats
│   ├── evb/                     # Utilitários de empacotamento EVB
│   ├── renpy/                   # Runtimes, rpatool e unren_tools integrados
│   ├── rpgmaker/                # LatinNameInput e ponte Ruby Marshal
│   ├── srpgstudio/              # Recursos de SRPG Studio
│   ├── templates/               # Modelos CheatOverlayTemplate.js e anti-crash RPY
│   ├── unity/                   # Mono.Cecil e xunity_plugin (UltraBatchEndpoint)
│   └── unreal/                  # Recursos de engine Unreal
├── src/                         # Código-fonte canônico do backend
│   ├── core/                    # Pipeline, cache SQLite, circuit breaker, filas
│   ├── engines/                 # Adaptadores isolados por motor (Ren'Py, RPG Maker, Unity, etc.)
│   ├── extractors/              # Extratores especializados de texto
│   ├── injectors/               # Injetores e patchers de assets
│   ├── providers/               # Provedores de tradução com rate limiting
│   ├── services/                # Serviços de suporte de aplicação
│   ├── translation/             # Orquestrador de jobs e contabilidade de tradução
│   └── utils/                   # Utilitários e helpers de baixo nível
├── tests/                       # Suíte unificada de testes
│   ├── fixtures/                # Fixtures determinísticas leves
│   ├── integration/             # Testes de integração de adaptadores e provedores
│   ├── regression/              # Suíte mestre de 121 testes de regressão (Fases 1 a 9)
│   ├── unit/                    # Testes unitários
│   ├── validate_real_ui_certification.js  # Validador forense da matriz real
│   ├── validate_renpy_certification.js    # Certificação forense Ren'Py
│   └── validate_mz_certification.js       # Certificação forense RPG Maker MZ
├── third-party/                 # Dependências e componentes de terceiros com licenças
├── tools/                       # Ferramentas unificadas de CLI, manutenção, build e lint
├── ui/                          # Interface web frontend (HTML, CSS, JS)
└── archives/                    # [HISTÓRICO] Auditorias históricas, migrações e snapshots

OpenTranslator-Lab/              [DOMÍNIO DE LABORATÓRIO] (Externo ao Git)
├── fixtures/                    # Jogos e assets completos de teste (Ren'Py, Unity, etc.)
├── staging/                     # Pastas temporárias de descompactação de testes
├── benchmarks/                  # Resultados de testes de performance
├── forensic/                    # Dossiês individuais e evidências forenses
└── LAB_README.md                # Catálogo de fixtures e variáveis de ambiente
```

---

## 2. Regras de Governança por Diretório

### 🚀 PRODUTO (`src/`, `ui/`, `launcher/`, `resources/`, `loaders/`)
- **Regra**: Apenas código e binários indispensáveis para o funcionamento autônomo da aplicação final.
- **Proibição**: Nunca versionar jogos completos, arquivos `.rpa`, `.pak`, `.unity3d`, saves de jogos ou capturas de tela de gameplay dentro do repositório de produto.

### 🧪 LABORATÓRIO (`OpenTranslator-Lab/`)
- **Regra**: Localizado externamente ao repositório principal (`../OpenTranslator-Lab`).
- **Acesso**: Testes acessam este diretório respeitando as variáveis `OPENTRANSLATOR_LAB` ou caminhos relativos ao diretório pai.
- **Degradação Elegante**: Se um jogo pesado de laboratório não estiver presente na máquina de teste, o teste reporta de forma limpa, preservando o status determinístico da suíte de produto.

### 📦 ARQUIVO (`archives/`)
- **Regra**: Evidências de auditorias históricas, scripts de migrações anteriores e logs de análises que não pertencem ao produto ativo.

### 💾 DADOS (`data/`, `config/`)
- **Regra**: Contém glossários, dicionários e regras de sintaxe necessários para o funcionamento das engines. Dados efêmeros (sessões de runtime, caches temporários, locks de processos) são estritamente ignorados pelo `.gitignore`.
