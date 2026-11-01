'use strict';
// Unreal LocRes: Compact (1), Optimized CRC32 (2), CityHash UTF16 (3), and legacy (0).
// Reference layouts: CUE4Parse FTextLocalizationResource / FTextKey / ELocResVersion.
const MAGIC = Buffer.from('0e147475674a03fc4a15909dc3377f1b', 'hex');
class Reader {
  constructor(buffer, offset = 0) { this.buffer = buffer; this.offset = offset; }
  require(size) { if (!Number.isSafeInteger(size) || size < 0 || this.offset + size > this.buffer.length) throw new Error('LocRes truncado ou offset invalido'); }
  u32() { this.require(4); const n = this.buffer.readUInt32LE(this.offset); this.offset += 4; return n; }
  i32() { this.require(4); const n = this.buffer.readInt32LE(this.offset); this.offset += 4; return n; }
  fstring() {
    const length = this.i32(); if (length === 0) return '';
    const bytes = length > 0 ? length : -length * 2; this.require(bytes);
    const start = this.offset; this.offset += bytes;
    const terminator = length > 0 ? 1 : 2;
    if (this.buffer[this.offset - 1] !== 0 || (length < 0 && this.buffer[this.offset - 2] !== 0)) throw new Error('LocRes FString sem terminador');
    return this.buffer.toString(length > 0 ? 'utf8' : 'utf16le', start, this.offset - terminator);
  }
  count() { const n = this.u32(); if (n > 1000000 || n > this.buffer.length) throw new Error('Contagem LocRes invalida'); return n; }
}
function uint(value) { const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b; }
class UnrealLocResProvider {
  static _readFString(buffer, offset) { const r = new Reader(buffer, offset); const str = r.fstring(); return { str, nextOffset: r.offset }; }
  static _writeFString(str, forceUtf16 = false) {
    if (typeof str !== 'string') throw new Error('LocRes exige texto');
    if (!str) return Buffer.alloc(4);
    if (str.includes('\0')) throw new Error('LocRes texto contem NUL');
    const utf16 = forceUtf16 || /[^\x00-\x7f]/.test(str);
    const body = Buffer.from(str + '\0', utf16 ? 'utf16le' : 'utf8');
    const size = Buffer.alloc(4); size.writeInt32LE(utf16 ? -body.length / 2 : body.length);
    return Buffer.concat([size, body]);
  }
  static parseLocRes(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) throw new Error('LocRes invalido');
    const header = buffer.length >= 17 && buffer.subarray(0, 16).equals(MAGIC);
    const version = header ? buffer[16] : 0;
    if (version > 3) throw new Error('Versao LocRes nao suportada: ' + version);
    const r = new Reader(buffer, header ? 17 : 0);
    let stringTableOffset = null, stringTableEnd = null;
    const stringTable = [];
    if (version >= 1) {
      r.require(8); const offset = buffer.readBigInt64LE(r.offset); r.offset += 8;
      if (offset !== -1n) {
        if (offset < BigInt(r.offset) || offset > BigInt(buffer.length - 4)) throw new Error('Tabela LocRes fora do arquivo');
        stringTableOffset = Number(offset); const table = new Reader(buffer, stringTableOffset);
        const count = table.count();
        for (let i = 0; i < count; i++) stringTable.push({ value: table.fstring(), refCount: version >= 2 ? table.i32() : -1 });
        stringTableEnd = table.offset;
      }
    }
    const expectedCount = version >= 2 ? r.count() : null;
    const namespaceCount = r.count(); const namespaces = Object.create(null); let count = 0;
    for (let n = 0; n < namespaceCount; n++) {
      const namespaceHash = version >= 2 ? r.u32() : null; const name = r.fstring();
      if (Object.hasOwn(namespaces, name)) throw new Error('Namespace LocRes duplicado');
      const keyCount = r.count(); const keys = Object.create(null); namespaces[name] = keys;
      for (let i = 0; i < keyCount; i++) {
        const keyHash = version >= 2 ? r.u32() : null; const key = r.fstring(); const sourceHash = r.u32();
        let value, stringIndex = null;
        if (version >= 1) {
          stringIndex = r.i32(); if (stringIndex < 0 || stringIndex >= stringTable.length) throw new Error('Indice de string LocRes invalido');
          value = stringTable[stringIndex].value;
        } else value = r.fstring();
        if (Object.hasOwn(keys, key)) throw new Error('Chave LocRes duplicada');
        keys[key] = { sourceHash, value, keyHash, namespaceHash, stringIndex }; count++;
      }
    }
    if (expectedCount !== null && count !== expectedCount) throw new Error('Contagem de entradas LocRes divergente');
    if (stringTableOffset !== null && r.offset !== stringTableOffset) throw new Error('Bloco LocRes possui tamanho inesperado');
    return { version, namespaces, count, stringTable, stringTableOffset, stringTableEnd };
  }
  static buildLocRes(namespaces = {}, options = {}) {
    const version = options.version || 1;
    if (![1, 2, 3].includes(version)) throw new Error('Versao de escrita LocRes invalida');
    const list = [], indices = new Map(), refs = [];
    const total = Object.values(namespaces).reduce((n, keys) => n + Object.keys(keys).length, 0);
    const body = version >= 2 ? [uint(total), uint(Object.keys(namespaces).length)] : [uint(Object.keys(namespaces).length)];
    for (const [ns, keys] of Object.entries(namespaces)) {
      if (version >= 2) {
        const nsHash = Object.values(keys)[0]?.namespaceHash;
        if (!Number.isInteger(nsHash)) throw new Error('Hash original do namespace ausente');
        body.push(uint(nsHash));
      }
      body.push(this._writeFString(ns), uint(Object.keys(keys).length));
      for (const [key, item] of Object.entries(keys)) {
        const value = typeof item === 'object' && item !== null ? item.value : String(item);
        if (!indices.has(value)) { indices.set(value, list.length); list.push(value); refs.push(0); }
        const index = indices.get(value); refs[index]++;
        if (version >= 2) {
          if (!Number.isInteger(item.keyHash)) throw new Error('Hash original da chave ausente');
          body.push(uint(item.keyHash));
        }
        body.push(this._writeFString(key), uint(item && typeof item === 'object' ? item.sourceHash || 0 : 0), uint(index));
      }
    }
    const namespaceBlock = Buffer.concat(body); const offset = Buffer.alloc(8); offset.writeBigInt64LE(BigInt(25 + namespaceBlock.length));
    const table = [uint(list.length)];
    list.forEach((str, i) => { table.push(this._writeFString(str)); if (version >= 2) table.push(uint(refs[i])); });
    return Buffer.concat([MAGIC, Buffer.from([version]), offset, namespaceBlock, ...table]);
  }
  static patchLocRes(buffer, translate) {
    const parsed = this.parseLocRes(buffer);
    if (parsed.version < 1 || parsed.stringTableOffset === null) {
      for (const [ns, keys] of Object.entries(parsed.namespaces)) for (const [key, item] of Object.entries(keys)) item.value = translate(item.value, { ns, key });
      return this.buildLocRes(parsed.namespaces);
    }
    const table = [uint(parsed.stringTable.length)];
    parsed.stringTable.forEach((item, index) => {
      const value = translate(item.value, { index });
      table.push(this._writeFString(value)); if (parsed.version >= 2) table.push(uint(item.refCount));
    });
    // Keep every namespace/key hash, source hash, LUT index and reference count unchanged.
    return Buffer.concat([buffer.subarray(0, parsed.stringTableOffset), ...table, buffer.subarray(parsed.stringTableEnd)]);
  }
}
module.exports = UnrealLocResProvider;
