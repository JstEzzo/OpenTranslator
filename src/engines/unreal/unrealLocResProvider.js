/**
 * OpenTranslator — UnrealLocResProvider
 * 
 * Parser e gerador binário para arquivos .locres (Unreal Engine Compiled Localization Resource).
 * Suporta:
 * - Leitura e gravação binária de .locres (Magic GUID: 0x7574140E, 0xFC034A67, 0x9D90155E, 0xD4BEFE85)
 * - LocRes Version 1 (Legacy), Version 2 (Compact) e Version 3 (Optimized)
 * - Tabela de strings localizadas por Namespace e Key
 * - Geração de arquivos .locmeta e sincronização com arquivos gettext PO
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Unreal Engine LocRes Magic GUID
const LOCRES_MAGIC = Buffer.from([
  0x0E, 0x14, 0x74, 0x75,
  0x67, 0x4A, 0x03, 0xFC,
  0x5E, 0x15, 0x90, 0x9D,
  0x85, 0xFE, 0xBE, 0xD4
]);

class UnrealLocResProvider {
  /**
   * Lê uma string terminada em null ou com comprimento em int32 (formato Unreal FString)
   * Se length > 0: UTF-8 (ou ASCII). Se length < 0: UTF-16LE (-length caracteres).
   */
  static _readFString(buffer, offset) {
    if (offset + 4 > buffer.length) return { str: '', nextOffset: offset };

    const len = buffer.readInt32LE(offset);
    let nextOffset = offset + 4;

    if (len === 0) {
      return { str: '', nextOffset };
    }

    if (len > 0) {
      // UTF-8 com null terminator
      const byteLen = len - 1; // ignora null terminator
      const str = buffer.toString('utf8', nextOffset, nextOffset + byteLen);
      nextOffset += len;
      return { str, nextOffset };
    } else {
      // UTF-16LE (-len * 2 bytes)
      const charCount = -len;
      const byteLen = (charCount - 1) * 2;
      const str = buffer.toString('utf16le', nextOffset, nextOffset + byteLen);
      nextOffset += charCount * 2;
      return { str, nextOffset };
    }
  }

  /**
   * Grava uma string em formato Unreal FString (int32 length + null terminator)
   */
  static _writeFString(str, isUtf16 = false) {
    if (!str || str.length === 0) {
      const buf = Buffer.alloc(4);
      buf.writeInt32LE(0, 0);
      return buf;
    }

    if (isUtf16 || /[^\u0000-\u007F]/.test(str)) {
      // UTF-16LE
      const encoded = Buffer.from(str + '\0', 'utf16le');
      const charCount = (encoded.length / 2);
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeInt32LE(-charCount, 0);
      return Buffer.concat([lenBuf, encoded]);
    } else {
      // UTF-8
      const encoded = Buffer.from(str + '\0', 'utf8');
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeInt32LE(encoded.length, 0);
      return Buffer.concat([lenBuf, encoded]);
    }
  }

  /**
   * Descompacta um arquivo binário .locres em um dicionário estruturado por namespace e chave
   * @param {Buffer} buffer
   * @returns {{ version: number, namespaces: object, count: number }}
   */
  static parseLocRes(buffer) {
    if (!buffer || buffer.length < 17) {
      throw new Error('LocRes inválido: buffer muito pequeno');
    }

    // Verifica Magic GUID
    const magic = buffer.subarray(0, 16);
    if (!magic.equals(LOCRES_MAGIC)) {
      throw new Error('LocRes inválido: Magic GUID não corresponde ao Unreal LocRes');
    }

    const version = buffer.readUInt8(16);
    let offset = 17;

    const namespaces = {};
    let totalStrings = 0;

    if (version >= 1) {
      // Version 1 (Legacy) e Version 2 (Compact)
      // Em Version 2/3 pode haver um offset para a tabela de strings localizadas
      let localizedStringsOffset = -1;
      if (version >= 2) {
        if (offset + 8 <= buffer.length) {
          localizedStringsOffset = Number(buffer.readBigInt64LE(offset));
          offset += 8;
        }
      }

      // Lê localized string array se disponível no compact mode
      const localizedStringsTable = [];
      if (localizedStringsOffset > 0 && localizedStringsOffset < buffer.length) {
        let strTableOffset = localizedStringsOffset;
        if (strTableOffset + 4 <= buffer.length) {
          const strCount = buffer.readUInt32LE(strTableOffset);
          strTableOffset += 4;
          for (let s = 0; s < strCount && strTableOffset < buffer.length; s++) {
            const { str, nextOffset } = UnrealLocResProvider._readFString(buffer, strTableOffset);
            strTableOffset = nextOffset;
            if (version >= 3 && strTableOffset + 4 <= buffer.length) {
              strTableOffset += 4; // Ref count uint32 em version 3
            }
            localizedStringsTable.push(str);
          }
        }
      }

      // Lê Namespace count
      if (offset + 4 <= buffer.length) {
        const namespaceCount = buffer.readUInt32LE(offset);
        offset += 4;

        for (let n = 0; n < namespaceCount && offset < buffer.length; n++) {
          const { str: nsKey, nextOffset: nsOff } = UnrealLocResProvider._readFString(buffer, offset);
          offset = nsOff;

          if (offset + 4 > buffer.length) break;
          const keyCount = buffer.readUInt32LE(offset);
          offset += 4;

          namespaces[nsKey] = {};

          for (let k = 0; k < keyCount && offset < buffer.length; k++) {
            const { str: entryKey, nextOffset: keyOff } = UnrealLocResProvider._readFString(buffer, offset);
            offset = keyOff;

            if (offset + 4 > buffer.length) break;
            const sourceHash = buffer.readUInt32LE(offset);
            offset += 4;

            let val = '';
            if (localizedStringsTable.length > 0) {
              const strIdx = buffer.readInt32LE(offset);
              offset += 4;
              val = localizedStringsTable[strIdx] || '';
            } else {
              const { str: strVal, nextOffset: valOff } = UnrealLocResProvider._readFString(buffer, offset);
              offset = valOff;
              val = strVal;
            }

            namespaces[nsKey][entryKey] = {
              sourceHash,
              value: val
            };
            totalStrings++;
          }
        }
      }
    }

    return {
      version,
      namespaces,
      count: totalStrings
    };
  }

  /**
   * Compila um dicionário de namespaces e chaves de volta em um arquivo binário .locres compatível (Version 2 Compact)
   * @param {object} namespaces - Estrutura { "Namespace": { "Key": "Texto Traduzido" } }
   * @returns {Buffer} Buffer binário .locres pronto para gravação em Content/Localization/Game/
   */
  static buildLocRes(namespaces = {}) {
    // Coleta todas as strings únicas para a tabela compacta
    const stringList = [];
    const stringMap = new Map();

    for (const ns of Object.keys(namespaces)) {
      const keys = namespaces[ns];
      for (const k of Object.keys(keys)) {
        const item = keys[k];
        const val = typeof item === 'object' && item.value !== undefined ? item.value : String(item);
        if (!stringMap.has(val)) {
          stringMap.set(val, stringList.length);
          stringList.push(val);
        }
      }
    }

    // Monta o cabeçalho (Magic 16 bytes + Version 1 byte)
    const headerBuf = Buffer.alloc(17);
    LOCRES_MAGIC.copy(headerBuf, 0);
    headerBuf.writeUInt8(2, 16); // Version 2 (Compact)

    // Offset para a tabela de strings localizadas (será preenchido após montar a tabela de namespaces)
    const locStrOffsetPlaceholder = Buffer.alloc(8);

    // Monta o corpo dos namespaces
    const nsBuffers = [];
    const nsKeys = Object.keys(namespaces);
    const nsCountBuf = Buffer.alloc(4);
    nsCountBuf.writeUInt32LE(nsKeys.length, 0);
    nsBuffers.push(nsCountBuf);

    for (const ns of nsKeys) {
      nsBuffers.push(UnrealLocResProvider._writeFString(ns));
      const entryKeys = Object.keys(namespaces[ns]);
      const keyCountBuf = Buffer.alloc(4);
      keyCountBuf.writeUInt32LE(entryKeys.length, 0);
      nsBuffers.push(keyCountBuf);

      for (const k of entryKeys) {
        nsBuffers.push(UnrealLocResProvider._writeFString(k));

        const item = namespaces[ns][k];
        const sourceHash = (typeof item === 'object' && item.sourceHash !== undefined) ? item.sourceHash : 0;
        const hashBuf = Buffer.alloc(4);
        hashBuf.writeUInt32LE(sourceHash, 0);
        nsBuffers.push(hashBuf);

        const val = typeof item === 'object' && item.value !== undefined ? item.value : String(item);
        const strIdx = stringMap.get(val);
        const idxBuf = Buffer.alloc(4);
        idxBuf.writeInt32LE(strIdx !== undefined ? strIdx : 0, 0);
        nsBuffers.push(idxBuf);
      }
    }

    const namespaceBlock = Buffer.concat(nsBuffers);

    // O offset da tabela de strings é: 17 (header) + 8 (offset buffer) + namespaceBlock.length
    const strTableOffset = BigInt(17 + 8 + namespaceBlock.length);
    locStrOffsetPlaceholder.writeBigInt64LE(strTableOffset, 0);

    // Monta a tabela de strings localizadas
    const strTableBuffers = [];
    const strCountBuf = Buffer.alloc(4);
    strCountBuf.writeUInt32LE(stringList.length, 0);
    strTableBuffers.push(strCountBuf);

    for (const str of stringList) {
      strTableBuffers.push(UnrealLocResProvider._writeFString(str));
    }
    const strTableBlock = Buffer.concat(strTableBuffers);

    return Buffer.concat([
      headerBuf,
      locStrOffsetPlaceholder,
      namespaceBlock,
      strTableBlock
    ]);
  }
}

module.exports = UnrealLocResProvider;
