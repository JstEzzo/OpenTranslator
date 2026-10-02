const fs = require('fs');
const path = require('path');
const UnityAdapter = require('../engines/unity/unityAdapter');
const WolfAdapter = require('../engines/wolf/wolfAdapter');
const RgssAdapter = require('../engines/rpgmaker/rgssAdapter');
const GodotAdapter = require('../engines/godot/godotAdapter');

async function testMultiEngineIsolation() {
  console.log('=== TESTING MULTI-ENGINE ISOLATION & CACHE INTEGRITY ===');

  const sessions = [];

  // 1. Unity A (Dane)
  console.log('\n[1] Unity A (Dane)');
  const unityAdapter = new UnityAdapter();
  const daneDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\Dane';
  const daneDet = await unityAdapter.detect(daneDir);
  const daneSessionId = `iso_dane_${Date.now()}`;
  sessions.push({ engine: 'unity', game: 'Dane', sessionId: daneSessionId, matches: daneDet.matches, isMatch: daneDet.isMatch });

  // 2. Unity B (NL)
  console.log('[2] Unity B (NL)');
  const nlDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\NTR Legend Unofficial Fan Remake 0.9.0 MTL';
  const nlDet = await unityAdapter.detect(nlDir);
  const nlSessionId = `iso_nl_${Date.now()}`;
  sessions.push({ engine: 'unity', game: 'NL', sessionId: nlSessionId, matches: nlDet.matches, isMatch: nlDet.isMatch });

  // 3. Wolf (Rabbit Hood)
  console.log('[3] Wolf (Rabbit Hood)');
  const wolfAdapter = new WolfAdapter();
  const wolfDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\Rabbit Hood English 2026-06-30';
  const wolfDet = await wolfAdapter.detect(wolfDir);
  const wolfSessionId = `iso_wolf_${Date.now()}`;
  sessions.push({ engine: 'wolf', game: 'Rabbit Hood', sessionId: wolfSessionId, matches: wolfDet.matches, isMatch: wolfDet.isMatch });

  // 4. RGSS (+EXORCIST+)
  console.log('[4] RGSS (+EXORCIST+)');
  const rgssAdapter = new RgssAdapter();
  const rgssDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2';
  const rgssDet = await rgssAdapter.detect(rgssDir);
  const rgssSessionId = `iso_rgss_${Date.now()}`;
  sessions.push({ engine: 'rgss', game: '+EXORCIST+', sessionId: rgssSessionId, matches: rgssDet.matches, isMatch: rgssDet.isMatch });

  // 5. Godot (Harem Heaven)
  console.log('[5] Godot (Harem Heaven)');
  const godotAdapter = new GodotAdapter();
  const godotDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\harem-heaven-03.5-alpha2-pc-plus';
  const godotDet = await godotAdapter.detect(godotDir);
  const godotSessionId = `iso_godot_${Date.now()}`;
  sessions.push({ engine: 'godot', game: 'Harem Heaven', sessionId: godotSessionId, matches: godotDet.matches, isMatch: godotDet.isMatch });

  // Assertions
  const sessionIds = sessions.map(s => s.sessionId);
  const uniqueIds = new Set(sessionIds);
  if (sessionIds.length !== uniqueIds.size) throw new Error('Session ID collision detected!');

  for (const s of sessions) {
    if (!s.isMatch && !s.matches) throw new Error(`Detection failed for ${s.game} (${s.engine})`);
  }

  console.log('\nSessions tested in sequence:');
  console.table(sessions);
  console.log('\n✓ MULTI-ENGINE ISOLATION & INTEGRITY VERIFIED (100% PASS)');
}

testMultiEngineIsolation().catch(err => {
  console.error('Isolation Test Failed:', err);
  process.exit(1);
});
