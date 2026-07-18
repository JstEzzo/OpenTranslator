<div align="center">

<img src="Tool/OpenTranslator.png" width="120" alt="OpenTranslator Logo"/>

# OpenTranslator

**Ferramenta de tradução e modding para jogos — offline-first, sem anúncios, sem rastreamento.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Licença-MIT-purple)](LICENSE)

</div>

---

## Engines suportadas

| Engine | Tradução de Arquivo | Hook em Tempo Real |
|--------|:-------------------:|:------------------:|
| RPG Maker MZ / MV | ✅ | ✅ |
| TyranoScript | ✅ | ✅ |
| Wolf RPG | ✅ | ✅ |
| Ren'Py | ✅ | — |
| Godot Engine | ✅ | — |
| Unity | ✅ | — |
| KRKR / SRPG Studio | — | ✅ |

---

## Início rápido

```bash
git clone https://github.com/JstEzzo/OpenTranslator.git
```

Depois, duplo clique em **`LAUNCH_OpenTranslator.bat`**.

Na primeira execução, o launcher detecta e baixa automaticamente tudo que estiver faltando (Node.js, dependências NPM, ferramentas de engine).

---

## Como funciona

```
 [LAUNCH_OpenTranslator.bat]
          │
          ▼
 [Servidor Backend — Node.js :3000]  ←→  [Interface Web — Chromium]
          │
          ├── Tradução de arquivos JSON/data (patch permanente)
          ├── Hook em tempo real via WebSocket :16005
          ├── Descriptografia de imagens/áudio XOR
          ├── Auto word-wrap para PT-BR
          └── Gerenciamento de saves e backups
```

O servidor escuta **exclusivamente em `127.0.0.1`** — nenhuma porta é exposta à rede local ou externa.

---

## Motores de tradução

- Google Translate
- Bing / Microsoft Translator  
- DeepL
- LibreTranslate (auto-hospedado)
- Modelos LLM locais (via API compatível com OpenAI)

---

## Estrutura

```
OpenTranslator/
├── LAUNCH_OpenTranslator.bat   ← Ponto de entrada
└── Tool/
    ├── server.js               ← Backend principal
    ├── src/                    ← Módulos do servidor
    ├── www/                    ← Interface web
    ├── loaders/                ← Hooks por engine
    ├── resources/              ← Ferramentas por engine
    └── gameLib/                ← Detecção de engine
```

---

<div align="center">
  <sub>Feito para jogadores. Tradução sem complicação.</sub>
</div>
