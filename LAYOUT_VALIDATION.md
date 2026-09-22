# OpenTranslator — Layout Engine & Text Expansion Report (Fase 6)

## 1. O Problema da Expansão Textual

Ao traduzir jogos (especialmente de japonês ou inglês para português, espanhol ou russo), o comprimento das frases pode expandir entre **20% e 80%**. Se não for gerenciado, causa:
- Overflow fora das caixas de diálogo
- Texto cortado (clipping)
- Sobreposição de botões de interface
- Quebra incorreta de palavras

---

## 2. Estratégias do `TranslationLayoutValidator`

O OpenTranslator adota quatro estratégias coordenadas:

1. **WRAP (Quebra de Linha Inteligente):**
   - Quebra palavras respeitando limites de caracteres configuráveis por jogo ou motor.
   - Não quebra no meio de tags ricas (`<color>`, `[b]`, etc.) ou variáveis.

2. **SHRINK (Redução Dinâmica de Fonte):**
   - Calcula o fator de expansão `expansionRatio = transLen / origLen`.
   - Se `expansionRatio > 1.35`, recomenda redução proporcional da fonte (ex: no TextMeshPro, ativa Auto-Sizing; no Ren'Py, injeta `gui.text_size - 2`).

3. **SHRINK_AND_WRAP (Modo Crítico):**
   - Ativado quando `expansionRatio > 1.8` e o texto excede o limite da janela.

4. **Preservação de Direcionalidade RTL (Árabe e Hebraico):**
   - Inserção de marcadores Unicode RLM (`\u200F`) e LRM (`\u200E`) para impedir inversão de pontuações neutras (`!`, `?`, `.`) em interfaces bidirecionais.

---

## 3. Validação de Variáveis e Plurais

O `TranslationLayoutValidator` rejeita automaticamente qualquer tradução que destrua tokens de variáveis:
- Format strings: `%d`, `%s`, `%f`, `{0}`, `{1}`
- Códigos de escape RPG Maker: `\V[n]`, `\N[n]`, `\C[n]`, `\I[n]`
- Tokens Godot: `{player}`, `{score}`
- Tags Ren'Py: `[player_name]`, `{color}`
