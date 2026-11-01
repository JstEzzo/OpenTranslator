"use strict";
const fs = require("fs");
const path = require("path");
class AsarUtil {
  static readHeader(file) {
    const fd = fs.openSync(file, "r");
    try {
      const size = fs.fstatSync(fd).size;
      const prefix = Buffer.alloc(16);
      if (fs.readSync(fd, prefix, 0, 16, 0) !== 16 || prefix.readUInt32LE(0) !== 4) throw new Error("ASAR: cabeçalho inválido");
      const headerSize = prefix.readUInt32LE(4);
      const jsonSize = prefix.readUInt32LE(12);
      if (headerSize < 8 || headerSize % 4 !== 0 || headerSize > 64 * 1024 * 1024 || jsonSize > headerSize - 8 || 8 + headerSize > size) throw new Error("ASAR: tamanho de cabeçalho inválido");
      const json = Buffer.alloc(jsonSize);
      if (fs.readSync(fd, json, 0, jsonSize, 16) !== jsonSize) throw new Error("ASAR: cabeçalho truncado");
      const header = JSON.parse(json.toString("utf8"));
      if (!header.files || typeof header.files !== "object") throw new Error("ASAR: diretório ausente");
      return { headerSize: 8 + headerSize, dataOffset: 8 + headerSize, filesTree: header.files };
    } finally { fs.closeSync(fd); }
  }
  static extractTextFiles(file, destination, extensions = [".json", ".js", ".html", ".csv", ".txt", ".ts"]) {
    return AsarUtil._extract(file, destination, extensions);
  }
  static extractAll(file, destination) { return AsarUtil._extract(file, destination, null); }
  static _extract(file, destination, extensions) {
    const { dataOffset, filesTree } = AsarUtil.readHeader(file);
    const root = path.resolve(destination);
    const fd = fs.openSync(file, "r");
    const extracted = [];
    try {
      const archiveSize = fs.fstatSync(fd).size;
      const walk = (tree, parent = "") => {
        for (const [name, info] of Object.entries(tree)) {
          if (!name || name === "." || name === ".." || /[\\/:]/.test(name)) throw new Error("ASAR: nome de arquivo inválido");
          const relative = path.join(parent, name);
          if (info.files) { walk(info.files, relative); continue; }
          if (extensions && !extensions.includes(path.extname(name).toLowerCase())) continue;
          if (info.link || info.unpacked || (!extensions && info.integrity)) throw new Error("ASAR: links, arquivos externos ou integridade assinada requerem um perfil específico");
          const size = info.size;
          const offset = Number(info.offset);
          if (!Number.isSafeInteger(size) || size < 0 || !Number.isSafeInteger(offset) || offset < 0 || size > archiveSize - dataOffset - offset) throw new Error("ASAR: arquivo fora dos limites do pacote");
          const target = path.resolve(root, relative);
          if (!target.startsWith(root + path.sep)) throw new Error("ASAR: caminho fora do destino");
          const bytes = Buffer.alloc(size);
          if (fs.readSync(fd, bytes, 0, size, dataOffset + offset) !== size) throw new Error("ASAR: conteúdo truncado");
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, bytes);
          extracted.push(target);
        }
      };
      walk(filesTree);
      return extracted;
    } finally { fs.closeSync(fd); }
  }
}
module.exports = AsarUtil;
