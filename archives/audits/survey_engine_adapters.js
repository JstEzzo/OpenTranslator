const fs = require('fs');
const path = require('path');

// Let's inspect the engine adapters in OpenTranslator to see what each adapter supports
const adapters = [
    { name: 'rpgmaker', path: './src/engines/rpgmaker/rpgMakerAdapter.js' },
    { name: 'renpy', path: './src/engines/renpy/renpyAdapter.js' },
    { name: 'wolf', path: './src/engines/wolf/wolfAdapter.js' },
    { name: 'unity', path: './src/engines/unity/unityAdapter.js' },
    { name: 'godot', path: './src/engines/godot/godotAdapter.js' },
    { name: 'cocos', path: './src/engines/cocos/cocos2dxAdapter.js' },
    { name: 'unreal', path: './src/engines/unreal/unrealAdapter.js' }
];

console.log('=== ENGINE ADAPTER CAPABILITY SURVEY ===');
for (const ad of adapters) {
    try {
        const full = path.join(__dirname, ad.path);
        if (fs.existsSync(full)) {
            const Cls = require(full);
            const inst = new Cls();
            console.log(`Adapter [${ad.name}]:`);
            console.log(`  Engine ID: ${inst.engineId || inst.id}`);
            console.log(`  Methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(inst)).filter(m => m !== 'constructor').join(', ')}`);
        } else {
            console.log(`Adapter [${ad.name}]: FILE NOT FOUND (${ad.path})`);
        }
    } catch(e) {
        console.log(`Adapter [${ad.name}]: ERROR: ${e.message}`);
    }
}
