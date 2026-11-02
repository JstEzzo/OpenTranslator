"""Generate local documentation without executing application modules or disclosing local-state content."""
from pathlib import Path
from collections import Counter, defaultdict
import ast, csv, hashlib, html, json, re, sys
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'OpenTranslator-documentacao'
TEXT_EXT={'.js','.mjs','.cjs','.ts','.py','.cs','.json','.md','.txt','.html','.css','.yml','.yaml','.xml','.ini','.cfg','.bat','.ps1','.csv','.toml','.rpy','.po','.h','.cpp','.c','.hpp','.sql','.map'}
PRIVATE={'data','gameLib','logs','scratch','Tool','UNITY_GAMEPLAY_EVIDENCE','graphify-out','.git'}
def private(rel):
 return any(part in PRIVATE for part in rel.split('/')[:-1])
def package(rel):
 parts=rel.split('/')
 if 'node_modules' not in parts:return None
 i=parts.index('node_modules')+1
 return '/'.join(parts[i:i+2]) if i<len(parts) and parts[i].startswith('@') else (parts[i] if i<len(parts) else None)
def symbols(text,suffix):
 if suffix=='.py':
  try:
   tree=ast.parse(text);return [f'{n.name}:{n.lineno}' for n in ast.walk(tree) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef))]
  except (SyntaxError,ValueError):pass
 patterns=[r'^\s*(?:async\s+)?function\s+([\w$]+)\s*\(',r'^\s*(?:export\s+)?class\s+([\w$]+)',r'^\s*(?:static\s+)?(?:async\s+)?([\w$]+)\s*\([^;\n]*\)\s*\{']
 values=[]
 for pattern in patterns:
  for m in re.finditer(pattern,text,re.M):
   if m.group(1) not in {'if','for','while','switch','catch','constructor','else','return'}:values.append((m.start(),m.group(1)+':'+str(text.count('\n',0,m.start())+1)))
 return list(dict.fromkeys(v for _,v in sorted(values)))
def guide_html(markdown):
 lines=markdown.splitlines();out=[];toc=[];i=0
 def inline(value):
  value=html.escape(value)
  value=re.sub(r'`([^`]+)`',r'<code>\1</code>',value)
  value=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',value)
  value=re.sub(r'\[([^]]+)\]\(([^)]+)\)',lambda m:'<a href="'+html.escape(m.group(2),quote=True)+'">'+m.group(1)+'</a>',value)
  return value
 while i<len(lines):
  line=lines[i]
  if line.startswith('```'):
   kind=line[3:];block=[];i+=1
   while i<len(lines) and not lines[i].startswith('```'):block.append(lines[i]);i+=1
   if kind=='mermaid':
    labels=['Launcher','Backend local','HTTP / RPC','Serviços e pipeline','Adapters e arquivos','Tradução e validação'] if any('Launcher' in x for x in block) else ['Detectar','Extrair','Proteger','Traduzir','Validar','Backup e aplicação','Verificar resultado']
    out.append('<div class="flow">'+'<span> → </span>'.join('<b>'+inline(x)+'</b>' for x in labels)+'</div><details><summary>Fonte técnica do diagrama</summary><pre>'+html.escape('\n'.join(block))+'</pre></details>')
   else:out.append('<pre>'+html.escape('\n'.join(block))+'</pre>')
  elif line.startswith('#'):
   level=len(line)-len(line.lstrip('#'));title=line[level:].strip();anchor='sec-'+str(len(toc));out.append(f'<h{level} id="{anchor}">'+inline(title)+f'</h{level}>')
   if level==2:toc.append((anchor,title))
  elif line.startswith('|'):
   table=[]
   while i<len(lines) and lines[i].startswith('|'):
    cells=[x.strip() for x in lines[i].strip('|').split('|')]
    if not all(re.fullmatch(r'[- :]+',x) for x in cells):table.append(cells)
    i+=1
   out.append('<div class="table-wrap"><table>'+''.join('<tr>'+''.join(('<th>' if j==0 else '<td>')+inline(c)+('</th>' if j==0 else '</td>') for c in cells)+'</tr>' for j,cells in enumerate(table))+'</table></div>');continue
  elif re.match(r'^[-*] |^\d+\. ',line):
   group=[];ordered=bool(re.match(r'^\d+\. ',line));tag='ol' if ordered else 'ul'
   while i<len(lines) and re.match(r'^[-*] |^\d+\. ',lines[i]):group.append(re.sub(r'^[-*] |^\d+\. ','',lines[i]));i+=1
   out.append('<'+tag+'>'+''.join('<li>'+inline(x)+'</li>' for x in group)+'</'+tag+'>');continue
  elif line.strip():out.append('<p>'+inline(line)+'</p>')
  i+=1
 nav='<nav><a href="index.html">Searchable catalogue</a><h2>In this guide</h2>'+''.join('<a href="#'+a+'">'+inline(t)+'</a>' for a,t in toc)+'</nav>'
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Detailed guide — OpenTranslator</title><style>body{margin:0;background:#111923;color:#edf3ff;font:16px/1.75 system-ui}nav{position:fixed;top:0;bottom:0;width:260px;overflow:auto;padding:24px;background:#192536;box-sizing:border-box}nav a{display:block;margin:12px 0;font-size:14px}main{margin-left:260px;max-width:1050px;padding:40px}h1{font-size:34px;line-height:1.3}h2{font-size:25px;margin-top:52px}h3{font-size:20px;color:#b4d4ff}a{color:#a9d0ff}p,li{color:#d1def0}code,pre{background:#202e42;border-radius:5px}code{padding:2px 5px;font-size:14px;overflow-wrap:anywhere}pre{padding:18px;white-space:pre-wrap}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;border:1px solid #3b506d;text-align:left;vertical-align:top}th{background:#233851}details{margin:16px 0}summary{cursor:pointer}.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.flow b{padding:10px 14px;background:#223e60;border-radius:8px}@media(max-width:850px){nav{position:static;width:auto}main{margin:0;padding:22px}}@media print{nav{display:none}main{margin:0}body{background:white;color:black}p,li{color:black}}</style>'+nav+'<main>'+''.join(out)+'</main></html>'



def category(rel):
 first=rel.split('/')[0]
 if private(rel):return 'Local state / generated data'
 if first=='node_modules':return 'npm dependency'
 if first=='.agents':return 'Agent development configuration'
 if first=='docs':return 'Documentation / evidence'
 if first=='tests':return 'Test / fixture'
 if first in {'bin','resources','loaders','third-party'}:return 'Runtime / auxiliary component'
 return 'Product / development tool'

def describe(rel,text):
 if private(rel):return 'Local state: content is not reproduced; only metadata is recorded.', 'Metadata only'
 if rel.startswith('node_modules/'):return 'Installed npm dependency. Consult the upstream package documentation.', 'Dependency location'
 if rel.startswith('src/engines/'):return 'Engine-specific extraction, application, or integration module. Review its implementation and callers for exact coverage.', 'Inferred from location'
 if rel.startswith('src/'):return 'Application source module. Symbols and imports below are static approximations, not proof of complete functionality.', 'Inferred from location'
 if rel.startswith('ui/'):return 'Browser interface or presentation resource. Application controls use English.', 'Inferred from location'
 if rel.startswith('tests/'):return 'Test or fixture. Registration in tests/index.js determines execution in the default suite.', 'Inferred from location'
 if rel.startswith('tools/'):return 'Development, packaging, or maintenance tool; not a game runtime requirement by itself.', 'Inferred from location'
 if rel.startswith('launcher/'):return 'Native Windows launcher source and startup checks.', 'Inferred from location'
 if rel.startswith('config/'):return 'Product configuration or compatibility profile; declarations require per-game validation.', 'Inferred from location'
 if rel.startswith('.github/'):return 'GitHub workflow for verification or portable package builds.', 'Inferred from location'
 return 'Project file, bundled component, or resource. Presence and hash do not certify behavior.', 'Metadata and location'

def build():
 OUT.mkdir(parents=True,exist_ok=True)
 paths=sorted((p for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.relative_to(ROOT).parts),key=lambda p:p.relative_to(ROOT).as_posix().casefold())
 records=[];errors=[]
 for p in paths:
  rel=p.relative_to(ROOT).as_posix()
  try:
   before=p.stat();data=p.read_bytes();after=p.stat();digest=hashlib.sha256(data).hexdigest();text='';encoding=None
   if (p.suffix.lower() in TEXT_EXT or p.name in {'LICENSE','README','.gitignore'}) and b'\x00' not in data[:8192] and not private(rel):
    for enc in ['utf-8-sig','cp1252']:
     try:text=data.decode(enc);encoding=enc;break
     except UnicodeError:pass
   purpose,basis=describe(rel,text)
   imports=list(dict.fromkeys(re.findall(r'(?:require\s*\(\s*|from\s+|import\s+)["\x27]([^"\x27]+)["\x27]',text))) if text else []
   records.append(dict(path=rel,category=category(rel),bytes=len(data),sha256=digest,reading='Full decoded text' if encoding else 'Bytes read; content not interpreted',encoding=encoding,lines=text.count('\n')+1 if text else None,purpose=purpose,basis=basis,symbols=symbols(text,p.suffix.lower()) if text else [],imports=imports,usedBy=[],changedDuringRead=before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns))
  except (OSError,ValueError) as e:errors.append({'path':rel,'error':type(e).__name__})
 lookup={r['path']:r for r in records}
 for r in records:
  for imp in r['imports']:
   if not imp.startswith('.'):continue
   base=(ROOT/Path(r['path']).parent/imp).resolve()
   for candidate in [base,Path(str(base)+'.js'),Path(str(base)+'.json'),base/'index.js']:
    try:key=candidate.relative_to(ROOT).as_posix()
    except ValueError:continue
    if key in lookup:lookup[key]['usedBy'].append(r['path']);break
 counts=Counter(r['category'] for r in records)
 manifest=dict(date='2026-11-01',root=str(ROOT),files=len(records),bytes=sum(r['bytes'] for r in records),textFiles=sum(bool(r['encoding']) for r in records),metadataOnly=sum(not r['encoding'] for r in records),categories=dict(counts),errors=errors,unstable=[r['path'] for r in records if r['changedDuringRead']],limits=['Git internals are excluded.','Local-state contents are not reproduced.','Static symbols/imports can omit dynamic paths.','Descriptions are not functional certification.','Automated full reading is not a human line-by-line semantic audit.'])
 (OUT/'inventario.json').write_text(json.dumps({'manifest':manifest,'files':records},ensure_ascii=False,indent=2),encoding='utf-8', newline='\n')
 with (OUT/'inventario.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.writer(f);writer.writerow(['path','category','bytes','sha256','reading','purpose','description_basis']);writer.writerows([r[k] for k in ['path','category','bytes','sha256','reading','purpose','basis']] for r in records)
 public=[r for r in records if not private(r['path']) and (r['path'].split('/')[0] in {'src','ui','tools','tests','config','launcher','.github'} or r['path'] in {'server.js','package.json','package-lock.json','OpenTranslator.exe','LICENSE','README.md','.gitignore'})]
 def markdown(items):
  chunks=['# File-by-file code catalogue','', 'Editorial descriptions are distinguished from location-based inferences. Symbols and imports are static approximations, not proof of functional completeness.','']
  for r in items:
   chunks += ['## `'+r['path']+'`','',r['purpose'],'','- Category: '+r['category']+'.','- Description basis: '+r['basis']+'.','- Size: '+str(r['bytes'])+' bytes; lines: '+str(r['lines'] or 'not interpreted')+'.','- Reading: '+r['reading']+'.','- SHA-256: `'+r['sha256']+'`.']
   if r['symbols']:chunks += ['- Symbols (name:line): '+', '.join('`'+v+'`' for v in r['symbols'])+'.']
   if r['imports']:chunks += ['- Literal imports: '+', '.join('`'+v+'`' for v in r['imports'])+'.']
   if r['usedBy']:chunks += ['- Static incoming references: '+', '.join('`'+v+'`' for v in sorted(set(r['usedBy'])))+'.']
   chunks += ['']
  return '\n'.join(chunks)
 (OUT/'CATALOGO-COMPLETO.md').write_text(markdown(records),encoding='utf-8', newline='\n')
 (ROOT/'docs'/'CATALOGO-DO-CODIGO.md').write_text(markdown(public),encoding='utf-8', newline='\n')
 (OUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8', newline='\n')
 payload=json.dumps(records,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
 page=r'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenTranslator code catalogue</title><style>body{max-width:1100px;margin:auto;padding:30px;background:#111923;color:#edf3ff;font:16px/1.7 system-ui}article{padding:18px;border:1px solid #405674;margin:15px 0;border-radius:10px}h2{font-size:18px;overflow-wrap:anywhere}input{font:inherit;padding:12px;width:95%}</style><h1>File catalogue</h1><p>Static inventory; not a compatibility certification. Local state content is not reproduced.</p><input id="q" aria-label="Search files" placeholder="Search files or descriptions"><section id="list"></section><script id="data" type="application/json">PAYLOAD</script><script>const rows=JSON.parse(document.getElementById('data').textContent);function render(){const q=document.getElementById('q').value.toLowerCase(),list=document.getElementById('list');list.replaceChildren();for(const r of rows.filter(r=>(r.path+' '+r.purpose).toLowerCase().includes(q)).slice(0,100)){const a=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p');h.textContent=r.path;p.textContent=r.purpose;a.append(h,p);list.append(a)}}document.getElementById('q').addEventListener('input',render);render();</script></html>'''
 (OUT/'index.html').write_text(page.replace('PAYLOAD',payload),encoding='utf-8', newline='\n')
 guide=(ROOT/'docs'/'GUIA-DETALHADO.md').read_text(encoding='utf-8-sig')
 (OUT/'GUIA-DETALHADO.md').write_text(guide,encoding='utf-8', newline='\n')
 (OUT/'GUIA-DETALHADO.html').write_text(guide_html(guide),encoding='utf-8', newline='\n')
 for name in ['CATALOGO-DO-CODIGO.md','REFERENCIA-RPC.md']:
  (OUT/name).write_bytes((ROOT/'docs'/name).read_bytes())
 print(json.dumps({'output':str(OUT),'manifest':manifest,'sourceCatalogueFiles':len(public)},ensure_ascii=False))
if __name__=='__main__':build()
