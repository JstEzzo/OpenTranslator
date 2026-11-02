'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'opent-memory-languages-'));
global.DATA_DIR=temp;
const instance=require('../../src/core/translationMemory');
const {TranslationMemory2}=instance;
let pass=0;
try {
 for(const mode of ['sqlite','fallback']) {
  const tm=new TranslationMemory2(path.join(temp,mode+'.sqlite'));
  if(mode==='sqlite') assert(tm.hasSqlite,'SQLite test requires the packaged native dependency');
  else {if(tm.db)tm.db.close();tm.db=null;tm.hasSqlite=false;}
  const en={langSource:'en',langTarget:'pt_BR'};
  tm.store('Gift','Presente',en);tm.store('Gift','Veneno',{langSource:'de',langTarget:'pt-BR'});
  tm.store('Gift','Cadeau',{langSource:'en',langTarget:'fr'});
  assert.strictEqual(tm.lookup('Gift',{...en,langTarget:'pt-br'}),'Presente');pass++;
  assert.strictEqual(tm.lookup('Gift',{langSource:'de',langTarget:'pt-br'}),'Veneno');pass++;
  assert.strictEqual(tm.lookup('Gift',{langSource:'en',langTarget:'fr'}),'Cadeau');pass++;
  assert.strictEqual(tm.lookup('Gift',{langSource:'ja',langTarget:'pt-br'}),null);pass++;
  tm.store('Open','Abrir',{...en,scope:'game',gameId:'one'});
  tm.store('Open','Aberto',{...en,scope:'game',gameId:'two'});
  assert.strictEqual(tm.lookup('Open',{...en,gameId:'one'}),'Abrir');
  assert.strictEqual(tm.lookup('Open',{...en,gameId:'two'}),'Aberto');
  assert.strictEqual(tm.lookup('Open',{...en,gameId:'other'}),null);pass++;
  tm.store('Save','Salvar',{...en,scope:'engine',engine:'renpy'});
  assert.strictEqual(tm.lookup('Save',{...en,engine:'unity'}),null);
  assert.strictEqual(tm.lookup('Save',{...en,engine:'renpy'}),'Salvar');pass++;
  if(tm.db)tm.db.close();
 }
 console.log(`pass=${pass} fail=0`);
} finally {if(instance.db)instance.db.close();fs.rmSync(temp,{recursive:true,force:true});}
