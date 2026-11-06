/**
 * OpenTranslator — GDevelopAdapter
 * Adaptador oficial para GDevelop 5.
 * Fornece dois extratores:
 * 1. GDevelopProjectExtractor: Para arquivos de projeto (game.json, cenas, eventos)
 * 2. GDevelopPackagedGameExtractor: Para jogos exportados (Electron, Web)
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const { rollbackResult } = require('../rollbackResult.js');
const { PartialReport } = require('../../core/partialApply');
// FASE 10 / D1 — o contrato de apply (filesToBackup + fileHashes).
const { startApplyContract } = require('../../core/applyContract');

class GDevelopAdapter extends BaseEngineAdapter {
  constructor() {
    super("gdevelop", "GDevelop");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "gdevelop" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_gdevelop_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "gdevelop",
      name: "GDevelop",
      versions: ["GDevelop 5.x"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasGameJson = fs.existsSync(path.join(gameDir, "game.json")) || fs.existsSync(path.join(gameDir, "data.json"));
    return {
      staticFiles: true,
      nativeLocalization: hasGameJson,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "GDevelop Project & Export Data Extractor"
    };
  }

  async extract(gameDir, options = {}) {
    const texts=[],acc=new PartialReport();
    for(const file of ['game.json','data.json']){
      const full=path.join(gameDir,file);if(!fs.existsSync(full))continue;
      try{
        const data=JSON.parse(fs.readFileSync(full,'utf8'));
        if(!data||(!Array.isArray(data.layouts)&&!Array.isArray(data.objects))){acc.skip(file,'No recognized GDevelop project');continue;}
        const objects=(list,keys,scene)=>{if(!Array.isArray(list))return;list.forEach((obj,index)=>{
          if(obj?.type!=='TextObject::Text')return;
          // Project versions store text either directly or in content.
          const at=typeof obj.text==='string'?keys.concat(index,'text'):typeof obj.content?.text==='string'?keys.concat(index,'content','text'):null;
          const value=typeof obj.text==='string'?obj.text:obj.content?.text;
          if(!at||!value.trim())return;
          const {protectedText,tokens}=this.codeProtector.protect(value,'gdevelop');
          texts.push({id:'gd_'+file+'_'+JSON.stringify(at),file,keySegments:at,scene,objectName:obj.name,original:value,clean:value,protectedText,tokens,engine:'gdevelop'});
        })};
        objects(data.objects,['objects'],'global');
        (data.layouts||[]).forEach((layout,index)=>objects(layout.objects,['layouts',index,'objects'],layout.name||'scene'));
        (data.externalLayouts||[]).forEach((layout,index)=>objects(layout.objects,['externalLayouts',index,'objects'],layout.name||'external'));
        acc.ok();
      }catch(error){acc.fail(file,error);}
    }
    return acc.report({texts,count:texts.length});
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const Json = require('../../core/structuredJsonTranslation');
    const plan = Json.prepare(gameDir, texts, translations, this.codeProtector);
    const ac = startApplyContract(gameDir, texts);
    if (!plan.updates.length) return ac.finish({success:true,count:0,modifiedFiles:[]});
    const backup = this.backupManager.createBackup(gameDir, plan.updates.map(u=>u.file), {engine:this.id,sessionId:options.sessionId});
    if (!backup.success) return {success:false,count:0,modifiedFiles:[],error:backup.error||'Backup failed'};
    for (const update of plan.updates) { Json.commit(update); ac.wrote(update.relative, update.output); }
    return ac.finish({success:true,count:plan.count,modifiedFiles:plan.updates.map(u=>u.file)});
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return rollbackResult(res, this.id || this.engineId || "unknown");
  }
}

module.exports = GDevelopAdapter;
