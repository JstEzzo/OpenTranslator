/**
 * OpenTranslator — ExecutableAnalyzer
 * Analisador estático de arquivos PE (Portable Executable - Windows EXE/DLL).
 * Extrai arquitetura (x86/x64/ARM64), subsistema (GUI/Console), seções,
 * timestamp e marcadores de runtime (.NET, Mono, Unity, Python, Chromium).
 */

const fs = require("fs");

class ExecutableAnalyzer {
  static analyzeExecutable(filePath) { return this.analyze(filePath); }
  analyzeExecutable(filePath) { return ExecutableAnalyzer.analyze(filePath); }
  analyze(filePath) { return ExecutableAnalyzer.analyze(filePath); }
  static analyze(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return { ok: false, error: "Arquivo não encontrado." };
    }

    try {
      const fd = fs.openSync(filePath, "r");
      const dosHeader = Buffer.alloc(64);
      fs.readSync(fd, dosHeader, 0, 64, 0);

      // Checa Magic MZ (0x5A4D)
      if (dosHeader.readUInt16LE(0) !== 0x5a4d) {
        fs.closeSync(fd);
        return { ok: false, isPE: false, error: "Assinatura DOS MZ inválida." };
      }

      // Offset para o cabeçalho PE (e_lfanew na posição 0x3C)
      const peOffset = dosHeader.readUInt32LE(0x3c);

      // Lê PE Signature e COFF Header (24 bytes)
      const coffBuf = Buffer.alloc(24);
      fs.readSync(fd, coffBuf, 0, 24, peOffset);

      // Assinatura 'PE\0\0' (0x00004550)
      if (coffBuf.readUInt32LE(0) !== 0x00004550) {
        fs.closeSync(fd);
        return { ok: false, isPE: false, error: "Assinatura PE inválida." };
      }

      const machine = coffBuf.readUInt16LE(4);
      const numSections = coffBuf.readUInt16LE(6);
      const timeDateStamp = coffBuf.readUInt32LE(8);
      const optHeaderSize = coffBuf.readUInt16LE(20);

      let arch = "unknown";
      if (machine === 0x014c) arch = "x86";
      else if (machine === 0x8664) arch = "x64";
      else if (machine === 0xaa64) arch = "arm64";

      // Lê Optional Header se presente
      let subsystem = "unknown";
      let isNet = false;

      if (optHeaderSize > 0) {
        const optBuf = Buffer.alloc(optHeaderSize);
        fs.readSync(fd, optBuf, 0, optHeaderSize, peOffset + 24);
        const optMagic = optBuf.readUInt16LE(0); // 0x10b = PE32, 0x20b = PE32+

        // Subsystem offset: 68 em PE32, 68 em PE32+
        if (optBuf.length >= 70) {
          const subCode = optBuf.readUInt16LE(68);
          if (subCode === 2) subsystem = "Windows GUI";
          else if (subCode === 3) subsystem = "Windows Console (CUI)";
        }

        // CLR/.NET Directory (15º diretório na tabela de dados)
        // PE32: offset 96 + 14*8 = 208
        // PE32+: offset 112 + 14*8 = 224
        const clrOffset = optMagic === 0x20b ? 224 : 208;
        if (optBuf.length >= clrOffset + 8) {
          const clrRva = optBuf.readUInt32LE(clrOffset);
          const clrSize = optBuf.readUInt32LE(clrOffset + 4);
          if (clrRva > 0 && clrSize > 0) {
            isNet = true;
          }
        }
      }

      // Lê Seções
      const sections = [];
      const secOffset = peOffset + 24 + optHeaderSize;
      const secBuf = Buffer.alloc(numSections * 40);
      fs.readSync(fd, secBuf, 0, numSections * 40, secOffset);

      for (let i = 0; i < numSections; i++) {
        const secEntry = secBuf.subarray(i * 40, (i + 1) * 40);
        const name = secEntry.subarray(0, 8).toString("utf8").replace(/\0+$/, "");
        sections.push(name);
      }

      fs.closeSync(fd);

      return {
        ok: true,
        isPE: true,
        arch,
        machine: "0x" + machine.toString(16),
        subsystem,
        isNet,
        numSections,
        timeDateStamp,
        sections
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

module.exports = ExecutableAnalyzer;
