/**
 * src/core/partialApply.js — Semântica ÚNICA para "deu certo, mas não tudo"
 *
 * ===========================================================================
 * FASE 9 / PASSO 49 — POR QUE ISTO EXISTE
 * ===========================================================================
 *
 * Vinte e tantos adapters tinham o MESMO código, escrito à mão em cada um:
 *
 *     for (const file of files) {
 *       try {
 *         ...escreve...
 *       } catch (e) {}          <-- a falha desaparece
 *     }
 *     return { success: true, count: n, modifiedFiles: [...] };
 *
 * O `count` era honesto: contava só o que deu certo. Mas `success: true`
 * afirmava que o jogo inteiro foi traduzido. O usuário recebia "aplicado com
 * sucesso", o log confirmava, e o jogo abria com metade das linhas ainda no
 * idioma original — sem nenhum indício de por quê.
 *
 * Para o `extract()` o dano é pior. O `buildUniverse()` (FASE 4) deriva o
 * total do adapter. Se a extração engoliu metade dos arquivos, o universo
 * fica menor, a cobertura exigida cai junto, e o certificado pode emitir
 * `COMPLETED` sobre um jogo que nunca foi visto por inteiro. A falha não
 * aparece em log, nem em status, nem no certificado: ela se manifesta como
 * um número de cobertura menor, que parece um resultado legítimo.
 *
 * ===========================================================================
 * A REGRA
 * ===========================================================================
 *
 * "Não falhou em nada" e "falhou em alguma coisa" são resultados DIFERENTES,
 * e o chamador precisa poder distinguir. Este módulo dá a essa distinção um
 * único lugar, para que não dependa de cada autor lembrar de escrevê-la:
 *
 *     const acc = new PartialReport();
 *     for (const f of files) {
 *       try { ... } catch (e) { acc.fail(f, e); }
 *     }
 *     return acc.report({ success: true, count: n, modifiedFiles: [...] });
 *
 * `report()` devolve `success: false` se houve QUALQUER falha, e inclui a
 * lista. Os campos que o chamador já passava são preservados.
 *
 * ===========================================================================
 * O QUE ESTE MÓDULO NÃO FAZ
 * ===========================================================================
 *
 * Não decide se uma falha deve ser tolerada. Isso é do adapter: alguns
 * engines pulam arquivos por design (opcional, minificado, irrelevante), e
 * esses o adapter usa `acc.skip()` em vez de `acc.fail()` — e a diferença
 * fica visível no relatório em vez de silenciosa.
 *
 * Não engole nada. `fail()` guarda a mensagem, o arquivo e a pilha. Um
 * relatório que diz "3 arquivos falharam" sem dizer por quê é tão inútil
 * quanto o `catch` vazio.
 */

'use strict';

class PartialReport {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxList] Quantas falhas detalhar no relatório.
   *   A contagem nunca é truncada; só a lista. Motivo: um adapter que falha
   *   em 5.000 arquivos não deve devolver um objeto de 5 MB, mas o número
   *   5.000 é a informação que importa.
   */
  constructor(opts = {}) {
    this.maxList = Number.isInteger(opts.maxList) ? opts.maxList : 20;
    this.failures = [];
    this.skips = [];
    this.total = 0;
  }

  /** Um item foi processado com sucesso. */
  ok() {
    this.total++;
    return this;
  }

  /** Um item FALHOU. `alvo` é o que identifica o item (caminho, id, chave). */
  fail(alvo, erro) {
    this.total++;
    this.failures.push({
      alvo: typeof alvo === 'string' ? alvo : String(alvo),
      error: erro && erro.message ? erro.message : String(erro),
    });
    return this;
  }

  /**
   * Um item foi deliberadamente PULADO (opcional, irrelevante, minificado).
   * Não é falha — mas também não some do relatório.
   */
  skip(alvo, motivo) {
    this.total++;
    this.skips.push({
      alvo: typeof alvo === 'string' ? alvo : String(alvo),
      motivo: motivo || 'não aplicável',
    });
    return this;
  }

  get failed() { return this.failures.length > 0; }
  get partial() { return this.failures.length > 0; }
  get complete() { return this.failures.length === 0; }

  /**
   * Monta o objeto de resposta.
   *
   * @param {object} base Campos que o adapter sempre devolve (`count`,
   *   `modifiedFiles`, `texts`...). Preservados como vieram.
   * @returns {object} Resposta com `success` corrigido e o relatório anexado.
   */
  report(base = {}) {
    const out = { ...base };
    const partial = this.failed;

    // `success` só é verdade quando NADA falhou. O chamador que passa
    // `success: true` está descrevendo a intenção; quem decide é isto.
    out.success = !partial;
    out.status = partial ? 'PARTIAL' : 'COMPLETE';
    out.processed = this.total;
    out.failedCount = this.failures.length;
    out.skippedCount = this.skips.length;

    out.failures = this.failures.slice(0, this.maxList);
    if (this.failures.length > this.maxList) {
      out.failuresTruncated = this.failures.length - this.maxList;
    }
    if (this.skips.length) {
      out.skips = this.skips.slice(0, this.maxList);
    }

    out.warning = partial
      ? `${this.failures.length} de ${this.total} item(ns) não puderam ser `
        + 'processados. O resultado é PARCIAL e a próxima execução tentará de novo.'
      : null;

    // Campos que existiam e agora mentem sobre a completude.
    if (partial && out.count !== undefined) {
      out.countIsPartial = true;
    }
    return out;
  }
}

/**
 * Convenience: um relatório já completo, para adapters sem itens parciais.
 * Existe para não obrigar a criar um PartialReport só para não ter falha.
 */
function complete(base = {}) {
  return new PartialReport().report(base);
}

module.exports = { PartialReport, complete };
