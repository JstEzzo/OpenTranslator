"use strict";
const fs = require('fs'), path = require('path'), crypto = require('crypto');
function dataDirectory(root) {
  for (const dir of [path.join(root,'www','data'),path.join(root,'data')]) {
    if (fs.existsSync(path.join(dir,'System.json'))) return dir;
  }
  return null;
}
const normalize = value => String(value).replace(/\s+/gu,' ').trim();
function get(object, keys) { for (const key of keys) object = object[key]; return object; }
function extract(root) {
  const dir = dataDirectory(root);
  if (!dir) return null;
  const texts = []; let preservedNames = 0;
  for (const file of fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,''));
    const stem = path.basename(file,'.json');
    function add(value, keys, kind, extra={}) {
      if (typeof value !== 'string' || !value.trim()) return;
      texts.push({id:file+':'+kind+':'+JSON.stringify(keys),file,keys,original:value,clean:kind==='messageBlock'?normalize(value):value,
        nativeKind:kind,escapeParts:[],...extra});
    }
    function walk(node, keys) {
      if (Array.isArray(node) && node.some(item=>item && Number.isInteger(item.code) && Array.isArray(item.parameters))) {
        for (let index=0;index<node.length;index++) {
          const command=node[index]; if (!command || !Array.isArray(command.parameters)) continue;
          if (command.code===401 && typeof command.parameters[0]==='string') {
            const start=index, lines=[];
            while(index<node.length && node[index]?.code===401 && typeof node[index].parameters?.[0]==='string') {
              lines.push(node[index].parameters[0]); index++;
            }
            index--;
            add(lines.join('\n'),keys.concat(start),'messageBlock',{listKeys:keys,blockStart:start,sourceLines:lines});
          } else if (command.code===102 && Array.isArray(command.parameters[0])) {
            command.parameters[0].forEach((value,i)=>add(value,keys.concat(index,'parameters',0,i),'field'));
          } else if ([320,324].includes(command.code)) add(command.parameters[1],keys.concat(index,'parameters',1),'field');
          else if(command.code===101) add(command.parameters[4],keys.concat(index,'parameters',4),'field');
          else if(command.code===405) add(command.parameters[0],keys.concat(index,'parameters',0),'field');
        }
        return;
      }
      if (node && typeof node==='object') { for(const [key,value] of Object.entries(node)) walk(value,keys.concat(Array.isArray(node)?Number(key):key)); return; }
      if (typeof node!=='string' || !node.trim()) return;
      let allowed=false;
      if(stem==='System') allowed=['terms','currencyUnit','gameTitle','armorTypes','weaponTypes','skillTypes','elements','equipTypes'].includes(keys[0]);
      else if(/^Map\d+$/i.test(stem)) allowed=keys.length===1 && keys[0]==='displayName';
      else if(['Actors','Classes','Skills','Items','Weapons','Armors','Enemies','States'].includes(stem)) {
        allowed=keys.length===2 && ['name','nickname','description','profile','message1','message2','message3','message4'].includes(keys[1]);
        if(stem==='Actors' && ['name','nickname'].includes(keys[1])) {preservedNames++;return;}
      }
      if(allowed) add(node,keys,'field');
    }
    walk(data,[]);
  }
  return {texts,count:texts.length,preservedNames,dataDir:dir,coverageScope:'Structured database text and complete message blocks; plugin scripts, dynamic text and images require separate verification'};
}
function divide(text,count) {
  const result=[]; let remaining=String(text);
  for(let i=0;i<count-1;i++) {
    const desired=Math.ceil(remaining.length/(count-i));
    const boundaries=[...remaining.matchAll(/\s+/gu)].map(match=>match.index).filter(index=>index>0);
    if(!boundaries.length) {result.push(remaining);remaining='';continue;}
    const nearest=boundaries.reduce((best,current)=>Math.abs(current-desired)<Math.abs(best-desired)?current:best,boundaries[0]);
    result.push(remaining.slice(0,nearest).trim());remaining=remaining.slice(nearest).trim();
  }
  result.push(remaining);return result;
}
function apply(root,texts,translations) {
  const dir=dataDirectory(root); if(!dir) throw new Error('RPG Maker data directory not found');
  const files=new Map();let count=0;
  for(const text of texts) {
    const translated=translations.get(text.id);
    if(typeof translated!=='string' || !translated.trim() || translated===text.clean) continue;
    if(path.basename(text.file)!==text.file) throw new Error('Unexpected native database path');
    if(!files.has(text.file)) files.set(text.file,JSON.parse(fs.readFileSync(path.join(dir,text.file),'utf8').replace(/^\uFEFF/,'')));
    const data=files.get(text.file);
    if(text.nativeKind==='messageBlock') {
      const list=get(data,text.listKeys);
      for(let i=0;i<text.sourceLines.length;i++) {
        if(list[text.blockStart+i]?.code!==401 || list[text.blockStart+i].parameters[0]!==text.sourceLines[i]) throw new Error('Message source changed before application');
      }
      const lines=divide(translated,text.sourceLines.length);
      lines.forEach((line,i)=>{list[text.blockStart+i].parameters[0]=line;});
    } else {
      const parent=get(data,text.keys.slice(0,-1)),key=text.keys[text.keys.length-1];
      if(parent[key]!==text.original) throw new Error('Database source changed before application');
      parent[key]=translated;
    }
    count++;
  }
  const modifiedFiles=[],fileHashes={};
  for(const [file,data] of files) {
    const target=path.join(dir,file),temporary=target+'.opent-'+process.pid+'.tmp';
    const bytes=Buffer.from(JSON.stringify(data));
    fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,target);
    modifiedFiles.push(target);fileHashes[path.relative(root,target)]=crypto.createHash('sha256').update(bytes).digest('hex');
  }
  return {count,modifiedFiles,fileHashes};
}
module.exports={extract,apply,dataDirectory,normalize,divide};
