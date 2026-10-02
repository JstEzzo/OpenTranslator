# OpenTranslator — Phase 7 & 8A Reality Matrix
## Matriz Oficial de Evidência Empírica e Taxonomia Técnica Rigorosa

Em conformidade estrita com as diretrizes da **Fase 8A**, esta matriz elimina a confusão entre *"o sistema possui código para fazer algo"* e *"o OpenTranslator comprovadamente realizou a ação"*.

### Taxonomia Oficial de Classificação:
- **`FORMAT SUPPORTED`**: Parsers, serializadores e validação de estruturas de arquivo (PO, CSV, LocRes, JSON).
- **`PIPELINE TESTED`**: Roteamento, triagem forense, proteção de tokens e filas testadas em integração.
- **`LAB FILE TESTED`**: Extração, tradução determinística e gravação atômica em arquivos reais de jogos de laboratório.
- **`RUNTIME VERIFIED`**: Processo do jogo em execução com interceptação, injeção de hook ou leitura de memória comprovada.
- **`VISUALLY VERIFIED`**: Observação factual direta do texto traduzido na interface ou na tela do jogo.
- **`ROLLBACK VERIFIED`**: Restauração do estado original matematicamente confirmada por hash SHA-256.

---

### 1. MATRIZ DE EVIDÊNCIA POR ENGINE E SUBSISTEMA

| Engine | Subsystem / Method | Code | Integration | Format | Lab | Runtime | Visual | Rollback | Classificação Técnica Real |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Ren'Py** | Canonical `tl/<lang>` + `.rpy` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **LAB FILE TESTED / VISUALLY VERIFIED** |
| **Ren'Py** | `RENPY_UPDATE_STRINGS=1` Discovery | PASS | PASS | PASS | PASS | PASS | N/A | PASS | **RUNTIME VERIFIED** |
| **RPG Maker MV/MZ**| Direct JSON (`data/Map*.json`) | PASS | PASS | PASS | PASS | N/A | PASS | PASS | **LAB FILE TESTED / ROLLBACK VERIFIED** |
| **RPG Maker MV/MZ**| Web/Canvas DOM Mutation Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME VERIFIED / VISUALLY VERIFIED** |
| **RPG Maker RGSS** | Scripts / Ruby Marshal Bridge | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED / LAB FILE TESTED** |
| **Unity (Mono)** | TextMeshPro (TMP) Parsing | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Unity (Mono)** | UGUI Classic Runtime Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME VERIFIED / VISUALLY VERIFIED** |
| **Unity (Mono)** | TextMeshPro Runtime Hook | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME VERIFIED / VISUALLY VERIFIED** |
| **Unity (IL2CPP)** | Asset / Bundle Extraction | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Unity (IL2CPP)** | Native Detour Hook (64-bit) | PASS | PASS | N/A | N/A | N/A | N/A | N/A | **EXPERIMENTAL** |
| **Unity** | Official Localization Package | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Godot** | CSV / Gettext PO / MO | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Godot** | Control Text Node Hook | PASS | PASS | N/A | PASS | PASS | N/A | PASS | **PIPELINE TESTED** |
| **Unreal Engine** | Editable Source PO / CSV | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Unreal Engine** | Compiled Binary `.locres` | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **LOCRES_FORMAT_SUPPORTED** |
| **Unreal Engine** | Localization Workflow | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **UNREAL_LOCALIZATION_WORKFLOW_SUPPORTED** |
| **Unreal Engine** | Packaged `.pak` Direct Injection | PASS | PASS | N/A | N/A | N/A | N/A | N/A | **EXPERIMENTAL** |
| **Electron / HTML5**| Virtual ASAR Extraction / Patch | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **LAB FILE TESTED / RUNTIME VERIFIED** |
| **Electron / HTML5**| Dynamic DOM MutationObserver | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **RUNTIME VERIFIED / VISUALLY VERIFIED** |
| **Wolf RPG** | `.dat` / `.wolf` Extraction | PASS | PASS | PASS | PASS | N/A | N/A | PASS | **FORMAT SUPPORTED** |
| **Unknown Game** | PE Binary Forensics / Triage | PASS | PASS | N/A | PASS | N/A | N/A | PASS | **PIPELINE TESTED** |
| **Unknown Game** | Desktop HUD Overlay 2.0 | PASS | PASS | N/A | PASS | PASS | PASS | PASS | **RUNTIME VERIFIED / VISUALLY VERIFIED** |
| **Unknown Game** | Local OCR Pipeline (Tesseract) | PASS | PASS | N/A | PASS | N/A | N/A | PASS | **PIPELINE TESTED** |

---

### 2. AUDITORIA DE FALSOS POSITIVOS CORRIGIDOS

1. **`realGameWorkflow.js`**:
   - Anteriormente continha mutação simulada (`# OpenTranslator Test Applied` / `[PT] original`) dentro do teste rotulado como "real".
   - **Correção Fase 8A**: Essa lógica foi formalmente isolada como `SIMULATED_MUTATION_TEST` (teste exclusivo de rollback). O fluxo de tradução real agora é executado por `RealTranslationWorkflow` utilizando extração factual, tradução via `LocalDictionaryProvider`, gravação atômica e verificação de texto visível.
2. **`patchInstaller.js`**:
   - Anteriormente criava o backup e retornava sucesso sem gravar as entradas no arquivo de destino.
   - **Correção Fase 8A**: Implementada gravação atômica real (`.tmp` -> `fsync` -> `rename`), validação de `sourceHash` por entrada (com bloqueio imediato em caso de divergência), verificação pós-aplicação e método `removePatch()` com restauração SHA-256.
3. **Godot e Unreal**:
   - Proibida a marcação de "Jogo Godot/Unreal Traduzido" sem lançamento e verificação em tempo de execução. Marcados rigorosamente como `FORMAT SUPPORTED` e `LOCRES_FORMAT_SUPPORTED`.
