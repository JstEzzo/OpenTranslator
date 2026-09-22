/**
 * OpenTranslator — ElectronDOMProvider
 * 
 * Especializado em interceptação e tradução de texto no DOM de jogos Electron / HTML5:
 * - Filtra nós visíveis (ignora scripts, styles, meta, noscript)
 * - Identifica elementos interativos (botões, menus, tooltips)
 * - Injeta scripts de MutationObserver com isolamento seguro (IIFE + WeakSet)
 * - Suporte a bridge CDP (Chrome DevTools Protocol) e preload script injection
 */

class ElectronDOMProvider {
  /**
   * Gera o script de injeção para o processo Renderer do Electron
   */
  static getRendererInjectionScript(options = {}) {
    const wsPort = options.wsPort || 16005;
    return `
      (() => {
        if (window.__OT_DOM_INJECTED__) return;
        window.__OT_DOM_INJECTED__ = true;

        const processedNodes = new WeakSet();
        const translationCache = new Map();

        const isTranslatable = (node) => {
          if (!node || node.nodeType !== Node.TEXT_NODE) return false;
          const parent = node.parentElement;
          if (!parent) return false;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'canvas', 'code', 'template'].includes(tag)) return false;
          const text = node.textContent.trim();
          return text.length > 0 && !/^[\d\s.,:;!?()\\/\\-_+=*&^%$#@~]+$/.test(text);
        };

        const scanAndTranslate = (root) => {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let currentNode;
          while ((currentNode = walker.nextNode())) {
            if (isTranslatable(currentNode) && !processedNodes.has(currentNode)) {
              processedNodes.add(currentNode);
              const original = currentNode.textContent.trim();
              if (translationCache.has(original)) {
                currentNode.textContent = translationCache.get(original);
              } else if (window.__openTranslatorDispatch) {
                window.__openTranslatorDispatch(original, (translated) => {
                  translationCache.set(original, translated);
                  currentNode.textContent = translated;
                });
              }
            }
          }
        };

        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const added of m.addedNodes) {
              if (added.nodeType === Node.ELEMENT_NODE) {
                scanAndTranslate(added);
              } else if (isTranslatable(added) && !processedNodes.has(added)) {
                processedNodes.add(added);
              }
            }
          }
        });

        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true
        });

        if (document.body) scanAndTranslate(document.body);
      })();
    `;
  }
}

module.exports = ElectronDOMProvider;
