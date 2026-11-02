"use strict";
const fs = require('fs'), path = require('path');
const NAME = 'OpenTranslatorTextWrap';
function plan(root) {
  const js = path.join(root, 'js'), index = path.join(js, 'plugins.js');
  if (!fs.existsSync(index)) return null;
  const text = fs.readFileSync(index, 'utf8');
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('Unsupported RPG Maker plugin index');
  const plugins = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(plugins)) throw new Error('RPG Maker plugin index must contain an array');
  const file = path.join(js, 'plugins', NAME + '.js');
  if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').startsWith('/* OpenTranslator:')) {
    throw new Error('Refusing to overwrite a plugin not owned by OpenTranslator');
  }
  return { index, file, text, start, end, plugins, created: !fs.existsSync(file) };
}
function install(root, prepared) {
  const update = prepared || plan(root);
  if (!update) return { installed: false, reason: 'No supported plugin index found' };
  const template = path.resolve(__dirname, '../../../resources/templates/' + NAME + '.js');
  const plugin = fs.readFileSync(template, 'utf8');
  const plugins = update.plugins.filter(item => item.name !== NAME);
  plugins.push({ name: NAME, status: true, description: 'OpenTranslator dialogue wrapping', parameters: {} });
  fs.mkdirSync(path.dirname(update.file), { recursive: true });
  fs.writeFileSync(update.file, plugin, 'utf8');
  fs.writeFileSync(update.index, update.text.slice(0, update.start) + JSON.stringify(plugins, null, 2) + update.text.slice(update.end + 1), 'utf8');
  return { installed: true, files: [update.file, update.index] };
}
module.exports = { plan, install };
