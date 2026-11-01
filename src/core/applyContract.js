/**
 * src/core/applyContract.js — o contrato que torna um adapter transacional
 *
 * ===========================================================================
 * FASE 10 — FECHANDO D1
 * ===========================================================================
 *
 * O que a survey mostrou, e que muda o tamanho da dívida:
 *
 *     denominador: 15 adapter(s) com apply()   (não 26 — 11 são bridges)
 *     ja devolvem modifiedFiles: 14/15
 *     ja devolvem fileHashes:     0/15
 *
 * Então a maior parte do trabalho já está feita: 14 adapters **já dizem quais
 * arquivos escreveram**. Faltam três coisas, e as três são declarativas:
 *
 *   1. `transactional: true`  — opt-in explícito
 *   2. `filesToBackup`        — o que será tocado, ANTES de escrever
 *   3. `fileHashes`           — o que foi escrito, para conferir depois
 *
 * ===========================================================================
 * POR QUE UM MÓDULO, E NÃO UM PATCH POR ADAPTER
 * ===========================================================================
 *
 * porque "declare three fields" é exatamente o tipo de instrução que 14
 * adapters implementam de 14 maneiras diferentes, e a divergência aparece
 * como um rollback que não restaura. Um módulo com uma linha por sitio de
 * escrita é mais barato de revisar e mais difícil de errar.
 *
 * ===========================================================================
 * A PARTE QUE NÃO É ÓBVVIA: POR QUE ISSO NÃO É VERIFICAÇÃO VACUOSA
 * ===========================================================================
 *
 * A pergunta que decide se `fileHashes` vale alguma coisa: como o hash é
 * calculado?
 *
 * Se o adapter escrevesse o arquivo e depois o pipeline lesse o arquivo para
 * hashear, a comparação seria o número contra ele mesmo — sempre passaria,
 * e `fileHashes` seria decoração. Foi exatamente o risco que existia no
 * desenho de "o pipeline hasheia o `modifiedFiles` do adapter".
 *
 * Por isso o hash é calculado do **conteúdo em memória, no momento da
 * escrita**, e a verificação relê do disco. Os dois lados são independentes:
 *
 *     escrita:  conteudoEmMemoria --hash--> esperado
 *     disco:    releituraDoDisco   --hash--> observado
 *
 * Se divergirem, alguma coisa aconteceu no caminho: escrita truncada,
 * arquivo fechado por outro processo, codificação alterada, ou o adapter
 * mentiu sobre o que escreveu. É uma checagem real, e é barata.
 *
 * `tests/unit/applyContract.test.js` planta um adapter que grava um arquivo
 * com conteúdo DIFERENTE do que declare, e exige que a transação reprove.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { hashText } = require('./applyTransaction');

/**
 * Deriva a lista de arquivos candidatos a partir dos textos extraídos.
 *
 * É a origem de `filesToBackup`. A lógica: um texto traduzível veio de um
 * arquivo; aplicar a tradução escreve nesse arquivo. Logo, o conjunto de
 * arquivos que `apply()` vai tocar é — no máximo — o conjunto de `file`
 * presentes nos textos.
 *
 * "No máximo" é load-bearing. Um adapter pode escrever algo que não veio de
 * texto nenhum: registrar plugin em `js/plugins.js`, injetar CSS, criar
 * manifesto. Esses arquivos **não** entram no backup por este caminho, e é
 * por isso que a transactação só é usada por adapters que optam
 * explicitamente: o opt-in é o adapter afirmando que seu conjunto de
 * escrita está coberto aqui. Quem escreve fora não opta.
 *
 * @param {Array<{file?:string}>} texts
 * @returns {string[]} caminhos relativos, normalizados e sem duplicata
 */
function planFilesFromTexts(texts, gameDir) {
  const out = new Set();
  for (const t of Array.isArray(texts) ? texts : []) {
    const f = t && t.file;
    if (typeof f !== 'string') continue;
    const bruto = String(f);
    // Nenhum caminho pode escapar do diretório do jogo. Um `file` com
    // `../` faria o backup escrever FORA do jogo.
    //
    // FASE 10 / C2 — A PRIMEIRA VERSÃO SÓ RECUSAVA `/` e `..`, e deixava
    // passar `C:/temp/x.json`. Um caminho ABSOLUTO do Windows nao contem
    // `..` nem comeca com `/`, entao passava. Com `path.join(gameDir,
    // 'C:/temp/x.json')` no Windows o resultado ainda fica dentro do jogo,
    // mas com `path.resolve` (usado na verificacao) resolve para fora. Era
    // a mesma classe de defeito que o `sanitizePath` da FASE 1 fechou no
    // HTTP: traversal por caminho absoluto.
    const limpo = bruto.replace(/\\/g, '/').replace(/^\.\//, '').trim();
    if (!limpo) continue;
    // V-002 / H-001 — a checagem textual acima (`..`, `/`, `C:/`) e
    // INSUFICIENTE. Ela nao ve symlink nem junction, que sao resolvidos pelo
    // sistema de arquivos, nao pela string. `gameRoot/link/x.json` nao contem
    // `..` e nao e absoluto — mas `link` aponta para fora do jogo, e a
    // escrita escapa. Por isso o plano so aceita o que `resolveInsideRoot`
    // confirma fisicamente.
    // Defense em profundidade. Primeiro a checagem TEXTUAL (barata, e cobre o
    // caso de `planFilesFromTexts` ser chamada sem raiz): traversal, absoluto
    // posix, absoluto Windows e UNC. Depois a checagem FISICA, que e a unica
    // que enxerga symlink e junction — invisiveis na string.
    if (limpo.includes('..')) continue;
    if (limpo.startsWith('/')) continue;
    if (/^[A-Za-z]:[\\/]/.test(bruto)) continue;
    // `planFilesFromTexts` e' exportada e pode ser chamada sem raiz (uso
    // isolado, teste). Sem `gameDir` nao ha como resolver o destino fisico,
    // entao fica na protecao textual acima — nunca em "aceitar tudo".
    if (gameDir && !resolveInsideRoot(gameDir, limpo)) continue;
    out.add(limpo);
  }
  return Array.from(out).sort();
}

/**
 * Inicia o registro de escritas de uma transação.
 *
 * Uso típico dentro de `apply()`:
 *
 *     const ac = startApplyContract(gameDir, texts);
 *     ...
 *     fs.writeFileSync(target, content, 'utf8');
 *     ac.wrote(relPath, content);
 *     ...
 *     return ac.finish({ success: true, count, modifiedFiles });
 *
 * `finish()` já devolve `transactional`, `filesToBackup` e `fileHashes`.
 */
function startApplyContract(gameDir, texts, opts = {}) {
  // FASE 10 — PLANO EXPLICITO
  //
  // O padrão deriva o plano dos `texts[].file`, e é o certo para a maioria dos
  // adapters: eles escrevem nos arquivos de onde os textos vieram.
  //
  // Mas `constructAdapter` NÃO é assim. Ele extrai de `data.json`,
  // `lang.json`, `locale.json` e escreve um arquivo NOVO,
  // `translation_pt_BR.json`, que nenhum texto menciona. Derivar o plano dos
  // textos daria um conjunto que não inclui o arquivo que ele realmente
  // escreve — e `ac.wrote` recusaria a escrita, como deve.
  //
  // Esse adapter é o caso legítimo para um plano declarado: ele sabe o que
  // escreve. Passar `opts.planFiles` é ele afirmar isso, e a garantia de
  // não-vacuidade continua valendo — o hash ainda vem da memória e a
  // verificação ainda relê o disco.
  const filesToBackup = Array.isArray(opts.planFiles) && opts.planFiles.length
    ? planFilesFromTexts(opts.planFiles.map((f) => ({ file: f })), gameDir)
    : planFilesFromTexts(texts, gameDir);
  const hashes = [];
  const foraDoPlano = [];
  const planoDeclarado = Array.isArray(opts.planFiles) && opts.planFiles.length > 0;

  return {
    gameDir,
    filesToBackup,
    planoDeclarado,

    /**
     * Declara uma escrita. Chame IMEDIATAMENTE depois do writeFileSync,
     * passando o MESMO conteúdo que foi escrito.
     *
     * @param {string} relPath caminho relativo ao diretório do jogo
     * @param {string|Buffer} conteudo o que foi escrito
     */
    wrote(relPath, conteudo) {
      const rel = String(relPath).replace(/\\/g, '/');
      // O arquivo tem que estar no conjunto que foi planejado. Se não está,
      // o adapter está escrevendo fora do que declarou — e isso é
      // exatamente a condição que torna a transação insegura.
      if (!filesToBackup.includes(rel)) {
        // FASE 10 / C6 — a escrita fora do plano era DESCARTADA em silencio,
        // e `foraDoPlano` era calculado a partir de `hashes` — que nunca a
        // continha. Resultado: o `transactional` saia `true` com um arquivo
        // fora do backup, e o rollback nao o alcançaria.
        foraDoPlano.push(rel);
        return {
          recorded: false,
          reason: `arquivo ${rel} fora do conjunto planejado; `
            + 'o adapter escreve mais do que os textos de origem indicam',
        };
      }
      // FASE 10 / C8 — EXISTEM DOIS FORMATOS, e eu os inverti.
      //
      //   `applyTransaction` consome `applyResult.fileHashes` com campo
      //   `hash`, e entao TRANSFORMA para `{path, expectedHash}` antes de
      //   chamar `verifyApplied`, que le `expectedHash`.
      //
      // Emiti `expectedHash` aqui, achando que `verifyApplied` era o
      // consumidor: a transformacao lia `h.hash` -> `undefined`, e a
      // comparacao nunca fechava. Uma verificacao que falha sempre parece
      // uma checagem rigorosa funcionando, e nao validava nada.
      //
      // Este modulo emite o formato de ENTRADA de `applyTransaction`; a
      // transformacao e responsibility de quem consome.
      hashes.push({
        path: rel,
        hash: hashText(conteudo),
        bytes: Buffer.isBuffer(conteudo) ? conteudo.length : Buffer.byteLength(String(conteudo), 'utf8'),
      });
      return { recorded: true };
    },

    /** Números para diagnóstico, sem prometer nada. */
    stats() {
      return {
        planejados: filesToBackup.length,
        escritos: hashes.length,
        // Um arquivo planejado que não foi declarado é o sinal de que o
        // adapter vai tocar algo que não está coberto. Não é erro sozinho —
        // o adapter pode ter decidido não traduzir aquele arquivo — mas é
        // informação que o opt-in deveria ter considerado.
        naoDeclarados: filesToBackup.filter((f) => !hashes.some((h) => h.path === f)),
        foraDoPlano: foraDoPlano.slice(),
      };
    },

    /**
     * Produz o objeto de resposta. Preserva os campos que o adapter já
     * devolvia e acrescenta o contrato.
     */
    finish(base = {}) {
      const st = this.stats();
      // FASE 10 / C6 — este local SHADOWED o vetor `foraDoPlano` do closure,
      // que e onde as escritas fora do plano sao registradas. O filtro sobre
      // `hashes` era sempre vazio (fora do plano nunca entra em `hashes`),
      // entao `foraDoPlano.length === 0` era SEMPRE verdade e o
      // `transactional` saia `true` com arquivo fora do backup.
      const foraDoPlanoLidos = foraDoPlano.slice();

      return {
        ...base,
        // Opt-in fica CONDICIONAL ao contrato estar de fato satisfeito.
        // Um adapter que declara `transactional: true` mas escreve fora do
        // plano não entra na transação: a transação seria incompleta e o
        // rollback não alcançaria o arquivo extra.
        // FASE 10 / C4 — a transacao tambem exige que algo TENHA sido
        // declarado. Sem nenhuma escrita registrada, o adapter nao fez o
        // trabalho, e o rollback nao teria o que restaurar.
        transactional: foraDoPlanoLidos.length === 0 && hashes.length > 0,
        filesToBackup,
        fileHashes: hashes,
        applyContract: {
          planejados: st.planejados,
          declarados: st.escritos,
          naoDeclarados: st.naoDeclarados.length,
          foraDoPlano: foraDoPlanoLidos,
        },
        // Campo constante para o pipeline discriminating com regex não é
        // preciso; leia `transactional`.
        get __contratoValido() {
          return this.transactional;
        },
      };
    },
  };
}

/**
 * V-002 / H-001 — resolve um caminho RELATIVO e confirma, FISICAMENTE, que
 * ele permanece dentro da raiz.
 *
 * Checagem textual nao basta: `..`, `/` e `C:/` sao visiveis na string, mas
 * symlink e junction nao. Um diretorio `jogo/link` apontando para fora tem um
 * caminho que NAO contem `..` e NAO e absoluto — e mesmo assim a escrita sai
 * da raiz. Por isso resolvemos e comparamos o destino real.
 *
 * @param {string} root  raiz (diretório do jogo)
 * @param {string} rel   caminho relativo, com `/` ou `\\`
 * @returns {boolean} true somente se o destino físico está dentro da raiz
 */
function resolveInsideRoot(root, rel) {
  try {
    const rootAbs = path.resolve(root);
    // `realpathSync` na raiz resolve um junction/symlink NA RAIZ, para que a
    // comparacao apples-to-apples.
    let rootReal;
    try { rootReal = fs.realpathSync.native ? fs.realpathSync.native(rootAbs) : fs.realpathSync(rootAbs); }
    catch (_) { rootReal = rootAbs; }
    const alvo = path.resolve(rootAbs, String(rel).replace(/\\/g, '/'));
    // Precisa ser descendant — `startsWith` sem separador aceitaria
    // `/jogos-evil` para root `/jogo`.
    if (alvo === rootAbs) return false;
    if (!alvo.startsWith(rootAbs + path.sep)) return false;
    // Se o alvo JA existe (inclusive um symlink/junction), resolvemos o
    // caminho completo. `path.resolve` e puramente lexical e NAO segue
    // junction: resolver so o pai deixaria `link` passar, porque
    // `rootReal/link` continua "dentro" na string.
    try {
      const full = fs.realpathSync.native ? fs.realpathSync.native(alvo) : fs.realpathSync(alvo);
      return full !== rootReal && full.startsWith(rootReal + path.sep);
    } catch (_) { /* ainda não existe: sobe ao ancestral */ }
    // O arquivo pode não existir ainda (é uma escrita nova), então resolvemos o
    // ancestral mais próximo que exista, remontando o caminho de baixo pra cima.
    const rest = [path.basename(alvo)];
    let dir = path.dirname(alvo);
    while (true) {
      try {
        const dirReal = fs.realpathSync.native ? fs.realpathSync.native(dir) : fs.realpathSync(dir);
        const finalReal = path.resolve(dirReal, ...rest);
        return finalReal !== rootReal && finalReal.startsWith(rootReal + path.sep);
      } catch (_) {
        const parent = path.dirname(dir);
        if (parent === dir) return false;
        rest.unshift(path.basename(dir));
        dir = parent;
      }
    }
  } catch (_) {
    return false;
  }
}

module.exports = {
  resolveInsideRoot, planFilesFromTexts, startApplyContract, hashText };
