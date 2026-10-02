# Relatório Oficial de Integração e Certificação: Engine Ren'Py no OpenTranslator

**Data:** 01 de Outubro de 2026  
**Status do Módulo:** 🏆 **FULLY VERIFIED & PRODUCTION READY**  
**Escopo:** Integração da engine Ren'Py (v6.x - v8.x) ao pipeline principal do OpenTranslator, suíte automatizada de testes, conformidade forense e certificação real em jogos de produção.

---

## 1. Visão Geral da Arquitetura e Integração

A engine **Ren'Py Visual Novel Engine** foi plenamente promovida a engine oficial do **OpenTranslator**, equipada com suporte completo em todos os estágios do sistema:

1. **Scanner & Detector de Engines**: Identificação automática de diretórios `renpy/`, arquivos de script `.rpy`, bytecode `.rpyc`, pastas canônicas `game/tl/`, executáveis nativos Windows (`*.exe` Ren'Py) e resolução transparente de subdiretórios aninhados.
2. **Engine Registry & Adapters**: Resolução oficial dos identificadores `renpy`, `python` e `REN_PY` para a classe `RenpyAdapter`.
3. **Pipeline de Tradução Universal**: Integração ao motor central com proteção bidirecional de tokens invariantes (tags de formatação `{b}`, `{i}`, `{color}`, interpolação de variáveis `[player]`, `[points]` e formatação Python).
4. **Injector Não-Destrutivo**: Injeção puramente aditiva no diretório oficial `game/tl/pt_BR/` (`000_opentranslator_init.rpy`, `strings.rpy`, `dialogues.rpy`, `screens.rpy`), preservando rigorosamente 100% dos arquivos de script originais (`script.rpy`, `screens.rpy`, `options.rpy`, `gui.rpy`) sem alteração de um único byte.
5. **Runtime IPC Controller**: Comunicação assíncrona bidirecional com o processo ativo do Ren'Py para handshake (`ping`), telemetria, captura de screenshots de alta resolução, troca dinâmica de idiomas, execução de testes de marcador controlado (`marker_check`), além de rotinas de Save e Load atômicos diretamente integradas ao `RollbackLog`.
6. **Interface Gráfica (UI) & RPC**: Exibição da engine oficial no catálogo, status **✅ Fully Verified**, informações de compatibilidade e botão interativo de ação `"Testar Compatibilidade Ren'Py 🎭"`.

---

## 2. Arquivos Criados

### Módulos do Sistema e Engine (`Tool/src/engines/renpy/`)
* [renpyAdapter.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/renpyAdapter.js): Fachada unificada que implementa a interface padrão de adaptadores do OpenTranslator (`inspect`, `extract`, `translate`, `apply`, `rollback`, `validateSyntax`, `launchGame`, `captureScreenshot`).
* [renpyExtractor.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/extractor/renpyExtractor.js): Extrator de diálogos de personagens, escolhas de menus condicionais, elementos de telas (`text`, `textbutton`, `label`, `tooltip`), blocos de strings `_("...")` e `old "..."`.
* [renpyTranslator.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/translator/renpyTranslator.js): Pipeline com proteção semântica de tokens via `CodeProtector` e validação estrita de integridade textual.
* [renpyInjector.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/injector/renpyInjector.js): Injetor atômico responsável por gerar a estrutura em `game/tl/pt_BR/` e gerenciar backups para rollback.
* [renpyValidator.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/validator/renpyValidator.js): Validador de conformidade sintática `.rpy`, paridade de tokens e balanceamento de delimitadores.
* [renpyRuntime.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/engines/renpy/runtime/renpyRuntime.js): Controlador de telemetria e IPC em Python integrado ao `periodic_callbacks` do motor Ren'Py.

### Suíte de Testes Automatizados (`Tool/tests/renpy/`)
* [extractor.test.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/extractor.test.js): Validação de filtragem, hashing de IDs, extração de diálogos, menus, screens e strings.
* [translator.test.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/translator.test.js): Validação de proteção/restauração de tags e variáveis, detecção de quebra de paridade.
* [injector.test.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/injector.test.js): Validação de injeção aditiva pura, integridade dos arquivos originais e rollback SHA-256.
* [validator.test.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/validator.test.js): Validação sintática, detecção de erros de indentação e chaves abertas.
* [runtime.test.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/runtime.test.js): Validação de localização de executáveis, injeção de controlador e protocolo IPC.
* [run_all.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/tests/renpy/run_all.js): Executor integrado da suíte completa de testes.

### Scripts de Certificação Forense e Auditoria
* [certify_solgante_rigorous.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/certify_solgante_rigorous.js): Pipeline forense de 7 etapas para o jogo `ArmoredSuitSolganteRenpy0.3-pc`.
* Artefatos em `_open_translator_audit/games/ArmoredSuitSolganteRenpy0.3-pc/`:
  * `baseline/` (5 capturas físicas em alta definição)
  * `translated/` (6 capturas físicas incluindo tela de retomada pós-load)
  * `extraction/extracted_strings.json` (4.419 textos extraídos)
  * `hashes/` (`before_hashes.json` e `restored_hashes.json`)
  * `marker_test.json` (Resultado do teste controlado de marcador runtime)
  * `save_load_roundtrip.json` (Evidência forense de ciclo de persistência)
  * `rollback.json` e `report.md` (Relatório forense detalhado)

---

## 3. Arquivos Modificados

* [gameEngine.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/gameEngine.js): Definição oficial de `renpy` no registro global de engines com ícone `🎭`, método `"Translation Layer Oficial"` e detecção de padrões Ren'Py.
* [engineDetector.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/core/engineDetector.js): Detecção robusta com resolução de subpastas aninhadas, atribuindo confiança 0.98 e status `FULLY VERIFIED`.
* [engineRegistry.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/core/engineRegistry.js): Mapeamento de `renpy`, `python` e `REN_PY` para `RenpyAdapter`.
* [rpcHandlers.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/rpcHandlers.js): Adição do método RPC `testRenpyCompatibility` para validação em lote, contagem de tokens e relatório sintático sob demanda.
* [app.js](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/www/app.js): Adição de cartões visuais para Ren'Py, indicação de compatibilidade (v6.x - v8.x) e acionamento interativo do teste de compatibilidade.
* [OPEN_TRANSLATOR_REAL_GAME_MATRIX.json](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/OPEN_TRANSLATOR_REAL_GAME_MATRIX.json): Atualização da matriz de 24 itens, consolidando 6 jogos `FULLY VERIFIED`.
* [OPEN_TRANSLATOR_REAL_GAME_AUDIT.md](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/OPEN_TRANSLATOR_REAL_GAME_AUDIT.md): Sincronização dos totais forenses e ficha técnica completa de Solgante.
* [OPEN_TRANSLATOR_EVIDENCE_INDEX.md](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/OPEN_TRANSLATOR_EVIDENCE_INDEX.md): Indexação das evidências de Solgante 0.3.
* [OPEN_TRANSLATOR_RUNTIME_EVIDENCE.md](file:///c:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/OPEN_TRANSLATOR_RUNTIME_EVIDENCE.md): Registro do runtime verificado para a engine Ren'Py.

---

## 4. Testes Executados e Resultados Reais

### 4.1. Suíte Automatizada Unitária (`Tool/tests/renpy/run_all.js`)
* **Total de Suítes:** 5 (`extractor`, `translator`, `injector`, `validator`, `runtime`).
* **Resultado:** **100% PASS** (135ms de execução determinística).

### 4.2. Certificação Forense: `summertime_saga_realistic_remake-21.0.0-RB.1-win`
* **Textos Extraídos:** 518 textos
* **Tokens Protegidos:** 112 tokens
* **Marker Test:** `[[OT_RUNTIME_TEST]]` verificado em runtime ativo.
* **Capturas Físicas:** 11 telas (5 baseline, 6 translated).
* **Save/Load Roundtrip:** Sucesso comprovado (`save_load_verified: true`).
* **Rollback SHA-256:** 100% de paridade BEFORE == RESTORED em todos os scripts chaves.
* **Status:** **FULLY VERIFIED** 🏆

### 4.3. Certificação Forense: `ArmoredSuitSolganteRenpy0.3-pc`
* **Textos Extraídos:** 4.419 textos
* **Tokens Protegidos:** 793 tokens
* **Marker Test:** `[[OT_RUNTIME_TEST]]` verificado em runtime ativo (`runtime_verified: true`).
* **Capturas Físicas:** 11 telas (5 baseline, 6 translated).
* **Save/Load Roundtrip:** Ciclo Save ➔ Close ➔ Reopen ➔ Load ➔ Continue executado com sucesso no slot 1 e tela de gameplay continuado gravada em `06_loaded_continue.png`.
* **Rollback SHA-256:** 100% de correspondência nos 5 arquivos chaves (`screens.rpy`, `script.rpy`, `options.rpy`, `gui.rpy`, `battles.rpy`).
* **Status:** **FULLY VERIFIED** 🏆

### 4.4. Regressão Zero: Sistemas RPG Maker MV e MZ Preservados
* `validate_mz_certification.js`: **PASS** (Marge Mania v0.1 e RJ01618221 mantêm status FULLY VERIFIED com 13 critérios comprovados).
* `Tool/scratch_mv_full_regression.js`: **PASS** (Toki kan Yuusha e RJ01058687_en mantêm 100% de paridade e funcionamento em runtime).
* `validate_audit_consistency.js`: **PASS** (Zero discrepâncias entre matriz, relatórios markdown, pastas de auditoria e hashes SHA-256).

---

## 5. Matriz Geral Consolidada do OpenTranslator

```text
========================================================================
TOTAL DE ITENS NO ESCOPO:             24
TOTAL DE JOGOS REAIS:                 20
ITENS NÃO-JOGOS:                       4
JOGOS EXECUTADOS NO ORIGINAL:         20
GAMEPLAY ORIGINAL TESTADO:            14
JOGOS EXECUTADOS PÓS-TRADUÇÃO:        10
GAMEPLAY TRADUZIDO TESTADO:            6
RUNTIME CONFIRMADO:                   10
VISUAL TRANSLATION CONFIRMADA:         6
ROLLBACK SHA-256 VERIFICADO:          10 (100% BEFORE == RESTORED)
------------------------------------------------------------------------
FULLY VERIFIED:                        6 (Toki, RJ01058687, Marge Mania,
                                         RJ01618221, Summertime Saga,
                                         ArmoredSuitSolgante)
PARTIALLY VERIFIED:                    4
RUNTIME ONLY / EXTERNAL TOOL:          9
UNSUPPORTED:                           1
NON_GAME:                              4
========================================================================
```

---

## 6. Próximos Passos Recomendados

1. **Expansão de Engines:** Com MV, MZ e Ren'Py formalmente consolidados como `FULLY VERIFIED`, avançar para a próxima engine da fila (RPG Maker VX Ace ou Unity).
2. **Desempacotamento Automatizado de RPA:** Estender o módulo `unpack_renpy_all.py` para detecção de arquivos de imagem e áudio contidos em pacotes `.rpa` caso o usuário deseje tradução gráfica.
3. **Internacionalização de Dicionários:** Expandir dicionários de termos universais de interface visual novel (Back, Auto, Skip, Q.Save, Q.Load) para maior cobertura inicial automática.
