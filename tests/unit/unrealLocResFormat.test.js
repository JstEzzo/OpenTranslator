'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const P = require('../../src/engines/unreal/unrealLocResProvider');
const Adapter = require('../../src/engines/unreal/unrealAdapter');
const fixture = Buffer.from('0e147475674a03fc4a15909dc3377f1b035100000000000000020000000100000000000000000000000200000044332211020000004100efbeadde0000000088776655020000004200040302010100000002000000060000005374617274000100000005000000457869740001000000','hex');
fs.mkdirSync(path.resolve(__dirname, '../../scratch'), { recursive: true });
const temp = fs.mkdtempSync(path.resolve(__dirname, '../../scratch/locres-test-'));
let pass = 0, fail = 0;
async function test(name, fn) { try { await fn(); pass++; console.log('ok ' + name); } catch(e) { fail++; console.error('FAIL ' + name, e); } }
(async () => {
  await test('reads independently specified optimized v3 layout and source hashes', () => {
    const r = P.parseLocRes(fixture); assert.strictEqual(r.count,2); assert.strictEqual(r.namespaces[''].A.value,'Start');
    assert.strictEqual(r.namespaces[''].A.sourceHash,0xdeadbeef); assert.strictEqual(r.namespaces[''].B.keyHash,0x55667788);
  });
  await test('patch preserves complete namespace block, key hashes and reference counts', () => {
    const b = P.patchLocRes(fixture, s => s === 'Start' ? 'Iniciar' : 'Sair');
    assert(b.subarray(0,81).equals(fixture.subarray(0,81))); const r=P.parseLocRes(b);
    assert.strictEqual(r.version,3);assert.strictEqual(r.namespaces[''].B.value,'Sair');assert.strictEqual(r.stringTable[0].refCount,1);
  });
  await test('optimized writer preserves source and key hashes from parsed resources', () => {
    const original=P.parseLocRes(fixture);const b=P.buildLocRes(original.namespaces,{version:3});const r=P.parseLocRes(b);
    assert.strictEqual(r.namespaces[''].A.sourceHash,0xdeadbeef);assert.strictEqual(r.namespaces[''].B.keyHash,0x55667788);
    assert.throws(()=>P.buildLocRes({UI:{A:{value:'Teste',sourceHash:1}}},{version:3}),/Hash original/);
  });
  await test('no-change rewrite of v3 is byte-identical' , () => assert(P.patchLocRes(fixture, s=>s).equals(fixture)));
  await test('compact v1 writer uses official signature and supports accents and placeholders', () => {
    const b = P.buildLocRes({UI:{Title:{value:'Opções {0}',sourceHash:123}}});
    assert.strictEqual(b.subarray(0,16).toString('hex'),'0e147475674a03fc4a15909dc3377f1b'); assert.strictEqual(b[16],1);
    const r = P.parseLocRes(b);assert.strictEqual(r.namespaces.UI.Title.value,'Opções {0}');assert.strictEqual(r.namespaces.UI.Title.sourceHash,123);
  });
  await test('truncated and impossible LUT indices are rejected', () => {
    assert.throws(()=>P.parseLocRes(fixture.subarray(0,60)));
    const b=Buffer.from(fixture);b.writeInt32LE(900,59);assert.throws(()=>P.parseLocRes(b));
  });
  await test('packed-only Unreal game is not reported as nothing to translate', async () => {
    const dir=path.join(temp,'packed');fs.mkdirSync(path.join(dir,'Content','Paks'),{recursive:true});fs.writeFileSync(path.join(dir,'Content','Paks','game.pak'),'fixture');
    const r=await new Adapter().extract(dir);assert.strictEqual(r.success,false);assert.strictEqual(r.code,'UNREAL_PAK_REQUIRES_EXTRACTION');
  });
  await test('extract discovers Content/Localization and IDs differ across cultures', async () => {
    const dir=path.join(temp,'loose');
    for(const culture of ['en','pt-BR']){const dest=path.join(dir,'Content','Localization','Game',culture);fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'Game.locres'),fixture);}
    const r=await new Adapter().extract(dir);assert.strictEqual(r.success,true);assert.strictEqual(r.count,4);assert.strictEqual(new Set(r.texts.map(t=>t.id)).size,4);
  });
  await test('adapter translates empty namespaces and preserves source hashes', async () => {
    const dir=path.join(temp,'apply-empty'),dest=path.join(dir,'Content','Localization','Game','pt-BR');fs.mkdirSync(dest,{recursive:true});const file=path.join(dest,'Game.locres');fs.writeFileSync(file,fixture);
    const adapter=new Adapter(),extracted=await adapter.extract(dir),text=extracted.texts.find(t=>t.key==='A');const result=await adapter.apply(dir,[text],new Map([[text.id,'Iniciar']]));assert.strictEqual(result.success,true);assert.strictEqual(result.count,1);const actual=P.parseLocRes(fs.readFileSync(file));assert.strictEqual(actual.namespaces[''].A.value,'Iniciar');assert.strictEqual(actual.namespaces[''].A.sourceHash,0xdeadbeef);assert.strictEqual(actual.namespaces[''].B.sourceHash,0x01020304);
  });
  await test('invalid binary resource is a declared extraction failure, not regex text', async () => {
    const dir=path.join(temp,'invalid','Content','Localization');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'Bad.locres'),'This is not a compiled localization resource');
    const r=await new Adapter().extract(path.join(temp,'invalid'));assert.strictEqual(r.success,false);assert.strictEqual(r.count,0);
  });
})().finally(()=>{fs.rmSync(temp,{recursive:true,force:true});console.log(`pass=${pass} fail=${fail}`);process.exitCode=fail?1:0;});
