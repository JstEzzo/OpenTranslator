import sys, tempfile, struct, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'resources/rpgmaker'))
from ruby_marshal_codec import Reader, rewrite, encode_length
spec = importlib.util.spec_from_file_location('rgss_archive', ROOT / 'src/engines/rpgmaker/rgss3a_bridge.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)
def symbol(s):
    raw=s.encode(); return b':' + encode_length(len(raw)) + raw
def string(s):
    raw=s.encode(); return b'I"' + encode_length(len(raw)) + raw + encode_length(1) + symbol('E') + b'T'
def actor(name):
    return b'o' + symbol('RPG::Actor') + encode_length(2) + symbol('@name') + string(name) + symbol('@character_name') + string('Actor1')
raw=b'\x04\x08['+encode_length(1)+actor('Chris')
entries=Reader(raw).parse().entries('Actors.rvdata2')
assert len(entries)==1 and entries[0]['original']=='Chris'
updated,count=rewrite(raw,'Actors.rvdata2',{entries[0]['id']:{'original':'Chris','translated':'Ação e coração'}})
assert count==1 and Reader(updated).parse().entries('Actors.rvdata2')[0]['original']=='Ação e coração'
assert b'Actor1' in updated
try: Reader(raw[:-1]).parse(); raise AssertionError('truncation accepted')
except ValueError: pass
try: rewrite(raw,'Actors.rvdata2',{entries[0]['id']:{'original':'Wrong','translated':'Other'}}); raise AssertionError('stale source accepted')
except ValueError: pass
(ROOT / 'scratch').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='opent-archive-fixture-', dir=ROOT / 'scratch') as tmp:
    base=Path(tmp); source=base/'source'; (source/'Data').mkdir(parents=True); (source/'Graphics').mkdir()
    (source/'Data/Actors.rvdata2').write_bytes(raw); (source/'Graphics/asset.png').write_bytes(b'asset')
    packed=base/'Game.rgss3a'; archive.pack_rgss3a(str(source),str(packed))
    # Real archives may terminate the index with only the encrypted zero offset.
    blob=bytearray(packed.read_bytes()); key=(struct.unpack_from('<I',blob,8)[0]*9+3)&0xffffffff
    pos=12; offsets=[]
    while True:
        off=struct.unpack_from('<I',blob,pos)[0]^key
        if off==0: break
        offsets.append(pos); length=struct.unpack_from('<I',blob,pos+12)[0]^key; pos+=16+length
    del blob[pos+4:pos+16]
    for position in offsets:
        off=struct.unpack_from('<I',blob,position)[0]^key
        struct.pack_into('<I',blob,position,(off-12)^key)
    packed.write_bytes(blob)
    target=base/'out'; files=archive.unpack_rgss3a(str(packed),str(target),data_only=True)
    assert files==['Data/Actors.rvdata2']
    assert (target/'Data/Actors.rvdata2').read_bytes()==raw and not (target/'Graphics').exists()
    try: archive.unpack_rgss3a(str(packed),str(target),data_only=True); raise AssertionError('existing file overwritten')
    except FileExistsError: pass
print('pass=7 fail=0')
