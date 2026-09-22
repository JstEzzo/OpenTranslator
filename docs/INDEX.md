# OpenTranslator — Master Documentation Index

Bem-vindo à documentação oficial do **OpenTranslator** reorganizada na Fase 4A.

---

## 1. Arquitetura do Sistema (`docs/architecture/`)
- [ARCHITECTURE.md](architecture/ARCHITECTURE.md) — Arquitetura de pipeline, micro-serviços e isolamento de processos.
- [TRANSLATION_MEMORY.md](architecture/TRANSLATION_MEMORY.md) — Especificação do motor de memória de tradução e cache global SQLite.

## 2. Auditorias e Conclusões Técnicas (`docs/audits/`)
- [PHASE4A_REALITY_AUDIT.md](audits/PHASE4A_REALITY_AUDIT.md) — Conclusão definitiva sobre Super DLL vs UniversalRuntimeHost.
- [PHASE3_REALITY_AUDIT.md](audits/PHASE3_REALITY_AUDIT.md) — Auditoria de patching real e laboratório.
- [PHASE2_AUDIT.md](audits/PHASE2_AUDIT.md) — Auditoria de endurecimento e proteção de código.
- [AUDIT.md](audits/AUDIT.md) — Auditoria inicial de arquitetura.
- [multi-ia-analysis.md](audits/multi-ia-analysis.md) — Análise técnica externa.

## 3. Relatórios de Testes e Laboratório (`docs/reports/`)
- [LAB_REPORT.md](reports/LAB_REPORT.md) / [LAB_REPORT.json](reports/LAB_REPORT.json) — Resultados de extração no laboratório real.
- [PHASE3_RESULTS.md](reports/PHASE3_RESULTS.md) — Relatório da Fase 3.
- [PHASE2_RESULTS.md](reports/PHASE2_RESULTS.md) — Relatório da Fase 2.
- [DUPLICATE_FILE_REPORT.md](reports/DUPLICATE_FILE_REPORT.md) — Mapeamento de arquivos duplicados no repositório.
- [ORPHAN_FILE_REPORT.md](reports/ORPHAN_FILE_REPORT.md) — Classificação de arquivos órfãos e manifesto de binários.

## 4. Matriz e Motores de Jogos (`docs/engines/`)
- [ENGINE_SUPPORT_MATRIX.md](engines/ENGINE_SUPPORT_MATRIX.md) — Matriz de compatibilidade por engine (Ren'Py, RPG Maker, Electron, Unity, Wolf, etc.).

## 5. Guias de Desenvolvimento e Recuperação (`docs/development/`)
- [PHASE4A_MIGRATION_MAP.md](development/PHASE4A_MIGRATION_MAP.md) — Mapa de migração da Fase 4A.
- [PLUGIN_API.md](development/PLUGIN_API.md) — Guia de desenvolvimento de adaptadores e plugins.
- [RECOVERY.md](development/RECOVERY.md) — Procedimentos de restauração atômica e recuperação de desastres.

## 6. Binários e Manifestos (`Tool/loaders/`)
- [manifest.json](../Tool/loaders/manifest.json) — Catálogo detalhado dos 48 binários e hooks nativos.
