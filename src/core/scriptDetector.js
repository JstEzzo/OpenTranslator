/**
 * scriptDetector.js — Detecção real de script e de "isto foi traduzido?"
 *
 * FASE 4 / PASSO 28 — CORREÇÃO DA COBERTURA IRREAL
 *
 * ---------------------------------------------------------------------------
 * O BUG
 *
 * `coverageGuarantor` decidia se um texto estava traduzido com:
 *
 *   const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean)
 *
 * Esse regex enxerga apenas kana japonês e ideogramas CJK. Para hangul
 * (coreano) ele é SEMPRE falso, e o código fazia:
 *
 *   if (!hasSource) { translations.set(t.id, clean); initialCoveredCount++; }
 *
 * Copiava o texto de origem para o mapa de traduções e contava como
 * traduzido. Um jogo coreano inteiro reportava **100% de cobertura,
 * `success: true` e zero traduções**. O mesmo valia para russo, árabe, grego,
 * tailandês e qualquer fonte não CJK.
 *
 * O projeto suporta ja, ko, zh-CN e en (`detectLang` em translator.js). A
 * cobertura sabia ler UM desses quatro, e errava justamente nos outros.
 *
 * ---------------------------------------------------------------------------
 * A REGRA
 *
 * 1. Detectar o SCRIPT DOMINANTE do texto, não apenas "tem japonês?".
 * 2. Cobertura exige que a tradução exista E que ela esteja no idioma alvo.
 * 3. Texto idêntico ao original só conta como traduzido quando o original já
 *    está no script alvo (nome próprio, sigla, código) — o que se decide por
 *    formato, não por suposição.
 */

'use strict';

/** Blocos Unicode de cada script. */
const SCRIPT_PATTERNS = Object.freeze({
  HIRAGANA: /[\u3040-\u309f]/,
  KATAKANA: /[\u30a0-\u30ff]/,
  HANGUL: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/,
  // CJK ideogramas. Exclui o subrange de compatibilidade, não usado em texto.
  HAN: /[\u4e00-\u9fff\u3400-\u4dbf]/,
  CYRILLIC: /[\u0400-\u04ff]/,
  GREEK: /[\u0370-\u03ff]/,
  ARABIC: /[\u0600-\u06ff\u0750-\u077f]/,
  HEBREW: /[\u0590-\u05ff]/,
  THAI: /[\u0e00-\u0e7f]/,
  DEVANAGARI: /[\u0900-\u097f]/,
  // Kana estendido (raro, mas existe em jogos antigos).
  KANA_EXT: /[\uff66-\uff9f]/,
});

/** Agrupa os blocos em scripts que o jogador perceives como idiomas. */
const SCRIPT_GROUPS = Object.freeze({
  JAPANESE: ['HIRAGANA', 'KATAKANA', 'KANA_EXT'],
  KOREAN: ['HANGUL'],
  CHINESE: ['HAN'],
  CYRILLIC: ['CYRILLIC'],
  GREEK: ['GREEK'],
  ARABIC: ['ARABIC'],
  HEBREW: ['HEBREW'],
  THAI: ['THAI'],
  DEVANAGARI: ['DEVANAGARI'],
  LATIN: [],
});

/** Scripts que exigem tradução quando o alvo é português (latin). */
const NON_LATIN_GROUPS = Object.freeze([
  'JAPANESE', 'KOREAN', 'CHINESE', 'CYRILLIC', 'GREEK',
  'ARABIC', 'HEBREW', 'THAI', 'DEVANAGARI',
]);

/** Remove o que não é letra, para não contar pontuação como sinal de script. */
function lettersOnly(text) {
  return String(text == null ? '' : text).replace(/[\s\p{P}\p{S}\p{N}]/gu, '');
}

/**
 * Lista os scripts presentes no texto.
 * @returns {string[]} nomes dos grupos encontrados, em ordem de aparecimento
 */
function detectScripts(text) {
  const s = String(text == null ? '' : text);
  if (!s) return [];
  const found = [];
  for (const [group, blocks] of Object.entries(SCRIPT_GROUPS)) {
    if (blocks.length === 0) continue;
    if (blocks.some((b) => SCRIPT_PATTERNS[b].test(s))) found.push(group);
  }
  // Só há latin se houver letra latina. Pisar no resto não basta.
  if (!found.length && /[A-Za-zÀ-ɏ]/.test(s)) found.push('LATIN');
  return found;
}

/**
 * Script dominante de um texto, por contagem de letras.
 * Kana vence han em japonês (um ideograma pode ser kanji; o kana é o sinal).
 *
 * @returns {string|null} nome do grupo dominante, ou null se não há letras
 */
function dominantScript(text) {
  const s = String(text == null ? '' : text);
  if (!s) return null;
  const counts = {};
  for (const [group, blocks] of Object.entries(SCRIPT_GROUPS)) {
    if (blocks.length === 0) continue;
    let n = 0;
    for (const b of blocks) {
      const m = s.match(new RegExp(SCRIPT_PATTERNS[b].source, 'g'));
      if (m) n += m.length;
    }
    if (n > 0) counts[group] = n;
  }
  // Japonês: kana é mais informativo que han. `counts` é indexado por GRUPO
  // (JAPANESE, CHINESE...), não pelo nome do bloco Unicode — consultar
  // `counts.KATAKANA` nunca encontra nada e o japonês era classificado como
  // chinês sempre que o texto tinha kanji.
  const isJapanese = Boolean(
    SCRIPT_PATTERNS.HIRAGANA.test(s)
    || SCRIPT_PATTERNS.KATAKANA.test(s)
    || SCRIPT_PATTERNS.KANA_EXT.test(s),
  );
  if (isJapanese) return 'JAPANESE';
  if (!Object.keys(counts).length) {
    return /[A-Za-zÀ-ɏ]/.test(s) ? 'LATIN' : null;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** O texto contém letra de algum script que NÃO é latin? */
function hasNonLatinScript(text) {
  return detectScripts(text).some((g) => NON_LATIN_GROUPS.includes(g));
}

/** O texto está (pelo menos em parte) em script latino? */
function hasLatinScript(text) {
  return detectScripts(text).includes('LATIN') || /[A-Za-zÀ-ɏ]/.test(String(text || ''));
}

/** Mapa de script para código de idioma, espelhando `detectLang` do translator. */
const SCRIPT_TO_LANG = Object.freeze({
  JAPANESE: 'ja',
  KOREAN: 'ko',
  CHINESE: 'zh-CN',
  CYRILLIC: 'ru',
  GREEK: 'el',
  ARABIC: 'ar',
  HEBREW: 'he',
  THAI: 'th',
  DEVANAGARI: 'hi',
  LATIN: 'en',
});

/**
 * Formatos que são legitimamente idênticos ao original mesmo quando o jogo é
 * em japonês/coreano/etc: número, símbolo, nome próprio de uma palavra,
 * placeholder puro, código.
 *
 * Estes NÃO contam como pendência porque traduzi-los não muda nada.
 */
const IDENTITY_SAFE = [
  // Só dígitos, pontuação e espaço.
  /^[\p{N}\p{P}\p{S}\s]+$/u,
  // Placeholder puro: [player_name], {hp}, %s, \n1
  /^[\[{<][^\]}>]*[\]}>]$/,
  /^\s*\\[nrt]\s*$/,
  // URL / caminho / identificador com ponto-e-underscore e sem espaços.
  /^\S*\.[a-z]{2,4}([/?#]\S*)?$/i,
];

/**
 * O texto é um caso em que "traduzido" == "igual ao original"?
 *
 * Só para: fonte não-latina, texto curto/não-frase, símbolo, número, caminho,
 * identificador de código ou nome próprio.
 *
 * FASE 5.5 / C1 — isto deixa de ser exclusivo de fonte NÃO-LATINA.
 *
 * A versão anterior aceitava qualquer identidade em fonte latina como coberta,
 * com o motivo "identidade em fonte latina (nome próprio ou API)". Isso é a
 * causa raiz de traduções que nunca acontecerem e mesmo assim serem gravadas
 * como sucesso: um ENCONTRO DE PROVA com 24.551 entradas tinha 34,1% delas com
 * `new == old`, e eram diálogos normais como "( Heh, she must be bored at work
 * again. )" — frases completas em inglês que o provider devolveu intactas.
 *
 * A distinção que faltava não é "latina vs não-latina", é "ISTO É TRADUZÍVEL":
 * - nome próprio, símbolo, número, caminho, identificador  -> identidade legítima
 * - frase/diálogo em prosa                                    -> identidade é FALHA
 */
function isIdentitySafe(text) {
  const clean = String(text == null ? '' : text).trim();
  if (!clean) return true;
  if (IDENTITY_SAFE.some((re) => re.test(clean))) return true;

  // Identificador de código (Python/Ren'Py): `open`, `_door`, `pillarbox`,
  // `foo.bar`, `self.clan`, `x_1`. Falsos positivos aqui são inofensivos: o
  // pior caso é um nome próprio com ponto ser tratado como código.
  if (/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*$/.test(clean)) return true;
  // Nome/arquivo com extensão: `cast.rpy`, `menu.py`
  if (/^[\w.-]+\.[A-Za-z0-9]{1,5}$/.test(clean) && !/\s/.test(clean)) return true;

  // Nome próprio: até 2 palavras, sem pontuação de frase, sem espaço duplo.
  if (!/\s/.test(clean)) return true;
  if (/^[\p{Lu}][\p{L}'’-]*( [\p{Lu}][\p{L}'’-]*)?$/u.test(clean)
      && clean.length <= 40) {
    return true;
  }
  return false;
}

/**
 * FASE 5.5 / C1 — a identidade NÃO é sempre erro, mas em fonte latina nunca
 * pode ser aceita sem justificativa.
 *
 * Identidade que continua válida:
 *   - texto vazio (não havia o que traduzir);
 *   - símbolo, número, caminho, identificador, nome próprio (isIdentitySafe);
 *   - texto que NÃO está em prosa (sem verbo, sem pontuação de frase);
 *
 * Identidade que passa a ser FALHA:
 *   - frase de diálogo/menu em prosa, em fonte latina -> antes coberta, agora não.
 *     É exatamente o caso que gravou inglês como tradução.
 */
function classifyIdentity(text) {
  const clean = String(text == null ? '' : text).trim();
  if (!clean) return { identitySafe: true, reason: 'vazio' };
  if (isIdentitySafe(clean)) return { identitySafe: true, reason: 'símbolo/número/código/nome' };

  // Heurísticas de "isto é prosa": o que separa um diálogo de um identificador.
  const temVerbo = /\b(is|are|was|were|be|been|being|do|does|did|have|has|had|will|would|can|could|should|shall|may|might|must|you|your|we|they|he|she|it|not|no)\b/i.test(clean);
  const temPontuacaoFrase = /[.!?,;:]\s*$/.test(clean);
  const temVariasPalavras = (clean.match(/\S+/g) || []).length >= 4;
  const pareceFrase = temVariasPalavras && (temVerbo || temPontuacaoFrase);

  if (pareceFrase) {
    return { identitySafe: false, reason: 'frase em prosa (traduzível) devolvida intacta' };
  }
  // Nome/rótulo curto sem verbo e sem ponto final: treat as label.
  return { identitySafe: true, reason: 'rótulo curto sem verbo (nome próprio)' };
}

/**
 * Decide se um texto está realmente traduzido.
 *
 * @param {string} original    texto de origem
 * @param {string} translation tradução candidata (pode ser null/undefined/vazia)
 * @param {object} [opts]
 * @param {string} [opts.targetLang='pt'] idioma alvo
 * @returns {{covered:boolean, reason:string, originalScript:string|null,
 *            translationScript:string|null}}
 */
function isTranslated(original, translation, opts = {}) {
  const targetLang = (opts.targetLang || 'pt').toLowerCase();
  const targetIsLatin = /^pt|^en|^es|^fr|^de|^it|^nl|^pl|^tr|^id|^vi|^sv|^da|^no|^fi/.test(targetLang);

  const orig = String(original == null ? '' : original);
  const tr = typeof translation === 'string' ? translation : '';

  const originalScript = dominantScript(orig);

  // Sem tradução: não coberto. Ponto.
  if (tr.trim() === '') {
    return {
      covered: false,
      reason: 'sem tradução',
      originalScript,
      translationScript: null,
    };
  }

  const translationScript = dominantScript(tr);

  // Se a origem é não-latina e o destino é latino, a tradução TEM que ser
  // latina. Uma tradução que continua em japonês/coreano/etc não é tradução.
  const originalNonLatin = NON_LATIN_GROUPS.includes(originalScript);
  if (originalNonLatin && targetIsLatin
      && NON_LATIN_GROUPS.includes(translationScript)) {
    return {
      covered: false,
      reason: `tradução ainda em ${translationScript} (origem ${originalScript})`,
      originalScript,
      translationScript,
    };
  }

  // Identidade: só é aceitável nos casos em que traduzir não muda nada.
  if (tr.trim() === orig.trim() || tr.trim() === orig.replace(/\s+/g, ' ').trim()) {
    if (originalNonLatin && targetIsLatin) {
      // Texto japonês idêntico em um jogo cujo destino é português: a não ser
      // que seja símbolo/número, é texto não traduzido.
      if (isIdentitySafe(orig)) {
        return {
          covered: true, reason: 'identidade segura (símbolo/número/nome próprio)',
          originalScript, translationScript,
        };
      }
      return {
        covered: false,
        reason: 'tradução idêntica ao original em script de origem',
        originalScript,
        translationScript,
      };
    }
    // FASE 5.5 / C1 — fonte latina (inglês→português): identidade deixa de ser
    // aceita incondicionalmente. Antes este ramo devolvia `covered: true` com o
    // motivo "identidade em fonte latina (nome próprio ou API)", sem consultar
    // NADA. Um diálogo em inglês devolvido intacto pelo provider entrava como
    // traduzido, e o aplicador gravava `new == old` no tl/<lang>/ — que é
    // aceito pelo Ren'Py como tradução válida. Era assim que o inglês
    // permanecia na tela com a cobertura reportada como se estivesse completa.
    //
    // Agora a identidade só é coberta quando `classifyIdentity` diz que ela é
    // legítima (símbolo, número, caminho, identificador, nome próprio, rótulo
    // curto). Frase em prosa devolvida intacta NÃO é mais coberta: ela volta
    // para a fila de pendentes e o segundo passe tenta traduzir de verdade.
    const cls = classifyIdentity(orig);
    // eslint-disable-next-line no-unneeded-ternary
    if (cls.identitySafe === true) {
      return {
        covered: true,
        reason: `identidade legítima (${cls.reason})`,
        originalScript,
        translationScript,
        identitySafe: true,
      };
    }
    return {
      covered: false,
      reason: `TRANSLATION_IDENTITY: ${cls.reason}`,
      originalScript,
      translationScript,
      identitySafe: false,
    };
  }

  // Diferente e no script certo: traduzido.
  return {
    covered: true,
    reason: 'tradução no idioma alvo',
    originalScript,
    translationScript,
  };
}

module.exports = {
  SCRIPT_PATTERNS,
  SCRIPT_GROUPS,
  NON_LATIN_GROUPS,
  SCRIPT_TO_LANG,
  detectScripts,
  dominantScript,
  hasNonLatinScript,
  hasLatinScript,
  isIdentitySafe,
  classifyIdentity,
  isTranslated,
  lettersOnly,
  TRANSLATION_IDENTITY_REASON: 'TRANSLATION_IDENTITY',
};
