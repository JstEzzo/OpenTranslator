const fs = require('fs');
const path = require('path');
const rc = require('./src/engines/renpy/renpyCommon');

const gameDir = 'C:/Users/Teste/Desktop/Nova pasta/UL_V0.8/game';
const origContent = fs.readFileSync(path.join(gameDir, 'data/events/e07.rpy.original'), 'utf-8');
const currContent = fs.readFileSync(path.join(gameDir, 'data/events/e07.rpy'), 'utf-8');

const ptChars = /[ãõáéíóúàèìòùâêîôûçÃÕÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÇ]/;

const origTexts = rc.extractRenpyRpyTexts(origContent, 'e07.rpy.original');
const currTexts = rc.extractRenpyRpyTexts(currContent, 'e07.rpy');

let origEn = 0, origPt = 0;
let currEn = 0, currPt = 0;

for (const t of origTexts) {
  if (ptChars.test(t.clean)) origPt++;
  else origEn++;
}
for (const t of currTexts) {
  if (ptChars.test(t.clean)) currPt++;
  else currEn++;
}

console.log('e07.rpy.original:', origTexts.length, 'texts - EN:', origEn, 'PT:', origPt);
console.log('e07.rpy (current):', currTexts.length, 'texts - EN:', currEn, 'PT:', currPt);

// Show first 3 English strings from current file
let shown = 0;
for (const t of currTexts) {
  if (!ptChars.test(t.clean) && shown < 3) {
    console.log('  EN:', JSON.stringify(t.clean.substring(0, 120)));
    shown++;
  }
}
