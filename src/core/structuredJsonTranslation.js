'use strict';

const fs = require('fs');
const path = require('path');
const Quality = require('./translationQuality');
const Placeholders = require('./placeholderIntegrityValidator');

function valueAt(data, keys) {
  for (const key of keys) {
    if (!data || !Object.prototype.hasOwnProperty.call(data, key)) throw new Error('JSON text path no longer exists');
    data = data[key];
  }
  return data;
}

// Prepare every file before the caller creates backups or writes any output.
function prepare(gameDir, texts, translations, protector) {
  const root = fs.realpathSync(gameDir);
  const updates = new Map();
  let count = 0;
  for (const text of texts) {
    const translation = translations.get ? translations.get(text.id) : translations[text.id];
    if (typeof translation !== 'string' || !translation.trim() || translation === text.original) continue;
    if (!Array.isArray(text.keySegments) || !text.keySegments.length) throw new Error('Text must be extracted again before applying this JSON format');
    const file = path.resolve(root, text.file);
    const relative = path.relative(root, fs.realpathSync(file));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('JSON file escapes game directory');
    if (!updates.has(file)) {
      const source = fs.readFileSync(file, 'utf8');
      updates.set(file, { file, relative: path.relative(root, file).replace(/\\/g, '/'), source, data: JSON.parse(source) });
    }
    const update = updates.get(file);
    if (valueAt(update.data, text.keySegments) !== text.original) throw new Error('JSON text source changed; extract again');
    const restored = protector.restore(translation, text.tokens || []).restoredText;
    if (!Quality.inspect(text.original, restored).valid || !Placeholders.validate(text.original, restored).valid) throw new Error('JSON translation failed quality or placeholder validation');
    const parent = valueAt(update.data, text.keySegments.slice(0, -1));
    parent[text.keySegments.at(-1)] = restored;
    count++;
  }
  return { count, updates: [...updates.values()].map(update => ({ ...update, output: JSON.stringify(update.data, null, 2) })) };
}

function commit(update) {
  if (fs.readFileSync(update.file, 'utf8') !== update.source) throw new Error('JSON file changed after backup');
  fs.writeFileSync(update.file, update.output, 'utf8');
  if (fs.readFileSync(update.file, 'utf8') !== update.output) throw new Error('JSON write verification failed');
}

module.exports = { prepare, commit };
