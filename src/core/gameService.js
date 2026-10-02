const StrategyPlanner = require("./strategyPlanner");
const transactionJournal = require("./transactionJournal");
/**
 * OpenTranslator — GameService 2.0
 * Camada de serviço de alto nível unificada.
 * Centraliza detecção, diagnósticos, orquestração de jobs, pipelines de tradução,
 * checkpoints, backups transacionais, self-tests e gerenciamento seguro de processos.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const EngineDetector = require("./engineDetector");
const defaultRegistry = require("./engineRegistry");
const TranslationPipeline = require("./translationPipeline");
const jobSystem = require("./jobSystem");
const ownedProcessManager = require("./ownedProcess");
const BackupManager = require("./backupManager");
const SelfTest = require("./selfTest");
const DiagnosticBundle = require("./diagnosticBundle");
const translationMemory = require("./translationMemory");

class GameService {
  constructor() {
    this.pipeline = new TranslationPipeline();
    this.backupManager = new BackupManager();
  }

  /**
   * Analisa profundamente um jogo e gera diagnósticos técnicos sem tocar em nenhum arquivo.
   */
  async analyzeGame(gamePath) {
    if (!gamePath || !fs.existsSync(gamePath)) {
      return { ok: false, error: "Caminho do jogo inválido ou não encontrado." };
    }

    const detection = await EngineDetector.detect(gamePath);
    const targetDir = detection.detectedSubdir || (fs.statSync(gamePath).isDirectory() ? gamePath : path.dirname(gamePath));
    const adapter = defaultRegistry.resolveAdapter(detection);
    const caps = adapter ? adapter.getCapabilities(targetDir, gamePath) : detection.capabilities;
    const strategyPlan = StrategyPlanner.plan(detection, gamePath);

    return {
      ok: true,
      gamePath,
      targetDir,
      engine: detection.engine,
      engineVersion: detection.engineVersion,
      architecture: detection.architecture,
      confidence: Math.round(detection.confidence * 100),
      evidence: detection.evidence,
      warnings: detection.warnings,
      capabilities: caps,
      cacheHitRate: translationMemory.getHitRate(),
      strategies: strategyPlan.strategies,
      recommendedStrategy: strategyPlan.preferred,
      fallbacks: strategyPlan.fallbacks,
      blockedStrategies: strategyPlan.blocked
    };
  }

  /**
   * Executa um Dry-Run preliminar sem aplicar nenhuma modificação.
   */
  async dryRun(gamePath, options = {}) {
    return await this.pipeline.dryRun(gamePath, options);
  }

  /**
   * Aplica a tradução diretamente via adapter ou pipeline.
   */
  async applyTranslation(gamePath, options = {}) {
    const detection = await EngineDetector.detect(gamePath);
    const targetDir = detection.detectedSubdir || (fs.statSync(gamePath).isDirectory() ? gamePath : path.dirname(gamePath));
    const adapter = defaultRegistry.resolveAdapter(detection);
    if (adapter) {
      return await adapter.apply(targetDir, options.texts || [], options.translations || new Map(), options);
    }
    return await this.pipeline.run(gamePath, options);
  }

  /**
   * Inicia um job de tradução completo assíncrono com checkpoints em disco.
   */
  async startTranslationJob(gamePath, options = {}) {
    const job = jobSystem.createJob(gamePath, options);
    jobSystem.updateProgress(job.id, "analyzing", 0, 0, { status: "running" });

    (async () => {
      try {
        const detection = await EngineDetector.detect(gamePath);
        jobSystem.updateProgress(job.id, "extracting", 0, 0, { engine: detection.engine });

        const res = await this.pipeline.run(gamePath, {
          ...options,
          onProgress: (stage, current, total) => {
            jobSystem.updateProgress(job.id, stage, current, total);
          }
        });

        if (res.success) {
          jobSystem.updateProgress(job.id, "completed", res.totalStrings || 0, res.totalStrings || 0, { status: "completed" });
          jobSystem.saveCheckpoint(job.id, { result: res, completedAt: new Date().toISOString() });
        } else {
          jobSystem.updateProgress(job.id, "failed", 0, 0, { status: "failed", error: res.error });
        }
      } catch (err) {
        jobSystem.updateProgress(job.id, "failed", 0, 0, { status: "failed", error: err.message });
      }
    })();

    return { ok: true, jobId: job.id };
  }

  getJob(jobId) {
    const job = jobSystem.getJob(jobId);
    if (!job) return { ok: false, error: "Job não encontrado." };
    return { ok: true, job };
  }

  listJobs() {
    return { ok: true, jobs: jobSystem.listJobs() };
  }

  /**
   * Desfaz todas as alterações e restaura os arquivos originais.
   */
  async rollback(gamePath, options = {}) {
    const detection = await EngineDetector.detect(gamePath);
    const targetDir = detection.detectedSubdir || (fs.statSync(gamePath).isDirectory() ? gamePath : path.dirname(gamePath));
    const adapter = defaultRegistry.resolveAdapter(detection);

    if (adapter) {
      const res = await adapter.rollback(targetDir, options);
      return { ok: true, ...res };
    }

    const restoreRes = this.backupManager.restore(targetDir, options);
    return { ok: restoreRes.success, ...restoreRes };
  }

  /**
   * Executa o jogo de forma segura, registrando a instância no OwnedProcess.
   * Não encerra processos externos do usuário.
   */
  launchGame(exePath, options = {}) {
    if (!exePath || !fs.existsSync(exePath)) {
      return { ok: false, error: "Executável não encontrado." };
    }

    const gameDir = path.dirname(exePath);
    try {
      const child = spawn(exePath, options.args || [], {
        cwd: gameDir,
        detached: true,
        stdio: "ignore"
      });

      ownedProcessManager.register(child, {
        exePath,
        gameKey: path.basename(gameDir)
      });

      if (global.log) global.log("info", "[GameService] Jogo iniciado com sucesso. PID pertencente: " + child.pid);
      return { ok: true, pid: child.pid };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  selfTest() {
    return SelfTest.runAll();
  }

  exportDiagnosticBundle() {
    return DiagnosticBundle.generateReport();
  }
}

const gameService = new GameService();
module.exports = gameService;
