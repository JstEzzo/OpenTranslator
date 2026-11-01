'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opent-adapter-review-'));
global.ROOT = path.resolve(__dirname, '../..');
global.DATA_DIR = path.join(root, 'data');
global.log = () => {};
const Electron = require('../../src/engines/electron/electronAdapter');
const Defold = require('../../src/engines/defold/defoldAdapter');
const Cocos = require('../../src/engines/cocos/cocosCreatorAdapter');
const Repack = require('../../src/engines/electron/asarRepacker');
const Asar = require('../../src/engines/electron/asarUtil');
function write(relative, value) { const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));return file; }
async function main() {
 let passed=0;
 try {
  const app=path.join(root,'electron');
  const file=write('electron/resources/app/lang.json',{'menu.play':'Play game',other:'Play game'});
  const adapter=new Electron();
  const extracted=await adapter.extract(app);
  assert.strictEqual(extracted.success,true);assert.strictEqual(extracted.texts.length,2);passed++;
  const translations=new Map(extracted.texts.map(t=>[t.id,'Iniciar jogo']));
  const applied=await adapter.apply(app,extracted.texts,translations);
  assert.strictEqual(applied.success,true);assert.strictEqual(JSON.parse(fs.readFileSync(file)).other,'Iniciar jogo');assert.strictEqual(JSON.parse(fs.readFileSync(file))['menu.play'],'Iniciar jogo');passed++;
  fs.writeFileSync(file,'{broken');const malformed=await adapter.extract(app);assert.strictEqual(malformed.success,false);assert(malformed.failures.length);passed++;
  const packed=path.join(root,'packed');fs.mkdirSync(path.join(packed,'resources'),{recursive:true});
  const input=path.join(root,'pack-input');write('pack-input/locale.json',{title:'Start game'});
  const archive=path.join(packed,'resources','app.asar');assert(Repack.pack(input,archive).success);
  const packedTexts=await adapter.extract(packed);assert.strictEqual(packedTexts.success,true,JSON.stringify(packedTexts));assert.strictEqual(packedTexts.count,1);passed++;
  const result=await adapter.apply(packed,packedTexts.texts,new Map([[packedTexts.texts[0].id,'Iniciar jogo']]));assert.strictEqual(result.success,true,JSON.stringify(result));
  const verify=path.join(root,'verify');Asar.extractAll(archive,verify);assert.strictEqual(JSON.parse(fs.readFileSync(path.join(verify,'locale.json'))).title,'Iniciar jogo');passed++;
  for (const [name,Adapter,prefixes] of [['defold',Defold,['a','b']],['cocos',Cocos,['resources/i18n','assets/resources/i18n']]]) {
   for(const prefix of prefixes)write(`${name}/${prefix}/lang.json`,{title:'Play game'});
   const extracted=await new Adapter().extract(path.join(root,name));assert.strictEqual(extracted.count,2);assert.strictEqual(new Set(extracted.texts.map(t=>t.id)).size,2);passed++;
  }
  const invalid=path.join(root,'invalid.asar');const malformedHeader=Buffer.alloc(16);malformedHeader.writeUInt32LE(4,0);malformedHeader.writeUInt32LE(0xfffffffc,4);fs.writeFileSync(invalid,malformedHeader);
  assert.throws(()=>Asar.readHeader(invalid),/cabeçalho/);passed++;
  function fixture(entries,payload='') {
   const json=Buffer.from(JSON.stringify({files:entries}));const aligned=(json.length+3)&~3;const data=Buffer.alloc(16+aligned+Buffer.byteLength(payload));
   data.writeUInt32LE(4,0);data.writeUInt32LE(aligned+8,4);data.writeUInt32LE(aligned+4,8);data.writeUInt32LE(json.length,12);json.copy(data,16);data.write(payload,16+aligned);fs.writeFileSync(invalid,data);
  }
  fixture({'../outside.json':{offset:'0',size:2}},'{}');assert.throws(()=>Asar.extractAll(invalid,path.join(root,'bad')),/nome/);passed++;
  fixture({'locale.json':{offset:'1000',size:2}},'{}');assert.throws(()=>Asar.extractAll(invalid,path.join(root,'bad')),/limites/);passed++;
  fixture({'external.json':{unpacked:true,size:2}});assert.throws(()=>Asar.extractAll(invalid,path.join(root,'bad')),/perfil específico/);passed++;
  console.log(`pass=${passed} fail=0`);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);console.log('pass=0 fail=1');process.exitCode=1;});
