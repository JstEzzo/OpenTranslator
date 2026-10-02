/**
 * OpenTranslator — HierarchicalGlossary
 * 
 * Arquitetura de glossários hierárquicos com prioridade estrita e previsível:
 * 
 *   GLOBAL (Camada universal mais genérica)
 *      ↓
 *   ENGINE (Termos específicos da engine: RPG Maker, Ren'Py, Godot, etc.)
 *      ↓
 *   GAME (Glossário específico da franquia ou jogo)
 *      ↓
 *   PLUGIN (Glossário de biblioteca/plugin: Yanfly, VisuStella, MOG, etc.)
 *      ↓
 *   PROJECT (Prioridade máxima absoluta: Glossário customizado do projeto local)
 * 
 * Princípio Arquitetural: Termos de um jogo NUNCA poluem a camada global ou da engine.
 */

const fs = require('fs');
const path = require('path');

const GLOSSARY_PRIORITY = {
  PROJECT: 50,
  PLUGIN: 40,
  GAME: 30,
  ENGINE: 20,
  GLOBAL: 10
};

class HierarchicalGlossary {
  constructor(options = {}) {
    this.root = global.ROOT || path.resolve(__dirname, '../../..');
    this.storageDir = options.storageDir || path.join(this.root, 'data', 'glossaries');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // Camadas em memória: Map<string, Map<sourceTermLower, { source, target, caseSensitive, scope, scopeId }>>
    this.layers = {
      GLOBAL: new Map(),
      ENGINE: new Map(),  // engineId -> Map
      GAME: new Map(),    // gameId -> Map
      PLUGIN: new Map(),  // pluginId -> Map
      PROJECT: new Map()  // projectPath -> Map
    };

    this._loadStandardGlossaries();
  }

  static getInstance() {
    if (!global.__opent_hierarchicalGlossary) {
      global.__opent_hierarchicalGlossary = new HierarchicalGlossary();
    }
    return global.__opent_hierarchicalGlossary;
  }

  _loadStandardGlossaries() {
    // 1. Carrega Global
    const globalPath = path.join(this.storageDir, 'global.json');
    const legacyPath = path.join(this.root, 'data', 'glossary.json');
    const srcPath = fs.existsSync(globalPath) ? globalPath : (fs.existsSync(legacyPath) ? legacyPath : null);

    if (srcPath) {
      try {
        const raw = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
        const entries = Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) => ({ source: k, target: v }));
        for (const ent of entries) {
          if (ent.source && ent.target) {
            this.addTerm({
              scope: 'GLOBAL',
              source: ent.source,
              target: ent.target,
              caseSensitive: Boolean(ent.caseSensitive)
            });
          }
        }
      } catch (e) {}
    }

    // 2. Carrega Engine Glossaries se existirem no diretório
    try {
      const files = fs.readdirSync(this.storageDir);
      for (const f of files) {
        if (f.startsWith('engine_') && f.endsWith('.json')) {
          const engineId = f.replace('engine_', '').replace('.json', '');
          try {
            const data = JSON.parse(fs.readFileSync(path.join(this.storageDir, f), 'utf8'));
            for (const [k, v] of Object.entries(data)) {
              this.addTerm({ scope: 'ENGINE', scopeId: engineId, source: k, target: v });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  /**
   * Adiciona um termo ao escopo apropriado.
   * @param {object} param
   * @param {'GLOBAL'|'ENGINE'|'GAME'|'PLUGIN'|'PROJECT'} param.scope
   * @param {string} [param.scopeId='default']
   * @param {string} param.source
   * @param {string} param.target
   * @param {boolean} [param.caseSensitive=false]
   */
  addTerm({ scope = 'GLOBAL', scopeId = 'default', source, target, caseSensitive = false }) {
    if (!source || !target) return;
    const cleanSrc = String(source).trim();
    const cleanTr = String(target).trim();
    if (cleanSrc.length === 0 || cleanTr.length === 0) return;

    const termKey = caseSensitive ? cleanSrc : cleanSrc.toLowerCase();
    const entry = {
      source: cleanSrc,
      target: cleanTr,
      caseSensitive,
      scope,
      scopeId,
      priority: GLOSSARY_PRIORITY[scope] || 10
    };

    if (scope === 'GLOBAL') {
      this.layers.GLOBAL.set(termKey, entry);
    } else {
      if (!this.layers[scope].has(scopeId)) {
        this.layers[scope].set(scopeId, new Map());
      }
      this.layers[scope].get(scopeId).set(termKey, entry);
    }
  }

  /**
   * Carrega o glossário de um projeto específico a partir da pasta do jogo (opent_glossary.json).
   */
  loadProjectGlossary(gameDir) {
    if (!gameDir || !fs.existsSync(gameDir)) return;
    const projectGlossaryFile = path.join(gameDir, 'opent_glossary.json');
    if (fs.existsSync(projectGlossaryFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(projectGlossaryFile, 'utf8'));
        for (const [k, v] of Object.entries(raw)) {
          this.addTerm({
            scope: 'PROJECT',
            scopeId: gameDir,
            source: k,
            target: v
          });
        }
      } catch (e) {}
    }
  }

  /**
   * Consulta a tradução de um termo respeitando estritamente a hierarquia:
   * PROJECT -> PLUGIN -> GAME -> ENGINE -> GLOBAL
   * @param {string} sourceTerm
   * @param {object} context - { projectDir, plugin, gameId, engine }
   * @returns {{ target: string, scope: string, scopeId: string } | null}
   */
  resolveTerm(sourceTerm, context = {}) {
    if (!sourceTerm || typeof sourceTerm !== 'string') return null;
    const clean = sourceTerm.trim();
    const lower = clean.toLowerCase();

    // 1. PROJECT (Prioridade Máxima)
    const projId = context.projectDir || context.gameDir;
    if (projId && this.layers.PROJECT.has(projId)) {
      const pMap = this.layers.PROJECT.get(projId);
      if (pMap.has(clean)) return pMap.get(clean);
      if (pMap.has(lower)) return pMap.get(lower);
    }

    // 2. PLUGIN (Prioridade 40)
    if (context.plugin && this.layers.PLUGIN.has(context.plugin)) {
      const plMap = this.layers.PLUGIN.get(context.plugin);
      if (plMap.has(clean)) return plMap.get(clean);
      if (plMap.has(lower)) return plMap.get(lower);
    }

    // 3. GAME (Prioridade 30)
    if (context.gameId && this.layers.GAME.has(context.gameId)) {
      const gMap = this.layers.GAME.get(context.gameId);
      if (gMap.has(clean)) return gMap.get(clean);
      if (gMap.has(lower)) return gMap.get(lower);
    }

    // 4. ENGINE (Prioridade 20)
    if (context.engine && this.layers.ENGINE.has(context.engine)) {
      const eMap = this.layers.ENGINE.get(context.engine);
      if (eMap.has(clean)) return eMap.get(clean);
      if (eMap.has(lower)) return eMap.get(lower);
    }

    // 5. GLOBAL (Prioridade 10)
    if (this.layers.GLOBAL.has(clean)) return this.layers.GLOBAL.get(clean);
    if (this.layers.GLOBAL.has(lower)) return this.layers.GLOBAL.get(lower);

    return null;
  }

  /**
   * Coleta todos os termos ativos para um determinado contexto ordenados por:
   * Prioridade de Escopo (PROJECT primeiro) e comprimento decrescente de caracteres.
   */
  getActiveTerms(context = {}) {
    const collected = [];
    const seen = new Set();

    const addEntries = (map) => {
      if (!map) return;
      for (const entry of map.values()) {
        const key = entry.caseSensitive ? entry.source : entry.source.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(entry);
        }
      }
    };

    // Ordem estrita de precedência:
    const projId = context.projectDir || context.gameDir;
    if (projId && this.layers.PROJECT.has(projId)) addEntries(this.layers.PROJECT.get(projId));
    if (context.plugin && this.layers.PLUGIN.has(context.plugin)) addEntries(this.layers.PLUGIN.get(context.plugin));
    if (context.gameId && this.layers.GAME.has(context.gameId)) addEntries(this.layers.GAME.get(context.gameId));
    if (context.engine && this.layers.ENGINE.has(context.engine)) addEntries(this.layers.ENGINE.get(context.engine));
    addEntries(this.layers.GLOBAL);

    // Ordena por comprimento decrescente para termos compostos substituírem antes de palavras simples
    return collected.sort((a, b) => b.source.length - a.source.length);
  }

  /**
   * Aplica substituições do glossário hierárquico em um texto garantindo limites de palavra.
   */
  apply(text, context = {}) {
    if (!text || typeof text !== 'string') return text;
    const terms = this.getActiveTerms(context);
    let result = text;

    for (const term of terms) {
      const escaped = term.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = term.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escaped}\\b`, flags);
      result = result.replace(regex, term.target);
    }

    return result;
  }
}

module.exports = HierarchicalGlossary;
module.exports.GLOSSARY_PRIORITY = GLOSSARY_PRIORITY;
