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
 async extract(){
  const text=fs.readFileSync(file,'utf8');
  const texts=[
   {id:'one',clean:text,original:text,file,type:'dialogue',tokens:[]},
   {id:'code',original:'const gameVersion = 2;',file:'nested/game.js'},
   {id:'docs',original:'Installation instructions',file:'nested/README.md'}
  ];
  return {success:true,count:texts.length,texts};
 },
 getCapabilities(){return {};},
 async validate(){return {valid:true};},
 async apply(dir,texts,translations){assert.deepStrictEqual(texts.map(row=>row.id),['one']);assert(translations.has('one'));fs.writeFileSync(file,translations.get('one'));return {success:true,count:1,modifiedFiles:[file]};},
 async rollback(){return {success:true};}
};
(async()=>{
 detector.detect=async()=>({engine:'generic'});
 translator.translateBatch=async(texts,sl,tl,provider,glossary,callback,options)=>{
  calls++;assert.strictEqual(provider,'google');assert.strictEqual(options.allowProviderFallback,false);
  assert.strictEqual(texts.length,1);
  assert.strictEqual(texts[0].clean,'An unfamiliar traveler arrives at dawn.');
  return new Map([['one','Um viajante desconhecido chega ao amanhecer.']]);
 };
 fs.writeFileSync(file,'An unfamiliar traveler arrives at dawn.');
 const pipeline=new Pipeline({registry:{resolveAdapter:()=>adapter}});
 const preview=await pipeline.dryRun(temp);
 assert.strictEqual(preview.totalStrings,1);
 assert.deepStrictEqual(preview.extractionReview,{
  candidates:3,accepted:1,excluded:2,reasons:{CODE_STATEMENT:1,DOCUMENTATION:1}
 });
 const {reviewExtraction}=require('../../src/translation/extraction/reviewExtraction');
 const dialogue={id:'script-line',original:'紅英，你醒了嗎？',file:'nested/game.rpy'};
 assert.strictEqual(reviewExtraction({success:true,texts:[dialogue]}).texts[0],dialogue);
 assert.strictEqual(reviewExtraction({success:true,texts:[dialogue,dialogue]}).status,'INVALID_EXTRACTION_RECORDS');
 assert.strictEqual(reviewExtraction({success:true,texts:[{id:'url',original:'res://scene.tscn'}]}).status,'NO_DISPLAY_TEXT_FOUND');
 await pipeline.run(temp,{sl:'en',tl:'pt-BR',provider:'google',allowNetworkFallback:false});
 assert.strictEqual(calls,1);assert.strictEqual(fs.readFileSync(file,'utf8'),'Um viajante desconhecido chega ao amanhecer.');
 console.log('pass=6 fail=0');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
 detector.detect=oldDetect;translator.translateBatch=oldBatch;
 require('../../src/services/cache').closeDb();const memory=require('../../src/core/translationMemory');if(memory.db)memory.db.close();
 fs.rmSync(temp,{recursive:true,force:true});
});
