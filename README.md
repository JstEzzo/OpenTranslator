# OpenTranslator

Ferramenta de tradução e modding para jogos, com suporte a RPG Maker MZ/MV, TyranoScript, Ren'Py, Godot, Unity e outros.

---

## Inicio Rapido

### 1. Clone o repositório
```bash
git clone https://github.com/JstEzzo/OpenTranslator.git
```

### 2. Execute
Duplo clique em:
```
LAUNCH_OpenTranslator.bat
```

Na primeira execução, o launcher verifica e baixa automaticamente tudo que estiver faltando antes de abrir o app.

---

## Dependencias grandes (nao incluidas no repositorio)

Esses arquivos sao muito grandes para o GitHub e sao baixados automaticamente pelo launcher:

| Arquivo | Tamanho | Fonte |
|---|---|---|
| `Tool/bin/node.exe` | ~88 MB | [nodejs.org](https://nodejs.org/) |
| `Tool/node_modules/` | ~50 MB | NPM (npm install) |
| `Tool/resources/godot/gdre_tools.exe` | ~80 MB | [gdsdecomp releases](https://github.com/bruvzg/gdsdecomp/releases) |
| `Tool/loaders/inject.exe` | ~167 MB | [mtool.app](https://mtool.app/) — manual |

> **Nota sobre inject.exe:** Este arquivo nao pode ser baixado automaticamente.
> Se precisar de suporte a hooking de processos em tempo real, acesse [mtool.app](https://mtool.app/), baixe o MTool e copie o `inject.exe` para `Tool\loaders\`.
> O OpenTranslator funciona normalmente para traducao de arquivos JSON/data sem ele.

---

## Arquivos do projeto

```
OpenTranslator/
├── LAUNCH_OpenTranslator.bat    <- Executar para abrir o app
├── TEST_ENVIRONMENT.bat         <- Diagnostico completo do ambiente
├── WHITEPAPER.md                <- Documentacao tecnica completa
└── Tool/
    ├── server.js                <- Backend Node.js (porta 3000)
    ├── src/                     <- Codigo-fonte modular
    ├── www/                     <- Interface web (UI)
    ├── loaders/                 <- Hooks e injetores por engine
    ├── resources/               <- Ferramentas por engine
    └── gameLib/                 <- Deteccao de engine de jogo
```

---

## Requisitos

- Windows 10/11 (64-bit)
- Conexao com a internet (apenas na primeira execucao)
- Node.js v18+ (ou o launcher baixa automaticamente)
