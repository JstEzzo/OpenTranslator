# OpenTranslator

Ferramenta de tradução e modding para jogos, com suporte a RPG Maker MZ/MV, TyranoScript, Ren'Py, Godot, Unity e outros.

---

## ⚡ Início Rápido

### 1. Clone o repositório
```bash
git clone https://github.com/JstEzzo/OpenTranslator.git
cd OpenTranslator
```

### 2. Execute o launcher
Basta dar **duplo clique** no arquivo:
```
LAUNCH_OpenTranslator.bat
```

Na **primeira execução**, o launcher detecta automaticamente que é uma instalação nova e chama o `SETUP.bat`, que irá:

| Passo | O que faz |
|---|---|
| ✅ Node.js | Detecta no sistema ou baixa a versão portátil automaticamente |
| ✅ node_modules | Roda `npm install` para instalar as dependências NPM |
| ⬇️ inject.exe | Tenta baixar do [MTool](https://mtool.app/) *(se falhar: instrução manual abaixo)* |
| ⬇️ gdre_tools.exe | Baixa da última release do [gdsdecomp](https://github.com/bruvzg/gdsdecomp/releases) |

---

## 📋 Dependências Grandes (Não incluídas no repositório)

Os arquivos abaixo são **muito grandes** para o GitHub e são gerenciados pelo `SETUP.bat`:

| Arquivo | Tamanho | Fonte |
|---|---|---|
| `Tool/bin/node.exe` | ~88 MB | [nodejs.org](https://nodejs.org/) — baixado automaticamente |
| `Tool/node_modules/` | ~50 MB | NPM — instalado via `npm install` |
| `Tool/loaders/inject.exe` | ~167 MB | [mtool.app](https://mtool.app/) |
| `Tool/resources/godot/gdre_tools.exe` | ~80 MB | [github.com/bruvzg/gdsdecomp](https://github.com/bruvzg/gdsdecomp/releases) |

---

## 🔧 Setup Manual (se o automático falhar)

Se o `SETUP.bat` não conseguir baixar o `inject.exe`:

1. Acesse **[mtool.app](https://mtool.app/)** e baixe o MTool
2. Extraia o arquivo baixado
3. Copie o `inject.exe` para:
   ```
   Tool\loaders\inject.exe
   ```

> **Nota:** O OpenTranslator funciona sem o `inject.exe` para a maioria das funções (tradução de arquivos JSON/data). O inject.exe é necessário apenas para hooking de processos em tempo real.

---

## 🗂️ Estrutura do Projeto

```
OpenTranslator/
├── LAUNCH_OpenTranslator.bat   ← Iniciar aqui
├── SETUP.bat                   ← Instalação de dependências
├── WHITEPAPER.md               ← Documentação técnica completa
└── Tool/
    ├── server.js               ← Backend Node.js (porta 3000)
    ├── src/                    ← Código-fonte modular
    ├── www/                    ← Interface web (UI)
    ├── loaders/                ← Hooks e injetores por engine
    ├── resources/              ← Ferramentas por engine (Godot, Unity, Wolf...)
    └── gameLib/                ← Detecção de engine de jogo
```

---

## ⚙️ Requisitos

- **Windows 10/11** (64-bit)
- **Conexão com a internet** (apenas na primeira execução para baixar dependências)
- **Node.js** v18+ (ou deixe o launcher baixar automaticamente)

---

## 📖 Documentação

Consulte o [WHITEPAPER.md](WHITEPAPER.md) para a documentação técnica completa da arquitetura, protocolos e componentes do sistema.
