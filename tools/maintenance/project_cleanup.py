"""Conserva dados do usuário; arquiva somente alvos explícitos e verifica cada hash antes de remover."""
from pathlib import Path
import argparse,csv,hashlib,json,zipfile
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
ARCHIVE_DIRS={'archives','graphify-out','scratch','UNITY_GAMEPLAY_EVIDENCE','docs/analysis','bin/node-v20.18.3-win-x64'}
def sha(data):return hashlib.sha256(data).hexdigest()
def reason(relative):
 if relative in {'bin/build_single_exe.ps1','bin/download_node.ps1','tools/upd2.js','tools/upd3.js','tools/upd4.js'}:return 'script-pontual-ou-build-antigo-node20-substituido'
 for directory in sorted(ARCHIVE_DIRS):
  if relative==directory or relative.startswith(directory+'/'):
   return 'runtime-node20-incompativel-ABI137' if directory.startswith('bin/') else 'historico-laboratorio-ou-resultado-gerado'
 parts=relative.split('/')
 if '__pycache__' in parts and not any(name in {'data','gameLib','Tool'} for name in parts):
  source=(ROOT/relative).parent.parent/(Path(relative).name.split('.')[0]+'.py')
  if Path(relative).suffix=='.pyc' and source.is_file():return 'cache-python-regeneravel-com-fonte-presente'
 if relative.startswith('src/') and not relative.startswith(('src/data/','src/Tool/')) and (Path(relative).name.endswith('.bak') or '.bak_' in Path(relative).name):return 'copia-historica-de-codigo'
 return None
def role(relative):
 first=relative.split('/')[0]
 if first in {'data','gameLib','logs','Tool'} or relative.startswith(('src/data/','src/Tool/')):return 'preservar-dados-locais'
 if first in {'docs','tests','tools','.agents','.github'} or relative=='skills-lock.json':return 'desenvolvimento-documentacao-ou-testes'
 if first=='node_modules':return 'dependencia-npm-preservada-na-origem'
 if first in {'src','ui','config','resources','loaders','bin','third-party'}:return 'runtime-ou-componente-potencial-preservado'
 return 'arquivo-de-raiz-preservado'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--output');args=parser.parse_args()
 output=Path(args.output).resolve() if args.output else ROOT.parent/'OpenTranslator-organizacao'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 if output==ROOT or ROOT in output.parents or output in ROOT.parents:raise RuntimeError('O destino deve ficar fora da origem e não pode ser ancestral dela')
 if output.exists():raise RuntimeError('Escolha um destino novo; não sobrescrevo auditorias anteriores')
 output.mkdir(parents=True)
 records=[];selected=[]
 for file in sorted(ROOT.rglob('*')):
  relative=file.relative_to(ROOT).as_posix()
  if '.git' in file.relative_to(ROOT).parts or not file.is_file():continue
  if file.is_symlink() or not file.resolve().is_relative_to(ROOT):raise RuntimeError('Link/caminho externo não permitido: '+relative)
  data=file.read_bytes();why=reason(relative)
  record={'path':relative,'bytes':len(data),'sha256':sha(data),'decision':'arquivar-fora-do-projeto' if why else role(relative),'reason':why or 'Não removido por ausência de prova de inutilidade'}
  records.append(record)
  if why:selected.append(record)
 # Verify every selected path again before any destructive step.
 for record in selected:
  target=(ROOT/record['path']).resolve()
  if not target.is_relative_to(ROOT) or not reason(record['path']):raise RuntimeError('Alvo fora do plano validado')
 report={'createdAt':datetime.now(timezone.utc).isoformat(),'mode':'apply' if args.apply else 'dry-run','root':str(ROOT),'filesInspected':len(records),'selectedFiles':len(selected),'selectedBytes':sum(r['bytes'] for r in selected),'files':records}
 (output/'file-decisions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 with (output/'file-decisions.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=['path','bytes','sha256','decision','reason']);writer.writeheader();writer.writerows(records)
 if args.apply and selected:
  archive=output/'historico-retirado.zip'
  with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as zipped:
   for record in selected:zipped.write(ROOT/record['path'],record['path'])
   zipped.writestr('CLEANUP-MANIFEST.json',json.dumps(selected,ensure_ascii=False,indent=2))
  with zipfile.ZipFile(archive) as zipped:
   for record in selected:
    if sha(zipped.read(record['path']))!=record['sha256']:raise RuntimeError('Arquivo compactado diferente: '+record['path'])
  # Recheck all source hashes before removing any original.
  for record in selected:
   if sha((ROOT/record['path']).read_bytes())!=record['sha256']:raise RuntimeError('Arquivo mudou durante a operação: '+record['path'])
  for record in selected:
   target=ROOT/record['path']
   if not target.resolve().is_relative_to(ROOT):raise RuntimeError('Alvo saiu da raiz')
   target.unlink()
  parents={parent for record in selected for parent in (ROOT/record['path']).parents if parent!=ROOT and parent.is_relative_to(ROOT)}
  for directory in sorted(parents,key=lambda p:len(p.parts),reverse=True):
   try:directory.rmdir()
   except OSError:pass
  report['archive']=str(archive);report['archiveBytes']=archive.stat().st_size;report['removedFiles']=len(selected)
  (output/'result.json').write_text(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
if __name__=='__main__':main()
