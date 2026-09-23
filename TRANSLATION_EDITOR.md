# OpenTranslator — Translation Editor Architecture & UX Specification
## Grade de Dados Virtualizada, Validação de Qualidade e Atalhos de Produtividade

O **Translation Editor** foi projetado para tradutores e jogadores que necessitam de alta produtividade na revisão e personalização de textos de jogos.

---

### 1. MODELO DE DADOS DA GRADE VIRTUALIZADA

Para suportar jogos com centenas de milhares de linhas (ex: RPGs e Visual Novels com mais de 300.000 strings) sem congelar o navegador ou exceder a memória RAM, o editor utiliza renderização virtualizada com paginação e busca indexada:

| Coluna | Descrição | Edição / Ação |
|---|---|:---:|
| **Original** | Texto original capturado dos arquivos ou runtime | Somente leitura |
| **Translation** | Texto traduzido para o idioma de destino | Editável / Multi-linha |
| **Context** | Identificador de cena, arquivo de origem ou função | Somente leitura |
| **Source** | Origem (`NATIVE_TABLE`, `STATIC_JSON`, `RUNTIME_HOOK`) | Badge informativo |
| **Provider** | Provedor que gerou a tradução inicial | Badge informativo |
| **Status** | `VERIFIED`, `MANUAL`, `WARNING`, `INVALID`, `OBSOLETE` | Seletor de status |
| **Scene / Game** | Rótulo do jogo e momento da história | Metadados contextuais |

---

### 2. FILTROS RÁPIDOS & BUSCA INSTANTÂNEA

- **Filtros de Estado**:
  - `Untranslated`: Exibe apenas strings pendentes.
  - `Translated`: Strings traduzidas e validadas.
  - `Manual`: Sobrescritas manuais feitas pelo usuário (prioridade máxima L4).
  - `Warning / Invalid`: Falhas no Quality Gate (placeholders quebrados, discrepâncias).
  - `Obsolete`: Textos de versões anteriores do jogo.
- **Busca Global**: Indexação em tempo real que filtra tanto o texto original quanto a tradução e cena com latência imperceptível (< 1ms).

---

### 3. ATALHOS DE TECLADO (KEYBOARD-FIRST WORKFLOW)

| Atalho | Ação |
|---|---|
| **Ctrl + F** | Focar instantaneamente na caixa de busca global |
| **Ctrl + Enter** | Salvar tradução atual, validar Quality Gate e avançar para a próxima string pendente |
| **Enter** | Inserir quebra de linha no editor de texto |
| **Ctrl + S** | Gravar todas as alterações da sessão em disco |
| **Ctrl + Z** | Desfazer última alteração (Undo) |
| **Ctrl + Y** | Refazer alteração desfeita (Redo) |
| **Esc** | Fechar modais ou limpar filtro de busca |
| **Seta Cima / Baixo** | Navegar entre as linhas da grade sem necessidade de mouse |

---

### 4. OPERAÇÕES EM LOTE (BULK OPERATIONS) COM PREVIEW OBRIGATÓRIO

Para evitar substituições destrutivas acidentais, todas as ações em lote seguem o protocolo **Preview -> Confirmação -> Aplicação**:
- **Bulk Replace**: Localiza termos em todo o catálogo (ou filtros específicos) e gera uma lista comparativa antes/depois. Se a alteração quebrar uma tag ou variável, o item é marcado como `INVALID` e sua aplicação é bloqueada.
- **Bulk Approve**: Marca lote de strings revisadas como `VERIFIED`.
- **Bulk Export**: Exporta seleções filtradas para `.csv`, `.po` ou `.otpatch`.

---

### 5. GLOSSÁRIO MULTI-NÍVEL & REGRAS DE QUALIDADE (QUALITY GATE)

- **Hierarquia de Glossário**:
  1. `Scene Glossary`: Termos exclusivos de um mapa ou diálogo específico.
  2. `Character Glossary`: Nomes de personagens, títulos honoríficos e pronomes.
  3. `Game Glossary`: Nomes de magias, itens, equipamentos e cidades do jogo.
  4. `Global Glossary`: Preferências globais do tradutor válidas para todos os jogos.
- **Tipos de Regras**:
  - `PREFERRED`: Sugestão prioritária de termo.
  - `FORCED`: Substituição automática mandatória.
  - `FORBIDDEN`: Termo estritamente proibido (emite aviso crítico se detectado).
  - `REGEX`: Padrões avançados para expressões regulares.
- **Validação Automática de Integridade**:
  - **Placeholders**: Confirma que `{0}`, `{1}`, `%s`, `%d` estão presentes no texto traduzido.
  - **Códigos de Escape RPG Maker**: Valida integridade absoluta de `\C`, `\V`, `\N`, `\P`, `\G`, `\I`, `\.`, `\|`.
  - **Tags Ren'Py / RichText**: Verifica fechamento de tags `{b}`, `{/b}`, `<i>`, `<color>`, `<size>`.
  - **Quebras de Linha & RTL**: Previne perda acidental de parágrafos e gerencia caracteres Unicode/RTL.
