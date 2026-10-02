const fs = require('fs');
const path = require('path');

const RpgMakerAdapter = require('./src/engines/rpgmaker/rpgMakerAdapter');
const RenpyAdapter = require('./src/engines/renpy/renpyAdapter');
const WolfAdapter = require('./src/engines/wolf/wolfAdapter');
const UnityAdapter = require('./src/engines/unity/unityAdapter');
const GodotAdapter = require('./src/engines/godot/godotAdapter');
const CocosAdapter = require('./src/engines/cocos/cocos2dxAdapter');

const baseDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

const targets = [
    { name: 'Toki kan Yuusha (gitgud)', adapter: new RpgMakerAdapter() },
    { name: 'RJ01058687_en', adapter: new RpgMakerAdapter() },
    { name: 'Marge Mania v0.1', adapter: new RpgMakerAdapter() },
    { name: 'RJ01618221', adapter: new RpgMakerAdapter() },
    { name: 'BLACK SOULS', adapter: new RpgMakerAdapter() },
    { name: '[RPG] [happypink] +EXORCIST+ Chris and the Cursed Town Ver.1.04 2', adapter: new RpgMakerAdapter() },
    { name: 'An Obedient Childhood Friend Is Easily Cucked', adapter: new WolfAdapter() },
    { name: 'Rabbit Hood English 2026-06-30', adapter: new WolfAdapter() },
    { name: 'ArmoredSuitSolganteRenpy0.2-pc', adapter: new RenpyAdapter() },
    { name: 'summertime_saga_realistic_remake-0.3.0-win', adapter: new RenpyAdapter() },
    { name: 'summertime_saga_realistic_remake-21.0.0-RB.1-win', adapter: new RenpyAdapter() },
    { name: 'Dane', adapter: new UnityAdapter() },
    { name: 'MiniGamePackVol1_v1.0_demo', adapter: new UnityAdapter() },
    { name: 'NTR Legend Unofficial Fan Remake 0.9.0 MTL', adapter: new UnityAdapter() },
    { name: 'NTR伝説 FInal_Ver.1.0.2_64bit', adapter: new UnityAdapter() },
    { name: 'Nova pasta', adapter: new UnityAdapter() },
    { name: 'Nova pasta (2)', adapter: new UnityAdapter() },
    { name: 'ロリっ子健康診断2_1.0', adapter: new UnityAdapter() },
    { name: 'harem-heaven-03.5-alpha2-pc-plus', adapter: new GodotAdapter() },
    { name: '[Kimochi] [RJ01156735] 刻印館からの脱出', adapter: new CocosAdapter() }
];

async function runAudit() {
    console.log('=== TEST EXTRACTION ON ALL GAMES ===');
    const results = [];

    for (const t of targets) {
        const gamePath = path.join(baseDir, t.name);
        console.log(`\nTesting [${t.name}]...`);
        const itemRes = { name: t.name, gamePath };
        try {
            // Check capabilities
            const caps = t.adapter.getCapabilities ? t.adapter.getCapabilities(gamePath) : {};
            itemRes.capabilities = caps;

            // Run extract
            const extRes = await t.adapter.extract(gamePath);
            itemRes.extract = {
                ok: extRes.ok,
                textCount: extRes.texts ? extRes.texts.length : (extRes.entries ? extRes.entries.length : 0),
                requiresExternalTool: extRes.requiresExternalTool || false,
                externalToolInfo: extRes.externalToolInfo || extRes.externalTool || null,
                error: extRes.error || null,
                details: extRes.details || extRes.stats || null
            };
            console.log(`  Extract result: ok=${itemRes.extract.ok}, count=${itemRes.extract.textCount}, extTool=${itemRes.extract.requiresExternalTool}, err=${itemRes.extract.error}`);
        } catch (e) {
            itemRes.error = e.message;
            console.log(`  EXCEPTION: ${e.message}`);
        }
        results.push(itemRes);
    }

    fs.writeFileSync(path.join(__dirname, 'adapters_live_audit.json'), JSON.stringify(results, null, 2), 'utf8');
    console.log('\nAudit complete! Saved to adapters_live_audit.json');
}

runAudit();
