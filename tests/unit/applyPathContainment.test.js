/**
 * applyPathContainment.test.js — REGRESSÃO de V-002 / H-001.
 *
 * A checagem textual de caminho (`..`, `/`, `C:/`) não vê symlink nem
 * junction: um diretório `jogo/link` apontando para fora tem um caminho que
 * NÃO contém `..` e NÃO é absoluto — e mesmo assim a escrita sai da raiz.
 *
 * Este teste verifica contenção FÍSICA (realpath), e prova que o caminho
 * legítimo continua funcionando — uma proteção que bloqueia tudo também
 * "passa" nos testes de ataque, e não serve para nada.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const { resolveInsideRoot } = require(path.join(RAIZ, 'src/core/applyContract.js'));

let pass = 0, fail = 0;
function ok(n) { pass++; console.log('  ok   ' + n); }
function bad(n, d) { fail++; console.log('  FALHA ' + n + (d ? '  <<< ' + d : '')); }

const T = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-path-'));
const OUTSIDE = path.join(T, 'fora');
const GAME = path.join(T, 'jogo');
const GAME_EVIL = path.join(T, 'jogo-evil'); // irmão com prefixo comum

fs.mkdirSync(OUTSIDE, { recursive: true });
fs.mkdirSync(path.join(GAME, 'sub'), { recursive: true });
fs.mkdirSync(GAME_EVIL, { recursive: true });
fs.writeFileSync(path.join(OUTSIDE, 'segredo.txt'), 'ORIGINAL');

function chk(rel, esperado, nome) {
  let got;
  try { got = resolveInsideRoot(GAME, rel); }
  catch (e) { got = 'LANCOU:' + e.message; }
  if (got === esperado) ok(nome + ' -> ' + got);
  else bad(nome, 'resolveu ' + got + ', esperado ' + esperado);
}

console.log('');
console.log('--- caminhos LEGÍTIMOS devem continuar funcionando ---');
chk('raiz.txt', true, 'raiz relativa');
chk('sub/arquivo.txt', true, 'subdiretorio');
chk('sub/novo/ainda-nao-existe.txt', true, 'subdir novo (arquivo ainda nao existe)');
chk('profundo/a/b/c/novo.txt', true, 'subir varios niveis');

console.log('');
console.log('--- TRAVERSAL ---');
chk('../fora.txt', false, '../');
chk('..\\fora.txt', false, '..\\ (windows)');
chk('../../fora.txt', false, '../../');
chk('sub/../../fora.txt', false, 'sai e volta');
chk('../jogo-evil/x.txt', false, 'prefixo falso (irmao jogo-evil)');
chk('./../fora.txt', false, './../');

console.log('');
console.log('--- ABSOLUTO / UNC ---');
chk('C:/Windows/x.txt', false, 'drive C:');
chk('D:/x.txt', false, 'drive D:');
chk('/etc/passwd', false, 'absoluto posix');
chk('//server/share/x.txt', false, 'UNC com //');
chk('\\\\servidor\\compart\\x.txt', false, 'UNC com backslash');

console.log('');
console.log('---边界 ---');
chk('', false, 'string vazia');
chk('.', false, 'ponto');
chk('..', false, 'so ..');

console.log('');
console.log('--- SYMLINK / JUNCTION (fisico, nao textual) ---');
let junctionOk = false;
try {
  fs.symlinkSync(OUTSIDE, path.join(GAME, 'link'), 'junction');
  junctionOk = true;
  chk('link/segredo.txt', false, 'escrita atraves do junction');
  chk('link', false, 'o proprio junction');
  chk('link/sub/novo.txt', false, 'junction com subpasta nova');
  // prova fisica: o arquivo de fora NAO pode ter sido criado
  chk('link/criado-pelo-teste.txt', false, 'criar novo atraves do junction');
} catch (e) {
  console.log('  (junction indisponivel nesta plataforma: ' + e.code + ') — verificacao textual acima permanece');
}

console.log('');
console.log('--- EVIDÊNCIA FÍSICA: nada escapou ---');
{
  const antes = fs.readdirSync(OUTSIDE).slice().sort().join(',');
  const chamadas = ['../fora.txt', '..\\fora.txt', '../../fora.txt', 'C:/Windows/x.txt',
    '//server/share/x.txt', '/etc/passwd'];
  if (junctionOk) chamadas.push('link/escapado.txt', 'link', 'link/sub/x.txt');
  let aceitou = 0;
  for (const rel of chamadas) {
    if (resolveInsideRoot(GAME, rel)) { aceitou++; console.log('    >>> PERMITIU: ' + rel); }
  }
  const depois = fs.readdirSync(OUTSIDE).slice().sort().join(',');
  if (aceitou === 0) ok('nenhum dos ' + chamadas.length + ' caminhos de ataque foi aceito');
  else bad('nenhum caminho de ataque aceito', aceitou + ' aceitos');
  if (antes === depois) ok('conteudo de ' + OUTSIDE + ' inalterado (' + (depois || 'vazio') + ')');
  else bad('nada foi criado fora da raiz', 'antes=[' + antes + '] depois=[' + depois + ']');
}

console.log('');
console.log('--- INTEGRACAO: o PLANO do contrato nao aceita caminho de ataque ---');
{
  // O guard unitario acima nao basta: o que realmente protege e o filtro do
  // plano dentro de startApplyContract. Se esse filtro nao chamar o guard, a
  // protecao existe mas nao esta no caminho do produto.
  const { startApplyContract } = require(path.join(RAIZ, 'src/core/applyContract.js'));
  const d = path.join(T, 'jogo2');
  fs.mkdirSync(path.join(d, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(d, 'sub', 'ok.json'), '{}');
  const textos = [
    { id: 'a1', file: 'sub/ok.json', original: 'A', clean: 'A' },
    { id: 'a2', file: '../fora.txt', original: 'B', clean: 'B' },
    { id: 'a3', file: '..\\fora.txt', original: 'C', clean: 'C' },
    { id: 'a4', file: 'C:/Windows/x.txt', original: 'D', clean: 'D' },
    { id: 'a5', file: '/etc/passwd', original: 'E', clean: 'E' },
    { id: 'a6', file: '//server/share/x.txt', original: 'F', clean: 'F' },
  ];
  const ac = startApplyContract(d, textos);
  // `filesToBackup` so existe no objeto devolvido por `finish()` — o contrato
  // vivo expoe `wrote`/`finish`, nao o plano.
  const plano = ac.finish({ success: false }).filesToBackup.slice();
  const maus = ['../fora.txt', '..\\fora.txt', 'C:/Windows/x.txt', '/etc/passwd', '//server/share/x.txt'];
  const noPlano = maus.filter((m) => plano.includes(m));
  if (noPlano.length === 0) ok('plano rejeitou os ' + maus.length + ' caminhos de ataque');
  else bad('plano rejeitou caminhos de ataque', 'aceitou: ' + noPlano.join(', '));
  if (plano.includes('sub/ok.json')) ok('plano manteve o caminho legitimo (sub/ok.json)');
  else bad('plano manteve caminho legitimo', 'plano=' + JSON.stringify(plano));
  // e o wrote() de um arquivo fora do plano tem de ser recusado
  const w = ac.wrote('../fora.txt', 'x');
  if (w && w.recorded === false) ok('ac.wrote() recusou escrita fora do plano');
  else bad('ac.wrote() recusou escrita fora do plano', JSON.stringify(w));
}

fs.rmSync(T, { recursive: true, force: true });
console.log('');
console.log('pass=' + pass + ' fail=' + fail);
if (fail > 0) process.exit(1);