/**
 * OpenTranslator — BackupManager
 * Gerencia backups transacionais com integridade verificável via SHA-256 e metadata.json.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class BackupManager {
  constructor(options = {}) {
    this.backupDirName = options.backupDirName || ".opent_backup";
  }

  /**
   * Calcula o hash SHA-256 de um arquivo.
   */
  getFileHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Cria um checkpoint de backup completo dos arquivos listados antes de qualquer modificação.
   * @param {string} gameDir
   * @param {Array<string>} filesToBackup
   * @param {object} metaInfo
   * @returns {{ success: boolean, backupDir: string, count: number, error?: string }}
   */
  createBackup(gameDir, filesToBackup = [], metaInfo = {}) {
    try {
      const backupDir = path.join(gameDir, this.backupDirName);
      const originalFilesDir = path.join(backupDir, "original");
      if (!fs.existsSync(originalFilesDir)) {
        fs.mkdirSync(originalFilesDir, { recursive: true });
      }

      const fileRecords = [];
      let count = 0;

      for (const srcPath of filesToBackup) {
        if (!fs.existsSync(srcPath)) continue;

        const relPath = path.relative(gameDir, srcPath);
        const destPath = path.join(originalFilesDir, relPath);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Se já existe backup original deste arquivo, NÃO sobrescreve para preservar o original de fábrica!
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }

        const hash = this.getFileHash(srcPath);
        fileRecords.push({
          relPath,
          hash,
          size: fs.statSync(srcPath).size
        });
        count++;
      }

      const metadata = {
        timestamp: new Date().toISOString(),
        gameDir,
        engine: metaInfo.engine || "unknown",
        version: metaInfo.version || "unknown",
        toolVersion: "2.0.0",
        files: fileRecords
      };

      const metaPath = path.join(backupDir, "metadata.json");
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf8");

      return {
        success: true,
        backupDir,
        count
      };
    } catch (e) {
      return {
        success: false,
        backupDir: "",
        count: 0,
        error: e.message
      };
    }
  }

  /**
   * Restaura os arquivos originais a partir do backup.
   * @param {string} gameDir
   * @returns {{ success: boolean, restoredCount: number, error?: string }}
   */
  restore(gameDir) {
    try {
      const backupDir = path.join(gameDir, this.backupDirName);
      const originalFilesDir = path.join(backupDir, "original");
      const metaPath = path.join(backupDir, "metadata.json");

      if (!fs.existsSync(originalFilesDir) || !fs.existsSync(metaPath)) {
        return { success: false, restoredCount: 0, error: "Nenhum backup encontrado para restauração." };
      }

      const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      let restoredCount = 0;

      for (const rec of metadata.files) {
        const backupFilePath = path.join(originalFilesDir, rec.relPath);
        const targetFilePath = path.join(gameDir, rec.relPath);

        if (fs.existsSync(backupFilePath)) {
          const targetDir = path.dirname(targetFilePath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(backupFilePath, targetFilePath);
          restoredCount++;
        }
      }

      return { success: true, restoredCount };
    } catch (e) {
      return { success: false, restoredCount: 0, error: e.message };
    }
  }

  /**
   * Verifica a integridade dos arquivos originais do backup.
   */
  verify(gameDir) {
    const backupDir = path.join(gameDir, this.backupDirName);
    const originalFilesDir = path.join(backupDir, "original");
    const metaPath = path.join(backupDir, "metadata.json");

    if (!fs.existsSync(metaPath)) return { hasBackup: false };

    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const damaged = [];

      for (const rec of metadata.files) {
        const p = path.join(originalFilesDir, rec.relPath);
        if (!fs.existsSync(p)) {
          damaged.push({ file: rec.relPath, reason: "missing" });
        } else {
          const h = this.getFileHash(p);
          if (h !== rec.hash) damaged.push({ file: rec.relPath, reason: "corrupted_hash" });
        }
      }

      return {
        hasBackup: true,
        valid: damaged.length === 0,
        totalFiles: metadata.files.length,
        damaged
      };
    } catch (e) {
      return { hasBackup: true, valid: false, error: e.message };
    }
  }
}

module.exports = BackupManager;
