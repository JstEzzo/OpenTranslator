# Matriz de Métodos de Tradução

| ID do Método | Nome | Escopo | Risco | Fallbacks |
|---|---|---|---|---|
| **METHOD_A_STATIC** | Modificação de Arquivos Estáticos | JSON, CSV, TXT, XML, SQLite, PO | Baixo | OVERLAY, OCR |
| **METHOD_B_NATIVE** | Tradução Nativa da Engine | Ren'Py `game/tl/<lang>` | Mínimo | STATIC, OVERLAY, OCR |
| **METHOD_C_RUNTIME_HOOK** | Injeção Nativa em Runtime | Unity Mono, RGSS Hook | Médio | OVERLAY, OCR |
| **METHOD_D_UI_FRAMEWORK** | UI Framework Adapter | TextMeshPro, UGUI, NGUI | Médio | OVERLAY, OCR |
| **METHOD_E_DOM_WEB** | DOM Observer | Electron, NW.js, Chromium | Baixo | STATIC, OVERLAY, OCR |
| **METHOD_F_OVERLAY** | Universal Overlay | Overlay gráfico sem mutação | Mínimo | OCR |
| **METHOD_G_OCR** | Fallback OCR Adaptativo | Captura de tela e Tesseract OCR | Mínimo | N/A (Último recurso) |
