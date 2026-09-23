# OpenTranslator — Security & Integrity Audit Report
## Defesa Contra Path Traversal, Gravação Atômica, Transaction Journal e Limites de Processo

A **Fase 8B** implementou uma blindagem de segurança robusta em todas as rotinas que interagem com o sistema de arquivos e processos do sistema operacional.

---

### 1. DEFESA CONTRA PATH TRAVERSAL (`_sanitizeAndResolvePath`)

Para impedir que arquivos maliciosos ou patches adulterados sobrescrevam diretórios vitais do sistema operacional ou dados fora do jogo:

- **Bloqueio de Caminhos Absolutos**: Entradas apontando para caminhos como `C:\Windows\...` ou `/etc/...` são imediatamente rejeitadas.
- **Bloqueio de Caminhos UNC / Dispositivo**: Entradas com prefixos de rede (`\\server\share`) ou dispositivos (`\\.\`) são terminantemente bloqueadas.
- **Resolução Normalizada de Raiz**:
  ```javascript
  const realGameRoot = path.resolve(gameDir);
  const resolvedPath = path.resolve(realGameRoot, relativePath);
  if (!resolvedPath.startsWith(realGameRoot + path.sep) && resolvedPath !== realGameRoot) {
    throw new Error(`PATH_TRAVERSAL_DETECTED: Tentativa de escapar da raiz: [${relativePath}]`);
  }
  ```
- **Resultado Comprovado**: Teste unitário e de integração em `run-phase8b-tests.js` confirma que qualquer tentativa de fuga (ex: `../../evil.json`) é bloqueada sem tocar no disco.

---

### 2. GRAVAÇÃO ATÔMICA INDUSTRIAL (`_atomicWriteFileSync`)

Para eliminar o risco de deixar arquivos corrompidos ou gravados pela metade (*half-written files*) caso o jogo seja fechado ou ocorra queda de energia durante a tradução:

1. **Arquivo Temporário Único**: Gravação em `.tmp_[timestamp]_[random]` no mesmo diretório de destino.
2. **Descarga Física em Disco (`fsync`)**: Utiliza `fs.fsyncSync(fd)` garantindo que o buffer do sistema operacional seja fisicamente gravado no disco magnético/SSD antes do fechamento.
3. **Limpeza Garantida em Falha**: Blocos `catch` e `finally` removem o arquivo temporário imediatamente se ocorrer qualquer erro de I/O antes da substituição.
4. **Renomeação Atômica**: A substituição do arquivo original pelo novo conteúdo ocorre através de `fs.renameSync()`, uma operação atômica a nível de sistema operacional no Windows (NTFS) e Linux.

---

### 3. JOURNAL DE TRANSAÇÃO (`TransactionJournal`)

Todas as operações de patch e modificação são registradas com ciclo de vida rastreável:

$$\text{START} \longrightarrow \text{BACKUP} \longrightarrow \text{COMMITTING} \longrightarrow \text{WRITE} \longrightarrow \text{VERIFY} \longrightarrow \text{COMMITTED}$$

- Se o OpenTranslator for reiniciado e detectar transações pendentes no estado `staged` ou `committing`, o `TransactionJournal.listUnfinished()` identifica a transação interrompida e aciona o rollback imediato através do backup prévio.

---

### 4. ISOLAMENTO E PROPRIEDADE DE PROCESSOS (PROCESS OWNERSHIP)

Em conformidade estrita com o princípio da não-interferência destrutiva:
- O OpenTranslator **somente encerra processos instanciados por ele próprio** através da classe `OwnedProcess`.
- É **proibida a execução de comandos genéricos de finalização forçada** como `taskkill /F /IM game.exe`. Processos externos abertos pelo usuário continuam sob controle exclusivo do usuário ou do sistema operacional.
