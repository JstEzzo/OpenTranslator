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
function parse(source,file) {
 const ast=acorn.parse(source,{ecmaVersion:'latest',allowHashBang:true});
 const rows=[],occurrences=new Map(),seenUi=new Set();
 walk(ast,module=>{
  if(module.type!=='Property'||module.computed)return;
  const name=module.key.name||module.key.value;
  const fn=module.value?.type==='ArrayExpression'?module.value.elements[0]:null;
  if(typeof name!=='string'||fn?.type!=='FunctionExpression')return;
  const maps = new Set(fn.body.body.flatMap(statement =>
   statement.type === 'VariableDeclaration' ? statement.declarations
    .filter(declaration => declaration.id.type === 'Identifier' &&
     declaration.init?.type === 'NewExpression' && declaration.init.callee.type === 'Identifier' &&
     declaration.init.callee.name === 'Map')
    .map(declaration => declaration.id.name) : []));
  let uiOrdinal=0;
  function addUi(literal) {
   if(literal?.type!=='Literal'||typeof literal.value!=='string'||seenUi.has(literal.start))return;
   seenUi.add(literal.start);const ordinal=uiOrdinal++;
   if(!literal.value.trim()||!/[\p{L}]/u.test(literal.value))return;
   rows.push({id:'ui:'+file+':'+name+':'+ordinal,file,module:name,entry:ordinal,original:literal.value,clean:literal.value,
    format:'cocos_compiled_localization',sourceKind:'script-label',sourceLanguage:/[\u3400-\u9fff]/.test(literal.value)&&!/[\u3040-\u30ff]/.test(literal.value)?'zh':'auto',
    ranges:{english:{start:literal.start,end:literal.end,original:literal.value}},engine:'cocos_creator',tokens:[]});
  }
  function displayParts(node) {
   if(!node)return;
   if(node.type==='Literal')addUi(node);
   else if(node.type==='BinaryExpression'&&node.operator==='+'){displayParts(node.left);displayParts(node.right);}
   else if(node.type==='ConditionalExpression'){displayParts(node.consequent);displayParts(node.alternate);}
  }
  walk(fn.body,node=>{
   if(node.type==='AssignmentExpression'&&node.operator==='='&&node.left.type==='MemberExpression'&&
     (node.left.property.name||node.left.property.value)==='string')displayParts(node.right);
   if(node.type!=='CallExpression')return;
   const callee=node.callee.type==='MemberExpression'?(node.callee.property.name||node.callee.property.value):node.callee.name;
   if(['showConfirm','showToast','showTips','showMessage','showNotice','alert','confirm'].includes(callee))addUi(node.arguments[0]);
   if(node.callee.type!=='MemberExpression'||node.callee.computed||node.callee.property.name!=='set'||
      node.callee.object.type!=='Identifier'||!maps.has(node.callee.object.name)||node.arguments.length!==2)return;
   const [key,object]=node.arguments;
   const validKey = key.type === 'Literal' && (typeof key.value === 'number' ||
    (typeof key.value === 'string' && key.value.trim()));
   if(!validKey||object.type!=='ObjectExpression')return;
   const props=new Map(object.properties.filter(p=>p.type==='Property'&&!p.computed).map(p=>[p.key.name||p.key.value,p.value]));
   const id=props.get('id'),english=props.get('english');
   if(id?.type!=='Literal'||id.value!==key.value||english?.type!=='Literal'||typeof english.value!=='string'||!english.value.trim())return;
   const ranges={};for(const field of LANGUAGE_FIELDS){const value=props.get(field);if(value?.type==='Literal'&&typeof value.value==='string')ranges[field]={start:value.start,end:value.end,original:value.value};}
   // Require a multilingual record, independent of the bundle and module names.
   if(!ranges.str||(!ranges.traditional&&!ranges.japanese))return;
   const base='compiled:'+file+':'+name+':'+JSON.stringify(key.value),occurrence=occurrences.get(base)||0;occurrences.set(base,occurrence+1);
   rows.push({id:base+':'+occurrence,file,module:name,entry:key.value,original:english.value,clean:english.value,
    format:'cocos_compiled_localization',sourceKind:'language-map',ranges,engine:'cocos_creator',tokens:english.value.includes('@')?[{raw:'@',token:'⟦OT_COCOS_PAGE_0⟧',type:'COCOS_PAGE'}]:[]});
  });
 });
 const identities=new Set();for(const row of rows){if(identities.has(row.id))throw Error('Duplicate compiled localization ID: '+row.id);identities.add(row.id);}
 return rows.sort((a,b)=>a.ranges.english.start-b.ranges.english.start);
}
function roots(root){return[root,path.join(root,'resources','app','game'),path.join(root,'game')];}
function extract(root) {
 const rows = [];
 for (const base of roots(root)) {
  const assets = path.join(base, 'assets');
  if (!fs.existsSync(assets)) continue;
  for (const bundle of fs.readdirSync(assets, { withFileTypes: true })) {
   if (!bundle.isDirectory() || bundle.name.startsWith('.')) continue;
   const directory = path.join(assets, bundle.name);
   for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^index(?:\.[\w-]+)?\.js$/.test(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const relative = path.relative(root, file).replace(/\\/g, '/');
    rows.push(...parse(fs.readFileSync(file, 'utf8'), relative));
   }
  }
 }
 return rows.length?{success:true,texts:rows,count:rows.length,universeComplete:false,coverageScope:'Explicit compiled Cocos localization maps; image text and other scripts excluded'}:null;
}
function validPlaceholders(row,tr){
 const bracketed = /^\[([^\[\]\r\n]+)\]$/;
 const label = row.sourceKind === 'language-map' && row.original.match(bracketed);
 const translatedLabel = tr.match(bracketed);
 // A complete multiword label can use brackets as decoration. Single-token
 // placeholders and directives such as [color=red] remain protected.
 if(label && translatedLabel && /\S\s+\S/.test(label[1]) && !label[1].includes('=')) {
  return Placeholders.validate(label[1], translatedLabel[1]).valid;
 }
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
