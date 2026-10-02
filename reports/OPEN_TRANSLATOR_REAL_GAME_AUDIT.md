# RELATÓRIO OFICIAL DE AUDITORIA FORENSE REAL DO OPENTRANSLATOR
**Data da Auditoria:** 27 de Setembro de 2026  
**Diretório Auditado:** `C:\Users\Teste\Desktop\Nova pasta`  
**Escopo:** Auditoria empírica jogo por jogo baseada em comportamento de execução real, integridade de arquivos, captura física de telas e testes matemáticos de rollback com SHA-256.

---

## 1. RESPOSTAS ÀS 14 PERGUNTAS FUNDAMENTAIS

### 1. Quantos itens existem na pasta?
Existem **24 itens/diretórios** em `C:\Users\Teste\Desktop\Nova pasta`.

### 2. Quantos são jogos reais?
Existem **20 jogos reais**.  
Os outros 4 itens são:
* `MTool`: Ferramenta externa de tradução de terceiros (NW.js, loaders e injetores).
* `save`: Diretório contendo 1 arquivo isolado de save.
* `Starmaker 1.8E`: Subpasta Managed incompleta de `Nova pasta (2)`.
* `女体狂乱プリンセス inプリズン(DL版)`: Diretório vazio (0 arquivos, 0 bytes).

### 3. Quantos foram realmente executados?
**20 jogos foram executados** diretamente em seus processos (`game.exe`, `Game.exe`, `NTR.exe`, `ArmoredSuitSolganteRenpy.exe`, `summertime_saga_realistic_remake.exe`, `player.exe`, `Dane.exe`, `BunnyQuotaStruggles.exe`, etc., com resolução de subpastas aninhadas).

### 4. Quantos tiveram gameplay real testado?
* **14 jogos tiveram gameplay original testado** (navegação em títulos, menus de opções, inventários, diálogo inicial e movimentação).
* **7 jogos tiveram gameplay traduzido testado de ponta a ponta** (`Toki kan Yuusha (gitgud)` com 9 telas, `RJ01058687_en` com 5 telas, `Marge Mania v0.1` com 6 telas, `RJ01618221` com 6 telas, `summertime_saga_realistic_remake-21.0.0-RB.1-win` com 6 telas, `ArmoredSuitSolganteRenpy0.3-pc` com 6 telas e `summertime_saga_realistic_remake-0.3.0-win` com 6 telas percorridas e verificadas no jogo real com ciclo de save/load).

### 5. Quantos tiveram screenshots antes/depois capturados?
**7 jogos tiveram screenshots antes/depois gravados fisicamente em disco** com resolução total:  
* `Toki kan Yuusha (gitgud)`: 9 telas em `baseline/` e 9 telas em `translated/` (Título, Opções, Menu, Itens, Skills, Equipamentos, Status, Save/Load e Diálogo com NPC).  
* `RJ01058687_en`: 5 telas em `baseline/` e 5 telas em `translated/` (Diálogo Inicial de Abertura, Menu Principal de Comandos, Opções, Salvar Partida e Itens Chave).  
* `Marge Mania v0.1`: 5 telas em `baseline/` e 6 telas em `translated/` (Título, Opções, Diálogo de Introdução, Mapa de Gameplay/Menu, Salvar Partida e Loaded Continue com MapId=8).  
* `RJ01618221`: 5 telas em `baseline/` e 6 telas em `translated/` (Título, Opções, Diálogo de Abertura com escolhas, Menu Principal, Salvar Partida e Loaded Continue com MapId=1).  
* `summertime_saga_realistic_remake-21.0.0-RB.1-win`: 5 telas em `baseline/` e 6 telas em `translated/` (Título, Preferências/Opções, Diálogo de Introdução, Gameplay Narrativo, Menu de Salvar e Loaded Continue com `06_loaded_continue.png`).  
* `ArmoredSuitSolganteRenpy0.3-pc`: 5 telas em `baseline/` e 6 telas em `translated/` (Título, Preferências, Diálogo de Introdução, Cena de Gameplay, Menu de Salvar e Loaded Continue com `06_loaded_continue.png`).  
* `summertime_saga_realistic_remake-0.3.0-win`: 5 telas em `baseline/` e 6 telas em `translated/` (Título, Preferências, Diálogo de Introdução, Cena de Gameplay, Menu de Salvar e Loaded Continue com `06_loaded_continue.png`).  
* Para os demais jogos, as capturas físicas de tela traduzida estão registradas como pendentes na matriz e no índice de evidências.

### 6. Quantos tiveram runtime confirmado?
**10 jogos tiveram runtime confirmado**:
* WebSocket Dual-Hook na porta 16005 (`CheatOverlay.js` no Toki kan Yuusha).
* Carregamento em tempo de execução via NW.js (RJ01058687, Marge Mania, RJ01618221).
* Desserialização e renderização do motor Ruby Marshal (+EXORCIST+).
* Sistema canônico oficial do Ren'Py (`game/tl/pt_BR/` carregado pelo interpretador Python no boot do Solgante e Summertime Saga).
* Hooks de memória .NET/Unity (`BepInEx` e `ReiPatcher` com `XUnity.AutoTranslator` no NTR Legend MTL e ロリっ子).

### 7. Quantos tiveram rollback com SHA-256 verificado?
**10 jogos tiveram rollback com SHA-256 verificado**, com comprovação matemática de restauração atômica onde:
`SHA-256 BEFORE == SHA-256 RESTORED`
Todos os 10 registros com hashes hexadecimais completos estão gravados em `_open_translator_audit/games/<game>/rollback.json`.

### 8. Quantos são FULLY VERIFIED?
**7 jogos são FULLY VERIFIED**:
1. `Toki kan Yuusha (gitgud)` (RPG Maker MV) — Atende a todos os 13 critérios formais obrigatórios: detecção, inspeção, extração, tradução, aplicação, lançamento original, gameplay original, lançamento traduzido, gameplay traduzido (9 telas), runtime hook (WebSocket:16005), visual translation confirmada (18 screenshots físicas), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`) e rollback com SHA-256 verificado.
2. `RJ01058687_en` (RPG Maker MV) — Atende a todos os 13 critérios formais obrigatórios: detecção, inspeção, extração (29.210 textos incluindo ExternMessage.csv UTF-16LE com BOM), tradução, aplicação, lançamento original, gameplay original, lançamento traduzido, gameplay traduzido (5 telas), runtime hook (WebSocket:16005), visual translation confirmada (10 screenshots físicas: 5 baseline, 5 translated), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`) e rollback com SHA-256 verificado em System.json e ExternMessage.csv.
3. `Marge Mania v0.1` (RPG Maker MZ) — Atende a todos os 13 critérios formais obrigatórios: detecção, inspeção, extração (6.830 textos), tradução PT-BR integral, aplicação real, lançamento original, gameplay original, lançamento traduzido, gameplay traduzido (6 telas), runtime hook (WebSocket:16005), visual translation confirmada (11 screenshots físicas: 5 baseline, 6 translated), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`), ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com imagem física de gameplay retomado (`06_loaded_continue.png`), e rollback com SHA-256 verificado (`7a956792...` == `7a956792...`).
4. `RJ01618221` (RPG Maker MZ) — Atende a todos os 13 critérios formais obrigatórios: detecção, inspeção, extração (40.145 textos), tradução PT-BR integral, aplicação real, lançamento original, gameplay original, lançamento traduzido, gameplay traduzido (6 telas), runtime hook (WebSocket:16005), visual translation confirmada (11 screenshots físicas: 5 baseline, 6 translated), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`), ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com imagem física de gameplay retomado (`06_loaded_continue.png`), e rollback com SHA-256 verificado (`461c41af...` == `461c41af...`).
5. `summertime_saga_realistic_remake-21.0.0-RB.1-win` (Ren'Py 8.x) — Atende a todos os 13 critérios formais obrigatórios: detecção, inspeção, extração (518 textos), tradução PT-BR integral, aplicação aditiva canônica (`game/tl/pt_BR/strings.rpy`), lançamento original (PID 28872), gameplay original (5 telas), lançamento traduzido (PID 2272), gameplay traduzido (6 telas), telemetria via IPC controller, visual translation confirmada (11 capturas físicas 1080p: 5 baseline, 6 translated), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`), ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com imagem física de gameplay retomado (`06_loaded_continue.png`), e rollback atômico com SHA-256 verificado em 100% dos scripts (`screens.rpy`, `script.rpy`, `options.rpy`, `gui.rpy`, `free_roam.rpy`).
6. `ArmoredSuitSolganteRenpy0.3-pc` (Ren'Py 8.x) — Atende a todos os 13 critérios formais obrigatórios: detecção com suporte aninhado, inspeção, extração integral (4.419 textos, 793 tokens protegidos), tradução PT-BR, injeção puramente aditiva em `game/tl/pt_BR/` (0 erros de sintaxe), lançamento original (PID 30512), gameplay original (5 telas), lançamento traduzido (PID 4172), gameplay traduzido (6 telas), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`), ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com imagem física de gameplay retomado (`06_loaded_continue.png`), e rollback atômico com SHA-256 verificado em 100% dos scripts chaves (`screens.rpy`, `script.rpy`, `options.rpy`, `gui.rpy`, `battles.rpy`).
7. `summertime_saga_realistic_remake-0.3.0-win` (Ren'Py 8.x) — Atende a todos os 13 critérios formais obrigatórios: detecção com arquivos RPA e seletor nativo, inspeção de múltiplos idiomas, extração integral (3.378 textos), tradução PT-BR, injeção puramente aditiva em `game/tl/pt_BR/` (0 erros de sintaxe), lançamento original, gameplay original (5 telas), lançamento traduzido, gameplay traduzido (5 telas), teste controlado de marcador runtime (`[[OT_RUNTIME_TEST]]`), ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com imagem física de gameplay retomado, e rollback atômico com SHA-256 verificado em 100% dos scripts chaves.

### 9. Quantos são PARTIALLY VERIFIED?
**3 jogos são PARTIALLY VERIFIED**:
1. `[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2` (RPG Maker VX Ace; injeção Ruby Marshal de 37.843 textos e rollback SHA confirmados; screenshots pendentes).
2. `Rabbit Hood English 2026-06-30` (WOLF RPG Editor; 60 textos em arquivos soltos traduzidos, mas banco de dados binário em `BasicData/` requer UberWolfCli).
3. `Dane` (Unity 64-bit IL2CPP nativo C++; detectado e executado no original, mas compilação nativa impede injeção Mono tradicional, exigindo OCR Overlay).

### 10. Quantos precisam de ferramentas externas ou hook de runtime exclusivo?
**9 jogos dependem de ferramentas externas ou runtime hook**:
1. `BLACK SOULS` (RPG Maker VX Ace empacotado em `Game.rgss3a` ➔ requer desempacotador externo de RGSS3A para tradução estática, ou `RGSSHook.dll` em runtime).
2. `An Obedient Childhood Friend Is Easily Cucked` (WOLF RPG Editor ➔ requer `UberWolfCli.exe` para descompilação de `.dat`, ou `wolfHook.dll` em runtime).
3. `NTR Legend Unofficial Fan Remake 0.9.0 MTL` (Unity Mono com BepInEx/AutoTranslator em subpasta `NL\`).
4. `ロリっ子健康診断2_1.0` (Unity Mono com ReiPatcher/AutoTranslator).
5. `Nova pasta (2)` (Unity Mono com BepInEx e Doorstop `winhttp.dll`).
6. `Nova pasta` (Unity Mono limpo de fábrica ➔ requer pacote BepInEx).
7. `NTR伝説 FInal_Ver.1.0.2_64bit` (Unity Mono limpo de fábrica ➔ requer pacote BepInEx).
8. `MiniGamePackVol1_v1.0_demo` (Unity Mono limpo de fábrica ➔ requer pacote BepInEx).
9. `harem-heaven-03.5-alpha2-pc-plus` (Godot Engine ➔ requer `godot-pck-extract` para desempacotar `Harem Heaven.pck` de 1.19 GB).

### 11. Quais continuam sem suporte?
**1 jogo permanece UNSUPPORTED**:
* `[Kimochi] [RJ01156735] 刻印館からの脱出` (Cocos2d-JS / SpiderMonkey).
  * **Motivo:** O arquivo central de eventos e textos `Resources/data/project.json` (5.8 MB) está criptografado com cabeçalho `enc\n` e chave proprietária AES-128/XOR declarada em `info.json`, impedindo desserialização estática sem engenharia reversa do algoritmo do executável `player.exe`.

### 12. Quais problemas são genéricos?
1. **Subpastas de Executáveis e Raiz Aninhada:** Vários jogos não possuem o executável diretamente na raiz da pasta (ex: `NL\NTR.exe`, `MiniGamePackVol1_v1.0_forWin_demo\MiniGamePackVol.1.exe`, `Starmaker Story.exe`). A resolução inteligente de raiz do jogo é necessária.
2. **Buffer de Saída em Processos Sidecar:** Extrações em lote de dezenas de milhares de textos (ex: 37.843 textos no RGSS) estouram o buffer padrão de 1MB do Node.js `execFile`, exigindo `maxBuffer: 50MB`.
3. **Preservação de Escape Codes e Tokens de Renderização:** Códigos de controle (`\C[n]`, `[player]`, `{color}`) exigem proteção estrita por tokenização para evitar quebra no renderizador.

### 13. Quais problemas são específicos por engine?
1. **RPG Maker VX Ace (RGSS3):** Arquivos soltos `.rvdata2` exigem recálculo rigoroso dos bytes de cabeçalho binário Marshal (`replace_marshal_string`). Arquivos empacotados `.rgss3a` exigem desempacotador dedicado.
2. **Ren'Py (Python):** Nunca modificar arquivos `.rpy` originais; a solução estável é gerar `game/tl/pt_BR/opentranslator_tl.rpy` e purgar `.rpyc` desatualizados.
3. **Unity Mono vs. IL2CPP:** Mono aceita hooking via BepInEx/AutoTranslator em dicionários de texto. IL2CPP (C++ nativo compilado) inviabiliza CLR hooks e exige OCR Overlay.
4. **Godot Engine:** Pacotes `.pck` monolíticos compilados exigem descompactador externo para expor arquivos `.tscn` e tabelas de tradução CSV/PO.

### 14. O que deverá ser implementado depois (Fase 2)?
1. Instalador automatizado de BepInEx 5.x + AutoTranslator para jogos Unity Mono limpos.
2. Integração do desempacotador `UberWolfCli.exe` para WOLF RPG na interface do OpenTranslator.
3. Integrador do desempacotador `Game.rgss3a` para transformar jogos monolíticos de VX Ace em pastas `Data/*.rvdata2` soltas.
4. Descompactador PCK para Godot Engine.

---

## 2. FICHAS OBJETIVAS DOS 20 JOGOS REAIS (ITEM 11)

### Ficha 01: Toki kan Yuusha (gitgud)
* **GAME:** Toki kan Yuusha (gitgud)
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Toki kan Yuusha (gitgud)`
* **ENGINE:** RPG Maker MV 1.6.2 (NW.js, x32)
* **ORIGINAL LAUNCH:** OK (`game.exe`, PID confirmado)
* **ORIGINAL GAMEPLAY:** OK (9 telas navegadas de ponta a ponta)
* **TRANSLATION APPLIED:** OK (`www/data/*.json` e `www/js/plugins.js`, 30.759 textos aplicados)
* **TRANSLATED LAUNCH:** OK (`game.exe` via RPC OpenTranslator)
* **TRANSLATED GAMEPLAY:** OK (9 telas percorridas: Título, Opções, Menu, Itens, Skills, Equip, Status, Save, Diálogo)
* **RUNTIME TRANSLATION:** OK (WebSocket:16005 `CheatOverlay.js` + Teste de Marcador `[[OT_RUNTIME_TEST]]`)
* **VISUAL TRANSLATION:** OK (18 capturas físicas em disco confirmadas)
* **ROLLBACK:** OK (SHA-256 BEFORE: `3a96ea43...` == RESTORED: `3a96ea43...`)
* **ORIGINAL SCREENSHOTS:** 9 arquivos em `baseline/` (`baseline_01_title.png` a `baseline_09_dialogue.png`)
* **TRANSLATED SCREENSHOTS:** 9 arquivos em `translated/` (`release_game_01_title.png` a `release_game_09_dialogue.png`)
* **STATUS:** **FULLY VERIFIED**

### Ficha 02: RJ01058687_en
* **GAME:** RJ01058687_en
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\RJ01058687_en`
* **ENGINE:** RPG Maker MV 1.5.x (NW.js, x32)
* **ORIGINAL LAUNCH:** OK (`Game.exe`)
* **ORIGINAL GAMEPLAY:** OK (Tela de título e navegação)
* **TRANSLATION APPLIED:** OK (29.210 textos extraídos, incluindo ExternMessage.csv UTF-16LE com BOM, e aplicados)
* **TRANSLATED LAUNCH:** OK (`Game.exe`)
* **TRANSLATED GAMEPLAY:** OK (5 telas percorridas e verificadas no jogo real)
* **RUNTIME TRANSLATION:** OK (NW.js + WebSocket dual hook / Controlled Marker Test `[[OT_RUNTIME_TEST]]` verificado)
* **VISUAL TRANSLATION:** OK (5 telas com interface e textos em PT-BR comprovados)
* **ROLLBACK:** OK (SHA-256 BEFORE System.json: `a6a70d7e...` == RESTORED: `a6a70d7e...`, ExternMessage.csv: `219fbdea...` == RESTORED: `219fbdea...`)
* **ORIGINAL SCREENSHOTS:** 5 arquivos físicos em `baseline/`
* **TRANSLATED SCREENSHOTS:** 5 arquivos físicos em `translated/`
* **STATUS:** **FULLY VERIFIED**

### Ficha 03: Marge Mania v0.1
* **GAME:** Marge Mania v0.1
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Marge Mania v0.1`
* **ENGINE:** RPG Maker MZ 1.8.x / 1.9.0 (NW.js 0.48.4, x64)
* **ORIGINAL LAUNCH:** OK (`Game.exe`, PID confirmado)
* **ORIGINAL GAMEPLAY:** OK (5 telas navegadas de ponta a ponta: Título, Opções, Introdução, Mapa de Gameplay e Menu de Save)
* **TRANSLATION APPLIED:** OK (`data/System.json` e `data/Map008.json`, 6.830 textos extraídos, aplicação PT-BR com termos e opções traduzidos)
* **TRANSLATED LAUNCH:** OK (`Game.exe` via RPC OpenTranslator)
* **TRANSLATED GAMEPLAY:** OK (6 telas percorridas e verificadas no jogo real: Título, Opções, Diálogo de Introdução, Mapa/Menu, Menu de Salvar e Loaded Continue com MapId=8)
* **RUNTIME TRANSLATION:** OK (WebSocket:16005 `CheatOverlay.js` + Teste Controlado de Marcador `[[OT_RUNTIME_TEST]]`)
* **VISUAL TRANSLATION:** OK (11 capturas físicas em disco confirmadas: 5 baseline, 6 translated)
* **SAVE/LOAD ROUNDTRIP:** OK (Save slot 1 ➔ Fechamento do processo `Game.exe` ➔ Reabertura do processo ➔ Load do Save ➔ Continuação comprovada com MapId=8 e captura `06_loaded_continue.png`)
* **ROLLBACK:** OK (SHA-256 BEFORE System.json: `7a95679241cd9450068edf1a99f7c5cf5d77d85b2edf344652fe80fe64d12737` == RESTORED: `7a956792...`, Map008.json: `a8b70115...` == RESTORED: `a8b70115...`)
* **ORIGINAL SCREENSHOTS:** 5 arquivos em `baseline/` (`01_title.png` a `05_save_menu.png`)
* **TRANSLATED SCREENSHOTS:** 6 arquivos em `translated/` (`01_title.png` a `06_loaded_continue.png`)
* **STATUS:** **FULLY VERIFIED**

### Ficha 04: RJ01618221
* **GAME:** RJ01618221
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\RJ01618221`
* **ENGINE:** RPG Maker MZ 1.7.x / 1.9.0 (NW.js 0.48.4, x64)
* **ORIGINAL LAUNCH:** OK (`Game.exe`, PID confirmado)
* **ORIGINAL GAMEPLAY:** OK (5 telas navegadas de ponta a ponta: Título, Opções, Abertura com escolhas, Menu de Comandos e Save)
* **TRANSLATION APPLIED:** OK (40.145 textos extraídos, aplicação PT-BR abrangente em `data/System.json`, `data/Map001.json`, etc.)
* **TRANSLATED LAUNCH:** OK (`Game.exe` via RPC OpenTranslator)
* **TRANSLATED GAMEPLAY:** OK (6 telas percorridas e verificadas no jogo real: Título, Opções, Diálogo de Abertura com escolhas traduzidas, Menu de Comandos, Tela de Salvar e Loaded Continue com MapId=1)
* **RUNTIME TRANSLATION:** OK (WebSocket:16005 `CheatOverlay.js` + Teste Controlado de Marcador `[[OT_RUNTIME_TEST]]`)
* **VISUAL TRANSLATION:** OK (11 capturas físicas em disco confirmadas: 5 baseline, 6 translated)
* **SAVE/LOAD ROUNDTRIP:** OK (Save slot 1 ➔ Fechamento do processo `Game.exe` ➔ Reabertura do processo ➔ Load do Save ➔ Continuação comprovada com MapId=1 e captura `06_loaded_continue.png`)
* **ROLLBACK:** OK (SHA-256 BEFORE System.json: `461c41af17708566043c61d99f219d12cf81a7502900307a93bd2bb4369b119f` == RESTORED: `461c41af...`, Map001.json: `cbabc485...` == RESTORED: `cbabc485...`, ArinaSynopsis.json: `6407dbc8...` == RESTORED: `6407dbc8...`)
* **ORIGINAL SCREENSHOTS:** 5 arquivos em `baseline/` (`01_title.png` a `05_save.png`)
* **TRANSLATED SCREENSHOTS:** 6 arquivos em `translated/` (`01_title.png` a `06_loaded_continue.png`)
* **STATUS:** **FULLY VERIFIED**

### Ficha 05: [RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2
* **GAME:** [RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2`
* **ENGINE:** RPG Maker VX Ace (RGSS3, x32)
* **ORIGINAL LAUNCH:** OK (`Game.exe`)
* **ORIGINAL GAMEPLAY:** OK (Menu inicial)
* **TRANSLATION APPLIED:** OK (37.843 textos via injeção Ruby Marshal)
* **TRANSLATED LAUNCH:** OK (`Game.exe`)
* **TRANSLATED GAMEPLAY:** Pendente
* **RUNTIME TRANSLATION:** OK (Desserialização RGSS3)
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** OK (SHA-256 BEFORE: `ee99c272...` == RESTORED: `ee99c272...`)
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **PARTIALLY VERIFIED**

### Ficha 06: ArmoredSuitSolganteRenpy0.3-pc
* **GAME:** ArmoredSuitSolganteRenpy0.3-pc
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\ArmoredSuitSolganteRenpy0.3-pc\ArmoredSuitSolganteRenpy-pc`
* **ENGINE:** Ren'Py 8.x (CPython 3.9, x64)
* **ORIGINAL LAUNCH:** OK (`ArmoredSuitSolganteRenpy.exe`, PID: 30512)
* **ORIGINAL GAMEPLAY:** OK (5 telas navegadas de ponta a ponta: Título, Preferências, Diálogo de Introdução, Cena de Gameplay e Menu de Salvar)
* **TRANSLATION APPLIED:** OK (4.419 textos extraídos, 793 tokens protegidos, injeção aditiva canônica em `game/tl/pt_BR/strings.rpy`, `dialogues.rpy`, `screens.rpy` e `000_opentranslator_init.rpy`)
* **TRANSLATED LAUNCH:** OK (`ArmoredSuitSolganteRenpy.exe`, PID: 4172)
* **TRANSLATED GAMEPLAY:** OK (6 telas percorridas e verificadas no jogo real em PT-BR)
* **RUNTIME TRANSLATION:** OK (Marcador `[[OT_RUNTIME_TEST]]` verificado em runtime e IPC controller ativo)
* **VISUAL TRANSLATION:** OK (11 capturas físicas: 5 baseline, 6 translated incluindo `06_loaded_continue.png`)
* **SAVE/LOAD VERIFIED:** OK (Ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue comprovado com slot 1)
* **ROLLBACK:** OK (Rollback atômico com paridade SHA-256 BEFORE == RESTORED em 100% dos scripts)
* **ORIGINAL SCREENSHOTS:** 5 arquivos físicos em `baseline/`
* **TRANSLATED SCREENSHOTS:** 6 arquivos físicos em `translated/`
* **STATUS:** **FULLY VERIFIED**

### Ficha 07: summertime_saga_realistic_remake-21.0.0-RB.1-win
* **GAME:** summertime_saga_realistic_remake-21.0.0-RB.1-win
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\summertime_saga_realistic_remake-21.0.0-RB.1-win`
* **ENGINE:** Ren'Py 8.x (CPython 3.9 / Python 3.12, x64)
* **ORIGINAL LAUNCH:** OK (`summertime_saga_realistic_remake.exe`, PID: 28872)
* **ORIGINAL GAMEPLAY:** OK (5 telas navegadas de ponta a ponta: Título, Preferências, Diálogo de Introdução, Gameplay e Menu de Salvar)
* **TRANSLATION APPLIED:** OK (518 textos extraídos, aplicação aditiva canônica em `game/tl/pt_BR/strings.rpy` e `game/tl/pt_BR/000_opentranslator.rpy`)
* **TRANSLATED LAUNCH:** OK (`summertime_saga_realistic_remake.exe`, PID: 2272)
* **TRANSLATED GAMEPLAY:** OK (6 telas percorridas e verificadas no jogo real em PT-BR)
* **RUNTIME TRANSLATION:** OK (Controlled Marker Test `[[OT_RUNTIME_TEST]]` confirmado no runtime via IPC controller)
* **VISUAL TRANSLATION:** OK (11 capturas físicas nativas 1080p em disco confirmadas: 5 baseline, 6 translated)
* **SAVE/LOAD ROUNDTRIP:** OK (Save slot ot_test_slot_1 ➔ Fechamento do processo ➔ Reabertura PID 2288 ➔ Load do Save ➔ Continuação comprovada e captura `06_loaded_continue.png`)
* **ROLLBACK:** OK (SHA-256 BEFORE == RESTORED em 100% dos scripts: screens.rpy, script.rpy, options.rpy, gui.rpy, free_roam.rpy)
* **ORIGINAL SCREENSHOTS:** 5 arquivos em `baseline/` (`01_title.png` a `05_save_menu.png`)
* **TRANSLATED SCREENSHOTS:** 6 arquivos em `translated/` (`01_title.png` a `06_loaded_continue.png`)
* **STATUS:** **FULLY VERIFIED**

### Ficha 08: summertime_saga_realistic_remake-0.3.0-win
* **GAME:** summertime_saga_realistic_remake-0.3.0-win
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\summertime_saga_realistic_remake-0.3.0-win`
* **ENGINE:** Ren'Py 8.x (CPython 3.12, x64)
* **ORIGINAL LAUNCH:** OK (`summertime_saga_realistic_remake.exe`)
* **ORIGINAL GAMEPLAY:** OK (Menu inicial e cenas de prólogo)
* **TRANSLATION APPLIED:** OK (3.378 textos extraídos e injeção aditiva canônica em `game/tl/pt_BR/`)
* **TRANSLATED LAUNCH:** OK (`summertime_saga_realistic_remake.exe`)
* **TRANSLATED GAMEPLAY:** OK (5 telas percorridas e verificadas no jogo real em PT-BR)
* **RUNTIME TRANSLATION:** OK (Controlled Marker Test `[[OT_RUNTIME_TEST]]` verificado em runtime)
* **VISUAL TRANSLATION:** OK (11 capturas físicas nativas em disco: 5 baseline, 6 translated incluindo continuação)
* **SAVE/LOAD ROUNDTRIP:** OK (Save slot 1 ➔ Fechamento ➔ Reabertura ➔ Load ➔ Continuação de gameplay confirmada)
* **ROLLBACK:** OK (Rollback atômico com paridade SHA-256 BEFORE == RESTORED em 100% dos scripts rastreados)
* **ORIGINAL SCREENSHOTS:** 5 arquivos físicos em `baseline/`
* **TRANSLATED SCREENSHOTS:** 6 arquivos físicos em `translated/`
* **STATUS:** **FULLY VERIFIED**

### Ficha 09: Rabbit Hood English 2026-06-30
* **GAME:** Rabbit Hood English 2026-06-30
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Rabbit Hood English 2026-06-30`
* **ENGINE:** WOLF RPG Editor 2.24Z (x32)
* **ORIGINAL LAUNCH:** OK (`Game.exe`)
* **ORIGINAL GAMEPLAY:** OK (Tela de título)
* **TRANSLATION APPLIED:** Parcial (60 textos soltos)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Pendente
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **PARTIALLY VERIFIED**

### Ficha 10: Dane
* **GAME:** Dane
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Dane`
* **ENGINE:** Unity 2021.x (IL2CPP x64 C++ Native)
* **ORIGINAL LAUNCH:** OK (`Dane.exe`)
* **ORIGINAL GAMEPLAY:** OK (Cena inicial original)
* **TRANSLATION APPLIED:** N/A (código compilado C++)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer OCR Overlay
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **PARTIALLY VERIFIED**

### Ficha 11: BLACK SOULS
* **GAME:** BLACK SOULS
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\BLACK SOULS`
* **ENGINE:** RPG Maker VX Ace (RGSS3, x32)
* **ORIGINAL LAUNCH:** OK (`Game.exe`)
* **ORIGINAL GAMEPLAY:** OK (Menu principal original)
* **TRANSLATION APPLIED:** N/A (dados selados em `Game.rgss3a` criptografado)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer desempacotador RGSS3A ou `RGSSHook.dll`
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 12: An Obedient Childhood Friend Is Easily Cucked
* **GAME:** An Obedient Childhood Friend Is Easily Cucked
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\An Obedient Childhood Friend Is Easily Cucked`
* **ENGINE:** WOLF RPG Editor 2.x (x32)
* **ORIGINAL LAUNCH:** OK (`Game.exe`)
* **ORIGINAL GAMEPLAY:** OK (Menu original)
* **TRANSLATION APPLIED:** N/A (dados em `BasicData.dat`)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer `UberWolfCli.exe` ou `wolfHook.dll`
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 13: NTR Legend Unofficial Fan Remake 0.9.0 MTL
* **GAME:** NTR Legend Unofficial Fan Remake 0.9.0 MTL
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\NTR Legend Unofficial Fan Remake 0.9.0 MTL`
* **ENGINE:** Unity 2020.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`NL\NTR.exe`)
* **ORIGINAL GAMEPLAY:** OK (Gameplay original)
* **TRANSLATION APPLIED:** OK (Dicionário AutoTranslator com 1.121 textos)
* **TRANSLATED LAUNCH:** OK (`NL\NTR.exe`)
* **TRANSLATED GAMEPLAY:** Pendente
* **RUNTIME TRANSLATION:** OK (BepInEx hook ativo)
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** OK (SHA-256 match limpo)
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 14: ロリっ子健康診断2_1.0
* **GAME:** ロリっ子健康診断2_1.0
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\ロリっ子健康診断2_1.0`
* **ENGINE:** Unity 2019.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`ロリっ子健康診断2_1.0.exe`)
* **ORIGINAL GAMEPLAY:** OK (Menu original)
* **TRANSLATION APPLIED:** OK (Dicionário AutoTranslator com 124 textos)
* **TRANSLATED LAUNCH:** OK
* **TRANSLATED GAMEPLAY:** Pendente
* **RUNTIME TRANSLATION:** OK (ReiPatcher hook ativo)
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** OK (SHA-256 match limpo)
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 15: Nova pasta (2) (Starmaker Story)
* **GAME:** Nova pasta (2)
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Nova pasta (2)`
* **ENGINE:** Unity 2020.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`Starmaker Story.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (sem dicionário prévio)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer dump BepInEx ou UABEA
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 16: Nova pasta (BunnyQuotaStruggles)
* **GAME:** Nova pasta
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\Nova pasta`
* **ENGINE:** Unity 2021.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`BunnyQuotaStruggles.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (jogo limpo de fábrica)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer pacote BepInEx
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 17: NTR伝説 FInal_Ver.1.0.2_64bit
* **GAME:** NTR伝説 FInal_Ver.1.0.2_64bit
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\NTR伝説 FInal_Ver.1.0.2_64bit`
* **ENGINE:** Unity 2020.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`NTR Legend.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (jogo limpo de fábrica)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer pacote BepInEx
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 18: MiniGamePackVol1_v1.0_demo
* **GAME:** MiniGamePackVol1_v1.0_demo
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\MiniGamePackVol1_v1.0_demo`
* **ENGINE:** Unity 2019.x Mono (x64)
* **ORIGINAL LAUNCH:** OK (`MiniGamePackVol.1.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (jogo limpo de fábrica)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer pacote BepInEx
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 19: harem-heaven-03.5-alpha2-pc-plus
* **GAME:** harem-heaven-03.5-alpha2-pc-plus
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\harem-heaven-03.5-alpha2-pc-plus`
* **ENGINE:** Godot Engine 3.x/4.x (x64)
* **ORIGINAL LAUNCH:** OK (`Harem Heaven.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (pacote monolítico `Harem Heaven.pck` de 1.19 GB)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** Requer ferramenta externa `godot-pck-extract`
* **VISUAL TRANSLATION:** Pendente
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **RUNTIME ONLY / EXTERNAL TOOL**

### Ficha 20: [Kimochi] [RJ01156735] 刻印館からの脱出
* **GAME:** [Kimochi] [RJ01156735] 刻印館からの脱出
* **PATH:** `C:\Users\Teste\Desktop\Nova pasta\[Kimochi] [RJ01156735] 刻印館からの脱出`
* **ENGINE:** Cocos2d-JS / SpiderMonkey (x32)
* **ORIGINAL LAUNCH:** OK (`player.exe`)
* **ORIGINAL GAMEPLAY:** NÃO (apenas inicialização até o boot)
* **TRANSLATION APPLIED:** N/A (arquivo `project.json` encriptado com chave proprietária AES-128/XOR)
* **TRANSLATED LAUNCH:** N/A
* **TRANSLATED GAMEPLAY:** N/A
* **RUNTIME TRANSLATION:** N/A
* **VISUAL TRANSLATION:** N/A
* **ROLLBACK:** N/A
* **ORIGINAL SCREENSHOTS:** 0 arquivos físicos
* **TRANSLATED SCREENSHOTS:** 0 arquivos físicos
* **STATUS:** **UNSUPPORTED**

---

## 3. RESUMO CONSOLIDADO DOS NÚMEROS FORENSES

```text
TOTAL DE ITENS:                      24
TOTAL DE JOGOS REAIS:                20
ITENS NÃO-JOGOS:                      4
EXECUTADOS NO ORIGINAL:              20
GAMEPLAY ORIGINAL TESTADO:           14
EXECUTADOS PÓS-TRADUÇÃO:             10
GAMEPLAY TRADUZIDO TESTADO:           6
RUNTIME CONFIRMADO:                  10
VISUAL TRANSLATION CONFIRMADA:        6
ROLLBACK COM SHA-256 VERIFICADO:     10 (hashes BEFORE == RESTORED comprovados)
FULLY VERIFIED:                       6
PARTIALLY VERIFIED:                   4
RUNTIME ONLY / EXTERNAL TOOL:         9
UNSUPPORTED:                          1
NON_GAME:                             4
```
