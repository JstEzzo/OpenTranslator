# RELATÓRIO DE COMPARAÇÃO TÉCNICA: RPG MAKER MZ

**Data:** 27 de Setembro de 2026  
**Família:** RPG Maker MZ (em comparação direta com RPG Maker MV)  
**Jogos MZ Auditados:**
1. `Marge Mania v0.1` (`C:\Users\Teste\Desktop\Nova pasta\Marge Mania v0.1`)
2. `RJ01618221` (`C:\Users\Teste\Desktop\Nova pasta\RJ01618221` — *アリナと淫魔の呪い*)
**Controles MV Referenciais:**
1. `Toki kan Yuusha (gitgud)` (FULLY VERIFIED)
2. `RJ01058687_en` (FULLY VERIFIED)

---

## 1. COMPARAÇÃO ARQUITETURAL E ESTRUTURAL (MZ vs. MV)

| Aspecto Técnico | RPG Maker MV (Controles) | Marge Mania v0.1 (MZ) | RJ01618221 (MZ) | Relação e Impacto no Suporte |
| :--- | :--- | :--- | :--- | :--- |
| **Versão da Engine** | MV 1.5.x / 1.6.1 | MZ 1.9.0 (`rmmz_core.js`) | MZ 1.9.0 (`rmmz_core.js`) | **Evolução de versão:** Nova API de janelas e renderizador |
| **Runtime Container** | NW.js 0.29.x (x32) | NW.js 0.48.4 (x64) | NW.js 0.48.4 (x64) | **Arquitetura 64-bit e Chromium moderno (v85 / Node 14)** |
| **Estrutura de Pastas** | Subdiretório `www/` obrigatório | Raiz direta (`data/`, `js/`, `fonts/`) | Raiz direta (`data/`, `js/`, `fonts/`) | **MZ dispensa `www/` nativamente** |
| **Ponto de Entrada HTML** | `index.html` carrega ~12 scripts | `index.html` carrega apenas `js/main.js` | `index.html` carrega apenas `js/main.js` | **Carregamento modular centralizado via ES6** |
| **Boot Loader JS** | Script procedural `main.js` | Classe ES6 (`class Main`) | Classe ES6 (`class Main`) | **Estrutura OOP nativa no MZ** |
| **Biblioteca Gráfica** | PixiJS v4 legado | PixiJS v5 moderno | PixiJS v5 moderno | Renderizador WebGL otimizado |
| **Motor de Efeitos** | Animações por sprites 2D | Effekseer WASM (`effekseer.wasm`) | Effekseer WASM (`effekseer.wasm`) | Exige carregamento assíncrono WASM antes de Scene_Boot |
| **Comando de Plugins** | Event Code 356 (string crua) | Event Code 357 / 657 (objeto JSON) | Event Code 357 / 657 (objeto JSON) | **Dicionário estruturado de parâmetros no evento** |
| **Extensões de Criptografia** | `.rpgmvp` / `.rpgmvo` | `.png_` / `.ogg_` | Desativada (PNG / OGG crus) | **Extensões oficiais de mídia protegida MZ** |
| **Fontes Padrão** | `mplus-1m-regular.ttf` / GameFont | `mplus-1m-regular.woff` | `07nikumaru.otf` + `mplus-*.woff` | Web Open Font Format nativo |
| **Volume de Textos** | 29.210 a 39.000 | 6.830 textos em 24 arquivos | 40.145 textos em 176 arquivos | Variação por escopo e quantidade de mapas |

---

## 2. DIFERENÇAS CRÍTICAS ENTRE OS DOIS JOGOS MZ

### 2.1 Marge Mania v0.1
1. **Idioma de Origem:** Inglês / Francês (idioma de sistema `fr_FR`).
2. **Ecossistema de Plugins:** Extremamente enxuto. Apenas `AltMenuScreen` ativo em `js/plugins.js`. Há scripts adicionais em `js/plugins/` (ex: `AltSaveScreen.js`, `Community_Lighting.js`, `SRD_MenuStatusCustomizer.js`, `YEP_QuestJournal.js`).
3. **Criptografia de Assets:** Ativa em `data/System.json`:
   * `hasEncryptedImages: true` (`.png_`)
   * `hasEncryptedAudio: true` (`.ogg_`)
   * `encryptionKey: "d41d8cd98f00b204e9800998ecf8427e"` (hash MD5 de string vazia).
   * Os arquivos de banco de dados (`data/*.json`) permanecem em texto puro JSON (UTF-8).
4. **Fluxo de Inicialização:** Inicia na tela de título convencional (`Scene_Title`) com comandos New Game, Load, Options. Ao iniciar partida, é teleportado para `Map008` ("Start") onde o Evento 1 ("Introduction") executa um aviso de classificação indicativa com diálogo Show Text (code 401).

### 2.2 RJ01618221 (アリナと淫魔の呪い)
1. **Idioma de Origem:** Japonês (`ja_JP`).
2. **Ecossistema de Plugins:** Suite massiva e altamente customizada de mais de 50 plugins específicos do projeto (família `Arina*`: `ArinaUI`, `ArinaSynopsis`, `ArinaSkillTree`, `ArinaItemEquip`, `ArinaBattleSystem`, etc.).
3. **Armazenamento Não-Padrão (`ArinaSynopsis.json`):**
   * O jogo possui um arquivo de dados adicional em `data/ArinaSynopsis.json` contendo 123 nós de texto de sumários de cenas, narrativas de prólogo e descrições de capítulos.
   * O extrator genérico do OpenTranslator processa qualquer arquivo `.json` em `data/`, cobrindo automaticamente `ArinaSynopsis.json`.
4. **Criptografia de Assets:** Desativada (`hasEncryptedImages: undefined`). Todos os PNGs e OGGs residem em formato padrão.
5. **Fluxo de Inicialização:** Inicia na tela de título padrão (`Scene_Title`). Ao acionar New Game ("ニューゲーム"), o jogador vai para `Map001` ("開始画面"), onde o Evento 1 ("ゲーム開始") dispara um diálogo e menu de escolhas Show Choices (code 102) perguntando se deseja pular o prólogo.

---

## 3. SEPARAÇÃO FORMAL DE RESPONSABILIDADES

### 3.1 GENÉRICO PARA RPG MAKER (Comum a MV e MZ)
1. **Formato dos Eventos de Mapa e Comuns:**
   * Diálogos principais continuam codificados em `code: 401` (Show Text) e `code: 405` (Scroll Text).
   * Menus de escolha permanecem em `code: 102` (Show Choices).
   * Nomes de eventos e rotas técnicas não devem ser traduzidos para evitar quebras em triggers (`this._eventName`).
2. **Estrutura de `data/System.json`:**
   * `terms.commands`: Array de comandos de menu (Fight, Escape, Items, Skills, Equip, Status, Save, Options, New Game, Continue).
   * `terms.basic`: HP, MP, TP, Level, EXP.
   * `terms.params`: MHP, MMP, ATK, DEF, MAT, MDF, AGI, LUK.
   * `terms.messages`: Textos de batalha, compra, venda e recompensas.
3. **Bancos Relacionais Primários:**
   * `Actors.json`, `Classes.json`, `Skills.json`, `Items.json`, `Weapons.json`, `Armors.json`, `Enemies.json`, `Troops.json`, `States.json`, `CommonEvents.json`.
4. **Integridade de Rollback:**
   * Preservação de backup atômico e verificação por hash criptográfico SHA-256 byte-a-byte.

### 3.2 GENÉRICO PARA RPG MAKER MZ (Especificidades da Família MZ)
1. **Caminhos de Raiz:**
   * Detecção obrigatória de ausência de prefixo `www/`. O diretório `data/` e `js/` residem diretamente na raiz da aplicação.
2. **Inicialização ES6 e Ponto Único de Injeção:**
   * `index.html` não referencia scripts da engine diretamente, apenas `js/main.js`.
   * Para injeção de runtime hooks e telemetria forense (`CheatOverlay.js`), o script deve ser injetado antes de `</head>` ou `</body>` em `index.html`.
3. **Novo Formato de Comandos de Plugin (Code 357 / 657):**
   * Em MV: Code 356 com string pura de parâmetros.
   * Em MZ: Code 357 onde `parameters[0]` é o nome do plugin, `parameters[1]` é o comando, `parameters[2]` é o nome amigável e `parameters[3]` é um objeto JSON com argumentos estruturados.
4. **Criptografia MZ (.png_ / .ogg_):**
   * Metadados em `System.json` definem `hasEncryptedImages`, `hasEncryptedAudio` e `encryptionKey`.
5. **Runtime 64-bit NW.js:**
   * Suporte nativo a Node.js 14 e APIs NW.js completas (`nw.Window.get().capturePage`).

### 3.3 ESPECÍFICO DE CADA JOGO (Não Generalizar)
1. **`Marge Mania v0.1`:**
   * Configuração de layout `AltMenuScreen`.
   * Map 8 como mapa de introdução e restrição de idade.
2. **`RJ01618221`:**
   * Estrutura de dados proprietária `ArinaSynopsis.json`.
   * Plugins customizados `Arina*` (como `ArinaUI` e `ArinaBattleSystem`).
   * Pulo de título / seleção de prólogo configurado no Map 1.

---

## 4. CONCLUSÃO DA AUDITORIA COMPARATIVA

A família RPG Maker MZ compartilha os fundamentos conceituais do RPG Maker MV (armazenamento JSON, termos de sistema, códigos de evento 401/102), mas difere drasticamente na organização de diretórios (sem pasta `www/`), no carregador modular moderno (ES6 / Effekseer WASM / NW.js x64) e nos comandos de plugin (Code 357).

Toda a implementação no OpenTranslator deve operar estritamente com base em **capacidades técnicas detectadas** (`hasEncryptedImages`, formato dos eventos, presença ou ausência de `www/`, extensões em `data/`), mantendo zero linhas de código vinculadas a nomes arbitrários de jogos.
