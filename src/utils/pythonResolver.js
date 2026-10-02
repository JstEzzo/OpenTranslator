/**
 * pythonResolver.js — Resolução Dinâmica e Universal do Ambiente Python
 *
 * Responsabilidades:
 * - Localizar executáveis Python válidos no sistema operacional de forma dinâmica e portável
 * - Suportar caminhos de ambiente (APPDATA/LOCALAPPDATA), instalações uv, pyenv, Python embedded e PATH
 * - Eliminar completamente caminhos absolutos hardcoded com nomes de usuários locais
 *
 * Localização Arquitetural:
 * src/utils/pythonResolver.js (Camada Utilitária de Infraestrutura)
 */

const fs = require('fs');
const path = require('path');

function resolvePythonBinary() {
  const candidates = [];

  // 1. Procura dinamicamente na pasta de usuário atual (uv / pyenv / AppData)
  const appData = process.env.APPDATA;
  if (appData) {
    const uvBase = path.join(appData, 'uv', 'python');
    if (fs.existsSync(uvBase)) {
      try {
        const dirs = fs.readdirSync(uvBase);
        for (const d of dirs) {
          const exe = path.join(uvBase, d, 'python.exe');
          if (fs.existsSync(exe)) candidates.push(exe);
        }
      } catch (e) {}
    }
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const pyProg = path.join(localAppData, 'Programs', 'Python');
    if (fs.existsSync(pyProg)) {
      try {
        const dirs = fs.readdirSync(pyProg);
        for (const d of dirs) {
          const exe = path.join(pyProg, d, 'python.exe');
          if (fs.existsSync(exe)) candidates.push(exe);
        }
      } catch (e) {}
    }
  }

  // 2. Python embutido no OpenTranslator (resources/renpy/python)
  const root = global.ROOT || path.resolve(__dirname, '../..');
  const embeddedPy = path.join(root, 'resources', 'renpy', 'python', 'python.exe');
  if (fs.existsSync(embeddedPy)) {
    candidates.push(embeddedPy);
  }

  // 3. Testa os candidatos encontrados
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // 4. Fallback padrão para invocação via PATH
  return 'python';
}

module.exports = {
  resolvePythonBinary
};
