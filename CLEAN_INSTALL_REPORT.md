# OpenTranslator — Clean Install & Portability Audit Report
## Simulação de Instalação Limpa, Modo Portátil e Higienização de Rastros

Este relatório atesta a portabilidade do OpenTranslator, a ausência de acoplamento a ambientes de desenvolvimento e a integridade de instalação em qualquer máquina com Windows 10/11 x64.

---

### 1. AUDITORIA DE PORTABILIDADE E CAMINHOS RELATIVOS

- **Zero Dependência de Pastas Fixas**:
  - Todos os módulos internos utilizam `path.resolve(__dirname, ...)` para resolução determinística de diretórios de recursos, dados, cache e extensões.
  - O código do OpenTranslator **não contém referências fixas codificadas (*hardcoded*)** a caminhos como `C:\Users\Teste\...` no núcleo de execução.
  - A pasta raiz pode ser renomeada, movida para outro disco (ex: `D:\Games\OpenTranslator` ou pendrive USB) mantendo 100% de funcionalidade operacional.

---

### 2. ESTRUTURA DO MODO PORTÁTIL (PORTABLE STANDALONE)

O OpenTranslator é concebido para operar de forma autossuficiente:
- **Executáveis de Inicialização**:
  - `OpenTranslator.bat`: Script de inicialização automática que detecta o ambiente Node.js ou runtime portátil empacotado.
  - `OpenTranslator.vbs`: Inicializador silencioso para segundo plano (sem janela preta de console desnecessária).
- **Diretórios de Dados Relativos**:
  - `Tool/data/cache/`: Armazenamento de cache multinível em disco.
  - `Tool/data/sessions/`: Sessões ativas e perfis persistentes de jogos.
  - `Tool/data/backups/`: Backups pré-instalação com hashes de verificação.
  - `Tool/resources/`: Utilitários nativos e bridges locais (`NotoSans`, `renpy`, `rpgmaker`).

---

### 3. HIGIENIZAÇÃO DE ARTEFATOS E RASTROS DE DESENVOLVIMENTO

- **Varredura `repoLint`**:
  - O utilitário `Tool/src/tools/repoLint.js` foi executado e confirmou **zero arquivos soltos indevidos na raiz**.
  - Documentação técnica e relatórios de auditoria organizados em `docs/` e arquivos markdown oficiais na raiz.
  - Diretórios temporários de staging (`Tool/data/staging/`) são automaticamente purgados após a execução dos testes e fluxos de laboratório.

---

### 4. REQUISITOS MÍNIMOS DE EXECUÇÃO EM MÁQUINA DO USUÁRIO

| Requisito | Mínimo Recomendado |
|---|---|
| **Sistema Operacional** | Windows 10 / Windows 11 (64-bit) |
| **Memória RAM** | 512 MB livres (núcleo ultra leve e sem modelos pesados de IA embutidos) |
| **Armazenamento** | 250 MB livres em disco |
| **Portas de Rede Local** | 8080 (Painel Web do Usuário) e 16005 (Dual Hook IPC) |
