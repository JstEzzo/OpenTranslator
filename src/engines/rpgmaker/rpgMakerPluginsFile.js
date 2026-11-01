/**
 * rpgMakerPluginsFile.js — Leitor/Escritor do registro de plugins RPG Maker
 *
 * FASE 2 / PASSO 36 — CORREÇÃO DE installOverlay
 *
 * O bug original de `installOverlay` usava `js/plugins.json` e
 * `JSON.parse`.Esse arquivo NÃO EXISTE em RPG Maker MV/MZ.
 * O registro real é `js/plugins.js`, um array JavaScript dentro de um
 * comentário de linha, com esta forma:
 *
 *   //$plugins=[
 *   //{"name":"ItemAlchemy","status":true,"description":"...","parameters":{}},
 *   //{"name":"UltraTranslateOverlay","status":true,"description":"...","parameters":{}}
 *   //]
 *
 * `JSON.parse` nesse arquivo sempre lançava, o `catch (e) {}` engolia o
 * erro silenciosamente, e o handler devolvia sucesso sem ter registrado
 * nada. O overlay era copiado para disco mas NUNCA carregado pelo jogo.
 *
 * Este módulo faz a manipulação real e verificável do arquivo.
 */

'use strict';

const fs = require('fs');

/** Extrai o array de plugins de um `plugins.js`. */
function parsePluginsJs(content) {
  if (typeof content !== 'string') return null;
  // Âncora é o marcador `$plugins=`; o '[' vem DEPOIS dele.
  // (Procurar '[$' diretamente nunca casa: no arquivo real o '[' precede
  // o '$' — o arquivo é `//$plugins=[`.)
  const anchor = content.indexOf('$plugins=');
  if (anchor === -1) return null;
  const openBracket = content.indexOf('[', anchor);
  if (openBracket === -1) return null;
  // Varre_balanceando aspas e colchetes para achar o ']' que fecha o array.
  let depth = 0;
  let inStr = false;
  let quoteCh = '';
  let escaped = false;
  let closeBracket = -1;
  for (let i = openBracket; i < content.length; i++) {
    const ch = content[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inStr) {
      if (ch === quoteCh) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = true; quoteCh = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { closeBracket = i; break; }
    }
  }
  if (closeBracket === -1) return null;

  const rawArray = content.slice(openBracket, closeBracket + 1);
  // Remove o prefixo "//" de cada linha, converte para JSON e parseia.
  const jsonLike = rawArray
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\/\//, '').trim())
    .filter((line) => line.length > 0)
    .join('');
  try {
    const arr = JSON.parse(jsonLike);
    return Array.isArray(arr) ? { arr, openBracket, closeBracket } : null;
  } catch (e) {
    return null;
  }
}

/** Serializa um array de plugins no formato exato de `plugins.js`. */
function serializePluginsJs(plugins) {
  const lines = plugins.map((p) => `//${JSON.stringify({
    name: p.name,
    status: p.status === true,
    description: p.description || '',
    parameters: p.parameters || {},
  })}`);
  return `//$plugins=[\n${lines.join(',\n')}\n//]\n`;
}

/**
 * Garante que um plugin esteja registrado e habilitado em `plugins.js`.
 *
 * @param {string} pluginsFilePath caminho absoluto de <www>/js/plugins.js
 * @param {object} spec             {name, description, parameters}
 * @returns {{changed:boolean, reason:string, registered:boolean, enabled:boolean}}
 */
function registerPlugin(pluginsFilePath, spec) {
  const result = {
    changed: false, reason: null, registered: false, enabled: false,
  };
  if (!pluginsFilePath || !spec || !spec.name) {
    result.reason = 'pluginsFilePath ou spec.name ausente';
    return result;
  }
  if (!fs.existsSync(pluginsFilePath)) {
    result.reason = `plugins.js não encontrado em ${pluginsFilePath}`;
    return result;
  }

  let content;
  try {
    content = fs.readFileSync(pluginsFilePath, 'utf8');
  } catch (e) {
    result.reason = `leitura falhou: ${e.message}`;
    return result;
  }

  const parsed = parsePluginsJs(content);
  if (!parsed) {
    result.reason = 'plugins.js existe mas o array //$plugins=[ não pôde ser interpretado';
    return result;
  }

  const existing = parsed.arr.find((p) => p && p.name === spec.name);
  if (existing) {
    result.registered = true;
    result.enabled = existing.status === true;
    if (existing.status !== true) {
      // Reativar: o jogo só carrega plugins com status===true.
      const next = parsed.arr.map((p) => (p && p.name === spec.name
        ? { ...p, status: true }
        : p));
      try {
        fs.writeFileSync(pluginsFilePath, serializePluginsJs(next), 'utf8');
        result.changed = true;
        result.enabled = true;
      } catch (e) {
        result.reason = `escrita falhou: ${e.message}`;
      }
    }
    return result;
  }

  const next = [...parsed.arr, {
    name: spec.name,
    status: true,
    description: spec.description || 'Runtime overlay (OpenTranslator)',
    parameters: spec.parameters || {},
  }];
  try {
    fs.writeFileSync(pluginsFilePath, serializePluginsJs(next), 'utf8');
    result.changed = true;
    result.registered = true;
    result.enabled = true;
  } catch (e) {
    result.reason = `escrita falhou: ${e.message}`;
  }
  return result;
}

/** Remove um plugin do registro. Usado no rollback. */
function unregisterPlugin(pluginsFilePath, name) {
  const out = { changed: false, removed: false, reason: null };
  if (!pluginsFilePath || !name) {
    out.reason = 'pluginsFilePath ou name ausente';
    return out;
  }
  if (!fs.existsSync(pluginsFilePath)) {
    out.reason = 'plugins.js não encontrado';
    return out;
  }
  const content = fs.readFileSync(pluginsFilePath, 'utf8');
  const parsed = parsePluginsJs(content);
  if (!parsed) {
    out.reason = 'array //$plugins=[ não interpretável';
    return out;
  }
  const next = parsed.arr.filter((p) => !(p && p.name === name));
  if (next.length === parsed.arr.length) {
    out.reason = 'plugin não estava registrado';
    return out;
  }
  try {
    fs.writeFileSync(pluginsFilePath, serializePluginsJs(next), 'utf8');
    out.changed = true;
    out.removed = true;
  } catch (e) {
    out.reason = `escrita falhou: ${e.message}`;
  }
  return out;
}

/** Verifica se um plugin está registrado e habilitado. Usado em validação. */
function verifyPlugin(pluginsFilePath, name) {
  if (!pluginsFilePath || !fs.existsSync(pluginsFilePath)) {
    return { present: false, enabled: false, reason: 'plugins.js ausente' };
  }
  const parsed = parsePluginsJs(fs.readFileSync(pluginsFilePath, 'utf8'));
  if (!parsed) return { present: false, enabled: false, reason: 'array não interpretável' };
  const hit = parsed.arr.find((p) => p && p.name === name);
  if (!hit) return { present: false, enabled: false, reason: 'não registrado' };
  return {
    present: true,
    enabled: hit.status === true,
    description: hit.description,
    totalPlugins: parsed.arr.length,
  };
}

module.exports = {
  parsePluginsJs,
  serializePluginsJs,
  registerPlugin,
  unregisterPlugin,
  verifyPlugin,
};
