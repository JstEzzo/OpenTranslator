"""Offline translation worker. Language tokens are encoder-only metadata."""
import argparse,json,os,re,sys,time,hashlib,unicodedata
from pathlib import Path
# Language detection uses small matrix operations; avoid thread startup overhead.
for variable in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):
    os.environ.setdefault(variable,'1')
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'

def main(request_file,response_file,config_file):
    config=json.loads(Path(config_file).read_text(encoding='utf-8-sig'))
    handles=[]
    for directory in config.get('dllDirectories',[]):
        if os.name=='nt':handles.append(os.add_dll_directory(directory))
        os.environ['PATH']=directory+os.pathsep+os.environ.get('PATH','')
    if config.get('languageDetectionDirectory'):sys.path.insert(0,config['languageDetectionDirectory'])
    import ctranslate2
    from transformers import MarianTokenizer
    try:
        from langid.langid import LanguageIdentifier,model as language_model
        identifier=LanguageIdentifier.from_modelstring(language_model,norm_probs=True);identifier.set_languages(['en','pt'])
    except ImportError:identifier=None
    request=json.loads(Path(request_file).read_text(encoding='utf-8-sig'))
    cache_dir=Path(config['cacheDirectory']);cache_dir.mkdir(parents=True,exist_ok=True)
    journal_path=cache_dir/'segments.jsonl';cache={};models={};encoders={};plans=[];pending={}
    def identity(language,source):
        return hashlib.sha256(json.dumps([config['models'][language]['revision'],'pt-BR',language,source],ensure_ascii=False).encode()).hexdigest()
    def clean_output(value,source):
        return bool(value) and not re.search(r'>>\s*(?:pob|por|pt(?:[_-]br)?)\s*<<|<unk>|⁇',value) and len(value)<max(100,len(source)*4)
    if journal_path.exists():
        for line in journal_path.read_text(encoding='utf-8').splitlines():
            try:
                item=json.loads(line)
                if clean_output(item['translation'],item['source']):cache[item['key']]=item['translation']
            except (KeyError,json.JSONDecodeError):continue
    canonical={'Recollection':'Recordações','Yes':'Sim','No':'Não','New Game':'Novo jogo','Continue':'Continuar','Shutdown':'Sair','End Game':'Sair do jogo','Options':'Opções','Save':'Salvar','Load':'Carregar','Attack':'Atacar','Guard':'Defender','Fight':'Lutar','Escape':'Fugir','Item':'Item','Items':'Itens','Skill':'Habilidade','Skills':'Habilidades','Equip':'Equipamento','Equipment':'Equipamento','Optimize':'Otimizar','Clear':'Remover','Cancel':'Cancelar','Back':'Voltar','On':'Ativado','Off':'Desativado','スキル':'Habilidades','ステータス':'Estado','並び替え':'Formação','セーブ':'Salvar','ロード':'Carregar','ゲーム終了':'Sair do jogo','ニューゲーム':'Novo jogo','コンティニュー':'Continuar','オプション':'Opções','装備':'Equipamento','アイテム':'Itens','武器':'Armas','防具':'Armaduras','戦う':'Lutar','逃げる':'Fugir','攻撃':'Atacar','防御':'Defender','キャンセル':'Cancelar','はい':'Sim','いいえ':'Não'}
    def language_of(text):
        if re.search(r'[\u3040-\u30ff]',text):return 'ja'
        if re.search(r'[\u3400-\u9fff]',text):
            hint=str(request.get('sourceLanguage','auto')).lower().split('-')[0]
            if hint in ('zh','en'):return 'zh' # No implicit Japanese fallback for Chinese or mismatched English input.
            return 'ja'
        return 'en'
    def encoder(language):
        if language not in encoders:encoders[language]=MarianTokenizer.from_pretrained(config['models'][language]['source'],local_files_only=True)
        return encoders[language]
    detected_sources={}
    for item in request['texts']:
        source=item.get('clean') or item.get('original') or ''
        if item.get('context') in ('RPG::Actor.@name','RPG::Actor.@nickname'):
            plans.append((item,[('literal',source)],None));continue
        if source in canonical:plans.append((item,[('literal',canonical[source])],None));continue
        if not any(character.isalpha() for character in source):plans.append((item,[('literal',source)],None));continue
        if language_of(source)=='en' and identifier and len(source.split())>=4:
            if source not in detected_sources:detected_sources[source]=identifier.classify(source)
            detected,confidence=detected_sources[source]
            if detected=='pt' and confidence>.98:plans.append((item,[('literal',source)],None));continue
        if re.search(r'[\u0400-\u052f\u0600-\u06ff\uac00-\ud7af]',source):plans.append((item,[], 'UNSUPPORTED_SOURCE_LANGUAGE'));continue
        protected=sorted(set(value for token in item.get('tokens',[]) for value in [token.get('raw'),token.get('token')] if value),key=len,reverse=True)
        protected=sorted(set(protected)|{character for character in source if unicodedata.category(character).startswith('S')},key=len,reverse=True)
        pattern='('+'|'.join([re.escape(value) for value in protected]+[r'</?[A-Za-z][^>]*>',r'⟦OT_[^⟧]+⟧',r'\\[A-Za-z]+(?:\[[^\]]*\])?',r'\\[.!|><^{}$\\]',r'%\d+',r'\{[^{}]*\}',r'\[[^\[\]]+\]',r'[/_=*~.-]{3,}'])+')'
        plan=[];reason=None
        for piece in re.split(pattern,source):
            if not piece:continue
            if piece in protected or re.fullmatch(pattern,piece) or not any(character.isalpha() for character in piece):plan.append(('literal',piece));continue
            for paragraph in re.split(r'(\n+)',piece):
                if not paragraph:continue
                if not paragraph.strip():plan.append(('literal',paragraph));continue
                leading=paragraph[:len(paragraph)-len(paragraph.lstrip())]
                trailing=paragraph[len(paragraph.rstrip()):]
                body=paragraph.strip();language=language_of(body)
                if body in canonical:plan.append(('literal',leading+canonical[body]+trailing));continue
                if language not in config['models']:reason='MISSING_LANGUAGE_MODEL';break
                model_prefix=config['models'][language].get('prefix','')
                tokens=encoder(language).convert_ids_to_tokens(encoder(language).encode(model_prefix+body))
                if len(tokens)>450:reason='INPUT_REQUIRES_REVIEW';break
                key=identity(language,body)
                plan.extend([('literal',leading),('segment',key),('literal',trailing)])
                if key not in cache:pending[key]=(language,body,tokens)
        plans.append((item,plan,reason))
    started=time.perf_counter();done=0
    with journal_path.open('a',encoding='utf-8',buffering=1) as journal:
        for language in ('en','ja'):
            subset=[(key,*values[1:]) for key,values in pending.items() if values[0]==language]
            if not subset:continue
            device=config.get('device','cpu')
            models[language]=ctranslate2.Translator(config['models'][language]['converted'],device=device,compute_type='int8_float16' if device=='cuda' else 'int8',intra_threads=config.get('threads',6))
            for index in range(0,len(subset),32):
                batch=subset[index:index+32]
                outputs=models[language].translate_batch([tokens for _,_,tokens in batch],beam_size=4,no_repeat_ngram_size=3,repetition_penalty=1.1,max_decoding_length=512,max_input_length=0)
                for (key,body,_),output in zip(batch,outputs):
                    tokens=[token for token in output.hypotheses[0] if token not in ['>>pob<<','>>por<<','>>pt<<']]
                    value=encoder(language).spm_target.decode(tokens).strip()
                    if len(tokens)>=512 or not clean_output(value,body):continue
                    cache[key]=value;journal.write(json.dumps({'key':key,'source':body,'translation':value},ensure_ascii=False)+'\n')
                done+=len(batch)
                print(json.dumps({'progress':{'processed':done,'total':len(pending),'language':language}}),flush=True)
    translations=[];unresolved=[]
    for item,plan,reason in plans:
        if reason or any(kind=='segment' and value not in cache for kind,value in plan):unresolved.append({'id':item['id'],'reason':reason or 'MODEL_OUTPUT_REQUIRES_REVIEW'});continue
        value=''.join(cache[value] if kind=='segment' else value for kind,value in plan)
        source=item.get('clean') or item.get('original') or ''
        if value!=source:translations.append({'id':item['id'],'translated':value})
    response={'translations':translations,'pending':unresolved,'stats':{'device':config.get('device','cpu'),'segmentsGenerated':done,'seconds':time.perf_counter()-started,'externalTextSent':False}}
    temporary=str(response_file)+'.tmp';Path(temporary).write_text(json.dumps(response,ensure_ascii=False),encoding='utf-8');os.replace(temporary,response_file)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--request',required=True);parser.add_argument('--response',required=True);parser.add_argument('--config',required=True);args=parser.parse_args()
    try:main(args.request,args.response,args.config)
    except Exception as error:
        Path(args.response).write_text(json.dumps({'error':str(error),'status':'LOCAL_TRANSLATION_FAILED'}),encoding='utf-8');sys.exit(1)
