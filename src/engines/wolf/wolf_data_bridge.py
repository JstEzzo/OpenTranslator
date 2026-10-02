import os
import sys
import json
import argparse
import io

# Force UTF-8 on Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def is_translatable_text(s):
    if not s or not isinstance(s, str):
        return False
    t = s.strip()
    if len(t) < 2 or len(t) > 3000:
        return False
    if t.startswith(("{", "[", "/*", "//", "<!--", "#", "<", "\"", "'")):
        return False
    if any(tech in t for tech in [
        "http://", "https://", ".png", ".jpg", ".wav", ".ogg", ".mid", ".dll", ".exe"
    ]):
        return False
    if any(ord(c) < 32 and c not in "\n\r\t" for c in t):
        return False
    # Must contain alphabetic characters or CJK ideographs
    letter_count = sum(1 for c in t if c.isalnum() or '\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u30ff')
    if letter_count < 2 or (letter_count / len(t)) < 0.20:
        return False
    return True

def extract_strings_from_dat(file_path, rel_file):
    texts = []
    with open(file_path, "rb") as fp:
        buf = fp.read()

    # Search for length-prefixed strings
    # In Wolf RPG, string length is uint32 LE, followed by string bytes (often with null terminator)
    idx = 0
    buf_len = len(buf)
    while idx < buf_len - 4:
        str_len = int.from_bytes(buf[idx:idx+4], "little")
        if 3 <= str_len <= 800 and idx + 4 + str_len <= buf_len:
            chunk = buf[idx+4:idx+4+str_len]
            clean_chunk = chunk[:-1] if chunk.endswith(b"\x00") else chunk
            decoded = None
            encoding_used = None
            try:
                decoded = clean_chunk.decode("cp932")
                encoding_used = "cp932"
            except Exception:
                try:
                    decoded = clean_chunk.decode("utf-8")
                    encoding_used = "utf-8"
                except Exception:
                    pass

            if decoded and is_translatable_text(decoded):
                texts.append({
                    "id": f"wolf_{os.path.basename(rel_file)}_{idx}",
                    "file": rel_file,
                    "offset": idx,
                    "originalLength": str_len,
                    "encoding": encoding_used,
                    "hasNullTerminator": chunk.endswith(b"\x00"),
                    "original": decoded,
                    "clean": decoded,
                    "engine": "wolf",
                    "format": "wolf_binary"
                })
                # Skip past this string
                idx += 4 + str_len
                continue
        idx += 1

    return texts

def extract_from_game(game_dir):
    all_texts = []
    visited_ids = set()

    # 1. Scan Data/BasicData and Data/MapData
    data_dirs = [
        os.path.join(game_dir, "Data", "BasicData"),
        os.path.join(game_dir, "data", "BasicData"),
        os.path.join(game_dir, "Data", "MapData"),
        os.path.join(game_dir, "data", "MapData")
    ]

    for d in data_dirs:
        if not os.path.exists(d):
            continue
        for ent in os.listdir(d):
            if ent.endswith((".dat", ".mps")) and not ent.startswith("."):
                full_p = os.path.join(d, ent)
                rel_p = os.path.relpath(full_p, game_dir).replace("\\", "/")
                try:
                    res = extract_strings_from_dat(full_p, rel_p)
                    for item in res:
                        if item["id"] not in visited_ids:
                            visited_ids.add(item["id"])
                            all_texts.append(item)
                except Exception:
                    pass

    # 2. Scan loose text files
    for root_p, _, files in os.walk(game_dir):
        # Don't recurse into backup directories
        if ".opent" in root_p or "Save" in root_p:
            continue
        for f in files:
            if f.lower().endswith((".txt", ".csv", ".json")) and not f.startswith("."):
                full_p = os.path.join(root_p, f)
                rel_p = os.path.relpath(full_p, game_dir).replace("\\", "/")
                try:
                    with open(full_p, "r", encoding="utf-8", errors="ignore") as fp:
                        lines = fp.readlines()
                    for l_idx, line in enumerate(lines):
                        l_strip = line.strip()
                        if is_translatable_text(l_strip):
                            entry_id = f"wolf_txt_{os.path.basename(rel_p)}_{l_idx+1}"
                            if entry_id not in visited_ids:
                                visited_ids.add(entry_id)
                                all_texts.append({
                                    "id": entry_id,
                                    "file": rel_p,
                                    "line": l_idx + 1,
                                    "original": l_strip,
                                    "clean": l_strip,
                                    "engine": "wolf",
                                    "format": "text_line"
                                })
                except Exception:
                    pass

    return {
        "success": True,
        "count": len(all_texts),
        "texts": all_texts
    }

def inject_into_game(game_dir, payload_file):
    if not os.path.exists(payload_file):
        return {"success": False, "error": "Payload not found", "modifiedFiles": [], "count": 0}

    with open(payload_file, "r", encoding="utf-8") as fp:
        payload = json.load(fp)

    items_by_file = {}
    for it in payload.get("items", []):
        f = it.get("file")
        if f:
            items_by_file.setdefault(f, []).append(it)

    modified_files = set()
    injected_count = 0

    for rel_file, file_items in items_by_file.items():
        full_path = os.path.join(game_dir, rel_file)
        if not os.path.exists(full_path):
            continue

        if rel_file.endswith((".dat", ".mps")):
            # Binary injection
            try:
                with open(full_path, "rb") as fp:
                    buf = bytearray(fp.read())

                # Sort by offset DESCENDING so modifying length doesn't invalidate earlier offsets
                sorted_items = sorted(file_items, key=lambda x: x.get("offset", 0), reverse=True)
                file_modified = False

                for it in sorted_items:
                    offset = it.get("offset")
                    orig_len = it.get("originalLength")
                    trans = it.get("translation")
                    enc = it.get("encoding", "cp932")
                    has_null = it.get("hasNullTerminator", True)

                    if offset is None or orig_len is None or not trans:
                        continue

                    # Verify offset still matches in buffer
                    if offset + 4 + orig_len <= len(buf):
                        # Encode translation
                        try:
                            encoded_trans = trans.encode("cp932")
                        except Exception:
                            encoded_trans = trans.encode("utf-8")

                        if has_null:
                            encoded_trans += b"\x00"

                        new_len = len(encoded_trans)
                        new_len_bytes = new_len.to_bytes(4, "little")

                        # Replace length and string in buffer
                        old_chunk_end = offset + 4 + orig_len
                        buf[offset:offset+4] = new_len_bytes
                        buf[offset+4:old_chunk_end] = encoded_trans

                        file_modified = True
                        injected_count += 1

                if file_modified:
                    with open(full_path, "wb") as out_fp:
                        out_fp.write(buf)
                    modified_files.add(full_path)
            except Exception:
                pass

        elif rel_file.endswith(".txt"):
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as fp:
                    lines = fp.readlines()
                file_modified = False
                for it in file_items:
                    l_idx = it.get("line")
                    orig = it.get("original")
                    trans = it.get("translation")
                    if l_idx and trans and 1 <= l_idx <= len(lines):
                        if orig and orig in lines[l_idx-1]:
                            lines[l_idx-1] = lines[l_idx-1].replace(orig, trans)
                        else:
                            lines[l_idx-1] = trans + "\n"
                        file_modified = True
                        injected_count += 1
                if file_modified:
                    with open(full_path, "w", encoding="utf-8") as out_fp:
                        out_fp.writelines(lines)
                    modified_files.add(full_path)
            except Exception:
                pass

    return {
        "success": True,
        "count": injected_count,
        "modifiedFiles": list(modified_files)
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-dir", required=True)
    parser.add_argument("--mode", choices=["extract", "inject"], required=True)
    parser.add_argument("--payload", default=None)
    args = parser.parse_args()

    if args.mode == "extract":
        res = extract_from_game(args.game_dir)
    else:
        res = inject_into_game(args.game_dir, args.payload)

    print(json.dumps(res, ensure_ascii=False))
