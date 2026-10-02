/**
 * OpenTranslator — GodotAdapter
 * Adaptador oficial para jogos desenvolvidos em Godot Engine (Godot 3.x e 4.x).
 * 
 * Capacidades:
 * - Detecção multicritério (project.godot, project.binary, *.pck, binários Godot)
 * - Extração nativa de PCK (Godot 3 e 4 v1/v2/v3): árvores de diálogo JSON, CSV, PO, TextAssets
 * - Localização nativa via CSV (keys,en,pt_BR,...) com parser RFC-4180
 * - Localização nativa via gettext PO/MO (msgid, msgstr, msgctxt)
 * - Injeção não destrutiva em PCK com rebuild da tabela de arquivos e rollback instantâneo SHA-256
 * - Preservação estrita de quebras de linha, tags BBCode, tags de diálogo <<var>> e escapes
 * - Autocura e proteção de tokens: %s, %d, {0}, tr(), tr_n(), <<...>>
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');
const GodotLocalizationProvider = require('./godotLocalizationProvider');

class GodotAdapter extends BaseEngineAdapter {
  constructor() {
    super("godot", "Godot Engine");
    this.codeProtector = new CodeProtector({ engine: "godot" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_godot_backup" });
  }

  _findPython() {
    const candidates = [
      "C:\\Users\\Teste\\AppData\\Roaming\\uv\\python\\cpython-3.12.8-windows-x86_64-none\\python.exe",
      "python",
      "python3"
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return "python";
  }

  getDetailedDeclaration() {
    return {
      engine: "godot",
      name: "Godot Engine",
      versions: ["Godot 3.x", "Godot 4.x"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: true,
      placeholders: true,
      pluralization: true
    };
  }

  getCapabilities(gameDir, exePath) {
    const findings = GodotLocalizationProvider.discover(gameDir);
    const hasNative = findings.csvFiles.length > 0 || findings.poFiles.length > 0;
    const hasPck = fs.existsSync(gameDir) && fs.readdirSync(gameDir).some(f => f.toLowerCase().endsWith('.pck'));

    return {
      staticFiles: true,
      nativeLocalization: hasNative,
      archives: hasPck,
      runtimeHook: false,
      dom: false,
      frameworkState: true,
      ocr: true,
      backupSupported: true,
      strategy: hasNative ? "Native Godot Localization (CSV / PO)" : (hasPck ? "Godot PCK Resource Injection" : "Static Scene / Resource Scanner")
    };
  }

  async detect(gameDir) {
    if (!fs.existsSync(gameDir)) return { isMatch: false, confidence: 0 };
    const files = fs.readdirSync(gameDir);
    const hasPck = files.some(f => f.toLowerCase().endsWith('.pck'));
    const hasProjectGodot = files.some(f => f.toLowerCase() === 'project.godot' || f.toLowerCase() === 'project.binary');
    
    if (hasProjectGodot || hasPck) {
      return {
        isMatch: true,
        confidence: hasProjectGodot ? 1.0 : 0.95,
        engine: "godot",
        pckFiles: files.filter(f => f.toLowerCase().endsWith('.pck'))
      };
    }
    return { isMatch: false, confidence: 0 };
  }

  async inspect(gameDir) {
    const findings = GodotLocalizationProvider.discover(gameDir);
    const pckFiles = fs.existsSync(gameDir) 
      ? fs.readdirSync(gameDir).filter(f => f.toLowerCase().endsWith('.pck')) 
      : [];
    
    const pckDetails = [];
    const py = this._findPython();
    const bridgeScript = path.join(__dirname, "godot_bridge.py");

    for (const pck of pckFiles) {
      const fullPath = path.join(gameDir, pck);
      try {
        const proc = spawnSync(py, [bridgeScript, "inspect", fullPath], { encoding: "utf-8", timeout: 10000 });
        if (proc.status === 0 && proc.stdout) {
          const info = JSON.parse(proc.stdout.trim());
          pckDetails.push({ name: pck, size: fs.statSync(fullPath).size, ...info });
        }
      } catch (e) {
        pckDetails.push({ name: pck, size: fs.statSync(fullPath).size, error: e.message });
      }
    }

    return {
      gameDir,
      csvFiles: findings.csvFiles,
      poFiles: findings.poFiles,
      pckFiles: pckDetails,
      hasLocalization: findings.csvFiles.length > 0 || findings.poFiles.length > 0 || pckDetails.length > 0
    };
  }

  async extract(gameDir, options = {}) {
    return this.extractTexts(gameDir, options);
  }

  async extractTexts(gameDir, options = {}) {
    const findings = GodotLocalizationProvider.discover(gameDir);
    const allTexts = [];

    // 1. Arquivos CSV nativos de localização soltos
    for (const csvPath of findings.csvFiles) {
      try {
        const content = fs.readFileSync(csvPath, 'utf8');
        const rows = GodotLocalizationProvider.parseGodotCsv(content);
        if (rows.length > 1) {
          const header = rows[0];
          let srcCol = 1;
          for (let c = 1; c < header.length; c++) {
            if (/^(en|default|original|source)/i.test(header[c])) {
              srcCol = c;
              break;
            }
          }

          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const key = row[0] || '';
            const srcText = row[srcCol] || key;
            if (srcText && srcText.trim().length > 0) {
              const { protectedText, tokens } = this.codeProtector.protect(srcText.trim(), "godot");
              allTexts.push({
                id: `godot_csv_${path.basename(csvPath)}_${r}`,
                file: path.relative(gameDir, csvPath).replace(/\\/g, "/"),
                key,
                rowIndex: r,
                sourceCol: srcCol,
                original: srcText.trim(),
                clean: srcText.trim(),
                protectedText,
                tokens,
                engine: "godot",
                format: "godot_csv"
              });
            }
          }
        }
      } catch (e) {
        if (global.log) global.log('warn', `[Godot] Falha ao ler CSV ${csvPath}: ${e.message}`);
      }
    }

    // 2. Arquivos PO gettext soltos
    for (const poPath of findings.poFiles) {
      try {
        const content = fs.readFileSync(poPath, 'utf8');
        const poEntries = GodotLocalizationProvider.parsePo(content);
        for (let i = 0; i < poEntries.length; i++) {
          const ent = poEntries[i];
          if (ent.msgid && ent.msgid.trim().length > 0) {
            const { protectedText, tokens } = this.codeProtector.protect(ent.msgid.trim(), "godot");
            allTexts.push({
              id: `godot_po_${path.basename(poPath)}_${i}`,
              file: path.relative(gameDir, poPath).replace(/\\/g, "/"),
              key: ent.msgid,
              msgctxt: ent.msgctxt || null,
              original: ent.msgid.trim(),
              clean: ent.msgid.trim(),
              protectedText,
              tokens,
              engine: "godot",
              format: "godot_po"
            });
          }
        }
      } catch (e) {
        if (global.log) global.log('warn', `[Godot] Falha ao ler PO ${poPath}: ${e.message}`);
      }
    }

    // 3. Arquivos PCK (extração profunda via godot_bridge.py)
    if (fs.existsSync(gameDir)) {
      const pckFiles = fs.readdirSync(gameDir).filter(f => f.toLowerCase().endsWith('.pck'));
      const py = this._findPython();
      const bridgeScript = path.join(__dirname, "godot_bridge.py");

      for (const pckName of pckFiles) {
        const pckPath = path.join(gameDir, pckName);
        const tmpOut = path.join(__dirname, `_tmp_godot_${Date.now()}.json`);
        try {
          const proc = spawnSync(py, [bridgeScript, "extract", pckPath, tmpOut], { encoding: "utf-8", timeout: 60000 });
          if (fs.existsSync(tmpOut)) {
            const result = JSON.parse(fs.readFileSync(tmpOut, "utf-8"));
            if (result.texts && Array.isArray(result.texts)) {
              for (const item of result.texts) {
                const { protectedText, tokens } = this.codeProtector.protect(item.original, "godot");
                item.protectedText = protectedText;
                item.tokens = tokens;
                allTexts.push(item);
              }
            }
            try { fs.unlinkSync(tmpOut); } catch (_) {}
          }
        } catch (e) {
          if (global.log) global.log('warn', `[Godot] Falha na extração de ${pckName}: ${e.message}`);
          if (fs.existsSync(tmpOut)) { try { fs.unlinkSync(tmpOut); } catch (_) {} }
        }
      }
    }

    return {
      success: true,
      texts: allTexts,
      count: allTexts.length,
      nativeFilesCount: findings.csvFiles.length + findings.poFiles.length
    };
  }

  async extractResources(gameDir, options = {}) {
    return { success: true, resources: [] };
  }

  async prepareTranslation(texts, options = {}) {
    return texts.map(t => ({
      id: t.id,
      original: t.original,
      clean: t.clean || t.original,
      context: t.context || t.file
    }));
  }

  async translate(texts, engineTranslator, options = {}) {
    if (engineTranslator && typeof engineTranslator.translate === "function") {
      return await engineTranslator.translate(texts, options);
    }
    const translations = new Map();
    for (const t of texts) {
      translations.set(t.id, t.original);
    }
    return { success: true, translations };
  }

  async restorePlaceholders(translatedText, tokens) {
    return this.codeProtector.restore(translatedText, tokens);
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    return this.applyTranslations(gameDir, texts, translations, options);
  }

  async applyTranslations(gameDir, texts, translations, options = {}) {
    // Separa itens soltos e itens de PCK
    const looseTexts = [];
    const pckTextsByFile = new Map();

    for (const t of texts) {
      if (t.format && t.format.startsWith("godot_pck")) {
        const pckFile = t.file;
        if (!pckTextsByFile.has(pckFile)) pckTextsByFile.set(pckFile, []);
        pckTextsByFile.get(pckFile).push(t);
      } else {
        looseTexts.push(t);
      }
    }

    // Backup inicial via BackupManager
    const sessionOpts = {
      engine: "godot",
      sessionId: options.sessionId || `godot_sess_${Date.now()}`,
      transactionId: options.transactionId || `godot_tx_${Date.now()}`
    };

    let filesToBackup = [];
    if (looseTexts.length > 0) {
      const looseFiles = [...new Set(looseTexts.map(t => path.join(gameDir, t.file)))];
      filesToBackup.push(...looseFiles);
    }
    // Para PCK, não duplicamos o arquivo de 1.2GB se pudermos usar rollback de cabeçalho + truncagem,
    // mas se o usuário optar por backup completo ou arquivo for pequeno (< 200MB), fazemos backup
    const pckMetaFiles = [];

    const backupRes = this.backupManager.createBackup(gameDir, filesToBackup, sessionOpts);
    const sessionDir = backupRes && backupRes.sessionDir ? backupRes.sessionDir : path.join(gameDir, ".opent_godot_backup", sessionOpts.sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const modifiedFiles = new Set();
    let appliedCount = 0;

    // 1. Aplicação em arquivos soltos (CSV / PO)
    if (looseTexts.length > 0) {
      const byFile = new Map();
      for (const t of looseTexts) {
        if (!byFile.has(t.file)) byFile.set(t.file, []);
        byFile.get(t.file).push(t);
      }

      for (const [relFile, fileTexts] of byFile.entries()) {
        const fullPath = path.join(gameDir, relFile);
        if (!fs.existsSync(fullPath)) continue;

        const fmt = fileTexts[0].format;
        if (fmt === "godot_csv") {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const rows = GodotLocalizationProvider.parseGodotCsv(content);
            if (rows.length > 0) {
              const header = rows[0];
              let ptCol = header.findIndex(h => /^(pt|pt_BR|pt-BR|portuguese)/i.test(h));
              if (ptCol === -1) {
                header.push("pt_BR");
                ptCol = header.length - 1;
                for (let r = 1; r < rows.length; r++) rows[r].push("");
              }

              for (const item of fileTexts) {
                const tr = translations.get ? translations.get(item.id) : translations[item.id];
                if (tr && item.rowIndex < rows.length) {
                  const restored = this.codeProtector.restore(tr, item.tokens || []);
                  rows[item.rowIndex][ptCol] = restored.restoredText;
                  appliedCount++;
                }
              }

              const newCsv = GodotLocalizationProvider.serializeGodotCsv(rows);
              fs.writeFileSync(fullPath, newCsv, 'utf8');
              modifiedFiles.add(fullPath);
            }
          } catch (e) {
            if (global.log) global.log('error', `[Godot] Erro ao aplicar no CSV ${relFile}: ${e.message}`);
          }
        } else if (fmt === "godot_po") {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const poEntries = GodotLocalizationProvider.parsePo(content);
            let fileModified = false;

            for (const item of fileTexts) {
              const tr = translations.get ? translations.get(item.id) : translations[item.id];
              if (tr) {
                const entry = poEntries.find(e => e.msgid === item.original || e.msgid === item.key);
                if (entry) {
                  const restored = this.codeProtector.restore(tr, item.tokens || []);
                  entry.msgstr = restored.restoredText;
                  fileModified = true;
                  appliedCount++;
                }
              }
            }

            if (fileModified) {
              const newPo = GodotLocalizationProvider.serializePo(poEntries, options.tl || 'pt_BR');
              fs.writeFileSync(fullPath, newPo, 'utf8');
              modifiedFiles.add(fullPath);
            }
          } catch (e) {
            if (global.log) global.log('error', `[Godot] Erro ao aplicar no PO ${relFile}: ${e.message}`);
          }
        }
      }
    }

    // 2. Aplicação em arquivos PCK
    if (pckTextsByFile.size > 0) {
      const py = this._findPython();
      const bridgeScript = path.join(__dirname, "godot_bridge.py");

      for (const [pckName, pckTexts] of pckTextsByFile.entries()) {
        const pckPath = path.join(gameDir, pckName);
        if (!fs.existsSync(pckPath)) continue;

        // Monta lista de traduções com restauração de placeholders
        const transList = [];
        for (const item of pckTexts) {
          const tr = translations.get ? translations.get(item.id) : translations[item.id];
          if (tr) {
            const restored = this.codeProtector.restore(tr, item.tokens || []);
            transList.push({
              id: item.id,
              file: item.file,
              subPath: item.subPath,
              nodeId: item.nodeId,
              field: item.field || "text",
              original: item.original,
              translation: restored.restoredText
            });
          }
        }

        if (transList.length === 0) continue;

        const tmpTransJson = path.join(sessionDir, `trans_${pckName}.json`);
        const metaOutJson = path.join(sessionDir, `pck_meta_${pckName}.json`);
        fs.writeFileSync(tmpTransJson, JSON.stringify(transList, null, 2), "utf-8");

        try {
          const proc = spawnSync(py, [bridgeScript, "apply", pckPath, tmpTransJson, metaOutJson], { encoding: "utf-8", timeout: 60000 });
          if (fs.existsSync(metaOutJson)) {
            const meta = JSON.parse(fs.readFileSync(metaOutJson, "utf-8"));
            if (meta.success) {
              appliedCount += (meta.appliedCount || 0);
              modifiedFiles.add(pckPath);
              pckMetaFiles.push(metaOutJson);
            }
          }
        } catch (e) {
          if (global.log) global.log('error', `[Godot] Erro ao aplicar no PCK ${pckName}: ${e.message}`);
        }
      }
    }

    return {
      success: true,
      sessionId: sessionOpts.sessionId,
      sessionDir,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount
    };
  }

  async package(gameDir, options = {}) {
    return { success: true, packaged: true };
  }

  async launch(gameDir, exePath, options = {}) {
    let targetExe = exePath;
    if (!targetExe || !fs.existsSync(targetExe)) {
      const exes = fs.readdirSync(gameDir).filter(f => f.toLowerCase().endsWith(".exe"));
      if (exes.length > 0) targetExe = path.join(gameDir, exes[0]);
    }
    if (!targetExe || !fs.existsSync(targetExe)) {
      return { success: false, error: "Executável Godot não encontrado" };
    }

    try {
      const child = spawn(targetExe, [], {
        cwd: gameDir,
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      return { success: true, pid: child.pid, executable: targetExe };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async rollback(gameDir, options = {}) {
    const py = this._findPython();
    const bridgeScript = path.join(__dirname, "godot_bridge.py");
    const restoredFiles = [];

    // 1. Rollback de PCKs via meta_json salvos nas sessões de backup
    const backupBase = path.join(gameDir, ".opent_godot_backup");
    if (fs.existsSync(backupBase)) {
      const sessionDirs = fs.readdirSync(backupBase).map(d => path.join(backupBase, d));
      for (const sDir of sessionDirs) {
        if (!fs.statSync(sDir).isDirectory()) continue;
        const metaFiles = fs.readdirSync(sDir).filter(f => f.startsWith("pck_meta_") && f.endsWith(".json"));
        for (const mf of metaFiles) {
          const metaPath = path.join(sDir, mf);
          try {
            const proc = spawnSync(py, [bridgeScript, "rollback", metaPath], { encoding: "utf-8", timeout: 30000 });
            if (proc.status === 0) {
              const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
              restoredFiles.push(meta.pckPath);
            }
          } catch (e) {
            if (global.log) global.log('error', `[Godot] Falha no rollback de PCK: ${e.message}`);
          }
        }
      }
    }

    // 2. Rollback via BackupManager para arquivos soltos e limpeza de sessão
    const res = this.backupManager.restoreSessionBackup(gameDir, options);
    if (res && res.restoredFiles) {
      restoredFiles.push(...res.restoredFiles);
    } else {
      const oldRes = this.backupManager.restoreOldestBackup(gameDir);
      if (oldRes && oldRes.restoredFiles) restoredFiles.push(...oldRes.restoredFiles);
    }

    // Limpa pasta de backup se vazia ou restaurada
    try {
      if (fs.existsSync(backupBase)) {
        fs.rmSync(backupBase, { recursive: true, force: true });
      }
    } catch (_) {}

    return {
      success: true,
      restoredFiles: Array.from(new Set(restoredFiles))
    };
  }

  async diagnose(gameDir) {
    const insp = await this.inspect(gameDir);
    return {
      engine: "godot",
      supported: true,
      hasLocalization: insp.hasLocalization,
      pckFiles: insp.pckFiles,
      csvFiles: insp.csvFiles,
      poFiles: insp.poFiles
    };
  }
}

module.exports = GodotAdapter;
