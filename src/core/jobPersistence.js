/**
 * OpenTranslator — JobPersistence
 * Gerenciador de persistência e retomada de tarefas de tradução.
 * Permite que um processo interrompido (Ctrl+C, crash, queda de conexão) continue
 * exatamente de onde parou sem retraduzir lotes já concluídos.
 */

const fs = require('fs');
const path = require('path');

class JobPersistence {
  constructor(options = {}) {
    const defaultDataDir = global.DATA_DIR || (global.ROOT ? (path.basename(global.ROOT) === 'Tool' ? path.join(global.ROOT, 'data') : path.join(global.ROOT, 'Tool', 'data')) : path.resolve(__dirname, '../../data'));
    this.sessionDir = options.sessionDir || path.join(defaultDataDir, 'sessions');
    if (!fs.existsSync(this.sessionDir)) fs.mkdirSync(this.sessionDir, { recursive: true });
  }

  getJobFilePath(jobId) {
    return path.join(this.sessionDir, `job_${jobId}.json`);
  }

  saveJob(jobState) {
    const filePath = this.getJobFilePath(jobState.jobId);
    fs.writeFileSync(filePath, JSON.stringify({
      ...jobState,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');
    return filePath;
  }

  loadJob(jobId) {
    const filePath = this.getJobFilePath(jobId);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  deleteJob(jobId) {
    const filePath = this.getJobFilePath(jobId);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); return true; } catch (e) {}
    }
    return false;
  }
}

const defaultJobPersistence = new JobPersistence();
module.exports = defaultJobPersistence;
module.exports.JobPersistence = JobPersistence;
