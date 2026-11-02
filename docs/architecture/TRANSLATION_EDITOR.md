# Translation editor: implementation and remaining UI work

`src/core/translationEditorCore.js` implements a backend data model for querying entries, editing translations, undo/redo history, validation, bulk operations, and export. Inspect each method for its actual contract and format support.

The presence of this model does not establish a browser-connected virtualized editor, support for 300,000 visible rows, sub-millisecond search, or every keyboard shortcut described by older plans. Those remain UI/integration/performance claims requiring independent evidence.

When implementing the visual editor, connect data operations to real controls, test persistence and errors, preserve placeholders, and provide a preview for destructive bulk changes. Document implemented shortcuts only after testing them in the browser. Keep application font preferences separate from game font patches.
