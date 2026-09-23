/**
 * OpenTranslator - StagingPolicy
 * 
 * Política inegociável de isolamento de jogos:
 * - O diretório original do jogo em 'C:\Users\...\Nova pasta' é estritamente IMUTÁVEL.
 * - Todos os experimentos, injeções, hooks e execuções de teste ocorrem em cópias de staging.
 * - Gera manifesto SHA-256 antes e valida após a execução para certificar que o original
 *   permaneceu bit-a-bit idêntico.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StagingPolicy {
  constructor(options = {}) {
    this.stagingBase = options.stagingBase || path.resolve(__dirname, '../../data/staging');
    if (!fs.existsSync(this.stagingBase)) {
      fs.mkdirSync(this.stagingBase, { recursive: true });
    }
  }

  /**
   * Gera manifesto de hashes de arquivos de um diretório
   */
  generateManifest(dirPath, maxDepth = 4) {
    const manifest = new Map();
    const scan = (current, depth = 0) => {
      if (depth > maxDepth) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(current, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith('.')) {
            scan(full, depth + 1);
          } else if (ent.isFile()) {
            const buf = fs.readFileSync(full);
            const hash = crypto.createHash('sha256').update(buf).digest('hex');
            const rel = path.relative(dirPath, full);
            manifest.set(rel, hash);
          }
        }
      } catch (e) {}
    };
    scan(dirPath);
    return manifest;
  }

  /**
   * Prepara cópia isolada de staging para um jogo
   */
  createStaging(originalGameDir, sessionId = `stage_${Date.now()}`) {
    const absOrig = path.resolve(originalGameDir);
    if (!fs.existsSync(absOrig)) {
      throw new Error(`Diretório original não encontrado: ${absOrig}`);
    }

    const folderName = path.basename(absOrig);
    const targetStagingDir = path.join(this.stagingBase, `${sessionId}_${folderName}`);

    // 1. Gera manifesto prévio do original
    const originalManifest = this.generateManifest(absOrig);

    // 2. Clona arquivos para o staging recursivamente
    this._copyRecursiveSync(absOrig, targetStagingDir);

    return {
      success: true,
      originalDir: absOrig,
      stagingDir: targetStagingDir,
      filesCount: originalManifest.size,
      originalManifest
    };
  }

  /**
   * Verifica se o diretório original permaneceu intacto após o ciclo
   */
  verifyOriginalUntouched(originalGameDir, initialManifest) {
    const absOrig = path.resolve(originalGameDir);
    const currentManifest = this.generateManifest(absOrig);

    if (currentManifest.size !== initialManifest.size) {
      return {
        untouched: false,
        reason: `Contagem de arquivos divergiu: inicial ${initialManifest.size}, atual ${currentManifest.size}`
      };
    }

    for (const [relPath, origHash] of initialManifest.entries()) {
      const curHash = currentManifest.get(relPath);
      if (!curHash) {
        return { untouched: false, reason: `Arquivo removido do original: ${relPath}` };
      }
      if (curHash !== origHash) {
        return { untouched: false, reason: `Arquivo modificado no original: ${relPath}` };
      }
    }

    return { untouched: true, filesVerified: initialManifest.size };
  }

  /**
   * Limpa o diretório de staging com segurança
   */
  cleanupStaging(stagingDir) {
    const absStaging = path.resolve(stagingDir);
    // Trava de segurança: somente deleta se estiver dentro da base de staging
    if (!absStaging.startsWith(this.stagingBase)) {
      throw new Error(`SAFETY ALERT: Tentativa de apagar diretório fora da base de staging: ${absStaging}`);
    }

    if (fs.existsSync(absStaging)) {
      try {
        fs.rmSync(absStaging, { recursive: true, force: true });
        return { success: true, stagingDir: absStaging };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, stagingDir: absStaging };
  }

  _copyRecursiveSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const ent of entries) {
      const srcPath = path.join(src, ent.name);
      const destPath = path.join(dest, ent.name);

      if (ent.isDirectory()) {
        this._copyRecursiveSync(srcPath, destPath);
      } else if (ent.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

const defaultStagingPolicy = new StagingPolicy();
module.exports = defaultStagingPolicy;
module.exports.StagingPolicy = StagingPolicy;
