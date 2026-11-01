/**
 * src/core/displayTextClassifier.js
 *
 * FASE 5.5 / C2 — separa TEXTO EXIBÍVEL de NOME/IDENTIFICADOR/CÓDIGO.
 *
 * CONTEXTO REAL (medido, não suposto):
 * Um jogo Ren'Py distribui scripts `.py` DESCOMPILADOS de módulos Python. Nesse
 * formato, o decompilador despeja o *pool de constantes* do `.pyc` como linhas
 * de literais isolados, sem nenhuma atribuição:
 *
 *     # --- Constants & Dialogues/Strings ---
 *     "load_module"
 *     "camera"
 *     "barb_menu.art_banana"
 *     "7ad4ee"
 *     "art/"
 *
 * O extrator tratava cada uma dessas linhas como texto traduzível. O resultado
 * medido em um jogo real: `strings.rpy` com 1.791 entradas de identidade, a
 * maior parte IDENTIFICADORES DE CÓDIGO ("open", "cast", "pillarbox",
 * "_door", "242424") que nunca aparecem na tela e consumiam cota do pipeline.
 *
 * A distinção que resolve NÃO é uma blacklist de palavras. É a forma da
 * própria string: um rótulo de interface/diálogo é PROSA (tem espaços, verbo
 * ou pontuação de frase), enquanto nome, identificador, caminho e token opaco
 * não são. Isso vale para qualquer Ren'Py, Unity, RPG Maker e Godot, porque é
 * uma propriedade da língua, não do título.
 *
 * REGRA DE OURO: `classifyDisplayText` nunca descarta prosa. Um "Welcome" de
 * duas palavras sem verbo continua sendo texto — porque o default é PRESERVAR.
 */

/**
 * Segmentos opacos: base64, hash, id.
 *
 * C2 — a regra "alfanumérico puro com 8+ caracteres" foi REMOVIDA de propósito:
 * ela classificava `Inventory`, `Computer`, `Settings`, `DarkCookie` e
 * `pillarbox` como token opaco, ou seja, descartava rótulos reais de interface.
 * O padrão correto exige mistura de dígito E letra (o que uma palavra normal
 * não tem), ou a presença de símbolos de codificação base64.
 */
const OPAQUE = [
  /^[A-Za-z0-9+/]{16,}={0,2}$/,                      // base64 (tem + ou / ou =)
  /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{8,}$/,          // id alfanumérico misto
  /^[0-9a-fA-F]{16,}$/,                               // hash longo
];

/** Caminhos, URLs, extensões, referências de asset. */
const PATHISH = [
  /[/\\]/,                                // qualquer barra
  /^https?:/i,
  /\.(?:png|jpe?g|webp|gif|bmp|ogg|wav|mp3|flac|mp4|webm|ttf|otf|rpy|rpyc|rpym|py|pyc|json|xml|txt|dat|ini|cfg)$/i,
  /^[.#]/,                                // .png  #ffffff  .hidden
];

/** Identificadores de código: `foo`, `foo_bar`, `mod.attr`, `self.x`, `Class()`. */
const IDENTIFIER = [
  /^[A-Za-z_]\w*$/,
  /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/,     // mod.attr
  /^[A-Za-z_]\w*\(\)$/,                    // call()
  /^[A-Z][A-Z0-9_]*$/,                     // CONSTANTE
  /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/,   // camelCase
  /^[a-z0-9]+(?:_[a-z0-9]+)+$/i,           // snake_case
];

/**
 * C2 — forma que é IDENTIFICADOR com certeza, mesmo sem outra pista.
 * `_door` e `load_module` caem aqui; `open` e `cast` NÃO, porque são palavras
 * isoladas que podem legitimamente ser rótulo de menu.
 */
const STRICT_IDENTIFIER = [
  /^_[A-Za-z]\w*$/,                                // _privado
  /^[a-z0-9]+(?:_[a-z0-9]+)+$/,                    // snake_case (tem _)
  /^[A-Za-z_]\w*\.[A-Za-z_]\w*$/,                  // mod.attr
  /^[A-Za-z_]\w*\(\)$/,                            // chamada
  /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/,                    // CONSTANTE_SNAKE
];

/**
 * Palavras funcionais que NUNCA são rótulo.
 *
 * C2 — `continue`, `back`, `exit`, `quit`, `cancel`, `ok`, `yes`, `new`,
 * `save`, `load`, `start` foram REMOVIDAS daqui. Elas são palavras reservadas
 * do Python E rótulos de botão extremamente comuns em menus de jogo. Como a
 * regra do projeto é preservar por padrão, um falso positivo aqui apaga um
 * botão inteiro da tradução — erro muito mais caro do que deixar uma palavra
 * a mais no corpus.
 */
const CODE_ONLY = new Set([
  'true', 'false', 'none', 'null', 'nan', 'inf',
  'and', 'or', 'not', 'in', 'is', 'if', 'else', 'elif', 'for', 'while',
  'return', 'yield', 'pass', 'break',
  'class', 'def', 'import', 'from', 'as', 'with', 'lambda', 'global',
  'nonlocal', 'assert', 'del', 'try', 'except', 'finally', 'raise',
  'print', 'self',
]);

/** Verbos e marcadores que fazem uma string ser PROSA mesmo sem pontuação. */
const PROSE_MARKER = new RegExp(
  '\\b(?:is|are|was|were|be|been|being|am|do|does|did|done|have|has|had|'
  + 'will|would|shall|should|can|could|may|might|must|you|your|yours|we|us|our|'
  + 'they|them|their|he|him|his|she|her|hers|it|its|i|me|my|not|no|never|'
  + 'always|please|thanks|thank|sorry|hello|hi|hey|welcome|goodbye|'
  + 'new|save|load|continue|back|exit|quit|cancel|ok|okay|yes|'
  + 'want|need|know|think|see|look|come|go|get|give|take|make|'
  + 'não|você|está|são|foi|ser|ter|que|de|para|com|uma|isso|ela|ele|'
  + 'obrigado|olá|continuar|voltar|salvar|carregar)\\b', 'i');

/**
 * @param {string} raw texto candidato
 * @returns {{display:boolean, kind:string, reason:string}}
 *   kind: 'prose' | 'label' | 'name' | 'identifier' | 'path' | 'opaque'
 *         | 'number' | 'symbol' | 'empty' | 'code'
 * Regra de projeto: o default é `display:true`. Só se descarta quando há uma
 * evidência POSITIVA de que não é texto exibível.
 */
function classifyDisplayText(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { display: false, kind: 'empty', reason: 'vazio' };

  // 1. Número puro e símbolo puro: nunca precisam de tradução.
  if (/^[-+]?[\d.,]+%?$/.test(s)) {
    return { display: false, kind: 'number', reason: 'número' };
  }
  if (/^[^\p{L}\p{N}]+$/u.test(s)) {
    return { display: false, kind: 'symbol', reason: 'símbolo/pontuação' };
  }

  // 2. Evidência positiva de não-ser-texto, com alta confiança.
  if (PATHISH.some((re) => re.test(s))) {
    return { display: false, kind: 'path', reason: 'caminho/extensão/referência' };
  }
  if (OPAQUE.some((re) => re.test(s))) {
    return { display: false, kind: 'opaque', reason: 'token opaco (base64/hash/id)' };
  }
  if (CODE_ONLY.has(s.toLowerCase())) {
    return { display: false, kind: 'code', reason: 'palavra reservada' };
  }

  const palavras = (s.match(/\S+/g) || []).length;

  // 3. Identificador com forma inequívoca: `_door`, `load_module`, `mod.attr`.
  if (STRICT_IDENTIFIER.some((re) => re.test(s))) {
    return { display: false, kind: 'identifier', reason: 'identificador de código' };
  }

  // 4. Palavra única.
  //
  // C2 — este ramo estava invertido e descartava texto de UI real:
  // `Loading...` caía em "identificador" (display:false) só porque terminava em
  // pontuação. A distinção correta é a ordem das perguntas:
  //   a) tem sinal de prosa (verbo ou pontuação de FRASE)? -> é texto.
  //   b) senão, é rótulo curto ou identificador?
  if (palavras === 1) {
    const temVerbo = PROSE_MARKER.test(s);
    const temPontuacao = /[.!?,;:]$/.test(s) || /[.!?,;]\s/.test(s);

    // (a) "Loading...", "Settings", "New", "Are", "Hello?" -> PROSA
    if (temVerbo || temPontuacao) {
      return {
        display: true,
        kind: temVerbo ? 'prose' : 'label',
        reason: temVerbo ? 'palavra com verbo de prosa' : 'rótulo terminado em pontuação',
      };
    }
    // (b) Sem verbo e sem pontuação: pode ser rótulo ("Inventory", "Chat")
    //     ou identificador ("open", "cast", "pillarbox"). A forma NÃO separa
    //     os dois, então o default é PRESERVAR — descartar aqui apagaria menus
    //     inteiros. Quem tem contexto de chamada resolve; ver nota abaixo.
    if (IDENTIFIER.some((re) => re.test(s))) {
      return {
        display: true,
        kind: 'label',
        reason: 'palavra única sem sinal de prosa (pode ser rótulo de UI)',
      };
    }
    return { display: false, kind: 'identifier', reason: 'identificador de código' };
  }

  // 5. Duas palavras, ambas inicial maiúscula, sem verbo => nome próprio.
  if (/^[\p{Lu}][\p{L}'’-]*(?: [\p{Lu}][\p{L}'’-]*)+$/u.test(s) && s.length <= 48
      && !PROSE_MARKER.test(s)) {
    return { display: true, kind: 'name', reason: 'nome próprio (mantido)' };
  }

  // 6. Sem espaço e com forma de identificador composta.
  if (!/\s/.test(s) && IDENTIFIER.some((re) => re.test(s))) {
    return { display: false, kind: 'identifier', reason: 'identificador de código' };
  }

  // 6. Qualquer coisa com 2+ palavras que não foi descartada é PROSA.
  //    Este é o ramo que preserva o texto exibível dentro de .py.
  return {
    display: true,
    kind: 'prose',
    reason: `prosa (${palavras} palavras)`,
  };
}

module.exports = {
  classifyDisplayText,
  PROSE_MARKER,
  CODE_ONLY,
};