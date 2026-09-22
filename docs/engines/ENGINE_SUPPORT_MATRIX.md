# OpenTranslator — Matriz de Compatibilidade e Suporte por Engine (Fase 2)

**Data da Auditoria:** 16 de Setembro de 2026  
**Critério:** Status *Verified* requer validação empírica comprovada por suíte de testes ou laboratório real.

---

| Engine | Versão | Nível de Suporte | Estratégia Principal | Estratégia Fallback | Status de Teste |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ren'Py** | 8.x / 7.x | **Verified** | Tradução Canônica (`game/tl/<lang>/`) | Unrpyc + Static | 100% Pass (ArmoredSuit & Summertime Saga) |
| **RPG Maker MV** | 1.x | **Verified** | Modificação Segura de JSON (`data/`) | DualHook / Overlay | 100% Pass (Marie's Adv., Aunt don't be sad) |
| **RPG Maker MZ** | 1.x | **Verified** | Modificação Segura de JSON (`data/`) | DualHook / Overlay | 100% Pass (RWLHPMK 164k strings, Succubus) |
| **RPG Maker RGSS**| XP / VX / VX Ace | **Verified** | Extração de Scripts & LData | DualHook | 100% Pass (BLACK SOULS) |
| **Electron / Web** | Chromium / ASAR | **Partial** | Extração Estática ASAR + DOM Observer Bridge | OCR de Tela | 100% Pass Estático (DokiDoki Massage) |
| **Unity Mono** | .NET / Mono | **Partial** | BepInEx / XUnity Runtime Hook | OCR de Tela | Pass (Configuração Segura Sem DLL Fantasma) |
| **Unity IL2CPP** | Native C++ | **Experimental** | OCR de Tela / Read-Only Diagnostics | N/A | Classificação Estrita & Segura |
| **Wolf RPG** | WOF | **Partial** | UberWolfCli Extractor | OCR de Tela | Pass Extração (Rabbit Hood) |
| **Generic Engine** | Desconhecida | **Experimental** | Varredura Heurística de Arquivos | OCR de Tela | Pass Varredura |
