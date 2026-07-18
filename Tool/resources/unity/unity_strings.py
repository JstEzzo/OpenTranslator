#!/usr/bin/env python3
"""
RuneTranslate Unity text sidecar.

Reads/writes externalized Japanese text in Unity serialized files (*.assets,
level*, globalgamemanagers, AssetBundles / data.unity3d) using UnityPy. It does
ONLY the binary work — extracting raw TextAsset / MonoBehaviour string values and
writing them back. All text parsing, JP filtering, splitting and escaping happens
on the TypeScript side (GenericExtractor); this script stays deliberately thin.

Modes:
  --list  <gameDataDir> --out <units.json>
      Emit a JSON array of records:
        {assetFile, pathId, kind:'textasset'|'mono', name, field?, text}
      `assetFile` is relative to <gameDataDir>; `pathId` is a string (64-bit safe).

  --apply <gameDataDir> --in <apply.json> --out <patchedDataDir>
      apply.json is an array of {assetFile, pathId, kind, field?, text}. Each record's
      `text` is the FULL replacement (m_Script for textasset, field value for mono).
      Modified serialized files are written under <patchedDataDir> at the same relative
      path. <patchedDataDir> may equal <gameDataDir> (in-place patch).

NOT handled: strings compiled into Assembly-CSharp.dll. MonoBehaviour fields are only
readable/writable when the build carries type information (Mono / non-stripped).
"""
import argparse
import io
import json
import os
import re
import sys

try:
    import UnityPy
except Exception as e:  # pragma: no cover - import guard
    print("error: UnityPy is not available ({}). Run `npm run fetch:unity-tools`.".format(e), file=sys.stderr)
    sys.exit(2)

# Embeddable Python (with a ._pth) does NOT auto-add the script's own directory to
# sys.path, so make the same-dir helper importable explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    # Same-dir module: transparently decrypts custom-encrypted AssetBundles so UnityPy
    # can read the TextAssets/MonoBehaviours inside. Absence just means no decryption.
    from unity_bundle_crypto import BundleCrypto
except Exception:  # pragma: no cover
    BundleCrypto = None

JP_RE = re.compile(r"[぀-ゟ゠-ヿ㐀-鿿ｦ-ﾟ]")

# Serialized-file / bundle name patterns UnityPy can load as containers.
UNITY_FILE_RE = re.compile(
    r"(\.assets$)|(\.unity3d$)|(\.bundle$)|(^globalgamemanagers(\.assets)?$)|(^level\d+$)|(^resources\.assets$)|(^sharedassets\d+\.assets$)",
    re.IGNORECASE,
)


def log(msg):
    print(msg, file=sys.stderr)


def iter_unity_files(data_dir):
    """Yield absolute paths of files under data_dir that look like Unity containers."""
    for root, _dirs, files in os.walk(data_dir):
        for name in files:
            if UNITY_FILE_RE.search(name):
                yield os.path.join(root, name)


def open_env(fpath, crypto):
    """Load a Unity container, transparently decrypting an encrypted AssetBundle.

    Returns (env, scheme_name|None). Plain files load by PATH so UnityPy can resolve
    sibling .resS/.resource streams (unchanged behavior); only a non-UnityFS `.bundle`
    is decrypted in memory (then loaded from bytes). scheme_name is set when the file
    was decrypted, so the apply path knows to re-encrypt on write-back."""
    if crypto is not None and fpath.lower().endswith(".bundle"):
        with open(fpath, "rb") as f:
            data = f.read()
        if not BundleCrypto.is_unityfs(data):
            dec, scheme = crypto.decrypt_bytes(data, fpath)
            if scheme:
                return UnityPy.load(io.BytesIO(dec)), scheme
    return UnityPy.load(fpath), None


def textasset_script(data):
    """Return the TextAsset payload as a str, or None if it's binary/undecodable."""
    raw = getattr(data, "m_Script", None)
    if raw is None:
        raw = getattr(data, "script", None)
    if raw is None:
        return None
    if isinstance(raw, str):
        return raw
    if isinstance(raw, (bytes, bytearray)):
        try:
            return bytes(raw).decode("utf-8")
        except UnicodeDecodeError:
            return None
    return None


def set_textasset_script(data, text):
    """Write a TextAsset payload back, coping with UnityPy attribute differences."""
    if hasattr(data, "m_Script"):
        data.m_Script = text
    else:
        # Older UnityPy exposes a `script` bytes field.
        data.script = text.encode("utf-8")
    data.save()


# MonoBehaviour field keys that are never player-facing display text — Unity
# internal object/asset names. Skipped so the (now much larger) MonoBehaviour
# extraction surfaces real UI/dialogue text, not internal identifiers.
SKIP_FIELD_KEYS = frozenset({"m_Name"})

# Top-level field names that mark a MonoBehaviour as a Fungus FLOW / variable command
# (If / While / Compare / SetVariable). Such objects carry only string OPERANDS the
# flowchart compares/assigns by value — translating one stalls the flow forever — never
# display dialogue (that's a Say command's `storyText`, which has none of these).
FUNGUS_FLOW_MARKERS = frozenset({
    "compareOperator", "setOperator", "variable", "anyVariable",
    "booleanData", "integerData", "floatData",
    "evaluateOperator", "evaluateAnyVariable",
})


def is_non_display_object(tree_keys):
    """True when EVERY string in this MonoBehaviour is engine metadata / an operand,
    never player-facing display text — the TS side then excludes all of its strings.

    Three shapes:
      • Fungus flow/variable command (FLOW_MARKERS) — comparison/assignment operands.
      • Live2D Cubism display-info component (`Name` + `DisplayName`) — model part /
        parameter names the runtime resolves by string; translating them breaks the
        model binding so characters/animations stop working (observed: `ZensouMura`
        menu interactions died once `组 35`/`阿兰` etc. were turned to English).
      • Fungus Variable component (`key` + `value` + `scope`) — its `value` is the
        variable's STATE (e.g. a language flag `中文`, a scene token `大地图`), compared
        elsewhere against the (excluded, untranslated) operand; translating it makes the
        comparison never match so the flow stalls (`ZensouMura` intro). The `scope`
        field is Variable-specific, so a localization dictionary (key+value, no scope,
        whose value IS display text) is NOT matched.
    """
    keys = set(tree_keys)
    if keys & FUNGUS_FLOW_MARKERS:
        return True
    if "Name" in keys and "DisplayName" in keys:
        return True
    if "key" in keys and "value" in keys and "scope" in keys:
        return True
    return False


def walk_strings(tree, prefix=""):
    """Yield (field_path, value) for every JP-bearing string in a typetree dict."""
    if isinstance(tree, dict):
        for k, v in tree.items():
            if k in SKIP_FIELD_KEYS:
                continue
            yield from walk_strings(v, "{}.{}".format(prefix, k) if prefix else str(k))
    elif isinstance(tree, list):
        for i, v in enumerate(tree):
            yield from walk_strings(v, "{}[{}]".format(prefix, i))
    elif isinstance(tree, str):
        if JP_RE.search(tree):
            yield (prefix, tree)


def set_by_path(tree, field_path, value):
    """Set a value addressed by the dotted/bracketed path produced by walk_strings."""
    tokens = re.findall(r"[^.\[\]]+|\[\d+\]", field_path)
    cur = tree
    for i, tok in enumerate(tokens):
        last = i == len(tokens) - 1
        if tok.startswith("["):
            idx = int(tok[1:-1])
            if last:
                cur[idx] = value
            else:
                cur = cur[idx]
        else:
            if last:
                cur[tok] = value
            else:
                cur = cur[tok]


def sniff_unity_version(data_dir):
    """Best-effort Unity version string from the first loadable serialized file."""
    for fpath in iter_unity_files(data_dir):
        try:
            env = UnityPy.load(fpath)
            for obj in env.objects:
                sf = getattr(obj, "assets_file", None) or getattr(obj, "serialized_file", None)
                ver = getattr(sf, "unity_version", None)
                if ver:
                    return ver
        except Exception:
            continue
    return None


def build_generator(data_dir, dummydll=None):
    """Build a TypeTreeGenerator so MonoBehaviour fields become readable/writable on
    builds that ship NO embedded type trees (release Unity). Prefers the game's own
    Managed/*.dll (Mono). When there is no Managed/ folder (IL2CPP), falls back to a
    reconstructed DummyDll/ folder (produced by Il2CppDumper on the TS side, passed via
    --dummydll) — the SAME load_local_dll_folder path. Returns None on any failure —
    missing the optional TypeTreeGeneratorAPI native package, no DLL source, an unknown
    Unity version, or a load error — in which case callers behave exactly as before
    (MonoBehaviours without embedded type info skipped)."""
    managed = os.path.join(data_dir, "Managed")
    if os.path.isdir(managed):
        dll_folder, source = managed, "Managed"
    elif dummydll and os.path.isdir(dummydll):
        dll_folder, source = dummydll, "IL2CPP DummyDll"
    else:
        return None
    try:
        from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
    except Exception:
        return None
    try:
        ver = sniff_unity_version(data_dir)
        if not ver:
            return None
        gen = TypeTreeGenerator(ver)
        gen.load_local_dll_folder(dll_folder)
        log("typetree generator ready (Unity {}, {}) — MonoBehaviour reads enabled".format(ver, source))
        return gen
    except Exception as e:
        log("typetree generator unavailable ({}) — MonoBehaviour fields without embedded type info will be skipped".format(e))
        return None


def do_list(data_dir, out_path, dummydll=None):
    records = []
    generator = build_generator(data_dir, dummydll)
    crypto = BundleCrypto() if BundleCrypto else None
    decrypted_count = 0
    files = list(iter_unity_files(data_dir))
    for i, fpath in enumerate(files):
        rel = os.path.relpath(fpath, data_dir).replace(os.sep, "/")
        # Progress marker on STDOUT (the payload travels via --out, so this can't
        # corrupt it). The TS side parses `PROGRESS list <done> <total> <rel>`.
        print("PROGRESS list {} {} {}".format(i + 1, len(files), rel), flush=True)
        try:
            env, scheme = open_env(fpath, crypto)
            if scheme:
                decrypted_count += 1
        except Exception as e:
            log("skip {}: load failed ({})".format(rel, e))
            continue
        if generator is not None:
            env.typetree_generator = generator
        for obj in env.objects:
            try:
                type_name = obj.type.name
            except Exception:
                continue
            try:
                if type_name == "TextAsset":
                    data = obj.read()
                    text = textasset_script(data)
                    if not text or not JP_RE.search(text):
                        continue
                    name = getattr(data, "m_Name", None) or getattr(data, "name", "") or ""
                    records.append({
                        "assetFile": rel,
                        "pathId": str(obj.path_id),
                        "kind": "textasset",
                        "name": name,
                        "text": text,
                    })
                elif type_name == "MonoBehaviour":
                    try:
                        tree = obj.read_typetree()
                    except Exception:
                        continue  # no type info (IL2CPP/stripped) — can't read fields
                    if not isinstance(tree, dict):
                        continue
                    name = tree.get("m_Name", "") or ""
                    # Flag objects whose every string is an operand/metadata (Fungus
                    # flow command, or Live2D Cubism display-info) so the TS side can
                    # exclude all of them. Display commands (Say/Write/Menu/UI Text)
                    # are NOT flagged, so their text stays translatable.
                    exclude_obj = is_non_display_object(tree.keys())
                    for field, value in walk_strings(tree):
                        rec = {
                            "assetFile": rel,
                            "pathId": str(obj.path_id),
                            "kind": "mono",
                            "name": name,
                            "field": field,
                            "text": value,
                        }
                        if exclude_obj:
                            rec["excludeObj"] = True
                        records.append(rec)
            except Exception as e:
                log("skip object in {}: {}".format(rel, e))
                continue
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
    if crypto is not None and decrypted_count:
        log("decrypted {} AssetBundle(s) via scheme '{}'".format(decrypted_count, crypto.scheme_name))
    log("listed {} string(s) from {}".format(len(records), data_dir))


def save_env(env, out_path, crypto=None, src_path=None):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    try:
        blob = env.file.save(packer="original")
    except TypeError:
        blob = env.file.save()
    # If the source bundle was decrypted on load, re-encrypt with the SAME scheme so the game's
    # custom provider reads it back. The cipher is symmetric and salt = filename (unchanged on
    # output), and the game loads with crc=0 (no integrity check), so no catalog edits are needed.
    if crypto is not None and src_path is not None:
        blob = crypto.encrypt_bytes(blob, src_path)
    with open(out_path, "wb") as f:
        f.write(blob)


def do_apply(data_dir, in_path, out_dir, dummydll=None):
    with open(in_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    by_file = {}
    for rec in records:
        by_file.setdefault(rec["assetFile"], []).append(rec)

    generator = build_generator(data_dir, dummydll)
    crypto = BundleCrypto() if BundleCrypto else None
    patched = 0
    items = list(by_file.items())
    for i, (rel, recs) in enumerate(items):
        # Progress marker on STDOUT; TS parses `PROGRESS apply <done> <total> <rel>`.
        print("PROGRESS apply {} {} {}".format(i + 1, len(items), rel), flush=True)
        fpath = os.path.join(data_dir, rel.replace("/", os.sep))
        try:
            env, scheme = open_env(fpath, crypto)
        except Exception as e:
            log("apply skip {}: load failed ({})".format(rel, e))
            continue
        if generator is not None:
            env.typetree_generator = generator
        by_pathid = {}
        for obj in env.objects:
            by_pathid.setdefault(str(obj.path_id), obj)

        changed = False
        for rec in recs:
            obj = by_pathid.get(rec["pathId"])
            if obj is None:
                continue
            try:
                if rec["kind"] == "textasset":
                    data = obj.read()
                    set_textasset_script(data, rec["text"])
                    changed = True
                elif rec["kind"] == "mono":
                    tree = obj.read_typetree()
                    set_by_path(tree, rec.get("field", ""), rec["text"])
                    obj.save_typetree(tree)
                    changed = True
            except Exception as e:
                log("apply skip object in {}: {}".format(rel, e))
                continue

        if changed:
            out_path = os.path.join(out_dir, rel.replace("/", os.sep))
            try:
                save_env(env, out_path, crypto if scheme else None, fpath if scheme else None)
                patched += 1
            except Exception as e:
                log("apply save failed for {}: {}".format(rel, e))
    log("patched {} file(s)".format(patched))


def main():
    parser = argparse.ArgumentParser(description="RuneTranslate Unity text sidecar")
    parser.add_argument("--list", dest="list_dir")
    parser.add_argument("--apply", dest="apply_dir")
    parser.add_argument("--in", dest="in_path")
    parser.add_argument("--out", dest="out_path")
    # Optional reconstructed DummyDll folder for IL2CPP games (no Managed/). Absent for
    # Mono / non-IL2CPP games, where build_generator behaves exactly as before.
    parser.add_argument("--dummydll", dest="dummydll")
    args = parser.parse_args()

    if args.list_dir:
        if not args.out_path:
            parser.error("--list requires --out <units.json>")
        do_list(args.list_dir, args.out_path, args.dummydll)
    elif args.apply_dir:
        if not args.in_path or not args.out_path:
            parser.error("--apply requires --in <apply.json> and --out <patchedDataDir>")
        do_apply(args.apply_dir, args.in_path, args.out_path, args.dummydll)
    else:
        parser.error("one of --list or --apply is required")


if __name__ == "__main__":
    main()
