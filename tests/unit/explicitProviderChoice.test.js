'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
global.ROOT=path.resolve(__dirname,'../..');fs.mkdirSync(path.join(global.ROOT,'scratch'),{recursive:true});
global.DATA_DIR=fs.mkdtempSync(path.join(global.ROOT,'scratch','provider-choice-'));global.CFG_PATH=path.join(global.DATA_DIR,'openT.json');global.log=()=>{};
const breaker=require('../../src/core/globalCircuitBreaker').getInstance();
const http=require('../../src/core/providerHttp');
const originalCheck=breaker.canExecute,originalPost=http.post,originalGet=http.get;let requests=0;
breaker.canExecute=()=>({allowed:false,reason:'RATE_LIMITED'});http.post=http.get=()=>{requests++;throw Error('Destino alternativo nao autorizado');};
(async()=>{
 const translator=require('../../src/translation/translator');
 for(const options of [undefined,{allowProviderFallback:false}]) {
   const result=await translator.translateBatch([{id:'1',clean:'Start game'}],'en','pt','google',{},null,options);
   assert.strictEqual(result.size,0);assert.strictEqual(result.rateLimited,true);assert.strictEqual(requests,0);
 }
 await assert.rejects(()=>translator.translateSingle('Start game','en','pt','google'), /blocked/);
 assert.strictEqual(requests,0);
 breaker.canExecute=()=>({allowed:true});
 http.get=async()=>{requests++;throw Error('Network unavailable');};
 await assert.rejects(()=>translator.translateSingle('Start game','en','pt','google'), /Network unavailable/);
 assert.strictEqual(requests,1);
 await assert.rejects(()=>translator.translateSingle('Start game','en','pt','invalid-provider'), /Unknown translation provider/);
 console.log('pass=5 fail=0');
})().catch(err=>{console.error(err);console.log('pass=0 fail=1');process.exitCode=1;}).finally(()=>{
 breaker.canExecute=originalCheck;http.post=originalPost;http.get=originalGet;require('../../src/services/cache').closeDb();fs.rmSync(global.DATA_DIR,{recursive:true,force:true});
});
