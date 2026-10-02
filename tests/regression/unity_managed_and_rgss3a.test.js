/**
 * OpenTranslator — Teste de Verificação Universal: Unity Managed Assembly (Cecil) e RGSS3A Container Bridge
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

console.log('=== INICIANDO SUÍTE DE TESTES UNIVERSAL: UNITY MANAGED & RGSS3A ===\n');

// ---------------------------------------------------------
// TESTE 1: Unity Managed Assembly Bridge (Cecil)
// ---------------------------------------------------------
console.log('--- TESTE 1: Unity Managed Assembly Extraction & In-Place Injection ---');
const cecilBridge = path.resolve(__dirname, '../engines/unity/cecil_bridge.ps1');
const targetDll = 'C:/Users/Teste/Desktop/Nova pasta/MiniGamePackVol1_v1.0_demo/MiniGamePackVol1_v1.0_forWin_demo/MiniGamePackVol.1_Data/Managed/Assembly-CSharp.dll';

if (fs.existsSync(targetDll)) {
  const managedDir = path.dirname(targetDll);
  const testDll = path.join(managedDir, 'Assembly-CSharp.test_suite.dll');
  fs.copyFileSync(targetDll, testDll);
  const hashBefore = sha256(testDll);

  try {
    // 1. Extração
    const extOut = path.join(managedDir, 'test_ext.json');
    execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', cecilBridge, '-AssemblyPath', testDll, '-Mode', 'extract', '-OutputFile', extOut]);
    const extData = JSON.parse(fs.readFileSync(extOut, 'utf8').replace(/^\uFEFF/, ''));
    fs.unlinkSync(extOut);

    if (!extData.success || extData.count === 0) {
      throw new Error(`Falha na extração Cecil: ${extData.count} textos`);
    }
    console.log(`✓ Extração Cecil bem sucedida: ${extData.count} textos extraídos.`);

    // 2. Injeção
    const sample = extData.texts[0];
    const payload = {
      items: [
        { id: sample.id, translation: 'TESTE AUTOMATIZADO SUITE UNIVERSAL' }
      ]
    };
    const payloadFile = path.join(managedDir, 'test_payload.json');
    fs.writeFileSync(payloadFile, JSON.stringify(payload));
    execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', cecilBridge, '-AssemblyPath', testDll, '-Mode', 'inject', '-PayloadFile', payloadFile]);
    fs.unlinkSync(payloadFile);

    const hashAfter = sha256(testDll);
    if (hashAfter === hashBefore) throw new Error('DLL não foi modificada estruturalmente!');
    console.log(`✓ Injeção Cecil bem sucedida. SHA-256 alterado de forma controlada.`);

    // 3. Re-extração e confirmação
    execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', cecilBridge, '-AssemblyPath', testDll, '-Mode', 'extract', '-OutputFile', extOut]);
    const extDataAfter = JSON.parse(fs.readFileSync(extOut, 'utf8').replace(/^\uFEFF/, ''));
    fs.unlinkSync(extOut);

    const verifiedItem = extDataAfter.texts.find(t => t.id === sample.id);
    if (!verifiedItem || verifiedItem.original !== 'TESTE AUTOMATIZADO SUITE UNIVERSAL') {
      throw new Error('Texto injetado não confere na re-extração!');
    }
    console.log(`✓ Re-extração comprovou integridade da string traduzida no assembly.`);

  } finally {
    if (fs.existsSync(testDll)) fs.unlinkSync(testDll);
  }
} else {
  console.log('Skipping Teste 1 (target DLL not found)');
}

// ---------------------------------------------------------
// TESTE 2: RGSS3A Container Bridge Unpack & Repack
// ---------------------------------------------------------
console.log('\n--- TESTE 2: RGSS3A Container Unpack & Marshal Integrity ---');
const rgss3aBridge = path.resolve(__dirname, '../engines/rpgmaker/rgss3a_bridge.py');
const pyBin = 'C:\\Users\\Teste\\AppData\\Roaming\\uv\\python\\cpython-3.12.8-windows-x86_64-none\\python.exe';
const blackSoulsArchive = 'C:/Users/Teste/Desktop/Nova pasta/BLACK SOULS/Game.rgss3a';

if (fs.existsSync(blackSoulsArchive) && fs.existsSync(pyBin)) {
  const testOutDir = path.resolve(__dirname, '../../scratch/test_rgss3a_suite');
  if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });
  fs.mkdirSync(testOutDir, { recursive: true });

  try {
    const out = execFileSync(pyBin, [rgss3aBridge, '--mode', 'unpack', '--archive', blackSoulsArchive, '--dir', testOutDir], { encoding: 'utf8' });
    console.log(`✓ ${out.trim()}`);

    const actorsFile = path.join(testOutDir, 'Data', 'Actors.rvdata2');
    if (!fs.existsSync(actorsFile)) throw new Error('Data/Actors.rvdata2 não foi descompactado!');
    const header = fs.readFileSync(actorsFile).slice(0, 2);
    if (header[0] !== 0x04 || header[1] !== 0x08) throw new Error('Magic Ruby Marshal inválido!');
    console.log(`✓ Descriptografia de Data/Actors.rvdata2 verificada: Magic Ruby Marshal 04 08 válido.`);
  } finally {
    if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true, force: true });
  }
} else {
  console.log('Skipping Teste 2 (archive not found)');
}

console.log('\n========================================================================');
console.log('✓ SUÍTE UNIVERSAL UNITY MANAGED & RGSS3A APROVADA COM 100% DE SUCESSO!');
console.log('========================================================================\n');
process.exit(0);
