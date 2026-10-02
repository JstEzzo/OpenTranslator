/**
 * OpenTranslator - RealGameWorkflow
 * 
 * Orquestrador do fluxo de testes em jogos reais do laboratório.
 * 
 * Em conformidade com as diretrizes da Fase 8A:
 * - Separa estritamente testes de mutação simulada (SIMULATED_MUTATION_TEST)
 *   do fluxo de tradução factual real (REAL_TRANSLATION_TEST).
 * - NUNCA rotula mutações genéricas como tradução real.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BackupManager = require('./backupManager');
const EngineDetector = require('./engineDetector');
const RealTranslationWorkflow = require('./realTranslationWorkflow');

class RealGameWorkflow {
  constructor(options = {}) {
    this.stagingBase = options.stagingBase || path.resolve(__dirname, '../../data/staging');
    this.backupManager = new BackupManager({ backupDirName: '.ot_workflow_bk' });
    this.realTranslationWorkflow = new RealTranslationWorkflow({ stagingBase: this.stagingBase });
    if (!fs.existsSync(this.stagingBase)) {
      fs.mkdirSync(this.stagingBase, { recursive: true });
    }
  }

  /**
   * Cria uma cópia de staging segura de arquivos vitais do jogo
   */
  createStagingCopy(sourceDir, testId = 'game_e2e') {
    const stagingDir = path.join(this.stagingBase, `${testId}_${Date.now()}`);
    fs.mkdirSync(stagingDir, { recursive: true });

    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const ent of entries) {
        if (['.git', '.svn', 'node_modules'].includes(ent.name)) continue;
        const srcPath = path.join(src, ent.name);
        const destPath = path.join(dest, ent.name);
        if (ent.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(sourceDir, stagingDir);
    return stagingDir;
  }

  /**
   * Teste de mutação simulada (exclusivo para validar mecânicas de backup e rollback)
   * Classificação oficial: SIMULATED_MUTATION_TEST (NÃO é teste de tradução)
   */
  async runSimulatedMutationTest(gameDir) {
    const targetFiles = [];
    const originalHashes = new Map();

    const scan = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith('.')) scan(full);
          else if (ent.isFile() && ['.json', '.rpy', '.csv', '.txt'].includes(path.extname(ent.name).toLowerCase())) {
            targetFiles.push(full);
            originalHashes.set(full, crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
          }
        }
      } catch (e) {}
    };
    scan(gameDir);

    if (targetFiles.length === 0) return { success: false, error: 'No files' };

    const bk = this.backupManager.createBackup(gameDir, targetFiles, { reason: 'SimulatedMutationTest' });
    const modified = [];

    for (const f of targetFiles.slice(0, 2)) {
      const orig = fs.readFileSync(f, 'utf8');
      fs.writeFileSync(f, orig + '\n# MutationTestMarker', 'utf8');
      modified.push(f);
    }

    const restore = this.backupManager.restore(gameDir, bk.backupId);
    let verified = true;
    for (const [f, origHash] of originalHashes.entries()) {
      if (crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== origHash) {
        verified = false;
      }
    }

    return {
      type: 'SIMULATED_MUTATION_TEST',
      success: verified,
      rollbackVerified: verified,
      restoredCount: restore.restoredCount
    };
  }

  /**
   * Executa o ciclo REAL de tradução ponta a ponta
   * Classificação oficial: REAL_TRANSLATION_TEST
   */
  async runFullCycle(gameDir, options = {}) {
    const detection = await EngineDetector.detect(gameDir);
    const realResult = await this.realTranslationWorkflow.runRealCycle(gameDir);

    return {
      type: 'REAL_TRANSLATION_TEST',
      engine: detection.engine,
      ...realResult
    };
  }
}

module.exports = RealGameWorkflow;
