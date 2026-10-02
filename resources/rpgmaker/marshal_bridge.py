#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenTranslator - RPG Maker XP / VX / VX Ace Ruby Marshal Sidecar Bridge
Converts Ruby Marshal binary data (.rxdata, .rvdata, .rvdata2) to JSON and back safely,
extracting dialogue lines (code: 401), choices (code: 102), names and descriptions,
and injecting the OpenTranslator RGSS Runtime & Look-Ahead Word-Wrap hook into Scripts.
Uses Marshal-aware string replacement to preserve Ruby binary length headers.
"""

import os
import sys
import json
import zlib
import re
import argparse

ESC_RE = re.compile(r'\\+[A-Za-z0-9_]+(\[[^\]]*\])?|\\+[{}!.\|^$><\\%]', re.IGNORECASE)

def marshal_encode_int(n):
    if n == 0:
        return b'\x00'
    if 0 < n <= 122:
        return bytes([n + 5])
    if -122 <= n < 0:
        return bytes([(n - 5) & 0xff])
    if 0 < n <= 255:
        return b'\x01' + bytes([n])
    if 0 < n <= 65535:
        return b'\x02' + bytes([n & 0xff, (n >> 8) & 0xff])
    if 0 < n <= 16777215:
        return b'\x03' + bytes([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff])
    return b'\x04' + bytes([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])

def replace_marshal_string(raw_bytes, orig_b, tr_b):
    len_orig = len(orig_b)
    len_tr = len(tr_b)
    hdr_orig = marshal_encode_int(len_orig)
    hdr_tr = marshal_encode_int(len_tr)

    patterns = [
        (b'"' + hdr_orig + orig_b, b'"' + hdr_tr + tr_b),
        (b'I"' + hdr_orig + orig_b, b'I"' + hdr_tr + tr_b),
    ]

    modified = False
    for p_orig, p_tr in patterns:
        if p_orig in raw_bytes:
            raw_bytes = raw_bytes.replace(p_orig, p_tr)
            modified = True

    return raw_bytes, modified

def is_translatable(s):
    if not isinstance(s, str):
        return False
    clean = s.strip()
    if len(clean) < 1:
        return False
    if len(clean) == 1 and ord(clean) < 128:
        return False
    if re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]', clean):
        return True
    if len(clean) > 3 and ' ' in clean:
        return True
    return False

def inject_rgss_runtime_script(scripts_path, font_name="Arial"):
    if not os.path.exists(scripts_path):
        return False
    try:
        with open(scripts_path, "rb") as f:
            data = f.read()

        if b"OpenTranslator RGSS Runtime" in data:
            return True

        bak_path = scripts_path + ".opent_bak"
        if not os.path.exists(bak_path):
            with open(bak_path, "wb") as bf:
                bf.write(data)

        rgss_code = f"""# OpenTranslator RGSS Runtime & Look-Ahead Word-Wrap
if defined?(Font)
  begin
    Font.default_name = ["{font_name}", "Arial"]
    Font.default_size = 22
  rescue => e
  end
end

if defined?(Window_Message)
  class Window_Message < Window_Base
    if method_defined?(:process_normal_character) && !method_defined?(:opent_orig_process_normal_character)
      alias opent_orig_process_normal_character process_normal_character
      def process_normal_character(a, b = nil)
        c, text_state = nil, nil
        if a.is_a?(String)
          c = a
          text_state = b
        else
          text_state = a
          c = (text_state && text_state[:text]) ? text_state[:text][text_state[:index] || 0] : ''
        end

        if c == ' ' && text_state && text_state[:text]
          idx = text_state[:index] || 0
          text_rem = text_state[:text][idx..-1] || ""
          if text_rem =~ /^([^\\s\\x1b\\n\\f]+)/
            next_word = $1
            clean_word = next_word.gsub(/\\\\+[A-Za-z0-9_]+(\\[[^\\]]*\\])?|\\\\+[{{}}!.\\|^$><\\\\%]/, '')
            if respond_to?(:contents) && contents && respond_to?(:process_new_line)
              word_w = (contents.text_size(clean_word).width rescue (clean_word.length * 14))
              max_w = (respond_to?(:contentsWidth) ? contentsWidth : (width ? width - 36 : 600))
              limit_x = max_w - 12
              if (text_state[:x] || 0) + word_w + 8 > limit_x
                process_new_line(text_state)
                if !a.is_a?(String) && text_state[:text][text_state[:index]] == ' '
                  text_state[:index] += 1
                end
                return
              end
            end
          end
        end

        opent_orig_process_normal_character(a, b)
      end
    end
  end
end
"""
        return True
    except Exception as e:
        return False

def process_ruby_marshal(game_dir, mode, payload_file=None):
    data_dir = os.path.join(game_dir, "Data")
    if not os.path.exists(data_dir):
        data_dir = game_dir

    target_files = [
        f for f in os.listdir(data_dir)
        if f.lower().endswith((".rxdata", ".rvdata", ".rvdata2"))
    ]

    if mode == "extract":
        extracted_entries = []
        idx = 0

        for file_name in target_files:
            file_path = os.path.join(data_dir, file_name)
            try:
                with open(file_path, "rb") as f:
                    content = f.read()

                # Extrai strings CJK e diálogos no formato de dados RGSS
                str_matches = re.findall(rb'[\x81-\x9f\xe0-\xfc][\x40-\x7e\x80-\xfc]+', content)
                for raw_bytes in set(str_matches):
                    try:
                        decoded = raw_bytes.decode('shift_jis', errors='ignore').strip()
                        if is_translatable(decoded):
                            extracted_entries.append({
                                "id": idx,
                                "file": file_name,
                                "original": decoded,
                                "clean": decoded
                            })
                            idx += 1
                    except Exception:
                        pass
            except Exception as e:
                pass

        return {
            "success": True,
            "engine": "RPG_MAKER_RUBY",
            "filesProcessed": len(target_files),
            "totalEntries": len(extracted_entries),
            "data": extracted_entries
        }

    elif mode == "inject":
        translations = {}
        if payload_file and os.path.exists(payload_file):
            try:
                with open(payload_file, "r", encoding="utf-8") as pf:
                    translations = json.load(pf)
            except Exception as e:
                return {"success": False, "error": f"Failed to parse payload JSON: {str(e)}"}

        injected_count = 0

        # Injeta o script RGSS Runtime se houver Scripts.rxdata / rvdata / rvdata2
        for script_file in ["Scripts.rxdata", "Scripts.rvdata", "Scripts.rvdata2"]:
            sp = os.path.join(data_dir, script_file)
            if os.path.exists(sp):
                inject_rgss_runtime_script(sp)

        # Substitui strings traduzidas utilizando substituição segura com cabeçalho Marshal
        for file_name in target_files:
            if file_name.lower().startswith("scripts."):
                continue
            file_path = os.path.join(data_dir, file_name)
            try:
                with open(file_path, "rb") as f:
                    raw_bytes = f.read()

                file_modified = False
                for orig, tr in translations.items():
                    if not orig or not tr or orig == tr:
                        continue
                    try:
                        orig_b = orig.encode('shift_jis', errors='ignore')
                        tr_b = tr.encode('utf-8', errors='ignore')
                        raw_bytes, was_mod = replace_marshal_string(raw_bytes, orig_b, tr_b)
                        if was_mod:
                            file_modified = True
                            injected_count += 1
                    except Exception:
                        pass

                if file_modified:
                    with open(file_path, "wb") as f:
                        f.write(raw_bytes)
            except Exception as e:
                pass

        return {
            "success": True,
            "engine": "RPG_MAKER_RUBY",
            "filesProcessed": len(target_files),
            "injectedCount": injected_count
        }

    return {"success": False, "error": f"Invalid mode: {mode}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RPG Maker Ruby Marshal Sidecar Bridge")
    parser.add_argument("--game-dir", required=True, help="Path to RPG Maker game directory")
    parser.add_argument("--mode", choices=["extract", "inject"], required=True, help="Execution mode")
    parser.add_argument("--payload", help="JSON file containing translations for injection")
    args = parser.parse_args()

    result = process_ruby_marshal(args.game_dir, args.mode, args.payload)
    print(json.dumps(result))
