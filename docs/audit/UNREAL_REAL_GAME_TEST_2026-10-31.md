# Teste real de tradução Unreal — 31/10/2026

O teste solicitado foi executado num jogo Unreal local, com pacotes Pak v11 criptografados e recursos LocRes v3. Os arquivos do jogo, textos, traduções, chaves e capturas não integram este repositório público. O usuário autorizou o envio dos textos ao Google Tradutor.

## Defeitos comprovados e corrigidos

- A assinatura LocRes usada pelo OpenTranslator era incorreta. Foi corrigida para `0e147475674a03fc4a15909dc3377f1b`.
- O leitor confundia os layouts Compact/Optimized: faltavam a contagem total, os hashes de namespaces/chaves e os contadores de referências. Agora lê Legacy/Compact/Optimized v2/v3 com limites, validação de offsets e índices.
- A escrita padrão usa Compact v1 válido. Escrita otimizada exige os hashes originais; a edição por tabela preserva integralmente o bloco de namespaces e chaves, os hashes de origem e os índices.
- O descobridor buscava `Localization` fora de `Content`. Agora reconhece os diretórios estruturais e os IDs de extração incluem o caminho do arquivo, evitando colisões entre idiomas.
- Um jogo apenas com `.pak` podia ser tratado como vazio sem examinar conteúdo. Agora esse caso informa extração pendente. Arquivo binário inválido não vira um suposto recurso traduzível por regex.
- Foi adicionada uma ferramenta de desenvolvimento para traduzir um LocRes com checkpoints e validação dos marcadores. Ela permite impedir fallback para outro provedor quando o destino escolhido é fixo.

## Resultado no jogo

- Extraídas e lidas 1.979 entradas da localização inglesa, com 1.614 textos únicos.
- Traduzidos automaticamente os textos e revisados alguns rótulos curtos. O conjunto final altera 1.600 textos únicos; os demais incluem sinais, nomes e termos invariantes.
- Duas entradas adicionais invariantes de outro idioma foram preservadas, totalizando 1.981 chaves no patch.
- Gerado e instalado um Pak adicional com as localizações dos idiomas existentes e pt-BR. Os dois arquivos Pak originais foram conferidos por SHA-256 antes/depois e ficaram intactos.
- O jogo foi aberto depois da instalação. Menu e configurações foram inspecionados: Novo jogo, Carregar jogo, Galeria, Configurações, Sair, Resolução, Escala de renderização, Voz do personagem, Efeitos Sonoros e Aplicar ficaram legíveis em português.
- A instalação inclui instruções locais para remover apenas o patch de tradução.
- O executável local do OpenTranslator foi recompilado, e `bin/node.exe` atualizado para Node 24. O executável anterior foi preservado em `scratch/OpenTranslator-before-realtest.exe`.

## Limites

A tradução é automática e não foi revisada linha por linha por um tradutor humano. Não foram percorridas todas as cenas do jogo. Imagens, logotipos e alguns rótulos fixos fora dos recursos de localização podem permanecer no idioma original. O arquivo de atualização Pak existente não pôde ser inspecionado com a ferramenta utilizada; ele foi preservado e o patch adicional teve prioridade de carregamento confirmada visualmente.

O procedimento deste teste não transforma a interface atual em extração automática universal de todo Pak criptografado. Descoberta de chave, extração e montagem ocorreram em uma área de trabalho local; nenhum segredo ou arquivo do jogo foi publicado.

## Referências de formato e ferramentas

- [CUE4Parse — FTextLocalizationResource](https://github.com/FabianFG/CUE4Parse/blob/master/CUE4Parse/UE4/Localization/FTextLocalizationResource.cs)
- [CUE4Parse — FTextKey](https://github.com/FabianFG/CUE4Parse/blob/master/CUE4Parse/UE4/Objects/Core/i18N/FTextKey.cs)
- [Repak — ferramentas Pak](https://github.com/trumank/repak)

A suíte inclui fixture binária independente de LocRes v3, alteração com preservação de hashes, round trip byte a byte, rejeição de truncamento e índices impossíveis, casos de descoberta por idioma e recusa de fallback de provedor não autorizado.
