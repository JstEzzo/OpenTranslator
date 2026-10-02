<div align="center">

<img src="resources/OpenTranslator.ico" width="100" alt="OpenTranslator Logo"/>

# OpenTranslator

**Plataforma Universal de Tradução, Modding e Cheats Offline-First para Jogos.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-Port%C3%A1til%20Integrado-green?logo=node.js)](#)
[![Status](https://img.shields.io/badge/Status-Produ%C3%A7%C3%A3o%20Est%C3%A1vel-success)](#)
[![Launcher](https://img.shields.io/badge/Launcher-Nativo%20EXE-orange)](#)

</div>

---

## ✨ Destaques da Aplicação

- **Ponto Único de Entrada**: Inicie diretamente pelo executável nativo `OpenTranslator.exe`.
- **Autodiagnóstico Pré-Voo**: O launcher realiza 10 checagens reais de integridade (binários, runtime, portas 8080/16005, permissões, servidor HTTP 200, frontend e RPC) antes de liberar a interface.
- **Tela de Recuperação & Safe Start**: Em caso de portas ocupadas ou processos travados, o launcher oferece modos guiados de correção e recuperação.
- **Rollback Atômico com SHA-256**: Os arquivos originais dos jogos contam com backup automático e validação criptográfica byte-a-byte.
- **Dual Hook em Tempo Real (Porta 16005)**: Suporte a overlay e cheats em tempo real durante a execução do jogo.
- **Zero Configuração Manual**: Runtime integrado e caminhos 100% dinâmicos (funciona em qualquer diretório).

---

## 🎮 Motores de Jogos Suportados

| Motor de Jogo | Tradução Estática | Hook em Tempo Real | Recursos Especiais |
|---|:---:|:---:|---|
| **Ren'Py (Python 2 & 3)** | ✅ | ✅ | Descompilação `.rpyc`, injeção `000_anti_crash.rpy`, rpatool integrado |
| **RPG Maker (MV & MZ)** | ✅ | ✅ | Dual Hook WebSocket (16005), LatinNameInput, CheatOverlay |
| **RPG Maker (XP, VX, VX Ace)** | ✅ | ✅ | Descriptografia `.rgss3a`, Ruby Marshal Bridge |
| **Wolf RPG Editor** | ✅ | ✅ | UberWolfCli integrado, tradução de strings de eventos |
| **Unity Engine** | ✅ | ✅ | UltraBatchEndpoint.dll, BepInEx XUnity AutoTranslator |
| **Unreal Engine** | ✅ | — | Extração de `.pak` e tabelas `.locres` |
| **Visual Novels / Genérico** | ✅ | ✅ | Hook de memória e tradução com memória global SQLite |

---

## 🚀 Como Executar

### Para o Usuário Final:
1. Dê um duplo-clique em **`OpenTranslator.exe`** na raiz da pasta.
2. O sistema fará a checagem de integridade em ~2 segundos.
3. A interface web será aberta automaticamente no seu navegador padrão (`http://localhost:8080`).
4. Para fechar, clique em **Encerrar OpenTranslator** no painel do launcher ou na bandeja do Windows (System Tray).

### Modo de Teste e Autodiagnóstico por Linha de Comando (CI/Dev):
```bash
# Executa todas as 10 checagens de integridade e retorna código 0 (sucesso) ou 1 (falha):
OpenTranslator.exe --smoke-test

# Inicia exibindo diretamente o painel de logs detalhados:
OpenTranslator.exe --debug

# Inicia em modo de segurança:
OpenTranslator.exe --safe
```

---

## 📁 Estrutura Canônica do Repositório

O repositório adota uma topologia compacta e modular dividida em domínios arquiteturais claros, documentada detalhadamente em [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md):

```text
OpenTranslator/                  ← [PRODUTO & DESENVOLVIMENTO]
├── OpenTranslator.exe           ← Executável principal (Launcher nativo C#)
├── server.js                    ← Ponto de entrada do servidor backend HTTP/WebSocket
├── package.json                 ← Manifesto npm oficial do projeto
├── README.md                    ← Documentação principal do repositório
├── .github/                     ← Workflows de CI/CD do GitHub
├── config/                      # Regras de sintaxe e configurações de engines
├── data/                        # Memória de tradução, glossários e dados de persistência
├── docs/                        # Documentação técnica, arquitetura e relatórios consolidados
│   ├── architecture/            # Especificações de pipeline e memória
│   ├── engines/                 # Matrizes de compatibilidade por engine
│   ├── reports/                 # Relatórios consolidados de certificação e auditoria
│   └── user/                    # Guias de uso e troubleshooting
├── launcher/                    # Código-fonte oficial do launcher em C#
├── loaders/                     # Injetores nativos, DLLs Dual Hook e fontes
├── resources/                   # Recursos consolidados por motor (renpy, unity, rpgmaker, templates)
├── src/                         # Código-fonte canônico do backend (core, engines, providers, utils)
├── tests/                       # Suíte unificada de testes (regression, integration, unit, fixtures)
├── third-party/                 # Dependências e componentes de terceiros com licenças
├── tools/                       # Ferramentas de manutenção, build, release e lint
├── ui/                          # Interface web frontend (HTML, CSS, JS)
└── archives/                    # [HISTÓRICO] Auditorias históricas, migrações e snapshots

OpenTranslator-Lab/              ← [LABORATÓRIO] (Diretório Externo, fora do Git)
├── fixtures/                    # Jogos e assets completos de teste
├── staging/                     # Pastas temporárias de descompactação de testes
├── benchmarks/                  # Resultados de testes de performance
└── forensic/                    # Dossiês forenses de validação empírica
```

---

## 🧪 Suíte de Testes Automatizados

O OpenTranslator conta com uma suíte de testes 100% determinística e automatizada:

```bash
# Executar a validação forense da matriz de jogos reais:
npm test

# Executar a certificação forense independente de Ren'Py:
npm run test:renpy

# Executar a certificação forense independente de RPG Maker MZ:
npm run test:mz

# Executar o linter de integridade do repositório:
npm run lint

# Executar o smoke test do launcher nativo:
npm run smoke

# Executar a suíte mestre com 121 testes de regressão (12 fases completas):
node tests/regression/run_master_regression.js
```

---

## 🛠️ Ferramentas de Manutenção e Release

```bash
# Gerar pacote limpo e portátil de distribuição final:
node tools/package_release.js

# Executar pipeline de tradução via linha de comando:
node tools/run-pipeline-cli.js --help
```

---

<div align="center">
  <sub>OpenTranslator — Tradução Universal para Jogos sem barreiras.</sub>
</div>
