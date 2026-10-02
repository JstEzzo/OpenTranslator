# OpenTranslator — Catálogo Geral de Documentação

Guia unificado e índice navegável de toda a documentação técnica, operacional e histórica do **OpenTranslator**.

---

## 📦 Governança e Arquitetura
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — Topologia e governança de diretórios consolidada (separação Produto, Laboratório, Histórico).
- [PRODUCTION_MANIFEST.md](PRODUCTION_MANIFEST.md) — Manifesto estrito de dependências de produção para máquinas limpas.

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

## 📊 6. Relatórios Técnicos e Auditorias Consolidadas (`docs/reports/`)
- [OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.md](reports/OPEN_TRANSLATOR_REAL_UI_CERTIFICATION.md) — Certificação forense da matriz de 21 jogos reais.
- [OPEN_TRANSLATOR_REAL_GAME_AUDIT.md](reports/OPEN_TRANSLATOR_REAL_GAME_AUDIT.md) — Auditoria profunda por jogo da biblioteca real.
- [OPEN_TRANSLATOR_HARDENING_FINAL_REPORT.md](reports/OPEN_TRANSLATOR_HARDENING_FINAL_REPORT.md) — Relatório de hardening de segurança, isolamento e paths.
- [REN_PY_INTEGRATION_REPORT.md](reports/REN_PY_INTEGRATION_REPORT.md) — Relatório completo de integração e certificação de Ren'Py.
- [RPG_MAKER_MZ_COMPARISON.md](reports/RPG_MAKER_MZ_COMPARISON.md) — Comparativo técnico de RPG Maker MZ.
- [RPG_MAKER_MV_COMPARISON.md](reports/RPG_MAKER_MV_COMPARISON.md) — Comparativo técnico de RPG Maker MV.
- [OPEN_TRANSLATOR_EVIDENCE_INDEX.md](reports/OPEN_TRANSLATOR_EVIDENCE_INDEX.md) — Índice de evidências de testes em jogos reais.
