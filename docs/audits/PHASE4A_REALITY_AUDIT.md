# PHASE 4A REALITY AUDIT — Runtime Intelligence & Reorganização Total

**Data:** 16 de Setembro de 2026  
**Auditor:** Agente Principal de Engenharia  
**Branch:** universal-translation-upgrade  
**Objetivo:** Confrontar a maturidade de runtime e a organização física do repositório OpenTranslator.

---

## 1. Avaliação do Diagnóstico Atual vs Diagnóstico Forense Profundo

| Área | Estado Atual | Limitação Identificada | Solução na Fase 4A |
| :--- | :--- | :--- | :--- |
| **Detecção de Executáveis** | Leitura de primeiros bytes e strings PE com spawn powershell | Lento e limitado a buscas textuais parciais; não extrai cabeçalho PE completo (COFF header, Optional Header, Subsystem, seções, import table). | Implementar ExecutableAnalyzer nativo em JS, lendo diretamente o cabeçalho PE (magic MZ, e_lfanew, PE signature, Machine 0x8664 vs 0x014c, Subsystem CUI vs GUI). |
| **Classificação de Erros** | Mensagens livres de exceção em string | Erros retornam 'error: e.message' sem categorização, severidade, causa raiz ou estratégia de fallback sugerida. | Criar ErrorAnalyzer e RootCauseAnalyzer estruturados com error codes (ex: OT-ENGINE-001) e ErrorRegistry. |
| **Inteligência de Logs** | Gravação em openT.log | Não há correlação entre logs de engine (Unity Player.log, Ren'Py log, crash dumps) e eventos de injeção/pipeline do OpenTranslator. | Criar LogIntelligence com correlação temporal por JobId e PID. |
| **Runtime & Super DLL** | Injeção via inject.exe legado | A ideia de uma 'super DLL única universal' não é viável para engines heterogêneas (Python VM, Mono CLR, IL2CPP C++, Chromium V8, Ruby VM). Injeção forçada de DLL errada provoca crash instantâneo. | Implementar UniversalRuntimeHost coordenando providers modulares por engine e modo Observação não invasivo. |
| **Organização do Repositório** | Documentos soltos na raiz; scripts utilitários desordenados | Raiz poluída com mais de 15 arquivos markdown e ferramentas dispersas; falta manifesto formal para binários em loaders/. | Reorganização determinística em docs/, src/, runtime/, tools/, data/ e criação de runtime/manifest.json. |

---

## 2. Decisões Técnicas Estratégicas

1. **Super DLL Universal:** Declarada tecnicamente inviável como solução única universal. A arquitetura correta é **UniversalRuntimeHost + Runtime Providers Modulares por Engine**.
2. **Organização Não-Destrutiva:** Preservar rigorosamente a integridade funcional de `package.json`, `node_modules` e compatibilidade de caminhos via `ResourceResolver`.
3. **Forensics & Observe-Only Mode:** Permitir inspeção completa e não modificadora de qualquer jogo desconhecido.
