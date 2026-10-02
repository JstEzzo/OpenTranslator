# OPENTRANSLATOR — RELATÓRIO OFICIAL DE HARDENING

**Projeto:** OpenTranslator 1.0.0  
**Data:** 01/10/2026  
**Status:** CONCLUÍDO COM SUCESSO (ZERO REGRESSÕES)  
**Ambiente:** Windows 11 x64, Node.js v24.18.0, Google Chrome 129  

---

## 1. OBJETIVO DA FASE DE HARDENING

Consolidar a estabilidade, integridade e generalidade dos módulos do OpenTranslator antes de expandir para novas engines, eliminando fragilidades técnicas, código acoplado, falsas declarações de compatibilidade e riscos de corrupção de arquivos originais.

---

## 2. AÇÕES REALIZADAS E RESULTADOS

### 2.1. Correção Estrita da Classificação de Versões Ren'Py
* **Problema Anterior:** A matriz e a UI declaravam genericamente `"Ren'Py 6.x - 8.x"`. Versões 6.x e 7.x são legadas em Python 2, com estruturas de bytecodes `.rpyc` e APIs de tradução diferentes, e não haviam sido comprovadas em produção real.
* **Ação:**
  1. No módulo de metadados (`Tool/src/core/engineCapabilityMatrix.js`), separou-se formalmente:
     * `versions: ["8.x (Python 3) [COMPROVADO]"]`
     * `verifiedVersions: ["8.x (Python 3)"]`
     * `unverifiedVersions: ["6.x (Python 2)", "7.x (Python 2)"]`
  2. No RPC Handler (`Tool/src/rpcHandlers.js`) e no Frontend (`Tool/www/app.js`), implementou-se a renderização discriminada: versões 8.x são marcadas com badge verde de comprovação, e versões 6.x/7.x recebem alerta visual explícito `⚠️ Não comprovado: Requer validação`.

### 2.2. Separação Mandatória: `ENGINE VERIFIED` vs `GAME TRANSLATION COVERAGE`
* **Problema Anterior:** Confundir a certificação do motor (`Ren'Py FULLY VERIFIED`) com tradução total de 100% dos textos do jogo.
* **Ação:**
  * O sistema agora calcula e expõe métricas desvinculadas:
    ```json
    "metrics": {
      "ENGINE_VERIFIED": "FULLY VERIFIED",
      "GAME_RUNTIME_VERIFIED": true,
      "TRANSLATION_COVERAGE": {
        "textos_detectados": 3378,
        "textos_traduziveis": 3378,
        "textos_traduzidos": 14,
        "cobertura_pct": "0.4%"
      },
      "VISUAL_TRANSLATION_COVERAGE": {
        "baseline_captures_supported": true,
        "translated_captures_supported": true
      },
      "RUNTIME_TRANSLATION_COVERAGE": {
        "marker_test_supported": true,
        "ipc_telemetry_supported": true,
        "save_load_roundtrip_supported": true
      }
    }
    ```
  * O relatório da UI e os alertas modais exibem claramente o bloco de suporte do motor separado da cobertura real de textos traduzidos do jogo.

### 2.3. Auditoria e Purificação Universal do `codeProtector.js`
* **Problema Anterior:** Existiam nomes de variáveis de jogos específicos (`player_name`, `cash`, `dinheiro`, `local`, `título`, `config.version`) em listas literais de restauração de variáveis no módulo compartilhado.
* **Ação:**
  1. Removidas todas as palavras literais hardcoded de `codeProtector.js`.
  2. Criado algoritmo universal de pareamento posicional estrutural delimitado por chaves `{...}` e colchetes `[...]`, imune a alterações léxicas feitas por LLMs.
  3. Heurísticas específicas de sintaxe Ren'Py (`[player_name]`, `{color=...}`, tags de estilo) foram isoladas dentro de `Tool/src/engines/renpy/translator/renpyTranslator.js`.
  4. Suíte de testes `placeholder_preservation.test.js` e `test_translation_qa_launch_bug.js` executada com 100% de aprovação.

### 2.4. Ativação Segura de Idioma Respeitando Seletores Nativos
* **Problema Anterior:** `config.language = "pt_BR"` ou `renpy.change_language("pt_BR", force=True)` eram injetados incondicionalmente, sobrescrevendo preferências salvas e quebrando menus de múltiplos idiomas pré-existentes.
* **Ação:**
  1. Criada a função `inspectLanguageSystem(gameSubDir)` no `RenpyInjector`.
  2. Em jogos com sistema de idioma próprio (ex: `language_select.rpy` e `LANGUAGE_CHOICES`), o script aditivo gerado em `game/tl/pt_BR/000_opentranslator_init.rpy`:
     * Respeita `_preferences.language` previamente configurado pelo jogador;
     * Insere dinamicamente a opção `("pt_BR", "Português (Brasil)", None)` na lista nativa `LANGUAGE_CHOICES`;
     * Define fallback apenas quando nenhuma preferência foi definida.
  3. Em jogos sem seletor, aplica ativação automática segura.

### 2.5. Auditoria do Runtime Ren'Py (`renpyRuntime.js`)
* **Problema Anterior:** A rotina `killGame()` continha apenas chamadas estáticas `taskkill` para `summertime_saga_realistic_remake.exe` e `ArmoredSuitSolganteRenpy.exe`.
* **Ação:**
  1. Tornou-se dinâmico: `killGame(gameDir)` obtém o executável real através de `resolveGameExe(gameDir)` e encerra o processo com precisão cirúrgica por PID e por imagem.
  2. Removido forçamento rígido de idioma no injetor de telemetria `000_opentranslator_controller.rpy`, respeitando `_preferences.language`.

### 2.6. Certificação Real do Terceiro Jogo Ren'Py (`summertime 0.3.0`)
* **Jogo:** `summertime_saga_realistic_remake-0.3.0-win` (com arquivos monolíticos `.rpa` e tela nativa de 5 idiomas `language_select.rpy`).
* **Etapas Concluídas:**
  1. **Snapshot e Hashes BEFORE:** Gravados hashes SHA-256 de todos os scripts.
  2. **Baseline Original:** 5 telas capturadas em inglês em disco nativo 1080p.
  3. **Controlled Marker Test:** `[[OT_RUNTIME_TEST]]` injetado e confirmado no boot.
  4. **Extração Canônica:** 3.378 textos extraídos diretamente dos arquivos `.rpa` e scripts.
  5. **Injeção Canônica:** Gerados arquivos em `game/tl/pt_BR/` com validação de sintaxe (0 erros).
  6. **Lançamento Traduzido & Gameplay:** 5 telas traduzidas capturadas em PT-BR.
  7. **Save ➔ Close ➔ Reopen ➔ Load ➔ Continue:** Slot 1 salvo, jogo fechado, processo reaberto, Save carregado com sucesso e captura `06_loaded_continue.png` gravada.
  8. **Rollback Atômico com SHA-256:** `SHA-256 BEFORE == SHA-256 RESTORED` (100% idêntico byte-a-byte em todos os scripts).
* **Classificação:** Promovido de `PARTIALLY VERIFIED` para **`FULLY VERIFIED`**.

---

## 3. REGRESSÃO COMPLETA DOS CONTROLES POSITIVOS

Após todas as alterações no código central e no Ren'Py, os controles positivos de todas as engines foram executados em seus scripts de regressão:

| Jogo | Engine | Status de Regressão | SHA Match |
|---|---|---|---|
| Toki kan Yuusha (gitgud) | RPG Maker MV | ✅ PASS (100%) | 100% |
| RJ01058687_en | RPG Maker MV | ✅ PASS (100%) | 100% |
| Marge Mania v0.1 | RPG Maker MZ | ✅ PASS (100%) | 100% |
| RJ01618221 | RPG Maker MZ | ✅ PASS (100%) | 100% |
| summertime_saga 21.0.0 | Ren'Py 8.x | ✅ PASS (100%) | 100% |
| ArmoredSuitSolgante 0.3 | Ren'Py 8.x | ✅ PASS (100%) | 100% |
| summertime_saga 0.3.0 | Ren'Py 8.x | ✅ PASS (100%) | 100% |

**Resultado:** **ZERO REGRESSÕES**. Todas as suites de teste de MV, MZ, Ren'Py e auditoria de integridade forense retornaram código 0 (PASS).
