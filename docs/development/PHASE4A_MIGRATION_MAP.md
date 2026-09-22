# OpenTranslator — Mapa de Migração e Reorganização (Fase 4A)

---

## 1. Mapeamento de Arquivos da Raiz para docs/

| Caminho Original | Novo Caminho Destino | Categoria | Motivo |
| :--- | :--- | :--- | :--- |
| `ARCHITECTURE.md` | `docs/architecture/ARCHITECTURE.md` | Arquitetura | Centralizar documentação arquitetural |
| `PLUGIN_API.md` | `docs/architecture/PLUGIN_API.md` | Arquitetura | Especificação de API para adaptadores |
| `TRANSLATION_MEMORY.md` | `docs/architecture/TRANSLATION_MEMORY.md` | Arquitetura | Especificação da TM 2.0 |
| `RECOVERY.md` | `docs/architecture/RECOVERY.md` | Arquitetura | Protocolo de recuperação e integridade |
| `AUDIT.md` | `docs/audits/AUDIT.md` | Auditoria | Auditoria inicial da Fase 1 |
| `PHASE2_AUDIT.md` | `docs/audits/PHASE2_AUDIT.md` | Auditoria | Auditoria de integração da Fase 2 |
| `PHASE3_REALITY_AUDIT.md` | `docs/audits/PHASE3_REALITY_AUDIT.md` | Auditoria | Auditoria de realidade da Fase 3 |
| `PHASE4A_REALITY_AUDIT.md` | `docs/audits/PHASE4A_REALITY_AUDIT.md` | Auditoria | Auditoria da Fase 4A |
| `PHASE2_RESULTS.md` | `docs/reports/PHASE2_RESULTS.md` | Relatório | Resultados consolidados da Fase 2 |
| `PHASE3_RESULTS.md` | `docs/reports/PHASE3_RESULTS.md` | Relatório | Resultados consolidados da Fase 3 |
| `LAB_REPORT.md` | `docs/reports/LAB_REPORT.md` | Relatório | Relatório de varredura do laboratório |
| `LAB_REPORT.json` | `docs/reports/LAB_REPORT.json` | Relatório | Dados estruturados do laboratório |
| `multi-ia-analysis.md` | `docs/reports/multi-ia-analysis.md` | Relatório | Análise comparativa |
| `ENGINE_SUPPORT_MATRIX.md` | `docs/engines/ENGINE_SUPPORT_MATRIX.md` | Engines | Matriz de compatibilidade |

---

## 2. Arquivos Mantidos na Raiz do Repositório

- `README.md` (Atualizado com índice de navegação para `docs/INDEX.md`)
- `LICENSE`
- `CHANGELOG.md`
- `.gitignore`
- `OpenTranslator.bat` (Launcher principal do usuário)
- `OpenTranslator_debug.bat` (Launcher de depuração)
