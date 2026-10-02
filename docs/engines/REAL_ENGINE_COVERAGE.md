# OpenTranslator — Real Engine Coverage Report
## Cobertura Real por Motor de Jogo e Estratégia de Tradução

Este documento formaliza a abrangência técnica real e validada do OpenTranslator nas principais engines do mercado de games.

---

### 1. REN'PY ENGINE (CANONICAL & RUNTIME DISCOVERY)
- **Estrutura Canônica**: Suporte nativo à pasta oficial `game/tl/<language>/`.
- **Modos de Tradução**:
  - `translate <language> <label>:`: Substituição de diálogos, narrações e escolhas de cena.
  - `translate <language> strings:`: Tradução de menus de sistema, títulos de botões, nomes de variáveis e telas de opções.
  - `00_opentranslator_styles.rpy`: Ajuste de fontes TrueType/OpenType (`style default font = "..."`) e escala tipográfica sem alterar os scripts de gameplay originais.
  - **Asset Localization**: Redirecionamento de imagens com texto (`image splash = "tl/<lang>/splash.png"`).
- **Variáveis de Ambiente & Runtime Discovery**:
  - `RENPY_LANGUAGE`: Força o idioma da tradução diretamente no runtime via ambiente de inicialização.
  - `RENPY_UPDATE_STRINGS=1`: Habilita a funcionalidade do Ren'Py para descobrir dinamicamente novas strings vistas em runtime e gravá-las no catálogo de tradução.
- **Evidência no Laboratório**: Testado em `ArmoredSuitSolganteRenpy0.2-pc` com ciclo completo de backup, alteração simulada, rollback e validação matemática de hash SHA-256 (503ms).

---

### 2. RPG MAKER (MV / MZ / RGSS)
- **Engines Suportadas**:
  - **RPG Maker MV & MZ**: Leitura e escrita determinística de arquivos JSON (`data/Map*.json`, `data/CommonEvents.json`, `data/System.json`, `data/Items.json`, `data/Skills.json`, `data/Actors.json`, `data/Troops.json`).
  - **RPG Maker RGSS (XP, VX, VX Ace)**: Descompactação e serialização de dados de scripts e tabelas via bridge Marshal Python/Ruby.
- **Proteção Cirúrgica de Códigos de Escape**:
  - Códigos preservados integralmente durante a tradução:
    - `\C[n]`: Cor do texto
    - `\V[n]`: Valor da variável `n`
    - `\N[n]`: Nome do ator `n`
    - `\P[n]`: Nome do membro do grupo `n`
    - `\G`: Moeda do jogo
    - `\I[n]`: Ícone do item/habilidade
    - `\.` e `\|`: Pausas de diálogo e temporização
    - `\^`, `\!`, `\<`, `\>`: Comandos de avanço imediato e velocidade de texto
- **Evidência no Laboratório**: Validado com jogos MV/MZ do laboratório (`Marge Mania v0.1` e `+EXORCIST+ Chris and the Cursed Town`) com integridade comprovada de códigos de escape.

---

### 3. UNITY ENGINE (MONO & IL2CPP)
- **Matriz de Frameworks de Texto**:
  - **TextMeshPro (TMP)**: Suporte primário para jogos modernos. Captura, substituição e ajuste de formatação de tags RichText (`<color>`, `<size>`, `<sprite>`), injeção de font fallback para alfabetos estendidos (CJK, Cirílico).
  - **UnityEngine.UI (UGUI Clássico)**: Compatibilidade com componentes legados `Text`.
  - **Unity Localization Package**: Detecção automática de `StringTableCollection`, `StringTable` e `LocalizedString`. Quando presente, o OpenTranslator prioriza a injeção nas tabelas oficiais de localização da Unity em vez de hooks invasivos no runtime.
  - **UI Toolkit & IMGUI**: Suporte de leitura e sobreposição gráfica.
- **Separação Rigorosa Mono vs IL2CPP**:
  - **Mono**: Suporte total a runtime hook via HarmonyX/Mono e injeção de memória.
  - **IL2CPP**: Identificado estritamente pela presença de `GameAssembly.dll` / `il2cpp_data`. O OpenTranslator **não** assume suporte automático a runtime hook no IL2CPP sem teste de injeção nativa compilada de 64-bit; o modo recomendado seguro para IL2CPP sem SDK compilado é a extração estática de assets ou HUD Overlay.

---

### 4. GODOT ENGINE (CSV & GETTEXT PO/MO)
- **Canais Oficiais de Localização**:
  - Suporte ao arquivo de configuração `project.godot` e registro de traduções na seção `[locale]`.
  - Extração e geração de arquivos CSV delimitados por vírgula (`keys,en,pt_BR`).
  - Geração e compilação de catálogos Gettext `.po` e binários `.mo`.
- **Runtime**:
  - Detecção de nós de interface `Control`, `Label`, `RichTextLabel` e `Button`.

---

### 5. UNREAL ENGINE (SOURCE PO VS COMPILED LOCRES)
- **Arquitetura em 4 Estágios**:
  - **1. Source Data**: Arquivos de texto editáveis Gettext Portable Object (`.po`) e String Tables em CSV.
  - **2. Compiled Data**: Recursos binários compilados `LocRes` (`.locres`) e metadados (`.locmeta`). O módulo `UnrealLocResProvider` compila estruturas de namespaces e chaves FText sem corromper a tabela de strings.
  - **3. Packaged Data**: Contêineres compactados `.pak`.
  - **4. Runtime Data**: Instâncias em memória da classe `FText`.
- **Garantia de Não-Ilusão**: O OpenTranslator não trata a mera alteração de strings soltas como "jogo Unreal traduzido"; o pipeline diferencia formalmente fontes editáveis e dados binários em tempo de execução.

---

### 6. ELECTRON & HTML5 GAMES
- **Mecanismos de Tradução**:
  - **Virtual ASAR**: Descompactação e inspeção do arquivo `app.asar` sem destruir a estrutura de pastas do Chromium/Node.js.
  - **Injeção de Preload**: Injeção segura em scripts de inicialização do processo Renderer.
  - **Dynamic DOM MutationObserver**: Script otimizado que monitora alterações na árvore de elementos HTML do jogo, traduzindo textos inseridos dinamicamente por frameworks JavaScript (Canvas, Phaser, PixiJS, React).

---

### 7. UNKNOWN GAME FORENSICS & TRIAGE
- **Triagem Especializada**:
  - Análise profunda do cabeçalho PE (Portable Executable) para detecção de arquitetura (32-bit vs 64-bit).
  - Varredura de tabelas de importação de DLLs para identificação de subsistemas gráficos (DirectX 9/11/12, OpenGL, Vulkan).
  - Emissão de relatório de triagem estruturado:
    - `STATUS`: Motivo da classificação como desconhecido.
    - `WHAT_WAS_FOUND`: Indicadores encontrados no binário.
    - `WHAT_WAS_NOT_FOUND`: Assinaturas padrão ausentes.
    - `NEXT_SAFE_STRATEGY`: Estratégia não-destrutiva recomendada (HUD Overlay, OCR local ou varredura de strings estáticas).
