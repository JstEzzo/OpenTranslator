<div align="center">

<img src="Tool/resources/OpenTranslator.ico" width="100" alt="OpenTranslator Logo"/>

# OpenTranslator

**Plataforma Universal de Tradução, Modding e Cheats Offline-First para Jogos.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-Port%C3%A1til%20Integrado-green?logo=node.js)](Tool/bin)
[![Status](https://img.shields.io/badge/Status-Produ%C3%A7%C3%A3o%20Est%C3%A1vel-success)](#)
[![Zero BAT](https://img.shields.io/badge/Launcher-Nativo%20EXE-orange)](#)

</div>

---

## ✨ Destaques da Aplicação

- **Ponto Único de Entrada**: Inicie diretamente pelo executável nativo `OpenTranslator.exe`.
- **Autodiagnóstico Real Pré-Voo**: O launcher realiza 10 verificações reais (arquivos, runtime, dependências NPM, banco de dados, portas 8080/16005, permissões, servidor backend, conexão HTTP 200, ativos frontend e RPC) antes de liberar a interface.
- **Tela de Recuperação & Safe Start**: Se qualquer problema ocorrer (como uma porta ocupada ou processo antigo travado), o launcher exibe uma tela explicativa com a causa exata e botões para **[Tentar Corrigir]**, **[Modo de Recuperação]** e **[Copiar Relatório]**.
- **Rollback Atômico com SHA-256**: Seus jogos originais nunca são perdidos; qualquer modificação possui backup automático com verificação criptográfica.
- **Dual Hook em Tempo Real (Porta 16005)**: Suporte a overlay e cheats em tempo real enquanto o jogo roda.
- **Zero Configuração Manual**: Runtime portátil incluído e caminhos 100% dinâmicos (funciona em qualquer pasta ou pendrive).

---

## 🎮 Motores de Jogos Suportados

| Motor de Jogo | Tradução de Arquivos | Hook em Tempo Real | Recursos Especiais |
|---|:---:|:---:|---|
| **Ren'Py (Python 2 & 3)** | ✅ | ✅ | Descompilação `.rpyc`, injeção `000_anti_crash.rpy` |
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

## 📁 Estrutura do Projeto & Governança

O repositório é rigorosamente estruturado segundo as diretrizes de governança em [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) e [PRODUCTION_MANIFEST.md](docs/PRODUCTION_MANIFEST.md):

```text
OpenTranslator/                  ← [PRODUTO & DESENVOLVIMENTO] (~454 MB)
├── OpenTranslator.exe           ← Executável principal unificado (Launcher nativo C#)
├── docs/                        ← Documentação completa organizada (docs/INDEX.md)
│   ├── architecture/            ← Arquitetura técnica, pipeline e memória
│   ├── engines/                 ← Matrizes de suporte por motor de jogo
│   ├── runtime/                 ← Arquitetura de hooks e injeção em tempo de execução
│   ├── user/                    ← Manual do usuário e resolução de problemas
│   ├── PRODUCTION_MANIFEST.md   ← Manifesto de dependências de produção
│   └── PROJECT_STRUCTURE.md     ← Topologia e governança de diretórios
├── Tool/                        ← Núcleo da aplicação e runtimes
│   ├── server.js                ← Servidor HTTP/WebSocket principal
│   ├── src/                     ← Backend modular, engines e suíte de testes
│   ├── www/                     ← Interface web frontend e overlay HUD
│   ├── bin/                     ← Node.js portátil v20.18.3 x64 integrado
│   ├── loaders/                 ← Injetor nativo e DLLs Dual Hook
│   ├── resources/               ← Sidecars por engine (Python, UnityPy, Retoc)
│   ├── node_modules/            # Dependências nativas compiladas (better-sqlite3, ws)
│   └── data/                    ← Cache global SQLite (66k traduções) e configs
├── archive/                     ← [ARQUIVO] Auditorias históricas, logs e snapshots
└── OpenTranslator-Lab/          ← [LABORATÓRIO] Fixtures pesadas externas (OpenTranslator-Lab/)
```

---

## 🛠️ Ferramentas de Manutenção e Release

```bash
# Executar a suíte mestre de 121 testes de regressão (100% PASS):
node Tool/src/tests/run_master_regression.js

# Executar o SelfTest de 23 verificações de ambiente (23/23 PASS):
node -e "require('./Tool/src/core/selfTest').runAll()"

# Gerar pacote limpo e portátil de distribuição final (OpenTranslator-release/):
node Tool/src/tools/package_release.js

# Auditar e limpar artefatos temporários com segurança:
node Tool/src/tools/cleanup_project.js
```

---

## 🧪 Suíte de Testes Automatizados

Para rodar os testes mestres de regressão (121 testes, 100% aprovados):
```bash
node Tool/src/tests/run_master_regression.js
```

---

<div align="center">
  <sub>OpenTranslator — Tradução Universal para Jogos sem barreiras.</sub>
</div>
