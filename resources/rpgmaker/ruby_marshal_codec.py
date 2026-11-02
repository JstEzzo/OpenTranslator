"""Read Marshal 4.8 boundaries without invoking Ruby or user-defined load hooks.

Only recognized RPG data fields are translation candidates. Rewrites replace
string byte sequences and their length fields; symbols, object links, and opaque
extension payloads retain their original bytes. Unknown tags fail explicitly.
Format reference: https://docs.ruby-lang.org/en/2.4.0/marshal_rdoc.html
"""
from dataclasses import dataclass, field
import re
from typing import Optional


@dataclass
class StringRef:
    start: int
    end: int
    raw: bytes
    uses: list = field(default_factory=list)
    encoding: Optional[str] = None
    encoding_flag: Optional[int] = None


def encode_length(value):
    if value < 0:
        raise ValueError('Negative byte sequence length')
    if value == 0:
        return b'\0'
    if value <= 122:
        return bytes([value + 5])
    size = (value.bit_length() + 7) // 8
    if size > 4:
        raise ValueError('Marshal byte sequence is too large')
    return bytes([size]) + value.to_bytes(size, 'little')


class Reader:
    def __init__(self, raw, extension='.rvdata2'):
        self.raw, self.pos, self.extension = raw, 2, extension.lower()
        self.symbols, self.objects, self.strings = [], [], []
        self.nodes = 0
        if raw[:2] != b'\x04\x08':
            raise ValueError('Only Marshal 4.8 is supported')

    def take(self, size):
        if size < 0 or self.pos + size > len(self.raw):
            raise ValueError('Truncated Marshal stream')
        data = self.raw[self.pos:self.pos + size]
        self.pos += size
        return data

    def integer(self):
        n = int.from_bytes(self.take(1), 'little', signed=True)
        if n == 0:
            return 0
        if n > 4:
            return n - 5
        if n < -4:
            return n + 5
        value = int.from_bytes(self.take(abs(n)), 'little')
        return value if n > 0 else value - (1 << (8 * abs(n)))

    def count(self):
        value = self.integer()
        if value < 0 or value > min(len(self.raw), 2000000):
            raise ValueError('Invalid Marshal collection length')
        return value

    def sequence(self):
        return self.take(self.count())

    def read(self, context=None, member=None, depth=0):
        self.nodes += 1
        if depth > 250 or self.nodes > 2000000:
            raise ValueError('Marshal complexity limit exceeded')
        start = self.pos
        tag = self.take(1)
        read = lambda c=context, m=member: self.read(c, m, depth + 1)
        if tag in {b'0', b'T', b'F'}:
            return {b'0': None, b'T': True, b'F': False}[tag]
        if tag == b'i':
            return self.integer()
        if tag == b':':
            value = self.sequence().decode('utf-8', errors='strict')
            self.symbols.append(value)
            return value
        if tag == b';':
            index = self.integer()
            if not 0 <= index < len(self.symbols):
                raise ValueError('Invalid Marshal symbol reference')
            return self.symbols[index]
        if tag == b'@':
            index = self.integer()
            if not 0 <= index < len(self.objects):
                raise ValueError('Invalid Marshal object reference')
            value = self.objects[index]
            if isinstance(value, StringRef):
                value.uses.append((context, member))
            return value
        if tag == b'I':
            value = read()
            for _ in range(self.count()):
                key = read(None, None)
                flag_position = self.pos
                item = read(None, None)
                if isinstance(value, StringRef):
                    if key == 'E' and isinstance(item, bool):
                        value.encoding = 'utf-8' if item else 'ascii'
                        value.encoding_flag = flag_position
                    elif key == 'encoding' and isinstance(item, StringRef):
                        declared = item.raw.decode('ascii', errors='strict').lower()
                        value.encoding = {'windows-31j': 'cp932', 'shift_jis': 'cp932', 'utf-8': 'utf-8', 'us-ascii': 'ascii'}.get(declared, declared)
            return value
        if tag == b'"':
            raw = self.sequence()
            value = StringRef(start, self.pos, raw, [(context, member)])
            self.strings.append(value)
            self.objects.append(value)
            return value
        if tag in {b'C', b'e'}:
            read(None, None)  # Class/module symbol, not human text.
            return read()
        self.objects.append(None)
        if tag in {b'o', b'S'}:
            cls = read(None, None)
            obj = {'class': cls, 'values': {}}
            for _ in range(self.count()):
                key = read(None, None)
                value = read(obj, key)
                if isinstance(value, (int, bool)) or value is None:
                    obj['values'][key] = value
            return None
        if tag == b'[':
            for _ in range(self.count()):
                read()
            return None
        if tag in {b'{', b'}'}:
            for _ in range(self.count()):
                read(context, '__hash_key__')
                read()
            if tag == b'}':
                read()
            return None
        if tag in {b'u', b'U', b'd'}:
            read(None, None)
            if tag == b'u':
                self.sequence()  # Opaque Table/audio/etc extension data.
            else:
                read(None, None)
            return None
        if tag in {b'c', b'm', b'M', b'f', b'/'}:
            self.sequence()
            if tag == b'/':
                self.take(1)
            return None
        if tag == b'l':
            if self.take(1) not in {b'+', b'-'}:
                raise ValueError('Invalid Marshal bignum sign')
            self.take(2 * self.count())
            return None
        raise ValueError(f'Unsupported Marshal tag {tag!r} at offset {start}')

    def parse(self):
        self.read()
        if self.pos != len(self.raw):
            raise ValueError('Unexpected bytes after the Marshal root object')
        return self

    def eligible(self, use):
        context, member = use
        if not context or member == '__hash_key__':
            return False
        cls = context['class']
        if cls == 'RPG::EventCommand' and member == '@parameters':
            codes = {102, 401, 405, 320, 324}
            if self.extension == '.rxdata':
                codes.add(101)
            return context['values'].get('@code') in codes
        if cls in {'RPG::Actor', 'RPG::Class', 'RPG::Skill', 'RPG::Item', 'RPG::Weapon', 'RPG::Armor', 'RPG::Enemy', 'RPG::State'}:
            return member in {'@name', '@nickname', '@description', '@profile', '@message1', '@message2', '@message3', '@message4'}
        if cls in {'RPG::System::Terms', 'RPG::System::Words'}:
            return True
        if cls == 'RPG::System':
            return member in {'@game_title', '@currency_unit', '@elements', '@skill_types', '@weapon_types', '@armor_types'}
        return cls == 'RPG::Map' and member == '@display_name'

    def entries(self, filename):
        records = []
        for string in self.strings:
            if not string.uses or not all(self.eligible(use) for use in string.uses):
                continue
            encoding = string.encoding
            if not encoding:
                candidates = ['utf-8', 'cp932'] if self.extension == '.rvdata2' else ['cp932', 'utf-8']
                for candidate in candidates:
                    try:
                        string.raw.decode(candidate, errors='strict')
                        encoding = candidate
                        break
                    except UnicodeError:
                        continue
            if not encoding:
                raise ValueError(f'Undecodable text at {filename}:{string.start}')
            text = string.raw.decode(encoding, errors='strict')
            if not text.strip():
                continue
            records.append({'id': f'{filename}:{string.start}', 'file': filename,
                            'offset': string.start, 'original': text, 'clean': text,
                            'encoding': encoding, 'context': string.uses[0][0]['class'] + '.' + string.uses[0][1],
                            '_string': string})
        return records


def rewrite(raw, filename, translations):
    reader = Reader(raw, filename[filename.rfind('.'):]).parse()
    edits, count = [], 0
    for record in reader.entries(filename):
        value = translations.get(record['id'])
        if value is None:
            value = translations.get(record['original'])
        if value is None:
            continue
        if isinstance(value, dict):
            if value.get('original') != record['original']:
                raise ValueError('Source text mismatch: ' + record['id'])
            value = value.get('translated')
        if not isinstance(value, str) or value == record['original']:
            continue
        string = record['_string']
        codec = record['encoding']
        if codec == 'ascii' and string.encoding_flag is not None:
            codec = 'utf-8'
            edits.append((string.encoding_flag, string.encoding_flag + 1, b'T'))
        encoded = value.encode(codec, errors='strict')
        if string.encoding is None and any(c >= 128 for c in encoded) and filename.lower().endswith('.rvdata2'):
            raise ValueError('Untagged non-ASCII string requires explicit encoding support: ' + record['id'])
        edits.append((string.start, string.end, b'"' + encode_length(len(encoded)) + encoded))
        count += 1
    # Assemble the untouched spans once, avoiding one full-file copy per edit.
    parts, cursor = [], 0
    for start, end, value in sorted(edits):
        if start < cursor:
            raise ValueError('Overlapping Marshal string edits')
        parts.extend((raw[cursor:start], value))
        cursor = end
    parts.append(raw[cursor:])
    result = b''.join(parts)
    Reader(result, filename[filename.rfind('.'):]).parse()
    return result, count
