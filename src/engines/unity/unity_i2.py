"""Read the aligned I2 LanguageSourceAsset layout used by Unity Mono builds."""

import hashlib
import os
import struct
import tempfile

import UnityPy


class Reader:
    def __init__(self, data, position):
        self.data = data
        self.position = position

    def take(self, length):
        end = self.position + length
        if length < 0 or end > len(self.data):
            raise ValueError("Invalid I2 field bounds")
        result = self.data[self.position:end]
        self.position = end
        return result

    def number(self):
        return struct.unpack("<I", self.take(4))[0]

    def count(self, limit):
        value = self.number()
        if value > limit:
            raise ValueError("Invalid I2 array count")
        return value

    def align(self):
        self.take((-self.position) % 4)

    def text(self):
        start = self.position
        value = self.take(self.count(16 * 1024 * 1024)).decode("utf-8")
        self.align()
        return value, start, self.position


def parse(raw, offset):
    reader = Reader(raw, offset)
    if any(reader.number() > 1 for _ in range(3)):
        raise ValueError("Unsupported I2 source flags")
    terms = []
    for _ in range(reader.count(100000)):
        key = reader.text()[0]
        kind = reader.number()
        values = [reader.text() for _ in range(reader.count(256))]
        reader.take(reader.count(256))
        reader.align()
        for _ in range(reader.count(256)):
            reader.text()
        terms.append((key, kind, values))
    if reader.number() > 1:
        raise ValueError("Unsupported I2 case flag")
    reader.number()
    reader.text()
    languages = []
    for _ in range(reader.count(256)):
        name = reader.text()[0]
        code = reader.text()[0]
        reader.number()
        languages.append((name, code))
    if not languages or any(len(values) != len(languages) for _, _, values in terms):
        raise ValueError("I2 language and term arrays disagree")
    return terms, languages


def source_objects(env):
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            header = obj.parse_monobehaviour_head()
            script = header.m_Script.deref_parse_as_object()
        except Exception:
            continue
        if (script.m_Namespace, script.m_ClassName) == ("I2.Loc", "LanguageSourceAsset"):
            raw = obj.get_raw_data()
            reader = Reader(raw, 28)
            if reader.text()[0] != header.m_Name:
                raise ValueError("I2 MonoBehaviour header did not match")
            yield obj, raw, reader.position


def choose_language(languages, requested):
    wanted = requested.lower().replace("_", "-")
    codes = [code.lower().replace("_", "-") for _, code in languages]
    for candidate in (("en", "ja") if wanted == "auto" else (wanted,)):
        for i, code in enumerate(codes):
            if code == candidate or code.split("-")[0] == candidate:
                return i
    return 0 if wanted == "auto" else None


def extract(env, file, requested):
    rows = []
    for obj, raw, offset in source_objects(env):
        terms, languages = parse(raw, offset)
        column = choose_language(languages, requested)
        if column is None:
            continue
        for index, (key, kind, values) in enumerate(terms):
            value = values[column][0]
            if kind != 0 or not value.strip() or not any(c.isalpha() for c in value):
                continue
            rows.append({
                "id": f"unity_i2:{file}:{obj.path_id}:{index}",
                "file": file, "pathId": obj.path_id, "rowIndex": index,
                "colIndex": column, "context": key, "original": value, "clean": value,
                "sourceLanguage": languages[column][1], "format": "unity_i2"
            })
    return rows


def inject(filename, items):
    directory = os.path.dirname(filename)
    with open(filename, "rb") as stream:
        env = UnityPy.load(stream.read(), path=directory)
    sources = {obj.path_id: (obj, raw, offset) for obj, raw, offset in source_objects(env)}
    grouped = {}
    for item in items:
        grouped.setdefault(item["pathId"], []).append(item)
    expected = {}
    for object_id, edits in grouped.items():
        obj, raw, offset = sources[object_id]
        terms, languages = parse(raw, offset)
        changes = {}
        for item in edits:
            row, column = item["rowIndex"], item["colIndex"]
            if not 0 <= row < len(terms) or not 0 <= column < len(languages):
                raise ValueError("Invalid I2 translation position")
            key, kind, values = terms[row]
            value, start, end = values[column]
            translated = item["translation"]
            if kind != 0 or key != item["context"] or value != item["original"] or not translated.strip() or start in changes:
                raise ValueError("I2 translation source changed or appeared twice")
            encoded = translated.encode("utf-8")
            changes[start] = (end, struct.pack("<I", len(encoded)) + encoded + bytes((-len(encoded)) % 4))
        patched = raw
        for start in sorted(changes, reverse=True):
            end, replacement = changes[start]
            patched = patched[:start] + replacement + patched[end:]
        parse(patched, offset)
        obj.set_raw_data(patched)
        expected[object_id] = patched

    output = env.file.save()
    fd, temporary = tempfile.mkstemp(prefix=".opent-i2-", suffix=".assets", dir=directory)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(output)
        with open(temporary, "rb") as stream:
            verified = UnityPy.load(stream.read(), path=directory)
        digest = lambda obj: hashlib.sha256(obj.get_raw_data()).digest()
        if {obj.path_id: digest(obj) for obj in env.objects if obj.path_id not in expected} != {
                obj.path_id: digest(obj) for obj in verified.objects if obj.path_id not in expected}:
            raise ValueError("Unrelated Unity objects changed")
        if {obj.path_id: obj.get_raw_data() for obj in verified.objects if obj.path_id in expected} != expected:
            raise ValueError("Unity I2 write verification failed")
        os.replace(temporary, filename)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return len(items)
