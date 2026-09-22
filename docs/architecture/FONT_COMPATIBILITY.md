# OpenTranslator — Font Compatibility & Glyph Engine (Fase 6)

## 1. Princípio Fundamental de Integridade Visual

> **"Não substituir fontes indiscriminadamente se a fonte original já cobrir todos os glifos necessários."**

Muitos jogos possuem tipografia cuidadosamente desenhada pela direção de arte original. Substituir fontes desnecessariamente prejudica a estética do jogo.

---

## 2. Análise de Cobertura de Glifos (`FontCompatibilityEngine`)

O motor analisa o texto traduzido e categoriza cada ponto de código Unicode:
- **BASIC_LATIN** (`U+0020` a `U+007E`): Letras e pontuações padrão ASCII.
- **ACCENTED_LATIN** (`U+00C0` a `U+024F`, `U+1E00` a `U+1EFF`): Acentos de português, espanhol, francês, etc. (á, é, í, ó, ú, ç, ã, õ, â, ê).
- **CJK_HANZI_KANJI** (`U+4E00` a `U+9FFF`): Ideogramas chineses e kanjis japoneses.
- **CJK_KANA** (`U+3040` a `U+30FF`): Hiragana e Katakana japoneses.
- **CJK_HANGUL** (`U+AC00` a `U+D7AF`): Sílabas coreanas.
- **CYRILLIC** (`U+0400` a `U+04FF`): Alfabeto cirílico.
- **GREEK** (`U+0370` a `U+03FF`): Alfabeto grego.
- **ARABIC_RTL** (`U+0600` a `U+06FF`) & **HEBREW_RTL** (`U+0590` a `U+05FF`): Textos bidirecionais.
- **SPECIAL_SYMBOLS** (`U+2190` a `U+2BFF`): Setas, estrelas, botões de gamepad.

---

## 3. Matriz de Recomendações de Fontes

| Requisito do Texto | Fonte Recomendada | Arquivo em `Tool/www/NotoSans/` |
|---|---|---|
| **Latim Acentuado (PT/ES/FR)** | Fonte original do jogo (se suportar) ou Noto Sans Regular | `NotoSans-Regular.ttf` |
| **CJK (Japonês/Chinês)** | Noto Sans CJK SC Regular | `cjk/NotoSansCJKsc-Regular.otf` |
| **Cirílico (Russo/Ucraniano)** | Noto Sans Regular | `NotoSans-Regular.ttf` |
| **RTL (Árabe)** | Noto Sans Arabic Regular | `NotoSansArabic-Regular.ttf` |
| **Fallback Universal** | Noto Sans / Unifont | `NotoSans-Regular.ttf` |
