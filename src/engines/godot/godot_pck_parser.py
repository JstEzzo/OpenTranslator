import os
import sys
import struct
import json

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
            reserved = fp.read(56) # Remaining reserved bytes (64 - 8)
            
            # Seek to file table
            fp.seek(file_table_offset)
        else:
            reserved = fp.read(64)
            file_base = 0
            
        file_count = struct.unpack("<I", fp.read(4))[0]
        
        files = []
        for _ in range(file_count):
            path_len = struct.unpack("<I", fp.read(4))[0]
            raw_path = fp.read(path_len).decode("utf-8", errors="ignore").rstrip("\x00")
            offset = struct.unpack("<Q", fp.read(8))[0]
            size = struct.unpack("<Q", fp.read(8))[0]
            md5 = fp.read(16).hex()
            f_flags = struct.unpack("<I", fp.read(4))[0] if pck_version >= 2 else 0
            
            files.append({
                "path": raw_path,
                "offset": offset,
                "size": size,
                "md5": md5,
                "flags": f_flags
            })
            
    return {
        "magic": magic.decode("ascii", errors="ignore"),
        "pckVersion": pck_version,
        "godotVersion": f"{major}.{minor}.{patch}",
        "fileBase": file_base,
        "fileTableOffset": file_table_offset if pck_version >= 2 else 0,
        "fileCount": len(files),
        "files": files
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python godot_pck_parser.py <path_to_pck>")
        sys.exit(1)
    res = parse_pck(sys.argv[1])
    print("Parsed PCK summary:")
    print("  Godot Version:", res.get("godotVersion"))
    print("  PCK Version:", res.get("pckVersion"))
    print("  File Count:", res.get("fileCount"))
    if res.get("files"):
        print("  First 5 files:")
        for f in res["files"][:5]:
            print(f"    {f['path']} (size: {f['size']} bytes, offset: {f['offset']})")
