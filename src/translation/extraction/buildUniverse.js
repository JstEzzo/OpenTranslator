/**
 * FASE 4 / PASSO 29 — Constroi o UNIVERSO de textos de forma honesta.
 *
 * O certificado usava `texts.length` como total detectado e como tradutível.
 * Isso tornava a cobertura 100% por construção: o denominador era o
 * numerador. Um adapter que lesse 200 dos 3.000 textos de um jogo reportaria
 * "tradução 100% completa".
 *
 * O universo correto vem do próprio adapter, que é quem sabe o que encontrou
 * no jogo. Os adapters podem declarar isso em campos como:
 *   totalDetected, totalStrings, universeSize, detectedTotal, totalFound
 *
 * Quando o adapter NÃO declara, a resposta correta é dizer que o universo é
 * desconhecido — e não assumir que o que vimos é tudo.
 *
 * @param {object} args
 * @param {object} args.extractResult retorno de adapter.extract()
 * @param {Array}  args.texts          textos efetivamente carregados
 * @param {object} args.options
 * @param {object} [args.coverageReport]
 * @returns {{totalDetected:number, translatable:number, complete:boolean,
 *            unknown:boolean, unseenCount:number, source:string}}
 */
function buildUniverse({ extractResult, texts, options = {}, coverageReport = {} }) {
  const loaded = Array.isArray(texts) ? texts.length : 0;

  // 1. O adapter pode ter declarado o universo.
  const DECLARED_FIELDS = [
    'totalDetected', 'detectedTotal', 'totalStrings', 'universeSize', 'totalFound',
  ];
  let declared = null;
  let declaredField = null;
  if (extractResult && typeof extractResult === 'object') {
    for (const f of DECLARED_FIELDS) {
      const v = extractResult[f];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        declared = v;
        declaredField = f;
        break;
      }
    }
  }

  // 2. O chamador pode ter contado por fora (análise manual, inventário).
  if (declared === null && options && typeof options.totalDetected === 'number'
      && options.totalDetected > 0) {
    declared = options.totalDetected;
    declaredField = 'options.totalDetected';
  }

  if (declared !== null) {
    // O universo declarado é a referência. Textos não exibíveis não são
    // traduzíveis, então entram como pendentes do ponto de vista da
    // completude, mas não como trabalho a fazer.
    const notDisplayable = Number(coverageReport.notDisplayableCount || 0);
    const translatable = Math.max(loaded, declared - notDisplayable);
    return {
      totalDetected: declared,
      translatable,
      complete: declared >= loaded,
      unknown: false,
      unseenCount: Math.max(0, declared - loaded),
      source: `adapter.${declaredField}`,
    };
  }

  // 3. O adapter não declarou. O universo é desconhecido.
  //
  // Aqui está a parte que exige honestidade: usar `loaded` como total seria
  // afirmar que o que vimos é tudo. Registramos a incerteza e passamos a
  // contagem observada, para que o certificado não possa chamar isso de
  // cobertura completa.
  if (global.log && loaded > 0) {
    global.log('warn',
      `[Pipeline] O adapter não declarou o total de textos do jogo. A cobertura `
      + `será medida sobre ${loaded} textos EXTRAÍDOS, não sobre o jogo inteiro. `
      + 'Não é possível afirmar completude.');
  }
  return {
    totalDetected: loaded,
    translatable: loaded,
    complete: false,
    unknown: true,
    unseenCount: 0,
    source: 'EXTRACTED_ONLY',
  };
}

module.exports = { buildUniverse };