/**
 * cache.js — Persistência, Cache Global e Gestão de Glossários
 *
 * Responsabilidades:
 * - Persistência transacional SQLite (WAL mode) do cache de traduções global
 * - Gerenciamento de preferências do usuário (openT.json) e glossários customizados
 * - Migração contínua e segura de caches legados em JSON para o banco SQLite indexado
 *
 * ---------------------------------------------------------------------------
 * FASE 5 / PASSO 30 — O CACHE PERSISTE OU DECLARA QUE NÃO PERSISTE
 *
 * Defeitos corrigidos aqui:
 *
 * 1. `new Database(path.join(DATA_DIR, "global_cache.db"))` era chamado sem
 *    garantir que `DATA_DIR` existisse. Se não existisse, o SQLite lançava,
 *    o `catch` registrava um aviso e `db` ficava `null` — e TODO o sistema
 *    passava a operar no fallback JSON sem que nada informasse ao usuário.
 *    Reproduzido: com o diretório ausente, a mensagem é apenas
 *    "Cannot open database because the directory does not exist".
 *
 * 2. A migração JSON→SQLite rodava NO IMPORT do módulo e declarava sucesso
 *    incondicionalmente:
 *
 *        global.log("success", "Migração do cache JSON para SQLite concluída com sucesso!");
 *        fs.renameSync(jsonPath, jsonPath + ".bak");
 *
 *    Sem verificar quantas linhas entraram. Um cache vazio, ou uma transação
 *    que não persistiu, produzia "sucesso" e o JSON era renomeado — ou
 *    seja, os dados eram perdidos com mensagem de vitória. Pior: rodar no
 *    import significa que o efeito ocorre antes de qualquer tratamento de
 *    erro do consumidor.
 *
 * 3. `getCommonTranslation` escolhia o par de idioma com dois regex:
 *
 *        if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/) pair = `ja_${tl}`;
 *        if (/^[a-zA-Z0-9\s.,!?:;'\-()_]+$/)      pair = `en_${tl}`;
 *
 *    Um texto em coreano, russo, árabe ou tailandês não casa com NENHUM dos
 *    dois: nunca é consultado o dicionário. Mesmo defeito de classe da FASE 4
 *    — a coverage decidia idioma por regex de japonês, e o cache também.
 *
 * 4. O fallback JSON gravava sem `fsync`, e `saveGlossary`/`saveCfg` engoliam
 *    erro: uma configuração que não persistia era indistinguível de uma que
 *    persistiu.
 *
 * Camada Arquitetural:
 * Infraestrutura / Persistência & Cache (Data Access Layer)
 */

const TranslationQuality = require('../core/translationQuality');
const fs = require("fs");
const path = require("path");
if (!global.ROOT) global.ROOT = path.resolve(__dirname, '..', '..');
if (!global.DATA_DIR) global.DATA_DIR = path.join(global.ROOT, "data");
if (!global.CFG_PATH) global.CFG_PATH = path.join(global.DATA_DIR, "openT.json");
const { isTranslatableText, logWarn } = require("../utils/utils");
const { SCRIPT_TO_LANG, dominantScript } = require("../core/scriptDetector");

// ---------------------------------------------------------------------------
// FASE 5 — O diretório de dados é criado ANTES de qualquer abertura de banco.
//
// Sem isto, `new Database()` lança "directory does not exist", o `catch`
// abaixo registra um aviso e `db` fica null: o sistema inteiro degrada para
// o fallback JSON sem que o consumidor saiba. Criar o diretório é a diferença
// entre "persistindo" e "não persistindo".
// ---------------------------------------------------------------------------
const DATA_DIR_READY = ensureDataDir(global.DATA_DIR);

/** Garante que o diretório de dados existe. Retorna o motivo da falha, se houver. */
function ensureDataDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Um diretório que existe mas não é gravável é tão useless quanto ausente.
    fs.accessSync(dir, fs.constants.W_OK);
    return null;
  } catch (e) {
    return `${e.message}`;
  }
}

let db = null;
let dbInitError = null;
// `ensureDataDir` devolve `null` em caso de SUCESSO e a mensagem em caso de
// falha. A condição precisa ser `=== null`, não truthiness: com truthiness o
// sucesso era tratado como falha e o SQLite nunca abria.
if (DATA_DIR_READY === null) {
  try {
    const Database = require('better-sqlite3');
    db = new Database(path.join(global.DATA_DIR, "global_cache.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.prepare(`
      CREATE TABLE IF NOT EXISTS global_cache (
        lang_key TEXT,
        original TEXT,
        translated TEXT
      )
    `).run();
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lang_original ON global_cache (lang_key, original)
    `).run();
  } catch (e) {
    dbInitError = e.message;
    db = null;
    logWarn("Falha ao inicializar o banco SQLite: " + e.message);
  }
} else {
  dbInitError = `DATA_DIR inutilizável: ${DATA_DIR_READY}`;
  logWarn("Falha ao inicializar o banco SQLite: " + dbInitError);
}

/**
 * Estado real da persistência. O consumidor pode consultar em vez de supor.
 * @returns {{sqliteActive:boolean, dataDir:boolean, fallbackInUse:boolean,
 *            error:string|null, note:string}}
 */
function getStorageStatus() {
  const sqliteActive = db !== null;
  return {
    sqliteActive,
    dataDir: DATA_DIR_READY === null,
    fallbackInUse: !sqliteActive,
    error: dbInitError,
    note: sqliteActive
      ? 'Persistência em SQLite (WAL).'
      : 'ATENÇÃO: sem SQLite. O cache está no fallback JSON, que é mais frágil '
        + 'e não é transacional. Traduções salvas podem não sobreviver a uma '
        + 'queda no meio da escrita.',
  };
}

function closeDb() {
  if (db) {
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
      db = null;
    } catch (e) {
      logWarn("Aviso ao fechar banco de dados SQLite: " + e.message);
      return { ok: false, error: e.message };
    }
  }
  return { ok: true, closed: db === null };
}

/**
 * FASE 5 / PASSO 30 — Migração JSON→SQLite com VERIFICAÇÃO.
 *
 * A versão original declarava sucesso incondicionalmente e renomeava o JSON:
 *
 *     transaction(data);
 *     global.log("success", "Migração do cache JSON para SQLite concluída com sucesso!");
 *     fs.renameSync(jsonPath, jsonPath + ".bak");
 *
 * Duas falhas possíveis, nenhuma verificada:
 *   - a transação persistiu zero linhas (cache vazio, filtro, chave inválida);
 *   - a transação lançou depois de escrever parte.
 *
 * Em ambos os casos o JSON era renomeado e a mensagem dizia sucesso. Dados
 * perdidos com celebrating.
 *
 * Agora: conta as linhas efetivamente lidas de volta do banco, e só renomeia
 * o JSON quando a contagem bate. Divergência deixa o JSON intacto.
 *
 * @returns {{migrated:boolean, rowsIn:number, rowsVerified:number,
 *            jsonPreserved:boolean, reason:string|null}}
 */
function migrateJsonCacheToSqlite() {
  const result = {
    migrated: false, rowsIn: 0, rowsVerified: 0,
    jsonPreserved: true, reason: null,
  };
  if (!db) {
    result.reason = 'SQLite indisponível: migração não executada';
    return result;
  }
  const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
  if (!fs.existsSync(jsonPath)) {
    result.reason = 'nenhum cache JSON para migrar';
    return result;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    // JSON corrompido: NÃO renomear. Preservar para diagnóstico.
    result.reason = `JSON ilegível, preservado intacto: ${e.message}`;
    logWarn(`Migração do cache JSON abortada: ${e.message}`);
    return result;
  }

  global.log("info", "Migrando cache global JSON para o banco SQLite...");
  try {
    const insert = db.prepare(
      "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
    );
    let rowsIn = 0;
    const transaction = db.transaction((cacheData) => {
      for (const [langKey, translations] of Object.entries(cacheData)) {
        if (translations && typeof translations === "object") {
          for (const [orig, tr] of Object.entries(translations)) {
            if (orig && tr) {
              insert.run(langKey, orig, tr);
              rowsIn++;
            }
          }
        }
      }
    });
    transaction(data);

    // ---- VERIFICAÇÃO: relê e confere, não confia no que a escrita disse. ----
    const verify = db.prepare(
      "SELECT COUNT(*) AS n FROM global_cache WHERE lang_key = ?"
    );
    let rowsVerified = 0;
    for (const langKey of Object.keys(data || {})) {
      const row = verify.get(langKey);
      if (row && typeof row.n === 'number') rowsVerified += row.n;
    }

    result.rowsIn = rowsIn;
    result.rowsVerified = rowsVerified;

    if (rowsIn > 0 && rowsVerified < rowsIn) {
      // Persistiu menos do que foi lido. Preservar o JSON.
      result.reason = `persistência parcial: ${rowsIn} lidos, ${rowsVerified} `
        + 'verificados no banco. JSON preservado.';
      global.log("error", `Migração INCOMPLETA: ${result.reason}`);
      return result;
    }

    if (rowsIn === 0) {
      // Nada a migrar. Renomear seria destroying um cache (mesmo vazio) sem
      // necessidade; e "sucesso" sobre zero linhas não é informação.
      result.reason = 'cache JSON sem entradas; nada migrado';
      result.migrated = true;
      global.log("info", "Migração ignorada: cache JSON sem entradas.");
      return result;
    }

    // Só agora, com os dados verificados no banco, o JSON pode sair de cena.
    try {
      fs.renameSync(jsonPath, jsonPath + ".bak");
      result.jsonPreserved = false;
    } catch (e) {
      // Renomear falhou: os dados JÁ estão no banco, então não há perda.
      result.reason = `dados no banco, mas o JSON não pôde ser renomeado: ${e.message}`;
    }
    result.migrated = true;
    global.log("success",
      `Migração do cache JSON concluída e VERIFICADA: ${rowsIn} entradas gravadas.`);
  } catch (e) {
    result.reason = e.message;
    global.log("error", "Falha ao migrar cache JSON para SQLite: " + e.message);
  }
  return result;
}

function loadGlobalCacheForLang(sl, tl, engine) {
  const engineKey = engine || global.CURRENT_ENGINE || "generic";
  const langKey = sl + "|" + tl + "|" + engineKey;
  const dict = {};
  if (db) {
    try {
      const stmt = db.prepare(
        "SELECT original, translated FROM global_cache WHERE lang_key = ?"
      );
      const rows = stmt.all(langKey);
      for (const row of rows) {
        if (row.original && row.translated && row.original !== row.translated && TranslationQuality.inspect(row.original, row.translated).valid) {
          dict[row.original] = row.translated;
        }
      }
      return dict;
    } catch (e) {
      global.log("error", "Erro lendo SQLite, fallback pro JSON: " + e.message);
    }
  }
  try {
    const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const keysToCheck = [langKey, sl + "|" + tl];
      for (const k of keysToCheck) {
        if (data[k]) {
          for (const [orig, tr] of Object.entries(data[k])) {
            if (orig && tr && orig !== tr && TranslationQuality.inspect(orig, tr).valid) {
              dict[orig] = tr;
            }
          }
        }
      }
    }
  } catch (e) {
    global.log("error", "Fallback JSON read falhou: " + e.message);
  }
  return dict;
}

function saveNewGlobalTranslations(sl, tl, translationsArray, engine) {
  // FASE 5 — a função retorna `undefined` em todos os caminhos, inclusive o de
  // sucesso. O chamador não tem como saber se gravou. Agora devolve um
  // relatório do que foi aceito, em qual backend e se ficou degradado.
  const empty = {
    persisted: false, backend: null, degraded: false, accepted: 0,
    rejected: 0, reason: 'nenhuma tradução informada',
  };
  if (!Array.isArray(translationsArray) || translationsArray.length === 0) {
    return empty;
  }
  const engineKey = engine || global.CURRENT_ENGINE || "generic";
  const langKey = sl + "|" + tl + "|" + engineKey;

  // FASE 5 — Filtroapplied com CONTAGEM. Antes, uma entrada rejeitada por
  // `isTranslatableText` sumia sem deixar rastro: o chamador achava que tinha
  // gravado. Tradução perdida em silêncio é o modo mais comum de cache
  // "funcionar" e não cache nada.
  const accepted = [];
  let rejected = 0;
  for (const [orig, tr] of translationsArray) {
    if (isTranslatableText(orig) && isTranslatableText(tr) && TranslationQuality.inspect(orig, tr).valid) accepted.push([orig, tr]);
    else rejected++;
  }
  if (rejected > 0) {
    global.log("warn",
      `[cache] ${rejected} de ${translationsArray.length} traduções foram REJEITADAS `
      + 'pelo filtro de texto traduzível e não serão salvas.');
  }
  if (accepted.length === 0) {
    return {
      persisted: false, backend: null, degraded: false, accepted: 0,
      rejected,
      reason: `todas as ${rejected} entradas foram rejeitadas pelo filtro`,
    };
  }

  if (db) {
    try {
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO global_cache (lang_key, original, translated) VALUES (?, ?, ?)"
      );
      const transaction = db.transaction((items) => {
        for (const [orig, tr] of items) {
          stmt.run(langKey, orig, tr);
        }
      });
      transaction(accepted);

      // ---- VERIFICAÇÃO: relê e confere o que foi gravado. ----
      let verified = 0;
      for (const [orig, tr] of accepted) {
        const row = db.prepare(
          'SELECT translated FROM global_cache WHERE lang_key = ? AND original = ?'
        ).get(langKey, orig);
        if (row && row.translated === tr) verified++;
      }
      if (verified !== accepted.length) {
        return {
          persisted: false, backend: 'SQLite', degraded: false,
          accepted: verified, rejected,
          reason: `persistência parcial: ${accepted.length} aceitos, `
            + `${verified} confirmados na releitura`,
        };
      }
      return {
        persisted: true, backend: 'SQLite', degraded: false,
        accepted: accepted.length, rejected, verified, reason: null,
      };
    } catch (e) {
      global.log("error", "Erro salvando SQLite, fallback pro JSON: " + e.message);
    }
  }
  // Fallback: JSON
  //
  // FASE 5 — o fallback é declarado como degradado, não silencioso, e a
  // construção do objeto `cache` não pode mais lançar fora do try: ela estava
  // dentro do bloco que terminava em `writeJsonAtomic`, mas a leitura do
  // JSON existente podia falhar e o erro era engolido por um `catch` que só
  // registrava log.
  const jsonPath = path.join(global.DATA_DIR, "global_trans_cache.json");
  let cache = {};
  try {
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (parsed && typeof parsed === 'object') cache = parsed;
    }
  } catch (e) {
    global.log("error",
      `Cache JSON existente ilegível (${e.message}). Será substituído — as `
      + 'entradas anteriores podem ser perdidas.');
  }
  if (!cache[langKey] || typeof cache[langKey] !== 'object') cache[langKey] = {};
  for (const [orig, tr] of accepted) {
    cache[langKey][orig] = tr;
  }

  const result = writeJsonAtomic(jsonPath, cache);
  if (!result.ok) {
    global.log("error", "Fallback JSON cache falhou: " + result.reason);
    return {
      persisted: false, backend: 'JSON', degraded: true,
      accepted: 0, rejected, reason: result.reason,
    };
  }
  global.log("warn",
    'Cache gravado no fallback JSON (SQLite indisponível). A escrita não é '
    + 'transacional; uma queda no meio pode perder a entrada.');
  return {
    persisted: true, backend: 'JSON', degraded: true,
    reason: 'SQLite indisponível: persistência via JSON sem transação',
  };
}

/**
 * FASE 5 — Escrita JSON ATÔMICA e VERIFICADA.
 *
 * A versão anterior fazia `writeFileSync(tmp)` seguido de `renameSync(tmp)`.
 * O rename é atômico, o que já evita arquivo pela metade; o que faltava era:
 *
 *  - garantir que o `.tmp` não fosse deixado para trás por uma queda, o que
 *    fazia a próxima escrita falhar com ENOENT num caminho que já não existia;
 *  - `fsync` do arquivo e do diretório, para que a gravação chegasse ao disco
 *    de fato — `writeFileSync` só garante a escrita no buffer do sistema
 *    operacional;
 *  - reler e comparar, para saber que gravou o que se pensava gravar.
 *
 * @returns {{ok:boolean, reason:string|null, bytes:number|null,
 *            verified:boolean}}
 */
function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.${process.pid}.tmp`;
  let fd = null;
  try {
    // Limpa um .tmp órfão de uma execução anterior, se houver.
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (e) { /* segue */ }
    }

    const payload = JSON.stringify(data, null, 2);
    fd = fs.openSync(tmpPath, 'w');
    fs.writeFileSync(fd, payload, 'utf8');
    // Garante que os bytes estão no disco antes de trocar o nome.
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    fs.renameSync(tmpPath, targetPath);

    // ---- VERIFICAÇÃO: relê e compara o que está no disco. ----
    //
    // A comparação é entre OBJETOS, não entre strings serializadas: `payload`
    // usa indentação de 2 espaços, e um re-stringify sem indentação nunca
    // seria igual — a verificação reprovaria toda escrita bem-sucedida.
    let verified = false;
    let mismatch = null;
    try {
      const back = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      verified = JSON.stringify(back) === JSON.stringify(data);
      if (!verified) mismatch = 'estrutura obtida difere da gravada';
    } catch (e) {
      verified = false;
      mismatch = `releitura falhou: ${e.message}`;
    }
    if (!verified) {
      return {
        ok: false, verified: false, bytes: Buffer.byteLength(payload, 'utf8'),
        reason: mismatch || 'conteúdo gravado difere do esperado na releitura',
      };
    }
    return {
      ok: true, verified: true, bytes: Buffer.byteLength(payload, 'utf8'),
      reason: null,
    };
  } catch (e) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (e2) { /* ignore */ }
    }
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e2) { /* ignore */ }
    return { ok: false, verified: false, bytes: null, reason: e.message };
  }
}

// FASE 5 / PASSO 30 — A migração NÃO roda mais no import.
//
// Rodar aqui significava que o `require('./cache')` já executava uma
// operação de escrita (e um `rename`, que remove o JSON de cena) antes de o
// consumidor ter qualquer chance de tratar erro, configurar logger ou
// decidir se queria migrar. Pior: `renameSync` não pode ser desfeito por quem
// chamou o require.
//
// Agora ela é uma função exportada, explícita, que devolve um relatório
// verificável. Quem quiser migrar chama `migrateJsonCacheToSqlite()` e
// confere `migrated` / `rowsVerified` / `jsonPreserved`.
const LAST_MIGRATION = { migrated: false, rowsIn: 0, rowsVerified: 0, jsonPreserved: true, reason: 'não executada nesta sessão' };

/** Dispara a migração e registra o resultado para consulta posterior. */
function runMigrationIfRequested() {
  // Opt-in: só migra se o chamador pedir. Padrão é NÃO mexer no cache do
  // usuário no simples import.
  if (global.__openTranslatorMigrateCache !== true) return LAST_MIGRATION;
  Object.assign(LAST_MIGRATION, migrateJsonCacheToSqlite());
  return LAST_MIGRATION;
}

const COMMON_TRANS_PATH = path.join(global.DATA_DIR, "common_translations.json");
function loadCommonTranslations() {
  try {
    if (fs.existsSync(COMMON_TRANS_PATH)) {
      return JSON.parse(fs.readFileSync(COMMON_TRANS_PATH, "utf8"));
    }
  } catch (e) {
    global.log("error", "Error loading common translations: " + e.message);
  }
  return {};
}

/**
 * FASE 5 / PASSO 30 — Escolha do par de idioma por SCRIPT, não por regex.
 *
 * A versão anterior escolhia o dicionário com dois regex:
 *
 *     if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/) pair = `ja_${targetLang}`;
 *     if (/^[a-zA-Z0-9\s.,!?:;'\-()_]+$/)        pair = `en_${targetLang}`;
 *
 * Um texto em coreano, russo, árabe, tailandês ou grego não casa com nenhum
 * dos dois e NUNCA é consultado o dicionário. O mesmo defeito de classe da
 * FASE 4: um regex de japonês decidindo o idioma de todo o texto.
 *
 * Agora o par vem do `scriptDetector`, que conhece os blocos de todos os
 * idiomas que o projeto suporta, e há fallback explícito para quando nenhum
 * par existe.
 */
function getCommonTranslation(text, sl, tl, commonTrans) {
  if (!commonTrans || !text) return null;
  const targetLang = tl || "pt";
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return null;

  const tried = [];
  const tryPair = (pair) => {
    if (!pair) return null;
    tried.push(pair);
    if (commonTrans[pair] && commonTrans[pair][trimmed] && TranslationQuality.inspect(trimmed, commonTrans[pair][trimmed]).valid) {
      return commonTrans[pair][trimmed];
    }
    return null;
  };

  // 1. O idioma declarado pelo chamador tem prioridade absoluta.
  if (sl && sl !== "auto") {
    const hit = tryPair(`${sl}_${targetLang}`);
    if (hit) return hit;
  }

  // 2. Idioma detectado pelo script do texto.
  const script = dominantScript(trimmed);
  const detectedLang = SCRIPT_TO_LANG[script];
  if (detectedLang) {
    const hit = tryPair(`${detectedLang}_${targetLang}`);
    if (hit) return hit;
  }

  // 3. Todos os pares existentes, como último recurso. Um dicionário `ko_pt`
  //    presente no arquivo é consultado mesmo que o script não tenha sido
  //    reconhecido — melhor achar a tradução do que declarar que não existe.
  for (const pair of Object.keys(commonTrans)) {
    if (!pair.endsWith(`_${targetLang}`)) continue;
    const hit = tryPair(pair);
    if (hit) return hit;
  }

  if (global.log && tried.length > 0 && global.__openTranslatorTraceCommonMiss) {
    global.log("debug",
      `[cache] getCommonTranslation sem acerto para "${trimmed.slice(0, 40)}" `
      + `(pares tentados: ${tried.join(', ')})`);
  }
  return null;
}

const GLOSSARY_PATH = path.join(global.DATA_DIR, "glossary.json");
function loadGlossary() {
  try {
    if (fs.existsSync(GLOSSARY_PATH))
      return JSON.parse(fs.readFileSync(GLOSSARY_PATH, "utf8"));
  } catch (e) {
    // FASE 5 — o `catch (e) {}` anterior era mudo: glossário ilegível
    // virava lista vazia e o usuário achava que nunca digitou nada.
    global.log("error",
      `Glossário ilegível (${e.message}); devolvendo lista vazia. `
      + 'Regras salvas podem existir e não estar sendo carregadas.');
  }
  return [];
}

/**
 * FASE 5 — Glossário gravado ATÔMICAMENTE e com resultado declarado.
 *
 * Antes: `fs.writeFileSync(...)` direto, sem(tmp, sem fsync, sem rename), e
 * `return true` incondicional. Uma falha de disco (disco cheio, antivírus com
 * o arquivo aberto, falta de permissão) produzia uma exceção que o chamador
 * não tratava — ou, se tratado, recebia `true` de qualquer jeito porque a
 * função não tinha como falhar de forma observável.
 */
function saveGlossary(entries) {
  const result = writeJsonAtomic(GLOSSARY_PATH, entries);
  if (!result.ok) {
    global.log("error", "Falha ao salvar glossário: " + result.reason);
    return { ok: false, reason: result.reason, bytes: result.bytes };
  }
  return { ok: true, reason: null, bytes: result.bytes };
}

function loadCfg() {
  try {
    if (fs.existsSync(global.CFG_PATH))
      return JSON.parse(fs.readFileSync(global.CFG_PATH, "utf8"));
    return {};
  } catch (e) {
    // FASE 5 — config ilegível devolvia `{}` sem aviso. O usuário via a UI com
    // os padrões e achava que era oNormal; na verdade as preferências dele
    // estavam num arquivo que não lia.
    global.log("error",
      `Configuração ilegível (${e.message}); usando padrões. `
      + `Verifique ${global.CFG_PATH}.`);
    return {};
  }
}

/**
 * FASE 5 — Configuração gravada com resultado declarado.
 * Mesma razão de `saveGlossary`: `return true` incondicional não é
 * confirmação de nada.
 */
function saveCfg(cfg) {
  const result = writeJsonAtomic(global.CFG_PATH, cfg);
  if (!result.ok) {
    global.log("error", "Falha ao salvar configuração: " + result.reason);
    return { ok: false, reason: result.reason, bytes: result.bytes };
  }
  return { ok: true, reason: null, bytes: result.bytes };
}

module.exports = {
  getDb: () => db,
  closeDb,
  getStorageStatus,
  migrateJsonCacheToSqlite,
  // FASE 10 / D2 — `runMigrationIfRequested` existia desde a FASE 5 mas não era
  // exportada, e portanto não tinha como ser chamada nem pelo startup nem por
  // teste. Exportá-la é o que torna a migração alcançável; sem isso, o
  // relatório final afirmava uma capacidade que o módulo não oferecia.
  runMigrationIfRequested,
  getLastMigration: () => ({ ...LAST_MIGRATION }),
  loadGlobalCacheForLang,
  saveNewGlobalTranslations,
  loadCommonTranslations,
  getCommonTranslation,
  loadGlossary,
  saveGlossary,
  loadCfg,
  saveCfg,
};
