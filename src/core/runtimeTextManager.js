/**
 * OpenTranslator — RuntimeTextManager
 * 
 * Gerenciador central de textos interceptados em tempo de execução:
 * - Interceptação -> Classificação -> Cache -> Tradução -> Restauração de Tokens -> Retorno
 * - Proteção contra loops de tradução, tradução infinita, código e nomes internos
 * - Registro factual de textos runtime-only com hash, cena, origem e timestamp
 * - Suporte a "Adicionar à Memória de Tradução" e "Traduzir Automaticamente"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const TextClassifier = require('./textClassifier');
const CodeProtector = require('./codeProtector');
const translationMemory = require('./translationMemory');

class RuntimeTextManager {
  constructor(options = {}) {
    this.root = global.ROOT || path.resolve(__dirname, '../../..');
    this.storagePath = options.storagePath || path.join(this.root, 'data', 'runtime_texts.json');
    this.runtimeCache = new Map(); // hash -> { original, translated, timestamp, hits }
    this.runtimeRegistry = new Map(); // hash -> record
    this.codeProtector = new CodeProtector({ engine: 'generic' });
    this.maxCacheSize = options.maxCacheSize || 20000;
    this._loadRegistry();
  }

  static getInstance() {
    if (!global.__opent_runtimeTextManager) {
      global.__opent_runtimeTextManager = new RuntimeTextManager();
    }
    return global.__opent_runtimeTextManager;
  }

  _hash(text) {
    return crypto.createHash('sha256').update(String(text || '').trim()).digest('hex').slice(0, 16);
  }

  _loadRegistry() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (item && item.hash) {
              this.runtimeRegistry.set(item.hash, item);
              if (item.translated) {
                this.runtimeCache.set(item.hash, {
                  original: item.original,
                  translated: item.translated,
                  timestamp: item.timestamp,
                  hits: item.hits || 1
                });
              }
            }
          }
        }
      }
    } catch (e) {
      if (global.log) global.log('warn', `[RuntimeTextManager] Falha ao carregar registros runtime: ${e.message}`);
    }
  }

  _persistRegistry() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const records = Array.from(this.runtimeRegistry.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(records, null, 2), 'utf8');
    } catch (e) {
      if (global.log) global.log('warn', `[RuntimeTextManager] Falha ao persistir registros: ${e.message}`);
    }
  }

  /**
   * Avalia se uma string de runtime deve ser traduzida ou se é código/ruído.
   */
  shouldTranslate(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim();

    if (clean.length <= 1) return false;
    if (clean.length > 2500) return false; // Strings gigantescas costumam ser payloads ou dumps de scripts

    // 1. Números puros ou expressões matemáticas
    if (/^[\d\s.,+\-*/%=()]+$/.test(clean)) return false;

    // 2. Cores, CSS, tags hex
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) return false;
    if (/^(rgba?|hsla?)\(/i.test(clean)) return false;

    // 3. URLs, rotas e caminhos de arquivo
    if (/^(https?:\/\/|[a-z]:\\|\/|\.\/|\.\.\/)/i.test(clean)) return false;
    if ((clean.includes('/') || clean.includes('\\')) && !clean.includes(' ')) return false;
    if (/^[a-zA-Z0-9_\-\.]+\.(png|jpg|jpeg|ogg|wav|mp3|json|js|ts|dll|exe|ini|txt|rpy)$/i.test(clean)) return false;

    // 4. Palavras-chave de programação ou declarações JS
    if (/^(function|var|let|const|class|import|export|return|switch|case|default|null|undefined|true|false)\b/.test(clean)) return false;
    if (clean.startsWith('⟦OT_') && clean.endsWith('⟧')) return false;

    // 5. Nomes de variáveis internas ou identificadores sem espaços
    if (/^[a-zA-Z0-9_]{1,32}$/.test(clean) && !/[aeiou]/i.test(clean)) return false;

    // 6. TextClassifier
    const classification = TextClassifier.classify(clean);
    return classification.translatable && (classification.confidence || 1.0) >= 0.50;
  }

  /**
   * Processa uma solicitação de tradução em runtime de forma segura e não-bloqueante.
   * @param {string} rawText - Texto original capturado
   * @param {object} metadata - { engine, scene, script, context, origin }
   * @param {function} translateFn - Função de fallback para invocar provider se não estiver no cache
   * @returns {Promise<{ translated: string, fromCache: boolean, skipped: boolean }>}
   */
  async processRuntimeText(rawText, metadata = {}, translateFn = null) {
    if (!rawText || typeof rawText !== 'string') {
      return { translated: rawText, fromCache: false, skipped: true };
    }

    const clean = rawText.trim();
    if (!this.shouldTranslate(clean)) {
      return { translated: rawText, fromCache: false, skipped: true, reason: 'untranslatable_code_or_noise' };
    }

    const hash = this._hash(clean);

    // 1. Cache em Memória do Runtime
    if (this.runtimeCache.has(hash)) {
      const entry = this.runtimeCache.get(hash);
      entry.hits = (entry.hits || 0) + 1;
      return { translated: entry.translated, fromCache: true, skipped: false };
    }

    // 2. Consulta à Memória de Tradução Global / Jogo
    const tmHit = translationMemory.lookup(clean, {
      engine: metadata.engine || 'generic',
      gameId: metadata.gameId || 'runtime'
    });

    if (tmHit && typeof tmHit === 'string' && tmHit.trim().length > 0) {
      this.runtimeCache.set(hash, {
        original: clean,
        translated: tmHit,
        timestamp: Date.now(),
        hits: 1
      });
      this.recordRuntimeText(clean, tmHit, metadata);
      return { translated: tmHit, fromCache: true, skipped: false };
    }

    // 3. Tradução via Provider com Proteção de Tokens
    if (typeof translateFn === 'function') {
      try {
        const { protectedText, tokens } = this.codeProtector.protect(clean, metadata.engine || 'generic');
        const rawTranslated = await translateFn(protectedText);

        const restored = this.codeProtector.restore(rawTranslated, tokens || []);
        const finalTranslated = restored.restoredText || clean;

        // Salva no cache runtime
        this.runtimeCache.set(hash, {
          original: clean,
          translated: finalTranslated,
          timestamp: Date.now(),
          hits: 1
        });

        // Registra como texto runtime-only
        this.recordRuntimeText(clean, finalTranslated, metadata);

        // Limita tamanho do cache em memória para evitar memory leak em sessões de 10h+
        if (this.runtimeCache.size > this.maxCacheSize) {
          const firstKey = this.runtimeCache.keys().next().value;
          this.runtimeCache.delete(firstKey);
        }

        return { translated: finalTranslated, fromCache: false, skipped: false };
      } catch (err) {
        if (global.log) global.log('warn', `[RuntimeTextManager] Falha ao traduzir '${clean}': ${err.message}`);
        return { translated: rawText, fromCache: false, error: err.message };
      }
    }

    // Se nenhuma função de tradução foi fornecida, apenas registra como descoberto
    this.recordRuntimeText(clean, null, metadata);
    return { translated: rawText, fromCache: false, skipped: true };
  }

  /**
   * Registra um texto observado em tempo de execução no repositório persistente.
   */
  recordRuntimeText(original, translated = null, metadata = {}) {
    const hash = this._hash(original);
    const existing = this.runtimeRegistry.get(hash);

    const record = {
      id: existing ? existing.id : `rt_${Date.now()}_${hash.slice(0, 6)}`,
      hash,
      original,
      translated: translated || (existing ? existing.translated : null),
      engine: metadata.engine || (existing ? existing.engine : 'unknown'),
      scene: metadata.scene || (existing ? existing.scene : 'unknown'),
      script: metadata.script || (existing ? existing.script : null),
      context: metadata.context || (existing ? existing.context : 'runtime_capture'),
      origin: metadata.origin || (existing ? existing.origin : 'hook'),
      firstSeen: existing ? existing.firstSeen : new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrences: existing ? (existing.occurrences + 1) : 1,
      addedToTM: Boolean(existing ? existing.addedToTM : false)
    };

    this.runtimeRegistry.set(hash, record);
    this._persistRegistry();
    return record;
  }

  /**
   * Adiciona um texto capturado em runtime diretamente à Memória de Tradução.
   */
  addToTranslationMemory(hashOrId, manualTranslation = null) {
    let targetRecord = null;
    for (const rec of this.runtimeRegistry.values()) {
      if (rec.hash === hashOrId || rec.id === hashOrId) {
        targetRecord = rec;
        break;
      }
    }

    if (!targetRecord) return { success: false, error: 'Registro de runtime não localizado.' };

    const tr = manualTranslation || targetRecord.translated;
    if (!tr) return { success: false, error: 'Texto não possui tradução para adicionar à memória.' };

    translationMemory.store(targetRecord.original, tr, {
      engine: targetRecord.engine,
      gameId: 'runtime_promoted',
      filePath: targetRecord.script || targetRecord.scene
    });

    targetRecord.translated = tr;
    targetRecord.addedToTM = true;
    this.runtimeCache.set(targetRecord.hash, {
      original: targetRecord.original,
      translated: tr,
      timestamp: Date.now(),
      hits: 1
    });

    this._persistRegistry();
    return { success: true, record: targetRecord };
  }

  /**
   * Retorna todos os textos runtime registrados.
   */
  getAllRuntimeTexts(filter = {}) {
    let list = Array.from(this.runtimeRegistry.values());
    if (filter.pendingOnly) {
      list = list.filter(r => !r.translated || !r.addedToTM);
    }
    if (filter.engine) {
      list = list.filter(r => r.engine === filter.engine);
    }
    return list;
  }
}

module.exports = RuntimeTextManager;
