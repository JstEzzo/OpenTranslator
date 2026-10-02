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
    with open(pck_path, "rb") as fp:
        magic = fp.read(4)
        if magic != b"GDPC":
            return {"error": "Invalid magic: " + str(magic)}
        
        pck_version = struct.unpack("<I", fp.read(4))[0]
        major, minor, patch = struct.unpack("<III", fp.read(12))
        
        if pck_version >= 2:
            flags = struct.unpack("<I", fp.read(4))[0]
            file_base = struct.unpack("<Q", fp.read(8))[0]
            file_table_offset = struct.unpack("<Q", fp.read(8))[0]
            reserved = fp.read(56)
            fp.seek(file_table_offset)
        else:
            reserved = fp.read(64)
            file_base = 0
            file_table_offset = 0
            
        file_count = struct.unpack("<I", fp.read(4))[0]
        
        files = []
        for _ in range(file_count):
            path_len = struct.unpack("<I", fp.read(4))[0]
            raw_path_bytes = fp.read(path_len)
            raw_path = raw_path_bytes.decode("utf-8", errors="ignore").rstrip("\x00")
            offset = struct.unpack("<Q", fp.read(8))[0]
            size = struct.unpack("<Q", fp.read(8))[0]
            md5 = fp.read(16)
            f_flags = struct.unpack("<I", fp.read(4))[0] if pck_version >= 2 else 0
            
            files.append({
                "path": raw_path,
                "raw_path_bytes": raw_path_bytes,
                "offset": offset,
                "size": size,
                "md5": md5.hex(),
                "md5_bytes": md5,
                "flags": f_flags
            })
            
    return {
        "magic": magic.decode("ascii", errors="ignore"),
        "pckVersion": pck_version,
        "godotVersion": f"{major}.{minor}.{patch}",
        "major": major,
        "minor": minor,
        "patch": patch,
        "fileBase": file_base,
        "fileTableOffset": file_table_offset,
        "fileCount": len(files),
        "files": files
    }

def extract_texts(pck_path, out_json_path):
    pck = parse_pck(pck_path)
    if "error" in pck:
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump({"error": pck["error"], "texts": []}, f)
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

    with open(trans_json_path, "r", encoding="utf-8") as f:
        trans_data = json.load(f)

    # Group translations by subPath
    # Support both list of objects and map of id -> translation
    items_by_subpath = {}
    if isinstance(trans_data, list):
        for item in trans_data:
            sp = item.get("subPath")
            if sp:
                if sp not in items_by_subpath:
                    items_by_subpath[sp] = []
                items_by_subpath[sp].append(item)
    elif isinstance(trans_data, dict):
        texts = trans_data.get("texts", [])
        translations = trans_data.get("translations", {})
        for item in texts:
            sp = item.get("subPath")
            item_id = item.get("id")
            tl = translations.get(item_id) or item.get("translation")
            if sp and tl:
                item_copy = dict(item)
                item_copy["translation"] = tl
                if sp not in items_by_subpath:
                    items_by_subpath[sp] = []
                items_by_subpath[sp].append(item_copy)

    file_base = pck["fileBase"]
    orig_file_table_offset = pck["fileTableOffset"]
    orig_file_size = os.path.getsize(pck_path)

    # Save original offset & size in metadata for exact byte-level rollback
    rollback_meta = {
        "pckPath": pck_path,
        "origFileSize": orig_file_size,
        "origFileTableOffset": orig_file_table_offset,
        "fileBase": file_base,
        "modifiedFiles": list(items_by_subpath.keys())
    }

    modified_blobs = {} # subPath -> bytes
    applied_count = 0

    with open(pck_path, "rb") as fp:
        for f in pck["files"]:
            sp = f["path"]
            if sp in items_by_subpath:
                fp.seek(f["offset"] + file_base)
                raw_bytes = fp.read(f["size"])
                text_content = raw_bytes.decode("utf-8", errors="ignore")
                
                if f["path"].endswith(".json"):
                    try:
                        data = json.loads(text_content)
                        for item in items_by_subpath[sp]:
                            node_id = item.get("nodeId")
                            field = item.get("field", "text")
                            tl = item.get("translation")
                            if node_id in data and isinstance(data[node_id], dict) and tl:
                                data[node_id][field] = tl
                                applied_count += 1
                        new_content = json.dumps(data, indent=4, ensure_ascii=False)
                        modified_blobs[sp] = new_content.encode("utf-8")
                    except Exception as e:
                        print(f"Error updating {sp}: {e}")

    if not modified_blobs:
        with open(out_meta_path, "w", encoding="utf-8") as f:
            json.dump({"success": False, "count": 0, "message": "No matching files modified"}, f)
        return

    # Append modified blobs and rebuild directory table
    with open(pck_path, "r+b") as fp:
        # Seek to end of file to append new blobs
        fp.seek(0, os.SEEK_END)
        append_start_pos = fp.tell()

        updated_files_map = {}
        for sp, blob in modified_blobs.items():
            blob_pos = fp.tell()
            fp.write(blob)
            updated_files_map[sp] = {
                "offset": blob_pos - file_base,
                "size": len(blob),
                "md5": hashlib.md5(blob).digest()
            }

        # Write new directory table
        new_table_offset = fp.tell()
        fp.write(struct.pack("<I", len(pck["files"])))

        for f in pck["files"]:
            sp = f["path"]
            raw_path_bytes = f["raw_path_bytes"]
            fp.write(struct.pack("<I", len(raw_path_bytes)))
            fp.write(raw_path_bytes)

            if sp in updated_files_map:
                u = updated_files_map[sp]
                fp.write(struct.pack("<Q", u["offset"]))
                fp.write(struct.pack("<Q", u["size"]))
                fp.write(u["md5"])
            else:
                fp.write(struct.pack("<Q", f["offset"]))
                fp.write(struct.pack("<Q", f["size"]))
                fp.write(f["md5_bytes"])

            if pck["pckVersion"] >= 2:
                fp.write(struct.pack("<I", f["flags"]))

        # Update file_table_offset in header (offset 32 = 0x20)
        fp.seek(32)
        fp.write(struct.pack("<Q", new_table_offset))

    rollback_meta["success"] = True
    rollback_meta["appliedCount"] = applied_count
    rollback_meta["modifiedCount"] = len(modified_blobs)

    with open(out_meta_path, "w", encoding="utf-8") as f:
        json.dump(rollback_meta, f, indent=2)

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
