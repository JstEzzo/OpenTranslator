"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const Quality=require('../core/translationQuality');
const Placeholders=require('../core/placeholderIntegrityValidator');
async function translateBatch(texts,sl,tl,glossary,onBatch,options={}) {
  if(!/^pt(?:[-_]br)?$/i.test(tl)) throw new Error('The installed local models currently target Portuguese only.');
  const data=global.DATA_DIR || path.join(global.ROOT || path.resolve(__dirname,'../..'),'data');
  const configPath=options.localTranslationConfig || path.join(data,'local-translation.json');
  if(!fs.existsSync(configPath)) {const error=new Error('Local translation models are not configured on this computer.');error.code='LOCAL_TRANSLATOR_NOT_CONFIGURED';throw error;}
  const config=JSON.parse(fs.readFileSync(configPath,'utf8').replace(/^\uFEFF/,''));
  const directory=path.join(data,'local-jobs',crypto.randomUUID());fs.mkdirSync(directory,{recursive:true});
  const request=path.join(directory,'request.json'),response=path.join(directory,'response.json');
  fs.writeFileSync(request,JSON.stringify({texts,sourceLanguage:sl,targetLanguage:tl}));
  const python=config.python || require('../utils/pythonResolver').resolvePythonBinary();
  const worker=path.resolve(__dirname,'../../resources/local_translation_worker.py');
  let diagnostic='';
  const exit=await new Promise((resolve,reject)=>{
    const child=spawn(python,[worker,'--request',request,'--response',response,'--config',configPath],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const cancellation=setInterval(()=>{if(require('../core/shutdownCoordinator').isShuttingDown())child.kill();},100);
    cancellation.unref();
    child.on('error',error=>{clearInterval(cancellation);reject(error);});
    child.stdout.on('data',buffer=>{if(global.log)global.log('info','[Local translation] '+buffer.toString().trim());});
    child.stderr.on('data',buffer=>{diagnostic=(diagnostic+buffer.toString()).slice(-4000);});
    child.on('close',code=>{clearInterval(cancellation);resolve(code);});
  });
  if(require('../core/shutdownCoordinator').isShuttingDown()){const error=new Error('Local translation cancelled during shutdown; generated cache entries are preserved.');error.code='TRANSLATION_CANCELLED';throw error;}
  if(!fs.existsSync(response))throw new Error('Local translation worker failed: '+diagnostic);
  const result=JSON.parse(fs.readFileSync(response,'utf8'));
  if(exit!==0 || result.error)throw new Error(result.error || diagnostic);
  const originals=new Map(texts.map(text=>[text.id,text.clean || text.original]));
  const approved=new Map();const pending=[...(result.pending||[])];
  for(const text of result.translations || []) {
    const check=Quality.inspect(originals.get(text.id),text.translated);
    const placeholders=Placeholders.validate(originals.get(text.id),text.translated);
    if(check.valid && placeholders.valid)approved.set(text.id,text.translated);else pending.push({id:text.id,reason:[...check.issues,...(placeholders.valid?[]:['PLACEHOLDER_MISMATCH'])].join(', ')});
  }
  approved.pendingTranslations=pending;approved.localStats=result.stats;
  if(onBatch && approved.size)onBatch([...approved].map(([id,value])=>[originals.get(id),value]));
  fs.writeFileSync(path.join(directory,'status.json'),JSON.stringify({status:pending.length?'PARTIAL':'PROCESSED',translated:approved.size,pending,stats:result.stats},null,2));
  return approved;
}
module.exports={translateBatch};
