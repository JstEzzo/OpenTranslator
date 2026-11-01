# Revisão por engine, cheats, MTool e interface

Data: 1 de novembro de 2026.

## O que foi realmente revisado

Revisão dirigida dos pontos de entrada de extração/aplicação dos adapters, seleção de componentes, transporte de cheats, overlay RPG Maker, abertura da interface e telas de preferências/compatibilidade. Não se afirma auditoria semântica integral de todo o produto, execução de todos os jogos ou pesquisa de todos os fóruns existentes.

Pesquisa em documentação dos fabricantes, repositórios oficiais de ferramentas e relatos nos respectivos fóruns/issue trackers. Um relato externo indica uma classe de problema: não comprova que todos os jogos apresentam o defeito nem que uma correção genérica resolve todos eles. As fontes estão associadas aos perfis abaixo e no catálogo usado pela interface.

## Correções executadas

- Launcher: quando Chromium entrega a abertura a um processo existente, seu encerramento não dispara mais uma segunda guia no navegador padrão. Repetir a chamada automática não reabre a interface. Não apaga mais lockfile de um perfil que pode estar ativo. Após abrir a interface, o painel recolhe para a bandeja e acompanha o encerramento do backend.
- Renderização: modo `--safe`/`--software-rendering` passa `--disable-gpu` à interface. Inspirado no script de recuperação gráfica observado no MTool; implementação própria.
- Electron: corrigidos escopos de sourceDir/relatório, preservados contextos repetidos e chaves JSON contendo pontos. Extração/aplicação testadas tanto em diretório aberto quanto em ASAR básico.
- ASAR: corrigido início dos dados após o preenchimento do cabeçalho Pickle. Valida tamanhos, arquivos truncados, caminhos e limites; fecha arquivos em falhas. Reempacotamento recusa variantes com links, arquivos externos ou metadados de integridade que não consegue preservar. Essas variantes continuam pendentes.
- Defold/Cocos Creator: identificadores incluem caminho relativo para evitar colisão entre arquivos homônimos.
- Unity: falha na ponte de assets deixa de virar extração bem-sucedida com zero textos se o fallback gerenciado também não produzir conteúdo.
- Cheats: alias `command` convertido para `code` antes do transporte; limite de fila também aplicado quando o socket falha no envio. Overlay informa se o jogo está pronto e o estado real de HP/MP infinito; uma tela de título sem objetos de gameplay não habilita o painel. Controles exclusivos de RPG Maker não aparecem no painel RenPy.
- Biblioteca: falha no detector retorna desconhecido, em vez de inventar RPG Maker MZ. Os selos informam suporte parcial/integração pendente; Unity não é mais rotulado sem handler apesar do adapter existente.
- Compatibilidade: 22 perfis pesquisáveis com versão/escopo, cheats, problemas conhecidos, pendências e fontes. Removidos números históricos de benchmark fixos e marcações globais PASS que não representavam testes de cada versão.
- Preferências: texto padrão de 16 px com opções 14/16/18/20, redução de animações, biblioteca por nome/recência, caminhos opcionais e cor de destaque. Opções sem efeito de wallpaper/transparência retiradas da tela. Ferramentas e diagnósticos agrupados.
- Recursos JS/CSS da interface não ficam em cache após a atualização. Identificadores de versão vencem o cache antigo de cinco minutos.

## Cheats: evidência e limite

O teste cheatRoundTrip usa o servidor HTTP real em porta local efêmera e executa o arquivo CheatOverlayTemplate.js em um ambiente RPG Maker simulado. Enfileira comando, consulta a fila pelo overlay, executa alterações de dinheiro/variável, aplica HP/MP e lê o estado de volta. Também testa limite de fila com socket em falha.

Isso comprova a integração do código com a forma simulada das APIs RPG Maker. Não certifica cheats dentro de jogos comerciais, plugins, versões antigas de NW.js ou outras engines. Não foram modificados saves pessoais. Outros adapters têm níveis diferentes de suporte a variáveis: o painel não é um Cheat Engine universal.

## MTool desta instalação

Foi analisada a cópia em Desktop/Arquivos Switch/MTool, diferente da cópia apontada na etapa anterior. O inventário complementar registra 44 arquivos de programa selecionados em loaders/www, tamanhos e hashes. Não inclui saves, biblioteca pessoal ou dados de conta. O package.json e os scripts .bat foram lidos; não foi executado MTool ou seu atualizador.

Observados: shell NW.js, bibliotecas de jogos e backups separados, mapeador de controle, componentes x86/x64, ferramentas de fontes, seleção de locale, loaders especializados e modo de recuperação gráfica. O núcleo de funcionalidade está em loader.bin compilado; não é fonte disponível para revisão linha por linha. Os arquivos de programa não autorizam copiar componentes para outro produto.

O material público do MTool apresenta importação/exportação de tradução, restauração do original, edição do resultado, ajuste de fontes e correções de ambiente. Essas são referências de produto, não comprovação de execução nesta instalação.

### Diferenças que permanecem

| Função | OpenTranslator nesta entrega | Próximo trabalho necessário |
| --- | --- | --- |
| Recuperação gráfica | Launcher com renderização sem GPU | Testar em máquinas com os defeitos gráficos relatados |
| Preferências de leitura | Fonte da interface e movimento reduzido | Controle de fontes do jogo por engine, não um ajuste universal |
| Cheats RPG Maker | Transporte/overlay com teste de ida e volta | Jogos reais MV/MZ e plugins; reconhecimento explícito dos recursos de cada jogo |
| Variáveis de outras engines | Pontes específicas, cobertura desigual | Verificação de escrita e leitura por engine e por versão |
| RTP/DLL/locale | Informações de arquitetura e diagnóstico existentes | Verificação específica de dependências e instruções com origem oficial |
| Edição de tradução | Glossário e ferramentas de importação/exportação existentes | Editor de revisão contextual integrado com busca e prévia no jogo |
| Controle/gamepad | Não equivale ao mapeador observado no MTool | Perfis próprios e testes de entrada/acessibilidade |
| Android/Winlator | Não implementado como distribuição Android | Projeto e validação próprios; o portable atual é Windows x64 |
| Bakin/SMILE/VN Maker/ChoiceScript | Sem adapters dedicados completos | Implementação independente e testes autorizados |

## Prioridades recomendadas

1. Manter fixtures e jogos autorizados por versão/arquitetura; impedir status de conclusão sem carregamento no jogo.
2. Construir um preflight por engine: ferramentas disponíveis, codificação, formato do pacote, fontes e recursos efetivamente editáveis.
3. Resolver integração de runtime/empacotamento antes de ampliar declarações de suporte, especialmente Construct, GameMaker e formatos compilados.
4. Editor contextual de tradução, recuperação de dependências e perfis de fontes/controladores são melhorias de produto mais úteis do que acrescentar botões sem integração.

## Perfis individuais

### Arquivos genéricos

- **Versões/variantes:** Formato do arquivo determina a cobertura.
- **Escopo disponível:** Texto estruturado reconhecido.
- **Cheats:** Não implementado.
- **Problema a considerar:** Não reconhece automaticamente a lógica de motores proprietários.
- **Falta verificar/implementar:** Adicionar parser específico por formato necessário; Comprovar round-trip e excluir código/configuração de máquina.
- **Fonte externa:** sem referência específica suficiente nesta pesquisa; pendência baseada na inspeção local.

### ChoiceScript

- **Versões/variantes:** Não implementado como parser dedicado.
- **Escopo disponível:** Texto de cenas precisa preservar comandos.
- **Cheats:** Não implementado.
- **Problema a considerar:** Comandos e indentação controlam escolhas e fluxo.
- **Falta verificar/implementar:** Parser de cenas que preserve comandos e variáveis; Testar escolhas após tradução.
- **Fontes:** [referência 1](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/).

### Cocos Creator / Cocos2d-x

- **Versões/variantes:** Creator 2/3 e Cocos2d-x separados.
- **Escopo disponível:** Recursos legíveis JSON/JS/Lua.
- **Cheats:** Não implementado.
- **Problema a considerar:** Scripts podem ser compilados ou distribuídos em .jsc.
- **Falta verificar/implementar:** Validar versões e referências de recursos; Não declarar cobertura de scripts cifrados sem extração comprovada.
- **Fontes:** [referência 1](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/native-options).

### Construct

- **Versões/variantes:** 2 e 3; projeto e exportação diferem.
- **Escopo disponível:** Extrai dados legíveis; gera arquivo de tradução adicional.
- **Cheats:** Não implementado.
- **Problema a considerar:** Criar um JSON adicional não garante que o jogo o carregue.
- **Falta verificar/implementar:** Integrar carregamento real do arquivo gerado; Validar exportações e plugin de internacionalização.
- **Fontes:** [referência 1](https://www.construct.net/en/make-games/manuals/construct-3/plugin-reference/internationalization).

### Defold

- **Versões/variantes:** Arquivos abertos e exportações compiladas diferem.
- **Escopo disponível:** JSON/Lua de localização acessíveis.
- **Cheats:** Não implementado.
- **Problema a considerar:** Fontes precisam conter os glifos usados; dados compilados exigem tratamento próprio.
- **Falta verificar/implementar:** Cobrir arquivos compilados e coleções; Validar placeholders e fontes no runtime.
- **Fontes:** [referência 1](https://defold.com/examples/gui/localization/), [referência 2](https://forum.defold.com/t/how-does-one-use-non-latin-characters-in-text-solved/70987).

### Electron / HTML5

- **Versões/variantes:** Versão e configuração do aplicativo importam.
- **Escopo disponível:** Arquivos acessíveis e ponte de runtime.
- **Cheats:** Depende da ponte do jogo; sem editor universal.
- **Problema a considerar:** Context isolation e ausência de Node no renderer impedem hooks antigos.
- **Falta verificar/implementar:** Testar ASAR, preload e DOM sem alterar isolamento global; Validar versões atuais além das antigas listadas.
- **Fontes:** [referência 1](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

### GameMaker

- **Versões/variantes:** Studio e versões recentes exigem ferramentas compatíveis.
- **Escopo disponível:** Textos externos; data.win exige integração específica.
- **Cheats:** Sem editor universal implementado.
- **Problema a considerar:** Bytecode e YYC não são formatos intercambiáveis.
- **Falta verificar/implementar:** Integrar e verificar ferramenta para data.win de cada versão; Testar retorno ao formato original e runtime YYC.
- **Fontes:** [referência 1](https://github.com/UnderminersTeam/UndertaleModTool/issues), [referência 2](https://underminersteam.github.io/usage/getting-started/).

### GDevelop

- **Versões/variantes:** Estruturas de projeto/exportação variam.
- **Escopo disponível:** Objetos TextObject em JSON.
- **Cheats:** Não implementado.
- **Problema a considerar:** Textos definidos em eventos/extensões podem ficar fora dos objetos da cena.
- **Falta verificar/implementar:** Cobrir eventos, objetos globais e recursos externos; Testar exportações que não trazem game.json.
- **Fontes:** [referência 1](https://forum.gdevelop.io/t/translate-extension/72249).

### Godot

- **Versões/variantes:** 3 e 4; formatos de importação variam.
- **Escopo disponível:** Ponte de recursos, CSV/PO e pacotes compatíveis.
- **Cheats:** Sem cheats genéricos implementados.
- **Problema a considerar:** Uma tradução precisa ser carregada/registrada; fonte e cultura afetam exibição.
- **Falta verificar/implementar:** Testar PCK normal e recursos importados por versão; Comprovar carregamento de PO/plurais e fallback de fontes.
- **Fontes:** [referência 1](https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html).

### Kirikiri 2 / Z

- **Versões/variantes:** Kirikiri 2, Z e x86/x64 separados.
- **Escopo disponível:** Seleção de hook nativo; parser dedicado incompleto.
- **Cheats:** Depende de hook compatível, não validado nesta revisão.
- **Problema a considerar:** UTF-8/Shift-JIS e variantes do script exigem leitura correta.
- **Falta verificar/implementar:** Parser KAG/TJS e pacotes XP3 por variante; Teste de fontes e variáveis no jogo real.
- **Fontes:** [referência 1](https://wamsoft.github.io/krkrz_dev/en/guide/CommandLine/).

### Pixel Game Maker MV

- **Versões/variantes:** Sem matriz de versões comprovada.
- **Escopo disponível:** Hook específico; integração incompleta.
- **Cheats:** Não comprovado.
- **Problema a considerar:** Não deve usar o pipeline RPG Maker MV só pelo nome MV.
- **Falta verificar/implementar:** Adapter específico para dados e runtime; Validação de versão e arquitetura do componente.
- **Fonte externa:** sem referência específica suficiente nesta pesquisa; pendência baseada na inspeção local.

### Ren’Py

- **Versões/variantes:** 6/7 com Python 2; 8 com Python 3.
- **Escopo disponível:** Scripts e camada de tradução.
- **Cheats:** Variáveis dependem da ponte RenPy; não usa comandos RPG Maker.
- **Problema a considerar:** Atualizações podem mudar identificadores, compilação, GUI e API Python.
- **Falta verificar/implementar:** Validar extração de RPYC/RPA por versão; Testar interpolação, tags, fontes e persistência de variáveis.
- **Fontes:** [referência 1](https://www.renpy.org/doc/html/translation.html), [referência 2](https://www.renpy.org/doc/html/incompatible.html).

### RPG Developer Bakin

- **Versões/variantes:** Não implementado como adapter dedicado.
- **Escopo disponível:** Referência do MTool; sem cobertura própria comprovada.
- **Cheats:** Não implementado.
- **Problema a considerar:** O loader observado em outro produto não pode ser tratado como suporte deste programa.
- **Falta verificar/implementar:** Implementar detecção e formatos com licença/procedência; Testar fontes e recursos por versão.
- **Fontes:** [referência 1](https://mtool.app/).

### RPG Maker MV / MZ

- **Versões/variantes:** MV e MZ; plugins precisam de teste próprio.
- **Escopo disponível:** JSON e overlay JavaScript.
- **Cheats:** Dinheiro, grupo, itens, variáveis e atalhos pelo overlay MV/MZ.
- **Problema a considerar:** Plugins de diálogo, códigos de controle e fontes podem alterar o resultado.
- **Falta verificar/implementar:** Validar a versão do núcleo e a ordem dos plugins; Testar save/load, diálogo e atalhos em cada jogo.
- **Fontes:** [referência 1](https://rpgmakerofficial.com/product/MZ_help-en/01_10_01.html), [referência 2](https://www.caspergaming.com/cgmz/).

### RPG Maker XP / VX / VX Ace

- **Versões/variantes:** RGSS1, RGSS2 e RGSS3.
- **Escopo disponível:** Dados Ruby e arquivos RGSS.
- **Cheats:** Hooks nativos dependem da arquitetura; não equivalem ao overlay MV/MZ.
- **Problema a considerar:** RTP, DLL e encoding devem corresponder ao motor do jogo.
- **Falta verificar/implementar:** Validar Marshal e arquivos por geração; Verificar dependências RTP e fontes sem substituir DLL arbitrariamente.
- **Fontes:** [referência 1](https://rpgmakerofficial.com/support/rtp/).

### SMILE GAME BUILDER

- **Versões/variantes:** Não implementado como adapter dedicado.
- **Escopo disponível:** Sem cobertura própria comprovada.
- **Cheats:** Não implementado.
- **Problema a considerar:** A listagem do MTool não equivale a suporte do OpenTranslator.
- **Falta verificar/implementar:** Implementar detector e parser próprios; Validar recursos, tradução e saves.
- **Fontes:** [referência 1](https://mtool.app/).

### SRPG Studio

- **Versões/variantes:** Sem matriz de versões comprovada.
- **Escopo disponível:** Hook nativo específico; sem pipeline dedicado completo.
- **Cheats:** Não comprovado.
- **Problema a considerar:** Detectar o motor não comprova tradução nem edição de atributos.
- **Falta verificar/implementar:** Adapter específico e fixtures autorizadas; Validar fontes, save/load e hooks por arquitetura.
- **Fonte externa:** sem referência específica suficiente nesta pesquisa; pendência baseada na inspeção local.

### TyranoBuilder / TyranoScript

- **Versões/variantes:** Versão e exportação precisam ser identificadas.
- **Escopo disponível:** Detecção disponível; fluxo dedicado ainda incompleto.
- **Cheats:** Não comprovado.
- **Problema a considerar:** Tags de cenário e fontes não devem ser tratadas como texto simples.
- **Falta verificar/implementar:** Parser de cenário que preserve tags; Teste de exportação e exibição multilíngue.
- **Fontes:** [referência 1](https://tyranobuilder.com/faq/).

### Unity

- **Versões/variantes:** Mono e IL2CPP são perfis diferentes.
- **Escopo disponível:** Recursos e integração XUnity dependente do loader.
- **Cheats:** Sem editor universal de atributos comprovado.
- **Problema a considerar:** IL2CPP, TMP e fontes exigem combinação compatível de loader e plugin.
- **Falta verificar/implementar:** Verificar BepInEx/IL2CPP e arquitetura antes de instalar; Testar TMP, rich text e textos criados após carregar cenas.
- **Fontes:** [referência 1](https://github.com/bbepis/XUnity.AutoTranslator/blob/master/README.md), [referência 2](https://github.com/bbepis/XUnity.AutoTranslator/issues/856).

### Unreal Engine

- **Versões/variantes:** LocRes 0–3; Pak/IoStore tratados separadamente.
- **Escopo disponível:** LocRes com preservação de hashes; pacote depende de ferramenta.
- **Cheats:** Sem cheats universais de gameplay.
- **Problema a considerar:** Idioma carregado, hashes e prioridade dos pacotes influenciam a tradução.
- **Falta verificar/implementar:** Testar IoStore e novas versões de pacotes; Validar fontes, textos em imagens e strings fora do LocRes.
- **Fontes:** [referência 1](https://dev.epicgames.com/documentation/en-us/unreal-engine/localization-overview?application_version=4.27).

### Visual Novel Maker

- **Versões/variantes:** Não implementado como adapter dedicado.
- **Escopo disponível:** Sem cobertura própria comprovada.
- **Cheats:** Não implementado.
- **Problema a considerar:** Ausência de integração própria; não confundir com RenPy ou Tyrano.
- **Falta verificar/implementar:** Mapear formato e versões; Criar fixtures de extração/aplicação e teste em runtime.
- **Fontes:** [referência 1](https://mtool.app/).

### Wolf RPG Editor

- **Versões/variantes:** 1, 2 e 3 exigem perfis separados.
- **Escopo disponível:** Ponte Python e ferramentas de arquivo.
- **Cheats:** Hook automático suspenso sem assinatura confiável de versão.
- **Problema a considerar:** Codificação antiga e formatos de arquivo diferentes podem causar texto corrompido.
- **Falta verificar/implementar:** Detectar versão/encoding do arquivo real; Testar reempacotamento e fontes sem trocar DLL por tamanho do EXE.
- **Fontes:** [referência 1](https://dreamsavior.net/translator-ver-5-10-31-automatic-character-encoding-for-wolf-rpg-engine/).


## Validação final

- `npm run verify`: **607 testes aprovados, zero falhas, 40 suítes**.
- Testes novos: 11 de adapters/ASAR e 5 de ida e volta de cheats; regressão HTTP verifica ausência de cache em JS/CSS.
- Launcher recompilado e smoke de inicialização com saída **0**.
- Interface conferida em janela padrão e largura de 800 px: busca de compatibilidade, abertura de preferências, salvamento de tamanho 18 px e retorno a 16 px. Nenhum erro de JavaScript capturado nessas verificações.
- A revisão visual não equivale a teste de todos os jogos nem certificação dos cheats em jogos comerciais. A hipótese de handoff do Chromium foi corrigida no fluxo de abertura; o smoke não conta janelas visíveis do navegador.

Verificação complementar da biblioteca: suite uiHealth com 6 casos aprovada, rpcHonesty aprovado e lint aprovado após ajustar o fallback de detecção e os selos de suporte.
