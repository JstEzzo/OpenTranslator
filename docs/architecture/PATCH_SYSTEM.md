# OpenTranslator — Translation Patch 2.0 System (`.otpatch`)
## Especificação do Formato, Instalador Seguro, Assinatura e Ciclo de Vida

O formato `.otpatch` (versão 3.0) é o padrão oficial do OpenTranslator para distribuição autônoma e segura de traduções de jogos.

---

### 1. ESTRUTURA DO ARQUIVO `.otpatch`

O arquivo é empacotado como um documento JSON estruturado contendo metadados de integridade e regras de compatibilidade:

```json
{
  "otPatchVersion": "3.0",
  "metadata": {
    "patchId": "uuid-v4",
    "createdAt": 1790119200000,
    "author": "Comunidade OpenTranslator",
    "targetLanguage": "pt-BR",
    "sourceLanguage": "ja"
  },
  "compatibility": {
    "gameId": "GameIdentifier_v1",
    "gameHash": "sha256_of_executable_or_vital_asset",
    "gameVersion": "1.0.4",
    "engine": "rpgmaker_mz",
    "minimumOpenTranslatorVersion": "7.0.0"
  },
  "qualityGate": {
    "placeholdersValidated": true,
    "escapeCodesProtected": true,
    "fontRuleAttached": true
  },
  "rules": {
    "font": {
      "family": "Noto Sans CJK",
      "scale": 1.0,
      "fallback": "unifont"
    },
    "layout": {
      "autoResize": true,
      "wrap": true
    }
  },
  "entries": [
    {
      "id": "entry_001",
      "location": "data/System.json",
      "original": "Start",
      "translation": "Iniciar",
      "sourceHash": "a1b2c3d4e5f6...",
      "context": "TitleScreen"
    }
  ],
  "signature": {
    "integrityHash": "sha256_hash_of_all_entries",
    "signed": true
  }
}
```

---

### 2. FLUXO DO PATCH INSTALLER (PROTEÇÃO ATÔMICA)

O `PatchInstaller` executa um protocolo rigoroso de 7 passos antes de gravar qualquer byte no disco do jogo:

```
[ ABRIR PATCH ]
       ↓
[ VERIFICAR GAME ID ] -------- Incompatível? --------> [ BLOQUEAR INSTALAÇÃO ]
       ↓
[ VERIFICAR VERSÃO ] --------- Incompatível? --------> [ BLOQUEAR: "PATCH BUILT FOR DIFFERENT VERSION" ]
       ↓
[ PREVIEW DAS ALTERAÇÕES ] (Mostra arquivos e strings afetadas)
       ↓
[ BACKUP PRÉVIO ATÔMICO ] (Grava cópia dos arquivos originais)
       ↓
[ APLICAR ALTERAÇÕES ] (Gravação segura via arquivos temporários e flush)
       ↓
[ VERIFICAÇÃO PÓS-INSTALAÇÃO ] (Confirmação de integridade)
```

> [!CAUTION]
> Se o hash da versão do jogo for incompatível com o cabeçalho do patch, a instalação é **terminantemente bloqueada**. O instalador nunca aplica alterações silenciosamente em versões não suportadas para evitar corrupção dos dados do jogador.

---

### 3. MIGRAÇÃO E ATUALIZAÇÃO DO JOGO (v1 -> v2)

Quando o desenvolvedor do jogo lança uma atualização de versão:
1. O OpenTranslator detecta a divergência via `GameProfile.checkVersionDrift()`.
2. As strings são reanalisadas e classificadas em 4 estados:
   - **`UNCHANGED`**: Strings idênticas nas duas versões têm suas traduções preservadas instantaneamente.
   - **`CHANGED`**: Strings com pequenas alterações contextuais são marcadas para revisão humana no Translation Editor.
   - **`NEW`**: Strings inéditas introduzidas na nova versão são enfileiradas para tradução.
   - **`OBSOLETE`**: Strings que não existem mais na nova versão são arquivadas sem poluir o catálogo ativo.
3. Nenhuma tradução válida anteriormente aprovada é perdida durante o processo de migração.

---

### 4. REVERSÃO TOTAL (ROLLBACK)

Todo patch instalado pelo OpenTranslator gera um identificador único de backup no diretório `.ot_patch_bk/`. 
A qualquer momento, o usuário pode clicar em **"Reverter Tradução"**, acionando a restauração atômica byte-a-byte que devolve o jogo ao seu estado original de fábrica com verificação SHA-256.
