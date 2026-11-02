'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const planner=require('../../src/translation/googleBatchPlanner'),Plugin=require('../../src/engines/rpgmaker/pluginTextData');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'opent-plugin-'));let pass=0;
try{
 const entries=Array.from({length:100},(_,i)=>['日'.repeat(95)+i,[{id:i}]]);const plan=planner.plan(entries);assert(plan.batches.length<10);assert.equal(plan.batches.flat().length,100);for(const b of plan.batches){const body=b.map(x=>x[0]).join(planner.SEPARATOR);assert([...body].length<=3000);assert(Buffer.byteLength(body)<=12000);assert(b.length<=32);}pass++;
 const long='a'.repeat(3001),overflow=planner.plan([[long,[{id:'long'}]],['short',[{id:'short'}]]]);assert.equal(overflow.oversized[0][0],long);assert.equal(overflow.batches.flat()[0][0],'short');pass++;
 fs.mkdirSync(path.join(root,'js'));const command={name:'Recollection',mapId:'35',switchId:'0',script:'DoNotTranslate()'};const plugins=[{name:'AnotherNewGame',status:true,parameters:{anotherDataList:JSON.stringify([JSON.stringify(command)]),manageNumber:'1'}},{name:'UnknownPlugin',status:true,parameters:{name:'TechnicalName'}}];const file=path.join(root,'js/plugins.js');fs.writeFileSync(file,'var $plugins = '+JSON.stringify(plugins)+';');const rows=Plugin.extract(root);assert.equal(rows.length,1);assert.equal(rows[0].original,'Recollection');pass++;
 const prepared=Plugin.prepare(root,rows,new Map([[rows[0].id,'Recordações']]));assert.equal(fs.readFileSync(file,'utf8').includes('Recordações'),false);Plugin.commit(prepared);const read=Plugin.extract(root);assert.equal(read[0].original,'Recordações');const after=fs.readFileSync(file,'utf8');assert(after.includes('DoNotTranslate()'));assert(after.includes('TechnicalName'));assert(after.includes('35'));assert.throws(()=>Plugin.prepare(root,rows,new Map([[rows[0].id,'Outro']])));pass++;
 console.log(`pass=${pass} fail=0`);
}finally{fs.rmSync(root,{recursive:true,force:true});}
