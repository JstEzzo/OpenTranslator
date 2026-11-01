'use strict';
const fs = require('fs'), path = require('path');
async function translateLocRes(input, output, options = {}) {
  global.ROOT = path.resolve(__dirname, '..');
  global.DATA_DIR = path.resolve(options.dataDir || path.join(global.ROOT, 'scratch', 'locres-translation'));
  fs.mkdirSync(global.DATA_DIR, { recursive: true }); global.CFG_PATH = path.join(global.DATA_DIR, 'openT.json');
  global.log = (level, message) => { if (/progresso|lote|limit|falha/i.test(message)) console.log(`[${level}] ${message}`); };
  const Provider = require('../src/engines/unreal/unrealLocResProvider');
  const { translateBatch } = require('../src/translation/translator');
  const source = fs.readFileSync(input), parsed = Provider.parseLocRes(source);
  const strings = [...new Set(Object.values(parsed.namespaces).flatMap(keys => Object.values(keys).map(item => item.value)))];
  const checkpoint = output + '.translations.json';
  const translations = fs.existsSync(checkpoint) ? JSON.parse(fs.readFileSync(checkpoint, 'utf8')) : {};
  const tokenPattern = /<[^<>]*>|\{[^{}\r\n]+\}|%[-+0-9.]*[a-zA-Z]|\\[nrt]/g;
  const prepared = [];
  for (const [i, original] of strings.entries()) {
    if (Object.hasOwn(translations, original)) continue;
    if (!/[\p{L}]{2}/u.test(original)) { translations[original] = original; continue; }
    const tokens = [];
    const clean = original.replace(tokenPattern, token => { tokens.push(token); return `__OT_TOKEN_${tokens.length - 1}__`; });
    prepared.push({ id: String(i), clean, original, tokens });
  }
  const persist = () => {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(checkpoint + '.tmp', JSON.stringify(translations, null, 2)); fs.renameSync(checkpoint + '.tmp', checkpoint);
  };
  const byProtected = new Map(prepared.map(item => [item.clean, item]));
  const accept = (item, text) => {
    if (typeof text !== 'string' || !text.trim()) return false;
    let value = text;
    for (let i = 0; i < item.tokens.length; i++) {
      const placeholder = `__OT_TOKEN_${i}__`; if (!value.includes(placeholder)) return false;
      value = value.split(placeholder).join(item.tokens[i]);
    }
    if (/__OT_TOKEN_/i.test(value)) return false;
    if (JSON.stringify(item.original.match(tokenPattern) || []) !== JSON.stringify(value.match(tokenPattern) || [])) return false;
    translations[item.original] = value; return true;
  };
  persist();
  try {
    const result = await translateBatch(prepared, options.sl || 'en', options.tl || 'pt', 'google', {}, pairs => {
      for (const [source, translated] of pairs) { const item = byProtected.get(source); if (item) accept(item, translated); }
      persist();
    }, { allowProviderFallback: false });
    for (const item of prepared) if (result.has(item.id)) accept(item, result.get(item.id)); persist();
    const missing = strings.filter(text => !Object.hasOwn(translations, text));
    if (missing.length) { console.log(JSON.stringify({ complete: false, unique: strings.length, done: strings.length - missing.length, missing: missing.length })); return { complete: false, missing }; }
    const outputBuffer = Provider.patchLocRes(source, text => translations[text]);
    if (Provider.parseLocRes(outputBuffer).count !== parsed.count) throw new Error('Contagem de entradas alterada');
    fs.writeFileSync(output, outputBuffer);
    const changed = strings.filter(text => translations[text] !== text).length;
    const report = { complete: true, entries: parsed.count, unique: strings.length, changed, unchanged: strings.length - changed };
    console.log(JSON.stringify(report)); return report;
  } finally { require('../src/services/cache').closeDb(); }
}
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) { console.error('Uso: node tools/translate-locres.js entrada.locres saida.locres'); process.exitCode = 2; }
  else translateLocRes(input, output).then(r => { if (!r.complete) process.exitCode = 1; }).catch(e => { console.error(e.message); process.exitCode = 1; });
}
module.exports = { translateLocRes };
