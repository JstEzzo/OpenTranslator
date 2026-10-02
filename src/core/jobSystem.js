/**
 * OpenTranslator — JobSystem & Atomic Job Manager
 * 
 * Gerencia ciclo de vida atômico, checkpoints, persistência, retomada e snapshots:
 * 
 * Estados estritos suportados:
 * CREATED, INSPECTING, EXTRACTING, TRANSLATING, APPLYING, VALIDATING,
 * VISUAL_QA, COMPLETED, PAUSED, RATE_LIMITED, FAILED, ROLLED_BACK, CANCELLED.
 * 
 * Capacidades:
 * - Retomada de jobs (Resume) sem retraduzir textos confirmados
 * - Aplicação transacional: Snapshot -> Apply -> Validate -> Commit (ou Auto-Rollback)
 * - Translation Diff entre versões diferentes de um mesmo jogo (v1 -> v2)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const BackupManager = require("./backupManager");

const JobState = {
  CREATED: "CREATED",
  INSPECTING: "INSPECTING",
  EXTRACTING: "EXTRACTING",
  TRANSLATING: "TRANSLATING",
  APPLYING: "APPLYING",
  VALIDATING: "VALIDATING",
  VISUAL_QA: "VISUAL_QA",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
  RATE_LIMITED: "RATE_LIMITED",
  FAILED: "FAILED",
  ROLLED_BACK: "ROLLED_BACK",
  CANCELLED: "CANCELLED"
};

class JobSystem {
  constructor(options = {}) {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    this.jobsDir = options.jobsDir || path.join(root, "data", "jobs");
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
    this.memoryJobs = new Map();
    this.backupManager = new BackupManager();
  }

  /**
   * Cria um novo job atômico de localização.
   */
  createJob(gameDir, options = {}) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const job = {
      id: jobId,
      gameDir,
      gameName: path.basename(gameDir),
      engine: options.engine || "detecting",
      targetLang: options.targetLang || options.tl || "pt",
      state: JobState.CREATED,
      progress: 0,
      currentStage: "CREATED",
      textsFound: 0,
      textsTranslated: 0,
      textsPending: 0,
      errors: [],
      warnings: [],
      provider: options.provider || "google",
      cacheHits: 0,
      runtimeOnly: 0,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshot: null,
      checkpointFile: path.join(this.jobsDir, `${jobId}.json`),
      modifiedFiles: [],
      rollbackAvailable: false,
      isCancelled: false
    };

    this.memoryJobs.set(jobId, job);
    this.persist(job);
    return job;
  }

  getJob(jobId) {
    if (this.memoryJobs.has(jobId)) return this.memoryJobs.get(jobId);
    const diskPath = path.join(this.jobsDir, `${jobId}.json`);
    if (fs.existsSync(diskPath)) {
      try {
        const job = JSON.parse(fs.readFileSync(diskPath, "utf8"));
        this.memoryJobs.set(jobId, job);
        return job;
      } catch (e) {}
    }
    return null;
  }

  /**
   * Atualiza o estado e progresso do job.
   */
  updateJobState(jobId, state, extra = {}) {
    const job = this.getJob(jobId);
    if (!job) return null;

    if (JobState[state]) {
      job.state = JobState[state];
      job.currentStage = JobState[state];
    }

    if (extra.progress !== undefined) job.progress = extra.progress;
    if (extra.textsFound !== undefined) job.textsFound = extra.textsFound;
    if (extra.textsTranslated !== undefined) job.textsTranslated = extra.textsTranslated;
    if (extra.textsPending !== undefined) job.textsPending = extra.textsPending;
    if (extra.cacheHits !== undefined) job.cacheHits = extra.cacheHits;
    if (extra.runtimeOnly !== undefined) job.runtimeOnly = extra.runtimeOnly;
    if (extra.provider !== undefined) job.provider = extra.provider;
    if (extra.engine !== undefined) job.engine = extra.engine;
    if (extra.modifiedFiles) job.modifiedFiles = extra.modifiedFiles;
    if (extra.snapshot) job.snapshot = extra.snapshot;
    if (extra.rollbackAvailable !== undefined) job.rollbackAvailable = extra.rollbackAvailable;

    if (extra.error) job.errors.push(extra.error);
    if (extra.warning) job.warnings.push(extra.warning);

    job.updatedAt = new Date().toISOString();
    this.persist(job);
    return job;
  }

  /**
   * Cria um Snapshot antes da aplicação transacional.
   */
  createSnapshot(jobId, gameDir, filesToModify = []) {
    const job = this.getJob(jobId);
    const backupRes = this.backupManager.createBackup(gameDir, filesToModify, {
      jobId,
      engine: job ? job.engine : "unknown"
    });

    const snapshot = {
      snapshotId: `snap_${jobId}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      backupDir: backupRes.backupDir,
      filesCount: backupRes.count || filesToModify.length
    };

    if (job) {
      job.snapshot = snapshot;
      job.rollbackAvailable = backupRes.success;
      this.persist(job);
    }

    return snapshot;
  }

  /**
   * Grava um checkpoint com os pares de tradução já resolvidos.
   */
  saveCheckpoint(jobId, checkpointData) {
    const job = this.getJob(jobId);
    if (!job) return;

    const cpPath = path.join(this.jobsDir, `${jobId}_checkpoint.json`);
    try {
      fs.writeFileSync(cpPath, JSON.stringify(checkpointData), "utf8");
      job.hasCheckpoint = true;
      job.checkpointTime = new Date().toISOString();
      this.persist(job);
    } catch (e) {
      if (global.log) global.log("warn", `[JobSystem] Falha ao gravar checkpoint para ${jobId}: ${e.message}`);
    }
  }

  loadCheckpoint(jobId) {
    const cpPath = path.join(this.jobsDir, `${jobId}_checkpoint.json`);
    if (fs.existsSync(cpPath)) {
      try {
        return JSON.parse(fs.readFileSync(cpPath, "utf8"));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Retoma um job pausado ou interrompido.
   */
  resumeJob(jobId) {
    const job = this.getJob(jobId);
    if (!job) return { success: false, error: "Job não localizado." };

    const checkpoint = this.loadCheckpoint(jobId);
    const confirmedCount = checkpoint ? Object.keys(checkpoint.translations || {}).length : job.textsTranslated;

    this.updateJobState(jobId, JobState.TRANSLATING, {
      progress: job.textsFound > 0 ? Math.round((confirmedCount / job.textsFound) * 100) : 0,
      textsTranslated: confirmedCount,
      textsPending: Math.max(0, job.textsFound - confirmedCount)
    });

    return {
      success: true,
      job,
      checkpoint,
      confirmedTranslationsCount: confirmedCount,
      message: `Job retomado do checkpoint (${confirmedCount} textos já confirmados mantidos).`
    };
  }

  /**
   * Executa rollback atômico restaurando os arquivos originais.
   */
  async rollbackJob(jobId) {
    const job = this.getJob(jobId);
    if (!job || !job.gameDir) return { success: false, error: "Job ou diretório não encontrado." };

    const restoreRes = this.backupManager.restoreOldestBackup(job.gameDir);
    if (restoreRes.success) {
      this.updateJobState(jobId, JobState.ROLLED_BACK, {
        rollbackAvailable: false,
        message: "Rollback automático executado com sucesso."
      });
      return { success: true, restoredCount: restoreRes.restoredCount };
    }
    return { success: false, error: restoreRes.error };
  }

  /**
   * Finaliza com Commit atômico.
   */
  commitJob(jobId) {
    return this.updateJobState(jobId, JobState.COMPLETED, {
      progress: 100,
      textsPending: 0
    });
  }

  /**
   * Translation Diff: compara versões v1 e v2 do jogo para reaproveitar traduções existentes.
   * @param {Array<object>} oldTexts - Textos da versão 1
   * @param {Array<object>} newTexts - Textos da versão 2
   * @param {Map<string, string>|object} oldTranslations - Traduções resolvidas na v1
   * @returns {{ identical: Array, added: Array, removed: Array, reusedCount: number, pendingCount: number }}
   */
  static calculateTranslationDiff(oldTexts = [], newTexts = [], oldTranslations = new Map()) {
    const oldMap = new Map();
    for (const t of oldTexts) {
      const orig = t.original || t.clean;
      const tr = oldTranslations.get ? oldTranslations.get(t.id) : oldTranslations[t.id];
      if (orig) oldMap.set(orig, tr || null);
    }

    const newMap = new Map();
    for (const t of newTexts) {
      const orig = t.original || t.clean;
      if (orig) newMap.set(orig, t);
    }

    const identical = [];
    const added = [];
    const removed = [];

    for (const [orig, tObj] of newMap.entries()) {
      if (oldMap.has(orig)) {
        identical.push({
          text: tObj,
          existingTranslation: oldMap.get(orig)
        });
      } else {
        added.push(tObj);
      }
    }

    for (const [orig, tr] of oldMap.entries()) {
      if (!newMap.has(orig)) {
        removed.push({ original: orig, translation: tr });
      }
    }

    return {
      identical,
      added,
      removed,
      reusedCount: identical.filter(x => !!x.existingTranslation).length,
      pendingCount: added.length + identical.filter(x => !x.existingTranslation).length
    };
  }

  cancelJob(jobId) {
    return this.updateJobState(jobId, JobState.CANCELLED, { isCancelled: true });
  }

  persist(job) {
    try {
      fs.writeFileSync(job.checkpointFile, JSON.stringify(job, null, 2), "utf8");
    } catch (e) {}
  }

  listRecentJobs() {
    try {
      const files = fs.readdirSync(this.jobsDir).filter(f => f.endsWith(".json") && !f.includes("_checkpoint"));
      const jobs = [];
      for (const f of files) {
        try {
          const j = JSON.parse(fs.readFileSync(path.join(this.jobsDir, f), "utf8"));
          jobs.push(j);
        } catch (e) {}
      }
      return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }
}

const jobSystem = new JobSystem();
module.exports = jobSystem;
module.exports.JobState = JobState;
module.exports.JobSystem = JobSystem;
