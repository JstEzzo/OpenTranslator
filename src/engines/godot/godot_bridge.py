import os
import sys
import struct
import json
import hashlib

# Force UTF-8 on Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def parse_pck(pck_path):
    # Layout reference: Godot 4.4 core/io/file_access_pack.cpp.
    archive_size = os.path.getsize(pck_path)
    with open(pck_path, 'rb') as fp:
        def take(size):
            data = fp.read(size)
            if len(data) != size:
                raise ValueError('Truncated PCK directory')
            return data
        def u32():
            return struct.unpack('<I', take(4))[0]
        if take(4) != b'GDPC':
            return {'error': 'Invalid PCK magic', 'code': 'PCK_INVALID_HEADER'}
        version = u32()
        major, minor, patch = u32(), u32(), u32()
        if version not in (1, 2):
            return {'error': 'Unsupported PCK format version', 'code': 'PCK_UNSUPPORTED_VERSION'}
        flags = u32() if version == 2 else 0
        file_base = struct.unpack('<Q', take(8))[0] if version == 2 else 0
        reserved = take(64)
        table_offset = fp.tell()
        file_count = u32()
        info = {'magic': 'GDPC', 'pckVersion': version,
                'godotVersion': f'{major}.{minor}.{patch}',
                'major': major, 'minor': minor, 'patch': patch,
                'fileBase': file_base, 'fileTableOffset': table_offset,
                'fileCount': file_count, 'flags': flags, 'files': []}
        if flags & 1:
            return {**info, 'error': 'Encrypted PCK directory requires the game-specific key; no strings were read.',
                    'code': 'PCK_ENCRYPTED_DIRECTORY'}
        if file_count > min(1000000, archive_size // 32):
            raise ValueError('Invalid PCK file count')
        for _ in range(file_count):
            path_length = u32()
            if path_length == 0 or path_length > 16384:
                raise ValueError('Invalid PCK entry name length')
            path_bytes = take(path_length)
            name = path_bytes.rstrip(b'\x00').decode('utf-8', errors='strict')
            entry_position = fp.tell()
            offset, size = struct.unpack('<QQ', take(16))
            digest = take(16)
            entry_flags = u32() if version == 2 else 0
            if not entry_flags & 2 and (file_base + offset > archive_size or size > archive_size - file_base - offset):
                raise ValueError('Invalid PCK entry data bounds')
            info['files'].append({'path': name, 'raw_path_bytes': path_bytes,
                                  'offset': offset, 'size': size, 'md5': digest.hex(),
                                  'md5_bytes': digest, 'flags': entry_flags,
                                  'directoryEntryPosition': entry_position})
        return info


def extract_texts(pck_path, out_json_path):
    pck = parse_pck(pck_path)
    if "error" in pck:
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump({"success": False, "error": pck["error"], "code": pck.get("code"), "texts": []}, f)
        return

    file_base = pck["fileBase"]
    translatable_texts = []
    
    with open(pck_path, "rb") as fp:
        for f in pck["files"]:
            p = f["path"]
            # Detect translatable formats: dialog json, loose json, csv, po
            if p.endswith(".json") and any(k in p.lower() for k in ["dialog", "text", "story", "event", "scenario", "script", "locale", "translat"]):
                try:
                    fp.seek(f["offset"] + file_base)
                    raw_bytes = fp.read(f["size"])
                    text_content = raw_bytes.decode("utf-8", errors="ignore")
                    data = json.loads(text_content)
                    
                    if isinstance(data, dict):
                        for node_id, node in data.items():
                            if isinstance(node, dict) and "text" in node:
                                original_text = node["text"]
                                if original_text and isinstance(original_text, str) and original_text.strip():
                                    clean = original_text.strip()
                                    translatable_texts.append({
                                        "id": f"godot_json_{p}_{node_id}",
                                        "file": os.path.basename(pck_path),
                                        "subPath": p,
                                        "nodeId": node_id,
                                        "field": "text",
                                        "original": clean,
                                        "clean": clean,
                                        "context": f"{p} [{node_id}]",
                                        "engine": "godot",
                                        "format": "godot_pck_json"
                                    })
                except Exception:
                    pass
            elif p.endswith(".csv") and any(k in p.lower() for k in ["locale", "translat", "text", "lang", "msg"]):
                try:
                    fp.seek(f["offset"] + file_base)
                    raw_bytes = fp.read(f["size"])
                    text_content = raw_bytes.decode("utf-8", errors="ignore")
                    lines = text_content.splitlines()
                    for idx, line in enumerate(lines):
                        if idx == 0: continue
                        parts = line.split(",")
                        if len(parts) > 1 and parts[1].strip():
                            clean = parts[1].strip()
                            translatable_texts.append({
                                "id": f"godot_csv_{p}_{idx}",
                                "file": os.path.basename(pck_path),
                                "subPath": p,
                                "rowIndex": idx,
                                "original": clean,
                                "clean": clean,
                                "context": f"{p} line {idx}",
                                "engine": "godot",
                                "format": "godot_pck_csv"
                            })
                except Exception:
                    pass

    with open(out_json_path, "w", encoding="utf-8") as out_fp:
        json.dump({
            "success": True,
            "engine": "godot",
            "pckVersion": pck["pckVersion"],
            "godotVersion": pck["godotVersion"],
            "count": len(translatable_texts),
            "texts": translatable_texts
        }, out_fp, indent=2, ensure_ascii=False)

def apply_translations(pck_path, trans_json_path, out_meta_path):
    pck = parse_pck(pck_path)
    if "error" in pck:
        with open(out_meta_path, "w", encoding="utf-8") as f:
            json.dump({"error": pck["error"], "success": False}, f)
        return

    with open(out_meta_path, 'w', encoding='utf-8') as output:
        json.dump({'success': False, 'code': 'PCK_REPACK_REQUIRED',
                   'error': 'PCK application requires a verified repacker; the legacy reserved-header index relocation is not supported.',
                   'appliedCount': 0}, output)
    return


def rollback_pck(meta_path):
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    pck_path = meta["pckPath"]
    orig_size = meta["origFileSize"]
    orig_table_offset = meta["origFileTableOffset"]

    with open(pck_path, "r+b") as fp:
        # Restore header offset at 32 (0x20)
        fp.seek(32)
        fp.write(struct.pack("<Q", orig_table_offset))
        # Truncate file back to exact original size
        fp.truncate(orig_size)

    return {"success": True, "restoredSize": orig_size}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python godot_bridge.py inspect <pck_path>")
        print("  python godot_bridge.py extract <pck_path> <out_json>")
        print("  python godot_bridge.py apply <pck_path> <trans_json> <out_meta>")
        print("  python godot_bridge.py rollback <meta_json>")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "inspect":
        info = parse_pck(sys.argv[2])
        print(json.dumps({
            "pckVersion": info.get("pckVersion"),
            "godotVersion": info.get("godotVersion"),
            "fileCount": info.get("fileCount")
        }, indent=2))
    elif cmd == "extract":
        extract_texts(sys.argv[2], sys.argv[3])
    elif cmd == "apply":
        apply_translations(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "rollback":
        res = rollback_pck(sys.argv[2])
        print(json.dumps(res, indent=2))
