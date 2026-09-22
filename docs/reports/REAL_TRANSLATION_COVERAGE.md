# OpenTranslator — Cobertura Real de Tradução (Fase 6)
## Classificação por Evidência Conforme Auditoria de Realidade

Este documento define a cobertura real alcançada pelo OpenTranslator até a Fase 6, classificando cada motor e formato pelo nível exato de comprovação empírica:

- `UNIT_TESTED`: Teste automatizado isolado de funções, parsers e classes.
- `INTEGRATION_TESTED`: Teste de comunicação ponta-a-ponta entre múltiplos subsistemas do OpenTranslator.
- `LAB_TESTED`: Executado sobre cópias reais de jogos do laboratório (`Nova pasta`).
- `RUNTIME_VERIFIED`: Comprovado com processo/executável em execução real.
- `ROLLBACK_VERIFIED`: Estado original restaurado matematicamente comprovado por SHA-256.
- `VISUALLY_VERIFIED`: Observado diretamente na tela/janela do jogo.

---

## 1. Tabela de Cobertura por Engine e Text Framework

| Engine | Runtime | Text Framework | Formato de Dados | Nível de Evidência | Observações |
|---|---|---|---|---|---|
| **Ren'Py** | Python 3 / 2 | Renpy Dialogue / Strings | `.rpy` / `.rpyc` / `.rpa` | `LAB_TESTED` / `ROLLBACK_VERIFIED` | Suporte nativo em `game/tl/<lang>`, blocos `strings`, overrides de estilo e fontes |
| **RPG Maker MZ** | V8 / Chromium | Window_Message / Database | `.json` / `plugins.js` | `LAB_TESTED` / `ROLLBACK_VERIFIED` | SHA-256 byte-a-byte verificado em `System.json`. Proteção total de códigos de escape |
| **RPG Maker MV** | V8 / Chromium | Window_Message / Database | `.json` / `plugins.js` | `LAB_TESTED` / `ROLLBACK_VERIFIED` | Extração e round-trip testado em jogos reais com dezenas de milhares de strings |
| **RPG Maker RGSS** | Ruby | Window_Base / Message | `.rvdata2` / `.rxdata` / `.rgss3a` | `LAB_TESTED` | Extração em `BLACK SOULS` e proteção de scripts |
| **Electron** | V8 / Node.js | DOM / HTML / JS | `resources/app.asar` | `LAB_TESTED` / `INTEGRATION_TESTED` | Leitura seletiva via `ElectronArchiveProvider` (virtual ASAR) e script `MutationObserver` |
| **Unity** | Mono | TextMeshPro | Assemblies Managed / Asset Tables | `INTEGRATION_TESTED` / `LAB_TESTED` | Detecção via `EngineRuntimeTriad`, proteção de tags ricas e cálculo de overflow |
| **Unity** | Mono | UGUI (UnityEngine.UI) | Assemblies Managed | `INTEGRATION_TESTED` / `LAB_TESTED` | Detecção de componentes UGUI e proteção de formatação HTML básica |
| **Unity** | IL2CPP | Nativo / TextMeshPro | GameAssembly.dll | `INTEGRATION_TESTED` | Roteado para fallback seguro ou hook nativo dedicado |
| **Unity** | Mono / IL2CPP | Unity Localization Package | `StringTableCollection` (CSV/JSON) | `UNIT_TESTED` / `INTEGRATION_TESTED` | Parsing e serialização de tabelas de strings com TableEntryId |
| **Godot** | Native | Control / Label / RichTextLabel | CSV / PO / MO / `project.godot` | `UNIT_TESTED` / `INTEGRATION_TESTED` | Parser RFC 4180 multiline, PO gettext e proteção BBCode |
| **Unreal Engine** | Native | UMG / Slate | `.locres` / `.locmeta` / String Tables | `UNIT_TESTED` / `INTEGRATION_TESTED` | Compilador e parser binário LocRes Version 2 Compact (Magic GUID) |
| **Wolf RPG** | Native | BasicData / Eventos | `data.wolf` / `.dat` | `LAB_TESTED` | Descompactação e extração de strings em `Rabbit Hood` |
| **Generic / Unknown** | Any | Any | Raw Text / Textures | `INTEGRATION_TESTED` | Roteamento automático para Overlay não-destrutivo e OCR fallback |

---

## 2. Níveis de Confiabilidade de Tradução

1. **Formatos Nativos Canônicos (Mais Confiável):**
   - Ren'Py `tl/`: O motor do jogo cuida da renderização; risco zero de corrupção do executável.
   - Godot CSV / PO: Sistema oficial da engine gerencia fontes e seleção de idioma.
   - Unreal `.locres`: O runtime da Unreal lê diretamente o arquivo binário compilado.
   - Unity Localization Package: Estrutura oficial baseada em chaves/GUIDs.

2. **Formatos Estáticos Baseados em Dados (Alta Confiabilidade com Rollback):**
   - RPG Maker JSON: Backup automatizado com SHA-256 e journal de transações atômico.
   - Electron Virtual ASAR: Acesso cirúrgico aos arquivos JSON e HTML sem alterar o executável.

3. **Runtime Hooks (Moderado a Experimental):**
   - Ciclo de vida estrito com healthcheck e reversão atômica em caso de falha de injeção.
   - Preservação da integridade de ponteiros e threads do processo do jogo.

4. **Overlay e OCR (100% Seguro e Não-Invasivo):**
   - Utilizado para motores desconhecidos ou binários com proteções de integridade.
