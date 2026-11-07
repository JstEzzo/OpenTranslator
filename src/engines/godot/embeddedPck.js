'use strict';

const fs = require('fs');
const path = require('path');

function findEmbeddedPck(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const footer = Buffer.alloc(12);
    if (size < 52 || fs.readSync(fd, footer, 0, 12, size - 12) !== 12 ||
        footer.toString('ascii', 8) !== 'GDPC') return null;
    const length = footer.readBigUInt64LE();
    if (length < 40n || length > BigInt(size - 12)) return null;
    const offset = size - 12 - Number(length);
    const header = Buffer.alloc(20);
    if (fs.readSync(fd, header, 0, 20, offset) !== 20 ||
        header.toString('ascii', 0, 4) !== 'GDPC') return null;
    const version = header.readUInt32LE(4);
    if (version < 1 || version > 4) return null;
    const godotVersion = [8, 12, 16].map(i => header.readUInt32LE(i)).join('.');
    return { offset, version, godotVersion };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function listPacks(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter(entry =>
    entry.isFile() && (/\.pck$/i.test(entry.name) ||
      (/\.exe$/i.test(entry.name) && findEmbeddedPck(path.join(root, entry.name))))
  ).map(entry => entry.name);
}

module.exports = { findEmbeddedPck, listPacks };
