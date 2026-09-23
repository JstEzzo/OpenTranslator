# OpenTranslator — Patch Schema Unification Audit Report
## Auditoria de Contrato de Dados entre TranslationEditorCore, TranslationPatchFormat e PatchInstaller

Em cumprimento à diretriz prioritária da **Fase 8B**, este documento formaliza a unificação estrita do contrato de dados do formato `.otpatch` (versão 3.x).

---

### 1. O RISCO AUDITADO

Anteriormente, três módulos centrais manipulavam patches de forma descompassada:
- `TranslationEditorCore.exportToOtPatch()`: Exportava metadados agrupados em `metadata: { ... }`.
- `TranslationPatchFormat.createPatch()`: Gravava propriedades como `gameId`, `gameVersion` e `targetLanguage` soltas na raiz do objeto JSON.
- `PatchInstaller.applyPatch()`: Tentava ler propriedades na raiz e realizava fallbacks variáveis.

Essa assimetria criava risco de incompatibilidade, onde patches gerados por um componente poderiam ser rejeitados ou aplicados incorretamente por outro.

---

### 2. CONTRATO CANÔNICO UNIFICADO (`TranslationPatchSchema`)

O módulo [`Tool/src/core/translationPatchSchema.js`](file:///C:/Users/Teste/Desktop/Arquivos%20Switch/OpenTranslator/Tool/src/core/translationPatchSchema.js) foi introduzido como a autoridade única do formato:

```json
{
  "otPatchVersion": "3.0",
  "metadata": {
    "patchId": "p_1790124000000",
    "gameId": "MyGame_v1",
    "gameHash": "sha256_of_executable_or_vital_asset",
    "gameVersion": "1.0.4",
    "engine": "rpgmaker_mz",
    "runtime": "v8",
    "targetLanguage": "pt-BR",
    "provider": "OpenTranslator Core",
    "createdAt": 1790124000000
  },
  "entries": [
    {
      "id": "e_001_a1b2c3",
      "location": "data/System.json",
      "original": "Start Game",
      "translation": "Iniciar jogo",
      "sourceHash": "a1b2c3d4e5f60718",
      "fileHash": "f8e7d6c5b4a3...",
      "context": "TitleMenu",
      "status": "VERIFIED"
    }
  ]
}
```

---

### 3. REGRAS DE VALIDAÇÃO ESTABELECIDAS

O validador `TranslationPatchSchema.validate(patch)` executa as seguintes verificações rigorosas:

1. **Versão do Patch**: Rejeita qualquer patch cuja versão não inicie com `3.` (ex: rejeita `2.0` ou versões malformadas).
2. **Objeto Metadata**: Exige obrigatoriamente a presença de `patchId`, `gameId` e `targetLanguage` como strings não-vazias.
3. **Coleção de Entradas**:
   - `id`: Obrigatório e único. Entradas com IDs duplicados são **rejeitadas**.
   - `location`: Caminho relativo obrigatório dentro do escopo do jogo.
   - `original` e `translation`: Strings válidas obrigatórias.
   - **Duplicatas de Texto**: Detecta e bloqueia duplicatas exatas do mesmo texto de origem no mesmo arquivo (`location + original`).
   - `sourceHash`: Se informado, valida o formato estrito de hash hexadecimal.

---

### 4. MATRIZ DE CONSUMO E EMISSÃO

| Módulo | Emissão do Schema | Consumo do Schema | Validação Integrada |
|---|:---:|:---:|:---:|
| **`TranslationPatchFormat`** | Canônico (v3.0) | Canônico (v3.0) | SIM (`TranslationPatchSchema.validate`) |
| **`TranslationEditorCore`** | Canônico (v3.0) | Canônico (v3.0) | SIM (`TranslationPatchSchema.normalize`) |
| **`PatchInstaller`** | N/A (Consumidor) | Canônico (v3.0) | SIM (Pre-flight blocking em caso de falha) |

---

### 5. RETROCOMPATIBILIDADE DETERMINÍSTICA

O método `TranslationPatchSchema.normalize(patch)` provê migração transparente para patches mais antigos com propriedades no nível raiz, encapsulando-as na estrutura canônica `metadata` sem alterar as strings originais ou traduções já aprovadas.
