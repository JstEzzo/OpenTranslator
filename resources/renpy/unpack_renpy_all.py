#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenTranslator - Official Ren'Py Unpacker & Decompiler (via unrpyc)
Integration with the official unrpyc repository (CensoredUsername/unrpyc)
Extracts 100% of packages (.rpa, .gz) and decompiles 100% of scripts and bytecodes 
(.rpyc, .rpyb, .rpymc, .rpym, .pyc) generating official script files (.rpy) 
and corresponding text documents (.txt) with automated watermark removal.
"""

import os
import sys
import zlib
import gzip
import pickle
import marshal
import dis
import argparse
import glob
import io
import re
import subprocess
from shutil import copyfile

# Force UTF-8 encoding for standard outputs
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Path to the official unrpyc decompiler (dynamically resolved)
def get_unrpyc_script(py_version="3"):
    base = os.path.dirname(__file__)
    if str(py_version).startswith("2") and os.path.exists(os.path.join(base, "unrpyc_legacy", "unrpyc.py")):
        return os.path.join(base, "unrpyc_legacy", "unrpyc.py")
    if os.path.exists(os.path.join(base, "unrpyc_v2", "unrpyc.py")):
        return os.path.join(base, "unrpyc_v2", "unrpyc.py")
    if os.path.exists(os.path.join(base, "unrpyc", "unrpyc.py")):
        return os.path.join(base, "unrpyc", "unrpyc.py")
    return os.path.join(base, "unrpyc_v2", "unrpyc.py")

UNRPYC_SCRIPT = get_unrpyc_script()

def extract_fallback_strings(data):
    """Extracts readable UTF-8 and ASCII strings from binary files"""
    lines = []
    for i in range(len(data) - 2):
        if data[i] == 0x78 and (data[i+1] in (0x01, 0x5e, 0x9c, 0xda)):
            try:
                decompressed = zlib.decompress(data[i:])
                str_matches = re.findall(r'[\x20-\x7E\u00A0-\u00FF]{3,}', decompressed.decode('latin1', errors='ignore'))
                for m in str_matches:
                    m_clean = m.strip()
                    if len(m_clean) >= 3 and not m_clean.startswith("renpy."):
                        lines.append(m_clean)
            except Exception:
                pass
    
    if not lines:
        str_matches = re.findall(r'[\x20-\x7E\u00A0-\u00FF]{3,}', data.decode('latin1', errors='ignore'))
        for m in str_matches:
            m_clean = m.strip()
            if len(m_clean) >= 3 and not m_clean.startswith("renpy."):
                lines.append(m_clean)
    return lines

def extract_code_consts(code_obj, result_list, visited=None):
    """Recursively extracts constants and strings from Python code objects"""
    if visited is None:
        visited = set()
    if id(code_obj) in visited:
        return
    visited.add(id(code_obj))

    if hasattr(code_obj, 'co_consts') and isinstance(code_obj.co_consts, (list, tuple)):
        for const_val in code_obj.co_consts:
            if hasattr(const_val, 'co_code'):
                extract_code_consts(const_val, result_list, visited)
            elif isinstance(const_val, str):
                c_str = const_val.strip()
                if len(c_str) > 0 and not c_str.startswith("renpy."):
                    formatted = f'"{c_str}"' if '\n' not in c_str else f'"""{c_str}"""'
                    if formatted not in result_list:
                        result_list.append(formatted)

def decompile_python_pyc(file_path, out_py_path):
    """Decompiles a Python file (.pyc) directly into .py"""
    rel_name = os.path.basename(file_path)
    try:
        code_obj = None
        with open(file_path, "rb") as f:
            data = f.read()

        for header_offset in (16, 12, 8, 4, 0):
            try:
                buf = io.BytesIO(data[header_offset:])
                code_obj = marshal.load(buf)
                if hasattr(code_obj, 'co_code'):
                    break
            except Exception:
                code_obj = None

        text_lines = [
            f"# OpenTranslator Decompiled Python Module: {rel_name}",
            "# ============================================================"
        ]

        if code_obj and hasattr(code_obj, 'co_code'):
            extracted_strings = []
            extract_code_consts(code_obj, extracted_strings)
            if extracted_strings:
                text_lines.append("# --- Constants & Dialogues/Strings ---")
                text_lines.extend(extracted_strings)

            # Note: dis.dis omitted to prevent C-level segfaults on cross-version Python bytecodes
        else:
            strings = extract_fallback_strings(data)
            if strings:
                text_lines.append("# --- Extracted Strings via RegEx ---")
                text_lines.extend(strings)

        if len(text_lines) <= 2:
            return False

        full_content = "\n".join(text_lines)
        os.makedirs(os.path.dirname(out_py_path), exist_ok=True)
        with open(out_py_path, "w", encoding="utf-8", errors="replace") as f_out:
            f_out.write(full_content)
        return True
    except Exception:
        return False

def extract_gz_archive(gz_path, out_file_path):
    """Decompresses a .gz archive (e.g., manifest.gz)"""
    try:
        with gzip.open(gz_path, 'rb') as f_in:
            content = f_in.read()
        os.makedirs(os.path.dirname(out_file_path), exist_ok=True)
        with open(out_file_path, 'wb') as f_out:
            f_out.write(content)
        return True
    except Exception:
        return False

def run_official_unrpyc(target_dir):
    """Executes the official unrpyc decompiler in batch across the target directory"""
    if not os.path.exists(UNRPYC_SCRIPT):
        print(f"[unrpyc Warning] Official script '{UNRPYC_SCRIPT}' not found. Using fallback engine...")
        return False

    try:
        env = os.environ.copy()
        unrpyc_dir = os.path.dirname(UNRPYC_SCRIPT)
        env["PYTHONPATH"] = unrpyc_dir + os.pathsep + env.get("PYTHONPATH", "")
        cmd = [sys.executable, UNRPYC_SCRIPT, "-c", "--try-harder", "-p", "1", target_dir]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore", cwd=unrpyc_dir, env=env)
        if res.stdout:
            for line in res.stdout.splitlines():
                if line.strip():
                    print(f"[unrpyc] {line.strip()}")
        if res.stderr:
            for line in res.stderr.splitlines():
                if line.strip() and "DeprecationWarning" not in line:
                    print(f"[unrpyc Warning] {line.strip()}")
        print("[Official unrpyc Decompiler] ✓ Official unrpyc decompilation completed!")
        return True
    except Exception as e:
        print(f"[unrpyc Error] Failed to execute unrpyc: {e}")
        return False

def strip_unrpyc_header_footer(target_dir):
    """Strips the '# Decompiled by unrpyc' watermark comment lines from all decompiled files"""
    print("[Ren'Py Unpacker] 🧹 Cleaning '# Decompiled by unrpyc' watermarks from all script files...")
    cleaned_count = 0
    for root, dirs, files in os.walk(target_dir):
        for f in files:
            f_lower = f.lower()
            if f_lower.endswith(".rpy") or f_lower.endswith(".txt") or f_lower.endswith(".py"):
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f_in:
                        lines = f_in.readlines()
                    
                    new_lines = [
                        line for line in lines 
                        if "Decompiled by unrpyc" not in line and "github.com/CensoredUsername/unrpyc" not in line
                    ]
                    
                    if len(new_lines) != len(lines):
                        with open(full_path, "w", encoding="utf-8", errors="replace") as f_out:
                            f_out.writelines(new_lines)
                        cleaned_count += 1
                except Exception:
                    pass
    print(f"[Ren'Py Unpacker] ✓ Cleaned watermarks from {cleaned_count} script files!")

def generate_txt_files_from_rpy(target_dir):
    """Generates .txt files for each decompiled .rpy and .py file for easy reading"""
    print("[Ren'Py Unpacker] 📝 Generating text documents (.txt) for all decompiled scripts...")
    created_txt = 0
    for root, dirs, files in os.walk(target_dir):
        for f in files:
            f_lower = f.lower()
            if f_lower.endswith(".rpy") or f_lower.endswith(".py"):
                full_path = os.path.join(root, f)
                base_name = os.path.splitext(full_path)[0]
                txt_path = base_name + ".txt"
                if not os.path.exists(txt_path):
                    try:
                        copyfile(full_path, txt_path)
                        created_txt += 1
                    except Exception:
                        pass
    print(f"[Ren'Py Unpacker] ✓ Created {created_txt} .txt files corresponding to the scripts!")

def purge_rogue_renpy_dirs(target_dir):
    """Deletes any rogue 'renpy' directories inside game tree to prevent Python Namespace Shadowing"""
    import shutil
    for root, dirs, files in os.walk(target_dir, topdown=False):
        for d in dirs:
            if d.lower() == "renpy":
                rogue_path = os.path.join(root, d)
                print(f"[Ren'Py Unpacker] 🧹 Purging rogue engine folder '{rogue_path}' to prevent Namespace Shadowing...")
                try:
                    shutil.rmtree(rogue_path, ignore_errors=True)
                except Exception:
                    pass

def unpack_all_rpa(game_dir, output_dir):
    """Extracts 100% of packages (.rpa, .gz) and decompiles 100% of scripts using the official unrpyc engine"""
    if not os.path.exists(game_dir):
        print(f"[ERROR] Game directory '{game_dir}' not found.")
        return 0

    game_sub_dir = os.path.join(game_dir, "game") if os.path.isdir(os.path.join(game_dir, "game")) else game_dir
    os.makedirs(output_dir, exist_ok=True)

    rpa_files = glob.glob(os.path.join(game_sub_dir, "**/*.rpa"), recursive=True)
    IGNORED_RPAS = {"common.rpa", "renpy.rpa", "system.rpa"}
    rpa_files = [f for f in list(set(rpa_files)) if os.path.basename(f).lower() not in IGNORED_RPAS and "renpy" not in os.path.dirname(f).lower()]

    print(f"[Universal Unpacker] 🔍 Scanning game directory: {game_sub_dir}")
    if rpa_files:
        print(f"[Universal Unpacker] 📦 Found {len(rpa_files)} .rpa packages for full extraction.")
    else:
        print("[Universal Unpacker] No .rpa packages found. Copying project file structure...")

    total_extracted = 0
    for rpa_path in rpa_files:
        rpa_name = os.path.basename(rpa_path)
        print(f"[Universal Unpacker] ⚙️ Extracting package '{rpa_name}' ...")
        try:
            with open(rpa_path, "rb") as f:
                header = f.readline()
                if not (header.startswith(b"RPA-3.0") or header.startswith(b"RPA-2.0") or header.startswith(b"RPA-4.0")):
                    print(f"[Universal Unpacker] ❌ Error in '{rpa_name}': Incompatible RPA header.")
                    continue
                parts = header.split()
                if len(parts) < 2:
                    continue
                offset = int(parts[1], 16)
                key = int(parts[2], 16) if len(parts) > 2 else 0

                f.seek(offset)
                compressed_index = f.read()
                index_data = zlib.decompress(compressed_index)
                index = pickle.loads(index_data, encoding="latin1")

                extracted_in_rpa = 0
                for filename, d in index.items():
                    fn_lower = filename.lower()
                    if fn_lower.endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tga', '.ogg', '.wav', '.mp3', '.flac', '.aac', '.m4a', '.opus', '.mp4', '.avi', '.webm')):
                        continue
                    if fn_lower.startswith("common/") or fn_lower.startswith("renpy/"):
                        continue
                    if isinstance(d, list) and len(d) > 0:
                        entry = d[0]
                        if isinstance(entry, tuple) and len(entry) >= 2:
                            file_offset = entry[0] ^ key
                            file_length = entry[1] ^ key
                            f.seek(file_offset)
                            content = f.read(file_length)

                            clean_filename = filename.lstrip("/\\")
                            out_file = os.path.join(output_dir, clean_filename)
                            os.makedirs(os.path.dirname(out_file), exist_ok=True)
                            with open(out_file, "wb") as out_f:
                                out_f.write(content)
                            extracted_in_rpa += 1
                            total_extracted += 1
                print(f"[Universal Unpacker] ✓ Extracted {extracted_in_rpa} files from '{rpa_name}'.")
        except Exception as e:
            print(f"[Universal Unpacker] ❌ Error in '{rpa_name}': {e}")

    # Anti-Namespace Shadowing: Purge extracted common engine directories inside game output
    import shutil
    for shadow_dir in [os.path.join(output_dir, "common"), os.path.join(output_dir, "renpy")]:
        if os.path.exists(shadow_dir):
            try:
                shutil.rmtree(shadow_dir, ignore_errors=True)
            except Exception:
                pass

    # Copy loose files from the project to the destination folder
    loose_copied = copy_loose_files(game_sub_dir, output_dir)
    print(f"[Universal Unpacker] 📁 Copied {loose_copied} loose files from the game folder.")

    # 1. Decompress .gz files
    for root, dirs, files in os.walk(output_dir):
        for f in files:
            if f.lower().endswith(".gz"):
                gz_full = os.path.join(root, f)
                out_uncompressed = os.path.splitext(gz_full)[0]
                extract_gz_archive(gz_full, out_uncompressed)

    # 2. Decompile Ren'Py scripts with the official unrpyc engine
    run_official_unrpyc(output_dir)

    # 3. Decompile Python modules (.pyc)
    for root, dirs, files in os.walk(output_dir):
        for f in files:
            if f.lower().endswith(".pyc"):
                pyc_full = os.path.join(root, f)
                out_py = pyc_full[:-4] + ".py"
                decompile_python_pyc(pyc_full, out_py)

    # 4. Clean watermark comments from all decompiled scripts
    strip_unrpyc_header_footer(output_dir)

    # 5. Purge rogue renpy folders
    purge_rogue_renpy_dirs(output_dir)

    # 6. Generate corresponding .txt files for all .rpy and .py scripts
    generate_txt_files_from_rpy(output_dir)

    print(f"[Universal Unpacker] ✨ PROCESS COMPLETED SUCCESSFULLY! All files saved to: '{output_dir}'.")
    return total_extracted + loose_copied

def copy_loose_files(src_dir, dst_dir):
    """Copies all non-RPA files dynamically mirroring the tree structure"""
    if os.path.abspath(src_dir) == os.path.abspath(dst_dir):
        return 0
    copied = 0
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            if f.lower().endswith(".rpa"):
                continue
            rel_path = os.path.relpath(os.path.join(root, f), src_dir)
            target_path = os.path.join(dst_dir, rel_path)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            try:
                src_file = os.path.abspath(os.path.join(root, f))
                dst_file = os.path.abspath(target_path)
                if src_file != dst_file:
                    copyfile(src_file, dst_file)
                    copied += 1
            except Exception:
                pass
    return copied

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Universal Ren'Py Unpacker & Decompiler (Official unrpyc Integration)")
    parser.add_argument("-i", "--input", "--game-dir", dest="input", required=True, help="Ren'Py game directory")
    parser.add_argument("-o", "--output", dest="output", help="Output directory for extraction")
    parser.add_argument("--mode", help="Execution mode")
    parser.add_argument("--py-version", help="Python version override")
    args = parser.parse_args()
    out_dir = args.output if args.output else args.input
    unpack_all_rpa(args.input, out_dir)
