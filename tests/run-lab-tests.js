/**
 * OpenTranslator — Laboratório Automático de Testes em Jogos Reais
 * Analisa cada pasta de jogo em C:\Users\Teste\Desktop\Nova pasta\*
 * de forma 100% não-destrutiva, gerando LAB_REPORT.md e LAB_REPORT.json.
 */

const fs = require('fs');
const path = require('path');
const EngineDetector = require('./src/core/engineDetector');
const defaultRegistry = require('./src/core/engineRegistry');
const TranslationPipeline = require('./src/core/translationPipeline');

// Registra adapters
const RenpyAdapter = require('./src/engines/renpy/renpyAdapter');
const RpgMakerAdapter = require('./src/engines/rpgmaker/rpgMakerAdapter');
const ElectronAdapter = require('./src/engines/electron/electronAdapter');
const UnityAdapter = require('./src/engines/unity/unityAdapter');
const GenericAdapter = require('./src/engines/generic/genericAdapter');

defaultRegistry.register(new RenpyAdapter());
defaultRegistry.register(new RpgMakerAdapter());
defaultRegistry.register(new ElectronAdapter());
defaultRegistry.register(new UnityAdapter());
defaultRegistry.register(new GenericAdapter());

const labDir = 'C:\\Users\\Teste\\Desktop\\Nova pasta';

async function runLab() {
  console.log('Iniciando varredura automatizada do laboratório de jogos reais...');
  const entries = fs.readdirSync(labDir, { withFileTypes: true });
  const reportList = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const gamePath = path.join(labDir, entry.name);
    console.log(`\n[ANALISANDO] ${entry.name}`);

    try {
      const detection = await EngineDetector.detect(gamePath);
      const targetDir = detection.detectedSubdir || gamePath;
      const adapter = defaultRegistry.resolveAdapter(detection);
      const caps = adapter ? adapter.getCapabilities(targetDir, gamePath) : detection.capabilities;

      let extractedCount = 0;
      let protectedTokensCount = 0;
      let extractionOk = false;
      let extractionNote = '';

      // Tenta extração em dry-run se houver suporte a arquivos
      if (caps && (caps.staticFiles || caps.nativeLocalization || caps.archives)) {
        try {
          const pipeline = new TranslationPipeline();
          const dryRes = await pipeline.dryRun(gamePath);
          if (dryRes.success) {
            extractedCount = dryRes.totalStrings;
            protectedTokensCount = dryRes.protectedTokensCount;
            extractionOk = true;
          }
        } catch (e) {
          extractionNote = e.message;
        }
      }

      reportList.push({
        folder: entry.name,
        engine: detection.engine,
        engineVersion: detection.engineVersion,
        architecture: detection.architecture,
        confidence: Math.round(detection.confidence * 100) + '%',
        evidence: detection.evidence,
        warnings: detection.warnings,
        capabilities: caps,
        extractionTested: extractionOk,
        stringsExtracted: extractedCount,
        tokensProtected: protectedTokensCount,
        note: extractionNote
      });

      console.log(`   Engine: ${detection.engine} (${detection.engineVersion}) [${Math.round(detection.confidence * 100)}%] | Strings: ${extractedCount}`);
    } catch (err) {
      console.error(`   Erro ao analisar ${entry.name}: ${err.message}`);
    }
  }

  // Grava LAB_REPORT.json
  const jsonPath = path.resolve(__dirname, '../docs/reports', 'LAB_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reportList, null, 2), 'utf8');
  console.log(`\nRelatório salvo em JSON: ${jsonPath}`);

  // Gera LAB_REPORT.md
  let md = '# Relatório do Laboratório de Jogos Reais (LAB_REPORT)\n\n';
  md += `**Data da Execução:** ${new Date().toISOString()}\n`;
  md += `**Diretório do Laboratório:** \`${labDir}\`\n\n`;
  md += '| Jogo / Pasta | Engine Detectada | Versão | Confiança | Strings Extraídas | Tokens Protegidos | Estratégia Recomendada |\n';
  md += '|---|---|---|---|---|---|---|\n';

  for (const r of reportList) {
    const strat = r.capabilities?.nativeLocalization ? 'Nativo (tl/)' : r.capabilities?.staticFiles ? 'Arquivos Estáticos' : r.capabilities?.dom ? 'DOM / ASAR' : r.capabilities?.runtimeHook ? 'Hook / Runtime' : 'Fallback OCR';
    md += `| **${r.folder}** | ${r.engine} | ${r.engineVersion} | ${r.confidence} | ${r.stringsExtracted} | ${r.tokensProtected} | ${strat} |\n`;
  }

  md += '\n## Detalhes por Jogo\n\n';
  for (const r of reportList) {
    md += `### ${r.folder}\n`;
    md += `- **Engine:** ${r.engine} (${r.engineVersion})\n`;
    md += `- **Arquitetura:** ${r.architecture}\n`;
    md += `- **Confiança:** ${r.confidence}\n`;
    md += `- **Evidências:** ${r.evidence.join('; ')}\n`;
    if (r.warnings && r.warnings.length > 0) {
      md += `- **Avisos:** ${r.warnings.join('; ')}\n`;
    }
    md += `- **Capacidades:** \`${JSON.stringify(r.capabilities)}\`\n\n`;
  }

  const mdPath = path.resolve(__dirname, '../docs/reports', 'LAB_REPORT.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Relatório salvo em Markdown: ${mdPath}`);
}

runLab();
