# Compatibilidade, MTool e interface — 1 de novembro de 2026

## Escopo e limites

Revisão dirigida do detector, arquitetura PE, seleção de hooks, cadastro/biblioteca, estilos e organização de ferramentas. Não equivale a revisão semântica linha por linha de todos os arquivos nem certificação universal. O teste real de Unreal descrito em UNREAL_REAL_GAME_TEST_2026-10-31.md continua restrito àquele jogo.

## Análise da instalação MTool

Inspeção somente de leitura da instalação fornecida pelo usuário. Não foram executados seu atualizador, seus binários ou seus scripts de carregamento. Dados de conta, suporte, armazenamento pessoal e conteúdo de jogos não foram copiados.

- Shell NW.js: package.json aponta para www/index.html. Há NW/Node, recursos de renderização e loaders separados.
- Organização: gameLib e gameSaveBackup separados; JoyCon2Maps para perfis de controle; locales para idiomas; www para apresentação.
- O carregador inclui pacotes compilados loader.bin para diferentes versões. O núcleo não está disponível como fonte legível nesta cópia. Portanto, não se afirma análise linha a linha de seu núcleo.
- Componentes especializados incluem GodotHook_3_0_0 e GodotHook_4_2_0, PythonHook/PythonHook64, RGSSHook/RGSSHook64, krkrzHook32/64 e variantes Wolf. Isso demonstra separação de artefatos; seus nomes isoladamente não provam compatibilidade efetiva.
- A dependência legacy-encoding indica preocupação com codificações antigas. Codificação deve ser identificada e preservada, não convertida indiscriminadamente.
- A shell oferece carregamento, erro e recuperação. São boas referências para feedback simples.
- Não foi identificada licença do produto autorizando reutilizar o núcleo ou seus componentes. Nenhuma DLL, código compilado ou recurso visual foi incorporado.
- O parâmetro disable-web-security da instalação não foi reproduzido.

## Ideias aplicadas com implementação própria

1. Arquitetura comprovada por assinatura DOS/PE, limites de leitura e machine: x86, x64 e ARM64 distinguíveis. Desconhecido não significa 32 bits. Arquivos são fechados também em falhas.
2. Hooks x86/x64 não são selecionados para ARM64/desconhecido. Krkr2, SRPG e Agtk não recebem fallback x86 em executável x64. Wolf deixa de usar tamanho de arquivo como identificação de versão: sem perfil comprovado, não escolhe DLL automaticamente. Isso reduz a cobertura automática de hook Wolf até haver detecção confiável.
3. RenPy sem runtime conhecido não recebe versão 8 inventada. Variantes py3-windows e python3.N são reconhecidas sem afirmar arquitetura por nome de pasta.
4. MV/MZ lê RPGMAKER_VERSION quando disponível. Uma pasta www/data vazia não basta para declarar MV. Sem núcleo, versões permanecem desconhecidas.
5. Executáveis auxiliares comuns são excluídos da seleção automática; candidatos são ordenados. Jogos com vários executáveis principais ainda devem ser cadastrados pelo caminho exato.
6. Matriz estática passa a PARTIAL em vez de FULLY VALIDATED global. Importar o módulo não regrava dados. Consultas entregam cópias.

## Interface e estrutura

- Estilos extraídos de app.js para ui/styles/base.css; layout e acessibilidade em ui/styles/layout.css. Caminhos relativos de fontes atualizados.
- Fontes remotas removidas. Cores sólidas, textos legíveis, barra lateral ampliada, foco de teclado e tratamento para telas menores e movimento reduzido.
- Biblioteca ordenada por título com comparação pt-BR numérica; atualização, edição e remoção têm rótulos.
- Adicionar jogo abre cadastro existente. Caminho vazio não salva; cadastro novo passa pela validação de existência do backend. Pastas sem executáveis e arquivos não .exe são rejeitados.
- Botão de caminho que apenas selecionava texto removido. Ferramentas de diagnóstico/recuperação ficam em seção avançada, ausente ao cadastrar jogo ainda não salvo.
- tools/maintenance recebe a implementação de limpeza, com entrada antiga preservada. Scripts locais de patches pontuais adopt/adopt2/fixD1/fixSuper arquivados em archives/maintenance/one-off, sem execução.
- Bancos SQLite, bibliotecas pessoais e backups não foram movidos com processos possivelmente ativos. A ordem física de um diretório não é controlável: o índice de arquivos e a biblioteca possuem ordenação explícita.

## Pendências reais

Compatibilidade exige amostras autorizadas por engine, versão, arquitetura, plugins e formato de arquivo. Godot 3/4, Wolf 1/2/3, RenPy 6/7/8, Unity Mono/IL2CPP e variantes proprietárias ainda precisam de matrizes reais de jogos. Não basta copiar nomes ou DLLs de outro produto. A interface conserva telas antigas; este trabalho melhora a biblioteca e o cadastro, mas não declara todos os fluxos reavaliados visualmente.

## Validação desta entrega

`npm run verify`: 590 testes aprovados, 0 falhas, 38 suítes, incluindo 11 casos novos de compatibilidade. Verificados visualmente biblioteca, abertura do cadastro e cancelamento; cadastrar jogo novo não mostra operações que exigem chave salva. A preferência de idioma existente foi preservada. Não foram executados jogos adicionais para certificar versões novas.
