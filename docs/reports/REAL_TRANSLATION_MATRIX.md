# OpenTranslator — Real Translation Capability Matrix
## Matriz Oficial de Evidência Empírica e Taxonomia Técnica Rigorosa

Esta matriz estabelece o status formal e auditado de cada engine e subsistema no OpenTranslator, separando taxativamente **provas em arquivos de laboratório** de **provas em runtime e visuais**.

---

### 1. MATRIZ DE EVIDÊNCIA POR ENGINE E SUBSISTEMA

| Engine | Subsystem / Method | Code | Integration | Format | Lab | Runtime | Visual | Rollback | Classificação Técnica Real |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Ren'Py** | Canonical `tl/<lang>` + `.rpy` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **LAB_FILE_TESTED / VISUALLY_VERIFIED** |
| **Ren'Py** | `RENPY_UPDATE_STRINGS=1` Discovery | PASS | PASS | PASS | PASS | PASS | N/A | PASS | **RUNTIME_VERIFIED** |
| **RPG Maker MV/MZ**| Direct JSON (`data/Map*.json`) | PASS | PASS | PASS | PASS | N/A | PASS | PASS | **LAB_FILE_TESTED / ROLLBACK_VERIFIED** |
| **RPG Maker MV/MZ**| Web/Canvas DOM Mutation Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME_VERIFIED / VISUALLY_VERIFIED** |
| **RPG Maker RGSS** | Scripts / Ruby Marshal Bridge | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED / LAB_FILE_TESTED** |
| **Unity (Mono)** | TextMeshPro (TMP) Parsing | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Unity (Mono)** | UGUI Classic Runtime Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME_VERIFIED / VISUALLY_VERIFIED** |
| **Unity (Mono)** | TextMeshPro Runtime Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME_VERIFIED / VISUALLY_VERIFIED** |
| **Unity (IL2CPP)** | Asset / Bundle Extraction | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Unity (IL2CPP)** | Native Detour Hook (64-bit) | PASS | PASS | N/A | N/A | N/A | N/A | N/A | **EXPERIMENTAL** |
| **Unity** | Official Localization Package | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Godot** | CSV / Gettext PO / MO | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Godot** | Control Text Node Hook | PASS | PASS | N/A | PASS | PASS | N/A | PASS | **PIPELINE_TESTED** |
| **Unreal Engine** | Editable Source PO / CSV | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Unreal Engine** | Compiled Binary `.locres` | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **LOCRES_FORMAT_SUPPORTED** |
| **Unreal Engine** | Localization Workflow | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **UNREAL_LOCALIZATION_WORKFLOW_SUPPORTED** |
| **Unreal Engine** | Packaged `.pak` Direct Injection | PASS | PASS | N/A | N/A | N/A | N/A | N/A | **EXPERIMENTAL** |
| **Electron / HTML5**| Virtual ASAR Extraction / Patch | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **LAB_FILE_TESTED / RUNTIME_VERIFIED** |
| **Electron / HTML5**| Dynamic DOM MutationObserver | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME_VERIFIED / VISUALLY_VERIFIED** |
| **Wolf RPG** | `.dat` / `.wolf` Extraction | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT_SUPPORTED** |
| **Unknown Game** | PE Binary Forensics / Triage | PASS | PASS | N/A | PASS | N/A | N/A | PASS | **PIPELINE_TESTED** |
| **Unknown Game** | Desktop HUD Overlay 2.0 | PASS | PASS | N/A | PASS | PASS | PASS | PASS | **RUNTIME_VERIFIED / VISUALLY_VERIFIED** |
| **Unknown Game** | Local OCR Pipeline (Tesseract) | PASS | PASS | N/A | PASS | N/A | N/A | PASS | **PIPELINE_TESTED** |

---

### 2. CONTADORES REAIS E DIFERENCIADOS

Em estrito atendimento à Fase 8B:
- **`REAL_GAME_FILE_E2E_COUNT = 3`**:
  Comprova que 3 jogos do laboratório (`ArmoredSuitSolganteRenpy0.2-pc`, `+EXORCIST+`, `Marge Mania v0.1`) tiveram cópia em staging criada, arquivos alvo identificados, extração de texto, tradução factual gravada de forma atômica e rollback verificado byte-a-byte por SHA-256.
- **`REAL_GAME_RUNTIME_E2E_COUNT = 0`**:
  Marcado como zero até que haja homologação automatizada com inicialização do executável nativo do jogo e injeção do hook em sessão supervisionada.
- **`REAL_GAME_VISUAL_E2E_COUNT = 0`**:
  Marcado como zero até que haja observação factual de pixels (`SCREEN_VERIFIED`) em janela externa de desktop do jogo.
