/**
 * OpenTranslator — Passo 5: Descoberta Automática da Biblioteca
 * Analisa C:\Users\Teste\Desktop\Nova pasta sem qualquer lista manual.
 */

const fs = require('fs');
const path = require('path');
const LibraryDiscovery = require('./src/core/libraryDiscovery');

const LAB_DIR = 'C:/Users/Teste/Desktop/Nova pasta';
const OUTPUT_FILE = path.resolve(__dirname, '../discovered_games.json');

async function main() {
  console.log(`=== INICIANDO DESCOBERTA AUTOMÁTICA DA BIBLIOTECA: ${LAB_DIR} ===\n`);

  if (!fs.existsSync(LAB_DIR)) {
    throw new Error(`Biblioteca não encontrada: ${LAB_DIR}`);
  }

  const discovery = new LibraryDiscovery();
  const rawItems = fs.readdirSync(LAB_DIR);
  console.log(`Itens brutos encontrados na raiz da pasta: ${rawItems.length}\n`);

  const results = [];
  const stats = {
    GAME: 0,
    TOOL: 0,
    SAVE: 0,
    AUXILIARY: 0,
    EMPTY: 0,
    UNKNOWN: 0
  };

  for (let i = 0; i < rawItems.length; i++) {
    const itemName = rawItems[i];
    const fullPath = path.join(LAB_DIR, itemName);
    console.log(`[${i + 1}/${rawItems.length}] Analisando estruturalmente: ${itemName}...`);

    const classified = await discovery.classifyItem(fullPath);
    results.push(classified);
    stats[classified.classification] = (stats[classified.classification] || 0) + 1;

    console.log(`  -> Classificação: ${classified.classification}`);
    console.log(`  -> Razão: ${classified.reason}`);
    console.log(`  -> Confiança: ${Math.round(classified.confidence * 100)}%`);
    if (classified.engine) console.log(`  -> Engine: ${classified.engine} (${classified.engineVersion || 'N/A'})`);
    console.log('');
  }

  // Ordena por nome para estabilidade do relatório
  results.sort((a, b) => a.name.localeCompare(b.name));

  const outputPayload = {
    timestamp: new Date().toISOString(),
    libraryPath: LAB_DIR,
    totalDiscovered: results.length,
    classificationStats: stats,
    items: results
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`✓ discovered_games.json gerado com sucesso em: ${OUTPUT_FILE}\n`);

  console.log('=== RESUMO DA CLASSIFICAÇÃO ESTRUTURAL ===');
  console.log(`Total Analisado : ${results.length}`);
  console.log(`GAME            : ${stats.GAME}`);
  console.log(`TOOL            : ${stats.TOOL}`);
  console.log(`SAVE            : ${stats.SAVE}`);
  console.log(`AUXILIARY       : ${stats.AUXILIARY}`);
  console.log(`EMPTY           : ${stats.EMPTY}`);
  console.log(`UNKNOWN         : ${stats.UNKNOWN}`);
}

main().catch(err => {
  console.error('Falha no Passo 5:', err);
  process.exit(1);
});
