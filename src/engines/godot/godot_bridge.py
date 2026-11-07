import os
import sys
import struct
import json
import hashlib
import re
import shutil
import tempfile
import csv
import io

# Force UTF-8 on Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def parse_pck(pck_path):
    # Godot 4.6.1 core/io/file_access_pack.cpp defines the embedded footer and v3 index.
    archive_size = os.path.getsize(pck_path)
    with open(pck_path, 'rb') as fp:
        def take(size):
            data = fp.read(size)
            if len(data) != size:
                raise ValueError('Truncated PCK directory')
            return data
        def u32():
            return struct.unpack('<I', take(4))[0]
        pack_start = 0
        embedded = False
        if take(4) != b'GDPC':
            if archive_size < 52:
                return {'error': 'Invalid PCK magic', 'code': 'PCK_INVALID_HEADER'}
            fp.seek(-12, os.SEEK_END)
            length, magic = struct.unpack('<Q4s', take(12))
            if magic != b'GDPC' or not 40 <= length <= archive_size - 12:
                return {'error': 'Invalid embedded PCK footer', 'code': 'PCK_INVALID_HEADER'}
            pack_start = archive_size - 12 - length
            archive_size -= 12
            embedded = True
            fp.seek(pack_start)
            if take(4) != b'GDPC':
                return {'error': 'Invalid PCK magic', 'code': 'PCK_INVALID_HEADER'}
        version = u32()
        major, minor, patch = u32(), u32(), u32()
        if version not in (1, 2, 3):
            return {'error': 'Unsupported PCK format version', 'code': 'PCK_UNSUPPORTED_VERSION'}
        flags = u32() if version >= 2 else 0
        file_base = struct.unpack('<Q', take(8))[0] if version >= 2 else 0
        if version == 3 or (version == 2 and flags & 2):
            file_base += pack_start
        if version == 3:
            directory = pack_start + struct.unpack('<Q', take(8))[0]
            if not pack_start + 40 <= directory <= archive_size - 4:
                raise ValueError('Invalid PCK directory offset')
            fp.seek(directory)
        else:
            take(64)
        table_offset = fp.tell()
        file_count = u32()
        info = {'magic': 'GDPC', 'pckVersion': version,
                'godotVersion': f'{major}.{minor}.{patch}',
                'major': major, 'minor': minor, 'patch': patch,
                'fileBase': file_base, 'fileTableOffset': table_offset,
                'fileCount': file_count, 'flags': flags, 'files': [],
                'packStart': pack_start, 'embedded': embedded}
        if flags & 1:
            return {**info, 'error': 'Encrypted PCK directory requires the game-specific key; no strings were read.',
                    'code': 'PCK_ENCRYPTED_DIRECTORY'}
        if flags & ~3:
            return {**info, 'error': 'Unsupported PCK storage flags', 'code': 'PCK_UNSUPPORTED_FLAGS'}
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
            entry_flags = u32() if version >= 2 else 0
            if not entry_flags & 2 and (file_base + offset > archive_size or size > archive_size - file_base - offset):
                raise ValueError('Invalid PCK entry data bounds')
            info['files'].append({'path': name, 'raw_path_bytes': path_bytes,
                                  'offset': offset, 'size': size, 'md5': digest.hex(),
                                  'md5_bytes': digest, 'flags': entry_flags,
                                  'directoryEntryPosition': entry_position})
        return info


def localization_columns(header):
    # Accept keyed Godot tables and explicitly named text columns.
    keyed = bool(header) and header[0].lstrip('\ufeff').strip().casefold() in ('key', 'keys')
    columns = {}
    for index, name in enumerate(header):
        name = name.strip().casefold().lstrip('\ufeff')
        field = re.fullmatch(r'(?:text|dialogue|テキスト)(?:[_-]([a-z0-9_-]+)|\(([a-z0-9_-]+)\))', name)
        bare_locale = keyed and index and re.fullmatch(r'[a-z]{2}(?:[-_][a-z0-9]{2,8})*', name)
        locale = (field[1] or field[2]) if field else (name if bare_locale else '')
        if not re.fullmatch(r'[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*', locale):
            continue
        locale = locale.replace('_', '-')
        if locale == 'jp':
            locale = 'ja'
        if locale not in columns.values():
            columns[index] = locale
    return columns


def select_column(columns, requested):
    requested = requested.casefold().replace('_', '-')
    preferred = ('en', 'ja') if requested in ('', 'auto') else (requested,)
    for locale in preferred:
        for column, language in columns.items():
            if language == locale:
                return column
        for column, language in columns.items():
            if language.split('-')[0] == locale:
                return column
    return next(iter(columns), None) if requested in ('', 'auto') else None


def read_localization_table(fp, pack, entry):
    if entry['flags'] or entry['size'] > 16 * 1024 * 1024:
        return None
    fp.seek(pack['fileBase'] + entry['offset'])
    raw = fp.read(entry['size'])
    content = raw.decode('utf-8')
    if entry['path'].lower().endswith('.tsv'):
        lines = re.split(r'(\r\n|\n|\r)', content)
        rows = [line.split('\t') for line in lines[::2]]
        def encode(updated):
            lines[::2] = ['\t'.join(row) for row in updated]
            return ''.join(lines).encode('utf-8')
    else:
        bom = '\ufeff' if content.startswith('\ufeff') else ''
        rows = list(csv.reader(io.StringIO(content.removeprefix(bom), newline=''), strict=True))
        newline = '\r\n' if '\r\n' in content else '\n'
        def encode(updated):
            output = io.StringIO(newline='')
            csv.writer(output, lineterminator=newline).writerows(updated)
            return (bom + output.getvalue()).encode('utf-8')
    columns = localization_columns(rows[0]) if rows else {}
    return (raw, rows, columns, encode) if columns else None


def extract_texts(pck_path, out_json_path, source_language='auto'):
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
            if f['flags']:
                continue
            if pck['pckVersion'] >= 2 and p.lower().endswith(('.tsv', '.csv')):
                try:
                    table = read_localization_table(fp, pck, f)
                except (UnicodeDecodeError, csv.Error):
                    continue
                if table is not None:
                    _, rows, columns, _ = table
                    column = select_column(columns, source_language)
                    if column is None:
                        continue
                    kind = 'tsv' if p.lower().endswith('.tsv') else 'csv_table'
                    for row_index, cells in enumerate(rows[1:], 1):
                        if column >= len(cells) or not cells[column].strip():
                            continue
                        value = cells[column]
                        translatable_texts.append({
                            'id': f'godot_{kind}_{p}_{row_index}',
                            'file': os.path.basename(pck_path), 'subPath': p,
                            'rowIndex': row_index, 'sourceCol': column,
                            'original': value, 'clean': value,
                            'sourceLanguage': columns[column], 'engine': 'godot',
                            'format': f'godot_pck_{kind}'
                        })
                    continue
            if pck['pckVersion'] == 3:
                continue
            # Legacy PCK formats have extraction only.
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

    writable = [row for row in translatable_texts if row['format'] in ('godot_pck_tsv', 'godot_pck_csv_table')]
    if writable:
        translatable_texts = writable
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

    if pck['pckVersion'] >= 2:
        with open(trans_json_path, encoding='utf-8') as source:
            payload = json.load(source)
        if isinstance(payload, dict) and payload.get('format') in ('godot_pck_tsv', 'godot_pck_localization_table'):
            count = apply_localization_tables(pck_path, pck, payload['edits'])
            with open(out_meta_path, 'w', encoding='utf-8') as output:
                json.dump({'success': True, 'appliedCount': count}, output)
            return
    with open(out_meta_path, 'w', encoding='utf-8') as output:
        json.dump({'success': False, 'code': 'PCK_REPACK_REQUIRED',
                   'error': 'PCK application requires a verified repacker; the legacy reserved-header index relocation is not supported.',
                   'appliedCount': 0}, output)
    return


def apply_localization_tables(pck_path, pack, edits):
    if not edits:
        return 0
    source_stat = os.stat(pck_path)
    entries = {entry['path']: entry for entry in pack['files']}
    grouped = {}
    for edit in edits:
        grouped.setdefault(edit['subPath'], []).append(edit)
    changed = []
    with open(pck_path, 'rb') as source:
        for name, table_edits in grouped.items():
            if name not in entries or not name.lower().endswith(('.tsv', '.csv')):
                raise ValueError('Unknown PCK dialogue table')
            entry = entries[name]
            table = read_localization_table(source, pack, entry)
            if table is None:
                raise ValueError('Unsupported PCK dialogue table')
            raw, rows, columns, encode = table
            if hashlib.md5(raw).hexdigest() != entry['md5']:
                raise ValueError('PCK dialogue table checksum mismatch')
            for edit in table_edits:
                row, column = edit['rowIndex'], edit['sourceCol']
                if not 1 <= row < len(rows) or column not in columns:
                    raise ValueError('PCK dialogue position changed')
                cells = rows[row]
                if column >= len(cells) or cells[column] != edit['original']:
                    raise ValueError('PCK dialogue source changed')
                value = edit['translated']
                if not value.strip() or '\0' in value or (
                        name.lower().endswith('.tsv') and any(c in value for c in '\r\n\t')):
                    raise ValueError('Translation would change the localization table structure')
                cells[column] = value
            changed.append((entry, encode(rows)))
    fd, temporary = tempfile.mkstemp(prefix='.opent-pck-', suffix='.tmp', dir=os.path.dirname(pck_path))
    os.close(fd)
    try:
        shutil.copyfile(pck_path, temporary)
        with open(temporary, 'r+b') as staged:
            for entry, output in changed:
                staged.seek(0, os.SEEK_END)
                offset = staged.tell() - pack['fileBase']
                staged.write(output)
                staged.seek(entry['directoryEntryPosition'])
                staged.write(struct.pack('<QQ16s', offset, len(output), hashlib.md5(output).digest()))
            if pack['embedded']:
                staged.seek(0, os.SEEK_END)
                staged.write(struct.pack('<Q4s', staged.tell() - pack['packStart'], b'GDPC'))
        verified = parse_pck(temporary)
        if 'error' in verified or verified['fileCount'] != pack['fileCount']:
            raise ValueError('Repacked PCK could not be read')
        updated = {entry['path']: entry for entry in verified['files']}
        with open(temporary, 'rb') as staged:
            for entry, output in changed:
                new = updated[entry['path']]
                staged.seek(verified['fileBase'] + new['offset'])
                if staged.read(new['size']) != output:
                    raise ValueError('Repacked PCK dialogue verification failed')
        current = os.stat(pck_path)
        if (current.st_size, current.st_mtime_ns) != (source_stat.st_size, source_stat.st_mtime_ns):
            raise ValueError('PCK source changed during application')
        os.replace(temporary, pck_path)
        return len(edits)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


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
        extract_texts(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 'auto')
    elif cmd == "apply":
        apply_translations(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "rollback":
        res = rollback_pck(sys.argv[2])
        print(json.dumps(res, indent=2))
