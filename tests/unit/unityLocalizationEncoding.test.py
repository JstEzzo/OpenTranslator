import importlib.util,base64,struct,sys,types
from pathlib import Path
file=Path(__file__).resolve().parents[2]/'resources/unity/native_localization_worker.py'
spec=importlib.util.spec_from_file_location('localization_worker',file);worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
for text in ['Master Volume','Options {0}','Texto com acentuação: ação, coração.']:
 encoded=base64.b64encode(text.encode()).decode();value,storage=worker.decode_localized(encoded,'StringData');assert value==text and storage=='base64';assert worker.encode_localized(value,storage)==encoded
assert worker.decode_localized('New Game','m_Text')==('New Game','plain')
try:worker.decode_localized('this is not encoded','StringData');raise AssertionError('Invalid encoding accepted')
except ValueError:pass
sys.modules.setdefault('UnityPy', types.ModuleType('UnityPy'))
i2_file=Path(__file__).resolve().parents[2]/'src/engines/unity/unity_i2.py'
spec=importlib.util.spec_from_file_location('unity_i2',i2_file)
i2=importlib.util.module_from_spec(spec);spec.loader.exec_module(i2)
def number(value):
 return struct.pack('<I',value)
def text(value):
 data=value.encode('utf-8')
 return number(len(data))+data+bytes((-len(data))%4)
raw=(number(0)*3+number(1)+text('greeting')+number(0)+number(2)+text('こんにちは')+text('Hello')+
     number(2)+bytes(4)+number(0)+number(0)*2+text('')+number(2)+
     text('Japanese')+text('ja')+number(0)+text('English')+text('en')+number(0))
terms,languages=i2.parse(raw,0)
assert languages==[('Japanese','ja'),('English','en')]
assert i2.choose_language(languages,'auto')==1 and i2.choose_language(languages,'ja')==0
assert i2.choose_language(languages,'pt') is None
original,start,end=terms[0][2][1]
assert original=='Hello'
patched=raw[:start]+text('Olá, viajante!')+raw[end:]
updated,_=i2.parse(patched,0)
assert [field[0] for field in updated[0][2]]==['こんにちは','Olá, viajante!']
try:i2.parse(raw[:-2],0);raise AssertionError('Truncated I2 table accepted')
except ValueError:pass
print('pass=8 fail=0')
