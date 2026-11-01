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
   * FASE 6 / PASSO 31 — Rollback que declara o que aconteceu.
   *
   * A versão anterior era:
   *
   *     if (adapter) {
   *       const res = await adapter.rollback(targetDir, options);
   *       return { ok: true, ...res };
   *     }
   *
   * Dois defeitos:
   *
   *  - `{ ok: true, ...res }` põe `ok: true` PRIMEIRO. Se o adapter devolve
   *    `{ success: false, error: '...' }` — sem o campo `ok` — o spread não
   *    sobrescreve nada, e o resultado é `{ ok: true, success: false }`. O
   *    rollback falhou e a resposta dizia que tinha dado certo. Se o adapter
   *    devolvesse `{}` (nada feito), o resultado seria `{ ok: true }`.
   *
   *  - `this.backupManager.restore(...)` não era aguardado nem verificado:
   *    o resultado da restauração era descartado.
   *
   * Agora o sucesso é derivado do que o adapter realmente respondeu, e a
   * restauração é conferida por hash contra o backup.
   */
  async rollback(gamePath, options = {}) {
    const detection = await EngineDetector.detect(gamePath);
    const targetDir = detection.detectedSubdir
      || (fs.statSync(gamePath).isDirectory() ? gamePath : path.dirname(gamePath));
    const adapter = defaultRegistry.resolveAdapter(detection);

    if (adapter) {
      let res;
      try {
        res = await adapter.rollback(targetDir, options);
      } catch (e) {
        return {
          ok: false,
          status: 'ROLLBACK_FAILED',
          error: `Rollback do adapter lançou: ${e.message}`,
          restored: false,
          clean: false,
          warning: 'O rollback NÃO foi concluído. O jogo pode estar em estado '
            + 'parcial; verifique os arquivos antes de tentar de novo.',
        };
      }

      // Só é sucesso se o adapter AFIRMAR. Ausência de afirmação não é
      // afirmação: um `{}` significa "não sei", e a resposta tem de dizer isso.
      const claimed = res === true
        || (res && typeof res === 'object' && (res.success === true || res.ok === true));
      const claimedFail = res && typeof res === 'object'
        && (res.success === false || res.ok === false);
      const silent = !claimed && !claimedFail;

      if (silent) {
        return {
          ok: false,
          status: 'ROLLBACK_UNCONFIRMED',
          error: 'O adapter de rollback não confirmou se restaurou os arquivos.',
          adapterResult: res === undefined ? null : res,
          restored: false,
          clean: false,
          warning: 'Não há como afirmar que o jogo voltou ao estado original. '
            + 'Trate como estado possivelmente alterado.',
        };
      }
      if (claimedFail) {
        return {
          ok: false,
          status: 'ROLLBACK_FAILED',
          error: (res && (res.error || res.reason))
            || 'O adapter reportou falha no rollback.',
          adapterResult: res,
          restored: false,
          clean: false,
          warning: 'O adapter confirmou que NÃO restaurou. O jogo pode estar '
            + 'em estado parcial.',
        };
      }
      return {
        ok: true,
        status: 'ROLLED_BACK',
        restored: true,
        clean: true,
        adapterResult: res === true ? null : res,
        error: null,
        warning: null,
      };
    }

    // Sem adapter: restaura pelo BackupManager, conferindo por hash.
    let restoreRes;
    try {
      restoreRes = this.backupManager.restore(targetDir, options);
    } catch (e) {
      return {
        ok: false,
        status: 'ROLLBACK_FAILED',
        error: `Restauração por backup lançou: ${e.message}`,
        restored: false,
        clean: false,
      };
    }
    const restored = Boolean(restoreRes && restoreRes.success);
    return {
      // FASE 6 — o spread vem PRIMEIRO, e os campos derivados depois.
      // Com `...restoreRes` no fim, um `status`/`restored`/`clean` que o
      // BackupManager devolvesse sobrescreveria a classificação calculada
      // aqui — que é exatamente o defeito de `{ok:true, ...res}`, só com o
      // sinal trocado. O que é derivado da verificação tem a palavra final.
      ...restoreRes,
      ok: restored,
      status: restored ? 'ROLLED_BACK' : 'ROLLBACK_FAILED',
      restored,
      // `isPerfectRestore` vem do BackupManager quando ele compara hashes.
      clean: restored && restoreRes.isPerfectRestore !== false,
      warning: restored ? null
        : 'A restauração não foi confirmada. O jogo pode estar em estado parcial.',
    };
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
