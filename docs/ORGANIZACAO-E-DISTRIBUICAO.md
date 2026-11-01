# Organização e distribuição — 1 de novembro de 2026

## Resultado

Foram classificados 5743 arquivos da fotografia inicial, excluindo os objetos internos do Git. Cada linha da classificação local registra função conhecida/inferida, tamanho, decisão de limpeza e motivo de inclusão/exclusão do portable. A classificação distingue código útil, desenvolvimento, dados pessoais, componente opcional e material histórico; ausência de import estático não foi usada como prova de inutilidade.

- 1497 arquivos retirados da árvore ativa, contando também resíduos gerados durante a validação.
- 128.20 MiB retirados, preservados em arquivos compactados externos com verificação SHA-256 antes da remoção.
- 615 testes aprovados, zero falhas, 41 suítes; testes específicos de pacote e arquivamento também aprovados após a revisão final das regras.
- Inicialização do portable aprovada com saída 0, inclusive após extrair o ZIP em um diretório de teste isolado.
- SQLite e WebSocket carregados pelo Node do pacote; planilha escrita e relida com ExcelJS no runtime empacotado.

## Tamanho do pacote

| Medida | Resultado |
| --- | ---: |
| Estimativa comparável com as regras antigas, sobre a fotografia inicial | 443.00 MiB |
| Portable padrão descompactado | 226.50 MiB |
| Portable padrão ZIP | 96.02 MiB |
| Arquivos no manifesto, sem contar o próprio manifesto | 3066 |
| Complemento nativo ZIP da instalação local | 0.47 MiB |

A comparação com o pacote antigo é uma estimativa calculada sobre os arquivos que as regras anteriores copiavam, não um benchmark de um ZIP antigo. MiB = 1.048.576 bytes.

## Decisão por pasta

| Área | Decisão | Motivo |
| --- | --- | --- |
| `src`, `ui`, `config`, `server.js` | Preservados | Implementação do produto; módulos de engines podem ser carregados indiretamente |
| `resources` | Preservado no que pode participar do runtime | Pontes, Python, bibliotecas, fontes e ferramentas; só caches Python com fonte correspondente foram arquivados |
| `loaders` | Preservado localmente | Ferramentas nativas podem ser usadas por processos externos; injetor separado no perfil padrão |
| `third-party` e licenças | Preservados | Procedência/atribuição e material auxiliar não devem ser apagados por parecerem sem import |
| `node_modules` | Preservado na origem; filtrado no portable | Necessário para desenvolvimento/rebuild; entrega omite artefatos de browser, C++ de compilação e definições TypeScript específicas |
| `bin/node.exe` | Preservado | Runtime Node 24 validado |
| Node 20 e scripts antigos de build/download | Arquivados externamente | Teste real confirmou ABI incompatível com o SQLite atual; build moderno usa Node 24 |
| `archives`, `graphify-out`, `docs/analysis` | Arquivados externamente | Históricos/grafos/relatórios gerados fora do caminho de execução atual |
| `scratch`, evidências locais de laboratório | Arquivados externamente | Trabalho e resultados de teste; não pertencem ao download do aplicativo |
| Backups de código `.bak` em `src` | Arquivados externamente | Cópias históricas fora do módulo ativo; dados locais excluídos dessa regra |
| Scripts `upd2/3/4` | Arquivados externamente | Edições pontuais de um relatório antigo, sem consumidor atual identificado |
| `tests`, `tools`, `.github`, `.agents` | Mantidos para desenvolvimento; fora do portable | Necessários para manter/verificar o projeto, não para o usuário executar a aplicação |
| `docs` | Guias e documentação preservados; análise gerada retirada | Referência de desenvolvimento; o portable contém instruções de uso e manifesto |
| `data`, `gameLib`, `logs`, dados legados | Preservados e fora do portable | Preferências, traduções, bancos, sessões, jogos e recuperação pessoal não são lixo |

## Regras de distribuição

O destino do pacote é recusado quando fica dentro da origem, inclusive com variação de maiúsculas/minúsculas no Windows. `tools/package_release.js` usa uma lista explícita de áreas de runtime e registra exclusões no manifesto. O perfil `standard` é o padrão. Ele preserva o addon compilado `better_sqlite3.node` e licenças, mas omite os fontes C/C++ de rebuild de better-sqlite3, o bundle de browser de ExcelJS, definições de tipos, source maps, caches e dados locais.

`loaders/inject.exe` ocupa aproximadamente 184 MiB descompactado e não é necessário para iniciar a aplicação. Foi mantido na origem e separado em um complemento local. Funcionalidades que realmente dependem desse injetor exigem o complemento. O perfil `complete` inclui componentes opcionais existentes na origem. Nenhum dos perfis certifica todas as versões de jogos; o manifesto indica o que foi encontrado e incluído. A ferramenta opcional Godot não estava disponível nesta origem.

Não se apagou código de uma engine apenas porque uma busca não encontrou referências. Chamadas dinâmicas, templates e ferramentas nativas não são completamente representadas por imports JavaScript.

## Projeto de desenvolvimento e pacote de uso

O ZIP de **Code → Download ZIP** do GitHub continua sendo código-fonte de desenvolvimento. O download para executar o programa é o artefato **OpenTranslator-Win64-Portable** do workflow de build. O workflow foi ajustado para gerar o artefato em pushes para main, além de pull requests, tags e execução manual. Releases de tags mantêm o comportamento de rascunho.

Para gerar localmente:

```text
npm ci
node tools/package_release.js --profile standard --output PASTA_NOVA_FORA_DO_PROJETO
node tools/package_release.js --profile complete --output OUTRA_PASTA_NOVA
```

Para inspecionar candidatos de organização, sem retirar arquivos:

```text
node tools/cleanup_project.js
```

Para aplicar o plano explícito com cópia compactada e hashes, escolher saída nova fora da origem:

```text
node tools/cleanup_project.js --apply --output PASTA_NOVA_FORA_DO_PROJETO
```

A ferramenta não limpa bancos, WAL/SHM, jobs ou sessões pessoais. Diretórios de laboratório podem conter trabalho útil: por isso o conteúdo selecionado é arquivado e verificado, não descartado sem cópia.

## Recuperação e rastreabilidade

A pasta local `OpenTranslator-organizacao-2026-11-01`, ao lado do projeto, contém a classificação CSV/JSON, as decisões por fase e o ZIP consolidado de histórico. Esses arquivos podem conter nomes de jogos ou evidências locais e não foram publicados no GitHub. Cada ZIP de fase contém `CLEANUP-MANIFEST.json`, com caminho original, tamanho e SHA-256.

Para recuperar, extrair o histórico em uma pasta nova, conferir o manifesto e copiar de volta apenas os itens desejados. O Git também preserva os arquivos que já tinham sido versionados nos commits anteriores à limpeza.

O pacote foi testado para inicialização e dependências básicas. A limpeza e a redução do pacote não substituem testes de tradução, cheats ou execução em jogos reais de cada engine.
