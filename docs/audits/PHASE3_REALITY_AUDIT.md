# PHASE 3 REALITY AUDIT — Confronto entre Documentação e Código Real

**Data:** 16 de Setembro de 2026  
**Auditor:** Agente Principal de Engenharia  
**Branch:** universal-translation-upgrade  
**Foco:** Validação factual estrita entre o código implementado nas Fases 1 e 2 e a operabilidade real no ambiente de produção.

---

## 1. Confronto Real: O Que Funciona vs O Que Era Parcial / Mock

| Componente / Engine | Documentado | Realidade do Código | Diagnóstico Factual | Ação na Fase 3 |
| :--- | :--- | :--- | :--- | :--- |
| **Ren'Py Adapter** | Tradução canônica tl/ | Gera apenas bloco 'translate strings:' | Diálogos canônicos com 'say' ou 'menus' usam sintaxe diferente ('translate pt_BR label_name:'). Sem AST validator para checar se o jogo compilará o .rpy gerado sem syntax error. | Implementar Ren'Py AST/Syntax Validator e gerador multi-bloco (say/dialogue, menu, strings). |
| **Electron Adapter** | ASAR analysis & extract | Extrai strings de JSON/HTML do ASAR, mas NÃO possui repacker para gravar de volta no app.asar | Apply em Electron estava incompleto no modo estático: conseguia extrair mas não recompilava o binário ASAR. | Implementar AsarRepacker completo com validação de offsets, reconstrução de header JSON e teste de extração pós-repack. |
| **Unity Mono** | Suporte a BepInEx | Verifica se BepInEx existe antes de escrever ini (OK), mas não tem runtime smoke test | O sistema previne criar ini órfão, mas não valida se o executável do jogo realmente carrega o hook em tempo de execução. | Implementar validador de runtime de Unity Mono e classificação explícita de BepInEx (READY vs BLOCKED). |
| **Strategy Selection** | Seleção por capacidades | GameService usava ternário simples em analyzeGame() | Não existia um StrategyPlanner autônomo calculando o status de saúde (READY, BLOCKED, EXPERIMENTAL) de cada via (Static, Archive, Hook, DOM, OCR). | Criar StrategyPlanner modular baseado em matriz de evidências, riscos e toolchains disponíveis. |
| **Transaction Engine** | Backup SHA-256 e Rollback | BackupManager restaura arquivos, mas não mantinha Journal de transação em disco | Se o processo caísse durante a cópia intermediária de arquivos de um jogo gigante, não havia log de recuperação para 'Resume/Rollback' no boot. | Criar TransactionJournal persistente em Tool/data/transactions/ com estados (staged, committing, committed, rolling_back). |
| **Generic Scanner** | Varredura de arquivos | Scanner genérico básico por regex | Não calculava 'humanTextConfidence' nem 'fileRiskScore', arriscando tentar traduzir chaves de configuração ou hashes hexadecimais. | Implementar UniversalScanner com filtros heurísticos linguísticos e classificação de risco por extensão/conteúdo. |

---

## 2. Decisões de Engenharia para a Fase 3

1. **StrategyPlanner**: Implementar uma máquina de diagnóstico de estratégias que entregue o estado exato de cada via técnica para a UI.
2. **Ren'Py Parser & AST Validator**: Validar sintaticamente os arquivos .rpy gerados antes de confirmar o Apply.
3. **AsarRepacker**: Implementar a escrita e empacotamento real de .asar com checagem de integridade bidirecional.
4. **Transaction Journal**: Registro atômico de cada transação de escrita para suportar recuperação pós-queda.
5. **Laboratório em Cópias Reais**: Executar Apply real com Mock Translator em cópias temporárias dos jogos do laboratório, validar sintaxe pós-apply, testar rollback e confirmar retorno 100% idêntico aos hashes de fábrica.
