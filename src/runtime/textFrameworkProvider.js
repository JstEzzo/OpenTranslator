class TextFrameworkProvider {
  static discover(processInfo = {}) {
    const modules = processInfo.loadedModules || [];
    const frameworks = [];

    if (modules.some(m => /textmeshpro|unity/i.test(m))) {
      frameworks.push({
        id: 'TextMeshPro',
        canCapture: true,
        canReplace: true,
        supportsRichText: true,
        supportsResize: true
      });
    }

    if (modules.some(m => /ugui|unityengine\.ui/i.test(m))) {
      frameworks.push({
        id: 'UGUI',
        canCapture: true,
        canReplace: true,
        supportsRichText: true,
        supportsResize: true
      });
    }

    return frameworks;
  }
}

class DOMTextProvider {
  static createMutationObserverScript(options = {}) {
    return `
      (() => {
        const processedNodes = new WeakSet();
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === Node.TEXT_NODE && !processedNodes.has(node)) {
                const text = node.textContent.trim();
                if (text.length > 1) {
                  processedNodes.add(node);
                  window.__openTranslatorDispatch && window.__openTranslatorDispatch(text);
                }
              }
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      })();
    `;
  }
}

module.exports = {
  TextFrameworkProvider,
  DOMTextProvider
};
