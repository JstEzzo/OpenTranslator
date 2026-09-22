# Runtime Translation Specification

O subsistema de runtime traduz textos dinâmicos em tempo real sem alterar os arquivos do jogo no disco:
1. **Ponte WebSocket (16005)**: Comunicação assíncrona com wrappers e hooks.
2. **TextFrameworkProvider**: Mapeia TextMeshPro e UGUI em jogos Unity Mono.
3. **DOMTextProvider**: Escuta mutações na árvore DOM de aplicações Electron/NW.js.
4. **Isolamento de Falhas**: Se o hook falhar ou o jogo apresentar crash, o roteador migra imediatamente para o modo **OVERLAY** sem derrubar o OpenTranslator.
