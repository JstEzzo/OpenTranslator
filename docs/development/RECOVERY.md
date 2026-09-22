# OpenTranslator — Mecanismos de Recuperação e Integridade

**Versão:** 2.0  
**Data:** 16 de Setembro de 2026

---

## 1. Princípio da Não-Destrutividade

O OpenTranslator adota o princípio de integridade transacional:
- **Nenhum arquivo do jogo original é modificado sem backup verificado.**
- Se qualquer etapa do pipeline falhar, o estado anterior é restaurado de forma imediata e transparente.

---

## 2. Estrutura de Backup & Rollback

O `BackupManager` (`Tool/src/core/backupManager.js`) opera através de metadados transacionais:

1. **Pasta de Backup**: Cada jogo possui uma pasta isolada (ex.: `.opent_backup/` ou `tl/pt_BR/`).
2. **Metadata com SHA-256**: Cada arquivo em backup registra seu caminho relativo, tamanho em bytes e hash SHA-256 original.
3. **Restauração Segura**:
   - Ao executar `rollback`, o sistema compara os arquivos atuais com os hashes do backup.
   - Os arquivos modificados são sobrescritos com as cópias originais íntegras.
   - Arquivos criados exclusivamente pela tradução são removidos com segurança.

---

## 3. Tratamento de Locks de Arquivo (Windows)

No Windows, processos em execução mantêm locks exclusivos sobre executáveis e arquivos de dados.
- O OpenTranslator detecta erros de compartilhamento (`EBUSY`, `EPERM`, `sharing violation`).
- Quando um lock é detectado, a aplicação informa ao usuário qual arquivo está ocupado sem matar processos arbitrariamente.
