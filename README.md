<div align="center">

<img src="Tool/OpenTranslator.png" width="120" alt="OpenTranslator Logo"/>

# OpenTranslator

**Game translation and modding tool — offline-first, no ads, no tracking.**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)](https://github.com/JstEzzo/OpenTranslator)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Free%20%7C%20Non--Commercial-purple)](LICENSE)

</div>

---

## Supported Engines

| Engine | File Translation | Real-Time Hook |
|--------|:----------------:|:--------------:|
| RPG Maker MZ / MV | ✅ | ✅ |
| TyranoScript | ✅ | ✅ |
| Wolf RPG | ✅ | ✅ |
| Ren'Py | ✅ | — |
| Godot Engine | ✅ | — |
| Unity | ✅ | — |
| KRKR / SRPG Studio | — | ✅ |

---

## Quick Start

```bash
git clone https://github.com/JstEzzo/OpenTranslator.git
```

Then double-click **`LAUNCH_OpenTranslator.bat`**.

On first run, the launcher automatically detects and downloads everything that's missing (Node.js, NPM dependencies, engine tools).

---

## How It Works

```
 [LAUNCH_OpenTranslator.bat]
          │
          ▼
 [Backend Server — Node.js :3000]  ←→  [Web UI — Chromium]
          │
          ├── JSON/data file translation (permanent patch)
          ├── Real-time hook via WebSocket :16005
          ├── XOR image/audio decryption
          ├── Smart auto word-wrap
          └── Save and backup management
```

The server listens **exclusively on `127.0.0.1`** — no ports are exposed to the local network or internet.

---

## Translation Engines

- Google Translate
- Bing / Microsoft Translator
- DeepL
- LibreTranslate (self-hosted)
- Local LLM models (via OpenAI-compatible API)

---

## Project Structure

```
OpenTranslator/
├── LAUNCH_OpenTranslator.bat   ← Entry point
└── Tool/
    ├── server.js               ← Main backend
    ├── src/                    ← Server modules
    ├── www/                    ← Web interface
    ├── loaders/                ← Per-engine hooks
    ├── resources/              ← Per-engine tools
    └── gameLib/                ← Engine detection
```

---

<div align="center">
  <sub>Built for players. Translation without the hassle.</sub>
</div>
