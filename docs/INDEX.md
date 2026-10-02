# OpenTranslator — Catálogo Geral de Documentação

Guia unificado e índice navegável de toda a documentação técnica, operacional e histórica do **OpenTranslator**.

---

## 📦 Governança e Distribuição
- [PRODUCTION_MANIFEST.md](PRODUCTION_MANIFEST.md) — Manifesto estrito de dependências de produção para máquinas limpas.
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — Separação arquitetural entre Produto (~454 MB), Laboratório (~5.89 GB) e Arquivo.

---

## 📘 1. Documentação do Usuário (`docs/user/`)
- [USER_GUIDE.md](user/USER_GUIDE.md) — Manual do usuário, inicialização única via `OpenTranslator.exe`, motores suportados e atalhos.
- [TROUBLESHOOTING.md](user/TROUBLESHOOTING.md) — Guia de diagnóstico, resolução de portas (8080/16005), erros de permissão e procedimentos de recuperação.

---

## 🏛️ 2. Arquitetura do Sistema (`docs/architecture/`)
- [ARCHITECTURE.md](architecture/ARCHITECTURE.md) — Arquitetura de pipeline, micro-serviços e isolamento de processos.
- [TRANSLATION_ARCHITECTURE.md](architecture/TRANSLATION_ARCHITECTURE.md) — Arquitetura detalhada do pipeline de tradução.
- [TRANSLATION_MEMORY.md](architecture/TRANSLATION_MEMORY.md) — Especificação do motor de memória de tradução e cache global SQLite.
- [TRANSLATION_EDITOR.md](architecture/TRANSLATION_EDITOR.md) — Arquitetura do editor de tradução virtualizado e atalhos de teclado.
- [PATCH_SYSTEM.md](architecture/PATCH_SYSTEM.md) — Sistema de patches atômicos e integridade criptográfica SHA-256.
- [FONT_COMPATIBILITY.md](architecture/FONT_COMPATIBILITY.md) — Matriz de compatibilidade de fontes e renderização Unicode/CJK.
- [LAYOUT_VALIDATION.md](architecture/LAYOUT_VALIDATION.md) — Validação de layout, quebra de linha e prevenção de overflow.

---

## 🎮 3. Motores e Compatibilidade de Jogos (`docs/engines/`)
- [ENGINE_SUPPORT_MATRIX.md](engines/ENGINE_SUPPORT_MATRIX.md) — Matriz de compatibilidade por engine (Ren'Py, RPG Maker, Electron, Unity, Wolf, etc.).
- [ENGINE_PROVIDER_MATRIX.md](engines/ENGINE_PROVIDER_MATRIX.md) — Matriz de provedores por engine.
- [REAL_ENGINE_COVERAGE.md](engines/REAL_ENGINE_COVERAGE.md) — Cobertura real e capacidades empíricas por engine.
- [TRANSLATION_METHOD_MATRIX.md](engines/TRANSLATION_METHOD_MATRIX.md) — Métodos de tradução suportados por tecnologia de jogo.

---

## ⚡ 4. Tempo de Execução e Injeção (`docs/runtime/`)
- [RUNTIME_PROVIDER_MATRIX.md](runtime/RUNTIME_PROVIDER_MATRIX.md) — Matriz de provedores em tempo de execução.
- [REAL_RUNTIME_COVERAGE.md](runtime/REAL_RUNTIME_COVERAGE.md) — Cobertura real de runtimes suportados (IL2CPP, Mono, NW.js, etc.).
- [RUNTIME_TRANSLATION.md](runtime/RUNTIME_TRANSLATION.md) — Arquitetura de tradução em tempo real via hook (Dual Hook 16005).
- [OVERLAY_TRANSLATION.md](runtime/OVERLAY_TRANSLATION.md) — Arquitetura do overlay HUD translúcido.

---

## 🛠️ 5. Desenvolvimento e Extensões (`docs/development/`)
- [PLUGIN_SDK.md](development/PLUGIN_SDK.md) — Guia do SDK para desenvolvimento de novos adaptadores e plugins.
- [PLUGIN_API.md](development/PLUGIN_API.md) — Referência da API de plugins e contratos de interface.
- [RECOVERY.md](development/RECOVERY.md) — Procedimentos de restauração atômica e recuperação de desastres.

---

## 📊 6. Relatórios Técnicos e Auditorias Atuais (`docs/reports/` & `docs/audits/`)
- [AUDIT.md](audits/AUDIT.md) — Auditoria arquitetural inicial do projeto.
- [multi-ia-analysis.md](audits/multi-ia-analysis.md) — Análise técnica comparativa multi-IA.
- [LAB_REPORT.md](reports/LAB_REPORT.md) — Resultados empíricos de extração no laboratório real (23 jogos).
- [CLEAN_INSTALL_REPORT.md](reports/CLEAN_INSTALL_REPORT.md) — Relatório de instalação limpa e dependências de ambiente.
- [GUI_VALIDATION_REPORT.md](reports/GUI_VALIDATION_REPORT.md) — Validação consolidada de interface, WebSockets, UX e controles operacionais.
- [E2E_REAL_RESULTS.md](reports/E2E_REAL_RESULTS.md) / [E2E_TRANSLATION_RESULTS.md](reports/E2E_TRANSLATION_RESULTS.md) — Resultados de testes ponta a ponta em jogos reais.
- [SECURITY_AUDIT.md](reports/SECURITY_AUDIT.md) — Auditoria de segurança de processos e caminhos do sistema.
- [PERFORMANCE_AUDIT.md](reports/PERFORMANCE_AUDIT.md) — Auditoria de performance e gargalos.
- [GAME_COMPATIBILITY_REPORT.md](reports/GAME_COMPATIBILITY_REPORT.md) — Compatibilidade geral por engine.
- [Dossiês Forenses Individuais](reports/forensics/) — Análise forense específica por jogo.

---

## 📜 7. Histórico e Relatórios de Fases Passadas (`docs/history/`)
Documentos de fases de desenvolvimento e auditorias anteriores mantidos para preservação histórica:
- `PHASE2_AUDIT.md`, `PHASE2_RESULTS.md`
- `PHASE3_REALITY_AUDIT.md`, `PHASE3_RESULTS.md`
- `PHASE4A_REALITY_AUDIT.md`, `PHASE4A_RESULTS.md`, `PHASE4A_MIGRATION_MAP.md`
- `PHASE5B_RESULTS.md`, `PHASE5C_REALITY_AUDIT.md`
- `PHASE6_RESULTS.md`
- `PHASE7_RESULTS.md`, `PHASE7_REALITY_MATRIX.md`
- `PHASE8A_REAL_TRANSLATION_AUDIT.md`, `PHASE8B_RESULTS.md`
- `GUI_VALIDATION.md`
