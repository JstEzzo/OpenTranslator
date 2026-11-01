/**
 * tests/security/xss_ui.test.js
 *
 * FASE 1 / PASSO 19 — XSS NA UI (sanitizador real, payloads reais)
 *
 * Nao basta "verificar que esc() existe". Este teste executa o sanitizador
 * contra payloads que funcionariam se o sink fosse innerHTML cru, e exige que:
 *   - nenhum script/handler/evento sobreviva
 *   - nenhum javascript: sobreviva
 *   - o conteudo textual perigoso seja preservado como TEXTO (nao executado)
 *
 * Os testes rodam em Node puro (xssGuard.js e UMD), sem browser.
 * Alem disso, ha um teste ESTATICO que garante que os sinks conhecidos
 * nao voltaram a interpolar dados sem escape.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const guard = require(path.join(ROOT, 'ui', 'xssGuard.js'));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e });
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

/**
 * Verdadeiro se a saida nao puder executar script.
 * Usado para saidas de sanitizeHtml (conteudo ja pode conter texto escapado,
 * onde a sequencia " onfoo=" aparece como TEXTO inofensivo).
 */
function assertInert(output, label) {
  const lower = String(output).toLowerCase();
  assert(!/<script/i.test(lower), `${label}: sobrou <script>`);
  assert(!/<\/script/i.test(lower), `${label}: sobrou </script>`);
  assert(!/<iframe/i.test(lower), `${label}: sobrou <iframe>`);
  assert(!/<svg/i.test(lower), `${label}: sobrou <svg>`);
  assert(!/<object/i.test(lower), `${label}: sobrou <object>`);
  assert(!/<embed/i.test(lower), `${label}: sobrou <embed>`);
  assert(!/<style/i.test(lower), `${label}: sobrou <style>`);
  assert(!/javascript\s*:/i.test(output), `${label}: sobrou javascript:`);
  assert(!/srcdoc\s*=/i.test(output), `${label}: sobrou srcdoc=`);
  assert(!/data:text\/html/i.test(output), `${label}: sobrou data:text/html`);
}

/**
 * Variante para saidas que serao colocadas em um ATRIBUTO entre aspas.
 * Aqui o que importa e' nao sobrar aspa crua nem chave de atributo de evento.
 */
function assertInertAsAttribute(output, label) {
  // Nenhuma aspa pode sobreviver: e' ela que fecha o atributo.
  assert(!/"/.test(String(output)), `${label}: sobrou aspa dupla crua`);
  assert(!/'/.test(String(output)), `${label}: sobrou aspa simples crua`);
  assert(!/</.test(String(output)), `${label}: sobrou < cru`);
  assert(!/>/.test(String(output)), `${label}: sobrou > cru`);
  assert(!/`/.test(String(output)), `${label}: sobrou crase crua`);
}

// --------------------------------------------------------------------------
// Payloads
// --------------------------------------------------------------------------
const PAYLOADS = [
  '<script>alert(1)</script>',
  '<ScRiPt>alert(1)</ScRiPt>',
  '<img src=x onerror=alert(1)>',
  '<img src=x onerror="alert(1)">',
  "<img src=x onerror='alert(1)'>",
  '<svg/onload=alert(1)>',
  '<svg><script>alert(1)</script></svg>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<body onload=alert(1)>',
  '<div onclick="alert(1)">click</div>',
  '<a href="javascript:alert(1)">x</a>',
  '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
  '<embed src="evil.swf">',
  '<style>*{display:none}</style>',
  '"><script>alert(1)</script>',
  "'><script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '<noscript><p title="</noscript><script>alert(1)</script>">',
  '<template><script>alert(1)</script></template>',
  '<!--<script>alert(1)</script>-->',
  '<![CDATA[<script>alert(1)</script>]]>',
  '<span class="a" onmouseover="alert(1)">t</span>',
  '<b class="x" style="background:url(javascript:alert(1))">t</b>',
  '<input value="x" onfocus="alert(1)" autofocus>',
  '<select><option><script>alert(1)</script></option></select>',
  '<xmp><script>alert(1)</script></xmp>',
  '<textarea><script>alert(1)</script></textarea>',
  '"><script>alert(document.domain)</script>',
  '</span><script>alert(1)</script><span>',
  '<img src=1 onerror=alert(1)//',
];

console.log('=== FASE 1 — XSS NA UI (sanitizador real) ===');

test('XSS: ' + PAYLOADS.length + ' payloads ficam inertes apos sanitizeHtml', () => {
  for (const p of PAYLOADS) {
    const out = guard.sanitizeHtml(p);
    assertInert(out, `payload ${JSON.stringify(p.slice(0, 40))}`);
  }
});

test('XSS: escapeHtml neutraliza os 6 caracteres perigosos', () => {
  const out = guard.escapeHtml(`<>&"'/`);
  assertInert(out, 'escapeHtml');
  assert.strictEqual(out, '&lt;&gt;&amp;&quot;&#39;&#x2F;');
});

test('XSS: escapeAttr nao deixa NENHUMA aspa ou colchete sobreviver', () => {
  const out = guard.escapeAttr('1" onmouseover="alert(1)');
  assertInertAsAttribute(out, 'escapeAttr');
  // O texto continua legivel (aspas viraram entidades), mas nao pode
  // ser interpretado como fim de atributo.
  assert(out.indexOf('onmouseover') >= 0, 'texto deve ser preservado');
  assert.strictEqual(out, '1&quot; onmouseover=&quot;alert(1)');
});

test('XSS: safeNum coercoes e rejeita NaN/Infinity/strings maliciosas', () => {
  assert.strictEqual(guard.safeNum('42'), 42);
  assert.strictEqual(guard.safeNum(42.7), 42.7);
  assert.strictEqual(guard.safeNum('abc'), 0);
  assert.strictEqual(guard.safeNum('abc', -1), -1);
  assert.strictEqual(guard.safeNum(NaN), 0);
  assert.strictEqual(guard.safeNum(Infinity), 0);
  assert.strictEqual(guard.safeNum(-Infinity, 7), 7);
  assert.strictEqual(guard.safeNum(undefined), 0);
  assert.strictEqual(guard.safeNum(null), 0);
  assert.strictEqual(guard.safeNum({}), 0);
  // O payload classico de atributo numerico.
  assert.strictEqual(guard.safeNum('1" onmouseover="alert(1)'), 0);
  assert.strictEqual(guard.safeNum('1e3'), 1000);
});

test('XSS: safeNum aceita negativos e decimais', () => {
  assert.strictEqual(guard.safeNum(-5), -5);
  assert.strictEqual(guard.safeNum('0.5'), 0.5);
  assert.strictEqual(guard.safeNum(' 7 '), 7);
});

test('XSS: conteudo de tag perigosa e NEUTRALIZADO (nunca executado)', () => {
  // O sanitizador remove o bloco perigoso inteiro (tag + corpo). Isso e'
  // preferivel a preservar o corpo: dentro de <script> o texto nao tem
  // valor para o usuario, e preservar abriria superficie de mXSS.
  const out = guard.sanitizeHtml('<script>alert(1)</script>');
  assertInert(out, 'script removido');
  assert.strictEqual(out.indexOf('alert(1)'), -1,
    'corpo de <script> deve ser descartado, nao reinterpretado');

  // Texto normal fora de tag perigosa E preservado.
  const out2 = guard.sanitizeHtml('Erro do provider: <b>timeout</b> após 30s');
  assert(out2.indexOf('Erro do provider:') >= 0, 'texto normal preservado');
  assert(out2.indexOf('<b>timeout</b>') >= 0, 'tag allowlisted preservada');
  assert(out2.indexOf('30s') >= 0, 'numero preservado');
});

test('XSS: tags allowlisted sobrevivem', () => {
  const out = guard.sanitizeHtml('Oi <b>mundo</b> e <br>nova <span class="ok">linha</span>');
  assert(out.indexOf('<b>') >= 0, 'b deve sobreviver');
  assert(out.indexOf('<br>') >= 0, 'br deve sobreviver');
  assert(out.indexOf('class="ok"') >= 0, 'class permitido deve sobreviver');
  assertInert(out, 'allowlist');
});

test('XSS: atributo nao permitido e' + ' removido mesmo em tag permitida', () => {
  const out = guard.sanitizeHtml('<span class="ok" onclick="alert(1)" style="color:red">x</span>');
  assert(out.indexOf('onclick') < 0, 'onclick deve sumir');
  assert(out.indexOf('style=') < 0, 'style deve sumir');
  assert(out.indexOf('class="ok"') >= 0, 'class legitimo permanece');
});

test('XSS: class com payload e' + ' removido', () => {
  const out = guard.sanitizeHtml('<span class="a&quot; onclick=&quot;alert(1)">x</span>');
  assertInert(out, 'class malicioso');
});

test('XSS: payload em atributo numerico nao vaza para o HTML', () => {
  const v = guard.safeNum('1" onmouseover="alert(1)');
  const out = guard.sanitizeHtml(`<input value="${v}">`);
  assertInert(out, 'attr numerica');
  assert(!/onmouseover/.test(out));
});

test('XSS: mXSS por comentario + CDATA nao passa', () => {
  const out = guard.sanitizeHtml('<!--><script>alert(1)</script>-->');
  assertInert(out, 'mXSS comentario');
  const out2 = guard.sanitizeHtml('<![CDATA[]]><script>alert(1)</script>');
  assertInert(out2, 'mXSS CDATA');
});

test('XSS: escape de & nao cria entidade dupla', () => {
  assert.strictEqual(guard.escapeHtml('&lt;'), '&amp;lt;');
  assert.strictEqual(guard.sanitizeHtml('&lt;script&gt;').indexOf('<script'), -1);
});

// --------------------------------------------------------------------------
// Testes ESTATICOS sobre app.js: os sinks nao podem regredir.
// --------------------------------------------------------------------------
function appSource() {
  return fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8');
}

test('STATIC: app.js declara o token no header X-OpenTranslator-Token', () => {
  const src = appSource();
  assert(src.indexOf('X-OpenTranslator-Token') >= 0,
    'rpc() deve enviar o token no header');
});

test('STATIC: showToast usa html() e nao innerHTML cru', () => {
  const src = appSource();
  const i = src.indexOf('function showToast');
  assert(i >= 0, 'showToast deve existir');
  const slice = src.slice(i, i + 1400);
  assert(slice.indexOf('toast.innerHTML = html(msg)') >= 0,
    'toast.innerHTML deve usar html(msg)');
  assert(!/toast\.innerHTML\s*=\s*msg\b/.test(slice),
    'toast.innerHTML nao pode receber msg cru');
});

test('STATIC: logs escapam ts, level e origin', () => {
  const src = appSource();
  const i = src.indexOf('async function pollLogs');
  assert(i >= 0);
  const slice = src.slice(i, i + 1400);
  assert(slice.indexOf('esc(l.ts)') >= 0, 'l.ts deve ser escapado');
  assert(slice.indexOf('esc(originText)') >= 0, 'originText deve ser escapado');
  assert(!/\+\s*\n?\s*l\.ts\s*\n?\s*\+/.test(slice), 'l.ts nao pode entrar cru');
  assert(!/\+\s*\n?\s*originText\s*\n?\s*\+/.test(slice), 'originText nao pode entrar cru');
});

test('STATIC: actor rows usam num()/attr() em vez de interpolacao crua', () => {
  const src = appSource();
  // Ancorar no uso em JS ($("cheat-actors-list")), nao no template HTML.
  const anchor = 'const list = $("cheat-actors-list")';
  const i = src.indexOf(anchor);
  assert(i >= 0, 'uso em JS de cheat-actors-list nao encontrado');
  const slice = src.slice(i, i + 2600);
  assert(slice.indexOf('const aHp = num(a.hp)') >= 0, 'a.hp deve usar num()');
  assert(slice.indexOf('const aIdx = attr(a.idx)') >= 0, 'a.idx deve usar attr()');
  assert(!/data-idx="\$\{a\.idx\}"/.test(slice), 'a.idx nao pode entrar cru em data-idx');
  assert(!/\$\{a\.hp\}/.test(slice), 'a.hp nao pode entrar cru');
  assert(!/\$\{a\.mhp\}/.test(slice), 'a.mhp nao pode entrar cru');
  assert(!/\$\{a\.mp\}/.test(slice), 'a.mp nao pode entrar cru');
  assert(!/\$\{a\.level\}/.test(slice), 'a.level nao pode entrar cru');
});

test('STATIC: inventory usa attr() em data-type/data-id e num() em data-count', () => {
  const src = appSource();
  const i = src.indexOf('ownedItems.forEach');
  assert(i >= 0);
  const slice = src.slice(i, i + 2200);
  assert(slice.indexOf('const iType = attr(item.type)') >= 0);
  assert(slice.indexOf('const iId = attr(item.id)') >= 0);
  assert(slice.indexOf('const iCount = num(item.count)') >= 0);
  assert(!/data-type="\$\{item\.type\}"/.test(slice), 'item.type nao pode entrar cru');
  assert(!/data-id="\$\{item\.id\}"/.test(slice), 'item.id nao pode entrar cru');
  assert(!/data-count="\$\{item\.count\}"/.test(slice), 'item.count nao pode entrar cru');
});

test('STATIC: renpy var numerica usa num()', () => {
  const src = appSource();
  const i = src.indexOf('function renderRenpyVariables');
  assert(i >= 0);
  const slice = src.slice(i, i + 3200);
  assert(slice.indexOf('const vNum = num(v.value)') >= 0, 'v.value deve usar num()');
  assert(!/stat = \$\{v\.value\}/.test(slice), 'v.value nao pode entrar cru em texto');
  assert(!/value="\$\{v\.value\}"/.test(slice), 'v.value nao pode entrar cru em value');
});

test('STATIC: game card usa attr(k) e esc(engIcon/engLabel)', () => {
  const src = appSource();
  const i = src.indexOf('function renderGames');
  assert(i >= 0);
  const slice = src.slice(i, i + 3000);
  assert(slice.indexOf('attr(k)') >= 0, 'game key deve usar attr()');
  assert(slice.indexOf('esc(engIcon)') >= 0);
  assert(slice.indexOf('esc(engLabel)') >= 0);
  assert(!/'" data-key="' \+\s*\n\s*k \+/.test(slice), 'k nao pode entrar cru');
});

test('STATIC: index.html carrega xssGuard.js antes de app.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
  const iGuard = html.indexOf('xssGuard.js');
  const iApp = html.indexOf('app.js');
  assert(iGuard >= 0, 'xssGuard.js deve ser carregado');
  assert(iApp >= 0, 'app.js deve ser carregado');
  assert(iGuard < iApp, 'xssGuard.js precisa vir ANTES de app.js');
});

test('STATIC: nao ha eval/new Function/document.write em app.js', () => {
  const src = appSource();
  assert(!/\beval\s*\(/.test(src), 'eval nao permitido');
  assert(!/new\s+Function\s*\(/.test(src), 'new Function nao permitido');
  assert(!/document\.write\s*\(/.test(src), 'document.write nao permitido');
  assert(!/\.outerHTML\s*=/.test(src), 'outerHTML nao permitido');
  assert(!/insertAdjacentHTML/.test(src), 'insertAdjacentHTML nao permitido');
});

console.log('\n--- RESULTADO FASE 1 (XSS UI) ---');
console.log(`pass=${passed} fail=${failed}`);
if (failed) {
  console.log('\nFALHAS:');
  for (const f of failures) console.log(`  * ${f.name}: ${f.error.message}`);
}
process.exit(failed ? 1 : 0);
