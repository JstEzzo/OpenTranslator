'use strict';
const fs = require('fs');const path = require('path');const assert = require('assert');const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..');fs.mkdirSync(path.join(root,'scratch'),{recursive:true});
const temp=fs.mkdtempSync(path.join(root,'scratch','cleanup-test-'));const fixture=path.join(temp,'source');const output=path.join(temp,'archive');
const python=require('../../src/utils/pythonResolver').resolvePythonBinary();let pass=0;
function write(file,data){const target=path.join(fixture,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
try{
 write('archives/old.js','HISTORY');write('data/sessions/personal.json','KEEP SESSION');write('data/cache.db','KEEP DATABASE');write('src/current.js','CURRENT');
 const code=`import runpy,sys;from pathlib import Path;ns=runpy.run_path(${JSON.stringify(path.join(root,'tools/maintenance/project_cleanup.py'))});ns['main'].__globals__['ROOT']=Path(${JSON.stringify(fixture)}).resolve();sys.argv=['cleanup','--apply','--output',${JSON.stringify(output)}];ns['main']()`;
 const result=spawnSync(python,['-X','utf8','-c',code],{encoding:'utf8',windowsHide:true});assert.strictEqual(result.status,0,result.stderr);
 assert(!fs.existsSync(path.join(fixture,'archives/old.js')));assert(fs.existsSync(path.join(output,'historico-retirado.zip')));pass++;
 assert.strictEqual(fs.readFileSync(path.join(fixture,'data/sessions/personal.json'),'utf8'),'KEEP SESSION');assert.strictEqual(fs.readFileSync(path.join(fixture,'data/cache.db'),'utf8'),'KEEP DATABASE');assert.strictEqual(fs.readFileSync(path.join(fixture,'src/current.js'),'utf8'),'CURRENT');pass++;
 const verify=`import zipfile;z=zipfile.ZipFile(${JSON.stringify(path.join(output,'historico-retirado.zip'))});assert z.read('archives/old.js')==b'HISTORY';assert z.testzip() is None`;
 assert.strictEqual(spawnSync(python,['-X','utf8','-c',verify],{encoding:'utf8',windowsHide:true}).status,0);pass++;
 console.log(`pass=${pass} fail=0`);
} catch(error){console.error(error);console.log('pass=0 fail=1');process.exitCode=1;}finally{fs.rmSync(temp,{recursive:true,force:true});}
