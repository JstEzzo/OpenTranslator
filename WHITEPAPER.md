# OpenTranslator — White Paper Completo e Detalhado

## 1. Visão Geral
O **OpenTranslator** é uma ferramenta de tradução e modding offline-first projetada para jogos desenvolvidos em engines baseadas em HTML5/JavaScript (RPG Maker MZ, RPG Maker MV, TyranoScript) e suporte auxiliar para outros motores (como Ren'Py e Unity). Ele se diferencia das soluções de tradução em tempo real por aplicar patches diretamente nos arquivos de dados (`data/*.json`) antes da inicialização, garantindo alta performance nativa e suporte a mods persistentes.

A aplicação adota um modelo cliente-servidor desacoplado, unindo um backend em Node.js com uma interface de usuário premium em NW.js/Chromium.

---

## 2. Arquitetura do Sistema e Fluxos de Comunicação

O ecossistema é composto por três componentes principais cooperativos:

```
                  ┌───────────────────────────────────────────────┐
                  │      LAUNCHAR / CLIENTE NW.JS (Chromium)       │
                  │  Visual Glassmorphism, Tema Accent, i18n       │
                  └──────┬────────────────────────────────┬───────┘
                         │                                │
        JSON-RPC (Post)  │                                │ Incremental Polling
        na Porta 3000    │                                │ para Logs
                         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SERVIDOR BACKEND (server.js)                        │
│  - Pipeline de Tradução (Google/Bing/Multi-Engine)                      │
│  - XOR Decrypter recursivo (Imagens/Áudio)                              │
│  - Auto Word-Wrap inteligente (offline/online)                          │
│  - Font Patcher PT-BR automatizado                                      │
│  - Gerenciamento de Saves, Backups e Auto-Healing                       │
│  - Dual Hook Server (HTTP/WS na porta 16005)                            │
┌──────────────┬──────────────────────────────────────────────────┬───────┘
               │                                                  │
               │ HTTP Get / WS packets                            │ Injeção de Scripts
               │ na Porta 16005                                   │ e Overlays
               ▼                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    JOGO ATIVO (RPG Maker MZ/MV)                         │
│  - UltraTranslateOverlay.js (Overlay de Tradução Runtime)               │
│  - CheatOverlay.js (Overlay de Trapaças e Comunicação Websocket)        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Protocolo JSON-RPC (Porta 3000)
Toda a lógica de disco e processamento é isolada do cliente NW.js por meio de requisições POST para `/api/rpc`. O payload segue uma estrutura simplificada de chamada de procedimento remoto:
* **Requisição**: `{ "method": "nomeDoMetodo", "params": { ... } }`
* **Resposta**: `{ "ok": true, "data": { ... } }` ou `{ "ok": false, "error": "Mensagem de erro" }`

### 2.2 Dual Hook Server (Porta 16005)
O backend mantém um servidor HTTP e WebSocket híbrido rodando na porta `16005`.
* **Tradução em Tempo Real**: O script de overlay injetado no jogo consome dicionários sob demanda via requisições HTTP rápidas ou conexões persistentes WebSocket.
* **Sincronização de Trapaças (Cheats)**: O `CheatOverlay.js` estabelece um canal WebSocket estável que transmite o estado interno do jogo (HP/MP dos heróis, ouro, itens no inventário) a cada 500ms e processa comandos remotos recebidos do cliente (ex: `$gameParty._gold = 9999`).

---

## 3. Análise Detalhada dos Componentes Técnicos

### 3.1 O Algoritmo de Auto Word-Wrap Inteligente
Idiomas derivados do latim (como o Português do Brasil) costumam ter textos 20% a 30% maiores que o original. Para evitar que os diálogos fiquem cortados ou vazem da caixa de mensagem, o OpenTranslator integra a função `autoWrapText`.

#### Mecanismo de Tokenização
A quebra de linha comum baseada em largura de caracteres corrompe comandos de escape do RPG Maker (como `\V[n]` para variáveis, `\C[n]` para cores, `\N[n]` para nomes). O algoritmo resolve isso por meio de um processo de filtragem estruturado:
1. **Isolamento de Tags**: O texto é escaneado usando expressões regulares para separar as tags de escape do texto visível. Cada tag é preservada como um token atômico de comprimento lógico zero.
2. **Medição de Comprimento Virtual**: O comprimento da string é medido ignorando os tokens de controle.
3. **Injeção de quebra (`\n`)**: As quebras de linha são inseridas apenas nos espaços entre palavras textuais comuns, acumulando o comprimento da linha de acordo com o limite configurado (ex: 50 caracteres).
4. **Reconstrução**: A string é remontada e re-injetada nos arquivos JSON sob o código de diálogo `401`.

### 3.2 Descriptografia de Recursos por XOR (XOR Decrypter)
Jogos comerciais de RPG Maker MV/MZ costumam aplicar criptografia proprietária nos arquivos de imagem (`.rpgmvp` ou `.png_`) e áudio (`.rpgmvo`/`.rpgmvm` ou `.ogg_`/`.m4a_`).

O OpenTranslator implementa um sistema recursivo de exportação e decodificação XOR:
1. **Extração de Chave**: Lê o arquivo `data/System.json` do jogo, extrai a chave hexadecimal de 32 caracteres (`encryptionKey`) e a converte em um vetor de 16 bytes.
2. **Remoção de Cabeçalho**: Remove os primeiros 16 bytes del arquivo criptografado, que representam o cabeçalho estático padrão do RPG Maker (`52 50 47 4d 56 00 00 00 00 03 01 00 00 00 00 00`).
3. **Decodificação XOR**: Aplica a operação XOR nos bytes correspondentes ao índice 16 a 31 usando o vetor da chave extraída:
   $$\text{Decrypted}[i] = \text{Encrypted}[16 + i] \oplus \text{Key}[i] \quad (0 \le i < 16)$$
4. **Remontagem**: O restante do arquivo após o byte 32 é copiado na íntegra sem modificações. O resultado final é salvo com a extensão original decodificada (`.png`, `.ogg`, `.m4a`).

### 3.3 Patch de Fontes Automatizado (Acentuação PT-BR)
A ausência de acentos (como `ç`, `á`, `ã`) em jogos orientais se dá pela fonte padrão do jogo não conter glifos latinos. O recurso de patch de fontes corrige isso sem alterar as configurações de compilação da engine:
* **Cópia de Fonte**: Copia o arquivo Unicode robusto `opent_PGMMV_font.ttf` para `fonts/pt-br-font.ttf` dentro do diretório do jogo.
* **Substituição de CSS**: Localiza o arquivo `fonts/gamefont.css`. Faz um backup de segurança (`gamefont.css_bak`) e sobrescreve o estilo original para declarar as fontes nativas do MV (`GameFont`) e MZ (`rmmz-mainfont`) apontando diretamente para o caminho local `pt-br-font.ttf`.

### 3.4 Concorrência Assíncrona e Performance
Para manter a interface gráfica 100% responsiva em projetos contendo mais de 100 arquivos JSON massivos (como `Map001.json` a `Map999.json` e `CommonEvents.json`), o backend implementa controles estritos de fluxo assíncrono:
* **Não-Bloqueio de Event Loop**: Todo o processamento de arquivos é delegado às APIs assíncronas do Node.js (`fs.promises`).
* **Limitador de Requisições Paralelas (`CONCURRENCY_LIMIT = 6`)**: Durante a tradução em lote, requisições simultâneas para servidores externos são enfileiradas e processadas em um pool paralelo de concorrência máxima de 6 tarefas concorrentes. Isso evita erros de soquete no sistema operacional e previne punições por taxa de requisições excedida (rate limit).

### 3.5 Desempacotador do Enigma Virtual Box (EVB Unpacker)
Muitos jogos comerciais de RPG Maker MV/MZ e Wolf RPG vêm consolidados em um único arquivo executável `.exe` por meio do compilador de virtualização Enigma Virtual Box.
O OpenTranslator integra um extrator estruturado para esta tecnologia:
* **Extração Léxica de TOC**: Utiliza um sidecar em Python (`evb_unpack.py` e o módulo `evbunpack`) que lê o executável compilado, analisa a tabela de conteúdo (TOC) interna e recria recursivamente o sistema de arquivos virtualizado em disco.
* **Descompactação Otimizada**: O extrator ignora a reconstrução física do executável original hospedeiro (`--ignore-pe`), focando exclusivamente em recuperar a pasta de dados original do jogo (`www/data/` ou `data/`) de maneira extremamente rápida, permitindo traduzir jogos encapsulados.

### 3.6 Varredura Léxica Avançada e Dissecção de Código JS
O processo de extração de diálogos em jogos complexos frequentemente falha ao ignorar textos de diálogos inseridos no meio de blocos de scripts JavaScript (comandos de evento `355` e `655` do RPG Maker, além de fórmulas de parâmetros de plugins em `plugins.js`).
O OpenTranslator incorpora um algoritmo avançado de dissecção léxica:
* **Identificação de Scripts (`isJsCode`)**: Durante o mapeamento dos arquivos JSON e dos plugins, o motor avalia se uma propriedade textual se comporta como código JavaScript identificando operadores lógicos, comandos de controle (ex: `var`, `const`, `return`) e APIs de jogo (`$game`, `$data`).
* **Varredura de Strings Literais**: Se for reconhecida como código, a string é submetida a uma expressão regular robusta de análise léxica (`/(["'`])((?:\\\1|(?!\1).)*?)\1/g`) que extrai todas as constantes strings do código (strings entre aspas ou crases), isolando o diálogo limpo.
* **Mapeamento e Injeção de Patcher (`patchGameData`)**: Cada texto localizado de forma interna no script ganha um sufixo de rastreamento exclusivo (`__js__${posicao}`). Durante o patch, o novo texto traduzido é recolocado de forma cirúrgica na literal original correspondente do script, aplicando escapes automáticos de aspas para manter a integridade sintática e compilável do JavaScript.

---

## 4. Inicialização Segura, Detecção de Runtime (Zero-Dependency) e Auto-Recuperação

Para garantir uma experiência de uso sem atritos (Zero-Dependency), o OpenTranslator conta com uma rotina inteligente de detecção de runtime e recuperação de dados:

### 4.1 Resolução Dinâmica de Runtime do Node.js (Bootstrap Automático)
O script de entrada `LAUNCH_OpenTranslator.bat` adota um fluxo de detecção em camadas para determinar como o backend será executado:
1. **Mapeamento Global**: O inicializador executa uma busca de ambiente (`where node`). Se um executável global for localizado no PATH do sistema operacional, ele é selecionado para rodar a aplicação.
2. **Mapeamento Local (Portátil)**: Caso o Node.js não esteja instalado globalmente, o script busca por uma versão portátil prévia instalada no diretório do projeto em `Tool\bin\node.exe`.
3. **Provisionamento Sob Demanda**: Se nenhum interpretador Node.js for localizado, o script exibe uma notificação amigável e dispara uma tarefa de download assíncrono e silencioso utilizando o PowerShell (`Invoke-WebRequest`). Ele baixa a versão estável portátil do **Node.js (v24.18.0 x64)** diretamente dos servidores oficiais da Node Foundation (`https://nodejs.org/dist/`) e a extrai na pasta local `Tool\bin\node.exe`.
4. **Execução Invisível (VBScript Wrapper)**: Uma vez determinado o executável do Node, o batch dispara o script `OpenTranslator.vbs` passando o caminho mapeado como parâmetro. O VBScript inicia o servidor `server.js` em segundo plano de forma oculta (`WindowStyle = 0`), garantindo que o console do terminal não apareça para poluir a tela do usuário.

### 4.2 Provisionamento Autônomo e Transparente de Python Portátil
Muitos scripts de modding e sidecars (como os extratores Ren'Py e Enigma Virtual Box) requerem uma instalação do Python para funcionar.
* **Python Local Incorporado**: A aplicação inclui uma distribuição do **Python Portátil (v3.12.7)** localizada em `Tool\resources\renpy\python\python.exe`.
* **Execução Transparente**: O executor de processos (`runPythonScript`) prioriza automaticamente este interpretador portátil local se ele existir. Caso contrário, ele realiza o fallback transparente para `python`, `python3` ou `py` globais da máquina do usuário. Isso blinda o app contra erros de ausência de dependências.

### 4.3 Blindagem de Diretório de Inicialização (CWD)
Para evitar erros clássicos de rotas estáticas 404 ("Not Found") quando o servidor era aberto a partir de atalhos e scripts de diagnóstico com CWD alterado, a aplicação substituiu o uso dinâmico de `process.cwd()` pelo caminho fixo físico absoluto **`__dirname`**. Toda a resolução interna de pastas (`www/`, `gameLib/`, `resources/`) é agora imune à pasta de disparo inicial.

### 4.4 Auto-Recuperação e Integridade de Dados (Self-Healing)
Além da inicialização do ambiente, o backend executa rotinas de segurança lógica:
* **Detecção de Estado Inconsistente**: Ao carregar, o backend varre o diretório do jogo procurando por pastas de backup órfãs (ex: `data_bak_*`).
* **Restauração de Emergência**: Se pastas órfãs forem localizadas mas a ferramenta não estiver com nenhum processo de jogo ativo registrado, ela assume que houve uma falha de encerramento anterior e restaura automaticamente os dados originais a partir da cópia mais antiga.
* **Backup de Plugins**: O arquivo de configuração de plugins (`js/plugins.js`) é incluído em todos os backups para impedir que edições de patch corrompam a cadeia de carregamento de scripts customizados do jogo.

### 4.5 Arquitetura Limpa, Organização de Pastas e Banco de Dados de Tradução
A aplicação segue um padrão estrito de organização de arquivos para evitar poluição visual na pasta raiz de desenvolvimento e manter arquivos com propósitos bem definidos.

#### O Banco de Dados SQLite (`global_cache.db`)
O banco de dados SQLite é o coração do motor de cache do OpenTranslator. Ele centraliza todas as traduções de strings em formato relacional de alto desempenho (com suporte a cache WAL e journalização transacional). O banco impede conexões redundantes com as APIs de tradução, servindo de dicionário dinâmico local. Os arquivos auxiliares `.db-shm` e `.db-wal` são arquivos de transações rápidas em disco criados de forma nativa pela biblioteca `better-sqlite3` para garantir integridade e concorrência multithread das consultas.

#### Árvore de Diretórios Estruturada

> **⚠ ATENÇÃO PARA AGENTES AI:** Esta estrutura é a canônica do projeto. Ao editar qualquer arquivo de lógica, consulte os módulos em `Tool/src/` — o `server.js` raiz é apenas um ponto de entrada que não contém lógica de negócio.

```text
MTool_Clone/ (Pasta Raiz - Apenas atalhos de disparo e documentação)
├── Tool/ (Pasta Core do aplicativo)
│   ├── bin/                   — Executáveis do Node.js portátil
│   ├── data/                  — Subpasta ÚNICA de persistência de dados dinâmicos
│   │   ├── global_cache.db    — Banco de dados relacional de traduções (SQLite)
│   │   ├── openT.json         — Configurações do tradutor
│   │   ├── openT.log          — Registro de logs do console do servidor
│   │   ├── glossary.json      — Dicionário de glossário de termos
│   │   └── server.pid         — Arquivo PID do processo
│   ├── gameLib/               — Biblioteca de atalhos e metadados dos jogos (.gljson)
│   ├── loaders/               — Arquivos DLL e injetores de hook em runtime
│   ├── resources/             — Sidecars portados do RuneTranslate: Python, Unity, EVB
│   ├── src/                   — ⭐ MÓDULOS DE LÓGICA DE NEGÓCIO (Nova estrutura modular)
│   │   ├── logger.js          — Sistema de logs (global.log, buffer circular, arquivo)
│   │   ├── cache.js           — SQLite, loadCfg/saveCfg, glossário, cache global
│   │   ├── extractor.js       — Extração e filtragem de textos dos jogos (RPG Maker, plugins.js)
│   │   ├── translator.js      — Motores de tradução (Google, Bing, LLM, DeepL, Multi-Engine)
│   │   ├── gameEngine.js      — Detecção de engines, backup, patch, pipeline de tradução
│   │   ├── rpcHandlers.js     — Todos os handlers JSON-RPC expostos ao frontend
│   │   ├── httpServer.js      — Servidor HTTP com serving de arquivos estáticos
│   │   └── cheatServer.js     — Servidor WebSocket de cheats e overlay (porta 16005)
│   ├── www/                   — Visual do Frontend: HTML, CSS, app.js
│   ├── server.js              — Ponto de entrada: define globals e carrega os módulos de src/
│   └── OpenTranslator.vbs     — Script VBScript de boot invisível
├── LAUNCH_OpenTranslator.bat  — Script Batch principal de boot
├── TEST_ENVIRONMENT.bat       — Script Batch de diagnóstico de dependências
└── WHITEPAPER.md              — Documentação técnica (este documento)
```

#### Responsabilidades dos Módulos de `src/`

| Módulo | Responsabilidade |
|---|---|
| `logger.js` | Define `global.log()` — deve ser o primeiro a ser carregado |
| `cache.js` | Inicializa SQLite, `loadCfg/saveCfg`, `loadGlossary/saveGlossary`, cache de traduções |
| `extractor.js` | `extractGameTexts()`, `isTranslatableText()`, `extractEscapeCodes()`, `restoreEscapeCodes()` |
| `translator.js` | `translateBatch()`, `translateSingle()`, `translateBingBatch()`, LLM, DeepL, Multi-Engine |
| `gameEngine.js` | `detectEngine()`, `executeTranslationPipeline()`, `patchGameData()`, `backupGameData()`, `healGameData()` |
| `rpcHandlers.js` | Objeto `handlers` com todos os métodos RPC chamados pelo frontend via `/api/rpc` |
| `httpServer.js` | Servidor HTTP, serving de arquivos estáticos, roteamento RPC, `tryListen()` |
| `cheatServer.js` | Hook HTTP+WebSocket na porta 16005, `startHookServer()`, gerenciamento de `pendingCheatCommands` |


### 4.6 Diagnósticos Estendidos de Rede e Portas (TEST_ENVIRONMENT)
Para prevenir falhas comuns de infraestrutura local e conexões de rede que geram erros silenciosos no aplicativo, o utilitário `TEST_ENVIRONMENT.bat` foi expandido para incorporar as seguintes etapas:
* **Validação de Banco e Configuração**: O script agora valida explicitamente a existência e acessibilidade dos arquivos dinâmicos cruciais localizados na nova subpasta `Tool\data\` (incluindo `openT.json` e `global_cache.db`).
* **Varredura de Portas Ocupadas (Port Conflict Detection)**: Analisa o estado de portas de sockets locais por meio do utilitário `netstat` do sistema operacional. Caso a porta `3000` (servidor de controle RPC) ou `16005` (servidor WebSocket de overlays/cheats) esteja ocupada por outros processos ou instâncias fantasmas do Node, o script emite alertas visuais com avisos detalhados.
* **Teste Dinâmico de Conectividade Externa (APIs)**: Utiliza comandos integrados do PowerShell para disparar requisições rápidas de cabeçalho (`Invoke-WebRequest HEAD -TimeoutSec 3`) em paralelo para os servidores do **Google Translate** (`translate.googleapis.com`) e **Bing Translator** (`www.bing.com/translator`). Isso certifica o status de tráfego de rede do usuário e a ausência de bloqueios em regras de firewall local.

---

## 5. Estrutura de Tradução e i18n no Cliente

A interface do usuário é totalmente dinâmica e adaptável:
* **Mapeamento de Idioma no Bootstrap**: A aplicação carrega a configuração `openT.json` de forma assíncrona antes de renderizar o template HTML na DOM principal.
* **Evitando Race Condition na Recarga**: A troca de idioma aguarda explicitamente o término de gravação do JSON-RPC (`await saveCfg()`) antes de recarregar a janela com `location.reload()`.
* **Tradução com Fallback**: O dicionário do app (`LANG`) centraliza todas as chaves e rotulagens em arquivos i18n, garantindo que o chaveamento entre Português e Inglês reflita de forma uniforme em todos os cards, modais e sub-abas.

---

## 6. Guia Detalhado de Funções, Botões e Trapaças (Cheats)

### 6.1 Aba Principal: Jogos (Games)
Esta aba exibe a biblioteca de atalhos e os painéis de gerenciamento dos jogos adicionados.
* **Zona de Arrastar/Importar**: Permite soltar o executável (`Game.exe` ou equivalente de outras engines) ou selecionar a pasta raiz do jogo pelo navegador de arquivos do SO. O sistema detecta o motor automaticamente.
* **Barra de Pesquisa**: Filtra os cards dos jogos por nome, tag ou engine em tempo real.
* **Botão Iniciar (Play)**: Executa o jogo em um processo separado. Em jogos RPG Maker MV/MZ, ele ativa a porta de escuta WebSocket 16005 para habilitar o Painel de Cheats dinâmico.
* **Botão Editar (Edit)**: Abre um modal detalhado para modificar o título original, título traduzido, engine, tags customizadas e notas pessoais do jogo.
* **Botão Excluir (Delete)**: Remove o jogo cadastrado na biblioteca do OpenTranslator. Não apaga nenhum arquivo físico no diretório do jogo.

### 6.2 Ferramentas por Motor (Engine Tools)

#### RPG Maker MV / MZ
* **Traduzir Arquivos (Translate Files 🌐)**: Realiza a tradução de todos os arquivos contidos em `data/*.json` de forma offline-first. Mostra uma barra de progresso real e estilizada. Os textos traduzidos são mesclados de volta preservando a integridade das tags de sistema.
* **Restaurar Original (Restore Original 🔄)**: Copia a pasta de backup original (`data_bak`) de volta para `data`, removendo qualquer tradução ou modificação e restaurando o jogo ao seu estado inicial puro.
* **Extrair Imagens (Extract Images 📷)**: Descriptografa recursivamente arquivos de imagem criptografados `.rpgmvp` ou `.png_` convertendo-os em arquivos de imagem `.png` padrão legíveis por navegadores e visualizadores comuns.
* **Extrair Áudio (Extract Audio 🎵)**: Descriptografa recursivamente arquivos de som criptografados `.rpgmvo` ou `.rpgmvm` convertendo-os em arquivos de áudio padrão `.ogg` ou `.m4a` compatíveis com players convencionais.
* **Corrigir Fontes PT-BR (Patch Fonts 🔤)**: Copia uma fonte ttf Unicode compatível e modifica o estilo do arquivo `gamefont.css` para substituir a fonte do jogo. Remove o bug de glifos ausentes (quadrados/tofus) e corrige a acentuação do português brasileiro.
* **Instalar Overlay RPG Maker**: Injeta os arquivos de gancho (`UltraTranslateOverlay.js`, `CheatOverlay.js`) e registra os scripts de extensão no arquivo `index.html` do jogo.

#### Ren'Py Tools
* **Extrair RPA (Extract RPA)**: Descompacta os arquivos `.rpa` de recursos do jogo (como imagens, áudio e scripts compilados), expondo as pastas originais de desenvolvimento para edição.
* **Empacotar RPA (Pack RPA)**: Re-comprime o diretório editado de volta no formato de arquivo `.rpa` padrão para distribuição do mod.
* **Descompilar .rpyc (Decompile .rpyc)**: Descompila os scripts binários de eventos e diálogos `.rpyc` de volta para arquivos legíveis de código-fonte Python `.rpy`.

#### Unity Tools
* **Instalar XUnity + Plugin**: Prepara o diretório de dados e injeta os frameworks de injeção dinâmica BepInEx/MelonLoader integrados ao plugin XUnity.AutoTranslator, permitindo traduções automáticas baseadas em renderização gráfica por hooks de chamadas Direct3D/OpenGL.

#### Enigma Virtual Box Tools 📦
* **Extrair Executável EVB**: Permite selecionar um jogo compilado em executável único `.exe` empacotado com Enigma Virtual Box e descompactar recursivamente seu sistema de arquivos virtual (pastas `www/data/` ou `data/`) para uma pasta de destino, permitindo traduzir o jogo.

### 6.3 Painel de Cheats (Trapaças)
Este painel torna-se ativo e visível assim que um jogo RPG Maker MZ/MV injetado é iniciado pelo OpenTranslator, estabelecendo conexão com a porta websocket 16005. Ele é dividido em três sub-abas:

#### Sub-aba 1: Geral (General)
* **Modificar Ouro (Gold)**: Exibe a quantidade de dinheiro do grupo no inventário atual e permite definir um novo valor numérico exato por comando RPC.
* **Atravessar Paredes (NoClip)**: Modifica a propriedade do jogador `$gamePlayer._through` para `true`, permitindo que o personagem atravesse qualquer barreira física, colisão de mapa, paredes ou água.
* **Desativar Encontros**: Zera os passos necessários para desencadear encontros com inimigos no mapa, permitindo explorar os cenários sem ser interrompido por batalhas aleatórias.
* **Vida Infinita (Max HP)**: Um hook contínuo no loop do jogo que monitora a vida da equipe ativa e redefine instantaneamente o HP atual de todos os membros para o valor máximo (`mhp`) a cada fração de segundo.
* **Magia Infinita (Max MP)**: Hook de monitoramento que redefine o MP atual de todos os membros do grupo para o valor máximo (`mmp`), permitindo o uso ilimitado de magias e habilidades.
* **Vitória Instantânea**: Envia um sinal para a batalha ativa que zera a vida de todas as entidades hostis (`$gameTroop`) na cena, garantindo o fim imediato do combate com vitória para o grupo.
* **Inimigos com 1 HP**: Modifica o HP atual dos adversários na batalha para 1, facilitando combates difíceis com um único golpe.
* **Console do Desenvolvedor (F12)**: Dispara o console de ferramentas de desenvolvedor (DevTools) do Chromium para inspecionar, depurar e executar scripts em tempo real dentro do contexto ativo do motor do jogo.

#### Sub-aba 2: Membros / HP (Party Status)
* **Cards de Membros do Grupo**: Lista todos os personagens que estão na equipe ativa. Exibe o nome do personagem, nível (`Level`), HP atual/máximo e MP atual/máximo em barras de progresso informativas.
* **Edição HP/MP Individual**: Cada card possui caixas de entrada numérica e botões **Definir (Set)** para modificar o HP e o MP de um herói específico de forma isolada, sem alterar o resto da equipe.

#### Sub-aba 3: Inventário (Inventory)
* **Adicionar Item / Arma / Armadura**: Um seletor pesquisável dinâmico que lê o banco de dados interno do RPG Maker do jogo (`$dataItems`, `$dataWeapons`, `$dataArmors`). Permite escolher qualquer item cadastrado no banco de dados e adicioná-lo ao inventário do grupo na quantidade selecionada de forma imediata.
* **Filtro de Inventário**: Uma barra de pesquisa que localiza itens transportados no momento pelo grupo.
* **Gerenciador de Quantidade**: Lista todos os pertences no inventário, permitindo aumentar (`+1`), diminuir (`-1`) ou remover completamente (`X`) os itens do inventário de forma individual.

### 6.4 Aba: Configuração (Config)
Controles globais de aparência e motores de processamento da aplicação.
* **Engine (Motor de Tradução)**: Seletor de motor de processamento (Google Translate nativo, Bing Translator ou Multi-Engine sequencial).
* **Idioma Origem/Destino**: Define os códigos ISO dos idiomas de partida e chegada para o processo de tradução.
* **Idioma do App (App Language)**: Altera a localização das strings de interface da ferramenta inteira entre Inglês e Português do Brasil de forma imediata.
* **Cor de Destaque (Accent Color)**: Um seletor de cores hexadecimal que redefine a paleta cromática principal do visual da aplicação.
* **Efeito Vidro / Imagem de Fundo**: Permite colar o endereço de uma imagem de plano de fundo personalizada e regular a opacidade das placas visuais, ativando um estilo premium de Glassmorphism.
* **Limite da Quebra de Linha (Word Wrap Limit)**: Define o limite de caracteres que a ferramenta respeita para auto-inserir as quebras de linha nos arquivos de texto.
* **Apagar Histórico**: Limpa o banco de dados interno e o histórico de traduções salvas no cache global da ferramenta, forçando novas consultas às APIs durante a tradução.
