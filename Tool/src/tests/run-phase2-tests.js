/**
 * OpenTranslator — Bateria de Testes da Fase 2 (Hardening & Integration)
 */

const assert = require('assert');
const QAEngine = require('../core/qaEngine');
const CodeProtector = require('../core/codeProtector');
const translationMemory = require('../core/translationMemory');
const SelfTest = require('../core/selfTest');
const DiagnosticBundle = require('../core/diagnosticBundle');
const electronBridge = require('../engines/electron/electronBridge');
const gameService = require('../core/gameService');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log('  ✓ PASS:', name);
    passed++;
  } catch (e) {
    console.error('  ✗ FAIL:', name, '->', e.message);
    failed++;
  }
}

async function run() {
  console.log('==================================================');
  console.log('OPENTRANSLATOR — FASE 2: TESTES DE HARDENING');
  console.log('==================================================\n');

  console.log('[1] TESTANDO QA ENGINE');
  check('QAEngine: Aprova tradução correta com tokens intactos', () => {
    const orig = "Olá, ⟦OT_FORMAT_0⟧! Acesse ⟦OT_URL_1⟧.";
    const trans = "Hello, ⟦OT_FORMAT_0⟧! Access ⟦OT_URL_1⟧.";
    const res = QAEngine.validate(orig, trans);
    assert.strictEqual(res.qaStatus, 'pass');
    assert.strictEqual(res.qaErrors.length, 0);
  });

  check('QAEngine: Detecta tokens corrompidos ou ausentes', () => {
    const orig = "Vida: ⟦OT_TAG_0⟧ Mana: ⟦OT_TAG_1⟧";
    const trans = "Life: ⟦OT_TAG_0⟧ Mana: 100";
    const res = QAEngine.validate(orig, trans);
    assert.strictEqual(res.qaStatus, 'fail');
    assert(res.qaErrors.length > 0);
  });

  check('QAEngine: Detecta desbalanceamento de chaves e encoding U+FFFD', () => {
    const orig = "{color=#fff}Texto{/color}";
    const trans = "{color=#fff Texto\uFFFD";
    const res = QAEngine.validate(orig, trans);
    assert.strictEqual(res.qaStatus, 'fail');
  });

  console.log('\n[2] TESTANDO CODE PROTECTOR 2.0 COM QA');
  check('CodeProtector: Validação estrutural de tokens via QAEngine', () => {
    const cp = new CodeProtector("renpy");
    const { protectedText, tokens } = cp.protect("{color=#f00}[name]{/color} atacou!");
    const transGood = protectedText.replace("atacou!", "attacked!");
    const valGood = cp.validateTokens(tokens, transGood);
    assert.strictEqual(valGood.qaStatus, 'pass');

    const transCorrupt = transGood.replace(tokens[0].token, "");
    const valBad = cp.validateTokens(tokens, transCorrupt);
    assert.strictEqual(valBad.qaStatus, 'fail');
  });

  console.log('\n[3] TESTANDO TRANSLATION MEMORY 2.0');
  check('TranslationMemory: StringIdentity estável e imutável', () => {
    const id = translationMemory.generateIdentity('renpy', 'script.rpy', 'intro', 'akira', 'Olá mundo');
    assert(id.startsWith('renpy|script.rpy|intro|akira|'));
  });

  check('TranslationMemory: Glossário Inteligente com prioridade por tamanho', () => {
    translationMemory.setGlossary([
      { source: "Skill", target: "Habilidade", caseSensitive: false },
      { source: "Skills", target: "Habilidades", caseSensitive: false }
    ]);
    const res = translationMemory.applyGlossary("Improve your Skills before choosing a Skill.");
    assert.strictEqual(res, "Improve your Habilidades before choosing a Habilidade.");
  });

  check('TranslationMemory: Delta Translation (Unchanged, New, Changed, Removed)', () => {
    const oldList = [
      { id: "1", text: "Novo Jogo" },
      { id: "2", text: "Carregar" },
      { id: "3", text: "Opções" }
    ];
    const newList = [
      { id: "1", text: "Novo Jogo" },    // UNCHANGED
      { id: "2", text: "Carregar Jogo" }, // CHANGED
      { id: "4", text: "Créditos" }       // NEW
      // 3 foi REMOVED
    ];
    const delta = translationMemory.computeDelta(oldList, newList);
    assert.strictEqual(delta.unchanged.length, 1);
    assert.strictEqual(delta.changed.length, 1);
    assert.strictEqual(delta.newItems.length, 1);
    assert.strictEqual(delta.removed.length, 1);
  });

  console.log('\n[4] TESTANDO SELF-TEST E DIAGNOSTIC BUNDLE');
  check('SelfTest: Diagnósticos de ambiente retornam componentes essenciais', () => {
    const st = SelfTest.runAll();
    assert(st.checks.length >= 4);
    assert(st.checks.some(c => c.component === 'Node.js'));
  });

  check('DiagnosticBundle: Mascaramento estrito de senhas e tokens de API', () => {
    const raw = 'Config: { apiKey: "AIzaSySecretKey", password: "SecretPassword123", Bearer tok12345 }';
    const redacted = DiagnosticBundle.redact(raw);
    assert(!redacted.includes('AIzaSySecretKey'));
    assert(!redacted.includes('SecretPassword123'));
    assert(redacted.includes('[REDACTED]'));
  });

  console.log('\n[5] TESTANDO ELECTRON RUNTIME BRIDGE');
  check('ElectronBridge: Gera script com MutationObserver e isolamento', () => {
    const script = electronBridge.getInjectionScript();
    assert(script.includes('MutationObserver'));
    assert(script.includes('__OT_INJECTED__'));
  });

  console.log('\n[6] TESTANDO GAMESERVICE UNIFICADO');
  await (async () => {
    try {
      const st = gameService.selfTest();
      assert(st.summary !== undefined);
      console.log('  ✓ PASS: GameService selfTest respondeu com sucesso');
      passed++;
    } catch (e) {
      console.error('  ✗ FAIL: GameService selfTest ->', e.message);
      failed++;
    }
  })();

  console.log('\n==================================================');
  console.log('RESULTADO FASE 2: ' + passed + ' PASSARAM (' + failed + ' FALHAS)');
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

run();
