const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Script de Diagnóstico e Validação Automática de Jogos RPG Maker
// Uso: node diagnose_game.js "<caminho_da_pasta_do_jogo>"

const gameDir = process.argv[2];

if (!gameDir) {
  console.log('\n❌ ERRO: Por favor, forneça o caminho da pasta do jogo.');
  console.log('Exemplo: node diagnose_game.js "C:\\Users\\Teste\\Desktop\\Nova pasta\\MBFK Windows"\n');
  process.exit(1);
}

if (!fs.existsSync(gameDir)) {
  console.log(`\n❌ ERRO: O diretório especificado não existe: ${gameDir}\n`);
  process.exit(1);
}

console.log('\n==================================================');
console.log(`🔍 INICIANDO DIAGNÓSTICO DO JOGO: ${path.basename(gameDir)}`);
console.log(`📂 Pasta: ${gameDir}`);
console.log('==================================================\n');

const report = {
  engine: 'Desconhecida',
  virtualized: false,
  visuStella: false,
  corruptedJsonFiles: [],
  zombieProcesses: [],
  warnings: []
};

// 1. Detectar Engine e Estrutura
const dataDir = path.join(gameDir, 'data');
const systemJson = path.join(dataDir, 'System.json');
const effectsDir = path.join(gameDir, 'effects');
const indexHtml = path.join(gameDir, 'index.html');
const pluginsJs = path.join(gameDir, 'js', 'plugins.js');

if (fs.existsSync(systemJson)) {
  if (fs.existsSync(effectsDir) || fs.existsSync(path.join(dataDir, 'Effects'))) {
    report.engine = 'RPG Maker MZ (MZ)';
  } else {
    report.engine = 'RPG Maker MV (MV)';
  }
} else if (fs.existsSync(path.join(gameDir, 'Data', 'BasicData')) || fs.existsSync(path.join(gameDir, 'Data', 'MapData')) || fs.existsSync(path.join(gameDir, 'data.wolf'))) {
  report.engine = 'Wolf RPG Editor (wolf)';
} else {
  // Tenta ver se está dentro de www/
  const wwwDir = path.join(gameDir, 'www');
  if (fs.existsSync(path.join(wwwDir, 'data', 'System.json'))) {
    report.engine = 'RPG Maker MV/MZ (com subpasta www)';
  }
}

// 2. Detectar Empacotamento Virtualizado (Enigma Virtual Box)
if (!fs.existsSync(indexHtml) || !fs.existsSync(pluginsJs)) {
  report.virtualized = true;
  report.warnings.push('O jogo está consolidado/virtualizado (Enigma Virtual Box). Arquivos HTML/JS de boot não estão expostos fisicamente.');
}

// 3. Validar integridade dos JSONs na pasta data/ (arquivos binários disfarçados)
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  files.forEach(f => {
    const filePath = path.join(dataDir, f);
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      report.corruptedJsonFiles.push(f);
    }
  });
}

// 4. Detectar Processos Zumbis Ativos no Windows para esta pasta
try {
  const escapedDir = gameDir.replace(/'/g, "''");
  const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process | Where-Object { $_.Path -like '${escapedDir}\\\\*' } | Select-Object Id, Name"`;
  const psOutput = execSync(psCmd).toString().trim();
  if (psOutput) {
    const lines = psOutput.split('\n').slice(2); // Pular cabeçalhos
    lines.forEach(l => {
      const match = l.trim().match(/^(\d+)\s+(.+)$/);
      if (match) {
        report.zombieProcesses.push({ pid: match[1], name: match[2] });
      }
    });
  }
} catch (e) {}

// 5. Detectar VisuStella DRM (Verificar se há strings cifradas nos plugins se exposto)
if (fs.existsSync(pluginsJs)) {
  try {
    const content = fs.readFileSync(pluginsJs, 'utf8');
    if (content.includes('VisuMZ') || content.includes('VisuStella')) {
      report.visuStella = true;
    }
  } catch (e) {}
} else if (fs.existsSync(dataDir)) {
  // Tentar buscar por arquivos de plugins na pasta data
  const pluginsJson = path.join(dataDir, 'Plugins.json');
  if (fs.existsSync(pluginsJson)) {
    try {
      const content = fs.readFileSync(pluginsJson, 'utf8');
      if (content.includes('VisuMZ') || content.includes('VisuStella')) {
        report.visuStella = true;
      }
    } catch (e) {}
  }
}

// ==================== IMPRIMIR RELATÓRIO ====================
console.log('⚙️  INFORMAÇÕES GERAIS:');
console.log(`- Motor Detectado: ${report.engine}`);
console.log(`- Virtualizado (Enigma): ${report.virtualized ? 'SIM (Executável Único)' : 'NÃO (Arquivos Expostos)'}`);
console.log(`- Usa VisuStella (DRM/Anti-Cheat): ${report.visuStella ? 'SIM (Atenção redobrada com evals)' : 'NÃO'}`);
console.log('--------------------------------------------------');

console.log('\n📂 ANÁLISE DE ARQUIVOS JSON (data/):');
if (report.corruptedJsonFiles.length > 0) {
  console.log(`⚠️  Detectados ${report.corruptedJsonFiles.length} arquivos disfarçados (não são JSONs de texto válidos):`);
  report.corruptedJsonFiles.forEach(f => {
    console.log(`  - [IGNORAR] data/${f} (Binário/Encriptado original de fábrica)`);
  });
} else {
  console.log('✅ Todos os arquivos da pasta data/ são JSONs de texto válidos.');
}
console.log('--------------------------------------------------');

console.log('\n🖥️  PROCESSOS EM MEMÓRIA (Zumbis):');
if (report.zombieProcesses.length > 0) {
  console.log(`⚠️  Detectados ${report.zombieProcesses.length} processos travados em background:`);
  report.zombieProcesses.forEach(p => {
    console.log(`  - PID: ${p.pid} | Nome: ${p.name}`);
  });
  console.log('👉 Ação recomendada: Executar a limpeza de processos no tradutor antes de iniciar.');
} else {
  console.log('✅ Nenhum processo zumbi do jogo rodando em segundo plano.');
}
console.log('--------------------------------------------------');

console.log('\n📝 RECOMENDAÇÕES DE COMPATIBILIDADE:');
if (report.virtualized && !report.engine.includes('wolf')) {
  console.log('💡 [RECOMENDAÇÃO] Pular injeção do CheatOverlay.js no index.html (evita crashes nativos 0xC0000005).');
}
if (report.engine.includes('MZ') && report.visuStella) {
  console.log('💡 [RECOMENDAÇÃO] Ativar os filtros estritos de siglas em maiúsculas (HP, MP, PV, VP, ATK) no isTranslatableText.');
  console.log('💡 [RECOMENDAÇÃO] Ignorar por completo a extração de termos técnicos (basic, params, messages) no System.json.');
}
if (report.engine.includes('wolf')) {
  try {
    const stats = fs.statSync(path.join(gameDir, 'Game.exe'));
    if (stats.size > 4000000) {
      console.log('💡 [RECOMENDAÇÃO] Este jogo usa uma versão recente de Wolf RPG (v2.24+). O servidor usará wolfHook.dll automaticamente.');
    } else {
      console.log('💡 [RECOMENDAÇÃO] Este jogo usa uma versão antiga de Wolf RPG. O servidor usará wolfHook3.dll automaticamente.');
    }
  } catch(e) {}
}
console.log('==================================================\n');
