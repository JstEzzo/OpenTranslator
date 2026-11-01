"""Gera documentação local sem executar módulos do aplicativo ou divulgar dados locais."""
from pathlib import Path
from collections import Counter, defaultdict
import ast, csv, hashlib, html, json, re, sys
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'OpenTranslator-documentacao'
TEXT_EXT={'.js','.mjs','.cjs','.ts','.py','.cs','.json','.md','.txt','.html','.css','.yml','.yaml','.xml','.ini','.cfg','.bat','.ps1','.csv','.toml','.rpy','.po','.h','.cpp','.c','.hpp','.sql','.map'}
PRIVATE={'data','gameLib','logs','scratch','Tool','UNITY_GAMEPLAY_EVIDENCE','graphify-out','.git'}
AREAS={'.agents':'Regras, referências e skills de ferramentas de desenvolvimento; não é backend do produto.', 'src/core':'Regras centrais: detecção, tradução, execução, integridade e recuperação.', 'src/services':'Serviços locais de HTTP/RPC, cheats e persistência.', 'src/security':'Validação da sessão local e dos arquivos expostos pela interface.', 'src/translation':'Orquestração de provedores e construção do universo de textos.', 'src/engines':'Integração específica de formatos e runtimes de jogos.', 'src/discovery':'Descoberta de jogos, origem de textos e triagem de motores desconhecidos.', 'src/diagnostics':'Inspeção de executáveis, ambiente e evidências.', 'src/utils':'Resolução de caminhos, Python, logs e utilidades compartilhadas.', 'ui':'Apresentação no navegador local e tratamento das ações do usuário.', 'tools':'Ferramenta de manutenção, empacotamento ou laboratório; executar apenas quando necessário.', 'tests':'Verificação automatizada ou roteiro de laboratório; presença não implica execução no runner principal.', 'resources':'Recursos e componentes usados pelas integrações de jogos.', 'loaders':'Componentes nativos de injeção, fontes e ferramentas auxiliares.', 'archives':'Histórico preservado; não representa necessariamente a implementação atual.', 'docs':'Documentação ou evidência; afirmações antigas precisam ser comparadas ao código atual.', 'config':'Configuração distribuída com o produto.', 'launcher':'Inicialização nativa Windows e acompanhamento do backend.', 'bin':'Runtime e componentes de execução distribuídos com o produto.', '.github':'Automação de verificação e empacotamento no GitHub.', 'third-party':'Código ou componentes de terceiros; verificar licença e procedência.'}
PURPOSE={
'.gitignore':'Lista padrões de arquivos que o Git normalmente não deve versionar; não é um inventário de dependências de execução.',
'.github/workflows/verify.yml':'Workflow de validação no Windows/Node 24: checkout, npm ci e npm run verify em pushes main, pull requests e execução manual.',
'.github/workflows/release.yml':'Workflow de empacotamento/release: monta e verifica o portable e publica artefatos conforme o gatilho configurado.',
'server.js':'Ponto de entrada Node: define diretórios e estado global, inicializa cache, servidor HTTP, hooks e encerramento coordenado.',
'package.json':'Identifica o pacote e define comandos de execução, teste e empacotamento e dependências diretas.',
'package-lock.json':'Fixa versões e integridade da árvore de dependências usada por npm ci.',
'OpenTranslator.exe':'Launcher Windows compilado; inicia e verifica o backend e abre a interface. A fonte correspondente fica em launcher/OpenTranslatorLauncher.cs.',
'launcher/OpenTranslatorLauncher.cs':'Fonte C# do launcher: instância única, diagnóstico, abertura do navegador, bandeja, modo sem GPU e encerramento do backend.',
'ui/app.js':'Interface principal: biblioteca, preferências, compatibilidade, cheats, modais e chamadas RPC. Reúne apresentação e controle de estado.',
'ui/index.html':'Documento HTML de entrada; carrega a proteção de HTML e o aplicativo da interface.',
'ui/xssGuard.js':'Funções de escape e normalização de valores exibidos na interface.',
'ui/styles/base.css':'Estilos de base extraídos da interface anterior, incluindo fontes e componentes.',
'ui/styles/layout.css':'Layout atual, cartões de compatibilidade, preferências, acessibilidade e pontos de adaptação da janela.',
'src/services/httpServer.js':'Transporte HTTP local: bootstrap da sessão, RPC, heartbeat, encerramento e entrega controlada de arquivos da interface.',
'src/services/rpcHandlers.js':'Catálogo de operações chamadas pela interface: jogos, tradução, backups, diagnóstico, memória, variáveis e cheats.',
'src/services/cheatServer.js':'Servidor de hooks HTTP/WebSocket: recebe estado de runtime, entrega comandos e atende tradução em tempo de execução.',
'src/services/cache.js':'Persistência de preferências e glossário, banco de cache de tradução e operações de migração/fechamento.',
'src/services/rpcResponse.js':'Padroniza respostas de sucesso, bloqueio, falha e entrada inválida do RPC.',
'src/core/gameService.js':'Serviço de alto nível que combina análise do jogo, planejamento, pipeline, jobs, execução e diagnóstico.',
'src/core/gameEngine.js':'Rotinas de integração legadas e compartilhadas: descoberta, preparação, instalação de hooks e tratamento de jogos e recursos.',
'src/core/engineDetector.js':'Detecta família, versão e arquitetura por evidências no executável e na estrutura do jogo.',
'src/core/executableInfo.js':'Lê cabeçalhos DOS/PE e distingue x86, x64, ARM64 e executáveis desconhecidos.',
'src/core/engineRegistry.js':'Instancia e registra adapters; resolve qual implementação atende o resultado de detecção.',
'src/core/engineCapabilityMatrix.js':'Deriva os perfis de compatibilidade do catálogo; separa implementação parcial de certificação por jogo.',
'config/engineCompatibility.json':'Catálogo de 22 perfis com escopo, versões/variantes, cheats, problemas, pendências e fontes.',
'src/core/translationPipeline.js':'Orquestra detecção, extração, tradução, QA e aplicação por adapter; também oferece dry-run.',
'src/translation/translator.js':'Executa tradução individual/em lote por provedores, controlando limites, cache, glossário e proteção de tokens.',
'src/translation/extraction/buildUniverse.js':'Constrói o universo extraído/classificado usado para contabilizar cobertura sem confundir lista parcial com jogo completo.',
'src/core/codeProtector.js':'Protege e restaura marcadores, códigos e placeholders antes/depois de traduzir.',
'src/core/backupManager.js':'Cria e restaura backups com sessões, manifesto e hashes dos arquivos envolvidos.',
'src/core/applyContract.js':'Registra o plano de arquivos e hashes declarados por uma aplicação de tradução.',
'src/core/applyTransaction.js':'Coordena preparação, backup, escrita, verificação, commit e recuperação da aplicação.',
'src/core/applyVerifier.js':'Relê o resultado no disco para verificar o que foi efetivamente aplicado.',
'src/core/applyGate.js':'Verifica condições de integridade antes de permitir gravação de traduções.',
'src/core/partialApply.js':'Representa falhas parciais e impede reportar aplicação/extração completa quando parte falhou.',
'src/core/translationResult.js':'Contrato de resultados que distingue tradução obtida, origem, falha e demais estados.',
'src/core/translationCertificate.js':'Avalia evidências e contagens para declarar o resultado de uma tradução; não certifica uma engine inteira.',
'src/core/translationAccounting.js':'Contabiliza estados e transições dos textos usados nos relatórios de cobertura.',
'src/core/shutdownCoordinator.js':'Aguarda operações em curso, restaura backups pendentes e fecha serviços no encerramento.',
'src/core/legacyGameRestore.js':'Restaura backups do fluxo legado com staging e verificação, preservando material de recuperação.',
'src/core/ownedProcessRegistry.js':'Registra propriedade de processos e valida evidências antes de controlar ou encerrar um processo.',
'src/core/jobSystem.js':'Cria e executa trabalhos em segundo plano e expõe seus estados/progresso.',
'src/core/jobPersistence.js':'Persiste checkpoints e estados de trabalhos para retomada e diagnóstico.',
'src/core/transactionJournal.js':'Registra o ciclo de transações e oferece informações para recuperação.',
'src/core/runtimeSessionManager.js':'Controla o ciclo de vida de sessões de runtime e o diretório preparado para o jogo.',
'src/core/runtimeTextManager.js':'Recebe, classifica, protege, traduz e registra textos capturados durante o jogo.',
'src/core/translationMemory.js':'Memória hierárquica de tradução com armazenamento SQLite e busca contextual.',
'src/core/translationMemory3.js':'Implementação adicional de memória/priorização. O sufixo 3 não significa que substitua todos os consumidores da implementação anterior.',
'src/core/providerGateway.js':'Porta de entrada para controle de chamadas a provedores.',
'src/core/providerHttp.js':'Camada de requisições HTTP usada pelos provedores de tradução.',
'src/core/providerRateLimiter.js':'Controla limites, espera e disponibilidade de chamadas por provedor.',
'src/core/globalCircuitBreaker.js':'Interrompe ou retarda solicitações após falhas e limites recorrentes.',
'src/security/sessionGuard.js':'Emite/valida token e restringe a sessão HTTP local por origem e host.',
'src/security/staticAssetPolicy.js':'Resolve caminhos de arquivos HTTP e restringe os recursos que podem ser expostos.',
'resources/templates/CheatOverlayTemplate.js':'Overlay JavaScript para RPG Maker: publica estado, recebe comandos e aplica variáveis, atributos, velocidade e atalhos.',
'src/engines/electron/asarUtil.js':'Leitor/extrator ASAR com validação do cabeçalho, limites e caminhos. Recusa variantes não preservadas pelo fluxo atual.',
'src/engines/electron/asarRepacker.js':'Empacota arquivos em ASAR básico e calcula offsets do conteúdo.',
'tests/index.js':'Runner registrado de testes: separa suítes em processos, seleciona grupos e verifica os resumos.',
'tools/package_release.js':'Monta o portable Windows com runtime, launcher, dependências e manifesto; verifica arquivos e runtime.',
'tools/repoLint.js':'Analisa sintaxe e regras estruturais do repositório, saindo com erro em problemas detectados.',
'tools/successAudit.js':'Procura padrões e contratos de resultado que poderiam anunciar sucesso sem evidência.',
'tools/document_project.py':'Lê a árvore do projeto e gera inventário, relações estáticas, catálogos e uma consulta HTML local sem executar módulos.'}
def private(rel):
 return any(part in PRIVATE for part in rel.split('/')[:-1])
AREAS.update({'src/providers':'Provedores especializados e integrações de tradução por formato/engine.', 'src/extractors':'Leitura e extração de texto e dados de formatos de jogos.', 'src/runtime':'Contratos, resolução e integração de componentes de tempo de execução.', 'src/signatures':'Assinaturas para identificação de executáveis e tecnologias.', 'src/mediaExtractor':'Extração de recursos multimídia; não equivale à tradução de texto em imagens.', 'src/ocr':'Reconhecimento óptico de texto e integração de captura.'})
def category(rel):
 first=rel.split('/')[0]
 if first=='.agents':return 'Configuração de desenvolvimento'
 if private(rel):return 'Dados locais / operacional / gerado'
 if first=='node_modules':return 'Dependência npm'
 if any(x in rel for x in ['/site-packages/','/Lib/','/lib/python','/include/python']):return 'Runtime / biblioteca de terceiros'
 if '.bak' in rel or rel.endswith(('.orig','.old')):return 'Cópia de segurança histórica'
 if first in {'bin','loaders','third-party'}:return 'Runtime / componente auxiliar'
 if first=='archives':return 'Histórico arquivado'
 if first=='docs':return 'Documentação / evidência'
 if first=='tests':return 'Teste / laboratório'
 return 'Produto / ferramenta'
def area(rel):
 return next((v for k,v in AREAS.items() if rel==k or rel.startswith(k+'/')), 'Arquivo de raiz ou auxiliar; consultar metadados e referências estáticas.')
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
def header(text):
 m=re.search(r'/\*\*([\s\S]*?)\*/',text[:12000])
 if not m:return None
 lines=[re.sub(r'^\s*\*?\s?','',x).strip() for x in m.group(1).splitlines()]
 lines=[x for x in lines if x and not re.match(r'[-=*]{3}|FASE|PASSO|@|PROBLEMA|BUG|FIX',x,re.I)]
 return ' '.join(lines[:3])[:420]
def describe(rel,text):
 if rel in PURPOSE:return PURPOSE[rel],'Explicação editorial do módulo'
 kind=category(rel);name=Path(rel).name;suffix=Path(rel).suffix.lower()
 if private(rel):return 'Arquivo de estado, evidência, configuração local ou trabalho temporário. Conteúdo não reproduzido na documentação; função inferida pela localização.','Metadados locais; sem resumo de conteúdo'
 if kind=='Dependência npm':return f'Arquivo do pacote npm {package(rel)}. Papel interno depende da API do pacote; o arquivo é documentado como dependência, não como código próprio.', 'Identificação de dependência'
 if suffix in {'.exe','.dll','.node','.pyd'}:return area(rel)+' Componente nativo compilado; formato e hash não comprovam seu comportamento interno.','Metadados de binário'
 if suffix in {'.png','.jpg','.jpeg','.ico','.svg','.webp'}:return 'Recurso visual: imagem, ícone, captura ou ilustração. A finalidade exata no produto exige referência de uso; nenhuma imagem foi interpretada apenas pelo nome.','Metadados de recurso'
 if suffix in {'.ttf','.otf','.woff','.woff2'}:return 'Arquivo de fonte tipográfica. Usado na interface ou em integrações conforme referências de carregamento; cobertura de glifos não certificada por inventário.','Metadados de fonte'
 if kind=='Runtime / biblioteca de terceiros':return 'Componente da distribuição de runtime ou biblioteca incorporada. Código lido quando textual; descrição funcional agrupada pela origem da dependência.','Biblioteca incorporada'
 if '/engines/' in rel and name.endswith('Adapter.js'):
  engine=rel.split('/')[2];return f'Adapter da família {engine}: implementa ou encaminha operações de extração, aplicação, validação e recuperação conforme seus métodos. A presença não certifica todas as versões.', 'Inferência estrutural do adapter'
 if rel.startswith('tests/'):
  return 'Teste ou roteiro '+name+': '+(header(text) or 'Consultar as assinaturas, comandos e asserções extraídas para identificar o cenário exercitado.'),'Cabeçalho de teste / estrutura'
 if suffix=='.md':
  title=re.search(r'^#\s+(.+)',text,re.M);return 'Documento: '+(title.group(1) if title else name)+'. Registro textual; verificar data e evidência antes de tratar afirmações históricas como atuais.','Título do documento'
 if text and header(text):return area(rel)+' Descrição declarada no cabeçalho: '+header(text),'Cabeçalho declarado; não certificação'
 return area(rel)+' Não há descrição suficientemente específica extraída; consultar assinaturas e referências.','Localização / descrição limitada'
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
 nav='<nav><a href="index.html">Catálogo pesquisável</a><h2>Neste guia</h2>'+''.join('<a href="#'+a+'">'+inline(t)+'</a>' for a,t in toc)+'</nav>'
 return '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Guia detalhado — OpenTranslator</title><style>body{margin:0;background:#111923;color:#edf3ff;font:16px/1.75 system-ui}nav{position:fixed;top:0;bottom:0;width:260px;overflow:auto;padding:24px;background:#192536;box-sizing:border-box}nav a{display:block;margin:12px 0;font-size:14px}main{margin-left:260px;max-width:1050px;padding:40px}h1{font-size:34px;line-height:1.3}h2{font-size:25px;margin-top:52px}h3{font-size:20px;color:#b4d4ff}a{color:#a9d0ff}p,li{color:#d1def0}code,pre{background:#202e42;border-radius:5px}code{padding:2px 5px;font-size:14px;overflow-wrap:anywhere}pre{padding:18px;white-space:pre-wrap}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;border:1px solid #3b506d;text-align:left;vertical-align:top}th{background:#233851}details{margin:16px 0}summary{cursor:pointer}.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.flow b{padding:10px 14px;background:#223e60;border-radius:8px}@media(max-width:850px){nav{position:static;width:auto}main{margin:0;padding:22px}}@media print{nav{display:none}main{margin:0}body{background:white;color:black}p,li{color:black}}</style>'+nav+'<main>'+''.join(out)+'</main></html>'

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
   records.append(dict(path=rel,category=category(rel),bytes=len(data),sha256=digest,reading='texto completo decodificado' if encoding else 'bytes lidos; conteúdo não interpretado',encoding=encoding,lines=text.count('\n')+1 if text else None,purpose=purpose,basis=basis,symbols=symbols(text,p.suffix.lower()) if text else [],imports=imports,usedBy=[],changedDuringRead=before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns))
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
 manifest=dict(date='2026-11-01',root=str(ROOT),files=len(records),bytes=sum(r['bytes'] for r in records),textFiles=sum(bool(r['encoding']) for r in records),metadataOnly=sum(not r['encoding'] for r in records),categories=dict(counts),errors=errors,unstable=[r['path'] for r in records if r['changedDuringRead']],limits=['.git interno excluído: histórico e objetos não são arquivos de execução do produto.','Dados locais lidos somente como bytes para tamanho/hash; conteúdo não transcrito.','Assinaturas e imports JavaScript extraídos estaticamente; podem incluir comentários ou omitir caminhos dinâmicos.','Cabeçalhos são declarações do autor, não comprovação de comportamento.','Leitura completa automatizada não equivale a auditoria humana linha a linha.'])
 (OUT/'inventario.json').write_text(json.dumps({'manifest':manifest,'files':records},ensure_ascii=False,indent=2),encoding='utf-8', newline='\n')
 with (OUT/'inventario.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.writer(f);writer.writerow(['arquivo','categoria','bytes','sha256','leitura','funcao','base_da_descricao']);writer.writerows([r[k] for k in ['path','category','bytes','sha256','reading','purpose','basis']] for r in records)
 public=[r for r in records if not private(r['path']) and (r['path'].split('/')[0] in {'src','ui','tools','tests','config','launcher','.github'} or r['path'] in {'server.js','package.json','package-lock.json','OpenTranslator.exe','LICENSE','README.md','.gitignore'})]
 def markdown(items):
  chunks=['# Catálogo arquivo por arquivo','', 'As funções descritas editorialmente são distinguidas das inferências e dos cabeçalhos declarados. Nomes de símbolos e imports são aproximações estáticas.','']
  for r in items:
   chunks += ['## `'+r['path']+'`','',r['purpose'],'','- Categoria: '+r['category']+'.','- Base da descrição: '+r['basis']+'.','- Tamanho: '+str(r['bytes'])+' bytes; linhas: '+str(r['lines'] or 'não interpretadas')+'.','- Leitura: '+r['reading']+'.','- SHA-256: `'+r['sha256']+'`.']
   if r['symbols']:chunks += ['- Assinaturas localizadas (nome:linha): '+', '.join('`'+v+'`' for v in r['symbols'])+'.']
   if r['imports']:chunks += ['- Imports literais: '+', '.join('`'+v+'`' for v in r['imports'])+'.']
   if r['usedBy']:chunks += ['- Referenciado estaticamente por: '+', '.join('`'+v+'`' for v in sorted(set(r['usedBy'])))+'.']
   chunks += ['']
  return '\n'.join(chunks)
 (OUT/'CATALOGO-COMPLETO.md').write_text(markdown(records),encoding='utf-8', newline='\n')
 (ROOT/'docs'/'CATALOGO-DO-CODIGO.md').write_text(markdown(public),encoding='utf-8', newline='\n')
 (OUT/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8', newline='\n')
 payload=json.dumps(records,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
 page=r'''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OpenTranslator — catálogo dos arquivos</title><style>body{font:16px/1.65 system-ui;background:#101722;color:#edf3ff;margin:0}main{max-width:1120px;margin:auto;padding:36px}h1{font-size:32px}p{color:#bac8dd}input,select,button{font:inherit;padding:12px;background:#1c293c;color:inherit;border:1px solid #49617e;border-radius:8px}input{flex:1;min-width:210px}.filters{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#101722;padding:12px 0}article{background:#192333;border:1px solid #33465f;border-radius:12px;padding:20px;margin:16px 0;overflow-wrap:anywhere}h2{font-size:18px;color:#a9cfff}summary{cursor:pointer}pre{white-space:pre-wrap;font:13px/1.6 monospace;color:#b9cce6}a{color:#a9cfff}.note{padding:18px;border-left:4px solid #dfbd73}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #acd2ff}</style><main><h1>OpenTranslator: documentação dos arquivos</h1><p>Inventário local de 01/11/2026. Consulte o guia para a arquitetura e os fluxos. Este catálogo inclui dependências, recursos e arquivos locais; não reproduz valores pessoais de configurações ou textos de jogos.</p><p><a href="GUIA-DETALHADO.html">Guia detalhado</a> · <a href="inventario.csv">Planilha CSV</a> · <a href="inventario.json">Inventário JSON</a> · <a href="CATALOGO-COMPLETO.md">Catálogo completo em Markdown</a></p><p class="note">Leitura automatizada integral dos textos elegíveis e metadados dos demais arquivos. Cabeçalhos e assinaturas não comprovam que uma funcionalidade esteja concluída ou validada em todos os jogos.</p><div class="filters"><input id="q" type="search" placeholder="Buscar arquivo, função, import ou assinatura" aria-label="Buscar arquivo"><select id="category" aria-label="Categoria"><option value="">Todas as categorias</option></select></div><p id="count" role="status"></p><section id="list"></section><button id="more">Mostrar mais 100 arquivos</button></main><script id="data" type="application/json">PAYLOAD</script><script>const rows=JSON.parse(document.getElementById('data').textContent);const q=document.getElementById('q'),cat=document.getElementById('category'),list=document.getElementById('list'),more=document.getElementById('more');let limit=100;for(const kind of [...new Set(rows.map(r=>r.category))].sort()){const option=document.createElement('option');option.value=option.textContent=kind;cat.append(option)}cat.value='Produto / ferramenta';function add(parent,tag,value){const el=document.createElement(tag);el.textContent=value;parent.append(el);return el}function render(){const term=q.value.toLocaleLowerCase('pt-BR');const selected=rows.filter(r=>(!cat.value||r.category===cat.value)&&(!term||[r.path,r.purpose,...r.symbols,...r.imports].join(' ').toLocaleLowerCase('pt-BR').includes(term)));list.replaceChildren();for(const r of selected.slice(0,limit)){const card=add(list,'article','');add(card,'h2',r.path);add(card,'p',r.purpose);add(card,'p',r.category+' • '+r.bytes.toLocaleString('pt-BR')+' bytes • '+r.reading);const details=add(card,'details','');add(details,'summary','Base, assinaturas e relações');add(details,'pre','Base: '+r.basis+'\nSHA-256: '+r.sha256+'\nLinhas: '+(r.lines||'não interpretadas')+'\nAssinaturas: '+r.symbols.join(', ')+'\nImports: '+r.imports.join(', ')+'\nReferências recebidas: '+r.usedBy.join(', '))}document.getElementById('count').textContent=selected.length+' arquivos encontrados; mostrando '+Math.min(limit,selected.length)+' de '+rows.length+' inventariados.';more.hidden=limit>=selected.length}q.addEventListener('input',()=>{limit=100;render()});cat.addEventListener('change',()=>{limit=100;render()});more.addEventListener('click',()=>{limit+=100;render()});render();</script></html>'''
 (OUT/'index.html').write_text(page.replace('PAYLOAD',payload),encoding='utf-8', newline='\n')
 guide=(ROOT/'docs'/'GUIA-DETALHADO.md').read_text(encoding='utf-8-sig')
 (OUT/'GUIA-DETALHADO.md').write_text(guide,encoding='utf-8', newline='\n')
 (OUT/'GUIA-DETALHADO.html').write_text(guide_html(guide),encoding='utf-8', newline='\n')
 for name in ['CATALOGO-DO-CODIGO.md','REFERENCIA-RPC.md']:
  (OUT/name).write_bytes((ROOT/'docs'/name).read_bytes())
 print(json.dumps({'output':str(OUT),'manifest':manifest,'sourceCatalogueFiles':len(public)},ensure_ascii=False))
if __name__=='__main__':build()
