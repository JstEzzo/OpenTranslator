import os
import sys
import json
import csv
import io
import argparse

# Force UTF-8 on Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

site_pkg = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../resources/unity/site-packages"))
if os.path.exists(site_pkg) and site_pkg not in sys.path:
    sys.path.insert(0, site_pkg)

try:
    import UnityPy
    UNITYPY_AVAILABLE = True
except Exception:
    UNITYPY_AVAILABLE = False

NON_TRANSLATABLE_KEYWORDS = {
    "shader", "atlas", "spine", "material", "physics", "mesh",
    "transform", "camera", "light", "audiomixer", "texture",
    "png", "jpg", "wav", "mp3", "ogg", "prefab", "cginc", "hlsl",
    "linebreaking"
}

def is_translatable_text(s):
    if not s or not isinstance(s, str):
        return False
    t = s.strip()
    if len(t) < 2 or len(t) > 3000:
        return False
    # Filter code, configs, system symbols
    if t.startswith(("{", "[", "/*", "//", "<!--", "#", "<", "\"", "'")):
        return False
    if any(tech in t for tech in [
        "com.unity.", "UnityEngine", "System.", "PublicKeyToken",
        "Version=0.", "Assembly", "guid:", "m_Script:", "--- !u!",
        "\"curve\":", "\"time\":", "\"x\":", "\"y\":", "\"rotate\":",
        "http://", "https://"
    ]):
        return False
    if t.endswith((".png", ".jpg", ".jpeg", ".wav", ".mp3", ".ogg", ".shader", ".cginc", ".dll")):
        return False
    # Must contain alphabetic characters or CJK ideographs
    letter_count = sum(1 for c in t if c.isalnum() or '\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u30ff')
    if letter_count < 2 or (letter_count / len(t)) < 0.20:
        return False
    return True

def extract_from_game(game_dir):
    texts = []
    visited_ids = set()

    # 1. Resolve Data directory
    data_dir = None
    if os.path.exists(game_dir):
        for e in os.listdir(game_dir):
            if e.lower().endswith("_data") and os.path.isdir(os.path.join(game_dir, e)):
                data_dir = os.path.join(game_dir, e)
                break

    # 2. Extract from UnityPy Serialized Assets
    if UNITYPY_AVAILABLE and data_dir and os.path.exists(data_dir):
        asset_files = [f for f in os.listdir(data_dir) if f.endswith(".assets")]
        for af in asset_files:
            af_path = os.path.join(data_dir, af)
            rel_file = os.path.relpath(af_path, game_dir).replace("\\", "/")
            try:
                env = UnityPy.load(af_path)
                for obj in env.objects:
                    if getattr(obj.type, "name", "") == "TextAsset":
                        data = obj.read()
                        name = getattr(data, "m_Name", getattr(data, "name", "unnamed"))
                        path_id = obj.path_id

                        # Skip technical shader/atlas/physics assets
                        lower_name = name.lower()
                        if any(kw in lower_name for kw in NON_TRANSLATABLE_KEYWORDS) or any(k in lower_name for k in ["performancetest", "unityservices", "buildinfo", "editor"]):
                            continue

                        raw = getattr(data, "m_Script", getattr(data, "script", b""))
                        if not raw:
                            continue

                        text_content = raw if isinstance(raw, str) else raw.decode("utf-8", errors="ignore")
                        stripped = text_content.strip()
                        if not stripped:
                            continue

                        # Check if CSV (ignoring JSON / Spine)
                        if "\n" in stripped and ("," in stripped or "\t" in stripped) and not stripped.startswith(("{", "[")) and "skeleton" not in stripped and "bones" not in stripped:
                            first_line = stripped.split("\n", 1)[0]
                            delimiter = "\t" if "\t" in first_line and "," not in first_line else ","
                            try:
                                reader = list(csv.reader(io.StringIO(stripped), delimiter=delimiter))
                                if len(reader) > 1:
                                    header = reader[0]
                                    text_col_indices = []
                                    for idx, col in enumerate(header):
                                        c_lower = col.strip().lower()
                                        if any(k in c_lower for k in ["name", "title", "text", "chapter", "tips", "msg", "dialogue", "content", "desc"]):
                                            text_col_indices.append(idx)
                                    if not text_col_indices:
                                        # Default to all non-id/number columns
                                        for idx, col in enumerate(header):
                                            c_lower = col.strip().lower()
                                            if not any(k in c_lower for k in ["id", "index", "price", "day", "flag", "code"]):
                                                text_col_indices.append(idx)

                                    for r_idx in range(1, len(reader)):
                                        row = reader[r_idx]
                                        for c_idx in text_col_indices:
                                            if c_idx < len(row):
                                                cell = row[c_idx].strip()
                                                if is_translatable_text(cell):
                                                    entry_id = f"unity_asset_{af}_{name}_r{r_idx}_c{c_idx}"
                                                    if entry_id not in visited_ids:
                                                        visited_ids.add(entry_id)
                                                        texts.append({
                                                            "id": entry_id,
                                                            "file": rel_file,
                                                            "asset": af,
                                                            "name": name,
                                                            "pathId": path_id,
                                                            "rowIndex": r_idx,
                                                            "colIndex": c_idx,
                                                            "context": header[c_idx] if c_idx < len(header) else f"col_{c_idx}",
                                                            "original": cell,
                                                            "clean": cell,
                                                            "format": "csv_cell",
                                                            "engine": "unity"
                                                        })
                                    continue
                            except Exception:
                                pass

                        # Check if JSON
                        if (stripped.startswith("{") and stripped.endswith("}")) or (stripped.startswith("[") and stripped.endswith("]")):
                            if "skeleton" in stripped or "bones" in stripped:
                                continue
                            try:
                                parsed = json.loads(stripped)
                                def scan_json(val, kpath):
                                    if isinstance(val, dict):
                                        for k, v in val.items():
                                            scan_json(v, f"{kpath}.{k}" if kpath else k)
                                    elif isinstance(val, list):
                                        for idx, v in enumerate(val):
                                            scan_json(v, f"{kpath}[{idx}]")
                                    elif isinstance(val, str) and is_translatable_text(val):
                                        entry_id = f"unity_asset_{af}_{name}_{kpath}"
                                        if entry_id not in visited_ids:
                                            visited_ids.add(entry_id)
                                            texts.append({
                                                "id": entry_id,
                                                "file": rel_file,
                                                "asset": af,
                                                "name": name,
                                                "pathId": path_id,
                                                "keyPath": kpath,
                                                "context": kpath,
                                                "original": val.strip(),
                                                "clean": val.strip(),
                                                "format": "json_field",
                                                "engine": "unity"
                                            })
                                scan_json(parsed, "")
                                if len(texts) > 0:
                                    continue
                            except Exception:
                                pass

                        # Fallback: line by line
                        lines = stripped.split("\n")
                        for l_idx, line in enumerate(lines):
                            l_strip = line.strip()
                            if is_translatable_text(l_strip):
                                entry_id = f"unity_asset_{af}_{name}_l{l_idx+1}"
                                if entry_id not in visited_ids:
                                    visited_ids.add(entry_id)
                                    texts.append({
                                        "id": entry_id,
                                        "file": rel_file,
                                        "asset": af,
                                        "name": name,
                                        "pathId": path_id,
                                        "line": l_idx + 1,
                                        "context": f"{name} line {l_idx+1}",
                                        "original": l_strip,
                                        "clean": l_strip,
                                        "format": "text_line",
                                        "engine": "unity"
                                    })
            except Exception:
                pass

    # 3. Extract from AutoTranslator dictionaries
    at_dir = os.path.join(game_dir, "AutoTranslator", "Translation")
    if os.path.exists(at_dir):
        for root_p, _, files in os.walk(at_dir):
            for f in files:
                if f.endswith(".txt") and not f.startswith("_Pre") and not f.startswith("_Post"):
                    full_p = os.path.join(root_p, f)
                    rel_p = os.path.relpath(full_p, game_dir).replace("\\", "/")
                    try:
                        with open(full_p, "r", encoding="utf-8", errors="ignore") as fp:
                            for idx, line in enumerate(fp):
                                l_str = line.strip()
                                if l_str and not l_str.startswith("//") and "=" in l_str:
                                    eq_idx = l_str.find("=")
                                    orig = l_str[:eq_idx].strip()
                                    trans = l_str[eq_idx+1:].strip()
                                    if orig:
                                        entry_id = f"unity_at_{f}_{idx+1}"
                                        if entry_id not in visited_ids:
                                            visited_ids.add(entry_id)
                                            texts.append({
                                                "id": entry_id,
                                                "file": rel_p,
                                                "line": idx + 1,
                                                "context": f"AutoTranslator {f}",
                                                "original": orig,
                                                "clean": orig,
                                                "translated": trans,
                                                "format": "autotranslator",
                                                "engine": "unity"
                                            })
                    except Exception:
                        pass

    # 4. Extract from root and StreamingAssets text files
    scan_paths = [game_dir]
    if data_dir:
        sa_dir = os.path.join(data_dir, "StreamingAssets")
        if os.path.exists(sa_dir):
            scan_paths.append(sa_dir)

    for sp in scan_paths:
        try:
            for ent in os.listdir(sp):
                if ent.lower().endswith((".txt", ".csv", ".json", ".tsv")) and not ent.startswith("."):
                    if any(k in ent.lower() for k in ["unityservices", "buildinfo", "performance"]):
                        continue
                    full_p = os.path.join(sp, ent)
                    if not os.path.isfile(full_p):
                        continue
                    rel_p = os.path.relpath(full_p, game_dir).replace("\\", "/")
                    try:
                        with open(full_p, "r", encoding="utf-8", errors="ignore") as fp:
                            content = fp.read()
                        if ent.lower().endswith(".json"):
                            parsed = json.loads(content)
                            def scan_root_json(val, kpath):
                                if isinstance(val, dict):
                                    for k, v in val.items():
                                        scan_root_json(v, f"{kpath}.{k}" if kpath else k)
                                elif isinstance(val, list):
                                    for idx, v in enumerate(val):
                                        scan_root_json(v, f"{kpath}[{idx}]")
                                elif isinstance(val, str) and is_translatable_text(val):
                                    entry_id = f"unity_json_{ent}_{kpath}"
                                    if entry_id not in visited_ids:
                                        visited_ids.add(entry_id)
                                        texts.append({
                                            "id": entry_id,
                                            "file": rel_p,
                                            "keyPath": kpath,
                                            "context": kpath,
                                            "original": val.strip(),
                                            "clean": val.strip(),
                                            "format": "json_field",
                                            "engine": "unity"
                                        })
                            scan_root_json(parsed, "")
                        else:
                            for idx, line in enumerate(content.split("\n")):
                                l_str = line.strip()
                                if is_translatable_text(l_str):
                                    entry_id = f"unity_file_{ent}_{idx+1}"
                                    if entry_id not in visited_ids:
                                        visited_ids.add(entry_id)
                                        texts.append({
                                            "id": entry_id,
                                            "file": rel_p,
                                            "line": idx + 1,
                                            "context": f"{ent} line {idx+1}",
                                            "original": l_str,
                                            "clean": l_str,
                                            "format": "text_line",
                                            "engine": "unity"
                                        })
                    except Exception:
                        pass
        except Exception:
            pass

    return {
        "success": True,
        "count": len(texts),
        "texts": texts
    }

def inject_into_game(game_dir, payload_file):
    if not os.path.exists(payload_file):
        return {"success": False, "error": "Payload file not found", "modifiedFiles": [], "count": 0}

    with open(payload_file, "r", encoding="utf-8") as fp:
        translation_map = json.load(fp)

    modified_files = set()
    injected_count = 0

    # Group translations by file
    items_by_file = {}
    for item in translation_map.get("items", []):
        f = item.get("file")
        if f:
            items_by_file.setdefault(f, []).append(item)

    # 1. Inject into UnityPy .assets
    for rel_file, file_items in items_by_file.items():
        full_path = os.path.join(game_dir, rel_file)
        if not os.path.exists(full_path):
            continue

        if rel_file.endswith(".assets") and UNITYPY_AVAILABLE:
            try:
                env = UnityPy.load(full_path)
                asset_modified = False

                # Group by pathId
                by_path_id = {}
                for it in file_items:
                    pid = it.get("pathId")
                    if pid is not None:
                        by_path_id.setdefault(pid, []).append(it)

                for obj in env.objects:
                    if obj.path_id in by_path_id:
                        data = obj.read()
                        raw = getattr(data, "m_Script", getattr(data, "script", b""))
                        text = raw if isinstance(raw, str) else raw.decode("utf-8", errors="ignore")
                        items = by_path_id[obj.path_id]
                        fmt = items[0].get("format")

                        if fmt == "csv_cell":
                            first_line = text.split("\n", 1)[0]
                            delimiter = "\t" if "\t" in first_line and "," not in first_line else ","
                            rows = list(csv.reader(io.StringIO(text), delimiter=delimiter))
                            for it in items:
                                r_idx = it.get("rowIndex")
                                c_idx = it.get("colIndex")
                                trans = it.get("translation")
                                if r_idx is not None and c_idx is not None and trans:
                                    if r_idx < len(rows) and c_idx < len(rows[r_idx]):
                                        rows[r_idx][c_idx] = trans
                                        injected_count += 1
                                        asset_modified = True
                            out_io = io.StringIO()
                            writer = csv.writer(out_io, delimiter=delimiter, lineterminator="\r\n")
                            writer.writerows(rows)
                            new_text = out_io.getvalue()
                            data.m_Script = new_text.encode("utf-8") if isinstance(raw, bytes) else new_text
                            data.save()

                        elif fmt == "text_line":
                            lines = text.split("\n")
                            for it in items:
                                l_idx = it.get("line")
                                trans = it.get("translation")
                                if l_idx is not None and trans and 1 <= l_idx <= len(lines):
                                    orig = it.get("original")
                                    if orig in lines[l_idx-1]:
                                        lines[l_idx-1] = lines[l_idx-1].replace(orig, trans)
                                    else:
                                        lines[l_idx-1] = trans
                                    injected_count += 1
                                    asset_modified = True
                            new_text = "\n".join(lines)
                            data.m_Script = new_text.encode("utf-8") if isinstance(raw, bytes) else new_text
                            data.save()

                if asset_modified:
                    out_bytes = env.file.save()
                    with open(full_path, "wb") as out_fp:
                        out_fp.write(out_bytes)
                    modified_files.add(full_path)
            except Exception as e:
                pass

        elif rel_file.endswith(".txt") and "AutoTranslator" in rel_file:
            # AutoTranslator dictionary
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as fp:
                    lines = fp.readlines()
                line_modified = False
                for it in file_items:
                    orig = it.get("original")
                    trans = it.get("translation")
                    l_idx = it.get("line")
                    if orig and trans and l_idx and 1 <= l_idx <= len(lines):
                        lines[l_idx-1] = f"{orig}={trans}\n"
                        injected_count += 1
                        line_modified = True
                if line_modified:
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
