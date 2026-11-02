"""Translate selected Unity localization fields without altering other serialized objects.
Optional dependency: TypeTreeGeneratorAPI. Never executes game assemblies.
"""
import argparse,base64,hashlib,json,os,sys
from pathlib import Path

def decode_localized(value,group):
 if group not in ('StringData','Random000','Topic000'):return value,'plain'
 decoded=base64.b64decode(value,validate=True).decode('utf8')
 if base64.b64encode(decoded.encode('utf8')).decode('ascii')!=value:raise ValueError('Unsupported localization encoding')
 return decoded,'base64'

def encode_localized(value,storage):
 return base64.b64encode(value.encode('utf8')).decode('ascii') if storage=='base64' else value

def run(game,dependency,mode,payload):
 if dependency:sys.path.insert(0,dependency)
 import UnityPy
 from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
 game=Path(game);data=next(game.glob('*_Data'));file=data/'data.unity3d'
 env=UnityPy.load(file.read_bytes());version=next(iter(env.objects)).assets_file.unity_version
 generator=TypeTreeGenerator(version);generator.load_local_game(str(game));env.typetree_generator=generator
 def key(obj):return obj.assets_file.name+':'+str(obj.path_id)
 def digest(obj):return hashlib.sha256(obj.get_raw_data()).hexdigest()
 objects={key(obj):obj for obj in env.objects};rows=[];failures=0
 def paths(tree):
  for group in ('StringData','Random000','Topic000'):
   if isinstance(tree.get(group),list):
    for index,item in enumerate(tree[group]):
     if isinstance(item,dict) and isinstance(item.get('English'),str) and item['English'].strip():yield [group,index,'English'],item['English']
  for field in ('m_text','m_Text'):
   if isinstance(tree.get(field),str) and tree[field].strip():yield [field],tree[field]
 for identifier,obj in objects.items():
  if obj.type.name!='MonoBehaviour':continue
  try:tree=obj.read_typetree()
  except Exception:failures+=1;continue
  for keys,value in paths(tree):
   stored=value;value,storage=decode_localized(value,keys[0])
   identity=identifier+':'+json.dumps(keys,separators=(',',':'));rows.append({'id':identity,'object':identifier,'keys':keys,'file':str(file.relative_to(game)).replace('\\','/'),'original':value,'clean':value,'storedOriginal':stored,'storageEncoding':storage,'engine':'unity','format':'unity_native_localization'})
 if mode=='extract':return {'success':True,'texts':rows,'count':len(rows),'unreadableObjects':failures,'scope':'English localization columns and native UI text; full game coverage unknown'}
 request=json.loads(Path(payload).read_text(encoding='utf-8-sig'));by_id={row['id']:row for row in rows};trees={};changed=0
 original_hashes={identifier:digest(obj) for identifier,obj in objects.items()}
 for item in request:
  source=by_id.get(item['id'])
  if not source or source['original']!=item['original']:raise ValueError('Unity localization source changed')
  if not isinstance(item.get('translated'),str) or not item['translated'].strip():raise ValueError('Empty Unity translation')
  identifier=source['object']
  if identifier not in trees:trees[identifier]=objects[identifier].read_typetree()
  node=trees[identifier]
  for part in source['keys'][:-1]:node=node[part]
  node[source['keys'][-1]]=encode_localized(item['translated'],source['storageEncoding']);changed+=1
 for identifier,tree in trees.items():objects[identifier].save_typetree(tree)
 bundle=next(iter(env.files.values()));output=bundle.save();temporary=file.with_suffix(file.suffix+'.opent-native.tmp');temporary.write_bytes(output)
 try:
  check=UnityPy.load(temporary.read_bytes());check.typetree_generator=generator;actual={key(obj):obj for obj in check.objects}
  if set(actual)!=set(objects):raise ValueError('Unity object inventory changed')
  for identifier,obj in actual.items():
   if identifier in trees:
    if obj.read_typetree()!=trees[identifier]:raise ValueError('Unity localization round-trip mismatch')
   elif digest(obj)!=original_hashes[identifier]:raise ValueError('Unrelated Unity object changed')
  os.replace(temporary,file)
 except Exception:
  if temporary.exists():temporary.unlink()
  raise
 return {'success':True,'count':changed,'modifiedFiles':[str(file)],'untouchedObjectsVerified':len(objects)-len(trees),'changedObjects':len(trees),'unreadableObjects':failures}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--game-dir',required=True);parser.add_argument('--dependency-dir');parser.add_argument('--mode',choices=['extract','apply'],required=True);parser.add_argument('--payload');parser.add_argument('--output',required=True);args=parser.parse_args()
 try:result=run(args.game_dir,args.dependency_dir,args.mode,args.payload)
 except Exception as error:result={'success':False,'error':str(error)}
 Path(args.output).write_text(json.dumps(result,ensure_ascii=False),encoding='utf8')
 sys.exit(0 if result['success'] else 1)
