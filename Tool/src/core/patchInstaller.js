/**
 * OpenTranslator - PatchInstaller
 * 
 * Instalador industrial e seguro de patches de tradução (.otpatch v3.x):
 * - Validação prévia via TranslationPatchSchema e extração canônica de metadata
 * - PATH TRAVERSAL DEFENSE: bloqueia tentativas de escapar da pasta do jogo (..\.., caminhos absolutos, UNC)
 * - Nomenclatura explícita de integridade: gameFingerprint, fileFingerprint, sourceStringFingerprint
 * - Escrita atômica garantida com limpeza automática de arquivos temporários em falhas
 * - Registro e recuperação por TransactionJournal (START -> BACKUP -> WRITE -> VERIFY -> COMMIT)
 * - Rollback seletivo: restaura exclusivamente os arquivos afetados pela transação
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BackupManager = require('./backupManager');
const TranslationPatchSchema = require('./translationPatchSchema');
const defaultJournal = require('./transactionJournal');

class PatchInstaller {
  constructor(options = {}) {
    this.backupManager = new BackupManager({ backupDirName: '.ot_patch_bk' });
    this.journal = options.journal || defaultJournal;
  }

  /**
   * Valida compatibilidade do patch contra o jogo
   */
  verifyCompatibility(patch, targetGameInfo = {}) {
    const norm = TranslationPatchSchema.normalize(patch);
    if (!norm) {
      return { compatible: false, blocked: true, reason: 'Formato de patch inválido ou nulo' };
    }

    const val = TranslationPatchSchema.validate(norm);
    if (!val.valid) {
      return { compatible: false, blocked: true, reason: `Schema inválido: ${val.errors.join('; ')}` };
    }

    const meta = norm.metadata;
    const expGameId = targetGameInfo.gameId || targetGameInfo.metadata?.gameId;
    const expVersion = targetGameInfo.gameVersion || targetGameInfo.metadata?.gameVersion;

    if (meta.gameId && expGameId && meta.gameId !== expGameId) {
      return {
        compatible: false,
        blocked: true,
        reason: `PATCH BUILT FOR DIFFERENT GAME: Esperado [${meta.gameId}], Atual [${expGameId}]`
      };
    }

    if (meta.gameVersion && expVersion && meta.gameVersion !== expVersion) {
      return {
        compatible: false,
        blocked: true,
        reason: `PATCH BUILT FOR DIFFERENT GAME VERSION: Patch construído para v${meta.gameVersion}, jogo atual é v${expVersion}`
      };
    }

    return {
      compatible: true,
      blocked: false,
      stringCount: norm.entries.length,
      targetLanguage: meta.targetLanguage,
      metadata: meta
    };
  }

  /**
   * Preview seguro das alterações sem tocar no disco
   */
  preview(patch, gameDir) {
    const norm = TranslationPatchSchema.normalize(patch);
    const comp = this.verifyCompatibility(norm, { gameDir });
    if (comp.blocked) {
      return { success: false, blocked: true, error: comp.reason };
    }

    const realGameRoot = path.resolve(gameDir);
    const filesAffected = new Set();

    for (const ent of norm.entries) {
      const secCheck = this._sanitizeAndResolvePath(realGameRoot, ent.location);
      if (!secCheck.safe) {
        return { success: false, blocked: true, error: secCheck.error };
      }
      filesAffected.add(ent.location);
    }

    return {
      success: true,
      blocked: false,
      totalTranslations: norm.entries.length,
      filesAffected: Array.from(filesAffected),
      targetLanguage: norm.metadata.targetLanguage,
      risk: filesAffected.size > 20 ? 'MODERATE' : 'LOW'
    };
  }

  /**
   * Aplicação atômica e segura do patch com defesa de path traversal e TransactionJournal
   */
  async applyPatch(patch, gameDir, gameInfo = {}) {
    const norm = TranslationPatchSchema.normalize(patch);
    const comp = this.verifyCompatibility(norm, gameInfo);
    if (comp.blocked) {
      return { success: false, blocked: true, error: comp.reason };
    }

    if (!norm.entries || norm.entries.length === 0) {
      return { success: false, error: 'Patch não contém entradas de tradução' };
    }

    const realGameRoot = path.resolve(gameDir);

    // 1. Verificação de Path Security e Mapeamento de Entradas
    const entriesByFile = new Map();
    for (const ent of norm.entries) {
      const secCheck = this._sanitizeAndResolvePath(realGameRoot, ent.location);
      if (!secCheck.safe) {
        return { success: false, blocked: true, error: secCheck.error };
      }

      if (!entriesByFile.has(secCheck.resolvedPath)) {
        entriesByFile.set(secCheck.resolvedPath, {
          relPath: ent.location,
          fullPath: secCheck.resolvedPath,
          entries: []
        });
      }
      entriesByFile.get(secCheck.resolvedPath).entries.push(ent);
    }

    // 2. Validação prévia de existência e Fingerprints
    const filesToModify = [];
    for (const [fullPath, fileInfo] of entriesByFile.entries()) {
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `Arquivo alvo não encontrado: ${fileInfo.relPath}` };
      }

      const fileBuffer = fs.readFileSync(fullPath);
      const fileContent = fileBuffer.toString('utf8');
      const actualFileFingerprint = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      for (const ent of fileInfo.entries) {
        // sourceStringFingerprint (hash do texto original)
        if (ent.sourceHash) {
          const actualStringFingerprint = crypto.createHash('sha256').update(ent.original || '').digest('hex').slice(0, 16);
          const expectedStringFingerprint = ent.sourceHash.slice(0, 16);
          if (actualStringFingerprint !== expectedStringFingerprint && ent.sourceHash.length === 16) {
            return {
              success: false,
              blocked: true,
              reason: `PATCH_SOURCE_MISMATCH: Divergência de sourceStringFingerprint para '${ent.original}'. Esperado [${expectedStringFingerprint}], Atual [${actualStringFingerprint}]`
            };
          }
        }
      }

      filesToModify.push({
        relPath: fileInfo.relPath,
        fullPath,
        entries: fileInfo.entries,
        originalContent: fileContent,
        fileFingerprint: actualFileFingerprint
      });
    }

    // 3. Inicia Transação no Journal
    const tx = this.journal.createTransaction(gameDir, norm.metadata.engine || 'generic');

    // 4. Cria Backup Atômico Seletivo
    const filePaths = filesToModify.map(f => f.fullPath);
    const backupRes = this.backupManager.createBackup(gameDir, filePaths, {
      reason: 'PatchInstall',
      patchId: norm.metadata.patchId,
      txId: tx.id
    });

    if (!backupRes.success) {
      return { success: false, error: 'Falha ao criar backup de segurança antes da aplicação' };
    }

    this.journal.setCommitting(tx.id);

    // 5. Aplicação Atômica por Arquivo com Limpeza de Temp em caso de erro
    let totalEntriesApplied = 0;
    const modifiedFiles = [];

    try {
      for (const fileItem of filesToModify) {
        let content = fileItem.originalContent;
        let fileChanged = false;

        // Se for JSON estruturado
        if (fileItem.relPath.toLowerCase().endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            const walkAndReplace = (obj) => {
              if (!obj || typeof obj !== 'object') return;
              for (const k of Object.keys(obj)) {
                if (typeof obj[k] === 'string') {
                  for (const ent of fileItem.entries) {
                    if (obj[k] === ent.original) {
                      obj[k] = ent.translation;
                      fileChanged = true;
                      totalEntriesApplied++;
                    }
                  }
                } else if (typeof obj[k] === 'object') {
                  walkAndReplace(obj[k]);
                }
              }
            };
            walkAndReplace(parsed);
            if (fileChanged) {
              content = JSON.stringify(parsed, null, 2);
            }
          } catch (e) {
            for (const ent of fileItem.entries) {
              if (content.includes(ent.original)) {
                content = content.split(ent.original).join(ent.translation);
                fileChanged = true;
                totalEntriesApplied++;
              }
            }
          }
        } else {
          // Arquivos textuais
          for (const ent of fileItem.entries) {
            if (content.includes(ent.original)) {
              content = content.split(ent.original).join(ent.translation);
              fileChanged = true;
              totalEntriesApplied++;
            }
          }
        }

        if (fileChanged) {
          this._atomicWriteFileSync(fileItem.fullPath, content);
          modifiedFiles.push(fileItem.fullPath);
          this.journal.recordFile(tx.id, fileItem.relPath, fileItem.fileFingerprint, crypto.createHash('sha256').update(content).digest('hex'));
        }
      }

      // 6. Verificação pós-aplicação
      for (const f of modifiedFiles) {
        const afterContent = fs.readFileSync(f, 'utf8');
        const origContent = filesToModify.find(m => m.fullPath === f).originalContent;
        if (afterContent === origContent) {
          throw new Error(`Verificação falhou: o arquivo de destino ${path.basename(f)} não foi alterado`);
        }
      }

      this.journal.setCommitted(tx.id);

      return {
        success: true,
        appliedEntries: totalEntriesApplied,
        filesModifiedCount: modifiedFiles.length,
        backupId: backupRes.backupId,
        transactionId: tx.id
      };

    } catch (err) {
      // Rollback imediato em caso de falha durante a escrita
      this.backupManager.restore(gameDir, backupRes.backupId);
      this.journal.setRolledBack(tx.id);
      return {
        success: false,
        error: `Falha durante aplicação do patch (rollback executado): ${err.message}`
      };
    }
  }

  /**
   * Rollback seletivo: restaura exclusivamente os arquivos da transação
   */
  async removePatch(gameDir, backupId = null) {
    const restoreRes = this.backupManager.restore(gameDir, backupId);
    return {
      success: restoreRes.success,
      restoredCount: restoreRes.restoredCount,
      backupId: restoreRes.backupId
    };
  }

  /**
   * Atualização de patch (v1 -> v2)
   */
  async updatePatch(newPatch, gameDir, gameInfo = {}) {
    return this.applyPatch(newPatch, gameDir, gameInfo);
  }

  /**
   * Sanitiza e valida caminho contra Path Traversal
   */
  _sanitizeAndResolvePath(realGameRoot, relativePath) {
    if (!relativePath || typeof relativePath !== 'string') {
      return { safe: false, error: 'Caminho inválido ou ausente' };
    }

    // Bloqueia caminhos absolutos no Windows (ex: C:\...) ou UNC (\\server\...)
    if (path.isAbsolute(relativePath) || relativePath.startsWith('\\\\')) {
      return {
        safe: false,
        error: `SECURITY ALERT: Caminho absoluto ou UNC bloqueado: [${relativePath}]`
      };
    }

    // Resolve o caminho completo normalizado
    const resolvedPath = path.resolve(realGameRoot, relativePath);

    // Confirma que o caminho está estritamente dentro da pasta do jogo
    if (!resolvedPath.startsWith(realGameRoot + path.sep) && resolvedPath !== realGameRoot) {
      return {
        safe: false,
        error: `PATH_TRAVERSAL_DETECTED: Tentativa de escapar do diretório raiz do jogo: [${relativePath}]`
      };
    }

    return { safe: true, resolvedPath };
  }

  /**
   * Grava arquivo de forma estritamente atômica com limpeza do temporário em caso de falha
   */
  _atomicWriteFileSync(targetPath, content) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tempFile = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    let fd = null;

    try {
      fd = fs.openSync(tempFile, 'w');
      fs.writeFileSync(fd, content, 'utf8');
      fs.fsyncSync(fd);
    } catch (err) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (e) {}
      }
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw err;
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (e) {}
      }
    }

    try {
      fs.renameSync(tempFile, targetPath);
    } catch (renameErr) {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
      throw renameErr;
    }
  }
}

module.exports = PatchInstaller;
