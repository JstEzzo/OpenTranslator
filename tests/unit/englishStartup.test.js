'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'ui/app.js'), 'utf8');

async function main() {
  const start = source.indexOf('  async function loadCfg()');
  const end = source.indexOf('  const LANGS =', start);
  const code = source.slice(start, end);
  let passed = 0;
  for (const previousLanguage of ['pt', 'en', undefined, 'unexpected']) {
    const elements = { cfgSL: {}, cfgTL: {}, cfgAppLang: {} };
    let saved;
    const context = {
      S: { cfg: {} }, _lang: 'en',
      $: id => elements[id],
      rpc: async (name, value) => {
        if (name === 'loadCfg') return { lang: previousLanguage, sl: 'ja', tl: 'fr', customPreference: 42 };
        if (name === 'saveCfg') { saved = { ...value }; return { ok: true }; }
        throw new Error('Unexpected RPC: ' + name);
      },
      updateEngineVisibility() {}, applyTheme() {}, renderGames() {}, log() {}, t: key => key,
    };
    vm.runInNewContext(code + ';this.load = loadCfg;this.save = saveCfg;', context);
    await context.load();
    assert.strictEqual(context.S.cfg.lang, 'en');
    assert.strictEqual(elements.cfgAppLang.value, 'en');
    assert.strictEqual(elements.cfgSL.value, 'ja');
    assert.strictEqual(elements.cfgTL.value, 'fr');
    await context.save();
    assert.strictEqual(saved.lang, 'en');
    assert.strictEqual(saved.sl, 'ja');
    assert.strictEqual(saved.tl, 'fr');
    assert.strictEqual(saved.customPreference, 42);
    passed++;
  }
  const html = fs.readFileSync(path.join(root, 'ui/index.html'), 'utf8');
  assert(html.includes('<html lang="en">'));
  assert(html.includes('Loading OpenTranslator...'));
  assert(source.includes('const _lang = "en";'));
  assert(!source.includes('_lang = c.lang') && !source.includes('_lang = S.cfg.lang'));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/engineCompatibility.json'), 'utf8'));
  assert.strictEqual(config.profiles.length, 22);
  assert(config.profiles.every(p => p.status && p.sources && p.missing.length));
  passed++;
  console.log(`pass=${passed} fail=0`);
}
main().catch(error => { console.error(error); console.log('pass=0 fail=1'); process.exitCode = 1; });
