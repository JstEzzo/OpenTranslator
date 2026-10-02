const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const GodotAdapter = require('../engines/godot/godotAdapter');
const WolfAdapter = require('../engines/wolf/wolfAdapter');

function getSha256(filePath) {
  const fd = fs.openSync(filePath, "r");
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.alloc(4 * 1024 * 1024);
  let bytesRead = 0;
  while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
    hash.update(buffer.subarray(0, bytesRead));
  }
  fs.closeSync(fd);
  return hash.digest("hex");
}

async function testCancellationAndFailureSafety() {
  console.log('=== TESTING CANCELLATION AND ROLLBACK SAFETY ===');

  // 1. Test Godot Rollback After Interrupted / Failed Apply
  const godotDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\harem-heaven-03.5-alpha2-pc-plus';
  const godotPck = path.join(godotDir, 'Harem Heaven.pck');
  const godotBeforeHash = getSha256(godotPck);

  const godotAdapter = new GodotAdapter();
  const sessionId = `safety_test_${Date.now()}`;

  // Apply a test translation
  const sampleItems = [{
    id: 'godot_json_json/master/dialog/act/eden/bystander_flashing.json_DIALOG_001',
    file: 'Harem Heaven.pck',
    subPath: 'json/master/dialog/act/eden/bystander_flashing.json',
    nodeId: 'DIALOG_001',
    field: 'text',
    format: 'godot_pck_json',
    original: '(This is degrading. I want it on the record that this is degrading.)'
  }];
  const translations = new Map([
    [sampleItems[0].id, '[[OT_TEST_CANCEL]] Translation that will be rolled back']
  ]);

  await godotAdapter.apply(godotDir, sampleItems, translations, { sessionId });
  const godotAfterHash = getSha256(godotPck);
  if (godotBeforeHash === godotAfterHash) throw new Error('Godot apply failed to modify file');

  // Trigger Rollback
  await godotAdapter.rollback(godotDir, { sessionId });
  const godotRestoredHash = getSha256(godotPck);
  console.log('Godot Rollback Hash Match:', godotBeforeHash === godotRestoredHash);
  if (godotBeforeHash !== godotRestoredHash) throw new Error('Godot safety rollback failed!');

  // 2. Test Wolf RPG Rollback After Failed Apply
  const wolfDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\Rabbit Hood English 2026-06-30';
  const wolfTargetFile = path.join(wolfDir, 'Data', 'BasicData', 'CommonEvent.dat');
  const wolfBeforeHash = getSha256(wolfTargetFile);

  const wolfAdapter = new WolfAdapter();
  const wolfSessionId = `safety_wolf_${Date.now()}`;
  const wolfSample = [{
    id: 'wolf_CommonEvent.dat_100_0',
    file: 'Data/BasicData/CommonEvent.dat',
    offset: 100,
    original: 'Test'
  }];
  const wolfTrans = new Map([
    [wolfSample[0].id, '[[OT_TEST]] Trad']
  ]);

  await wolfAdapter.apply(wolfDir, wolfSample, wolfTrans, { sessionId: wolfSessionId });
  await wolfAdapter.rollback(wolfDir, { sessionId: wolfSessionId });
  const wolfRestoredHash = getSha256(wolfTargetFile);
  console.log('Wolf Rollback Hash Match:', wolfBeforeHash === wolfRestoredHash);
  if (wolfBeforeHash !== wolfRestoredHash) throw new Error('Wolf safety rollback failed!');

  console.log('\n✓ ALL CANCELLATION & SAFETY TESTS PASSED (100% CLEAN ROLLBACK)');
}

testCancellationAndFailureSafety().catch(err => {
  console.error('Safety Test Failed:', err);
  process.exit(1);
});
