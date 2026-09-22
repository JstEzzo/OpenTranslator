# OpenTranslator — Plugin & Adapter API

**Versão:** 2.0  
**Padrão:** BaseEngineAdapter Specification

---

## 1. Criando um Novo Adapter de Engine

Todos os adaptadores devem herdar de `BaseEngineAdapter` (`Tool/src/core/baseEngineAdapter.js`):

```javascript
const BaseEngineAdapter = require('../../core/baseEngineAdapter');

class CustomEngineAdapter extends BaseEngineAdapter {
  constructor() {
    super('custom_engine_id', 'Nome Amigável da Engine');
  }

  getCapabilities(gameDir, exePath) {
    return {
      staticFiles: true,         // Permite modificar arquivos estáticos
      nativeLocalization: false, // Suporte a pastas tl nativas
      archives: false,           // Manipulação de arquivos empacotados
      runtimeHook: false,        // Injeção de DLL / Hook em runtime
      dom: false,                // Inspeção de DOM (Electron)
      ocr: true,                 // Suporte a OCR
      backupSupported: true      // Backup/Rollback suportado
    };
  }

  async extract(gameDir, options = {}) {
    // Retorna lista de textos encontrados
    return {
      success: true,
      texts: [
        { id: 0, original: "Texto original", clean: "Texto original", file: "data.txt" }
      ],
      count: 1
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    // Grava traduções no disco
    return { success: true, count: 1, modifiedFiles: ["data.txt"] };
  }

  async rollback(gameDir, options = {}) {
    // Restaura arquivos de backup
    return { success: true, restoredFiles: ["data.txt"] };
  }
}

module.exports = CustomEngineAdapter;
```

---

## 2. Registro no EngineRegistry

Para registrar um adapter:

```javascript
const defaultRegistry = require('./core/engineRegistry');
const CustomAdapter = require('./engines/custom/customAdapter');

defaultRegistry.register(new CustomAdapter());
```
