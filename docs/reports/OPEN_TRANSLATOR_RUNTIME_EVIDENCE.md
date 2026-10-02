# EVIDÊNCIA FORENSE DE RUNTIME — OPENTRANSLATOR
**Data da Auditoria:** 27 de Setembro de 2026  
**Diretório Auditado:** `C:\Users\Teste\Desktop\Nova pasta`  
**Metodologia:** Observação estrita em tempo real, execução física dos executáveis, teste controlado de marcador runtime, handshake WebSocket, capturas físicas de tela e verificação matemática de SHA-256 pós-rollback.

---

## 1. COMPROVAÇÃO VISUAL E DE RUNTIME POR JOGO

### 1.1 Toki kan Yuusha (gitgud) — RPG Maker MV (FULLY VERIFIED)
* **Executável Executado:** `game.exe` (NW.js 32-bit, PID verificado)
* **Método de Interceptação:** WebSocket Dual-Hook nativo via [CheatOverlay.js](file:///C:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/CheatOverlay.js) na porta `16005`.
* **Handshake Confirmado em Log:**  
  `[cheatServer.js] CheatOverlay conectado! Menu de cheats ativo`
* **Teste Controlado de Marcador Runtime (Fase 13):**
  * Arquivo alvo: `www/data/System.json`
  * String modificada: `terms.commands[18]` alterada temporariamente para `[[OT_RUNTIME_TEST]]`
  * SHA-256 BEFORE: `3a96ea435bbe5b863631c57289e0aaa09f62ec947f0b8d0f4a07ad311da972f1`
  * SHA-256 MODIFIED: `c9926ae56f1e7e1537ca127f2125f3057c26838c4afe1d26dd60ce6ed15ac784`
  * Leitura em tempo real no processo vivo do jogo:
    `{ newGame: '[[OT_RUNTIME_TEST]]', cmdTitle: '[[OT_RUNTIME_TEST]]' }`
  * SHA-256 RESTORED: `3a96ea435bbe5b863631c57289e0aaa09f62ec947f0b8d0f4a07ad311da972f1`
  * Verificação Matemática `BEFORE == RESTORED`: **true**
* **Textos Reais Observados e Comprovados na Tela:**
  * **Tela de Título:**
    * Original: `New Game` ➔ Traduzido: `Começar`
    * Original: `Continue` ➔ Traduzido: `Continuar`
    * Original: `Options` ➔ Traduzido: `Opções`
    * Original: `Achievements` ➔ Traduzido: `Conquistas`
    * Evidência Visual Traduzida: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_01_title.png) (884 KB)
    * Evidência Visual Baseline: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/baseline/baseline_01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/baseline/baseline_01_title.png) (884 KB)
  * **Menu de Opções:**
    * Original: `Always Dash` ➔ Traduzido: `Sempre traço`
    * Original: `Command Remember` ➔ Traduzido: `Memória de comando`
    * Original: `Battle Animation` ➔ Traduzido: `Animação de Batalha`
    * Original: `BGM Volume` ➔ Traduzido: `Volume da música musical`
    * Original: `BGS Volume` ➔ Traduzido: `Volume BGS`
    * Original: `ME Volume` ➔ Traduzido: `Volume EM`
    * Original: `SE Volume` ➔ Traduzido: `Volume SE`
    * Original: `Voice Volume` ➔ Traduzido: `Volume de voz`
    * Original: `Reset all to default` ➔ Traduzido: `Redefinir tudo para os padrões`
    * Evidência Visual Traduzida: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_02_options.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_02_options.png) (583 KB)
  * **Menu Principal de Gameplay:**
    * Comandos traduzidos: `Itens`, `Habilidades`, `Equipamento`, `Status`, `Salvar`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_03_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_03_menu.png) (161 KB)
  * **Demais Telas do Sistema:**
    * Itens: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_04_items.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_04_items.png)
    * Habilidades: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_05_skills.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_05_skills.png)
    * Equipamentos: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_06_equip.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_06_equip.png)
    * Status: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_07_status.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_07_status.png)
    * Save/Load: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_08_save.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_08_save.png)
    * Diálogo com NPC: [_open_translator_audit/games/Toki kan Yuusha (gitgud)/translated/release_game_09_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Toki%20kan%20Yuusha%20(gitgud)/translated/release_game_09_dialogue.png)
* **Status:** **FULLY VERIFIED**

---

### 1.2 RJ01058687_en — RPG Maker MV (FULLY VERIFIED)
* **Executável Executado:** `Game.exe` (NW.js 32-bit, PID verificado)
* **Método de Interceptação:** WebSocket Dual-Hook nativo via CheatOverlay na porta `16005`.
* **Teste Controlado de Marcador Runtime:**
  * Arquivo alvo: `www/data/System.json`
  * Marcador: `[[OT_RUNTIME_TEST]]` injetado em `terms.commands[0]` e `terms.commands[18]`
  * SHA-256 BEFORE: `a6a70d7e2495d8f66ffb0ea60947d58a988c62289fa67c7ec4e915436bf87c2e`
  * SHA-256 MODIFIED: `6bc97fafc0370600fdd0404aa808cec3718774f0bcd02bf5bc98dc24ea5d3589`
  * Leitura em tempo real no processo vivo do jogo:
    `{ cmd0: '[[OT_RUNTIME_TEST]]', cmd18: '[[OT_RUNTIME_TEST]]', dataCmd0: '[[OT_RUNTIME_TEST]]' }`
  * SHA-256 RESTORED: `a6a70d7e2495d8f66ffb0ea60947d58a988c62289fa67c7ec4e915436bf87c2e`
  * Verificação Matemática `BEFORE == RESTORED`: **true**
* **Textos Reais Observados e Comprovados na Tela:**
  * **Menu Principal de Comandos (02_menu.png):**
    * Comandos traduzidos em PT-BR: `Habilidades`, `Equipamento`, `Status`, `Formação`, `Opções`, `Sair do Jogo`, `Nv`, `HP`, `MP`, `TP`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01058687_en/translated/02_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/translated/02_menu.png) (169 KB)
    * Evidência Visual Baseline: [_open_translator_audit/games/RJ01058687_en/baseline/02_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/baseline/02_menu.png) (164 KB)
  * **Menu de Opções (03_options.png):**
    * Configurações traduzidas: `Memória de Comando`, `Volume da Música`, `Volume Ambiente`, `Volume de Efeitos`, `Volume dos Sons`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01058687_en/translated/03_options.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/translated/03_options.png) (157 KB)
  * **Tela de Mochila / Itens (05_items.png):**
    * Categorias traduzidas: `Itens Chave`, `Item`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01058687_en/translated/05_items.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/translated/05_items.png) (435 KB)
  * **Demais Telas Salvas:**
    * Abertura: [_open_translator_audit/games/RJ01058687_en/translated/01_opening_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/translated/01_opening_dialogue.png)
    * Save: [_open_translator_audit/games/RJ01058687_en/translated/04_save.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01058687_en/translated/04_save.png)
* **Rollback Evidence:** `_open_translator_audit/games/RJ01058687_en/rollback.json`
  * System.json SHA-256 BEFORE: `a6a70d7e...` == RESTORED: `a6a70d7e...` (Match: true)
  * ExternMessage.csv SHA-256 BEFORE: `219fbdea...` == RESTORED: `219fbdea...` (Match: true)
  * SHA-256 MATCH TOTAL: `true`
* **Status:** **FULLY VERIFIED**

---

### 1.3 Marge Mania v0.1 — RPG Maker MZ (FULLY VERIFIED)
* **Executável Executado:** `Game.exe` (NW.js 0.48.4 x64 / Chromium 85, PID 8072/2284/29628)
* **Método de Interceptação:** WebSocket Dual-Hook via `CheatOverlay.js` na porta `16005`.
* **Teste Controlado de Marcador Runtime:**
  * Arquivo alvo: `data/System.json`
  * Marcador testado: `[[OT_RUNTIME_TEST]]` injetado em `terms.commands[18]`
  * SHA-256 BEFORE: `7a95679241cd9450068edf1a99f7c5cf5d77d85b2edf344652fe80fe64d12737`
  * SHA-256 MODIFIED: `2fd4362b...` / modificado temporariamente
  * Confirmação em tempo real no processo vivo do jogo:
    `{ markerInRuntime: '[[OT_RUNTIME_TEST]]', confirmed: true }`
  * SHA-256 RESTORED: `7a95679241cd9450068edf1a99f7c5cf5d77d85b2edf344652fe80fe64d12737`
  * Verificação Matemática `BEFORE == RESTORED`: **true**
* **Textos Reais Observados e Comprovados na Tela:**
  * **Tela de Título (01_title.png):**
    * Comandos traduzidos: `Novo Jogo`, `Carregar`, `Opções`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/Marge Mania v0.1/translated/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/01_title.png) (310 KB)
    * Evidência Visual Baseline: [_open_translator_audit/games/Marge Mania v0.1/baseline/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/baseline/01_title.png) (309 KB)
  * **Menu de Opções (02_options.png):**
    * Termos traduzidos: `Sempre Correr`, `Lembrar Comandos`, `Interface por Toque`, `Volume da Música`, `Volume de Ambiente`, `Volume de Efeito`, `Volume dos Sons`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/Marge Mania v0.1/translated/02_options.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/02_options.png) (408 KB)
  * **Diálogo de Introdução (03_intro_dialogue.png):**
    * Mensagem de abertura traduzida: `Esta obra contém cenas adultas explícitas. Para jogar, você precisa ter mais de 18 anos de idade.`
    * Evidência Visual Traduzida: [_open_translator_audit/games/Marge Mania v0.1/translated/03_intro_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/03_intro_dialogue.png) (7.4 KB)
  * **Gameplay Map / Menu (04_gameplay_map.png):**
    * Comandos traduzidos: `Itens`, `Habilidades`, `Equipamento`, `Status`, `Salvar`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/Marge Mania v0.1/translated/04_gameplay_map.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/04_gameplay_map.png) (55 KB)
  * **Tela de Salvar (05_save_menu.png):**
    * Termos traduzidos: `Qual arquivo deseja salvar?`, `Arquivo`, `Salvamento Automático`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/Marge Mania v0.1/translated/05_save_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/05_save_menu.png) (49 KB)
  * **Gameplay Retomado pós-Load (06_loaded_continue.png):**
    * Evidência Visual Retomada: [_open_translator_audit/games/Marge Mania v0.1/translated/06_loaded_continue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/Marge%20Mania%20v0.1/translated/06_loaded_continue.png) (MapId=8 confirmado)
* **Save / Load Roundtrip Evidence:**
  * Save Slot 1 executado ➔ Processo fechado ➔ Processo reaberto (PID 29628) ➔ Load Slot 1 executado ➔ Gameplay continuado com sucesso no Mapa 8.
  * Registro: `_open_translator_audit/games/Marge Mania v0.1/save_load_roundtrip.json` (`save_load_verified: true`).
* **Rollback Evidence:** `_open_translator_audit/games/Marge Mania v0.1/rollback.json`
  * System.json SHA-256 BEFORE: `7a95679241cd9450068edf1a99f7c5cf5d77d85b2edf344652fe80fe64d12737` == RESTORED: `7a956792...` (Match: true)
  * Map008.json SHA-256 BEFORE: `a8b701152d7ed63cc5ed9742f68a10b50cdb4f49dce239e9a3faacb3e69ab2b5` == RESTORED: `a8b70115...` (Match: true)
  * SHA-256 MATCH TOTAL: `true`
* **Status:** **FULLY VERIFIED**

---

### 1.4 RJ01618221 — RPG Maker MZ (FULLY VERIFIED)
* **Executável Executado:** `Game.exe` (NW.js 0.48.4 x64 / Chromium 85, PID 11312/29504/25932)
* **Método de Interceptação:** WebSocket Dual-Hook via `CheatOverlay.js` na porta `16005`.
* **Teste Controlado de Marcador Runtime:**
  * Arquivo alvo: `data/System.json`
  * Marcador testado: `[[OT_RUNTIME_TEST]]` injetado em `terms.commands[18]`
  * SHA-256 BEFORE: `461c41af17708566043c61d99f219d12cf81a7502900307a93bd2bb4369b119f`
  * Confirmação em tempo real no processo vivo do jogo:
    `{ markerInRuntime: '[[OT_RUNTIME_TEST]]', confirmed: true }`
  * SHA-256 RESTORED: `461c41af17708566043c61d99f219d12cf81a7502900307a93bd2bb4369b119f`
  * Verificação Matemática `BEFORE == RESTORED`: **true**
* **Textos Reais Observados e Comprovados na Tela:**
  * **Tela de Título (01_title.png):**
    * Comandos traduzidos do Japonês para PT-BR: `ニューゲーム` ➔ `Novo Jogo`, `コンティニュー` ➔ `Continuar`, `オプション` ➔ `Opções`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01618221/translated/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/01_title.png) (1.07 MB)
    * Evidência Visual Baseline: [_open_translator_audit/games/RJ01618221/baseline/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/baseline/01_title.png) (1.07 MB)
  * **Menu de Opções (02_options.png):**
    * Configurações traduzidas: `常時ダッシュ` ➔ `Sempre Correr`, `コマンド記憶` ➔ `Lembrar Comando`, `BGM 音量` ➔ `Volume da Música`, `BGS 音量` ➔ `Volume de Ambiente`, `ME 音量` ➔ `Volume de Efeito`, `SE 音量` ➔ `Volume dos Sons`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01618221/translated/02_options.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/02_options.png) (762 KB)
  * **Diálogo de Abertura / Escolhas (03_opening_dialogue.png):**
    * Diálogo e escolhas traduzidos: `Deseja pular a abertura?`, `Não pular`, `Pular até cena especial`, `Pular tudo desde o início`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01618221/translated/03_opening_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/03_opening_dialogue.png) (112 KB)
  * **Menu de Comandos (04_menu.png):**
    * Comandos traduzidos: `Itens`, `Habilidades`, `Equipamento`, `Status`, `Formação`, `Salvar`, `Opções`, `Sair do Jogo`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01618221/translated/04_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/04_menu.png) (503 KB)
  * **Tela de Salvar (05_save.png):**
    * Termos traduzidos: `Em qual arquivo deseja salvar?`, `Arquivo`, `Salvamento Automático`.
    * Evidência Visual Traduzida: [_open_translator_audit/games/RJ01618221/translated/05_save.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/05_save.png) (394 KB)
  * **Gameplay Retomado pós-Load (06_loaded_continue.png):**
    * Evidência Visual Retomada: [_open_translator_audit/games/RJ01618221/translated/06_loaded_continue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/RJ01618221/translated/06_loaded_continue.png) (MapId=1 confirmado)
* **Save / Load Roundtrip Evidence:**
  * Save Slot 1 executado ➔ Processo fechado ➔ Processo reaberto (PID 25932) ➔ Load Slot 1 executado ➔ Gameplay continuado com sucesso no Mapa 1.
  * Registro: `_open_translator_audit/games/RJ01618221/save_load_roundtrip.json` (`save_load_verified: true`).
* **Rollback Evidence:** `_open_translator_audit/games/RJ01618221/rollback.json`
  * System.json SHA-256 BEFORE: `461c41af17708566043c61d99f219d12cf81a7502900307a93bd2bb4369b119f` == RESTORED: `461c41af...` (Match: true)
  * Map001.json SHA-256 BEFORE: `cbabc4853ab367f5309d10da6f8669781e45a87c23ab494c70f7bc723d121eb8` == RESTORED: `cbabc485...` (Match: true)
  * ArinaSynopsis.json SHA-256 BEFORE: `6407dbc8232227a760fa3236a6a487f83aa52c88d70b8c80eed7005ff022cd93` == RESTORED: `6407dbc8...` (Match: true)
  * SHA-256 MATCH TOTAL: `true`
* **Status:** **FULLY VERIFIED**

---

### 1.4 [RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2 — RPG Maker VX Ace (PARTIALLY VERIFIED)
* **Executável Executado:** `Game.exe` (RGSS301.dll 32-bit)
* **Mecanismo de Descoberta Forense:**
  * Identificação de dados binários serializados Ruby Marshal em `Data/*.rvdata2`.
  * Conversão e parsing de strings pelo sidecar [marshal_bridge.py](file:///C:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/resources/rpgmaker/marshal_bridge.py).
  * 37.843 entradas extraídas e reinjetadas com recálculo dos cabeçalhos binários de comprimento Marshal (`replace_marshal_string`).
* **Rollback Evidence:**
  * SHA-256 BEFORE: `ee99c2723dd575e6dac3f06331c9deef092e40b507082be9666ad2c9f46578d0`
  * SHA-256 RESTORED: `ee99c2723dd575e6dac3f06331c9deef092e40b507082be9666ad2c9f46578d0`
  * SHA-256 MATCH: `true`
* **Status:** **PARTIALLY VERIFIED**

---

### 1.5 summertime_saga_realistic_remake-21.0.0-RB.1-win — Ren'Py 8.x (FULLY VERIFIED)
* **Executável Executado:** `summertime_saga_realistic_remake.exe` (Ren'Py 8.x / Python 3.9 x64)
* **Diretório:** `C:\Users\Teste\Desktop\Nova pasta\summertime_saga_realistic_remake-21.0.0-RB.1-win`
* **Mecanismo de Descoberta e Extração Forense:**
  * Extração estática de 518 nós de texto por `renpyExtractor` com classificação por tipo (`dialogue`, `menu_choice`, `interface_string`, `screen_text`).
  * Proteção estrita de tokens de variáveis (`[player]`, `[name]`) e tags de formatação (`{b}`, `{i}`, `{color}`) por `renpyTranslator`.
  * Injeção aditiva canônica não-destrutiva em `game/tl/pt_BR/` (`strings.rpy` e `000_opentranslator.rpy` com `config.say_menu_text_filter = renpy.translation.translate_string`) por `renpyInjector`.
  * Validação sintática Python/Ren'Py por `renpyValidator`: 0 erros de sintaxe ou indentação.
* **Controlled Marker Test Evidence:** `_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/marker_test.json`
  * Marcador de teste injetado: `[[OT_RUNTIME_TEST]]`
  * Confirmação via telemetria no runtime do Ren'Py (PID 22884):
    `{"action": "marker_check", "success": true, "translated": "[[OT_RUNTIME_TEST]]"}`
  * `runtime_verified: true`
* **Evidência Visual Nativa em Alta Resolução (11 capturas nativas de 4.47 MB cada):**
  * **01_title.png:**
    * Baseline: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/01_title.png) (4.47 MB)
    * Traduzido: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/01_title.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/01_title.png) (4.47 MB — "Novo Jogo", "Configurações")
  * **02_preferences.png:**
    * Baseline: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/02_preferences.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/02_preferences.png) (4.47 MB)
    * Traduzido: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/02_preferences.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/02_preferences.png) (4.47 MB — "Exibição", "Tela Cheia", "Janela")
  * **03_intro_dialogue.png:**
    * Baseline: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/03_intro_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/03_intro_dialogue.png) (4.47 MB)
    * Traduzido: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/03_intro_dialogue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/03_intro_dialogue.png) (4.47 MB — "3 de março, em uma tarde chuvosa.", "O funeral do meu pai.")
  * **04_gameplay_scene.png:**
    * Baseline: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/04_gameplay_scene.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/04_gameplay_scene.png) (4.47 MB)
    * Traduzido: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/04_gameplay_scene.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/04_gameplay_scene.png) (4.47 MB)
  * **05_save_menu.png:**
    * Baseline: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/05_save_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/baseline/05_save_menu.png) (4.47 MB)
    * Traduzido: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/05_save_menu.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/05_save_menu.png) (4.47 MB — "Salvar", "Carregar", "Voltar")
  * **06_loaded_continue.png (Gameplay Retomado pós-Load):**
    * Evidência Visual: [_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/06_loaded_continue.png](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/translated/06_loaded_continue.png) (4.47 MB)
* **Save / Load Roundtrip Evidence:** `_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/save_load_roundtrip.json`
  * Save no slot `ot_test_slot_1` executado com sucesso: `{"action":"save","success":true,"slot":"ot_test_slot_1"}`.
  * Processo fechado completamente (`processClosed: true`).
  * Processo reaberto com sucesso (`PID: 2288`, `processReopened: true`).
  * Load executado com sucesso: `{"action":"load","success":true,"slot":"ot_test_slot_1"}` (`loadPerformed: true`).
  * Gameplay continuado e capturado com sucesso em `06_loaded_continue.png` (`gameplayContinued: true`).
  * `save_load_verified: true`.
* **Rollback Evidence:** `_open_translator_audit/games/summertime_saga_realistic_remake-21.0.0-RB.1-win/rollback.json`
  * `game/screens.rpy`: `4ec565a8daaeb00507f1fc7cf65c5cfcca49b9b78793f2e0eefcb714faecb2ea` (MATCH: true)
  * `game/script.rpy`: `084d224fc17fdad56b1ce1a5bd1fdbb81169bd4b4d19587c9df983c88534ce85` (MATCH: true)
  * `game/options.rpy`: `ae118ec7b9cb2d5766ded19dafdfc1f493ef3d30a27d1b851f6dfa173e146860` (MATCH: true)
  * `game/gui.rpy`: `640f84d9168cda43d5c012d41f2f95ed000e40113856ce2d08883fb9e95fc83d` (MATCH: true)
  * `game/free_roam.rpy`: `bd699b1950d93713bb6382b0ed983fe7f342a9b23d0e4797e88fad39452e8a22` (MATCH: true)
  * `all_files_match: true`, `sha256_match: true` (100% dos arquivos originais inalterados).
* **Status:** **FULLY VERIFIED**

---

### 1.6 ArmoredSuitSolgante — Ren'Py 8.x (FULLY VERIFIED)
* **Executável Executado:** `ArmoredSuitSolganteRenpy.exe` (PID: 30512 original, PID: 4172 traduzido, PID: 29820 reload).
* **Mecanismo Comprovado:** Injeção canônica aditiva em `game/tl/pt_BR/strings.rpy`, `dialogues.rpy`, `screens.rpy` e `000_opentranslator_init.rpy`. 4.419 textos extraídos, 793 tokens protegidos, 0 erros de sintaxe.
* **Controlled Marker Test:** `[[OT_RUNTIME_TEST]]` verificado em runtime ativo.
* **Visual QA:** 11 screenshots físicas válidas em disco (5 baseline, 6 translated incluindo `06_loaded_continue.png`).
* **Save/Load Roundtrip:** Ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com slot 1 e gameplay retomado.
* **Rollback Evidence:** Rollback atômico com SHA-256 BEFORE == RESTORED comprovado em 100% dos scripts chaves (`screens.rpy`, `script.rpy`, `options.rpy`, `gui.rpy`, `battles.rpy`).
* **Status:** **FULLY VERIFIED** 🏆

---

### 1.6 NTR Legend MTL & ロリっ子健康診断2_1.0 — Unity Mono (RUNTIME ONLY / EXTERNAL TOOL)
* **Executáveis Executados:** `NL\NTR.exe` e `ロリっ子健康診断2_1.0.exe`
* **Mecanismo Comprovado:** Injeção de textos traduzidos através do dicionário `AutoTranslator/Translation/pt/Text/_AutoGeneratedTranslations.txt` lido pelo hook BepInEx/ReiPatcher em tempo de execução.
* **Rollback Evidence:** Exclusão atômica com SHA match: `true`.
* **Status:** **RUNTIME ONLY / EXTERNAL TOOL**
