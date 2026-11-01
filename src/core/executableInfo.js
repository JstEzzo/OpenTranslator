"use strict";
const fs = require("fs");
// A bit count alone cannot distinguish ARM64 from AMD64.
function readExecutableInfo(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const size = fs.fstatSync(fd).size;
    const header = Buffer.alloc(64);
    if (fs.readSync(fd, header, 0, 64, 0) !== 64 || header.readUInt16LE(0) !== 0x5a4d) return null;
    const offset = header.readUInt32LE(60);
    if (offset < 64 || offset > size - 6) return null;
    const pe = Buffer.alloc(6);
    if (fs.readSync(fd, pe, 0, 6, offset) !== 6 || pe.readUInt32LE(0) !== 0x4550) return null;
    return { 332: { architecture: "x86", bits: 32 }, 34404: { architecture: "x64", bits: 64 },
      43620: { architecture: "arm64", bits: 64 } }[pe.readUInt16LE(4)] || null;
  } catch (_) { return null; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function executableBits(file) {
  const info = readExecutableInfo(file);
  return info && info.architecture !== "arm64" ? info.bits : null;
}
module.exports = { readExecutableInfo, executableBits };
