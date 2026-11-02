'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm');
const native=require('../../src/engines/rpgmaker/nativeTextData'),wrap=require('../../src/engines/rpgmaker/installTextWrap');
const QA=require('../../src/core/qaEngine');
assert.notEqual(QA.validate('\\{Hello','\\{Olá').qaStatus,'fail');
assert.equal(QA.validate('Hello','{Olá').qaStatus,'fail');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'opent-message-'));let pass=0;
try{
 fs.mkdirSync(path.join(root,'data'));fs.mkdirSync(path.join(root,'js'));
 fs.writeFileSync(path.join(root,'data/System.json'),JSON.stringify({gameTitle:'Title',terms:{yes:'Yes'},partyMembers:[1]}));
 const commands=[{code:101,indent:0,parameters:['',0,0,2,'Speaker']},{code:401,indent:0,parameters:['The citizens of Japan are aging and their birth rate is']},{code:401,indent:0,parameters:['declining. The population has fallen to two thirds.']},{code:355,indent:0,parameters:['console.log("Do not translate")']},{code:0,indent:0,parameters:[]}];
 const map={displayName:'Town',events:[null,{name:'TechnicalEvent',pages:[{list:commands}]}]};
 const target=path.join(root,'data/Map001.json');fs.writeFileSync(target,JSON.stringify(map));
 const extracted=native.extract(root),block=extracted.texts.find(x=>x.nativeKind==='messageBlock');
 assert(block.clean.includes('is declining.'));assert.equal(block.sourceLines.length,2);assert(!extracted.texts.some(x=>x.original.includes('console.log')||x.original==='TechnicalEvent'));pass++;
 const translation='Os cidadãos do Japão estão envelhecendo e sua taxa de natalidade está diminuindo. A população caiu para dois terços.';
 const result=native.apply(root,extracted.texts,new Map([[block.id,translation]]));assert.equal(result.count,1);
 const actual=JSON.parse(fs.readFileSync(target));const list=actual.events[1].pages[0].list;
 assert.deepStrictEqual(list.map(x=>[x.code,x.indent]),commands.map(x=>[x.code,x.indent]));assert.deepStrictEqual(list[3],commands[3]);assert.equal(native.normalize(list.slice(1,3).map(x=>x.parameters[0]).join(' ')),translation);pass++;
 const before=fs.readFileSync(target);assert.throws(()=>native.apply(root,[block],new Map([[block.id,'Outro texto']])));assert.deepStrictEqual(fs.readFileSync(target),before);pass++;
 fs.writeFileSync(path.join(root,'js/plugins.js'),'var $plugins = [{"name":"Existing","status":true,"parameters":{}}];');
 wrap.install(root);wrap.install(root);const index=fs.readFileSync(path.join(root,'js/plugins.js'),'utf8');assert.equal((index.match(/"name": "OpenTranslatorTextWrap"/g)||[]).length,1);assert(index.includes('Existing'));pass++;
 fs.writeFileSync(path.join(root,'js/plugins/OpenTranslatorTextWrap.js'),'foreign');assert.throws(()=>wrap.plan(root),/not owned/);pass++;
 const plugin=fs.readFileSync(path.resolve(__dirname,'../../resources/templates/OpenTranslatorTextWrap.js'),'utf8');
 for(const buffered of [false,true]){
  function Window_Message(){this.contents={width:100};this.drawn=[];this.pause=false;}
  Window_Message.prototype.textWidth=t=>t.length*10;
  Window_Message.prototype.flushTextState=function(s){if(s.buffer){for(const c of s.buffer){this.drawn.push([c,s.x]);s.x+=10;}s.buffer='';}};
  Window_Message.prototype.processNewLine=function(s){this.flushTextState(s);s.x=s.startX;};
  Window_Message.prototype.processCharacter=function(s){const c=s.text[s.index++];if(c==='\n'){this.processNewLine(s);return;}if(buffered)s.buffer+=c;else{this.drawn.push([c,s.x]);s.x+=10;}};
  vm.runInNewContext(plugin,{Window_Message});
  const win=new Window_Message(),s={text:'Small words and verylongwordhere',index:0,x:20,startX:20,buffer:buffered?'':undefined};
  while(s.index<s.text.length)win.processCharacter(s);win.flushTextState(s);
  assert.equal(win.drawn.map(x=>x[0]).join(''),s.text);assert(win.drawn.filter(x=>x[0]!==' ').every(x=>x[1]+10<=100));pass++;
  const page=new Window_Message();page.processNewLine=function(s){this.flushTextState(s);s.x=s.startX;this.pause=true;};
  const state={text:'Word',index:0,x:90,startX:20,buffer:buffered?'':undefined};page.processCharacter(state);assert.equal(state.index,0);assert(page.pause);page.pause=false;page.processCharacter(state);assert.equal(state.index,1);pass++;
 }
 console.log(`pass=${pass} fail=0`);
}finally{fs.rmSync(root,{recursive:true,force:true});}
