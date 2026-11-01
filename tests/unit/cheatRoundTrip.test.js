'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');const os=require('os');const vm=require('vm');const http=require('http');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'opent-cheat-loop-'));
global.ROOT=path.resolve(__dirname,'../..');global.DATA_DIR=directory;global.GL_DIR=path.join(directory,'library');global.CFG_PATH=path.join(directory,'config.json');global.log=()=>{};global.serverLogs=[];
const {startHookServer,stopHookServer}=require('../../src/services/cheatServer');
const {handlers}=require('../../src/services/rpcHandlers');
function post(port,state){return new Promise((resolve,reject)=>{const body=JSON.stringify(state);const req=http.request({host:'127.0.0.1',port,path:'/cheat_poll',method:'POST',headers:{'Content-Type':'application/json'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});});req.on('error',reject);req.end(body);});}
async function main(){let passed=0;let running=false;
 try{
 const hook=await startHookServer(0);running=true;const port=hook.server.address().port;
 const actor={hp:10,mhp:100,mp:5,mmp:50,name:()=> 'Hero',setHp(v){this.hp=v;},setMp(v){this.mp=v;}};
 let gold=25;const intervals=[];const requests=[];const timeouts=[];
 const context={console,document:{addEventListener(){}},setTimeout(fn){timeouts.push(fn);},setInterval(fn,ms){intervals.push({fn,ms});},SceneManager:{_scene:{constructor:{name:'Scene_Map'}},updateScene(){}},
 $dataSystem:{variables:['','Score'],switches:['','Door']},$dataItems:[],$dataWeapons:[],$dataArmors:[],
 $gameParty:{gold:()=>gold,gainGold(v){gold+=v;},members:()=>[actor],items:()=>[],weapons:()=>[],armors:()=>[]},$gamePlayer:{x:1,y:2,isThrough:()=>false},$gameSystem:{isEncounterEnabled:()=>true},$gameMap:{mapId:()=>1},
 $gameVariables:{_data:[null,1],setValue(id,v){this._data[id]=v;}},$gameSwitches:{_data:[null,false],setValue(id,v){this._data[id]=v;}},addEventListener(){}};
 context.window=context;
 context.XMLHttpRequest=class {open(){}setRequestHeader(){}send(body){requests.push(post(port,JSON.parse(body)).then(commands=>{this.status=200;this.responseText=JSON.stringify(commands);this.onload();}));}};
 vm.runInNewContext(fs.readFileSync(path.join(global.ROOT,'resources/templates/CheatOverlayTemplate.js'),'utf8'),context);
 await requests.at(-1);assert.strictEqual(handlers.getGameState().connected,true);assert.strictEqual(global.lastGameState.gold,25);passed++;
 const sent=handlers.sendCheatCommand({command:'$gameParty.gainGold(75); window.godHP=true; window.godMP=true; $gameVariables.setValue(1,99);'});assert.strictEqual(sent.delivery,'queued');
 timeouts.find(fn=>fn.name==='pollCheat')();await requests.at(-1);assert.strictEqual(gold,100);assert.strictEqual(context.$gameVariables._data[1],99);passed++;
 intervals.find(timer=>timer.ms===100).fn();assert.strictEqual(actor.hp,100);assert.strictEqual(actor.mp,50);passed++;
 timeouts.find(fn=>fn.name==='pollCheat')();await requests.at(-1);assert.strictEqual(handlers.getGameState().state.gold,100);assert.strictEqual(global.pendingCheatCommands.length,0);passed++;
 global.activeCheatSocket={readyState:1,send(){throw new Error('closed during send');}};global.pendingCheatCommands=Array.from({length:200},()=>({code:'x=1'}));
 const full=handlers.sendCheatCommand({code:'x=2'});assert.strictEqual(full.ok,false);assert.strictEqual(global.pendingCheatCommands.length,200);passed++;
 console.log(`pass=${passed} fail=0`);
 }finally{global.activeCheatSocket=null;if(running)await stopHookServer();require('../../src/services/cache').closeDb();const memory=require('../../src/core/translationMemory');if(memory.db?.open)memory.db.close();fs.rmSync(directory,{recursive:true,force:true});}}
main().catch(e=>{console.error(e);console.log('pass=0 fail=1');process.exitCode=1;});
