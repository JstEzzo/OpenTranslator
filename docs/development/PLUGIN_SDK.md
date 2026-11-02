# Plugin SDK and conformance

`src/core/pluginSDK.js` checks required methods and provides `safeExecute(plugin, methodName, args, fallback)`.

The current helper awaits the method inside try/catch. It handles thrown/rejected JavaScript calls and returns a fallback value. It does **not** implement a timeout, separate process, memory sandbox, native-crash containment, or protection from an infinite loop. It does not itself select the next translation provider.

Interface conformance is structural; it does not prove correct extraction, safe writes, hook compatibility, or cleanup. Blocking/native integrations need explicit lifecycle and failure handling. Test shutdown and recovery rather than claiming the server and UI always remain available.
