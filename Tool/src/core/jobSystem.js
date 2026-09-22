/**
 * OpenTranslator — JobSystem & Checkpoint Manager
 * Gerencia operações longas de tradução de forma assíncrona, não bloqueante,
 * com persistência de checkpoints em disco e recuperação contra falhas.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class JobSystem {
  constructor(options = {}) {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    this.jobsDir = options.jobsDir || path.join(root, "data", "jobs");
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
    this.memoryJobs = new Map();
  }

  /**
   * Cria um novo job de tradução assíncrono.
   */
  createJob(gameDir, options = {}) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const job = {
      id: jobId,
      gameDir,
      gameName: path.basename(gameDir),
      engine: options.engine || "detecting",
      status: "queued",
      progress: 0,
      currentStage: "queued",
      totalStrings: 0,
      processedStrings: 0,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkpointFile: path.join(this.jobsDir, `${jobId}.json`),
      isCancelled: false
    };

    this.memoryJobs.set(jobId, job);
    this.persist(job);
    return job;
  }

  /**
   * Obtém o status atual de um job (da memória ou do disco).
   */
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
   * Atualiza o progresso e o estágio atual do job.
   */
  updateProgress(jobId, stage, processed = 0, total = 0, extra = {}) {
    const job = this.getJob(jobId);
    if (!job) return;

    job.currentStage = stage;
    job.processedStrings = processed;
    if (total > 0) job.totalStrings = total;
    job.progress = job.totalStrings > 0 ? Math.min(100, Math.round((job.processedStrings / job.totalStrings) * 100)) : 0;
    job.updatedAt = new Date().toISOString();

    if (extra.engine) job.engine = extra.engine;
    if (extra.status) job.status = extra.status;
    if (extra.error) job.errors.push(extra.error);
    if (extra.warning) job.warnings.push(extra.warning);

    this.persist(job);
  }

  /**
   * Salva um checkpoint de dados (strings já traduzidas) para recuperação.
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

  /**
   * Recupera os dados do último checkpoint gravado.
   */
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
   * Cancela a execução de um job em andamento.
   */
  cancelJob(jobId) {
    const job = this.getJob(jobId);
    if (!job) return false;
    job.isCancelled = true;
    job.status = "cancelled";
    job.updatedAt = new Date().toISOString();
    this.persist(job);
    return true;
  }

  /**
   * Persiste o estado do job em disco.
   */
  persist(job) {
    try {
      fs.writeFileSync(job.checkpointFile, JSON.stringify(job, null, 2), "utf8");
    } catch (e) {}
  }

  /**
   * Lista todos os jobs recentes.
   */
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
