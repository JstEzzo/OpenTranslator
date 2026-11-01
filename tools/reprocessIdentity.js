#!/usr/bin/env node
/**
 * reprocessIdentity.js — PASSO 9/11/13
 *
 * Lê o game/tl/<lang>/*.rpy já gravado pelo OpenTranslator, classifica CADA
 * entrada com o guard C1 (classifyIdentity) e separa em dois destinos:
 *
 *   MANTER  -> já traduzida de verdade, OU identidade legítima
 *              (nome próprio, identificador, símbolo, número)
 *   PENDENTE-> `new == old` onde o original é PROSA em prosa.
 *              Estas são as que nunca foram traduzidas e estão gravadas como
 *              se fossem. O Ren'Py as aceita como tradução válida, daí o
 *              inglês continuar na tela.
 *
 * NÃO inventa tradução. NÃO escreve no jogo. Emite:
 *   - <out>/pending.json   : entradas que o provider real precisa reprocessar
 *   - <out>/kept.json      : o que já está correto e não pode ser tocado
 *
 * Usar de novo quando o provider voltar:
 *   node tools/reprocessIdentity.js <gameDir> [lang] [outDir]
 */
const fs = require('fs');
const path = require('path');
const { classifyIdentity, isTranslated } = require('../src/core/scriptDetector');

function parseRpyEntries(file) {
  const L = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = [];
  let origem = null;
  let origemLinha = 0;
  let idx = 0;
  for (let i = 0; i < L.length; i++) {
    const mo = L[i].match(/^\s*#\s*(.+?):(\d+)\s*$/);
    if (mo) { origem = mo[1]; origemLinha = +mo[2]; continue; }
    const m = L[i].match(/^\s*old\s+"((?:[^"\\]|\\.)*)"\s*$/);
    if (!m) continue;
    const mn = (L[i + 1] || '').match(/^\s*new\s+"((?:[^"\\]|\\.)*)"\s*$/);
    const original = m[1];
    const translated = mn ? mn[1] : null;
    const verdict = isTranslated(original, translated, { targetLang: 'pt' });
    out.push({
      original,
      translated,
      sourceFile: origem,
      line: origemLinha,
      bucket: null,
      reason: verdict.reason,
      index: idx++,
    });
  }
  return out;
}

function classifyAll(entries) {
  let keep = 0, pend = 0;
  for (const e of entries) {
    if (e.translated === null || String(e.translated).trim() === '') {
      e.bucket = 'pending'; e.reason = 'tradução ausente/vazia'; pend++;
      continue;
    }
    if (e.translated !== e.original) {
      e.bucket = 'keep'; e.reason = 'traduzido'; keep++;
      continue;
    }
    // new == old: decide se a identidade é legítima
    const cls = classifyIdentity(e.original);
    if (cls.identitySafe) {
      e.bucket = 'keep'; e.reason = `identidade legítima (${cls.reason})`; keep++;
    } else {
      e.bucket = 'pending'; e.reason = `TRANSLATION_IDENTITY: ${cls.reason}`; pend++;
    }
  }
  return { keep, pend };
}

function main() {
  const gameDir = process.argv[2];
  const lang = process.argv[3] || 'pt_BR';
  const outDir = process.argv[4] || path.join(require('os').tmpdir(), 'opencode', 'reprocess');
  if (!gameDir) { console.error('uso: node tools/reprocessIdentity.js <gameDir> [lang] [outDir]'); process.exit(1); }

  const tlDir = path.join(gameDir, 'game', 'tl', lang);
  if (!fs.existsSync(tlDir)) { console.error('tl dir nao encontrado: ' + tlDir); process.exit(1); }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(tlDir).filter((f) => f.endsWith('.rpy'));
  const report = { lang, tlDir, geradoEm: new Date().toISOString(), arquivos: [] };
  const allPending = [], allKept = [];

  for (const f of files) {
    const entries = parseRpyEntries(path.join(tlDir, f));
    if (!entries.length) continue;
    const { keep, pend } = classifyAll(entries);
    report.arquivos.push({ arquivo: f, total: entries.length, keep, pend });
    for (const e of entries) (e.bucket === 'pending' ? allPending : allKept).push({ ...e, bucketCat: f });
  }

  report.total = allPending.length + allKept.length;
  report.pendentes = allPending.length;
  report.mantidas = allKept.length;

  fs.writeFileSync(path.join(outDir, 'pending.json'), JSON.stringify(allPending, null, 1), 'utf8');
  fs.writeFileSync(path.join(outDir, 'kept.json'), JSON.stringify(allKept, null, 1), 'utf8');
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1), 'utf8');

  console.log('=== REPROCESSAMENTO DE IDENTIDADE (C1) ===');
  console.log('  tl dir   : ' + tlDir);
  console.log('  total    : ' + report.total);
  console.log('  MANTIDA  : ' + report.mantidas + '   (traduzidas + identidade legítima — não tocar)');
  console.log('  PENDENTE : ' + report.pendentes + '   (prosa gravada como tradução — o provider precisa traduzir)');
  console.log('');
  for (const a of report.arquivos) {
    console.log('    ' + a.arquivo.padEnd(30) + 'total=' + String(a.total).padStart(6)
      + ' mantidas=' + String(a.keep).padStart(6) + ' pendentes=' + String(a.pend).padStart(6));
  }
  console.log('');
  console.log('  artefatos em ' + outDir + ': pending.json, kept.json, report.json');
  console.log('  >>> NENHUMA TRADUÇÃO FOI FABRICADA. O jogo NÃO foi modificado.');
}

module.exports = { parseRpyEntries, classifyAll };

if (require.main === module) main();