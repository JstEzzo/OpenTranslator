'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const acorn=require('../../../resources/javascript/acorn.cjs');
const Quality=require('../../core/translationQuality'),Placeholders=require('../../core/placeholderIntegrityValidator');
const TYPES=new Set(['cc.Label','cc.RichText']);const FIELDS=new Set(['_string','_N$string']);const cache=new Map();
function bases(root){return[root,path.join(root,'resources/app/game'),path.join(root,'game')];}
function codec(base){const file=path.join(base,'index.html');if(!fs.existsSync(file))return null;const source=fs.readFileSync(file,'utf8');const match=source.match(/register_decripted_downloader\s*\(([^)]*)\)/);if(!match)return null;const expression=acorn.parseExpressionAt('f('+match[1]+')',0,{ecmaVersion:'latest'});const [signature,key]=expression.arguments;if(signature?.type!=='Literal'||key?.type!=='Literal'||typeof signature.value!=='string'||typeof key.value!=='string'||!signature.value||!key.value)throw Error('Unsupported Cocos asset encoding configuration');if([...signature.value+key.value].some(c=>c.charCodeAt(0)>255))throw Error('Unsupported Cocos encoding alphabet');return{signature:signature.value,key:key.value};}
function decode(raw,encoding){if(!encoding||!raw.subarray(0,encoding.signature.length).equals(Buffer.from(encoding.signature,'latin1')))return{data:JSON.parse(raw.toString('utf8')),encoded:false};const prefix=Buffer.from(encoding.signature,'latin1'),key=Buffer.from(encoding.key,'latin1'),out=Buffer.from(raw.subarray(prefix.length));for(let i=0;i<out.length;i++)out[i]^=key[i%key.length];return{data:JSON.parse(out.toString('utf8')),encoded:true};}
function encode(data,encoding,encoded){const raw=Buffer.from(JSON.stringify(data),'utf8');if(!encoded)return raw;const key=Buffer.from(encoding.key,'latin1');for(let i=0;i<raw.length;i++)raw[i]^=key[i%key.length];return Buffer.concat([Buffer.from(encoding.signature,'latin1'),raw]);}
function entries(data,file,encoding,encoded){const rows=[],seen=new Set();function add(value,keys,type){if(typeof value!=='string'||!value.trim()||!/[\p{L}]/u.test(value)||/^https?:/i.test(value))return;const id='label:'+file+':'+JSON.stringify(keys);if(seen.has(id))return;seen.add(id);rows.push({id,file,keys,original:value,clean:value,format:'cocos_serialized_label',sourceLanguage:/[\u3400-\u9fff]/.test(value)&&!/[\u3040-\u30ff]/.test(value)?'zh':'auto',labelType:type,encoding,encoded,tokens:[]});}

 // Cutscene scripts are JsonAssets, not cc.Label components. Recognize the
 // explicit cgList/chips/words schema; never translate animation identifiers.
 function cutscenes(value,keys){
  if(!value||typeof value!=='object')return;
  if(!Array.isArray(value)&&Array.isArray(value.cgList)){
   value.cgList.forEach((cg,ci)=>{if(!Array.isArray(cg?.chips))return;
    cg.chips.forEach((chip,hi)=>{if(!Array.isArray(chip?.words))return;
     chip.words.forEach((word,wi)=>{if(!Array.isArray(word?.str))return;
      const slots=word.str;if(slots.length!==4||!slots.every(x=>typeof x==='string'))return;
      const preferred=/[\p{L}]/u.test(slots[2])?2:0;
      const at=keys.concat('cgList',ci,'chips',hi,'words',wi,'str');
      const previous=rows.length;add(slots[preferred],at.concat(preferred),'cutscene-dialogue');
      if(rows.length>previous){const row=rows[rows.length-1];row.id='cutscene:'+file+':'+JSON.stringify(at);row.sourceLanguage=preferred===2?'en':'zh';row.languageSlots=slots.map((original,index)=>({keys:at.concat(index),original}));}
     });
    });
   });
  }
  for(const [key,child]of Object.entries(value))if(child&&typeof child==='object')cutscenes(child,keys.concat(Array.isArray(value)?Number(key):key));
 }
 cutscenes(data,[]);
 function plain(value,keys){if(!value||typeof value!=='object')return;if(!Array.isArray(value)&&TYPES.has(value.__type__)){for(const field of FIELDS)if(typeof value[field]==='string')add(value[field],keys.concat(field),value.__type__);}for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')plain(child,keys.concat(Array.isArray(value)?Number(key):key));}
 if(!Array.isArray(data)||!Number.isInteger(data[0])||!Array.isArray(data[3])||!Array.isArray(data[4])){plain(data,[]);return rows;}
 const classes=data[3],masks=data[4];function visit(value,keys){if(!Array.isArray(value))return;const mask=Number.isInteger(value[0])?masks[value[0]]:null,clazz=Array.isArray(mask)?classes[mask[0]]:null;if(Array.isArray(clazz)&&TYPES.has(clazz[0])&&Array.isArray(clazz[1])){const limit=mask[mask.length-1];for(let i=1;i<value.length&&i<limit;i++){const field=clazz[1][mask[i]];if(FIELDS.has(field))add(value[i],keys.concat(i),clazz[0]);}}
 for(let i=0;i<value.length;i++)if(Array.isArray(value[i]))visit(value[i],keys.concat(i));}
 if(data.length===6&&Array.isArray(data[5]))data[5].forEach((section,i)=>{if(Array.isArray(section)&&Array.isArray(section[0]))visit(section[0],[5,i,0]);});else if(data.length>=11&&Array.isArray(data[5]))visit(data[5],[5]);return rows;
}
function extract(root){const texts=[],warnings=[];let scanned=0;for(const base of bases(root)){const assets=path.join(base,'assets');if(!fs.existsSync(assets))continue;const encoding=codec(base);const walk=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()&&!item.name.startsWith('.')&&item.name!=='native')walk(file);else if(item.isFile()&&item.name.endsWith('.json')&&file.split(path.sep).includes('import')){scanned++;const relative=path.relative(root,file).replace(/\\/g,'/'),stat=fs.statSync(file),stamp=stat.mtimeMs+':'+stat.size;let entry=cache.get(file);if(!entry||entry.stamp!==stamp){try{const raw=fs.readFileSync(file),decoded=decode(raw,encoding);entry={stamp,rows:entries(decoded.data,relative,encoding,decoded.encoded)};cache.set(file,entry);}catch(error){warnings.push({file:relative,error:error.message});continue;}}texts.push(...entry.rows);}}};walk(assets);}return{texts,count:texts.length,scanned,warnings};}
function get(data,keys){for(const key of keys)data=data[key];return data;}
function prepare(root,texts,translations){const files=new Map();let count=0;for(const row of texts){const translated=translations.get(row.id);if(typeof translated!=='string'||!translated.trim()||translated===row.original&&!row.languageSlots?.some(slot=>slot.original!==translated))continue;if(!Quality.inspect(row.original,translated).valid||!Placeholders.validate(row.original,translated).valid)throw Error('Cocos label translation failed quality checks');const target=path.resolve(root,row.file),relative=path.relative(path.resolve(root),target);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Cocos label path escapes game');if(!files.has(target)){const source=fs.readFileSync(target),decoded=decode(source,row.encoding);if(decoded.encoded!==row.encoded)throw Error('Cocos label encoding changed');files.set(target,{target,file:row.file,source,data:decoded.data,encoding:row.encoding,encoded:row.encoded,changes:[]});}const file=files.get(target);if(get(file.data,row.keys)!==row.original)throw Error('Cocos label source changed');for(const slot of row.languageSlots||[{keys:row.keys,original:row.original}]){if(get(file.data,slot.keys)!==slot.original)throw Error('Cocos dialogue language source changed');file.changes.push({keys:slot.keys,translated});}count++;}
 const updates=[];for(const file of files.values()){const expected=JSON.parse(JSON.stringify(file.data));for(const change of file.changes){const parent=get(expected,change.keys.slice(0,-1));parent[change.keys.at(-1)]=change.translated;}const output=encode(expected,file.encoding,file.encoded),decoded=decode(output,file.encoding);if(JSON.stringify(decoded.data)!==JSON.stringify(expected))throw Error('Cocos label round-trip mismatch');updates.push({...file,output,sha256:crypto.createHash('sha256').update(output).digest('hex')});}return{updates,count};}
function commit(plan){for(const file of plan.updates){const before=Buffer.isBuffer(file.source)?file.source:Buffer.from(file.source,'utf8');if(!fs.readFileSync(file.target).equals(before))throw Error('Cocos source changed after backup');const temporary=file.target+'.opent-'+process.pid+'.tmp';fs.writeFileSync(temporary,file.output);fs.renameSync(temporary,file.target);}return{success:true,count:plan.count,modifiedFiles:plan.updates.map(f=>f.target),fileHashes:Object.fromEntries(plan.updates.map(f=>[f.file,f.sha256]))};}
module.exports={extract,prepare,commit,entries,decode,encode,codec};
