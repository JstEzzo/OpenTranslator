"use strict";
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'opent-pipeline-language-'));
global.DATA_DIR=path.join(temp,'state');global.ROOT=path.resolve(__dirname,'../..');global.log=()=>{};
const Pipeline=require('../../src/core/translationPipeline');
const detector=require('../../src/core/engineDetector');
const translator=require('../../src/translation/translator');
const oldDetect=detector.detect,oldBatch=translator.translateBatch;
const file=path.join(temp,'dialogue.txt');
let calls=0;
const adapter={
 async extract(){const text=fs.readFileSync(file,'utf8');return {success:true,count:1,texts:[{id:'one',clean:text,original:text,file,type:'dialogue',tokens:[]}]};},
 async validate(){return {valid:true};},
 async apply(dir,texts,translations){assert(translations.has('one'));fs.writeFileSync(file,translations.get('one'));return {success:true,count:1,modifiedFiles:[file]};},
 async rollback(){return {success:true};}
};
(async()=>{
 detector.detect=async()=>({engine:'generic'});
 translator.translateBatch=async(texts,sl,tl,provider,glossary,callback,options)=>{
  calls++;assert.strictEqual(provider,'google');assert.strictEqual(options.allowProviderFallback,false);
  assert.strictEqual(texts[0].clean,'An unfamiliar traveler arrives at dawn.');
  return new Map([['one','Um viajante desconhecido chega ao amanhecer.']]);
 };
 fs.writeFileSync(file,'An unfamiliar traveler arrives at dawn.');
 const pipeline=new Pipeline({registry:{resolveAdapter:()=>adapter}});
 await pipeline.run(temp,{sl:'en',tl:'pt-BR',provider:'google',allowNetworkFallback:false});
 assert.strictEqual(calls,1);assert.strictEqual(fs.readFileSync(file,'utf8'),'Um viajante desconhecido chega ao amanhecer.');
 console.log('pass=2 fail=0');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
 detector.detect=oldDetect;translator.translateBatch=oldBatch;
 require('../../src/services/cache').closeDb();const memory=require('../../src/core/translationMemory');if(memory.db)memory.db.close();
 fs.rmSync(temp,{recursive:true,force:true});
});
