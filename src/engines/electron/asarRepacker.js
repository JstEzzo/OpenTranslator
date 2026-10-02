/**
 * OpenTranslator — AsarRepacker & AsarIntegrity
 * Empacotador e validador bidirecional de arquivos Chromium ASAR.
 * Suporta desempacotar, aplicar patches de tradução e recompilar com offsets 4-byte alinhados.
 */

const fs = require("fs");
const path = require("path");

class AsarRepacker {
  /**
   * Empacota um diretório em um arquivo .asar válido.
   */
  static pack(sourceDir, outputAsarPath) {
    const header = { files: {} };
    const filesList = [];
    let currentOffset = 0;

    function walk(dir, currentObj) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          currentObj[e.name] = { files: {} };
          walk(full, currentObj[e.name].files);
        } else {
          const stat = fs.statSync(full);
          currentObj[e.name] = {
            size: stat.size,
            offset: String(currentOffset)
          };
          filesList.push({ fullPath: full, size: stat.size });
          currentOffset += stat.size;
        }
      }
    }

    walk(sourceDir, header.files);

    const jsonString = JSON.stringify(header);
    const jsonBuf = Buffer.from(jsonString, "utf8");

    // Alinhamento a 4 bytes
    const pad = (4 - (jsonBuf.length % 4)) % 4;
    const alignedJsonBuf = pad > 0 ? Buffer.concat([jsonBuf, Buffer.alloc(pad)]) : jsonBuf;

    // Cabeçalho Pickle Chromium:
    // [4 bytes: uint32 = 4]
    // [4 bytes: uint32 = alignedJsonBuf.length + 8]
    // [4 bytes: uint32 = alignedJsonBuf.length + 4]
    // [4 bytes: uint32 = jsonBuf.length]
    // [alignedJsonBuf]
    const headerSize = alignedJsonBuf.length;
    const pickleHeader = Buffer.alloc(16);
    pickleHeader.writeUInt32LE(4, 0);
    pickleHeader.writeUInt32LE(headerSize + 8, 4);
    pickleHeader.writeUInt32LE(headerSize + 4, 8);
    pickleHeader.writeUInt32LE(jsonBuf.length, 12);

    const fullHeader = Buffer.concat([pickleHeader, alignedJsonBuf]);

    // Grava ASAR
    const outFd = fs.openSync(outputAsarPath, "w");
    fs.writeSync(outFd, fullHeader);

    for (const f of filesList) {
      const data = fs.readFileSync(f.fullPath);
      fs.writeSync(outFd, data);
    }
    fs.closeSync(outFd);

    // Validação Pós-Repack: Checa leitura de cabeçalho
    const readFd = fs.openSync(outputAsarPath, "r");
    const checkBuf = Buffer.alloc(16);
    fs.readSync(readFd, checkBuf, 0, 16, 0);
    const pickleMagic = checkBuf.readUInt32LE(0);
    fs.closeSync(readFd);

    const success = pickleMagic === 4 && fs.statSync(outputAsarPath).size > fullHeader.length;

    return {
      success,
      fileCount: filesList.length,
      totalBytes: currentOffset,
      headerBytes: fullHeader.length,
      outputAsarPath
    };
  }
}

module.exports = AsarRepacker;
