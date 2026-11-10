import sys,struct,tempfile,json,hashlib,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('godot_bridge',ROOT/'src/engines/godot/godot_bridge.py')
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
(ROOT/'scratch').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='opent-pck-header-',dir=ROOT/'scratch') as tmp:
    root=Path(tmp);p=root/'game.pck';body=b'{"dialogue":"Hello traveler"}'
    name=b'res://dialogue.json';name+=b'\0'*((-len(name))%4)
    base=100+4+len(name)+36
    header=b'GDPC'+struct.pack('<IIII',2,4,4,1)+struct.pack('<IQ',0,base)+bytes(64)
    entry=struct.pack('<I',len(name))+name+struct.pack('<QQ',0,len(body))+hashlib.md5(body).digest()+struct.pack('<I',0)
    blob=header+struct.pack('<I',1)+entry+body;p.write_bytes(blob)
    parsed=bridge.parse_pck(str(p));assert parsed['fileCount']==1 and parsed['fileTableOffset']==96
    assert parsed['files'][0]['path']=='res://dialogue.json' and parsed['files'][0]['size']==len(body)
    assert parsed['fileBase']==base
    payload=root/'translations.json';payload.write_text('{}',encoding='utf-8');meta=root/'meta.json'
    bridge.apply_translations(str(p),str(payload),str(meta));result=json.loads(meta.read_text(encoding='utf-8'))
    assert result['success'] is False and result['code']=='PCK_REPACK_REQUIRED' and p.read_bytes()==blob
    encrypted=bytearray(blob);struct.pack_into('<I',encrypted,20,1);p.write_bytes(encrypted)
    parsed=bridge.parse_pck(str(p));assert parsed['code']=='PCK_ENCRYPTED_DIRECTORY' and parsed['files']==[]
    extracted=root/'texts.json';bridge.extract_texts(str(p),str(extracted));result=json.loads(extracted.read_text(encoding='utf-8'))
    assert result['success'] is False and result['code']=='PCK_ENCRYPTED_DIRECTORY'
    p.write_bytes(blob[:-2])
    try:bridge.parse_pck(str(p));raise AssertionError('Invalid data bounds accepted')
    except ValueError:pass
    # A v3 pack in an executable has a relative data base and index.
    p = root / 'game.exe'
    prefix = b'MZ' + bytes(62)
    body = 'type\ttext_ja\ttext_en\r\nsay\tこんにちは\tHello {0}\r\n'.encode('utf-8')
    name = b'dialogue.tsv'
    header = struct.pack('<4s5I2Q', b'GDPC', 3, 4, 6, 1, 2, 40, 40 + len(body))
    entry = struct.pack('<I', len(name)) + name + struct.pack('<QQ16sI', 0, len(body), hashlib.md5(body).digest(), 0)
    pack = header + body + struct.pack('<I', 1) + entry
    blob = prefix + pack + struct.pack('<Q4s', len(pack), b'GDPC')
    p.write_bytes(blob)
    bridge.extract_texts(str(p), str(extracted))
    rows = json.loads(extracted.read_text(encoding='utf-8'))['texts']
    assert len(rows) == 1 and rows[0]['original'] == 'Hello {0}'
    edit = dict(rows[0], translated='Olá, viajante {0}')
    payload.write_text(json.dumps({'format': 'godot_pck_tsv', 'edits': [edit]}), encoding='utf-8')
    bridge.apply_translations(str(p), str(payload), str(meta))
    assert json.loads(meta.read_text(encoding='utf-8'))['appliedCount'] == 1
    parsed = bridge.parse_pck(str(p))
    packed = parsed['files'][0]
    start = parsed['fileBase'] + packed['offset']
    assert p.read_bytes()[:len(prefix)] == prefix
    assert p.read_bytes()[start:start + packed['size']] == body.replace(b'Hello {0}', 'Olá, viajante {0}'.encode())
    after = p.read_bytes()
    try:
        bridge.apply_translations(str(p), str(payload), str(meta))
        raise AssertionError('Stale TSV source accepted')
    except ValueError as error:
        assert 'source changed' in str(error)
    assert p.read_bytes() == after
    # A second, standalone pack uses the standard keyed CSV localization format.
    p = root / 'another-game.pck'
    body = 'keys,fr,de\r\nINTRO,"Bonjour, monde",Hallo\r\n'.encode('utf-8')
    name = b'locale.csv'
    entry = struct.pack('<I', len(name)) + name + struct.pack('<QQ16sI', 0, len(body), hashlib.md5(body).digest(), 0)
    base = 100 + len(entry)
    p.write_bytes(struct.pack('<4s5IQ', b'GDPC', 2, 4, 4, 1, 0, base) + bytes(64) +
                  struct.pack('<I', 1) + entry + body)
    bridge.extract_texts(str(p), str(extracted), 'fr')
    rows = json.loads(extracted.read_text(encoding='utf-8'))['texts']
    assert len(rows) == 1 and rows[0]['original'] == 'Bonjour, monde' and rows[0]['sourceLanguage'] == 'fr'
    payload.write_text(json.dumps({'format': 'godot_pck_localization_table',
                       'edits': [dict(rows[0], translated='Olá, mundo')]}), encoding='utf-8')
    bridge.apply_translations(str(p), str(payload), str(meta))
    for language, expected in [('fr', 'Olá, mundo'), ('de', 'Hallo')]:
        bridge.extract_texts(str(p), str(extracted), language)
        assert json.loads(extracted.read_text(encoding='utf-8'))['texts'][0]['original'] == expected
    assert bridge.localization_columns(['id', 'hp', 'bg']) == {}
    p = root / 'dialogic.pck'
    timeline = ('[style name="dialog"]\r\n'
                'Guide (happy): [b]Hello {Player.Name}[/b]\\\r\n'
                'Welcome!\r\n'
                '\t- Continue | [if {Player.Ready}]\r\n'
                '\t\tjump Next\r\n').encode('utf-8')
    entries = []
    body = b''
    for name, content in [(b'res://addons/dialogic/loader.gdc', b'fixture'),
                          (b'res://chapters/intro.dtl', timeline)]:
        entries.append(struct.pack('<I', len(name)) + name +
                       struct.pack('<QQ16sI', len(body), len(content), hashlib.md5(content).digest(), 0))
        body += content
    directory = b''.join(entries)
    base = 100 + len(directory)
    p.write_bytes(struct.pack('<4s5IQ', b'GDPC', 2, 4, 3, 0, 0, base) + bytes(64) +
                  struct.pack('<I', len(entries)) + directory + body)
    bridge.extract_texts(str(p), str(extracted))
    rows = json.loads(extracted.read_text(encoding='utf-8'))['texts']
    assert [row['original'] for row in rows] == ['[b]Hello {Player.Name}[/b]', 'Welcome!', 'Continue']
    assert bridge.apply_localization_tables(str(p), bridge.parse_pck(str(p)),
           [dict(rows[0], translated='[b]Olá {Player.Name}[/b]'),
            dict(rows[2], translated='Continuar')]) == 2
    with p.open('rb') as source:
        pack = bridge.parse_pck(str(p))
        raw, _ = bridge.read_dialogic_timeline(source, pack, pack['files'][1])
    assert raw == timeline.replace(b'Hello', 'Olá'.encode()).replace(b'- Continue', b'- Continuar')
    before = p.read_bytes()
    try:
        bridge.apply_localization_tables(str(p), pack, [dict(rows[1], translated='jump Elsewhere')])
        raise AssertionError('Dialogic command accepted as translation')
    except ValueError as error:
        assert 'change Dialogic syntax' in str(error)
    assert p.read_bytes() == before
print('pass=14 fail=0')
