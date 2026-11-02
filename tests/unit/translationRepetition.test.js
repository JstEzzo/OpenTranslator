"use strict";
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'opent-repetition-'));
global.DATA_DIR=path.join(root,'state');global.ROOT=path.resolve(__dirname,'../..');global.CFG_PATH=path.join(global.DATA_DIR,'config.json');global.log=()=>{};
const quality=require('../../src/core/translationQuality'),QA=require('../../src/core/qaEngine');
const memory=require('../../src/core/translationMemory'),{TranslationMemory2}=memory;
const detector=require('../../src/core/engineDetector'),translator=require('../../src/translation/translator'),http=require('../../src/core/providerHttp');
const prior={detect:detector.detect,batch:translator.translateBatch,get:http.get,post:http.post};let pass=0;
(async()=>{
 for(const [source,target] of [['Yes','Sim, sim.'],['Yes','Sim im'],['Load','Carregar Carregar'],['Load','Carregar caaretgar'],['New Game','Novo jogo Novo jogo'],['He is arriving.','Ele ele ele está chegando.'],['Hello','<unk> olá'],['Japan is aging.','>>pob << O Japão está envelhecendo.'],['Hello','>>por<< Olá']]) {
  assert.strictEqual(quality.inspect(source,target).valid,false,source+' -> '+target);assert.strictEqual(QA.validate(source,target).qaStatus,'fail');pass++;
 }
 for(const [source,target] of [['Yes','Sim'],['hahaha','ha ha ha'],['No, no!','Não, não!'],['Go, go, go!','Vá, vá, vá!'],['はいはいはい','Sim sim sim'],['I had had enough.','Eu já tinha me cansado.'],['Hello [name] [name]','Olá [name] [name]'],['{b}Hello{/b}','{b}Olá{/b}']]) {
  assert.strictEqual(quality.inspect(source,target).valid,true,source+' -> '+target);pass++;
 }
 const tm=new TranslationMemory2(path.join(root,'memory.sqlite'));
 assert.strictEqual(tm.store('Load','Carregar Carregar'),false);assert.strictEqual(tm.lookup('Load'),null);pass++;
 assert(tm.hasSqlite,'Native SQLite is required to exercise legacy-cache rejection');
 tm.store('Load','Carregar');tm.db.prepare('UPDATE translations SET translated_text = ?').run('Carregar Carregar');tm.inMemoryStore.clear();
 assert.strictEqual(tm.lookup('Load'),null);assert.strictEqual(tm.db.prepare('SELECT translated_text FROM translations').get().translated_text,'Carregar Carregar');tm.db.close();pass++;
 tm.hasSqlite=false;tm.store('Save','Salvar');for(const value of tm.inMemoryStore.values())value.translated_text='Salvar Salvar';assert.strictEqual(tm.lookup('Save'),null);pass++;
 const cache=require('../../src/services/cache');
 const cacheWrite=cache.saveNewGlobalTranslations('en','pt',[['Load','Carregar Carregar']], 'repetition-fixture');
 assert.strictEqual(cacheWrite.accepted,0);assert.strictEqual(cacheWrite.rejected,1);pass++;
 const oldDb=cache.getDb();assert(oldDb);
 oldDb.prepare('INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)').run('en|pt|repetition-fixture','Load','Carregar Carregar');
 assert.strictEqual(cache.loadGlobalCacheForLang('en','pt','repetition-fixture').Load,undefined);pass++;
 assert.strictEqual(cache.getCommonTranslation('Load','en','pt',{en_pt:{Load:'Carregar Carregar'}}),null);pass++;
 const Injector=require('../../src/engines/renpy/injector/renpyInjector');const renpy=path.join(root,'renpy');fs.mkdirSync(path.join(renpy,'game'),{recursive:true});
 const rejected=await new Injector().inject(renpy,[{id:'bad',original:'A traveler arrives.',translated:'Um viajante viajante viajante chega.',type:'dialogue'}]);
 assert.strictEqual(rejected.success,false);assert.strictEqual(rejected.status,'FAILED_QA');assert.deepStrictEqual(fs.readdirSync(path.join(renpy,'game')),[]);pass++;
 const Pipeline=require('../../src/core/translationPipeline');detector.detect=async()=>({engine:'generic'});
 for(const test of [{name:'bad-provider',source:'A traveler arrives under the purple moon.',target:'Um viajante viajante viajante chega sob a lua roxa.',reject:true},{name:'bad-cache',source:'New traveler arrives.',target:'Um novo viajante chega.',reject:false}]) {
  const dir=path.join(root,test.name);fs.mkdirSync(dir);const file=path.join(dir,'dialogue.txt');fs.writeFileSync(file,test.source);let applied=0,requests=0;
  if(!test.reject)fs.writeFileSync(path.join(dir,'trans_cache.json'),JSON.stringify({sl:'en',tl:'pt-BR',translations:{[test.source]:'Viajante viajante viajante'}}));
  const adapter={async extract(){const text=fs.readFileSync(file,'utf8');return {success:true,count:1,texts:[{id:'one',clean:text,original:text,file,type:'dialogue',tokens:[]}]};},async validate(){return {valid:true};},async apply(dir,texts,map){applied++;fs.writeFileSync(file,map.get('one'));return {success:true,count:1};},async rollback(){throw Error('QA rejection must precede all writes');}};
  translator.translateBatch=async()=>{requests++;return new Map([['one',test.target]]);};
  const result=await new Pipeline({registry:{resolveAdapter:()=>adapter}}).run(dir,{sl:'en',tl:'pt-BR',provider:'google',allowNetworkFallback:false});
  assert.strictEqual(requests,1);
  if(test.reject){assert.strictEqual(result.status,'FAILED_QA');assert.strictEqual(result.appliedCount,0);assert.strictEqual(applied,0);assert.strictEqual(fs.readFileSync(file,'utf8'),test.source);assert.strictEqual(memory.lookup(test.source,{langSource:'en',langTarget:'pt-BR'}),null);}
  else {assert.strictEqual(applied,1);assert.strictEqual(fs.readFileSync(file,'utf8'),test.target);}
  pass++;
 }
 translator.translateBatch=prior.batch;
 const cb=require('../../src/core/globalCircuitBreaker').getInstance();cb.reset();
 http.get=async()=>({status:200,headers:{},body:JSON.stringify([[['Sim, sim.','Yes']]])});
 await assert.rejects(()=>translator.translateSingle('Yes','en','pt','google'),error=>error.code==='INVALID_TRANSLATION_QUALITY');pass++;
 http.post=async()=>({status:200,headers:{},body:JSON.stringify([[['Carregar Carregar','Load']]])});
 let saved=0;const batch=await translator.translateBatch([{id:'load',clean:'Load'}],'en','pt','google',[],chunk=>{saved+=chunk.length;},{allowProviderFallback:false});
 assert.strictEqual(batch.size,0);assert.strictEqual(batch.rejectedTranslations.length,1);assert.strictEqual(saved,0);pass++;
 console.log(`pass=${pass} fail=0`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
 detector.detect=prior.detect;translator.translateBatch=prior.batch;http.get=prior.get;http.post=prior.post;
 require('../../src/services/cache').closeDb();if(memory.db)memory.db.close();fs.rmSync(root,{recursive:true,force:true});
});
