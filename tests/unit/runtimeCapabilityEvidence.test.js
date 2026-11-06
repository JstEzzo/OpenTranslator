'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const Probe=require('../../src/engines/unity/unityRuntimeCapabilityProbe');
const Unreal=require('../../src/engines/unreal/unrealAdapter');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'opent-evidence-'));let pass=0;
try{
 const mono=path.join(root,'mono');fs.mkdirSync(path.join(mono,'Game_Data','Managed'),{recursive:true});fs.writeFileSync(path.join(mono,'Game_Data','Managed','UnityEngine.UI.dll'),'fixture');
 const m=Probe.probe(mono);assert.equal(m.runtimeType,'MONO');assert.equal(m.frameworks.ugui,true);assert.equal(m.capabilities.runtimeHook,'UNVERIFIED');pass++;
 fs.writeFileSync(path.join(mono,'GameAssembly.dll'),'fixture');const i=Probe.probe(mono);assert.equal(i.runtimeType,'IL2CPP');assert.equal(i.capabilities.bridgeStatus,'NATIVE_COMPILED_BRIDGE_REQUIRED');pass++;
 const unreal=path.join(root,'unreal'),loc=path.join(unreal,'MyGame','Content','Localization','Game','en');fs.mkdirSync(loc,{recursive:true});fs.writeFileSync(path.join(loc,'Game.locres'),'fixture');const adapter=new Unreal;assert.equal(adapter.getCapabilities(unreal).nativeLocalization,true);pass++;
 fs.unlinkSync(path.join(loc,'Game.locres'));assert.equal(adapter.getCapabilities(unreal).nativeLocalization,false);assert.equal(adapter.getCapabilities(path.join(root,'absent')).nativeLocalization,false);pass++;
 console.log(`pass=${pass} fail=0`);
}finally{fs.rmSync(root,{recursive:true,force:true});}
