/**
 * rollbackResult.js — Relatório honesto de rollback para os adapters
 *
 * FASE 7 / PASSO 33 — `restoredFiles` NÃO É EVIDÊNCIA QUE NÃO EXISTE
 *
 * ---------------------------------------------------------------------------
 * O PADRÃO QUE SE REPETIA EM 11 ADAPTERS
 *
 *     async rollback(gameDir, options = {}) {
 *       const res = this.backupManager.restoreOldestBackup(gameDir);
 *       return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
 *     }
 *
 * Quando o BackupManager não devolve `restoredFiles`, o adapter preenchia a
 * lista com `gameDir` — **o diretório do jogo**. O consumidor recebia
 *
 *     restoredFiles: ["C:/Games/MeuJogo"]
 *
 * e lia isso como "um arquivo foi restaurado". É um diretório, não um
 * arquivo restaurado; e o `||` significa que a lista só era inventada quando
 * a informação verdadeira NÃO existia. Exatamente o oposto de um relatório.
 *
 * Pior: `success` vinha de `res.success`, e o inventário de arquivos vinha de
 * um `||` inventado. Um consumidor que conferisse "success && restoredFiles
 * não vazio" receberia a impressão de um rollback comprovado com um arquivo
 * restaurado, quando nada tinha sido confirmado.
 *
 * ---------------------------------------------------------------------------
 * A REGRA
 *
 * `restoredFiles` é a lista REAL de arquivos restaurados, ou `null` quando não
 * se sabe. Nunca um diretório, nunca um placeholder. Quando o backup manager
 * não informa, a resposta diz que não informa — e o consumidor decide.
 */

'use strict';

/**
 * Normaliza o retorno de um rollback.
 *
 * @param {object} res       retorno de backupManager.restore/restoreOldestBackup
 * @param {string} engine    id do engine, para diagnóstico
 * @param {object} [extra]   campos adicionais a juntar
 * @returns {{success:boolean, restored:boolean, restoredFiles:string[]|null,
 *            restoredCount:number|null, engine:string,
 *            verified:boolean, detail:string|null, warning:string|null}}
 */
function rollbackResult(res, engine, extra = {}) {
  const rawList = res && (res.restoredFiles || res.files || res.restored);
  const hasList = Array.isArray(rawList);
  // Uma lista vazia é informação ("nada foi restaurado"), não ausência.
  const restoredFiles = hasList ? rawList.slice() : null;

  const success = Boolean(res && res.success === true);
  const restoredCount = hasList
    ? restoredFiles.length
    : (typeof (res && res.restoredCount) === 'number' ? res.restoredCount : null);

  // "Verificado" significa: a lista de arquivos restaurados foi conferida.
  // Sem lista, não há o que conferir.
  const verified = success && hasList && restoredFiles.length > 0;

  let warning = null;
  if (success && !verified) {
    warning = 'O rollback reportou sucesso, mas não informou quais arquivos '
      + 'foram restaurados. Não é possível confirmar que o jogo está inteiro. '
      + 'Verifique os arquivos antes de continuar.';
  }
  if (!success) {
    warning = 'O rollback NÃO foi confirmado. O jogo pode estar em estado '
      + 'parcial; verifique os arquivos antes de tentar de novo.';
  }

  return {
    success,
    // `restored` só é true quando há lista com conteúdo.
    restored: verified,
    restoredFiles,
    restoredCount,
    engine: engine || 'unknown',
    verified,
    isPerfectRestore: res && typeof res.isPerfectRestore === 'boolean'
      ? res.isPerfectRestore
      : null,
    detail: (res && (res.detail || res.reason || res.error)) || null,
    warning,
    ...extra,
  };
}

module.exports = { rollbackResult };
