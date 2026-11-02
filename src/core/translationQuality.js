"use strict";

// Detect generation loops; do not rewrite dialogue or guess a missing translation.
function words(text) {
  return String(text || '').normalize('NFKC').toLowerCase()
    .replace(/⟦OT_[^⟧]+⟧|\{[^{}]*\}|\[[^\[\]]*\]/gu, ' ')
    .match(/\p{L}[\p{L}\p{M}\p{N}'’-]*/gu) || [];
}
function repetitions(tokens, width) {
  const runs = []; let maximum = 1;
  for (let i = 0; i + width <= tokens.length; i++) {
    const same = i >= width && tokens.slice(i, i + width).join(' ') === tokens.slice(i - width, i).join(' ');
    runs[i] = same ? (runs[i - width] || 1) + 1 : 1;
    maximum = Math.max(maximum, runs[i]);
  }
  return maximum;
}
function closeEcho(a, b) {
  if (a === b) return true;
  if (a.length >= 3 && b === a.slice(1)) return true;
  if (b.length >= 3 && a === b.slice(1)) return true;
  if (Math.max(a.length, b.length) > 64) return false;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 2) return false;
  let previous = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j-1]+1, previous[j]+1, previous[j-1]+(a[i-1]===b[j-1]?0:1));
    previous = current;
  }
  return previous[b.length] <= Math.min(2, Math.floor(Math.max(a.length,b.length)/4));
}
function inspect(original, translated) {
  const issues = [];
  if (typeof original !== 'string' || typeof translated !== 'string') return { valid:false, issues:['INVALID_TRANSLATION_TYPE'] };
  if (original === translated) return {valid:true, issues};
  if ((translated.includes('<unk>') && !original.includes('<unk>')) || (translated.includes('⁇') && !original.includes('⁇'))) issues.push('UNKNOWN_MODEL_TOKEN');
  const modelTag = />>\s*(?:pob|por|pt(?:[_-]br)?)\s*<</gi;
  if ((translated.match(modelTag) || []).length > (original.match(modelTag) || []).length) issues.push('MODEL_CONTROL_TOKEN');
  const source = words(original), target = words(translated);
  let allowed = Math.max(...[1,2,3,4].map(width => repetitions(source,width)));
  for (const token of source) {
    const characters = Array.from(token);
    for (let width = 1; width <= Math.min(4, characters.length / 2); width++) {
      const count = repetitions(characters, width);
      if (count * width === characters.length) allowed = Math.max(allowed, count);
    }
  }
  if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(original)) {
    const characters = Array.from(original.replace(/[^\p{L}\p{M}]/gu, ''));
    allowed = Math.max(allowed, ...[1,2,3,4].map(width => repetitions(characters,width)));
  }
  for (let width = 1; width <= 4; width++) {
    const count = repetitions(target,width);
    const completeEcho = width > 1 && target.length >= width*2 && target.length % width === 0 && count*width === target.length;
    if (count > allowed && (count >= 3 || completeEcho)) { issues.push('REPEATED_TRANSLATION'); break; }
  }
  if (source.length === 1 && allowed === 1 && target.length >= 2 && target.every(token => closeEcho(target[0],token))) issues.push('REPEATED_SHORT_LABEL');
  return { valid:issues.length===0, issues:[...new Set(issues)] };
}
module.exports = {inspect};
