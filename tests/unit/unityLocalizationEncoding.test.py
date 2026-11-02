import importlib.util,base64
from pathlib import Path
file=Path(__file__).resolve().parents[2]/'resources/unity/native_localization_worker.py'
spec=importlib.util.spec_from_file_location('localization_worker',file);worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
for text in ['Master Volume','Options {0}','Texto com acentuação: ação, coração.']:
 encoded=base64.b64encode(text.encode()).decode();value,storage=worker.decode_localized(encoded,'StringData');assert value==text and storage=='base64';assert worker.encode_localized(value,storage)==encoded
assert worker.decode_localized('New Game','m_Text')==('New Game','plain')
try:worker.decode_localized('this is not encoded','StringData');raise AssertionError('Invalid encoding accepted')
except ValueError:pass
print('pass=5 fail=0')
