'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const guard = require('../../ui/xssGuard');
const source = fs.readFileSync(path.resolve(__dirname, '../../ui/app.js'), 'utf8');
const functionSource = source.slice(source.indexOf('  async function refreshProviderHealth()'), source.indexOf('  let SESSION_TOKEN'));
async function render(health) {
  const elements = {
    'provider-health-grid': { innerHTML: '' },
    'provider-health-notice': { style: {}, innerHTML: '' },
  };
  const context = {
    rpc: async () => ({ ok: true, health }),
    $: id => elements[id], esc: guard.escapeHtml, num: guard.safeNum,
  };
  vm.runInNewContext(functionSource + ';this.refresh = refreshProviderHealth;', context);
  await context.refresh();
  return elements;
}
async function main() {
  const empty = await render({});
  assert(empty['provider-health-grid'].innerHTML.includes('UNKNOWN'));
  assert(!empty['provider-health-grid'].innerHTML.includes('NOT CONFIGURED'));
  const limited = await render({ 'google:gtx': { state: 'RATE_LIMITED' } });
  assert.strictEqual(limited['provider-health-notice'].style.display, 'block');
  assert(!limited['provider-health-notice'].innerHTML.includes('Tradução pausada'));
  const hostile = await render({ 'google:gtx': { state: '<img src=x onerror=alert(1)>' } });
  assert(!hostile['provider-health-grid'].innerHTML.includes('<img'));
  console.log('pass=3 fail=0');
}
main().catch(err => { console.error(err); console.log('pass=0 fail=1'); process.exitCode = 1; });
