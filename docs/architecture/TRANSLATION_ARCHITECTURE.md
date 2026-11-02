# Translation architecture

The product contains static-file, native-localization, runtime-bridge, DOM, and overlay/OCR-related strategies. Availability depends on the adapter, format, tools, and game version. A fallback name is not proof that a working fallback is selected automatically.

Trace an operation from UI to RPC and its service/pipeline. Extraction identifies source records; preparation/classification must avoid translating machine keys or code. Translation must honor provider choice and placeholder contracts. Application must produce real output, preserve required format metadata, and report partial failures. Recovery must restore originals and account for newly created files.

New and legacy flows coexist. New automatic translation usually needs a configured online/local provider; cached text can be reused offline. Separate cache hits, dictionary substitutions, real provider calls, and game-side display when measuring results.
