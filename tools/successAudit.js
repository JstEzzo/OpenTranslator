/**
 * tools/successAudit.js — Gate de SUCESSO SEM EVIDENCIA
 *
 * ===========================================================================
 * FASE 9 — O QUE ESTE ARQUIVO FAZ, E O QUE ELE NAO PODE FAZER
 * ===========================================================================
 *
 * A meta original da fase era "186 success-like -> 0". Esse numero nunca
 * deveria ter sido o alvo. `success: true` depois de uma operacao conferida
 * e codigo CORRETO, e elimina-lo tornaria o projeto incapaz de reportar
 * sucesso.
 *
 * Mais importante: verificacao e uma propriedade SEMANTICA, nao lexica.
 * Nenhum regex decide se `return { success: true, count: n }` e verdadeiro;
 * so a execucao sabe. Um gate que varre `success: true` e conta nao esta
 * verificando nada — esta produzindo um numero alto e assustador que ninguem
 * pode agir sobre. Foi exatamente assim que a primeira versao deste arquivo
 * "aprovou" 196 afirmacoes e, no meio delas, `hookProvider.replaceText`, que
 * ecoava os proprios argumentos e afirmava ter substituido texto sem tocar
 * em processo nenhum.
 *
 * ===========================================================================
 * O QUE E MECNICAMENTE DETECTAVEL
 * ===========================================================================
 *
 * Tres anti-patterns. Todos identificaveis por estrutura, e cada um e um
 * defeito real quando aparece:
 *
 *   A1 — SUCESSO VAZIO
 *       `{ ok: true }` / `{ success: true }` sem nenhuma outra propriedade.
 *       Nao ha o que o chamador possa conferir e o codigo nao oferece prova
 *       nenhuma. Em codigo de runtime e a assinatura de um "deu certo" que
 *       nao deu.
 *
 *   A2 — SUCESSO COM FALHA ENGOLIDA
 *       Afirmacao de sucesso numa funcao que engole uma excecao:
 *       `catch (e) {}` com corpo vazio, ou `catch {}`. O sucesso e declarado
 *       em silencio apesar de o caminho de erro ter sido descartado. E o
 *       defeito mais caro dos tres, porque a falha nao aparece em log, nem
 *       em resposta, nem no valor de retorno — so no sintoma, semanas
 *       depois, quando o usuario percebe que o cache voltou.
 *
 *   A3 — SUCESSO QUE ECOA OS PROPRIOS ARGUMENTOS
 *       `success: true` devolvendo um identificador que e parametro da
 *       propria funcao, num corpo sem E/S. E a assinatura de um metodo que
 *       afirma ter feito algo e nao fez: devolve o que recebeu.
 *
 * ===========================================================================
 * O QUE ESTE ARQUIVO NAO FAZ
 * ===========================================================================
 *
 * Nao julga `success: true` em geral. Quem julga isso sao os testes de
 * runtime — os 295 asserts que exercitam o comportamento de verdade. Este
 * gate cobre o complemento: os casos em que o CODIGO ITSELF declara sucesso
 * sem ter o que declarar.
 *
 * ===========================================================================
 * O ALLOWLIST
 * ===========================================================================
 *
 * Nao e um silenciador. Cada entrada carrega o motivo, e a chave inclui o
 * trecho literal da linha — se o codigo sob a justificativa mudar, a chave
 * deixa de casar e o gate falha. E o oposto de um `// TODO` que ninguem le.
 * Uma justificativa que nao casa mais e sinal de que o codigo mudou e
 * ninguem reavaliou.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'successAllowlist.json');
const SKIP_DIRS = new Set(['node_modules', '.git', 'data', '.autopsy', 'graphify-out']);

/**
 * Redireciona o gate para outro diretorio.
 *
 * Existe para `tests/unit/successInvariant.test.js` poder plantar fixtures e
 * exigir que o detector ACERTE nelas. Sem isso, o teste só poderia rodar
 * contra o src/ real — e um detector que parou de casar Patterns passaria
 * igual, porque o número de defeitos do repo também iria a zero. Plantar o
 * defeito é o que separa "não há defeito" de "não estou olhando".
 *
 * @param {string} novoRoot
 * @returns {string} o Root anterior, para restauração.
 */
function __setRootForTest(novoRoot) {
  const anterior = ROOT;
  ROOT = novoRoot;
  return anterior;
}

const TIPOS = {
  A1_SUCESSO_VAZIO: 'A1 — sucesso declarado sem nenhuma prova ou payload',
  A2_FALHA_ENGOLIDA: 'A2 — sucesso declarado em função que engole exceção',
  A3_ECO_DE_ARGUMENTOS: 'A3 — sucesso que devolve os próprios argumentos, sem E/S',
};

function ehComentario(l) {
  return /^\s*(\/\/|\*|\/\*)/.test(l);
}

/**
 * Encontra a linha de abertura da funcao que contem a linha `i`.
 *
 * FASE 9 / PASSO 46 — `if (...) {` NAO E UMA ASSINATURA DE METODO
 *
 * O padrao original aceitava `^\s{0,4}(async )?IDENT\([^)]*\) {$`, e `if`
 * passa nesse padrao: `if` e um identificador valido em regex, seguido de
 * parenteses e abre-brace. O detector tratava `if (matchedFolder) {` como o
 * inicio de uma funcao, e portanto:
 *
 *   -via `matchedFolder` como se fosse PARAMETRO (ele era um `const local`);
 *   -via um corpo de 5 linhas que comeca no `if`, sem a E/S da funcao real;
 *   -e acusava A3 num metodo que faz `findMatchingAppDataFolder`, que faz
 *    I/O de disco.
 *
 * O mesmo erro atingia `for (...) {`, `while (...) {`, `switch (...) {` e
 * `catch (...) {}` — ou seja, em boa parte dos blocos do projeto. Um gate
 * com escopo errado nao produz Numberos confiaveis, produz numeros novos.
 */
const PALAVRAS_CHAVE = /^(if|for|while|switch|catch|return|else|do|try|with|function|new|typeof|delete|await|yield|case|default|import|export)$/;

/** Saldo de chaves entre duas linhas (inclui `ini`, exclui `fim`). */
/**
 * Saldo de chaves de BLOCO, ignorando chaves dentro de parenteses.
 *
 * ===========================================================================
 * FASE 9 / PASSO 65 -- `{}` DE VALOR PADRAO NAO E CHAVE DE BLOCO
 * ===========================================================================
 *
 * `ocrProvider.captureGameWindow(destImagePath, options = {})` tem um `{}` na
 * assinatura. Contando chaves ingenuamente esse par abre e fecha na mesma
 * linha, o saldo volta a zero, e `fimFuncao` concluia que a funcao terminava
 * na propria linha da assinatura.
 *
 * O efeito: `corpo` virava uma linha so, sem E/S, e A3 acusava um metodo que
 * faz `spawnSync` + `existsSync` + `statSync`. `ocrProvider.js:90` foi esse
 * falso positivo.
 *
 * Nao e caso exotico: `options = {}`, `opts = { verbose: false }` e
 * `cache = new Map()` aparecem em assinaturas em todo o projeto. E um detector
 * que erra o corpo da funcao erra TODAS as regras que dependem do corpo --
 * A1, A2 e A3 -- e o sintoma aparece como "falso positivo", que e o jeito
 * mais lento de descobrir que o classificador esta errado.
 *
 * A correcao e contar chave apenas em profundidade de parenteses zero.
 */
function saldoChaves(L, ini, fim) {
  let d = 0;
  let paren = 0;
  for (let k = ini; k <= fim; k++) {
    for (const ch of L[k] || '') {
      if (ch === '(' || ch === '[') paren++;
      else if (ch === ')' || ch === ']') { if (paren > 0) paren--; }
      else if (paren === 0) {
        if (ch === '{') d++;
        else if (ch === '}') d--;
      }
    }
  }
  return d;
}

/**
 * A linha `k` e o inicio de uma assinatura que ocupa VARIAS linhas?
 *
 * `createStaging(originalGameDir, sessionId = null) {` partido em duas linhas
 * nao casa com `pareceAssinatura`, que exige `) {` na mesma linha. Sem esta
 * regra, `inicioFuncao` nao encontra a abertura da funcao e sobe ate a
 * anterior — e em `stagingPolicy` ele ancorou em `generateManifest`, cujo
 * `catch (e) {}` foi atribuido a `createStaging`. Falso positivo por escopo.
 *
 * @returns {boolean}
 */
function assinaturaMultilinha(L, k) {
  const primeira = L[k] || '';
  if (!/^\s*(async\s+)?[A-Za-z_$][\w$]*\s*\(/.test(primeira)) return false;
  // Acento ou virgula nao indica assinatura; comecando por `if (` e porem
  // palavra-chave, ja tratado em `pareceAssinatura`.
  const nome = (primeira.match(/^\s*(?:async\s+)?([A-Za-z_$][\w$]*)/) || [])[1];
  if (nome && PALAVRAS_CHAVE.test(nome)) return false;

  // Acumula ate os parenteses fecharem.
  let texto = '';
  for (let j = k; j < Math.min(L.length, k + 6); j++) {
    texto += L[j] || '';
    const abertos = (texto.match(/\(/g) || []).length;
    const fechados = (texto.match(/\)/g) || []).length;
    if (abertos <= fechados) {
      // fecha aqui: tem de terminar em `{`
      return /\{\s*$/.test(texto.trimEnd());
    }
  }
  return false;
}

function pareceAssinatura(l) {
  // FASE 9 / PASSO 58 — mesma razão de `indiceCatchEngolido`: uma assinatura
  // citada dentro de comentário não abre função nenhuma.
  if (ehComentario(l || '')) return false;
  const m = /^\s*(async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/.exec(l || '');
  if (m && !PALAVRAS_CHAVE.test(m[2])) return true;
  return /^\s*(function\s|const\s|let\s|var\s)/.test(l || '') && /\{\s*$/.test(l || '');
}

/**
 * Encontra a ABERTURA da funcao que contem a linha `i`.
 *
 * ===========================================================================
 * FASE 9 — POR QUE ISTO NAO E "ACHAR A ASSINATURA MAIS PROXIMA"
 * ===========================================================================
 *
 * Duas versoes anteriores acertavam o nome e erravam o escopo:
 *
 *   1) Aceitava `if (x) {` como assinatura, porque `if` e um identificador
 *      valido em regex seguido de parenteses e abre-brace.
 *
 *   2) Parava no primeiro `}` subindo, achando que a funcao terminava ali.
 *      Mas esse `}` fecha um `if` aninhado:
 *
 *          function grava(p) {
 *            fs.writeFileSync(p, x);
 *            const lido = fs.readFileSync(p, "utf8");
 *            if (lido !== x) {
 *              return { ok: false };
 *            }        <-- este } NAO fecha a funcao
 *            return { ok: true };   <-- alvo cai num "corpo" de 1 linha
 *          }
 *
 *      Com o corpo reduzido a uma linha, o detector nao via a releitura e
 *      acusava A1 num metodo que CONFIRMA o que escreveu. O gate passou a
 *      reprovar codigo correto — que e a forma mais cara de um gate falso,
 *      porque treina o time a ignorar o alerta.
 *
 * A solucao e estrutural, nao textual: Entre as assinaturas candidatas acima
 * da linha i, a ABERTURA DA FUNCAO e a primeira cujas chaves NAO se fecham
 * antes de `i` — isto e, `i` esta no interior dela. Como o `}` de um `if`
 * aninhado fecha logo, ele nunca passa neste teste.
 */
function inicioFuncao(L, i) {
  for (let k = i - 1; k >= 0 && k >= i - 80; k--) {
    // FASE 9 / PASSO 62 — assinatura multi-linha tambem conta como abertura.
    if (!pareceAssinatura(L[k]) && !assinaturaMultilinha(L, k)) continue;
    // `i` esta no interior deste bloco? (saldo > 0 sem contar a propria linha i)
    if (saldoChaves(L, k, i - 1) > 0) return k;
  }
  return Math.max(0, i - 25);
}

/** Fecha correspondente da funcao (ou a ultima linha, se nao achar). */
function fimFuncao(L, ini) {
  let d = 0;
  let paren = 0;
  let abriu = false;
  for (let k = ini; k < L.length && k < ini + 150; k++) {
    for (const ch of L[k] || '') {
      // FASE 9 / PASSO 65 -- parenteses abrem ANTES de contar chave, para que
      // `options = {}` nao feche o corpo na linha da assinatura.
      if (ch === '(' || ch === '[') { paren++; continue; }
      if (ch === ')' || ch === ']') { if (paren > 0) paren--; continue; }
      if (paren > 0) continue;
      if (ch === '{') { d++; abriu = true; }
      else if (ch === '}') {
        d--;
        if (abriu && d <= 0) return k;
      }
    }
  }
  return L.length - 1;
}

/**
 * Mascara o CONTEUDO de template literals e strings, preservando offsets.
 *
 * ===========================================================================
 * FASE 9 / PASSO 63 — CÓDIGO QUE SERÁ INJECTADO NÃO É CÓDIGO DESTE PROCESSO
 * ===========================================================================
 *
 * `rpgMakerRuntimeBridge.inject` monta o script do overlay como template
 * literal e injeta isso no `index.html` do jogo:
 *
 *     const hookScript = `
 *       <script>
 *         try { window.__ot.send(...); } catch(e) {}
 *       </script>
 *     `;
 *
 * O `catch (e) {}` ali dentro é JavaScript que o NAVEGADOR do jogo vai
 * executar. Ele nunca roda neste processo, nunca engole nada aqui, e o
 * `return { success: true, injected: true }` logo abaixo não tem nada a ver
 * com ele. O gate acusava um método correto por causa de código dirigido a
 * outro runtime.
 *
 * Isso não é exceção: injetar script por template literal é o mecanismo
 * padrão deste projeto (overlay do Ren'Py, bridge do Electron, controller do
 * RPG Maker). Sem esta máscara, todo adapter que injeta código vira falso
 * positivo — e falso positivo que se multiplica é como um gate perde credibilidade.
 *
 * A máscara troca o conteúdo por espaços, então TODOS os offsets de linha e
 * coluna permanecem válidos e o resto do classificador continua funcionando.
 */
function mascaraStrings(texto) {
  let saida = '';
  let i = 0;
  const n = texto.length;

  const CONSERVAR = new Set(['\n', '\r']);

  while (i < n) {
    const c = texto[i];

    // ---- template literal ----
    if (c === '`') {
      i++;
      while (i < n) {
        if (texto[i] === '\\') { i += 2; continue; }
        if (texto[i] === '`') { i++; break; }
        saida += CONSERVAR.has(texto[i]) ? texto[i] : ' ';
        i++;
      }
      continue;
    }

    // ---- strings com aspas simples e duplas ----
    if (c === '"' || c === "'") {
      const aspa = c;
      i++;
      while (i < n) {
        if (texto[i] === '\\') { i += 2; continue; }
        if (texto[i] === aspa) { i++; break; }
        if (texto[i] === '\n') break;   // string nao terminada: nao arriscar
        saida += ' ';
        i++;
      }
      continue;
    }

    // ---- comentario de linha e de bloco: tambem nao e codigo ----
    if (c === '/' && texto[i + 1] === '/') {
      while (i < n && texto[i] !== '\n') { saida += ' '; i++; }
      continue;
    }
    if (c === '/' && texto[i + 1] === '*') {
      saida += '  ';
      i += 2;
      while (i < n && !(texto[i] === '*' && texto[i + 1] === '/')) {
        saida += CONSERVAR.has(texto[i]) ? texto[i] : ' ';
        i++;
      }
      saida += '  ';
      i += 2;
      continue;
    }

    saida += c;
    i++;
  }
  return saida;
}

/** `catch (e) {}` / `catch {}` — corpo vazio, ou so comentario. Retorna o índice. */
function indiceCatchEngolido(L, de, ate) {
  for (let k = de; k <= ate; k++) {
    const l = L[k] || '';
    // FASE 9 / PASSO 58 — COMENTÁRIO NÃO É CÓDIGO.
    //
    // Explicar a correção exige citar o código antigo. Em
    // `rpcHandlers.getRenpyAppDataStatus` o comentário
    //
    //     // FASE 9 / PASSO 55 — `catch (e) {}` aqui devolvia `saves: []`
    //
    // fez o gate acusar o handler cujo catch eu TINHA ARRANCADO. O defeito
    // estava corrigido, o gate vermelho, e a causa era a minha própria
    // documentação.
    //
    // Isto vai acontecer de novo — é assim que se documenta uma correção —,
    // então é uma regra do detector, não uma exceção da allowlist.
    if (ehComentario(l)) continue;
    if (/catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*)?\s*\}/.test(l)) return k;
  }
  return -1;
}

/**
 * O `return true` está PROTEGIDO pelo try cujo catch engoliu a excecao?
 *
 * O caso `jobPersistence.deleteJob`:
 *
 *     try { fs.unlinkSync(filePath); return true; } catch (e) {}
 *     return false;
 *
 * Isso está CORRETO: o `return true` está dentro do try, então o unlink
 * lançou, o catch engoliu, e a execução foi para `return false`. O sucesso é
 * inalcançável após a falha.
 *
 * A2 só vale quando o catch vem ANTES do sucesso na ordem do texto — aí o
 * sucesso é declarado apesar de um caminho de erro ter sido descartado. Essa
 * distinção evita o falso positivo.
 */
function sucessoProtegido(L, i, indiceCatch) {
  if (indiceCatch < 0) return false;
  // Mesmolinha do try: o try e o catch compartilham a linha do sucesso.
  if (indiceCatch === i) return true;
  // O catch vem antes do sucesso -> nao protegido.
  if (indiceCatch < i) return false;
  // O catch vem depois: ha um `try` abrindo antes do sucesso?
  for (let k = Math.max(0, i - 30); k < i; k++) {
    if (/\btry\s*\{/.test(L[k] || '')) return true;
  }
  return false;
}

/** Chamada de E/S ou de mutacao dentro do trecho. */
function temIO(trecho) {
  return /\b(readFile|writeFile|copyFile|rename|unlink|mkdir|statSync|existsSync|spawn|exec|fetch|request|write|send|apply|install|commit|save|query|run|probe|verify|set|add|delete|push|register|insert)\s*\(/.test(trecho);
}

/**
 * VERIFICACAO — releu, comparou, contou.
 *
 * Distinguir de `temIO` e a distincao que faz este gate valer. Escrever um
 * arquivo NAO e confirmar que ele foi escrito: `fs.writeFileSync` pode ter
 * criado um `.ttf` vazio, e um `@font-face` apontando para ele e exatamente o
 * defeito de `installUnity` e `patchGameFont` — patch "aplicado" que nao
 * muda nada na tela.
 *
 * Por isso A1 (sucesso sem payload) so e aceito quando ha uma releitura, uma
 * comparacao de hash, ou uma contagem checada depois da operacao.
 */
function temVerificacao(trecho) {
  return /\b(existsSync|statSync|readFileSync)\s*\(/.test(trecho)
    || /\bhash(File|Text|Of)?\b/i.test(trecho)
    || /\b(verified|verifiedBy|confirmedBy|checksum|comparou|conferiu)\b/i.test(trecho)
    || /\.(length|size)\s*(===|!==|>|>=|<|<=)\s*/.test(trecho);
}

/**
 * O identificador e mesmo um PARAMETRO, ou e uma variavel local?
 *
 * `renpyAppDataResolver` прежде ECOava `matchedFolder`, que e um
 * `const matchedFolder = findMatchingAppDataFolder(...)` local, nao um
 * parametro. A heuristica de escopo apontava a linha errada. Checar a
 * declaracao local elimina o falso positivo sem afrouxar o A3.
 */
function eParametroDeFuncao(L, ini, i, nome) {
  const decl = new RegExp('\\b(?:const|let|var|function)\\s+' + nome + '\\b');
  for (let k = ini; k <= i; k++) {
    if (decl.test(L[k] || '')) return false;
  }
  return parametros(L, ini).includes(nome);
}

/** Nomes dos parametros da assinatura. */
function parametros(L, ini) {
  const m = /^\s{0,4}(?:async\s+)?(?:[A-Za-z_$][\w$]*\s*)?\(([^)]*)\)\s*\{\s*$/.exec(L[ini] || '');
  if (!m || !m[1].trim()) return [];
  return m[1].split(',').map((s) => s.trim().split(/[:=\s]/)[0]).filter((x) => /^[A-Za-z_$][\w$]*$/.test(x));
}

/** A linha afirma sucesso? */
function afirmaSucesso(linha) {
  return /\breturn\s+true\b/.test(linha)
    || /\b(ok|success)\s*:\s*true\b/.test(linha);
}

/** `{ ok: true }` puro, sem nenhuma outra propriedade no mesmo objeto. */
function sucessoVazio(linha) {
  const m = /\breturn\s*\{\s*(ok|success)\s*:\s*true\s*\}\s*;?\s*$/.exec(linha.trim());
  if (m) return true;
  // multilinha: `{ ok: true,` seguido de `}` — tratado no audit por corpo.
  return /\{\s*(ok|success)\s*:\s*true\s*,\s*$/.test(linha.trim());
}

/** O objeto de sucesso devolve um parametro da propria funcao? */
function ecoaArgumento(linha, params) {
  if (!params.length) return null;
  if (!/\b(ok|success)\s*:\s*true\b/.test(linha)) return null;
  for (const p of params) {
    const re = new RegExp('(^|[{,\\s])' + p + '\\s*[:,}]');
    if (re.test(linha)) return p;
  }
  return null;
}
function listarJs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listarJs(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function carregarAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { version: 1, entries: {} };
  return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
}

/**
 * Audita src/ e devolve os defeitos dos tres anti-patterns.
 */
function audit() {
  const allow = carregarAllowlist();
  const allowKeys = new Set(Object.keys(allow.entries || {}));
  const usados = new Set();
  const staleAllowlist = [];

  const defeitos = [];
  const porTipo = { A1_SUCESSO_VAZIO: 0, A2_FALHA_ENGOLIDA: 0, A3_ECO_DE_ARGUMENTOS: 0 };
  let afirmacoes = 0;

  for (const abs of listarJs(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const bruto = fs.readFileSync(abs, 'utf8');
    // FASE 9 / PASSO 63 — a mascara remove strings, template literals e
    // comentarios ANTES de classificar. Os offsets de linha sao preservados
    // (a mascara so troca nao-newline por espaco), entao os numeros que o
    // gate reporta continuam correspondendo ao arquivo real.
    const L = mascaraStrings(bruto).split(/\r?\n/);
    // O RELATORIO mostra o texto ORIGINAL. A mascara serve para classificar;
    // mostrar `Buffer.byteLength(payload, )` no lugar de
    // `Buffer.byteLength(payload, 'utf8')` tornaria o achado ilegivel.
    const LOriginal = bruto.split(/\r?\n/);

    L.forEach((linha, i) => {
      if (ehComentario(linha)) return;
      if (!afirmaSucesso(linha)) return;

      afirmacoes++;

      const chave = `${rel}::${i + 1}::${linha.trim().replace(/\s+/g, ' ').slice(0, 70)}`;
      if (allowKeys.has(chave)) { usados.add(chave); return; }

      const ini = inicioFuncao(L, i);
      const fim = fimFuncao(L, ini);
      const corpo = L.slice(ini, fim + 1).join('\n');
      const params = parametros(L, ini);
      const idxCatch = indiceCatchEngolido(L, ini, i);

      // --- A2: sucesso dentro de função que engole exceção ---
      // --- A2: sucesso declarado apesar de um catch engolido ---
      //
      // FASE 9 / PASSO 64 — A2 SO IMPORTA QUANDO O SUCESSO NAO ESTA
      // CONFERIDO. E O QUE FAZ ESSA REGRA EXISTIR.
      //
      // `cache.js` e `transactionJournal.js` acusavam assim:
      //
      //     try { fs.unlinkSync(tmpPath); } catch (e) { /* segue */ }
      //     ...
      //     const back = JSON.parse(fs.readFileSync(file, "utf8"));  // releitura
      //     if (back.id !== tx.id) throw ...;                       // confere
      //     return true;                                            // sucesso
      //
      // O catch engolido era de LIMPEZA do arquivo temporario, numa operacao
      // sem relacao com a afirmacao de sucesso. O sucesso estava guardado por
      // uma releitura que compara campo por campo. Acusar aquilo e acusar
      // codigo correto — a forma mais cara de falso positivo, porque treina o
      // time a ignorar o alerta.
      //
      // A distincao que importa nao e "o catch engolido existe", e "o sucesso
      // declarado depende de algo que pode ter falhado em silencio". Havendo
      // verificacao real no corpo, um catch de limpeza nao contamina.
      if (idxCatch >= 0 && !sucessoProtegido(L, i, idxCatch) && !temVerificacao(corpo)) {
        porTipo.A2_FALHA_ENGOLIDA++;
        defeitos.push({
          tipo: 'A2_FALHA_ENGOLIDA', rel, line: i + 1, chave,
          text: (LOriginal[i] || linha).trim().slice(0, 100),
          detalhe: 'a função contém catch com corpo vazio antes deste sucesso',
        });
        return;
      }

      // --- A3: sucesso que ecoa os próprios argumentos, sem E/S ---
      const eco = ecoaArgumento(linha, params);
      if (eco && !temIO(corpo) && eParametroDeFuncao(L, ini, i, eco)) {
        porTipo.A3_ECO_DE_ARGUMENTOS++;
        defeitos.push({
          tipo: 'A3_ECO_DE_ARGUMENTOS', rel, line: i + 1, chave,
          text: (LOriginal[i] || linha).trim().slice(0, 100),
          detalhe: `devolve o parâmetro '${eco}' e o corpo não faz E/S`,
        });
        return;
      }

      // --- A1: sucesso sem payload e sem verificacao no corpo ---
      //
      // FASE 9 / PASSO 47 — A1 mede VERIFICACAO, nao E/S.
      //
      // A versao anterior suprimia A1 quando o corpo fazia qualquer E/S. Isso
      // deixava passar exatamente o defeito mais caro desta fase:
      // `fs.writeFileSync(...); return { ok: true };`. Escrever nao e
      // confirmar — um write pode ter criado um arquivo vazio, e o chamador
      // recebe "deu certo" sem nada para checar.
      if (sucessoVazio(linha) && !temVerificacao(corpo)) {
        porTipo.A1_SUCESSO_VAZIO++;
        defeitos.push({
          tipo: 'A1_SUCESSO_VAZIO', rel, line: i + 1, chave,
          text: (LOriginal[i] || linha).trim().slice(0, 100),
          detalhe: 'objeto de sucesso sem payload, e o corpo não faz E/S',
        });
      }
    });
  }

  for (const k of allowKeys) if (!usados.has(k)) staleAllowlist.push(k);

  return {
    defeitos,
    afirmacoes,
    allowlisted: usados.size,
    allowlistTotal: allowKeys.size,
    staleAllowlist,
    porTipo,
    TIPOS,
  };
}

if (require.main === module) {
  const r = audit();
  console.log('=== GATE DE SUCESSO SEM EVIDENCIA (FASE 9) ===');
  console.log(`afirmacoes de sucesso varridas      : ${r.afirmacoes}`);
  console.log(`allowlisted com justificativa        : ${r.allowlisted}/${r.allowlistTotal}`);
  console.log('');
  console.log('Anti-patterns mecanicamente detectaveis:');
  for (const [k, v] of Object.entries(r.porTipo)) {
    console.log(`  ${String(v).padStart(3)}  ${TIPOS[k]}`);
  }
  const total = Object.values(r.porTipo).reduce((a, b) => a + b, 0);
  console.log('');
  console.log(`DEFEITOS: ${total}`);
  if (total) {
    console.log('');
    for (const d of r.defeitos) {
      console.log(`  [${d.tipo}] ${d.rel}:${d.line}`);
      console.log(`      ${d.text}`);
      console.log(`      -> ${d.detalhe}`);
    }
  }
  if (r.staleAllowlist.length) {
    console.log('\n=== JUSTIFICATIVAS ORFAS (o codigo mudou) ===');
    r.staleAllowlist.forEach((k) => console.log(`  ${k}`));
  }
  if (total || r.staleAllowlist.length) process.exit(1);
}

/**
 * __debug —_navio_ para dentro do classificador.
 *
 * Por que existe: durante a FASE 9, `ocrProvider.js:90` era acusado por A3
 * embora fizesse `spawnSync` + `existsSync` + `statSync`. A causa era
 * `fimFuncao` retornando a propria linha da assinatura por causa do `{}` de
 * valor padrao — e, pior, `fimFuncao` estava DEFINIDA DUAS VEZES no arquivo,
 * e o hoisting fazia a versao antiga (errada) vencer.
 *
 * Nenhuma das duas causas era dedutivel lendo o classificador de cima para
 * baixo. Este hook existe para nao repetir o erro de adivinhar: mostra o que
 * o classificador REALMENTE extraiu (abertura, fechamento, tamanho do corpo,
 * e se encontrou E/S), em vez de uma reimplementacao minha dele.
 *
 * E a licao de hoje: reimplementar localmente a logica do gate para depurar
 * produz conclusoes sobre o gate que NAO sao do gate. Foi assim que a causa
 * passou duas vezes.
 */
function __debug(arquivoRel, linhaNum) {
  const abs = path.join(ROOT, arquivoRel);
  const L = mascaraStrings(fs.readFileSync(abs, "utf8")).split(/\r?\n/);
  const i = linhaNum - 1;
  const ini = inicioFuncao(L, i);
  const fim = fimFuncao(L, ini);
  const corpo = L.slice(ini, fim + 1).join("\n");
  return {
    ini: ini + 1,
    iniTexto: L[ini],
    fim: fim + 1,
    corpoLinhas: fim - ini + 1,
    temIO: temIO(corpo),
    temVerificacao: temVerificacao(corpo),
    corpo: corpo.slice(0, 1200),
  };
}

module.exports = { audit, TIPOS, __setRootForTest, __debug };
