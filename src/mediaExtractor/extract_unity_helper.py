import os
import sys

# Auto-configure internal vendor site-packages
internal_sp = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "resources", "unity", "site-packages"))
if os.path.exists(internal_sp) and internal_sp not in sys.path:
    sys.path.insert(0, internal_sp)
import sys
import json
import re
import argparse
from pathlib import Path

def sanitize_name(name):
    if not name:
        return "unnamed"
    return re.sub(r'[\\/*?:"<>|]', '_', str(name)).strip()

def main():
    parser = argparse.ArgumentParser(description="Extract assets from Unity games (.assets, AssetBundles)")
    parser.add_argument("--game", required=True, help="Path to Unity game directory")
    parser.add_argument("--dest", required=True, help="Path to destination directory")
    parser.add_argument("--type", default="all", choices=["img", "audio", "all"], help="Asset type to extract")
    args = parser.parse_args()

    game_dir = os.path.abspath(args.game)
    dest_dir = os.path.abspath(args.dest)
    mtype = args.type

    # 1. Check if UnityPy is available
    try:
        import UnityPy
        has_unitypy = True
    except ImportError:
        has_unitypy = False

    # 2. Check for Unity assets
    asset_files = []
    ignored_subdirs = {".git", ".vs", "mono", "monobleedingedge"}
    data_dirs = []
    for root, dirs, files in os.walk(game_dir):
        dirs[:] = [d for d in dirs if d.lower() not in ignored_subdirs]
        has_assets = False
        for f in files:
            flow = f.lower()
            if flow.endswith((".assets", ".bundle")) or flow in ("resources.assets", "globalgamemanagers.assets") or "sharedassets" in flow:
                if not flow.endswith((".ress", ".resource")):
                    asset_files.append(os.path.join(root, f))
                    has_assets = True
        if has_assets and root not in data_dirs:
            data_dirs.append(root)

    if not asset_files:
        print(json.dumps({
            "ok": True,
            "found": 0,
            "extracted": 0,
            "duplicates": 0,
            "collisions": 0,
            "errors": 0,
            "errorList": [],
            "sources": []
        }))
        return

    if not has_unitypy:
        print(json.dumps({
            "ok": False,
            "needExtractor": True,
            "found": len(asset_files),
            "extracted": 0,
            "duplicates": 0,
            "collisions": 0,
            "errors": 1,
            "errorList": ["Recursos Unity empacotados detectados (.assets/AssetBundles). Este formato requer extractor específico (UnityPy)."],
            "sources": []
        }))
        return

    total_found = 0
    extracted_count = 0
    duplicates_count = 0
    collisions_count = 0
    errors = []
    sources = []

    os.makedirs(dest_dir, exist_ok=True)

    for data_dir in (data_dirs if data_dirs else [game_dir]):
        try:
            env = UnityPy.Environment()
            env.load_folder(data_dir)
        except Exception as e:
            errors.append(f"Falha ao carregar pasta de assets {data_dir}: {str(e)}")
            continue

        dir_extracted = 0
        dir_duplicates = 0
        dir_collisions = 0

        for obj in env.objects:
            tname = obj.type.name

            # --- IMAGES / TEXTURES ---
            if tname in ("Texture2D", "Sprite") and mtype in ("img", "all"):
                try:
                    data = obj.read()
                    # Skip dummy stream placeholders with empty path
                    if hasattr(data, "m_StreamData") and not data.m_StreamData.path and data.m_StreamData.size == 0:
                        continue

                    img = getattr(data, "image", None)
                    if img:
                        total_found += 1
                        raw_name = getattr(data, "m_Name", "") or f"texture_{obj.path_id}"
                        safe_name = sanitize_name(raw_name)
                        out_dir = os.path.join(dest_dir, "Unity_Assets", "Textures")
                        out_path = os.path.join(out_dir, f"{safe_name}.png")

                        if os.path.exists(out_path):
                            collisions_count += 1
                            dir_collisions += 1
                            temp_dest_bytes = None
                            try:
                                with open(out_path, "rb") as ef:
                                    temp_dest_bytes = ef.read()
                            except:
                                pass

                            import io
                            mem_buf = io.BytesIO()
                            img.save(mem_buf, format="PNG")
                            mem_bytes = mem_buf.getvalue()

                            if temp_dest_bytes and temp_dest_bytes == mem_bytes:
                                duplicates_count += 1
                                dir_duplicates += 1
                                continue
                            else:
                                out_path = os.path.join(out_dir, f"{safe_name}_{obj.path_id}.png")
                                if os.path.exists(out_path):
                                    with open(out_path, "rb") as ef2:
                                        if ef2.read() == mem_bytes:
                                            duplicates_count += 1
                                            dir_duplicates += 1
                                            continue

                        os.makedirs(out_dir, exist_ok=True)
                        img.save(out_path, format="PNG")
                        extracted_count += 1
                        dir_extracted += 1
                except Exception as ex:
                    errors.append(f"Erro em {tname} (ID {obj.path_id}): {str(ex)}")

            # --- AUDIO CLIPS ---
            elif tname == "AudioClip" and mtype in ("audio", "all"):
                try:
                    data = obj.read()
                    samples = getattr(data, "samples", {})
                    if samples:
                        for sname, sbytes in samples.items():
                            total_found += 1
                            safe_name = sanitize_name(sname)
                            out_dir = os.path.join(dest_dir, "Unity_Assets", "Audio")
                            out_path = os.path.join(out_dir, safe_name)

                            if os.path.exists(out_path):
                                collisions_count += 1
                                dir_collisions += 1
                                with open(out_path, "rb") as ef:
                                    if ef.read() == sbytes:
                                        duplicates_count += 1
                                        dir_duplicates += 1
                                        continue
                                out_path = os.path.join(out_dir, f"{Path(safe_name).stem}_{obj.path_id}{Path(safe_name).suffix}")
                                if os.path.exists(out_path):
                                    with open(out_path, "rb") as ef2:
                                        if ef2.read() == sbytes:
                                            duplicates_count += 1
                                            dir_duplicates += 1
                                            continue

                            os.makedirs(out_dir, exist_ok=True)
                            with open(out_path, "wb") as sf:
                                sf.write(sbytes)
                            extracted_count += 1
                            dir_extracted += 1
                except Exception as ex:
                    errors.append(f"Erro em AudioClip (ID {obj.path_id}): {str(ex)}")

            # --- TEXT ASSETS ---
            elif tname == "TextAsset" and mtype == "all":
                try:
                    data = obj.read()
                    text_bytes = getattr(data, "script", None)
                    if text_bytes is None:
                        t = getattr(data, "text", "")
                        text_bytes = t.encode("utf-8") if isinstance(t, str) else b""

                    if text_bytes:
                        total_found += 1
                        raw_name = getattr(data, "m_Name", "") or f"text_{obj.path_id}"
                        safe_name = sanitize_name(raw_name)
                        ext = ".json" if text_bytes.strip().startswith((b"{", b"[")) else ".txt"
                        out_dir = os.path.join(dest_dir, "Unity_Assets", "Data")
                        out_path = os.path.join(out_dir, f"{safe_name}{ext}")

                        if os.path.exists(out_path):
                            collisions_count += 1
                            dir_collisions += 1
                            with open(out_path, "rb") as ef:
                                if ef.read() == text_bytes:
                                    duplicates_count += 1
                                    dir_duplicates += 1
                                    continue
                            out_path = os.path.join(out_dir, f"{safe_name}_{obj.path_id}{ext}")
                            if os.path.exists(out_path):
                                with open(out_path, "rb") as ef2:
                                    if ef2.read() == text_bytes:
                                        duplicates_count += 1
                                        dir_duplicates += 1
                                        continue

                        os.makedirs(out_dir, exist_ok=True)
                        with open(out_path, "wb") as tf:
                            tf.write(text_bytes)
                        extracted_count += 1
                        dir_extracted += 1
                except Exception as ex:
                    errors.append(f"Erro em TextAsset (ID {obj.path_id}): {str(ex)}")

        if dir_extracted > 0 or dir_duplicates > 0:
            sources.append(f"pacotes Unity (.assets / AssetBundles via UnityPy): {dir_extracted} novos, {dir_duplicates} já existentes")

    print(json.dumps({
        "ok": True,
        "found": total_found,
        "extracted": extracted_count,
        "duplicates": duplicates_count,
        "collisions": collisions_count,
        "errors": len(errors),
        "errorList": errors[:20],
        "sources": sources
    }, ensure_ascii=False))

if __name__ == "__main__":
    main()
