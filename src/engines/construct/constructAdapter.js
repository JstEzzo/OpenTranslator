/**
 * OpenTranslator — ConstructAdapter
 * Adaptador oficial para Construct 3 e Construct 2.
 * 
 * Capacidades:
 * - Formato oficial do plugin Internationalization: {"locale": "pt-BR", "strings": {...}}
 * - Preservação de contextos, chaves e pluralização ICU ({0, plural, ...})
 * - Varredura automática em exportações HTML5, Electron e NW.js
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

class ConstructAdapter extends BaseEngineAdapter {
  constructor() {
    super("construct", "Construct 3");
    // FASE 10 / D1 — este adapter é transacional.
    //
    // O opt-in é uma AFIRMAÇÃO: "todo arquivo que eu toco está no backup que
    // a transação vai fazer". `ac.finish` verifica a cada apply e devolve
    // `transactional: false` se a afirmação deixar de valer.
    //
    // `this` só existe DEPOIS de `super()`: numa classe derivada, tocar `this`
    // antes disso lança em tempo de construção.
    this.transactional = true;
    this.codeProtector = new CodeProtector({ engine: "construct" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_construct_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "construct",
      name: "Construct 3",
      versions: ["Construct 3 r200+", "Construct 2"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: false,
      placeholders: true,
      pluralization: true
    };
  }

  getCapabilities(gameDir, exePath) {
    const files = fs.existsSync(gameDir) ? fs.readdirSync(gameDir).map(f => f.toLowerCase()) : [];
    const isConstruct = files.includes("c3runtime.js") || files.includes("c2runtime.js") || files.includes("data.json");

    return {
      staticFiles: true,
      nativeLocalization: true,
      archives: false,
      runtimeHook: false,
      dom: true,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: "Construct Internationalization Plugin & Web Runtime Scanner"
    };
  }

  async extract(gameDir, options = {}) {
    const texts=[], acc=new PartialReport();
    for(const file of ['data.json','lang.json','strings.json','locale.json']) {
      const full=path.join(gameDir,file);if(!fs.existsSync(full))continue;
      try {
        const data=JSON.parse(fs.readFileSync(full,'utf8'));
        const map=data&&typeof data.strings==='object'&&!Array.isArray(data.strings)?data.strings:null;
        // Never treat the exported project metadata in data.json as dialogue.
        const flat=!map&&file!=='data.json'&&data&&typeof data==='object'&&!Array.isArray(data);
        if(!map&&!flat){acc.skip(file,'No recognized localization string table');continue;}
        const visit=(value,keys)=>{for(const [key,child]of Object.entries(value)){
          const at=keys.concat(key);
          if(typeof child==='string'&&child.trim()&&!(flat&&keys.length===0&&['locale','version','name','id'].includes(key))){
            const {protectedText,tokens}=this.codeProtector.protect(child,'construct');
            texts.push({id:'c3_'+file+'_'+JSON.stringify(at),file,keySegments:at,original:child,clean:child,protectedText,tokens,engine:'construct'});
          }else if(child&&typeof child==='object'&&!Array.isArray(child))visit(child,at);
        }};
        visit(map||data,map?['strings']:[]);acc.ok();
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

module.exports = ConstructAdapter;
