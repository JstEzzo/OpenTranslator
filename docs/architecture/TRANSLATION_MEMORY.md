# OpenTranslator — Translation Memory 2.0 Specification

---

## 1. Arquitetura da Memória de Tradução

O `TranslationMemory` (`Tool/src/core/translationMemory.js`) opera sobre SQLite de alta performance configurado com:
- **WAL Mode** (`PRAGMA journal_mode = WAL;`)
- **Normal Sync** (`PRAGMA synchronous = NORMAL;`)

---

## 2. Escopos Hierárquicos de Tradução

As traduções são consultadas em 4 níveis de prioridade:

```text
1. GAME MEMORY     (Específica para o jogo atual)
       ↓
2. PROJECT MEMORY  (Compartilhada entre versões do mesmo projeto)
       ↓
3. ENGINE MEMORY   (Termos específicos da engine, ex: "Attack", "Defend")
       ↓
4. GLOBAL MEMORY   (Dicionário global comum a todos os jogos)
```

---

## 3. StringIdentity

Para permitir atualização contínua de jogos sem perda de dados, as strings são identificadas por:

```text
engine|arquivo|label_ou_função|speaker|hash_do_texto_normalizado
```

Exemplo:
`renpy|script.rpy|label_intro|akira|a1b2c3d4e5f60718`

---

## 4. Glossário Inteligente

O Glossário Inteligente aplica priorização decrescente por comprimento de string (`terms.sort((a,b) => b.source.length - a.source.length)`).
Isso impede que termos compostos ou no plural sejam corrompidos por termos simples (ex.: "Magic Skills" antes de "Skill").
