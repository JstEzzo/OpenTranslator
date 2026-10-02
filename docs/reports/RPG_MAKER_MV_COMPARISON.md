# RELATÓRIO DE COMPARAÇÃO TÉCNICA: RPG MAKER MV
**Data:** 27 de Setembro de 2026  
**Jogos Comparados:**
1. `Toki kan Yuusha (gitgud)` (Controle Positivo — FULLY VERIFIED)
2. `RJ01058687_en` (Alvo de Extensão de Suporte)

---

## 1. COMPARAÇÃO ARQUITETURAL E ESTRUTURAL

| Aspecto Técnico | Toki kan Yuusha (gitgud) | RJ01058687_en | Relação / Impacto no Suporte |
| :--- | :--- | :--- | :--- |
| **Versão da Engine** | RPG Maker MV 1.6.1 (`rpg_core.js`) | RPG Maker MV 1.6.1 (`rpg_core.js`) | **Idêntica** |
| **Runtime Container** | NW.js (Node-Webkit) x32 | NW.js (Node-Webkit) x32 | **Idêntico** |
| **Estrutura de Pastas** | `www/` raiz com `data/`, `js/`, `fonts/` | `www/` raiz com `data/`, `js/`, `fonts/` | **Idêntica** |
| **Executável Principal** | `game.exe` (com `notification_helper.exe`) | `Game.exe` | **Idêntico** (apenas case sensitive no Windows) |
| **Quantidade de Mapas/JSONs** | 858 arquivos em `www/data/` | 117 arquivos em `www/data/` | Padrão MV |
| **Plugins Declarados** | 172 plugins (`www/js/plugins.js`) | 76 plugins (`www/js/plugins.js`) | Toki possui o dobro de plugins |
| **Framework de Plugins** | Yanfly Engine Plugins (YEP massivo) | Yanfly Core/Message + Plugins Especializados | Ambos usam YEP |
| **Localização de Diálogos** | `MapXXX.json` e `CommonEvents.json` | **`www/data/ExternMessage.csv`** (Plugin `ExternMessage.js`) | **DIFERENÇA CRÍTICA 1** |
| **Fluxo de Inicialização** | `Scene_Title` convencional | **`Scene_Map` direto** (Plugin `Yami_SkipTitle.js`) | **DIFERENÇA CRÍTICA 2** |
| **Encoding de Diálogos** | UTF-8 (`*.json`) | UTF-16LE com BOM (`ExternMessage.csv`) | **DIFERENÇA CRÍTICA 3** |
| **Termos de Sistema** | 26 comandos padrão em `System.json` | 26 comandos padrão em `System.json` | **Idêntico** |

---

## 2. DIFERENÇAS CRÍTICAS DETALHADAS

### 2.1 Armazenamento Externo de Diálogos (`ExternMessage.js` + `ExternMessage.csv`)
* **No Toki:** Todos os diálogos entre personagens, narrações e escolhas estão serializados dentro dos comandos de eventos `401` (Show Text) e `102` (Show Choices) nos 800+ arquivos `MapXXX.json`.
* **No RJ01058687_en:** O jogo utiliza o plugin japonês `ExternMessage.js` (autor Baizan). Esse plugin hooka `DataManager.loadDataFile` e o `Game_Interpreter.prototype.command101` para interceptar comandos de texto. 
* Em vez de ler os diálogos de `MapXXX.json`, o jogo lê as falas diretamente de:
  `www/data/ExternMessage.csv` (arquivo de 3.045.860 bytes codificado em **UTF-16LE**).
* Cada linha desse CSV associa um ID de evento (ex: `OP1`) a uma fala de personagem contendo tags de busto/expressão:
  `\M[フレイア真顔] :name[???,Actor1]Hmm... they're not coming...`
* **Impacto no OpenTranslator:** O extrator padrão de RPG Maker MV que varre apenas `*.json` extrai perfeitamente menus, itens e atores (27.527 textos), mas **ignora as falas narrativas** se não processar `ExternMessage.csv`. O suporte a RPG Maker MV precisa reconhecer e processar `ExternMessage.csv` preservando sua codificação UTF-16LE e escape codes `\M[...]` e `:name[...]`.

### 2.2 Pulo da Tela de Título (`Yami_SkipTitle.js`)
* **No Toki:** O boot inicializa `Scene_Boot` ➔ `Scene_Title` (New Game, Continue, Options).
* **No RJ01058687_en:** O plugin `Yami_SkipTitle.js` sobrescreve `Scene_Boot.prototype.start` e chama imediatamente:
  ```js
  DataManager.setupNewGame();
  SceneManager.goto(Scene_Map);
  ```
  Isso faz com que o jogo inicialize **diretamente no mapa de abertura** com a primeira cena de diálogo (`OP1`), sem passar pelo menu de título tradicional.
* **Impacto no OpenTranslator:** No smoke test e testes automatizados de baseline/tradução, o jogo não deve aguardar interação na tela de título para entrar no gameplay, pois o gameplay já começa no primeiro frame após o boot.

### 2.3 Notetags e Categorias
* **No Toki:** Presença massiva de notetags Yanfly complexas (`<Custom Item Category>`, fórmulas JS como `a.atk * 4 - b.def * 2`).
* **No RJ01058687_en:** O jogo usa `YEP_MessageCore` e plugins visuais (como `BB_FontColorChanger`, `LL_MenuScreenBaseMV`, `FTKR_PopupSpriteMessage`), mas sem as customizações profundas de inventário do Toki.

---

## 3. SEPARAÇÃO FORMAL: O QUE É GENERALIZÁVEL VS. ESPECÍFICO DO TOKI

### 3.1 GENERALIZÁVEL (Motor RPG Maker MV):
1. **Estrutura `www/`:** Detecção unificada através de `package.json` (`main: "www/index.html"`) e `www/data/System.json`.
2. **Sistema de Menus e Opções:** Extração e tradução de `System.json` (`terms.commands`, `terms.basic`, `terms.params`, `terms.messages`).
3. **Bancos de Dados Padrão:** `Actors.json`, `Classes.json`, `Skills.json`, `Items.json`, `Weapons.json`, `Armors.json`, `Enemies.json`, `Troops.json`, `States.json`, `Animations.json`, `Tilesets.json`, `CommonEvents.json`.
4. **Plugins Comuns:** Tradução de textos em parâmetros de plugins (`www/js/plugins.js`) protegendo fórmulas, caminhos e variáveis de áudio.
5. **Tratamento de Plugins de Mensagem Externa:** Suporte por capability para jogos que utilizam `ExternMessage.csv` na pasta `data/`. Se `ExternMessage.csv` existir na pasta `data/`, o pipeline MV deve extrair e aplicar seus textos em UTF-16LE.
6. **Controle de Rollback:** Restauração atômica com cálculo de SHA-256 de `www/data/` e `www/js/plugins.js`.
7. **Runtime Dual-Hook:** Injeção do `CheatOverlay.js` conectando à porta WebSocket 16005 para observação em tempo real.

### 3.2 ESPECÍFICO DO TOKI (A NÃO REPLICAR EM OUTROS JOGOS):
1. `opentSetupItemCategoryFix()`: Solução específica para categorias de itens personalizadas geradas pelo script customizado do Toki. No RJ01058687, essa lógica não deve ser forçada caso as classes do Yanfly Item Core não estejam ativas.
2. Dicionários de termos customizados do Toki.
