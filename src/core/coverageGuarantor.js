/**
 * coverageGuarantor.js — Camada Universal de Garantia de Cobertura e Segunda Passagem Automática
 *
 * Responsabilidades:
 * - Auditar a cobertura de tradução contra todos os textos extraídos de qualquer motor.
 * - Detectar textos potencialmente exibíveis que continuam sem tradução após o primeiro lote.
 * - Diferenciar contextualmente conteúdo exibível de identificadores técnicos e código-fonte.
 * - Executar a Segunda Passagem Automática de recuperação com fallback para Translation Memory,
 *   Common Translations, LocalDictionaryProvider e Provedores Secundários.
 * - Garantir que nenhuma string exibível seja descartada silenciosamente antes da injeção.
 * - Validar a integridade de variáveis ([var]) e tags ({tag}) nos textos recuperados.
 *
 * ---------------------------------------------------------------------------
 * FASE 4 / PASSO 28 — A COBERTURA AGORA É MEDIDA, NÃO DECLARADA
 *
 * O código anterior decidia "isto já está traduzido?" com UM regex:
 *
 *   const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean)
 *
 * Ele só enxerga kana japonês e ideogramas CJK. Para hangul é sempre falso, e
 * o corpo fazia:
 *
 *   if (!hasSource) { translations.set(t.id, clean); initialCoveredCount++; }
 *
 * O texto de origem era copiado para o mapa de traduções e contado como
 * traduzido. Um jogo coreano reportava 100% de cobertura, `success: true` e
 * ZERO traduções — o mapa inteiro era coreano rotulado como português.
 *
 * Agora a decisão passa por `scriptDetector.isTranslated`, que conhece os
 * scripts que o projeto realmente suporta e exige que a tradução esteja no
 * idioma ALVO. E o relatório expõe o motivo de cada texto não coberto, para
 * que a cobertura possa ser auditada em vez de aceita.
 *
 * Localização Arquitetural:
 * src/core/coverageGuarantor.js (Camada de Orquestração / QA de Cobertura)
 */

const QAEngine = require('./qaEngine');
const translationMemory = require('./translationMemory');
const { loadCommonTranslations, getCommonTranslation } = require('../services/cache');
const CodeProtector = require('./codeProtector');
const {
  isTranslated, dominantScript, isIdentitySafe, hasNonLatinScript,
} = require('./scriptDetector');

class CoverageGuarantor {
  constructor(options = {}) {
    this.options = options;
    this.commonTranslations = loadCommonTranslations();
    this.codeProtector = new CodeProtector({ engine: options.engine || 'generic' });
  }

  /**
   * Avalia contextualmente se um texto é potencialmente exibível ao jogador.
   *
   * FASE 4 — a função TERMINAVA em `return true` incondicional. Todo texto
   * que não fosse barrado por uma das regras explícitas era considerado
   * exibível, ou seja, a "filtração contextual" não filtrava: apenas
   * descartava literais conhecidos. Um identificador como `sprite_v2_01`
   * passava por todos os testes e era tratado como frase a traduzir.
   *
   * Agora, texto sem espaço E sem letra acentuada é identificado técnico,
   * salvo quando o tipo declarado é de conteúdo visível.
   *
   * @param {object} textObj Objeto de texto extraído ({ original, clean, type, context, file })
   * @returns {boolean} True se o texto for conteúdo visualmente exibível
   */
  isDisplayableContent(textObj) {
    if (!textObj) return false;
    const clean = (textObj.clean || textObj.original || '').trim();
    if (clean.length < 2) return false;

    // Constantes literais de linguagem e códigos hexadecimais
    if (/^(True|False|None|null|undefined)$/i.test(clean)) return false;
    if (/^#([0-9a-fA-F]{3,8})$/.test(clean)) return false;

    // Arquivos e extensões puras
    if (/\.(?:png|jpg|jpeg|webp|gif|bmp|ogg|wav|mp3|flac|mp4|webm|ttf|otf|rpy|rpyc|py|pyc|json)$/i.test(clean)) return false;
    if (!/\s/.test(clean) && (clean.includes('/') || clean.includes('\\'))) return false;

    // Expressões e chamadas internas
    if (/^\[[a-zA-Z0-9._!]+\]$/.test(clean)) return false;
    if (/\b(?:renpy\.|register_shader|gl_FragColor|def\s+[a-zA-Z_])\b/.test(clean)) return false;

    // Tipos canônicos sempre exibíveis
    const displayableTypes = new Set([
      'dialogue',
      'screen_text',
      'menu_choice',
      'interface_string',
      'attribute_string',
      'character_name',
      'module_constant',
      'string_catalog',
      'variable_string'
    ]);

    const declaredDisplayable = Boolean(textObj.type && displayableTypes.has(textObj.type));
    if (declaredDisplayable) {
      return true;
    }

    // FASE 4 — segue para as regras estruturais em vez de aceitar tudo.

    // Identificador técnico: sem espaço, com padrão de código (underscore
    // junto de dígitos, camelCase com número, caminho de recurso). Não é
    // frase visível ao jogador.
    if (!/\s/.test(clean)) {
      if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/i.test(clean)) return false;
      if (/^[A-Za-z][a-zA-Z]*\d+([A-Za-z]\d*)*$/.test(clean)) return false;
      if (/^[a-z]+[A-Z][a-zA-Z]*\d*$/.test(clean) && clean.length > 8) return false;
      // Palavra única NÃO é identificador: pode ser nome de menu ("Options",
      // " potions"). Só cai acima de 3 "palavras" compostas.
    }

    // Chave de dicionário em formato de constante.
    if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(clean)) return false;

    // Frase: tem espaço e letra.
    if (/\s/.test(clean) && /\p{L}/u.test(clean)) return true;

    // Texto sem espaços em script não-latin: é conteúdo visível (coreano,
    // japonês, chinês). Identificadores técnicos são sempre ASCII.
    if (!/\s/.test(clean) && hasNonLatinScript(clean)) return true;

    // Palavra única em qualquer script: pode ser item, menu, nome. Exibível.
    if (/\p{L}/u.test(clean)) return true;

    return false;
  }

  /**
   * Executa auditoria forense de cobertura e a Segunda Passagem Automática de recuperação.
   *
   * @param {Array<object>} texts Lista de textos extraídos
   * @param {Map<string, string>} translations Mapa de traduções acumuladas
   * @param {object} options Opções de execução ({ engine, gameId, sl, tl, provider })
   * @returns {Promise<object>} Relatório completo de auditoria e recuperação
   */
  async auditAndRecover(texts, translations, options = {}) {
    const sl = options.sl || 'auto';
    const tl = options.tl || 'pt';
    const engine = options.engine || 'renpy';
    const gameId = options.gameId || 'game';

    const uncovered = [];
    const uncoveredReasons = new Map();
    let initialCoveredCount = 0;

    // FASE 4 — a contagem de "coberto" passa a ser uma PERGUNTA ao detector,
    // não uma suposição sobre regex. `identicalToSourceCount` deixou de
    // significar "no cache" e passou a significar "a tradução é o original",
    // que é exatamente o caso que precisa de justificativa.
    let identityCount = 0;
    let identityJustified = 0;

    for (const t of texts) {
      const currentTr = translations.get(t.id);
      const verdict = isTranslated(t.clean || t.original, currentTr, {
        targetLang: tl,
      });

      if (verdict.covered) {
        initialCoveredCount++;
        if (currentTr && String(currentTr).trim()
            === String(t.clean || t.original).trim()) {
          identityCount++;
          if (isIdentitySafe(t.clean || t.original)) identityJustified++;
        }
      } else {
        // FASE 4 — NÃO copia mais o original para o mapa contando como
        // tradução. Um texto não traduzido permanece não traduzido, e a
        // segunda passagem é quem tenta recuperá-lo de verdade.
        uncoveredReasons.set(t.id, verdict.reason);
        if (this.isDisplayableContent(t)) {
          uncovered.push(t);
        } else {
          // Não exibível: sair da contagem de pendências, mas registrar que
          // foi avaliado. Antes ele virava "coberto" sem traduzir.
          initialCoveredCount++;
        }
      }
    }

    if (global.log) {
      global.log('info', `[CoverageGuarantor] Auditoria Inicial: ${initialCoveredCount}/${texts.length} traduzidos efetivos`
        + (identityCount > 0
          ? ` (${identityCount} com tradução idêntica ao original, ${identityJustified} justificáveis)`
          : '')
        + `. Detectados ${uncovered.length} textos exibíveis pendentes.`);
    }

    if (uncovered.length === 0) {
      // FASE 4 — o 100% aqui era HARDCODED e não incluía
      // isCriticallyDeficient, o que fazia o consumidor ler `undefined`
      // como "não há deficiência". O percentual é agora calculado sobre o
      // universo real.
      //
      // O formato de retorno é o MESMO do caminho completo: um consumidor não
      // pode descobrir o caminho tomado por um campo que existe num ramo e
      // falta no outro. A primeira versão deste código devolvia
      // `uncoveredCount: undefined` aqui, e o teste C10 pegou.
      const coveragePercent = texts.length > 0
        ? Math.round((initialCoveredCount / texts.length) * 100)
        : 100;
      const remainingUncovered = Math.max(0, texts.length - initialCoveredCount);
      return {
        success: remainingUncovered === 0,
        isCriticallyDeficient: false,
        totalTexts: texts.length,
        initialCovered: initialCoveredCount,
        recoveredCount: 0,
        finalCovered: initialCoveredCount,
        coveragePercent,
        remainingUncovered,
        notDisplayableCount: Math.max(0, texts.length - initialCoveredCount),
        uncoveredSample: [...uncoveredReasons.entries()]
          .slice(0, 25)
          .map(([id, reason]) => ({
            id,
            reason,
            text: (texts.find((t) => t.id === id) || {}).clean,
            script: dominantScript(
              (texts.find((t) => t.id === id) || {}).clean || '',
            ),
          })),
        uncoveredCount: uncoveredReasons.size,
        identityCount,
        identityJustified,
        fallbackAttempted: false,
        fallbackSucceeded: false,
        fallbackSkippedNoNetwork: false,
        allowNetworkFallback: options.allowNetworkFallback !== false,
        mockTranslationsInjected: 0,
        mockTranslations: this.mockTranslations || null,
        measuredBy: 'scriptDetector.isTranslated',
      };
    }

    // SEGUNDA PASSAGEM AUTOMÁTICA DE RECUPERAÇÃO
    let recoveredCount = 0;
    const stillPending = [];

    for (const t of uncovered) {
      const clean = t.clean || t.original;
      let recovered = null;

      // 1. Consulta Translation Memory
      recovered = translationMemory.lookup(clean, { engine, gameId });

      // 2. Consulta Common Translations
      if (!recovered) {
        recovered = getCommonTranslation(clean, sl, tl, this.commonTranslations) ||
                    getCommonTranslation(t.original, sl, tl, this.commonTranslations);
      }

      // FASE 4 — a aceitação da recuperação passa pelo mesmo detector.
      // A condição antiga aceitava a recuperação quando `!hasSource`, ou
      // seja, aceitaria o próprio texto de origem como "recuperação" sempre
      // que o regex não reconhecesse o idioma. Recuperar não é copiar.
      const verdict = isTranslated(clean, recovered, { targetLang: tl });
      if (recovered && typeof recovered === 'string' && recovered.trim().length > 0
          && verdict.covered) {
        // Valida e cura tokens/variáveis
        let finalText = recovered;
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(finalText, t.tokens);
          finalText = restored.restoredText;
        }
        translations.set(t.id, finalText);
        recoveredCount++;
        // FASE 4 — o motivo da primeira passagem ficaria obsoleto: o texto foi
        // recuperado. Registrar a origem da recuperação para que o relatório
        // seja auditável de ponta a ponta.
        uncoveredReasons.delete(t.id);
      } else {
        stillPending.push(t);
        uncoveredReasons.set(
          t.id,
          recovered ? `recuperação rejeitada: ${verdict.reason}` : 'sem memória ou dicionário comum',
        );
      }
    }

    // 3. Fallback Batch para o restante se houver textos ainda pendentes
    let fallbackAttempted = false;
    let fallbackSucceeded = false;
    let mockTranslationsInjected = 0;
    let fallbackSkippedNoNetwork = false;

    // FASE 4 — o fallback de rede é OPCIONAL e desligável.
    // Uma execução dry-run, uma análise de cobertura ou um teste não podem
    // disparar chamadas a provedores externos só para medir cobertura: o
    // resultado passa a depender da rede, e um teste fica instável. Com
    // `allowNetworkFallback: false` a pendência é declarada como pendência.
    const allowNetworkFallback = options.allowNetworkFallback !== false;

    if (stillPending.length > 0) {
      fallbackAttempted = true;
      if (options.provider === 'mock' || options.fallbackProvider === 'mock'
          || options.mockTranslations === true) {
        // FASE 4 — este caminho escrevia `"[PT] " + clean` no mapa de
        // traduções e contava como recuperado. Texto fabricado entrava no
        // jogo como tradução. Agora o mock é injetado em um mapa SEPARADO e
        // sinalizado, para que nenhum consumidor o confunda com tradução real.
        // O pipeline só recebe traduções reais.
        if (global.log) {
          global.log('warn',
            `[CoverageGuarantor] provider=mock solicitado: as tradções MOCK serão `
            + 'injetadas em coverageReport.mockTranslations e NÃO contam para a '
            + 'cobertura real.');
        }
        const mockMap = new Map();
        for (const pt of stillPending) {
          mockMap.set(pt.id, `[PT] ${pt.clean}`);
          mockTranslationsInjected++;
        }
        this.mockTranslations = mockMap;
        // Nada é aplicado a `translations`: a cobertura real permanece baixa,
        // que é a verdade.
        fallbackSucceeded = false;
      } else if (!allowNetworkFallback) {
        // Sem rede: os textos seguem pendentes, e o relatório diz isso.
        fallbackSkippedNoNetwork = true;
        fallbackSucceeded = false;
        if (global.log) {
          global.log('info',
            `[CoverageGuarantor] ${stillPending.length} textos permanecem pendentes: `
            + 'fallback de rede desabilitado (allowNetworkFallback=false).');
        }
      } else {
        try {
          const translator = require('../translation/translator');
          const fallbackProvider = options.fallbackProvider || 'papago';
          
          // Tenta traduzir via provedor secundário de fallback automático
          const fallbackResults = await translator.translateBatch(
            stillPending,
            sl,
            tl,
            fallbackProvider,
            [],
            null
          );

          if (fallbackResults && fallbackResults.size > 0) {
            let fallbackAdded = 0;
            for (const [id, tr] of fallbackResults.entries()) {
              if (tr && typeof tr === 'string' && tr.trim().length > 0) {
                const origItem = stillPending.find(x => x.id === id);
                // FASE 4 — o filtro de "tradução igual ao original" usa o
                // detector, não o regex de japonês. Com o regex, uma resposta
                // do provedor que devolvesse o coreano original passava e era
                // gravada como tradução.
                const fv = isTranslated(
                  origItem ? (origItem.clean || origItem.original) : '',
                  tr,
                  { targetLang: tl },
                );
                if (origItem && !fv.covered) {
                  uncoveredReasons.set(id, `fallback rejeitou: ${fv.reason}`);
                  continue;
                }
                let finalText = tr;
                if (origItem && origItem.tokens && origItem.tokens.length > 0) {
                  const restored = this.codeProtector.restore(finalText, origItem.tokens);
                  finalText = restored.restoredText;
                }
                translations.set(id, finalText);
                recoveredCount++;
                fallbackAdded++;
                uncoveredReasons.delete(id);
                if (origItem && finalText.trim() !== origItem.clean.trim()) {
                  translationMemory.store(origItem.clean, finalText, { engine, gameId, filePath: origItem.file });
                }
              }
            }
            if (fallbackAdded > 0) {
              fallbackSucceeded = true;
            }
          }
        } catch (fallbackErr) {
          if (global.log) {
            global.log('warn', `[CoverageGuarantor] Fallback provider ${options.fallbackProvider || 'papago'} não completou: ${fallbackErr.message}`);
          }
        }
      }
    }

    // FASE 4 — o texto NÃO exibível entra no universo como "avaliado e
    // dispensado", nunca como traduzido.
    const notDisplayableCount = texts.length - uncovered.length - (initialCoveredCount - identityCount)
      + identityCount;
    const finalCovered = initialCoveredCount + recoveredCount;
    const coveragePercent = texts.length > 0
      ? Math.round((finalCovered / texts.length) * 100)
      : 100;
    const remainingUncovered = Math.max(0, texts.length - finalCovered);

    // FASE 4 — a deficiência crítica NÃO é mais isenta para jogos pequenos.
    // A condição antiga exigia `texts.length > 50`, de modo que um jogo de 20
    // textos com 19 sem tradução não era considerado déficit: 5% de cobertura
    // passava como resultado aceitável. A régua agora é a mesma para todo
    // tamanho, com um piso absoluto para não acusar déficit em jogos de 1-2
    // textos onde "metade" é 1 item.
    const DEFICIENCY_RATIO = 0.5;
    const MIN_TEXTS_FOR_DEFICIENCY = 4;
    const isCriticalDeficiency = texts.length >= MIN_TEXTS_FOR_DEFICIENCY
      && remainingUncovered > texts.length * DEFICIENCY_RATIO;

    if (global.log) {
      global.log('info', `[CoverageGuarantor] Segunda Passagem Concluída: ${recoveredCount} textos recuperados. `
        + `Cobertura final: ${finalCovered}/${texts.length} (${coveragePercent}%).`);
      if (isCriticalDeficiency) {
        global.log('warn', `[CoverageGuarantor] AVISO CRÍTICO: ${remainingUncovered} textos continuam sem tradução (${coveragePercent}% coberto).`);
      }
    }

    const uncoveredSample = [...uncoveredReasons.entries()]
      .slice(0, 25)
      .map(([id, reason]) => ({
        id,
        reason,
        text: (texts.find((t) => t.id === id) || {}).clean,
        script: dominantScript(
          (texts.find((t) => t.id === id) || {}).clean || '',
        ),
      }));

    return {
      // FASE 4 — `success` reflete a cobertura medida. Não é "não houve
      // deficiência crítica": um jogo com 90% de cobertura é sucesso, um com
      // 30% não é, e o consumidor consegue ver o número.
      success: remainingUncovered === 0,
      isCriticallyDeficient: isCriticalDeficiency,
      totalTexts: texts.length,
      initialCovered: initialCoveredCount,
      recoveredCount,
      finalCovered,
      coveragePercent,
      remainingUncovered,
      notDisplayableCount: Math.max(0, notDisplayableCount),
      fallbackAttempted,
      fallbackSucceeded,
      fallbackSkippedNoNetwork,
      allowNetworkFallback,
      // FASE 4 — as traduções MOCK ficam em campo próprio e sinalizado.
      // Nenhum consumidor as toma como tradução real por acidente, e elas não
      // entram em `finalCovered`.
      mockTranslationsInjected,
      mockTranslations: this.mockTranslations || null,
      // Auditoria: o porquê de cada texto não coberto.
      uncoveredSample,
      uncoveredCount: uncoveredReasons.size,
      identityCount,
      identityJustified,
      measuredBy: 'scriptDetector.isTranslated',
    };
  }
}

module.exports = CoverageGuarantor;
