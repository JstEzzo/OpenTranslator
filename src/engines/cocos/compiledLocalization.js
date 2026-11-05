'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const acorn=require('../../../resources/javascript/acorn.cjs');
const Quality=require('../../core/translationQuality'),Placeholders=require('../../core/placeholderIntegrityValidator');
const LANGUAGE_FIELDS=['str','traditional','english','japanese'];
function walk(root,visit) {
 const stack=[root];
 while(stack.length) {
  const node=stack.pop();
  if(!node||typeof node!=='object')continue;
  if(typeof node.type==='string')visit(node);
  for(const value of Object.values(node)) {
   if(Array.isArray(value)) {
    for(const child of value)if(child&&typeof child==='object')stack.push(child);
   } else if(value&&typeof value==='object')stack.push(value);
  }
 }
}
function parse(source,file){const ast=acorn.parse(source,{ecmaVersion:'latest',allowHashBang:true});const rows=[],occurrences=new Map();walk(ast,node=>{
 if(node.type!=='Property'||node.computed||!/^G(?:language\d+|words_[A-Za-z0-9_]+)$/.test(node.key.name||node.key.value||''))return;
 const name=node.key.name||node.key.value,fn=node.value?.type==='ArrayExpression'?node.value.elements[0]:null;
 if(fn?.type!=='FunctionExpression')return;
 walk(fn.body,call=>{if(call.type!=='CallExpression'||call.callee.type!=='MemberExpression'||call.callee.computed||call.callee.property.name!=='set'||call.arguments.length!==2)return;
 const [key,object]=call.arguments;if(key.type!=='Literal'||typeof key.value!=='number'||object.type!=='ObjectExpression')return;
 const props=new Map(object.properties.filter(p=>p.type==='Property'&&!p.computed).map(p=>[p.key.name||p.key.value,p.value]));const id=props.get('id'),english=props.get('english');
 if(id?.type!=='Literal'||id.value!==key.value||english?.type!=='Literal'||typeof english.value!=='string'||!english.value.trim())return;
 const ranges={};for(const field of LANGUAGE_FIELDS){const p=props.get(field);if(p?.type==='Literal'&&typeof p.value==='string')ranges[field]={start:p.start,end:p.end,original:p.value};}
 if(!ranges.str)return;
 const base='compiled:'+file+':'+name+':'+key.value,occurrence=occurrences.get(base)||0;occurrences.set(base,occurrence+1);
 rows.push({id:base+':'+occurrence,file,module:name,entry:key.value,original:english.value,clean:english.value,format:'cocos_compiled_localization',ranges,engine:'cocos_creator',tokens:english.value.includes('@')?[{raw:'@',token:'⟦OT_COCOS_PAGE_0⟧',type:'COCOS_PAGE'}]:[]});
 });});
 const identities=new Set();for(const row of rows){if(identities.has(row.id))throw Error('Duplicate compiled localization ID: '+row.id+' at '+row.ranges.english.start);identities.add(row.id);}return rows.sort((a,b)=>a.ranges.english.start-b.ranges.english.start);
}
function roots(root){return[root,path.join(root,'resources','app','game'),path.join(root,'game')];}
function extract(root){const rows=[];for(const base of roots(root)){const dir=path.join(base,'assets','main');if(!fs.existsSync(dir))continue;for(const name of fs.readdirSync(dir).filter(n=>/^index(?:\.[\w-]+)?\.js$/.test(n))){const file=path.join(dir,name),relative=path.relative(root,file).replace(/\\/g,'/');rows.push(...parse(fs.readFileSync(file,'utf8'),relative));}}
 return rows.length?{success:true,texts:rows,count:rows.length,universeComplete:false,coverageScope:'Explicit compiled Cocos localization maps; image text and other scripts excluded'}:null;
}
function validPlaceholders(row,tr){
 if(row.module==='Glanguage1'&&/^\[[^\[\]\r\n]+\]$/.test(row.original)&&/^\[[^\[\]\r\n]+\]$/.test(tr))return Placeholders.validate(row.original.slice(1,-1),tr.slice(1,-1)).valid;
 return Placeholders.validate(row.original,tr).valid;
}
function prepare(root,texts,translations){const byFile=new Map();for(const row of texts){const tr=translations.get(row.id);if(tr===undefined||(tr===row.original&&Object.values(row.ranges).every(r=>r.original===tr)))continue;if(row.original.split('@').length!==tr.split('@').length||!Quality.inspect(row.original,tr).valid||!validPlaceholders(row,tr))throw Error('Compiled localization failed quality checks');if(!byFile.has(row.file))byFile.set(row.file,[]);byFile.get(row.file).push(row);}
 const updates=[];let count=0;
 for(const [file,rows] of byFile){const target=path.resolve(root,file);if(path.relative(path.resolve(root),target).startsWith('..')||path.isAbsolute(path.relative(path.resolve(root),target)))throw Error('Compiled localization path escapes game');const source=fs.readFileSync(target,'utf8');const actual=new Map(parse(source,file).map(t=>[t.id,t]));const replacements=[];
 for(const row of rows){const current=actual.get(row.id);if(!current||current.original!==row.original||JSON.stringify(current.ranges)!==JSON.stringify(row.ranges))throw Error('Compiled localization source changed');const tr=translations.get(row.id);for(const range of Object.values(current.ranges))replacements.push({start:range.start,end:range.end,text:JSON.stringify(tr)});count++;}
 let output=source;for(const r of replacements.sort((a,b)=>b.start-a.start))output=output.slice(0,r.start)+r.text+output.slice(r.end);
 const verified=new Map(parse(output,file).map(t=>[t.id,t]));if(verified.size!==actual.size)throw Error('Compiled localization inventory changed');for(const row of rows){const wanted=translations.get(row.id),after=verified.get(row.id);if(after.original!==wanted||Object.values(after.ranges).some(r=>r.original!==wanted))throw Error('Compiled localization activation mismatch');}
 updates.push({target,file,source,output,sha256:crypto.createHash('sha256').update(output).digest('hex')});
 }return{updates,count};
}
function commit(plan){for(const update of plan.updates){if(fs.readFileSync(update.target,'utf8')!==update.source)throw Error('Compiled localization source changed after backup');const temp=update.target+'.opent-'+process.pid+'.tmp';fs.writeFileSync(temp,update.output,'utf8');fs.renameSync(temp,update.target);}return{success:true,count:plan.count,modifiedFiles:plan.updates.map(u=>u.target),fileHashes:Object.fromEntries(plan.updates.map(u=>[u.file,u.sha256])),activation:'ALL_EXISTING_LANGUAGE_COLUMNS'};}
module.exports={extract,prepare,commit,parse};
