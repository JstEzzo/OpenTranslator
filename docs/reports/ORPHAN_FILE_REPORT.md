# OpenTranslator — Orphan and Unreferenced File Report

Generated on: 2026-09-16T17:12:29.918Z

## Classificação de Arquivos Desconectados / Temporários

Durante a Fase 4A, foram identificados scripts de teste temporários na raiz ou pastas auxiliares que foram higienizados ou migrados para testes permanentes.

### Arquivos Temporários de Raiz Identificados para Limpeza:
- `write_*.js`: Scripts ad-hoc (limpos/movidos para scripts de manutenção)
- `patch_*.js`: Patches provisórios de desenvolvimento
- `test_*.js` dispersos: Migrados para `tests/` unificado

### Status dos Binários em `Tool/loaders/`:
- 28 binários marcados como **USED** (ativos em injeção/extração).
- 17 binários marcados como **REFERENCED** (suportados sob demanda).
- 3 binários marcados como **OPTIONAL**.
- 0 binários desconhecidos não catalogados.
