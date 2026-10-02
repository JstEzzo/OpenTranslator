const fs = require('fs');
const RenpyExtractor = require('../src/engines/renpy/extractor/renpyExtractor');
const extractor = new RenpyExtractor();

const gameDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\summertimesaga-21.0.0-wip.8189-pc';

async function run() {
  if (!fs.existsSync(gameDir)) {
    console.log(`[INFO] Test game directory not present: ${gameDir}. Skipping physical game check.`);
    return;
  }
  const res = await extractor.extract(gameDir);
  console.log('Extraction success:', res.success, 'Total texts:', res.count);

  const userChecklist = [
    'Monday',
    'Bedroom',
    'To support the continued development of this game you can go to:',
    '"For internal use only." Errrmmm...',
    "Why can't I stop thinking about that delicious lotion smell?",
    'The main story will return in future updates.',
    'is showering before trying to enter her room',
    'Inspect the lotion from the drawer in her bedroom.',
    'Frank',
    'Debbie',
    'Jenny',
    'Erik',
    'Mrs. [self.clan]',
    'Coach [self.name]',
    'Longtime friend'
  ];

  console.log('\n--- VERIFICAÇÃO DOS TEXTOS DO USUÁRIO ---');
  let passCount = 0;
  for (const target of userChecklist) {
    const found = res.texts.find(t => t.original.includes(target) || t.clean.includes(target));
    if (found) {
      passCount++;
      console.log(`  [PASS] "${target}" => ${found.file}:${found.line} (${found.type})`);
    } else {
      console.log(`  [FAIL] "${target}"`);
    }
  }
  console.log(`\nResultados: ${passCount}/${userChecklist.length} encontrados!`);
}

run().catch(console.error);
