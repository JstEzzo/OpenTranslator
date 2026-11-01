/**
 * applyVerifier.js — Verificação pós-aplicação em disco
 *
 * FASE 2 / PASSO 22 — EVIDÊNCIA QUE FALTAVA
 *
 * O TranslationPipeline aplicava traduções via `adapter.apply(...)` e depois
 * declarava o resultado olhando o que o próprio adapter *disse* ter feito.
 * `applyResult.count` é a intenção do adapter, não a realidade do disco.
 *
 * Um adapter que grava 800 de 1000 textos e reporta `count: 1000` produzia
 * um certificado afirmando 100% aplicado. Ninguém reabria os arquivos para
 * conferir. Era a forma mais comum de "sucesso" falso neste projeto: não
 * exigia má-fé, apenas ausência de verificação.
 *
 * Este módulo fecha o ciclo: depois de aplicar, ele REEXTRAI o texto do disco
 * e confere, de forma independente do que o adapter declarou.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NÃO INDEXAR POR ID
 *
 * A primeira versão desta verificação indexava o disco pela chave do texto e
 * comparava a chave com a tradução. Isso é circular: se a chave É o conteúdo,
 * uma chave que casa já prova que o conteúdo casou, e o caso mais importante
 * — "a posição certa foi preenchida com o texto errado" — fica
 * inalcançável por construção.
 *
 * Também não dá para casar por `id`: adapters geram ids a partir do conteúdo,
 * então depois de traduzir o id muda e o casamento por id nunca acontece.
 *
 * A verificação aqui é BIDIRECIONAL e independente de id:
 *   1. a tradução pedida PRECISA estar no corpus relido do disco;
 *   2. o texto original NÃO pode continuar lá (se era diferente), o que prova
 *      que o arquivo foi realmente reescrito.
 *
 * Um dos dois faltar é falha. Isso detecta tanto o adapter que mente sobre a
 * contagem quanto o adapter que grava no lugar errado.
 */

'use strict';

const crypto = require('crypto');

/** Normaliza para comparação: espaços colapsados, quebras unified, minúsculo. */
function normalizeForCompare(s) {
  return String(s == null ? '' : s)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Chave de comparação: normalizada e em minúsculas. */
function normKey(s) {
  return normalizeForCompare(s).toLowerCase();
}

/** Extrai o texto visível de uma entrada, seja ela vinda do pipeline ou do adapter. */
function visibleText(entry) {
  if (entry === null || entry === undefined) return '';
  if (typeof entry === 'string') return entry;
  const candidates = [
    entry.clean,
    entry.translated,
    entry.text,
    entry.original,
    entry.source,
    entry.value,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c !== '') return c;
  }
  return '';
}

/** Aceita os formatos que os adapters usam para devolver a extração. */
function extractTextList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.texts)) return res.texts;
  if (res && Array.isArray(res.entries)) return res.entries;
  if (res && Array.isArray(res.items)) return res.items;
  return null;
}

/** Hash curto do conjunto verificado, para rastreabilidade do certificado. */
function evidenceHash(entries) {
  const h = crypto.createHash('sha256');
  for (const [k, v] of entries.slice().sort()) {
    h.update(k).update('\u0000').update(String(v)).update('\u0001');
  }
  return h.digest('hex').slice(0, 32);
}

/**
 * Verifica, relendo o disco, se as traduções aplicadas estão presentes.
 *
 * @param {object} args
 * @param {object} args.adapter        adapter usado (precisa de `extract`)
 * @param {string} args.targetDir      diretório alvo
 * @param {Array}  args.texts          textos originais extraídos
 * @param {Map}    args.translations   id -> tradução aplicada
 * @param {object} [args.options]      opções passadas ao adapter
 * @returns {Promise<object>} relatório de verificação
 */
async function verifyApplied({
  adapter, targetDir, texts, translations, options = {},
}) {
  const report = {
    verified: false,
    method: 'POST_APPLY_REEXTRACT',
    checked: 0,
    present: 0,
    missing: 0,
    stillOriginal: 0,
    missingSample: [],
    reextractFailed: null,
    evidenceHash: null,
    verificationPercent: 0,
  };

  if (!translations || translations.size === 0) {
    report.reason = 'nenhuma tradução para verificar';
    return report;
  }

  // ---- Reextrai do disco. Se não conseguir, a verificação é inconclusiva. ----
  let onDisk;
  try {
    onDisk = extractTextList(await adapter.extract(targetDir, options));
  } catch (e) {
    report.reextractFailed = e.message;
    report.reason = `reextração falhou: ${e.message}`;
    return report;
  }

  if (!onDisk || onDisk.length === 0) {
    report.reextractFailed = onDisk === null
      ? 'reextração devolveu formato desconhecido'
      : 'reextração devolveu lista vazia';
    report.reason = report.reextractFailed;
    return report;
  }

  // Corpus relido do disco, como multiconjunto para respeitar repetições.
  const diskCorpus = new Map();
  for (const entry of onDisk) {
    const k = normKey(visibleText(entry));
    if (!k) continue;
    diskCorpus.set(k, (diskCorpus.get(k) || 0) + 1);
  }
  // Consome uma ocorrência: respeita texto repetido no jogo (a mesma linha
  // pode aparecer 30 vezes e ser esperada 30 vezes).
  const consume = (k) => {
    const n = diskCorpus.get(k);
    if (n && n > 0) { diskCorpus.set(k, n - 1); return true; }
    return false;
  };

  // ---- Confere cada tradução esperada contra o corpus relido. ----
  const pairs = [];
  for (const t of texts) {
    if (!t) continue;
    const translated = translations.get(t.id);
    if (translated === undefined || translated === null || translated === '') continue;

    report.checked++;
    const wantedKey = normKey(translated);
    const originalKey = normKey(
      t.clean !== undefined ? t.clean : (t.original !== undefined ? t.original : t.text),
    );
    const isIdentity = wantedKey === originalKey;

    // 1) A tradução tem que estar lá.
    const translatedPresent = consume(wantedKey);
    if (!translatedPresent) {
      report.missing++;
      if (report.missingSample.length < 20) {
        report.missingSample.push({
          original: String(visibleText(t)).slice(0, 80),
          expected: String(translated).slice(0, 80),
          reason: 'tradução ausente na releitura do disco',
        });
      }
      pairs.push([wantedKey.slice(0, 64), 'MISSING']);
      continue;
    }
    report.present++;

    // 2) Se era uma tradução de verdade, o original não pode continuar lá.
    //    Se estiver, o arquivo não foi reescrito neste ponto.
    if (!isIdentity && consume(originalKey)) {
      report.stillOriginal++;
      if (report.missingSample.length < 20) {
        report.missingSample.push({
          original: String(visibleText(t)).slice(0, 80),
          expected: String(translated).slice(0, 80),
          reason: 'o texto original ainda está presente: arquivo possivelmente não reescrito',
        });
      }
      pairs.push([wantedKey.slice(0, 64), 'STILL_ORIGINAL']);
      continue;
    }

    pairs.push([wantedKey.slice(0, 64), 'MATCH']);
  }

  report.evidenceHash = evidenceHash(pairs);
  report.verificationPercent = report.checked > 0
    ? Math.round((report.present / report.checked) * 100)
    : 0;

  // Só é "verificado" quando TODO esperado está presente e nada ficou pelo
  // caminho. Falha de verificação é falha, nunca success.
  const flawless = report.checked > 0 && report.missing === 0 && report.stillOriginal === 0;
  report.verified = flawless;
  if (!flawless) {
    const parts = [];
    if (report.missing > 0) parts.push(`${report.missing} ausente(s)`);
    if (report.stillOriginal > 0) parts.push(`${report.stillOriginal} ainda com o texto original`);
    report.reason = `${parts.join(', ')} de ${report.checked} traduções esperadas.`;
  }
  return report;
}

module.exports = {
  verifyApplied,
  normalizeForCompare,
  normKey,
  visibleText,
  extractTextList,
  evidenceHash,
};
