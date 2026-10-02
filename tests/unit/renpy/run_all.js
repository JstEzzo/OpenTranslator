/**
 * run_all.js — Executor mestre de todas as suítes de testes unitários de Ren'Py
 */

const extractorTest = require('./extractor.test');
const translatorTest = require('./translator.test');
const injectorTest = require('./injector.test');
const validatorTest = require('./validator.test');
const runtimeTest = require('./runtime.test');

async function main() {
  console.log('========================================================================');
  console.log('   INICIANDO SUÍTE COMPLETA DE TESTES AUTOMATIZADOS REN\'PY              ');
  console.log('========================================================================\n');

  const start = Date.now();

  await extractorTest();
  await translatorTest();
  await injectorTest();
  await validatorTest();
  await runtimeTest();

  const totalMs = Date.now() - start;
  console.log('========================================================================');
  console.log(`🏆 100% DOS TESTES AUTOMATIZADOS REN'PY PASSARAM COM SUCESSO! (${totalMs}ms)`);
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('\n❌ FALHA NA SUÍTE DE TESTES REN\'PY:', err);
  process.exit(1);
});
