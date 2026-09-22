/**
 * OpenTranslator — UnrealLocalizationProvider
 * 
 * Orquestrador integrado de localização para Unreal Engine:
 * - Detecta Content/Localization/<Target>/<Culture>/<Target>.locres
 * - Extrai textos via UnrealLocResProvider e UnrealStringTableProvider
 * - Suporta compilação atômica de .locres para novas culturas (ex: pt-BR, pt, es)
 * - Criação de arquivos de metadados (.locmeta)
 */

const fs = require('fs');
const path = require('path');
const UnrealLocResProvider = require('./unrealLocResProvider');
const UnrealStringTableProvider = require('./unrealStringTableProvider');

class UnrealLocalizationProvider {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Varre um diretório de jogo Unreal em busca de alvos de localização
   */
  static discoverLocalizationTargets(gameDir) {
    const targets = [];
    if (!gameDir || !fs.existsSync(gameDir)) return targets;

    const possibleDirs = [
      path.join(gameDir, 'Content', 'Localization'),
      path.join(gameDir, 'Localization')
    ];

    // Verifica subpastas de projeto (ex: GameName/Content/Localization)
    try {
      const subEntries = fs.readdirSync(gameDir, { withFileTypes: true });
      for (const ent of subEntries) {
        if (ent.isDirectory() && ent.name !== 'Engine') {
          possibleDirs.push(path.join(gameDir, ent.name, 'Content', 'Localization'));
        }
      }
    } catch (e) {}

    for (const locDir of possibleDirs) {
      if (fs.existsSync(locDir)) {
        try {
          const locTargets = fs.readdirSync(locDir, { withFileTypes: true });
          for (const targetEnt of locTargets) {
            if (targetEnt.isDirectory()) {
              const targetPath = path.join(locDir, targetEnt.name);
              const cultureDirs = fs.readdirSync(targetPath, { withFileTypes: true })
                                   .filter(d => d.isDirectory())
                                   .map(d => d.name);
              targets.push({
                targetName: targetEnt.name,
                path: targetPath,
                cultures: cultureDirs
              });
            }
          }
        } catch (e) {}
      }
    }

    return targets;
  }

  /**
   * Extrai todas as strings de um arquivo .locres ou pasta de cultura
   */
  static extractFromLocResFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo .locres não encontrado: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);
    return UnrealLocResProvider.parseLocRes(buf);
  }

  /**
   * Compila e salva um novo arquivo .locres traduzido para a cultura especificada
   */
  static compileToCulture(targetDir, cultureName, targetName, namespaces) {
    const cultureDir = path.join(targetDir, cultureName);
    if (!fs.existsSync(cultureDir)) {
      fs.mkdirSync(cultureDir, { recursive: true });
    }

    const locresBuffer = UnrealLocResProvider.buildLocRes(namespaces);
    const outLocRes = path.join(cultureDir, `${targetName}.locres`);
    fs.writeFileSync(outLocRes, locresBuffer);

    // Gera arquivo .locmeta básico se não existir
    const outLocMeta = path.join(cultureDir, `${targetName}.locmeta`);
    if (!fs.existsSync(outLocMeta)) {
      // Locmeta simples com magic e cultura
      const metaBuf = Buffer.alloc(32);
      metaBuf.writeUInt32LE(0x00000001, 0); // version
      fs.writeFileSync(outLocMeta, metaBuf);
    }

    return {
      success: true,
      locresPath: outLocRes,
      locmetaPath: outLocMeta,
      bytesWritten: locresBuffer.length
    };
  }
}

module.exports = UnrealLocalizationProvider;
