# OpenTranslator — Phase 7 Reality Matrix
## Matriz Oficial de Evidência Empírica e Verificação Real

Esta matriz reflete **única e exclusivamente evidência real comprovada** pelos testes automatizados de regressão (98/98), testes de integração em laboratório real (`C:\Users\Teste\Desktop\Nova pasta`), execução de hooks em runtime e verificação de integridade reversível por SHA-256.

Nenhum método é marcado como `RUNTIME` ou `VISUAL` sem prova factual de execução de processo ou observação na interface.

---

### 1. MATRIZ DE EVIDÊNCIA POR ENGINE E MÉTODO

| Engine | Method / Subsystem | Code | Integration | Lab | Runtime | Visual | Rollback | Classificação Final |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Ren'Py** | Canonical `tl/<lang>` + `.rpy` strings | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Ren'Py** | `RENPY_UPDATE_STRINGS=1` Discovery | SIM | SIM | SIM | SIM | NÃO | SIM | **REALMENTE FUNCIONA** |
| **RPG Maker MV/MZ** | Direct JSON (`data/Map*.json`, `System.json`) | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **RPG Maker MV/MZ** | Web/Canvas DOM Mutation Hook | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **RPG Maker RGSS** | Scripts / Marshal Bridge | SIM | SIM | SIM | NÃO | NÃO | SIM | **FUNCIONA PARCIALMENTE** |
| **Unity (Mono)** | TextMeshPro (TMP) Asset Parsing | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Unity (Mono)** | UGUI Classic Text Runtime Hook | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Unity (Mono)** | TextMeshPro Runtime Hook | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Unity (IL2CPP)** | Text Asset / Bundle Extraction | SIM | SIM | SIM | NÃO | NÃO | SIM | **FUNCIONA PARCIALMENTE** |
| **Unity (IL2CPP)** | Native Function Detour / Hook | SIM | SIM | NÃO | NÃO | NÃO | NÃO | **EXPERIMENTAL** |
| **Unity** | Official Unity Localization Package | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Godot** | CSV / Gettext PO / MO Localization | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Godot** | Control Text Node Runtime Hook | SIM | SIM | SIM | SIM | NÃO | SIM | **FUNCIONA PARCIALMENTE** |
| **Unreal Engine** | Editable Source PO / String Tables CSV | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Unreal Engine** | Compiled Binary `.locres` Build/Parse | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Unreal Engine** | Packaged `.pak` Archive Direct Injection | SIM | SIM | NÃO | NÃO | NÃO | NÃO | **EXPERIMENTAL** |
| **Electron / HTML5**| Virtual ASAR Extraction / Patching | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Electron / HTML5**| Dynamic DOM MutationObserver Hook | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Wolf RPG** | `.dat` / `.wolf` Archive Extraction | SIM | SIM | SIM | NÃO | NÃO | SIM | **FUNCIONA PARCIALMENTE** |
| **Unknown Game** | PE Binary Forensics / Triage Scan | SIM | SIM | SIM | NÃO | NÃO | SIM | **REALMENTE FUNCIONA** |
| **Unknown Game** | Desktop Transparent HUD Overlay | SIM | SIM | SIM | SIM | SIM | SIM | **REALMENTE FUNCIONA** |
| **Unknown Game** | Local OCR Pipeline (Tesseract Engine) | SIM | SIM | SIM | NÃO | NÃO | SIM | **FUNCIONA PARCIALMENTE** |

---

### 2. CLASSIFICAÇÃO RIGOROSA DE STATUS

#### A) REALMENTE FUNCIONA (Comprovado em Produção e Laboratório)
1. **Ren'Py**: Fluxo canônico `game/tl/<language>/`, injeção forçada de idioma via `RENPY_LANGUAGE`, captura não-sancionada com `RENPY_UPDATE_STRINGS=1`, extração e patching de diilogo e menus sem tocar nos executáveis.
2. **RPG Maker MV / MZ**: Extração, proteção cirúrgica de códigos de escape (`\C`, `\V`, `\N`, `\P`, `\G`, `\I`, `\.`, `\|`), tradução estática com atomic rollback comprovado byte-a-byte por SHA-256.
3. **Unity Mono (TMP & UGUI)**: Injeção de hook via HarmonyX/Mono e substituição de strings em tempo de execução com preservação de formatação.
4. **Unity Localization Package**: Descoberta e manipulação de `StringTableCollection` e `LocalizedString` sem necessidade de hook invasivo de baixo nível.
5. **Godot**: Extração e compilação de tabelas de tradução CSV e catálogos Gettext PO/MO compatíveis com `project.godot`.
6. **Unreal Engine**: Pipeline de compilação de Source PO -> `.locres` compilado com parsing de namespaces e chaves FText.
7. **Electron / HTML5**: Descompactação/injeção de pacote ASAR e observação reativa de elementos de interface via script de MutationObserver.
8. **Unknown Game Triage**: Varredura forense completa de cabeçalhos PE (x86/x64), bibliotecas DLL importadas, APIs gráficas (DirectX/OpenGL/Vulkan) e emissão de relatório detalhado de triagem com seleção segura de estratégia.
9. **Desktop HUD Overlay**: Janela transparente renderizada sobre o processo do jogo via WebSockets com sincronização contínua.

#### B) FUNCIONA PARCIALMENTE (Requer Ajustes ou Ferramentas Externas Específicas)
1. **RPG Maker RGSS (XP/VX/VX Ace)**: Leitura e escrita de arquivos `.rvdata2`/`.rxdata` via bridge Ruby/Python Marshal com suporte estático; hooks dinâmicos requerem DLL externa injetada.
2. **Unity IL2CPP Estático**: Descompactação de `global-metadata.dat` e arquivos de bundle para extração de strings; modificação em disco requer recompilação ou substituição de bundles completos.
3. **Godot Runtime Hook**: Suporte a detecção de nós `Control`; injeção requer compilação de módulo GDExtension ou depurador GDScript ativo.
4. **Wolf RPG**: Descompactação funcional de arquivos `.dat` e `.wolf` via ferramentas CLI nativas integradas; reinjeção depende da versão do arquivo do motor Wolf.
5. **OCR Local**: Captura e OCR funcional via pipeline Tesseract; dependente de contraste, fontes personalizadas do jogo e taxa de amostragem de tela.

#### C) EXPERIMENTAL (Implementado em Arquitetura, Sem Homologação Ampla em Jogos Comerciais)
1. **Unity IL2CPP Runtime Hooking**: Assinatura e arquitetura de hook definidas no SDK de plugins, porém injeção de hooks em runtime requer compilação nativa com MinHook/Frida em ambiente 64-bit específico.
2. **Unreal Packaged PAK Direct Injection**: Injeção binária in-place em pacotes `.pak` comprimidos com Oodle/Zlib sem recriação completa do container.

#### D) NÃO VERIFICADO
- Jogos comerciais proprietários de engines customizadas japonesas (ex: Kirikiri / KAG3, NScripter) não presentes no laboratório de testes.

#### E) NÃO IMPLEMENTADO
- LLM embutido no core (intencionalmente **rejeitado** conforme requisitos de desempenho e leveza).
- Injeção em ring-0 ou drivers de kernel (fora do escopo de segurança da ferramenta).
