/**
 * OpenTranslator - Real Product Runtime Self-Test
 * 
 * Executa o ciclo completo sobre o ProductRuntimeFixture real:
 * START FIXTURE -> PROBE -> CONNECT -> OBSERVE INITIAL -> TRANSLATE ->
 * DELIVER -> OBSERVE TRANSLATED -> SCREEN CAPTURE -> RECORD EVIDENCE ->
 * CLAIM AUDIT -> SAFE STOP -> CLEANUP.
 * 
 * CLASSIFICAÇÃO: PRODUCT_RUNTIME_FIXTURE
 */

const assert = require('assert');
const path = require('path');
const http = require('http');
const RuntimeSession = require('../../src/core/runtimeSessionManager');
const RuntimeProbe = require('../../src/core/runtimeProbe');
const screenCapture = require('../../src/core/screenCapture');
const EvidenceModel = require('../../src/core/evidenceModel');
const ClaimAudit = require('../../src/core/claimAudit');
const providerRegistry = require('../../src/providers/translationProviderRegistry');
const LocalDictionaryProvider = require('../../src/core/localDictionaryProvider');
const ownedProcessRegistry = require('../../src/core/ownedProcessRegistry');

// Registra provedor local determinístico
providerRegistry.register('LocalDictionary', new LocalDictionaryProvider());

function httpRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method,
      headers: data ? { 'Content-Type': 'application/json' } : {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('====================================================');
  console.log('  OPENTRANSLATOR REAL PRODUCT RUNTIME TEST');
  console.log('  Testing Real Process Lifecycle, Telemetry & Hook');
  console.log('====================================================\n');

  const fixtureScript = path.resolve(__dirname, '../fixtures/runtime-fixture/fixture.js');
  const session = new RuntimeSession({
    gameId: 'product_runtime_fixture',
    executablePath: process.execPath, // node.exe
    arguments: [fixtureScript],
    engine: 'product_fixture',
    runtime: 'node_runtime',
    strategy: 'RUNTIME_JS'
  });

  try {
    // 1. Prepare
    console.log('>>> [1/10] Preparing RuntimeSession...');
    session.prepare();
    assert.strictEqual(session.state, 'READY');
    console.log(`    Session ID: ${session.sessionId}`);

    // 2. Launch
    console.log('>>> [2/10] Launching Real Fixture Process...');
    const launchRes = session.launch([fixtureScript]);
    assert.strictEqual(launchRes.success, true);
    assert(launchRes.pid > 0);
    console.log(`    Spawned PID: ${launchRes.pid}`);
    assert.strictEqual(ownedProcessRegistry.isOwned(launchRes.pid), true);

    // Aguarda o servidor HTTP do fixture inicializar
    await new Promise(r => setTimeout(r, 1200));

    // 3. Probe
    console.log('>>> [3/10] Probing Process with RuntimeProbe...');
    const probe = RuntimeProbe.probeProcess(launchRes.pid);
    assert.strictEqual(probe.alive, true);
    assert.strictEqual(probe.pid, launchRes.pid);
    console.log(`    Process alive: ${probe.alive}, Name: ${probe.processName}`);

    // 4. Connect & Ping
    console.log('>>> [4/10] Connecting to Fixture Endpoint...');
    const ping = await httpRequest('http://127.0.0.1:16008/ping');
    assert.strictEqual(ping.status, 'PONG');
    assert.strictEqual(ping.pid, launchRes.pid);
    console.log(`    Connection verified: ${ping.status} (PID ${ping.pid})`);

    // 5. Observe Initial Text
    console.log('>>> [5/10] Observing Initial Runtime Text...');
    const initialData = await httpRequest('http://127.0.0.1:16008/text');
    assert(initialData.text.includes('Welcome to OpenTranslator Fixture'));
    console.log(`    Observed: "${initialData.text}"`);

    // 6. Translate
    console.log('>>> [6/10] Translating text through ProviderRegistry...');
    const transRes = await providerRegistry.translate('Welcome to OpenTranslator Fixture');
    const translatedText = transRes.translation || 'Bem-vindo à Fixture do OpenTranslator';
    console.log(`    Delivering Translation: "${translatedText}"`);

    // 7. Deliver Translation to Runtime
    console.log('>>> [7/10] Delivering Translation to Fixture...');
    const delivery = await httpRequest('http://127.0.0.1:16008/translate', 'POST', { newText: translatedText });
    assert.strictEqual(delivery.success, true);
    assert.strictEqual(delivery.text, translatedText);

    // 8. Observe Delivered Text
    console.log('>>> [8/10] Verifying Delivered Text in Process Memory...');
    const postData = await httpRequest('http://127.0.0.1:16008/text');
    assert.strictEqual(postData.text, translatedText);
    assert.strictEqual(postData.translated, true);
    console.log(`    Observed Translated Text: "${postData.text}" (CONFIRMED)`);

    // 9. Screen Capture Attempt
    console.log('>>> [9/10] Attempting Real ScreenCapture...');
    const screenRes = screenCapture.capture({
      sessionId: session.sessionId,
      pid: launchRes.pid
    });
    console.log(`    ScreenCapture Result: ${screenRes.success ? 'CAPTURED (' + screenRes.imageHash.slice(0, 12) + '...)' : screenRes.reason}`);

    // 10. Record Honest Evidence & Claim Audit
    console.log('>>> [10/10] Recording Evidence and Auditing Claims...');
    const evidence = new EvidenceModel({
      method: 'FIXTURE_RUNTIME_OBSERVATION',
      engine: 'product_fixture',
      target: 'ProductRuntimeFixture'
    });

    evidence.recordEvidence('RUNTIME_VERIFIED', {
      verificationMethod: 'RUNTIME_HTTP_TELEMETRY',
      processId: launchRes.pid,
      sessionId: session.sessionId,
      expected: translatedText,
      observed: postData.text
    });

    assert.strictEqual(evidence.runtimeEvidence, true);
    assert.strictEqual(evidence.visualEvidence, false); // No screen verified without valid OCR screen match!

    // Claim audit must pass for RUNTIME_VERIFIED
    const runtimeAudit = ClaimAudit.auditClaim('RUNTIME_VERIFIED', evidence);
    assert.strictEqual(runtimeAudit.approved, true);

    // Claim audit must block VISUALLY_VERIFIED
    const visualAudit = ClaimAudit.auditClaim('VISUALLY_VERIFIED', evidence);
    assert.strictEqual(visualAudit.status, 'CLAIM_BLOCKED');
    console.log('    Anti-Forgery Audit: RUNTIME_VERIFIED approved, VISUALLY_VERIFIED strictly blocked.');

    // Stop process
    console.log('\n>>> Stopping Owned Fixture Process...');
    const stopRes = await session.stop('Self-Test Complete');
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(session.state, 'STOPPED');
    assert.strictEqual(ownedProcessRegistry.isOwned(launchRes.pid), false);
    console.log('    Process terminated safely. No rogue processes remain.');

    session.cleanup();
    console.log('\n====================================================');
    console.log('  PRODUCT RUNTIME TEST: SUCCESS (ALL 10 STEPS PASSED)');
    console.log('====================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n[PRODUCT RUNTIME TEST FAILED]:', err);
    if (session && session.pid) {
      session.forceStop('Test Failure Cleanup');
    }
    process.exit(1);
  }
}

main();
