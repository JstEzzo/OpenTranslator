#!/usr/bin/env python3
"""
Ren'Py save read/edit sidecar for RuneTranslate's Save Editor.

A Ren'Py `.save` is a ZIP archive. The game state lives in the `log` entry:
a (possibly zlib-compressed) pickle of `(roots, log)`, where `roots` is a
dict mapping global store variable names to their values.

We can't import the game's own classes, so we use a TOLERANT unpickler that
fabricates stand-in classes for anything missing and injects them into
`sys.modules` so they re-pickle BY REFERENCE (the `GLOBAL module name`
opcode round-trips). Ren'Py's revertable containers (RevertableList/Dict/Set)
are mapped onto real list/dict/set subclasses by name so their items
round-trip too. This faithfully reproduces the dominant shape of Ren'Py
save graphs; exotic objects (custom __reduce__, C types) are the failure
edge, which is why callers must keep the .rt-backup and we self-verify.

Commands:
  dump  <savefile>                 -> prints JSON {"variables":[{name,value}]}
  apply <savefile> <edits-json>    -> applies [{name,value}] edits, rewrites the save
"""
import sys
import io
import json
import zipfile
import zlib
import pickle
import types

PRIMITIVE = (int, float, str, bool)


def ensure_module(modname):
    mod = sys.modules.get(modname)
    if mod is None:
        mod = types.ModuleType(modname)
        sys.modules[modname] = mod
    return mod


_class_cache = {}


def fake_class(module, name):
    key = (module, name)
    cls = _class_cache.get(key)
    if cls is not None:
        return cls
    mod = ensure_module(module)
    existing = getattr(mod, name, None)
    if isinstance(existing, type):
        _class_cache[key] = existing
        return existing

    lname = name.lower()
    if "dict" in lname:
        base = dict
    elif "set" in lname:
        base = set
    elif "list" in lname:
        base = list
    else:
        base = object

    def __new__(c, *a, **k):
        if base is object:
            return object.__new__(c)
        return base.__new__(c)

    def __init__(self, *a, **k):
        # Constructor args (rare for store data) are ignored; state arrives
        # via __setstate__ / __dict__ / append / __setitem__ during unpickle.
        pass

    attrs = {
        "__module__": module,
        "__qualname__": name,
        "__new__": __new__,
        "__init__": __init__,
    }
    cls = type(name, (base,), attrs)
    setattr(mod, name, cls)
    _class_cache[key] = cls
    return cls


class TolerantUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        try:
            return super().find_class(module, name)
        except Exception:
            # dotted names (Outer.Inner) -> use the leaf for the fake
            leaf = name.split(".")[-1]
            return fake_class(module, leaf)


def read_log_bytes(path):
    with zipfile.ZipFile(path, "r") as zf:
        names = zf.namelist()
        if "log" not in names:
            raise SystemExit("not-a-renpy-save: no 'log' entry")
        return zf.read("log")


def unpickle_log(raw):
    # Modern Ren'Py: the entry is a raw pickle (the zip already deflated it).
    # Some versions zlib-compress the pickle too — try both.
    for candidate in (raw, _maybe_inflate(raw)):
        if candidate is None:
            continue
        try:
            return TolerantUnpickler(io.BytesIO(candidate)).load(), candidate is not raw
        except Exception:
            continue
    raise SystemExit("decode-failed: could not unpickle save log")


def _maybe_inflate(raw):
    try:
        return zlib.decompress(raw)
    except Exception:
        return None


def get_roots(obj):
    # Ren'Py dumps (roots, log). Some very old saves dump just roots.
    if isinstance(obj, tuple) and len(obj) >= 1 and isinstance(obj[0], dict):
        return obj[0]
    if isinstance(obj, dict):
        return obj
    raise SystemExit("unexpected-shape: save root is not (roots, log)")


def cmd_dump(path):
    raw = read_log_bytes(path)
    obj, _ = unpickle_log(raw)
    roots = get_roots(obj)
    out = []
    for name, value in roots.items():
        if name.startswith("_"):
            continue  # Ren'Py internal store vars
        if isinstance(value, bool) or isinstance(value, (int, float, str)):
            out.append({"name": name, "value": value})
    out.sort(key=lambda x: x["name"].lower())
    sys.stdout.write(json.dumps({"variables": out}, ensure_ascii=False))


def cmd_apply(path, edits_json):
    edits = json.loads(edits_json)
    raw = read_log_bytes(path)
    obj, was_compressed = unpickle_log(raw)
    roots = get_roots(obj)

    for e in edits:
        name = e["name"]
        if name in roots and (isinstance(roots[name], PRIMITIVE) or roots[name] is None):
            roots[name] = e["value"]

    new_pickle = pickle.dumps(obj, protocol=2)

    # Safety: re-load our own output before writing it back. If this throws,
    # we'd be writing a corrupt save — abort instead (the caller keeps the
    # .rt-backup, but we don't even get that far).
    TolerantUnpickler(io.BytesIO(new_pickle)).load()

    entry = zlib.compress(new_pickle) if was_compressed else new_pickle

    # Rewrite the zip: copy every entry except `log`, replace `log`.
    buf = io.BytesIO()
    with zipfile.ZipFile(path, "r") as zin:
        infos = zin.infolist()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for info in infos:
                data = zin.read(info.filename)
                if info.filename == "log":
                    data = entry
                zout.writestr(info, data)
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    sys.stdout.write(json.dumps({"ok": True}))


def main():
    if len(sys.argv) < 3:
        raise SystemExit("usage: renpy_save.py <dump|apply> <savefile> [edits-json]")
    cmd = sys.argv[1]
    path = sys.argv[2]
    if cmd == "dump":
        cmd_dump(path)
    elif cmd == "apply":
        cmd_apply(path, sys.argv[3])
    else:
        raise SystemExit("unknown command: " + cmd)


if __name__ == "__main__":
    main()
