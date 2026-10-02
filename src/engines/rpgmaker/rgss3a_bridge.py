import os
import sys
import struct

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def unpack_rgss3a(rgss3a_path, output_dir):
    if not os.path.exists(rgss3a_path):
        raise FileNotFoundError(f"Archive not found: {rgss3a_path}")

    os.makedirs(output_dir, exist_ok=True)
    extracted_files = []

    with open(rgss3a_path, "rb") as f:
        magic = f.read(8)
        if magic != b"RGSSAD\x00\x03":
            raise ValueError(f"Invalid RGSS3A magic header: {magic}")

        raw_key = struct.unpack("<I", f.read(4))[0]
        key = (raw_key * 9 + 3) & 0xFFFFFFFF

        while True:
            entry_header = f.read(16)
            if len(entry_header) < 16:
                break
            o, s, fk, nl = struct.unpack("<IIII", entry_header)
            offset = o ^ key
            size = s ^ key
            file_key = fk ^ key
            name_len = nl ^ key

            if offset == 0 or name_len == 0 or name_len > 1024:
                break

            enc_name = f.read(name_len)
            name_bytes = bytearray(enc_name)
            for i in range(name_len):
                name_bytes[i] ^= (key >> (8 * (i % 4))) & 0xFF

            file_rel_path = name_bytes.decode("utf-8", errors="replace").replace("\\", "/")
            dest_path = os.path.join(output_dir, file_rel_path)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            curr_pos = f.tell()
            f.seek(offset)
            enc_data = f.read(size)
            f.seek(curr_pos)

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
    args = parser.parse_args()

    if args.mode == "unpack":
        files = unpack_rgss3a(args.archive, args.dir)
        print(f"Unpacked {len(files)} files successfully.")
    elif args.mode == "pack":
        count = pack_rgss3a(args.dir, args.archive)
        print(f"Packed {count} files successfully into {args.archive}.")
