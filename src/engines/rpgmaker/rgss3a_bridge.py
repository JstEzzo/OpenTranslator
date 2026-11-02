import os
import sys
import struct
import ntpath

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def unpack_rgss3a(rgss3a_path, output_dir, data_only=False):
    if not os.path.exists(rgss3a_path):
        raise FileNotFoundError(f"Archive not found: {rgss3a_path}")

    os.makedirs(output_dir, exist_ok=True)
    extracted_files = []

    root = os.path.realpath(output_dir)
    archive_size = os.path.getsize(rgss3a_path)
    entries = []
    names = set()
    with open(rgss3a_path, "rb") as f:
        magic = f.read(8)
        if magic != b"RGSSAD\x00\x03":
            raise ValueError(f"Invalid RGSS3A magic header: {magic}")

        raw_key_bytes = f.read(4)
        if len(raw_key_bytes) != 4:
            raise ValueError('Truncated RGSS3A key')
        raw_key = struct.unpack("<I", raw_key_bytes)[0]
        key = (raw_key * 9 + 3) & 0xFFFFFFFF

        while True:
            offset_bytes = f.read(4)
            if len(offset_bytes) != 4:
                raise ValueError('Truncated RGSS3A index offset')
            offset = struct.unpack('<I', offset_bytes)[0] ^ key
            # The terminator consists of the zero offset only. Reading the
            # next 12 bytes here can consume the first archived file's data.
            if offset == 0:
                break
            entry_header = f.read(12)
            if len(entry_header) != 12:
                raise ValueError('Truncated RGSS3A index')
            s, fk, nl = struct.unpack("<III", entry_header)
            size = s ^ key
            file_key = fk ^ key
            name_len = nl ^ key

            if offset == 0:
                break
            if name_len == 0 or name_len > 4096 or offset > archive_size or size > archive_size - offset:
                raise ValueError('Invalid RGSS3A entry bounds')

            enc_name = f.read(name_len)
            if len(enc_name) != name_len:
                raise ValueError('Truncated RGSS3A filename')
            name_bytes = bytearray(enc_name)
            for i in range(name_len):
                name_bytes[i] ^= (key >> (8 * (i % 4))) & 0xFF

            file_rel_path = name_bytes.decode("utf-8", errors="strict").replace("\\", "/")
            if ntpath.isabs(file_rel_path) or ':' in file_rel_path or '\x00' in file_rel_path or '..' in file_rel_path.split('/'):
                raise ValueError('Unsafe RGSS3A entry path')
            dest_path = os.path.realpath(os.path.join(root, file_rel_path))
            if os.path.commonpath([root, dest_path]) != root or dest_path == root:
                raise ValueError('RGSS3A entry escapes the output directory')
            if dest_path.casefold() in names:
                raise ValueError('Duplicate RGSS3A entry path')
            names.add(dest_path.casefold())
            entries.append((offset, size, file_key, file_rel_path, dest_path))
        index_end = f.tell()
        for offset, size, file_key, file_rel_path, dest_path in entries:
            if offset < index_end:
                raise ValueError('RGSS3A entry overlaps the archive index')
            if data_only and not (file_rel_path.lower().startswith('data/') and file_rel_path.lower().endswith(('.rxdata', '.rvdata', '.rvdata2'))):
                continue
            if os.path.exists(dest_path):
                raise FileExistsError('Refusing to overwrite an existing extraction target: ' + file_rel_path)
            if size > 256 * 1024 * 1024:
                raise ValueError('RGSS3A entry exceeds the supported memory limit')
        for offset, size, file_key, file_rel_path, dest_path in entries:
            if data_only and not (file_rel_path.lower().startswith('data/') and file_rel_path.lower().endswith(('.rxdata', '.rvdata', '.rvdata2'))):
                continue
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            f.seek(offset)
            enc_data = f.read(size)
            if len(enc_data) != size:
                raise ValueError('Truncated RGSS3A entry data')

            # Decrypt file data using file_key
            dec_data = bytearray(enc_data)
            k = file_key
            for i in range(0, size - 3, 4):
                val = struct.unpack_from("<I", dec_data, i)[0]
                val ^= k
                struct.pack_into("<I", dec_data, i, val)
                k = (k * 7 + 3) & 0xFFFFFFFF

            rem = size % 4
            if rem > 0:
                for j in range(rem):
                    dec_data[size - rem + j] ^= (k >> (8 * j)) & 0xFF

            with open(dest_path, "wb") as out_f:
                out_f.write(dec_data)

            extracted_files.append(file_rel_path)

    return extracted_files

def pack_rgss3a(input_dir, output_rgss3a_path):
    # Collect all files to pack
    file_list = []
    for root, dirs, files in os.walk(input_dir):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, input_dir).replace("/", "\\")
            file_list.append((full, rel))

    # Sort files to ensure deterministic archive
    file_list.sort(key=lambda x: x[1])

    raw_key = 0x00004898
    key = (raw_key * 9 + 3) & 0xFFFFFFFF

    # First calculate file offsets
    # Header: 8 bytes magic + 4 bytes raw_key = 12 bytes
    # Each entry header: 16 bytes + name_len
    header_size = 12
    for full, rel in file_list:
        name_bytes = rel.encode("utf-8")
        header_size += 16 + len(name_bytes)
    # End of headers: 16 bytes zeros
    header_size += 16

    current_data_offset = header_size
    entries = []
    file_key_counter = 0x00000029

    for full, rel in file_list:
        size = os.path.getsize(full)
        name_bytes = rel.encode("utf-8")
        entries.append({
            "full_path": full,
            "rel_name": rel,
            "name_bytes": name_bytes,
            "offset": current_data_offset,
            "size": size,
            "file_key": file_key_counter
        })
        current_data_offset += size
        file_key_counter = (file_key_counter + 0x1337) & 0xFFFFFFFF

    with open(output_rgss3a_path, "wb") as out_f:
        # 1. Magic + Raw Key
        out_f.write(b"RGSSAD\x00\x03")
        out_f.write(struct.pack("<I", raw_key))

        # 2. Entries header
        for ent in entries:
            o_enc = ent["offset"] ^ key
            s_enc = ent["size"] ^ key
            fk_enc = ent["file_key"] ^ key
            nl_enc = len(ent["name_bytes"]) ^ key
            out_f.write(struct.pack("<IIII", o_enc, s_enc, fk_enc, nl_enc))

            enc_name = bytearray(ent["name_bytes"])
            for i in range(len(enc_name)):
                enc_name[i] ^= (key >> (8 * (i % 4))) & 0xFF
            out_f.write(enc_name)

        # 3. Terminator
        out_f.write(struct.pack("<IIII", 0 ^ key, 0 ^ key, 0 ^ key, 0 ^ key))

        # 4. File contents
        for ent in entries:
            with open(ent["full_path"], "rb") as in_f:
                data = in_f.read()
            enc_data = bytearray(data)
            k = ent["file_key"]
            for i in range(0, ent["size"] - 3, 4):
                val = struct.unpack_from("<I", enc_data, i)[0]
                val ^= k
                struct.pack_into("<I", enc_data, i, val)
                k = (k * 7 + 3) & 0xFFFFFFFF

            rem = ent["size"] % 4
            if rem > 0:
                for j in range(rem):
                    enc_data[ent["size"] - rem + j] ^= (k >> (8 * j)) & 0xFF
            out_f.write(enc_data)

    return len(entries)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Universal RGSS3A Container Bridge")
    parser.add_argument("--mode", choices=["unpack", "pack"], required=True)
    parser.add_argument("--archive", required=True)
    parser.add_argument("--dir", required=True)
    parser.add_argument('--data-only', action='store_true', help='Extract only Ruby data for structural text inspection')
    args = parser.parse_args()

    if args.mode == "unpack":
        files = unpack_rgss3a(args.archive, args.dir, data_only=args.data_only)
        print(f"Unpacked {len(files)} files successfully.")
    elif args.mode == "pack":
        count = pack_rgss3a(args.dir, args.archive)
        print(f"Packed {count} files successfully into {args.archive}.")
