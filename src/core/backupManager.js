/**
 * OpenTranslator — BackupManager
 * Gerencia backups transacionais com integridade verificável via SHA-256 e metadata.json.
 * 
 * Implementação estrita para atender PASSO 8 e PASSO 9:
 * - Backups transacionais com identidade própria (backupId, sessionId, transactionId, gamePath)
 * - Rollback estrito por identidade de sessão (sem restoreOldestBackup genérico)
 * - Proteção de arquivos .bak legítimos pré-existentes
 * - Manifesto completo de hashes (BEFORE, AFTER, RESTORED) com added, removed, modified, restored, unchanged
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PartialReport } = require('../core/partialApply');

class BackupManager {
  constructor(options = {}) {
    this.backupDirName = options.backupDirName || ".opent_backup";
  }

  /**
   * Calcula o hash SHA-256 de um arquivo.
   */
  getFileHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 64 * 1024 * 1024) {
        const fd = fs.openSync(filePath, "r");
        const hash = crypto.createHash("sha256");
        const buffer = Buffer.alloc(4 * 1024 * 1024); // 4MB chunks
        let bytesRead = 0;
        while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
          hash.update(buffer.subarray(0, bytesRead));
        }
        fs.closeSync(fd);
        return hash.digest("hex");
      }
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash("sha256").update(buffer).digest("hex");
    } catch (e) {
      return null;
    }
  }

  /**
   * Cria um manifesto completo de hashes de todos os arquivos de um diretório.
   * @param {string} targetDir
   * @param {object} options
   * @returns {object} { timestamp, totalFiles, totalSize, files: { [relPath]: { size, sha256 } } }
   */
  createDirectoryManifest(targetDir, options = {}) {
    const ignoreDirs = new Set([
      ".git",
      "node_modules",
      this.backupDirName,
      "cache",
      ".cache",
      options.ignoreSaves ? "save" : null,
      options.ignoreSaves ? "saves" : null
    ].filter(Boolean));

    const ignoreFiles = new Set([
      "log.txt",
      "traceback.txt",
      "errors.txt",
      "cheat_overlay.log"
    ]);

    const manifestFiles = {};
    let totalSize = 0;

    const walk = (currentDir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(targetDir, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          const lName = entry.name.toLowerCase();
          if (!ignoreDirs.has(lName) && !lName.startsWith('.opent_')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const lFile = entry.name.toLowerCase();
          if (ignoreFiles.has(lFile) || (lFile.startsWith('preloader_') && lFile.endsWith('.log'))) {
            continue;
          }
          try {
            const stat = fs.statSync(fullPath);
            const sha256 = this.getFileHash(fullPath);
            manifestFiles[relPath] = {
              size: stat.size,
              sha256
            };
            totalSize += stat.size;
          } catch (e) {}
        }
      }
    };

    if (fs.existsSync(targetDir)) {
      walk(targetDir);
    }

    return {
      timestamp: new Date().toISOString(),
      targetDir,
      totalFiles: Object.keys(manifestFiles).length,
      totalSize,
      files: manifestFiles
    };
  }

  /**
   * Compara três manifestos (BEFORE, AFTER, RESTORED) e calcula as diferenças completas.
   * @param {object} beforeManifest
   * @param {object} afterManifest
   * @param {object} restoredManifest
   * @returns {object}
   */
  compareManifests(beforeManifest, afterManifest, restoredManifest = null) {
    const beforeFiles = beforeManifest ? beforeManifest.files || {} : {};
    const afterFiles = afterManifest ? afterManifest.files || {} : {};
    const restoredFiles = restoredManifest ? restoredManifest.files || {} : null;

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];
    const restored = [];
    const unrestored = [];

    // Compara BEFORE com AFTER
    for (const relPath of Object.keys(afterFiles)) {
      if (!beforeFiles[relPath]) {
        added.push(relPath);
      } else if (beforeFiles[relPath].sha256 !== afterFiles[relPath].sha256) {
        modified.push(relPath);
      } else {
        unchanged.push(relPath);
      }
    }

    for (const relPath of Object.keys(beforeFiles)) {
      if (!afterFiles[relPath]) {
        removed.push(relPath);
      }
    }

    // Se houver manifesto RESTORED, valida integridade da restauração
    let isPerfectRestore = false;
    if (restoredFiles) {
      isPerfectRestore = true;

      for (const relPath of Object.keys(beforeFiles)) {
        const b = beforeFiles[relPath];
        const r = restoredFiles[relPath];
        if (!r || r.sha256 !== b.sha256) {
          unrestored.push({ relPath, expected: b.sha256, actual: r ? r.sha256 : "MISSING" });
          isPerfectRestore = false;
        } else if (modified.includes(relPath) || added.includes(relPath)) {
          restored.push(relPath);
        }
      }

      // Verifica se ficaram sobras/arquivos órfãos que não existiam no BEFORE
      for (const relPath of Object.keys(restoredFiles)) {
        if (!beforeFiles[relPath]) {
          unrestored.push({ relPath, expected: "NON_EXISTENT", actual: restoredFiles[relPath].sha256 });
          isPerfectRestore = false;
        }
      }
    }

    return {
      beforeTotal: Object.keys(beforeFiles).length,
      afterTotal: Object.keys(afterFiles).length,
      restoredTotal: restoredFiles ? Object.keys(restoredFiles).length : 0,
      added,
      removed,
      modified,
      unchanged,
      restored,
      unrestored,
      isPerfectRestore: restoredFiles ? isPerfectRestore : null
    };
  }

  /**
   * Cria um checkpoint de backup transacional para uma sessão específica.
   * @param {string} gameDir
   * @param {Array<string>} filesToBackup
   * @param {object} sessionInfo
   * @returns {{ success: boolean, backupId: string, sessionId: string, count: number, error?: string }}
   */
  createSessionBackup(gameDir, filesToBackup = [], sessionInfo = {}) {
    try {
      const sessionId = sessionInfo.sessionId || `session_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      if (typeof sessionId !== 'string' || path.basename(sessionId) !== sessionId || sessionId === '..') throw new Error('Invalid backup session identity');
      const transactionId = sessionInfo.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const backupId = sessionInfo.backupId || `bk_${sessionId}`;

      const rootBackupDir = path.join(gameDir, this.backupDirName);
      const sessionBackupDir = path.join(rootBackupDir, "sessions", sessionId);
      const originalFilesDir = path.join(sessionBackupDir, "original");
      if (fs.existsSync(path.join(sessionBackupDir, 'metadata.json'))) throw new Error('Backup session already exists; restore or retain it before starting another write');
      const createdFiles = (sessionInfo.createdFiles || []).map(relative => {
        if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /(^|[\\/])\.\.([\\/]|$)/.test(relative)) throw new Error('Invalid created-file path');
        if (fs.existsSync(path.resolve(gameDir, relative))) throw new Error('A planned new file already exists: ' + relative);
        return relative.replace(/\\/g, '/');
      });

      if (!fs.existsSync(originalFilesDir)) {
        fs.mkdirSync(originalFilesDir, { recursive: true });
      }

      const fileRecords = [];
      let count = 0;

      for (const srcPath of filesToBackup) {
        if (!fs.existsSync(srcPath)) throw new Error('A requested backup source is missing: ' + srcPath);

        const relPath = path.relative(gameDir, srcPath).replace(/\\/g, "/");
        if (relPath === '..' || relPath.startsWith('../') || path.isAbsolute(relPath)) throw new Error('Backup source is outside the game directory');
        const destPath = path.join(originalFilesDir, relPath);
        const destDir = path.dirname(destPath);

        if (fs.lstatSync(srcPath).isSymbolicLink() || !fs.statSync(srcPath).isFile()) throw new Error('Backup source must be a regular file');
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(srcPath, destPath);

        const sha256 = this.getFileHash(srcPath);
        if (!sha256 || this.getFileHash(destPath) !== sha256) throw new Error('Backup copy hash mismatch: ' + relPath);
        const stat = fs.statSync(srcPath);
        fileRecords.push({
          relPath,
          sha256,
          size: stat.size
        });
        count++;
      }

      const metadata = {
        backupId,
        sessionId,
        transactionId,
        gamePath: path.resolve(gameDir),
        createdAt: new Date().toISOString(),
        engine: sessionInfo.engine || "unknown",
        version: sessionInfo.version || "unknown",
        toolVersion: "2.0.0",
        files: fileRecords,
        createdFiles
      };

      const metaPath = path.join(sessionBackupDir, "metadata.json");
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf8");

      return {
        success: true,
        backupId,
        sessionId,
        transactionId,
        sessionBackupDir,
        count
      };
    } catch (e) {
      return {
        success: false,
        backupId: "",
        sessionId: "",
        count: 0,
        error: e.message
      };
    }
  }

  /**
   * Restaura o backup estrito pertencente àquela sessão.
   * @param {string} gameDir
   * @param {object} sessionRef { sessionId, backupId, transactionId }
   * @returns {{ success: boolean, restoredCount: number, error?: string }}
   */
  restoreSessionBackup(gameDir, sessionRef = {}) {
    const accApply = new PartialReport();
    const scanWarnings = [];
    try {
      const rootBackupDir = path.join(gameDir, this.backupDirName);
      const sessionsDir = path.join(rootBackupDir, "sessions");
      const hasIdentity = Boolean(sessionRef.sessionId || sessionRef.backupId || sessionRef.transactionId);

      let targetSessionDir = null;

      if (sessionRef.sessionId) {
        if (typeof sessionRef.sessionId !== 'string' || path.basename(sessionRef.sessionId) !== sessionRef.sessionId || sessionRef.sessionId === '..') {
          throw new Error('Invalid backup session identity');
        }
        const direct = path.join(sessionsDir, sessionRef.sessionId);
        if (fs.existsSync(direct)) targetSessionDir = direct;
      }

      // Se não encontrou por sessionId direto, busca pelo metadata.json
      if (!targetSessionDir && fs.existsSync(sessionsDir)) {
        const sessions = fs.readdirSync(sessionsDir);
        for (const s of sessions) {
          const sDir = path.join(sessionsDir, s);
          const metaPath = path.join(sDir, "metadata.json");
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
              if (
                (sessionRef.sessionId && meta.sessionId === sessionRef.sessionId) ||
                (sessionRef.backupId && meta.backupId === sessionRef.backupId) ||
                (sessionRef.transactionId && meta.transactionId === sessionRef.transactionId)
              ) {
                targetSessionDir = sDir;
                break;
              }
            } catch (e) {
              // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
              // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
              // A damaged unrelated session must not select a different backup.
              scanWarnings.push({ path: metaPath, error: e.message });
            }
          }
        }
      }

      // Se ainda não encontrou e houver fallback para metadata.json direto na raiz do backup
      if (!targetSessionDir && fs.existsSync(path.join(rootBackupDir, "metadata.json"))) {
        const legacy = JSON.parse(fs.readFileSync(path.join(rootBackupDir, "metadata.json"), 'utf8'));
        if (!hasIdentity || (sessionRef.sessionId && legacy.sessionId === sessionRef.sessionId) ||
          (sessionRef.backupId && legacy.backupId === sessionRef.backupId) ||
          (sessionRef.transactionId && legacy.transactionId === sessionRef.transactionId)) targetSessionDir = rootBackupDir;
      }

      // Se nenhuma sessão específica foi solicitada (ou não encontrada), seleciona a sessão mais recente disponível
      if (!targetSessionDir && !hasIdentity && fs.existsSync(sessionsDir)) {
        const sessions = fs.readdirSync(sessionsDir).sort().reverse();
        for (const s of sessions) {
          const sDir = path.join(sessionsDir, s);
          if (fs.existsSync(path.join(sDir, "metadata.json"))) {
            targetSessionDir = sDir;
            break;
          }
        }
      }

      if (!targetSessionDir || !fs.existsSync(path.join(targetSessionDir, "metadata.json"))) {
        return {
          success: false,
          restoredCount: 0,
          error: `No matching backup session was found: ${sessionRef.sessionId || sessionRef.backupId || "unspecified"}`,
          scanWarnings
        };
      }

      const metaPath = path.join(targetSessionDir, "metadata.json");
      const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const originalFilesDir = path.join(targetSessionDir, "original");
      if (!Array.isArray(metadata.files)) throw new Error('Invalid backup file manifest');
      for (const key of ['sessionId', 'backupId', 'transactionId']) {
        if (sessionRef[key] && metadata[key] !== sessionRef[key]) throw new Error('Backup identity mismatch: ' + key);
      }
      const gameRoot = fs.realpathSync(gameDir);
      const normalized = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
      if (metadata.gamePath && normalized(metadata.gamePath) !== normalized(gameDir)) {
        throw new Error('Backup belongs to a different game directory');
      }
      const checkedPath = (base, relative) => {
        if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /(^|[\\/])\.\.([\\/]|$)/.test(relative)) {
          throw new Error('Invalid path in backup manifest');
        }
        const absolute = path.resolve(base, relative);
        const relativeResult = path.relative(path.resolve(base), absolute);
        if (relativeResult === '..' || relativeResult.startsWith('..' + path.sep) || path.isAbsolute(relativeResult)) throw new Error('Backup path escapes its directory');
        const resolvedBase = path.relative(gameRoot, fs.realpathSync(base));
        if (resolvedBase === '..' || resolvedBase.startsWith('..' + path.sep) || path.isAbsolute(resolvedBase)) throw new Error('Backup root escapes the game directory');
        // Reject existing links/junctions before any copy, including parent directories.
        let cursor = path.resolve(base);
        if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Linked backup root is not supported');
        for (const part of relativeResult.split(path.sep)) {
          cursor = path.join(cursor, part);
          if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Linked restore path is not supported');
        }
        return absolute;
      };
      if (fs.realpathSync(gameDir) !== gameRoot) throw new Error('Game directory changed during restore');
      const plannedNames = new Set();
      const plan = metadata.files.map(rec => {
        const identity = process.platform === 'win32' ? String(rec.relPath).toLowerCase() : rec.relPath;
        if (plannedNames.has(identity)) throw new Error('Duplicate path in backup manifest');
        plannedNames.add(identity);
        const backupFilePath = checkedPath(originalFilesDir, rec.relPath);
        const targetFilePath = checkedPath(gameDir, rec.relPath);
        if (!/^[a-f0-9]{64}$/i.test(rec.sha256 || '') || this.getFileHash(backupFilePath) !== rec.sha256.toLowerCase()) {
          throw new Error('Backup file is missing or its hash does not match: ' + rec.relPath);
        }
        return { rec, backupFilePath, targetFilePath };
      });
      if (metadata.createdFiles !== undefined && !Array.isArray(metadata.createdFiles)) throw new Error('Invalid created-file manifest');
      const removePlan = (metadata.createdFiles || []).map(relative => {
        const identity = process.platform === 'win32' ? String(relative).toLowerCase() : relative;
        if (plannedNames.has(identity)) throw new Error('Created-file path conflicts with the backup file plan');
        plannedNames.add(identity);
        const file = checkedPath(gameDir, relative);
        if (fs.existsSync(file) && !fs.statSync(file).isFile()) throw new Error('A created-file path is not a regular file');
        return { file, relative };
      });

      let restoredCount = 0;
      const restoredFiles = [];

      for (const { rec, backupFilePath, targetFilePath } of plan) {
        try {
          const targetDir = path.dirname(targetFilePath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(backupFilePath, targetFilePath);
          if (this.getFileHash(targetFilePath) !== rec.sha256.toLowerCase()) throw new Error('Restored file hash mismatch');
          restoredCount++;
          restoredFiles.push(rec.relPath);
          accApply.ok();
        } catch (error) {
          accApply.fail(rec.relPath, error);
        }
      }
      if (accApply.failed) return accApply.report({ restoredCount, restoredFiles, isPerfectRestore: false, backupRetained: true });
      const removedCreatedFiles = [];
      for (const { file, relative } of removePlan) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
          if (fs.existsSync(file)) throw new Error('Created file was not removed');
          removedCreatedFiles.push(relative);
        } catch (error) { accApply.fail(relative, error); }
      }
      if (accApply.failed) return accApply.report({ restoredCount, restoredFiles, removedCreatedFiles, isPerfectRestore: false, backupRetained: true });

      // Remove apenas a pasta desta sessão
      try {
        if (targetSessionDir !== rootBackupDir) {
          fs.rmSync(targetSessionDir, { recursive: true, force: true });
        } else {
          fs.rmSync(originalFilesDir, { recursive: true, force: true });
          fs.unlinkSync(metaPath);
        }
      } catch (e) {
        // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(metaPath, e);
      }

      // Se não há mais sessões em .opent_backup/sessions, limpa pasta .opent_backup
      try {
        if (fs.existsSync(sessionsDir) && fs.readdirSync(sessionsDir).length === 0) fs.rmdirSync(sessionsDir);
        if (fs.existsSync(rootBackupDir) && fs.readdirSync(rootBackupDir).length === 0) fs.rmdirSync(rootBackupDir);
      } catch (e) {
        // FASE 9 / PASSO 59 — a falha deixou de ser silenciosa.
        // Ver src/core/partialApply.js: quem decide o `success` e o relatorio.
        accApply.fail(rootBackupDir, e);
      }

      return accApply.report({
        sessionId: metadata.sessionId,
        backupId: metadata.backupId,
        restoredCount,
        restoredFiles,
        removedCreatedFiles,
        scanWarnings,
        isPerfectRestore: restoredCount === plan.length
});
    } catch (e) {
      return {
        success: false,
        restoredCount: 0,
        restoredFiles: [],
        backupRetained: true,
        error: e.message
      };
    }
  }

  // Compatibilidade com código legado que chama createBackup / restore
  createBackup(gameDir, filesToBackup = [], metaInfo = {}) {
    return this.createSessionBackup(gameDir, filesToBackup, metaInfo);
  }

  restore(gameDir, options = {}) {
    return this.restoreSessionBackup(gameDir, options);
  }

  restoreOldestBackup(gameDir, options = {}) {
    return this.restoreSessionBackup(gameDir, options);
  }
}

module.exports = BackupManager;
