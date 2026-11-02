const fs=require('fs'),path=require('path'),assert=require('assert');const Injector=require('../../src/engines/renpy/injector/renpyInjector');
const temp=fs.mkdtempSync(path.join(require('os').tmpdir(),'opent-renpy-labels-'));
(async()=>{fs.mkdirSync(path.join(temp,'game'));const r=await new Injector().inject(temp,[{original:'Yes',translated:'Sim, sim.',type:'menu_choice'},{original:'Load',translated:'Carregar Carregar Carregar',type:'interface_string'},{original:'Save',translated:'Salvar Salvar',type:'interface_string'},{original:'Yes, yes!',translated:'Sim, sim!',type:'dialogue'}]);
assert(r.success);const strings=fs.readFileSync(path.join(r.tlDir,'strings.rpy'),'utf8');const dialogue=fs.readFileSync(path.join(r.tlDir,'dialogues.rpy'),'utf8');
assert.match(strings,/old "Yes"\s+new "Sim"/);assert.match(strings,/old "Load"\s+new "Carregar"/);assert.match(strings,/old "Save"\s+new "Salvar"/);assert.match(dialogue,/old "Yes, yes!"\s+new "Sim, sim!"/);assert(!strings.includes('Carregar Carregar'));console.log('pass=5 fail=0');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
