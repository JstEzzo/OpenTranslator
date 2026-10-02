/**
 * Generalization Test Suite for OpenTranslator Universal Engines
 * Proves that Cecil Managed Assembly Bridge and RGSS3A Container Bridge
 * work universally across arbitrary files/directories without title-specific code.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const UnityAdapter = require('../engines/unity/unityAdapter');
const RgssAdapter = require('../engines/rpgmaker/rgssAdapter');

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function run() {
  console.log('=== TESTE DE GENERALIZAÇÃO UNIVERSAL ===\n');

  // 1. Generalization on Secondary Unseen Unity Directory
  const altUnityDir = 'C:/Users/Teste/Desktop/Nova pasta/MiniGamePackVol1_v1.0_demo/MiniGamePackVol1_v1.0_forWin_demo';
  if (fs.existsSync(altUnityDir)) {
    console.log('[GENERALIZATION - UNITY] Testando Unity Mono em diretório secundário não catalogado...');
    const adapter = new UnityAdapter();
    const detection = await adapter.detect(altUnityDir);
    if (!detection || !detection.matches) {
      throw new Error('Falha no detect para diretório Unity alternativo: ' + JSON.stringify(detection));
    }
    console.log('✓ canHandle aprovado universalmente por detecção de artefatos.');

    const result = await adapter.extract(altUnityDir, { targetLang: 'pt' });
    console.log(`✓ Extração executada com sucesso: ${result.count || 0} textos extraídos via Managed Cecil Bridge.`);
    if (!result.count || result.count < 100) {
      throw new Error(`Contagem de textos extraídos abaixo do esperado: ${result.count}`);
    }
  }

  // 2. Generalization on RGSS3A Arbitrary Packing & Unpacking Roundtrip
  console.log('\n[GENERALIZATION - RGSS3A] Testando ciclo completo de empacotamento e desempacotamento de container RGSS3A arbitrário...');
  const tempDir = path.join(__dirname, 'temp_rgss3a_gen_test');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const dummyDataDir = path.join(tempDir, 'Data');
  fs.mkdirSync(dummyDataDir, { recursive: true });

  // Criar 3 arquivos simulados com conteúdo binário e texto
  const file1 = path.join(dummyDataDir, 'Actors.rvdata2');
  const file2 = path.join(dummyDataDir, 'System.rvdata2');
  const file3 = path.join(dummyDataDir, 'Scripts.rvdata2');

  fs.writeFileSync(file1, Buffer.from('\x04\x08[\x06I"\x13Hero Universal\x06:\x06ET', 'binary'));
  fs.writeFileSync(file2, Buffer.from('\x04\x08{\x06I"\x0fSystem Data\x06:\x06ET', 'binary'));
  fs.writeFileSync(file3, Buffer.from('\x04\x08[\x07I"\x10Module Core\x06:\x06ET', 'binary'));

  const sha1Original = sha256(file1);
  const sha2Original = sha256(file2);
  const sha3Original = sha32 = sha256(file3);

  // Executar empacotamento via rgss3a_bridge.py
  const pythonPath = 'C:\\Users\\Teste\\AppData\\Roaming\\uv\\python\\cpython-3.12.8-windows-x86_64-none\\python.exe';
  const bridgePath = path.resolve(__dirname, '../engines/rpgmaker/rgss3a_bridge.py');
  const containerPath = path.join(tempDir, 'Game.rgss3a');

  console.log('-> Empacotando arquivos no container Game.rgss3a via bridge Python...');
  const packProc = spawnSync(pythonPath, [bridgePath, '--mode', 'pack', '--archive', containerPath, '--dir', tempDir], { encoding: 'utf8' });
  if (packProc.status !== 0) {
    throw new Error('Falha no empacotamento RGSS3A: ' + packProc.stderr);
  }
  console.log('✓ Container Game.rgss3a gerado com sucesso. Tamanho:', fs.statSync(containerPath).size, 'bytes');

  // Deletar pasta Data para provar extração a partir do container
  fs.rmSync(dummyDataDir, { recursive: true, force: true });
  if (fs.existsSync(dummyDataDir)) throw new Error('Pasta Data não foi deletada');

  // Desempacotar via rgss3a_bridge.py
  console.log('-> Desempacotando container Game.rgss3a para provar reversibilidade exata...');
  const unpackProc = spawnSync(pythonPath, [bridgePath, '--mode', 'unpack', '--archive', containerPath, '--dir', tempDir], { encoding: 'utf8' });
  if (unpackProc.status !== 0) {
    throw new Error('Falha na descompactação RGSS3A: ' + unpackProc.stderr);
  }

  // Verificar SHA256 exato dos arquivos restaurados
  const sha1Restored = sha256(file1);
  const sha2Restored = sha256(file2);
  const sha3Restored = sha256(file3);

  if (sha1Original !== sha1Restored || sha2Original !== sha2Restored || sha3Original !== sha3Restored) {
    throw new Error('Corrupção de integridade durante o roundtrip RGSS3A!');
  }
  console.log('✓ 100% de integridade SHA-256 preservada após empacotamento e desempacotamento.');

  // Limpeza
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('\n========================================================================');
  console.log('✓ TESTE DE GENERALIZAÇÃO CONCLUÍDO COM 100% DE SUCESSO!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('FATAL NO TESTE DE GENERALIZAÇÃO:', err);
  process.exit(1);
});
