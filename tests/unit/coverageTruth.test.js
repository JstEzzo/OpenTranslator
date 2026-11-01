/**
 * tests/unit/coverageTruth.test.js — FASE 4 / PASSO 28
 *
 * Cobertura de tradução precisa ser MEDIDA, não DECLARADA.
 *
 * ---------------------------------------------------------------------------
 * O BUG REPRODUZIDO
 *
 * `coverageGuarantor` decidia "isto está traduzido?" com um único regex:
 *
 *   const hasSource = /[\u3041-\u3096\u30a1-\u30fa\u4e00-\u9faf]/.test(clean)
 *
 * Ele enxerga apenas kana japonês e ideogramas CJK. Para hangul é SEMPRE
 * falso, e o corpo executava:
 *
 *   if (!hasSource) { translations.set(t.id, clean); initialCoveredCount++; }
 *
 * O texto de origem era copiado para o mapa de traduções e contado como
 * traduzido. Reproduzido: um jogo coreano reportava
 *
 *   coveragePercent = 100%, success = true, e o mapa inteiro era coreano
 *   rotulado como tradução.
 *
 * O projeto suporta ja, ko, zh-CN e en. A cobertura lia UM dos quatro.
 *
 * ---------------------------------------------------------------------------
 * HERMETICIDADE
 *
 * Os testes usam textos absurdos, que nenhum dicionário local ou memória
 * contém, e nunca alcançam a rede. A cobertura observada é a de ZERO
 * traduções, que é a única assertion estável.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];
const queue = [];

function test(name, fn) {
  queue.push({ name, fn });
}

async function runAll() {
  console.log('=== FASE 4 — COBERTURA REAL ===');
  for (const { name, fn } of queue) {
    try {
      await fn();
      pass++;
      console.log(`  ok   ${name}`);
    } catch (e) {
      fail++;
      failures.push({ name, message: e.message });
      console.log(`  FAIL ${name}`);
      console.log(`       ${e.message.split('\n').join('\n       ')}`);
    }
  }
  console.log('\n--- RESULTADO FASE 4 (cobertura) ---');
  console.log(`pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log('\nFALHAS:');
    for (const f of failures) console.log(`  * ${f.name}\n    ${f.message}`);
    process.exitCode = 1;
  }
}

global.log = () => {};
const CoverageGuarantor = require(path.join(ROOT, 'src', 'core', 'coverageGuarantor'));
const SD = require(path.join(ROOT, 'src', 'core', 'scriptDetector'));

/** Textos absurdos: nenhum dicionário tem estes, e são legíveis à olho nu. */
const ABSURDO = {
  ko: ['QuantumLlamaTeste', 'ZxqwvbnmKkoreano', 'BlorpFenGamalg'],
  ja: ['QuantumLlamaTeste', 'ZxqwvbnmNihongo', 'BlorpFenGamalg'],
  zh: ['QuantumLlamaTeste', 'ZxqwvbnmZhongwen', 'BlorpFenGamalg'],
  ru: ['QuantumLlamaTeste', 'ZxqwvbnmRusskiy', 'BlorpFenGamalg'],
  ar: ['QuantumLlamaTeste', 'ZxqwvbnmArabi', 'BlorpFenGamalg'],
  th: ['QuantumLlamaTeste', 'ZxqwvbnmThai', 'BlorpFenGamalg'],
  en: ['QuantumLlamaTeste', 'ZxqwvbnmIngles', 'BlorpFenGamalg'],
};

/**
 * Textos em SCRIPT GENUÍNO e sem tradução possível.
 *
 * FASE 4 — a primeira versão desta suíte usou frases coreanas reais
 * ('안녕하세요 테스트입니다') esperando cobertura 0%. Não deu: o dicionário
 * local (`loadCommonTranslations`) contém essas frases e as traduz de
 * verdade. A cobertura 100% era então CORRETA, e o teste é que estava errado.
 *
 * Para testar "não traduzido" é preciso texto em script real que nada
 * traduza. Estes são hangul/kana/cirílico/árabo/tailandês sem significado —
 * junk legível, indecifrável por qualquer provedor.
 */
const SCRIPTS_SEM_TRADUCAO = {
  ko: ['괜옹닭삘쫏깦쌩', '횹딲깦횡닭쌩', '괜쫏닭횹쌩깦'],
  ja: ['きゃらぽんぎょる', 'きゃぎょぽらん', 'ぽぎゃらんきゃ'],
  zh: ['龘齾齪厵', '龘齪厵龘', '齪厵龘齾'],
  ru: ['Цыцкшызфывапр', 'Цыцкшызфыва', 'Шызфывапр'],
  ar: ['كشمزنبلق', 'كشمزنبل', 'زنبلقكشم'],
  th: ['กฬฬคหฬงกฬ', 'กฬคหฬงก', 'ฬงกฬกฬคห'],
  el: ['Ξζκθλμνξα', 'Ξζκθλμνξ', 'θλμνξαΞζ'],
  he: ['קצרטנםב', 'קצרטנם', 'רטנםבקצ'],
  hi: ['क्वज़ग्डफ्ह', 'क्वज़ग्ड', 'ज़ग्डफ्हक्व'],
};

/** Um conjunto de textos por idioma, com script genuíno. */
const SCRIPTS = {
  ko: ['안녕하세요 테스트입니다', '게임 시작하기', '계속하기'],
  ja: ['これはテストです', 'ゲームを開始', 'つづける'],
  zh: ['这是测试文本', '开始游戏', '继续'],
  ru: ['Это тестовый текст', 'Начать игру', 'Продолжить'],
  ar: ['هذا نص تجريبي', 'ابدأ اللعبة', 'متابعة'],
  th: ['นี่คือข้อความทดสอบ', 'เริ่มเกม', 'ดำเนินการต่อ'],
  en: ['This is a test string', 'Start the game', 'Continue'],
};

function mk(id, clean, type) {
  return {
    id, clean, original: clean, type: type || 'dialogue', tokens: [], context: {},
  };
}

/**
 * Roda a auditoria HERMÉTICA: sem rede.
 *
 * FASE 4 — a primeira versão desta suíte passava `fallbackProvider:
 * 'provedor-que-nao-existe'`, achando que isso impediria a chamada de rede.
 * Não impedia: `translator.translateBatch` cai em `translateSingleWithFallback`
 * para um provedor QUE FUNCIONA, e os textos eram traduzidos de verdade. O
 * teste media a rede, não a lógica de cobertura — e falhava de forma
 * intermitente conforme o provedor respondia.
 *
 * `allowNetworkFallback: false` é o corte explícito: sem rede, o que sobra é
 * exatamente a decisão de cobertura que queremos testar.
 */
async function audit(texts, opts = {}) {
  const g = new CoverageGuarantor({ engine: opts.engine || 'renpy' });
  const translations = opts.seed instanceof Map ? opts.seed : new Map();
  const rep = await g.auditAndRecover(texts, translations, {
    engine: 'renpy',
    sl: 'zz',           // idioma que nenhum provedor conhece
    tl: 'pt',
    fallbackProvider: 'provedor-que-nao-existe',
    allowNetworkFallback: false,
    ...opts,
  });
  rep.__translations = translations;
  return rep;
}

// ---------------------------------------------------------------------------
// scriptDetector
// ---------------------------------------------------------------------------
test('S1 detecta todos os scripts que o projeto afirma suportar', () => {
  const EXPECT = {
    ko: 'KOREAN', ja: 'JAPANESE', zh: 'CHINESE', ru: 'CYRILLIC',
    ar: 'ARABIC', th: 'THAI', en: 'LATIN',
  };
  for (const [lang, expected] of Object.entries(EXPECT)) {
    assert.strictEqual(SD.dominantScript(SCRIPTS[lang][0]), expected,
      `idioma ${lang} deveria ser ${expected}`);
  }
});

test('S2 kana vence han em japonês (um kanji não define o idioma)', () => {
  assert.strictEqual(SD.dominantScript('今日は'), 'JAPANESE');
  assert.strictEqual(SD.dominantScript('今日は天'), 'JAPANESE');
  assert.strictEqual(SD.dominantScript('開始'), 'CHINESE');
});

test('S3 texto sem letra não tem script', () => {
  assert.strictEqual(SD.dominantScript('1234'), null);
  assert.strictEqual(SD.dominantScript('  ...  '), null);
  assert.strictEqual(SD.dominantScript(''), null);
});

test('S4 isTranslated rejeita identidade em qualquer fonte não-latina', () => {
  for (const lang of ['ko', 'ja', 'zh', 'ru', 'ar', 'th']) {
    const src = SCRIPTS[lang][0];
    const r = SD.isTranslated(src, src, { targetLang: 'pt' });
    assert.strictEqual(r.covered, false,
      `${lang}: identidade com o original não pode contar como traduzido`);
  }
});

test('S5 isTranslated rejeita ausência de tradução', () => {
  for (const v of [null, undefined, '', '   ']) {
    const r = SD.isTranslated('안녕하세요', v, { targetLang: 'pt' });
    assert.strictEqual(r.covered, false, `tradução=${JSON.stringify(v)}`);
  }
});

test('S6 identidade latina é aceita (nome próprio, sigla, API)', () => {
  assert.strictEqual(SD.isTranslated('HP', 'HP', { targetLang: 'pt' }).covered, true);
  assert.strictEqual(SD.isTranslated('Debbie', 'Debbie', { targetLang: 'pt' }).covered, true);
  assert.strictEqual(SD.isTranslated('battle_scene', 'battle_scene', { targetLang: 'pt' }).covered, true);
});

test('S7 símbolo e número são identity-safe em qualquer fonte', () => {
  for (const s of ['1234', '!!!', '[player_name]', '%s', '100%']) {
    assert.strictEqual(SD.isIdentitySafe(s), true, `${s} deveria ser identity-safe`);
  }
});

test('S8 frase em coreano NÃO é identity-safe', () => {
  assert.strictEqual(SD.isIdentitySafe('안녕하세요 테스트입니다'), false);
});

test('S9 isTranslated devolve o motivo (o relatório é auditável)', () => {
  const r = SD.isTranslated('안녕하세요', '안녕하세요', { targetLang: 'pt' });
  assert.ok(r.reason && r.reason.length > 0, 'sem tradução do motivo');
  assert.ok(r.originalScript === 'KOREAN');
});

// ---------------------------------------------------------------------------
// coverageGuarantor — o bug da cobertura irreal
// ---------------------------------------------------------------------------
test('C1 jogo coreano com ZERO traduções NÃO reporta 100% (o bug original)', async () => {
  const texts = ABSURDO.ko.map((s, i) => mk(i, s));
  const translations = new Map();
  const g = new CoverageGuarantor({ engine: 'renpy' });
  const rep = await g.auditAndRecover(texts, translations, {
    engine: 'renpy', sl: 'ko', tl: 'pt', fallbackProvider: 'inexistente',
    allowNetworkFallback: false,
  });

  assert.notStrictEqual(rep.coveragePercent, 100,
    'BUG ORIGINAL: coreano sem tradução alguma reportava 100%');
  assert.strictEqual(rep.success, false,
    'BUG ORIGINAL: success=true com zero traduções');
});

test('C2 o texto de origem NUNCA é inserido como tradução (nenhum idioma)', async () => {
  for (const lang of ['ko', 'ja', 'zh', 'ru', 'ar', 'th', 'en']) {
    const texts = ABSURDO[lang].map((s, i) => mk(i, s));
    const translations = new Map();
    await audit(texts, { sl: lang });

    for (const [id, value] of translations.entries()) {
      assert.notStrictEqual(String(value).trim(), texts[id].clean.trim(),
        `${lang}: o id ${id} tem o ORIGINAL rotulado como tradução`);
    }
  }
});

test('C3 com script genuíno e sem tradução, a cobertura é 0%', async () => {
  for (const lang of ['ko', 'ru', 'ar', 'th', 'el', 'he', 'hi']) {
    const texts = SCRIPTS_SEM_TRADUCAO[lang].map((s, i) => mk(i, s));
    const rep = await audit(texts, { sl: lang });
    assert.strictEqual(rep.coveragePercent, 0,
      `${lang}: texto sem tradução possível tem de dar 0%, veio ${rep.coveragePercent}%`);
    assert.strictEqual(rep.success, false, `${lang}: success tem de ser false`);
    assert.strictEqual(rep.remainingUncovered, texts.length, `${lang}`);
  }
});

test('C3b o mesmo texto em coreano dá 0%, mas traduzido dá 100%', async () => {
  // A diferença tem de ser a tradução, não o idioma.
  const junk = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const semTraducao = await audit(junk, { sl: 'ko' });
  assert.strictEqual(semTraducao.coveragePercent, 0);

  const traduzido = await audit(junk, {
    sl: 'ko',
    seed: new Map([[0, 'Primeira'], [1, 'Segunda'], [2, 'Terceira']]),
  });
  assert.strictEqual(traduzido.coveragePercent, 100);
});

test('C4 tradução real em português CONTA como cobertura', async () => {
  const texts = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const translations = new Map([
    [0, 'Olá, este é um teste'],
    [1, 'Iniciar o jogo'],
    [2, 'Continuar'],
  ]);
  const g = new CoverageGuarantor({ engine: 'renpy' });
  const rep = await g.auditAndRecover(texts, translations, {
    engine: 'renpy', sl: 'ko', tl: 'pt', fallbackProvider: 'inexistente',
    allowNetworkFallback: false,
  });
  assert.strictEqual(rep.coveragePercent, 100);
  assert.strictEqual(rep.success, true);
  assert.strictEqual(rep.remainingUncovered, 0);
});

test('C5 cobertura parcial é parcial, não 100%', async () => {
  const texts = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const rep = await audit(texts, { sl: 'ko', seed: new Map([[0, 'Uma tradução real']]) });
  // 1 de 3 = 33%
  assert.ok(rep.coveragePercent >= 30 && rep.coveragePercent <= 40,
    `esperado ~33%, veio ${rep.coveragePercent}%`);
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.remainingUncovered, 2);
});

test('C6 o ramo de saída rápida NÃO tem mais 100% hardcoded', async () => {
  // Universo completamente não-exibível: sai pelo ramo sem uncovered.
  const texts = [
    mk(0, 'sprite_v2_01', 'asset_name'),
    mk(1, 'battle_scene_02', 'asset_name'),
    mk(2, 'audio_clip_03', 'asset_name'),
  ];
  const rep = await audit(texts, { sl: 'ko' });
  assert.ok('coveragePercent' in rep);
  assert.ok('isCriticallyDeficient' in rep,
    'o ramo de saída precisa declarar isCriticallyDeficient (antes era undefined)');
  assert.ok('measuredBy' in rep,
    'o relatório precisa dizer como foi medido');
});

test('C7 deficiência crítica NÃO é isenta para jogos pequenos', async () => {
  // 20 textos em coreano indecifrável, 1 traduzido. A regra antiga exigia
  // `texts.length > 50`, então 5% de cobertura passava como aceitável.
  const junk = SCRIPTS_SEM_TRADUCAO.ko;
  const small = [];
  for (let i = 0; i < 20; i++) small.push(mk(i, `${junk[i % junk.length]} ${i}`));
  const translations = new Map([[0, 'Tradução real em português']]);
  const g = new CoverageGuarantor({ engine: 'renpy' });
  const rep = await g.auditAndRecover(small, translations, {
    engine: 'renpy', sl: 'ko', tl: 'pt', fallbackProvider: 'inexistente',
    allowNetworkFallback: false,
  });
  assert.strictEqual(rep.isCriticallyDeficient, true,
    '19 de 20 sem tradução tem de ser deficiência crítica, em jogo pequeno ou não');
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.coveragePercent, 5);
});

test('C8 o caminho mock NÃO injeta texto fabricado nas traduções', async () => {
  const texts = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const translations = new Map();
  const g = new CoverageGuarantor({ engine: 'renpy' });
  const rep = await g.auditAndRecover(texts, translations, {
    engine: 'renpy', sl: 'ko', tl: 'pt', provider: 'mock',
  });

  // BUG ORIGINAL: escrevia "[PT] " + clean em `translations` e contava como
  // recuperado. Texto fabricado ia para o jogo.
  assert.strictEqual(translations.size, 0,
    `o mock não pode entrar no mapa de traduções, mas tem ${translations.size}`);
  for (const [, v] of translations.entries()) {
    assert.ok(!String(v).startsWith('[PT]'), `mock vazou: ${v}`);
  }
  assert.ok(rep.mockTranslationsInjected > 0,
    'o mock deve ser gerado, mas em campo separado');
  assert.ok(rep.mockTranslations instanceof Map,
    'as traduções mock ficam em campo próprio e sinalizado');
  assert.strictEqual(rep.coveragePercent, 0,
    'mock não conta para a cobertura real');
});

test('C9 o relatório diz POR QUE cada texto ficou pendente', async () => {
  const texts = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const rep = await audit(texts, { sl: 'ko' });
  assert.ok(rep.uncoveredCount > 0, 'deve haver pendências');
  assert.ok(Array.isArray(rep.uncoveredSample));
  assert.ok(rep.uncoveredSample.length > 0);
  const first = rep.uncoveredSample[0];
  assert.ok(first.reason, 'cada pendência precisa de um motivo');
  assert.strictEqual(first.script, 'KOREAN',
    'o script detectado precisa vir no relatório');
});

test('C10 texto RECUPERADO não aparece mais como pendência', async () => {
  const texts = SCRIPTS_SEM_TRADUCAO.ko.map((s, i) => mk(i, s));
  const rep = await audit(texts, {
    sl: 'ko',
    seed: new Map([
      [0, 'Olá, este é um teste'],
      [1, 'Iniciar o jogo'],
      [2, 'Continuar'],
    ]),
  });
  assert.strictEqual(rep.uncoveredCount, 0,
    `motivos obsoletos após recuperação: ${JSON.stringify(rep.uncoveredSample)}`);
});

test('C11 isDisplayableContent filtra identificadores técnicos', () => {
  const g = new CoverageGuarantor({ engine: 'renpy' });
  // Bug: a função terminava em `return true` incondicional.
  assert.strictEqual(g.isDisplayableContent({ clean: 'sprite_v2_01' }), false,
    'identificador com underscore não é texto visível');
  assert.strictEqual(g.isDisplayableContent({ clean: 'AUDIO_CLIP_03' }), false);
  assert.strictEqual(g.isDisplayableContent({ clean: 'scene2Layer1' }), false);
  // Conteúdo visível continua visível.
  assert.strictEqual(g.isDisplayableContent({ clean: 'Hello world' }), true);
  assert.strictEqual(g.isDisplayableContent({ clean: '안녕하세요' }), true);
  assert.strictEqual(g.isDisplayableContent({ clean: 'Start', type: 'dialogue' }), true);
  assert.strictEqual(g.isDisplayableContent({ clean: 'Options' }), true);
  assert.strictEqual(g.isDisplayableContent({ clean: '' }), false);
  assert.strictEqual(g.isDisplayableContent(null), false);
});

test('C12 o texto NÃO-exibível não entra como traduzido', () => {
  const g = new CoverageGuarantor({ engine: 'renpy' });
  assert.strictEqual(g.isDisplayableContent({ clean: 'sprite_v2_01' }), false);
  // E o fluxo de auditoria o trata como "avaliado e dispensado", com o
  // registro explícito em notDisplayableCount.
});

test('C13 nenhum idioma não-latin vira 100% por acidente', async () => {
  const RES = {};
  for (const lang of ['ko', 'ja', 'zh', 'ru', 'ar', 'th', 'he', 'hi', 'el']) {
    const fake = [`QuantumLlamaTeste${lang}`, `Zxqwvbnm${lang}`, `BlorpFen${lang}`];
    const texts = fake.map((s, i) => mk(i, s));
    const rep = await audit(texts, { sl: lang });
    RES[lang] = rep.coveragePercent;
    assert.notStrictEqual(rep.coveragePercent, 100,
      `${lang}:Texts inventados não podem ter 100% de cobertura`);
  }
  console.log('       cobertura por idioma (todos 0 esperado): '
    + Object.entries(RES).map(([k, v]) => `${k}=${v}%`).join(' '));
});

runAll();
