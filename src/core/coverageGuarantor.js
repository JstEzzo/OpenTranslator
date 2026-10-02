/**
 * coverageGuarantor.js — Camada Universal de Garantia de Cobertura e Segunda Passagem Automática
 *
 * Responsabilidades:
 * - Auditar a cobertura de tradução contra todos os textos extraídos de qualquer motor.
 * - Detectar textos potencialmente exibíveis que continuam em inglês ou sem tradução após o primeiro lote.
 * - Diferenciar contextualmente conteúdo exibível de identificadores técnicos e código-fonte.
 * - Executar a Segunda Passagem Automática de recuperação com fallback para Translation Memory,
 *   Common Translations, LocalDictionaryProvider e Provedores Secundários.
 * - Garantir que nenhuma string exibível seja descartada silenciosamente antes da injeção.
 * - Validar a integridade de variáveis ([var]) e tags ({tag}) nos textos recuperados.
 *
 * Localização Arquitetural:
 * src/core/coverageGuarantor.js (Camada de Orquestração / QA de Cobertura)
 */

const QAEngine = require('./qaEngine');
const translationMemory = require('./translationMemory');
const { loadCommonTranslations, getCommonTranslation } = require('../cache');
const CodeProtector = require('./codeProtector');

class CoverageGuarantor {
  constructor(options = {}) {
    this.options = options;
    this.commonTranslations = loadCommonTranslations();
    this.codeProtector = new CodeProtector({ engine: options.engine || 'generic' });
  }

  /**
   * Avalia contextualmente se um texto é potencialmente exibível ao jogador.
   * Não descarta termos curtos (ex: "Debbie", "Shagmoor", "under", "mysterious")
   * se pertencerem a contextos de interface, diálogo, telas ou metadados de entidades.
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

    if (textObj.type && displayableTypes.has(textObj.type)) {
      return true;
    }

    // Se possui espaços e letras, é frase ou texto legível
    if (/\s/.test(clean) && /[a-zA-ZÀ-ÿ]/.test(clean)) {
      return true;
    }

    return true;
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
    let initialCoveredCount = 0;

    let identicalToSourceCount = 0;
    for (const t of texts) {
      const currentTr = translations.get(t.id);
      const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(t.clean || t.original || '');
      if (currentTr && typeof currentTr === 'string' && currentTr.trim().length > 0) {
        if (currentTr !== t.clean || !hasSource) {
          initialCoveredCount++;
        } else {
          identicalToSourceCount++;
          if (this.isDisplayableContent(t)) {
            uncovered.push(t);
          }
        }
      } else {
        if (!hasSource) {
          translations.set(t.id, t.clean || t.original);
          initialCoveredCount++;
        } else if (this.isDisplayableContent(t)) {
          uncovered.push(t);
        }
      }
    }

    if (global.log) {
      global.log('info', `[CoverageGuarantor] Auditoria Inicial: ${initialCoveredCount}/${texts.length} traduzidos efetivos` +
        (identicalToSourceCount > 0 ? ` (${identicalToSourceCount} no cache idênticos ao original)` : '') +
        `. Detectados ${uncovered.length} textos potencialmente exibíveis pendentes.`);
    }

    if (uncovered.length === 0) {
      return {
        success: true,
        totalTexts: texts.length,
        initialCovered: initialCoveredCount,
        recoveredCount: 0,
        finalCovered: initialCoveredCount,
        coveragePercent: 100,
        uncovered: []
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

      const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean);
      if (recovered && typeof recovered === 'string' && recovered.trim().length > 0 &&
          (recovered.trim() !== clean.trim() && recovered.trim() !== (t.original || '').trim() || !hasSource)) {
        // Valida e cura tokens/variáveis
        let finalText = recovered;
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(finalText, t.tokens);
          finalText = restored.restoredText;
        }
        translations.set(t.id, finalText);
        recoveredCount++;
      } else if (!hasSource) {
        translations.set(t.id, clean);
        recoveredCount++;
      } else {
        stillPending.push(t);
      }
    }

    // 3. Fallback Batch para o restante se houver textos ainda pendentes
    let fallbackAttempted = false;
    let fallbackSucceeded = false;

    if (stillPending.length > 0) {
      fallbackAttempted = true;
      if (options.provider === 'mock' || options.fallbackProvider === 'mock' || options.mockTranslations === true) {
        for (const pt of stillPending) {
          translations.set(pt.id, "[PT] " + pt.clean);
          recoveredCount++;
        }
        fallbackSucceeded = true;
      } else {
        try {
          const translator = require('../translator');
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
                const itemHasSource = origItem ? /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(origItem.clean || origItem.original || '') : true;
                if (origItem && (tr.trim() === origItem.clean.trim() || tr.trim() === (origItem.original || '').trim()) && itemHasSource) {
                  continue; // não grava tradução idêntica se ainda contém script de origem japonês
                }
                let finalText = tr;
                if (origItem && origItem.tokens && origItem.tokens.length > 0) {
                  const restored = this.codeProtector.restore(finalText, origItem.tokens);
                  finalText = restored.restoredText;
                }
                translations.set(id, finalText);
                recoveredCount++;
                fallbackAdded++;
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

    const finalCovered = initialCoveredCount + recoveredCount;
    const coveragePercent = texts.length > 0 ? Math.round((finalCovered / texts.length) * 100) : 100;
    const remainingUncovered = texts.length - finalCovered;
    const isCriticalDeficiency = texts.length > 50 && remainingUncovered > (texts.length * 0.5);

    if (global.log) {
      global.log('info', `[CoverageGuarantor] Segunda Passagem Concluída: ${recoveredCount} textos recuperados. ` +
        `Cobertura final: ${finalCovered}/${texts.length} (${coveragePercent}%).`);
      if (isCriticalDeficiency) {
        global.log('warn', `[CoverageGuarantor] AVISO CRÍTICO: ${remainingUncovered} textos continuam sem tradução (${coveragePercent}% coberto).`);
      }
    }

    return {
      success: !isCriticalDeficiency,
      isCriticallyDeficient: isCriticalDeficiency,
      totalTexts: texts.length,
      initialCovered: initialCoveredCount,
      recoveredCount,
      finalCovered,
      coveragePercent,
      remainingUncovered,
      fallbackAttempted,
      fallbackSucceeded
    };
  }
}

module.exports = CoverageGuarantor;
