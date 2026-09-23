/**
 * OpenTranslator — UnrealLocalizationWorkflow
 * 
 * Orquestrador do fluxo oficial de localização da Unreal Engine:
 * Diferencia rigorosamente:
 * 1. SOURCE DATA: Arquivos editáveis (.po / String Tables CSV)
 * 2. COMPILED DATA: Recursos binários compilados (.locres / .locmeta)
 * 3. PACKAGED DATA: Contêineres de dados (.pak)
 * 4. RUNTIME DATA: Objetos FText instanciados na memória do processo
 */

const fs = require('fs');
const path = require('path');
const UnrealLocResProvider = require('./unrealLocResProvider');
const UnrealStringTableProvider = require('./unrealStringTableProvider');

class UnrealLocalizationWorkflow {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Compila dados de origem (PO ou CSV) no recurso binário .locres usado pelo runtime
   * @param {object} namespaces - { "Namespace": { "Key": "Texto Traduzido" } }
   * @param {string} targetLocresPath - Caminho de saída do .locres compilado
   */
  static compileSourceToLocRes(namespaces, targetLocresPath) {
    const dir = path.dirname(targetLocresPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const locresBuf = UnrealLocResProvider.buildLocRes(namespaces);
    fs.writeFileSync(targetLocresPath, locresBuf);

    return {
      stage: 'COMPILED_DATA',
      success: true,
      compiledFile: targetLocresPath,
      bytesWritten: locresBuf.length,
      stringCount: Object.values(namespaces).reduce((acc, k) => acc + Object.keys(k).length, 0)
    };
  }

  /**
   * Descompacta recurso binário .locres para dados de origem editáveis (JSON/CSV)
   * @param {string} locresPath
   */
  static decompileLocResToSource(locresPath) {
    if (!fs.existsSync(locresPath)) {
      throw new Error(`Arquivo .locres não encontrado: ${locresPath}`);
    }

    const buf = fs.readFileSync(locresPath);
    const parsed = UnrealLocResProvider.parseLocRes(buf);

    return {
      stage: 'SOURCE_DATA',
      success: true,
      sourceFile: locresPath,
      version: parsed.version,
      namespaces: parsed.namespaces,
      stringCount: parsed.count
    };
  }
}

module.exports = UnrealLocalizationWorkflow;
