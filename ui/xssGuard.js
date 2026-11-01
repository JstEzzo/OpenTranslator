/**
 * ui/xssGuard.js — Saneamento de DOM (FASE 1 / PASSO 19)
 *
 * Problema corrigido:
 *   ui/app.js tinha 31 sinks de innerHTML. A funcao esc() existia mas NAO era
 *   aplicada aos campos vindos do backend. Um valor controlado por um provider,
 *   por um log, ou pelo proprio jogo entrava cru no DOM.
 *
 *   Vetor concreto encontrado na auditoria:
 *     app.js:179   toast.innerHTML  = msg          (msg carrega r.error de RPC)
 *     app.js:3709  log             -> l.ts, l.origin interpolados sem esc
 *     app.js:3909  actor rows      -> a.hp/a.mhp/a.idx/a.level sem esc
 *     app.js:3940  inventory       -> item.type/item.id sem esc
 *     app.js:4027  renpy vars      -> v.value sem esc
 *   Encadeado com o RPC sem autenticacao, uma pagina web Injetava HTML/script
 *   dentro da janela do OpenTranslator — que expoe window.rpc na linha 77.
 *
 * Causa raiz corrigida:
 *   1. Este modulo passa a ser a UNICA porta de entrada de dados dinamicos no DOM.
 *   2. safeText()  -> textContent (usado onde HTML e' desnecessario)
 *   3. safeAttr()  -> escaper de atributo (inclui aspas)
 *   4. safeNum()   -> coercao a numero finito (impede "1\" onmouseover=...")
 *   5. safeHtml()  -> sanitizador com allowlist de tags/atributos
 *   6. replaceChildren() ->troca conteudo de um elemento usando apenas DOM API
 *
 * Politica do sanitizador (allowlist, nunca blacklist):
 *   Tags permitidas: b, br, strong, em, i, u, code, span, small, p
 *   Atributos permitidos em span: apenas class (valor filtrado por regex)
 *   Tudo o mais (script, iframe, on*, style, href, src, data-*) e' REMOVIDO.
 *
 * O sanitizador e' defensivo em profundidade: mesmo que uma tag permitida
 * carregue um atributo nao permitido, ele e' descartado; e mesmo que um
 * payload tente quebrar o parsing do proprio sanitizador, o resultado ainda
 * passa por uma segunda passagem de escape.
 */

'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api; // Node (testes)
  } else {
    root.XSSGuard = api; // Browser
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const ALLOWED_TAGS = new Set([
    'b', 'br', 'strong', 'em', 'i', 'u', 'code', 'span', 'small', 'p',
  ]);

  /** Atributos permitidos por tag. */
  const ALLOWED_ATTRS = {
    span: new Set(['class']),
    '*': new Set([]),
  };

  /** class values sao filtrados por esta regex (tokens CSS simples). */
  const CLASS_TOKEN_RE = /^[A-Za-z0-9_\- ]{1,64}$/;

  /** Escapa texto para uso em HTML (texto e atributos). */
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  }

  /** Escape especifico para valor de atributo entre aspas duplas. */
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  /**
   * Coerce para numero finito. Qualquer coisa que nao seja numero vira fallback.
   * Impede que um id malicioso como `1" onmouseover="alert(1)` chegue ao DOM.
   */
  function safeNum(v, fallback) {
    const fb = fallback === undefined ? 0 : fallback;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (!Number.isFinite(n)) return fb;
    return n;
  }

  /** Booleano estrito. */
  function safeBool(v) {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 0 || v === '0') return false;
    return false;
  }

  /**
   * Sanitiza uma string contendo HTML, mantendo apenas tags allowlisted.
   * Implementacao sem innerHTML (funciona sem DOM e resiste a mXSS
   * porque nunca interpreta o resultado).
   *
   * @param {string} input
   * @returns {string} HTML seguro para atribuicao a innerHTML
   */
  function sanitizeHtml(input) {
    if (input === null || input === undefined) return '';
    let src = String(input);

    // 1) Remove comentarios condicionais e CDATA (vetor classico de mXSS).
    src = src.replace(/<!--[\s\S]*?-->/g, '');
    src = src.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
    src = src.replace(/<![^>]*>/g, '');

    // 2) Remove blocos inteiros de script/style/iframe/object/embed/template/svg/math.
    src = src.replace(/<\s*(script|style|iframe|object|embed|template|svg|math|noscript|textarea|title|xmp|plaintext)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    // Tags nao fechadas desses elementos tambem sao perigosas.
    src = src.replace(/<\s*(script|style|iframe|object|embed|template|svg|math|noscript|textarea|title|xmp|plaintext)\b[^>]*>/gi, '');

    // 3) Tokeniza e reconstroi usando allowlist.
    const out = [];
    const re = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9]*)\b([^>]*)>/g;
    let m;
    let last = 0;
    while ((m = re.exec(src)) !== null) {
      // Texto antes da tag: sempre escapado.
      if (m.index > last) out.push(escapeHtml(src.slice(last, m.index)));
      last = re.lastIndex;

      const closing = m[1] === '/';
      const tag = m[2].toLowerCase();
      const attrStr = m[3] || '';

      if (!ALLOWED_TAGS.has(tag)) {
        // Tag nao permitida: descarta a tag, mas PRESERVA o conteudo textual
        // interno (ex.: <script>alert(1)</script> vira "alert(1)" como texto).
        continue;
      }

      if (closing) {
        out.push(`</${tag}>`);
        continue;
      }

      // Tag de abertura: filtra atributos.
      let safeAttrs = '';
      if (attrStr.trim()) {
        const attrRe = /([A-Za-z_:][A-Za-z0-9_:.\-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
        let a;
        while ((a = attrRe.exec(attrStr)) !== null) {
          const name = a[1].toLowerCase();
          const value = a[3] !== undefined ? a[3] : (a[4] !== undefined ? a[4] : (a[5] || ''));
          const allowed = ALLOWED_ATTRS[tag] || ALLOWED_ATTRS['*'];
          if (!allowed.has(name)) continue;
          if (name === 'class' && !CLASS_TOKEN_RE.test(value)) continue;
          safeAttrs += ` ${name}="${escapeAttr(value)}"`;
        }
      }

      // <br> e tag void.
      if (tag === 'br') {
        out.push('<br>');
      } else {
        out.push(`<${tag}${safeAttrs}>`);
      }
    }

    // Resto do texto.
    if (last < src.length) out.push(escapeHtml(src.slice(last)));

    // 4) Segunda passagem defensiva: garante que nenhuma tag perigosa
    //    sobreviveu por algum caso de parsing nao previsto.
    let result = out.join('');
    result = result.replace(/<\s*\/?\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>/gi, '');
    result = result.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    result = result.replace(/javascript\s*:/gi, '');
    return result;
  }

  /** Define o conteudo de um elemento com texto puro (sem interpretar HTML). */
  function setText(el, text) {
    if (!el) return;
    el.textContent = text === null || text === undefined ? '' : String(text);
  }

  /** Substitui todos os filhos de um elemento pelos fragmentos sanitizados. */
  function replaceChildren(el, nodes) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (Array.isArray(nodes)) {
      for (const n of nodes) if (n) el.appendChild(n);
    }
  }

  /** Cria <option> com valor e rotulo seguros (sem innerHTML). */
  function makeOption(doc, value, label) {
    const opt = doc.createElement('option');
    opt.value = value === null || value === undefined ? '' : String(value);
    opt.textContent = label === null || label === undefined ? '' : String(label);
    return opt;
  }

  /** Cria elemento com atributos seguros. */
  function makeEl(doc, tag, attrs, textContent) {
    const el = doc.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const name = k.toLowerCase();
        // Bloqueia qualquer on* e style inline vindo de dados.
        if (name.startsWith('on') || name === 'style') continue;
        el.setAttribute(name, attrs[k] === null || attrs[k] === undefined ? '' : String(attrs[k]));
      }
    }
    if (textContent !== undefined) el.textContent = String(textContent);
    return el;
  }

  return {
    escapeHtml,
    escapeAttr,
    safeNum,
    safeBool,
    sanitizeHtml,
    setText,
    replaceChildren,
    makeOption,
    makeEl,
    ALLOWED_TAGS,
  };
});
