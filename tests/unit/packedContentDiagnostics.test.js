'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'opent-packed-diagnostics-'));
global.DATA_DIR=path.join(base,'state');global.ROOT=path.resolve(__dirname,'../..');global.log=()=>{};
(async()=>{
 const GM=require('../../src/engines/gamemaker/gameMakerAdapter');
 const dir=path.join(base,'gamemaker');fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'options.ini'),'[Windows]\nSleepMargin=10\nUsex64=True\n');fs.writeFileSync(path.join(dir,'data.win'),'FORM');
 const gm=new GM();const r=await gm.extract(dir);
 assert.strictEqual(r.success,false);assert.strictEqual(r.status,'UNSUPPORTED_PACKED_DATA');assert.strictEqual(r.count,0);
 assert.strictEqual(gm.getCapabilities(dir).nativeLocalization,false);
 fs.writeFileSync(path.join(dir,'lang.json'),JSON.stringify({greeting:'Hello traveler'}));
 const localized=await gm.extract(dir);assert.strictEqual(localized.success,true);assert.strictEqual(localized.count,1);assert.strictEqual(localized.texts[0].clean,'Hello traveler');
 const godotDir=path.join(base,'godot');fs.mkdirSync(godotDir);fs.writeFileSync(path.join(godotDir,'Game.exe'),'opaque executable');
 const Godot=require('../../src/engines/godot/godotAdapter');
 const godot=new Godot();
 const unknown=await godot.extract(godotDir);
 assert.strictEqual(unknown.success,false);assert.strictEqual(unknown.status,'STATIC_TEXT_NOT_EXPOSED');assert.strictEqual(unknown.universeComplete,false);
 const packedApply=await godot.apply(godotDir,[{id:'pck-one',file:'Game.pck',format:'godot_pck_json'}],new Map([['pck-one','Texto traduzido']]));
 assert.strictEqual(packedApply.success,false);assert.strictEqual(packedApply.status,'PCK_REPACK_REQUIRED');
 assert.deepStrictEqual(fs.readdirSync(godotDir),['Game.exe']);
 const detector=require('../../src/core/engineDetector'),previous=detector.detect;
 try {
  detector.detect=async()=>({engine:'gamemaker'});
  const Pipeline=require('../../src/core/translationPipeline');
  const pipeline=new Pipeline({registry:{resolveAdapter:()=>({extract:async()=>r})}});
  const dry=await pipeline.dryRun(dir);assert.strictEqual(dry.success,false);assert.strictEqual(dry.status,'FAILED_EXTRACTION');assert.strictEqual(dry.universeComplete,false);
 } finally {detector.detect=previous;}
 console.log('pass=5 fail=0');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
 require('../../src/services/cache').closeDb();const tm=require('../../src/core/translationMemory');if(tm.db)tm.db.close();fs.rmSync(base,{recursive:true,force:true});
});
