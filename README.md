<div align="center">

<img src="Tool/OpenTranslator.png" width="120" alt="OpenTranslator Logo"/>

# OpenTranslator

**Ferramenta de tradução e modding offline-first para jogos — Sem anúncios, sem rastreamento.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Free%20%7C%20Non--Commercial-purple)](LICENSE)

</div>

---

## 🎮 Motores Suportados (Supported Engines)

| Engine | Tradução de Arquivos | Hook em Tempo Real |
|--------|:-------------------:|:------------------:|
| **Ren'Py (Python)** | ✅ (Ultra-Rápida / 32 Threads) | ✅ (Autônoma) |
| **RPG Maker MZ / MV** | ✅ | ✅ |
| **TyranoScript** | ✅ | ✅ |
| **Wolf RPG** | ✅ | ✅ |
| **Godot Engine** | ✅ | — |
| **Unity / XUnity** | ✅ | ✅ |
| **Kirikiri (KRKR)** | — | ✅ |
| **SRPG Studio** | — | ✅ |

---

## 🚀 Início Rápido (Quick Start)

### 1. Clone o repositório
```bash
git clone https://github.com/JstEzzo/OpenTranslator.git
```

### 2. Execute
Duplo clique em qualquer um dos inicializadores:
- **`OpenTranslator.lnk`** (Atalho nativo com ícone personalizado)
- **`OpenTranslator.bat`** (Launcher inteligente e silencioso)

Na primeira execução, o launcher verifica e baixa automaticamente tudo o que estiver faltando (Node.js portátil) de forma 100% autônoma e silenciosa.

---

## 🛠️ Requisitos de Sistema

- **OS**: Windows 10 / Windows 11 (64-bit) — Compatível com **Windows Sandbox (`WDAGUtilityAccount`)** e contas sem privilégios de Administrador.
- **Rede**: Conexão com a internet apenas no primeiro boot (para baixar o Node.js portátil se não houver instalado).
- **Node.js**: v18+ (caso não haja no sistema, o launcher baixa a versão v20.18.3 LTS automaticamente).

---

## 📐 Estrutura do Projeto

```text
OpenTranslator/
├── OpenTranslator.bat           ← Launcher principal silencioso
├── OpenTranslator.lnk           ← Atalho com ícone personalizado
├── Tool/                        ← Executáveis, módulo Node.js e UI
│   ├── server.js                ← Backend Node.js (porta 3000)
│   ├── open_translator.py       ← Motor agregador paralelo (32 threads)
│   ├── src/                     ← Código-fonte modular (utilitários, RPC, motores, cache)
│   ├── bin/                     ← Executáveis e scripts nativos (download_node.ps1)
│   ├── www/                     ← Interface web (UI Glassmorphism)
│   ├── loaders/                 ← Hooks e injetores por engine
│   └── resources/               ← Sidecars por engine (Python, Unity, EVB, Godot)
└── skills_whitepaper/           ← Documentação técnica completa (WHITEPAPER.md)
```

---

<div align="center">
  <sub>Construído para jogadores. Tradução universal com alta performance.</sub>
</div>
