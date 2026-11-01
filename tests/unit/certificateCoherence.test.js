/**
 * certificateCoherence.test.js — REGRESSÃO de B-10, B-11, B-12.
 *
 * Antes, contadores aritmeticamente impossíveis produziam um certificado
 * COMPLETED. A causa era dupla:
 *   1) `pendingCount = max(informado, translatable - covered)` — quando
 *      covered > translatable a subtração dava negativo e o Math.max zerava,
 *      destravando o ramo COMPLETED;
 *   2) `applicationPercent` não tinha teto, então `applied/covered` expunha
 *      "50000%" como se fosse um número válido.
 *
 * Este teste NÃO usa grep nem lê o código-fonte: chama issue() e observa o
 * resultado. Um teste que valida a forma do arquivo passaria com o bug.
 */
'use strict';

const path = require('path');
const TC = require(path.resolve(__dirname, '..', '..', 'src/core/translationCertificate.js'));

let pass = 0, fail = 0;
function ok(n) { pass++; console.log('  ok   ' + n); }
function bad(n, d) { fail++; console.log('  FALHA ' + n + (d ? '  <<< ' + d : '')); }

const base = {
  engine: 'renpy',
  game: 'SampleGame',
  totalDetected: 100,
  translatable: 100,
  universeComplete: true,
  verification: { verified: true, filesChanged: 1 },
};

console.log('');
console.log('--- B-10 coveredTexts > translatable ---');
{
  const c = TC.issue({ ...base, coveredTexts: 9999, appliedCount: 9999, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED' || c.isSuccess === true) bad('B-10 nao completa com covered > translatable', c.finalStatus);
  else ok('B-10 nao completa com covered > translatable -> ' + c.finalStatus);
  if (!/excede translatable/.test(c.reason)) bad('B-10 nomeia a incoerencia', c.reason);
  else ok('B-10 nomeia a incoerencia no reason');
  if (/9999\/100/.test(c.reason)) bad('B-10 nao emite reason autocontraditorio', c.reason);
  else ok('B-10 nao emite mais "9999/100 textos"');
}
{ // igualdade deve continuar válida
  const c = TC.issue({ ...base, coveredTexts: 100, appliedCount: 100, pendingCount: 0 });
  if (c.finalStatus !== 'COMPLETED') bad('B-10 covered == translatable continua COMPLETED', c.finalStatus);
  else ok('B-10 covered == translatable continua COMPLETED (limite nao regrediu)');
}
{
  const c = TC.issue({ ...base, coveredTexts: 0, appliedCount: 0, pendingCount: 100 });
  if (c.finalStatus === 'COMPLETED' || c.isSuccess) bad('B-10 covered=0 nao completa', c.finalStatus);
  else ok('B-10 covered=0 nao completa -> ' + c.finalStatus);
}

console.log('');
console.log('--- B-11 translatedNow > totalDetected ---');
{
  const c = TC.issue({ ...base, totalDetected: 10, translatable: 10, coveredTexts: 500, translatedNow: 500, appliedCount: 500, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED' || c.isSuccess === true) bad('B-11 nao completa com translated > detected', c.finalStatus);
  else ok('B-11 nao completa com translated > detected -> ' + c.finalStatus);
  if (!/excede totalDetected/.test(c.reason)) bad('B-11 nomeia a incoerencia', c.reason);
  else ok('B-11 nomeia a incoerencia no reason');
}
{
  const c = TC.issue({ ...base, translatedNow: 0, cacheHits: 0, coveredTexts: 0, appliedCount: 0, pendingCount: 100 });
  if (c.finalStatus === 'COMPLETED') bad('B-11 translated=0 nao completa', c.finalStatus);
  else ok('B-11 translated=0 nao completa -> ' + c.finalStatus);
}

console.log('');
console.log('--- B-12 applicationPercent ---');
{
  const c = TC.issue({ ...base, coveredTexts: 1, appliedCount: 500, pendingCount: 99 });
  if (!Number.isFinite(c.applicationPercent) || c.applicationPercent < 0 || c.applicationPercent > 100) {
    bad('B-12 applied=500/covered=1 nao expoe >100', 'app%=' + c.applicationPercent);
  } else ok('B-12 applied=500/covered=1 -> app%=' + c.applicationPercent);
  if (c.finalStatus === 'COMPLETED') bad('B-12 estado invalido rebaixa', c.finalStatus);
  else ok('B-12 applied > covered rebaixa -> ' + c.finalStatus);
}
// varredura completa: nenhum valor pode sair de [0,100]
{
  const VALS = [0, 1, 50, 99, 100, 101, 500, 50000, -1, -500, NaN, Infinity, -Infinity];
  let ruins = [];
  for (const v of VALS) {
    const c = TC.issue({ ...base, coveredTexts: 1, appliedCount: v, pendingCount: 0 });
    const ap = c.applicationPercent;
    if (typeof ap !== 'number' || !Number.isFinite(ap) || ap < 0 || ap > 100) {
      ruins.push('applied=' + v + ' -> app%=' + ap);
    }
  }
  if (ruins.length) bad('B-12 varredura: nenhum valor fora de [0,100]', ruins.join(' | '));
  else ok('B-12 varredura: ' + VALS.length + ' valores de applied, todos com app% em [0,100]');
}

console.log('');
console.log('--- nao-regressão: casos legítimos ---');
{
  const c = TC.issue({ ...base, coveredTexts: 100, appliedCount: 100, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED' && c.isSuccess === true && c.coveragePercent === 100 && c.applicationPercent === 100) {
    ok('100% traduzido+aplicado -> COMPLETED, 100%, 100%');
  } else bad('100% traduzido+aplicado', c.finalStatus + ' ' + c.coveragePercent + '/' + c.applicationPercent);
}
{
  // 99% traduzido + 1% intradutivel, representado como totalDetected-translatable
  const c = TC.issue({ ...base, totalDetected: 500, translatable: 495, coveredTexts: 495, appliedCount: 495, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED') ok('99% + 5 intradutiveis -> COMPLETED (intradutivel nao vira pending)');
  else bad('99% + intradutivel', c.finalStatus);
}

console.log('');
console.log('--- cobertura do caso histórico 6581 ---');
{
  const c = TC.issue({
    engine: 'renpy', game: 'g', totalDetected: 6581, translatable: 6581,
    cacheHits: 17, translatedNow: 0, coveredTexts: 17, appliedCount: 0,
    pendingCount: 6564, isRateLimited: true, universeComplete: true,
    verification: { verified: false },
  });
  if (c.finalStatus !== 'COMPLETED' && c.isSuccess === false) {
    ok('6581/17 cache/0 applied -> ' + c.finalStatus + ' (nunca COMPLETED)');
  } else bad('6581 nunca pode ser COMPLETED', c.finalStatus + ' isSuccess=' + c.isSuccess);
}

console.log('');
console.log('--- cada guarda isolada (sem as outras dispararem junto) ---');
{ // appliedCount > coveredTexts SEM covered > translatable
  // covered=100 == translatable=100, entao so a 3a guarda pode agir.
  const c = TC.issue({ ...base, coveredTexts: 100, appliedCount: 150, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED' || c.isSuccess === true) bad('GUARDA applied>covered (isolada)', c.finalStatus);
  else ok('GUARDA applied>covered isolada -> ' + c.finalStatus);
  if (!/excede coveredTexts/.test(c.reason)) bad('GUARDA applied>covered nomeia a incoerencia', c.reason);
  else ok('GUARDA applied>covered nomeia a incoerencia');
}
{ // contagem negativa, com covered>0 para que applicationPercent seja calculado
  const c = TC.issue({ ...base, coveredTexts: 10, appliedCount: -1, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED' || c.isSuccess === true) bad('GUARDA negativa (isolada)', c.finalStatus);
  else ok('GUARDA negativa isolada -> ' + c.finalStatus);
  if (!/negativa/.test(c.reason)) bad('GUARDA negativa nomeia a incoerencia', c.reason);
  else ok('GUARDA negativa nomeia a incoerencia');
  if (!(c.applicationPercent >= 0 && c.applicationPercent <= 100)) bad('negativa nao expoe percentual invalido', 'app%=' + c.applicationPercent);
  else ok('negativa nao expoe app% fora de [0,100] (' + c.applicationPercent + ')');
}
{ // nao-finito: num() cai no fallback 0, o que mascararia "nada aplicado"
  for (const v of [NaN, Infinity, -Infinity]) {
    const c = TC.issue({ ...base, coveredTexts: 10, appliedCount: v, pendingCount: 0 });
    if (c.finalStatus === 'COMPLETED' || c.isSuccess === true) {
      bad('GUARDA nao-finito applied=' + v, c.finalStatus);
    } else if (!/nao-finito/.test(c.reason)) {
      bad('GUARDA nao-finito nomeia o campo applied=' + v, c.reason);
    } else ok('GUARDA nao-finito applied=' + v + ' -> ' + c.finalStatus);
  }
}
{ // nao-finito em outro campo tambem precisa ser pego
  const c = TC.issue({ ...base, coveredTexts: 10, appliedCount: 5, totalDetected: NaN, pendingCount: 0 });
  if (c.finalStatus === 'COMPLETED') bad('GUARDA nao-finito em totalDetected', c.finalStatus);
  else if (!/nao-finito/.test(c.reason)) bad('GUARDA nao-finito nomeia totalDetected', c.reason);
  else ok('GUARDA nao-finito em totalDetected -> ' + c.finalStatus);
}

console.log('');
console.log('--- 17C/17D: applied=0 — incompleto vs falha de aplicacao ---');
{ // traducao parcial: havia pendencia, logo nao era falha do apply
  const c = TC.issue({ ...base, coveredTexts: 50, appliedCount: 0, pendingCount: 50 });
  if (c.finalStatus !== 'INCOMPLETE') bad('17C parcial -> INCOMPLETE', c.finalStatus);
  else ok('17C 50% traduzido + 50% pendente -> ' + c.finalStatus);
  if (/aplicação/i.test(c.reason) && !/incompleta/i.test(c.reason)) bad('17C reason explica traducao incompleta', c.reason);
  else ok('17C reason explica traducao incompleta');
}
{
  const c = TC.issue({ ...base, coveredTexts: 1, appliedCount: 0, pendingCount: 99 });
  if (c.finalStatus !== 'INCOMPLETE') bad('17D parcial -> INCOMPLETE', c.finalStatus);
  else ok('17D 1% traduzido + 99% pendente -> ' + c.finalStatus);
}
{ // traducao ACABOU mas nada foi gravado: aqui SIM e falha de aplicacao
  const c = TC.issue({ ...base, coveredTexts: 100, appliedCount: 0, pendingCount: 0 });
  if (c.finalStatus !== 'FAILED_APPLICATION') bad('traducao completa sem gravacao -> FAILED_APPLICATION', c.finalStatus);
  else ok('traducao completa + 0 gravado -> ' + c.finalStatus + ' (nao mascarado como INCOMPLETE)');
  if (!/Inconsistência de aplicação/.test(c.reason)) bad('reason nomeia inconsistencia de aplicacao', c.reason);
  else ok('reason nomeia a inconsistencia de aplicacao');
}
{ // ja atualizado: nada a fazer, nada a aplicar — nao e falha
  const c = TC.issue({ ...base, coveredTexts: 100, appliedCount: 0, pendingCount: 0, alreadyUpToDate: true });
  if (c.finalStatus === 'FAILED_APPLICATION') bad('alreadyUpToDate nao e falha', c.finalStatus);
  else ok('alreadyUpToDate -> ' + c.finalStatus + ' (nao e falha de aplicacao)');
}

console.log('pass=' + pass + ' fail=' + fail);
if (fail > 0) process.exit(1);