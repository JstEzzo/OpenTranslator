#!/usr/bin/env python3
"""livemaker_strings.py — JSON-contract sidecar over pylivemaker for RuneTranslate.

pylivemaker (https://github.com/pmrowla/pylivemaker) is GPL-3.0. It is used here
ONLY as an arms-length subprocess sidecar (this script is spawned as a separate
process; nothing links against it). This recipe script and the app are separate
programs. pylivemaker's own LICENSE ships under site-packages/*.dist-info/.

Two subcommands, both speaking JSON via files (never stdout, which carries only
`PROGRESS <phase> <done> <total> <name>` lines the app parses for the progress bar):

  extract --game <exe|dat> --out <strings.json>
      → { records: [{id, text, kind, name, file}], warnings: [...],
          lmVersion: 2|3|null, lsbCount: int }
      id = "<file>:<line_no>:<block_index>"        (kind="text")
         | "<file>:<line_no>:menu-<choice_index>"  (kind="menu")

  apply --game <exeCopy> --in <apply.json> --report <report.json> [--halfwidth]
      apply.json = [{id, text}]  (ids as emitted by extract, prefix already stripped)
      → rewrites the LSBs in-place and repacks the archive over <exeCopy>; writes a
        report { applied, failedIds, lossyIds, failedFiles, mesboxPatched, lmVersion }.

Text is CP932 (Shift-JIS). LiveMaker's text setter rejects non-CP932 chars, so we
pre-sanitize (map common typographic look-alikes, strip the rest) and flag lines.
"""
import argparse
import json
import os
import sys
import tempfile

# Resolve `import livemaker` from the sibling site-packages regardless of the
# embeddable Python's ._pth (which ignores PYTHONPATH). Same trick as evb_unpack.py.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "site-packages"))

# UTF-8 stdio so the JSON payload files + PROGRESS lines stay clean on Windows.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from livemaker import LMArchive, LMCompressType  # noqa: E402
from livemaker.lsb import LMScript  # noqa: E402
from livemaker.lsb.command import CommandType  # noqa: E402
from livemaker.lsb.core import OpeData, OpeDataType, Param, ParamType  # noqa: E402
from livemaker.lsb.translate import TextBlockIdentifier, TextMenuIdentifier  # noqa: E402
from livemaker.exceptions import BadLsbError  # noqa: E402

try:  # keep pylivemaker's loguru output off our clean stdout (already off by default)
    from loguru import logger

    logger.disable("livemaker")
except Exception:
    pass


def _progress(phase, done, total, name):
    try:
        sys.stdout.write(f"PROGRESS {phase} {done} {total} {name}\n")
        sys.stdout.flush()
    except Exception:
        pass


def _fwd(name):
    return str(name).replace("\\", "/")


def _lm_version(lsb):
    try:
        return int(lsb.lm_version)
    except Exception:
        return None


# Common non-CP932 typographic look-alikes model output introduces → their CP932
# equivalents. Anything still non-CP932 after this is stripped and the line flagged.
_CP932_FALLBACK = {
    "—": "―",  # EM DASH → HORIZONTAL BAR (the CP932 one)
    "–": "-",       # EN DASH
    "‒": "-",       # FIGURE DASH
    "‐": "-",       # HYPHEN
    "‑": "-",       # NON-BREAKING HYPHEN
    "〜": "～",  # WAVE DASH → FULLWIDTH TILDE
    "−": "－",  # MINUS SIGN → FULLWIDTH HYPHEN-MINUS
    "‘": "'", "’": "'",   # curly single quotes
    "“": '"', "”": '"',   # curly double quotes
    "•": "・",  # BULLET → KATAKANA MIDDLE DOT
    " ": " ",       # NBSP
    "﻿": "",        # BOM
}


def _cp932_sanitize(text):
    """Return (clean_text, lossy). `lossy` is True if any char had to be dropped
    (a mapped equivalent is NOT lossy — it renders the same)."""
    out = []
    lossy = False
    for ch in text:
        try:
            ch.encode("cp932")
            out.append(ch)
            continue
        except UnicodeEncodeError:
            pass
        rep = _CP932_FALLBACK.get(ch)
        if rep is None:
            lossy = True  # unrepresentable → drop
            continue
        # A mapped replacement might itself be non-CP932 in theory; guard it.
        try:
            rep.encode("cp932")
            out.append(rep)
        except UnicodeEncodeError:
            lossy = True
    return "".join(out), lossy


def cmd_extract(args):
    records = []
    warnings = []
    lm_version = None
    lsb_count = 0
    with LMArchive(args.game) as lm:
        infos = [i for i in lm.infolist() if str(i.name).lower().endswith(".lsb")]
        total = len(infos)
        for idx, info in enumerate(infos):
            _progress("extract", idx, total, info.name)
            try:
                lsb = LMScript.from_lsb(lm.read(info), call_name=info.name)
            except Exception as e:  # unparseable LSB → skip, never crash the run
                warnings.append(f"{info.name}: parse failed: {e}")
                continue
            if not hasattr(lsb, "pylm"):
                lsb.pylm = None
            lsb_count += 1
            if lm_version is None:
                lm_version = _lm_version(lsb)
            file = _fwd(info.name)
            try:
                for id_, block in lsb.get_text_blocks(run_order=False):
                    records.append(
                        {
                            "id": f"{file}:{id_.line_no}:{id_.block_index}",
                            "text": block.text,
                            "kind": "text",
                            "name": id_.name or "",
                            "file": file,
                        }
                    )
            except Exception as e:
                warnings.append(f"{info.name}: text extraction failed: {e}")
            # Menus in their own guard: a duplicate choice text raises a bare
            # ValueError that escapes pylivemaker's own LiveMakerException handling.
            try:
                for id_, choice in lsb.get_menu_choices(run_order=False):
                    if not isinstance(id_, TextMenuIdentifier):
                        continue  # LPM (image) menus are out of scope
                    records.append(
                        {
                            "id": f"{file}:{id_.line_no}:menu-{id_.choice_index}",
                            "text": choice.text,
                            "kind": "menu",
                            "name": id_.name or "",
                            "file": file,
                        }
                    )
            except Exception as e:
                warnings.append(f"{info.name}: menu extraction failed: {e}")
            # UI captions: genuinely-displayed component text (PR_TEXT only). Most
            # LiveMaker menus are image-based (text baked into graphics), so this is
            # typically small — but it's the safe subset that CAN be translated.
            try:
                _extract_captions(lsb, file, records)
            except Exception as e:
                warnings.append(f"{info.name}: caption extraction failed: {e}")
        _progress("extract", total, total, "")
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(
            {"records": records, "warnings": warnings, "lmVersion": lm_version, "lsbCount": lsb_count},
            f,
            ensure_ascii=False,
        )


def _force_halfwidth(lsb):
    """Set PR_FONTCHANGEABLED=0 on every message-box-creation command that carries
    it (LiveMaker 3 only; on LiveMaker 2 the key is absent → no-op). Returns the
    count changed. Mirrors lmlsb's own _edit_component simple-scalar path."""
    count = 0
    for cmd in lsb.commands:
        try:
            if cmd.type != CommandType.MesNew:
                continue
            keys = getattr(cmd, "_component_keys", None) or []
            if "PR_FONTCHANGEABLED" not in keys:
                continue
            parser = cmd["PR_FONTCHANGEABLED"]
            entries = getattr(parser, "entries", None)
            if entries is None:
                continue
            # Only touch a simple scalar field (empty, or a single `To` assignment).
            if len(entries) > 1 or (len(entries) == 1 and entries[0].type != OpeDataType.To):
                continue
            if entries:
                e = entries[0]
                if not e.operands:
                    continue
                op = e.operands[-1]
                if op is None or op.type not in (ParamType.Int, ParamType.Flag):
                    continue
                if int(op.value) != 0:
                    op.value = 0
                    count += 1
            else:
                op = Param(0, ParamType.Flag)
                entries.append(OpeData(type=OpeDataType.To, name="____arg", operands=[op]))
                count += 1
        except Exception:
            continue  # a stubborn command must never abort the font pass
    return count


def _pr_text_str_operand(cmd):
    """The single displayed-text string operand of a command's PR_TEXT property, or
    None if this command has no PR_TEXT or it isn't an unambiguous string literal.

    PR_TEXT is the text a LiveMaker component RENDERS (caption / label / text-button /
    edit-field). We take the operand only when the property holds EXACTLY ONE string
    literal — covering both the direct form (`____arg = "Mute"`) and the compiled temp
    form (`____0 = "Mute"; ____arg = ____0`). Two-or-more or zero literals → ambiguous
    → skipped. Object names (Name / PR_PARENT), flow operands (Calc / If / Jump), font
    names (PR_FONTNAME) and positions are OTHER properties the engine resolves by value;
    we never touch them, so translating a caption can't break a lookup."""
    args = getattr(cmd, "args", None)
    if not isinstance(args, dict) or "PR_TEXT" not in args:
        return None
    found = []
    for e in getattr(args["PR_TEXT"], "entries", None) or []:
        for op in getattr(e, "operands", None) or []:
            if isinstance(op, Param) and op.type == ParamType.Str and isinstance(op.value, str):
                found.append(op)
    return found[0] if len(found) == 1 else None


def _extract_captions(lsb, file, records):
    """Emit a `caption` record per component that has an unambiguous PR_TEXT string."""
    for cmd in lsb.commands:
        try:
            op = _pr_text_str_operand(cmd)
            if op is None or not op.value.strip():
                continue
            records.append(
                {
                    "id": f"{file}:{int(cmd.LineNo)}:cap",
                    "text": op.value,
                    "kind": "caption",
                    "name": "UI",
                    "file": file,
                }
            )
        except Exception:
            continue  # a stubborn component must never abort extraction


def _parse_id(rid):
    """'<file>:<line>:<block>' | '<file>:<line>:menu-<choice>' | '<file>:<line>:cap'
    → (file, line, kind, index)."""
    file, line_s, last = rid.rsplit(":", 2)
    line_no = int(line_s)
    if last == "cap":
        return file, line_no, "caption", None
    if last.startswith("menu-"):
        return file, line_no, "menu", int(last[len("menu-"):])
    return file, line_no, "text", int(last)


def cmd_apply(args):
    with open(getattr(args, "in"), encoding="utf-8") as f:
        items = json.load(f)

    per_file = {}  # normalized file → [(kind, line_no, index, text)]
    for it in items:
        try:
            file, line_no, kind, index = _parse_id(it["id"])
        except Exception:
            continue
        per_file.setdefault(file, []).append((kind, line_no, index, it.get("text", "")))

    report = {
        "applied": 0,
        "failedIds": [],
        "lossyIds": [],
        "failedFiles": [],
        "mesboxPatched": 0,
        "lmVersion": None,
    }

    orig = LMArchive(args.game)
    # Split archives with a SEPARATE .ext index aren't supported yet; the common
    # game.dat (+ game.NNN continuation) form IS — rebuilt below via the same lmpatch
    # recipe with split=True. (The adapter routes .ext-index games to a clear error,
    # so in practice only the has_ext=False form reaches here.)
    if orig.is_split and getattr(orig, "has_ext", False):
        raise SystemExit(
            "split archives with a separate .ext index are not supported for export in this version"
        )
    # Original split part basenames (game.dat, game.001, …) — used to prune stale parts.
    orig_split_parts = {os.path.basename(p) for p in getattr(orig, "_split_files", set())}

    tmp_exe = None
    if orig.is_exe:
        fd, tmp_exe = tempfile.mkstemp(suffix=".exe")
        with os.fdopen(fd, "wb") as fp:
            fp.write(orig.read_exe())

    tmpdir = tempfile.mkdtemp()
    patched = {}  # info.name → temp .lsb path
    infos = orig.infolist()

    for info in infos:
        if not str(info.name).lower().endswith(".lsb"):
            continue
        key = _fwd(info.name)
        edits = per_file.get(key)
        if not edits and not args.halfwidth:
            continue
        try:
            lsb = LMScript.from_lsb(orig.read(info), call_name=info.name)
        except Exception:
            if edits:
                report["failedFiles"].append(key)
            continue
        if not hasattr(lsb, "pylm"):
            lsb.pylm = None
        if report["lmVersion"] is None:
            report["lmVersion"] = _lm_version(lsb)

        changed = False
        if edits:
            text_objs = []
            menu_objs = []
            caption_objs = []  # (line_no, clean)
            for kind, line_no, index, text in edits:
                clean, lossy = _cp932_sanitize(text)
                if kind == "caption":
                    rid = f"{key}:{line_no}:cap"
                elif kind == "menu":
                    rid = f"{key}:{line_no}:menu-{index}"
                else:
                    rid = f"{key}:{line_no}:{index}"
                if clean == "":
                    report["failedIds"].append(rid)
                    continue
                if lossy:
                    report["lossyIds"].append(rid)
                if kind == "caption":
                    caption_objs.append((line_no, clean))
                elif kind == "menu":
                    menu_objs.append((TextMenuIdentifier(info.name, line_no, index), clean))
                else:
                    text_objs.append((TextBlockIdentifier(info.name, line_no, index), clean))
            # SEPARATE calls — never replace_text(): its if/elif silently drops the
            # menu translations whenever the same LSB also has text blocks.
            if text_objs:
                try:
                    t, _ = lsb.replace_text_blocks(text_objs)
                    report["applied"] += t
                    changed = changed or t > 0
                except Exception:
                    report["failedFiles"].append(key)
            if menu_objs:
                try:
                    t, _ = lsb.replace_menu_choices(menu_objs)
                    report["applied"] += t
                    changed = changed or t > 0
                except Exception:
                    pass
            # UI captions: set the SAME single PR_TEXT string operand extraction found
            # (located by _pr_text_str_operand on both sides). Only ever a PR_TEXT string
            # literal — never object names / flow operands / fonts.
            for line_no, clean in caption_objs:
                try:
                    _, cmd = lsb.get_command(line_no)
                    op = _pr_text_str_operand(cmd)
                    if op is None:
                        continue
                    op.value = clean
                    report["applied"] += 1
                    changed = True
                except Exception:
                    report["failedFiles"].append(key)

        if args.halfwidth:
            n = _force_halfwidth(lsb)
            if n:
                report["mesboxPatched"] += n
                changed = True

        if changed:
            try:
                out_bytes = lsb.to_lsb()
            except (BadLsbError, Exception):
                report["failedFiles"].append(key)
                continue
            p = os.path.join(tmpdir, f"lsb_{len(patched)}.lsb")
            with open(p, "wb") as fp:
                fp.write(out_bytes)
            patched[str(info.name)] = p

    # Rebuild the archive (pylivemaker's own lmpatch recipe): patched entries are
    # re-written (encryption downgraded — writing encryption is unsupported upstream);
    # untouched entries are copied byte-for-byte, preserving their compression/encryption.
    total = len(infos)

    def write_entries(new_lm):
        for idx, info in enumerate(infos):
            _progress("apply", idx, total, info.name)
            if info.compress_type == LMCompressType.ENCRYPTED:
                ct = LMCompressType.NONE
            elif info.compress_type == LMCompressType.ENCRYPTED_ZLIB:
                ct = LMCompressType.ZLIB
            else:
                ct = info.compress_type
            p = patched.get(str(info.name))
            if p:
                new_lm.write(p, compress_type=ct, unk1=info.unk1, arcname=info.path)
            else:
                new_lm.writebytes(info, orig.read(info, decompress=False))

    if orig.is_split:
        # A split archive is several files (game.dat + game.NNN); pylivemaker names the
        # continuation parts from the archive's basename. Write the new set into a temp
        # dir on the SAME drive (so the moves are fast renames) using the original
        # basename, then move each produced part over the game's files.
        out_dir = os.path.dirname(os.path.abspath(args.game))
        base_name = os.path.basename(args.game)
        split_tmp = tempfile.mkdtemp(dir=out_dir)
        with LMArchive(
            name=os.path.join(split_tmp, base_name), mode="w", version=orig.version, exe=tmp_exe, split=True
        ) as new_lm:
            write_entries(new_lm)
        orig.close()
        _progress("apply", total, total, "")
        produced = os.listdir(split_tmp)
        for name in produced:
            os.replace(os.path.join(split_tmp, name), os.path.join(out_dir, name))
        # Prune any original split part this rebuild no longer produces (archive shrank).
        for stale in orig_split_parts - set(produced):
            try:
                os.remove(os.path.join(out_dir, stale))
            except OSError:
                pass
        try:
            os.rmdir(split_tmp)
        except OSError:
            pass
    else:
        # Non-split (exe-embedded or single .dat): write next to the game, then swap.
        out_tmp = args.game + ".rttmp"
        with LMArchive(name=out_tmp, mode="w", version=orig.version, exe=tmp_exe, split=False) as new_lm:
            write_entries(new_lm)
        orig.close()
        _progress("apply", total, total, "")
        os.replace(out_tmp, args.game)

    if tmp_exe:
        try:
            os.unlink(tmp_exe)
        except Exception:
            pass
    for name in os.listdir(tmpdir):
        try:
            os.unlink(os.path.join(tmpdir, name))
        except Exception:
            pass
    try:
        os.rmdir(tmpdir)
    except Exception:
        pass

    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser(description="LiveMaker text extract/apply sidecar")
    sub = ap.add_subparsers(dest="cmd", required=True)

    ex = sub.add_parser("extract")
    ex.add_argument("--game", required=True)
    ex.add_argument("--out", required=True)

    ap2 = sub.add_parser("apply")
    ap2.add_argument("--game", required=True)
    ap2.add_argument("--in", required=True)
    ap2.add_argument("--report", required=True)
    ap2.add_argument("--halfwidth", action="store_true")

    args = ap.parse_args()
    if args.cmd == "extract":
        cmd_extract(args)
    else:
        cmd_apply(args)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # last-resort: clean non-zero exit with a readable message
        sys.stderr.write(f"livemaker_strings error: {e}\n")
        sys.exit(1)
