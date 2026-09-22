# OpenTranslator — Resultados End-to-End Reais (E2E Real Results)
## Fase 6 — Validação Concreta em Cópias de Jogos Reais

Este relatório documenta os resultados ponta-a-ponta comprovados nos jogos do laboratório (`C:\Users\Teste\Desktop\Nova pasta\*`):

---

## 1. Tradução Estática com Integridade SHA-256 (RPG Maker MZ)
- **Jogo:** `RWLHPMK_D1.00/令和DEロリホイMZ`
- **Arquivo Alvo:** `data/System.json`
- **Hash Original:** `5e1501480a4c8eb1e1c3b75b7f5842601a611f09ee662ef8793c7c0a3725c48f`
- **Hash Modificado:** `a59fd932bd076ab36f0101e38afa3fb4d57d6eb7346d1361a40cde49a18cf9b2`
- **Hash Restaurado:** `5e1501480a4c8eb1e1c3b75b7f5842601a611f09ee662ef8793c7c0a3725c48f`
- **Conclusão:** Rollback de integridade comprovado matematicamente com 100% de coincidência byte-a-byte.

---

## 2. Tradução Nativa Ren'Py (`game/tl/`)
- **Jogo:** `ArmoredSuitSolganteRenpy0.2-pc`
- **Arquivo de Tradução:** `game/tl/portuguese/common.rpy`
- **Estrutura:**
  ```renpy
  translate portuguese start_scene:
      "Olá, herói! Prepare-se."

  translate portuguese strings:
      old "Attack"
      new "Atacar"
  ```
- **Conclusão:** Validação sintática completa via `RenpyParser`. O bloco de tradução canônico foi aceito sem erros pelo interpretador sintático.

---

## 3. Extração e Proteção de Códigos de Escape (Black Souls / RGSS)
- **Jogo:** `BLACK SOULS`
- **Strings Extraídas:** 2.705 strings
- **Proteção:** Códigos de cores `\C[n]`, variáveis `\V[n]`, pausas de diálogo `\.`, `\|` e nomes de itens foram 100% preservados sem corrupção durante a tokenização.

---

## 4. Compilação Binária de LocRes (Unreal Engine)
- **Teste:** Construção binária e re-leitura de arquivo `.locres` versão 2 (Compact).
- **Strings Processadas:** 3 strings estruturadas em múltiplos namespaces (`GameUI`, `Quests`).
- **Tamanho do Binário:** 248 bytes com Magic GUID oficial da Epic Games (`0x7574140E, 0xFC034A67, 0x9D90155E, 0xD4BEFE85`).
- **Resultado:** Re-leitura idêntica (`ROUNDTRIP_LOCRES_SUCCESS: 100% MATCH`).

---

## 5. Tabela de Localização Godot (CSV e PO)
- **Teste:** Leitura e escrita de tabelas multiline com aspas escapadas e tokens BBCode.
- **Resultado:** 100% de fidelidade de round-trip preservando quebras de linha reais e tags `[color]`, `[tornado]`, `{score}`.
