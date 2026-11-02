# Application architecture

OpenTranslator combines a native C# launcher, a browser interface, a local Node backend, engine adapters, and optional Python/native tools. HTTP/RPC uses session authentication. Default HTTP and hook ports are 8080 and 16005.

`rpcHandlers.js` calls both GameService and legacy gameEngine operations. Treat diagrams as a map, not proof that every request uses one pipeline. Detection, registry resolution, extraction, provider translation, placeholder restoration, QA, application, and recovery must be traced for the specific operation.

Backups, transaction journals, write verification, and partial-result contracts have different responsibilities. An adapter must report failures and actual writes honestly. External tools and legacy flows do not automatically inherit every guarantee of newer transaction code.

Process shutdown should target owned processes and wait for tracked operations/recovery. Plugin try/catch is not process isolation. Read the [detailed guide](../GUIA-DETALHADO.md) for the current layout and known limits.
