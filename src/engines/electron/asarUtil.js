/**
 * OpenTranslator — AsarUtil
 * Leitor e extrator nativo de pacotes Electron (.asar) sem dependências externas.
 * Implementa a especificação oficial do Chromium/Electron ASAR Archive.
 */

const fs = require("fs");
const path = require("path");

class AsarUtil {
  /**
   * Lê o diretório e metadados de um arquivo .asar.
   * @param {string} asarPath
   * @returns {{ headerSize: number, dataOffset: number, filesTree: object }}
   */
  static readHeader(asarPath) {
    const fd = fs.openSync(asarPath, "r");
    const bufSize = 16;
    const headerBuf = Buffer.alloc(bufSize);
    fs.readSync(fd, headerBuf, 0, bufSize, 0);

    // Formato Pickle do Chromium:
    // [0-3]: tamanho do pickle (geralmente 4)
    // [4-7]: tamanho do payload do header
    // [8-11]: tamanho do cabeçalho pickle de dados
    // [12-15]: tamanho da string JSON do cabeçalho
    const jsonLen = headerBuf.readUInt32LE(12);
    const jsonBuf = Buffer.alloc(jsonLen);
    fs.readSync(fd, jsonBuf, 0, jsonLen, 16);
    fs.closeSync(fd);

    const jsonStr = jsonBuf.toString("utf8");
    const filesTree = JSON.parse(jsonStr);
    const dataOffset = 16 + jsonLen;

    return {
      headerSize: 16 + jsonLen,
      dataOffset,
      filesTree: filesTree.files || {}
    };
  }

  /**
   * Extrai arquivos de texto (.json, .js, .html) do arquivo .asar para um diretório de destino.
   * @param {string} asarPath
   * @param {string} destDir
   * @param {Array<string>} textExtensions
   */
  static extractTextFiles(asarPath, destDir, textExtensions = [".json", ".js", ".html", ".csv", ".txt", ".ts"]) {
    const { dataOffset, filesTree } = AsarUtil.readHeader(asarPath);
    const fd = fs.openSync(asarPath, "r");
    const extractedFiles = [];

    function traverse(node, curPath) {
      for (const [name, info] of Object.entries(node)) {
        const fullRel = curPath ? `${curPath}/${name}` : name;
        if (info.files) {
          traverse(info.files, fullRel);
        } else if (info.size !== undefined && info.offset !== undefined) {
          const ext = path.extname(name).toLowerCase();
          if (textExtensions.includes(ext)) {
            const fileOffset = dataOffset + parseInt(info.offset, 10);
            const fileSize = info.size;
            const fileBuf = Buffer.alloc(fileSize);
            fs.readSync(fd, fileBuf, 0, fileSize, fileOffset);

            const destFile = path.join(destDir, fullRel);
            const targetDir = path.dirname(destFile);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(destFile, fileBuf);
            extractedFiles.push(destFile);
          }
        }
      }
    }

    traverse(filesTree, "");
    fs.closeSync(fd);
    return extractedFiles;
  }

  /**
   * Extrai TODOS os arquivos de um pacote .asar (essencial para reconstrução/repack fiel).
   * @param {string} asarPath
   * @param {string} destDir
   * @returns {Array<string>} Lista de caminhos completos dos arquivos extraídos
   */
  static extractAll(asarPath, destDir) {
    const { dataOffset, filesTree } = AsarUtil.readHeader(asarPath);
    const fd = fs.openSync(asarPath, "r");
    const extractedFiles = [];

    function traverse(node, curPath) {
      for (const [name, info] of Object.entries(node)) {
        const fullRel = curPath ? `${curPath}/${name}` : name;
        if (info.files) {
          traverse(info.files, fullRel);
        } else if (info.size !== undefined && info.offset !== undefined) {
          const fileOffset = dataOffset + parseInt(info.offset, 10);
          const fileSize = info.size;
          const fileBuf = Buffer.alloc(fileSize);
          fs.readSync(fd, fileBuf, 0, fileSize, fileOffset);

          const destFile = path.join(destDir, fullRel);
          const targetDir = path.dirname(destFile);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(destFile, fileBuf);
          extractedFiles.push(destFile);
        }
      }
    }

    traverse(filesTree, "");
    fs.closeSync(fd);
    return extractedFiles;
  }
}

module.exports = AsarUtil;
