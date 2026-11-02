#!/usr/bin/env python3
"""RPG data translation through structural Marshal 4.8 string boundaries.

Does not run Ruby, modify scripts, replace arbitrary binary substrings, or guess
Shift-JIS when an explicit string encoding is available.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import tempfile
from ruby_marshal_codec import Reader, rewrite


def process_ruby_marshal(game_dir, mode, payload_file=None):
    root = Path(game_dir).resolve()
    data_dir = root / 'Data'
    if not data_dir.is_dir():
        data_dir = root / 'data' if (root / 'data').is_dir() else root
    files = sorted((p for p in data_dir.iterdir() if p.is_file() and p.suffix.lower() in {'.rxdata', '.rvdata', '.rvdata2'}), key=lambda p: p.name.casefold())
    records, failures, skipped, prepared, applied = [], [], [], [], []
    matched = set()
    count = 0
    translations = {}
    if mode == 'inject':
        if not payload_file:
            return {'success': False, 'error': 'A translation payload is required', 'injectedCount': 0}
        translations = json.loads(Path(payload_file).read_text(encoding='utf-8-sig'))
        if not isinstance(translations, dict):
            return {'success': False, 'error': 'Translation payload must be an object', 'injectedCount': 0}
    try:
        for file in files:
            if file.stem.lower() == 'scripts':
                skipped.append({'file': file.name, 'reason': 'Executable script data is excluded from static text translation'})
                continue
            try:
                raw = file.read_bytes()
                reader = Reader(raw, file.suffix).parse()
                entries = reader.entries(file.name)
                if mode == 'extract':
                    records.extend({k: v for k, v in entry.items() if k != '_string'} for entry in entries)
                else:
                    for entry in entries:
                        for key in (entry['id'], entry['original']):
                            if key in translations:
                                matched.add(key)
                    updated, changed = rewrite(raw, file.name, translations)
                    if changed:
                        fd, temporary = tempfile.mkstemp(prefix='.opent-marshal-', suffix='.tmp', dir=data_dir)
                        with os.fdopen(fd, 'wb') as stream:
                            stream.write(updated)
                            stream.flush()
                            os.fsync(stream.fileno())
                        prepared.append((temporary, file, changed))
            except (OSError, ValueError, UnicodeError, LookupError, IndexError) as error:
                failures.append({'file': file.name, 'error': str(error)})
        if mode == 'inject':
            missing = set(translations) - matched
            if missing:
                failures.append({'file': 'translation payload', 'error': f'{len(missing)} requested source records were not found'})
            if not failures:
                for temporary, file, changed in prepared:
                    os.replace(temporary, file)
                    applied.append(str(file))
                    count += changed
        return {'success': not failures and bool(files), 'engine': 'RPG_MAKER_RUBY',
                'filesProcessed': len(files) - len(skipped), 'filesSkipped': skipped,
                'failures': failures[:20], 'failedCount': len(failures),
                'totalEntries': len(records), 'data': records, 'injectedCount': count,
                'injectedFiles': applied, 'status': 'FAILED' if failures or not files else ('NO_CHANGES' if mode == 'inject' and not count else 'COMPLETE'),
                'coverageScope': 'Recognized RPG data fields only; executable scripts and dynamic runtime text are excluded'}
    except Exception as error:
        return {'success': False, 'error': str(error), 'injectedFiles': applied, 'injectedCount': count}
    finally:
        for temporary, _, _ in prepared:
            if Path(temporary).exists():
                Path(temporary).unlink()


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game-dir', required=True)
    parser.add_argument('--mode', choices=['extract', 'inject'], required=True)
    parser.add_argument('--payload')
    args = parser.parse_args()
    try:
        result = process_ruby_marshal(args.game_dir, args.mode, args.payload)
    except Exception as error:
        result = {'success': False, 'error': str(error)}
    print(json.dumps(result, ensure_ascii=True))
