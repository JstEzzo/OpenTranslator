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
print('pass=5 fail=0')
