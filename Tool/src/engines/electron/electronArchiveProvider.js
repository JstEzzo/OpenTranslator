/**
 * OpenTranslator — ElectronArchiveProvider
 * 
 * Sistema de Arquivo Virtual para pacotes ASAR do Electron:
 * - Lê cabeçalho JSON do ASAR sem extrair o arquivo inteiro para o disco
 * - Acessa qualquer arquivo específico usando byte offset e tamanho
 * - Suporta leitura seletiva de package.json, HTML, JS e JSONs de localização
 * - Reduz o consumo de RAM e I/O de disco para pacotes gigabytes
 */

const fs = require('fs');
const path = require('path');

class ElectronArchiveProvider {
  constructor(asarPath) {
    this.asarPath = asarPath;
    this.header = null;
    this.headerSize = 0;
    this.baseOffset = 0;
    this.fd = null;
  }

  /**
   * Abre o arquivo ASAR e decodifica o cabeçalho virtual
   */
  open() {
    if (!fs.existsSync(this.asarPath)) {
      throw new Error(`Arquivo ASAR não encontrado: ${this.asarPath}`);
    }

    this.fd = fs.openSync(this.asarPath, 'r');

    // Lê o cabeçalho pickle de 16 bytes
    const pickleHeader = Buffer.alloc(16);
    fs.readSync(this.fd, pickleHeader, 0, 16, 0);

    // O tamanho do cabeçalho está no offset 12 (uint32 LE)
    const headerJsonLen = pickleHeader.readUInt32LE(12);
    const headerBuf = Buffer.alloc(headerJsonLen);
    fs.readSync(this.fd, headerBuf, 0, headerJsonLen, 16);

    this.header = JSON.parse(headerBuf.toString('utf8'));
    this.headerSize = pickleHeader.readUInt32LE(4);
    // Base de início dos dados dos arquivos (geralmente headerSize + 8 ou alinhado)
    this.baseOffset = 16 + headerJsonLen;
    // Ajuste de alinhamento de 4 bytes se necessário
    const rem = this.baseOffset % 4;
    if (rem !== 0) {
      this.baseOffset += (4 - rem);
    }
  }

  /**
   * Fecha o descritor de arquivo aberto
   */
  close() {
    if (this.fd !== null) {
      try {
        fs.closeSync(this.fd);
      } catch (e) {}
      this.fd = null;
    }
  }

  /**
   * Lista todos os caminhos de arquivos contidos no ASAR
   */
  listFiles() {
    if (!this.header) this.open();

    const fileList = [];
    const traverse = (node, curPath = '') => {
      if (node.files) {
        for (const [name, child] of Object.entries(node.files)) {
          const subPath = curPath ? `${curPath}/${name}` : name;
          traverse(child, subPath);
        }
      } else if (node.size !== undefined) {
        fileList.push({
          path: curPath,
          size: node.size,
          offset: node.offset !== undefined ? Number(node.offset) : 0
        });
      }
    };

    traverse(this.header);
    return fileList;
  }

  /**
   * Lê o conteúdo de um arquivo específico dentro do ASAR sem extrair outros arquivos
   */
  readFile(relativePath) {
    if (!this.header) this.open();

    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\//, '');
    const parts = normalizedPath.split('/');
    let cur = this.header;

    for (const part of parts) {
      if (!cur || !cur.files || !cur.files[part]) {
        throw new Error(`Arquivo não encontrado dentro do ASAR: ${relativePath}`);
      }
      cur = cur.files[part];
    }

    if (cur.size === undefined || cur.offset === undefined) {
      throw new Error(`Caminho não é um arquivo regular no ASAR: ${relativePath}`);
    }

    const size = cur.size;
    const fileOffset = this.baseOffset + Number(cur.offset);

    const buf = Buffer.alloc(size);
    fs.readSync(this.fd, buf, 0, size, fileOffset);
    return buf;
  }

  /**
   * Lê um arquivo de texto específico codificado em UTF-8
   */
  readTextFile(relativePath) {
    const buf = this.readFile(relativePath);
    return buf.toString('utf8');
  }
}

module.exports = ElectronArchiveProvider;
