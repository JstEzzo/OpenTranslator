"""RuneTranslate EVB unpacker sidecar.

Usage:
  python evb_unpack.py <packed_exe> <out_dir>            # extract virtual FS
  python evb_unpack.py <packed_exe> <out_dir> --list     # print TOC (stderr), no extract

Extracts only the Enigma Virtual Box virtual filesystem (skips recovering the
host exe via --ignore-pe). In --list mode it prints the table of contents and
extracts nothing, which is what detection uses to tell MV (www/data/...) from
MZ (data/...). evbunpack lives in the sibling site-packages/ dir; the embedded
CPython ignores PYTHONPATH when a ._pth file is present, so we put it on
sys.path explicitly.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "site-packages"))


def main() -> int:
    args = sys.argv[1:]
    list_only = "--list" in args
    positional = [a for a in args if a != "--list"]
    if len(positional) < 2:
        sys.stderr.write("usage: evb_unpack.py <packed_exe> <out_dir> [--list]\n")
        return 2
    exe, out = positional[0], positional[1]
    # --ignore-pe in both modes: we never want the recovered host exe. In list
    # mode evbunpack still restores the PE unless told not to, so pass both.
    flags = ["-l", "--ignore-pe"] if list_only else ["--ignore-pe"]
    sys.argv = ["evbunpack", *flags, exe, out]
    import runpy

    runpy.run_module("evbunpack", run_name="__main__")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
